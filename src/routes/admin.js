const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista, deleteSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado, listComunicados, deleteComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  listPagamentosPendentes, confirmarPagamentoAdmin, rejeitarPagamentoAdmin,
  uploadMaterial, listMateriaisAdmin, deleteMaterialAdmin,
  listHorarios, createHorario, updateHorario, deleteHorario,
  listForumAdmin, pinForumPost, deleteForumPost,
  getStats,
} = require('../controllers/adminController');
const {
  upsertPagina, upsertConteudo,
  listEquipaAdmin, createMembro, updateMembro, deleteMembro,
  listNoticias, getNoticia, createNoticia, updateNoticia, deleteNoticia,
  listEventos, createEvento, updateEvento, deleteEvento,
} = require('../controllers/conteudoController');

router.use(authenticate, authorize('admin', 'staff'));

// ── Seminaristas ─────────────────────────────────────────────────────────────
router.get('/stats', getStats);
router.get('/seminaristas', listSeminaristas);
router.get('/seminarista/:id', getSeminarista);
router.post('/seminarista', authorize('admin'), createSeminarista);
router.put('/seminarista/:id', updateSeminarista);
router.delete('/seminarista/:id', authorize('admin'), deleteSeminarista);
router.post('/seminarista/:id/bolsa', authorize('admin'), aplicarBolsa);

// ── Comunicados e Materiais ───────────────────────────────────────────────────
router.get('/comunicados', listComunicados);
router.post('/comunicado', enviarComunicado);
router.delete('/comunicado/:id', authorize('admin'), deleteComunicado);

router.get('/materiais', listMateriaisAdmin);
router.post('/material', upload.single('ficheiro'), uploadMaterial);
router.delete('/material/:id', authorize('admin'), deleteMaterialAdmin);

// ── Horários ──────────────────────────────────────────────────────────────────
router.get('/horarios', listHorarios);
router.post('/horario', createHorario);
router.put('/horario/:id', updateHorario);
router.delete('/horario/:id', authorize('admin'), deleteHorario);

// ── Fórum (moderação) ────────────────────────────────────────────────────────
router.get('/forum', listForumAdmin);
router.post('/forum/:id/fixar', pinForumPost);
router.delete('/forum/:id', authorize('admin'), deleteForumPost);

// ── Pagamentos e Relatórios ───────────────────────────────────────────────────
router.get('/pagamentos', getPagamentos);
router.get('/pagamentos/pendentes', listPagamentosPendentes);
// Confirmar/rejeitar mexe directamente no saldo devedor do seminarista —
// reservado ao administrador, tal como as outras acções financeiras aqui.
router.post('/pagamentos/:id/confirmar', authorize('admin'), confirmarPagamentoAdmin);
router.delete('/pagamentos/:id', authorize('admin'), rejeitarPagamentoAdmin);
router.post('/propina/config', authorize('admin'), configurarPropina);
router.get('/relatorios/arrecadacao', relatorioArrecadacao);
router.get('/relatorios/devedores', relatorioDevedores);

// ── Upload de imagens ─────────────────────────────────────────────────────────
router.post('/upload/imagem', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ erro: err.message || 'Erro ao processar imagem' });
    }
    if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
    res.json({ url: upload.getFileUrl(req.file) });
  });
});

// ── Conteúdo de páginas ───────────────────────────────────────────────────────
router.put('/conteudo', authorize('admin'), upsertPagina);
router.put('/conteudo/campo', authorize('admin'), upsertConteudo);

// ── Equipa Formadora ──────────────────────────────────────────────────────────
router.get('/equipa', listEquipaAdmin);
router.post('/equipa', authorize('admin'), createMembro);
router.put('/equipa/:id', authorize('admin'), updateMembro);
router.delete('/equipa/:id', authorize('admin'), deleteMembro);

// ── Notícias ──────────────────────────────────────────────────────────────────
router.get('/noticias', listNoticias);
router.get('/noticias/:id', getNoticia);
router.post('/noticias', createNoticia);
router.put('/noticias/:id', updateNoticia);
router.delete('/noticias/:id', authorize('admin'), deleteNoticia);

// ── Eventos ───────────────────────────────────────────────────────────────────
router.get('/eventos', listEventos);
router.post('/eventos', createEvento);
router.put('/eventos/:id', updateEvento);
router.delete('/eventos/:id', authorize('admin'), deleteEvento);

module.exports = router;
