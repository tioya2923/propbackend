const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TeamMember = sequelize.define('TeamMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  cargo: { type: DataTypes.STRING(150), allowNull: false },
  area: { type: DataTypes.STRING(100) },
  seccao: { type: DataTypes.STRING(20), allowNull: true },
  ordem: { type: DataTypes.INTEGER, defaultValue: 0 },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'team_members' });

module.exports = TeamMember;
