import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, CircularProgress,
} from '@mui/material';
import { Project } from '../types';
import { createProject, updateProject } from '../api';
import { BrowseField } from './BrowseField';

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

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  fullWidth?: boolean;
  browse?: 'file' | 'directory';
};

const fields: FieldDef[] = [
  { key: 'name', label: 'Project Name', placeholder: 'My App', required: true, fullWidth: true },
  { key: 'localRoot', label: 'Local Project Root', placeholder: '/home/user/myproject', required: true, fullWidth: true, browse: 'directory' },
  { key: 'imageName', label: 'Docker Image Name', placeholder: 'myapp', required: true },
  { key: 'dockerfilePath', label: 'Dockerfile Path', placeholder: './Dockerfile', browse: 'file' },
  { key: 'composePath', label: 'Docker Compose File', placeholder: './deploy/docker-compose.yml', browse: 'file' },
  { key: 'caddyfilePath', label: 'Caddyfile Path', placeholder: './deploy/Caddyfile', browse: 'file' },
  { key: 'remoteHost', label: 'Remote Host (IP)', placeholder: '123.45.67.89', required: true },
  { key: 'remoteUser', label: 'Remote User', placeholder: 'root' },
  { key: 'sshKeyPath', label: 'SSH Key Path', placeholder: '~/.ssh/id_rsa', browse: 'file' },
  { key: 'remotePath', label: 'Remote Deploy Path', placeholder: '~/app' },
  { key: 'domain', label: 'Domain', placeholder: 'example.com' },
  { key: 'preBuildScript', label: 'Pre-build Script (optional)', placeholder: './scripts/prebuild.sh', browse: 'file' },
];

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

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? '✏️ Edit Project' : '🦞 New Project'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ maxHeight: '60vh' }}>
          <Grid container spacing={2}>
            {fields.map(f => (
              <Grid key={f.key} size={{ xs: 12, md: f.fullWidth ? 12 : 6 }}>
                {f.browse ? (
                  <BrowseField
                    label={f.label}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key] || ''}
                    onChange={val => handleChange(f.key, val)}
                    required={f.required}
                    browseType={f.browse}
                  />
                ) : (
                  <TextField
                    label={f.label}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key] || ''}
                    onChange={e => handleChange(f.key, e.target.value)}
                    required={f.required}
                    fullWidth
                    size="small"
                    variant="outlined"
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Project')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
