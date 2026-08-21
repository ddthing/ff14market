import type { ComponentType } from 'react';

/** Shared lazy route loader so list intent can warm the detail chunk. */
export const loadItemDetail = () =>
  import('../pages/ItemDetail').then(({ ItemDetail }) => ({
    default: ItemDetail as ComponentType,
  }));
