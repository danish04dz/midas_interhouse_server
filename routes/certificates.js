const express = require('express');
const router = express.Router();
const { getCertificates, generateCertificates } = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.get('/', protect, authorizeRoles('admin', 'teacher'), getCertificates);
router.post('/generate', protect, authorizeRoles('admin'), generateCertificates);

module.exports = router;
