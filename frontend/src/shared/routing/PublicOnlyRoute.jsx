import { Navigate, Outlet } from 'react-router-dom'

const PublicOnlyRoute = ({ isAuthenticated }) => {
  if (isAuthenticated) {
    return <Navigate to="/medicines" replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
