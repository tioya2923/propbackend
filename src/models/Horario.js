const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Horario = sequelize.define('Horario', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ano_formacao: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 2 } },
  dia_semana: { type: DataTypes.ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'), allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fim: { type: DataTypes.TIME, allowNull: false },
  disciplina: { type: DataTypes.STRING(150), allowNull: false },
  professor: { type: DataTypes.STRING(100) },
  professor_id: { type: DataTypes.UUID, allowNull: true },
  sala: { type: DataTypes.STRING(50) },
}, { tableName: 'horarios' });

module.exports = Horario;
