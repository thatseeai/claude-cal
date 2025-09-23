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
        holiday: ''
      })
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      const dayOfWeek = currentDate.getDay()
      const isToday = currentDate.toDateString() === today.toDateString()
      const lunarInfo = getLunarDate(year, month + 1, day)
      const holiday = getHoliday(year, month + 1, day)

      dates.push({
        date: day,
        isCurrentMonth: true,
        isToday,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        lunarInfo,
        holiday
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
        holiday: ''
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
            {generateCalendarDates(new Date(year, month - 1)).flat().slice(0, 42).map((date, index) => (
              <div key={index} className={`mini-day ${date.isCurrentMonth ? 'current' : 'other'}`}>
                {date.date}
              </div>
            ))}
          </div>
        </div>

        <div className="main-header">
          <h1>{year}년 {monthNames[month]}</h1>
        </div>

        <div className="mini-calendar" onClick={() => navigateToMonth(new Date(year, month + 1))}>
          <div className="mini-month">{month === 11 ? 1 : month + 2}월</div>
          <div className="mini-grid">
            {generateCalendarDates(new Date(year, month + 1)).flat().slice(0, 42).map((date, index) => (
              <div key={index} className={`mini-day ${date.isCurrentMonth ? 'current' : 'other'}`}>
                {date.date}
              </div>
            ))}
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
                  }`}
                >
                  <div className="day-number">{date.date}</div>
                  {date.lunarInfo && (
                    <div className="lunar-info">{date.lunarInfo}</div>
                  )}
                  {date.holiday && (
                    <div className="holiday-info">{date.holiday}</div>
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