import { ArrowUpRight, ArrowRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EnrichedItem } from '../../hooks/useItemData';
import { getIconUrl } from '../../utils/icon';
import { formatSaleVelocity } from '../../utils/marketMetrics';

type Props = {
  items: readonly EnrichedItem[];
  server: string;
  loading: boolean;
  unavailable: boolean;
  stale: boolean;
};

/** The briefing uses the same collected snapshot and ranking as the explorer. */
export function MarketSpotlight({ items, server, loading, unavailable, stale }: Props) {
  const leaders = items.filter(item => item.volume > 0).slice(0, 3);

  return (
    <aside className="market-spotlight" aria-labelledby="spotlight-title" aria-busy={loading}>
      <div className="spotlight-heading">
        <span><Activity size={16} aria-hidden="true" /> MARKET PULSE</span>
        <span className="spotlight-server">{server} · {stale ? '이전 수집' : '수집 스냅샷'}</span>
      </div>
      <div className="spotlight-intro">
        <div>
          <p className="eyebrow">지금 살펴볼 아이템</p>
          <h2 id="spotlight-title">거래가 활발한 장터</h2>
        </div>
        <span className="spotlight-number" aria-hidden="true"><span>TOP</span> {String(leaders.length).padStart(2, '0')}</span>
      </div>
      {loading ? (
        <div className="spotlight-loading" role="status">
          <span className="spotlight-skeleton" />
          <p>수집된 장터 데이터를 불러오고 있습니다.</p>
        </div>
      ) : unavailable || !leaders.length ? (
        <div className="spotlight-loading">
          <p>현재 판매속도를 확인할 수 없습니다.</p>
          <Link to="/hot-issues">장터 신호 살펴보기 <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      ) : (
        <ol className="spotlight-items">
          {leaders.map((item, index) => (
            <li key={item.id}>
              <Link to={`/item/${item.id}`}>
                <span className="spotlight-rank">{String(index + 1).padStart(2, '0')}</span>
                <img src={getIconUrl(item.icon)} width="36" height="36" alt="" decoding="async" />
                <span className="spotlight-item-name"><strong>{item.name}</strong><small>{item.category}</small></span>
                <span className="spotlight-velocity"><strong>{formatSaleVelocity(item.volume)}</strong><small>건 / 일</small></span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
      <div className="spotlight-footer">
        <p>관측 목록 내 일평균 판매 건수 기준</p>
        <Link to="/hot-issues">모든 신호 <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </aside>
  );
}
