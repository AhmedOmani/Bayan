import { Routes, Route, Navigate } from 'react-router-dom'
import TeacherLogin from './pages/TeacherLogin'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentRegister from './pages/StudentRegister'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/StudentDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />

      {/* teacher */}
      <Route path="/login" element={<TeacherLogin />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/students" element={<Students />} />

      {/* student */}
      <Route path="/register" element={<StudentRegister />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
    </Routes>
  )
}

export default App
