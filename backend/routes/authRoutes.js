const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, verifyOtp, resendOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
], register);

router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code'),
], verifyOtp);

router.post('/resend-otp', [
  body('email').isEmail().withMessage('Valid email required'),
], resendOtp);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], login);

router.get('/me', protect, getMe);
module.exports = router;