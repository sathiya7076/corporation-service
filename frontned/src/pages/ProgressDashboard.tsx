import React, { useEffect, useState } from 'react';
import { trainingService } from '../services/trainingService';

const ProgressDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const data = await trainingService.getProgress();
      setStats(data.data.stats);
    };
    fetchProgress();
  }, []);

  if (!stats) return <p>Loading progress...</p>;

  return (
    <div className="container mt-4">
      <h2>My Training Progress</h2>
      <ul className="list-group">
        <li className="list-group-item">Total Modules Started: {stats.totalStarted}</li>
        <li className="list-group-item">Total Completed: {stats.totalCompleted}</li>
        <li className="list-group-item">Total Points: {stats.totalPoints}</li>
        <li className="list-group-item">Average Score: {stats.averageScore.toFixed(2)}%</li>
      </ul>
    </div>
  );
};

export default ProgressDashboard;
