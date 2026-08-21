# FF14 장터탐지기

> 장터를 열고 서버를 바꿔가며 확인하는 시간을 줄이고, 지금 확인할 가치가 있는 아이템부터 보여주는 파이널판타지14 한국 데이터센터 시세 도구입니다.

[서비스 바로가기](https://ff14market.pages.dev/) · [오늘의 장터 신호](https://ff14market.pages.dev/hot-issues)

FF14 장터탐지기는 단순히 최저가 하나를 나열하지 않습니다. 최근 수집된 매물가, 판매 속도, 판매 가격의 흐름을 함께 보여주어 제작·채집·전투 준비 전에 시장을 빠르게 훑을 수 있도록 돕습니다.

## 이런 순간에 사용하세요

- 제작 재료나 소모품을 사기 전에 어느 아이템부터 확인할지 정하고 싶을 때
- 여러 한국 서버의 최저가를 비교하고 구매 서버를 고르고 싶을 때
- 최근 판매량이 늘어난 품목이나 가격 하락 신호를 빠르게 발견하고 싶을 때
- 자주 확인하는 아이템을 저장해 다음 방문에서 바로 보고 싶을 때

## 핵심 기능

| 기능 | 사용자가 얻는 것 |
| --- | --- |
| 오늘의 장터 신호 | 거래량 급증, 가격 하락 신호, 최저 매물가 TOP을 같은 화면에서 비교 |
| 어디서나 아이템 검색 | 헤더 검색 버튼, `Ctrl/Cmd + K`, 인기 아이템 화면의 검색 진입점으로 필요한 품목을 빠르게 탐색 |
| 아이템 상세 | 한국 데이터센터 최저 매물가, 서버별 최저가, 최근 판매 속도, 가격 흐름 확인 |
| 관심 아이템 | 로그인 없이 브라우저에 아이템을 저장하고 홈에서 바로 확인 |
| 최근 본 아이템 | 직전에 살펴본 품목으로 빠르게 돌아가기 |
| 서버 선택 | 초코보, 모그리, 카벙클, 톤베리, 펜리르 지원 |
| 모바일·다크 모드 | 모바일 장터 확인과 라이트/다크 테마 지원 |
| 접근성 중심 UI | 본문 바로가기, 키보드 탐색, 검색 모달 포커스 관리, 축소 모션, 의미 있는 제목·레이블 제공 |
| 서비스 안내 | 가이드, FAQ, 소개, 이용약관, 개인정보처리방침, 후원 페이지 제공 |

## 장터 신호를 읽는 방법

### 거래량 급증

최근 7일 판매 수량과 직전 7일 판매 수량을 비교합니다.

`(최근 7일 판매 수량 - 직전 7일 판매 수량) ÷ 직전 7일 판매 수량`

두 기간에 판매 이력이 모두 있는 품목만 계산하며, 증가율이 높더라도 절대 판매 수량과 현재 매물가를 함께 확인하는 것이 좋습니다.

### 가격 하락 신호

최근 7일과 직전 7일의 판매 기록을 수량 가중 평균으로 계산해 비교합니다. 음수일수록 최근 판매 가격이 낮아진 폭이 큽니다.

`(최근 7일 가중 평균 판매가 - 직전 7일 가중 평균 판매가) ÷ 직전 7일 가중 평균 판매가`

### 최저 매물가 TOP

현재 등록된 매물의 최저 가격을 기준으로 정렬합니다. 전체·NQ·HQ 가격 중 유효한 값을 비교해 실제 확인 가능한 최저 매물가를 사용합니다.

### 이력 스냅샷을 기다리는 동안

7일 비교 스냅샷이 아직 준비되지 않은 경우 화면을 비워두지 않고 현재 판매 속도 또는 현재 매물가와 최근 판매가의 차이를 먼저 보여줍니다. 이 값은 7일 비교 결과가 아니며, 스냅샷이 준비되면 정식 순위로 갱신됩니다.

## 데이터 최신성 안내

이 서비스는 게임 내 장터를 직접 스트리밍하는 완벽한 실시간 호가 서비스가 아닙니다. 표시 가격과 판매 지표는 [Universalis](https://universalis.app/) API를 기반으로 수집한 최신 스냅샷입니다.

- 서버별 현재 시세 스냅샷은 Worker가 5분 주기로 갱신하도록 구성되어 있습니다.
- 스냅샷이 오래된 경우 화면에 이전 수집 데이터임을 표시합니다.
- 아이템 상세의 가격 흐름은 선택한 시점에 별도로 조회하며 잠시 캐시됩니다. upstream이 실패하거나 2.5초 이상 지연될 때는 최대 15분 이내의 마지막 정상 수집 데이터를 `STALE`로 표시해 보여줄 수 있습니다.
- 실제 구매·판매 직전에는 게임 내 장터에서 최종 가격과 매물 상태를 확인하세요.

따라서 장터 신호는 수익을 보장하는 추천이나 투자 자문이 아니라, 확인 순서를 정하는 탐색 도구입니다.

## 새 아이템은 어떻게 반영되나요?

아이템 카탈로그는 [한국어 ffxiv-datamining 데이터](https://github.com/Ra-Workspace/ffxiv-datamining-ko)의 `Item.csv`에서 생성합니다.

1. GitHub Actions가 매일 03:17(KST)에 아이템 데이터를 갱신합니다.
2. 마켓 검색 가능 여부와 추천 목록의 참조 무결성을 검증합니다.
3. 변경된 `items.json`, `masterItems.json`, `searchItems.json`을 자동 커밋·푸시합니다.
4. `main`에 변경이 push되면 Git 연결형 Cloudflare Pages가 Production을 자동 배포합니다.
5. Worker는 매 5분 실행 때 최신 아이템 ID 목록을 다시 읽고 다음 시세 스냅샷에 반영합니다.

즉, 새 아이템은 **카탈로그 갱신 → `main` push → Pages Production 배포 → 다음 Worker 스냅샷** 순서로 노출됩니다. 아이템 ID 목록을 읽지 못하는 경우에는 Worker가 내장한 이전 목록으로 안전하게 폴백합니다.

로컬에서 데이터 파이프라인을 확인할 수 있습니다.

```bash
npm run data:update:dry-run
npm run data:update
npm run data:validate
```

## 오픈소스·데이터·권리

이 프로젝트는 여러 오픈소스 라이브러리와 외부 데이터·이미지 서비스를 조합합니다. 직접 사용하는 의존성의 출처와 라이선스는 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)에 정리했습니다. 전이 의존성의 버전과 라이선스 메타데이터는 `package-lock.json`을 기준으로 확인합니다.

- 시세 데이터: [Universalis API](https://universalis.app/) 및 [Universalis 저장소](https://github.com/Universalis-FFXIV/Universalis)
- 한국어 아이템 카탈로그: [ffxiv-datamining-ko](https://github.com/Ra-Workspace/ffxiv-datamining-ko)의 `Item.csv`
- 아이템 아이콘: [XIVAPI](https://v2.xivapi.com/)의 아이콘 자산 엔드포인트
- UI 방향 참고: [shadcn/ui](https://ui.shadcn.com/)와 저장소의 [DESIGN.md](DESIGN.md)

현재 제품 UI 아이콘은 `lucide-react`를 사용합니다. `components.json`의 Remix Icon 설정은 디자인 목표를 나타내며, Remix Icon 패키지가 현재 번들에 포함되어 있다는 뜻은 아닙니다. 게임 데이터·아이콘·상표의 권리는 각 원저작권자에게 있으며, 이 저장소의 라이선스가 그 권리를 대신 부여하지 않습니다.

이 저장소 자체에는 아직 별도의 `LICENSE` 파일이 없습니다. 프로젝트 코드의 재사용 조건을 명확히 하려면 별도 프로젝트 라이선스를 선택해 추가해야 합니다.

## 개인정보와 신뢰 기준

- 별도 회원가입과 로그인 없이 사용할 수 있습니다.
- 관심 아이템, 최근 본 아이템, 선택한 서버는 브라우저 로컬 저장소에 보관합니다.
- 개인화된 관심 아이템 페이지는 검색 대상에서 제외하도록 `noindex`를 적용합니다.
- 이용약관과 개인정보처리방침을 서비스 안에서 제공합니다.
- FF14 장터탐지기는 스퀘어 에닉스의 공식 서비스가 아닌 독립 커뮤니티 프로젝트입니다.

## 광고·SEO 운영

Google AdSense 검토를 위한 `ads.txt` 레코드는 [public/ads.txt](public/ads.txt)와 [운영 ads.txt](https://ff14market.pages.dev/ads.txt)에 포함되어 있습니다.

```text
google.com, pub-2169729065542563, DIRECT, f08c47fec0942fa0
```

현재 광고 스크립트와 광고 슬롯은 설치하지 않은 상태입니다. 광고를 활성화할 때는 실제 사용되는 파트너, 쿠키, 동의 절차를 개인정보처리방침에 함께 반영해야 합니다.

빌드 시 운영 주소를 기준으로 `robots.txt`와 `sitemap.xml`을 생성합니다. 커스텀 도메인을 사용할 때는 `VITE_SITE_URL` 또는 `SITE_URL`을 지정하세요.

```bash
VITE_SITE_URL=https://ff14market.pages.dev npm run build
```

## 개발 시작하기

### 요구 환경

- Node.js 22 이상 권장
- npm
- 시세 API를 호출할 수 있는 네트워크

```bash
git clone https://github.com/ddthing/ff14market.git
cd ff14market
npm ci
cp .env.example .env
npm run dev
```

`.env`를 만들지 않아도 기본 운영 주소가 사용됩니다. 로컬 개발 서버는 Vite와 개발용 API 플러그인을 함께 실행해 Universalis fallback 경로를 확인할 수 있습니다.

### 자주 쓰는 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | Vite 개발 서버와 개발용 API 실행 |
| `npm run pages:dev` | 빌드 후 Cloudflare Pages 로컬 환경 확인 |
| `npm run lint` | ESLint 검사 |
| `npm test` | 데이터 파이프라인·시세 계산·검색·순위 테스트 |
| `npm run build` | SEO 자산 생성과 TypeScript/Vite 프로덕션 빌드 |
| `npm run preview` | 생성된 `dist` 결과 미리보기 |
| `npm run data:update:dry-run` | 아이템 갱신 결과를 파일에 쓰지 않고 확인 |
| `npm run data:update` | 아이템 카탈로그 갱신 |
| `npm run data:validate` | 생성 데이터의 참조·검색 무결성 검증 |

Cloudflare Pages Function까지 확인할 때는 `npm run pages:dev`를 사용하세요. `npm run dev`는 실제 Pages Function이나 R2 바인딩이 아니라 개발용 fallback을 사용합니다.

## 배포 구성

현재 배포 대상은 Cloudflare Pages이며, 시세 스냅샷과 상세 장애 fallback은 Cloudflare R2, 주기 갱신은 Cron Worker를 사용합니다.

최초 구성 또는 운영 환경 재현 시 필요한 순서입니다.

```bash
# 최초 1회: R2 버킷 생성
npx wrangler r2 bucket create ff14market-market-snapshots

# Pages 정적 자산 빌드 및 배포
npm run build
npx wrangler pages deploy dist --project-name ff14market --branch main

# 5분 주기 시세 스냅샷 Worker 배포
npm run market-sync:deploy
```

`wrangler.toml`과 `wrangler.market-sync.toml`의 `MARKET_SNAPSHOTS` 바인딩은 같은 R2 버킷을 가리켜야 합니다. Git 연결형 Pages를 사용할 때도 Pages 프로젝트에 R2 바인딩을 추가해야 합니다.

`--branch main`을 생략하면 현재 feature 브랜치가 Preview로 배포될 수 있습니다. 기능 브랜치 검증은 해당 브랜치명을 `--branch`에 지정하고, 운영 반영은 반드시 `main`으로 배포하세요.

## 구조

```text
src/                  React 화면, 상태 저장소, 시세 계산·검색 유틸리티
functions/             같은 도메인에서 제공하는 Pages API
workers/               5분 주기 시장 스냅샷 Worker
scripts/               아이템 데이터·SEO 생성 및 검증 파이프라인
public/                ads.txt, robots.txt, sitemap.xml, PWA 아이콘
.github/workflows/     아이템 카탈로그 자동 갱신
```

브라우저는 Universalis API를 직접 호출하지 않고 같은 도메인의 Pages API를 사용합니다. Pages Function이 요청을 묶고 재시도·캐시·R2 fallback을 관리하므로, 화면 코드와 외부 데이터 제공자를 분리할 수 있습니다. 상세 fallback 응답에는 `X-Market-Cache: STALE`과 화면용 `marketMeta`가 함께 포함되어 오래된 데이터를 최신값처럼 오인하지 않게 합니다.

## 프로젝트의 기준

이 저장소는 다음을 중요하게 생각합니다.

- 최신성보다 최신성의 한계를 정확히 설명하기
- 하나의 가격보다 비교 가능한 맥락 제공하기
- 모바일에서 아이템 이름과 핵심 지표를 먼저 보여주기
- 새 데이터가 들어와도 검색·추천·시세 수집 목록이 어긋나지 않게 검증하기
- 기능을 늘리기 전에 데이터 출처와 계산 기준을 공개하기

게임 내 경제 활동에 유용한 탐색을 돕되, 실제 거래 판단은 사용자가 최종 데이터와 상황을 확인할 수 있도록 설계합니다.
