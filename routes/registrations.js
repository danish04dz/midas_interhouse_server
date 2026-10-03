const express = require('express');
const router = express.Router();
const { getRegistrations, registerIndividual, updateRegistrationStatus, deleteRegistration } = require('../controllers/registrationController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.get('/', getRegistrations);
router.post('/', protect, authorizeRoles('admin', 'teacher'), registerIndividual);
router.patch('/:id/status', protect, authorizeRoles('admin'), updateRegistrationStatus);
router.delete('/:id', protect, authorizeRoles('admin', 'teacher'), deleteRegistration);

module.exports = router;
