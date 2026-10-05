const mongoose = require('mongoose');
const Score = require('../models/Score');
const House = require('../models/House');

// @desc House Overall Leaderboard
// @route GET /api/leaderboard/house
const getHouseLeaderboard = async (req, res, next) => {
  try {
    const filter = { isLocked: true };
    if (req.query.session && mongoose.Types.ObjectId.isValid(req.query.session)) {
      filter.session = new mongoose.Types.ObjectId(req.query.session);
    }

    let deptFilterMatch = [];
    if (req.query.department) {
      if (req.query.department === 'sports' || req.query.department === 'games') {
        deptFilterMatch = [{ $match: { 'eventData.department': { $in: ['sports', 'games'] } } }];
      } else {
        deptFilterMatch = [{ $match: { 'eventData.department': req.query.department } }];
      }
    }

    // Aggregate points grouped by house and department
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventData',
        },
      },
      { $unwind: '$eventData' },
      ...deptFilterMatch,
      {
        $group: {
          _id: '$house',
          totalPoints: { $sum: '$pointsAwarded' },
          robotics_coding: {
            $sum: { $cond: [{ $eq: ['$eventData.department', 'robotics_coding'] }, '$pointsAwarded', 0] },
          },
          games: {
            $sum: { $cond: [{ $in: ['$eventData.department', ['games', 'sports']] }, '$pointsAwarded', 0] },
          },
          sports: {
            $sum: { $cond: [{ $in: ['$eventData.department', ['games', 'sports']] }, '$pointsAwarded', 0] },
          },
          art_craft: {
            $sum: { $cond: [{ $eq: ['$eventData.department', 'art_craft'] }, '$pointsAwarded', 0] },
          },
          music: {
            $sum: { $cond: [{ $eq: ['$eventData.department', 'music'] }, '$pointsAwarded', 0] },
          },
          pd: {
            $sum: { $cond: [{ $eq: ['$eventData.department', 'pd'] }, '$pointsAwarded', 0] },
          },
          eventsWon: { $sum: { $cond: [{ $eq: ['$rank', 1] }, 1, 0] } },
        },
      },
      { $sort: { totalPoints: -1 } },
      {
        $lookup: {
          from: 'houses',
          localField: '_id',
          foreignField: '_id',
          as: 'house',
        },
      },
      { $unwind: '$house' },
    ];

    const results = await Score.aggregate(pipeline);

    // Add rank position
    const ranked = results.map((r, i) => ({ ...r, rank: i + 1 }));

    // Get houses with 0 points too
    const allHouses = await House.find();
    const houseIds = ranked.map((r) => r._id.toString());
    const missing = allHouses
      .filter((h) => !houseIds.includes(h._id.toString()))
      .map((h) => ({
        _id: h._id,
        house: h,
        totalPoints: 0,
        robotics_coding: 0, games: 0, sports: 0, art_craft: 0, music: 0, pd: 0,
        eventsWon: 0,
        rank: ranked.length + allHouses.filter((hh) => !houseIds.includes(hh._id.toString())).indexOf(h) + 1,
      }));

    res.json([...ranked, ...missing]);
  } catch (err) {
    next(err);
  }
};

// @desc Team Leaderboard per event
// @route GET /api/leaderboard/team/:eventId
const getTeamLeaderboard = async (req, res, next) => {
  try {
    const scores = await Score.find({ event: req.params.eventId, entryType: 'team', isLocked: true })
      .populate('house', 'name color logoUrl number')
      .populate({
        path: 'teamId',
        select: 'name captainName members',
        populate: {
          path: 'members',
          select: 'name rollNumber class photoUrl',
        },
      })
      .sort({ rank: 1 });
    res.json(scores);
  } catch (err) {
    next(err);
  }
};

// @desc Individual Leaderboard per event
// @route GET /api/leaderboard/individual/:eventId
const getIndividualLeaderboard = async (req, res, next) => {
  try {
    const scores = await Score.find({ event: req.params.eventId, entryType: 'individual', isLocked: true })
      .populate('house', 'name color logoUrl number')
      .populate('participantId', 'name rollNumber class photoUrl')
      .sort({ rank: 1 });
    res.json(scores);
  } catch (err) {
    next(err);
  }
};

module.exports = { getHouseLeaderboard, getTeamLeaderboard, getIndividualLeaderboard };

