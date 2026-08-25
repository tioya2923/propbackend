const { Op } = require('sequelize');
const { News, Event } = require('../models');
const { sendEmail } = require('../services/email');

async function getNoticias(req, res) {
  try {
    const { page = 1, categoria, destaque } = req.query;
    const where = { publicado: true };
    if (categoria) where.categoria = categoria;
    if (destaque === 'true') where.destaque = true;

    const { count, rows } = await News.findAndCountAll({
      where,
      attributes: { exclude: ['conteudo'] },
      order: [['data_publicacao', 'DESC']],
      limit: 10,
      offset: (page - 1) * 10,
    });
    res.json({ total: count, pagina: parseInt(page), noticias: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getNoticia(req, res) {
  try {
    const { id } = req.params;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const where = isUUID
      ? { [Op.or]: [{ id }, { slug: id }], publicado: true }
      : { slug: id, publicado: true };

    const noticia = await News.findOne({ where });
    if (!noticia) return res.status(404).json({ erro: 'Notícia não encontrada' });
    res.json(noticia);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getEventos(req, res) {
  try {
    const eventos = await Event.findAll({
      where: { publico: true, data_inicio: { [Op.gte]: new Date() } },
      order: [['data_inicio', 'ASC']],
      limit: 20,
    });
    res.json(eventos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function submitContacto(req, res) {
  try {
    const { nome, email, assunto, mensagem } = req.body;
    if (!nome || !email || !mensagem) {
      return res.status(400).json({ erro: 'Nome, email e mensagem são obrigatórios' });
    }

    await sendEmail({
      to: process.env.SMTP_USER || 'seminario@sje.ao',
      subject: `[Contacto] ${assunto || 'Sem assunto'} - ${nome}`,
      html: `<p><strong>De:</strong> ${nome} (${email})</p>
             <p><strong>Assunto:</strong> ${assunto}</p>
             <p><strong>Mensagem:</strong></p><p>${mensagem}</p>`,
    }).catch(() => {});

    res.json({ mensagem: 'Mensagem enviada. Responderemos brevemente.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function criarDonativo(req, res) {
  const { nome, email, valor, mensagem } = req.body;
  if (!nome || !email || !valor || valor <= 0) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.startsWith('sk_test_...') || stripeKey === 'sk_test_placeholder') {
    return res.status(503).json({ erro: 'Pagamento por Stripe não está configurado. Contacte a administração.' });
  }

  try {
    const { createPaymentIntent } = require('../services/stripe');
    const intent = await createPaymentIntent({
      amount: valor,
      currency: 'eur',
      metadata: { tipo: 'donativo', nome, email, mensagem: mensagem || '' },
    });
    res.json({ client_secret: intent.client_secret });
  } catch (err) {
    const msg = err.type === 'StripeAuthenticationError'
      ? 'Chave Stripe inválida. Contacte a administração.'
      : err.message || 'Erro ao processar pagamento';
    res.status(502).json({ erro: msg });
  }
}

module.exports = { getNoticias, getNoticia, getEventos, submitContacto, criarDonativo };
