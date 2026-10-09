const express = require('express');
const router = express.Router();
const {
  getFixtures,
  getLiveFixtures,
  getFixture,
  createFixture,
  createBulkFixtures,
  createTournamentBracket,
  updateFixture,
  updateScore,
  addCommentary,
  completeFixture,
  deleteFixture,
} = require('../controllers/fixtureController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Public routes
router.get('/', getFixtures);
router.get('/live', getLiveFixtures);
router.get('/:id', getFixture);

// Protected routes (admin + event_manager + scorer)
router.post('/', protect, authorizeRoles('admin'), createFixture);
router.post('/bulk', protect, authorizeRoles('admin'), createBulkFixtures);
router.post('/bracket', protect, authorizeRoles('admin'), createTournamentBracket);
router.put('/:id', protect, authorizeRoles('admin', 'event_manager'), updateFixture);
router.patch('/:id/score', protect, authorizeRoles('admin', 'event_manager'), updateScore);
router.post('/:id/commentary', protect, authorizeRoles('admin', 'event_manager'), addCommentary);
router.patch('/:id/complete', protect, authorizeRoles('admin', 'event_manager'), completeFixture);
router.delete('/:id', protect, authorizeRoles('admin'), deleteFixture);

module.exports = router;
