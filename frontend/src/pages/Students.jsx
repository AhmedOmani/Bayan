import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import TeacherLayout from '../components/TeacherLayout'
import './Students.css'

function Students() {
  const [students, setStudents] = useState([])
  const [grades, setGrades] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      navigate('/login')
      return
    }
    loadGrades()
  }, [])

  useEffect(() => {
    loadStudents()
  }, [filterStatus, filterGrade])

  async function loadGrades() {
    try {
      const data = await api('/api/grades')
      setGrades(data || [])
    } catch (err) {
      console.error('failed to load grades:', err)
    }
  }

  async function loadStudents() {
    try {
      let url = '/api/students?'
      if (filterStatus) url += `status=${filterStatus}&`
      if (filterGrade) url += `grade_id=${filterGrade}&`
      const data = await api(url)
      setStudents(data || [])
    } catch (err) {
      if (err.message.includes('not authenticated')) {
        navigate('/login')
        return
      }
      showToast(err.message, 'error')
    }
  }

  async function handleApprove(id) {
    try {
      await api(`/api/students/${id}/approve`, { method: 'PATCH' })
      showToast('تمت الموافقة على الطالب', 'success')
      loadStudents()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleBlock(id) {
    try {
      await api(`/api/students/${id}/block`, { method: 'PATCH' })
      showToast('تم حظر الطالب', 'success')
      loadStudents()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleUnblock(id) {
    try {
      await api(`/api/students/${id}/unblock`, { method: 'PATCH' })
      showToast('تم رفع الحظر عن الطالب', 'success')
      loadStudents()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function getStatusBadge(status) {
    const labels = {
      PENDING: 'بانتظار الموافقة',
      ACTIVE: 'مفعّل',
      BLOCKED: 'محظور',
    }
    const classes = {
      PENDING: 'badge badge-pending',
      ACTIVE: 'badge badge-active',
      BLOCKED: 'badge badge-blocked',
    }
    return <span className={classes[status]}>{labels[status]}</span>
  }

  const pendingCount = students.filter((s) => s.status === 'PENDING').length

  return (
    <TeacherLayout>
      <header className="page-header">
        <h1>إدارة الطلاب</h1>
        {pendingCount > 0 && (
          <p className="pending-notice">{pendingCount} طالب بانتظار الموافقة</p>
        )}
      </header>

      <div className="filters">
        <select
          className="input filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">جميع الحالات</option>
          <option value="PENDING">بانتظار الموافقة</option>
          <option value="ACTIVE">مفعّل</option>
          <option value="BLOCKED">محظور</option>
        </select>

        <select
          className="input filter-select"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
        >
          <option value="">جميع الصفوف</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {students.length === 0 ? (
        <p className="empty-state">لا يوجد طلاب حالياً</p>
      ) : (
        <div className="students-table-wrap">
          <table className="students-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>رقم الهاتف</th>
                <th>الصف</th>
                <th>الحالة</th>
                <th>تاريخ التسجيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="student-name" data-label="الاسم">{s.full_name}</td>
                  <td className="student-phone" data-label="الهاتف">{s.phone_number}</td>
                  <td data-label="الصف">{s.grade_label}</td>
                  <td data-label="الحالة">{getStatusBadge(s.status)}</td>
                  <td className="student-date" data-label="التسجيل">
                    {new Date(s.registered_at).toLocaleDateString('ar-OM')}
                  </td>
                  <td className="actions" data-label="إجراءات">
                    {s.status === 'PENDING' && (
                      <button
                        className="btn-action btn-approve"
                        onClick={() => handleApprove(s.id)}
                      >
                        قبول
                      </button>
                    )}
                    {s.status !== 'BLOCKED' && (
                      <button
                        className="btn-action btn-block"
                        onClick={() => handleBlock(s.id)}
                      >
                        حظر
                      </button>
                    )}
                    {s.status === 'BLOCKED' && (
                      <button
                        className="btn-action btn-approve"
                        onClick={() => handleUnblock(s.id)}
                      >
                        رفع الحظر
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TeacherLayout>
  )
}

export default Students
