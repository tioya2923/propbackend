const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID },
  acao: { type: DataTypes.STRING(100), allowNull: false },
  recurso: { type: DataTypes.STRING(100) },
  recurso_id: { type: DataTypes.STRING },
  ip_address: { type: DataTypes.STRING(45) },
  user_agent: { type: DataTypes.TEXT },
  detalhes: { type: DataTypes.JSONB },
  sucesso: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'audit_logs', updatedAt: false });

module.exports = AuditLog;
