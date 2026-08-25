const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  propina_id: { type: DataTypes.UUID },
  valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  moeda: { type: DataTypes.ENUM('AOA', 'EUR', 'USD'), defaultValue: 'AOA' },
  metodo: { type: DataTypes.ENUM('cartao', 'multibanco', 'transferencia'), allowNull: false },
  referencia_transacao: { type: DataTypes.STRING, unique: true },
  stripe_payment_intent_id: { type: DataTypes.STRING },
  confirmado: { type: DataTypes.BOOLEAN, defaultValue: false },
  data_pagamento: { type: DataTypes.DATE },
  periodo_referencia: { type: DataTypes.STRING },
  notas: { type: DataTypes.TEXT },
  recibo_url: { type: DataTypes.STRING },
}, { tableName: 'payments' });

module.exports = Payment;
