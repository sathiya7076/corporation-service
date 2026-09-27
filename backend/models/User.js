import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['citizen', 'waste_worker', 'admin', 'green_champion'],
    default: 'citizen'
  },
  phone: {
    type: String,
    required: false,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  profile: {
    avatar: String,
    bio: String,
    dateOfBirth: Date
  },
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    level: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    }
  },
  penalties: [{
    amount: Number,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'disputed'],
      default: 'pending'
    }
  }],
  training: {
    completedModules: [String],
    certificates: [{
      name: String,
      date: Date,
      score: Number
    }],
    currentProgress: {
      module: String,
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    }
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    collectionReminders: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  refreshToken: String
}, {
  timestamps: true
});

// Index for geospatial queries
userSchema.index({ 'address.coordinates': '2dsphere' });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update reward points
userSchema.methods.addRewardPoints = function(points) {
  this.rewards.points += points;
  this.rewards.totalEarned += points;
  
  // Update level based on total earned points
  if (this.rewards.totalEarned >= 10000) {
    this.rewards.level = 'platinum';
  } else if (this.rewards.totalEarned >= 5000) {
    this.rewards.level = 'gold';
  } else if (this.rewards.totalEarned >= 1000) {
    this.rewards.level = 'silver';
  }
  
  return this.save();
};

export default mongoose.model('User', userSchema);