const Participant = require('../models/Participant');
const IndividualRegistration = require('../models/IndividualRegistration');
const Team = require('../models/Team');
const Score = require('../models/Score');
const Certificate = require('../models/Certificate');

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

// @desc Get single participant + full profile, events, medals & certificates
// @route GET /api/participants/:id
const getParticipant = async (req, res, next) => {
  try {
    const participant = await Participant.findById(req.params.id)
      .populate('house', 'name color logoUrl number motto')
      .populate('session', 'year name');
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const [indivRegs, teamRegs] = await Promise.all([
      IndividualRegistration.find({ participant: req.params.id })
        .populate('event', 'name department type status venue brief coverImageUrl'),
      Team.find({ members: req.params.id })
        .populate('event', 'name department type status venue brief coverImageUrl')
        .populate('house', 'name color logoUrl'),
    ]);

    const teamIds = teamRegs.map((t) => t._id);

    const [scores, certificates] = await Promise.all([
      Score.find({
        $or: [
          { participantId: req.params.id },
          { teamId: { $in: teamIds } },
        ],
        isLocked: true,
      })
        .populate('event', 'name department type status')
        .populate('house', 'name color logoUrl')
        .populate('teamId', 'name')
        .sort({ createdAt: -1 }),
      Certificate.find({
        $or: [
          { participantId: req.params.id },
          { teamId: { $in: teamIds } },
        ],
      })
        .populate('event', 'name department')
        .populate('house', 'name color')
        .sort({ generatedAt: -1 }),
    ]);

    const totalPointsContributed = scores.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0);
    const goldCount = scores.filter((s) => s.rank === 1).length;
    const silverCount = scores.filter((s) => s.rank === 2).length;
    const bronzeCount = scores.filter((s) => s.rank === 3).length;

    res.json({
      participant,
      individualEvents: indivRegs,
      teamEvents: teamRegs,
      scores,
      certificates,
      stats: {
        totalEvents: indivRegs.length + teamRegs.length,
        totalPoints: totalPointsContributed,
        goldCount,
        silverCount,
        bronzeCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc Add participant — Event Manager
// @route POST /api/participants
const addParticipant = async (req, res, next) => {
  try {
    const { name, class: studentClass, house, session } = req.body;
    const photoUrl = req.file?.path || '';
    const photoPublicId = req.file?.filename || '';

    let parsedStats = [];
    if (req.body.sportsStats) {
      try {
        parsedStats = typeof req.body.sportsStats === 'string' ? JSON.parse(req.body.sportsStats) : req.body.sportsStats;
      } catch (e) {
        console.error('Failed to parse sportsStats');
      }
    }

    const participant = await Participant.create({
      name, class: studentClass, house, session,
      photoUrl, photoPublicId,
      sportsStats: parsedStats,
      addedBy: req.user._id,
    });

    const populated = await participant.populate(['house', 'session']);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc Update participant — Event Manager/Admin
// @route PUT /api/participants/:id
const updateParticipant = async (req, res, next) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const { name, class: studentClass, house } = req.body;
    participant.name = name || participant.name;
    participant.class = studentClass || participant.class;
    participant.house = house || participant.house;
    
    if (req.body.sportsStats) {
      try {
        participant.sportsStats = typeof req.body.sportsStats === 'string' ? JSON.parse(req.body.sportsStats) : req.body.sportsStats;
      } catch (e) {
        console.error('Failed to parse sportsStats');
      }
    }

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
