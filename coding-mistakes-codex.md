# 이 프로젝트에서 실수하기 쉬운 코딩 유형 10가지 (코드 스니펫)

아래는 이 캘린더(React + TypeScript, Vite) 프로젝트에서 실제로 자주 발생하는 실수 10가지를 잘못된 예/올바른 예 스니펫으로 정리한 문서입니다.

## 1) Date 생성 시 월 인덱스(0 기반) 혼동

```ts
// 잘못된 예: 1~12 월 값을 그대로 사용 (2월을 만들면 3월이 됨)
const d = new Date(2025, 2, 1) // 기대: 2월 1일, 실제: 3월 1일

// 올바른 예: month-1 로 0 기반 보정
const month1Based = 2 // 2월
const d2 = new Date(2025, month1Based - 1, 1)
```

## 2) Lunar 라이브러리 setSolarDate 인자(1 기반) 누락

```ts
import KoreanLunarCalendar from 'korean-lunar-calendar'

// 잘못된 예: getMonth()는 0 기반인데 그대로 사용
const date = new Date(2025, 0, 29) // 2025-01-29
const lunar = new KoreanLunarCalendar()
lunar.setSolarDate(date.getFullYear(), date.getMonth(), date.getDate()) // ❌ 월 0 전달

// 올바른 예: +1 보정하여 1 기반으로 전달
const lunarOk = new KoreanLunarCalendar()
lunarOk.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
```

## 3) Date 객체를 직접 변이하여 사이드이펙트 유발

```ts
// 잘못된 예: 원본 Date 인스턴스를 직접 변경하여 상위 호출부까지 영향
const findNext = (from: Date) => {
  const next = from // 같은 참조
  next.setDate(next.getDate() + 1) // from 도 함께 변경됨 ❌
  return next
}

// 올바른 예: 항상 복제 후 변경
const findNextSafe = (from: Date) => {
  const next = new Date(from)
  next.setDate(next.getDate() + 1)
  return next
}
```

## 4) 렌더마다 무거운 객체(new Holidays) 생성

```tsx
import Holidays from 'date-holidays'

// 잘못된 예: 함수 컴포넌트 본문에서 매 렌더마다 인스턴스 생성
const Calendar = () => {
  const holidays = new Holidays('KR') // ❌ 매번 새로운 객체
  // ...
}

// 올바른 예: useMemo로 1회 생성 및 참조 안정화
const Calendar = () => {
  const holidays = useMemo(() => new Holidays('KR'), [])
  // ...
}
```

## 5) useEffect/useCallback 의존성 배열 누락으로 stale closure 발생

```tsx
// 잘못된 예: 현재 상태/프롭을 사용하는데 의존성 배열 비움
const handleKey = useCallback((e: KeyboardEvent) => {
  // currentDate 사용하지만 [] 로 인해 오래된 값 캡처 ❌
  if (e.key === 'ArrowRight') onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
}, [])

// 올바른 예: 사용하는 값(함수/상태/프롭)을 의존성으로 명시
const handleKey = useCallback((e: KeyboardEvent) => {
  const y = currentDate.getFullYear()
  const m = currentDate.getMonth()
  if (e.key === 'ArrowRight') onDateChange(new Date(y, m + 1, 1))
}, [currentDate, onDateChange])
```

## 6) 이벤트 리스너 정리(cleanup) 누락

```tsx
// 잘못된 예: 추가만 하고 제거하지 않음 → 중복 핸들러/메모리 누수
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {/* ... */}
  document.addEventListener('keydown', onKey)
}, []) // ❌ 제거 없음

// 올바른 예: cleanup 반환으로 제거
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {/* ... */}
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [/* deps */])
```

## 7) 날짜 비교를 객체 동등성/부분값으로만 판단

```ts
// 잘못된 예: 동일한 시점이라도 서로 다른 Date 인스턴스는 === 로 false
if (date1 === date2) {/* ... */} // ❌

// 잘못된 예: 일(day)만 비교 → 월/연도 다른 경우 오판
if (a.getDate() === b.getDate()) {/* ... */} // ❌

// 올바른 예: Y/M/D 기준 문자열 비교 또는 직접 필드 비교
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
// 또는
const sameDay2 = (a: Date, b: Date) => (
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
)
```

## 8) 라이브러리 데이터 맹신(예: 제헌절 처리 누락)

```ts
// 잘못된 예: 외부 라이브러리 공휴일 데이터를 그대로 신뢰
const isHoliday = holidayList.some(h => new Date(h.date).toDateString() === d.toDateString()) // ❌

// 올바른 예: 프로젝트 정책(제헌절 제외 등) 필터링 적용
const isHoliday = holidayList.some(h => {
  if (h.name.includes('제헌절')) return false // 2008년부터 공휴일 아님
  return new Date(h.date).toDateString() === d.toDateString()
})
```

## 9) 겹치는 공휴일 중복 노출(Set 중복 제거 누락)

```ts
// 잘못된 예: 같은 날에 다수 명칭이 겹치면 중복 push
const names: string[] = []
holidayList.forEach(h => { if (/* same day */) names.push(h.name) }) // ❌

// 올바른 예: Set 으로 유일값만 유지 후 배열화
const unique = new Set<string>()
holidayList.forEach(h => { if (/* same day */) unique.add(h.name) })
const names = Array.from(unique)
```

## 10) 목록 렌더링 key 로 index 사용으로 재정렬/삽입 시 깨짐

```tsx
// 잘못된 예: 동적 배열에서 index key 사용 → 위치 변화 시 잘못된 재사용
{items.map((item, idx) => (
  <Row key={idx} value={item} /> // ❌
))}

// 올바른 예: 날짜/고유 식별자 기반의 안정적 key
{weeks.map((week, w) => (
  <div key={`w-${year}-${month}-${w}`}>
    {week.map((date, d) => (
      <Cell key={`d-${year}-${month}-${date.isCurrentMonth ? date.date : 'other'}-${w}-${d}`} />
    ))}
  </div>
))}
```

---

이 문서는 src/components/Calendar.tsx, 테스트 코드(src/test/*)의 패턴을 바탕으로 정리되었습니다. 신규 기능을 추가할 때 위 10가지를 우선 점검하면 회귀/버그 가능성을 크게 줄일 수 있습니다.

