# FF14Market Project Guidelines

## API 통신 (API Communication)
- **Universalis API**를 주력으로 사용합니다.
- 트래픽 차단(Rate Limit)을 막기 위해 반드시 **React Query**를 도입하여 데이터를 캐싱(Caching)해야 합니다.

## 상태 관리 및 UI (State Management & UI)
- **모바일 퍼스트(Mobile-first)**의 직관적인 대시보드 형태를 지향합니다.
- 모든 컴포넌트는 **함수형 컴포넌트(Functional Component)**로 작성합니다.
- **엄격한 TypeScript 인터페이스**를 적용하여 데이터의 무결성을 유지합니다.
