const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  nif_encrypted: { type: DataTypes.TEXT },
  ano_formacao: { type: DataTypes.INTEGER, validate: { min: 1, max: 2 } },
  data_entrada: { type: DataTypes.DATEONLY },
  foto_url: { type: DataTypes.STRING },
  permissoes: {
    type: DataTypes.ENUM('seminarista', 'staff', 'admin'),
    defaultValue: 'seminarista',
    allowNull: false,
  },
  seccao: { type: DataTypes.STRING(50), allowNull: true }, // kept for compatibility, unused in single-seminary mode
  cargo: { type: DataTypes.STRING(50), allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  totp_secret: { type: DataTypes.STRING },
  totp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  ultimo_login: { type: DataTypes.DATE },
  reset_token: { type: DataTypes.STRING },
  reset_token_expires: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      }
    },
  },
});

User.prototype.comparePassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.getNif = function () {
  return decrypt(this.nif_encrypted);
};

User.prototype.setNif = function (nif) {
  this.nif_encrypted = encrypt(nif);
};

User.prototype.toPublic = function () {
  const { password_hash, nif_encrypted, totp_secret, reset_token, reset_token_expires, ...data } = this.toJSON();
  return data;
};

module.exports = User;
