import React from 'react';
import { TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

interface Props {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  browseType: 'file' | 'directory';
}

declare global {
  interface Window {
    electronAPI?: {
      browse: (options: { type: 'file' | 'directory'; defaultPath?: string }) => Promise<string | null>;
    };
  }
}

export function BrowseField({ label, placeholder, value, onChange, required, browseType }: Props) {
  const handleBrowse = async () => {
    const result = await window.electronAPI?.browse({ type: browseType, defaultPath: value || undefined });
    if (result) onChange(result);
  };

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      fullWidth
      size="small"
      variant="outlined"
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={browseType === 'directory' ? 'Browse folder' : 'Browse file'}>
                <IconButton size="small" onClick={handleBrowse} edge="end">
                  <FolderOpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
