import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import './TeacherLayout.css'

function TeacherLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  async function handleLogout() {
    try {
      await api('/api/auth/teacher/logout', { method: 'POST' })
    } catch (err) {
      // ignore logout errors
    }
    localStorage.removeItem('user')
    showToast('تم تسجيل الخروج', 'info')
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', label: 'الرئيسية' },
    { path: '/students', label: 'الطلاب' },
    { path: '/assignments', label: 'الواجبات' },
    { path: '/settings', label: 'الإعدادات' },
  ]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>بيان</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                navigate(item.path)
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button className="btn-secondary logout-btn" onClick={handleLogout}>
          تسجيل الخروج
        </button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}

export default TeacherLayout
