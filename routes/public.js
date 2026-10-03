const express = require('express');
const router = express.Router();
const { getStats, getPublicParticipants } = require('../controllers/publicController');

router.get('/stats', getStats);
router.get('/participants', getPublicParticipants);

module.exports = router;
