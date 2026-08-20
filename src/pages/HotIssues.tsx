import { useMemo, useState } from 'react';
import { Activity, BadgeDollarSign, Info, TrendingDown, type LucideIcon } from 'lucide-react';
import { useItemData } from '../hooks/useItemData';
import { ItemListItem } from '../components/ui/ItemListItem';
import { SkeletonRow } from '../components/ui/SkeletonRow';
import { DataErrorState } from '../components/ui/DataErrorState';
import { useServerStore } from '../store/useServerStore';
import { selectCurrentPriceGapItems, selectHotIssueItems, selectRecentVolumeItems, type HotIssueTab } from '../utils/marketRankings';
import { Seo } from '../components/seo/Seo';
import { formatSaleVelocity } from '../utils/marketMetrics';

type TabType = HotIssueTab;

const TAB_CONFIG: Record<TabType, {
  label: string;
  icon: LucideIcon;
  description: string;
  formula: string;
  empty: string;
}> = {
  volume: {
    label: '거래량 급증',
    icon: Activity,
    description: '최근 7일 판매 수량이 직전 7일보다 늘어난 순서입니다. 증가율이 높아도 절대 거래량을 함께 확인하세요.',
    formula: '(최근 7일 판매 수량 - 직전 7일 판매 수량) ÷ 직전 7일 판매 수량',
    empty: '두 기간에 모두 판매 이력이 있는 품목이 아직 없습니다.',
  },
  drop: {
    label: '가격 하락 신호',
    icon: TrendingDown,
    description: '최근 7일 가중 평균 판매가가 직전 7일보다 낮은 순서입니다. 음수일수록 실제 하락폭이 큽니다.',
    formula: '(최근 7일 평균 - 직전 7일 평균) ÷ 직전 7일 평균',
    empty: '두 기간에 모두 판매 이력이 있는 품목이 아직 없습니다.',
  },
  price: {
    label: '최저 매물가 TOP',
    icon: BadgeDollarSign,
    description: '현재 등록된 매물 중 최저가가 높은 순서입니다. 구매 진입가가 높은 품목을 빠르게 찾습니다.',
    formula: 'minPrice · 최저 매물가',
    empty: '현재 등록된 매물이 있는 품목이 아직 없습니다.',
  },
};

const SERVER_LABELS: Record<string, string> = {
  Chocobo: '초코보',
  Moogle: '모그리',
  Carbuncle: '카벙클',
  Tonberry: '톤베리',
  Fenrir: '펜리르',
};

export const HotIssues = () => {
  const {
    enrichedItems,
    priceChanges,
    historyReady,
    snapshotStale,
    isLoading,
    isError,
    refetch,
  } = useItemData();
  const { server } = useServerStore();
  const [activeTab, setActiveTab] = useState<TabType>('volume');
  const activeConfig = TAB_CONFIG[activeTab];
  const ActiveIcon = activeConfig.icon;
  const isHistoryTab = activeTab !== 'price';

  const rankingItems = useMemo(() => {
    if (!isHistoryTab) return enrichedItems;

    return enrichedItems.map((item) => ({
      ...item,
      fluctuation: activeTab === 'drop'
        ? priceChanges[String(item.id)]?.changePercent ?? null
        : item.fluctuation,
      volumeChangePercent: priceChanges[String(item.id)]?.volumeChangePercent ?? null,
    }));
  }, [activeTab, enrichedItems, isHistoryTab, priceChanges]);

  const isHistoryPreview = isHistoryTab && !historyReady;

  const visibleItems = useMemo(
    () => isHistoryPreview
      ? activeTab === 'volume'
        ? selectRecentVolumeItems(enrichedItems, 50)
        : selectCurrentPriceGapItems(enrichedItems, 50)
      : selectHotIssueItems(rankingItems, activeTab, 50),
    [activeTab, enrichedItems, isHistoryPreview, rankingItems],
  );

  const isAnyLoading = isLoading;
  const hasError = isError;
  const handleRetry = () => void refetch();

  return (
    <>
      <Seo
        title="장터 거래량·가격 하락 신호 | FF14 장터탐지기"
        description="파이널판타지14 한국 서버의 거래 활발 품목, 최근 7일 가격 하락 신호, 최저 매물가 상위 품목을 확인하세요."
        path="/hot-issues"
      />
      <div className="w-full space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--app-accent)]">
            {SERVER_LABELS[server] ?? server} · {snapshotStale ? '이전 수집 데이터' : '수집 스냅샷'}
          </p>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--app-ink)] sm:text-[28px]">
            오늘의 장터 신호
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--app-ink-muted)]">
            같은 데이터를 서로 다른 기준으로 읽어보세요. 각 순위는 현재 선택한 장터 서버 기준입니다.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] px-4 py-3 text-left sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--app-ink-muted)]">표시 중</p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--app-ink)]">
            {isAnyLoading ? '-' : `${visibleItems.length}개`}
            <span className="ml-1 text-[12px] font-medium text-[var(--app-ink-muted)]">/ 최대 50개</span>
          </p>
        </div>
      </header>

      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="tablist"
        aria-label="장터 순위 기준"
      >
        {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
          <TabButton
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            icon={TAB_CONFIG[tab].icon}
            label={TAB_CONFIG[tab].label}
            tabId={tab}
          />
        ))}
      </div>

      <section
        id="hot-issues-panel"
        role="tabpanel"
        aria-labelledby={`hot-issues-tab-${activeTab}`}
        className="overflow-hidden rounded-2xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_8px_30px_rgba(23,25,28,0.04)] dark:shadow-none"
      >
        <div className="border-b border-[var(--app-hairline)] bg-[var(--app-surface-subtle)]/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-foreground)] shadow-sm">
              <ActiveIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--app-ink)]">
                {activeConfig.label}
              </h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-[var(--app-ink-muted)]">
              {isHistoryPreview && activeTab === 'volume'
                  ? '7일 이력 스냅샷이 준비되지 않아 현재 판매속도 순위를 먼저 보여드립니다.'
                  : isHistoryPreview
                    ? '7일 이력 스냅샷이 준비되지 않아 현재 매물-판매가 차이를 먼저 보여드립니다.'
                  : activeConfig.description}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] px-3 py-2.5 text-[12px] text-[var(--app-ink-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-accent)]" aria-hidden="true" />
            <span><strong className="font-bold text-[var(--app-ink)]">계산 기준</strong> · {isHistoryPreview
              ? activeTab === 'volume' ? '현재 판매속도 · 건/일 (이력 스냅샷 대기 중)' : '현재 매물-판매가 차이 (이력 스냅샷 대기 중)'
              : activeConfig.formula}</span>
          </div>
          <p className="mt-3 text-[11px] text-[var(--app-ink-muted)]">
            {isHistoryPreview
              ? '현재 지표는 7일 이력 기준과 다를 수 있습니다. 다음 서버 수집 완료 후 이력 순위로 갱신됩니다.'
              : activeTab === 'price'
              ? '최근 업로드가 7일을 넘은 데이터는 표시 순위에서 제외합니다.'
              : '최근 7일과 직전 7일에 판매 이력이 모두 있는 품목만 계산합니다.'}
          </p>
        </div>

        {hasError ? (
          <div className="p-5 sm:p-6">
            <DataErrorState onRetry={handleRetry} />
          </div>
        ) : isAnyLoading ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--app-surface)]/75 backdrop-blur-sm">
              <Activity className="mb-3 h-7 w-7 animate-spin text-[var(--app-accent)]" aria-hidden="true" />
              <p className="text-[14px] font-bold text-[var(--app-ink)]">
                '마켓 스냅샷을 불러오는 중입니다...'
              </p>
            </div>
            <div className="opacity-40">
              {Array.from({ length: 10 }).map((_, index) => <SkeletonRow key={`skel-${index}`} />)}
            </div>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <ActiveIcon className="h-9 w-9 text-[var(--app-ink-muted)]" aria-hidden="true" />
            <p className="mt-4 text-[15px] font-bold text-[var(--app-ink)]">표시할 품목이 없습니다.</p>
            <p className="mt-2 text-[13px] text-[var(--app-ink-muted)]">{activeConfig.empty}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-hairline)] px-4 py-3 text-[12px] text-[var(--app-ink-muted)] sm:px-6">
              <span>상위 {visibleItems.length}개</span>
              <span>
                {activeTab === 'drop'
                  ? '하락폭이 큰 순서'
                  : activeTab === 'volume'
                    ? '증가율이 큰 순서'
                    : '높은 값부터 정렬'}
              </span>
            </div>
            {visibleItems.map((item, index) => (
              <div
                key={`${activeTab}-${item.id}`}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <ItemListItem
                  item={item}
                  signal={activeTab === 'volume' && isHistoryPreview
                    ? {
                        label: '판매속도',
                        value: item.volume,
                        title: '이력 비교가 끝나기 전 현재 판매속도를 먼저 보여줍니다.',
                        format: formatSaleVelocity,
                        tone: 'neutral',
                      }
                    : activeTab === 'drop' && isHistoryPreview
                    ? {
                        label: '현재 매물-판매',
                        value: item.fluctuation,
                        title: '이력 비교가 끝나기 전 현재 평균 매물가와 최근 평균 판매가의 차이를 먼저 보여줍니다.',
                      }
                    : activeTab === 'volume'
                    ? {
                        label: '7일 거래량',
                        value: item.volumeChangePercent ?? null,
                        title: '두 기간의 판매 수량 변화율입니다.',
                      }
                    : activeTab === 'drop'
                      ? {
                          label: '7일 가격',
                          value: item.fluctuation,
                          title: '두 기간의 가중 평균 판매가 변화율입니다.',
                        }
                      : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </>
  );
};

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  tabId,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  tabId: TabType;
}) => (
  <button
    id={`hot-issues-tab-${tabId}`}
    type="button"
    role="tab"
    aria-selected={active}
    aria-controls="hot-issues-panel"
    onClick={onClick}
    className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50 ${
      active
        ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)] shadow-sm'
        : 'border-[var(--app-hairline)] bg-[var(--app-surface)] text-[var(--app-ink-muted)] hover:border-[var(--app-accent)]/50 hover:bg-[var(--app-surface-subtle)]'
    }`}
  >
    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
    <span className="text-[14px] font-bold">{label}</span>
  </button>
);
