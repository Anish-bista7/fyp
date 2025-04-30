const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http'); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const menuRoutes = require('./routes/menuRoutes');
const path = require('path');
const categoryRoutes = require('./routes/categoryRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const multer = require('multer');
const fs = require('fs');
const orderRoutes = require('./routes/orderRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
const io = new Server(server, { // Initialize Socket.IO server
  cors: {
    origin: "http://localhost:3000", // Allow frontend origin (adjust if different)
    methods: ["GET", "POST"]
  }
});

// In-memory storage for user sockets (userId -> socketId)
// In production, consider using Redis or another persistent store
let userSockets = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Register user ID with socket ID
  socket.on('register', (userId) => {
    if (userId) {
      userSockets[userId] = socket.id;
      console.log(`🔗 User ${userId} registered with socket ${socket.id}`);
      // TODO: Fetch user role here if needed for admin checks
      // const user = await User.findById(userId);
      // if (user && user.role === 'admin') socket.join('admin-room'); 
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    // Remove user from mapping on disconnect
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`🔗 User ${userId} unregistered`);
        break;
      }
    }
  });

  // Optional: Handle other custom events from client
});

// Middleware to attach io and userSockets to req
app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  next();
});

// Create uploads directory if it doesn't exist
// Use __dirname (global in CommonJS) or keep relative path
const uploadsDir = path.join(__dirname, 'uploads'); // Use global __dirname
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Use global __dirname

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Connected ✅');
  console.log('Connection URL:', process.env.MONGO_URI);
})
.catch((err) => {
  console.error('MongoDB Connection Error: ', err.message);
  console.error('Full error:', err);
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/vendors', menuRoutes);
app.use('/api/vendors', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;
// Start the HTTP server, not the Express app directly
server.listen(PORT, () => console.log(` ✅ Server running on port ${PORT}`));

// Export io and userSockets for potential use elsewhere (alternative to req attachment)
// module.exports = { io, userSockets }; // Could use this if needed