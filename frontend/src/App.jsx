import { Routes, Route, Navigate } from 'react-router-dom'
import TeacherLogin from './pages/TeacherLogin'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<TeacherLogin />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App
