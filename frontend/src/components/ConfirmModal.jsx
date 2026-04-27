import { useEffect } from 'react'
import './ConfirmModal.css'

export default function ConfirmModal({ title, message, confirmText, cancelText, onConfirm, onCancel, danger }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-icon ${danger ? 'danger' : 'warning'}`}>
          {danger ? '!' : '?'}
        </div>
        <h3 className="confirm-title">{title || 'تأكيد'}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelText || 'إلغاء'}
          </button>
          <button
            className={`confirm-btn-ok ${danger ? 'confirm-btn-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmText || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}
