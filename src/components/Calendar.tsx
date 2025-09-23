import { useState, useEffect } from 'react'
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

    // 대체공휴일 확인
    const substituteInfo = getSubstituteHoliday(year, month, day, holidayList)
    if (substituteInfo.name) {
      uniqueHolidays.add(substituteInfo.name)
      if (!primaryHolidayType) {
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

      // 설날 연휴 (음력 12월 29일, 12월 30일, 1월 1일, 1월 2일)
      if ((lunarDate.month === 12 && (lunarDate.day === 29 || lunarDate.day === 30)) ||
          (lunarDate.month === 1 && (lunarDate.day === 1 || lunarDate.day === 2))) {
        if (lunarDate.month === 1 && lunarDate.day === 1) {
          return { name: '설날', type: 'lunar_new_year' as const }
        } else {
          return { name: '설날 연휴', type: 'lunar_new_year' as const }
        }
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
    } catch (error) {
      return { name: '', type: '' as const }
    }
  }

  const isSubstituteHolidayApplicable = (holidayName: string) => {
    // 대체공휴일이 적용되지 않는 공휴일들
    const nonSubstituteHolidays = [
      '현충일',
      '기독탄신일',
      '성탄절',
      '신정',
      '근로자의 날',
      '근로자의날'
    ]

    return !nonSubstituteHolidays.some(excludedHoliday =>
      holidayName.includes(excludedHoliday)
    )
  }

  const getOverlappingHolidaySubstitute = (year: number, month: number, day: number, holidayList: any[]) => {
    const targetDate = new Date(year, month - 1, day)
    const dayOfWeek = targetDate.getDay()

    // 평일인 경우만 확인 (월~금)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 먼저 오늘이 공휴일인지 확인
      let todayIsHoliday = false

      // 오늘이 정규 공휴일인지 확인
      for (const holiday of holidayList) {
        const holidayDate = new Date(holiday.date)
        if (holidayDate.toDateString() === targetDate.toDateString()) {
          todayIsHoliday = true
          break
        }
      }

      // 오늘이 음력 공휴일인지 확인
      if (!todayIsHoliday) {
        const todayLunarInfo = getLunarHolidayInfo(year, month, day)
        if (todayLunarInfo.name) {
          todayIsHoliday = true
        }
      }

      // 오늘이 공휴일이면 대체공휴일이 될 수 없음
      if (todayIsHoliday) {
        return { name: '', type: '' as const }
      }

      // 전날 확인
      const previousDate = new Date(targetDate)
      previousDate.setDate(previousDate.getDate() - 1)

      // 전날에 겹치는 공휴일이 있는지 확인
      const overlappingHolidays = holidayList.filter(holiday => {
        const holidayDate = new Date(holiday.date)
        return holidayDate.toDateString() === previousDate.toDateString() &&
               isSubstituteHolidayApplicable(holiday.name)
      })

      // 전날에 음력 공휴일도 확인
      const lunarInfo = getLunarHolidayInfo(previousDate.getFullYear(), previousDate.getMonth() + 1, previousDate.getDate())
      if (lunarInfo.name && isSubstituteHolidayApplicable(lunarInfo.name)) {
        overlappingHolidays.push({ name: lunarInfo.name, date: previousDate })
      }

      // 2개 이상의 공휴일이 겹치는 경우 대체공휴일
      if (overlappingHolidays.length >= 2) {
        return { name: '대체공휴일', type: 'substitute' as const }
      }
    }

    return { name: '', type: '' as const }
  }

  const getSubstituteHoliday = (year: number, month: number, day: number, holidayList: any[]) => {
    const targetDate = new Date(year, month - 1, day)
    const dayOfWeek = targetDate.getDay()

    // 먼저 공휴일 겹침으로 인한 대체공휴일 확인
    const overlappingSubstitute = getOverlappingHolidaySubstitute(year, month, day, holidayList)
    if (overlappingSubstitute.name) {
      return overlappingSubstitute
    }

    // 월요일인 경우 일요일이나 토요일 공휴일의 대체공휴일 확인
    if (dayOfWeek === 1) {
      const sunday = new Date(targetDate)
      sunday.setDate(sunday.getDate() - 1)
      const saturday = new Date(targetDate)
      saturday.setDate(saturday.getDate() - 2)

      // 일요일 공휴일 확인
      for (const holiday of holidayList) {
        const holidayDate = new Date(holiday.date)
        if (holidayDate.toDateString() === sunday.toDateString() && isSubstituteHolidayApplicable(holiday.name)) {
          return { name: `${holiday.name} 대체공휴일`, type: 'substitute' as const }
        }
      }

      // 토요일 공휴일 확인 (음력 공휴일도 포함)
      for (const holiday of holidayList) {
        const holidayDate = new Date(holiday.date)
        if (holidayDate.toDateString() === saturday.toDateString() && isSubstituteHolidayApplicable(holiday.name)) {
          return { name: `${holiday.name} 대체공휴일`, type: 'substitute' as const }
        }
      }

      // 토요일이 음력 공휴일인 경우도 확인
      const saturdayLunarInfo = getLunarHolidayInfo(saturday.getFullYear(), saturday.getMonth() + 1, saturday.getDate())
      if (saturdayLunarInfo.name && saturday.getDay() === 6 && isSubstituteHolidayApplicable(saturdayLunarInfo.name)) {
        return { name: `${saturdayLunarInfo.name} 대체공휴일`, type: 'substitute' as const }
      }
    }

    // 평일인 경우 연속 공휴일 대체공휴일 확인
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 먼저 오늘이 공휴일인지 확인
      let todayIsHoliday = false

      // 오늘이 정규 공휴일인지 확인
      for (const holiday of holidayList) {
        const holidayDate = new Date(holiday.date)
        if (holidayDate.toDateString() === targetDate.toDateString()) {
          todayIsHoliday = true
          break
        }
      }

      // 오늘이 음력 공휴일인지 확인
      if (!todayIsHoliday) {
        const todayLunarInfo = getLunarHolidayInfo(year, month, day)
        if (todayLunarInfo.name) {
          todayIsHoliday = true
        }
      }

      // 오늘이 공휴일이면 대체공휴일이 될 수 없음
      if (todayIsHoliday) {
        return { name: '', type: '' as const }
      }

      // 앞의 최대 7일을 확인하여 연속 공휴일 찾기
      const consecutiveHolidayDays = []
      let checkDate = new Date(targetDate)
      checkDate.setDate(checkDate.getDate() - 1)

      // 연속된 공휴일 찾기 (최대 7일 이전까지)
      for (let i = 0; i < 7; i++) {
        let isHoliday = false

        // 정규 공휴일 확인
        for (const holiday of holidayList) {
          const holidayDate = new Date(holiday.date)
          if (holidayDate.toDateString() === checkDate.toDateString() && isSubstituteHolidayApplicable(holiday.name)) {
            isHoliday = true
            break
          }
        }

        // 음력 공휴일 확인
        if (!isHoliday) {
          const lunarInfo = getLunarHolidayInfo(checkDate.getFullYear(), checkDate.getMonth() + 1, checkDate.getDate())
          if (lunarInfo.name && isSubstituteHolidayApplicable(lunarInfo.name)) {
            isHoliday = true
          }
        }

        if (isHoliday) {
          consecutiveHolidayDays.unshift(checkDate.getDay()) // 앞에 추가
          checkDate = new Date(checkDate)
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break // 연속성이 끊어지면 중단
        }
      }

      // 연속 공휴일이 2일 이상이고 일요일(0)을 포함하는 경우만 대체공휴일
      if (consecutiveHolidayDays.length >= 2 && consecutiveHolidayDays.includes(0)) {
        return { name: '대체공휴일', type: 'substitute' as const }
      }
    }

    return { name: '', type: '' as const }
  }

  const generateCalendarDates = (date: Date) => {
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
  }


  const navigateToMonth = (targetDate: Date) => {
    onDateChange(targetDate)
  }

  useEffect(() => {
    setCalendarDates(generateCalendarDates(currentDate))
  }, [currentDate])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="calendar-container">
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
          <h1>{year}년 {monthNames[month]}</h1>
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