const Stripe = require('stripe');

let stripe;

function getStripe() {
  if (!stripe) {
    stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }
  return stripe;
}

async function createPaymentIntent({ amount, currency, metadata }) {
  const s = getStripe();
  const intent = await s.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });
  return intent;
}

async function handleWebhook(payload, sig) {
  const s = getStripe();
  return s.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
}

async function retrievePaymentIntent(id) {
  const s = getStripe();
  return s.paymentIntents.retrieve(id);
}

module.exports = { createPaymentIntent, handleWebhook, retrievePaymentIntent };
