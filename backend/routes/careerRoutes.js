const express = require('express');
const { getCareers, getCareer, getCareerMatches, getCareerSalary, getCareerExplore } = require('../controllers/careerController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.get('/match', getCareerMatches);
router.get('/explore', getCareerExplore);  
router.get('/', getCareers);
router.get('/:id', getCareer);
module.exports = router;