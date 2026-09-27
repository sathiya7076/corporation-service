import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trainingService } from '../services/trainingService';

const ModuleDetail: React.FC = () => {
  const { id } = useParams(); // React Router v6
  const [module, setModule] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchModule = async () => {
      try {
        const response = await trainingService.getTrainingModule(id);
        const moduleData = response.data.module || response.module; // handle service wrapper
        setModule(moduleData);
        setAnswers(new Array(moduleData.quiz?.length || 0).fill(-1));
      } catch (err) {
        console.error('Error fetching module:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModule();
  }, [id]);

  const handleAnswerChange = (qIndex: number, optionIndex: number) => {
    const updated = [...answers];
    updated[qIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      const result = await trainingService.submitQuiz(id, answers);
      setSubmitted(true);
      setScore(result.data.score);
    } catch (err) {
      console.error('Error submitting quiz:', err);
    }
  };

  if (loading) return <p>Loading module...</p>;
  if (!module) return <p>Module not found</p>;

  return (
    <div className="container mt-4">
      <h2>{module.title}</h2>
      <p>{module.description}</p>
      <hr />
      <h4>Quiz</h4>
      {module.quiz?.map((q: any, i: number) => (
        <div key={i} className="mb-3">
          <p>{i + 1}. {q.question}</p>
          {q.options.map((o: any, idx: number) => (
            <div className="form-check" key={idx}>
              <input
                className="form-check-input"
                type="radio"
                name={`q-${i}`}
                checked={answers[i] === idx}
                onChange={() => handleAnswerChange(i, idx)}
              />
              <label className="form-check-label">{o.text}</label>
            </div>
          ))}
        </div>
      ))}
      <button className="btn btn-success" onClick={handleSubmit} disabled={submitted}>
        Submit Quiz
      </button>
      {submitted && score !== null && <p className="mt-3">Your score: {score.toFixed(2)}%</p>}
    </div>
  );
};

export default ModuleDetail;
