const { Op } = require('sequelize');
const { User, Horario, Nota, Trabalho, EntregaTrabalho, Comunicado, Material } = require('../models');
const upload = require('../middleware/upload');

// ── Horários ─────────────────────────────────────────────────────────────────

async function getHorarios(req, res) {
  try {
    // Mostra sempre só as aulas atribuídas a este professor — a página
    // chama-se "Os Meus Horários", por isso nunca deve devolver o horário
    // de outros professores só porque este ainda não tem nenhuma aula
    // ligada à sua conta (antes caía nesse caso e mostrava tudo).
    const horarios = await Horario.findAll({
      where: { professor_id: req.user.id },
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
    });
    res.json(horarios);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

// ── Alunos ───────────────────────────────────────────────────────────────────

async function getAlunos(req, res) {
  try {
    const alunos = await User.findAll({
      where: { permissoes: 'seminarista', ativo: true },
      attributes: ['id', 'nome', 'email', 'ano_formacao'],
      order: [['ano_formacao', 'ASC'], ['nome', 'ASC']],
    });
    res.json(alunos);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

// ── Notas ────────────────────────────────────────────────────────────────────

async function getNotas(req, res) {
  try {
    const notas = await Nota.findAll({
      where: { professor_id: req.user.id },
      include: [{ model: User, as: 'seminarista', attributes: ['id', 'nome', 'ano_formacao'] }],
      order: [['materia', 'ASC'], ['periodo', 'ASC']],
    });
    res.json(notas);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function upsertNota(req, res) {
  try {
    const { seminarista_id, materia, periodo, valor, observacao } = req.body;
    if (!seminarista_id || !materia || !periodo || valor == null) {
      return res.status(400).json({ erro: 'Campos obrigatórios em falta' });
    }
    if (valor < 0 || valor > 20) return res.status(400).json({ erro: 'Nota deve estar entre 0 e 20' });

    const [nota] = await Nota.findOrCreate({
      where: { professor_id: req.user.id, seminarista_id, materia, periodo },
      defaults: { valor, observacao },
    });
    await nota.update({ valor, observacao });
    const com = await Nota.findByPk(nota.id, {
      include: [{ model: User, as: 'seminarista', attributes: ['id', 'nome', 'ano_formacao'] }],
    });
    res.json(com);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function deleteNota(req, res) {
  try {
    const nota = await Nota.findOne({ where: { id: req.params.id, professor_id: req.user.id } });
    if (!nota) return res.status(404).json({ erro: 'Nota não encontrada' });
    await nota.destroy();
    res.json({ mensagem: 'Nota eliminada' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

// ── Trabalhos ─────────────────────────────────────────────────────────────────

async function getTrabalhos(req, res) {
  try {
    const trabalhos = await Trabalho.findAll({
      where: { professor_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json(trabalhos);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function createTrabalho(req, res) {
  try {
    const { titulo, descricao, data_entrega, ano_formacao, materia, publicado } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' });
    const t = await Trabalho.create({
      professor_id: req.user.id,
      titulo, descricao, data_entrega,
      ano_formacao: ano_formacao || null,
      materia: materia || null,
      publicado: publicado || false,
    });
    res.status(201).json(t);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function updateTrabalho(req, res) {
  try {
    const t = await Trabalho.findOne({ where: { id: req.params.id, professor_id: req.user.id } });
    if (!t) return res.status(404).json({ erro: 'Trabalho não encontrado' });
    const { titulo, descricao, data_entrega, ano_formacao, materia, publicado } = req.body;
    await t.update({ titulo, descricao, data_entrega, ano_formacao, materia, publicado });
    res.json(t);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function deleteTrabalho(req, res) {
  try {
    const t = await Trabalho.findOne({ where: { id: req.params.id, professor_id: req.user.id } });
    if (!t) return res.status(404).json({ erro: 'Trabalho não encontrado' });
    await t.destroy();
    res.json({ mensagem: 'Trabalho eliminado' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function getEntregas(req, res) {
  try {
    const t = await Trabalho.findOne({ where: { id: req.params.id, professor_id: req.user.id } });
    if (!t) return res.status(404).json({ erro: 'Trabalho não encontrado' });
    const entregas = await EntregaTrabalho.findAll({
      where: { trabalho_id: req.params.id },
      include: [{ model: User, as: 'seminarista', attributes: ['id', 'nome', 'ano_formacao'] }],
    });
    res.json(entregas);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function avaliarEntrega(req, res) {
  try {
    const { seminarista_id, nota_valor, comentario } = req.body;
    const [entrega] = await EntregaTrabalho.findOrCreate({
      where: { trabalho_id: req.params.id, seminarista_id },
      defaults: { estado: 'avaliado', nota_valor, comentario },
    });
    await entrega.update({ nota_valor, comentario, estado: 'avaliado' });
    res.json(entrega);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

// ── Materiais ─────────────────────────────────────────────────────────────────

async function getMateriais(req, res) {
  try {
    const materiais = await Material.findAll({
      where: { enviado_por: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json(materiais);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function uploadMaterialProf(req, res) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Ficheiro obrigatório' });
    const { titulo, descricao, tipo, ano_formacao } = req.body;
    const material = await Material.create({
      titulo: titulo || req.file.originalname,
      descricao,
      tipo: tipo || 'outro',
      ficheiro_url: `/uploads/${req.file.filename}`,
      ano_formacao: ano_formacao ? parseInt(ano_formacao) : null,
      enviado_por: req.user.id,
    });
    res.status(201).json(material);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function deleteMaterialProf(req, res) {
  try {
    const m = await Material.findOne({ where: { id: req.params.id, enviado_por: req.user.id } });
    if (!m) return res.status(404).json({ erro: 'Material não encontrado' });
    await m.destroy();
    res.json({ mensagem: 'Material eliminado' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

// ── Comunicados ───────────────────────────────────────────────────────────────

async function getComunicados(req, res) {
  try {
    const comunicados = await Comunicado.findAll({
      where: { autor_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(comunicados);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

async function enviarComunicado(req, res) {
  try {
    const { titulo, conteudo } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo obrigatórios' });
    const comunicado = await Comunicado.create({
      titulo, conteudo,
      autor_id: req.user.id,
      seccao: 'todos',
      destinatarios: 'seminarista',
    });
    res.status(201).json(comunicado);
  } catch (err) { res.status(500).json({ erro: err.message }); }
}

module.exports = {
  getHorarios, getAlunos,
  getNotas, upsertNota, deleteNota,
  getTrabalhos, createTrabalho, updateTrabalho, deleteTrabalho, getEntregas, avaliarEntrega,
  getMateriais, uploadMaterialProf, deleteMaterialProf,
  getComunicados, enviarComunicado,
};
