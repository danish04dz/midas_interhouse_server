const IndividualRegistration = require('../models/IndividualRegistration');
const Event = require('../models/Event');

// @desc Get individual registrations
// @route GET /api/registrations
const getRegistrations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.event) filter.event = req.query.event;
    if (req.query.house) filter.house = req.query.house;
    if (req.query.session) filter.session = req.query.session;
    if (req.query.participant) filter.participant = req.query.participant;

    const regs = await IndividualRegistration.find(filter)
      .populate('event', 'name department type')
      .populate('participant', 'name rollNumber class photoUrl')
      .populate('house', 'name color logoUrl')
      .populate('session', 'year name')
      .sort({ createdAt: -1 });
    res.json(regs);
  } catch (err) {
    next(err);
  }
};

// @desc Register individual — Event Manager
// @route POST /api/registrations
const registerIndividual = async (req, res, next) => {
  try {
    const { event: eventId, participant, house, session } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.type !== 'individual') return res.status(400).json({ message: 'Event is not individual type' });

    

    if (event.status !== 'registration_open') {
      return res.status(400).json({ message: 'Registration is not open' });
    }

    const reg = await IndividualRegistration.create({
      event: eventId, participant, house, session,
      registeredBy: req.user._id,
    });

    const populated = await reg.populate(['event', 'participant', 'house']);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc Update registration status — Admin
// @route PATCH /api/registrations/:id/status
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const reg = await IndividualRegistration.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    res.json(reg);
  } catch (err) {
    next(err);
  }
};

// @desc Delete registration — Event Manager/Admin
// @route DELETE /api/registrations/:id
const deleteRegistration = async (req, res, next) => {
  try {
    const reg = await IndividualRegistration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    await reg.deleteOne();
    res.json({ message: 'Registration deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRegistrations, registerIndividual, updateRegistrationStatus, deleteRegistration };
