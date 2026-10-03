const Participant = require('../models/Participant');

// @desc Get all participants (filterable)
// @route GET /api/participants
const getParticipants = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.house) filter.house = req.query.house;
    if (req.query.session) filter.session = req.query.session;
    if (req.query.class) filter.class = req.query.class;

    const participants = await Participant.find(filter)
      .populate('house', 'name color logoUrl')
      .populate('session', 'year name')
      .sort({ name: 1 });
    res.json(participants);
  } catch (err) {
    next(err);
  }
};

// @desc Get single participant + their events
// @route GET /api/participants/:id
const getParticipant = async (req, res, next) => {
  try {
    const participant = await Participant.findById(req.params.id)
      .populate('house', 'name color logoUrl')
      .populate('session', 'year name');
    if (!participant) return res.status(404).json({ message: 'Participant not found' });
    res.json(participant);
  } catch (err) {
    next(err);
  }
};

// @desc Add participant — Teacher
// @route POST /api/participants
const addParticipant = async (req, res, next) => {
  try {
    const { name, rollNumber, class: studentClass, house, session } = req.body;
    const photoUrl = req.file?.path || '';
    const photoPublicId = req.file?.filename || '';

    const participant = await Participant.create({
      name, rollNumber, class: studentClass, house, session,
      photoUrl, photoPublicId,
      addedBy: req.user._id,
    });

    const populated = await participant.populate(['house', 'session']);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc Update participant — Teacher/Admin
// @route PUT /api/participants/:id
const updateParticipant = async (req, res, next) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const { name, rollNumber, class: studentClass, house } = req.body;
    participant.name = name || participant.name;
    participant.rollNumber = rollNumber || participant.rollNumber;
    participant.class = studentClass || participant.class;
    participant.house = house || participant.house;
    if (req.file) {
      participant.photoUrl = req.file.path;
      participant.photoPublicId = req.file.filename;
    }
    await participant.save();
    res.json(participant);
  } catch (err) {
    next(err);
  }
};

// @desc Delete participant — Admin
// @route DELETE /api/participants/:id
const deleteParticipant = async (req, res, next) => {
  try {
    const p = await Participant.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Participant not found' });
    await p.deleteOne();
    res.json({ message: 'Participant deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc Bulk Add participants via CSV/JSON — Admin
// @route POST /api/participants/bulk
const addBulkParticipants = async (req, res, next) => {
  try {
    const { participants } = req.body;
    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const enriched = participants.map(p => ({
      ...p,
      addedBy: req.user._id,
    }));

    const result = await Participant.insertMany(enriched, { ordered: false });
    res.status(201).json({ message: `${result.length} participants added successfully`, count: result.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getParticipants, getParticipant, addParticipant, updateParticipant, deleteParticipant, addBulkParticipants };
