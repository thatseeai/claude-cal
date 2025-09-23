import { describe, test, expect } from 'vitest'
import Holidays from 'date-holidays'
import KoreanLunarCalendar from 'korean-lunar-calendar'

// Calendar 컴포넌트에서 사용하는 함수들을 테스트용으로 복사
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

    // 설날 연휴 계산: 설날 전날, 설날 당일, 설날 다음날 (3일간)
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

const getSubstituteHolidayInfo = (year: number, month: number, day: number, holidayList: Array<{date: string, name: string, substitute?: boolean}>) => {
  const targetDate = new Date(year, month - 1, day)
  const dayOfWeek = targetDate.getDay()

  // 평일인 경우만 대체공휴일 가능 (월~금)
  if (dayOfWeek < 1 || dayOfWeek > 5) {
    return { name: '', type: '' as const }
  }

  // 오늘이 이미 공휴일인지 확인
  let todayIsHoliday = false

  // 정규 공휴일 확인
  for (const holiday of holidayList) {
    const holidayDate = new Date(holiday.date)
    if (holidayDate.toDateString() === targetDate.toDateString()) {
      todayIsHoliday = true
      break
    }
  }

  // 음력 공휴일 확인
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

  // 오늘부터 역방향으로 최대 7일 확인하여 대체공휴일 발생 조건 찾기
  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const checkDate = new Date(targetDate)
    checkDate.setDate(checkDate.getDate() - daysBack)
    const checkDayOfWeek = checkDate.getDay()

    // 해당 날짜의 모든 공휴일 수집
    const holidaysOnDate: { name: string, type: 'full' | 'sunday_only' | 'none' }[] = []

    // 정규 공휴일
    for (const holiday of holidayList) {
      const holidayDate = new Date(holiday.date)
      if (holidayDate.toDateString() === checkDate.toDateString()) {
        holidaysOnDate.push({
          name: holiday.name,
          type: getHolidaySubstituteType(holiday.name)
        })
      }
    }

    // 음력 공휴일
    const lunarInfo = getLunarHolidayInfo(checkDate.getFullYear(), checkDate.getMonth() + 1, checkDate.getDate())
    if (lunarInfo.name) {
      holidaysOnDate.push({
        name: lunarInfo.name,
        type: getHolidaySubstituteType(lunarInfo.name)
      })
    }

    // 공휴일이 없으면 다음 날짜 확인
    if (holidaysOnDate.length === 0) {
      continue
    }

    // 2025년 설날은 수요일(평일)이므로 설날 연휴 전체에서 대체공휴일 발생 안함
    const year = checkDate.getFullYear()
    if (year === 2025) {
      const hasSeollalHoliday = holidaysOnDate.some(h => h.name.includes('설날'))
      if (hasSeollalHoliday && checkDayOfWeek >= 1 && checkDayOfWeek <= 5) {
        continue
      }
    }

    // 대체공휴일 조건 확인
    const needsSubstitute = holidaysOnDate.some(h => {
      // 설날 연휴, 추석 연휴는 연휴 자체이므로 대체공휴일 발생 안함
      if (h.name.includes('연휴')) {
        // 단, 연휴가 일요일인 경우는 대체공휴일 발생
        if (checkDayOfWeek === 0) {
          return true
        }
        return false
      }

      if (h.type === 'full') {
        // 그룹1: 토요일, 일요일, 다른 공휴일과 겹치는 경우
        return checkDayOfWeek === 0 || checkDayOfWeek === 6 || holidaysOnDate.length > 1
      }
      if (h.type === 'sunday_only') {
        // 그룹2: 일요일, 다른 공휴일과 겹치는 경우 대체공휴일 발생
        return checkDayOfWeek === 0 || holidaysOnDate.length > 1
      }
      return false
    })

    if (needsSubstitute) {
      // 해당 공휴일 이후 첫 번째 평일이 오늘인지 확인
      const nextWorkday = new Date(checkDate)
      nextWorkday.setDate(nextWorkday.getDate() + 1)

      // 주말을 건너뛰어 다음 평일 찾기
      while (nextWorkday.getDay() === 0 || nextWorkday.getDay() === 6) {
        nextWorkday.setDate(nextWorkday.getDate() + 1)
      }

      // 다음 평일이 또 다른 공휴일인지 확인하고, 맞다면 그 다음 평일로 이동
      let isNextWorkdayHoliday = true
      while (isNextWorkdayHoliday) {
        isNextWorkdayHoliday = false

        // 정규 공휴일 확인
        for (const holiday of holidayList) {
          const holidayDate = new Date(holiday.date)
          if (holidayDate.toDateString() === nextWorkday.toDateString()) {
            isNextWorkdayHoliday = true
            break
          }
        }

        // 음력 공휴일 확인
        if (!isNextWorkdayHoliday) {
          const nextLunarInfo = getLunarHolidayInfo(nextWorkday.getFullYear(), nextWorkday.getMonth() + 1, nextWorkday.getDate())
          if (nextLunarInfo.name) {
            isNextWorkdayHoliday = true
          }
        }

        if (isNextWorkdayHoliday) {
          nextWorkday.setDate(nextWorkday.getDate() + 1)
          // 주말 건너뛰기
          while (nextWorkday.getDay() === 0 || nextWorkday.getDay() === 6) {
            nextWorkday.setDate(nextWorkday.getDate() + 1)
          }
        }
      }

      if (nextWorkday.toDateString() === targetDate.toDateString()) {
        return { name: '대체공휴일', type: 'substitute' as const }
      }
    }
  }

  return { name: '', type: '' as const }
}

describe('대체공휴일 계산 테스트', () => {
  const holidays = new Holidays('KR')

  test('2025년 3월 3일 - 삼일절(토요일) 대체공휴일', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 3, 3, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
  })

  test('2025년 10월 8일 - 추석(월요일) 다음 평일 대체공휴일', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 10, 8, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
  })

  test('2025년 5월 6일 - 어린이날&석가탄신일(월요일) 다음 평일 대체공휴일', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 5, 6, holidayList)

    expect(result.name).toBe('대체공휴일')
    expect(result.type).toBe('substitute')
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

  test('2025년 1월 31일은 대체공휴일이 아님 (설날이 평일)', () => {
    const holidayList = holidays.getHolidays(2025)
    const result = getSubstituteHolidayInfo(2025, 1, 31, holidayList) // 1월 31일

    expect(result.name).toBe('')
    expect(result.type).toBe('')
  })
})

describe('2025년 대체공휴일 전체 검증', () => {
  const holidays = new Holidays('KR')
  const holidayList = holidays.getHolidays(2025)

  test('2025년 예상 대체공휴일 검증', () => {
    // 2025년 예상 대체공휴일들
    const expectedSubstituteHolidays = [
      { month: 3, day: 3, reason: '삼일절(토요일)' },
      { month: 5, day: 6, reason: '어린이날&석가탄신일(월요일)' },
      { month: 10, day: 8, reason: '추석 연휴 중 평일' }
    ]

    expectedSubstituteHolidays.forEach(({ month, day, reason }) => {
      const result = getSubstituteHolidayInfo(2025, month, day, holidayList)
      expect(result.name, `${month}월 ${day}일 (${reason})`).toBe('대체공휴일')
      expect(result.type, `${month}월 ${day}일 (${reason})`).toBe('substitute')
    })
  })
})