require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
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
app.use(cors({ origin: process.env.CLIENT_URL || 'https://midaswarts.netlify.app', credentials: true, allowOrigin: true  }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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
