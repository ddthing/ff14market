import { Seo } from '../components/seo/Seo';
import { InfoPageLayout } from '../components/layout/InfoPageLayout';

export const Terms = () => (
  <>
    <Seo
      title="이용약관 | FF14 장터탐지기"
      description="FF14 장터탐지기의 서비스 목적, 데이터 출처, 이용 시 책임과 권리를 안내합니다."
      path="/terms"
      noIndex
    />
    <InfoPageLayout
      eyebrow="서비스 기준"
      title="이용약관"
      description="FF14 장터탐지기를 이용할 때 적용되는 서비스 목적과 데이터 이용 기준을 안내합니다."
      updatedAt="2026년 8월 20일"
    >
      <section className="info-page__section">
        <h2 className="info-page__section-title">제1조 (서비스 목적)</h2>
        <p>
          FF14 장터탐지기(이하 '본 서비스')는 글로벌 MMORPG 파이널판타지14의 게임 내 장터 데이터를 시각화하여 제공하는 비영리 팬 서비스입니다. 플레이어가 시세를 빠르게 파악하고 확인 순서를 정할 수 있도록 돕는 것을 목적으로 합니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">제2조 (데이터 출처 및 정확성)</h2>
        <p>
          시세와 거래량 데이터는 외부 서비스인 <strong>Universalis API</strong>에서 수집된 값을 바탕으로 제공합니다. 수집 주기, API 응답 상태, 게임 내 변동에 따라 실제 장터와 시간 차이 또는 불일치가 발생할 수 있으며, 제공 정보는 참고용으로만 사용해야 합니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">제3조 (책임 제한)</h2>
        <div className="info-page__callout info-page__callout--warning">
          <p>
            본 서비스는 시장 정보를 있는 그대로 제공할 뿐, 게임 내 거래나 시세 차익을 권유하지 않습니다. 제공된 정보를 바탕으로 발생한 거래 결과와 길 손실 또는 이익에 대한 책임은 이용자 본인에게 있습니다.
          </p>
        </div>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">제4조 (지적 재산권)</h2>
        <p>
          서비스에서 사용되는 아이템 아이콘, 게임 내 명칭, 관련 데이터와 이미지는 각 권리자에게 귀속됩니다. 본 서비스의 광고 또는 후원 노출은 해당 권리자의 보증이나 제휴를 의미하지 않으며, 게임 자산 자체를 별도 상품으로 판매하지 않습니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">제5조 (서비스의 변경 및 중단)</h2>
        <p>
          Universalis API의 서버 상태, 네트워크 문제 또는 기타 기술적 이유로 서비스가 사전 예고 없이 변경되거나 일시 중단될 수 있습니다.
        </p>
      </section>
    </InfoPageLayout>
  </>
);
