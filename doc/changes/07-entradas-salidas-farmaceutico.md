# 07 - Entradas y Salidas para Farmaceutico

## Objetivo

Habilitar al rol **Farmaceutico** el acceso a los modulos **Entradas** y **Salidas**, permitiendo registrar movimientos y consultar el historial visible de ambos flujos consumiendo los endpoints del backend.

## Cambios a implementar

- Habilitar navegacion desde sidebar para los items **Entradas** y **Salidas** del rol Farmaceutico.
- Permitir acceso del rol Farmaceutico a las rutas de registro de entradas y salidas.
- Integrar consumo `POST` para registrar movimientos:
  - `POST /api/movements/entries`
  - `POST /api/movements/exits`
- Integrar consumo `GET` para consultar el historial mostrado en:
  - **Ultimas Entradas**
  - **Ultimas Salidas**
- Renderizar formularios operativos y tablas de historial en las vistas correspondientes.
- Actualizar automaticamente el historial despues de cada registro exitoso.
- Mostrar estados de carga, exito, error y vacio sin romper la experiencia del usuario.

## Reglas funcionales integradas

- El rol **Farmaceutico** debe poder entrar a las vistas que ya observa en el sidebar.
- La HU no se limita al registro por `POST`; tambien debe consultar por `GET` las entradas y salidas visibles en pantalla.
- El frontend debe consumir los endpoints oficiales ya implementados en backend para las HU `HU-015` y `HU-016`.
- La interfaz debe mostrar como minimo fecha, medicamento, cantidad, motivo y usuario en los historiales.
- El control de acceso debe respetarse tanto en sidebar como en rutas protegidas.

## Que se modificara

- `frontend/src/layout/components/Sidebar.jsx`
  - Habilitar acceso interactivo a **Entradas** y **Salidas** para Farmaceutico.

- `frontend/src/App.jsx`
  - Ajustar rutas y proteccion RBAC para las vistas operativas.

- `frontend/src/shared/constants/roles.js`
  - Ajustar permisos por rol si la matriz se centraliza alli.

- `frontend/src/movements/services/movements.service.js`
  - Agregar consumo de `POST` y `GET` para entradas y salidas.

- `frontend/src/movements/pages/`
  - Crear o adaptar paginas para formularios y tablas de historial.

- `frontend/src/movements/components/`
  - Crear o adaptar componentes de captura y visualizacion.

## Resultado esperado

- El Farmaceutico puede ingresar a **Entradas** y **Salidas** desde el sidebar.
- Puede registrar movimientos contra backend.
- Puede observar en pantalla el historial cargado por `GET` para entradas y salidas.
- La experiencia queda alineada con las pantallas mostradas en el diseno funcional.
