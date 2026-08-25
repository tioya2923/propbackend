const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimit');
const {
  getMinhaDivida, iniciarPagamento, confirmarPagamento,
  getRecibos, downloadRecibo, pedirProrrogacao,
} = require('../controllers/propinaController');

router.use(authenticate);

router.get('/minha-divida', getMinhaDivida);
router.post('/pagar', paymentLimiter, iniciarPagamento);
router.post('/confirmar', confirmarPagamento);
router.get('/recibos', getRecibos);
router.get('/recibos/:id/download', downloadRecibo);
router.post('/pedir-prorrogacao', pedirProrrogacao);

module.exports = router;
