import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { startServer } from './server';

let mainWindow: BrowserWindow | null = null;
const SERVER_PORT = 19420;

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: '🦞 Servestacean',
  });

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('dialog:browse', async (_event, options: { type: 'file' | 'directory'; defaultPath?: string }) => {
  const result = await dialog.showOpenDialog({
    properties: options.type === 'directory' ? ['openDirectory'] : ['openFile'],
    defaultPath: options.defaultPath,
  });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(async () => {
  await startServer(SERVER_PORT);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
