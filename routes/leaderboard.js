const express = require('express');
const router = express.Router();
const { getHouseLeaderboard, getTeamLeaderboard, getIndividualLeaderboard } = require('../controllers/leaderboardController');

router.get('/house', getHouseLeaderboard);
router.get('/team/:eventId', getTeamLeaderboard);
router.get('/individual/:eventId', getIndividualLeaderboard);

module.exports = router;
