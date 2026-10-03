const express = require('express');
const router = express.Router();
const { getEvents, getEvent, createEvent, updateEvent, updateEventStatus, deleteEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { uploadEventCover } = require('../middleware/upload');

router.get('/', getEvents);
router.get('/:id', getEvent);
router.post('/', protect, authorizeRoles('admin', 'teacher'), uploadEventCover, createEvent);
router.put('/:id', protect, authorizeRoles('admin', 'teacher'), uploadEventCover, updateEvent);
router.patch('/:id/status', protect, authorizeRoles('admin', 'teacher'), updateEventStatus);
router.delete('/:id', protect, authorizeRoles('admin'), deleteEvent);

module.exports = router;
