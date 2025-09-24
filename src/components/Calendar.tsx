import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import Holidays from 'date-holidays'
import './Calendar.css'

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

const Calendar: React.FC<CalendarProps> = ({ currentDate, onDateChange }) => {
  const [calendarDates, setCalendarDates] = useState<CalendarDate[][]>([])

  // 성능 최적화: 캐시 구현
  const lunarCache = useRef(new Map<string, string>())
  const holidayCache = useRef(new Map<number, Array<{date: string, name: string, substitute?: boolean}>>())
  const calendarCache = useRef(new Map<string, CalendarDate[][]>())

  // 개발 중 캐시 클리어 (Ctrl/Cmd + Shift + C)
  useEffect(() => {
    const handleCacheClear = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        lunarCache.current.clear()
        holidayCache.current.clear()
        calendarCache.current.clear()
        precomputedMonths.current.clear()
        console.log('캐시가 클리어되었습니다.')
        // 페이지 새로고침으로 강제 재렌더링
        window.location.reload()
      }
    }

    document.addEventListener('keydown', handleCacheClear)
    return () => document.removeEventListener('keydown', handleCacheClear)
  }, [])

  // Holidays 인스턴스를 한 번만 생성하여 참조가 매 렌더마다 바뀌지 않도록 함
  const holidays = useMemo(() => new Holidays('KR'), [])

  const getDaysInMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }, [])

  const getFirstDayOfMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }, [])

  const getLunarDate = useCallback((year: number, month: number, day: number) => {
    const cacheKey = `${year}-${month}-${day}`

    // 캐시에서 확인
    if (lunarCache.current.has(cacheKey)) {
      return lunarCache.current.get(cacheKey)!
    }

    try {
      const lunar = new KoreanLunarCalendar()
      lunar.setSolarDate(year, month, day)
      const lunarDate = lunar.getLunarCalendar()

      const lunarDay = lunarDate.day
      const lunarMonth = lunarDate.month

      let result = ''

      // 음력 1일, 15일 표시
      if (lunarDay === 1 || lunarDay === 15) {
        result = `음 ${lunarMonth}.${lunarDay}`
      } else {
        // 음력 말일 판단 - 다음날이 음력 1일인지 확인
        const nextDay = new Date(year, month - 1, day + 1)
        const nextLunar = new KoreanLunarCalendar()

        try {
          nextLunar.setSolarDate(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate())
          const nextLunarDate = nextLunar.getLunarCalendar()

          if (nextLunarDate.day === 1) {
            result = `음 ${lunarMonth}.${lunarDay}`
          }
        } catch {
          // 다음날이 없는 경우 (월말) 처리
        }
      }

      // 결과를 캐시에 저장
      lunarCache.current.set(cacheKey, result)
      return result
    } catch (error) {
      console.error('Lunar date calculation error:', error)
      const errorResult = ''
      lunarCache.current.set(cacheKey, errorResult)
      return errorResult
    }
  }, [])

  

  const getLunarHolidayInfo = useCallback((year: number, month: number, day: number) => {
    try {
      const lunar = new KoreanLunarCalendar()
      lunar.setSolarDate(year, month, day)
      const lunarDate = lunar.getLunarCalendar()


      // 설날 연휴 계산: 설날 전날, 설날 당일, 설날 다음날 (3일간)
      if (lunarDate.month === 1 && lunarDate.day === 1) {
        // 설날 당일
        return { name: '설날', type: 'lunar_new_year' as const }
      }

      // 설날 전날 확인: 내일이 설날(음력 1월 1일)인지 확인
      try {
        const tomorrow = new Date(year, month - 1, day + 1)  // 직접 day+1로 계산

        const tomorrowLunar = new KoreanLunarCalendar()
        tomorrowLunar.setSolarDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())
        const tomorrowLunarDate = tomorrowLunar.getLunarCalendar()

        if (tomorrowLunarDate.month === 1 && tomorrowLunarDate.day === 1) {
          return { name: '설날 연휴', type: 'lunar_new_year' as const }
        }
      } catch {
        // 연도 경계에서 오류 발생 시 무시
      }

      // 설날 다음날 확인: 어제가 설날(음력 1월 1일)인지 확인
      try {
        const yesterday = new Date(year, month - 1, day - 1)  // 직접 day-1로 계산

        const yesterdayLunar = new KoreanLunarCalendar()
        yesterdayLunar.setSolarDate(yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate())
        const yesterdayLunarDate = yesterdayLunar.getLunarCalendar()


        if (yesterdayLunarDate.month === 1 && yesterdayLunarDate.day === 1) {
          return { name: '설날 연휴', type: 'lunar_new_year' as const }
        }
      } catch {
        // 연도 경계에서 오류 발생 시 무시
      }


      // 추석 연휴 (음력 8월 14일, 15일, 16일)
      if (lunarDate.month === 8 && (lunarDate.day === 14 || lunarDate.day === 15 || lunarDate.day === 16)) {
        if (lunarDate.day === 15) {
          return { name: '추석', type: 'chuseok' as const }
        } else {
          return { name: '추석 연휴', type: 'chuseok' as const }
        }
      }

      return { name: '', type: '' as const }
    } catch {
      return { name: '', type: '' as const }
    }
  }, [])

  const getHolidaySubstituteType = useCallback((holidayName: string) => {
    // 그룹 1: 토요일 | 일요일 | 다른 공휴일과 겹치는 경우 대체공휴일
    const group1Holidays = ['삼일절', '3·1절', '광복절', '개천절', '한글날', '어린이날']

    // 그룹 2: 일요일 | 다른 공휴일과 겹치는 경우 대체공휴일 (토요일 제외)
    const group2Holidays = ['설날', '추석']

    // 그룹 3: 대체공휴일 없음
    const group3Holidays = ['신정', '부처님 오신날', '현충일', '기독탄신일', '성탄절']

    if (group1Holidays.some(h => holidayName.includes(h))) {
      return 'full' // 토요일, 일요일, 다른 공휴일 모두
    }
    if (group2Holidays.some(h => holidayName.includes(h))) {
      return 'sunday_only' // 일요일, 다른 공휴일만 (토요일 제외)
    }
    if (group3Holidays.some(h => holidayName.includes(h))) {
      return 'none' // 대체공휴일 없음
    }

    return 'none' // 기본값
  }, [])

  

  const isDateHoliday = useCallback((date: Date, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
    // 정규 공휴일 확인
    for (const holiday of holidayList) {
      const holidayDate = new Date(holiday.date)
      if (holidayDate.toDateString() === date.toDateString()) {
        // 제헌절은 2008년부터 공휴일이 아님 - 라이브러리 오류 수정
        if (holiday.name.includes('제헌절')) {
          continue
        }
        return true
      }
    }

    // 음력 공휴일 확인
    const lunarInfo = getLunarHolidayInfo(date.getFullYear(), date.getMonth() + 1, date.getDate())
    return lunarInfo.name !== ''
  }, [getLunarHolidayInfo])

  const findNextWorkday = useCallback((fromDate: Date, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
    const nextDay = new Date(fromDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // 주말과 공휴일을 건너뛰어 다음 평일 찾기
    while (true) {
      const dayOfWeek = nextDay.getDay()

      // 주말이면 다음날로
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        nextDay.setDate(nextDay.getDate() + 1)
        continue
      }

      // 평일이면서 공휴일이 아닌지 확인
      if (!isDateHoliday(nextDay, holidayList)) {
        break
      }

      // 공휴일이면 다음날로
      nextDay.setDate(nextDay.getDate() + 1)
    }

    return nextDay
  }, [isDateHoliday])

  const checkForSubstituteHoliday = useCallback((originalDate: Date, targetDate: Date, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
    const originalDayOfWeek = originalDate.getDay()

    // 해당 날짜의 모든 공휴일 수집
    const holidaysOnDate: { name: string, type: 'full' | 'sunday_only' | 'none' }[] = []

    // 정규 공휴일
    for (const holiday of holidayList) {
      const holidayDate = new Date(holiday.date)
      if (holidayDate.toDateString() === originalDate.toDateString()) {
        // 제헌절은 2008년부터 공휴일이 아님 - 라이브러리 오류 수정
        if (holiday.name.includes('제헌절')) {
          continue
        }

        holidaysOnDate.push({
          name: holiday.name,
          type: getHolidaySubstituteType(holiday.name)
        })
      }
    }

    // 음력 공휴일
    const lunarInfo = getLunarHolidayInfo(originalDate.getFullYear(), originalDate.getMonth() + 1, originalDate.getDate())
    if (lunarInfo.name) {
      holidaysOnDate.push({
        name: lunarInfo.name,
        type: getHolidaySubstituteType(lunarInfo.name)
      })
    }

    // 공휴일이 없으면 대체공휴일 발생 안함
    if (holidaysOnDate.length === 0) {
      return { isSubstitute: false }
    }

    // 대체공휴일 발생 조건 확인
    const shouldCreateSubstitute = holidaysOnDate.some(h => {
      if (h.type === 'none') {
        return false // Group 3: 대체공휴일 없음
      }

      if (h.type === 'full') {
        // Group 1: 토요일, 일요일, 다른 공휴일과 겹치는 경우
        return originalDayOfWeek === 0 || originalDayOfWeek === 6 || holidaysOnDate.length > 1
      }

      if (h.type === 'sunday_only') {
        // Group 2: 설날/추석은 일요일이거나 다른 공휴일과 겹치면 대체공휴일 발생
        if (originalDayOfWeek === 0) {
          return true // 일요일
        }

        // 다른 공휴일과 겹치는 경우 확인 (설날/추석 연휴끼리는 제외)
        if (holidaysOnDate.length > 1) {
          const hasNonLunarHoliday = holidaysOnDate.some(other =>
            !other.name.includes('설날') && !other.name.includes('추석')
          )
          return hasNonLunarHoliday
        }

        return false
      }

      return false
    })

    if (!shouldCreateSubstitute) {
      return { isSubstitute: false }
    }

    // 다음 평일 찾기
    const nextWorkday = findNextWorkday(originalDate, holidayList)

    return {
      isSubstitute: nextWorkday.toDateString() === targetDate.toDateString()
    }
  }, [getHolidaySubstituteType, getLunarHolidayInfo, findNextWorkday])

  const getSubstituteHolidayInfo = useCallback((year: number, month: number, day: number, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
    const targetDate = new Date(year, month - 1, day)
    const dayOfWeek = targetDate.getDay()

    // 평일인 경우만 대체공휴일 가능 (월~금)
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      return { name: '', type: '' as const }
    }

    // 오늘이 이미 공휴일인지 확인
    const isTargetHoliday = isDateHoliday(targetDate, holidayList)
    if (isTargetHoliday) {
      return { name: '', type: '' as const }
    }

    // 최대 7일 역방향 확인하여 대체공휴일 발생 조건 찾기
    for (let daysBack = 1; daysBack <= 7; daysBack++) {
      const checkDate = new Date(targetDate)
      checkDate.setDate(checkDate.getDate() - daysBack)

      const substituteInfo = checkForSubstituteHoliday(checkDate, targetDate, holidayList)
      if (substituteInfo.isSubstitute) {
        return { name: '대체공휴일', type: 'substitute' as const }
      }
    }

    return { name: '', type: '' as const }
  }, [isDateHoliday, checkForSubstituteHoliday])

  const getAllHolidayInfo = useCallback((year: number, month: number, day: number) => {
    // 공휴일 데이터 캐싱
    if (!holidayCache.current.has(year)) {
      holidayCache.current.set(year, holidays.getHolidays(year))
    }
    const holidayList = holidayCache.current.get(year)!
    const targetDate = new Date(year, month - 1, day)
    const allHolidays: string[] = []
    const uniqueHolidays = new Set<string>()
    let primaryHolidayType: 'normal' | 'substitute' | 'lunar_new_year' | 'chuseok' | '' = ''

    // 정규 공휴일 확인 (모든 겹치는 공휴일 수집)
    for (const holiday of holidayList) {
      const holidayDate = new Date(holiday.date)
      if (holidayDate.toDateString() === targetDate.toDateString()) {
        // 제헌절은 2008년부터 공휴일이 아님 - 라이브러리 오류 수정
        if (holiday.name.includes('제헌절')) {
          continue
        }

        // 음력 9월 추석 연휴 제외 - 라이브러리에서 잘못 인식한 추석 필터링
        if (holiday.name.includes('추석')) {
          try {
            const lunar = new KoreanLunarCalendar()
            lunar.setSolarDate(year, month, day)
            const lunarDate = lunar.getLunarCalendar()

            // 음력 9월 14일, 15일, 16일인 경우 추석에서 제외
            if (lunarDate.month === 9 && (lunarDate.day === 14 || lunarDate.day === 15 || lunarDate.day === 16)) {
              continue
            }
          } catch {
            // 음력 계산 오류 시 무시
          }
        }

        uniqueHolidays.add(holiday.name)

        if (!primaryHolidayType) {
          if (holiday.substitute) {
            primaryHolidayType = 'substitute'
          } else if (holiday.name.includes('설날') || holiday.name.includes('신정')) {
            primaryHolidayType = 'lunar_new_year'
          } else if (holiday.name.includes('추석')) {
            primaryHolidayType = 'chuseok'
          } else {
            primaryHolidayType = 'normal'
          }
        }
      }
    }

    // 음력 공휴일 연휴 확인 (추석, 설날) - 중복 방지
    const lunarHolidayInfo = getLunarHolidayInfo(year, month, day)
    if (lunarHolidayInfo.name) {
      // 이미 같은 종류의 공휴일이 있는지 확인 (예: 추석과 추석 연휴)
      const hasSimilarHoliday = Array.from(uniqueHolidays).some(h =>
        (h.includes('추석') && lunarHolidayInfo.name.includes('추석')) ||
        (h.includes('설날') && lunarHolidayInfo.name.includes('설날'))
      )

      if (!hasSimilarHoliday) {
        uniqueHolidays.add(lunarHolidayInfo.name)
        if (!primaryHolidayType) {
          primaryHolidayType = lunarHolidayInfo.type
        }
      }
    }

    // 대체공휴일 확인 (기존 공휴일이 없는 날에만)
    if (uniqueHolidays.size === 0) {
      const substituteInfo = getSubstituteHolidayInfo(year, month, day, holidayList)
      if (substituteInfo.name) {
        uniqueHolidays.add(substituteInfo.name)
        primaryHolidayType = substituteInfo.type
      }
    }

    // Set을 배열로 변환
    allHolidays.push(...Array.from(uniqueHolidays))

    return {
      name: allHolidays[0] || '',
      names: allHolidays,
      type: primaryHolidayType
    }
  }, [holidays, getLunarHolidayInfo, getSubstituteHolidayInfo])

  

  


  const generateCalendarDates = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const cacheKey = `${year}-${month}`

    // 캐시에서 확인
    if (calendarCache.current.has(cacheKey)) {
      return calendarCache.current.get(cacheKey)!
    }

    const daysInMonth = getDaysInMonth(date)
    const firstDay = getFirstDayOfMonth(date)
    const today = new Date()

    const dates: CalendarDate[] = []

    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      dates.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        isSunday: false,
        lunarInfo: '',
        holiday: '',
        holidays: [],
        holidayType: ''
      })
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      const dayOfWeek = currentDate.getDay()
      const isToday = currentDate.toDateString() === today.toDateString()
      const lunarInfo = getLunarDate(year, month + 1, day)
      const holidayInfo = getAllHolidayInfo(year, month + 1, day)

      dates.push({
        date: day,
        isCurrentMonth: true,
        isToday,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        lunarInfo,
        holiday: holidayInfo.name,
        holidays: holidayInfo.names,
        holidayType: holidayInfo.type
      })
    }

    // Next month's leading days
    const totalCells = Math.ceil(dates.length / 7) * 7
    const nextMonthDays = totalCells - dates.length
    for (let day = 1; day <= nextMonthDays; day++) {
      dates.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        isSunday: false,
        lunarInfo: '',
        holiday: '',
        holidays: [],
        holidayType: ''
      })
    }

    // Group into weeks
    const weeks: CalendarDate[][] = []
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7))
    }

    // 캐시에 저장
    calendarCache.current.set(cacheKey, weeks)
    return weeks
  }, [getDaysInMonth, getFirstDayOfMonth, getLunarDate, getAllHolidayInfo])


  const getZodiacInfo = (year: number) => {
    // 십이지 순서: 쥐, 소, 범, 토끼, 용, 뱀, 말, 양, 원숭이, 닭, 개, 돼지
    const zodiacAnimals = [
      { name: '쥐띠', emoji: '🐭' },      // 0: 자(子)
      { name: '소띠', emoji: '🐮' },      // 1: 축(丑)
      { name: '범띠', emoji: '🐯' },      // 2: 인(寅)
      { name: '토끼띠', emoji: '🐰' },    // 3: 묘(卯)
      { name: '용띠', emoji: '🐲' },      // 4: 진(辰)
      { name: '뱀띠', emoji: '🐍' },      // 5: 사(巳)
      { name: '말띠', emoji: '🐴' },      // 6: 오(午)
      { name: '양띠', emoji: '🐑' },      // 7: 미(未)
      { name: '원숭이띠', emoji: '🐵' },  // 8: 신(申)
      { name: '닭띠', emoji: '🐓' },      // 9: 유(酉)
      { name: '개띠', emoji: '🐶' },      // 10: 술(戌)
      { name: '돼지띠', emoji: '🐷' }     // 11: 해(亥)
    ]

    // 1900년이 쥐띠(자년)이므로 기준점으로 사용
    const baseYear = 1900
    const zodiacIndex = (year - baseYear) % 12

    return zodiacAnimals[zodiacIndex]
  }

  const navigateToMonth = (targetDate: Date) => {
    onDateChange(targetDate)
  }

  const handleKeyNavigation = useCallback((event: KeyboardEvent) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    switch (event.key) {
      case 'ArrowLeft':
        // 이전 달로 이동
        event.preventDefault()
        onDateChange(new Date(year, month - 1, 1))
        break
      case 'ArrowRight':
        // 다음 달로 이동
        event.preventDefault()
        onDateChange(new Date(year, month + 1, 1))
        break
      case 'ArrowUp':
        // 이전 년도로 이동
        event.preventDefault()
        onDateChange(new Date(year - 1, month, 1))
        break
      case 'ArrowDown':
        // 다음 년도로 이동
        event.preventDefault()
        onDateChange(new Date(year + 1, month, 1))
        break
    }
  }, [currentDate, onDateChange])

  // 모바일 감지
  const isMobile = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 || ('ontouchstart' in window)
    }
    return false
  }, [])

  // 모바일용 동적 달력 데이터 상태 - 초기값은 빈 배열
  const [endlessCalendarData, setEndlessCalendarData] = useState<Array<{date: Date, data: CalendarDate[][], key: string}>>([])

  // 고정 윈도우 방식: 항상 정확히 49개월(±24)을 유지
  const WINDOW_SIZE = 49 // 고정된 윈도우 크기
  const CENTER_INDEX = 24 // 중심 인덱스 (0-based)
  const baseDate = useRef<Date>(new Date()) // 기준 날짜 (변경되지 않음)

  // 고정 윈도우 데이터 초기화
  useEffect(() => {
    if (isMobile && endlessCalendarData.length === 0) {
      const months = []
      const today = baseDate.current

      for (let i = 0; i < WINDOW_SIZE; i++) {
        const offset = i - CENTER_INDEX // -24 ~ +24
        const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
        const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`
        const data = generateCalendarDates(monthDate)

        precomputedMonths.current.set(key, data)
        months.push({
          date: monthDate,
          data,
          key
        })
      }
      setEndlessCalendarData(months)
    }
  }, [isMobile, generateCalendarDates, endlessCalendarData.length])

  // 미리 계산된 데이터 캐시 (성능 향상을 위해)
  const precomputedMonths = useRef(new Map<string, CalendarDate[][]>())


  // 스크롤 위치 보존을 위한 상태
  const scrollPositionRef = useRef<number>(0)
  const isUpdatingData = useRef(false)

  // 동기적 슬라이딩 윈도우
  const windowOffsetRef = useRef<number>(0) // 현재 윈도우의 시작 오프셋

  const updateSlidingWindowSmoothly = useCallback(() => {
    const container = document.querySelector('.mobile-view') as HTMLElement
    if (!container || isUpdatingData.current || endlessCalendarData.length === 0) return

    const scrollPosition = container.scrollTop
    const scrollHeight = container.scrollHeight
    const averageMonthHeight = scrollHeight / WINDOW_SIZE

    // 현재 보고 있는 월 인덱스 (윈도우 내에서)
    const currentWindowIndex = Math.floor(scrollPosition / averageMonthHeight)

    // 윈도우를 슬라이드해야 하는지 확인
    const buffer = 8 // 앞뒤 8개월 버퍼
    let needsUpdate = false
    let newOffset = windowOffsetRef.current

    // 상단 근처에 도달했을 때 윈도우를 왼쪽으로 슬라이드
    if (currentWindowIndex < buffer) {
      newOffset -= buffer
      needsUpdate = true
    }
    // 하단 근처에 도달했을 때 윈도우를 오른쪽으로 슬라이드
    else if (currentWindowIndex >= WINDOW_SIZE - buffer) {
      newOffset += buffer
      needsUpdate = true
    }

    if (needsUpdate) {
      isUpdatingData.current = true

      // 동기적 업데이트: 스크롤 이벤트를 일시적으로 비활성화하고 동시 처리
      container.style.scrollBehavior = 'auto'

      // 현재 스크롤 위치 저장
      const currentScroll = container.scrollTop

      // 데이터 업데이트
      windowOffsetRef.current = newOffset

      setEndlessCalendarData(() => {
        const newData = []
        const today = baseDate.current

        // 새 윈도우 위치에 맞는 데이터 생성
        for (let i = 0; i < WINDOW_SIZE; i++) {
          const offset = newOffset + (i - CENTER_INDEX)
          const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
          const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`

          let data = precomputedMonths.current.get(key)
          if (!data) {
            data = generateCalendarDates(monthDate)
            precomputedMonths.current.set(key, data)
          }

          newData.push({
            date: monthDate,
            data,
            key
          })
        }

        return newData
      })

      // 즉시 스크롤 위치 조정 (flushSync 효과를 위해 강제 동기화)
      requestAnimationFrame(() => {
        const adjustedScrollPosition = currentWindowIndex < buffer
          ? currentScroll + (buffer * averageMonthHeight)
          : currentScroll - (buffer * averageMonthHeight)

        // 스크롤 위치 즉시 조정
        container.scrollTop = Math.max(0, adjustedScrollPosition)
        scrollPositionRef.current = container.scrollTop

        // 다음 프레임에서 업데이트 완료 표시
        requestAnimationFrame(() => {
          isUpdatingData.current = false
        })
      })
    }
  }, [endlessCalendarData.length, generateCalendarDates])

  // 사용자 스크롤 시점 추적
  const lastUserScrollTime = useRef<number>(0)


  // IntersectionObserver 기반 무한 스크롤 (더 부드러운 경험)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // 스크롤 이벤트 핸들러 (단순히 위치만 추적)
  const scrollTimeout = useRef<number | null>(null)
  const handleMobileScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement
    if (!target || !target.classList.contains('mobile-view')) return

    // 현재 스크롤 위치만 저장 (데이터 업데이트는 IntersectionObserver가 담당)
    scrollPositionRef.current = target.scrollTop
    lastUserScrollTime.current = Date.now()
  }, [])

  // IntersectionObserver 설정 (CSS Transform 방식)
  useEffect(() => {
    if (!isMobile) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isUpdatingData.current) return

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 센티널이 보이면 CSS Transform 기반 업데이트
            updateSlidingWindowSmoothly()
          }
        })
      },
      {
        rootMargin: '300px', // 충분한 여유로 미리 준비
        threshold: 0
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isMobile, updateSlidingWindowSmoothly])

  // 센티널 요소들이 DOM에 추가될 때마다 관찰 시작
  useEffect(() => {
    if (!isMobile || !observerRef.current) return

    const topSentinel = topSentinelRef.current
    const bottomSentinel = bottomSentinelRef.current

    if (topSentinel && bottomSentinel) {
      observerRef.current.observe(topSentinel)
      observerRef.current.observe(bottomSentinel)
    }

    return () => {
      if (observerRef.current && topSentinel && bottomSentinel) {
        observerRef.current.unobserve(topSentinel)
        observerRef.current.unobserve(bottomSentinel)
      }
    }
  }, [isMobile, endlessCalendarData.length])

  // 달력 데이터를 메모이제이션하여 불필요한 재계산 방지
  const calendarData = useMemo(() => {
    if (isMobile) {
      return endlessCalendarData
    }
    return [{ date: currentDate, data: generateCalendarDates(currentDate), key: `${currentDate.getFullYear()}-${currentDate.getMonth()}` }]
  }, [currentDate, generateCalendarDates, isMobile, endlessCalendarData])


  // 초기 중간 위치 설정 여부 추적
  const hasInitializedScroll = useRef(false)

  useEffect(() => {
    if (!isMobile) {
      // 데스크톱에서는 기존 방식으로 설정
      setCalendarDates(calendarData[0]?.data || [])
    } else if (!hasInitializedScroll.current && endlessCalendarData.length > 0) {
      // 모바일에서는 최초 한 번만 스크롤 위치를 중간으로 설정
      setTimeout(() => {
        const mobileContainer = document.querySelector('.mobile-view') as HTMLElement
        if (mobileContainer) {
          const scrollHeight = mobileContainer.scrollHeight
          const clientHeight = mobileContainer.clientHeight
          const centerScroll = (scrollHeight - clientHeight) / 2

          mobileContainer.scrollTo({
            top: centerScroll,
            behavior: 'auto'
          })
          hasInitializedScroll.current = true
        }
      }, 200) // DOM 렌더링 완료 후 실행
    }
  }, [calendarData, isMobile, endlessCalendarData.length])

  // 터치 이벤트 핸들러 (iOS 바운스 방지 - 더 정밀하게)
  const handleTouchStart = useCallback((event: Event) => {
    const touchEvent = event as TouchEvent
    const target = event.target as HTMLElement
    const container = target.closest('.mobile-view') as HTMLElement
    if (!container) return

    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // 실제로 스크롤 경계에 도달했을 때만 바운스 방지
    // 약간의 여유를 두어 자연스러운 스크롤 허용
    const isAtTop = scrollTop <= 5 // 상단 5px 이내
    const isAtBottom = scrollTop >= scrollHeight - clientHeight - 5 // 하단 5px 이내

    if (isAtTop) {
      const touch = touchEvent.touches[0]
      const startY = touch.clientY

      const preventUpSwipe = (e: Event) => {
        const touchMoveEvent = e as TouchEvent
        const currentTouch = touchMoveEvent.touches[0]
        if (currentTouch) {
          const deltaY = currentTouch.clientY - startY
          // 위로 스와이프 (deltaY < 0)이고 아직 상단에 있을 때만 방지
          if (deltaY < -10 && container.scrollTop <= 5) {
            e.preventDefault()
          }
        }
      }

      const cleanup = () => {
        document.removeEventListener('touchmove', preventUpSwipe)
        document.removeEventListener('touchend', cleanup)
      }

      document.addEventListener('touchmove', preventUpSwipe, { passive: false })
      document.addEventListener('touchend', cleanup)
    }

    if (isAtBottom) {
      const touch = touchEvent.touches[0]
      const startY = touch.clientY

      const preventDownSwipe = (e: Event) => {
        const touchMoveEvent = e as TouchEvent
        const currentTouch = touchMoveEvent.touches[0]
        if (currentTouch) {
          const deltaY = currentTouch.clientY - startY
          // 아래로 스와이프 (deltaY > 0)이고 아직 하단에 있을 때만 방지
          if (deltaY > 10 && container.scrollTop >= container.scrollHeight - container.clientHeight - 5) {
            e.preventDefault()
          }
        }
      }

      const cleanup = () => {
        document.removeEventListener('touchmove', preventDownSwipe)
        document.removeEventListener('touchend', cleanup)
      }

      document.addEventListener('touchmove', preventDownSwipe, { passive: false })
      document.addEventListener('touchend', cleanup)
    }
  }, [])

  useEffect(() => {
    // 키보드 이벤트 리스너 등록 (데스크톱만)
    if (!isMobile) {
      document.addEventListener('keydown', handleKeyNavigation)
    } else {
      // 모바일 스크롤 이벤트 리스너 등록
      const mobileContainer = document.querySelector('.mobile-view')
      if (mobileContainer) {
        mobileContainer.addEventListener('scroll', handleMobileScroll, { passive: true })
        mobileContainer.addEventListener('touchstart', handleTouchStart, { passive: false })
      }
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (!isMobile) {
        document.removeEventListener('keydown', handleKeyNavigation)
      } else {
        const mobileContainer = document.querySelector('.mobile-view')
        if (mobileContainer) {
          mobileContainer.removeEventListener('scroll', handleMobileScroll)
          mobileContainer.removeEventListener('touchstart', handleTouchStart)
        }
        // 스크롤 타이머 정리
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current)
        }
      }
    }
  }, [handleKeyNavigation, handleMobileScroll, handleTouchStart, isMobile])



  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  // 상수 데이터 메모이제이션
  const monthNames = useMemo(() => [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ], [])
  const dayNames = useMemo(() => ['일', '월', '화', '수', '목', '금', '토'], [])
  const zodiacInfo = useMemo(() => getZodiacInfo(year), [year])

  // 모바일 뷰 렌더링 - 기본 달력 반복 형태
  const renderMobileView = () => (
    <div className={`calendar-container mobile-view ${isMobile ? 'is-mobile' : ''}`}>
      {/* 모바일에서는 스크롤 힌트만 표시 */}
      <div className="navigation-hints">
        <div className="scroll-navigation-hint">
          세로 스크롤로 달력 탐색
        </div>
      </div>

      {/* Endless scroll calendar - 기본 달력 반복 */}
      <div className="endless-calendar">
        {/* 상단 센티널 (이전 달 로딩 트리거) */}
        <div
          ref={topSentinelRef}
          style={{ height: '1px', visibility: 'hidden' }}
          data-sentinel="top"
        />

        {calendarData.map((monthData) => {
          const monthYear = monthData.date.getFullYear()
          const monthMonth = monthData.date.getMonth()
          const monthZodiacInfo = getZodiacInfo(monthYear)

          return (
            <div key={monthData.key} className="month-section">
              {/* 월별 헤더 */}
              <div className="month-header">
                <div className="zodiac-year-container">
                  <span className="zodiac-info" title={monthZodiacInfo.name}>
                    {monthZodiacInfo.emoji}
                  </span>
                  <div className="year-month-display">
                    {monthYear}년 {monthNames[monthMonth]}
                  </div>
                </div>
              </div>

              {/* 완전한 달력 (요일 헤더 + 그리드) */}
              <div className="calendar-main">
                <div className="calendar-weekdays">
                  {dayNames.map((day, index) => (
                    <div key={day} className={`weekday ${index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}`}>
                      {day}
                    </div>
                  ))}
                </div>

                <div className="calendar-grid">
                  {monthData.data.map((week, weekIndex) => (
                    <div key={weekIndex} className="calendar-week">
                      {week.map((date, dayIndex) => (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={`calendar-day ${
                            date.isCurrentMonth ? 'current-month' : 'other-month'
                          } ${date.isToday ? 'today' : ''} ${
                            date.isSunday || date.holiday ? 'sunday' : date.isWeekend ? 'saturday' : ''
                          } ${date.holidayType ? `holiday-${date.holidayType}` : ''}`}
                        >
                          <div className="day-number">{date.date}</div>
                          {date.lunarInfo && (
                            <div className="lunar-info">{date.lunarInfo}</div>
                          )}
                          {date.holidays && date.holidays.length > 0 && (
                            <div className="holiday-info">
                              {date.holidays.map((holiday, index) => (
                                <div key={index} className="holiday-item">{holiday}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {/* 하단 센티널 (다음 달 로딩 트리거) */}
        <div
          ref={bottomSentinelRef}
          style={{ height: '1px', visibility: 'hidden' }}
          data-sentinel="bottom"
        />
      </div>
    </div>
  )

  // 데스크톱 뷰 렌더링
  const renderDesktopView = () => (
    <div className="calendar-container desktop-view" tabIndex={0}>
      {/* Navigation hints */}
      <div className="navigation-hints">
        <div className="keyboard-navigation-hint">
          ← → 월 이동 | ↑ ↓ 연도 이동
        </div>
      </div>

      {/* Header with mini calendars */}
      <div className="calendar-header">
        <div className="mini-calendar" onClick={() => navigateToMonth(new Date(year, month - 1))}>
          <div className="mini-month">{month === 0 ? 12 : month}월</div>
          <div className="mini-grid">
            {generateCalendarDates(new Date(year, month - 1)).flat().slice(0, 42).map((date, index) => {
              const dayOfWeek = index % 7
              const isHoliday = date.holidays && date.holidays.length > 0
              return (
                <div key={index} className={`mini-day ${date.isCurrentMonth ? 'current' : 'other'} ${
                  dayOfWeek === 0 || isHoliday ? 'sunday' : dayOfWeek === 6 ? 'saturday' : ''
                }`}>
                  {date.date}
                </div>
              )
            })}
          </div>
        </div>

        <div className="main-header">
          <div className="zodiac-year-container">
            <span className="zodiac-info" title={zodiacInfo.name}>
              {zodiacInfo.emoji}
            </span>
            <div className="year-month-display">
              {year}년 {monthNames[month]}
            </div>
          </div>
        </div>

        <div className="mini-calendar" onClick={() => navigateToMonth(new Date(year, month + 1))}>
          <div className="mini-month">{month === 11 ? 1 : month + 2}월</div>
          <div className="mini-grid">
            {generateCalendarDates(new Date(year, month + 1)).flat().slice(0, 42).map((date, index) => {
              const dayOfWeek = index % 7
              const isHoliday = date.holidays && date.holidays.length > 0
              return (
                <div key={index} className={`mini-day ${date.isCurrentMonth ? 'current' : 'other'} ${
                  dayOfWeek === 0 || isHoliday ? 'sunday' : dayOfWeek === 6 ? 'saturday' : ''
                }`}>
                  {date.date}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main calendar */}
      <div className="calendar-main">
        <div className="calendar-weekdays">
          {dayNames.map((day, index) => (
            <div key={day} className={`weekday ${index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDates.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((date, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`calendar-day ${
                    date.isCurrentMonth ? 'current-month' : 'other-month'
                  } ${date.isToday ? 'today' : ''} ${
                    date.isSunday || date.holiday ? 'sunday' : date.isWeekend ? 'saturday' : ''
                  } ${date.holidayType ? `holiday-${date.holidayType}` : ''}`}
                >
                  <div className="day-number">{date.date}</div>
                  {date.lunarInfo && (
                    <div className="lunar-info">{date.lunarInfo}</div>
                  )}
                  {date.holidays && date.holidays.length > 0 && (
                    <div className="holiday-info">
                      {date.holidays.map((holiday, index) => (
                        <div key={index} className="holiday-item">{holiday}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // 모바일과 데스크톱 뷰 조건부 렌더링
  return isMobile ? renderMobileView() : renderDesktopView()
}

export default Calendar
