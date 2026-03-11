import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, Grid,
} from '@mui/material';
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
        loadProjects();
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ borderBottom: '2px solid', borderColor: 'primary.main', bgcolor: '#1e1e1e' }} elevation={0}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            <span>🦞</span>
            <span>Servestacean</span>
          </Typography>
          <Button variant="contained" color="primary" size="small" onClick={handleAdd}>
            + Add Project
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {projects.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
            <Box sx={{ fontSize: '4rem' }}>🦞</Box>
            <Typography variant="h5" sx={{ mt: 2 }}>No projects yet</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Click "Add Project" to set up your first deployment.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map(p => (
              <Grid key={p.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <ProjectCard
                  project={p}
                  deploying={deployingId === p.id}
                  onDeploy={() => handleDeploy(p.id)}
                  onEdit={() => handleEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {showLog && (
          <DeployLog
            log={logLines}
            deploying={deployingId !== null}
            onClose={() => setShowLog(false)}
          />
        )}
      </Box>

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={handleModalClose}
        />
      )}
    </Box>
  );
}
