const Score = require('../models/Score');
const Event = require('../models/Event');

// @desc Get all scores (filterable by session, event, house, isLocked) — Admin/Teacher
// @route GET /api/scores
const getAllScores = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.session) filter.session = req.query.session;
    if (req.query.event) filter.event = req.query.event;
    if (req.query.house) filter.house = req.query.house;
    if (req.query.isLocked !== undefined) filter.isLocked = req.query.isLocked === 'true';

    const scores = await Score.find(filter)
      .populate('event', 'name department type')
      .populate('house', 'name color logoUrl')
      .populate('teamId', 'name captainName')
      .populate('participantId', 'name rollNumber class')
      .populate('enteredBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(scores);
  } catch (err) {
    next(err);
  }
};

// @desc Get scores for an event
// @route GET /api/scores/event/:eventId
const getScoresByEvent = async (req, res, next) => {
  try {
    const scores = await Score.find({ event: req.params.eventId })
      .populate('house', 'name color logoUrl')
      .populate('teamId', 'name captainName')
      .populate('participantId', 'name rollNumber class')
      .populate('enteredBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ rank: 1 });
    res.json(scores);
  } catch (err) {
    next(err);
  }
};

// @desc Enter score — Teacher/Admin
// @route POST /api/scores
const enterScore = async (req, res, next) => {
  try {
    const { event: eventId, session, house, entryType, teamId, participantId, criteriaScores, rank, remarks } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'teacher' && event.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot enter scores for another department' });
    }

    const parsedCriteria = typeof criteriaScores === 'string' ? JSON.parse(criteriaScores) : criteriaScores;
    const totalScore = (parsedCriteria || []).reduce((sum, c) => sum + (Number(c.marksAwarded) || 0), 0);

    // Helper for house position points (Only Top 3 receive points: 1st, 2nd, 3rd)
    const getHousePoints = (rNum, eventObj) => {
      if (!rNum) return 0;
      if (eventObj?.markingScheme?.positions?.length) {
        const pos = eventObj.markingScheme.positions.find((p) => Number(p.rank) === Number(rNum));
        if (pos && typeof pos.points === 'number') return pos.points;
      }
      const defaultMap = { 1: 10, 2: 7, 3: 5, 4: 0, 5: 0 };
      return defaultMap[rNum] || 0;
    };

    const pointsAwarded = getHousePoints(Number(rank), event);

    const query = { event: eventId };
    if (entryType === 'team' && teamId) query.teamId = teamId;
    else if (entryType === 'individual' && participantId) query.participantId = participantId;
    else query.house = house;

    let existingScore = await Score.findOne(query);

    if (existingScore) {
      if (existingScore.isLocked && req.user.role !== 'admin') {
        return res.status(400).json({ message: 'This score is locked and cannot be edited by teachers.' });
      }
      existingScore.criteriaScores = parsedCriteria;
      existingScore.totalScore = totalScore;
      existingScore.rank = Number(rank);
      existingScore.pointsAwarded = pointsAwarded;
      existingScore.remarks = remarks || existingScore.remarks;
      existingScore.enteredBy = req.user._id;
      await existingScore.save();
      return res.json(existingScore);
    }

    const score = await Score.create({
      event: eventId,
      session: session || event.session,
      house,
      entryType: entryType || (teamId ? 'team' : 'individual'),
      teamId: teamId || undefined,
      participantId: participantId || undefined,
      criteriaScores: parsedCriteria,
      totalScore,
      rank: Number(rank),
      pointsAwarded,
      remarks,
      enteredBy: req.user._id,
    });

    res.status(201).json(score);
  } catch (err) {
    next(err);
  }
};

// @desc Update score — Admin / Teacher (if unlocked)
// @route PUT /api/scores/:id
const updateScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id).populate('event');
    if (!score) return res.status(404).json({ message: 'Score not found' });
    if (score.isLocked && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Score is locked and cannot be edited.' });
    }

    if (req.user.role === 'teacher' && score.event.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot edit score for another department' });
    }

    const { criteriaScores, rank, remarks, pointsAwarded: customPoints } = req.body;
    const parsedCriteria = typeof criteriaScores === 'string' ? JSON.parse(criteriaScores) : criteriaScores;
    const totalScore = (parsedCriteria || []).reduce((sum, c) => sum + (Number(c.marksAwarded) || 0), 0);

    const getHousePoints = (rNum, eventObj) => {
      if (customPoints !== undefined) return Number(customPoints);
      if (!rNum) return 0;
      if (eventObj?.markingScheme?.positions?.length) {
        const pos = eventObj.markingScheme.positions.find((p) => Number(p.rank) === Number(rNum));
        if (pos && typeof pos.points === 'number') return pos.points;
      }
      const defaultMap = { 1: 10, 2: 7, 3: 5, 4: 0, 5: 0 };
      return defaultMap[rNum] || 0;
    };

    const points = getHousePoints(Number(rank), score.event);

    score.criteriaScores = parsedCriteria || score.criteriaScores;
    score.totalScore = totalScore;
    score.rank = Number(rank) || score.rank;
    score.pointsAwarded = points;
    if (remarks) score.remarks = remarks;
    await score.save();

    res.json(score);
  } catch (err) {
    next(err);
  }
};

// @desc Lock/approve score — Admin only
// @route PATCH /api/scores/:id/lock
const lockScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id);
    if (!score) return res.status(404).json({ message: 'Score not found' });

    score.isLocked = true;
    score.approvedBy = req.user._id;
    score.approvedAt = new Date();
    await score.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('leaderboard:update', { sessionId: score.session, houseId: score.house });
    }

    res.json(score);
  } catch (err) {
    next(err);
  }
};

// @desc Unlock score — Admin only
// @route PATCH /api/scores/:id/unlock
const unlockScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id);
    if (!score) return res.status(404).json({ message: 'Score not found' });

    score.isLocked = false;
    await score.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('leaderboard:update', { sessionId: score.session, houseId: score.house });
    }

    res.json(score);
  } catch (err) {
    next(err);
  }
};

// @desc Delete score — Admin only
// @route DELETE /api/scores/:id
const deleteScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id);
    if (!score) return res.status(404).json({ message: 'Score not found' });

    await score.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.emit('leaderboard:update', { sessionId: score.session, houseId: score.house });
    }

    res.json({ message: 'Score deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc Get pending (unlocked) scores — Admin
// @route GET /api/scores/pending
const getPendingScores = async (req, res, next) => {
  try {
    const scores = await Score.find({ isLocked: false })
      .populate('event', 'name department')
      .populate('house', 'name color')
      .populate('enteredBy', 'name department')
      .sort({ createdAt: -1 });
    res.json(scores);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllScores,
  getScoresByEvent,
  enterScore,
  updateScore,
  lockScore,
  unlockScore,
  deleteScore,
  getPendingScores,
};
