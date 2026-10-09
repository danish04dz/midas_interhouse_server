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
router.get('/', protect, authorizeRoles('admin', 'event_manager'), getAllScores);
router.get('/event/:eventId', protect, authorizeRoles('admin', 'event_manager'), getScoresByEvent);
router.post('/', protect, authorizeRoles('admin', 'event_manager'), enterScore);
router.put('/:id', protect, authorizeRoles('admin', 'event_manager'), updateScore);
router.patch('/:id/lock', protect, authorizeRoles('admin'), lockScore);
router.patch('/:id/unlock', protect, authorizeRoles('admin'), unlockScore);
router.delete('/:id', protect, authorizeRoles('admin'), deleteScore);

module.exports = router;
