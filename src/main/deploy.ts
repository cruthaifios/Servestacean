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

export async function deployProject(project: ProjectConfig, broadcast: BroadcastFn): Promise<boolean> {
  const { localRoot, dockerfilePath, composePath, caddyfilePath, imageName, remoteUser, remoteHost, sshKeyPath, remotePath, preBuildScript } = project;
  const tmpTar = `/tmp/${imageName}.tar.gz`;
  const sshOpts = sshKeyPath ? `-i ${sshKeyPath} -o StrictHostKeyChecking=no` : '-o StrictHostKeyChecking=no';
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

    // Step 3: Save & compress image
    broadcast({ type: 'log', data: '\n── Step 3: Saving & compressing image ──\n' });
    const saveCode = await runCommand('bash', ['-c', `docker save ${imageName}:latest | gzip > ${tmpTar}`], localRoot, broadcast);
    if (saveCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Docker save failed (exit ${saveCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }

    // Step 4: Ensure remote directory & SCP files
    broadcast({ type: 'log', data: '\n── Step 4: Transferring files to server ──\n' });
    await runCommand('ssh', [sshOpts, remote, `mkdir -p ${remotePath}`], localRoot, broadcast);

    const filesToCopy = [tmpTar];
    if (composePath) {
      const absCompose = path.isAbsolute(composePath) ? composePath : path.join(localRoot, composePath);
      filesToCopy.push(absCompose);
    }
    if (caddyfilePath) {
      const absCaddy = path.isAbsolute(caddyfilePath) ? caddyfilePath : path.join(localRoot, caddyfilePath);
      filesToCopy.push(absCaddy);
    }

    const scpCode = await runCommand('scp', [sshOpts, ...filesToCopy, `${remote}:${remotePath}/`], localRoot, broadcast);
    if (scpCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ SCP failed (exit ${scpCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }

    // Step 5: Load image & compose up on remote
    broadcast({ type: 'log', data: '\n── Step 5: Deploying on remote server ──\n' });
    const tarFilename = `${imageName}.tar.gz`;
    const remoteCmd = `cd ${remotePath} && docker load < ${tarFilename} && docker compose up -d && rm -f ${tarFilename}`;
    const deployCode = await runCommand('ssh', [sshOpts, remote, `"${remoteCmd}"`], localRoot, broadcast);
    if (deployCode !== 0) {
      broadcast({ type: 'log', data: `\n❌ Remote deploy failed (exit ${deployCode})\n` });
      broadcast({ type: 'deploy-end', projectId: project.id, success: false });
      return false;
    }

    // Step 6: Update config with commit + timestamp
    const commit = await getGitCommit(localRoot);
    const config = loadConfig();
    const proj = config.projects.find(p => p.id === project.id);
    if (proj) {
      proj.lastDeployedAt = new Date().toISOString();
      proj.lastDeployedCommit = commit;
      saveConfig(config);
    }

    // Step 7: Clean up temp tar
    broadcast({ type: 'log', data: '\n── Cleaning up ──\n' });
    await runCommand('rm', ['-f', tmpTar], localRoot, broadcast);

    broadcast({ type: 'log', data: `\n✅ ${project.name} deployed successfully!\n` });
    broadcast({ type: 'deploy-end', projectId: project.id, success: true, commit, timestamp: new Date().toISOString() });
    return true;

  } catch (err: any) {
    broadcast({ type: 'log', data: `\n❌ Deploy error: ${err.message}\n` });
    broadcast({ type: 'deploy-end', projectId: project.id, success: false });
    return false;
  }
}
