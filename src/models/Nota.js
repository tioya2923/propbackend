const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Nota = sequelize.define('Nota', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  professor_id:   { type: DataTypes.UUID, allowNull: false },
  seminarista_id: { type: DataTypes.UUID, allowNull: false },
  materia:        { type: DataTypes.STRING(150), allowNull: false },
  periodo:        { type: DataTypes.STRING(50), allowNull: false },   // ex: "1º Trimestre 2025"
  valor:          { type: DataTypes.DECIMAL(4, 1), allowNull: false, validate: { min: 0, max: 20 } },
  observacao:     { type: DataTypes.TEXT },
}, {
  tableName: 'notas',
  indexes: [{ unique: true, fields: ['professor_id', 'seminarista_id', 'materia', 'periodo'] }],
});

module.exports = Nota;
