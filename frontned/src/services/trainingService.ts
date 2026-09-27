import api from './api';

export interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
}

export interface TrainingModuleType {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  content: string;
  videoUrl?: string;
  estimatedDuration: number;
  pointsReward: number;
  quiz: Array<{
    question: string;
    options: Array<{ text: string }>;
    points: number;
  }>;
  completionCriteria: {
    minScore: number;
    mustWatchVideo?: boolean;
  };
}

export interface UserProgress {
  progress: number;
  currentSection: number;
  isCompleted: boolean;
  videoCompleted?: boolean;
  videoCompletedAt?: string;
  quizAttempts?: Array<{
    score: number;
    completedAt: string;
  }>;
}

export interface QuizResult {
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  pointsEarned?: number;
}

export interface CreateModuleData {
  title: string;
  description: string;
  category: string;
  level: string;
  content: string;
  videoUrl?: string;
  estimatedDuration: number;
  pointsReward: number;
  completionCriteria: {
    minScore: number;
    mustWatchVideo?: boolean;
  };
  quiz: Array<{
    question: string;
    options: Array<{ text: string; isCorrect: boolean }>;
    explanation?: string;
    points: number;
  }>;
}

class TrainingService {
  async getTrainingModules(): Promise<TrainingModuleType[]> {
    try {
      const response = await api.get('/training/modules');
      const data = response.data?.data?.modules || response.data?.modules || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching training modules:', error);
      throw error;
    }
  }

  async getTrainingModule(id: string): Promise<{ module: TrainingModuleType; userProgress: UserProgress | null }> {
    try {
      console.log('Fetching training module:', id);
      const response = await api.get(`/training/modules/${id}`);
      console.log('Module response:', response.data);
      
      const data = response.data?.data || response.data;
      return {
        module: data?.module || data,
        userProgress: data?.userProgress || null
      };
    } catch (error) {
      console.error('Error fetching training module:', error);
      throw error;
    }
  }

  async startTraining(id: string): Promise<UserProgress> {
    try {
      console.log('Starting training for module:', id);
      const response = await api.post(`/training/modules/${id}/start`);
      const data = response.data?.data || response.data;
      return data?.userProgress || data?.progress || data;
    } catch (error) {
      console.error('Error starting training:', error);
      throw error;
    }
  }

  // FIXED: Video completion with better error handling
  async completeVideo(id: string): Promise<UserProgress> {
    try {
      console.log('Completing video for module:', id);
      const response = await api.post(`/training/modules/${id}/video-complete`);
      console.log('Video completion response:', response.data);
      
      const data = response.data?.data || response.data;
      return data?.progress || data?.userProgress || data;
    } catch (error) {
      console.error('Error completing video:', error);
      console.error('Response status:', (error as any).response?.status);
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        console.error('Response data:', (error as any).response?.data);
      }
      throw error;
    }
  }

  // FIXED: Quiz submission with proper answer format
  async submitQuiz(id: string, answers: number[]): Promise<QuizResult> {
    try {
      console.log('Submitting quiz with answers:', answers);
      console.log('Module ID:', id);
      
      // Validate answers array
      if (!Array.isArray(answers) || answers.length === 0) {
        throw new Error('Invalid answers format');
      }
      
      // Validate all answers are provided (no -1 values)
      if (answers.some(answer => answer < 0)) {
        throw new Error('All questions must be answered');
      }
      
      // Backend expects just { answers: [0, 1, 2, ...] } - simple array format
      const response = await api.post(`/training/modules/${id}/quiz`, { 
        answers: answers 
      });
      
      console.log('Quiz submission response:', response.data);
      
      const data = response.data?.data || response.data;
      return {
        passed: data.passed || false,
        score: data.score || 0,
        correctAnswers: data.correctAnswers || 0,
        totalQuestions: data.totalQuestions || 0,
        pointsEarned: data.pointsEarned || 0
      };
    } catch (error) {
      console.error('Error submitting quiz:', error);
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        console.error('Response status:', error.response?.status);
        // @ts-ignore
        console.error('Response data:', error.response?.data);
      }
      throw error;
    }
  }

  async getProgress(): Promise<{progress: UserProgress[], stats: any}> {
    try {
      const response = await api.get('/training/progress');
      const data = response.data?.data || response.data;
      return {
        progress: data?.progress || [],
        stats: data?.stats || {
          totalStarted: 0,
          totalCompleted: 0,
          totalPoints: 0,
          averageScore: 0
        }
      };
    } catch (error) {
      console.error('Error fetching progress:', error);
      throw error;
    }
  }

  async createModule(moduleData: CreateModuleData): Promise<TrainingModuleType> {
    try {
      const response = await api.post('/training/modules', moduleData);
      const data = response.data?.data || response.data;
      return data?.module || data;
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  }

  extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  }

  isValidYouTubeUrl(url: string): boolean {
    return this.extractYouTubeId(url) !== null;
  }
}

export const trainingService = new TrainingService();
export default trainingService;