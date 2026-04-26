import './Toast.css'

function Toast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="toast-icon">
            {toast.type === 'error' && '✕'}
            {toast.type === 'success' && '✓'}
            {toast.type === 'info' && 'i'}
          </span>
          <span className="toast-message">{toast.message}</span>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  )
}

export default Toast
