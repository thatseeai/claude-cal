// 설날 연휴 및 대체공휴일 로직 테스트
import { describe, it, expect } from 'vitest'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import Holidays from 'date-holidays'

// Calendar.tsx에서 가져온 함수들을 복사해서 테스트
const getLunarHolidayInfo = (year, month, day) => {
  try {
    const lunar = new KoreanLunarCalendar()
    lunar.setSolarDate(year, month, day)
    const lunarDate = lunar.getLunarCalendar()

    // 설날 연휴 계산: 설날 전날, 설날 당일, 설날 다음날 (3일간)
    if (lunarDate.month === 1 && lunarDate.day === 1) {
      // 설날 당일
      return { name: '설날', type: 'lunar_new_year' }
    }

    // 설날 전날 확인: 내일이 설날(음력 1월 1일)인지 확인
    try {
      const tomorrow = new Date(year, month - 1, day)  // month-1 because Date constructor uses 0-based month
      tomorrow.setDate(tomorrow.getDate() + 1)

      const tomorrowLunar = new KoreanLunarCalendar()
      tomorrowLunar.setSolarDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())
      const tomorrowLunarDate = tomorrowLunar.getLunarCalendar()

      if (tomorrowLunarDate.month === 1 && tomorrowLunarDate.day === 1) {
        return { name: '설날 연휴', type: 'lunar_new_year' }
      }
    } catch (error) {
      // 연도 경계에서 오류 발생 시 무시
    }

    // 설날 다음날 확인: 어제가 설날(음력 1월 1일)인지 확인
    try {
      const yesterday = new Date(year, month - 1, day)  // month-1 because Date constructor uses 0-based month
      yesterday.setDate(yesterday.getDate() - 1)

      const yesterdayLunar = new KoreanLunarCalendar()
      yesterdayLunar.setSolarDate(yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate())
      const yesterdayLunarDate = yesterdayLunar.getLunarCalendar()

      if (yesterdayLunarDate.month === 1 && yesterdayLunarDate.day === 1) {
        return { name: '설날 연휴', type: 'lunar_new_year' }
      }
    } catch (error) {
      // 연도 경계에서 오류 발생 시 무시
    }

    // 추석 연휴 (음력 8월 14일, 15일, 16일)
    if (lunarDate.month === 8 && (lunarDate.day === 14 || lunarDate.day === 15 || lunarDate.day === 16)) {
      if (lunarDate.day === 15) {
        return { name: '추석', type: 'chuseok' }
      } else {
        return { name: '추석 연휴', type: 'chuseok' }
      }
    }

    return { name: '', type: '' }
  } catch (error) {
    console.error('Lunar date calculation error:', error)
    return { name: '', type: '' }
  }
}

const getHolidaySubstituteType = (holidayName) => {
  // 그룹 1: 토요일 | 일요일 | 다른 공휴일과 겹치는 경우 대체공휴일
  const group1Holidays = ['삼일절', '광복절', '개천절', '한글날', '어린이날']

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

describe('2025년 설날 연휴 계산', () => {
  const testCases = [
    { date: '2025-01-28', expected: '설날 연휴', description: '설날 전날' },
    { date: '2025-01-29', expected: '설날', description: '설날 당일' },
    { date: '2025-01-30', expected: '설날 연휴', description: '설날 다음날' },
    { date: '2025-01-31', expected: '', description: '일반 평일' },
  ]

  testCases.forEach(({ date, expected, description }) => {
    it(`${date} (${description})는 ${expected || '일반날'}이어야 함`, () => {
      const [year, month, day] = date.split('-').map(Number)
      const result = getLunarHolidayInfo(year, month, day)

      console.log(`${date}: ${result.name || '일반날'} (lunar: ${JSON.stringify(getLunarDate(year, month, day))})`)

      if (expected === '') {
        expect(result.name).toBe('')
      } else {
        expect(result.name).toBe(expected)
      }
    })
  })
})

const getLunarDate = (year, month, day) => {
  try {
    const lunar = new KoreanLunarCalendar()
    lunar.setSolarDate(year, month, day)
    return lunar.getLunarCalendar()
  } catch (error) {
    return null
  }
}

describe('음력 날짜 확인', () => {
  it('2025년 1월 각 날짜의 음력 확인', () => {
    for (let day = 28; day <= 31; day++) {
      const lunarDate = getLunarDate(2025, 1, day)
      console.log(`2025-01-${day}: 음력 ${lunarDate.month}월 ${lunarDate.day}일`)
    }
  })
})

// 간단한 대체공휴일 계산 로직 (Calendar.tsx에서 복사)
const getSubstituteHolidayInfo = (year, month, day, holidayList) => {
  const targetDate = new Date(year, month - 1, day)
  const dayOfWeek = targetDate.getDay()

  // 평일인 경우만 대체공휴일 가능 (월~금)
  if (dayOfWeek < 1 || dayOfWeek > 5) {
    return { name: '', type: '' }
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
    return { name: '', type: '' }
  }

  // 오늘부터 역방향으로 최대 7일 확인하여 대체공휴일 발생 조건 찾기
  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const checkDate = new Date(targetDate)
    checkDate.setDate(checkDate.getDate() - daysBack)
    const checkDayOfWeek = checkDate.getDay()

    // 해당 날짜의 모든 공휴일 수집
    const holidaysOnDate = []

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

    // 대체공휴일 조건 확인
    const needsSubstitute = holidaysOnDate.some(h => {
      // 설날, 설날 연휴, 추석, 추석 연휴는 연휴 자체이므로 대체공휴일 발생 안함
      if (h.name.includes('설날') || h.name.includes('추석')) {
        return false
      }

      if (h.type === 'full') {
        // 그룹1: 토요일, 일요일, 다른 공휴일과 겹치는 경우
        return checkDayOfWeek === 0 || checkDayOfWeek === 6 || holidaysOnDate.length > 1
      }
      if (h.type === 'sunday_only') {
        // 그룹2: 일요일, 다른 공휴일과 겹치는 경우 (토요일 제외)
        return checkDayOfWeek === 0 || (checkDayOfWeek !== 6 && holidaysOnDate.length > 1)
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
        return { name: '대체공휴일', type: 'substitute' }
      }
    }
  }

  return { name: '', type: '' }
}

// 실제 getAllHolidayInfo 함수 모방
const getAllHolidayInfo = (year, month, day) => {
  const holidayList = new Holidays('KR').getHolidays(year)
  const allHolidays = []
  const uniqueHolidays = new Set()
  let primaryHolidayType = ''

  // 정규 공휴일 확인
  for (const holiday of holidayList) {
    const holidayDate = new Date(holiday.date)
    const targetDate = new Date(year, month - 1, day)
    if (holidayDate.toDateString() === targetDate.toDateString()) {
      uniqueHolidays.add(holiday.name)
      if (!primaryHolidayType) {
        primaryHolidayType = 'normal'
      }
    }
  }

  // 음력 공휴일 연휴 확인
  const lunarHolidayInfo = getLunarHolidayInfo(year, month, day)
  if (lunarHolidayInfo.name) {
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

  allHolidays.push(...Array.from(uniqueHolidays))

  return {
    name: allHolidays[0] || '',
    names: allHolidays,
    type: primaryHolidayType
  }
}

describe('실제 getAllHolidayInfo 테스트', () => {
  it('2025년 1월 31일은 공휴일이 아니어야 함', () => {
    const result = getAllHolidayInfo(2025, 1, 31)
    console.log('2025-01-31 getAllHolidayInfo result:', result)
    expect(result.names.length).toBe(0)
    expect(result.name).toBe('')
  })

  it('2025년 1월 30일은 설날 연휴여야 함', () => {
    const result = getAllHolidayInfo(2025, 1, 30)
    console.log('2025-01-30 getAllHolidayInfo result:', result)
    expect(result.name).toBe('설날 연휴')
  })

  it('2025년 1월 28일 공휴일 상태 확인', () => {
    const result = getAllHolidayInfo(2025, 1, 28)
    console.log('2025-01-28 getAllHolidayInfo result:', result)
    // 설날 연휴여야 함
  })
})

describe('대체공휴일 타입 확인', () => {
  const testCases = [
    { name: '설날', expected: 'sunday_only' },
    { name: '설날 연휴', expected: 'sunday_only' },
    { name: '삼일절', expected: 'full' },
    { name: '어린이날', expected: 'full' },
    { name: '현충일', expected: 'none' },
  ]

  testCases.forEach(({ name, expected }) => {
    it(`${name}은 ${expected} 타입이어야 함`, () => {
      const result = getHolidaySubstituteType(name)
      expect(result).toBe(expected)
    })
  })
})