import { useNavigate, useLocation } from 'react-router-dom'
import './TeacherLayout.css'

function TeacherLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    localStorage.removeItem('teacher_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', label: 'الرئيسية' },
    { path: '/students', label: 'الطلاب' },
    { path: '/assignments', label: 'الواجبات' },
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
