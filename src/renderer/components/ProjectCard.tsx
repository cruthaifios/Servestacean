import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Button, IconButton, Box, Chip,
  Menu, MenuItem, Divider, CircularProgress,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
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
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit();
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete();
  };

  return (
    <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {project.name}
          </Typography>
          <IconButton size="small" onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
            <MenuItem onClick={handleEdit} sx={{ gap: 1 }}>
              <EditIcon fontSize="small" /> Edit
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main', gap: 1 }}>
              <DeleteIcon fontSize="small" /> Delete
            </MenuItem>
          </Menu>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          🖥️ {project.remoteUser}@{project.remoteHost}
        </Typography>
        {project.domain && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            🌐 {project.domain}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          📁 {project.imageName}
        </Typography>

        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {project.lastDeployedAt ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={project.lastDeployedCommit || '???'}
                  size="small"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem', height: 20 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {timeAgo(project.lastDeployedAt)}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Never deployed
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={onDeploy}
            disabled={deploying}
            startIcon={deploying ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchIcon fontSize="small" />}
          >
            {deploying ? 'Deploying...' : 'Deploy'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
