# HU-JVL-002 - Alineacion de salidas con stock operativo por lotes

## 1. Informacion general

- HU: `HU-JVL-002`
- Nombre: Alinear el modulo de salidas con el contrato actual de inventario activo y lotes
- Componente principal: `frontend`
- Componentes relacionados: `inventory-service`, `movements`, `medicines`
- Estado: Propuesto
- Rama de trabajo sugerida: `HU-JVL-002-dev`

## 2. Objetivo

Ajustar el frontend para que el modulo `Salidas` lea correctamente el stock disponible desde el contrato actual de inventario activo expuesto por backend.

El objetivo es evitar que la interfaz muestre `Stock actual: 0` cuando el medicamento si tiene unidades operativas disponibles, especialmente despues de los cambios backend relacionados con inventario por lotes, FEFO y respuestas con campos como `productId`, `productCode`, `operationalStock`, `availableStock` o `batchStock`.

## 3. Historia de usuario

Como usuario farmaceutico de `FarmaExpres`,  
quiero que el modulo de salidas muestre el stock real disponible del medicamento seleccionado,  
para registrar ventas o egresos sin que la interfaz bloquee la operacion por interpretar incorrectamente el inventario.

## 4. Contexto del problema

Actualmente la pantalla `Salidas` carga medicamentos desde el servicio de productos y complementa el stock con la respuesta de:

```http
GET /api/products/active-table
```

El frontend espera que cada fila de inventario activo tenga principalmente estos campos:

```text
id
code / codigo
stock
```

Sin embargo, el backend puede responder informacion de inventario basada en lotes o stock operativo usando otros nombres de campos, por ejemplo:

```text
productId
productCode
productName
operationalStock
availableStock
batchStock
batchCode
nextBatchCode
nextExpirationDate
```

Cuando el frontend no reconoce esos campos, normaliza el stock a `0`. Como consecuencia, el formulario de salidas muestra un stock incorrecto y activa la validacion preventiva de stock insuficiente.

## 5. Evidencia funcional

En la pantalla `Registrar salida de inventario`, al seleccionar un medicamento disponible, la interfaz muestra:

```text
Stock actual: 0
Proximo vencimiento: Sin referencia
```

Esto impide registrar ventas o salidas aunque el backend tenga inventario disponible asociado a lotes activos.

## 6. Causa tecnica identificada

La causa probable esta en el mapeo de inventario activo del frontend:

```text
frontend/src/medicines/services/medicines.service.js
```

El mapper actual de `active-table` solo toma `item.stock` como fuente principal del stock.

Tambien afecta el cruce realizado en:

```text
frontend/src/movements/pages/ExitsPage.jsx
```

La pantalla arma un mapa de stock por `id` y `codigo`. Si el backend envia `productId` o `productCode`, el cruce puede fallar y dejar el medicamento con stock `0`.

## 7. Alcance funcional

Esta HU cubre:

- Ajustar el mapeo de `GET /api/products/active-table` para aceptar campos actuales y alternativos del backend.
- Reconocer identificadores de producto como `productId`, `medicineId`, `id`, `code`, `codigo` y `productCode`.
- Reconocer stock operativo usando `stock`, `operationalStock`, `availableStock`, `batchStock` o equivalentes.
- Mostrar correctamente el stock disponible en la tarjeta informativa del medicamento seleccionado.
- Mantener la validacion preventiva para impedir salidas por encima del stock disponible.
- Mantener el backend como fuente definitiva de validacion ante conflictos `409` o `422`.
- Conservar el endpoint de registro:

```http
POST /api/movements/exits
```

## 8. Fuera de alcance

No hace parte de esta HU:

- Cambiar la regla FEFO del backend.
- Crear un nuevo endpoint de salidas.
- Permitir salidas con stock insuficiente.
- Modificar roles o permisos de acceso.
- Cambiar la estructura visual completa del modulo `Salidas`.
- Alterar la validacion definitiva del backend.

## 9. Estado actual

```text
Usuario selecciona medicamento
  |
  v
Frontend consulta inventario activo
  |
  v
Mapper no reconoce campos actuales de stock o producto
  |
  v
Frontend muestra stock 0
  |
  v
Usuario no puede registrar venta/salida valida
```

## 10. Estado objetivo

```text
Usuario selecciona medicamento
  |
  v
Frontend consulta inventario activo
  |
  v
Mapper reconoce contrato actual y campos alternativos
  |
  v
Frontend muestra stock operativo real
  |
  v
Usuario registra venta/salida si la cantidad es valida
```

## 11. Criterios de aceptacion

1. El modulo `Salidas` debe mostrar el stock real disponible del medicamento seleccionado.
2. Si `active-table` responde `operationalStock`, el frontend debe usarlo como stock operativo.
3. Si `active-table` responde `availableStock` o `batchStock`, el frontend debe poder usarlo como respaldo.
4. Si la fila usa `productId` o `productCode`, el frontend debe cruzarla correctamente con el medicamento seleccionado.
5. La validacion preventiva debe bloquear solo cuando la cantidad solicitada sea mayor al stock realmente disponible.
6. El formulario debe seguir enviando salidas por `POST /api/movements/exits`.
7. Si backend responde `409` o `422`, la pantalla debe mostrar mensaje de conflicto y recargar los datos.
8. No se deben modificar las rutas publicas del frontend ni del gateway.
9. No se debe permitir registrar una salida con cantidad menor o igual a `0`.
10. No se deben romper las vistas de inventario, movimientos, reportes o dashboard.

## 12. Plan tecnico propuesto

1. Actualizar `mapActiveInventoryRow` para normalizar identificadores de producto, codigo, nombre, stock operativo y referencia de lote.
2. Ajustar el cruce de datos en `ExitsPage.jsx` para construir llaves por `id`, `productId`, `codigo` y `productCode`.
3. Usar una funcion central para resolver stock disponible con prioridad clara:

```text
operationalStock -> stock -> availableStock -> batchStock -> 0
```

4. Mostrar en la tarjeta de seleccion el stock operativo y, si existe, la referencia de lote o proximo vencimiento.
5. Mantener el envio actual de `productId`, `amount`, `quantity`, `reason` y `observation`.
6. Ejecutar validacion local con `npm run build` y prueba manual del flujo de salidas.

## 13. Pruebas propuestas

### CP-HU-JVL-002-01 - Visualizacion de stock operativo

- Entrar al modulo `Salidas`.
- Seleccionar un medicamento con inventario disponible.
- Validar que `Stock actual` muestre un valor mayor a `0` cuando backend tenga stock operativo.

### CP-HU-JVL-002-02 - Registro de salida valida

- Seleccionar un medicamento con stock disponible.
- Ingresar una cantidad menor o igual al stock.
- Registrar la salida.
- Validar mensaje de exito y actualizacion del historial.

### CP-HU-JVL-002-03 - Bloqueo por cantidad mayor al stock

- Seleccionar un medicamento con stock disponible.
- Ingresar una cantidad superior al stock.
- Validar que el frontend muestre advertencia de stock insuficiente.

### CP-HU-JVL-002-04 - Contrato con campos alternativos

- Simular o validar una respuesta de `active-table` con `productId`, `productCode` y `operationalStock`.
- Confirmar que el frontend cruza el medicamento correctamente y no asigna stock `0` por error.

### CP-HU-JVL-002-05 - Conflicto reportado por backend

- Intentar registrar una salida cuando el stock haya cambiado antes de confirmar.
- Validar que el frontend muestre mensaje de conflicto y recargue la vista.

## 14. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Backend responde filas por lote y no por producto | Medio | Agrupar o cruzar por producto usando `productId` y sumar/usar stock operativo cuando aplique |
| Existen varios nombres para el mismo campo | Medio | Centralizar normalizacion de campos en el service |
| El frontend muestra stock diferente al backend al momento de confirmar | Medio | Mantener validacion definitiva en backend y refrescar ante `409` o `422` |
| Se rompe inventario activo por cambiar mapper compartido | Medio | Mantener compatibilidad con campos anteriores `id`, `code`, `codigo` y `stock` |

## 15. Resultado esperado

Al finalizar esta HU, el frontend debe interpretar correctamente el contrato actual de inventario activo y permitir registrar ventas o salidas cuando exista stock disponible.

El modulo `Salidas` seguira validando cantidades en la interfaz, pero ya no bloqueara operaciones validas por mapear incorrectamente el stock a `0`.
