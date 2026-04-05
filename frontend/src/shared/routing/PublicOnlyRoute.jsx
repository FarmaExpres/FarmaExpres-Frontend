import { Navigate, Outlet } from 'react-router-dom'
import { getSession } from '../auth/session'
import { getDefaultRouteByRole } from '../constants/roles'

const PublicOnlyRoute = ({ isAuthenticated }) => {
  if (isAuthenticated) {
    const session = getSession()
    return <Navigate to={getDefaultRouteByRole(session.role)} replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
