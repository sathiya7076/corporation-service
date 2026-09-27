import express from 'express';
import WasteReport from '../models/WasteReport.js';
import User from '../models/User.js';
import Facility from '../models/Facility.js';
import { Training, TrainingProgress } from '../models/Training.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Date ranges for analytics
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Basic counts
    const [
      totalUsers,
      totalReports,
      totalFacilities,
      pendingReports,
      completedReports,
      activeWorkers
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      WasteReport.countDocuments(),
      Facility.countDocuments({ isActive: true }),
      WasteReport.countDocuments({ status: { $in: ['reported', 'acknowledged'] } }),
      WasteReport.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'waste_worker', isActive: true })
    ]);

    // Reports by status
    const reportsByStatus = await WasteReport.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Reports by waste type
    const reportsByWasteType = await WasteReport.aggregate([
      {
        $group: {
          _id: '$wasteType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly report trends
    const monthlyReports = await WasteReport.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getFullYear(), 0, 1) }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Top performing facilities
    const topFacilities = await Facility.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $sort: { 'rating.average': -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          name: 1,
          type: 1,
          'rating.average': 1,
          'rating.count': 1
        }
      }
    ]);

    // User engagement metrics
    const userEngagement = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          avgRewardPoints: { $avg: '$rewards.points' }
        }
      }
    ]);

    // Recent activities
    const recentReports = await WasteReport.find()
      .populate('reporter', 'name')
      .populate('assignedWorker', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Training statistics
    const trainingStats = await TrainingProgress.aggregate([
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedTrainings: { $sum: { $cond: ['$isCompleted', 1, 0] } },
          avgScore: { $avg: '$finalScore' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalReports,
          totalFacilities,
          pendingReports,
          completedReports,
          activeWorkers
        },
        reportsByStatus: reportsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        reportsByWasteType: reportsByWasteType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyTrends: monthlyReports,
        topFacilities,
        userEngagement,
        recentActivities: recentReports,
        trainingStats: trainingStats[0] || {
          totalEnrollments: 0,
          completedTrainings: 0,
          avgScore: 0
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// @route   GET /api/admin/analytics/reports
// @desc    Get detailed report analytics
// @access  Private (Admin only)
router.get('/analytics/reports', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let groupByFormat;
    switch (groupBy) {
      case 'hour':
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        groupByFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const analytics = await WasteReport.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupByFormat,
          totalReports: { $sum: 1 },
          completedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingReports: {
            $sum: { $cond: [{ $in: ['$status', ['reported', 'acknowledged']] }, 1, 0] }
          },
          highPriorityReports: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          },
          wasteTypes: { $addToSet: '$wasteType' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        analytics
      }
    });
  } catch (error) {
    console.error('Report analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report analytics'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get user management data
// @access  Private (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      status, 
      search 
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      User.countDocuments(query)
    ]);

    // Get additional user statistics
    const userStats = await Promise.all(
      users.map(async (user) => {
        const reportCount = await WasteReport.countDocuments({ reporter: user._id });
        return {
          ...user.toObject(),
          reportCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: userStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status
// @access  Private (Admin only)
router.put('/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

export default router;