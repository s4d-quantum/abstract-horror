import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import automationRoutes from './routes/automationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import manufacturerRoutes from './routes/manufacturerRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import backmarketRoutes from './routes/backmarketRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import qcRoutes from './routes/qcRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import level3Routes from './routes/level3Routes.js';
import partRoutes from './routes/partRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import lookupRoutes from './routes/lookupRoutes.js';
import tacRoutes from './routes/tacRoutes.js';
import locationManagementRoutes from './routes/locationManagementRoutes.js';
import colorCheckRoutes from './routes/colorCheckRoutes.js';
import labelPrintRoutes from './routes/labelPrintRoutes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Automation routes are mounted before the shared /api limiter so backfills
// do not inherit the public interactive limit.
app.use('/api/automation', automationRoutes);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/backmarket', backmarketRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/level3', level3Routes);
app.use('/api/parts', partRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lookup', lookupRoutes);
app.use('/api/tac', tacRoutes);
app.use('/api/admin/location-management', locationManagementRoutes);
app.use('/api/admin/color-check', colorCheckRoutes);
app.use('/api/admin/print-labels', labelPrintRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
