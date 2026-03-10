import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ProjectConfig {
  id: string;
  name: string;
  localRoot: string;
  dockerfilePath: string;
  composePath: string;
  caddyfilePath: string;
  imageName: string;
  remoteUser: string;
  remoteHost: string;
  sshKeyPath: string;
  domain: string;
  remotePath: string;
  preBuildScript: string;
  lastDeployedAt: string | null;
  lastDeployedCommit: string | null;
}

export interface AppConfig {
  projects: ProjectConfig[];
}

const CONFIG_DIR = path.join(os.homedir(), '.servestacean');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): AppConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig: AppConfig = { projects: [] };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
