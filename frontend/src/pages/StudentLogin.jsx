import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import './StudentLogin.css'

function StudentLogin() {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handlePhoneSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api('/api/auth/student/profiles', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone }),
      })

      setProfiles(data)
      if (data.length === 1) {
        setSelectedProfile(data[0])
        setStep('password')
      } else {
        setStep('select')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleProfileSelect(profile) {
    setSelectedProfile(profile)
    setStep('password')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedProfile.id,
          password: password,
        }),
      })

      localStorage.setItem('student_token', data.token)
      localStorage.setItem('student', JSON.stringify(data.user))
      navigate('/student/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="slogin-container">
      <div className="slogin-card glass">
        <div className="slogin-header">
          <h1 className="slogin-title">بيان</h1>
          <p className="slogin-subtitle">تسجيل دخول الطالب</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="slogin-form">
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
            {error && <p className="slogin-error">{error}</p>}
            <button type="submit" className="btn-primary slogin-btn" disabled={loading}>
              {loading ? 'جاري البحث...' : 'التالي'}
            </button>
            <p className="slogin-link">
              ليس لديك حساب؟ <Link to="/register">تسجيل جديد</Link>
            </p>
          </form>
        )}

        {step === 'select' && (
          <div className="profile-select">
            <p className="select-label">من أنت؟</p>
            <div className="profiles-list">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  className="profile-card"
                  onClick={() => handleProfileSelect(p)}
                >
                  <span className="profile-avatar">
                    {p.full_name.charAt(0)}
                  </span>
                  <div className="profile-info">
                    <span className="profile-name">{p.full_name}</span>
                    <span className="profile-grade">{p.grade}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              className="btn-secondary slogin-btn"
              onClick={() => {
                setStep('phone')
                setError('')
              }}
            >
              رجوع
            </button>
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handleLogin} className="slogin-form">
            <div className="selected-profile">
              <span className="profile-avatar small">
                {selectedProfile.full_name.charAt(0)}
              </span>
              <span>{selectedProfile.full_name}</span>
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
            {error && <p className="slogin-error">{error}</p>}
            <button type="submit" className="btn-primary slogin-btn" disabled={loading}>
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
            <button
              type="button"
              className="btn-secondary slogin-btn"
              onClick={() => {
                setStep(profiles.length > 1 ? 'select' : 'phone')
                setPassword('')
                setError('')
              }}
            >
              رجوع
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default StudentLogin
