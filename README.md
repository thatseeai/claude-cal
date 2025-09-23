# Claude Cal - 한국식 전통 달력

React + TypeScript + Vite로 만든 한국 전통 달력 웹 앱입니다.

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
- lunar-calendar (음력 계산)
- date-holidays (공휴일 데이터)

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

## 라이선스

MIT
