# HU-JFBM-001-qa

## Resumen de cambios

- Se agrego un componente reutilizable `ErrorBoundary`.
- Se envolvio el contenido global en el layout con un boundary.
- Se agregaron boundaries por modulo en Alertas, Reportes, Medicamentos y Usuarios.

## Archivos y carpetas modificados

Carpetas:
- frontend/src/shared/components/
- frontend/src/layout/components/
- frontend/src/alerts/pages/
- frontend/src/reports/pages/
- frontend/src/medicines/pages/
- frontend/src/users/pages/

Archivos:
- frontend/src/shared/components/ErrorBoundary.jsx
- frontend/src/layout/components/AppLayout.jsx
- frontend/src/alerts/pages/AlertsPage.jsx
- frontend/src/reports/pages/ReportsPage.jsx
- frontend/src/medicines/pages/MedicinesPage.jsx
- frontend/src/users/pages/UsersPage.jsx

## Pruebas realizadas

- Manual: Forzar error de render en cada modulo y validar fallback con boton Reintentar.
- Resultado: OK
