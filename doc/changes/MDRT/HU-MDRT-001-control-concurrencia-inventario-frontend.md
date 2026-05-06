# HU-MDRT-001 - Trazabilidad frontend para control de concurrencia de inventario

## 1. Informacion general

- HU: `HU-MDRT-001`
- Nombre: Manejo frontend de conflictos de inventario en entradas y salidas
- Componente principal: `frontend`
- Componentes relacionados: `inventory-service`
- Rama de trabajo: `HU-MDRT-001`
- HU backend relacionada: `HU-MDRT-001 - Control de concurrencia en movimientos de inventario`
- ADR backend relacionado: `ADR-021-control-concurrencia-inventario.md`
- Fecha: 2026-05-05

## 2. Objetivo

Alinear el frontend con la mejora arquitectonica aplicada en backend para que las pantallas de
entradas y salidas reaccionen correctamente cuando el inventario cambie mientras el usuario esta
registrando un movimiento.

El cambio backend agrega bloqueos pesimistas sobre producto y lotes. El frontend conserva el mismo
flujo visual, pero ahora reconoce mejor respuestas `409` y `422` asociadas a stock, lote o producto
inactivo.

## 3. Historia de usuario

Como usuario de FarmaExpres,
quiero que la interfaz me informe cuando el inventario ya no permite confirmar una entrada o salida,
para actualizar la vista y evitar registrar movimientos con cantidades desactualizadas.

## 4. Contexto backend

El backend agrego `InventoryConcurrencyGuard` en `inventory-service` para:

- bloquear el producto antes de modificar stock;
- bloquear lotes consumibles antes de descontar unidades;
- rechazar productos inactivos con `409 CONFLICT`;
- rechazar salidas que superen el stock disponible con `422 UNPROCESSABLE_ENTITY`.

La interfaz debe tratar esos casos como conflictos de inventario y refrescar los datos del modulo.

## 5. Cambios implementados en frontend

| Archivo | Cambio |
|---------|--------|
| `frontend/src/movements/services/movements.service.js` | Normaliza errores de inventario y marca `isInventoryConflict`. |
| `frontend/src/movements/pages/ExitsPage.jsx` | Refresca la vista si una salida falla por conflicto de stock. |
| `frontend/src/movements/pages/EntriesPage.jsx` | Refresca la vista si una entrada falla por producto no operable. |
| `frontend/src/movements/pages/ExitsPage.jsx` | Alinea motivos de salida con backend: `Venta` se envia como `Dispensacion` y se agrega `Vencimiento`. |

## 6. Estado anterior

```text
Usuario registra salida
  |
  v
Backend responde 409/422
  |
  v
Frontend muestra mensaje generico
```

El usuario podia quedar viendo stock anterior aunque backend ya hubiera rechazado la operacion por
stock insuficiente o producto no operable.

## 7. Estado objetivo

```text
Usuario registra entrada/salida
  |
  v
Backend responde 409/422 por inventario
  |
  v
Frontend muestra mensaje especifico
  |
  v
Frontend recarga medicamentos e historial del modulo
```

## 8. Criterios de aceptacion

1. Si backend responde `409`, el frontend debe mostrar que el medicamento no esta disponible para movimientos.
2. Si backend responde `422` por stock/lote/cantidad, el frontend debe indicar que el stock disponible cambio.
3. Despues de un conflicto de inventario, la pantalla debe recargar medicamentos e historial.
4. Los motivos disponibles para salida deben estar alineados con los valores aceptados por backend.
5. El cambio no debe modificar rutas ni contrato exitoso de entradas/salidas.

## 9. Pruebas propuestas y ejecutadas

```bash
cd frontend
npm run build
```

Validacion ejecutada:

- `eslint .` con Node 24.
- `docker-compose --env-file .env.dev up -d --build`, compilando el frontend en Docker con Node 22.
- Verificacion HTTP de `http://localhost:3000`.

Pruebas manuales:

- iniciar sesion como `marlon@gmail.com` / `admin123`;
- entrar a `Salidas`;
- registrar una salida valida;
- intentar una salida con cantidad mayor al stock disponible;
- confirmar que aparece el mensaje de stock actualizado y la vista recarga datos;
- revisar `Control de stock` para ver el stock recalculado.

## 10. Resultado esperado

La trazabilidad queda dividida entre backend y frontend. Backend protege la consistencia del inventario
en la base de datos; frontend consume esa decision mostrando mensajes especificos y recargando los datos
cuando una operacion ya no puede confirmarse con la informacion que estaba en pantalla.
