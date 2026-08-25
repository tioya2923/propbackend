const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimit');
const { getNoticias, getNoticia, getEventos, submitContacto, criarDonativo } = require('../controllers/publicController');
const { getConteudo, getEquipa } = require('../controllers/conteudoController');

router.use(apiLimiter);

router.get('/noticias', getNoticias);
router.get('/noticias/:id', getNoticia);
router.get('/eventos', getEventos);
router.post('/contacto/formulario', submitContacto);
router.get('/donativos/status', (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY || '';
  const disponivel = key.length > 0 && !key.startsWith('sk_test_...') && key !== 'sk_test_placeholder';
  res.json({ disponivel });
});
router.post('/donativos/criar', criarDonativo);
router.post('/donativos/mcx', require('../controllers/donativoController').mcxIntent);
router.post('/donativos/mbway', require('../controllers/donativoController').mbwayIntent);
router.get('/conteudo/:pagina', getConteudo);
router.get('/equipa', getEquipa);

module.exports = router;
