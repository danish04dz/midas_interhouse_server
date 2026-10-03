const express = require('express');
const router = express.Router();
const { getGallery, uploadGalleryItem, deleteGalleryItem } = require('../controllers/galleryController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { uploadGalleryMedia } = require('../middleware/upload');

router.get('/', getGallery);
router.post('/', protect, authorizeRoles('admin', 'teacher'), uploadGalleryMedia, uploadGalleryItem);
router.delete('/:id', protect, authorizeRoles('admin', 'teacher'), deleteGalleryItem);

module.exports = router;
