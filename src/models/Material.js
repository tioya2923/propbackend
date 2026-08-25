const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Material = sequelize.define('Material', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  ficheiro_url: { type: DataTypes.STRING, allowNull: false },
  tipo: { type: DataTypes.ENUM('documento', 'livro', 'apresentacao', 'outro', 'apostila', 'exercicio', 'leitura'), defaultValue: 'documento' },
  ano_formacao: { type: DataTypes.INTEGER },
  enviado_por: { type: DataTypes.UUID },
  tamanho_bytes: { type: DataTypes.BIGINT },
  seccao: { type: DataTypes.STRING(20), allowNull: true },
}, { tableName: 'materiais' });

module.exports = Material;
