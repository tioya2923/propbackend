const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  data_inicio: { type: DataTypes.DATE, allowNull: false },
  data_fim: { type: DataTypes.DATE },
  local: { type: DataTypes.STRING(200) },
  imagem_url: { type: DataTypes.STRING },
  tipo: { type: DataTypes.ENUM('liturgico', 'academico', 'formacao', 'comunitario', 'outro'), defaultValue: 'outro' },
  publico: { type: DataTypes.BOOLEAN, defaultValue: true },
  criado_por: { type: DataTypes.UUID },
}, { tableName: 'events' });

module.exports = Event;
