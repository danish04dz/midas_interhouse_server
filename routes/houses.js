const express = require('express');
const router = express.Router();
const { getHouses, getHouse, createHouse, updateHouse, deleteHouse } = require('../controllers/houseController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { uploadHouseLogo } = require('../middleware/upload');

router.get('/', getHouses);
router.get('/:id', getHouse);
router.post('/', protect, authorizeRoles('admin'), uploadHouseLogo, createHouse);
router.put('/:id', protect, authorizeRoles('admin'), uploadHouseLogo, updateHouse);
router.delete('/:id', protect, authorizeRoles('admin'), deleteHouse);

module.exports = router;
