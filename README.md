# Claude Cal - 한국식 전통 달력

React + TypeScript + Vite로 만든 한국 전통 달력 웹 앱입니다.

## 🌐 라이브 데모

👉 **[https://thatseeyou.github.io/claude-cal/](https://thatseeyou.github.io/claude-cal/)**

## 특징

- 🗓️ 은행에서 나눠주는 전통적인 달력 디자인
- 🌙 음력 날짜 표시 (1일, 15일, 말일)
- 🎌 한국 공휴일 표시
- 📅 상단 미니 달력으로 월 간 이동
- 🎨 일요일/공휴일 빨간색, 토요일 파란색 표시
- ⭕ 오늘 날짜 하이라이트
- 📱 반응형 디자인

## 기술 스택

- React 19
- TypeScript
- Vite
- pnpm (패키지 매니저)
- korean-lunar-calendar (정확한 한국 음력 계산)
- date-holidays (공휴일 데이터)
- Noto Sans KR (한글 최적화 폰트)

## 개발 환경 설정

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 린트
pnpm lint
```

## 배포

GitHub Actions를 통해 자동으로 GitHub Pages에 배포됩니다.

배포된 사이트: [https://thatseeyou.github.io/claude-cal/](https://thatseeyou.github.io/claude-cal/)

## 스크린샷

![Claude Cal 스크린샷](https://via.placeholder.com/800x600/667eea/ffffff?text=Claude+Cal+%ED%95%9C%EA%B5%AD+%EC%A0%84%ED%86%B5+%EB%8B%AC%EB%A0%A5)

## 라이선스

MIT
