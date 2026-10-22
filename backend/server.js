require('dotenv').config();
const express = require('express');
const cors = require('cors');

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnv.push('CORS_ORIGINS', 'FRONTEND_URL');
}
const missingEnv = requiredEnv.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Create backend/.env from .env.example before starting the application.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' &&
  (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'your-jwt-secret-key-change-in-production')) {
  console.error('JWT_SECRET must be a unique value of at least 32 characters in production.');
  process.exit(1);
}

const allowedOrigins = (process.env.CORS_ORIGINS ||
  'http://localhost:3000,http://localhost:3001,http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

for (const origin of allowedOrigins) {
  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    console.error(`Invalid CORS origin: ${origin}`);
    process.exit(1);
  }

  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
    console.error(`CORS_ORIGINS must contain valid origins without paths: ${origin}`);
    process.exit(1);
  }
}

if (process.env.FRONTEND_URL) {
  try {
    const frontendUrl = new URL(process.env.FRONTEND_URL);
    if (!['http:', 'https:'].includes(frontendUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    console.error('FRONTEND_URL must be a valid HTTP or HTTPS URL.');
    process.exit(1);
  }
}

const authRoutes = require('./routes/auth');
const quotationRoutes = require('./routes/quotations');
const companyRoutes = require('./routes/companies');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const companyProfileRoutes = require('./routes/companyProfile');

const app = express();
const PORT = process.env.PORT || 8080;

app.disable('x-powered-by');

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin not allowed by CORS.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/superadmin/users', userRoutes);
app.use('/api/company/profile', companyProfileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file exceeds the 5 MB limit.'
      : 'The uploaded file could not be processed.';
    return res.status(status).json({ message });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
