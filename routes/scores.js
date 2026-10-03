const express = require('express');
const router = express.Router();
const {
  getAllScores,
  getScoresByEvent,
  enterScore,
  updateScore,
  lockScore,
  unlockScore,
  deleteScore,
  getPendingScores,
} = require('../controllers/scoreController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.get('/pending', protect, authorizeRoles('admin'), getPendingScores);
router.get('/', protect, authorizeRoles('admin', 'teacher'), getAllScores);
router.get('/event/:eventId', protect, authorizeRoles('admin', 'teacher'), getScoresByEvent);
router.post('/', protect, authorizeRoles('admin', 'teacher'), enterScore);
router.put('/:id', protect, authorizeRoles('admin', 'teacher'), updateScore);
router.patch('/:id/lock', protect, authorizeRoles('admin'), lockScore);
router.patch('/:id/unlock', protect, authorizeRoles('admin'), unlockScore);
router.delete('/:id', protect, authorizeRoles('admin'), deleteScore);

module.exports = router;
