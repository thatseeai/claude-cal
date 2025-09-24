import { useState, useEffect, useRef } from 'react'
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

  // 디바운싱을 위한 타이머 참조
  const urlUpdateTimer = useRef<NodeJS.Timeout | null>(null)

  // 날짜가 변경될 때마다 URL 업데이트 (디바운싱 적용)
  useEffect(() => {
    // 이전 타이머 클리어
    if (urlUpdateTimer.current) {
      clearTimeout(urlUpdateTimer.current)
    }

    // 300ms 후에 URL 업데이트 실행
    urlUpdateTimer.current = setTimeout(() => {
      try {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1 // 1-based index
        const urlParams = new URLSearchParams()
        urlParams.set('year', year.toString())
        urlParams.set('month', month.toString())

        const newUrl = `${window.location.pathname}?${urlParams.toString()}`
        window.history.replaceState({}, '', newUrl)
      } catch (error) {
        // 브라우저 보안 제한으로 인한 에러 무시
        console.warn('URL 업데이트 실패:', error)
      }
    }, 300)

    // 컴포넌트 언마운트 시 타이머 클리어
    return () => {
      if (urlUpdateTimer.current) {
        clearTimeout(urlUpdateTimer.current)
      }
    }
  }, [currentDate])

  return (
    <div className="app">
      <Calendar currentDate={currentDate} onDateChange={setCurrentDate} />
    </div>
  )
}

export default App
