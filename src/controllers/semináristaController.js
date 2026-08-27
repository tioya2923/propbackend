const { Op } = require('sequelize');
const { User, Propina, Payment, Horario, Material, Comunicado, ForumPost, Nota } = require('../models');
const upload = require('../middleware/upload');

async function getPerfil(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Propina, as: 'propina' }],
    });
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updatePerfil(req, res) {
  try {
    const { nome, foto_url } = req.body;
    await req.user.update({ nome, foto_url });
    res.json(req.user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function uploadFoto(req, res) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum ficheiro enviado' });
    const url = upload.getFileUrl(req.file);
    await req.user.update({ foto_url: url });
    res.json({ foto_url: url });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getHorarios(req, res) {
  try {
    const where = {};
    if (req.user.ano_formacao) where.ano_formacao = req.user.ano_formacao;

    const horarios = await Horario.findAll({
      where,
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
    });
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getMateriais(req, res) {
  try {
    const where = {};
    if (req.user.permissoes === 'seminarista' && req.user.ano_formacao) {
      where[Op.or] = [
        { ano_formacao: req.user.ano_formacao },
        { ano_formacao: null },
      ];
    }
    const materiais = await Material.findAll({ where, order: [['created_at', 'DESC']] });
    res.json(materiais);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getComunicados(req, res) {
  try {
    const comunicados = await Comunicado.findAll({
      where: {
        destinatarios: { [Op.in]: ['todos', req.user.permissoes] },
      },
      include: [{ model: User, as: 'autor', attributes: ['nome'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(comunicados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getForumPosts(req, res) {
  try {
    const { page = 1, categoria } = req.query;
    const where = { parent_id: null };
    if (categoria) where.categoria = categoria;

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
      limit: 20,
      offset: (page - 1) * 20,
    });
    res.json({ total: count, pagina: parseInt(page), posts: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getMinhasNotas(req, res) {
  try {
    const notas = await Nota.findAll({
      where: { seminarista_id: req.user.id },
      include: [{ model: User, as: 'professor', attributes: ['nome'] }],
      order: [['periodo', 'DESC'], ['materia', 'ASC']],
    });
    res.json(notas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createForumPost(req, res) {
  try {
    const { titulo, conteudo, categoria, parent_id } = req.body;
    if (!conteudo) return res.status(400).json({ erro: 'Conteúdo obrigatório' });

    if (parent_id) {
      const parent = await ForumPost.findByPk(parent_id);
      if (!parent) return res.status(404).json({ erro: 'Publicação a responder não encontrada' });
      if (parent.parent_id) return res.status(400).json({ erro: 'Não é possível responder a uma resposta' });
    }

    const post = await ForumPost.create({
      titulo: parent_id ? null : titulo,
      conteudo, categoria, parent_id: parent_id || null,
      autor_id: req.user.id,
    });
    const comAutor = await ForumPost.findByPk(post.id, {
      include: [{ model: User, as: 'autor', attributes: ['nome', 'foto_url'] }],
    });
    res.status(201).json(comAutor);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { getPerfil, updatePerfil, uploadFoto, getHorarios, getMateriais, getComunicados, getMinhasNotas, getForumPosts, createForumPost };
