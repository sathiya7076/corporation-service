import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['garbage_truck', 'recycling_truck', 'sweeper', 'compactor', 'tipper'],
    required: true
  },
  capacity: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['tons', 'cubic_meters'],
      default: 'tons'
    }
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  assignedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['available', 'in_route', 'loading', 'maintenance', 'out_of_service'],
    default: 'available'
  },
  fuelLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  maintenanceSchedule: {
    lastService: Date,
    nextService: Date,
    mileage: Number
  },
  trackingHistory: [{
    location: {
      type: [Number] // [longitude, latitude]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: Number,
    activity: String
  }]
}, {
  timestamps: true
});

vehicleSchema.index({ 'currentLocation': '2dsphere' });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ driver: 1 });

export default mongoose.model('Vehicle', vehicleSchema);