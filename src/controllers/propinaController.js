const { v4: uuidv4 } = require('uuid');
const { Propina, Payment, User } = require('../models');
const { createPaymentIntent, retrievePaymentIntent } = require('../services/stripe');
const { generateRecibo } = require('../services/pdf');
const { sendPaymentConfirmation } = require('../services/email');
const { calcularMensalidadesEmAtraso } = require('../services/faturacao');
const logger = require('../utils/logger');

function stripeConfigurado() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.length > 0 && !key.startsWith('sk_test_...') && key !== 'sk_test_placeholder';
}

async function getMinhaDivida(req, res) {
  try {
    const propina = await Propina.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: Payment,
        as: 'payments',
        where: { confirmado: true },
        required: false,
        order: [['data_pagamento', 'DESC']],
        limit: 12,
      }],
    });

    if (!propina) {
      return res.status(404).json({ erro: 'Propina não configurada. Contacte a administração.' });
    }

    // Lança já qualquer mensalidade em atraso antes de responder — assim o
    // seminarista vê sempre o saldo actualizado mesmo que o servidor tenha
    // estado hibernado (Render free tier) na data de vencimento.
    if (calcularMensalidadesEmAtraso(propina)) await propina.save();

    const desconto = propina.bolsa ? propina.desconto_percentagem : 0;
    const montante_efectivo = propina.montante_mensal * (1 - desconto / 100);

    res.json({
      montante_mensal: propina.montante_mensal,
      montante_efectivo,
      moeda: propina.moeda,
      data_vencimento: propina.data_vencimento,
      saldo_devedor: propina.saldo_devedor,
      bolsa: propina.bolsa,
      desconto_percentagem: propina.desconto_percentagem,
      pagamentos: propina.payments,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function iniciarPagamento(req, res) {
  try {
    const { valor, metodo, periodo_referencia } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ erro: 'Valor inválido' });

    const propina = await Propina.findOne({ where: { user_id: req.user.id } });
    if (!propina) return res.status(404).json({ erro: 'Propina não encontrada' });

    if (metodo === 'cartao') {
      // O Stripe não processa Kwanza (AOA). Nunca converter o valor 1:1 para outra
      // moeda — só se aceita cartão quando a propina já está denominada numa moeda suportada.
      if (propina.moeda === 'AOA') {
        return res.status(400).json({ erro: 'Pagamento por cartão não está disponível para propinas em Kwanza (AOA). Utilize a referência Multibanco.' });
      }
      if (!stripeConfigurado()) {
        return res.status(503).json({ erro: 'Pagamento por cartão não está configurado. Contacte a administração.' });
      }

      const intent = await createPaymentIntent({
        amount: valor,
        currency: propina.moeda.toLowerCase(),
        metadata: { user_id: req.user.id, propina_id: propina.id, periodo: periodo_referencia },
      });

      const payment = await Payment.create({
        user_id: req.user.id,
        propina_id: propina.id,
        valor,
        moeda: propina.moeda,
        metodo: 'cartao',
        referencia_transacao: uuidv4(),
        stripe_payment_intent_id: intent.id,
        periodo_referencia,
        confirmado: false,
      });

      return res.json({ client_secret: intent.client_secret, payment_id: payment.id });
    }

    // Só um código de referência interno para a administração cruzar com o
    // extracto bancário — não está ligado a nenhuma rede de pagamentos real
    // (não confundir com uma referência Multicaixa/EMIS de verdade).
    const ref = `REF-${Date.now().toString().slice(-8)}`;
    const payment = await Payment.create({
      user_id: req.user.id,
      propina_id: propina.id,
      valor,
      moeda: propina.moeda,
      metodo: metodo || 'multibanco',
      referencia_transacao: ref,
      periodo_referencia,
      confirmado: false,
    });

    res.json({ referencia: ref, payment_id: payment.id, mensagem: 'Use esta referência para efectuar o pagamento.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function confirmarPagamento(req, res) {
  try {
    const { payment_id, payment_intent_id } = req.body;

    const payment = await Payment.findOne({ where: { id: payment_id, user_id: req.user.id } });
    if (!payment) return res.status(404).json({ erro: 'Pagamento não encontrado' });
    if (payment.confirmado) return res.json({ mensagem: 'Já confirmado' });

    if (payment.metodo === 'cartao') {
      // Nunca confiar apenas no que o cliente diz — confirmar sempre junto do Stripe
      // que o PaymentIntent associado a este pagamento foi mesmo cobrado com sucesso.
      const intentId = payment.stripe_payment_intent_id || payment_intent_id;
      if (!intentId) return res.status(400).json({ erro: 'Referência de pagamento em falta' });
      if (payment.stripe_payment_intent_id && intentId !== payment.stripe_payment_intent_id) {
        return res.status(400).json({ erro: 'Referência de pagamento inválida' });
      }
      const intent = await retrievePaymentIntent(intentId);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({ erro: 'O pagamento ainda não foi concluído junto do Stripe.' });
      }
    }

    await payment.update({ confirmado: true, data_pagamento: new Date() });

    const propina = await Propina.findByPk(payment.propina_id);
    if (propina) {
      const novo_saldo = Math.max(0, parseFloat(propina.saldo_devedor) - parseFloat(payment.valor));
      await propina.update({ saldo_devedor: novo_saldo });
    }

    await sendPaymentConfirmation(req.user, payment).catch(() => {});
    logger.info('Payment confirmed', { payment_id, user_id: req.user.id });

    res.json({ mensagem: 'Pagamento confirmado', payment: payment.toJSON() });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getRecibos(req, res) {
  try {
    const payments = await Payment.findAll({
      where: { user_id: req.user.id, confirmado: true },
      order: [['data_pagamento', 'DESC']],
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function downloadRecibo(req, res) {
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id, user_id: req.user.id, confirmado: true },
    });
    if (!payment) return res.status(404).json({ erro: 'Recibo não encontrado' });

    const pdfBuffer = await generateRecibo(payment, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-${payment.id.substring(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function pedirProrrogacao(req, res) {
  try {
    const { motivo, data_pretendida } = req.body;
    if (!motivo) return res.status(400).json({ erro: 'Motivo obrigatório' });
    logger.info('Prorrogacao requested', { user_id: req.user.id, motivo });
    res.json({ mensagem: 'Pedido de prorrogação enviado à administração.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { getMinhaDivida, iniciarPagamento, confirmarPagamento, getRecibos, downloadRecibo, pedirProrrogacao };
