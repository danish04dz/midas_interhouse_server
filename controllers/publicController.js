const Participant = require('../models/Participant');
const House = require('../models/House');
const Event = require('../models/Event');
const Team = require('../models/Team');
const IndividualRegistration = require('../models/IndividualRegistration');
const Session = require('../models/Session');
const Score = require('../models/Score');

// @desc Get public stats for homepage
// @route GET /api/public/stats
const getStats = async (req, res, next) => {
  try {
    const sessionFilter = {};
    if (req.query.session) sessionFilter.session = req.query.session;

    const [totalHouses, totalEvents, totalParticipants, totalTeams, activeSession] = await Promise.all([
      House.countDocuments(),
      Event.countDocuments(sessionFilter),
      Participant.countDocuments(sessionFilter),
      Team.countDocuments(sessionFilter),
      Session.findOne({ isActive: true }),
    ]);

    res.json({ totalHouses, totalEvents, totalParticipants, totalTeams, activeSession });
  } catch (err) {
    next(err);
  }
};

// @desc Get public participant directory — shows participants + all their events
// @route GET /api/public/participants
const getPublicParticipants = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.session) filter.session = req.query.session;
    if (req.query.house) filter.house = req.query.house;
    if (req.query.class) filter.class = req.query.class;

    const participants = await Participant.find(filter)
      .populate('house', 'name color logoUrl number')
      .populate('session', 'year name')
      .sort({ name: 1 });

    // For each participant, fetch their individual + team events
    const result = await Promise.all(
      participants.map(async (p) => {
        const [indivRegs, teamRegs] = await Promise.all([
          IndividualRegistration.find({ participant: p._id })
            .populate('event', 'name department type status'),
          Team.find({ members: p._id })
            .populate('event', 'name department type status'),
        ]);

        return {
          ...p.toObject(),
          individualEvents: indivRegs.map((r) => ({ event: r.event, status: r.status })),
          teamEvents: teamRegs.map((t) => ({ team: t.name, event: t.event })),
          totalEvents: indivRegs.length + teamRegs.length,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// @desc Get public scores (locked only)
// @route GET /api/public/scores
const getPublicScores = async (req, res, next) => {
  try {
    const filter = { isLocked: true };
    if (req.query.session) filter.session = req.query.session;
    if (req.query.event) filter.event = req.query.event;
    if (req.query.house) filter.house = req.query.house;
    if (req.query.participantId) filter.participantId = req.query.participantId;
    if (req.query.teamId) filter.teamId = req.query.teamId;

    const scores = await Score.find(filter)
      .populate('event', 'name department type')
      .populate('house', 'name color logoUrl')
      .populate('teamId', 'name captainName')
      .populate('participantId', 'name rollNumber class')
      .sort({ createdAt: -1 });

    res.json(scores);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getPublicParticipants, getPublicScores };
