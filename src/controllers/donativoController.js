const { sendEmail } = require('../services/email');

function gerarReferencia() {
  const ts = Date.now().toString().slice(-6);
  return `SMRH-${ts}`;
}

async function mcxIntent(req, res) {
  try {
    const { nome, email, valor, telefone } = req.body;
    if (!nome || !valor || valor <= 0) return res.status(400).json({ erro: 'Dados inválidos' });

    const referencia = gerarReferencia();

    // Notificar administração por email
    await sendEmail({
      to: process.env.SMTP_USER || 'info@sje.ao',
      subject: `[Donativo MCX] ${nome} — ${Number(valor).toLocaleString('pt-AO')} Kz`,
      html: `<p><strong>Nome:</strong> ${nome}</p>
             <p><strong>Email:</strong> ${email || '—'}</p>
             <p><strong>Telefone:</strong> ${telefone || '—'}</p>
             <p><strong>Valor:</strong> ${Number(valor).toLocaleString('pt-AO')} Kz</p>
             <p><strong>Referência:</strong> ${referencia}</p>`,
    }).catch(() => {});

    res.json({ referencia });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function mbwayIntent(req, res) {
  try {
    const { nome, email, valor, telefone } = req.body;
    if (!nome || !valor || !telefone) return res.status(400).json({ erro: 'Dados inválidos' });

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripeOk = stripeKey.length > 0 && !stripeKey.startsWith('sk_test_...') && stripeKey !== 'sk_test_placeholder';

    if (!stripeOk) {
      // Sem Stripe — notificar só por email e devolver instruções manuais
      await sendEmail({
        to: process.env.SMTP_USER || 'info@sje.ao',
        subject: `[Donativo MBWay] ${nome} — ${Number(valor).toLocaleString('pt')} €`,
        html: `<p><strong>Nome:</strong> ${nome}</p>
               <p><strong>Email:</strong> ${email || '—'}</p>
               <p><strong>Telefone MBWay:</strong> ${telefone}</p>
               <p><strong>Valor:</strong> ${Number(valor).toLocaleString('pt')} €</p>`,
      }).catch(() => {});
      return res.json({ manual: true });
    }

    const stripe = require('stripe')(stripeKey);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(valor * 100),
      currency: 'eur',
      payment_method_types: ['mbway'],
      payment_method_data: {
        type: 'mbway',
        mbway: { phone: telefone },
      },
      confirm: true,
      metadata: { tipo: 'donativo', nome, email: email || '' },
    });
    res.json({ client_secret: intent.client_secret, status: intent.status });
  } catch (err) {
    res.status(502).json({ erro: err.message });
  }
}

module.exports = { mcxIntent, mbwayIntent };
