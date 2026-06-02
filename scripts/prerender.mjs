import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'out');
const indexPath = path.join(outDir, 'index.html');

const staticRoutes = [
  '/',
  '/pricing',
  '/how-it-works',
  '/ebook-store',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

async function prerender() {
  if (!existsSync(indexPath)) {
    throw new Error('Build output not found. Run `npm run build` before prerender.');
  }

  const html = await readFile(indexPath, 'utf-8');

  for (const route of staticRoutes) {
    if (route === '/') continue;

    const routeDir = path.join(outDir, route.replace(/^\//, ''));
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, 'index.html'), html, 'utf-8');
  }

  // Keep a fallback copy for static hosts with strict SPA handling.
  const fallbackPath = path.join(outDir, '200.html');
  await cp(indexPath, fallbackPath, { force: true });

  console.log(`Prerender complete for ${staticRoutes.length} routes.`);
}

prerender().catch((error) => {
  console.error(error);
  process.exit(1);
});
