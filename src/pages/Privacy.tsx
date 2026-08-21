import { Seo } from '../components/seo/Seo';
import { InfoPageLayout } from '../components/layout/InfoPageLayout';

export const Privacy = () => (
  <>
    <Seo
      title="개인정보처리방침 | FF14 장터탐지기"
      description="FF14 장터탐지기의 로컬 저장소, 쿠키, 외부 API와 광고 서비스 관련 개인정보 처리 기준을 안내합니다."
      path="/privacy"
      noIndex
    />
    <InfoPageLayout
      eyebrow="개인정보 안내"
      title="개인정보처리방침"
      description="회원가입 없이 이용하는 서비스의 브라우저 저장소, 외부 API, 광고 관련 처리 기준을 안내합니다."
      updatedAt="2026년 8월 20일"
    >
      <section className="info-page__section">
        <h2 className="info-page__section-title">데이터 최소화의 원칙</h2>
        <p>
          FF14 장터탐지기(이하 '본 서비스')는 계정 정보, 연락처, 기기 식별자 등 민감한 개인정보를 회원가입이나 개인화 기능을 위해 수집하지 않습니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">브라우저 저장소의 활용</h2>
        <div className="info-page__callout">
          <p>
            관심 아이템, 최근 본 아이템, 선택한 서버와 테마 설정은 이용자 본인의 브라우저 로컬 저장소에만 보관됩니다. 해당 값은 본 서비스의 외부 데이터베이스로 전송되지 않으며, 브라우저 저장소를 삭제하면 초기화됩니다.
          </p>
        </div>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">쿠키와 유사 기술</h2>
        <p>
          현재 서비스는 정상적인 화면 동작과 설정 유지를 위해 브라우저 저장소를 사용합니다. 광고 또는 방문 통계 기능이 실제로 도입되는 경우에는 사용되는 쿠키·유사 기술과 처리 목적을 이 방침에 추가로 공개합니다.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">광고 서비스 안내</h2>
        <p>
          Google AdSense가 실제로 게재되는 경우 Google 및 제3자 광고 파트너가 광고 제공, 노출 측정, 보안을 위해 쿠키·웹 비콘·IP 주소·광고 식별자 또는 유사 기술을 사용할 수 있습니다. 개인 맞춤 광고는 <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google 광고 설정<span className="sr-only"> (새 창에서 열림)</span></a> 또는 <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds 선택 도구<span className="sr-only"> (새 창에서 열림)</span></a>에서 관리할 수 있습니다.
        </p>
        <p>
          현재 이 사이트에는 AdSense 광고 스크립트와 광고 슬롯이 설치되어 있지 않습니다. 광고를 활성화할 때 실제 파트너와 처리 목적을 다시 반영하고, 지역별로 필요한 동의 절차를 제공합니다. 자세한 내용은 <a href="https://policies.google.com/technologies/partner-sites?hl=ko" target="_blank" rel="noopener noreferrer">Google 파트너 사이트 정책<span className="sr-only"> (새 창에서 열림)</span></a>을 확인해 주세요.
        </p>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">제3자 제공 및 외부 API</h2>
        <p>
          본 서비스는 이용자의 개인정보를 별도로 수집하지 않으므로 이를 제3자에게 제공하거나 위탁하지 않습니다. 다만 시세 데이터를 조회하는 과정에서 이용자의 네트워크 접속 IP가 Universalis API 운영 서버에 일시적으로 기록될 수 있습니다.
        </p>
      </section>
    </InfoPageLayout>
  </>
);
