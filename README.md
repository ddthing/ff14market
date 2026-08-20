# FF14 마켓

파이널판타지14 한국 데이터센터의 장터 시세를 빠르게 확인하는 React 대시보드입니다. 아이템 카탈로그는 저장된 정적 데이터로 검색하고, 가격 정보는 Universalis API에서 React Query 캐시를 통해 가져옵니다.

## 아이템 데이터 갱신

아이템 원본은 [한국어 ffxiv-datamining 데이터](https://github.com/Ra-Workspace/ffxiv-datamining-ko)의 `Item.csv`에서 생성합니다. 생성 파이프라인은 마켓 검색이 가능한 아이템만 저장하고, 추천 아이템이 실제 아이템 카탈로그의 부분집합인지 쓰기 전에 검증합니다.

로컬에서 갱신하거나 검증하려면 다음 명령을 사용합니다.

```bash
npm run data:update:dry-run
npm run data:update
npm run data:validate
```

`.github/workflows/update-items.yml`이 매일 03:17(KST)에 실행되며, 수동 실행은 GitHub Actions의 `workflow_dispatch`로 가능합니다. 변경된 `src/data/items.json`, `src/data/masterItems.json`, `src/data/searchItems.json`을 자동 커밋·푸시하므로 새로 추가된 마켓 아이템도 다음 갱신부터 저장소의 검색 카탈로그에 반영됩니다. 저장소의 Actions가 활성화되어 있고 workflow의 `contents: write` 권한이 허용되어 있어야 합니다. 현재 저장소에는 별도 배포 workflow가 없으므로 운영 화면까지 자동 반영하려면 호스팅 서비스의 push 기반 자동 배포가 연결되어 있어야 합니다.

대형 아이템 카탈로그는 홈 화면 초기 번들에 포함하지 않고 검색 또는 상세 화면에서 지연 로드합니다. PWA service worker도 설치 시 전체 카탈로그를 미리 받지 않으며, 최초 사용 후 런타임 캐시에 저장합니다. `searchItems.json`은 아이템 ID·이름·숫자 아이콘 ID만 담은 compact payload이며, 아이콘 경로는 클라이언트에서 복원합니다.

## AdSense 및 SEO 배포 설정

[`public/ads.txt`](public/ads.txt)에는 [Google Ads.txt 가이드](https://support.google.com/adsense/answer/12171612?hl=ko)에서 안내한 게시자 레코드를 루트 경로에서 제공하도록 넣어 두었습니다.

```text
google.com, pub-2169729065542563, DIRECT, f08c47fec0942fa0
```

배포 후 실제 도메인에서 `https://실제도메인/ads.txt`가 위 한 줄을 그대로 반환하는지 확인한 다음 AdSense에서 사이트 검토를 요청하세요. Ads.txt 변경이 AdSense 화면에 반영되기까지 시간이 걸릴 수 있으므로, 파일이 먼저 공개되어 있어야 합니다. 광고 스크립트와 광고 슬롯은 아직 넣지 않았으며, 승인·동의 화면·정책 문구를 확인한 뒤 별도 작업으로 추가하는 것이 안전합니다.

SEO용 canonical, Open Graph URL, `robots.txt`의 Sitemap 주소와 `sitemap.xml`은 운영 주소 `https://ff14market.pages.dev`를 기본값으로 생성합니다. 커스텀 도메인을 연결하면 배포 환경에서 `VITE_SITE_URL` 또는 `SITE_URL`로 덮어쓸 수 있습니다. 검색 유입을 위한 sitemap에는 홈과 장터 신호 페이지만 포함하며, 이용약관·개인정보처리방침은 사용자와 AdSense 검토자가 접근할 수 있도록 유지하되 `noindex`와 Cloudflare Pages `X-Robots-Tag`로 검색 결과에서는 제외합니다. 개인화된 관심템 화면도 동일하게 처리하고 `robots.txt`로 차단하지 않아 Google이 `noindex`를 읽을 수 있게 합니다.

`public/_headers`는 Cloudflare Pages에서 `/favorites`, `/terms`, `/privacy`에 `X-Robots-Tag: noindex, follow`를 적용합니다. Google의 `noindex` 규칙은 크롤러가 URL에 접근할 수 있어야 유효하므로, 이 경로들을 `robots.txt`에서 Disallow하지 않습니다.

```bash
VITE_SITE_URL=https://ff14market.pages.dev npm run build
```

즐겨찾기처럼 브라우저별 개인화된 화면은 `noindex`로 표시하고, 홈·장터 신호·약관·개인정보 안내와 아이템 상세에는 페이지별 제목·설명·구조화 데이터를 적용합니다.

## 개발

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

---

다음은 Vite 기본 템플릿 참고 문서입니다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
