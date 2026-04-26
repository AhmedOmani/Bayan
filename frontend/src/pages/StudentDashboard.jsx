import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './StudentDashboard.css'

function StudentDashboard() {
  const [student, setStudent] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('student')
    if (!stored) {
      navigate('/student/login')
      return
    }
    setStudent(JSON.parse(stored))
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('student')
    navigate('/student/login')
  }

  if (!student) return null

  return (
    <div className="student-dash">
      <header className="student-header glass">
        <div className="student-header-right">
          <h1 className="brand">بيان</h1>
        </div>
        <div className="student-header-left">
          <span className="student-greeting">مرحباً، {student.full_name}</span>
          <button className="btn-secondary btn-sm" onClick={handleLogout}>
            خروج
          </button>
        </div>
      </header>

      <main className="student-main">
        <div className="welcome-section">
          <h2>واجباتك المدرسية</h2>
          <p className="welcome-sub">لا توجد واجبات حالياً. سيتم إخطارك عند إضافة واجب جديد.</p>
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard
