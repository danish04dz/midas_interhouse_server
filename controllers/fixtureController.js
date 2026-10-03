const asyncHandler = require('express-async-handler');
const Fixture = require('../models/Fixture');
const Session = require('../models/Session');

// Helper: emit socket update for a fixture
const emitFixtureUpdate = (req, fixture) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('fixture:updated', fixture);
    if (fixture.status === 'live') {
      io.emit('fixture:live', fixture);
    }
  }
};

// @desc  Get all fixtures (public)
// @route GET /api/fixtures
const getFixtures = asyncHandler(async (req, res) => {
  const { status, event, session } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (event) filter.event = event;
  if (session) filter.session = session;

  const fixtures = await Fixture.find(filter)
    .populate('event', 'name department type')
    .populate('session', 'name year')
    .populate('teamA.house', 'name color logoUrl number')
    .populate('teamB.house', 'name color logoUrl number')
    .populate('winner', 'name color logoUrl')
    .populate('createdBy', 'name')
    .sort({ scheduledAt: 1, createdAt: -1 });

  res.json(fixtures);
});

// @desc  Get live fixtures
// @route GET /api/fixtures/live
const getLiveFixtures = asyncHandler(async (req, res) => {
  const fixtures = await Fixture.find({ status: 'live' })
    .populate('event', 'name department type')
    .populate('teamA.house', 'name color logoUrl number')
    .populate('teamB.house', 'name color logoUrl number')
    .populate('winner', 'name color logoUrl')
    .sort({ updatedAt: -1 });

  res.json(fixtures);
});

// @desc  Get single fixture
// @route GET /api/fixtures/:id
const getFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id)
    .populate('event', 'name department type brief')
    .populate('session', 'name year')
    .populate('teamA.house', 'name color logoUrl number motto')
    .populate('teamB.house', 'name color logoUrl number motto')
    .populate('winner', 'name color logoUrl number')
    .populate('createdBy', 'name')
    .populate('managedBy', 'name');

  if (!fixture) return res.status(404).json({ message: 'Fixture not found' });
  res.json(fixture);
});

// @desc  Create a fixture
// @route POST /api/fixtures
const createFixture = asyncHandler(async (req, res) => {
  const {
    event, session: sessionId, sport, teamA, teamB, title,
    scheduledAt, venue, youtubeUrl, stage, matchNumber, nextFixture, nextFixtureSlot
  } = req.body;

  let activeSession = sessionId;
  if (!activeSession) {
    const active = await Session.findOne({ isActive: true });
    if (active) activeSession = active._id;
  }

  // Initialize sport-specific score
  const scoreDefaults = buildDefaultScore(sport);

  const fixture = await Fixture.create({
    title,
    event,
    session: activeSession,
    sport,
    teamA: { house: teamA.house, label: teamA.label || '' },
    teamB: { house: teamB.house, label: teamB.label || '' },
    scheduledAt,
    venue,
    youtubeUrl,
    stage: stage || 'league',
    matchNumber: matchNumber || 1,
    nextFixture: nextFixture || null,
    nextFixtureSlot: nextFixtureSlot || '',
    createdBy: req.user._id,
    ...scoreDefaults,
  });

  const populated = await Fixture.findById(fixture._id)
    .populate('event', 'name department type')
    .populate('teamA.house', 'name color logoUrl number')
    .populate('teamB.house', 'name color logoUrl number')
    .populate('nextFixture', 'title matchNumber stage');

  emitFixtureUpdate(req, populated);
  res.status(201).json(populated);
});

// @desc  Update fixture details (non-score)
// @route PUT /api/fixtures/:id
const updateFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

  const { title, scheduledAt, venue, youtubeUrl, status, stage, matchNumber, nextFixture, nextFixtureSlot, teamA, teamB, sport } = req.body;
  if (title !== undefined) fixture.title = title;
  if (scheduledAt !== undefined) fixture.scheduledAt = scheduledAt;
  if (venue !== undefined) fixture.venue = venue;
  if (youtubeUrl !== undefined) fixture.youtubeUrl = youtubeUrl;
  if (status !== undefined) fixture.status = status;
  if (stage !== undefined) fixture.stage = stage;
  if (matchNumber !== undefined) fixture.matchNumber = matchNumber;
  if (nextFixture !== undefined) fixture.nextFixture = nextFixture || null;
  if (nextFixtureSlot !== undefined) fixture.nextFixtureSlot = nextFixtureSlot || '';
  if (sport !== undefined) fixture.sport = sport;
  if (teamA?.house) fixture.teamA = { house: teamA.house, label: teamA.label || '' };
  if (teamB?.house) fixture.teamB = { house: teamB.house, label: teamB.label || '' };

  await fixture.save();
  const populated = await Fixture.findById(fixture._id)
    .populate('event', 'name department type')
    .populate('teamA.house', 'name color logoUrl number')
    .populate('teamB.house', 'name color logoUrl number')
    .populate('winner', 'name color logoUrl')
    .populate('nextFixture', 'title matchNumber stage');

  emitFixtureUpdate(req, populated);
  res.json(populated);
});

// @desc  Create 4-Team Tournament Bracket (SF1, SF2, Final)
// @route POST /api/fixtures/bracket
const createTournamentBracket = asyncHandler(async (req, res) => {
  const { eventId, sport, houses, venue, scheduledAt, titlePrefix } = req.body;
  if (!houses || houses.length < 4) {
    return res.status(400).json({ message: '4 Houses are required to build a 4-team knockout bracket' });
  }

  const active = await Session.findOne({ isActive: true });
  const activeSession = active ? active._id : null;
  const prefix = titlePrefix || 'Championship';

  // 1. Create Final Match (Match 3)
  const finalMatch = await Fixture.create({
    title: `${prefix} — 🏆 GRAND FINAL (Winner SF1 vs Winner SF2)`,
    event: eventId,
    session: activeSession,
    sport,
    teamA: { house: houses[0], label: 'Winner SF1 TBD' },
    teamB: { house: houses[2], label: 'Winner SF2 TBD' },
    stage: 'final',
    matchNumber: 3,
    venue: venue || 'Main Arena',
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  // 2. Create Semi-Final 1 (Match 1) -> Winner to Final teamA
  const sf1 = await Fixture.create({
    title: `${prefix} — ⚔️ Semi-Final 1`,
    event: eventId,
    session: activeSession,
    sport,
    teamA: { house: houses[0] },
    teamB: { house: houses[1] },
    stage: 'semi_final',
    matchNumber: 1,
    nextFixture: finalMatch._id,
    nextFixtureSlot: 'teamA',
    venue: venue || 'Main Arena',
    scheduledAt: scheduledAt || undefined,
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  // 3. Create Semi-Final 2 (Match 2) -> Winner to Final teamB
  const sf2 = await Fixture.create({
    title: `${prefix} — ⚔️ Semi-Final 2`,
    event: eventId,
    session: activeSession,
    sport,
    teamA: { house: houses[2] },
    teamB: { house: houses[3] },
    stage: 'semi_final',
    matchNumber: 2,
    nextFixture: finalMatch._id,
    nextFixtureSlot: 'teamB',
    venue: venue || 'Main Arena',
    scheduledAt: scheduledAt || undefined,
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  res.status(201).json({
    message: '4-Team Tournament Bracket created successfully!',
    sf1, sf2, finalMatch,
  });
});

// @desc  Update live score for a fixture
// @route PATCH /api/fixtures/:id/score
const updateScore = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

  const { sport, scoreData, youtubeUrl } = req.body;
  const activeSport = sport || fixture.sport;

  if (youtubeUrl !== undefined) {
    fixture.youtubeUrl = youtubeUrl;
  }

  if (activeSport === 'cricket') {
    fixture.cricketScore = { ...(fixture.cricketScore?.toObject() || buildDefaultScore('cricket').cricketScore), ...scoreData };
  } else if (activeSport === 'kabaddi') {
    fixture.kabaddiScore = { ...(fixture.kabaddiScore?.toObject() || buildDefaultScore('kabaddi').kabaddiScore), ...scoreData };
  } else if (['football', 'basketball', 'volleyball'].includes(activeSport)) {
    fixture.footballScore = { ...(fixture.footballScore?.toObject() || buildDefaultScore('football').footballScore), ...scoreData };
  } else if (['debate', 'music', 'dance', 'quiz', 'art', 'cultural'].includes(activeSport)) {
    fixture.culturalScore = { ...(fixture.culturalScore?.toObject() || buildDefaultScore('cultural').culturalScore), ...scoreData };
  } else {
    fixture.genericScore = { ...(fixture.genericScore?.toObject() || buildDefaultScore('generic').genericScore), ...scoreData };
  }

  fixture.managedBy = req.user._id;
  if (fixture.status === 'scheduled') fixture.status = 'live';

  await fixture.save();

  const populated = await Fixture.findById(fixture._id)
    .populate('event', 'name department type')
    .populate('teamA.house', 'name color logoUrl number')
    .populate('teamB.house', 'name color logoUrl number')
    .populate('winner', 'name color logoUrl');

  emitFixtureUpdate(req, populated);
  res.json(populated);
});

// @desc  Add commentary entry
// @route POST /api/fixtures/:id/commentary
const addCommentary = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

  const { text, type, time } = req.body;
  fixture.commentary.push({ text, type: type || 'general', time: time || '' });

  // Keep last 100 entries
  if (fixture.commentary.length > 100) {
    fixture.commentary = fixture.commentary.slice(-100);
  }

  await fixture.save();

  const io = req.app.get('io');
  if (io) {
    io.emit('fixture:commentary', {
      fixtureId: fixture._id,
      entry: fixture.commentary[fixture.commentary.length - 1],
    });
  }

  res.json({ message: 'Commentary added', commentary: fixture.commentary });
});

// @desc  Mark match as complete, declare winner & auto-advance to next match
// @route PATCH /api/fixtures/:id/complete
const completeFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

  const { winner, resultSummary, isDraw } = req.body;
  fixture.status = 'completed';
  fixture.winner = winner || null;
  fixture.resultSummary = resultSummary || '';
  fixture.isDraw = isDraw || false;

  await fixture.save();

  // AUTOMATIC ADVANCEMENT TO NEXT FIXTURE (e.g. Winner of SF1/SF2 -> Final)
  if (winner && fixture.nextFixture && fixture.nextFixtureSlot) {
    const House = require('../models/House');
    const winnerHouse = await House.findById(winner);
    const nextMatch = await Fixture.findById(fixture.nextFixture);

    if (nextMatch) {
      if (fixture.nextFixtureSlot === 'teamA') {
        nextMatch.teamA.house = winner;
        if (winnerHouse) nextMatch.teamA.label = `${winnerHouse.name} House`;
      } else if (fixture.nextFixtureSlot === 'teamB') {
        nextMatch.teamB.house = winner;
        if (winnerHouse) nextMatch.teamB.label = `${winnerHouse.name} House`;
      }

      nextMatch.commentary.push({
        text: `🏆 ${winnerHouse ? winnerHouse.name : 'Winner'} House WON Match #${fixture.matchNumber} and ADVANCED to this match!`,
        type: 'milestone',
        time: 'QUALIFIED',
      });

      await nextMatch.save();

      const populatedNext = await Fixture.findById(nextMatch._id)
        .populate('event', 'name department type')
        .populate('teamA.house', 'name color logoUrl number')
        .populate('teamB.house', 'name color logoUrl number')
        .populate('winner', 'name color logoUrl');

      emitFixtureUpdate(req, populatedNext);
    }
  }

  const populated = await Fixture.findById(fixture._id)
    .populate('event', 'name department type')
    .populate('teamA.house', 'name color logoUrl number')
    .populate('teamB.house', 'name color logoUrl number')
    .populate('winner', 'name color logoUrl');

  emitFixtureUpdate(req, populated);
  res.json(populated);
});

// @desc  Delete fixture
// @route DELETE /api/fixtures/:id
const deleteFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) return res.status(404).json({ message: 'Fixture not found' });
  await fixture.deleteOne();
  res.json({ message: 'Fixture deleted' });
});

// ── Helper ──────────────────────────────────────────────────────────────────
function buildDefaultScore(sport) {
  if (sport === 'cricket') {
    return {
      cricketScore: {
        teamA: { runs: 0, wickets: 0, overs: 0, balls: 0 },
        teamB: { runs: 0, wickets: 0, overs: 0, balls: 0 },
        currentBatting: 'teamA',
        totalOvers: 5,
        inning: 1,
        target: 0,
      },
    };
  }
  if (sport === 'kabaddi') {
    return {
      kabaddiScore: {
        teamA: { points: 0, tackles: 0, raids: 0 },
        teamB: { points: 0, tackles: 0, raids: 0 },
        half: 1,
        timeRemaining: '20:00',
      },
    };
  }
  if (['football', 'basketball', 'volleyball'].includes(sport)) {
    return {
      footballScore: {
        teamA: { goals: 0, yellowCards: 0, redCards: 0 },
        teamB: { goals: 0, yellowCards: 0, redCards: 0 },
        half: 1,
        minute: 0,
      },
    };
  }
  if (['debate', 'music', 'dance', 'quiz', 'art', 'cultural'].includes(sport)) {
    return {
      culturalScore: {
        teamA: { points: 0, round: 1 },
        teamB: { points: 0, round: 1 },
        currentRound: 1,
        totalRounds: 3,
        judgeNotes: '',
      },
    };
  }
  return {
    genericScore: { teamA: { points: 0 }, teamB: { points: 0 }, details: '' },
  };
}

module.exports = {
  getFixtures,
  getLiveFixtures,
  getFixture,
  createFixture,
  updateFixture,
  createTournamentBracket,
  updateScore,
  addCommentary,
  completeFixture,
  deleteFixture,
};
