import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { ProjectConfig, loadConfig, saveConfig } from './config';

type BroadcastFn = (msg: object) => void;

function runCommand(cmd: string, args: string[], cwd: string, broadcast: BroadcastFn): Promise<number> {
  return new Promise((resolve, reject) => {
    broadcast({ type: 'log', data: `\n$ ${cmd} ${args.join(' ')}\n` });

    const proc: ChildProcess = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout?.on('data', (data: Buffer) => {
      broadcast({ type: 'log', data: data.toString() });
    });

    proc.stderr?.on('data', (data: Buffer) => {
      broadcast({ type: 'log', data: data.toString() });
    });

    proc.on('close', (code) => {
      resolve(code ?? 1);
    });

    proc.on('error', (err) => {
      broadcast({ type: 'log', data: `Error: ${err.message}\n` });
      reject(err);
    });
  });
}

function getGitCommit(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('git', ['rev-parse', '--short', 'HEAD'], { cwd, shell: true });
    let out = '';
    proc.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
    proc.on('close', (code) => {
      resolve(code === 0 ? out.trim() : null);
    });
    proc.on('error', () => resolve(null));
  });
}

const REGISTRY_PORT = 5000;
const REGISTRY_CONTAINER = 'servestacean-registry';

export async function deployProject(project: ProjectConfig, broadcast: BroadcastFn): Promise<boolean> {
  const { localRoot, dockerfilePath, composePath, caddyfilePath, imageName, remoteUser, remoteHost, sshKeyPath, remotePath, preBuildScript } = project;
  const registryImage = `localhost:${REGISTRY_PORT}/${imageName}:latest`;
  const sshOpts = sshKeyPath ? `-i ${sshKeyPath} -o StrictHostKeyChecking=no` : '-o StrictHostKeyChecking=no';
  const sshTunnelOpts = `${sshOpts} -R ${REGISTRY_PORT}:localhost:${REGISTRY_PORT}`;
  const remote = `${remoteUser}@${remoteHost}`;

  try {
    broadcast({ type: 'deploy-start', projectId: project.id });
    broadcast({ type: 'log', data: `🦞 Starting deployment of ${project.name}...\n` });

    // Step 1: Optional pre-build script
    if (preBuildScript && preBuildScript.trim()) {
      broadcast({ type: 'log', data: '\n── Step 1: Running pre-build script ──\n' });
      const scriptPath = path.isAbsolute(preBuildScript) ? preBuildScript : path.join(localRoot, preBuildScript);
      const code = await runCommand('bash', [scriptPath], localRoot, broadcast);
      if (code !== 0) {
        broadcast({ type: 'log', data: `\n❌ Pre-build script failed (exit ${code})\n` });
        broadcast({ type: 'deploy-end', projectId: project.id, success: false });
        return false;
      }
    }

    // Step 2: Docker build
    broadcast({ type: 'log', data: '\n── Step 2: Building Docker image ──\n' });
    const dfArg = dockerfilePath !== './Dockerfile' ? ['-f', dockerfilePath] : [];
    const buildCode = await runCommand('docker', ['build', ...dfArg, '-t', `${imageName}:latest`, '.'], localRoot, broadcast);
    if (buildCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Docker build failed (exit ${buildCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }

    // Step 3: Ensure local registry is running
    broadcast({ type: 'log', data: '\n── Step 3: Starting local registry ──\n' });
    const registryCmd = `docker start ${REGISTRY_CONTAINER} 2>/dev/null || docker run -d -p ${REGISTRY_PORT}:5000 --name ${REGISTRY_CONTAINER} --restart=unless-stopped registry:2`;
    const registryCode = await runCommand('bash', ['-c', registryCmd], localRoot, broadcast);
    if (registryCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Failed to start local registry (exit ${registryCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }
    
    // Wait for registry to be ready (it needs a moment to initialize)
    broadcast({ type: 'log', data: 'Waiting for registry to be ready...\n' });
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay for registry to fully initialize

    // Step 4: Tag & push image to local registry
    broadcast({ type: 'log', data: '\n── Step 4: Pushing image to local registry ──\n' });
    const tagCode = await runCommand('docker', ['tag', `${imageName}:latest`, registryImage], localRoot, broadcast);
    if (tagCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Docker tag failed (exit ${tagCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }
    const pushCode = await runCommand('docker', ['push', registryImage], localRoot, broadcast);
    if (pushCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Docker push failed (exit ${pushCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }

    // Step 5: Transfer compose & config files to remote
    broadcast({ type: 'log', data: '\n── Step 5: Transferring files to server ──\n' });
    await runCommand('ssh', [sshOpts, remote, `mkdir -p ${remotePath}`], localRoot, broadcast);

    const filesToCopy: string[] = [];
    if (composePath) {
      const absCompose = path.isAbsolute(composePath) ? composePath : path.join(localRoot, composePath);
      filesToCopy.push(absCompose);
    }
    if (caddyfilePath) {
      const absCaddy = path.isAbsolute(caddyfilePath) ? caddyfilePath : path.join(localRoot, caddyfilePath);
      filesToCopy.push(absCaddy);
    }

    if (filesToCopy.length > 0) {
      const scpCode = await runCommand('scp', [sshOpts, ...filesToCopy, `${remote}:${remotePath}/`], localRoot, broadcast);
      if (scpCode !== 0) {
        broadcast({ type: 'log', data: `\n❌ SCP failed (exit ${scpCode})\n` });
        broadcast({ type: 'deploy-end', projectId: project.id, success: false });
        return false;
      }
    }

    // Step 6: Pull image & compose up on remote (via SSH reverse tunnel to local registry)
    broadcast({ type: 'log', data: '\n── Step 6: Deploying on remote server ──\n' });
    const remoteCmd = [
      `docker pull ${registryImage}`,
      `docker tag ${registryImage} ${imageName}:latest`,
      `cd ${remotePath} && docker compose up -d`,
    ].join(' && ');
    const deployCode = await runCommand('ssh', [sshTunnelOpts, remote, `"${remoteCmd}"`], localRoot, broadcast);
    if (deployCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Remote deploy failed (exit ${deployCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }

    // Step 7: Update config with commit + timestamp
    const commit = await getGitCommit(localRoot);
    const config = loadConfig();
    const proj = config.projects.find(p => p.id === project.id);
    if (proj) {
      proj.lastDeployedAt = new Date().toISOString();
      proj.lastDeployedCommit = commit;
      saveConfig(config);
    }

    broadcast({ type: 'log', data: `\n✅ ${project.name} deployed successfully!\n` });
    broadcast({ type: 'deploy-end', projectId: project.id, success: true, commit, timestamp: new Date().toISOString() });
    return true;

  } catch (err: any) {
    broadcast({ type: 'log', data: `\n❌ Deploy error: ${err.message}\n` });
    broadcast({ type: 'deploy-end', projectId: project.id, success: false });
    return false;
  }
}
