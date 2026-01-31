import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import routes
import analyzeRoutes from './routes/analyze';
import recapRoutes from './routes/recap';
import dashboardRoutes from './routes/dashboard';
import profileRoutes from './routes/profile';
import alertRoutes from './routes/alert';
import contextCluesRoutes from './routes/contextClues';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/recap', recapRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/alert', alertRoutes);
app.use('/api/context-clues', contextCluesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Connect to MongoDB (optional - works without it using in-memory storage)
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed, using in-memory storage');
      console.error(error);
    }
  } else {
    console.log('ℹ️ No MONGODB_URI provided, using in-memory storage');
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`
🌿 Whisper Lite Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on port ${PORT}
📡 API available at http://localhost:${PORT}/api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });
};

startServer();

export default app;
