import { useMemo, useState } from 'react'
import AppLayout from './layout/components/AppLayout'
import MedicinesPage from './medicines/pages/MedicinesPage'
import UsersPage from './users/pages/UsersPage'
import { clearSession, getSession, isAdmin } from './shared/auth/session'

function App() {
  const session = useMemo(() => getSession(), [])
  const [activeModule, setActiveModule] = useState('medicines')

  const handleNavigate = (moduleKey) => {
    if (moduleKey === 'users' && !isAdmin(session.role)) return
    setActiveModule(moduleKey)
  }

  const handleLogout = () => {
    clearSession()
    window.location.reload()
  }

  return (
    <AppLayout
      role={session.role}
      user={session.user}
      activeModule={activeModule}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {activeModule === 'users' ? (
        <UsersPage role={session.role} currentUserEmail={session.user.email} />
      ) : (
        <MedicinesPage />
      )}
    </AppLayout>
  )
}

export default App
