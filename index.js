require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

// Normalize URL helper to strip trailing slashes
const normalizeUrl = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

// Default allowed origins list
const defaultOrigins = [
  'https://midaswarts.netlify.app',
  'https://midaswarts.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
];

// Parse CLIENT_URL environment variable (supports comma-separated URLs or single URL)
const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(normalizeUrl).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (Postman, curl, server-to-server)
  const normalizedOrigin = normalizeUrl(origin);
  return allowedOrigins.some((allowed) => normalizeUrl(allowed) === normalizedOrigin);
};

// Express CORS options
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

const app = express();
const server = http.createServer(app);

// Socket.io setup with matching CORS origin resolution
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/houses', require('./routes/houses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/events', require('./routes/events'));
app.use('/api/participants', require('./routes/participants'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/public', require('./routes/public'));
app.use('/api/fixtures', require('./routes/fixtures'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// Global error handler
app.use(errorHandler);

let PORT = Number(process.env.PORT) || 5000;

function startServer(portToUse) {
  server.listen(portToUse, () => {
    console.log(`🚀 Server running on port ${portToUse} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} is busy, retrying on port ${PORT + 1}...`);
    PORT += 1;
    setTimeout(() => startServer(PORT), 500);
  } else {
    console.error('❌ Server error:', err);
  }
});

startServer(PORT);
