import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  browse: (options: { type: 'file' | 'directory'; defaultPath?: string }) =>
    ipcRenderer.invoke('dialog:browse', options) as Promise<string | null>,
});
