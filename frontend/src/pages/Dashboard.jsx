import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [grades, setGrades] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(stored))
    loadGrades()
  }, [])

  async function loadGrades() {
    try {
      const data = await api('/api/grades')
      setGrades(data || [])
    } catch (err) {
      console.error('failed to load grades:', err)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>بيان</h2>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">الرئيسية</a>
          <a href="#" className="nav-item">الصفوف</a>
          <a href="#" className="nav-item">الطلاب</a>
          <a href="#" className="nav-item">الواجبات</a>
        </nav>
        <button className="btn-secondary logout-btn" onClick={handleLogout}>
          تسجيل الخروج
        </button>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1>مرحباً، {user.name}</h1>
          <p className="header-subtitle">لوحة التحكم</p>
        </header>

        <div className="stats-grid">
          <div className="stat-card card">
            <span className="stat-value">{grades.length}</span>
            <span className="stat-label">الصفوف</span>
          </div>
          <div className="stat-card card">
            <span className="stat-value">0</span>
            <span className="stat-label">الطلاب</span>
          </div>
          <div className="stat-card card">
            <span className="stat-value">0</span>
            <span className="stat-label">الواجبات</span>
          </div>
          <div className="stat-card card">
            <span className="stat-value">0</span>
            <span className="stat-label">التسليمات</span>
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
      </main>
    </div>
  )
}

export default Dashboard
