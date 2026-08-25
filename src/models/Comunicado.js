const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comunicado = sequelize.define('Comunicado', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  conteudo: { type: DataTypes.TEXT, allowNull: false },
  autor_id: { type: DataTypes.UUID, allowNull: false },
  destinatarios: { type: DataTypes.ENUM('todos', 'seminarista', 'staff', 'admin'), defaultValue: 'todos' },
  seccao: { type: DataTypes.STRING(20), defaultValue: 'todos' },
  enviado_email: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'comunicados' });

module.exports = Comunicado;
