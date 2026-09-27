  import React, { useState, useEffect, useRef } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import trainingService from '../services/trainingService';
  import {
    ArrowLeft,
    BookOpen,
    Clock,
    Award,
    CheckCircle,
    Play,
    Trophy,
    AlertCircle,
    Video,
    PlayCircle,
    XCircle
  } from 'lucide-react';

  interface TrainingModuleType {
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

  interface UserProgress {
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

  interface QuizResult {
    passed: boolean;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    pointsEarned?: number;
  }

  const TrainingModule: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [module, setModule] = useState<TrainingModuleType | null>(null);
    const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSection, setCurrentSection] = useState<'content' | 'video' | 'quiz'>('content');
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizSubmitting, setQuizSubmitting] = useState(false);
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const videoRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
      if (id) loadModule();
    }, [id]);

    useEffect(() => {
      if (module && userProgress) {
        // Auto-switch to video if module has video and it's not completed
        if (module.videoUrl && !userProgress.videoCompleted) {
          setCurrentSection('video');
        } else if (userProgress.progress < 100) {
          setCurrentSection('content');
        }
      }
    }, [module, userProgress]);

    const loadModule = async () => {
      setError('');
      setLoading(true);
      try {
        const response = await trainingService.getTrainingModule(id!);
        const moduleData: TrainingModuleType = response.module;
        const progressData: UserProgress | null = response.userProgress || null;

        setModule(moduleData || null);
        setUserProgress(progressData);

        if (moduleData?.quiz) {
          setQuizAnswers(new Array(moduleData.quiz.length).fill(-1));
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load training module');
      } finally {
        setLoading(false);
      }
    };

    const startTraining = async () => {
      setError('');
      try {
        await trainingService.startTraining(id!);
        // Refresh the module data to get updated progress
        await loadModule();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to start training');
      }
    };

    // FIXED: Video completion handler with better error handling
    const handleVideoEnd = async () => {
      if (!userProgress || userProgress.videoCompleted) return;
      
      try {
        setError('');
        console.log('Recording video completion...');
        
        await trainingService.completeVideo(id!);
        
        // Update local state with new progress
        setUserProgress(prev => ({
          ...prev!,
          videoCompleted: true,
          videoCompletedAt: new Date().toISOString(),
          progress: Math.max(prev!.progress, 50)
        }));
        
        console.log('Video completion recorded successfully');
        
        // Auto-switch to quiz if video completion unlocks it
        if (module?.completionCriteria?.mustWatchVideo) {
          setTimeout(() => {
            setCurrentSection('quiz');
          }, 1000);
        }
      } catch (err: any) {
        console.error('Error recording video completion:', err);
        const errorMessage = err.response?.data?.message || 'Failed to record video completion';
        setError(errorMessage);
        
        // Don't prevent user from continuing if it's just a recording error
        if (errorMessage.includes('duplicate') || errorMessage.includes('already')) {
          setUserProgress(prev => ({
            ...prev!,
            videoCompleted: true,
            videoCompletedAt: new Date().toISOString(),
            progress: Math.max(prev!.progress, 50)
          }));
          setError('');
        }
      }
    };

    const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
      const newAnswers = [...quizAnswers];
      newAnswers[questionIndex] = answerIndex;
      setQuizAnswers(newAnswers);
    };

    // FIXED: Quiz submission with proper validation
    const submitQuiz = async () => {
      // Validate all questions are answered
      if (quizAnswers.some((answer) => answer === -1)) {
        setError('Please answer all questions before submitting.');
        return;
      }

      setQuizSubmitting(true);
      setError('');
      try {
        console.log('Submitting quiz with answers:', quizAnswers);
        const response = await trainingService.submitQuiz(id!, quizAnswers);
        setQuizResult(response);
        
        if (response.passed) {
  setSuccessMessage(`Congratulations! You've completed the module and earned ${response.pointsEarned} points!`);
  // Refresh module data to get updated progress
  await loadModule();
  // Clear success message after 5 seconds
  setTimeout(() => setSuccessMessage(''), 5000);
}
      } catch (err: any) {
        console.error('Quiz submission error:', err);
        const errorMessage = err.response?.data?.message || 'Failed to submit quiz';
        setError(errorMessage);
      } finally {
        setQuizSubmitting(false);
      }
    };

    const resetQuiz = () => {
      if (module) {
        setQuizAnswers(new Array(module.quiz.length).fill(-1));
      }
      setQuizResult(null);
      setError('');
    };

    const getYouTubeVideoId = (url: string): string | null => {
      return trainingService.extractYouTubeId(url);
    };

    // FIXED: Quiz access logic
    const canAccessQuiz = (): boolean => {
      if (!module || !userProgress) return false;

      // If video is required and not completed, deny access
      if (module.videoUrl && module.completionCriteria.mustWatchVideo) {
        return userProgress.videoCompleted === true;
      }

      // If no video requirement, allow access after starting training
      return true;
    };

    const getSectionProgress = () => {
      if (!module || !userProgress) return { content: 0, video: 0, quiz: 0 };
      
      return {
        content: userProgress.progress > 0 ? 100 : 0,
        video: userProgress.videoCompleted ? 100 : 0,
        quiz: userProgress.isCompleted
          ? 100
          : userProgress.quizAttempts && userProgress.quizAttempts.length > 0
          ? 50
          : 0
      };
    };

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
        </div>
      );
    }

    if (error && !module) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error loading module</h3>
            <p className="mt-1 text-gray-500">{error}</p>
            <button
              onClick={() => navigate('/training')}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Back to Training
            </button>
          </div>
        </div>
      );
    }

    if (!module) return null;

    const sectionProgress = getSectionProgress();

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <button
              onClick={() => navigate('/training')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Training
            </button>
            {userProgress?.isCompleted && (
              <div className="flex items-center text-green-600">
                <Trophy className="h-5 w-5 mr-2" />
                <span className="font-medium">Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Module Info */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{module.title}</h1>
                <p className="text-gray-600">{module.description}</p>
              </div>
              {userProgress?.isCompleted && (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                <span>{module.category?.replace('_', ' ') ?? 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {module.estimatedDuration} min
              </div>
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-1" />
                {module.pointsReward} pts
              </div>
              <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {module.level}
              </span>
            </div>

            {userProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{userProgress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${userProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setCurrentSection('content')}
                className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center ${
                  currentSection === 'content'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Content
                {sectionProgress.content === 100 && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
              </button>

              {module.videoUrl && (
                <button
                  onClick={() => setCurrentSection('video')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center ${
                    currentSection === 'video'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Video className="h-4 w-4 mr-1" />
                  Video
                  {sectionProgress.video === 100 && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
                </button>
              )}

              <button
                onClick={() => setCurrentSection('quiz')}
                disabled={!canAccessQuiz()}
                className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center ${
                  currentSection === 'quiz' && canAccessQuiz()
                    ? 'border-green-500 text-green-600'
                    : !canAccessQuiz()
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Quiz ({module.quiz?.length ?? 0})
                {sectionProgress.quiz === 100 && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}


          {/* Success Message */}
{successMessage && (
  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
    <div className="flex">
      <CheckCircle className="h-5 w-5 text-green-400" />
      <p className="ml-3 text-sm text-green-800">{successMessage}</p>
    </div>
  </div>
)}

          {/* Content Section */}
          {currentSection === 'content' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              {userProgress ? (
                <div className="prose max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: typeof module.content === 'string'
                        ? module.content.replace(/\n/g, '<br>')
                        : ''
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Play className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Ready to start learning?</h3>
                  <p className="text-gray-600 mb-6">
                    Click the button below to begin this training module and start earning points.
                  </p>
                  <button
                    onClick={startTraining}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Start Training
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Video Section */}
          {currentSection === 'video' && module.videoUrl && (
            <div className="bg-white rounded-lg shadow-md p-6">
              {!userProgress ? (
                <div className="text-center py-12">
                  <PlayCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start training to watch video</h3>
                  <p className="text-gray-600 mb-4">
                    You need to start the training module before watching the video.
                  </p>
                  <button
                    onClick={startTraining}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Start Training
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Training Video</h3>
                    {userProgress.videoCompleted && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm">Video Completed</span>
                      </div>
                    )}
                  </div>

                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {(() => {
                      const videoId = getYouTubeVideoId(module.videoUrl!);
                      if (videoId) {
                        return (
                          <iframe
                            ref={videoRef}
                            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center text-white">
                              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                              <p>Invalid video URL</p>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {!userProgress.videoCompleted && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <Video className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="ml-3">
                          <p className="text-sm text-blue-800">
                            Watch the complete video to continue with the training.
                            {module.completionCriteria.mustWatchVideo && (
                              <span className="font-medium"> Video completion is required before taking the quiz.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual video completion button */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleVideoEnd}
                      disabled={userProgress.videoCompleted}
                      className={`px-4 py-2 rounded-md transition ${
                        userProgress.videoCompleted
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {userProgress.videoCompleted ? 'Video Completed' : 'Mark Video as Watched'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quiz Section */}
          {currentSection === 'quiz' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              {!userProgress ? (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start Training First</h3>
                  <p className="text-gray-600 mb-4">
                    You need to start the training module before taking the quiz.
                  </p>
                  <button
                    onClick={startTraining}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Start Training Now
                  </button>
                </div>
              ) : !canAccessQuiz() ? (
                <div className="text-center py-12">
                  <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Video completion required</h3>
                  <p className="text-gray-600 mb-4">
                    You must watch the training video before taking the quiz.
                  </p>
                  <button
                    onClick={() => setCurrentSection('video')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Go to Video
                  </button>
                </div>
              ) : quizResult ? (
                <div className="text-center py-6">
                  <div className={`mx-auto h-12 w-12 mb-4 ${quizResult.passed ? 'text-green-500' : 'text-orange-500'}`}>
                    {quizResult.passed ? <Trophy /> : <XCircle />}
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {quizResult.passed ? 'Congratulations! Quiz Passed!' : 'Quiz Not Passed'}
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Score: {quizResult.score}% ({quizResult.correctAnswers}/{quizResult.totalQuestions} correct)
                    <br />
                    {quizResult.passed ? (
                      <span className="text-green-600 font-medium">
                        You earned {quizResult.pointsEarned} points!
                      </span>
                    ) : (
                      <span className="text-orange-600">
                        Minimum score required: {module.completionCriteria.minScore}% - Try again to pass!
                      </span>
                    )}
                  </p>
                  <button
                    onClick={resetQuiz}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {quizResult.passed ? 'Retake Quiz' : 'Try Again'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Knowledge Quiz</h3>
                    <p className="text-gray-600">
                      Answer all questions to complete the training. Minimum score required: {module.completionCriteria.minScore}%
                    </p>
                  </div>

                  {module.quiz.map((q, idx) => (
                    <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold mb-3">
                        Question {idx + 1}: {q.question}
                      </h4>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => handleQuizAnswer(idx, optIdx)}
                            className={`w-full text-left px-4 py-3 rounded-md border transition ${
                              quizAnswers[idx] === optIdx
                                ? 'bg-blue-100 border-blue-400 text-blue-800'
                                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-4">
                    <button
                      onClick={submitQuiz}
                      disabled={quizSubmitting || quizAnswers.some(answer => answer === -1)}
                      className={`px-8 py-3 rounded-lg font-medium transition ${
                        quizSubmitting || quizAnswers.some(answer => answer === -1)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

export default TrainingModule;