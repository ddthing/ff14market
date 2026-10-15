import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';
import { getSeoOriginFromHtml, injectSeoHead } from '../src/components/seo/seoHead.ts';
import type { ResolvedSeoMetadata } from '../src/components/seo/seoHead.ts';
import {
  injectItemDetailBootstrap,
  injectItemDetailTemplateData,
  ITEM_TEMPLATE_TOKENS,
} from '../src/routes/itemBootstrap.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryParent = path.join(projectRoot, 'node_modules', '.cache');
const temporaryPrefix = 'ff14market-prerender-';
const rootMarkup = '<div id="root"></div>';

type CuratedItem = { id: number; name: string; icon: string };
type SearchItemData = { entries: Array<[number, string, number]> };
type RenderedRoute = { markup: string; seo: ResolvedSeoMetadata | null };
type RouteRenderer = {
  renderRoute: (
    pathname: string,
    kind: 'home' | 'hot-issues' | 'favorites' | 'item',
    fallbackOrigin: string,
    initialItem?: CuratedItem,
  ) => RenderedRoute;
};

function insertBeforeItemFallback(redirects: string, generatedRules: string[]) {
  const lines = redirects.split(/\r?\n/);
  const fallbackIndex = lines.findIndex((line) => /^\s*\/item\/\*\s/.test(line));
  if (fallbackIndex === -1) return [...generatedRules, ...lines].join('\n');
  lines.splice(fallbackIndex, 0, ...generatedRules);
  return lines.join('\n');
}

function routeRedirects() {
  return [
    '/hot-issues /rendered-hot-issues 200',
    '/hot-issues/ /rendered-hot-issues 200',
    '/favorites /rendered-favorites 200',
    '/favorites/ /rendered-favorites 200',
  ];
}

function withPrerenderedRoot(
  document: string,
  marker: string,
  rendered: RenderedRoute,
  htmlPath: string,
  initialItem?: CuratedItem,
) {
  if (!document.includes(rootMarkup)) {
    throw new Error(`Expected an empty #root mount in ${htmlPath}`);
  }
  if (!rendered.seo) {
    throw new Error(`Expected route metadata while prerendering ${htmlPath}`);
  }

  const documentWithSeo = injectSeoHead(document, rendered.seo);
  const documentWithRoot = documentWithSeo.replace(
    rootMarkup,
    `<div id="root" data-prerendered="${marker}">${rendered.markup}</div>`,
  );
  return initialItem ? injectItemDetailBootstrap(documentWithRoot, initialItem) : documentWithRoot;
}

export async function prerenderHome(outputDirectory = path.join(projectRoot, 'dist')): Promise<void> {
  const distPath = path.resolve(projectRoot, outputDirectory);
  const htmlPath = path.join(distPath, 'index.html');
  const spaHtmlPath = path.join(distPath, 'spa.html');
  const redirectsPath = path.join(distPath, '_redirects');
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
    const { renderRoute } = await import(pathToFileURL(serverEntry).href) as RouteRenderer;
    const document = await readFile(htmlPath, 'utf8');
    const fallbackOrigin = getSeoOriginFromHtml(document);
    const itemJsonPath = path.join(projectRoot, 'src', 'data', 'masterItems.json');
    const items = JSON.parse(await readFile(itemJsonPath, 'utf8')) as CuratedItem[];
    const itemIds = [...new Set(items.map(({ id }) => id))].sort((a, b) => a - b);

    if (!itemIds.length || itemIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error(`Expected positive integer IDs in ${itemJsonPath}`);
    }

    const searchDataPath = path.join(projectRoot, 'src', 'data', 'searchItems.json');
    const searchData = JSON.parse(await readFile(searchDataPath, 'utf8')) as SearchItemData;
    const curatedIdSet = new Set(itemIds);
    const genericTemplateEntry = searchData.entries.find(([id]) => !curatedIdSet.has(id));
    if (!genericTemplateEntry) {
      throw new Error(`Expected at least one non-curated catalog item in ${searchDataPath}`);
    }
    const templateItem: CuratedItem = {
      id: genericTemplateEntry[0],
      name: ITEM_TEMPLATE_TOKENS.name,
      icon: ITEM_TEMPLATE_TOKENS.iconUrl,
    };

    await writeFile(spaHtmlPath, document);
    await writeFile(
      htmlPath,
      withPrerenderedRoot(document, 'home', renderRoute('/', 'home', fallbackOrigin), htmlPath),
    );
    await writeFile(
      path.join(distPath, 'rendered-hot-issues.html'),
      withPrerenderedRoot(document, 'hot-issues', renderRoute('/hot-issues', 'hot-issues', fallbackOrigin), htmlPath),
    );
    await writeFile(
      path.join(distPath, 'rendered-favorites.html'),
      withPrerenderedRoot(document, 'favorites', renderRoute('/favorites', 'favorites', fallbackOrigin), htmlPath),
    );

    const genericItemTemplate = withPrerenderedRoot(
      document,
      `item:${ITEM_TEMPLATE_TOKENS.id}`,
      renderRoute(`/item/${templateItem.id}`, 'item', fallbackOrigin, templateItem),
      htmlPath,
    );
    await writeFile(
      path.join(distPath, 'rendered-item-template.template'),
      injectItemDetailTemplateData(genericItemTemplate),
    );

    for (const item of items) {
      const pathname = `/item/${item.id}`;
      const initialItem = { id: item.id, name: item.name, icon: item.icon };
      await writeFile(
        path.join(distPath, `rendered-item-${item.id}.html`),
        withPrerenderedRoot(
          document,
          `item:${item.id}`,
          renderRoute(pathname, 'item', fallbackOrigin, initialItem),
          htmlPath,
          initialItem,
        ),
      );
    }

    const redirects = await readFile(redirectsPath, 'utf8');
    await writeFile(redirectsPath, insertBeforeItemFallback(redirects, routeRedirects()));
  } finally {
    await rm(resolvedTemporaryOutput, { recursive: true, force: true });
  }
}
