import mongoose from 'mongoose';

const wasteReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    description: String
  },
  wasteType: {
    type: String,
    enum: [
      'organic',
      'plastic',
      'paper',
      'glass',
      'metal',
      'electronic',
      'hazardous',
      'mixed',
      'other'
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'household',
      'commercial',
      'industrial',
      'construction',
      'medical',
      'other'
    ],
    default: 'household'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  estimatedQuantity: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // UPDATED: Images now store binary data as Buffer
  images: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    // CRITICAL: Store image as Buffer (binary data) instead of Base64 string
    data: {
      type: Buffer,  // This stores the actual image file as binary data
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    // Keep URL for backward compatibility and reference
    url: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: [
      'reported',
      'acknowledged',
      'assigned',
      'in_progress',
      'completed',
      'verified',
      'rejected'
    ],
    default: 'reported'
  },
  assignedWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  scheduledCollection: {
    date: Date,
    timeSlot: {
      start: String,
      end: String
    }
  },
  actualCollection: {
    date: Date,
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    // These can also store binary data if needed
    beforeImages: [{
      type: Buffer
    }],
    afterImages: [{
      type: Buffer
    }]
  },
  verification: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    notes: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  priority: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  rewards: {
    pointsAwarded: {
      type: Number,
      default: 0
    },
    awardedAt: Date,
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Index for geospatial queries
wasteReportSchema.index({ 'location': '2dsphere' });
wasteReportSchema.index({ status: 1, createdAt: -1 });
wasteReportSchema.index({ reporter: 1, createdAt: -1 });
wasteReportSchema.index({ assignedWorker: 1, status: 1 });

// Index for image filename lookup
wasteReportSchema.index({ 'images.filename': 1 });

// Transform function to exclude binary data when converting to JSON (for API responses)
wasteReportSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    // If specifically requested, include image data, otherwise exclude for performance
    if (!options.includeImageData && ret.images) {
      ret.images = ret.images.map(img => {
        const { data, ...imgWithoutData } = img;
        return {
          ...imgWithoutData,
          hasData: !!data,
          dataSize: data ? data.length : 0
        };
      });
    }
    return ret;
  }
});

// Virtual to get total image size
wasteReportSchema.virtual('totalImageSize').get(function() {
  if (!this.images || this.images.length === 0) return 0;
  return this.images.reduce((total, img) => total + (img.size || 0), 0);
});

// Method to get image by filename
wasteReportSchema.methods.getImageByFilename = function(filename) {
  return this.images.find(img => img.filename === filename);
};

// Method to add image
wasteReportSchema.methods.addImage = function(imageData) {
  this.images.push(imageData);
  return this.save();
};

// Method to remove image
wasteReportSchema.methods.removeImage = function(filename) {
  this.images = this.images.filter(img => img.filename !== filename);
  return this.save();
};

// Static method to find reports with images
wasteReportSchema.statics.findReportsWithImages = function() {
  return this.find({ 'images.0': { $exists: true } });
};

// Static method to get image statistics
wasteReportSchema.statics.getImageStats = async function() {
  const stats = await this.aggregate([
    { $unwind: '$images' },
    {
      $group: {
        _id: null,
        totalImages: { $sum: 1 },
        totalSize: { $sum: '$images.size' },
        avgSize: { $avg: '$images.size' },
        minSize: { $min: '$images.size' },
        maxSize: { $max: '$images.size' }
      }
    }
  ]);
  
  return stats[0] || {
    totalImages: 0,
    totalSize: 0,
    avgSize: 0,
    minSize: 0,
    maxSize: 0
  };
};

export default mongoose.model('WasteReport', wasteReportSchema);