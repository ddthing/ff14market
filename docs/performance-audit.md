# 성능·유지보수 감사 기록

작성 기준일: 2026-08-21  
대상: `ff14market` 웹앱, Cloudflare Pages Functions, 시장 스냅샷 Worker

## 결론

현재 Hot 목록의 병목은 브라우저 렌더링이 아니라 아이템 상세 진입 경로다. 운영 배포본에서 같은 화면을 세 번 새로 고친 결과 Hot 목록의 화면 준비 시간은 약 `0.37–0.40초`였다. 반면 목록에서 상세로 이동하는 경로는 약 `2.7–2.9초`였고, 캐시가 비어 있는 첫 상세 진입은 약 `5.3초`였다.

최신 배포본의 API만 따로 측정하면 `/api/item/33939`는 약 `0.98초`, `7.9KB`였고, 변경 전 배포본은 약 `1.12초`, `51.1KB`였다. 응답 축소는 전송량을 약 85% 줄였지만 upstream 처리 시간이 남아 있으므로, 상세 route preload를 함께 적용했다.

따라서 순위 계산을 무리하게 재작성하지 않고 다음 경계를 먼저 정리했다.

1. 상세 링크가 가리키는 추천 아이템은 이미 클라이언트에 포함된 메타데이터를 재사용한다.
2. 상세 API는 화면이 읽는 필드와 차트에 필요한 최근 7개 이력만 요청한다.
3. 서버별 최저가는 목록을 서버마다 다시 순회하지 않고 한 번의 누적으로 계산한다.
4. 데스크톱에서 목록을 빠르게 훑을 때 상세 API 프리패치가 요청 폭주로 이어지지 않도록 320ms 체류와 캐시 상태를 확인한다.
5. 목록에서 상세 링크에 포인터가 들어오면 상세 route chunk를 먼저 로드해 클릭 순간의 lazy-route 지연을 줄인다.

## 데이터 흐름과 책임 경계

```text
아이템 데이터 파이프라인
  ├─ items.json          원천 검증용 전체 카탈로그
  ├─ masterItems.json    화면 추천·시장 스냅샷 대상
  └─ searchItems.json    서버 검색용 압축 카탈로그

시장 스냅샷
  Worker → Universalis current/history → R2
  Pages Function → R2 우선, 없으면 current preview + background history
  React Query → useItemData → Hot/Favorites/Dashboard

상세 조회
  ItemListItem/GlobalSearch → Pages Function → Universalis Korea/{itemId}
  ItemDetail/ItemModal → 공통 listings 계산 규칙 → UI
```

각 계층이 맡아야 할 일은 다음과 같다.

- Pages Function은 외부 API 호출, 재시도, 필드 축소, 캐시 헤더를 책임진다.
- React Query는 화면 간 캐시와 취소 신호를 책임진다.
- `useItemData`는 스냅샷을 화면용 `EnrichedItem`으로 정규화한다.
- `marketHistory.ts`와 `marketListings.ts`는 계산 규칙만 담당한다. 컴포넌트에서 가격 산식을 다시 만들지 않는다.
- 화면 컴포넌트는 정렬 기준과 표시 상태를 조합하되, 원천 데이터를 직접 변형하지 않는다.

## 병목 우선순위

### P1 — 아이템 상세 콜드 진입

기존에는 상세 페이지가 모든 아이템에 대해 `item-meta` 요청을 먼저 기다렸다. 추천 목록에 이미 존재하는 1,200여 개 아이템까지 검색 카탈로그 API를 다시 호출하는 구조였다.

현재는 `masterItems.json`을 ID 맵으로 사용하고, 목록에 없는 직접 URL만 `item-meta`를 호출한다. 이 변경은 요청 수를 줄이면서도 검색으로만 접근하는 전체 카탈로그 아이템의 fallback을 유지한다.

### P1 — 상세 응답 페이로드

기존 상세 Function은 Universalis의 기본 상세 응답을 그대로 요청했다. 현재 UI가 실제로 사용하는 것은 요약 가격, 서버명·가격, 최근 이력의 가격·시각뿐이다.

`fetchItemDetail`은 이제 필요한 필드만 지정하고 차트에 필요한 최근 7개 이력만 요청한다. 서버별 최저가의 정확성을 유지하기 위해 listings 자체를 임의의 개수로 자르지는 않았다. 즉, 정확도를 희생한 조기 최적화가 아니다.

최신 배포의 응답은 가격·판매속도·서버별 최저가·차트가 모두 정상 표시되는 것을 확인했다. 전송량 감소가 실제 upstream 지연을 완전히 제거하지는 않으므로, 이 항목은 “페이로드 병목 해결”로 기록하고 “upstream 데이터베이스 지연”은 별도 관찰 대상으로 남긴다.

### P1 — 데스크톱 상세 프리패치 폭주

목록의 각 행에 마우스를 빠르게 통과하면 상세 요청이 여러 개 예약될 수 있었다. 현재는 320ms 이상 머문 경우에만 프리패치하고, 이미 fresh하거나 요청 중인 Query는 건너뛴다. 프리패치 실패는 화면 오류로 승격하지 않으며 실제 이동 요청이 오류를 책임진다.

### P1 — 상세 route chunk의 첫 로드

Hot 화면을 이미 캐시한 뒤 상세를 반복해서 열면 약 `0.38초`였지만, 새 경로에서 처음 이동할 때는 약 `3초`가 걸렸다. 상세 컴포넌트 자체가 lazy route이므로, API와 무관하게 첫 JS chunk 로드가 사용자 동작과 겹칠 수 있다.

`src/routes/itemDetail.ts`에 공통 lazy loader를 두고 목록의 포인터 진입·키보드 focus에서 한 번만 import하도록 했다. 브라우저 모듈 캐시가 중복 import를 합치므로 목록의 각 행이 별도 chunk를 만들지 않는다.

변경 전 배포본과 최신 배포본을 새 탭에서 같은 방식으로 측정했을 때 목록→상세 이동은 약 `3.03초`에서 `1.02초`로 줄었다. 측정 도구의 locator 자동 대기는 제외하고 실제 포인터 클릭 기준으로 비교했다.

### P2 — 서버 스냅샷 생성 비용

시장 스냅샷은 current 요약과 최근·이전 7일 history를 분리한다. history는 두 기간을 순차 조회하고 각 기간 내부 동시성을 2로 제한한다. 이는 Universalis가 IP별 동시 연결을 제한하는 구조에서 안정성을 우선한 선택이다.

이 영역은 아직 기능 변경 대상이 아니다. Worker 실행 시간, 실패한 chunk 수, 서버별 `historyReady` 비율을 운영 로그로 수집한 뒤에만 동시성을 조정한다. `Promise.all`로 두 기간을 무조건 병렬화하면 upstream 제한과 재시도 폭주를 다시 만들 수 있다.

### P2 — 클라이언트 순위 계산

현재 추천 대상은 약 1,200개이며, Hot 탭의 filter/sort는 이 크기에서 측정된 초기 로딩 병목이 아니다. 먼저 데이터 규모가 커지거나 실제 프로파일러에서 CPU 시간이 확인될 때 top-K 힙 또는 서버 사전계산을 검토한다.

### 보류 — 원천 `items.json` 파일 크기

`items.json`은 약 2.1MB지만 현재 클라이언트 import 대상이 아니다. 데이터 갱신·검증 스크립트가 사용하는 원천 파일이므로 삭제하거나 임의로 분할하면 자동 업데이트 무결성이 깨질 수 있다. 실제 번들에 들어가는 `masterItems.json`과 검색 API의 `searchItems.json`을 별도로 관리하는 현재 구조를 유지한다.

## 유지보수 규칙

- 서버를 추가할 때는 `src/constants/market.ts`의 `MARKET_SERVERS`만 수정하고, 헤더·Hot·상세 UI에 별도 배열을 만들지 않는다.
- 서버별 최저가를 표시할 때는 `getServerMinPrices`와 `getAbsoluteMinPrice`를 사용한다.
- 상세 API 필드를 추가하거나 줄일 때는 `ITEM_DETAIL_FIELDS`와 `scripts/market-data.test.ts`를 함께 수정한다.
- 순위 계산의 의미를 바꾸는 변경은 `src/utils/marketHistory.test.ts`, `src/utils/marketRankings.test.ts`에 경계값을 먼저 추가한다.
- 외부 API 동시성을 올리기 전에 Worker 실행 시간과 429/5xx 비율을 확인한다.
- 성능 최적화는 “빠르게 보인다”와 “정확한 값이다”를 분리해서 검증한다. 서버별 최저가의 정확성을 위해 listings 전체의 가격 필드는 유지한다.

## 검증 기준

변경 전후에 최소한 아래 명령을 실행한다.

```bash
npm test
npm run lint
npm run data:validate
npm run build
```

운영 페이지에서 확인할 항목은 다음과 같다.

- Hot 목록: 데이터 표시 여부, 50행 스크롤, 탭 전환, 즐겨찾기 토글
- 상세: 추천 목록 아이템과 검색 결과 아이템 모두 이름·가격·차트·서버별 최저가 표시
- 네트워크: 목록을 마우스로 훑을 때 상세 요청이 무제한으로 늘지 않는지
- API: `X-Market-Source`, `X-Market-History-Ready`, 캐시 헤더가 유지되는지
- PWA: 새 배포 후 service worker가 이전 JS chunk를 계속 가리키지 않는지

## 다음 관찰 작업

다음 단계는 최적화를 더 넣는 것이 아니라 측정 가능성을 높이는 것이다.

1. Worker에 서버별 실행 시간, current/history chunk 실패 수, 429·5xx 횟수를 구조화 로그로 남긴다.
2. Pages Function에 상세 응답의 upstream duration과 payload byte를 내부 로그로 남긴다. 사용자 응답에는 민감한 정보를 노출하지 않는다.
3. 운영에서 cold start와 warm cache를 분리해 상세 페이지의 목표 시간을 다시 측정한다.
4. 실제 병목이 확인될 때만 history 계산을 서버 사전계산하거나 상세 API를 더 세분화한다.
