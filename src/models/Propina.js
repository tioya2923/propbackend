const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Propina = sequelize.define('Propina', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  montante_mensal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 50000 },
  moeda: { type: DataTypes.ENUM('AOA', 'EUR', 'USD'), defaultValue: 'AOA' },
  data_vencimento: { type: DataTypes.DATEONLY },
  bolsa: { type: DataTypes.BOOLEAN, defaultValue: false },
  desconto_percentagem: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },
  saldo_devedor: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, { tableName: 'propinas' });

module.exports = Propina;
