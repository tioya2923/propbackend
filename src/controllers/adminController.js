const { Op } = require('sequelize');
const { User, Propina, Payment, Comunicado, Material, Horario, ForumPost } = require('../models');
const { sendComunicado } = require('../services/email');
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
    const [propina] = await Propina.findOrCreate({
      where: { user_id },
      defaults: { montante_mensal: montante_mensal || 45000, moeda: moeda || 'AOA', data_vencimento, saldo_devedor: 0 },
    });
    if (montante_mensal) await propina.update({ montante_mensal, moeda, data_vencimento });
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

async function createHorario(req, res) {
  try {
    const { ano_formacao, dia_semana, hora_inicio, hora_fim, disciplina, professor, professor_id, sala } = req.body;
    if (!ano_formacao || !dia_semana || !hora_inicio || !hora_fim || !disciplina) {
      return res.status(400).json({ erro: 'Ano, dia, horas e disciplina são obrigatórios' });
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
    const query = `SELECT DATE_TRUNC('month', data_pagamento) AS mes, SUM(valor) AS total, COUNT(*) AS num_pagamentos
                   FROM payments WHERE confirmado = true
                   GROUP BY mes ORDER BY mes DESC LIMIT 12`;
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

async function uploadMaterial(req, res) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum ficheiro enviado' });
    const { titulo, descricao, tipo, ano_formacao } = req.body;
    const material = await Material.create({
      titulo, descricao, tipo: tipo || 'documento',
      ano_formacao: ano_formacao ? parseInt(ano_formacao) : null,
      ficheiro_url: `/uploads/${req.file.filename}`,
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

    const [
      totalSeminaristas,
      totalProfessores,
      totalFuncionarios,
      totalDireccao,
      totalAdministradores,
      ano1Count,
      ano2Count,
      totalPago,
      totalDevedor,
    ] = await Promise.all([
      countCargo('seminarista', 'seminarista'),
      countCargo('professor', null),
      countCargo('funcionario', 'staff'),
      countCargo('direccao', null),
      countCargo('administrador', null),
      User.count({ where: { ativo: true, [Op.or]: [{ cargo: 'seminarista' }, { cargo: null, permissoes: 'seminarista' }], ano_formacao: 1 } }),
      User.count({ where: { ativo: true, [Op.or]: [{ cargo: 'seminarista' }, { cargo: null, permissoes: 'seminarista' }], ano_formacao: 2 } }),
      Payment.sum('valor', { where: { confirmado: true } }),
      Propina.sum('saldo_devedor'),
    ]);

    res.json({
      total_seminaristas: totalSeminaristas,
      total_professores: totalProfessores,
      total_funcionarios: totalFuncionarios,
      total_direccao: totalDireccao,
      total_administradores: totalAdministradores,
      seminaristas_ano1: ano1Count,
      seminaristas_ano2: ano2Count,
      total_pago: totalPago || 0,
      total_devedor: totalDevedor || 0,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista, deleteSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado, listComunicados, deleteComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  uploadMaterial, listMateriaisAdmin, deleteMaterialAdmin,
  listHorarios, createHorario, updateHorario, deleteHorario,
  listForumAdmin, pinForumPost, deleteForumPost,
  getStats,
};
