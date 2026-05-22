// Start JFBM
import Sidebar from './Sidebar'
import ErrorBoundary from '../../shared/components/ErrorBoundary'

const AppLayout = ({ role, user, activeModule, alertsCount = 0, onNavigate, onLogout, children }) => {
  return (
    <div className="min-h-screen bg-[#f0f2f7] md:flex md:h-screen md:overflow-hidden">
      <Sidebar
        role={role}
        user={user}
        activeModule={activeModule}
        alertsCount={alertsCount}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 md:overflow-y-auto">
        <div className="min-h-screen p-3 sm:p-4 md:min-h-full md:px-2 md:py-3 lg:px-3 lg:py-4">
          <div className="fe-content-shell min-h-[calc(100vh-1.5rem)]">
            <ErrorBoundary title="Ocurrio un problema" message="No se pudo cargar esta seccion.">
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AppLayout
// End JFBM
