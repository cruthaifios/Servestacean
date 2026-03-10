import React from 'react';
import { Project } from '../types';

interface Props {
  project: Project;
  deploying: boolean;
  onDeploy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectCard({ project, deploying, onDeploy, onEdit, onDelete }: Props) {
  return (
    <div className="card bg-dark text-light h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{project.name}</h5>
          <div className="dropdown">
            <button
              className="btn btn-sm btn-outline-secondary border-0"
              data-bs-toggle="dropdown"
              onClick={(e) => {
                // Simple dropdown toggle without Bootstrap JS
                const menu = e.currentTarget.nextElementSibling;
                if (menu) menu.classList.toggle('show');
              }}
            >
              ⋮
            </button>
            <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end">
              <li><button className="dropdown-item" onClick={onEdit}>✏️ Edit</button></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item text-danger" onClick={onDelete}>🗑️ Delete</button></li>
            </ul>
          </div>
        </div>

        <div className="small text-secondary mb-1">
          <span className="me-3">🖥️ {project.remoteUser}@{project.remoteHost}</span>
        </div>
        {project.domain && (
          <div className="small text-secondary mb-1">🌐 {project.domain}</div>
        )}
        <div className="small text-secondary mb-3">📁 {project.imageName}</div>

        <div className="mt-auto d-flex justify-content-between align-items-center">
          <div>
            {project.lastDeployedAt ? (
              <span className="small text-secondary">
                <span className="commit-badge badge bg-secondary me-1">
                  {project.lastDeployedCommit || '???'}
                </span>
                {timeAgo(project.lastDeployedAt)}
              </span>
            ) : (
              <span className="small text-secondary fst-italic">Never deployed</span>
            )}
          </div>
          <button
            className="btn btn-accent btn-sm"
            onClick={onDeploy}
            disabled={deploying}
          >
            {deploying ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" />
                Deploying...
              </>
            ) : (
              '🚀 Deploy'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
