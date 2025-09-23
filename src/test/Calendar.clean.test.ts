import { describe, test, expect } from 'vitest'
import Holidays from 'date-holidays'
import KoreanLunarCalendar from 'korean-lunar-calendar'

// 새로운 클린한 대체공휴일 로직 복사
const getHolidaySubstituteType = (holidayName: string) => {
  const group1Holidays = ['삼일절', '3·1절', '광복절', '개천절', '한글날', '어린이날']
  const group2Holidays = ['설날', '추석']
  const group3Holidays = ['신정', '부처님 오신날', '현충일', '기독탄신일', '성탄절']

  if (group1Holidays.some(h => holidayName.includes(h))) {
    return 'full'
  }
  if (group2Holidays.some(h => holidayName.includes(h))) {
    return 'sunday_only'
  }
  if (group3Holidays.some(h => holidayName.includes(h))) {
    return 'none'
  }
  return 'none'
}

const getLunarHolidayInfo = (year: number, month: number, day: number) => {
  try {
    const lunar = new KoreanLunarCalendar()
    lunar.setSolarDate(year, month, day)
    const lunarDate = lunar.getLunarCalendar()

    if (lunarDate.month === 1 && lunarDate.day === 1) {
      return { name: '설날', type: 'lunar_new_year' as const }
    }

    // 설날 전날 확인
    try {
      const tomorrow = new Date(year, month - 1, day + 1)
      const tomorrowLunar = new KoreanLunarCalendar()
      tomorrowLunar.setSolarDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())
      const tomorrowLunarDate = tomorrowLunar.getLunarCalendar()

      if (tomorrowLunarDate.month === 1 && tomorrowLunarDate.day === 1) {
        return { name: '설날 연휴', type: 'lunar_new_year' as const }
      }
    } catch {
      // 연도 경계에서 오류 발생 시 무시
    }

    // 설날 다음날 확인
    try {
      const yesterday = new Date(year, month - 1, day - 1)
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

describe('새로운 대체공휴일 로직 테스트', () => {
  const holidays = new Holidays('KR')

  test('2025년 3월 3일 - 삼일절(토요일) 대체공휴일', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 3, 3, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
  })

  test('2025년 10월 8일 - 추석 연휴 중 일요일 대체공휴일', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 10, 8, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
  })

  test('2025년 5월 6일 - 어린이날&석가탄신일(월요일) 대체공휴일', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 5, 6, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
  })

  test('2025년 1월 31일은 대체공휴일이 아님 (설날이 평일)', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 1, 31, holidayList)

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })

  test('2026년 2월 19일은 대체공휴일이 아님 (설날이 평일)', () => {
    const holidayList = holidays.getHolidays(2026)
    const result = getSubstituteHolidayInfo(2026, 2, 19, holidayList)

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })

  test('일반 평일은 대체공휴일이 아님', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 4, 15, holidayList)

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })

  test('주말은 대체공휴일이 될 수 없음', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 3, 2, holidayList) // 일요일

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })

  test('기존 공휴일은 대체공휴일이 될 수 없음', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 5, 5, holidayList) // 어린이날

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })

  test('제헌절은 공휴일이 아님 (2008년부터)', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 7, 17, holidayList) // 제헌절

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })
})

describe('다년도 대체공휴일 검증', () => {
  const holidays = new Holidays('KR')

  test('2025년 예상 대체공휴일 검증', () => {
    const holidayList = holidays.getHolidays(2025)
    const expectedSubstituteHolidays = [
      { month: 3, day: 3, reason: '삼일절(토요일)' },
      { month: 5, day: 6, reason: '어린이날&석가탄신일(월요일)' },
      { month: 10, day: 8, reason: '추석 연휴 중 일요일' }
    ]

    expectedSubstituteHolidays.forEach(({ month, day, reason }) => {
      const result = getSubstituteHolidayInfo(2025, month, day, holidayList)
      expect(result.name, `${month}월 ${day}일 (${reason})`).toBe('대체공휴일')
      expect(result.type, `${month}월 ${day}일 (${reason})`).toBe('substitute')
    })
  })

  test('2026년 예상 대체공휴일 없음 (설날이 평일)', () => {
    const holidayList = holidays.getHolidays(2026)

    // 2026년 2월 17일 설날(화요일) - 평일이므로 대체공휴일 없음
    const possibleDates = [
      { month: 2, day: 18, reason: '설날 다음날' },
      { month: 2, day: 19, reason: '설날 연휴 다음날' }
    ]

    possibleDates.forEach(({ month, day, reason }) => {
      const result = getSubstituteHolidayInfo(2026, month, day, holidayList)
      expect(result.name, `${month}월 ${day}일 (${reason})`).toBe('')
      expect(result.type, `${month}월 ${day}일 (${reason})`).toBe('')
    })
  })
})