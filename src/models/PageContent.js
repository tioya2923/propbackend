const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PageContent = sequelize.define('PageContent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pagina: { type: DataTypes.STRING(50), allowNull: false },
  chave: { type: DataTypes.STRING(100), allowNull: false },
  valor: { type: DataTypes.TEXT },
  tipo: { type: DataTypes.ENUM('text', 'html', 'json'), defaultValue: 'text' },
}, {
  tableName: 'page_contents',
  indexes: [{ unique: true, fields: ['pagina', 'chave'] }],
});

module.exports = PageContent;
