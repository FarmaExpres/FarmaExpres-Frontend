# 02 - Medicamentos (Workspace completo + FEFO)

## Objetivo

Pasar de modales de creación/edición a vistas dedicadas de pantalla completa y alinear campos de inventario con el modelo por lotes (FEFO).

## Cambios aplicados

- Se implementaron páginas dedicadas:
  - `frontend/src/medicines/pages/MedicineCreatePage.jsx`
  - `frontend/src/medicines/pages/MedicineEditPage.jsx`
- Se creó formulario compartido por pasos:
  - `frontend/src/medicines/components/MedicineWorkspaceForm.jsx`
- Se agregaron configuraciones de opciones del formulario:
  - `frontend/src/medicines/config/`
- Se mantuvo estado/contexto al volver al listado de medicamentos.
- Se mejoró distribución visual para reducir espacios muertos y mejorar legibilidad.

## Reglas funcionales alineadas con backend

- En edición de medicamento, `stock` y `fecha de vencimiento` no se editan por PUT de producto.
- Stock y vencimiento operativo se gestionan por lotes/movimientos.
- Se muestra referencia de próximo lote a vencer de forma informativa en edición.

## Ajustes de datos y catálogo

- Normalización de campos seleccionables (unidad de medida, forma farmacéutica, vía, temperatura).
- Limpieza de etiquetas técnicas/formatos no amigables (por ejemplo valores internos tipo `NO_APLICA`).
- Mejoras de mapeo para que opciones backend lleguen correctamente al formulario.

## Servicios tocados

- `frontend/src/medicines/services/medicines.service.js`
- `frontend/src/medicines/pages/MedicinesPage.jsx`
- `frontend/src/medicines/components/MedicinesTable.jsx`
