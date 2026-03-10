import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';

mkdirSync('dist/renderer', { recursive: true });
copyFileSync('src/renderer/index.html', 'dist/renderer/index.html');

await build({
  entryPoints: ['src/renderer/index.tsx'],
  bundle: true,
  outfile: 'dist/renderer/bundle.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
  define: {
    'process.env.NODE_ENV': '"development"'
  },
});

console.log('Renderer bundle built.');
