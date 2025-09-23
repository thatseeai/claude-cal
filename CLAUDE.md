# CLAUDE.md - 한국식 전통 달력 웹 앱 구현 가이드

이 문서는 Claude Code를 사용하여 한국 전통 달력 웹 앱을 완전히 구현하기 위한 가이드입니다.

## 🎯 프로젝트 개요

**목표**: React + TypeScript + Vite로 한국 전통 달력 웹 앱 구현
**특징**: 음력 표시, 공휴일 표시, 전통적인 디자인, GitHub Pages 자동 배포

## 🛠 기술 스택

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 7
- **Package Manager**: pnpm (Corepack 사용)
- **Styling**: CSS3 (Grid, Flexbox, Gradients)
- **Fonts**: Noto Sans KR (Google Fonts)
- **Libraries**:
  - `korean-lunar-calendar`: 정확한 한국 음력 계산
  - `date-holidays`: 공휴일 데이터
- **Deployment**: GitHub Pages + GitHub Actions

## 📋 구현 단계

### 1단계: 프로젝트 초기 설정

```bash
# Vite React TypeScript 템플릿으로 프로젝트 생성
npm create vite@latest . -- --template react-ts

# package.json에 패키지 매니저 설정 추가
"packageManager": "pnpm@9.0.0"

# .npmrc 파일 생성
echo "packageManager=pnpm@latest" > .npmrc

# 의존성 설치
pnpm install

# 필요한 라이브러리 설치
pnpm add korean-lunar-calendar date-holidays
```

### 2단계: 프로젝트 구조 설정

```
src/
├── components/
│   ├── Calendar.tsx      # 메인 달력 컴포넌트
│   └── Calendar.css      # 달력 스타일
├── types/
│   └── lunar-calendar.d.ts  # 타입 정의
├── App.tsx               # 메인 앱
├── App.css              # 앱 스타일
├── index.css            # 글로벌 스타일
└── main.tsx             # 진입점
```

### 3단계: HTML 기본 설정

`index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>한국 전통 달력 - Claude Cal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 4단계: 타입 정의

`src/types/lunar-calendar.d.ts`:
```typescript
declare module 'korean-lunar-calendar' {
  interface LunarDate {
    year: number
    month: number
    day: number
    intercalation: boolean
  }

  interface SolarDate {
    year: number
    month: number
    day: number
  }

  export default class KoreanLunarCalendar {
    constructor()
    setSolarDate(year: number, month: number, day: number): void
    setLunarDate(year: number, month: number, day: number, intercalation?: boolean): void
    getLunarCalendar(): LunarDate
    getSolarCalendar(): SolarDate
  }
}
```

### 5단계: 메인 앱 구조

`src/App.tsx`:
```typescript
import { useState } from 'react'
import Calendar from './components/Calendar'
import './App.css'

function App() {
  const [currentDate, setCurrentDate] = useState(new Date())

  return (
    <div className="app">
      <Calendar currentDate={currentDate} onDateChange={setCurrentDate} />
    </div>
  )
}

export default App
```

### 6단계: 달력 컴포넌트 핵심 로직

`src/components/Calendar.tsx`의 주요 함수들:

#### 음력 날짜 계산
```typescript
const getLunarDate = (year: number, month: number, day: number) => {
  try {
    const lunar = new KoreanLunarCalendar()
    lunar.setSolarDate(year, month, day)
    const lunarDate = lunar.getLunarCalendar()

    const lunarDay = lunarDate.day
    const lunarMonth = lunarDate.month

    // 음력 1일, 15일 표시
    if (lunarDay === 1 || lunarDay === 15) {
      return `음 ${lunarMonth}.${lunarDay}`
    }

    // 음력 말일 판단 - 다음날이 음력 1일인지 확인
    const nextDay = new Date(year, month - 1, day + 1)
    const nextLunar = new KoreanLunarCalendar()

    try {
      nextLunar.setSolarDate(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate())
      const nextLunarDate = nextLunar.getLunarCalendar()

      if (nextLunarDate.day === 1) {
        return `음 ${lunarMonth}.${lunarDay}`
      }
    } catch {
      // 다음날이 없는 경우 (월말) 처리
    }

    return ''
  } catch (error) {
    console.error('Lunar date calculation error:', error)
    return ''
  }
}
```

#### 공휴일 계산
```typescript
const getHoliday = (year: number, month: number, day: number) => {
  const holidayList = holidays.getHolidays(year)
  const targetDate = new Date(year, month - 1, day)

  for (const holiday of holidayList) {
    const holidayDate = new Date(holiday.date)
    if (holidayDate.toDateString() === targetDate.toDateString()) {
      return holiday.name
    }
  }
  return ''
}
```

### 7단계: 스타일링 (전통 달력 디자인)

#### 글로벌 스타일 (`src/index.css`)
```css
* {
  box-sizing: border-box;
}

:root {
  font-family: 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif;
  line-height: 1.6;
  font-weight: 400;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### 앱 레이아웃 (`src/App.css`)
```css
.app {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px 0;
  position: relative;
}

.app::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
```

#### 달력 스타일 핵심 요소 (`src/components/Calendar.css`)

**컨테이너와 헤더**:
```css
.calendar-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
  gap: 30px;
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 2px solid #e3e8ec;
}
```

**달력 메인 영역**:
```css
.calendar-main {
  background: white;
  border: 3px solid #2c3e50;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  position: relative;
}

.calendar-main::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(90deg, #dc3545, #fd7e14, #ffc107, #28a745, #17a2b8, #007bff, #6f42c1);
}
```

**요일 헤더**:
```css
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  margin-top: 8px;
}

.weekday.sunday {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
}

.weekday.saturday {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
}
```

**날짜 셀**:
```css
.calendar-day {
  min-height: 140px;
  border-right: 2px solid #e9ecef;
  border-bottom: 2px solid #e9ecef;
  padding: 12px;
  transition: all 0.2s ease;
}

.calendar-day:hover {
  background: #f8f9fa;
  transform: scale(1.02);
  z-index: 1;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.calendar-day.today {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border: 3px solid #ff9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.3);
}
```

**음력/공휴일 정보 스타일**:
```css
.lunar-info {
  font-size: 11px;
  color: #6c757d;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 10px;
  text-align: center;
  border: 1px solid #dee2e6;
  max-width: fit-content;
}

.holiday-info {
  font-size: 12px;
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  padding: 3px 8px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(220, 53, 69, 0.3);
  max-width: fit-content;
}
```

### 8단계: GitHub Pages 배포 설정

#### Vite 설정 (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/claude-cal/',  // GitHub Pages용 base path
})
```

#### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 🔧 개발 명령어

```bash
# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 린트
pnpm lint

# 프리뷰
pnpm preview
```

## 🎨 디자인 특징

1. **그라데이션 배경**: 우아한 보라색 그라데이션
2. **카드 스타일**: 입체감 있는 그림자와 둥근 모서리
3. **무지개 상단 바**: 전통 달력의 화려함 표현
4. **요일별 색상**: 일요일(빨강), 토요일(파랑) 구분
5. **호버 효과**: 인터랙티브한 애니메이션
6. **뱃지 스타일**: 음력/공휴일 정보 세련된 표시

## 🌙 음력 계산 로직

1. **korean-lunar-calendar** 라이브러리 사용
2. **표시 조건**: 음력 1일, 15일, 말일만 표시
3. **말일 판단**: 다음날이 음력 1일인지 확인하여 판단
4. **형식**: "음 9.1", "음 9.15", "음 9.29" 형태

## 🎌 공휴일 표시

1. **date-holidays** 라이브러리로 한국 공휴일 가져오기
2. **표시 방법**: 빨간색 배경의 뱃지로 표시
3. **색상 규칙**: 공휴일은 일요일과 같은 빨간색 적용

## 📱 반응형 디자인

- **데스크톱**: 전체 레이아웃 표시
- **태블릿**: 미니 달력 세로 배치
- **모바일**: 컴팩트한 레이아웃, 작은 폰트 크기

## 🚀 배포 프로세스

1. **자동 배포**: main 브랜치에 push 시 자동 실행
2. **빌드 과정**: pnpm install → pnpm build → artifact 업로드
3. **GitHub Pages**: 빌드된 dist 폴더 자동 배포

## 📋 체크리스트

구현 시 확인해야 할 사항들:

- [ ] 프로젝트 초기 설정 (Vite + React + TypeScript)
- [ ] pnpm과 Corepack 설정
- [ ] korean-lunar-calendar 라이브러리 설치
- [ ] date-holidays 라이브러리 설치
- [ ] Noto Sans KR 폰트 추가
- [ ] 타입 정의 파일 생성
- [ ] 달력 컴포넌트 구현
- [ ] 음력 계산 로직 구현
- [ ] 공휴일 표시 기능
- [ ] 미니 달력 네비게이션
- [ ] 전통 달력 스타일 적용
- [ ] 반응형 디자인
- [ ] GitHub Actions 워크플로우 설정
- [ ] GitHub Pages 배포 설정
- [ ] README.md 작성

## 🔍 트러블슈팅

### 일반적인 문제들

1. **음력 계산 오류**: korean-lunar-calendar 사용법 확인
2. **폰트 로딩 실패**: Google Fonts 연결 확인
3. **빌드 실패**: TypeScript 타입 오류 확인
4. **배포 실패**: GitHub Pages 설정 확인

### 성능 최적화

1. **번들 크기**: 불필요한 라이브러리 제거
2. **이미지 최적화**: WebP 형식 사용 고려
3. **코드 스플리팅**: 동적 import 사용 고려

## 🎯 완성도 검증

구현이 완료되었는지 확인하는 방법:

1. **기능 테스트**:
   - 달력 표시 정상 작동
   - 음력 1일, 15일, 말일 표시
   - 공휴일 표시
   - 미니 달력 네비게이션
   - 오늘 날짜 하이라이트

2. **디자인 검증**:
   - 전통 달력 스타일 적용
   - 색상 구분 (일요일/토요일)
   - 반응형 디자인 작동
   - 호버 효과 및 애니메이션

3. **배포 확인**:
   - GitHub Pages 자동 배포
   - 라이브 사이트 접근 가능
   - 모든 기능 정상 작동

이 가이드를 따라하면 동일한 한국 전통 달력 웹 앱을 완전히 구현할 수 있습니다.