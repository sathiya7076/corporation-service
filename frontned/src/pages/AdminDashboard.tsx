import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { trainingService } from '../services/trainingService';
import {
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  PlusCircle,
  Video,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardData {
  overview: {
    totalUsers: number;
    totalReports: number;
    totalFacilities: number;
    pendingReports: number;
    completedReports: number;
    activeWorkers: number;
  };
  reportsByStatus: Record<string, number>;
  reportsByWasteType: Record<string, number>;
  monthlyTrends: Array<{
    _id: { month: number; year: number };
    count: number;
  }>;
  trainingStats: {
    totalEnrollments: number;
    completedTrainings: number;
    avgScore: number;
  };
}

interface QuizQuestion {
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation: string;
  points: number;
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    category: 'waste_sorting',
    level: 'beginner',
    content: '',
    videoUrl: '', // Added video URL field
    estimatedDuration: 30,
    pointsReward: 50,
    completionCriteria: {
      minScore: 70,
      mustWatchVideo: false // Added video completion requirement
    },
    quiz: [
      {
        question: '',
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ],
        explanation: '',
        points: 10
      }
    ] as QuizQuestion[]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await adminService.getDashboardData();
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setNewModule((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value
        }
      }));
    } else {
      setNewModule((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleQuizChange = (
    qIndex: number,
    field: keyof QuizQuestion | 'options',
    value: any
  ) => {
    const updatedQuiz = [...newModule.quiz];
    if (field === 'options') {
      updatedQuiz[qIndex].options = value;
    } else if (field in updatedQuiz[qIndex]) {
      // Only assign if field is a valid key of QuizQuestion
      (updatedQuiz[qIndex] as any)[field] = value;
    }
    setNewModule((prev) => ({ ...prev, quiz: updatedQuiz }));
  };

  const handleOptionChange = (qIndex: number, oIndex: number, field: string, value: any) => {
    const updatedQuiz = [...newModule.quiz];
    if (field === 'text') {
      updatedQuiz[qIndex].options[oIndex].text = value as string;
    } else if (field === 'isCorrect') {
      updatedQuiz[qIndex].options[oIndex].isCorrect = value as boolean;
    }
    
    // If marking this option as correct, unmark others
    if (field === 'isCorrect' && value) {
      updatedQuiz[qIndex].options.forEach((option, index) => {
        if (index !== oIndex) {
          option.isCorrect = false;
        }
      });
    }
    
    setNewModule((prev) => ({ ...prev, quiz: updatedQuiz }));
  };

  const addQuizQuestion = () => {
    setNewModule((prev) => ({
      ...prev,
      quiz: [
        ...prev.quiz,
        {
          question: '',
          options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false }
          ],
          explanation: '',
          points: 10
        }
      ]
    }));
  };

  const removeQuizQuestion = (qIndex: number) => {
    if (newModule.quiz.length > 1) {
      const updatedQuiz = newModule.quiz.filter((_, index) => index !== qIndex);
      setNewModule((prev) => ({ ...prev, quiz: updatedQuiz }));
    }
  };

  const addOption = (qIndex: number) => {
    const updatedQuiz = [...newModule.quiz];
    updatedQuiz[qIndex].options.push({ text: '', isCorrect: false });
    setNewModule((prev) => ({ ...prev, quiz: updatedQuiz }));
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updatedQuiz = [...newModule.quiz];
    if (updatedQuiz[qIndex].options.length > 2) {
      updatedQuiz[qIndex].options.splice(oIndex, 1);
      setNewModule((prev) => ({ ...prev, quiz: updatedQuiz }));
    }
  };

  const validateYouTubeUrl = (url: string): boolean => {
    if (!url) return true; // Empty URL is valid
    return trainingService.isValidYouTubeUrl(url);
  };

  const validateModule = () => {
    if (!newModule.title.trim()) return 'Title is required';
    if (!newModule.description.trim()) return 'Description is required';
    if (!newModule.content.trim()) return 'Content is required';
    if (newModule.videoUrl && !validateYouTubeUrl(newModule.videoUrl)) {
      return 'Invalid YouTube URL format';
    }
    if (newModule.quiz.some((q) => !q.question.trim())) return 'Quiz question cannot be empty';
    for (const q of newModule.quiz) {
      if (q.options.some((o) => !o.text.trim())) return 'Quiz options cannot be empty';
      if (!q.options.some((o) => o.isCorrect)) return 'Each question must have a correct answer';
    }
    return null;
  };

  const resetForm = () => {
    setNewModule({
      title: '',
      description: '',
      category: 'waste_sorting',
      level: 'beginner',
      content: '',
      videoUrl: '',
      estimatedDuration: 30,
      pointsReward: 50,
      completionCriteria: {
        minScore: 70,
        mustWatchVideo: false
      },
      quiz: [
        {
          question: '',
          options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false }
          ],
          explanation: '',
          points: 10
        }
      ]
    });
  };

  const handleSaveModule = async () => {
    const error = validateModule();
    if (error) {
      alert(error);
      return;
    }
    try {
      setSaving(true);
      await trainingService.createModule(newModule);
      alert('Module created successfully!');
      setShowAddModal(false);
      resetForm();
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create module');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-gray-500">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusData = Object.entries(data.reportsByStatus || {}).map(([key, value]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value
  }));

  const monthlyData = (data.monthlyTrends || []).map(item => ({
    month: `${item._id.month}/${item._id.year}`,
    reports: item.count
  }));

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  const StatCard = ({ icon: Icon, title, value, color }: any) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8" style={{ color }} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString() || 0}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage and monitor waste management operations</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Training Module
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard icon={Users} title="Total Users" value={data.overview.totalUsers} color="#3B82F6" />
          <StatCard icon={MapPin} title="Total Reports" value={data.overview.totalReports} color="#10B981" />
          <StatCard icon={CheckCircle} title="Completed Reports" value={data.overview.completedReports} color="#059669" />
          <StatCard icon={Clock} title="Pending Reports" value={data.overview.pendingReports} color="#F59E0B" />
          <StatCard icon={Activity} title="Active Workers" value={data.overview.activeWorkers} color="#8B5CF6" />
          <StatCard icon={MapPin} title="Total Facilities" value={data.overview.totalFacilities} color="#EF4444" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Report Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="reports" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl relative shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Add Training Module</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="Module Title"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newModule.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newModule.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                    >
                      <option value="waste_sorting">Waste Sorting</option>
                      <option value="recycling">Recycling</option>
                      <option value="composting">Composting</option>
                      <option value="hazardous_waste">Hazardous Waste</option>
                      <option value="reduction_tips">Reduction Tips</option>
                      <option value="environmental_impact">Environmental Impact</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newModule.level}
                      onChange={(e) => handleChange('level', e.target.value)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newModule.estimatedDuration}
                      onChange={(e) => handleChange('estimatedDuration', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Points Reward</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={newModule.pointsReward}
                      onChange={(e) => handleChange('pointsReward', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    placeholder="Module Description"
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newModule.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Video className="h-4 w-4 mr-2" />
                    YouTube Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                      newModule.videoUrl && !validateYouTubeUrl(newModule.videoUrl)
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-green-500'
                    }`}
                    value={newModule.videoUrl}
                    onChange={(e) => handleChange('videoUrl', e.target.value)}
                  />
                  {newModule.videoUrl && !validateYouTubeUrl(newModule.videoUrl) && (
                    <p className="text-red-600 text-sm mt-1">Please enter a valid YouTube URL</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    Supported formats: youtube.com/watch?v=ID, youtu.be/ID, or just the video ID
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    placeholder="Training content and materials"
                    rows={6}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newModule.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                  />
                </div>

                {/* Completion Criteria */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Completion Criteria</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={newModule.completionCriteria.minScore}
                        onChange={(e) => handleChange('completionCriteria.minScore', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="mustWatchVideo"
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        checked={newModule.completionCriteria.mustWatchVideo}
                        onChange={(e) => handleChange('completionCriteria.mustWatchVideo', e.target.checked)}
                      />
                      <label htmlFor="mustWatchVideo" className="ml-2 text-sm text-gray-700">
                        Must watch video before quiz
                      </label>
                    </div>
                  </div>
                </div>

                {/* Quiz Questions */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">Quiz Questions</h4>
                    <button
                      type="button"
                      onClick={addQuizQuestion}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Question
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {newModule.quiz.map((question, qIndex) => (
                      <div key={qIndex} className="border rounded-lg p-4 bg-white relative">
                        {newModule.quiz.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuizQuestion(qIndex)}
                            className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question {qIndex + 1}
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your question"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={question.question}
                            onChange={(e) => handleQuizChange(qIndex, 'question', e.target.value)}
                          />
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">Options</label>
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                            >
                              + Add Option
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder={`Option ${oIndex + 1}`}
                                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                  value={option.text}
                                  onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                                />
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name={`correct-${qIndex}`}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                    checked={option.isCorrect}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                                  />
                                  <span className="ml-1 text-sm text-gray-600">Correct</span>
                                </label>
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Explanation (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Explain the correct answer"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={question.explanation}
                              onChange={(e) => handleQuizChange(qIndex, 'explanation', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                            <input
                              type="number"
                              min="1"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={question.points}
                              onChange={(e) => handleQuizChange(qIndex, 'points', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModule}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Module'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;