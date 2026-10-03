const GalleryItem = require('../models/GalleryItem');
const { cloudinary } = require('../config/cloudinary');

// @desc Get gallery items (public)
// @route GET /api/gallery
const getGallery = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.event) filter.event = req.query.event;
    if (req.query.session) filter.session = req.query.session;
    if (req.query.type) filter.type = req.query.type;

    const items = await GalleryItem.find(filter)
      .populate('event', 'name department')
      .populate('session', 'year name')
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// @desc Upload gallery item — Teacher/Admin
// @route POST /api/gallery
const uploadGalleryItem = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { event, session, caption, type } = req.body;
    const item = await GalleryItem.create({
      event, session, caption,
      type: type || (req.file.mimetype.startsWith('video') ? 'video' : 'photo'),
      url: req.file.path,
      publicId: req.file.filename,
      uploadedBy: req.user._id,
    });

    const populated = await item.populate(['event', 'session', 'uploadedBy']);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc Delete gallery item — Teacher (own) / Admin
// @route DELETE /api/gallery/:id
const deleteGalleryItem = async (req, res, next) => {
  try {
    const item = await GalleryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Teachers can only delete their own uploads
    if (req.user.role === 'teacher' && item.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    await cloudinary.uploader.destroy(item.publicId, {
      resource_type: item.type === 'video' ? 'video' : 'image',
    });
    await item.deleteOne();
    res.json({ message: 'Gallery item deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGallery, uploadGalleryItem, deleteGalleryItem };
