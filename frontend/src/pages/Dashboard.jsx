import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import TeacherLayout from '../components/TeacherLayout'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [grades, setGrades] = useState([])
  const [stats, setStats] = useState({ students: 0, pending: 0, assignments: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(stored))
    loadGrades()
    loadStats()
  }, [])

  async function loadGrades() {
    try {
      const data = await api('/api/grades')
      setGrades(data || [])
    } catch (err) {
      console.error('failed to load grades:', err)
    }
  }

  async function loadStats() {
    try {
      const all = await api('/api/students')
      const pending = (all || []).filter((s) => s.status === 'PENDING')
      let assignmentCount = 0
      try {
        const assignments = await api('/api/assignments')
        assignmentCount = (assignments || []).length
      } catch (e) {
        // ignore
      }
      setStats({ students: (all || []).length, pending: pending.length, assignments: assignmentCount })
    } catch (err) {
      console.error('failed to load stats:', err)
    }
  }

  if (!user) return null

  return (
    <TeacherLayout>
      <header className="page-header">
        <h1>مرحباً، {user.name}</h1>
        <p className="header-subtitle">لوحة التحكم</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card card">
          <span className="stat-value">{grades.length}</span>
          <span className="stat-label">الصفوف</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{stats.students}</span>
          <span className="stat-label">الطلاب</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">بانتظار الموافقة</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{stats.assignments}</span>
          <span className="stat-label">الواجبات</span>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">الصفوف الدراسية</h2>
        {grades.length === 0 ? (
          <p className="empty-state">لا توجد صفوف بعد. أضف صفاً للبدء.</p>
        ) : (
          <div className="grades-grid">
            {grades.map((g) => (
              <div key={g.id} className="card grade-card">
                <h3>{g.label}</h3>
                <span className="grade-year">{g.academic_year}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </TeacherLayout>
  )
}

export default Dashboard
