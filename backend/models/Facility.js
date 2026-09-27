import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: [
      'recycling_center',
      'scrap_shop',
      'waste_treatment_plant',
      'composting_facility',
      'transfer_station',
      'landfill',
      'hazardous_waste_facility',
      'e_waste_center'
    ],
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
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        default: 'India'
      }
    }
  },
  contact: {
    phone: {
      type: String,
      required: true
    },
    email: String,
    website: String
  },
  operatingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  acceptedWasteTypes: [{
    type: String,
    enum: [
      'organic',
      'plastic',
      'paper',
      'glass',
      'metal',
      'electronic',
      'hazardous',
      'textile',
      'construction',
      'medical'
    ]
  }],
  capacity: {
    current: {
      type: Number,
      default: 0
    },
    maximum: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['tons', 'cubic_meters', 'liters'],
      default: 'tons'
    }
  },
  services: [{
    name: String,
    description: String,
    price: Number,
    unit: String
  }],
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date,
    documentUrl: String
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [String],
  description: String,
  specialInstructions: String
}, {
  timestamps: true
});

// Index for geospatial queries
facilitySchema.index({ 'location': '2dsphere' });
facilitySchema.index({ type: 1, isActive: 1 });
facilitySchema.index({ 'acceptedWasteTypes': 1 });

export default mongoose.model('Facility', facilitySchema);