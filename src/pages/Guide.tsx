import { Seo } from '../components/seo/Seo';
import { InfoPageLayout } from '../components/layout/InfoPageLayout';

export const Guide = () => (
  <>
    <Seo
      title="사용 가이드 | FF14 장터탐지기"
      description="FF14 장터탐지기의 서버 선택, 시세 읽기, 장터 신호와 관심 아이템 사용법을 안내합니다."
      path="/guide"
    />
    <InfoPageLayout
      eyebrow="사용 가이드"
      title="장터 신호를 읽는 법"
      description="구매 전에 무엇을 먼저 확인할지, 같은 기준으로 시세를 비교하는 방법을 짧게 정리했습니다."
    >
      <section className="info-page__section">
        <h2 className="info-page__section-title">1. 서버와 아이템을 선택하세요</h2>
        <ol>
          <li>상단 서버 선택에서 확인할 한국 데이터센터를 고릅니다.</li>
          <li>홈 검색창에 아이템 이름을 입력하거나 추천 항목을 선택합니다.</li>
          <li>목록의 아이템을 누르면 서버별 최저가와 판매 흐름을 볼 수 있습니다.</li>
        </ol>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">2. 오늘의 장터 신호를 비교하세요</h2>
        <p>장터 신호는 같은 아이템을 서로 다른 기준으로 정렬해 보여주는 탐색 화면입니다.</p>
        <ul>
          <li><strong>거래량 급증</strong> · 최근 7일 판매 수량이 직전 7일보다 늘어난 품목</li>
          <li><strong>가격 하락 신호</strong> · 최근 7일 가중 평균 판매가가 낮아진 품목</li>
          <li><strong>최저 매물가 TOP</strong> · 현재 확인된 최저 매물가가 높은 품목</li>
        </ul>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">3. 숫자 옆의 기준을 함께 보세요</h2>
        <p>
          증가율만 높다고 거래가 활발한 것은 아닙니다. 판매 수량, 현재 등록 매물, 마지막 수집 시점을 함께 확인해야 합니다.
        </p>
        <div className="info-page__callout">
          <p><strong>이력 비교가 준비되지 않은 경우</strong> 현재 판매속도나 매물가-최근 판매가 차이를 먼저 보여주며, 정식 7일 비교와 다를 수 있습니다.</p>
        </div>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">4. 자주 보는 아이템은 저장하세요</h2>
        <p>
          목록의 하트 버튼으로 관심 아이템을 저장할 수 있습니다. 관심 목록과 최근 본 아이템은 로그인 없이 현재 브라우저에만 보관됩니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">5. 데이터의 한계를 기억하세요</h2>
        <p>
          FF14 장터탐지기는 게임 내 장터를 직접 스트리밍하는 서비스가 아닙니다. Universalis API에서 수집된 최신 스냅샷을 바탕으로 하므로, 실제 구매 직전에는 게임 내 장터에서 매물과 가격을 다시 확인하세요.
        </p>
      </section>
    </InfoPageLayout>
  </>
);
