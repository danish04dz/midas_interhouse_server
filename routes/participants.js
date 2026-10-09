const express = require('express');
const router = express.Router();
const { getParticipants, getParticipant, addParticipant, updateParticipant, deleteParticipant, addBulkParticipants } = require('../controllers/participantController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { uploadParticipantPhoto } = require('../middleware/upload');

router.get('/', getParticipants);
router.get('/:id', getParticipant);
router.post('/bulk', protect, authorizeRoles('admin', 'event_manager'), addBulkParticipants);
router.post('/', protect, authorizeRoles('admin', 'event_manager'), uploadParticipantPhoto, addParticipant);
router.put('/:id', protect, authorizeRoles('admin', 'event_manager'), uploadParticipantPhoto, updateParticipant);
router.delete('/:id', protect, authorizeRoles('admin', 'event_manager'), deleteParticipant);

module.exports = router;
