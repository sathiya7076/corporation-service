import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { Training, TrainingProgress } from '../models/Training.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * 🔹 Helper function to get or create user progress document
 */
const getUserProgressDocument = async (userId) => {
  let userProgress = await TrainingProgress.findOne({ user: userId });
  
  if (!userProgress) {
    userProgress = new TrainingProgress({
      user: userId,
      trainingData: []
    });
    await userProgress.save();
  }
  
  return userProgress;
};

/**
 * 🔹 GET all modules (with progress for current user)
 */
router.get('/modules', authenticate, async (req, res) => {
  try {
    const { category, level } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;
    if (level && level !== 'all') filter.level = level;

    const modules = await Training.find(filter)
      .select('-quiz.options.isCorrect -quiz.explanation')
      .sort({ createdAt: -1 })
      .lean();

    // Get user progress document
    const userProgressDoc = await TrainingProgress.findOne({ user: req.user._id }).lean();
    const trainingData = userProgressDoc?.trainingData || [];

    const modulesWithProgress = modules.map((module) => {
      const progress = trainingData.find(
        (td) => td.training.toString() === module._id.toString()
      );
      
      return {
        ...module,
        difficulty: module.difficulty || 5,
        userProgress: progress
          ? {
              progress: progress.progress,
              isCompleted: progress.isCompleted,
              finalScore: progress.finalScore ?? null,
              videoCompleted: progress.videoCompleted || false
            }
          : { progress: 0, isCompleted: false, finalScore: null, videoCompleted: false },
      };
    });

    res.json({ success: true, data: { modules: modulesWithProgress } });
  } catch (error) {
    console.error('Error fetching training modules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training modules' });
  }
});

/**
 * 🔹 GET single module (with user progress)
 */
router.get('/modules/:id', authenticate, async (req, res) => {
  try {
    const module = await Training.findOne({ _id: req.params.id, isActive: true })
      .populate('author', 'name')
      .lean();
      
    if (!module) {
      return res.status(404).json({ success: false, message: 'Training module not found' });
    }

    // Get user progress document and find specific training progress
    const userProgressDoc = await TrainingProgress.findOne({ user: req.user._id }).lean();
    const trainingProgress = userProgressDoc?.trainingData?.find(
      td => td.training.toString() === req.params.id.toString()
    );

    const moduleData = {
      ...module,
      quiz: module.quiz.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ text: o.text })),
      })),
    };

    res.json({
      success: true,
      data: {
        module: moduleData,
        userProgress: trainingProgress || { 
          progress: 0, 
          currentSection: 0, 
          isCompleted: false, 
          finalScore: null,
          videoCompleted: false 
        },
      },
    });
  } catch (error) {
    console.error('Error fetching training module:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training module' });
  }
});

/**
 * 🔹 Start training - FIXED: Uses new schema structure
 */
router.post('/modules/:id/start', authenticate, async (req, res) => {
  try {
    const trainingId = req.params.id;
    const userId = req.user._id;

    console.log(`=== START TRAINING ===`);
    console.log(`Module ID: ${trainingId}`);
    console.log(`User ID: ${userId}`);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(trainingId)) {
      return res.status(400).json({ success: false, message: 'Invalid training module ID' });
    }

    const module = await Training.findOne({ _id: trainingId, isActive: true });
    if (!module) {
      return res.status(404).json({ success: false, message: 'Training module not found' });
    }

    // Get or create user progress document
    const userProgressDoc = await getUserProgressDocument(userId);
    
    // Check if training progress already exists
    const existingProgress = userProgressDoc.findTrainingProgress(trainingId);
    
    if (existingProgress) {
      console.log('Training already started, returning existing progress');
      return res.json({ 
        success: true, 
        message: 'Training already started', 
        data: { 
          userProgress: {
            progress: existingProgress.progress,
            currentSection: existingProgress.currentSection,
            isCompleted: existingProgress.isCompleted,
            videoCompleted: existingProgress.videoCompleted,
            videoCompletedAt: existingProgress.videoCompletedAt,
            quizAttempts: existingProgress.quizAttempts
          }
        } 
      });
    }

    // Add new training progress to the user's document
    const newTrainingProgress = userProgressDoc.addTrainingProgress(trainingId, {
      progress: 25,
      currentSection: 0,
      videoCompleted: false,
      quizAttempts: [],
      isCompleted: false
    });

    await userProgressDoc.save();

    // Update module statistics
    await Training.findByIdAndUpdate(trainingId, { 
      $inc: { 'statistics.totalEnrollments': 1 } 
    });

    console.log('New training progress added successfully');

    res.json({ 
      success: true, 
      message: 'Training started successfully', 
      data: { 
        userProgress: {
          progress: newTrainingProgress.progress,
          currentSection: newTrainingProgress.currentSection,
          isCompleted: newTrainingProgress.isCompleted,
          videoCompleted: newTrainingProgress.videoCompleted,
          videoCompletedAt: newTrainingProgress.videoCompletedAt,
          quizAttempts: newTrainingProgress.quizAttempts
        }
      } 
    });
  } catch (error) {
    console.error('=== START TRAINING ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({ success: false, message: 'Failed to start training' });
  }
});

/**
 * 🔹 Record video completion - COMPLETELY FIXED for new schema
 */
router.post('/modules/:id/video-complete', authenticate, async (req, res) => {
  try {
    const trainingId = req.params.id;
    const userId = req.user._id;

    console.log(`=== VIDEO COMPLETION REQUEST ===`);
    console.log(`Module ID: ${trainingId}`);
    console.log(`User ID: ${userId}`);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(trainingId)) {
      return res.status(400).json({ success: false, message: 'Invalid module id' });
    }

    const module = await Training.findById(trainingId).lean();
    if (!module) {
      return res.status(404).json({ success: false, message: 'Training module not found' });
    }

    // Get or create user progress document
    const userProgressDoc = await getUserProgressDocument(userId);
    
    // Find or create training progress
    let trainingProgress = userProgressDoc.findTrainingProgress(trainingId);
    
    if (trainingProgress) {
      // Update existing training progress
      trainingProgress.videoCompleted = true;
      trainingProgress.videoCompletedAt = new Date();
      trainingProgress.progress = Math.max(trainingProgress.progress, 50);
      trainingProgress.updatedAt = new Date();
    } else {
      // Add new training progress
      trainingProgress = userProgressDoc.addTrainingProgress(trainingId, {
        progress: 50,
        currentSection: 0,
        videoCompleted: true,
        videoCompletedAt: new Date(),
        quizAttempts: [],
        isCompleted: false
      });
    }

    await userProgressDoc.save();

    console.log(`Video completion recorded successfully`);

    res.json({
      success: true,
      message: 'Video completion recorded successfully',
      data: { 
        progress: {
          progress: trainingProgress.progress,
          currentSection: trainingProgress.currentSection,
          isCompleted: trainingProgress.isCompleted,
          videoCompleted: trainingProgress.videoCompleted,
          videoCompletedAt: trainingProgress.videoCompletedAt,
          quizAttempts: trainingProgress.quizAttempts
        }
      }
    });
  } catch (error) {
    console.error('=== VIDEO COMPLETION ERROR ===');
    console.error('Error details:', error);
    
    res.status(500).json({ 
      success: false, 
      message: `Failed to record video completion: ${error.message}` 
    });
  }
});

/**
 * 🔹 Submit Quiz - COMPLETELY REWRITTEN for new schema
 */
router.post('/modules/:id/quiz', authenticate, async (req, res) => {
  console.log('=== QUIZ SUBMISSION START ===');
  console.log('Module ID:', req.params.id);
  console.log('User ID:', req.user._id.toString());
  console.log('Submitted answers:', req.body.answers);

  try {
    const trainingId = req.params.id;
    const { answers } = req.body;
    const userId = req.user._id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(trainingId)) {
      return res.status(400).json({ success: false, message: 'Invalid module id' });
    }

    // Validate module exists
    const module = await Training.findById(trainingId).lean();
    if (!module) {
      return res.status(404).json({ success: false, message: 'Training module not found' });
    }

    console.log('Module found:', module.title);
    console.log('Quiz questions count:', module.quiz?.length);

    // Validate answers array
    if (!Array.isArray(answers) || answers.length !== module.quiz.length) {
      return res.status(400).json({ 
        success: false, 
        message: `Expected ${module.quiz.length} answers, received ${answers?.length || 0}` 
      });
    }

    // Calculate score with proper answer validation
    let correctAnswers = 0;
    const detailedAnswers = [];

    for (let i = 0; i < module.quiz.length; i++) {
      const question = module.quiz[i];
      const userAnswer = answers[i];
      
      // Find the correct answer index
      const correctIndex = question.options.findIndex(opt => opt.isCorrect === true);
      const isCorrect = userAnswer === correctIndex;
      
      if (isCorrect) {
        correctAnswers++;
      }

      detailedAnswers.push({
        questionIndex: i,
        selectedAnswer: userAnswer,
        correctAnswer: correctIndex,
        isCorrect: isCorrect
      });

      console.log(`Question ${i + 1}:`, {
        correctIndex,
        userAnswer,
        isCorrect,
        question: question.question.substring(0, 50) + '...'
      });
    }

    const score = Math.round((correctAnswers / module.quiz.length) * 100);
    const passed = score >= module.completionCriteria.minScore;
    
    console.log(`Quiz Results:`, {
      correctAnswers,
      totalQuestions: module.quiz.length,
      score,
      minScore: module.completionCriteria.minScore,
      passed
    });

    // Get or create user progress document
    const userProgressDoc = await getUserProgressDocument(userId);
    
    // Find or create training progress
    let trainingProgress = userProgressDoc.findTrainingProgress(trainingId);
    
    if (!trainingProgress) {
      console.log('Creating new training progress for quiz submission');
      trainingProgress = userProgressDoc.addTrainingProgress(trainingId, {
        progress: 0,
        currentSection: 0,
        videoCompleted: false,
        quizAttempts: [],
        isCompleted: false
      });
    }

    // Add the new quiz attempt
    const attemptNumber = trainingProgress.quizAttempts.length + 1;
    const newAttempt = {
      attemptNumber: attemptNumber,
      score: score,
      answers: detailedAnswers,
      completedAt: new Date()
    };

    trainingProgress.quizAttempts.push(newAttempt);
    trainingProgress.updatedAt = new Date();

    // Update progress based on quiz result
    if (passed) {
      trainingProgress.isCompleted = true;
      trainingProgress.completedAt = new Date();
      trainingProgress.finalScore = score;
      trainingProgress.progress = 100;
      
      console.log('Quiz passed - updating completion status');
    } else {
      // Update progress even if failed (partial completion)
      trainingProgress.progress = Math.max(trainingProgress.progress, 75);
      console.log('Quiz failed but progress updated');
    }

    // Save the user progress document
    await userProgressDoc.save();

    // Update module statistics if passed (only on first successful completion)
    if (passed && attemptNumber === 1) {
      await Training.findByIdAndUpdate(trainingId, { 
        $inc: { 'statistics.totalCompletions': 1 } 
      });
      console.log('Module completion statistics updated');
    }

    const pointsEarned = passed ? module.pointsReward : 0;

    console.log('=== QUIZ SUBMISSION SUCCESS ===');
    
    res.json({
      success: true,
      message: passed ? 'Quiz passed successfully!' : 'Quiz completed, but minimum score not reached',
      data: {
        passed,
        score,
        correctAnswers,
        totalQuestions: module.quiz.length,
        pointsEarned,
        attemptNumber,
        progress: {
          progress: trainingProgress.progress,
          isCompleted: trainingProgress.isCompleted,
          finalScore: trainingProgress.finalScore,
          videoCompleted: trainingProgress.videoCompleted,
          quizAttempts: trainingProgress.quizAttempts
        }
      }
    });

  } catch (error) {
    console.error('=== QUIZ SUBMISSION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz. Please try again.'
    });
  }
});

/**
 * 🔹 Get user progress - UPDATED for new schema
 */
router.get('/progress', authenticate, async (req, res) => {
  try {
    const userProgressDoc = await TrainingProgress.findOne({ user: req.user._id })
      .populate('trainingData.training', 'title category level pointsReward')
      .lean();

    if (!userProgressDoc) {
      return res.json({ 
        success: true, 
        data: { 
          progress: [], 
          stats: {
            totalStarted: 0,
            totalCompleted: 0,
            totalPoints: 0,
            averageScore: 0,
          }
        } 
      });
    }

    const progress = userProgressDoc.trainingData || [];
    const completed = progress.filter((p) => p.isCompleted);
    const scores = progress.filter((p) => p.finalScore).map((p) => p.finalScore);

    const stats = {
      totalStarted: progress.length,
      totalCompleted: completed.length,
      totalPoints: completed.reduce((sum, p) => sum + (p.training?.pointsReward || 0), 0),
      averageScore: scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0,
    };

    res.json({ success: true, data: { progress, stats } });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training progress' });
  }
});

/**
 * 🔹 Create training module
 */
router.post('/modules', authenticate, authorize('admin'), async (req, res) => {
  try {
    const moduleSchema = Joi.object({
      title: Joi.string().max(200).required(),
      description: Joi.string().max(1000).required(),
      category: Joi.string()
        .valid(
          'waste_sorting',
          'recycling',
          'composting',
          'hazardous_waste',
          'reduction_tips',
          'environmental_impact'
        )
        .required(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
      content: Joi.string().required(),
      videoUrl: Joi.string().uri().allow('').default(''),
      estimatedDuration: Joi.number().min(1).required(),
      pointsReward: Joi.number().min(0).default(50),
      completionCriteria: Joi.object({
        minScore: Joi.number().min(0).max(100).default(70),
        mustCompleteAllSections: Joi.boolean().default(true),
        mustWatchVideo: Joi.boolean().default(false),
      }).default(),
      quiz: Joi.array()
        .items(
          Joi.object({
            question: Joi.string().required(),
            options: Joi.array()
              .items(Joi.object({ 
                text: Joi.string().required(), 
                isCorrect: Joi.boolean().required() 
              }))
              .min(2)
              .required(),
            explanation: Joi.string().allow('').default(''),
            points: Joi.number().min(1).default(10),
          })
        )
        .min(1)
        .required(),
    });

    const { error, value } = moduleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const module = new Training({
      ...value,
      author: req.user._id,
      statistics: { totalEnrollments: 0, totalCompletions: 0, averageScore: 0 },
    });

    await module.save();
    res.status(201).json({
      success: true,
      message: 'Training module created successfully',
      data: { module },
    });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ success: false, message: 'Failed to create training module' });
  }
});

export default router;