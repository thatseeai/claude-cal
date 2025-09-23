declare module 'korean-lunar-calendar' {
  interface LunarDate {
    year: number
    month: number
    day: number
    intercalation: boolean
  }

  interface SolarDate {
    year: number
    month: number
    day: number
  }

  export default class KoreanLunarCalendar {
    constructor()
    setSolarDate(year: number, month: number, day: number): void
    setLunarDate(year: number, month: number, day: number, intercalation?: boolean): void
    getLunarCalendar(): LunarDate
    getSolarCalendar(): SolarDate
  }
}