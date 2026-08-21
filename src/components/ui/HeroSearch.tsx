import { ItemSearch } from './ItemSearch';
import type { EnrichedItem } from '../../hooks/useItemData';

type HeroSearchProps = {
  recommendedItems: ReadonlyArray<Pick<EnrichedItem, 'id' | 'name'>>;
};

export const HeroSearch = ({ recommendedItems }: HeroSearchProps) => (
  <ItemSearch variant="hero" recommendedItems={recommendedItems} />
);
