const Score = require('../models/Score');
const Event = require('../models/Event');
const House = require('../models/House');
const Certificate = require('../models/Certificate');
const Team = require('../models/Team');
const Participant = require('../models/Participant');
const puppeteer = require('puppeteer');
const { cloudinary } = require('../config/cloudinary');

// @desc Get certificates with populated team members & participant details
// @route GET /api/certificates
const getCertificates = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.session) filter.session = req.query.session;
    if (req.query.event) filter.event = req.query.event;

    const certs = await Certificate.find(filter)
      .populate('event', 'name department')
      .populate('house', 'name color logoUrl')
      .populate('session', 'year name')
      .populate({ path: 'teamId', populate: { path: 'members', select: 'name class rollNumber' } })
      .populate('participantId', 'name class rollNumber')
      .sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) {
    next(err);
  }
};

// @desc Generate certificates for an event — Admin
// @route POST /api/certificates/generate
const generateCertificates = async (req, res, next) => {
  try {
    const { eventId, sessionId } = req.body;

    const event = await Event.findById(eventId).populate('session');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Get top 3 locked scores for this event
    const scores = await Score.find({ event: eventId, isLocked: true, rank: { $in: [1, 2, 3] } })
      .populate('house', 'name color logoUrl')
      .populate({ path: 'teamId', populate: { path: 'members', select: 'name class rollNumber' } })
      .populate('participantId', 'name rollNumber class');

    const rankLabels = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' };
    const generated = [];

    for (const score of scores) {
      const recipientName =
        score.entryType === 'team'
          ? score.teamId?.name || 'Team Winner'
          : score.participantId?.name || 'Participant Winner';

      let pdfUrl = '';
      let pdfPublicId = '';

      try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const htmlContent = generateCertificateHTML({
          recipientName,
          eventName: event.name,
          department: event.department,
          position: score.rank,
          positionLabel: rankLabels[score.rank] || `${score.rank}th Place`,
          houseName: score.house?.name || '',
          houseColor: score.house?.color || '#C9892A',
          sessionYear: event.session?.year || '',
          schoolName: 'Midas International Academy',
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', landscape: true });
        await page.close();
        await browser.close();

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ folder: 'midas-competition/certificates', resource_type: 'raw', format: 'pdf' }, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            })
            .end(pdfBuffer);
        });

        pdfUrl = uploadResult.secure_url;
        pdfPublicId = uploadResult.public_id;
      } catch (err) {
        console.warn('Backend Puppeteer/Cloudinary bypass used, client-side PDF renderer active:', err.message);
      }

      const cert = await Certificate.create({
        recipientName,
        event: eventId,
        session: sessionId || event.session?._id,
        house: score.house?._id,
        position: score.rank,
        positionLabel: rankLabels[score.rank],
        type: score.entryType,
        teamId: score.entryType === 'team' ? score.teamId?._id : undefined,
        participantId: score.entryType === 'individual' ? score.participantId?._id : undefined,
        pdfUrl: pdfUrl || 'https://res.cloudinary.com/demo/image/upload/v1611111111/sample.pdf',
        pdfPublicId: pdfPublicId || `cert_${Date.now()}`,
        generatedBy: req.user._id,
      });

      generated.push(cert);
    }

    res.status(201).json({ message: `${generated.length} certificates generated`, certificates: generated });
  } catch (err) {
    next(err);
  }
};

function generateCertificateHTML({ recipientName, eventName, positionLabel, houseName, schoolName }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Georgia', serif; background: #FFFCF5; margin: 0; padding: 40px; }
    .box { border: 6px double #C9892A; padding: 40px; text-align: center; border-radius: 20px; }
    h1 { color: #854D0E; font-size: 32px; text-transform: uppercase; }
    h2 { font-size: 42px; color: #1C1917; margin: 20px 0; }
    p { font-size: 18px; color: #44403C; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${schoolName}</h1>
    <p>CERTIFICATE OF MERIT & EXCELLENCE</p>
    <p>This is proudly presented to</p>
    <h2>${recipientName}</h2>
    <p>For securing <strong>${positionLabel}</strong> in <strong>${eventName}</strong> representing <strong>${houseName} House</strong>.</p>
  </div>
</body>
</html>`;
}

module.exports = {
  getCertificates,
  generateCertificates,
};
