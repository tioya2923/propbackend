const { Op } = require('sequelize');
const { PageContent, TeamMember, News, Event, User } = require('../models');

// ── PageContent ─────────────────────────────────────────────────────────────

async function getConteudo(req, res) {
  try {
    const rows = await PageContent.findAll({ where: { pagina: req.params.pagina } });
    const obj = {};
    for (const r of rows) obj[r.chave] = r.tipo === 'json' ? JSON.parse(r.valor || '[]') : r.valor;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function upsertConteudo(req, res) {
  try {
    const { pagina, chave, valor, tipo } = req.body;
    if (!pagina || !chave) return res.status(400).json({ erro: 'pagina e chave são obrigatórios' });
    const valorStr = typeof valor === 'object' ? JSON.stringify(valor) : String(valor ?? '');
    const [row] = await PageContent.findOrCreate({ where: { pagina, chave }, defaults: { valor: valorStr, tipo: tipo || 'text' } });
    if (row.valor !== valorStr || (tipo && row.tipo !== tipo)) {
      await row.update({ valor: valorStr, tipo: tipo || row.tipo });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// Save an entire page at once: body = { pagina, campos: [{chave, valor, tipo}] }
async function upsertPagina(req, res) {
  try {
    const { pagina, campos } = req.body;
    if (!pagina || !Array.isArray(campos)) return res.status(400).json({ erro: 'pagina e campos[] obrigatórios' });
    for (const { chave, valor, tipo } of campos) {
      const valorStr = typeof valor === 'object' ? JSON.stringify(valor) : String(valor ?? '');
      const [row, created] = await PageContent.findOrCreate({ where: { pagina, chave }, defaults: { valor: valorStr, tipo: tipo || 'text' } });
      if (!created) await row.update({ valor: valorStr, tipo: tipo || row.tipo });
    }
    res.json({ mensagem: 'Conteúdo guardado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// ── TeamMember ───────────────────────────────────────────────────────────────

async function getEquipa(req, res) {
  try {
    const members = await TeamMember.findAll({ where: { ativo: true }, order: [['ordem', 'ASC'], ['nome', 'ASC']] });
    res.json(members);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// Listagem para o painel de administração — inclui também membros inactivos,
// para que possam ser reactivados/editados em vez de ficarem invisíveis para sempre.
async function listEquipaAdmin(req, res) {
  try {
    const members = await TeamMember.findAll({ order: [['ordem', 'ASC'], ['nome', 'ASC']] });
    res.json(members);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createMembro(req, res) {
  try {
    const { nome, cargo, area, ordem } = req.body;
    if (!nome || !cargo) return res.status(400).json({ erro: 'nome e cargo são obrigatórios' });
    const membro = await TeamMember.create({ nome, cargo, area, ordem: ordem || 0 });
    res.status(201).json(membro);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updateMembro(req, res) {
  try {
    const membro = await TeamMember.findByPk(req.params.id);
    if (!membro) return res.status(404).json({ erro: 'Membro não encontrado' });
    const { nome, cargo, area, ordem, ativo } = req.body;
    await membro.update({ nome, cargo, area, ordem, ativo });
    res.json(membro);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteMembro(req, res) {
  try {
    const membro = await TeamMember.findByPk(req.params.id);
    if (!membro) return res.status(404).json({ erro: 'Membro não encontrado' });
    await membro.destroy();
    res.json({ mensagem: 'Membro eliminado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// ── News CRUD ────────────────────────────────────────────────────────────────

async function listNoticias(req, res) {
  try {
    const { page = 1, publicado } = req.query;
    const where = {};
    if (publicado !== undefined) where.publicado = publicado === 'true';
    const { count, rows } = await News.findAndCountAll({
      where,
      attributes: { exclude: ['conteudo'] },
      order: [['created_at', 'DESC']],
      limit: 20,
      offset: (page - 1) * 20,
    });
    res.json({ total: count, pagina: parseInt(page), noticias: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getNoticia(req, res) {
  try {
    const noticia = await News.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ erro: 'Notícia não encontrada' });
    res.json(noticia);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createNoticia(req, res) {
  try {
    const { titulo, resumo, conteudo, imagem_url, categoria, destaque, publicado } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo obrigatórios' });
    const slug = titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
    const noticia = await News.create({
      titulo, resumo, conteudo, imagem_url: imagem_url || null,
      categoria: categoria || 'geral',
      destaque: destaque || false,
      publicado: publicado || false,
      data_publicacao: publicado ? new Date() : null,
      slug: `${slug}-${Date.now()}`,
      autor_id: req.user.id,
    });
    res.status(201).json(noticia);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updateNoticia(req, res) {
  try {
    const noticia = await News.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ erro: 'Notícia não encontrada' });
    const { titulo, resumo, conteudo, imagem_url, categoria, destaque, publicado } = req.body;
    const updates = { titulo, resumo, conteudo, categoria, destaque };
    if (imagem_url !== undefined) updates.imagem_url = imagem_url || null;
    if (publicado !== undefined) {
      updates.publicado = publicado;
      if (publicado && !noticia.publicado) updates.data_publicacao = new Date();
    }
    await noticia.update(updates);
    res.json(noticia);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteNoticia(req, res) {
  try {
    const noticia = await News.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ erro: 'Notícia não encontrada' });
    await noticia.destroy();
    res.json({ mensagem: 'Notícia eliminada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// ── Events CRUD ──────────────────────────────────────────────────────────────

async function listEventos(req, res) {
  try {
    const { page = 1 } = req.query;
    const { count, rows } = await Event.findAndCountAll({
      order: [['data_inicio', 'DESC']],
      limit: 20,
      offset: (page - 1) * 20,
    });
    res.json({ total: count, pagina: parseInt(page), eventos: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createEvento(req, res) {
  try {
    const { titulo, descricao, data_inicio, data_fim, local, imagem_url, tipo, publico } = req.body;
    if (!titulo || !data_inicio) return res.status(400).json({ erro: 'Título e data de início obrigatórios' });
    const evento = await Event.create({ titulo, descricao, data_inicio, data_fim, local, imagem_url: imagem_url || null, tipo: tipo || 'outro', publico: publico ?? true, criado_por: req.user.id });
    res.status(201).json(evento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updateEvento(req, res) {
  try {
    const evento = await Event.findByPk(req.params.id);
    if (!evento) return res.status(404).json({ erro: 'Evento não encontrado' });
    const { titulo, descricao, data_inicio, data_fim, local, imagem_url, tipo, publico } = req.body;
    const updates = { titulo, descricao, data_inicio, data_fim, local, tipo, publico };
    if (imagem_url !== undefined) updates.imagem_url = imagem_url || null;
    await evento.update(updates);
    res.json(evento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteEvento(req, res) {
  try {
    const evento = await Event.findByPk(req.params.id);
    if (!evento) return res.status(404).json({ erro: 'Evento não encontrado' });
    await evento.destroy();
    res.json({ mensagem: 'Evento eliminado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  getConteudo, upsertConteudo, upsertPagina,
  getEquipa, listEquipaAdmin, createMembro, updateMembro, deleteMembro,
  listNoticias, getNoticia, createNoticia, updateNoticia, deleteNoticia,
  listEventos, createEvento, updateEvento, deleteEvento,
};
