import { Seo } from '../components/seo/Seo';
import { InfoPageLayout } from '../components/layout/InfoPageLayout';

export const About = () => (
  <>
    <Seo
      title="서비스 소개 | FF14 장터탐지기"
      description="FF14 장터탐지기가 어떤 데이터를 사용하고, 어떤 기준으로 한국 서버 장터를 보여주는지 소개합니다."
      path="/about"
    />
    <InfoPageLayout
      eyebrow="서비스 소개"
      title="확인할 가치가 있는 시세부터"
      description="FF14 장터탐지기는 한국 데이터센터 장터를 빠르게 훑고, 다음에 확인할 아이템을 정하는 작은 마켓 터미널입니다."
    >
      <section className="info-page__section">
        <h2 className="info-page__section-title">무엇을 해결하나요?</h2>
        <p>
          장터를 여러 번 열어 아이템을 하나씩 비교하는 시간을 줄입니다. 최저 매물가만 나열하지 않고 판매 속도와 가격 흐름을 함께 보여주어, 확인 순서를 정하는 데 필요한 맥락을 제공합니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">어떤 데이터를 사용하나요?</h2>
        <p>
          시세와 판매 기록은 <a href="https://universalis.app/" target="_blank" rel="noopener noreferrer">Universalis API</a>를 기반으로 합니다. 아이템 이름과 분류는 한국어 <a href="https://github.com/Ra-Workspace/ffxiv-datamining-ko" target="_blank" rel="noopener noreferrer">ffxiv-datamining 데이터</a>에서 생성합니다.
        </p>
        <div className="info-page__callout">
          <p>외부 데이터의 수집 시점, API 응답 상태, 게임 내 변동에 따라 표시 결과가 늦거나 달라질 수 있습니다.</p>
        </div>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">무엇을 약속하나요?</h2>
        <ul>
          <li>계산 기간과 기준을 화면 가까이에 공개합니다.</li>
          <li>현재 데이터와 이력 비교 데이터를 구분해 안내합니다.</li>
          <li>개인화 기능은 로그인 없이 브라우저 안에서만 제공합니다.</li>
          <li>게임 내 거래 판단 전 실제 장터를 다시 확인하도록 안내합니다.</li>
        </ul>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">독립 팬 프로젝트</h2>
        <p>
          FF14 장터탐지기는 SQUARE ENIX CO., LTD.의 공식 서비스가 아니며, 게임 내 자산의 권리는 각 권리자에게 있습니다. 프로젝트와 데이터 출처에 관한 자세한 기준은 <a href="https://github.com/ddthing/ff14market" target="_blank" rel="noopener noreferrer">GitHub 저장소</a>에서 확인할 수 있습니다.
        </p>
      </section>
    </InfoPageLayout>
  </>
);
