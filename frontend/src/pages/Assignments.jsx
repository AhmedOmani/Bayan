import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import TeacherLayout from '../components/TeacherLayout'
import ConfirmModal from '../components/ConfirmModal'
import './Assignments.css'

function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [filterGrade, setFilterGrade] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showImporter, setShowImporter] = useState(false)
  const [viewSubmissions, setViewSubmissions] = useState(null)
  const [editAssignment, setEditAssignment] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      navigate('/login')
      return
    }
    loadGrades()
    loadAssignments()
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [filterGrade])

  async function loadGrades() {
    try {
      const data = await api('/api/grades')
      setGrades(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function loadAssignments() {
    try {
      let url = '/api/assignments'
      if (filterGrade) url += `?grade_id=${filterGrade}`
      const data = await api(url)
      setAssignments(data || [])
    } catch (err) {
      if (err.message.includes('not authenticated')) {
        navigate('/login')
        return
      }
      showToast(err.message, 'error')
    }
  }

  async function handlePublish(id) {
    try {
      await api(`/api/assignments/${id}/publish`, { method: 'POST' })
      showToast('تم نشر الواجب', 'success')
      loadAssignments()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleChangeGrade(assignmentId, newGradeId) {
    try {
      await api(`/api/assignments/${assignmentId}/grade`, {
        method: 'PATCH',
        body: JSON.stringify({ grade_id: newGradeId }),
      })
      showToast('تم تحديث الصف', 'success')
      loadAssignments()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function handleDelete(id) {
    setConfirmModal({
      title: 'حذف الواجب',
      message: 'هل أنت متأكد من حذف هذا الواجب؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await api(`/api/assignments/${id}`, { method: 'DELETE' })
          showToast('تم حذف الواجب', 'success')
          loadAssignments()
        } catch (err) {
          showToast(err.message, 'error')
        }
      },
    })
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ar-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isExpired(dateStr) {
    return new Date(dateStr) < new Date()
  }

  if (showBuilder) {
    return (
      <AssignmentBuilder
        grades={grades}
        onBack={() => {
          setShowBuilder(false)
          loadAssignments()
        }}
      />
    )
  }

  if (showImporter) {
    return (
      <GoogleFormImporter
        grades={grades}
        onBack={() => {
          setShowImporter(false)
          loadAssignments()
        }}
      />
    )
  }

  if (editAssignment) {
    return (
      <AssignmentEditor
        assignmentId={editAssignment}
        grades={grades}
        onBack={() => {
          setEditAssignment(null)
          loadAssignments()
        }}
      />
    )
  }

  if (viewSubmissions) {
    return (
      <SubmissionsViewer
        assignment={viewSubmissions}
        onBack={() => setViewSubmissions(null)}
      />
    )
  }

  return (
    <>
      <TeacherLayout>
      <header className="page-header">
        <div className="header-row">
          <h1>الواجبات</h1>
          <div className="header-actions">
            <button className="btn-import" onClick={() => setShowImporter(true)}>
              استيراد من Google Forms
            </button>
            <button className="btn-primary" onClick={() => setShowBuilder(true)}>
              + واجب جديد
            </button>
          </div>
        </div>
      </header>

      <div className="filters">
        <select
          className="input filter-select"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
        >
          <option value="">جميع الصفوف</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد واجبات حالياً</p>
          <div className="empty-actions">
            <button className="btn-import" onClick={() => setShowImporter(true)}>
              استيراد من Google Forms
            </button>
            <button className="btn-primary" onClick={() => setShowBuilder(true)}>
              إنشاء واجب يدوياً
            </button>
          </div>
        </div>
      ) : (
        <div className="assignments-grid">
          {assignments.map((a) => (
            <div key={a.id} className={`assignment-card glass ${a.is_published ? '' : 'draft'}`}>
              <div className="card-top">
                <span className={`status-dot ${a.is_published ? 'published' : 'draft-dot'}`} />
                <span className="card-status-label">
                  {a.is_published ? 'منشور' : 'مسودة'}
                </span>
              </div>

              <h3 className="card-title" onClick={() => setEditAssignment(a.id)} style={{ cursor: 'pointer' }}>{a.title}</h3>

              <div className="card-meta">
                <select
                  className="grade-change-select"
                  value={a.grade_id}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleChangeGrade(a.id, e.target.value)
                  }}
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
                <span className="meta-item">{a.question_count} سؤال</span>
                <span className="meta-item">{a.submission_count} تسليم</span>
              </div>

              <div className="card-deadline">
                <span className={`deadline-text ${isExpired(a.deadline) ? 'expired' : ''}`}>
                  {isExpired(a.deadline) ? 'انتهى' : 'الموعد:'} {formatDate(a.deadline)}
                </span>
              </div>

              <div className="card-actions">
                <button
                  className="btn-action btn-edit"
                  onClick={() => setEditAssignment(a.id)}
                >
                  تعديل
                </button>
                {!a.is_published && (
                  <button
                    className="btn-action btn-publish"
                    onClick={() => handlePublish(a.id)}
                  >
                    نشر
                  </button>
                )}
                {a.is_published && a.submission_count > 0 && (
                  <button
                    className="btn-action btn-view-subs"
                    onClick={() => setViewSubmissions(a)}
                  >
                    التسليمات ({a.submission_count})
                  </button>
                )}
                <button
                  className="btn-action btn-delete"
                  onClick={() => handleDelete(a.id)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </TeacherLayout>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  )
}

// Google Form Importer component
function GoogleFormImporter({ grades, onBack }) {
  const [formURL, setFormURL] = useState('')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [questions, setQuestions] = useState([])
  const { showToast } = useToast()

  const GOOGLE_CLIENT_ID = '794150470653-n2g3epd0u61rialqk4b0pchs0beog169.apps.googleusercontent.com'

  async function fetchWithToken(accessToken = '') {
    try {
      const data = await api('/api/import/google-form', {
        method: 'POST',
        body: JSON.stringify({
          form_url: formURL,
          access_token: accessToken,
        }),
      })
      setTitle(data.form_title || '')
      setQuestions(data.questions || [])
      setPreview(true)
      const note = data.needs_answer_key ? ' — حدد الإجابات الصحيحة قبل الحفظ' : ''
      showToast(`تم جلب ${data.questions.length} سؤال بنجاح${note}`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleFetch() {
    if (!formURL) {
      showToast('الصق رابط Google Form أولاً', 'error')
      return
    }

    setLoading(true)

    // detect URL type — public response URLs don't need OAuth
    const isResponseURL = formURL.includes('/d/e/')

    if (isResponseURL) {
      // scrape public form — no sign-in needed
      fetchWithToken('')
    } else {
      // edit URL — need Google OAuth
      if (!window.google?.accounts?.oauth2) {
        showToast('Google Identity Services not loaded yet — try again', 'error')
        setLoading(false)
        return
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/forms.body.readonly',
        callback: (response) => {
          if (response.error) {
            showToast('فشل تسجيل الدخول بـ Google', 'error')
            setLoading(false)
            return
          }
          fetchWithToken(response.access_token)
        },
      })
      tokenClient.requestAccessToken()
    }
  }

  function removeQuestion(index) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        question_text: '',
        explanation: '',
        choices: [
          { choice_text: '', is_correct: true },
          { choice_text: '', is_correct: false },
          { choice_text: '', is_correct: false },
          { choice_text: '', is_correct: false },
        ],
      },
    ])
  }

  function addChoice(qIndex) {
    const updated = [...questions]
    updated[qIndex].choices.push({ choice_text: '', is_correct: false })
    setQuestions(updated)
  }

  function updateQuestionText(index, text) {
    const updated = [...questions]
    updated[index].question_text = text
    setQuestions(updated)
  }

  function updateExplanation(index, text) {
    const updated = [...questions]
    updated[index].explanation = text
    setQuestions(updated)
  }

  function updateChoiceText(qIndex, cIndex, text) {
    const updated = [...questions]
    updated[qIndex].choices[cIndex].choice_text = text
    setQuestions(updated)
  }

  function setCorrectChoice(qIndex, cIndex) {
    const updated = [...questions]
    updated[qIndex].choices = updated[qIndex].choices.map((c, i) => ({
      ...c,
      is_correct: i === cIndex,
    }))
    setQuestions(updated)
  }

  function removeChoice(qIndex, cIndex) {
    const updated = [...questions]
    if (updated[qIndex].choices.length <= 2) return
    updated[qIndex].choices = updated[qIndex].choices.filter((_, i) => i !== cIndex)
    setQuestions(updated)
  }

  async function handleSave() {
    if (!title || !gradeId || !deadline) {
      showToast('العنوان والصف والموعد مطلوبة', 'error')
      return
    }
    if (questions.length === 0) {
      showToast('يجب أن يكون هناك سؤال واحد على الأقل', 'error')
      return
    }

    // validate all questions have text and choices
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text) {
        showToast(`السؤال ${i + 1} بدون نص`, 'error')
        return
      }
      for (let j = 0; j < questions[i].choices.length; j++) {
        if (!questions[i].choices[j].choice_text) {
          showToast(`الاختيار ${j + 1} في السؤال ${i + 1} فارغ`, 'error')
          return
        }
      }
    }

    setSaving(true)
    try {
      await api('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: '',
          grade_id: gradeId,
          deadline: new Date(deadline).toISOString(),
          questions: questions.map((q) => ({
            question_text: q.question_text,
            explanation: q.explanation || '',
            choices: q.choices,
          })),
        }),
      })
      showToast('تم إنشاء الواجب بنجاح من Google Forms!', 'success')
      onBack()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TeacherLayout>
      <header className="page-header">
        <div className="header-row">
          <h1>استيراد من Google Forms</h1>
          <button className="btn-secondary" onClick={onBack}>رجوع</button>
        </div>
      </header>

      {!preview ? (
        <div className="import-step glass">
          <h2 className="import-step-title">استيراد أسئلة من Google Forms</h2>
          <p className="import-step-desc">
            الصق أي رابط Google Form — رابط التعديل أو رابط الإجابة
          </p>
          <div className="import-url-row">
            <input
              type="url"
              className="input import-url-input"
              placeholder="https://docs.google.com/forms/d/..."
              value={formURL}
              onChange={(e) => setFormURL(e.target.value)}
              dir="ltr"
            />
            <button
              className="btn-primary"
              onClick={handleFetch}
              disabled={loading}
            >
              {loading ? 'جاري الجلب...' : 'جلب الأسئلة'}
            </button>
          </div>
        </div>
      ) : (
        <div className="import-preview">
          <div className="import-meta glass">
            <h2 className="import-form-title">{title}</h2>
            <p className="import-fetched-count">
              تم جلب <strong>{questions.length}</strong> سؤال — يمكنك حذف أو تعديل أي سؤال قبل الحفظ
            </p>

            <div className="meta-grid">
              <div className="form-group">
                <label>عنوان الواجب</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>الصف</label>
                <select
                  className="input"
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                >
                  <option value="">اختر الصف</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>الموعد النهائي</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="import-questions-section">
            <div className="section-header">
              <h2>الأسئلة ({questions.length})</h2>
              <button className="btn-secondary" onClick={addQuestion}>+ إضافة سؤال</button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question-card glass">
                <div className="question-top">
                  <span className="question-number">سؤال {qIndex + 1}</span>
                  <button
                    className="btn-remove"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    حذف السؤال
                  </button>
                </div>

                <div className="form-group">
                  <label>نص السؤال</label>
                  <textarea
                    className="input textarea"
                    value={q.question_text}
                    onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="choices-section">
                  <label>الاختيارات (اضغط الدائرة لتحديد الإجابة الصحيحة)</label>
                  {q.choices.map((c, cIndex) => (
                    <div key={cIndex} className="choice-row">
                      <button
                        className={`choice-radio ${c.is_correct ? 'correct' : ''}`}
                        onClick={() => setCorrectChoice(qIndex, cIndex)}
                        title="تحديد كإجابة صحيحة"
                      >
                        {c.is_correct ? '✓' : ''}
                      </button>
                      <input
                        type="text"
                        className="input choice-input"
                        value={c.choice_text}
                        onChange={(e) => updateChoiceText(qIndex, cIndex, e.target.value)}
                      />
                      {q.choices.length > 2 && (
                        <button
                          className="btn-remove-choice"
                          onClick={() => removeChoice(qIndex, cIndex)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="btn-add-choice" onClick={() => addChoice(qIndex)}>
                    + إضافة اختيار
                  </button>
                </div>

                <div className="form-group">
                  <label>الشرح (اختياري — يظهر بعد التسليم)</label>
                  <textarea
                    className="input textarea"
                    placeholder="اشرح الإجابة الصحيحة..."
                    value={q.explanation || ''}
                    onChange={(e) => updateExplanation(qIndex, e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="builder-footer">
            <button
              className="btn-primary btn-lg"
              onClick={handleSave}
              disabled={saving || questions.length === 0}
            >
              {saving ? 'جاري الحفظ...' : `حفظ الواجب (${questions.length} سؤال)`}
            </button>
          </div>
        </div>
      )}
    </TeacherLayout>
  )
}

// assignment builder component
function AssignmentBuilder({ grades, onBack }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [questions, setQuestions] = useState([createEmptyQuestion()])
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  function createEmptyQuestion() {
    return {
      question_text: '',
      explanation: '',
      choices: [
        { choice_text: '', is_correct: true },
        { choice_text: '', is_correct: false },
      ],
    }
  }

  function addQuestion() {
    setQuestions([...questions, createEmptyQuestion()])
  }

  function removeQuestion(index) {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function updateQuestion(index, field, value) {
    const updated = [...questions]
    updated[index][field] = value
    setQuestions(updated)
  }

  function addChoice(qIndex) {
    const updated = [...questions]
    updated[qIndex].choices.push({ choice_text: '', is_correct: false })
    setQuestions(updated)
  }

  function removeChoice(qIndex, cIndex) {
    const updated = [...questions]
    if (updated[qIndex].choices.length <= 2) return
    updated[qIndex].choices = updated[qIndex].choices.filter((_, i) => i !== cIndex)
    setQuestions(updated)
  }

  function updateChoice(qIndex, cIndex, field, value) {
    const updated = [...questions]
    if (field === 'is_correct') {
      // only one correct answer per question
      updated[qIndex].choices = updated[qIndex].choices.map((c, i) => ({
        ...c,
        is_correct: i === cIndex,
      }))
    } else {
      updated[qIndex].choices[cIndex][field] = value
    }
    setQuestions(updated)
  }

  async function handleSubmit() {
    if (!title || !gradeId || !deadline) {
      showToast('العنوان والصف والموعد مطلوبة', 'error')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text) {
        showToast(`السؤال ${i + 1} بدون نص`, 'error')
        return
      }
      if (!q.explanation) {
        showToast(`السؤال ${i + 1} بدون شرح`, 'error')
        return
      }
      for (let j = 0; j < q.choices.length; j++) {
        if (!q.choices[j].choice_text) {
          showToast(`الاختيار ${j + 1} في السؤال ${i + 1} فارغ`, 'error')
          return
        }
      }
    }

    setLoading(true)
    try {
      await api('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          grade_id: gradeId,
          deadline: new Date(deadline).toISOString(),
          questions,
        }),
      })
      showToast('تم إنشاء الواجب بنجاح', 'success')
      onBack()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TeacherLayout>
      <header className="page-header">
        <div className="header-row">
          <h1>إنشاء واجب جديد</h1>
          <button className="btn-secondary" onClick={onBack}>رجوع</button>
        </div>
      </header>

      <div className="builder">
        <div className="builder-meta glass">
          <div className="meta-grid">
            <div className="form-group">
              <label>عنوان الواجب</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: مراجعة الدرس الأول"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>الصف</label>
              <select
                className="input"
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
              >
                <option value="">اختر الصف</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>الموعد النهائي</label>
              <input
                type="datetime-local"
                className="input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>وصف (اختياري)</label>
            <textarea
              className="input textarea"
              placeholder="تعليمات إضافية للطلاب..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="questions-section">
          <div className="section-header">
            <h2>الأسئلة ({questions.length})</h2>
            <button className="btn-primary btn-sm" onClick={addQuestion}>
              + سؤال جديد
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-card glass">
              <div className="question-top">
                <span className="question-number">سؤال {qIndex + 1}</span>
                {questions.length > 1 && (
                  <button
                    className="btn-remove"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    حذف
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>نص السؤال</label>
                <textarea
                  className="input textarea"
                  placeholder="اكتب السؤال هنا..."
                  value={q.question_text}
                  onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="choices-section">
                <label>الاختيارات</label>
                {q.choices.map((c, cIndex) => (
                  <div key={cIndex} className="choice-row">
                    <button
                      className={`choice-radio ${c.is_correct ? 'correct' : ''}`}
                      onClick={() => updateChoice(qIndex, cIndex, 'is_correct', true)}
                      title="تحديد كإجابة صحيحة"
                    >
                      {c.is_correct ? '✓' : ''}
                    </button>

                    <input
                      type="text"
                      className="input choice-input"
                      placeholder={`الاختيار ${cIndex + 1}`}
                      value={c.choice_text}
                      onChange={(e) => updateChoice(qIndex, cIndex, 'choice_text', e.target.value)}
                    />

                    {q.choices.length > 2 && (
                      <button
                        className="btn-remove-choice"
                        onClick={() => removeChoice(qIndex, cIndex)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  className="btn-add-choice"
                  onClick={() => addChoice(qIndex)}
                >
                  + إضافة اختيار
                </button>
              </div>

              <div className="form-group">
                <label>الشرح (يظهر بعد التسليم)</label>
                <textarea
                  className="input textarea"
                  placeholder="اشرح الإجابة الصحيحة..."
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="builder-footer">
          <button
            className="btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الواجب'}
          </button>
        </div>
      </div>
    </TeacherLayout>
  )
}

// submissions viewer
function SubmissionsViewer({ assignment, onBack }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [paperData, setPaperData] = useState(null)
  const [paperLoading, setPaperLoading] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [])

  async function loadSubmissions() {
    try {
      const data = await api(`/api/assignments/${assignment.id}/submissions`)
      setSubmissions(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function togglePaper(submissionId) {
    if (expanded === submissionId) {
      setExpanded(null)
      setPaperData(null)
      return
    }

    setExpanded(submissionId)
    setPaperLoading(true)
    try {
      const data = await api(`/api/submissions/${submissionId}`)
      setPaperData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setPaperLoading(false)
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ar-OM', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getScoreColor(percentage) {
    if (percentage >= 80) return 'var(--success)'
    if (percentage >= 50) return 'var(--accent-gold)'
    return 'var(--error)'
  }

  function getEmoji(percentage) {
    if (percentage >= 80) return '🌟'
    if (percentage >= 50) return '👍'
    return '💪'
  }

  return (
    <TeacherLayout>
      <header className="page-header">
        <div className="header-row">
          <h1>تسليمات: {assignment.title}</h1>
          <button className="btn-secondary" onClick={onBack}>رجوع</button>
        </div>
      </header>

      {loading ? (
        <p className="empty-state">جاري التحميل...</p>
      ) : submissions.length === 0 ? (
        <p className="empty-state">لا توجد تسليمات</p>
      ) : (
        <div className="sub-cards-list">
          {submissions.map((s) => (
            <div key={s.id} className="sub-card-wrapper">
              <div
                className={`sub-card glass ${expanded === s.id ? 'expanded' : ''}`}
                onClick={() => togglePaper(s.id)}
              >
                <div className="sub-card-avatar">
                  {s.student_name.charAt(0)}
                </div>

                <div className="sub-card-info">
                  <span className="sub-card-name">{s.student_name}</span>
                  <span className="sub-card-date">{formatDate(s.submitted_at)}</span>
                </div>

                <div className="sub-card-score">
                  <span className="sub-score-emoji">{getEmoji(s.percentage)}</span>
                  <span
                    className="sub-score-num"
                    style={{ color: getScoreColor(s.percentage) }}
                  >
                    {s.percentage}%
                  </span>
                  <span className="sub-score-frac">{s.score}/{s.total_questions}</span>
                </div>

                <span className="sub-card-arrow">{expanded === s.id ? '▲' : '▼'}</span>
              </div>

              {expanded === s.id && (
                <div className="sub-paper glass">
                  {paperLoading ? (
                    <p className="paper-loading">جاري تحميل الورقة...</p>
                  ) : paperData ? (
                    <div className="paper-questions">
                      {paperData.questions.map((q, i) => (
                        <div key={i} className={`paper-q ${q.is_correct ? 'q-correct' : 'q-wrong'}`}>
                          <div className="paper-q-header">
                            <span className="paper-q-num">سؤال {q.number}</span>
                            <span className={`paper-q-badge ${q.is_correct ? 'badge-correct' : 'badge-wrong'}`}>
                              {q.is_correct ? '✓ صحيح' : '✕ خطأ'}
                            </span>
                          </div>

                          <p className="paper-q-text">{q.text}</p>

                          <div className="paper-choices">
                            {q.choices.map((c, j) => {
                              let cls = 'paper-choice'
                              if (c.selected && c.is_correct) cls += ' choice-correct-selected'
                              else if (c.selected && !c.is_correct) cls += ' choice-wrong-selected'
                              else if (c.is_correct) cls += ' choice-correct-hint'

                              return (
                                <div key={j} className={cls}>
                                  <span className="paper-choice-text">{c.text}</span>
                                  {c.selected && <span className="paper-choice-tag">إجابة الطالب</span>}
                                  {c.is_correct && <span className="paper-choice-tag correct-tag">الإجابة الصحيحة</span>}
                                </div>
                              )
                            })}
                          </div>

                          <div className="paper-explain">
                            <span className="explain-title">الشرح:</span>
                            <p>{q.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  )
}

// ── Assignment Editor (full CRUD) ──
function AssignmentEditor({ assignmentId, grades, onBack }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [questions, setQuestions] = useState([])
  const { showToast } = useToast()

  useEffect(() => {
    loadAssignment()
  }, [])

  async function loadAssignment() {
    try {
      const data = await api(`/api/assignments/${assignmentId}`)
      setTitle(data.title)
      setGradeId(data.grade_id)
      // format deadline for datetime-local input
      const d = new Date(data.deadline)
      const pad = (n) => String(n).padStart(2, '0')
      setDeadline(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      )
      setQuestions(
        (data.questions || []).map((q) => ({
          question_text: q.question_text,
          explanation: q.explanation || '',
          choices: (q.choices || []).map((c) => ({
            choice_text: c.choice_text,
            is_correct: c.is_correct,
          })),
        }))
      )
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function removeQuestion(index) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        question_text: '',
        explanation: '',
        choices: [
          { choice_text: '', is_correct: true },
          { choice_text: '', is_correct: false },
          { choice_text: '', is_correct: false },
          { choice_text: '', is_correct: false },
        ],
      },
    ])
  }

  function addChoice(qIndex) {
    const updated = [...questions]
    updated[qIndex].choices.push({ choice_text: '', is_correct: false })
    setQuestions(updated)
  }

  function updateQuestionText(index, text) {
    const updated = [...questions]
    updated[index].question_text = text
    setQuestions(updated)
  }

  function updateExplanation(index, text) {
    const updated = [...questions]
    updated[index].explanation = text
    setQuestions(updated)
  }

  function updateChoiceText(qIndex, cIndex, text) {
    const updated = [...questions]
    updated[qIndex].choices[cIndex].choice_text = text
    setQuestions(updated)
  }

  function setCorrectChoice(qIndex, cIndex) {
    const updated = [...questions]
    updated[qIndex].choices = updated[qIndex].choices.map((c, i) => ({
      ...c,
      is_correct: i === cIndex,
    }))
    setQuestions(updated)
  }

  function removeChoice(qIndex, cIndex) {
    const updated = [...questions]
    if (updated[qIndex].choices.length <= 2) return
    updated[qIndex].choices = updated[qIndex].choices.filter((_, i) => i !== cIndex)
    setQuestions(updated)
  }

  async function handleSave() {
    if (!title || !gradeId || !deadline) {
      showToast('العنوان والصف والموعد مطلوبة', 'error')
      return
    }
    if (questions.length === 0) {
      showToast('يجب أن يكون هناك سؤال واحد على الأقل', 'error')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text) {
        showToast(`السؤال ${i + 1} بدون نص`, 'error')
        return
      }
      const correct = questions[i].choices.filter((c) => c.is_correct).length
      if (correct !== 1) {
        showToast(`السؤال ${i + 1} يحتاج إجابة صحيحة واحدة`, 'error')
        return
      }
      for (let j = 0; j < questions[i].choices.length; j++) {
        if (!questions[i].choices[j].choice_text) {
          showToast(`السؤال ${i + 1} — الاختيار ${j + 1} فارغ`, 'error')
          return
        }
      }
    }

    setSaving(true)
    try {
      await api(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          description: '',
          grade_id: gradeId,
          deadline: new Date(deadline).toISOString(),
          questions: questions.map((q) => ({
            question_text: q.question_text,
            explanation: q.explanation || '',
            choices: q.choices.map((c) => ({
              choice_text: c.choice_text,
              is_correct: c.is_correct,
            })),
          })),
        }),
      })
      showToast('تم حفظ التغييرات', 'success')
      onBack()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const [confirmModal, setConfirmModal] = useState(null)

  function handleDelete() {
    setConfirmModal({
      title: 'حذف الواجب نهائياً',
      message: 'سيتم حذف الواجب وجميع أسئلته. لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف نهائي',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await api(`/api/assignments/${assignmentId}`, { method: 'DELETE' })
          showToast('تم حذف الواجب', 'success')
          onBack()
        } catch (err) {
          showToast(err.message, 'error')
        }
      },
    })
  }

  if (loading) {
    return (
      <TeacherLayout>
        <p style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          جاري التحميل...
        </p>
      </TeacherLayout>
    )
  }

  return (
    <>
    <TeacherLayout>
      <header className="page-header">
        <div className="header-row">
          <h1>تعديل الواجب</h1>
          <div className="header-actions">
            <button className="btn-delete-assignment" onClick={handleDelete}>
              حذف الواجب
            </button>
            <button className="btn-primary" onClick={onBack}>
              رجوع
            </button>
          </div>
        </div>
      </header>

      <div className="import-preview">
        <div className="import-meta glass">
          <h2 className="import-form-title">{title}</h2>

          <div className="import-meta-fields">
            <div className="form-group">
              <label>عنوان الواجب</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>الصف</label>
              <select
                className="input"
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
              >
                <option value="">اختر الصف</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>الموعد النهائي</label>
              <input
                type="datetime-local"
                className="input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="import-questions-section">
          <div className="section-header">
            <h2>الأسئلة ({questions.length})</h2>
            <button className="btn-secondary" onClick={addQuestion}>+ إضافة سؤال</button>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-card glass">
              <div className="question-top">
                <span className="question-number">سؤال {qIndex + 1}</span>
                <button
                  className="btn-remove-question"
                  onClick={() => removeQuestion(qIndex)}
                >
                  حذف السؤال
                </button>
              </div>

              <div className="form-group">
                <label>نص السؤال</label>
                <textarea
                  className="input textarea"
                  value={q.question_text}
                  onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                  rows={2}
                />
              </div>

              <div className="choices-section">
                <label>الاختيارات (اضغط الدائرة لتحديد الإجابة الصحيحة)</label>
                {q.choices.map((c, cIndex) => (
                  <div key={cIndex} className="choice-row">
                    <button
                      className={`choice-radio ${c.is_correct ? 'correct' : ''}`}
                      onClick={() => setCorrectChoice(qIndex, cIndex)}
                      title="تحديد كإجابة صحيحة"
                    >
                      {c.is_correct ? '✓' : ''}
                    </button>
                    <input
                      type="text"
                      className="input choice-input"
                      value={c.choice_text}
                      onChange={(e) => updateChoiceText(qIndex, cIndex, e.target.value)}
                    />
                    {q.choices.length > 2 && (
                      <button
                        className="btn-remove-choice"
                        onClick={() => removeChoice(qIndex, cIndex)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn-add-choice" onClick={() => addChoice(qIndex)}>
                  + إضافة اختيار
                </button>
              </div>

              <div className="form-group">
                <label>الشرح (اختياري — يظهر بعد التسليم)</label>
                <textarea
                  className="input textarea"
                  placeholder="اشرح الإجابة الصحيحة..."
                  value={q.explanation || ''}
                  onChange={(e) => updateExplanation(qIndex, e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="import-save-row">
          <button className="btn-primary save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </TeacherLayout>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  )
}

export default Assignments
