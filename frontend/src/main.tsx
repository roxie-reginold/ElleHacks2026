import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './context/UserContext'
import { ClassSessionProvider } from './context/ClassSessionContext'
import { TeacherDashboardGuard } from './components/TeacherDashboardGuard'
import TeacherDashboard from './pages/TeacherDashboard'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope)
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <ClassSessionProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route
              path="/teacher-dashboard"
              element={
                <TeacherDashboardGuard>
                  <TeacherDashboard />
                </TeacherDashboardGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClassSessionProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
)
