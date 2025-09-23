import { useState, useEffect, useCallback } from 'react'
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
  const holidays = new Holidays('KR')

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

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

  const getAllHolidayInfo = (year: number, month: number, day: number) => {
    const holidayList = holidays.getHolidays(year)
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
  }

  const getLunarHolidayInfo = (year: number, month: number, day: number) => {
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
  }

  const getHolidaySubstituteType = (holidayName: string) => {
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
  }

  const getSubstituteHolidayInfo = (year: number, month: number, day: number, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
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
  }

  const isDateHoliday = (date: Date, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
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
  }

  const checkForSubstituteHoliday = (originalDate: Date, targetDate: Date, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
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
  }

  const findNextWorkday = (fromDate: Date, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
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
  }


  const generateCalendarDates = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
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

    return weeks
  }, [getLunarDate, getAllHolidayInfo])


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
        // 다음 년도로 이동
        event.preventDefault()
        onDateChange(new Date(year + 1, month, 1))
        break
      case 'ArrowDown':
        // 이전 년도로 이동
        event.preventDefault()
        onDateChange(new Date(year - 1, month, 1))
        break
    }
  }, [currentDate, onDateChange])

  useEffect(() => {
    setCalendarDates(generateCalendarDates(currentDate))
  }, [currentDate, generateCalendarDates])

  useEffect(() => {
    // 키보드 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyNavigation)

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation)
    }
  }, [handleKeyNavigation])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const zodiacInfo = getZodiacInfo(year)

  return (
    <div className="calendar-container" tabIndex={0}>
      {/* Keyboard navigation hint */}
      <div className="keyboard-navigation-hint">
        ← → 월 이동 | ↑ ↓ 연도 이동
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
}

export default Calendar