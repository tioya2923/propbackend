const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const News = sequelize.define('News', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(220), unique: true },
  resumo: { type: DataTypes.TEXT },
  conteudo: { type: DataTypes.TEXT, allowNull: false },
  imagem_url: { type: DataTypes.STRING },
  categoria: { type: DataTypes.ENUM('geral', 'eventos', 'academico', 'formacao', 'comunidade', 'vocacao'), defaultValue: 'geral' },
  publicado: { type: DataTypes.BOOLEAN, defaultValue: false },
  destaque: { type: DataTypes.BOOLEAN, defaultValue: false },
  autor_id: { type: DataTypes.UUID },
  data_publicacao: { type: DataTypes.DATE },
}, { tableName: 'news' });

module.exports = News;
