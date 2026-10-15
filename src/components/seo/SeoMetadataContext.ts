import { createContext } from 'react';
import type { ResolvedSeoMetadata } from './seoHead';

export type SeoMetadataCollector = {
  fallbackOrigin: string;
  capture: (metadata: ResolvedSeoMetadata) => void;
};

export const SeoMetadataContext = createContext<SeoMetadataCollector | null>(null);
