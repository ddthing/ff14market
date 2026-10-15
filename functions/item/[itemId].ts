import { findItemMetadata } from '../_lib/item-search';
import masterItems from '../../src/data/masterItems.json';
import { handleItemPageRequest, type ItemPageContext } from '../../src/routes/itemPageResponse';
import { withCachedItemDocument } from '../_lib/item-document-cache';

const curatedItemIds = new Set(masterItems.map(({ id }) => id));

export const onRequestGet = (context: ItemPageContext) =>
  withCachedItemDocument(context, () =>
    handleItemPageRequest(context, findItemMetadata, (itemId) => curatedItemIds.has(itemId)));
