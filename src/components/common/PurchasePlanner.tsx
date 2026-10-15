import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { MARKET_SERVER_NAMES, MARKET_SERVERS } from '../../constants/market';
import { useServerStore } from '../../store/useServerStore';
import { getAbsoluteMinPrice, getServerMinPrices } from '../../utils/marketListings';
import type { KoreaDCResponse } from '../../types/market';

type PurchasePlannerStatus = 'loading' | 'error' | 'ready';

export function PurchasePlanner({
  listings,
  status = 'ready',
}: {
  listings: NonNullable<KoreaDCResponse['listings']>;
  status?: PurchasePlannerStatus;
}) {
  const [quantity, setQuantity] = useState('1');
  const [quality, setQuality] = useState('all');
  const server = useServerStore((state) => state.server);
  const homeName = MARKET_SERVERS.find((value) => value.id === server)?.name;
  const prices = useMemo(
    () =>
      getServerMinPrices(
        listings.filter(
          (listing) =>
            quality === 'all' || (quality === 'hq' ? listing.hq === true : listing.hq === false),
        ),
        MARKET_SERVER_NAMES,
      ),
    [listings, quality],
  );
  const minimum = getAbsoluteMinPrice(prices);
  const marketStatusMessage = status === 'loading'
    ? '시세 조회 중'
    : status === 'error'
      ? '시세 조회 실패'
      : minimum > 0
        ? '선택한 품질의 서버별 최저가 기준'
        : quality === 'all'
          ? '현재 등록된 매물이 없습니다.'
          : '선택한 품질에 매물이 없습니다.';
  const count = Number(quantity);
  const valid = Number.isSafeInteger(count) && count >= 1 && count <= 9999;
  const homePrice = prices.find((price) => price.serverName === homeName)?.minPrice ?? 0;

  return (
    <section className="terminal-panel purchase-planner" aria-labelledby="planner-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PLAN YOUR PURCHASE</p>
          <h2 id="planner-title">
            <Calculator size={18} /> 구매 비용 비교
          </h2>
        </div>
      </div>
      <div className="planner-controls">
        <label>
          구매 수량
          <input
            type="number"
            min="1"
            max="9999"
            step="1"
            value={quantity}
            aria-invalid={!valid}
            aria-describedby={valid ? 'quantity-help' : 'quantity-help quantity-error'}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label>
          품질
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="all">전체 품질</option>
            <option value="nq">NQ만</option>
            <option value="hq">HQ만</option>
          </select>
        </label>
      </div>
      <p id="quantity-help" className="table-note">
        1~9,999 사이의 정수를 입력하면 예상 비용을 계산합니다.
      </p>
      {!valid && (
        <p id="quantity-error" role="alert" className="planner-error">
          수량은 1~9,999 사이의 정수로 입력해 주세요.
        </p>
      )}
      <p className="table-note min-h-[2.25rem]" role="status" aria-live="polite">
        {marketStatusMessage}
      </p>
      <div className="planner-results" aria-live="polite">
        {prices.map((price) => (
          <div
            key={price.serverName}
            className={minimum > 0 && price.minPrice === minimum ? 'best-price' : ''}
          >
            <span>
              {price.serverName} {price.serverName === homeName && <small>내 서버</small>}
              {minimum > 0 && price.minPrice === minimum && <small>최저가</small>}
            </span>
            <strong>
              {status === 'loading'
                ? '조회 중'
                : status === 'error'
                  ? '조회 실패'
                  : !valid
                    ? '계산 불가'
                    : price.minPrice > 0
                      ? `${(price.minPrice * count).toLocaleString()} G`
                      : '매물 없음'}
            </strong>
          </div>
        ))}
      </div>
      {status === 'ready' && valid && minimum > 0 && homePrice > minimum && (
        <p className="planner-saving">
          {homeName} 서버 대비 예상 차액{' '}
          <strong>{((homePrice - minimum) * count).toLocaleString()} G</strong>
        </p>
      )}
      <p className="table-note">
        서버별 최저 단가 × 수량의 예상 비용입니다. 매물 수량·묶음·이동 비용은 반영하지 않으며, 해당
        단가로 전량 구매가 보장되지는 않습니다. 품질이 확인되지 않은 매물은 NQ/HQ 필터에서
        제외됩니다.
      </p>
    </section>
  );
}
