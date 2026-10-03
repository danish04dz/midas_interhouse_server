const Team = require('../models/Team');
const Event = require('../models/Event');

// @desc Get teams (filterable)
// @route GET /api/teams
const getTeams = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.event) filter.event = req.query.event;
    if (req.query.house) filter.house = req.query.house;
    if (req.query.session) filter.session = req.query.session;

    const teams = await Team.find(filter)
      .populate('event', 'name department')
      .populate('house', 'name color logoUrl')
      .populate('members', 'name rollNumber class')
      .populate('session', 'year name')
      .sort({ createdAt: -1 });
    res.json(teams);
  } catch (err) {
    next(err);
  }
};

// @desc Get single team
// @route GET /api/teams/:id
const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('event', 'name department markingScheme')
      .populate('house', 'name color logoUrl')
      .populate('members', 'name rollNumber class photoUrl');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    next(err);
  }
};

// @desc Register team — Teacher
// @route POST /api/teams
const registerTeam = async (req, res, next) => {
  try {
    const { name, event: eventId, house, session, members, captainName } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.type !== 'team') return res.status(400).json({ message: 'Event is not a team event' });

    // Teacher scope check
    if (req.user.role === 'teacher' && event.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot register team for another department event' });
    }

    if (event.status === 'draft' || event.status === 'registration_closed') {
      return res.status(400).json({ message: 'Registration is currently closed for this event.' });
    }

    // Enforce 1 team per house per event
    const existingTeam = await Team.findOne({ event: eventId, house });
    if (existingTeam) {
      return res.status(400).json({
        message: 'A team from this house has already been registered for this event. Only one team per house is allowed.',
      });
    }

    const parsedMembers = typeof members === 'string' ? JSON.parse(members) : members;

    const team = await Team.create({
      name,
      event: eventId,
      house,
      session: session || event.session,
      members: parsedMembers,
      captainName,
      registeredBy: req.user._id,
    });

    const populated = await team.populate(['event', 'house', 'members']);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc Update team status — Admin
// @route PATCH /api/teams/:id/status
const updateTeamStatus = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    next(err);
  }
};

// @desc Delete team — Teacher/Admin
// @route DELETE /api/teams/:id
const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    await team.deleteOne();
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeams,
  getTeam,
  registerTeam,
  updateTeamStatus,
  deleteTeam,
};
