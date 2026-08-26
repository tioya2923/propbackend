const { Op } = require('sequelize');
const { User, Propina, Payment, Comunicado, Material, Horario, ForumPost } = require('../models');
const { sendComunicado, sendPaymentConfirmation } = require('../services/email');
const upload = require('../middleware/upload');
const logger = require('../utils/logger');

const CARGO_PERMISSOES = {
  seminarista: 'seminarista',
  professor: 'staff',
  funcionario: 'staff',
  direccao: 'admin',
  administrador: 'admin',
};

async function listSeminaristas(req, res) {
  try {
    const { page = 1, search, ano } = req.query;
    const where = {};
    if (search) where.nome = { [Op.iLike]: `%${search}%` };
    if (ano) where.ano_formacao = ano;

    const limit = Math.min(parseInt(req.query.limit) || 25, 500);
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Propina, as: 'propina' }],
      order: [['cargo', 'ASC'], ['nome', 'ASC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.json({ total: count, pagina: parseInt(page), seminaristas: rows.map(u => u.toPublic()) });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getSeminarista(req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Propina, as: 'propina', include: [{ model: Payment, as: 'payments', limit: 20, order: [['data_pagamento', 'DESC']] }] },
      ],
    });
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createSeminarista(req, res) {
  try {
    const { nome, email, password, ano_formacao, nif, cargo } = req.body;
    if (!nome || !email || !password) return res.status(400).json({ erro: 'Dados obrigatórios em falta' });
    if (!cargo) return res.status(400).json({ erro: 'Tipo obrigatório' });

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ erro: 'Email já registado' });

    const permissoes = CARGO_PERMISSOES[cargo] || 'seminarista';
    const user = await User.create({
      nome, email: email.toLowerCase(), password_hash: password,
      ano_formacao: cargo === 'seminarista' ? ano_formacao : null,
      permissoes, cargo,
    });
    if (nif) { user.setNif(nif); await user.save(); }

    const { sendWelcome } = require('../services/email');
    await sendWelcome(user).catch(() => {});
    res.status(201).json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updateSeminarista(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    const { nome, email, ano_formacao, ativo, cargo, password } = req.body;
    const updates = { nome, ativo };
    if (email) updates.email = email.toLowerCase();
    if (cargo) {
      updates.cargo = cargo;
      updates.permissoes = CARGO_PERMISSOES[cargo] || user.permissoes;
      updates.ano_formacao = cargo === 'seminarista' ? (ano_formacao || user.ano_formacao) : null;
    } else if (ano_formacao !== undefined) {
      updates.ano_formacao = ano_formacao;
    }
    if (password && password.length >= 8) updates.password_hash = password;
    await user.update(updates);
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteSeminarista(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    if (user.permissoes === 'admin') {
      return res.status(403).json({ erro: 'Não é possível eliminar um administrador' });
    }
    await user.destroy();
    res.json({ mensagem: 'Utilizador eliminado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function aplicarBolsa(req, res) {
  try {
    const { desconto_percentagem, bolsa } = req.body;
    const propina = await Propina.findOne({ where: { user_id: req.params.id } });
    if (!propina) return res.status(404).json({ erro: 'Propina não encontrada' });
    await propina.update({ bolsa, desconto_percentagem });
    res.json(propina);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function configurarPropina(req, res) {
  try {
    const { user_id, montante_mensal, moeda, data_vencimento } = req.body;
    if (!user_id) return res.status(400).json({ erro: 'Seminarista obrigatório' });

    const [propina] = await Propina.findOrCreate({
      where: { user_id },
      // Uma data vazia ("") vinda do formulário não é uma data válida para o
      // Postgres — tem de ser null para o campo (opcional) ficar por preencher.
      defaults: { montante_mensal: montante_mensal || 45000, moeda: moeda || 'AOA', data_vencimento: data_vencimento || null, saldo_devedor: 0 },
    });
    if (montante_mensal) {
      const updates = { montante_mensal, moeda };
      // Só altera a data se foi mesmo indicada — em branco não deve apagar uma
      // data de vencimento que já existisse.
      if (data_vencimento) updates.data_vencimento = data_vencimento;
      await propina.update(updates);
    }
    res.json(propina);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function enviarComunicado(req, res) {
  try {
    const { titulo, conteudo, destinatarios } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo obrigatórios' });

    const where = destinatarios === 'todos' ? {} : { permissoes: destinatarios };
    const users = await User.findAll({ where: { ...where, ativo: true }, attributes: ['email'] });

    const comunicado = await Comunicado.create({
      titulo, conteudo, destinatarios: destinatarios || 'todos',
      seccao: 'todos', autor_id: req.user.id,
    });

    const emails = users.map(u => u.email);
    await sendComunicado(emails, titulo, conteudo).catch(() => {});
    await comunicado.update({ enviado_email: true });

    res.status(201).json({ mensagem: `Comunicado enviado para ${emails.length} utilizadores`, comunicado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function listComunicados(req, res) {
  try {
    const comunicados = await Comunicado.findAll({
      include: [{ model: User, as: 'autor', attributes: ['nome'] }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    res.json(comunicados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteComunicado(req, res) {
  try {
    const comunicado = await Comunicado.findByPk(req.params.id);
    if (!comunicado) return res.status(404).json({ erro: 'Comunicado não encontrado' });
    await comunicado.destroy();
    res.json({ mensagem: 'Comunicado eliminado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function listMateriaisAdmin(req, res) {
  try {
    const materiais = await Material.findAll({
      include: [{ model: User, as: 'autor', attributes: ['nome'] }],
      order: [['created_at', 'DESC']],
      limit: 300,
    });
    res.json(materiais);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteMaterialAdmin(req, res) {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) return res.status(404).json({ erro: 'Material não encontrado' });
    await material.destroy();
    res.json({ mensagem: 'Material eliminado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function listHorarios(req, res) {
  try {
    const horarios = await Horario.findAll({
      include: [{ model: User, as: 'professor_user', attributes: ['id', 'nome'] }],
      order: [['ano_formacao', 'ASC'], ['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
    });
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// Duas aulas sobrepõem-se se uma começa antes da outra acabar e acaba
// depois da outra começar (comparação directa de strings "HH:MM" funciona
// porque o formato é sempre de largura fixa).
function horariosSobrepoem(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

async function encontrarConflito({ ano_formacao, dia_semana, hora_inicio, hora_fim, professor_id, excluirId }) {
  const where = { dia_semana, [Op.or]: [{ ano_formacao }, ...(professor_id ? [{ professor_id }] : [])] };
  if (excluirId) where.id = { [Op.ne]: excluirId };
  const candidatos = await Horario.findAll({ where });
  return candidatos.find(h => horariosSobrepoem(hora_inicio, hora_fim, h.hora_inicio, h.hora_fim));
}

async function createHorario(req, res) {
  try {
    const { ano_formacao, dia_semana, hora_inicio, hora_fim, disciplina, professor, professor_id, sala } = req.body;
    if (!ano_formacao || !dia_semana || !hora_inicio || !hora_fim || !disciplina) {
      return res.status(400).json({ erro: 'Ano, dia, horas e disciplina são obrigatórios' });
    }
    if (hora_fim <= hora_inicio) {
      return res.status(400).json({ erro: 'A hora de fim deve ser depois da hora de início' });
    }
    const conflito = await encontrarConflito({ ano_formacao, dia_semana, hora_inicio, hora_fim, professor_id });
    if (conflito) {
      const motivo = conflito.professor_id === professor_id && professor_id ? 'o professor já tem outra aula' : 'o ano já tem outra aula';
      return res.status(409).json({ erro: `Conflito de horário: ${motivo} nesse dia e hora (${conflito.disciplina}, ${conflito.hora_inicio?.slice(0, 5)}–${conflito.hora_fim?.slice(0, 5)})` });
    }
    const horario = await Horario.create({
      ano_formacao, dia_semana, hora_inicio, hora_fim, disciplina,
      professor: professor || null, professor_id: professor_id || null, sala: sala || null,
    });
    res.status(201).json(horario);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updateHorario(req, res) {
  try {
    const horario = await Horario.findByPk(req.params.id);
    if (!horario) return res.status(404).json({ erro: 'Horário não encontrado' });
    const { ano_formacao, dia_semana, hora_inicio, hora_fim, disciplina, professor, professor_id, sala } = req.body;
    if (hora_fim <= hora_inicio) {
      return res.status(400).json({ erro: 'A hora de fim deve ser depois da hora de início' });
    }
    const conflito = await encontrarConflito({ ano_formacao, dia_semana, hora_inicio, hora_fim, professor_id, excluirId: horario.id });
    if (conflito) {
      const motivo = conflito.professor_id === professor_id && professor_id ? 'o professor já tem outra aula' : 'o ano já tem outra aula';
      return res.status(409).json({ erro: `Conflito de horário: ${motivo} nesse dia e hora (${conflito.disciplina}, ${conflito.hora_inicio?.slice(0, 5)}–${conflito.hora_fim?.slice(0, 5)})` });
    }
    await horario.update({
      ano_formacao, dia_semana, hora_inicio, hora_fim, disciplina,
      professor: professor || null, professor_id: professor_id || null, sala: sala || null,
    });
    res.json(horario);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteHorario(req, res) {
  try {
    const horario = await Horario.findByPk(req.params.id);
    if (!horario) return res.status(404).json({ erro: 'Horário não encontrado' });
    await horario.destroy();
    res.json({ mensagem: 'Horário eliminado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function listForumAdmin(req, res) {
  try {
    const { page = 1, categoria } = req.query;
    const where = { parent_id: null };
    if (categoria) where.categoria = categoria;
    const limit = 20;

    const { count, rows } = await ForumPost.findAndCountAll({
      where,
      include: [
        { model: User, as: 'autor', attributes: ['nome', 'foto_url'] },
        {
          model: ForumPost, as: 'respostas',
          include: [{ model: User, as: 'autor', attributes: ['nome', 'foto_url'] }],
          separate: true,
          order: [['created_at', 'ASC']],
        },
      ],
      order: [['fixado', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.json({ total: count, pagina: parseInt(page), posts: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function pinForumPost(req, res) {
  try {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ erro: 'Publicação não encontrada' });
    await post.update({ fixado: !post.fixado });
    res.json(post);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteForumPost(req, res) {
  try {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ erro: 'Publicação não encontrada' });
    // Elimina primeiro as respostas associadas para não deixar registos órfãos.
    await ForumPost.destroy({ where: { parent_id: post.id } });
    await post.destroy();
    res.json({ mensagem: 'Publicação eliminada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function relatorioArrecadacao(req, res) {
  try {
    const { sequelize } = require('../models');
    // Agrupado também por moeda — somar AOA com EUR/USD sem distinção
    // produzia um total sem sentido assim que passámos a aceitar
    // pagamentos em várias moedas via Stripe.
    const query = `SELECT DATE_TRUNC('month', data_pagamento) AS mes, moeda, SUM(valor) AS total, COUNT(*) AS num_pagamentos
                   FROM payments WHERE confirmado = true
                   GROUP BY mes, moeda ORDER BY mes DESC LIMIT 36`;
    const rows = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function relatorioDevedores(req, res) {
  try {
    const devedores = await Propina.findAll({
      where: { saldo_devedor: { [Op.gt]: 0 } },
      include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'email', 'ano_formacao'] }],
      order: [['saldo_devedor', 'DESC']],
    });
    res.json(devedores);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getPagamentos(req, res) {
  try {
    const { page = 1, desde, ate } = req.query;
    const where = { confirmado: true };
    if (desde || ate) {
      where.data_pagamento = {};
      if (desde) where.data_pagamento[Op.gte] = new Date(desde);
      if (ate) where.data_pagamento[Op.lte] = new Date(ate);
    }

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['nome', 'email'] }],
      order: [['data_pagamento', 'DESC']],
      limit: 30,
      offset: (page - 1) * 30,
    });
    res.json({ total: count, pagina: parseInt(page), pagamentos: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// Pagamentos por Multibanco/transferência ficam "por confirmar" até a
// administração verificar o extracto bancário — sem isto não havia
// nenhuma forma de fechar o ciclo desses pagamentos (o cartão confirma-se
// sozinho junto do Stripe, mas o Multibanco é a via principal em AOA).
async function listPagamentosPendentes(req, res) {
  try {
    const pagamentos = await Payment.findAll({
      where: { confirmado: false },
      include: [{ model: User, as: 'user', attributes: ['nome', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    res.json(pagamentos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function confirmarPagamentoAdmin(req, res) {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ erro: 'Pagamento não encontrado' });
    if (payment.confirmado) return res.json({ mensagem: 'Já confirmado', payment });

    await payment.update({ confirmado: true, data_pagamento: payment.data_pagamento || new Date() });

    const propina = await Propina.findByPk(payment.propina_id);
    if (propina) {
      const novo_saldo = Math.max(0, parseFloat(propina.saldo_devedor) - parseFloat(payment.valor));
      await propina.update({ saldo_devedor: novo_saldo });
    }

    const user = await User.findByPk(payment.user_id);
    if (user) await sendPaymentConfirmation(user, payment).catch(() => {});

    res.json({ mensagem: 'Pagamento confirmado', payment });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function rejeitarPagamentoAdmin(req, res) {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ erro: 'Pagamento não encontrado' });
    if (payment.confirmado) return res.status(400).json({ erro: 'Não é possível rejeitar um pagamento já confirmado' });
    await payment.destroy();
    res.json({ mensagem: 'Pagamento rejeitado e removido' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function uploadMaterial(req, res) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum ficheiro enviado' });
    const { titulo, descricao, tipo, ano_formacao } = req.body;
    const material = await Material.create({
      titulo, descricao, tipo: tipo || 'documento',
      ano_formacao: ano_formacao ? parseInt(ano_formacao) : null,
      ficheiro_url: upload.getFileUrl(req.file),
      enviado_por: req.user.id,
      tamanho_bytes: req.file.size,
    });
    res.status(201).json(material);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getStats(req, res) {
  try {
    const countCargo = (cargo, permissoesFallback, extraWhere = {}) => User.count({
      where: {
        ativo: true,
        ...extraWhere,
        [Op.or]: [
          { cargo },
          ...(permissoesFallback ? [{ cargo: null, permissoes: permissoesFallback }] : []),
        ],
      },
    });

    const { sequelize } = require('../models');

    const [
      totalSeminaristas,
      totalProfessores,
      totalFuncionarios,
      totalDireccao,
      totalAdministradores,
      ano1Count,
      ano2Count,
      totalPagoPorMoeda,
      totalDevedorPorMoeda,
    ] = await Promise.all([
      countCargo('seminarista', 'seminarista'),
      countCargo('professor', null),
      countCargo('funcionario', 'staff'),
      countCargo('direccao', null),
      countCargo('administrador', null),
      User.count({ where: { ativo: true, [Op.or]: [{ cargo: 'seminarista' }, { cargo: null, permissoes: 'seminarista' }], ano_formacao: 1 } }),
      User.count({ where: { ativo: true, [Op.or]: [{ cargo: 'seminarista' }, { cargo: null, permissoes: 'seminarista' }], ano_formacao: 2 } }),
      // Agrupado por moeda — AOA, EUR e USD não podem ser somados como se
      // fossem o mesmo valor (bug real desde que o Stripe passou a aceitar
      // pagamentos em EUR/USD além dos Multibanco em AOA).
      Payment.findAll({
        attributes: ['moeda', [sequelize.fn('SUM', sequelize.col('valor')), 'total']],
        where: { confirmado: true },
        group: ['moeda'],
        raw: true,
      }),
      Propina.findAll({
        attributes: ['moeda', [sequelize.fn('SUM', sequelize.col('saldo_devedor')), 'total']],
        group: ['moeda'],
        raw: true,
      }),
    ]);

    const porMoeda = rows => rows.reduce((acc, r) => {
      acc[r.moeda] = parseFloat(r.total) || 0;
      return acc;
    }, { AOA: 0, EUR: 0, USD: 0 });

    res.json({
      total_seminaristas: totalSeminaristas,
      total_professores: totalProfessores,
      total_funcionarios: totalFuncionarios,
      total_direccao: totalDireccao,
      total_administradores: totalAdministradores,
      seminaristas_ano1: ano1Count,
      seminaristas_ano2: ano2Count,
      // Mantidos por compatibilidade (apenas o valor em AOA, a moeda
      // principal do seminário) — usar total_pago_moeda/total_devedor_moeda
      // para os totais correctos por moeda.
      total_pago: porMoeda(totalPagoPorMoeda).AOA,
      total_devedor: porMoeda(totalDevedorPorMoeda).AOA,
      total_pago_moeda: porMoeda(totalPagoPorMoeda),
      total_devedor_moeda: porMoeda(totalDevedorPorMoeda),
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista, deleteSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado, listComunicados, deleteComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  listPagamentosPendentes, confirmarPagamentoAdmin, rejeitarPagamentoAdmin,
  uploadMaterial, listMateriaisAdmin, deleteMaterialAdmin,
  listHorarios, createHorario, updateHorario, deleteHorario,
  listForumAdmin, pinForumPost, deleteForumPost,
  getStats,
};
