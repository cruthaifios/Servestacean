import React, { useState } from 'react';
import { Project } from '../types';
import { createProject, updateProject } from '../api';

interface Props {
  project: Project | null;
  onClose: () => void;
}

const defaultValues = {
  name: '',
  localRoot: '',
  dockerfilePath: './Dockerfile',
  composePath: '',
  caddyfilePath: '',
  imageName: '',
  remoteUser: 'root',
  remoteHost: '',
  sshKeyPath: '~/.ssh/id_rsa',
  domain: '',
  remotePath: '~/app',
  preBuildScript: '',
};

export function ProjectModal({ project, onClose }: Props) {
  const [form, setForm] = useState(project ? { ...project } : { ...defaultValues });
  const [saving, setSaving] = useState(false);

  const isEdit = !!project;

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && project) {
        await updateProject(project.id, form);
      } else {
        await createProject(form);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: string; label: string; placeholder: string; required?: boolean }[] = [
    { key: 'name', label: 'Project Name', placeholder: 'My App', required: true },
    { key: 'localRoot', label: 'Local Project Root', placeholder: '/home/user/myproject', required: true },
    { key: 'imageName', label: 'Docker Image Name', placeholder: 'myapp', required: true },
    { key: 'dockerfilePath', label: 'Dockerfile Path', placeholder: './Dockerfile' },
    { key: 'composePath', label: 'Docker Compose File', placeholder: './deploy/docker-compose.yml' },
    { key: 'caddyfilePath', label: 'Caddyfile Path', placeholder: './deploy/Caddyfile' },
    { key: 'remoteHost', label: 'Remote Host (IP)', placeholder: '123.45.67.89', required: true },
    { key: 'remoteUser', label: 'Remote User', placeholder: 'root' },
    { key: 'sshKeyPath', label: 'SSH Key Path', placeholder: '~/.ssh/id_rsa' },
    { key: 'remotePath', label: 'Remote Deploy Path', placeholder: '~/app' },
    { key: 'domain', label: 'Domain', placeholder: 'example.com' },
    { key: 'preBuildScript', label: 'Pre-build Script (optional)', placeholder: './scripts/prebuild.sh' },
  ];

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-content bg-dark text-light border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title">
              {isEdit ? '✏️ Edit Project' : '🦞 New Project'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="row g-3">
                {fields.map(f => (
                  <div key={f.key} className={f.key === 'name' || f.key === 'localRoot' ? 'col-12' : 'col-md-6'}>
                    <label className="form-label small text-secondary">{f.label}</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-black text-light border-secondary"
                      placeholder={f.placeholder}
                      value={(form as any)[f.key] || ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                      required={f.required}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer border-secondary">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-sm btn-accent" disabled={saving}>
                {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Project')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
