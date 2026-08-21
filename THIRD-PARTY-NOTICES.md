# Third-party notices

이 문서는 `package.json`에 직접 선언된 주요 오픈소스 의존성, 외부 데이터·API·이미지 출처를 기록합니다. 정확한 버전과 전이 의존성은 `package-lock.json`을 기준으로 확인하세요.

## Runtime dependencies

| Package | 용도 | 라이선스 | 출처 |
| --- | --- | --- | --- |
| `react`, `react-dom` | UI 렌더링 | MIT | [facebook/react](https://github.com/facebook/react) |
| `react-router-dom` | 클라이언트 라우팅 | MIT | [remix-run/react-router](https://github.com/remix-run/react-router) |
| `@tanstack/react-query` | 서버 상태·캐시 | MIT | [TanStack/query](https://github.com/TanStack/query) |
| `zustand` | 브라우저 상태 저장 | MIT | [pmndrs/zustand](https://github.com/pmndrs/zustand) |
| `fuse.js` | 한국어 아이템 퍼지 검색 | Apache-2.0 | [krisk/Fuse](https://github.com/krisk/Fuse) |
| `lucide-react` | 제품 UI 아이콘 | ISC | [lucide-icons/lucide](https://github.com/lucide-icons/lucide) |

## Build and quality tools

| Package | 용도 | 라이선스 | 출처 |
| --- | --- | --- | --- |
| `vite`, `@vitejs/plugin-react` | 개발 서버·프로덕션 번들 | MIT | [vitejs/vite](https://github.com/vitejs/vite), [vite-plugin-react](https://github.com/vitejs/vite-plugin-react) |
| `tailwindcss`, `@tailwindcss/vite` | CSS·디자인 토큰 빌드 | MIT | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| `vite-plugin-pwa` | PWA·서비스 워커 생성 | MIT | [vite-pwa/vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) |
| `typescript` | 타입 검사·컴파일 | Apache-2.0 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| `eslint`, `@eslint/js` | 정적 분석 | MIT | [eslint/eslint](https://github.com/eslint/eslint) |
| `typescript-eslint` | TypeScript ESLint 통합 | MIT | [typescript-eslint/typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) |
| `eslint-plugin-react-hooks` | React Hook 규칙 | MIT | [facebook/react](https://github.com/facebook/react) |
| `eslint-plugin-react-refresh` | React Fast Refresh 규칙 | MIT | [ArnaudBarre/eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) |
| `postcss`, `autoprefixer` | CSS 후처리·브라우저 접두사 | MIT | [postcss/postcss](https://github.com/postcss/postcss), [postcss/autoprefixer](https://github.com/postcss/autoprefixer) |
| `@types/node`, `@types/react`, `@types/react-dom` | TypeScript 타입 정의 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `globals` | ESLint 환경 전역 정의 | MIT | [sindresorhus/globals](https://github.com/sindresorhus/globals) |

## Data, API, and external assets

- [Universalis](https://github.com/Universalis-FFXIV/Universalis)는 장터 시세와 판매 이력 API의 출처입니다. 저장소는 MIT 라이선스를 표시하지만, 게임 데이터와 상표 권리까지 프로젝트에 이전하는 의미는 아닙니다.
- [ffxiv-datamining-ko](https://github.com/Ra-Workspace/ffxiv-datamining-ko)는 한국어 아이템 이름·분류 카탈로그 생성에 사용합니다. 확인한 저장소 페이지에는 명시적인 라이선스가 표시되지 않으므로, 생성 데이터의 재배포 범위는 원저작자 조건을 확인해야 합니다.
- [XIVAPI](https://v2.xivapi.com/) 및 [xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining)은 아이템 아이콘·게임 데이터 자산의 외부 출처입니다. 해당 자산의 사용·재배포 권리는 SQUARE ENIX 및 각 원저작권자 조건을 따릅니다.
- [shadcn/ui](https://ui.shadcn.com/)는 UI 구성 방향과 디자인 참고로 사용했으며, 현재 `package.json`에 런타임 의존성으로 설치되어 있지는 않습니다.

## Project license

이 저장소 자체에는 현재 별도의 `LICENSE` 파일이 없습니다. 위 의존성의 라이선스는 각 의존성에만 적용되며, 이 프로젝트의 코드·문서·브랜드 자산·게임 데이터에 대한 재사용 권한을 자동으로 부여하지 않습니다.

FINAL FANTASY XIV 및 관련 게임 자산의 권리는 SQUARE ENIX CO., LTD. 및 각 권리자에게 있습니다. FF14 장터탐지기는 SQUARE ENIX의 공식 서비스·제휴 서비스가 아닌 독립 팬 프로젝트입니다.
