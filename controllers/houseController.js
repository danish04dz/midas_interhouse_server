const House = require('../models/House');
const { cloudinary } = require('../config/cloudinary');

// @desc Get all houses
// @route GET /api/houses
const getHouses = async (req, res, next) => {
  try {
    const houses = await House.find().sort({ number: 1 }).populate('createdBy', 'name');
    res.json(houses);
  } catch (err) {
    next(err);
  }
};

// @desc Get single house
// @route GET /api/houses/:id
const getHouse = async (req, res, next) => {
  try {
    const house = await House.findById(req.params.id).populate('createdBy', 'name');
    if (!house) return res.status(404).json({ message: 'House not found' });
    res.json(house);
  } catch (err) {
    next(err);
  }
};

// @desc Create house (Admin)
// @route POST /api/houses
const createHouse = async (req, res, next) => {
  try {
    const { name, number, color, motto } = req.body;
    const logoUrl = req.file?.path || '';
    const logoPublicId = req.file?.filename || '';

    const house = await House.create({
      name, number, color, motto,
      logoUrl, logoPublicId,
      createdBy: req.user._id,
    });
    res.status(201).json(house);
  } catch (err) {
    next(err);
  }
};

// @desc Update house (Admin)
// @route PUT /api/houses/:id
const updateHouse = async (req, res, next) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'House not found' });

    const { name, number, color, motto } = req.body;

    // If new logo uploaded, delete old one from Cloudinary
    if (req.file && house.logoPublicId) {
      await cloudinary.uploader.destroy(house.logoPublicId);
    }

    house.name = name || house.name;
    house.number = number || house.number;
    house.color = color || house.color;
    house.motto = motto || house.motto;
    if (req.file) {
      house.logoUrl = req.file.path;
      house.logoPublicId = req.file.filename;
    }

    await house.save();
    res.json(house);
  } catch (err) {
    next(err);
  }
};

// @desc Delete house (Admin)
// @route DELETE /api/houses/:id
const deleteHouse = async (req, res, next) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'House not found' });
    if (house.logoPublicId) {
      await cloudinary.uploader.destroy(house.logoPublicId);
    }
    await house.deleteOne();
    res.json({ message: 'House deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHouses, getHouse, createHouse, updateHouse, deleteHouse };
