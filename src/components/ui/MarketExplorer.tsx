import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  SlidersHorizontal,
  Heart,
} from 'lucide-react';
import type { EnrichedItem } from '../../hooks/useItemData';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { FavoriteButton } from './FavoriteButton';
import { exploreMarket, marketCsv, type MarketSort } from '../../utils/marketExplorer';
import { formatMarketPriceGap, formatSaleVelocity } from '../../utils/marketMetrics';
import { formatFreshness } from '../../utils/time';
import { getIconUrl } from '../../utils/icon';

const PAGE_SIZE = 12;

export function MarketExplorer({
  items,
  server,
}: {
  items: readonly EnrichedItem[];
  server: string;
}) {
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [sort, setSort] = useState<MarketSort>('volume');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const categories = useMemo(
    () => ['전체', ...new Set(items.map((item) => item.category))],
    [items],
  );
  const results = useMemo(
    () => exploreMarket(items, { query, category, sort, favoritesOnly, favoriteIds }),
    [items, query, category, sort, favoritesOnly, favoriteIds],
  );
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const reset = () => {
    setQuery('');
    setCategory('전체');
    setFavoritesOnly(false);
    setSort('volume');
    setPage(1);
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([marketCsv(results, server)], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ff14market-${server}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="terminal-panel explorer" aria-labelledby="explorer-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MARKET EXPLORER</p>
          <h2 id="explorer-title">
            시세 탐색기 <span className="count-label">{items.length.toLocaleString()}</span>
          </h2>
        </div>
        <button className="quiet-button" onClick={download} disabled={!results.length}>
          <Download size={15} /> CSV 저장
        </button>
      </div>
      <div className="explorer-toolbar">
        <label className="filter-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="시세 목록에서 이름 검색"
            placeholder="목록에서 아이템 찾기"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="sort-control">
          <ArrowDownUp size={15} aria-hidden="true" />
          <select
            aria-label="시세 정렬"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as MarketSort);
              setPage(1);
            }}
          >
            <option value="volume">판매속도 높은 순</option>
            <option value="price-asc">가격 낮은 순</option>
            <option value="price-desc">가격 높은 순</option>
            <option value="gap">매물-판매 격차 낮은 순</option>
          </select>
        </label>
      </div>
      <div className="category-toolbar">
        <div className="category-tabs" aria-label="아이템 분류">
          {categories.map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                setPage(1);
              }}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          className="watch-filter"
          aria-pressed={favoritesOnly}
          onClick={() => {
            setFavoritesOnly(!favoritesOnly);
            setPage(1);
          }}
        >
          <Heart size={14} aria-hidden="true" /> 관심만
        </button>
      </div>
      <div className="market-table-wrap">
        <table className="market-table">
          <caption className="sr-only">
            {server} 시세 목록. 매물-판매 격차는 현재 평균 매물가와 최근 평균 판매가의 차이입니다.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="favorite-cell">
                <span className="sr-only">관심</span>
              </th>
              <th scope="col">아이템</th>
              <th scope="col">최저 매물가</th>
              <th scope="col" className="velocity-cell">
                판매속도 / 일
              </th>
              <th scope="col">매물-판매 격차</th>
              <th scope="col" className="freshness-cell">
                수집 시점
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td className="favorite-cell">
                  <FavoriteButton itemId={item.id} />
                </td>
                <th scope="row">
                  <Link className="table-item" to={`/item/${item.id}`}>
                    <img src={getIconUrl(item.icon)} alt="" loading="lazy" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.category}
                        <span className="mobile-freshness">
                          {' '}
                          ·{' '}
                          {item.lastUploadTime
                            ? formatFreshness(item.lastUploadTime)
                            : '시점 미제공'}
                        </span>
                      </small>
                    </span>
                  </Link>
                </th>
                <td className="price-cell">
                  {item.price > 0 ? (
                    <>
                      {item.price.toLocaleString()} <small>G</small>
                    </>
                  ) : (
                    <small>매물 없음</small>
                  )}
                </td>
                <td className="velocity-cell">
                  {formatSaleVelocity(item.volume)} <small>건</small>
                </td>
                <td>
                  <span
                    className={`gap-value ${item.fluctuation !== null && item.fluctuation < 0 ? 'is-down' : item.fluctuation !== null && item.fluctuation > 0 ? 'is-up' : ''}`}
                  >
                    {formatMarketPriceGap(item.fluctuation)}
                  </span>
                </td>
                <td className="freshness-cell">
                  {item.lastUploadTime ? formatFreshness(item.lastUploadTime) : '시점 미제공'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!results.length && (
        <div className="explorer-empty">
          <SlidersHorizontal size={28} />
          <h3>조건에 맞는 아이템이 없습니다</h3>
          <p>검색어나 분류를 바꾸어 다시 확인해 보세요.</p>
          <button className="quiet-button" onClick={reset}>
            필터 초기화
          </button>
        </div>
      )}
      <div className="table-footer">
        <p role="status">
          {results.length.toLocaleString()}개 중{' '}
          {results.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(currentPage * PAGE_SIZE, results.length)} 표시
        </p>
        <div className="pagination">
          <button
            aria-label="이전 페이지"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {currentPage} / {pageCount}
          </span>
          <button
            aria-label="다음 페이지"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <p className="table-note">
        격차는 기간별 가격 등락률이 아닙니다. NQ·HQ를 포함한 최저 매물가이며, 실제 거래 전 게임 내
        가격을 확인하세요.
      </p>
    </section>
  );
}
