import { Seo } from '../components/seo/Seo';

export const Privacy = () => {
  return (
    <>
      <Seo
        title="개인정보처리방침 | FF14 장터탐지기"
        description="FF14 장터탐지기의 로컬 저장소, 쿠키, 외부 API와 광고 서비스 관련 개인정보 처리 기준을 안내합니다."
        path="/privacy"
      />
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
            본 서비스는 웹사이트의 정상적인 구동과 사용자 경험(UX) 최적화를 위해 브라우저 저장소 또는 필수 쿠키를 사용할 수 있습니다. 즐겨찾기와 선택 서버는 브라우저 로컬 스토리지에 저장됩니다.
            광고 또는 방문 통계 기능이 실제로 도입되는 경우에는 해당 기능에 필요한 쿠키·유사 기술과 처리 목적을 이 방침에 추가로 공개합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">광고 서비스 안내</h2>
          <p>
            Google AdSense 광고가 게재되는 경우 Google 및 광고 파트너는 광고 제공, 빈도 제한, 측정과 보안을 위해 쿠키·광고 식별자·접속 정보 등을 처리할 수 있습니다. 개인 맞춤 광고의 사용 여부는 Google의 광고 설정에서 관리할 수 있으며, 지역에 따라 광고 표시 전에 필요한 동의 절차를 제공합니다.
            자세한 내용은 <a className="text-blue-600 underline dark:text-blue-400" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">Google 파트너 사이트 정책</a>과 <a className="text-blue-600 underline dark:text-blue-400" href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google 광고 설정</a>을 확인해 주세요.
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
    </>
  );
};
