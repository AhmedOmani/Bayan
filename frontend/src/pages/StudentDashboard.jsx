import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import './StudentDashboard.css'

function StudentDashboard() {
  const [student, setStudent] = useState(null)
  const [assignments, setAssignments] = useState([])
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('student')
    if (!stored) {
      navigate('/student/login')
      return
    }
    setStudent(JSON.parse(stored))
    loadAssignments()
  }, [])

  async function loadAssignments() {
    try {
      const data = await api('/api/assignments')
      setAssignments(data || [])
    } catch (err) {
      if (err.message.includes('not authenticated')) {
        navigate('/student/login')
        return
      }
      console.error(err)
    }
  }

  async function handleLogout() {
    try {
      await api('/api/auth/student/logout', { method: 'POST' })
    } catch (err) {
      // ignore
    }
    localStorage.removeItem('student')
    showToast('تم تسجيل الخروج', 'info')
    navigate('/student/login')
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ar-OM', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isExpired(dateStr) {
    return new Date(dateStr) < new Date()
  }

  if (!student) return null

  const pending = assignments.filter((a) => !a.submitted && !isExpired(a.deadline))
  const completed = assignments.filter((a) => a.submitted)
  const expired = assignments.filter((a) => !a.submitted && isExpired(a.deadline))

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
        {assignments.length === 0 ? (
          <div className="welcome-section">
            <h2>واجباتك المدرسية</h2>
            <p className="welcome-sub">لا توجد واجبات حالياً. سيتم إخطارك عند إضافة واجب جديد.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="assignments-section">
                <h2 className="section-title">واجبات مطلوبة</h2>
                <div className="student-assignments-grid">
                  {pending.map((a) => (
                    <div
                      key={a.id}
                      className="student-assignment-card glass"
                      onClick={() => navigate(`/student/quiz/${a.id}`)}
                    >
                      <h3>{a.title}</h3>
                      {a.description && <p className="card-desc">{a.description}</p>}
                      <div className="card-footer">
                        <span className="card-questions">{a.question_count} سؤال</span>
                        <span className="card-due">حتى {formatDate(a.deadline)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section className="assignments-section">
                <h2 className="section-title completed-title">واجبات مكتملة</h2>
                <div className="student-assignments-grid">
                  {completed.map((a) => (
                    <div key={a.id} className="student-assignment-card glass done">
                      <h3>{a.title}</h3>
                      <div className="card-footer">
                        <span className="done-badge">تم التسليم</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {expired.length > 0 && (
              <section className="assignments-section">
                <h2 className="section-title expired-title">فات الموعد</h2>
                <div className="student-assignments-grid">
                  {expired.map((a) => (
                    <div key={a.id} className="student-assignment-card glass expired-card">
                      <h3>{a.title}</h3>
                      <div className="card-footer">
                        <span className="expired-badge">منتهي</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard
