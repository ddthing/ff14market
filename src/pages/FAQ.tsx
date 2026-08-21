import { Seo } from '../components/seo/Seo';
import { InfoPageLayout } from '../components/layout/InfoPageLayout';

const FAQ_ITEMS = [
  {
    question: '완전히 실시간인 시세인가요?',
    answer: '아닙니다. Universalis API에서 수집된 최신 스냅샷을 사용하며, 서버 수집 주기와 외부 API 상태에 따라 실제 장터와 차이가 생길 수 있습니다.',
  },
  {
    question: '거래량 급증은 어떻게 계산하나요?',
    answer: '최근 7일 판매 수량에서 직전 7일 판매 수량을 뺀 값을 직전 7일 판매 수량으로 나눕니다. 두 기간에 판매 이력이 모두 있는 품목만 계산합니다.',
  },
  {
    question: '가격 하락 신호의 평균은 단순 평균인가요?',
    answer: '판매 수량을 반영한 가중 평균입니다. 최근 7일과 직전 7일의 판매 기록을 각각 수량 기준으로 계산해 비교합니다.',
  },
  {
    question: '최저 매물가는 NQ와 HQ 중 무엇을 보여주나요?',
    answer: '전체·NQ·HQ 중 확인 가능한 유효한 가격을 비교해 실제 구매 가능한 최저 매물가를 사용합니다.',
  },
  {
    question: '관심 아이템 정보가 서버에 저장되나요?',
    answer: '아닙니다. 관심 아이템, 최근 본 아이템, 선택한 서버는 현재 브라우저의 로컬 저장소에만 보관됩니다. 회원가입도 필요하지 않습니다.',
  },
  {
    question: '새 아이템은 언제 검색할 수 있나요?',
    answer: '아이템 카탈로그는 한국어 ffxiv-datamining 데이터에서 자동 생성됩니다. 카탈로그 갱신과 Pages 배포가 끝난 뒤 다음 시세 스냅샷부터 새 아이템이 반영됩니다.',
  },
  {
    question: '공식 서비스인가요?',
    answer: '아닙니다. FF14 장터탐지기는 SQUARE ENIX와 제휴하지 않은 독립 팬 프로젝트이며, 시세 데이터는 Universalis API를 사용합니다.',
  },
];

export const FAQ = () => (
  <>
    <Seo
      title="자주 묻는 질문 | FF14 장터탐지기"
      description="FF14 장터탐지기의 실시간성, 거래량 계산식, 가격 신호, 개인정보와 아이템 갱신에 관한 질문과 답변입니다."
      path="/faq"
      structuredData={{
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer,
          },
        })),
      }}
    />
    <InfoPageLayout
      eyebrow="도움말"
      title="자주 묻는 질문"
      description="시세 기준과 서비스 이용 방식에 대해 자주 확인하는 내용을 모았습니다."
    >
      <section className="info-page__section">
        <div className="info-page__faq">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </InfoPageLayout>
  </>
);
