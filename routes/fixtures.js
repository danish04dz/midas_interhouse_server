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

// Protected routes (admin + teacher + scorer)
router.post('/', protect, authorizeRoles('admin'), createFixture);
router.post('/bulk', protect, authorizeRoles('admin'), createBulkFixtures);
router.post('/bracket', protect, authorizeRoles('admin'), createTournamentBracket);
router.put('/:id', protect, authorizeRoles('admin', 'teacher', 'scorer'), updateFixture);
router.patch('/:id/score', protect, authorizeRoles('admin', 'teacher', 'scorer'), updateScore);
router.post('/:id/commentary', protect, authorizeRoles('admin', 'teacher', 'scorer'), addCommentary);
router.patch('/:id/complete', protect, authorizeRoles('admin', 'teacher', 'scorer'), completeFixture);
router.delete('/:id', protect, authorizeRoles('admin'), deleteFixture);

module.exports = router;
