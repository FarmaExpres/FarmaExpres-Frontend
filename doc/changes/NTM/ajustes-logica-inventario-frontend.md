# Ajustes de lógica de inventario en frontend

## 1. Información general

- **Rama:** `HU-16-NTM-dev`
- **Componente principal:** `frontend`
- **Fecha de ajuste:** 2026-05-10
- **Objetivo:** corregir inconsistencias de lógica operativa antes de iniciar el siguiente alcance funcional.

## 2. Contexto

Durante la revisión funcional previa se detectaron comportamientos que podían mostrar datos incorrectos o permitir flujos no deseados en inventario, entradas, salidas, alertas, reportes y control de stock.

Los cambios se enfocaron en reforzar reglas ya esperadas del sistema:

- no permitir entradas con lotes vencidos o con vencimiento del día actual;
- evitar salidas por encima del stock disponible;
- calcular bajo stock y agotados por medicamento, no por lote;
- mostrar vencidos y próximos a vencer por lote, pero solo cuando el lote tenga unidades disponibles;
- mantener actualizadas las pantallas dependientes del inventario después de una entrada o salida.

## 3. Cambios implementados

### 3.1 Entradas de inventario

- Se eliminó el subtítulo informativo de la tarjeta `Nueva entrada`.
- Se cambió la regla de fecha de vencimiento:
  - ya no se permite fecha anterior al día actual;
  - ya no se permite fecha igual al día actual;
  - la fecha mínima permitida es el día siguiente.
- Se agregó mensaje visible de error cuando la fecha seleccionada es inválida.
- Se agregó manejo de validación nativa del navegador con `onInvalid`, para evitar que el formulario parezca no hacer nada cuando el `input type="date"` bloquea el envío.
- Después de una entrada exitosa se dispara un evento global de inventario actualizado.

Archivo principal:

- `frontend/src/movements/pages/EntriesPage.jsx`

### 3.2 Creación de medicamentos

- Se alineó la validación de fecha de vencimiento con la regla de entradas:
  - no se permiten medicamentos con vencimiento de hoy;
  - no se permiten medicamentos vencidos;
  - la fecha mínima permitida es posterior al día actual.
- Se agregó mensaje visible cuando el navegador bloquea el campo de fecha por validación nativa.

Archivo principal:

- `frontend/src/medicines/components/MedicineWorkspaceForm.jsx`

### 3.3 Salidas de inventario

- Se eliminó el subtítulo informativo de la tarjeta `Nueva salida`.
- Se retiró la acción `Forzar salida` del modal de stock insuficiente.
- La salida queda bloqueada cuando la cantidad solicitada supera el stock disponible.
- El backend se mantiene como fuente definitiva ante conflictos de inventario.
- Después de una salida exitosa se dispara un evento global de inventario actualizado.

Archivo principal:

- `frontend/src/movements/pages/ExitsPage.jsx`

### 3.4 Evento global de inventario actualizado

- Se creó un evento compartido para avisar que el inventario cambió después de entradas o salidas.
- El evento actualiza la pestaña actual y también deja una marca en `localStorage` para sincronización entre pestañas.
- Las siguientes pantallas escuchan el evento y recargan sus datos:
  - `Centro de alertas`;
  - `Reportes`;
  - `Dashboard`;
  - `Control de stock`.

Archivos principales:

- `frontend/src/shared/events/inventory.events.js`
- `frontend/src/App.jsx`
- `frontend/src/alerts/pages/AlertsPage.jsx`
- `frontend/src/reports/pages/ReportsPage.jsx`
- `frontend/src/dashboard/pages/DashboardPage.jsx`
- `frontend/src/stock/pages/StockControlPage.jsx`

### 3.5 Control de stock

- Se corrigió la sugerencia de reposición.
- Antes se calculaba con una cobertura al doble del mínimo:

```text
mínimo * 2 - stock
```

- Ahora se calcula con reposición mínima operativa:

```text
mínimo - stock
```

- Ejemplo:
  - stock `0`;
  - mínimo `60`;
  - sugerencia anterior: `120`;
  - sugerencia corregida: `60`.
- Se evitó depender de una sugerencia textual antigua enviada por backend, para mantener consistencia visual en frontend.

Archivo principal:

- `frontend/src/stock/services/stock.service.js`

### 3.6 Alertas de bajo stock y agotados

- Se corrigió la lógica para que `Bajo stock` y `Agotados` se evalúen por medicamento/producto, no por lote.
- Si el backend entrega `operationalStock`, se usa como stock real del medicamento.
- Si el backend no entrega `operationalStock`, el frontend suma los lotes del mismo medicamento.
- Esto evita casos como:
  - un medicamento con dos lotes de `30` y mínimo `60` apareciendo dos veces como bajo stock;
  - un medicamento apareciendo como bajo stock por un lote antiguo aunque el stock operativo total ya alcance el mínimo.

Archivos principales:

- `frontend/src/alerts/services/alerts.service.js`
- `frontend/src/alerts/utils/alertsFormatters.js`

### 3.7 Alertas de vencidos y próximos a vencer

- Se mantuvo la lógica por lote, porque la fecha de vencimiento pertenece al lote.
- Se agregó filtro para mostrar únicamente lotes con stock mayor a `0`.
- Esto evita alertas de lotes vencidos o próximos a vencer que ya no tienen unidades disponibles.

Regla final:

- `Bajo stock`: por medicamento.
- `Agotados`: por medicamento.
- `Vencidos`: por lote con stock disponible.
- `Próximos a vencer`: por lote con stock disponible.

Archivo principal:

- `frontend/src/alerts/services/alerts.service.js`

### 3.8 Reportes

- Se alineó el reporte de bajo stock con la nueva lógica por medicamento.
- Se corrigió la sugerencia de reposición en pantalla y en exportación Excel.
- Se cambió el stock mostrado en bajo stock para representar stock operativo del medicamento, no stock aislado por lote.
- Se alineó el reporte de próximos a vencer para excluir lotes con stock `0`.

Archivos principales:

- `frontend/src/reports/services/lowStockReports.service.js`
- `frontend/src/reports/components/LowStockReportSection.jsx`
- `frontend/src/reports/services/expiringReports.service.js`
- `frontend/src/reports/utils/export/reportExport.builders.js`

## 4. Validaciones ejecutadas

Se ejecutaron correctamente las validaciones mínimas del frontend:

```bash
npm run lint
npm run build
```

Resultado:

- `lint` sin errores.
- `build` exitoso.

## 5. Estado final esperado

Después de estos ajustes, el frontend debe comportarse así:

- No permite entradas ni creación de lotes con vencimiento de hoy o fechas vencidas.
- Muestra errores visibles cuando una operación no puede ejecutarse.
- No permite forzar salidas con stock insuficiente.
- Refresca vistas dependientes cuando cambia el inventario.
- No duplica medicamentos por lote en bajo stock o agotados.
- No muestra lotes vencidos o próximos si ya no tienen stock.
- Mantiene reportes y alertas alineados con las mismas reglas operativas.
