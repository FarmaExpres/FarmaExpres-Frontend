# 03 - Reportes batch-aware + exportaciones

## Objetivo

Alinear reportes con contratos backend por lotes y mejorar consistencia visual/exportable.

## Cambios aplicados

- Refactor de consumo en servicios de reportes:
  - `frontend/src/reports/services/expiringReports.service.js`
  - `frontend/src/reports/services/lowStockReports.service.js`
  - `frontend/src/reports/services/byUserReports.service.js`
- Ajustes de secciones visuales:
  - `frontend/src/reports/components/ExpiringReportSection.jsx`
  - `frontend/src/reports/components/LowStockReportSection.jsx`
  - `frontend/src/reports/components/ByUserReportSection.jsx`
  - `frontend/src/reports/components/MovementsReportSection.jsx`
- Ajustes para tabla de movimientos/reportes con mejor distribución horizontal.

## Reglas funcionales integradas

- Separación conceptual:
  - stock operativo del producto
  - stock de lote mostrado en filas de alerta/reporte
- Mejor mapeo de lote y vencimiento en reportes por expiración.
- Mejoras para que los filtros de bajo stock (todos/crítico/alerta) queden consistentes con backend.

## Export Excel

- Ajustes en constructor de export:
  - `frontend/src/reports/utils/export/reportExport.builders.js`
- Mejoras de columnas y ancho para legibilidad.
- Conservación de detalle por lote en reportes de movimientos cuando aplica.

## Nota

La exportación Excel sigue siendo responsabilidad del frontend, usando los datos provenientes de endpoints backend.
