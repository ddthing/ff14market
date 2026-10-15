import type { ItemCatalogEntry } from '../api/itemCatalog';
import { getIconUrl } from '../utils/icon.ts';

export const ITEM_DETAIL_DATA_SCRIPT_ID = 'initial-item-data';
export const ITEM_TEMPLATE_TOKENS = {
  id: '__FF14_ITEM_ID__',
  name: '__FF14_ITEM_NAME__',
  iconUrl: '__FF14_ITEM_ICON_URL__',
  data: '__FF14_ITEM_DATA__',
} as const;

const catalogIconPattern = /^\/i\/\d{6}\/\d{6}\.png$/;

export function isItemCatalogEntry(value: unknown): value is ItemCatalogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ItemCatalogEntry>;
  return typeof candidate.id === 'number'
    && Number.isSafeInteger(candidate.id)
    && candidate.id > 0
    && typeof candidate.name === 'string'
    && candidate.name.length > 0
    && candidate.name.length <= 512
    && typeof candidate.icon === 'string'
    && (candidate.icon === '' || catalogIconPattern.test(candidate.icon));
}

export function parseItemDetailBootstrap(json: string, expectedId: number): ItemCatalogEntry | null {
  if (!Number.isSafeInteger(expectedId) || expectedId <= 0) return null;

  try {
    const value: unknown = JSON.parse(json);
    return isItemCatalogEntry(value) && value.id === expectedId ? value : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const escaped: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return escaped[character];
  });
}

export function serializeItemDetailBootstrap(item: ItemCatalogEntry) {
  if (!isItemCatalogEntry(item)) throw new Error('Cannot serialize invalid item metadata');

  return JSON.stringify(item).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escaped: Record<string, string> = {
      '<': '\\u003c',
      '>': '\\u003e',
      '&': '\\u0026',
      '\u2028': '\\u2028',
      '\u2029': '\\u2029',
    };
    return escaped[character];
  });
}

export function injectItemDetailBootstrap(document: string, item: ItemCatalogEntry) {
  return injectItemDetailDataScript(document, serializeItemDetailBootstrap(item));
}

export function injectItemDetailTemplateData(document: string) {
  return injectItemDetailDataScript(document, ITEM_TEMPLATE_TOKENS.data);
}

function injectItemDetailDataScript(document: string, json: string) {
  const script = `<script id="${ITEM_DETAIL_DATA_SCRIPT_ID}" type="application/json">${json}</script>`;
  if (document.includes(`id="${ITEM_DETAIL_DATA_SCRIPT_ID}"`)) {
    throw new Error('Item bootstrap data already exists in the document');
  }
  if (!/<\/body>/i.test(document)) throw new Error('Expected a closing </body> tag for item bootstrap data');

  return document.replace(/<\/body>/i, `${script}\n  </body>`);
}

export function renderItemDetailTemplate(template: string, item: ItemCatalogEntry) {
  if (!isItemCatalogEntry(item)) throw new Error('Cannot render invalid item metadata');
  const expectedTokens = Object.values(ITEM_TEMPLATE_TOKENS);
  if (expectedTokens.some((token) => !template.includes(token))) {
    throw new Error('Item detail template is missing a required substitution token');
  }

  const replacements = new Map<string, string>([
    [ITEM_TEMPLATE_TOKENS.id, String(item.id)],
    [ITEM_TEMPLATE_TOKENS.name, escapeHtml(item.name)],
    [ITEM_TEMPLATE_TOKENS.iconUrl, escapeHtml(getIconUrl(item.icon))],
    [ITEM_TEMPLATE_TOKENS.data, serializeItemDetailBootstrap(item)],
  ]);
  const tokensPattern = new RegExp(Object.values(ITEM_TEMPLATE_TOKENS).join('|'), 'g');
  return template.replace(tokensPattern, (token) => replacements.get(token) ?? token);
}
