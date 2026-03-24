import { useCallback, useEffect, useState } from 'react'
import UsersTable from '../components/UsersTable'
import UserModal from '../components/UserModal'
import UserEditModal from '../components/UserEditModal'
import UserPasswordModal from '../components/UserPasswordModal'
import { isAdmin } from '../../shared/auth/session'
import { changeUserPassword, getUsers, toggleUserStatus, updateUser } from '../services/users.service'
import { normalizeRole, ROLES } from '../../shared/constants/roles'

const normalizeUser = (user) => ({
  id: user?.id,
  nombre: user?.nombre || '',
  email: user?.email || '',
  rol: user?.rol || '',
  estado: user?.estado || 'ACTIVO'
})

const UsersPage = ({ role, currentUserEmail = '' }) => {
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [openPasswordModal, setOpenPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [processingUserId, setProcessingUserId] = useState(null)
  const [passwordError, setPasswordError] = useState('')
  const [feedback, setFeedback] = useState(null)

  const isAdministrator = isAdmin(role)
  const normalizedCurrentUserEmail = String(currentUserEmail || '').trim().toLowerCase()

  useEffect(() => {
    if (!feedback) return undefined

    const timeoutId = setTimeout(() => {
      setFeedback(null)
    }, 3500)

    return () => clearTimeout(timeoutId)
  }, [feedback])

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      setIsLoadingUsers(true)

      try {
        const usersData = await getUsers()
        if (isMounted) setUsers(usersData || [])
      } catch (error) {
        const endpointNotAvailable = error.status === 404 || error.status === 405

        if (endpointNotAvailable) {
          if (isMounted) {
            setFeedback({
              type: 'error',
              message: 'El listado de usuarios aún no está habilitado en backend. La creación sí está disponible.'
            })
          }
        } else if (isMounted) {
          setFeedback({
            type: 'error',
            message: error.message || 'No se pudo cargar la lista de usuarios.'
          })
        }
      } finally {
        if (isMounted) setIsLoadingUsers(false)
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenCreate = () => {
    if (!isAdministrator) {
      setFeedback({
        type: 'error',
        message: 'No tienes permisos para crear usuarios.'
      })
      return
    }

    setFeedback(null)
    setOpenCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false)
  }

  const handleOpenEdit = (user) => {
    if (!isAdministrator) {
      setFeedback({ type: 'error', message: 'No tienes permisos para editar usuarios.' })
      return
    }

    setSelectedUser(user)
    setOpenEditModal(true)
  }

  const handleCloseEditModal = () => {
    setOpenEditModal(false)
    setSelectedUser(null)
  }

  const handleOpenPassword = (user) => {
    if (!isAdministrator) {
      setFeedback({ type: 'error', message: 'No tienes permisos para cambiar contraseñas.' })
      return
    }

    setSelectedUser(user)
    setPasswordError('')
    setOpenPasswordModal(true)
  }

  const handleClosePasswordModal = () => {
    setOpenPasswordModal(false)
    setSelectedUser(null)
    setPasswordError('')
  }

  const handleCreateSuccess = useCallback((createdUser) => {
    const normalizedCreatedUser = normalizeUser(createdUser)

    setUsers((current) => {
      const exists = current.some((item) => item.id && item.id === normalizedCreatedUser.id)
      if (exists) return current
      return [normalizedCreatedUser, ...current]
    })

    setOpenCreateModal(false)
    setFeedback({ type: 'success', message: 'Usuario creado correctamente.' })
  }, [])

  const handleError = useCallback((message) => {
    setFeedback({ type: 'error', message })
  }, [])

  const handleEditSubmit = async (form) => {
    if (!selectedUser?.id) return
    setIsSubmittingEdit(true)

    try {
      const updatedUser = await updateUser({
        id: selectedUser.id,
        fullName: form.fullName,
        email: form.email,
        role: form.role
      })

      setUsers((current) => current.map((item) => (
        item.id === selectedUser.id
          ? normalizeUser({ ...item, ...updatedUser })
          : item
      )))

      setFeedback({ type: 'success', message: 'Usuario actualizado correctamente.' })
      handleCloseEditModal()
    } catch (error) {
      if (error.status === 404 || error.status === 405) {
        setFeedback({ type: 'error', message: 'La edición de usuario aún no está habilitada en backend.' })
      } else if (error.isDuplicateEmail) {
        setFeedback({ type: 'error', message: 'El correo ya está registrado. Usa uno diferente.' })
      } else {
        setFeedback({ type: 'error', message: error.message || 'No se pudo actualizar el usuario.' })
      }
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleToggleUserStatus = async (user) => {
    if (!isAdministrator || !user?.id) return

    const isCurrentUser = String(user.email || '').trim().toLowerCase() === normalizedCurrentUserEmail
    const isCurrentAdmin = isCurrentUser && normalizeRole(user.rol) === ROLES.ADMIN

    if (isCurrentAdmin) {
      setFeedback({ type: 'error', message: 'El administrador principal no puede autodesactivarse.' })
      return
    }

    const shouldActivate = String(user.estado || 'ACTIVO').toUpperCase() !== 'ACTIVO'
    setProcessingUserId(user.id)

    try {
      const updatedUser = await toggleUserStatus({ id: user.id, isActive: shouldActivate })
      const nextState = normalizeUser({ ...user, ...updatedUser, estado: updatedUser?.estado || (shouldActivate ? 'ACTIVO' : 'INACTIVO') })

      setUsers((current) => current.map((item) => (item.id === user.id ? nextState : item)))
      setFeedback({
        type: 'success',
        message: shouldActivate ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.'
      })
    } catch (error) {
      if (error.status === 404 || error.status === 405) {
        setFeedback({ type: 'error', message: 'La activación/desactivación aún no está habilitada en backend.' })
      } else {
        setFeedback({ type: 'error', message: error.message || 'No se pudo actualizar el estado del usuario.' })
      }
    } finally {
      setProcessingUserId(null)
    }
  }

  const handlePasswordSubmit = async ({ currentPassword, newPassword }) => {
    if (!selectedUser?.id) return

    setIsSubmittingPassword(true)
    setPasswordError('')

    try {
      await changeUserPassword({
        id: selectedUser.id,
        currentPassword,
        newPassword
      })

      handleClosePasswordModal()
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente.' })
    } catch (error) {
      if (error?.isNotFound) {
        setPasswordError('El usuario no existe o fue eliminado.')
        return
      }

      if (error?.isForbidden) {
        setPasswordError('No tienes permisos para cambiar contraseñas. Se requiere rol Administrador.')
        return
      }

      if (error?.status === 400) {
        setPasswordError(error?.rawMessage || 'La contraseña actual es incorrecta o la nueva no cumple las reglas.')
        return
      }

      setPasswordError(error?.message || 'No se pudo actualizar la contraseña. Intenta nuevamente.')
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="fe-section-title">Gestión de Usuarios</h1>
        </div>

        {isAdministrator && (
          <button
            onClick={handleOpenCreate}
            className="fe-btn-primary"
          >
            + Nuevo Usuario
          </button>
        )}
      </div>

      {!isAdministrator && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta sección es solo de consulta. Solo un usuario con rol Administrador puede crear, editar, cambiar contraseña y activar/desactivar usuarios.
        </div>
      )}

      {feedback && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-100 text-green-700'
              : 'border-red-200 bg-red-100 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <UsersTable
        users={users}
        isLoading={isLoadingUsers}
        isAdministrator={isAdministrator}
        currentUserEmail={normalizedCurrentUserEmail}
        onEdit={handleOpenEdit}
        onChangePassword={handleOpenPassword}
        onToggleStatus={handleToggleUserStatus}
        isProcessingId={processingUserId}
      />

      <UserModal
        isOpen={openCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
        onError={handleError}
        existingEmails={users.map((user) => user.email)}
      />

      <UserEditModal
        key={`edit-${selectedUser?.id || 'none'}-${openEditModal ? 'open' : 'closed'}`}
        isOpen={openEditModal}
        onClose={handleCloseEditModal}
        user={selectedUser}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmittingEdit}
        existingEmails={users.map((user) => user.email)}
      />

      <UserPasswordModal
        key={`password-${selectedUser?.id || 'none'}-${openPasswordModal ? 'open' : 'closed'}`}
        isOpen={openPasswordModal}
        onClose={handleClosePasswordModal}
        user={selectedUser}
        onSubmit={handlePasswordSubmit}
        isSubmitting={isSubmittingPassword}
        errorMessage={passwordError}
      />
    </div>
  )
}

export default UsersPage
