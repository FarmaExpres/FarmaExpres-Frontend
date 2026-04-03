# Plan de integracion Frontend - Backend para HUs 001 a 011

## Contexto

Actualmente el frontend de FarmaExpres ya consume parte de los servicios del backend a traves de rutas centralizadas bajo `/api/...`, en linea con la estrategia de integracion por API Gateway.

Sin embargo, despues de revisar las HUs implementadas en backend y contrastarlas con el consumo real del frontend, se identifico que:

- el frontend ya consume autenticacion, usuarios, productos y movimientos generales
- el frontend aun no consume varios endpoints nuevos ya disponibles en backend
- existen funcionalidades visibles en frontend que todavia no cuentan con metodo backend especifico
- mientras esos metodos faltantes se implementan en backend, el frontend seguira resolviendo temporalmente algunas consultas con logica local

Este documento deja definido el ajuste de integracion que se realizara en el frontend de manera progresiva.

---

## Objetivo

Alinear el frontend con los endpoints ya implementados en backend para las HUs 001 a 011, reduciendo calculos locales cuando ya exista un metodo oficial en backend, y manteniendo temporalmente en frontend los comportamientos cuyo soporte backend aun no ha sido desarrollado.

Como criterio de integracion acordado:

- el frontend debera consumir los nuevos metodos implementados en backend desde `HU-001` hasta `HU-011`
- se excluye temporalmente de este alcance el metodo consolidado de `HU-006`
- mientras existan funciones visibles en frontend sin metodo backend oficial, estas seguiran resolviendose temporalmente en cliente

---

## Estado actual identificado

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

### Implementado en backend pero aun no consumido directamente por el frontend

- `GET /status` asociado a la base del `alert-service`
- `GET /api/alerts/low-stock`
- `GET /api/alerts/expired`
- `GET /api/alerts/out-of-stock`
- `GET /api/alerts/expiring-soon`
- endpoints de movimientos por categoria definidos en HUs posteriores
- endpoints especializados de inventario y resumen definidos en HUs posteriores

### Funcionalidades del frontend que aun dependen de logica local o de soporte backend incompleto

- ver movimientos desde una fecha hasta otra fecha
- ver movimientos por usuario con metodo oficial especializado
- ver tabla de productos activos con su valor total desde un DTO backend especializado
- ver cantidad total de stock y valor total del inventario activo desde un resumen backend especializado
- reporte de productos vencidos y proximos a vencer con soporte backend dedicado
- reporte de bajo stock separado por niveles `critico` y `alerta`
- reporte por usuario con metodo backend dedicado

---

## Cambios que se realizaran en el frontend

La actualizacion del frontend se hara de forma progresiva, modulo por modulo, priorizando el consumo directo de endpoints backend ya existentes.

### Alcance de consumo acordado

Se establece como objetivo que el frontend pase a consumir los metodos nuevos documentados en backend para las HUs `HU-001` a `HU-011`, con una unica excepcion:

- no se tomara por ahora el metodo de `HU-006`, correspondiente al endpoint consolidado de alertas

Por lo tanto, el ajuste del frontend buscara apoyarse en los metodos individuales y especializados de backend, evitando el endpoint agregado de `HU-006` en esta etapa.

### 1. Alertas

Se ajustara el frontend para consumir los endpoints oficiales de alertas ya implementados en backend:

- `GET /status`
- `GET /api/alerts/low-stock`
- `GET /api/alerts/expired`
- `GET /api/alerts/out-of-stock`
- `GET /api/alerts/expiring-soon`

Con esto se reemplazaran, cuando aplique, calculos locales que hoy se hacen con base en la lista general de productos.

El endpoint consolidado:

- `GET /api/alerts`

no se incorporara en esta fase, aunque exista en backend.

### 2. Reportes

Se migraran progresivamente las secciones de reportes para que usen informacion obtenida desde backend cuando el endpoint correspondiente ya exista.

Casos a mover a consumo backend:

- reportes de bajo stock
- reportes de proximos a vencer
- tabla de productos activos con su valor total
- resumen de stock total y valor total del inventario activo

### 3. Movimientos

El modulo de movimientos se ajustara para consumir los endpoints backend oficiales que ya existan o que se vayan habilitando posteriormente, reduciendo dependencia del filtrado local cuando haya soporte real del backend.

### 4. Compatibilidad temporal

Para no bloquear el avance del frontend, las funcionalidades que aun no cuenten con metodo backend especifico seguiran resolviendose temporalmente desde frontend mediante:

- filtrado local
- transformacion local de datos
- agrupaciones locales para reportes

Esto se mantendra hasta que backend publique los endpoints faltantes.

---

## Funcionalidades que seguiran temporalmente en frontend

Mientras el backend no implemente los metodos faltantes, el frontend mantendra temporalmente los siguientes comportamientos:

### Movimientos por fecha

Actualmente el frontend necesita consultar movimientos desde una fecha hasta otra fecha.

Situacion actual:

- backend solo garantiza de forma clara la consulta general de movimientos
- por ahora no se confirma un metodo backend definitivo para rango de fechas como contrato cerrado

Decision temporal:

- el frontend seguira aplicando este filtro localmente sobre los movimientos obtenidos

### Movimientos por usuario

Actualmente existe necesidad funcional de consultar movimientos por usuario.

Situacion actual:

- el backend aun no tiene cerrado el metodo definitivo especializado para este caso como consumo oficial final
- existe documentacion de la HU correspondiente, pero no se toma aun como integracion definitiva en frontend hasta validar su disponibilidad real

Decision temporal:

- el frontend seguira filtrando localmente por usuario usando la informacion de movimientos descargada

### Tabla de productos activos con valor total

Actualmente el frontend necesita construir una tabla de inventario activo con:

- codigo
- nombre
- stock
- precio unitario
- valor total por producto

Situacion actual:

- el frontend no consume todavia un metodo backend especializado para esta vista
- actualmente toma `GET /api/products` y arma la tabla localmente

Decision temporal:

- el frontend seguira generando esta tabla localmente hasta integrar el metodo backend especializado definido para esta necesidad

### Resumen de stock total y valor total

Actualmente el frontend requiere una vista resumen con:

- cantidad total de stock
- valor total del inventario activo

Situacion actual:

- el frontend no consume todavia un metodo backend especializado para este resumen
- no existe aun integracion real desde cliente hacia ese contrato puntual

Decision temporal:

- el frontend seguira resolviendo esta necesidad con datos locales mientras se integra el metodo backend correspondiente

### Reporte de proximos a vencer y vencidos

Actualmente el frontend necesita mostrar:

- vencidos
- proximos a vencer

Situacion actual:

- backend ya cuenta con endpoints de alertas parciales
- aun falta completar el cubrimiento funcional exacto que el frontend necesita para la vista de reportes

Decision temporal:

- el frontend seguira generando estas vistas localmente cuando el endpoint backend no cubra exactamente la necesidad funcional esperada

### Reporte de bajo stock por niveles

Actualmente el frontend necesita separar bajo stock en categorias como:

- critico
- alerta

Situacion actual:

- backend expone alertas de bajo stock, pero aun debe confirmarse si el contrato cubre exactamente la clasificacion visual requerida por frontend

Decision temporal:

- el frontend seguira aplicando clasificacion local mientras se completa o valida el metodo backend requerido

### Reporte por usuario

Situacion actual:

- el backend todavia no cuenta con un metodo final para reporte por usuario como vista especializada de reportes

Decision temporal:

- el frontend seguira construyendo este reporte localmente a partir del historial de movimientos disponible

---

## Compromiso de integracion posterior con backend

Posteriormente se realizaran los metodos faltantes por parte del backend para cubrir de forma oficial las funcionalidades que hoy aun dependen de logica local en frontend.

Cuando esos metodos esten disponibles y validados, el frontend sera ajustado para:

- dejar de calcular localmente lo que ya exista como contrato backend
- consumir los endpoints oficiales del backend
- simplificar transformaciones innecesarias en cliente
- mantener una integracion mas consistente entre frontend y microservicios

Adicionalmente, se deja explicito que hoy existen funciones del frontend que aun no estan soportadas completamente por backend o aun no se encuentran integradas desde frontend mediante un endpoint especializado. Entre ellas:

- movimientos filtrados desde una fecha hasta otra fecha
- movimientos filtrados por usuario mediante metodo backend dedicado
- tabla de productos activos con valor total mediante DTO backend especializado
- resumen de stock total y valor total del inventario activo
- reporte de vencidos y proximos a vencer con cobertura exacta de la necesidad visual del frontend
- clasificacion de bajo stock por niveles visuales como `critico` y `alerta`
- reporte por usuario como salida backend especializada

---

## Orden de trabajo acordado

El ajuste se realizara de forma incremental:

1. documentar el estado actual de integracion
2. actualizar frontend para consumir primero los endpoints backend ya implementados
3. conservar temporalmente en frontend los calculos o filtros que aun no tengan soporte backend
4. migrar esos calculos restantes cuando backend publique los nuevos metodos

---

## Nota final

Este documento no reemplaza las HUs del backend. Su objetivo es dejar trazabilidad del criterio de integracion actual entre frontend y backend, indicando claramente que:

- el frontend empezara a consumir de forma progresiva los endpoints ya implementados
- los comportamientos faltantes seguiran temporalmente en frontend
- posteriormente el backend completara los metodos que aun no existen o no cubren totalmente la necesidad funcional del frontend
