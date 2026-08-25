const router = require('express').Router();
const { login, me, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, login);
// Accounts are created by admins/staff only — see POST /api/admin/seminarista
router.get('/me', authenticate, me);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
