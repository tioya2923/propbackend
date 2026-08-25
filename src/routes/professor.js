const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getHorarios, getAlunos,
  getNotas, upsertNota, deleteNota,
  getTrabalhos, createTrabalho, updateTrabalho, deleteTrabalho, getEntregas, avaliarEntrega,
  getMateriais, uploadMaterialProf, deleteMaterialProf,
  getComunicados, enviarComunicado,
} = require('../controllers/professorController');

const isProfessor = (req, res, next) => {
  if (!req.user || req.user.cargo !== 'professor') {
    return res.status(403).json({ erro: 'Acesso reservado a professores' });
  }
  next();
};

router.use(authenticate, isProfessor);

router.get('/horarios', getHorarios);
router.get('/alunos', getAlunos);

router.get('/notas', getNotas);
router.post('/notas', upsertNota);
router.delete('/notas/:id', deleteNota);

router.get('/trabalhos', getTrabalhos);
router.post('/trabalhos', createTrabalho);
router.put('/trabalhos/:id', updateTrabalho);
router.delete('/trabalhos/:id', deleteTrabalho);
router.get('/trabalhos/:id/entregas', getEntregas);
router.post('/trabalhos/:id/avaliar', avaliarEntrega);

router.get('/materiais', getMateriais);
router.post('/materiais', upload.single('ficheiro'), uploadMaterialProf);
router.delete('/materiais/:id', deleteMaterialProf);

router.get('/comunicados', getComunicados);
router.post('/comunicados', enviarComunicado);

module.exports = router;
