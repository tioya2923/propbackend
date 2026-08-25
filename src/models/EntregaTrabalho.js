const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EntregaTrabalho = sequelize.define('EntregaTrabalho', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  trabalho_id:    { type: DataTypes.UUID, allowNull: false },
  seminarista_id: { type: DataTypes.UUID, allowNull: false },
  ficheiro_url:   { type: DataTypes.STRING },
  texto:          { type: DataTypes.TEXT },
  entregue_em:    { type: DataTypes.DATE },
  nota_valor:     { type: DataTypes.DECIMAL(4, 1) },
  comentario:     { type: DataTypes.TEXT },
  estado:         { type: DataTypes.ENUM('pendente', 'entregue', 'avaliado'), defaultValue: 'pendente' },
}, {
  tableName: 'entregas_trabalho',
  indexes: [{ unique: true, fields: ['trabalho_id', 'seminarista_id'] }],
});

module.exports = EntregaTrabalho;
