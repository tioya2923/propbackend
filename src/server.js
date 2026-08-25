require('dotenv').config();
const express = require('express');

process.on('unhandledRejection', (reason) => {
  const logger = require('./utils/logger');
  logger.error('Unhandled promise rejection', { err: reason?.message || String(reason) });
});
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const semináristaRoutes = require('./routes/seminarista');
const propinaRoutes = require('./routes/propinas');
const adminRoutes = require('./routes/admin');
const professorRoutes = require('./routes/professor');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure logs/uploads directories exist
['logs', process.env.UPLOAD_DIR || 'uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Stripe webhook needs raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const { handleWebhook } = require('./services/stripe');
  const { Payment, Propina } = require('./models');
  try {
    const event = await handleWebhook(req.body, req.headers['stripe-signature']);
    if (event.type === 'payment_intent.succeeded') {
      const intentId = event.data.object.id;
      const payment = await Payment.findOne({ where: { stripe_payment_intent_id: intentId } });
      if (payment && !payment.confirmado) {
        await payment.update({ confirmado: true, data_pagamento: new Date() });
        const propina = await Propina.findByPk(payment.propina_id);
        if (propina) {
          await propina.update({ saldo_devedor: Math.max(0, parseFloat(propina.saldo_devedor) - parseFloat(payment.valor)) });
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error('Stripe webhook error', { err: err.message });
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/seminarista', semináristaRoutes);
app.use('/api/propinas', propinaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api', publicRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { err: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ erro: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message });
});

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synced');
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server', { err: err.message });
    process.exit(1);
  }
}

start();

module.exports = app;
