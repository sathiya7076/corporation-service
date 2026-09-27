import express from 'express';
import multer from 'multer';
import path from 'path';
import WasteReport from '../models/WasteReport.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import Joi from 'joi';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Multer memory storage configuration
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const isValid =
      allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
      allowedTypes.test(file.mimetype);
    
    if (!isValid) {
      return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
    
    cb(null, true);
  }
});

// Helper function to generate unique filename
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseName}_${timestamp}_${random}${ext}`;
};

// Validation schema
const wasteReportSchema = Joi.object({
  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.object({
      street: Joi.string().allow(''),
      city: Joi.string().allow(''),
      state: Joi.string().allow(''),
      zipCode: Joi.string().allow('')
    }),
    description: Joi.string().allow('')
  }).required(),
  wasteType: Joi.string().valid(
    'organic', 'plastic', 'paper', 'glass', 'metal', 'electronic', 'hazardous', 'mixed', 'other'
  ).required(),
  category: Joi.string().valid(
    'household', 'commercial', 'industrial', 'construction', 'medical', 'other'
  ).default('household'),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  estimatedQuantity: Joi.string().valid('small', 'medium', 'large', 'extra_large').required(),
  description: Joi.string().max(500).required()
});

// Helper function to parse form data
const parseFormData = (body) => {
  return {
    wasteType: body.wasteType,
    category: body.category || 'household',
    severity: body.severity || 'medium',
    estimatedQuantity: body.estimatedQuantity,
    description: body.description,
    location: {
      coordinates: [
        parseFloat(body['location.coordinates.0']) || 0,
        parseFloat(body['location.coordinates.1']) || 0
      ],
      address: {
        street: body['location.address.street'] || '',
        city: body['location.address.city'] || '',
        state: body['location.address.state'] || '',
        zipCode: body['location.address.zipCode'] || ''
      },
      description: body['location.description'] || ''
    }
  };
};

/* ============================================================================
   @route   POST /api/waste/report
   @desc    Create waste report (unassigned - workers can claim it)
   @access  Private (Citizen, Green Champion)
============================================================================ */
router.post(
  '/report',
  authenticate,
  authorize('citizen', 'green_champion'),
  upload.array('images', 5),
  async (req, res) => {
    try {
      console.log('=== WASTE REPORT CREATION ===');
      
      const parsedData = parseFormData(req.body);
      const { error, value } = wasteReportSchema.validate(parsedData);
      
      if (error) {
        return res.status(400).json({ 
          success: false, 
          message: error.details[0].message 
        });
      }

      // Process images
      const images = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (file.buffer && file.buffer.length > 0) {
            images.push({
              filename: generateUniqueFilename(file.originalname),
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              data: file.buffer,
              uploadedAt: new Date(),
              url: `/api/waste/image/${generateUniqueFilename(file.originalname)}`
            });
          }
        }
      }

      // Create waste report WITHOUT auto-assignment
      const wasteReport = new WasteReport({
        ...value,
        reporter: req.user._id,
        images: images,
        location: {
          type: 'Point',
          coordinates: value.location.coordinates,
          address: value.location.address,
          description: value.location.description
        },
        status: 'reported'
      });

      const savedReport = await wasteReport.save();
      await savedReport.populate('reporter', 'name email');
      
      // Award points
      try {
        await req.user.addRewardPoints(10);
      } catch (pointsError) {
        console.warn('Error awarding points:', pointsError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Waste report created successfully. Workers can now claim this task.',
        data: { 
          report: savedReport,
          imagesStored: images.length
        }
      });
      
    } catch (err) {
      console.error('Waste report creation error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create waste report',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    }
  }
);

/* ============================================================================
   @route   GET /api/waste/reports
   @desc    Get waste reports with viewType filtering
   @access  Private
============================================================================ */
router.get('/reports', authenticate, async (req, res) => {
  try {
    console.log('=== GETTING WASTE REPORTS ===');
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user._id);
    console.log('Query params:', req.query);
    
    const { 
      page = 1, 
      limit = 50, 
      status, 
      wasteType, 
      severity,
      viewType // 'my' or 'all'
    } = req.query;
    
    const filter = {};

    // Role-based filtering with viewType
    if (req.user.role === 'waste_worker') {
      if (viewType === 'my') {
        // Show only worker's assigned reports
        filter.assignedWorker = req.user._id;
      }
      // If viewType is 'all' or undefined, show ALL reports (no filter)
    } else if (req.user.role === 'citizen' || req.user.role === 'green_champion') {
      // Citizens always see only their reports
      filter.reporter = req.user._id;
    }
    // Admin sees all (no filter)

    // Apply additional filters
    if (status) filter.status = status;
    if (wasteType) filter.wasteType = wasteType;
    if (severity) filter.severity = severity;

    console.log('Final filter:', filter);

    const reports = await WasteReport.find(filter)
      .populate('reporter', 'name email')
      .populate('assignedWorker', 'name email')
      .select('-images.data')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await WasteReport.countDocuments(filter);

    console.log(`Found ${reports.length} reports`);

    res.json({
      success: true,
      data: {
        reports,
        pagination: { 
          current: parseInt(page), 
          pages: Math.ceil(total / parseInt(limit)), 
          total 
        }
      }
    });
  } catch (err) {
    console.error('Get waste reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch waste reports' });
  }
});

/* ============================================================================
   @route   GET /api/waste/reports/available
   @desc    Get ONLY unassigned reports for workers
   @access  Private (Waste Worker)
============================================================================ */
router.get('/reports/available', authenticate, authorize('waste_worker'), async (req, res) => {
  try {
    const { page = 1, limit = 50, wasteType, severity } = req.query;
    
    const filter = {
      $or: [
        { assignedWorker: { $exists: false } },
        { assignedWorker: null }
      ],
      status: { $in: ['reported', 'acknowledged'] }
    };

    if (wasteType) filter.wasteType = wasteType;
    if (severity) filter.severity = severity;

    const reports = await WasteReport.find(filter)
      .populate('reporter', 'name email')
      .select('-images.data')
      .sort({ createdAt: -1, severity: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await WasteReport.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports,
        pagination: { 
          current: parseInt(page), 
          pages: Math.ceil(total / parseInt(limit)), 
          total 
        }
      }
    });
  } catch (err) {
    console.error('Get available reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch available reports' });
  }
});

/* ============================================================================
   @route   GET /api/waste/reports/nearby
   @desc    Get nearby reports
   @access  Private (Waste Worker)
============================================================================ */
router.get('/reports/nearby', authenticate, authorize('waste_worker'), async (req, res) => {
  try {
    const { longitude, latitude, radius = 10000, includeAssigned = 'false' } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Longitude and latitude are required' 
      });
    }

    const filter = {
      location: {
        $near: {
          $geometry: { 
            type: 'Point', 
            coordinates: [parseFloat(longitude), parseFloat(latitude)] 
          },
          $maxDistance: parseInt(radius)
        }
      }
    };

    if (includeAssigned === 'false') {
      filter.$or = [
        { assignedWorker: { $exists: false } },
        { assignedWorker: null },
        { assignedWorker: req.user._id }
      ];
    }

    const reports = await WasteReport.find(filter)
      .populate('reporter', 'name')
      .populate('assignedWorker', 'name')
      .select('-images.data')
      .limit(100);

    res.json({ 
      success: true, 
      data: { 
        reports,
        count: reports.length 
      } 
    });
  } catch (err) {
    console.error('Get nearby reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby reports' });
  }
});

/* ============================================================================
   @route   PUT /api/waste/reports/:id/claim
   @desc    Worker CLAIMS (self-assigns) an unassigned report
   @access  Private (Waste Worker)
============================================================================ */
router.put('/reports/:id/claim', authenticate, authorize('waste_worker'), async (req, res) => {
  try {
    console.log('=== WORKER CLAIMING REPORT ===');
    console.log('Report ID:', req.params.id);
    console.log('Worker:', req.user.name);
    
    const report = await WasteReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Check if already assigned to someone else
    if (report.assignedWorker && report.assignedWorker.toString() !== req.user._id.toString()) {
      const assignedWorker = await User.findById(report.assignedWorker);
      return res.status(400).json({ 
        success: false, 
        message: `This report is already assigned to ${assignedWorker?.name || 'another worker'}` 
      });
    }

    // Check if already claimed by this worker
    if (report.assignedWorker && report.assignedWorker.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already claimed this report' 
      });
    }

    // CLAIM the report
    report.assignedWorker = req.user._id;
    report.status = 'assigned';
    await report.save();
    
    await report.populate(['reporter', 'assignedWorker'], 'name email');

    console.log(`✅ Report claimed by ${req.user.name}`);

    res.json({ 
      success: true, 
      message: 'Report claimed successfully! You can now start working on it.', 
      data: { report } 
    });
  } catch (err) {
    console.error('Claim report error:', err);
    res.status(500).json({ success: false, message: 'Failed to claim report' });
  }
});

/* ============================================================================
   @route   GET /api/waste/image/:filename
   @desc    Serve image from database with proper CORS
   @access  Private
============================================================================ */

// Handle OPTIONS preflight request
router.options('/image/:filename', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  });
  res.sendStatus(200);
});

router.get('/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    console.log('Image request for:', filename);
    console.log('Token present:', !!token);
    
    // Set CORS headers FIRST - before any other response
    res.set({
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No authentication token' });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified for user:', decoded.userId);
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const report = await WasteReport.findOne({ 'images.filename': filename });

    if (!report) {
      console.log('Report not found for filename:', filename);
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const image = report.images.find(img => img.filename === filename);
    
    if (!image || !image.data) {
      console.log('Image data not found');
      return res.status(404).json({ success: false, message: 'Image data not found' });
    }

    console.log('Serving image:', filename, 'Type:', image.mimetype, 'Size:', image.data.length);

    // Set additional headers for the image
    res.set({
      'Content-Type': image.mimetype,
      'Content-Length': image.data.length,
      'Content-Disposition': `inline; filename="${image.originalName}"`,
      'Cache-Control': 'public, max-age=31557600'
    });

    res.send(image.data);
    
  } catch (err) {
    console.error('Image serving error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to serve image', 
      error: err.message 
    });
  }
});

/* ============================================================================
   @route   GET /api/waste/reports/:id
   @desc    Get single report
   @access  Private
============================================================================ */
router.get('/reports/:id', authenticate, async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id)
      .populate('reporter', 'name email phone')
      .populate('assignedWorker', 'name email phone')
      .populate('actualCollection.worker', 'name email')
      .populate('verification.verifiedBy', 'name email')
      .select('-images.data');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: { report } });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
});

/* ============================================================================
   @route   PUT /api/waste/reports/:id/status
   @desc    Update report status
   @access  Private (Waste Worker, Admin)
============================================================================ */
router.put('/reports/:id/status', authenticate, authorize('admin', 'waste_worker'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['acknowledged', 'assigned', 'in_progress', 'completed', 'verified', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const report = await WasteReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Verify worker can only update their own reports
    if (req.user.role === 'waste_worker') {
      if (!report.assignedWorker || report.assignedWorker.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update reports assigned to you' 
        });
      }
    }

    report.status = status;
    
    if (status === 'completed') {
      report.actualCollection = { 
        date: new Date(), 
        worker: req.user._id, 
        notes 
      };
    }

    await report.save();
    await report.populate(['reporter', 'assignedWorker', 'actualCollection.worker'], 'name email');

    res.json({ 
      success: true, 
      message: `Status updated to ${status}`, 
      data: { report } 
    });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

/* ============================================================================
   @route   PUT /api/waste/reports/:id/assign
   @desc    Admin manually assigns worker
   @access  Private (Admin)
============================================================================ */
router.put('/reports/:id/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { workerId } = req.body;
    const report = await WasteReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'waste_worker') {
      return res.status(400).json({ success: false, message: 'Invalid worker ID' });
    }

    report.assignedWorker = workerId;
    report.status = 'assigned';
    await report.save();
    
    await report.populate(['assignedWorker', 'reporter'], 'name email');

    res.json({ 
      success: true, 
      message: `Assigned to ${worker.name}`, 
      data: { report } 
    });
  } catch (err) {
    console.error('Assign worker error:', err);
    res.status(500).json({ success: false, message: 'Failed to assign worker' });
  }
});

/* ============================================================================
   @route   GET /api/waste/workers
   @desc    Get all workers
   @access  Private (Admin)
============================================================================ */
router.get('/workers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const workers = await User.find({ role: 'waste_worker' })
      .select('name email phone')
      .sort({ name: 1 });

    res.json({ success: true, data: { workers } });
  } catch (err) {
    console.error('Get workers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch workers' });
  }
});

/* ============================================================================
   @route   GET /api/waste/dashboard/stats
   @desc    Get dashboard statistics
   @access  Private
============================================================================ */
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let statsFilter = {};
    
    if (userRole === 'waste_worker') {
      statsFilter.assignedWorker = userId;
    } else if (userRole === 'citizen' || userRole === 'green_champion') {
      statsFilter.reporter = userId;
    }

    const [
      totalReports,
      pendingReports,
      inProgressReports,
      completedReports,
      todayReports,
      availableReports
    ] = await Promise.all([
      WasteReport.countDocuments(statsFilter),
      WasteReport.countDocuments({ ...statsFilter, status: 'assigned' }),
      WasteReport.countDocuments({ ...statsFilter, status: 'in_progress' }),
      WasteReport.countDocuments({ ...statsFilter, status: 'completed' }),
      WasteReport.countDocuments({
        ...statsFilter,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      userRole === 'waste_worker' ? WasteReport.countDocuments({
        $or: [
          { assignedWorker: { $exists: false } },
          { assignedWorker: null }
        ],
        status: { $in: ['reported', 'acknowledged'] }
      }) : 0
    ]);

    res.json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        inProgressReports,
        completedReports,
        todayReports,
        availableReports
      }
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

export default router;