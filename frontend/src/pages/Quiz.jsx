import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import './Quiz.css'

function Quiz() {
  const { id } = useParams()
  const [assignment, setAssignment] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('student')
    if (!stored) {
      navigate('/student/login')
      return
    }
    loadAssignment()
  }, [])

  async function loadAssignment() {
    try {
      const data = await api(`/api/assignments/${id}`)
      setAssignment(data)
    } catch (err) {
      showToast(err.message, 'error')
      navigate('/student/dashboard')
    }
  }

  function selectChoice(questionId, choiceId) {
    setAnswers({ ...answers, [questionId]: choiceId })
  }

  function goNext() {
    if (currentQ < assignment.questions.length - 1) {
      setCurrentQ(currentQ + 1)
    }
  }

  function goPrev() {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1)
    }
  }

  async function handleSubmit() {
    const unanswered = assignment.questions.filter((q) => !answers[q.id])
    if (unanswered.length > 0) {
      showToast(`${unanswered.length} سؤال بدون إجابة`, 'error')
      return
    }

    setSubmitting(true)
    try {
      const answerList = assignment.questions.map((q) => ({
        question_id: q.id,
        choice_id: answers[q.id],
      }))

      const data = await api(`/api/assignments/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      })

      setResult(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!assignment) {
    return (
      <div className="quiz-loading">
        <div className="loader" />
      </div>
    )
  }

  // show results
  if (result) {
    return <QuizResult result={result} title={assignment.title} navigate={navigate} />
  }

  const question = assignment.questions[currentQ]
  const total = assignment.questions.length
  const progress = ((currentQ + 1) / total) * 100
  const answered = Object.keys(answers).length

  return (
    <div className="quiz-container">
      <header className="quiz-header">
        <button className="quiz-back" onClick={() => navigate('/student/dashboard')}>
          ✕
        </button>
        <h2 className="quiz-title">{assignment.title}</h2>
        <span className="quiz-counter">{currentQ + 1} / {total}</span>
      </header>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-content">
        <div className="question-slide" key={currentQ}>
          <p className="question-text">{question.question_text}</p>

          <div className="choices-list">
            {question.choices.map((choice, i) => {
              const isSelected = answers[question.id] === choice.id
              const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']
              return (
                <button
                  key={choice.id}
                  className={`quiz-choice ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectChoice(question.id, choice.id)}
                >
                  <span className="choice-letter">{letters[i] || i + 1}</span>
                  <span className="choice-label">{choice.choice_text}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <footer className="quiz-footer">
        <button
          className="btn-secondary quiz-nav-btn"
          onClick={goPrev}
          disabled={currentQ === 0}
        >
          السابق
        </button>

        <div className="quiz-dots">
          {assignment.questions.map((q, i) => (
            <button
              key={q.id}
              className={`quiz-dot ${i === currentQ ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
              onClick={() => setCurrentQ(i)}
            />
          ))}
        </div>

        {currentQ === total - 1 ? (
          <button
            className="btn-primary quiz-nav-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'جاري التسليم...' : `تسليم (${answered}/${total})`}
          </button>
        ) : (
          <button className="btn-primary quiz-nav-btn" onClick={goNext}>
            التالي
          </button>
        )}
      </footer>
    </div>
  )
}

function QuizResult({ result, title, navigate }) {
  const emoji = result.percentage >= 80 ? '🌟' : result.percentage >= 50 ? '👍' : '💪'
  const message =
    result.percentage >= 80
      ? 'أحسنت! أداء ممتاز'
      : result.percentage >= 50
        ? 'جيد! حاول أكثر'
        : 'لا بأس! راجع الشرح'

  return (
    <div className="result-container">
      <div className="result-hero glass">
        <span className="result-emoji">{emoji}</span>
        <h1 className="result-title">{title}</h1>
        <p className="result-message">{message}</p>

        <div className="result-score-ring">
          <svg viewBox="0 0 120 120" className="score-svg">
            <circle cx="60" cy="60" r="50" className="ring-bg" />
            <circle
              cx="60" cy="60" r="50"
              className="ring-fill"
              style={{
                strokeDasharray: `${(result.percentage / 100) * 314} 314`,
              }}
            />
          </svg>
          <div className="score-text">
            <span className="score-number">{result.percentage}%</span>
            <span className="score-fraction">{result.score}/{result.total_questions}</span>
          </div>
        </div>
      </div>

      <div className="result-details">
        <h2 className="details-title">مراجعة الإجابات</h2>

        {result.details.map((d, i) => (
          <div key={i} className={`detail-card glass ${d.is_correct ? 'correct' : 'wrong'}`}>
            <div className="detail-header">
              <span className="detail-number">سؤال {i + 1}</span>
              <span className={`detail-badge ${d.is_correct ? 'badge-correct' : 'badge-wrong'}`}>
                {d.is_correct ? 'صحيح' : 'خطأ'}
              </span>
            </div>

            <p className="detail-question">{d.question_text}</p>

            <div className="detail-answers">
              <div className={`detail-answer ${d.is_correct ? 'answer-correct' : 'answer-wrong'}`}>
                <span className="answer-label">إجابتك:</span>
                <span>{d.selected_choice}</span>
              </div>

              {!d.is_correct && (
                <div className="detail-answer answer-correct">
                  <span className="answer-label">الإجابة الصحيحة:</span>
                  <span>{d.correct_choice}</span>
                </div>
              )}
            </div>

            <div className="detail-explanation">
              <span className="explain-label">الشرح:</span>
              <p>{d.explanation}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="result-footer">
        <button
          className="btn-primary btn-lg"
          onClick={() => navigate('/student/dashboard')}
        >
          العودة للرئيسية
        </button>
      </div>
    </div>
  )
}

export default Quiz
