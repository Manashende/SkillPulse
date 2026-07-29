const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/profile',         getProfile);
router.put('/profile',         updateProfile);
router.put('/change-password', changePassword);
router.get('/dashboard',       getDashboard);
router.delete('/account',      deleteAccount);

module.exports = router;