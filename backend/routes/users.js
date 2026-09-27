import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import User from '../models/User.js';
import WasteReport from '../models/WasteReport.js';
import { TrainingProgress } from '../models/Training.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ✅ Cloudinary config (set these in Vercel Environment Variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer + Cloudinary storage (no local filesystem needed)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif'],
    transformation: [{ width: 300, height: 300, crop: 'fill' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const ext = allowed.test(file.originalname.toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ✅ Helper: Safe JSON parser
const safeParse = (data) => {
  if (!data) return {};
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return data;
  }
};

// 🔹 GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [reportCount, completedTraining] = await Promise.all([
      WasteReport.countDocuments({ reporter: user._id }),
      TrainingProgress.countDocuments({ user: user._id, isCompleted: true })
    ]);

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          statistics: {
            reportsSubmitted: reportCount,
            trainingCompleted: completedTraining
          }
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// 🔹 PUT /api/users/profile
router.put('/profile', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const { name, phone, address, profile, preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...safeParse(address) };
    if (profile) user.profile = { ...user.profile, ...safeParse(profile) };
    if (preferences) user.preferences = { ...user.preferences, ...safeParse(preferences) };

    // ✅ Avatar upload — delete old Cloudinary image, save new URL
    if (req.file) {
      // Delete old avatar from Cloudinary if it exists
      if (user.profile?.avatarPublicId) {
        await cloudinary.uploader.destroy(user.profile.avatarPublicId);
      }
      // req.file.path = full Cloudinary URL, req.file.filename = public_id
      user.profile.avatar = req.file.path;
      user.profile.avatarPublicId = req.file.filename;
    }

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// 🔹 GET /api/users/leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await User.find({ isActive: true })
      .select('name rewards.totalEarned rewards.level')
      .sort({ 'rewards.totalEarned': -1 })
      .limit(parseInt(limit));

    const userRank = await User.countDocuments({
      isActive: true,
      'rewards.totalEarned': { $gt: req.user.rewards.totalEarned }
    }) + 1;

    res.json({
      success: true,
      data: {
        leaderboard: leaderboard.map((u, index) => ({
          rank: index + 1,
          name: u.name,
          points: u.rewards.totalEarned,
          level: u.rewards.level
        })),
        userRank,
        userPoints: req.user.rewards.totalEarned
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

export default router;