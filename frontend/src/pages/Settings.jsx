import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import TeacherLayout from '../components/TeacherLayout'
import './Settings.css'

function Settings() {
  const [user, setUser] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(stored))
  }, [])

  async function handleChangePassword(e) {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('جميع الحقول مطلوبة', 'error')
      return
    }

    if (newPassword.length < 6) {
      showToast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('كلمة المرور الجديدة غير متطابقة', 'error')
      return
    }

    setLoading(true)
    try {
      await api('/api/auth/teacher/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      showToast('تم تغيير كلمة المرور بنجاح', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <TeacherLayout>
      <header className="page-header">
        <h1>الإعدادات</h1>
        <p className="header-subtitle">إدارة حسابك</p>
      </header>

      <div className="settings-grid">
        <section className="settings-card glass">
          <h2 className="settings-section-title">معلومات الحساب</h2>
          <div className="account-info">
            <div className="info-row">
              <span className="info-label">الاسم</span>
              <span className="info-value">{user.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">البريد الإلكتروني</span>
              <span className="info-value" dir="ltr">{user.email}</span>
            </div>
          </div>
        </section>

        <section className="settings-card glass">
          <h2 className="settings-section-title">تغيير كلمة المرور</h2>
          <form className="password-form" onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>كلمة المرور الحالية</label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label>كلمة المرور الجديدة</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <div className="form-group">
              <label>تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور"
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        </section>
      </div>
    </TeacherLayout>
  )
}

export default Settings
