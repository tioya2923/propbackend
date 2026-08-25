const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getPerfil, updatePerfil, uploadFoto,
  getHorarios, getMateriais, getComunicados,
  getForumPosts, createForumPost,
} = require('../controllers/semináristaController');

router.use(authenticate);

router.get('/perfil', getPerfil);
router.put('/perfil', updatePerfil);
router.post('/foto', upload.single('foto'), uploadFoto);
router.get('/horarios', getHorarios);
router.get('/materiais', getMateriais);
router.get('/comunicados', getComunicados);
router.get('/forum', getForumPosts);
router.post('/forum', createForumPost);

module.exports = router;
