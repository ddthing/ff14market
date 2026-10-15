import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Heart,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { useItemData } from '../../hooks/useItemData';
import { useSavedItems } from '../../hooks/useSavedItems';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useRecentStore } from '../../store/useRecentStore';
import { useServerStore } from '../../store/useServerStore';
import { useSearchStore } from '../../store/useSearchStore';
import { HeroSearch } from '../../components/ui/HeroSearch';
import { MarketExplorer } from '../../components/ui/MarketExplorer';
import { DataErrorState } from '../../components/ui/DataErrorState';
import { SkeletonRow } from '../../components/ui/SkeletonRow';
import { Seo } from '../../components/seo/Seo';
import { MARKET_SERVERS } from '../../constants/market';
import { getIconUrl } from '../../utils/icon';
import { formatFreshness } from '../../utils/time';
import { MarketSpotlight } from './MarketSpotlight';
import { useToastStore } from '../../store/useToastStore';

export function Dashboard() {
  const {
    enrichedItems,
    isLoading,
    isFetching,
    isError,
    refetch,
    snapshotGeneratedAt,
    snapshotStale,
    currentFreshness,
    hasSnapshot,
  } = useItemData();
  const unavailable = isError && !hasSnapshot;
  const currentDataStale = currentFreshness?.stale ?? snapshotStale;
  const currentDataPartial = currentFreshness?.partial ?? false;
  const isCurrentDataOutdated = currentDataStale || currentDataPartial || (isError && hasSnapshot);
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const recentIds = useRecentStore((state) => state.recentIds);
  const server = useServerStore((state) => state.server);
  const openSearch = useSearchStore((state) => state.open);
  const serverName = MARKET_SERVERS.find((value) => value.id === server)?.name ?? server;
  const [isRefreshing, setRefreshing] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  const favorites = useSavedItems(favoriteIds, enrichedItems);
  const recent = useSavedItems(recentIds.slice(0, 4), enrichedItems);
  const pricedCount = enrichedItems.filter((item) => item.price > 0).length;
  const belowSaleCount = enrichedItems.filter(
    (item) => item.fluctuation !== null && item.fluctuation < 0,
  ).length;
  const comparableCount = enrichedItems.filter(item => item.fluctuation !== null).length;
  const refresh = async () => {
    setRefreshing(true);
    try {
      const result = await refetch();
      addToast(result.isError ? '시세를 갱신하지 못했습니다. 잠시 후 다시 시도해 주세요.' : '최신 수집 데이터를 확인했습니다.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Seo
        title="FF14 장터탐지기 | 한국 서버 시세 대시보드"
        description="파이널판타지14 한국 데이터센터 장터의 최저 매물가, 판매량, 가격 흐름을 한눈에 확인하세요."
        path="/"
      />
      <div className="market-workspace">
        <div className="workspace-topline">
          <span>
            <span className="status-dot" /> KOREA DATA CENTER{' '}
            <span className="topline-divider">/</span> {serverName}
          </span>
          <Link to="/guide">
            장터 읽는 법 <ArrowUpRight size={13} />
          </Link>
        </div>
        <section className="market-hero">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span /> YOUR NEXT TRADE STARTS HERE</p>
            <h1>
              장터의 흐름을 읽다.
              <br />
              <span>더 나은 거래의 시작.</span>
            </h1>
            <p className="hero-description">
              필요한 재료부터 다음 제작의 기회까지.
              <br className="sm:hidden" /> 한국 서버의 시세를 한곳에서 살펴보세요.
            </p>
            <HeroSearch recommendedItems={enrichedItems.slice(0, 3)} />
            <p className="hero-search-hint">아이템 검색부터 서버별 가격 비교까지 <span>로그인 없이, 바로.</span></p>
          </div>
          <MarketSpotlight items={enrichedItems} server={serverName} loading={isLoading} unavailable={unavailable} stale={isCurrentDataOutdated} />
        </section>
        {isError && hasSnapshot && (
          <div className="snapshot-warning" role="status">
            <Clock3 size={17} aria-hidden="true" />
            <p>시세 갱신에 실패해 마지막 수집 데이터를 표시합니다. 구매 전 게임 내 가격을 확인하세요.</p>
            <button type="button" className="quiet-button" disabled={isRefreshing} onClick={() => void refresh()}>다시 시도</button>
          </div>
        )}
        <div className="market-stats">
          <div>
            <span className="stat-icon">
              <Activity size={18} />
            </span>
            <span>
              <small>시세 확인 가능</small>
              <strong>
                {isLoading || unavailable ? '—' : pricedCount.toLocaleString()} <em>아이템</em>
              </strong>
            </span>
          </div>
          <div>
            <span className="stat-icon">
              <TrendingDown size={18} />
            </span>
            <span>
              <small>최근 판매가보다 낮은 평균 매물가</small>
              <strong>
              {isLoading || unavailable || comparableCount === 0 ? '—' : belowSaleCount.toLocaleString()} <em>아이템</em>
              </strong>
            </span>
          </div>
          <div>
            <span className="stat-icon">
              <Heart size={18} />
            </span>
            <span>
              <small>내 관심 목록</small>
              <strong>
                {favoriteIds.length} <em>아이템</em>
              </strong>
            </span>
          </div>
          <div className="snapshot-stat" aria-busy={isRefreshing || isFetching}>
            <span className="stat-icon">
              <Clock3 size={18} />
            </span>
            <span>
              <small>{currentDataStale
                ? '이전 가격 데이터'
                : currentDataPartial
                  ? '일부 가격 데이터 이전'
                  : '가격 수집 시점'}</small>
              <strong className="stat-time">
                {currentFreshness?.generatedAt || snapshotGeneratedAt
                  ? formatFreshness(currentFreshness?.generatedAt ?? snapshotGeneratedAt)
                  : '수집 대기'}
              </strong>
            </span>
            <button
              className="refresh-button"
              disabled={isRefreshing || isLoading || isFetching}
              onClick={() => void refresh()}
              aria-label="시세 새로고침"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="workspace-columns">
          <div className="workspace-primary">
            {unavailable ? (
              <DataErrorState onRetry={() => void refetch()} />
            ) : isLoading ? (
              <div className="terminal-panel" role="status" aria-label="시세 불러오는 중">
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonRow key={index} />
                ))}
              </div>
            ) : (
              <MarketExplorer key={server} items={enrichedItems} server={serverName} />
            )}
          </div>
          <aside className="workspace-sidebar">
            <section className="terminal-panel watch-panel">
              <div className="panel-heading">
                <h2>
                  <Heart size={16} /> 내 관심 아이템
                </h2>
                <Link to="/favorites" aria-label="관심 아이템 모두 보기">
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              {favorites.length ? (
                favorites.slice(0, 5).map((item) => (
                  <Link key={item.id} to={`/item/${item.id}`} className="compact-item">
                    <img src={getIconUrl(item.icon) || undefined} width="36" height="36" alt="" loading="lazy" decoding="async" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.price > 0 ? `${item.price.toLocaleString()} G` : '시세 미제공'}
                      </small>
                    </span>
                  </Link>
                ))
              ) : (
                <div className="watch-empty">
                  <span className="empty-heart">
                    <Heart size={23} />
                  </span>
                  <h3>나만의 장터를 만들어보세요</h3>
                  <p>
                    목록의 하트를 누르면
                    <br />
                    자주 찾는 시세를 모아볼 수 있어요.
                  </p>
                  <button className="quiet-button" onClick={openSearch}>
                    아이템 검색 <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </section>
            {recent.length > 0 && (
              <section className="terminal-panel">
                <div className="panel-heading">
                  <h2>
                    <Clock3 size={16} /> 최근 본 아이템
                  </h2>
                </div>
                {recent.map((item) => (
                  <Link key={item.id} className="compact-item" to={`/item/${item.id}`}>
                    <img src={getIconUrl(item.icon) || undefined} width="36" height="36" alt="" loading="lazy" decoding="async" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.price > 0 ? `${item.price.toLocaleString()} G` : '시세 미제공'}
                      </small>
                    </span>
                  </Link>
                ))}
              </section>
            )}
            <div className="trust-note">
              <ShieldCheck size={19} />
              <div>
                <strong>데이터를 투명하게.</strong>
                <p>
                  Universalis의 수집 스냅샷을 사용합니다. 서버별 수집 시점과 실제 매물은 다를 수
                  있습니다.
                </p>
                <Link to="/about">
                  데이터 안내 <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
