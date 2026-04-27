import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import TeacherLayout from '../components/TeacherLayout'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [grades, setGrades] = useState([])
  const [stats, setStats] = useState({ students: 0, pending: 0, assignments: 0 })
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [numericValue, setNumericValue] = useState('')
  const [academicYear, setAcademicYear] = useState('2026-2027')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

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

  async function handleCreateGrade(e) {
    e.preventDefault()
    if (!label || !numericValue || !academicYear) {
      showToast('جميع الحقول مطلوبة', 'error')
      return
    }

    setLoading(true)
    try {
      await api('/api/grades', {
        method: 'POST',
        body: JSON.stringify({
          label,
          numeric_value: parseInt(numericValue),
          academic_year: academicYear,
        }),
      })
      showToast('تم إضافة الصف بنجاح', 'success')
      setLabel('')
      setNumericValue('')
      setShowForm(false)
      loadGrades()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteGrade(id) {
    try {
      await api(`/api/grades/${id}`, { method: 'DELETE' })
      showToast('تم حذف الصف', 'success')
      setDeleteConfirm(null)
      loadGrades()
    } catch (err) {
      showToast(err.message, 'error')
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
        <div className="section-header-row">
          <h2 className="section-title">الصفوف الدراسية</h2>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'إلغاء' : '+ إضافة صف'}
          </button>
        </div>

        {showForm && (
          <form className="grade-form glass" onSubmit={handleCreateGrade}>
            <div className="grade-form-grid">
              <div className="form-group">
                <label>اسم الصف</label>
                <input
                  type="text"
                  className="input"
                  placeholder="مثال: الصف التاسع"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>الرقم</label>
                <input
                  type="number"
                  className="input"
                  placeholder="9"
                  min="1"
                  max="12"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>السنة الدراسية</label>
                <input
                  type="text"
                  className="input"
                  placeholder="2026-2027"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'جاري الإضافة...' : 'إضافة الصف'}
            </button>
          </form>
        )}

        {grades.length === 0 && !showForm ? (
          <div className="empty-state">
            <p>لا توجد صفوف بعد</p>
            <p className="empty-hint">أضف صفاً دراسياً لبدء إنشاء الواجبات وتسجيل الطلاب</p>
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 16 }}>
              + إضافة أول صف
            </button>
          </div>
        ) : (
          <div className="grades-grid">
            {grades.map((g) => (
              <div key={g.id} className="card grade-card">
                <div className="grade-card-top">
                  <h3>{g.label}</h3>
                  {deleteConfirm === g.id ? (
                    <div className="delete-confirm">
                      <button
                        className="btn-confirm-yes"
                        onClick={() => handleDeleteGrade(g.id)}
                      >
                        حذف
                      </button>
                      <button
                        className="btn-confirm-no"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-delete-grade"
                      onClick={() => setDeleteConfirm(g.id)}
                      title="حذف الصف"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span className="grade-year">{g.academic_year}</span>
                <span className="grade-num">الرقم: {g.numeric_value}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </TeacherLayout>
  )
}

export default Dashboard
