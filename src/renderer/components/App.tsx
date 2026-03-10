import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project } from '../types';
import { fetchProjects, triggerDeploy, deleteProject, connectWebSocket } from '../api';
import { ProjectCard } from './ProjectCard';
import { ProjectModal } from './ProjectModal';
import { DeployLog } from './DeployLog';

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string>('');
  const [showLog, setShowLog] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const loadProjects = useCallback(async () => {
    const p = await fetchProjects();
    setProjects(p);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const ws = connectWebSocket((msg) => {
      if (msg.type === 'log') {
        setLogLines(prev => prev + msg.data);
      } else if (msg.type === 'deploy-start') {
        setDeployingId(msg.projectId);
      } else if (msg.type === 'deploy-end') {
        setDeployingId(null);
        loadProjects(); // refresh to get updated commit/timestamp
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [loadProjects]);

  const handleDeploy = async (id: string) => {
    setLogLines('');
    setShowLog(true);
    setDeployingId(id);
    const result = await triggerDeploy(id);
    if (result.error) {
      setLogLines(`Error: ${result.error}\n`);
      setDeployingId(null);
    }
  };

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this project?')) {
      await deleteProject(id);
      loadProjects();
    }
  };

  const handleAdd = () => {
    setEditProject(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditProject(null);
    loadProjects();
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Navbar */}
      <nav className="navbar navbar-dark px-3 py-2">
        <span className="navbar-brand mb-0 h1 d-flex align-items-center gap-2">
          <span style={{ fontSize: '1.5rem' }}>🦞</span>
          <span>Servestacean</span>
        </span>
        <button className="btn btn-accent btn-sm" onClick={handleAdd}>
          + Add Project
        </button>
      </nav>

      {/* Main content */}
      <div className="container-fluid p-3 flex-grow-1">
        {projects.length === 0 ? (
          <div className="text-center text-secondary mt-5">
            <div style={{ fontSize: '4rem' }}>🦞</div>
            <h4 className="mt-3">No projects yet</h4>
            <p>Click "Add Project" to set up your first deployment.</p>
          </div>
        ) : (
          <div className="row g-3">
            {projects.map(p => (
              <div key={p.id} className="col-12 col-md-6 col-xl-4">
                <ProjectCard
                  project={p}
                  deploying={deployingId === p.id}
                  onDeploy={() => handleDeploy(p.id)}
                  onEdit={() => handleEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Deploy Log */}
        {showLog && (
          <DeployLog
            log={logLines}
            deploying={deployingId !== null}
            onClose={() => setShowLog(false)}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
