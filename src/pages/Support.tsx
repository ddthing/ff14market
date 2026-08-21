import { ExternalLink } from 'lucide-react';
import { Seo } from '../components/seo/Seo';
import { InfoPageLayout } from '../components/layout/InfoPageLayout';

export const Support = () => (
  <>
    <Seo
      title="후원 | FF14 장터탐지기"
      description="FF14 장터탐지기의 운영과 데이터 유지에 도움을 주는 방법을 안내합니다."
      path="/support"
    />
    <InfoPageLayout
      eyebrow="프로젝트 후원"
      title="작은 마켓 터미널을 계속 운영하는 방법"
      description="서버 비용과 데이터 유지에 보탬이 될 수 있습니다. 후원은 선택 사항이며, 서비스 이용에 결제가 필요하지 않습니다."
    >
      <section className="info-page__section">
        <h2 className="info-page__section-title">후원하기</h2>
        <p>
          FF14 장터탐지기가 유용했다면 Ko-fi를 통해 프로젝트 운영을 응원할 수 있습니다. 후원 여부는 시세 데이터, 기능, 아이템 노출 순서에 영향을 주지 않습니다.
        </p>
        <a
          className="info-page__primary-link"
          href="https://ko-fi.com/reconeur"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Ko-fi에서 후원하기</span>
          <span className="sr-only"> (새 창에서 열림)</span>
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">후원금의 용도</h2>
        <ul>
          <li>Cloudflare Pages와 R2 운영 환경 유지</li>
          <li>장터 스냅샷과 아이템 카탈로그 갱신</li>
          <li>접근성, 성능, 모바일 사용성 개선</li>
        </ul>
      </section>

      <section className="info-page__section">
        <h2 className="info-page__section-title">문의와 피드백</h2>
        <p>
          오류나 개선 의견은 <a href="https://github.com/ddthing/ff14market/issues" target="_blank" rel="noopener noreferrer">GitHub Issues<span className="sr-only"> (새 창에서 열림)</span></a>에 남겨주세요. 시세 오류를 제보할 때는 서버, 아이템명, 확인한 시각을 함께 적어주시면 확인하기 쉽습니다.
        </p>
      </section>
    </InfoPageLayout>
  </>
);
