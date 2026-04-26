import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import TeacherLayout from '../components/TeacherLayout'
import './Assignments.css'

function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [filterGrade, setFilterGrade] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [viewSubmissions, setViewSubmissions] = useState(null)
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

  if (viewSubmissions) {
    return (
      <SubmissionsViewer
        assignment={viewSubmissions}
        onBack={() => setViewSubmissions(null)}
      />
    )
  }

  return (
    <TeacherLayout>
      <header className="page-header">
        <div className="header-row">
          <h1>الواجبات</h1>
          <button className="btn-primary" onClick={() => setShowBuilder(true)}>
            + واجب جديد
          </button>
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
          <button className="btn-primary" onClick={() => setShowBuilder(true)}>
            إنشاء أول واجب
          </button>
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

              <h3 className="card-title">{a.title}</h3>

              <div className="card-meta">
                <span className="meta-item">{a.grade_label}</span>
                <span className="meta-item">{a.question_count} سؤال</span>
                <span className="meta-item">{a.submission_count} تسليم</span>
              </div>

              <div className="card-deadline">
                <span className={`deadline-text ${isExpired(a.deadline) ? 'expired' : ''}`}>
                  {isExpired(a.deadline) ? 'انتهى' : 'الموعد:'} {formatDate(a.deadline)}
                </span>
              </div>

              <div className="card-actions">
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
              </div>
            </div>
          ))}
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

export default Assignments
