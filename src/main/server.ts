import express from 'express';
import * as path from 'path';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig, saveConfig, ProjectConfig } from './config';
import { deployProject } from './deploy';

const activeDeployments = new Set<string>();

export async function startServer(port: number): Promise<http.Server> {
  const app = express();
  app.use(express.json());

  // Serve renderer
  app.use(express.static(path.join(__dirname, '..', 'renderer')));

  // --- API Routes ---

  // GET /api/projects
  app.get('/api/projects', (_req, res) => {
    const config = loadConfig();
    res.json(config.projects);
  });

  // POST /api/projects
  app.post('/api/projects', (req, res) => {
    const config = loadConfig();
    const project: ProjectConfig = {
      id: uuidv4(),
      name: req.body.name || 'Untitled',
      localRoot: req.body.localRoot || '',
      dockerfilePath: req.body.dockerfilePath || './Dockerfile',
      composePath: req.body.composePath || '',
      caddyfilePath: req.body.caddyfilePath || '',
      imageName: req.body.imageName || '',
      remoteUser: req.body.remoteUser || 'root',
      remoteHost: req.body.remoteHost || '',
      sshKeyPath: req.body.sshKeyPath || '',
      domain: req.body.domain || '',
      remotePath: req.body.remotePath || '~/app',
      preBuildScript: req.body.preBuildScript || '',
      lastDeployedAt: null,
      lastDeployedCommit: null,
    };
    config.projects.push(project);
    saveConfig(config);
    res.json(project);
  });

  // PUT /api/projects/:id
  app.put('/api/projects/:id', (req, res) => {
    const config = loadConfig();
    const idx = config.projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    const existing = config.projects[idx];
    config.projects[idx] = {
      ...existing,
      name: req.body.name ?? existing.name,
      localRoot: req.body.localRoot ?? existing.localRoot,
      dockerfilePath: req.body.dockerfilePath ?? existing.dockerfilePath,
      composePath: req.body.composePath ?? existing.composePath,
      caddyfilePath: req.body.caddyfilePath ?? existing.caddyfilePath,
      imageName: req.body.imageName ?? existing.imageName,
      remoteUser: req.body.remoteUser ?? existing.remoteUser,
      remoteHost: req.body.remoteHost ?? existing.remoteHost,
      sshKeyPath: req.body.sshKeyPath ?? existing.sshKeyPath,
      domain: req.body.domain ?? existing.domain,
      remotePath: req.body.remotePath ?? existing.remotePath,
      preBuildScript: req.body.preBuildScript ?? existing.preBuildScript,
    };
    saveConfig(config);
    res.json(config.projects[idx]);
  });

  // DELETE /api/projects/:id
  app.delete('/api/projects/:id', (req, res) => {
    const config = loadConfig();
    config.projects = config.projects.filter(p => p.id !== req.params.id);
    saveConfig(config);
    res.json({ ok: true });
  });

  // POST /api/projects/:id/deploy
  app.post('/api/projects/:id/deploy', (req, res) => {
    const config = loadConfig();
    const project = config.projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (activeDeployments.has(project.id)) return res.status(409).json({ error: 'Deploy already in progress' });

    activeDeployments.add(project.id);
    res.json({ ok: true, message: 'Deploy started' });

    // Run deploy async, broadcast via WS
    const broadcast = (global as any).__wsBroadcast;
    deployProject(project, broadcast).finally(() => {
      activeDeployments.delete(project.id);
    });
  });

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  });

  const server = http.createServer(app);

  // WebSocket
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (_ws: WebSocket) => {
    // Client connected, will receive broadcasts
  });

  (global as any).__wsBroadcast = (msg: object) => {
    const data = JSON.stringify(msg);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  };

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🦞 Servestacean server running on port ${port}`);
      resolve(server);
    });
  });
}
