export interface Project {
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
