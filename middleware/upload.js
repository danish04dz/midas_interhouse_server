const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

const createUploader = (folder, resourceType = 'image') => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `midas-competition/${folder}`,
      resource_type: resourceType,
      allowed_formats:
        resourceType === 'video'
          ? ['mp4', 'mov', 'avi', 'webm']
          : ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    },
  });
  return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB
};

const uploadHouseLogo = createUploader('houses').single('logo');
const uploadEventCover = createUploader('events').single('cover');
const uploadParticipantPhoto = createUploader('participants').single('photo');
const uploadGalleryMedia = createUploader('gallery', 'auto').single('media');
const uploadGalleryVideo = createUploader('gallery', 'video').single('media');

module.exports = {
  uploadHouseLogo,
  uploadEventCover,
  uploadParticipantPhoto,
  uploadGalleryMedia,
  uploadGalleryVideo,
};
