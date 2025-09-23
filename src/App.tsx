import { useState } from 'react'
import Calendar from './components/Calendar'
import './App.css'

function App() {
  const [currentDate, setCurrentDate] = useState(new Date())

  return (
    <div className="app">
      <Calendar currentDate={currentDate} onDateChange={setCurrentDate} />
    </div>
  )
}

export default App
