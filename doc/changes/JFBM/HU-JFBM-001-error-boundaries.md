# HU-JFBM-001 - Error boundaries por modulo
Implementado
## 1. Informacion general

- **HU:** `HU-JFBM-001`
- **Nombre:** Error boundaries por modulo
- **Componente principal:** `frontend`
- **Componentes relacionados:** `layout`, `shared`
- **Estado:** Propuesto
- **Fecha:** 2026-05-06

## 2. Objetivo

Reducir el impacto de errores de render en pantallas complejas, evitando que la app quede en blanco y permitiendo la recuperacion del usuario sin reiniciar sesion.

## 3. Contexto del cambio

En modulos como Reportes, Alertas, Medicamentos y Usuarios se renderizan tablas, graficos y componentes con datos variables. Errores inesperados pueden romper el render completo. No existe una estrategia comun para aislar fallos por modulo.

## 4. Estado actual del frontend

- Las paginas no tienen aislamiento de errores por modulo.
- Un error en un componente puede romper toda la ruta.
- No hay fallback visual ni opcion de reintento.

Archivos relevantes:

- `frontend/src/layout/components/AppLayout.jsx`
- `frontend/src/shared/`
- `frontend/src/alerts/pages/`
- `frontend/src/reports/pages/`
- `frontend/src/medicines/pages/`
- `frontend/src/users/pages/`

## 5. Problema que resuelve esta HU

- Pantallas en blanco ante errores de render.
- Dificultad para recuperar la vista sin recargar toda la app.
- Experiencia inconsistente entre modulos.

## 6. Historia de usuario

Como usuario autenticado de FarmaExpres,
quiero que los errores en un modulo no rompan toda la aplicacion,
para continuar trabajando sin perder la navegacion.

## 7. Alcance funcional propuesto

- Agregar un error boundary global en el layout.
- Agregar boundaries por modulo (alertas, reportes, medicamentos, usuarios).
- Mostrar un fallback con opcion de reintento.
- Registrar errores en consola para diagnostico.

## 8. Fuera de alcance

- Envio de errores a un servicio externo de monitoreo.
- Cambios visuales mayores en el layout o el sistema de rutas.
- Refactor de componentes internos de cada modulo.

## 9. Cambios tecnicos esperados en frontend

### 9.1 Componente compartido

Crear `frontend/src/shared/components/ErrorBoundary.jsx` para:

- Capturar errores con `componentDidCatch`.
- Renderizar un fallback con opcion de reintento.

### 9.2 Layout global

Actualizar `frontend/src/layout/components/AppLayout.jsx` para:

- Envolver el `Outlet` con el boundary global.

### 9.3 Paginas de modulo

Actualizar paginas principales en:

- `frontend/src/alerts/pages/`
- `frontend/src/reports/pages/`
- `frontend/src/medicines/pages/`
- `frontend/src/users/pages/`

para envolver el contenido con un boundary local.

### 9.4 Cambios aplicados en codigo

Carpetas impactadas:

- `frontend/src/shared/components/`
- `frontend/src/layout/components/`
- `frontend/src/alerts/pages/`
- `frontend/src/reports/pages/`
- `frontend/src/medicines/pages/`
- `frontend/src/users/pages/`

Archivos modificados/creados:

- `frontend/src/shared/components/ErrorBoundary.jsx` (nuevo)
- `frontend/src/layout/components/AppLayout.jsx`
- `frontend/src/alerts/pages/AlertsPage.jsx`
- `frontend/src/reports/pages/ReportsPage.jsx`
- `frontend/src/medicines/pages/MedicinesPage.jsx`
- `frontend/src/users/pages/UsersPage.jsx`

## 10. Flujo esperado

1. El usuario navega a un modulo.
2. Ocurre un error en el render de un componente.
3. El boundary local muestra fallback.
4. El usuario puede reintentar sin salir de la app.

## 11. Criterios de aceptacion

- Las rutas principales no quedan en blanco ante errores de render.
- El fallback muestra una opcion de reintento.
- El boundary global protege rutas completas.
- Los boundaries locales no afectan otros modulos.

## 12. Casos de prueba sugeridos

- **CP-HU-JFBM-001-01:** Provocar error en Reportes y validar fallback.
- **CP-HU-JFBM-001-02:** Provocar error en Alertas y validar reintento.
- **CP-HU-JFBM-001-03:** Error en componente del layout y validar boundary global.

## 13. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Ocultar errores reales | Medio | Registrar en consola y mantener fallback visible |
| UX inconsistente | Bajo | Usar un componente compartido para el fallback |

## 14. Beneficios esperados

- Menos interrupciones en el trabajo diario.
- Recuperacion rapida ante errores de render.
- Experiencia uniforme entre modulos.

## 15. Resultado esperado

La aplicacion mantiene navegacion estable aun cuando fallen componentes locales, con fallback y reintento disponibles para el usuario.
