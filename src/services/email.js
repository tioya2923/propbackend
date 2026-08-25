const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured – email not sent', { to, subject });
    return;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'Seminário São João Evangelista <noreply@sje.ao>',
      to, subject, html, text,
    });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Email send failed', { to, subject, err: err.message });
  }
}

async function sendWelcome(user) {
  await sendEmail({
    to: user.email,
    subject: 'Bem-vindo ao Seminário Propedêutico São João Evangelista',
    html: `<h2>Bem-vindo, ${user.nome}!</h2>
    <p>A sua conta foi criada com sucesso.</p>
    <p>Email: <strong>${user.email}</strong></p>`,
  });
}

async function sendPaymentConfirmation(user, payment) {
  await sendEmail({
    to: user.email,
    subject: `Pagamento confirmado – ${payment.valor} ${payment.moeda}`,
    html: `<h2>Pagamento Confirmado</h2>
    <p>Olá ${user.nome},</p>
    <p>O seu pagamento de <strong>${payment.valor} ${payment.moeda}</strong> foi confirmado.</p>
    <p>Referência: ${payment.referencia_transacao}</p>
    <p>Data: ${new Date(payment.data_pagamento).toLocaleDateString('pt-PT')}</p>`,
  });
}

async function sendPasswordReset(user, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Recuperação de password',
    html: `<h2>Recuperação de Password</h2>
    <p>Clique no link abaixo para redefinir a sua password (válido por 1 hora):</p>
    <a href="${url}">${url}</a>`,
  });
}

async function sendComunicado(emails, titulo, conteudo) {
  for (const email of emails) {
    await sendEmail({
      to: email,
      subject: `[Comunicado] ${titulo}`,
      html: `<h2>${titulo}</h2><div>${conteudo}</div>`,
    });
  }
}

module.exports = { sendEmail, sendWelcome, sendPaymentConfirmation, sendPasswordReset, sendComunicado };
