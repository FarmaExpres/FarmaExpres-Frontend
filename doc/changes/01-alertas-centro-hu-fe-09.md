# 01 - Centro de Alertas (HU-FE-09)

## Objetivo

Implementar y consolidar el Centro de Alertas con secciones operativas para inventario:

- Medicamentos Vencidos
- Próximos a Vencer
- Medicamentos con Bajo Stock
- Productos Agotados

## Cambios aplicados

- Creación/ajuste del módulo `frontend/src/alerts/` con estructura por secciones.
- Vista principal de alertas con resumen consolidado y conteo total.
- Secciones con comportamiento colapsable/expandible para mejorar usabilidad.
- Regla funcional: separar "Agotados" de "Bajo stock".
- Badge de alertas en sidebar sincronizado con total de alertas activas.
- Manejo de estados:
  - carga
  - vacío
  - error parcial / error total

## Integración backend

Consumo de endpoints batch-aware:

- `GET /api/alerts/expired-batches`
- `GET /api/alerts/expiring-batches`
- `GET /api/alerts/low-stock-batches`
- `GET /api/alerts/out-of-stock-batches`

## Evidencia QA

Documento QA asociado:

- `doc/HU-QA-FE-09 - Centro de Alertas.md`

Carpeta de imágenes:

- `doc/images/HU-FE-09/`
