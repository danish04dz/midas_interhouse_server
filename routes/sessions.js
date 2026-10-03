const express = require('express');
const router = express.Router();
const { getSessions, getActiveSession, createSession, updateSession, activateSession, deleteSession } = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.get('/', getSessions);
router.get('/active', getActiveSession);
router.post('/', protect, authorizeRoles('admin'), createSession);
router.put('/:id', protect, authorizeRoles('admin'), updateSession);
router.patch('/:id/activate', protect, authorizeRoles('admin'), activateSession);
router.delete('/:id', protect, authorizeRoles('admin'), deleteSession);

module.exports = router;
