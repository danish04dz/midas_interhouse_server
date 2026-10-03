const Event = require('../models/Event');
const { cloudinary } = require('../config/cloudinary');

// @desc Get all events (public, filterable)
// @route GET /api/events
const getEvents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.session) filter.session = req.query.session;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    // If teacher, only show their department
    if (req.user && req.user.role === 'teacher') {
      filter.department = req.user.department;
    }

    const events = await Event.find(filter)
      .populate('session', 'year name')
      .populate('createdBy', 'name department')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    next(err);
  }
};

// @desc Get single event (public)
// @route GET /api/events/:id
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('session', 'year name')
      .populate('createdBy', 'name department');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    next(err);
  }
};

// @desc Create event — Teacher (own dept) or Admin
// @route POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const {
      name, department, type, session, brief, rules,
      timeline, markingScheme, venue, maxTeams, maxPerTeam,
      maxIndividuals, isAnnual,
    } = req.body;

    // Teacher can only create for their department
    if (req.user.role === 'teacher' && department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot create event for another department' });
    }

    const coverImageUrl = req.file?.path || '';
    const coverImagePublicId = req.file?.filename || '';

    // Parse JSON strings if sent as form data
    const parsedRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
    const parsedTimeline = typeof timeline === 'string' ? JSON.parse(timeline) : timeline;
    const parsedMarkingScheme = typeof markingScheme === 'string' ? JSON.parse(markingScheme) : markingScheme;
    const parsedMaxPerTeam = typeof maxPerTeam === 'string' ? JSON.parse(maxPerTeam) : maxPerTeam;

    const event = await Event.create({
      name, department, type, session, brief,
      rules: parsedRules || [],
      timeline: parsedTimeline || [],
      markingScheme: parsedMarkingScheme || {},
      venue, maxTeams, maxPerTeam: parsedMaxPerTeam,
      maxIndividuals, isAnnual,
      coverImageUrl, coverImagePublicId,
      createdBy: req.user._id,
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

// @desc Update event — Teacher (own dept) or Admin
// @route PUT /api/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'teacher' && event.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot edit another department event' });
    }

    if (req.file && event.coverImagePublicId) {
      await cloudinary.uploader.destroy(event.coverImagePublicId);
    }

    // Parse fields
    const fields = { ...req.body };
    if (fields.rules && typeof fields.rules === 'string') fields.rules = JSON.parse(fields.rules);
    if (fields.timeline && typeof fields.timeline === 'string') fields.timeline = JSON.parse(fields.timeline);
    if (fields.markingScheme && typeof fields.markingScheme === 'string') fields.markingScheme = JSON.parse(fields.markingScheme);

    if (req.file) {
      fields.coverImageUrl = req.file.path;
      fields.coverImagePublicId = req.file.filename;
    }

    Object.assign(event, fields);
    await event.save();
    res.json(event);
  } catch (err) {
    next(err);
  }
};

// @desc Update event status — Teacher or Admin
// @route PATCH /api/events/:id/status
const updateEventStatus = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'teacher' && event.department !== req.user.department) {
      return res.status(403).json({ message: 'Cannot update another department event' });
    }

    event.status = req.body.status;
    await event.save();
    res.json(event);
  } catch (err) {
    next(err);
  }
};

// @desc Delete event — Admin only
// @route DELETE /api/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.coverImagePublicId) {
      await cloudinary.uploader.destroy(event.coverImagePublicId);
    }
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEvents, getEvent, createEvent, updateEvent, updateEventStatus, deleteEvent };
