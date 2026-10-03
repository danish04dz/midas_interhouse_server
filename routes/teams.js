const express = require('express');
const router = express.Router();
const { getTeams, getTeam, registerTeam, updateTeamStatus, deleteTeam } = require('../controllers/teamController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.get('/', getTeams);
router.get('/:id', getTeam);
router.post('/', protect, authorizeRoles('admin', 'teacher'), registerTeam);
router.patch('/:id/status', protect, authorizeRoles('admin'), updateTeamStatus);
router.delete('/:id', protect, authorizeRoles('admin', 'teacher'), deleteTeam);

module.exports = router;
