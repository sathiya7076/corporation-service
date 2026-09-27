import mongoose from 'mongoose';

// 🔹 Media Schema
const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    required: [true, 'Media type is required']
  },
  url: { type: String, required: [true, 'Media URL is required'] },
  title: { type: String },
  duration: { type: Number, min: 0 } // Duration in seconds
}, { _id: false });

// 🔹 Quiz Option Schema
const quizOptionSchema = new mongoose.Schema({
  text: { type: String, required: [true, 'Option text is required'] },
  isCorrect: { type: Boolean, required: [true, 'isCorrect is required'] }
}, { _id: false });

// 🔹 Quiz Schema
const quizSchema = new mongoose.Schema({
  question: { type: String, required: [true, 'Question is required'] },
  options: {
    type: [quizOptionSchema],
    validate: {
      validator: arr => arr.length >= 2,
      message: 'At least 2 options are required'
    }
  },
  explanation: { type: String, default: '' },
  points: { type: Number, default: 10, min: 1 }
}, { _id: false });

// 🔹 Training Schema
const trainingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Training title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: [
      'waste_sorting',
      'recycling',
      'composting',
      'hazardous_waste',
      'reduction_tips',
      'environmental_impact'
    ],
    required: [true, 'Category is required']
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  content: { type: String, required: [true, 'Content is required'] },
  videoUrl: { type: String, default: '' },
  media: { type: [mediaSchema], default: [] },
  quiz: { type: [quizSchema], default: [] },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Training'
  }],
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: 1
  }, // Minutes
  pointsReward: { type: Number, default: 50, min: 0 },
  certificateTemplate: { type: String },
  isActive: { type: Boolean, default: true },
  difficulty: { type: Number, min: 1, max: 10, default: 5 },
  tags: { type: [String], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completionCriteria: {
    minScore: { type: Number, default: 70, min: 0, max: 100 },
    mustCompleteAllSections: { type: Boolean, default: true },
    mustWatchVideo: { type: Boolean, default: false }
  },
  statistics: {
    totalEnrollments: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  }
}, { timestamps: true });

// 🔹 UPDATED: Single Training Progress Schema per User (with trainingData array)
const trainingProgressSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true // One document per user
  },
  trainingData: [{
    training: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Training', 
      required: true 
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    currentSection: { type: Number, default: 0 },
    videoCompleted: { type: Boolean, default: false },
    videoCompletedAt: { type: Date },
    quizAttempts: [{
      attemptNumber: { type: Number },
      score: { type: Number },
      answers: [{
        questionIndex: Number,
        selectedAnswer: Number,
        isCorrect: Boolean
      }],
      completedAt: { type: Date }
    }],
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },
    finalScore: { type: Number },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// 🔹 Helper method to find specific training progress
trainingProgressSchema.methods.findTrainingProgress = function(trainingId) {
  return this.trainingData.find(td => td.training.toString() === trainingId.toString());
};

// 🔹 Helper method to update specific training progress
trainingProgressSchema.methods.updateTrainingProgress = function(trainingId, updateData) {
  const trainingProgress = this.findTrainingProgress(trainingId);
  if (trainingProgress) {
    Object.assign(trainingProgress, updateData);
    trainingProgress.updatedAt = new Date();
  }
  return trainingProgress;
};

// 🔹 Helper method to add new training progress
trainingProgressSchema.methods.addTrainingProgress = function(trainingId, initialData = {}) {
  const newTrainingData = {
    training: trainingId,
    progress: 0,
    currentSection: 0,
    videoCompleted: false,
    quizAttempts: [],
    isCompleted: false,
    ...initialData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.trainingData.push(newTrainingData);
  return newTrainingData;
};

// 🔹 Export Models
export const Training = mongoose.model('Training', trainingSchema);
export const TrainingProgress = mongoose.model('TrainingProgress', trainingProgressSchema);