const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ForumPost = sequelize.define('ForumPost', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo: { type: DataTypes.STRING(200) },
  conteudo: { type: DataTypes.TEXT, allowNull: false },
  autor_id: { type: DataTypes.UUID, allowNull: false },
  parent_id: { type: DataTypes.UUID },
  categoria: { type: DataTypes.STRING(100), defaultValue: 'geral' },
  fixado: { type: DataTypes.BOOLEAN, defaultValue: false },
  seccao: { type: DataTypes.STRING(20), defaultValue: 'todos', allowNull: true },
}, { tableName: 'forum_posts' });

module.exports = ForumPost;
