# GEMINI.md - 한국식 전통 달력 웹 앱 구현 스펙

이 문서는 Gemini CLI에서 한국 전통 달력 웹 앱을 구현하기 위한 상세 스펙입니다.

## 🎯 프로젝트 개요

**목표**: React + TypeScript + Vite로 한국 전통 달력 웹 앱 구현
**특징**: 음력 표시, 공휴일 표시, 전통적인 디자인, GitHub Pages 자동 배포

## 🛠 기술 스택 및 의존성

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 7
- **Package Manager**: pnpm@9.0.0 (Corepack 사용)
- **Styling**: CSS3 (Grid, Flexbox, Gradients)
- **Fonts**: Noto Sans KR (Google Fonts)
- **Required Libraries**:
  - `korean-lunar-calendar@^0.3.6`: 한국 음력 계산
  - `date-holidays@^3.26.1`: 공휴일 데이터
- **Dev Dependencies**:
  - `vitest@^3.2.4`: 테스트 프레임워크
  - `@types/react@^19.1.13`: React TypeScript 타입
  - `eslint@^9.36.0`: 코드 린팅
- **Deployment**: GitHub Pages + GitHub Actions

## 📋 핵심 구현 요구사항

### 🌙 음력 표시 시스템
1. **표시 조건**: 음력 1일, 15일, 말일만 표시
2. **형식**: "음 9.1", "음 9.15", "음 9.29" 형태
3. **말일 판단**: 다음날이 음력 1일이면 오늘이 말일
4. **라이브러리**: korean-lunar-calendar 사용
5. **스타일**: 회색 배경(#f8f9fa), 둥근 모서리(10px), 얇은 테두리

### 🎌 공휴일 시스템
1. **데이터 소스**: date-holidays 라이브러리, 국가 코드 'KR'
2. **공휴일 유형**:
   - **일반 공휴일**: 삼일절, 어린이날, 광복절 등 (빨간색 #dc3545)
   - **대체공휴일**: 토/일 공휴일의 월요일 대체 (노란색 #856404)
   - **설날 연휴**: 음력 12월 29일~1월 2일 (보라색 #7b1fa2)
   - **추석 연휴**: 음력 8월 14일~16일 (주황색 #bf360c)
3. **대체공휴일 규칙**:
   - 토요일/일요일 공휴일 → 다음 월요일 대체
   - 연속 공휴일에 일요일 포함 → 연휴 종료 후 첫 평일 대체
   - **예외**: 현충일, 성탄절, 신정, 근로자의날은 대체공휴일 미적용

### 📅 달력 레이아웃
1. **메인 달력**: CSS Grid 7열, 일요일 시작, 셀 최소 높이 140px
2. **미니 달력**: 상단 좌우 배치, 클릭으로 월 이동, 호버 효과
3. **날짜 셀 구조**:
   ```
   ┌─────────────────────┐
   │ 23        <- 날짜    │
   │ 음 8.21   <- 음력    │
   │                     │
   │ 어린이날  <- 공휴일  │
   │ 대체공휴일           │
   └─────────────────────┘
   ```

### 🎨 디자인 스펙
1. **색상 팔레트**:
   - 배경 그라데이션: #f8f9fa → #e9ecef (135도)
   - 달력 배경: 흰색 (#ffffff)
   - 테두리: #2c3e50 (3px)
   - 일요일/공휴일: #dc3545, 토요일: #007bff
   - 오늘 날짜: #ff9800 오렌지 그라데이션
2. **폰트**: Noto Sans KR, 날짜 20px/700, 요일 18px/700, 음력 11px/500
3. **애니메이션**: 호버 시 scale(1.02), 전환 시간 0.2s~0.3s

### ⌨️ 사용자 인터랙션
1. **키보드 네비게이션**:
   - 좌우 화살표: 월 단위 이동
   - 상하 화살표: 연도 단위 이동
   - 포커스 표시: 파란색 테두리
2. **모바일 지원**:
   - 터치 제스처 및 스와이프 네비게이션
   - 반응형 브레이크포인트: 데스크톱(1200px+), 태블릿(768px), 모바일

### 🚀 성능 최적화
1. **캐싱 시스템**: 음력, 공휴일, 달력 데이터 다층 캐싱
2. **메모이제이션**: React.memo, useCallback, useMemo 활용
3. **무한 스크롤**: 동기식 슬라이딩 윈도우 구현
4. **개발 도구**: Ctrl/Cmd + Shift + C로 캐시 클리어

## 🏗 컴포넌트 구조

### App.tsx
```typescript
interface AppState {
  currentDate: Date
}
// currentDate state 관리 및 Calendar 컴포넌트에 props 전달
```

### Calendar.tsx
```typescript
interface CalendarProps {
  currentDate: Date
  onDateChange: (date: Date) => void
}

interface CalendarDate {
  date: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  isSunday: boolean
  lunarInfo: string
  holiday: string
  holidays: string[]
  holidayType: 'normal' | 'substitute' | 'lunar_new_year' | 'chuseok' | ''
}
```

### 핵심 함수들
- `generateCalendarDates()`: 달력 데이터 생성
- `getLunarDate()`: 음력 계산 (korean-lunar-calendar 사용)
- `getAllHolidayInfo()`: 모든 공휴일 정보 수집
- `getLunarHolidayInfo()`: 설날/추석 연휴 자동 계산
- `getSubstituteHoliday()`: 대체공휴일 계산
- `handleKeyNavigation()`: 키보드 네비게이션

## 🚀 배포 설정

### Vite 설정 (vite.config.ts)
```typescript
export default defineConfig({
  base: '/claude-cal/',
  build: { outDir: 'dist' },
  plugins: [react()]
})
```

### GitHub Actions (.github/workflows/deploy.yml)
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    corepack: true
- run: pnpm install --frozen-lockfile
- run: pnpm build
- uses: actions/deploy-pages@v4
```

## 📋 구현 체크리스트

### ✅ 완료된 기능들
- [x] **기본 달력**: React + TypeScript + Vite 설정
- [x] **음력 시스템**: 1일/15일/말일 정확한 계산 및 표시
- [x] **공휴일 시스템**: 일반/대체/연휴 모든 유형 처리
- [x] **네비게이션**: 미니 달력, 키보드 컨트롤, 터치 제스처
- [x] **성능 최적화**: 캐싱, 메모이제이션, 무한 스크롤
- [x] **모바일 지원**: 스와이프, 반응형 디자인
- [x] **고급 기능**: 십이지 표시, URL 상태 관리
- [x] **배포**: GitHub Pages 자동 배포
- [x] **테스트**: 32개 테스트 통과

### 🎯 핵심 검증 포인트
1. **음력 정확성**: 말일 판단 로직이 정확히 작동하는가?
2. **대체공휴일**: 토/일, 연속 공휴일, 겹침 모든 경우 처리되는가?
3. **성능**: 캐싱으로 빠른 네비게이션이 가능한가?
4. **접근성**: 키보드만으로 모든 기능 사용 가능한가?
5. **모바일**: 터치 제스처가 직관적으로 작동하는가?

## 🛠 개발 명령어

```bash
# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 테스트 실행
pnpm test

# 린팅
pnpm lint

# 배포 (자동: main 브랜치 push 시)
git push origin main
```

## 📊 프로젝트 현황

- **코드 라인**: Calendar.tsx ~1,126줄, Calendar.css ~11KB
- **번들 크기**: ~1.58MB (gzip: ~290KB)
- **테스트 커버리지**: 32개 테스트 모두 통과
- **라이브 URL**: https://syoh.github.io/claude-cal/

## 💡 Gemini CLI 사용 팁

1. **파일 수정 시**: 먼저 현재 구현을 분석한 후 점진적 개선
2. **새 기능 추가**: 캐싱과 성능을 고려하여 구현
3. **버그 수정**: 테스트 코드를 참고하여 검증
4. **디자인 변경**: 기존 CSS 변수와 일관성 유지
5. **배포**: 빌드 테스트 후 main 브랜치에 push

이 스펙을 참고하여 한국 전통 달력 웹 앱의 품질을 유지하면서 새로운 기능을 개발하거나 개선할 수 있습니다.