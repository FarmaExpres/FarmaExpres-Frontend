import Sidebar from './Sidebar'

const AppLayout = ({ role, user, activeModule, onNavigate, onLogout, children }) => {
  return (
    <div className="min-h-screen bg-[#f0f2f7] md:flex md:h-screen md:overflow-hidden">
      <Sidebar
        role={role}
        user={user}
        activeModule={activeModule}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 md:overflow-y-auto">
        <div className="min-h-screen p-3 sm:p-4 md:min-h-full md:p-6">
          <div className="fe-content-shell min-h-[calc(100vh-1.5rem)]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AppLayout
