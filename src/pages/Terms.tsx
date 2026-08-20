import { Seo } from '../components/seo/Seo';

export const Terms = () => {
  return (
    <>
      <Seo
        title="이용약관 | FF14 장터탐지기"
        description="FF14 장터탐지기의 서비스 목적, 데이터 출처, 이용 시 책임과 권리를 안내합니다."
        path="/terms"
      />
      <div className="max-w-3xl mx-auto py-12 px-2 sm:px-4 animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">이용약관</h1>
      <p className="text-gray-500 dark:text-[#9ea4aa] font-medium mb-12">마지막 업데이트: 2026년 5월 23일</p>
      
      <div className="space-y-12 text-[16px] sm:text-[17px] text-gray-700 dark:text-gray-300 leading-[1.7] font-medium">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">제1조 (서비스 목적)</h2>
          <p>
            FF14 장터탐지기(이하 '본 서비스')는 글로벌 MMORPG 파이널판타지14의 게임 내 장터 데이터를 시각화하여 유저에게 편리하게 제공하는 비영리 팬 서비스입니다. 본 서비스는 플레이어들이 시세를 쉽게 파악하고 합리적인 거래를 할 수 있도록 돕는 것을 유일한 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">제2조 (데이터 출처 및 정확성)</h2>
          <p>
            본 서비스가 제공하는 모든 시세 정보와 거래량 데이터는 외부 서비스인 <strong>Universalis API</strong>를 실시간으로 연동하여 제공받습니다. 따라서 실제 게임 내 데이터가 갱신되는 주기와 API 응답 속도에 따라 불가피한 시간 차이(Time gap)가 발생할 수 있습니다. 제공되는 정보는 참고용으로만 활용해 주시길 권장합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">제3조 (책임 제한)</h2>
          <p className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
            본 서비스는 유저에게 시장 정보를 있는 그대로 제공할 뿐, 어떠한 투자나 시세 차익(장사)을 권유하지 않습니다. 제공된 정보를 바탕으로 게임 내에서 발생한 거래의 결과(길 손실 및 이익)에 대한 모든 책임은 유저 본인에게 있으며, 본 서비스의 운영자는 이에 대해 어떠한 법적, 도의적 책임도 지지 않습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">제4조 (지적 재산권)</h2>
          <p>
            본 서비스 내에서 시각적 이해를 돕기 위해 사용된 모든 아이템 아이콘, 게임 내 명칭, 관련 데이터 및 이미지의 저작권과 지적 재산권은 <strong>SQUARE ENIX CO., LTD.</strong>에 귀속됩니다. 본 서비스의 광고 또는 후원 노출은 해당 권리자의 보증이나 제휴를 의미하지 않으며, 게임 자산 자체를 별도 상품으로 판매하지 않습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">제5조 (서비스의 변경 및 중단)</h2>
          <p>
            본 서비스는 Universalis API의 서버 상태, 네트워크 문제, 또는 기타 기술적인 이유로 사전 예고 없이 서비스가 변경되거나 일시적으로 중단될 수 있습니다. 유저 여러분의 너른 양해를 부탁드립니다.
          </p>
        </section>
      </div>
      </div>
    </>
  );
};
