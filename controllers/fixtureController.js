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
    scheduledAt, duration, venue, youtubeUrl, stage, matchNumber, nextFixture, nextFixtureSlot
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
    duration,
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

  const { title, scheduledAt, duration, venue, youtubeUrl, status, stage, matchNumber, nextFixture, nextFixtureSlot, teamA, teamB, sport } = req.body;
  if (title !== undefined) fixture.title = title;
  if (scheduledAt !== undefined) fixture.scheduledAt = scheduledAt;
  if (duration !== undefined) fixture.duration = duration;
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

// @desc  Create multiple fixtures in bulk
// @route POST /api/fixtures/bulk
const createBulkFixtures = asyncHandler(async (req, res) => {
  const { matches } = req.body;
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return res.status(400).json({ message: 'Matches array is required' });
  }

  const active = await Session.findOne({ isActive: true });
  const activeSession = active ? active._id : null;

  const createdMap = {};
  const createdFixtures = [];

  // 1. Create all fixtures first
  for (const match of matches) {
    const { tempId, title, event, sport, teamA, teamB, scheduledAt, duration, venue } = match;
    const scoreDefaults = buildDefaultScore(sport);

    const parseTeam = (val) => {
      if (!val) return { house: null, label: 'TBD' };
      const [type, id] = val.split(':');
      if (type === 'house') return { house: id, label: '' };
      if (type === 'winner') {
        const sourceTitle = matches.find(m => m.tempId === id)?.title || 'Match';
        return { house: null, label: `Winner of ${sourceTitle}` };
      }
      if (type === 'loser') {
        const sourceTitle = matches.find(m => m.tempId === id)?.title || 'Match';
        return { house: null, label: `Loser of ${sourceTitle}` };
      }
      return { house: null, label: 'TBD' };
    };

    const fixture = await Fixture.create({
      title,
      event,
      session: activeSession,
      sport,
      teamA: parseTeam(teamA),
      teamB: parseTeam(teamB),
      scheduledAt: scheduledAt || undefined,
      duration: duration || '',
      venue: venue || '',
      createdBy: req.user._id,
      ...scoreDefaults,
    });
    
    if (tempId) createdMap[tempId] = fixture;
    createdFixtures.push(fixture);
  }

  // 2. Link advanced brackets
  for (const match of matches) {
    const fixture = createdMap[match.tempId];
    if (!fixture) continue;

    const linkAdvance = async (val, slot) => {
      if (!val) return;
      const [type, sourceTempId] = val.split(':');
      if (type === 'winner' || type === 'loser') {
        const sourceFixture = createdMap[sourceTempId];
        if (sourceFixture) {
           if (type === 'winner') {
             sourceFixture.nextFixture = fixture._id;
             sourceFixture.nextFixtureSlot = slot;
           } else {
             sourceFixture.loserNextFixture = fixture._id;
             sourceFixture.loserNextFixtureSlot = slot;
           }
           await sourceFixture.save();
        }
      }
    };

    await linkAdvance(match.teamA, 'teamA');
    await linkAdvance(match.teamB, 'teamB');
  }

  res.status(201).json({ message: `${createdFixtures.length} matches created successfully!`, fixtures: createdFixtures });
});

// @desc  Create 4-Team Tournament Bracket (SF1, SF2, Final)
// @route POST /api/fixtures/bracket
const createTournamentBracket = asyncHandler(async (req, res) => {
  const { eventId, sport, houses, venue, scheduledAt, duration, titlePrefix } = req.body;
  if (!houses || houses.length < 4) {
    return res.status(400).json({ message: '4 Houses are required to build a 4-team knockout bracket' });
  }

  const active = await Session.findOne({ isActive: true });
  const activeSession = active ? active._id : null;
  const prefix = titlePrefix || 'Championship';

  // 1. Create Final Match (Match 4)
  const finalMatch = await Fixture.create({
    title: `${prefix} — 🏆 GRAND FINAL (Winner SF1 vs Winner SF2)`,
    event: eventId,
    session: activeSession,
    sport,
    teamA: { house: houses[0], label: 'Winner SF1 TBD' },
    teamB: { house: houses[2], label: 'Winner SF2 TBD' },
    stage: 'final',
    matchNumber: 4,
    venue: venue || 'Main Arena',
    scheduledAt: scheduledAt || undefined,
    duration: duration || '',
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  // 2. Create Third-Place Match (Match 3)
  const thirdPlaceMatch = await Fixture.create({
    title: `${prefix} — 🥉 Third-Place Match (Loser SF1 vs Loser SF2)`,
    event: eventId,
    session: activeSession,
    sport,
    teamA: { house: houses[1], label: 'Loser SF1 TBD' },
    teamB: { house: houses[3], label: 'Loser SF2 TBD' },
    stage: 'third_place',
    matchNumber: 3,
    venue: venue || 'Main Arena',
    scheduledAt: scheduledAt || undefined,
    duration: duration || '',
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  // 3. Create Semi-Final 1 (Match 1) -> Winner to Final teamA, Loser to Third-Place teamA
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
    loserNextFixture: thirdPlaceMatch._id,
    loserNextFixtureSlot: 'teamA',
    venue: venue || 'Main Arena',
    scheduledAt: scheduledAt || undefined,
    duration: duration || '',
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  // 4. Create Semi-Final 2 (Match 2) -> Winner to Final teamB, Loser to Third-Place teamB
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
    loserNextFixture: thirdPlaceMatch._id,
    loserNextFixtureSlot: 'teamB',
    venue: venue || 'Main Arena',
    scheduledAt: scheduledAt || undefined,
    duration: duration || '',
    createdBy: req.user._id,
    ...buildDefaultScore(sport),
  });

  res.status(201).json({
    message: '4-Team Tournament Bracket created successfully!',
    sf1, sf2, thirdPlaceMatch, finalMatch,
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

  // AUTOMATIC ADVANCEMENT FOR LOSER TO NEXT FIXTURE (e.g. Third Place Match)
  if (winner && !fixture.isDraw && fixture.loserNextFixture && fixture.loserNextFixtureSlot) {
    const loserId = fixture.teamA.house.toString() === winner.toString() ? fixture.teamB.house : fixture.teamA.house;
    const House = require('../models/House');
    const loserHouse = await House.findById(loserId);
    const nextLoserMatch = await Fixture.findById(fixture.loserNextFixture);

    if (nextLoserMatch) {
      if (fixture.loserNextFixtureSlot === 'teamA') {
        nextLoserMatch.teamA.house = loserId;
        if (loserHouse) nextLoserMatch.teamA.label = `${loserHouse.name} House`;
      } else if (fixture.loserNextFixtureSlot === 'teamB') {
        nextLoserMatch.teamB.house = loserId;
        if (loserHouse) nextLoserMatch.teamB.label = `${loserHouse.name} House`;
      }

      nextLoserMatch.commentary.push({
        text: `The Loser of Match #${fixture.matchNumber} (${loserHouse ? loserHouse.name : 'Loser'} House) entered this match.`,
        type: 'milestone',
        time: 'QUALIFIED',
      });

      await nextLoserMatch.save();

      const populatedLoserNext = await Fixture.findById(nextLoserMatch._id)
        .populate('event', 'name department type')
        .populate('teamA.house', 'name color logoUrl number')
        .populate('teamB.house', 'name color logoUrl number')
        .populate('winner', 'name color logoUrl');

      emitFixtureUpdate(req, populatedLoserNext);
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
  createBulkFixtures,
  updateFixture,
  createTournamentBracket,
  updateScore,
  addCommentary,
  completeFixture,
  deleteFixture,
};
