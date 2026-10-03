const Session = require('../models/Session');

// @desc Get all sessions
// @route GET /api/sessions
const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.json(sessions);
  } catch (err) {
    next(err);
  }
};

// @desc Get active session
// @route GET /api/sessions/active
const getActiveSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ isActive: true });
    res.json(session);
  } catch (err) {
    next(err);
  }
};

// @desc Create session — Admin
// @route POST /api/sessions
const createSession = async (req, res, next) => {
  try {
    const { year, name, startDate, endDate } = req.body;
    const session = await Session.create({ year, name, startDate, endDate, createdBy: req.user._id });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

// @desc Update session — Admin
// @route PUT /api/sessions/:id
const updateSession = async (req, res, next) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    next(err);
  }
};

// @desc Activate session — Admin (deactivates all others)
// @route PATCH /api/sessions/:id/activate
const activateSession = async (req, res, next) => {
  try {
    await Session.updateMany({}, { isActive: false });
    const session = await Session.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    next(err);
  }
};

// @desc Delete session — Admin
// @route DELETE /api/sessions/:id
const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    await session.deleteOne();
    res.json({ message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSessions, getActiveSession, createSession, updateSession, activateSession, deleteSession };
