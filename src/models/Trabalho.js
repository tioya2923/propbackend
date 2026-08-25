const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trabalho = sequelize.define('Trabalho', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  professor_id:  { type: DataTypes.UUID, allowNull: false },
  titulo:        { type: DataTypes.STRING(200), allowNull: false },
  descricao:     { type: DataTypes.TEXT },
  data_entrega:  { type: DataTypes.DATE },
  seccao:        { type: DataTypes.STRING(20), allowNull: true },
  ano_formacao:  { type: DataTypes.INTEGER },   // null = todos os anos
  materia:       { type: DataTypes.STRING(150) },
  publicado:     { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'trabalhos' });

module.exports = Trabalho;
