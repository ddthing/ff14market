export const Privacy = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-2 sm:px-4 animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">개인정보처리방침</h1>
      <p className="text-gray-500 dark:text-[#9ea4aa] font-medium mb-12">마지막 업데이트: 2026년 5월 23일</p>
      
      <div className="space-y-12 text-[16px] sm:text-[17px] text-gray-700 dark:text-gray-300 leading-[1.7] font-medium">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">데이터 최소화의 원칙</h2>
          <p>
            FF14 장터탐지기(이하 '본 서비스')는 유저의 개인정보 보호를 최우선으로 생각합니다. 
            <br/><br/>
            <strong>본 서비스는 유저의 계정 정보, 연락처, 기기 식별자 등 어떠한 민감한 개인정보도 서버에 전송하거나 저장하지 않습니다.</strong> 
            회원가입 기능 자체가 존재하지 않으며, 안심하고 완전한 익명으로 서비스를 이용하실 수 있습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">로컬 스토리지(Local Storage) 활용</h2>
          <p className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
            유저가 서비스 내에서 사용하는 편의 기능(예: '내 관심템' 즐겨찾기, 선택된 서버 정보)은 전적으로 <strong>유저 본인의 브라우저 로컬 스토리지</strong>에만 안전하게 저장됩니다.<br/><br/>
            해당 데이터는 브라우저를 닫아도 기기에 유지되지만, 본 서비스의 외부 데이터베이스나 서버로는 절대 전송되지 않습니다.
            브라우저 캐시를 지우거나 시크릿 모드를 사용할 경우 해당 데이터는 언제든 완전히 초기화됩니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">쿠키(Cookies)의 사용</h2>
          <p>
            본 서비스는 웹사이트의 정상적인 구동과 사용자 경험(UX) 최적화, 그리고 페이지 렌더링 성능 향상을 목적으로만 브라우저 필수 쿠키를 사용할 수 있습니다.
            수집되는 데이터는 통계 및 시스템 안정성을 위해서만 활용되며, 이를 통해 특정 개인을 식별하거나 추적하는 용도로는 절대 사용되지 않습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">제3자 제공 및 위탁</h2>
          <p>
            본 서비스는 애초에 유저의 개인정보를 수집하지 않으므로, 이를 제3자에게 제공하거나 위탁할 수 있는 정보가 존재하지 않습니다. 
            단, 실시간 시세 데이터 조회를 위해 Universalis API에 기기 통신을 요청할 때 유저의 네트워크 접속 IP가 해당 API 운영 서버에 일시적으로 기록될 수는 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
};
