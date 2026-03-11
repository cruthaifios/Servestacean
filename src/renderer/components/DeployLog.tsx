import React, { useEffect, useRef } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  log: string;
  deploying: boolean;
  onClose: () => void;
}

export function DeployLog({ log, deploying, onClose }: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {deploying ? (
            <>
              <CircularProgress size={14} color="primary" />
              Deploy in progress...
            </>
          ) : (
            '📋 Deploy Log'
          )}
        </Typography>
        <Button
          size="small"
          color="inherit"
          startIcon={<CloseIcon fontSize="small" />}
          onClick={onClose}
        >
          Close
        </Button>
      </Box>
      <Box
        ref={logRef}
        sx={{
          bgcolor: '#0d0d0d',
          color: '#c8c8c8',
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontSize: '0.85rem',
          p: 2,
          maxHeight: 400,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          border: '1px solid #333',
          borderRadius: 1,
        }}
      >
        {log || 'Waiting for output...'}
      </Box>
    </Box>
  );
}
