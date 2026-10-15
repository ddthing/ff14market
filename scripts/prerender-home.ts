import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function prerenderHome(outputDirectory = path.join(projectRoot, 'dist')): Promise<void> {
  const distPath = path.resolve(projectRoot, outputDirectory);
  const htmlPath = path.join(distPath, 'index.html');
  const spaHtmlPath = path.join(distPath, 'spa.html');
  const temporaryParent = path.join(projectRoot, 'node_modules', '.cache');
  const temporaryPrefix = 'ff14market-prerender-';
  await mkdir(temporaryParent, { recursive: true });
  const temporaryOutput = await mkdtemp(path.join(temporaryParent, temporaryPrefix));
  const resolvedTemporaryOutput = path.resolve(temporaryOutput);
  if (
    path.dirname(resolvedTemporaryOutput) !== path.resolve(temporaryParent)
    || !path.basename(resolvedTemporaryOutput).startsWith(temporaryPrefix)
  ) {
    throw new Error(`Refusing to use unexpected temporary SSR output: ${resolvedTemporaryOutput}`);
  }

  try {
    await build({
      configFile: false,
      root: projectRoot,
      mode: 'production',
      plugins: [react()],
      resolve: {
        alias: { '@': path.join(projectRoot, 'src') },
      },
      logLevel: 'error',
      build: {
        copyPublicDir: false,
        emptyOutDir: true,
        outDir: temporaryOutput,
        ssr: path.join(projectRoot, 'src', 'entry-server.tsx'),
      },
    });

    const serverEntry = path.join(temporaryOutput, 'entry-server.js');
    const { renderHome } = await import(pathToFileURL(serverEntry).href);
    const homeMarkup = renderHome();
    const document = await readFile(htmlPath, 'utf8');
    const rootMarkup = '<div id="root"></div>';

    if (!document.includes(rootMarkup)) {
      throw new Error(`Expected an empty #root mount in ${htmlPath}`);
    }

    await writeFile(spaHtmlPath, document);
    await writeFile(
      htmlPath,
      document.replace(rootMarkup, `<div id="root" data-prerendered="home">${homeMarkup}</div>`),
    );
  } finally {
    await rm(resolvedTemporaryOutput, { recursive: true, force: true });
  }
}
