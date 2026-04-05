# 06 - Inventario para Farmacéutico en modo solo lectura

## Objetivo

Permitir que el rol **Farmacéutico** acceda al módulo **Inventario** para consulta, manteniendo restringidas las acciones de modificación.

## Cambios a implementar

- Habilitar navegación desde sidebar para que el ítem **Inventario** sea accesible al rol Farmacéutico.
- Permitir acceso del rol Farmacéutico a la ruta del listado de inventario.
- Reutilizar la vista de inventario existente en modo **solo lectura**.
- Ocultar o bloquear acciones de:
  - editar
  - actualizar
  - desactivar / eliminar
- Mantener protegidas las rutas de creación y edición para roles no autorizados.

## Qué se modificará

- `frontend/src/layout/components/Sidebar.jsx`
  - Activación del acceso interactivo al ítem **Inventario** para Farmacéutico.

- `frontend/src/App.jsx`
  - Ajuste de reglas de navegación y permisos de ruta para inventario.

- `frontend/src/medicines/pages/MedicinesPage.jsx`
  - Soporte para comportamiento de consulta por rol.

- `frontend/src/medicines/components/MedicinesTable.jsx`
  - Ocultamiento o deshabilitación de acciones de modificación para Farmacéutico.

- `frontend/src/shared/constants/roles.js`
  - Ajustes de permisos o reglas centralizadas por rol, si aplica.

## Implementación funcional

- El Farmacéutico podrá abrir el módulo **Inventario**.
- Verá la tabla con información operativa del inventario.
- No tendrá acceso visible ni funcional a modificar registros.
- El Administrador conservará el acceso completo actual.

## Riesgos controlados

- Evitar inconsistencia entre menú visible y acceso real al módulo.
- Evitar bypass por URL a rutas de modificación para el rol Farmacéutico.
- Mantener separación clara entre permisos de consulta y permisos de administración.

## Evidencia QA

Documento QA/HU asociado:

- `doc/HU-QA-FE-10 - Inventario solo lectura para Farmacéutico.md`

Carpeta sugerida de imágenes:

- `doc/images/HU-FE-10/`
