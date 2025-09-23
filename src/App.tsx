import { useState, useEffect } from 'react'
import Calendar from './components/Calendar'
import './App.css'

function App() {
  const [currentDate, setCurrentDate] = useState(() => {
    // URL에서 연도와 월 파라미터 읽기
    const urlParams = new URLSearchParams(window.location.search)
    const year = urlParams.get('year')
    const month = urlParams.get('month')

    if (year && month) {
      const yearNum = parseInt(year)
      const monthNum = parseInt(month) - 1 // 0-based index
      if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 0 && monthNum <= 11) {
        return new Date(yearNum, monthNum)
      }
    }

    return new Date()
  })

  // 날짜가 변경될 때마다 URL 업데이트
  useEffect(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1 // 1-based index
    const urlParams = new URLSearchParams()
    urlParams.set('year', year.toString())
    urlParams.set('month', month.toString())

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [currentDate])

  return (
    <div className="app">
      <Calendar currentDate={currentDate} onDateChange={setCurrentDate} />
    </div>
  )
}

export default App
