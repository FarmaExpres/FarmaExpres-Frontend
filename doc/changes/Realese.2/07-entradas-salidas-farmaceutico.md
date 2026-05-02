# 07 - Entradas y Salidas para Farmaceutico

## Objetivo

Habilitar al rol **Farmaceutico** el acceso a los modulos **Entradas** y **Salidas**, permitiendo registrar movimientos y consultar el historial visible de ambos flujos consumiendo los endpoints del backend.

## Cambios implementados

- Se habilito navegacion desde sidebar para los items **Entradas** y **Salidas** del rol Farmaceutico.
- Se permitio acceso del rol Farmaceutico a las rutas de registro de entradas y salidas.
- Se integraron rutas operativas y aliases:
  - `/entries`
  - `/entradas`
  - `/exits`
  - `/salidas`
- Se integro consumo `POST` para registrar movimientos:
  - `POST /api/movements/entries`
  - `POST /api/movements/exits`
- Se integro consumo `GET` para consultar el historial mostrado en:
  - **Ultimas Entradas**
  - **Ultimas Salidas**
- Se renderizaron formularios operativos y tablas de historial en las vistas correspondientes.
- Se actualiza automaticamente el historial despues de cada registro exitoso.
- Se muestran estados de carga, exito, error y vacio sin romper la experiencia del usuario.
- En **Entradas**, el motivo se controla con selector y el lote se genera automaticamente.
- En **Entradas** y **Salidas**, la observacion es opcional.

## Reglas funcionales integradas

- El rol **Farmaceutico** debe poder entrar a las vistas que ya observa en el sidebar.
- La HU no se limita al registro por `POST`; tambien debe consultar por `GET` las entradas y salidas visibles en pantalla.
- El frontend debe consumir los endpoints oficiales ya implementados en backend para las HU `HU-015` y `HU-016`.
- La interfaz debe mostrar como minimo fecha, medicamento, cantidad, motivo y usuario en los historiales.
- El control de acceso debe respetarse tanto en sidebar como en rutas protegidas.

## Que se modifico

- `frontend/src/layout/components/Sidebar.jsx`
  - Se habilito acceso interactivo a **Entradas** y **Salidas** para Farmaceutico.

- `frontend/src/App.jsx`
  - Se ajustaron rutas, aliases y proteccion RBAC para las vistas operativas.

- `frontend/src/shared/constants/roles.js`
  - Se agregaron permisos para acceso a entradas y salidas.

- `frontend/src/movements/services/movements.service.js`
  - Se agrego consumo de `POST` y `GET` para entradas y salidas.

- `frontend/src/movements/pages/`
  - Se crearon paginas para formularios y tablas de historial.

- `frontend/src/movements/pages/EntriesPage.jsx`
  - Vista de registro de entradas con formulario, selector de motivo, observacion opcional y tabla de historial.

- `frontend/src/movements/pages/ExitsPage.jsx`
  - Vista de registro de salidas con formulario, selector de motivo, observacion opcional y tabla de historial.

- `frontend/src/movements/components/`
  - Se reutilizo la tabla de movimientos para visualizar historiales recientes.

## Resultado esperado

- El Farmaceutico puede ingresar a **Entradas** y **Salidas** desde el sidebar.
- Puede registrar movimientos contra backend.
- Puede observar en pantalla el historial cargado por `GET` para entradas y salidas.
- La experiencia queda alineada con las pantallas mostradas en el diseno funcional.

## Estado actual

- **Entradas** y **Salidas** quedaron habilitadas funcionalmente para el rol **Farmaceutico**.
- El historial visible se alimenta desde backend usando endpoints dedicados para entradas y salidas.
- El formulario de **Entradas** contempla `expirationDate`, motivo controlado y lote automatico.
- El formulario de **Salidas** contempla motivo controlado y observacion opcional.
