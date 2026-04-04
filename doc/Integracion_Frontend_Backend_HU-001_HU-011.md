# Plan de integracion Frontend - Backend para HUs 001 a 014

## Contexto

Actualmente el frontend de FarmaExpres consume servicios del backend a traves de rutas centralizadas bajo `/api/...`, en linea con la estrategia de API Gateway.

Despues de revisar el estado real del backend y contrastarlo con el consumo del frontend, se actualiza este documento para dejar trazabilidad de:

- lo que el frontend ya consume de forma oficial desde backend
- lo que ya fue migrado recientemente para dejar de depender de logica local
- lo que todavia sigue resolviendose temporalmente en cliente
- lo que falta integrar en frontend aunque el backend ya tenga el metodo disponible

Este documento reemplaza el estado anterior de planeacion y deja el estado actual real de integracion.

---

## Objetivo

Alinear el frontend con los endpoints ya implementados en backend, priorizando el consumo directo de metodos oficiales cuando ya exista contrato backend estable y dejando temporalmente en frontend solo la logica estrictamente visual o los casos cuyo endpoint aun no ha sido integrado.

---

## Estado actual de integracion

### Ya consumido por el frontend

- `POST /api/auth/login`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}/update`
- `PUT /api/users/{id}/password`
- `PUT /api/users/{id}/block`
- `PUT /api/users/{id}/unlock`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/{id}`
- `DELETE /api/products/{id}`
- `GET /api/movements`
- `GET /api/movements/entrance`
- `GET /api/movements/exit`
- `GET /api/movements/updated`
- `GET /api/products/active-table`
- `GET /api/products/active-summary`
- `GET /api/alerts/expiring-report`
- `GET /api/products/low-stock-report`
- `GET /api/products/low-stock-report/critical`
- `GET /api/products/low-stock-report/alert`
- `GET /api/movements/report/users-activity`

### Ya implementado en backend y ya integrado recientemente en frontend

#### HU-012 - Proximos a vencer

El frontend ya fue ajustado para consumir:

- `GET /api/alerts/expiring-report`

Con este cambio:

- se elimino la estrategia anterior de unir localmente `expired`, `expiring-soon`, `expiring-half-month` y `expiring-month`
- la fuente oficial del reporte paso a ser el endpoint consolidado de backend
- el frontend sigue manejando solo la presentacion visual de columnas, chips, paginacion y textos visibles

#### HU-013 - Bajo stock por niveles

El frontend ya fue ajustado para consumir:

- `GET /api/products/low-stock-report`
- `GET /api/products/low-stock-report/critical`
- `GET /api/products/low-stock-report/alert`

Con este cambio:

- el frontend ya no clasifica oficialmente `critico` y `alerta` a partir del endpoint general de alertas
- el backend pasa a ser la fuente principal de los filtros por nivel
- el frontend reutiliza los campos `coverageLabel`, `status` y `suggestion` cuando vienen informados por backend

#### HU-014 - Actividad por usuario

El frontend ya fue ajustado para consumir:

- `GET /api/movements/report/users-activity`

Con este cambio:

- el frontend ya no construye el reporte por usuario agrupando localmente el historial de movimientos
- el backend pasa a ser la fuente oficial de `totalMovements`, `totalEntrances`, `totalExits` y `activityLevel`
- el frontend mantiene solo la logica visual de filtros de tabla, paginacion y badges

### Implementado en backend pero aun no consumido por el frontend

- `GET /status`
- `GET /api/alerts/low-stock`
- `GET /api/alerts/expired`
- `GET /api/alerts/out-of-stock`
- `GET /api/alerts/expiring-soon`
- `GET /api/alerts`
- `GET /api/movements/filter-by-user`
- `GET /api/movements/entrance`
- `GET /api/movements/exit`
- `GET /api/movements/updated`
- `GET /api/alerts/expiring-half-month`
- `GET /api/alerts/expiring-month`

### Funcionalidades que aun dependen de logica local o integracion incompleta

- movimientos filtrados por rango de fechas
- movimientos filtrados por usuario desde la vista de movimientos
- pestañas de movimientos por categoria consumiendo endpoints dedicados
- consumo explicito del endpoint `/status` desde frontend si se desea observabilidad visual
- consumo del endpoint consolidado `/api/alerts` si luego se decide usar centro de alertas unificado

---

## Que sigue haciendose en frontend aunque ya exista consumo backend

Los siguientes puntos no significan que el frontend siga resolviendo el reporte localmente. Significan que el backend ya entrega la fuente oficial de datos, pero la capa visual sigue siendo responsabilidad del cliente:

- normalizacion de fechas para mostrar `yyyy-mm-dd`
- calculo o reutilizacion de textos visibles como `VENCE HOY` o `13 dia(s)`
- paginacion
- filtros visuales por pestana o chip
- estilos, badges, colores y orden visual
- exportacion a Excel adaptada al formato esperado por UI

Esto es correcto y no contradice la integracion con backend.

---

## Funcionalidades que siguen temporalmente en frontend

### 1. Movimientos por fecha

Situacion actual:

- el frontend necesita consultar movimientos desde una fecha hasta otra fecha
- no existe aun un endpoint especializado confirmado para rango de fechas como contrato final de consumo

Decision temporal:

- el frontend seguira aplicando este filtro localmente sobre el listado de movimientos disponible

### 2. Movimientos por usuario en la vista de historial

Situacion actual:

- backend ya dispone de `GET /api/movements/filter-by-user`
- el frontend aun no ha integrado ese endpoint en la vista operativa de movimientos

Decision temporal:

- mientras se integra el metodo especializado, la vista de movimientos puede seguir filtrando localmente por usuario

### 3. Movimientos por categoria

Situacion actual:

- backend ya dispone de:
  - `GET /api/movements/entrance`
  - `GET /api/movements/exit`
  - `GET /api/movements/updated`
- el frontend aun no ha migrado completamente esas pestañas para depender solo de esos metodos como fuente oficial

Decision temporal:

- mientras se completa esa integracion, el frontend puede seguir mezclando consulta general y segmentacion visual local

---

## Lo que falta para que el frontend deje de hacerlo localmente

### Pendiente de integrar en frontend aunque backend ya lo tiene

- integrar `GET /api/movements/filter-by-user` en la vista de historial de movimientos
- integrar `GET /api/movements/entrance` en la pestaña de entradas
- integrar `GET /api/movements/exit` en la pestaña de salidas
- integrar `GET /api/movements/updated` en la pestaña de ajustes
- integrar `GET /status` si se quiere una validacion visual de estado del servicio de alertas
- decidir si el frontend usara o no `GET /api/alerts` como centro consolidado de alertas

### Pendiente de soporte backend real

- endpoint oficial para movimientos por rango de fechas

Mientras ese metodo no exista como contrato estable, esa necesidad seguira resolviendose temporalmente en frontend.

---

## Resumen por HU

### HUs ya integradas en frontend

- `HU-009` resumen de inventario activo
- `HU-010` tabla de inventario activo
- `HU-012` reporte consolidado de proximos a vencer
- `HU-013` reporte de bajo stock por niveles
- `HU-014` reporte de actividad de usuarios

### HUs backend listas pero aun pendientes de consumo directo en frontend

- `HU-007` movimientos por categoria
- `HU-008` alertas por rango de vencimiento
- `HU-011` filtro de movimientos por usuario en la vista de historial

### HU que sigue faltando realmente a nivel backend o contrato final

- filtro de movimientos por fecha

---

## Orden de trabajo sugerido desde este punto

1. integrar `HU-011` en la vista de movimientos
2. integrar `HU-007` en las pestañas de entradas, salidas y ajustes
3. decidir si se incorpora `HU-006` como centro de alertas unificado
4. implementar en backend el filtro de movimientos por fecha para eliminar esa ultima dependencia local

---

## Nota final

El criterio actualizado de integracion queda asi:

- el frontend ya consume backend en reportes de vencimientos, bajo stock y actividad por usuario
- el frontend ya consume backend para inventario activo y resumen de inventario
- lo que sigue faltando no esta en esos reportes, sino principalmente en el modulo de movimientos
- cuando un endpoint backend ya existe, el objetivo es que el frontend deje de calcular esa misma necesidad como fuente principal y conserve solo la logica visual de presentacion
