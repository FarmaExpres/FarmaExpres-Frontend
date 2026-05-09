# HU-JFBM-002 - Validacion de stock en salidas

## 1. Historia de Usuario

### 1.1 Identificacion

- **Titulo:** Validacion de stock en salidas
- **ID:** HU-JFBM-002
- **Relacionado:** HU-RF-02 (Frontend) / HU-RF-02 (Backend)
- **Prioridad:** Must Have (Alta)

### 1.2 Descripcion

Como **usuario que registra salidas de inventario**,
quiero **ver una advertencia cuando la cantidad solicitada supere el stock disponible y una confirmacion de salida exitosa cuando si haya stock suficiente**,
para **corregir el valor antes de confirmar la salida o validar que la operacion fue registrada correctamente**.

### 1.3 Criterios de Aceptacion

#### Interfaz

- [x] Existe visualizacion del **stock actual** del medicamento seleccionado en el modulo `Salidas`.
- [x] Al seleccionar un medicamento se muestra su informacion de inventario.
- [x] Al ingresar una cantidad mayor al stock disponible se muestra una advertencia clara.
- [x] El usuario puede identificar el stock disponible antes de confirmar la operacion.

#### Validaciones

- [x] La cantidad debe ser un numero mayor a 0.
- [x] La cantidad no puede superar el stock disponible.
- [x] Si el valor excede el stock, se bloquea el envio o se muestra una ventana de advertencia.
- [x] El sistema debe indicar que la cantidad maxima valida corresponde al stock actual.

#### Integracion con Backend

- [x] La salida sigue enviandose mediante `POST` a la operacion de salidas de inventario.
- [x] El token se envia en el header `Authorization: Bearer <token>`.
- [x] Si el backend rechaza la operacion por stock insuficiente, el frontend muestra el mensaje recibido o uno equivalente.

#### Respuesta del Sistema

**Exito:**

- [x] La salida se registra correctamente cuando la cantidad es valida.
- [x] El sistema muestra un mensaje de **Salida exitosa** cuando la operacion se confirma.
- [x] La vista se actualiza sin recargar la pagina.
- [x] Se limpia o reinicia el formulario despues del registro exitoso.

**Error:**

- [x] Mensaje cuando la cantidad supera el stock disponible.
- [x] Mensaje cuando el backend detecta conflicto de inventario.
- [x] Mensaje cuando el medicamento ya no esta disponible para movimientos.

#### Control de Acceso

- [x] Solo usuarios autorizados para movimientos pueden registrar salidas.
- [x] El usuario sin permisos no puede ejecutar la operacion.

### 1.4 Checklist QA

- [x] No permite enviar cantidad vacia o menor o igual a cero.
- [x] No permite registrar una salida por encima del stock.
- [x] Muestra el stock actual del medicamento seleccionado.
- [x] Muestra una advertencia clara cuando la cantidad es invalida.
- [x] Refresca la vista tras una salida exitosa.
- [x] Mantiene validacion de respaldo desde backend.

### 1.5 Notas Tecnicas

- El stock actual se visualiza desde el frontend en el formulario de salidas.
- La validacion preventiva debe realizarse en frontend antes de enviar la solicitud.
- La validacion definitiva debe mantenerse en backend como fuente de verdad.
- El consumo de API se realiza con Axios.
- El manejo de conflictos de inventario ya contempla respuestas de error del backend.

### 1.6 Flujo de Usuario

1. El usuario entra al modulo `Salidas`.
2. Selecciona un medicamento del inventario.
3. Visualiza el stock actual disponible.
4. Ingresa una cantidad para la salida.
5. Si la cantidad supera el stock, el sistema muestra una advertencia o bloquea la accion.
6. Si la cantidad es valida, el sistema confirma la salida.

---

## 2. Casos de Prueba Ejecutados (HU-JFBM-002)

> Ruta de evidencias: `doc/images/HU-JFBM-002/`

### CP-HU-JFBM-002-01 - Visualizacion del stock actual

- **Objetivo:** validar que el usuario vea el stock del medicamento antes de registrar la salida.
- **Accion ejecutada:** Ingreso al modulo `Salidas` y seleccion de un medicamento.
- **Resultado evidenciado:** Se visualiza el stock actual del medicamento seleccionado.
- **Evidencia:**

![CP-HU-JFBM-002-01](./images/HU-JFBM-002/01-stock-actual-medicamento.png)

### CP-HU-JFBM-002-02 - Advertencia por cantidad mayor al stock

- **Objetivo:** validar el bloqueo o la advertencia preventiva por stock insuficiente.
- **Accion ejecutada:** Ingreso de una cantidad mayor al stock disponible.
- **Resultado evidenciado:** Se muestra una ventana o mensaje que indica stock insuficiente.
- **Evidencia:**

![CP-HU-JFBM-002-02](./images/HU-JFBM-002/02-advertencia-stock-insuficiente.png)

### CP-HU-JFBM-002-03 - Registro exitoso con cantidad valida

- **Objetivo:** validar que la salida se registre cuando la cantidad es correcta.
- **Accion ejecutada:** Ingreso de una cantidad menor o igual al, aparece el mensaje de **Salida exitosa** stock disponible.
- **Resultado evidenciado:** La salida se registra correctamente y la lista se actualiza.
- **Evidencia:**

![CP-HU-JFBM-002-03](./images/HU-JFBM-002/03-salida-exitosa.png)

### CP-HU-JFBM-002-04 - Respuesta por conflicto del backend

- **Objetivo:** validar el mensaje cuando el stock cambia entre la seleccion y el envio.
- **Accion ejecutada:** Intento de registrar una salida con stock ya modificado en backend.
- **Resultado evidenciado:** El sistema muestra mensaje de conflicto de inventario.
- **Evidencia:**

![CP-HU-JFBM-002-04](./images/HU-JFBM-002/04-conflicto-backend-stock.png)

---

## 3. Conclusiones de Prueba
y la confirmacion de salida exitosa 
- La HU-JFBM-002 define la advertencia de stock insuficiente en el flujo de salidas.
- El frontend debe validar la cantidad antes de confirmar la operacion.
- El backend debe mantenerse como respaldo para evitar salidas invalidas.
- La experiencia del usuario mejora al mostrar el stock actual y un mensaje claro antes del envio.