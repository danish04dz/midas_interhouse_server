const express = require('express');
const router = express.Router();
const { getStats, getPublicParticipants, getPublicScores } = require('../controllers/publicController');

router.get('/stats', getStats);
router.get('/participants', getPublicParticipants);
router.get('/scores', getPublicScores);

module.exports = router;
