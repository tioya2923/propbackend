// Cria (ou promove) UM único utilizador administrador, sem tocar em mais nada
// na base de dados — ao contrário de seed.js, que apaga tudo (`force: true`)
// e semeia dados de demonstração. Pensado para arrancar uma base de dados de
// produção vazia com uma conta real, com password à escolha.
//
// Uso:
//   node src/config/createAdmin.js <email> <password> "<Nome Completo>"
//
// Ou defina as variáveis de ambiente ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOME
// e corra sem argumentos.

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User } = require('../models');

async function createAdmin() {
  const [, , argEmail, argPassword, argNome] = process.argv;
  const email = (argEmail || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = argPassword || process.env.ADMIN_PASSWORD;
  const nome = argNome || process.env.ADMIN_NOME || 'Administrador';

  if (!email || !password) {
    console.error('Uso: node src/config/createAdmin.js <email> <password> "<Nome Completo>"');
    console.error('  (ou defina ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOME no ambiente)');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('A password deve ter no mínimo 8 caracteres.');
    process.exit(1);
  }

  await sequelize.authenticate();
  // Garante que as tabelas existem (idempotente — não apaga nada existente).
  await sequelize.sync();

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    await existing.update({ password_hash: password, permissoes: 'admin', ativo: true, nome });
    console.log(`✓ Utilizador existente "${email}" promovido a administrador e password actualizada.`);
  } else {
    await User.create({ nome, email, password_hash: password, permissoes: 'admin', ativo: true });
    console.log(`✓ Administrador "${email}" criado com sucesso.`);
  }

  await sequelize.close();
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
