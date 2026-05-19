# HU-MDRT-003 - Módulo de predicciones de inventario

## Contexto

FarmaExpres incorpora un microservicio NoSQL con Python y MongoDB para estimar demanda de medicamentos. El frontend principal debe consultar ese servicio por el gateway, mantener la experiencia por roles y explicar el resultado de forma clara.

## Cambios implementados

- Nuevo módulo `Predicciones`.
- Nueva ruta `/predictions`.
- Nuevo servicio Axios `predictions.service.js`.
- Nuevo permiso `canAccessPredictions`.
- Nuevo permiso `canManagePredictions`.
- Menú lateral actualizado para administrador, farmacéutico y auditor.
- La trazabilidad de frontend queda en `HU-MDRT-003` porque `HU-MDRT-002` cubre la integración del servicio predictivo y la ingesta NoSQL.

## Permisos

| Rol | Puede consultar | Puede sincronizar, limpiar y entrenar |
| --- | --- | --- |
| ADMIN | Sí | Sí |
| AUDITOR | Sí | Sí |
| FARMACEUTICO | Sí | No |

## Flujo visual

La pantalla muestra:

- estado del servicio predictivo;
- cantidad de documentos crudos, limpios y predicciones;
- explicación corta del modelo;
- botones de operación para roles autorizados;
- gráfico simple de demanda esperada;
- prioridad de reposición;
- tabla de predicciones por medicamento;
- métricas de calidad y entrenamiento.

## Endpoint consumido

El frontend usa rutas relativas para pasar por el gateway:

```text
/api/predictions
```

No consume directamente el puerto del microservicio Python.

## Validación local

La pantalla fue validada en `http://localhost:3000/predictions` con datos generados desde el flujo normal de FarmaExpres. Se registraron entradas y salidas de inventario, luego se ejecutó `Sincronizar inventario` y `Recalcular flujo`.

Resultado observado:

- 130 registros crudos.
- 130 registros limpios.
- 11 medicamentos evaluados.
- 10 medicamentos en riesgo alto.
- 1 medicamento agotado.

## Archivos principales

- `frontend/src/predictions/pages/PredictionsPage.jsx`
- `frontend/src/predictions/services/predictions.service.js`
- `frontend/src/App.jsx`
- `frontend/src/layout/components/Sidebar.jsx`
- `frontend/src/shared/constants/roles.js`
