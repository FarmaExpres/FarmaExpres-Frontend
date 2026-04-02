import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppLayout from './layout/components/AppLayout'
import MedicinesPage from './medicines/pages/MedicinesPage'
import MovementsPage from './movements/pages/MovementsPage'
import UsersPage from './users/pages/UsersPage'
import ReportsPage from './reports/pages/ReportsPage'
import LoginPage from './auth/pages/LoginPage'
import ProtectedRoute from './shared/routing/ProtectedRoute'
import PublicOnlyRoute from './shared/routing/PublicOnlyRoute'
import { clearSession, getSession, isAdmin } from './shared/auth/session'
import { normalizeRole, ROLES } from './shared/constants/roles'

const AppShell = ({ session, activeModule, onNavigate, onLogout }) => (
  <AppLayout
    role={session.role}
    user={session.user}
    activeModule={activeModule}
    onNavigate={onNavigate}
    onLogout={onLogout}
  >
    <div key={activeModule} className="fe-route-transition">
      {activeModule === 'users'
        ? <UsersPage role={session.role} currentUserEmail={session.user.email} />
        : activeModule === 'movements'
          ? <MovementsPage />
          : activeModule === 'reports'
            ? <ReportsPage />
          : <MedicinesPage />}
    </div>
  </AppLayout>
)

function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => getSession())
  const canAccessStock = [ROLES.ADMIN, ROLES.AUDITOR].includes(normalizeRole(session.role))

  const refreshSession = () => setSession(getSession())

  const handleNavigate = (moduleKey) => {
    if (moduleKey === 'users' && !isAdmin(session.role)) return

    if (moduleKey === 'users') {
      navigate('/users')
      return
    }

    if (moduleKey === 'movements') {
      navigate('/movements')
      return
    }

    if (moduleKey === 'reports') {
      if (!canAccessStock) return
      navigate('/reports')
      return
    }

    navigate('/medicines')
  }

  const handleLogout = () => {
    clearSession()
    refreshSession()
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute isAuthenticated={session.isAuthenticated} />}>
        <Route path="/login" element={<LoginPage onLoginSuccess={refreshSession} />} />
      </Route>

      <Route element={<ProtectedRoute isAuthenticated={session.isAuthenticated} />}>
        <Route path="/" element={<Navigate to="/medicines" replace />} />
        <Route
          path="/medicines"
          element={(
            <AppShell
              session={session}
              activeModule="medicines"
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          )}
        />
        <Route
          path="/users"
          element={isAdmin(session.role)
            ? (
              <AppShell
                session={session}
                activeModule="users"
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
              )
            : <Navigate to="/medicines" replace />}
        />
        <Route
          path="/movements"
          element={(
            <AppShell
              session={session}
              activeModule="movements"
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          )}
        />
        <Route
          path="/reports"
          element={canAccessStock
            ? (
              <AppShell
                session={session}
                activeModule="reports"
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
              )
            : <Navigate to="/medicines" replace />}
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to={session.isAuthenticated ? '/medicines' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App
