import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainingService, TrainingModule } from '../services/trainingService';

const ModulesList: React.FC = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await trainingService.getTrainingModules();
        setModules(data.data.modules);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  if (loading) return <p>Loading modules...</p>;

  return (
    <div className="container mt-4">
      <h2>Training Modules</h2>
      <div className="row">
        {modules.map((mod) => (
          <div key={mod._id} className="col-md-4 mb-3">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{mod.title}</h5>
                <p className="card-text">{mod.description}</p>
                <p>Category: {mod.category}</p>
                <p>Level: {mod.level}</p>
                <p>Progress: {mod.userProgress.progress}%</p>
                <button className="btn btn-primary" onClick={() => navigate(`/module/${mod._id}`)}>
                  View Module
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModulesList;
