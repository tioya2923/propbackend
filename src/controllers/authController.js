const crypto = require('crypto');
const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const { sendPasswordReset } = require('../services/email');
const logger = require('../utils/logger');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ erro: 'Email e password são obrigatórios' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.ativo) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      logger.warn('Failed login attempt', { email, ip: req.ip });
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    await user.update({ ultimo_login: new Date() });
    const token = generateToken(user);
    logger.info('User logged in', { userId: user.id, email: user.email });

    res.json({ token, user: user.toPublic() });
  } catch (err) {
    logger.error('Login error', { err: err.message });
    res.status(500).json({ erro: err.message });
  }
}

async function me(req, res) {
  res.json({ user: req.user.toPublic() });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: email?.toLowerCase() } });
    // Always return 200 to avoid email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await user.update({ reset_token: token, reset_token_expires: new Date(Date.now() + 3600000) });
      await sendPasswordReset(user, token).catch(() => {});
    }
    res.json({ mensagem: 'Se o email existir, receberá instruções em breve.' });
  } catch (err) {
    logger.error('Forgot password error', { err: err.message });
    res.status(500).json({ erro: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      where: { reset_token: token },
    });

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      return res.status(400).json({ erro: 'Token inválido ou expirado' });
    }

    await user.update({ password_hash: password, reset_token: null, reset_token_expires: null });
    res.json({ mensagem: 'Password alterada com sucesso' });
  } catch (err) {
    logger.error('Reset password error', { err: err.message });
    res.status(500).json({ erro: err.message });
  }
}

async function changePassword(req, res) {
  try {
    const { password_atual, password_nova } = req.body;
    const valid = await req.user.comparePassword(password_atual);
    if (!valid) return res.status(400).json({ erro: 'Password atual incorreta' });

    await req.user.update({ password_hash: password_nova });
    res.json({ mensagem: 'Password alterada com sucesso' });
  } catch (err) {
    logger.error('Change password error', { err: err.message });
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { login, me, forgotPassword, resetPassword, changePassword };
