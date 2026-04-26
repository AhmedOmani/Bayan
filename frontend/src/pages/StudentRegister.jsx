import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import './StudentRegister.css'

function StudentRegister() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [grades, setGrades] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api('/api/auth/student/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phone,
          password: password,
          grade_id: gradeId,
        }),
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card glass">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>تم التسجيل بنجاح</h2>
            <p>في انتظار موافقة المعلم على حسابك</p>
            <Link to="/student/login" className="btn-primary" style={{ display: 'inline-block', marginTop: '20px' }}>
              الذهاب لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="register-container">
      <div className="register-card glass">
        <div className="register-header">
          <h1 className="register-title">بيان</h1>
          <p className="register-subtitle">تسجيل طالب جديد</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label>الاسم الكامل</label>
            <input
              type="text"
              className="input"
              placeholder="أحمد بن سالم"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>رقم الهاتف</label>
            <input
              type="tel"
              className="input phone-input"
              placeholder="91234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>الصف الدراسي</label>
            <select
              className="input"
              value={gradeId}
              onChange={(e) => setGradeId(e.target.value)}
              required
            >
              <option value="">اختر الصف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="register-error">{error}</p>}

          <button type="submit" className="btn-primary register-btn" disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'تسجيل'}
          </button>

          <p className="register-link">
            لديك حساب؟ <Link to="/student/login">تسجيل الدخول</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default StudentRegister
