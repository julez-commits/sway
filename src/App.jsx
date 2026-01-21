import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AskPage from './pages/AskPage'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
