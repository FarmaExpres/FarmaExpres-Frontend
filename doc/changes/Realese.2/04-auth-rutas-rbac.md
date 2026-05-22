# 04 - Auth, redirecciones por rol y RBAC frontend

## Objetivo

Corregir flujo de inicio de sesión, navegación inicial por rol y manejo de errores de autorización.

## Cambios aplicados

- Redirección por rol al iniciar sesión:
  - `ADMIN -> /medicines`
  - `AUDITOR -> /movements`
  - `FARMACEUTICO -> /alerts`
- Ajuste de rutas públicas/privadas para respetar la ruta por defecto del rol.
- Ajustes de fallback en `App.jsx` para evitar redirecciones inconsistentes.

## Archivos tocados

- `frontend/src/shared/constants/roles.js`
- `frontend/src/auth/pages/LoginPage.jsx`
- `frontend/src/shared/routing/PublicOnlyRoute.jsx`
- `frontend/src/App.jsx`

## Manejo 401/403

- Ajuste del interceptor global:
  - solo `401` fuerza cierre de sesión y redirección a login.
  - `403` no cierra sesión, se muestra como error de permisos.
- Mensaje de permiso actualizado para evitar texto engañoso de "solo Administrador".

Archivo:

- `frontend/src/shared/services/api.service.js`

## Resultado esperado

- Un usuario con sesión válida no es expulsado por un `403`.
- El control de acceso por rol se mantiene en frontend por módulo/ruta.
