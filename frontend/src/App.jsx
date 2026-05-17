import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AppLayout from './layout/components/AppLayout'
import MedicinesPage from './medicines/pages/MedicinesPage'
import MedicineCreatePage from './medicines/pages/MedicineCreatePage'
import MedicineEditPage from './medicines/pages/MedicineEditPage'
import EntriesPage from './movements/pages/EntriesPage'
import ExitsPage from './movements/pages/ExitsPage'
import MovementsPage from './movements/pages/MovementsPage'
import UsersPage from './users/pages/UsersPage'
import ReportsPage from './reports/pages/ReportsPage'
import AlertsPage from './alerts/pages/AlertsPage'
import { getAlertsCenterData } from './alerts/services/alerts.service'
import DashboardPage from './dashboard/pages/DashboardPage'
import StockControlPage from './stock/pages/StockControlPage'
import AuditPage from './audit/pages/AuditPage'
import LoginPage from './auth/pages/LoginPage'
import ProtectedRoute from './shared/routing/ProtectedRoute'
import PublicOnlyRoute from './shared/routing/PublicOnlyRoute'
import { clearSession, getSession, isAdmin } from './shared/auth/session'
import {
  INVENTORY_CHANGED_EVENT,
  INVENTORY_CHANGED_STORAGE_KEY
} from './shared/events/inventory.events'
import {
  canAccessAudit,
  canAccessAlerts,
  canAccessEntries,
  canAccessExits,
  canAccessMedicines,
  canAccessMovements,
  canAccessReports,
  canAccessStockControl,
  canManageMedicines,
  getDefaultRouteByRole
} from './shared/constants/roles'

const LAST_MEDICINES_ROUTE_STORAGE_KEY = 'medicines:last-route'

const AppShell = ({ session, activeModule, routeKey, onNavigate, onLogout, alertsCount, content }) => (
  <AppLayout
    role={session.role}
    user={session.user}
    activeModule={activeModule}
    alertsCount={alertsCount}
    onNavigate={onNavigate}
    onLogout={onLogout}
  >
    <div key={`${activeModule}:${routeKey}`} className="fe-route-transition">
      {content}
    </div>
  </AppLayout>
)

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(() => getSession())
  const defaultRoute = getDefaultRouteByRole(session.role)
  const canAccessMedicinesModule = canAccessMedicines(session.role)
  const canAccessEntriesModule = canAccessEntries(session.role)
  const canAccessExitsModule = canAccessExits(session.role)
  const canAccessMovementsModule = canAccessMovements(session.role)
  const canAccessReportsModule = canAccessReports(session.role)
  const canAccessAlertsModule = canAccessAlerts(session.role)
  const canAccessStockControlModule = canAccessStockControl(session.role)
  const canAccessAuditModule = canAccessAudit(session.role)
  const canManageMedicinesModule = canManageMedicines(session.role)
  const [alertsCount, setAlertsCount] = useState(0)

  const refreshSession = () => setSession(getSession())

  useEffect(() => {
    if (!location.pathname.startsWith('/medicines')) return
    try {
      sessionStorage.setItem(LAST_MEDICINES_ROUTE_STORAGE_KEY, location.pathname)
    } catch {
      // no-op
    }
  }, [location.pathname])

  const handleNavigate = (moduleKey) => {
    if (moduleKey === 'dashboard') {
      navigate('/dashboard')
      return
    }

    if (moduleKey === 'users' && !isAdmin(session.role)) return

    if (moduleKey === 'users') {
      navigate('/users')
      return
    }

    if (moduleKey === 'movements') {
      if (!canAccessMovementsModule) return
      navigate('/movements')
      return
    }

    if (moduleKey === 'entries') {
      if (!canAccessEntriesModule) return
      navigate('/entradas')
      return
    }

    if (moduleKey === 'exits') {
      if (!canAccessExitsModule) return
      navigate('/salidas')
      return
    }

    if (moduleKey === 'reports') {
      if (!canAccessReportsModule) return
      navigate('/reports')
      return
    }

    if (moduleKey === 'alerts') {
      if (!canAccessAlertsModule) return
      navigate('/alerts')
      return
    }

    if (moduleKey === 'stock') {
      if (!canAccessStockControlModule) return
      navigate('/stock')
      return
    }

    if (moduleKey === 'audit') {
      if (!canAccessAuditModule) return
      navigate('/audit')
      return
    }

    try {
      const lastMedicinesRoute = String(sessionStorage.getItem(LAST_MEDICINES_ROUTE_STORAGE_KEY) || '').trim()
      if (lastMedicinesRoute.startsWith('/medicines')) {
        navigate(lastMedicinesRoute)
        return
      }
    } catch {
      // no-op
    }

    navigate('/medicines')
  }

  const handleLogout = () => {
    clearSession()
    setAlertsCount(0)
    refreshSession()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    let isMounted = true
    let refreshIntervalId = null

    const fetchAlertsCount = async () => {
      if (!session.isAuthenticated || !canAccessAlertsModule) {
        if (isMounted) setAlertsCount(0)
        return
      }

      try {
        const alertsData = await getAlertsCenterData()
        if (!isMounted) return

        const totalCount =
          (alertsData?.expired?.length || 0) +
          (alertsData?.expiringSoon?.length || 0) +
          (alertsData?.lowStock?.length || 0) +
          (alertsData?.outOfStock?.length || 0)

        setAlertsCount(totalCount)
      } catch {
        if (isMounted) setAlertsCount(0)
      }
    }

    fetchAlertsCount()

    const handleInventoryChanged = () => {
      fetchAlertsCount()
    }

    const handleStorage = (event) => {
      if (event.key === INVENTORY_CHANGED_STORAGE_KEY) fetchAlertsCount()
    }

    window.addEventListener(INVENTORY_CHANGED_EVENT, handleInventoryChanged)
    window.addEventListener('storage', handleStorage)

    if (session.isAuthenticated && canAccessAlertsModule) {
      refreshIntervalId = window.setInterval(fetchAlertsCount, 60000)
    }

    return () => {
      isMounted = false
      window.removeEventListener(INVENTORY_CHANGED_EVENT, handleInventoryChanged)
      window.removeEventListener('storage', handleStorage)
      if (refreshIntervalId) window.clearInterval(refreshIntervalId)
    }
  }, [session.isAuthenticated, session.role, canAccessAlertsModule])

  return (
    <Routes>
      <Route element={<PublicOnlyRoute isAuthenticated={session.isAuthenticated} />}>
        <Route path="/login" element={<LoginPage onLoginSuccess={refreshSession} />} />
      </Route>

      <Route element={<ProtectedRoute isAuthenticated={session.isAuthenticated} />}>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route
          path="/dashboard"
          element={(
            <AppShell
              session={session}
              activeModule="dashboard"
              routeKey={location.key}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              alertsCount={alertsCount}
              content={<DashboardPage session={session} />}
            />
          )}
        />
        <Route
          path="/medicines"
          element={canAccessMedicinesModule
            ? (
              <AppShell
                session={session}
                activeModule="medicines"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<MedicinesPage role={session.role} />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/medicines/new"
          element={canManageMedicinesModule
            ? (
              <AppShell
                session={session}
                activeModule="medicines"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<MedicineCreatePage />}
              />
              )
            : <Navigate to="/medicines" replace />}
        />
        <Route
          path="/medicines/:medicineId/edit"
          element={canManageMedicinesModule
            ? (
              <AppShell
                session={session}
                activeModule="medicines"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<MedicineEditPage />}
              />
              )
            : <Navigate to="/medicines" replace />}
        />
        <Route
          path="/users"
          element={isAdmin(session.role)
            ? (
              <AppShell
                session={session}
                activeModule="users"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<UsersPage role={session.role} currentUserEmail={session.user.email} />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/entries"
          element={canAccessEntriesModule
            ? (
              <AppShell
                session={session}
                activeModule="entries"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<EntriesPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/entradas"
          element={<Navigate to="/entries" replace />}
        />
        <Route
          path="/exits"
          element={canAccessExitsModule
            ? (
              <AppShell
                session={session}
                activeModule="exits"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<ExitsPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/salidas"
          element={<Navigate to="/exits" replace />}
        />
        <Route
          path="/movements"
          element={canAccessMovementsModule
            ? (
              <AppShell
                session={session}
                activeModule="movements"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<MovementsPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/reports"
          element={canAccessReportsModule
            ? (
              <AppShell
                session={session}
                activeModule="reports"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<ReportsPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/alerts"
          element={canAccessAlertsModule
            ? (
              <AppShell
                session={session}
                activeModule="alerts"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<AlertsPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/stock"
          element={canAccessStockControlModule
            ? (
              <AppShell
                session={session}
                activeModule="stock"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<StockControlPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/audit"
          element={canAccessAuditModule
            ? (
              <AppShell
                session={session}
                activeModule="audit"
                routeKey={location.key}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                alertsCount={alertsCount}
                content={<AuditPage />}
              />
              )
            : <Navigate to={defaultRoute} replace />}
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to={session.isAuthenticated ? defaultRoute : '/login'} replace />}
      />
    </Routes>
  )
}

export default App
