# 개발자가 실수하기 쉬운 코딩 유형 10가지

본 문서는 한국식 전통 달력 웹 앱 프로젝트에서 발견된 실제 코드를 기반으로, 개발자가 자주 실수하는 코딩 패턴들을 분석하고 개선 방안을 제시합니다.

## 1. 🔄 무한 루프를 유발하는 useEffect 의존성 배열 오류

**문제 코드:**
```typescript
// ❌ 잘못된 예: holidays 객체가 매번 새로 생성되어 무한 루프 발생
const Calendar = ({ currentDate }) => {
  const holidays = new Holidays('KR')  // 매 렌더마다 새 객체 생성

  useEffect(() => {
    // holidays 객체가 바뀔 때마다 실행됨
    const data = generateCalendarData(holidays)
  }, [holidays])  // 무한 루프!
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: useMemo로 객체 참조 안정화
const Calendar = ({ currentDate }) => {
  const holidays = useMemo(() => new Holidays('KR'), [])  // 한 번만 생성

  useEffect(() => {
    const data = generateCalendarData(holidays)
  }, [holidays])  // 안전함
}
```

## 2. 🗓️ Date 객체의 월(month) 인덱스 혼동

**문제 코드:**
```typescript
// ❌ 잘못된 예: JavaScript Date의 월은 0부터 시작
const getLunarDate = (year: number, month: number, day: number) => {
  const lunar = new KoreanLunarCalendar()
  lunar.setSolarDate(year, month, day)  // month가 1-based라면 잘못됨

  const nextDay = new Date(year, month, day + 1)  // 월 인덱스 오류
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 월 인덱스 변환 명시적 처리
const getLunarDate = (year: number, month: number, day: number) => {
  const lunar = new KoreanLunarCalendar()
  lunar.setSolarDate(year, month, day)  // korean-lunar-calendar은 1-based

  const nextDay = new Date(year, month - 1, day + 1)  // Date는 0-based
}
```

## 3. 🎯 이벤트 리스너 메모리 누수

**문제 코드:**
```typescript
// ❌ 잘못된 예: 이벤트 리스너 정리하지 않음
const Calendar = () => {
  const handleKeyNavigation = (event: KeyboardEvent) => {
    // 키보드 네비게이션 로직
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation)
    // cleanup 함수 없음 - 메모리 누수!
  }, [])
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: cleanup 함수로 이벤트 리스너 제거
const Calendar = () => {
  const handleKeyNavigation = useCallback((event: KeyboardEvent) => {
    // 키보드 네비게이션 로직
  }, [currentDate, onDateChange])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation)

    return () => {
      document.removeEventListener('keydown', handleKeyNavigation)
    }
  }, [handleKeyNavigation])
}
```

## 4. 🔍 중복된 라이브러리 객체 생성으로 인한 성능 저하

**문제 코드:**
```typescript
// ❌ 잘못된 예: 매번 새로운 객체 생성
const getLunarDate = (year: number, month: number, day: number) => {
  const lunar = new KoreanLunarCalendar()  // 매번 생성
  const nextLunar = new KoreanLunarCalendar()  // 또 생성

  lunar.setSolarDate(year, month, day)
  nextLunar.setSolarDate(year, month, day + 1)
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 객체 재사용
const getLunarDate = (year: number, month: number, day: number) => {
  const lunar = new KoreanLunarCalendar()  // 한 번만 생성

  lunar.setSolarDate(year, month, day)
  const currentLunar = lunar.getLunarCalendar()

  // 같은 객체 재사용
  lunar.setSolarDate(year, month, day + 1)
  const nextLunar = lunar.getLunarCalendar()
}
```

## 5. ⚠️ try-catch 블록의 빈 catch 문 - 디버깅 어려움

**문제 코드:**
```typescript
// ❌ 잘못된 예: 에러를 완전히 무시
const getLunarDate = (year: number, month: number, day: number) => {
  try {
    const lunar = new KoreanLunarCalendar()
    lunar.setSolarDate(year, month, day)
    return lunar.getLunarCalendar()
  } catch {
    // 에러 완전히 무시 - 디버깅 불가능
    return ''
  }
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 에러 로깅과 적절한 fallback
const getLunarDate = (year: number, month: number, day: number) => {
  try {
    const lunar = new KoreanLunarCalendar()
    lunar.setSolarDate(year, month, day)
    return lunar.getLunarCalendar()
  } catch (error) {
    console.error('Lunar date calculation error:', error)
    return ''  // 의미있는 기본값 반환
  }
}
```

## 6. 🔢 하드코딩된 매직 넘버 사용

**문제 코드:**
```typescript
// ❌ 잘못된 예: 의미없는 숫자들
const getSubstituteHoliday = (date: Date) => {
  const dayOfWeek = date.getDay()

  if (dayOfWeek < 1 || dayOfWeek > 5) {  // 1, 5가 뭘 의미하는지 불분명
    return null
  }

  for (let i = 1; i <= 7; i++) {  // 7이 뭘 의미하는지 불분명
    // 로직...
  }
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 상수로 의미 명확화
const WEEKDAY_START = 1  // 월요일
const WEEKDAY_END = 5    // 금요일
const MAX_DAYS_TO_CHECK = 7  // 최대 확인할 일수

const getSubstituteHoliday = (date: Date) => {
  const dayOfWeek = date.getDay()

  // 평일인 경우만 대체공휴일 가능
  if (dayOfWeek < WEEKDAY_START || dayOfWeek > WEEKDAY_END) {
    return null
  }

  // 최대 일주일 역방향 확인
  for (let daysBack = 1; daysBack <= MAX_DAYS_TO_CHECK; daysBack++) {
    // 로직...
  }
}
```

## 7. 🎨 중복된 조건문으로 인한 복잡한 클래스 이름 생성

**문제 코드:**
```typescript
// ❌ 잘못된 예: 복잡하고 중복된 조건문
const getClassName = (date: CalendarDate, dayIndex: number) => {
  let className = 'calendar-day'

  if (date.isCurrentMonth) className += ' current-month'
  else className += ' other-month'

  if (date.isToday) className += ' today'

  if (date.isSunday) className += ' sunday'
  else if (date.isWeekend) className += ' saturday'

  if (date.holiday) {
    if (date.isSunday) className += ' sunday'
    else className += ' sunday'  // 중복된 조건
  }

  if (date.holidayType === 'normal') className += ' holiday-normal'
  if (date.holidayType === 'substitute') className += ' holiday-substitute'
  // ... 더 많은 중복
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 템플릿 리터럴과 배열 활용
const getClassName = (date: CalendarDate, dayIndex: number) => {
  const classes = [
    'calendar-day',
    date.isCurrentMonth ? 'current-month' : 'other-month',
    date.isToday && 'today',
    (date.isSunday || date.holiday) && 'sunday',
    date.isWeekend && !date.isSunday && 'saturday',
    date.holidayType && `holiday-${date.holidayType}`
  ].filter(Boolean)

  return classes.join(' ')
}
```

## 8. 🏗️ 복잡한 중첩 조건문 - 가독성 저하

**문제 코드:**
```typescript
// ❌ 잘못된 예: 깊은 중첩과 복잡한 로직
const checkSubstituteHoliday = (date: Date, holidayList: Holiday[]) => {
  const dayOfWeek = date.getDay()

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(date)
      checkDate.setDate(date.getDate() - i)

      if (isHoliday(checkDate, holidayList)) {
        const holidayType = getHolidayType(checkDate)
        if (holidayType === 'full') {
          const originalDay = checkDate.getDay()
          if (originalDay === 0 || originalDay === 6 || hasMultipleHolidays(checkDate)) {
            if (isNextWorkday(checkDate, date)) {
              return true
            }
          }
        }
      }
    }
  }
  return false
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: Early return과 함수 분리
const checkSubstituteHoliday = (date: Date, holidayList: Holiday[]) => {
  // 평일이 아니면 대체공휴일 불가
  if (!isWeekday(date)) return false

  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const checkDate = getPreviousDate(date, daysBack)

    if (!isHoliday(checkDate, holidayList)) continue

    if (shouldCreateSubstituteHoliday(checkDate, holidayList)) {
      return isNextWorkdayAfter(checkDate, date)
    }
  }

  return false
}

const isWeekday = (date: Date) => {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

const shouldCreateSubstituteHoliday = (date: Date, holidayList: Holiday[]) => {
  const holidayType = getHolidayType(date)
  const dayOfWeek = date.getDay()

  return holidayType === 'full' &&
         (dayOfWeek === 0 || dayOfWeek === 6 || hasMultipleHolidays(date))
}
```

## 9. 📊 배열 메서드 체이닝에서 불필요한 중간 결과 생성

**문제 코드:**
```typescript
// ❌ 잘못된 예: 불필요한 중간 배열 생성
const processCalendarData = (dates: CalendarDate[]) => {
  const filtered = dates.filter(date => date.isCurrentMonth)
  const mapped = filtered.map(date => ({
    ...date,
    className: getClassName(date)
  }))
  const sorted = mapped.sort((a, b) => a.date - b.date)

  return sorted
}
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 메서드 체이닝으로 최적화
const processCalendarData = (dates: CalendarDate[]) => {
  return dates
    .filter(date => date.isCurrentMonth)
    .map(date => ({
      ...date,
      className: getClassName(date)
    }))
    .sort((a, b) => a.date - b.date)
}
```

## 10. 🧪 테스트 코드의 중복된 설정과 하드코딩

**문제 코드:**
```typescript
// ❌ 잘못된 예: 중복된 설정과 하드코딩
describe('대체공휴일 테스트', () => {
  test('2025년 3월 3일', () => {
    const holidays = new Holidays('KR')
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 3, 3, holidayList)
    expect(result.name).toBe('대체공휴일')
  })

  test('2025년 5월 6일', () => {
    const holidays = new Holidays('KR')  // 중복!
    const holidayList = holidays.getHolidays(2025)  // 중복!
    const result = getSubstituteHolidayInfo(2025, 5, 6, holidayList)
    expect(result.name).toBe('대체공휴일')
  })
})
```

**올바른 코드:**
```typescript
// ✅ 올바른 예: 테스트 데이터 분리와 setup 함수
describe('대체공휴일 테스트', () => {
  const holidays = new Holidays('KR')
  const YEAR = 2025

  const testCases = [
    { month: 3, day: 3, reason: '삼일절(토요일)' },
    { month: 5, day: 6, reason: '어린이날&석가탄신일(월요일)' },
    { month: 10, day: 8, reason: '추석 연휴 중 평일' }
  ]

  test.each(testCases)('$reason - $month월 $day일', ({ month, day, reason }) => {
    const holidayList = holidays.getHolidays(YEAR)
    const result = getSubstituteHolidayInfo(YEAR, month, day, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
  })
})
```

## 📋 요약

이러한 실수들은 다음과 같은 문제를 야기할 수 있습니다:

1. **성능 저하**: 무한 루프, 불필요한 객체 생성
2. **메모리 누수**: 이벤트 리스너 미정리
3. **디버깅 어려움**: 에러 무시, 복잡한 조건문
4. **유지보수성 저하**: 하드코딩, 중복 코드
5. **테스트 품질 저하**: 중복된 설정, 하드코딩

이러한 패턴들을 인지하고 개선함으로써 더 안정적이고 유지보수하기 쉬운 코드를 작성할 수 있습니다.