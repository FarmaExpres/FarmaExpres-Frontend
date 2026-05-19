# HU-FE-15 - Renovacion de sesion con refresh token

## 1. Informacion general

- **HU:** `HU-FE-15`
- **Nombre:** Renovacion automatica de sesion en frontend mediante refresh token
- **Componente principal:** `frontend`
- **Componentes relacionados:** `auth-service`, `api-gateway`
- **HU backend relacionada:** `HU-JVL-001 - Validacion centralizada de JWT en API Gateway y renovacion segura de sesion`
- **Documento backend de referencia:** `FarmaExpres_Backend/docs/Changes/JLVH/HU-JVL-001-centralized-jwt-validation-api-gateway.md`
- **Estado:** Propuesto
- **Fecha:** 2026-05-01

## 2. Objetivo

Ajustar el frontend de `FarmaExpres` para consumir el nuevo flujo de autenticacion definido por backend, donde el inicio de sesion entrega un `accessToken` de corta duracion y un `refreshToken` de mayor duracion.

El objetivo funcional es que el usuario pueda continuar trabajando cuando expire el `accessToken`, sin ser enviado inmediatamente al login, siempre que su `refreshToken` siga siendo valido.

## 3. Contexto del cambio backend

La HU backend `HU-JVL-001` propone centralizar la validacion JWT en el `api-gateway` y agregar renovacion segura de sesion mediante:

- `accessToken`: JWT de corta duracion, definido en backend con una vigencia de 15 minutos.
- `refreshToken`: token de mayor duracion, definido en backend con una vigencia de 1 dia.
- `POST /api/auth/refresh`: endpoint publico para renovar el `accessToken`.
- `POST /api/auth/logout`: endpoint recomendado para revocar el refresh token activo.

Con este cambio, el frontend ya no debe interpretar la expiracion del `accessToken` como cierre definitivo de sesion. Antes de limpiar la sesion y redirigir a `/login`, debe intentar renovar el token usando el `refreshToken`.

## 4. Estado actual del frontend

Actualmente el frontend maneja la sesion de la siguiente forma:

- El login consume `POST /api/auth/login`.
- El token recibido se guarda como `authToken` en `localStorage`.
- Las peticiones protegidas envian `Authorization: Bearer <token>`.
- `getAuthToken()` valida localmente si el JWT expiro.
- Si el token expiro, se eliminan datos de sesion y se fuerza nuevo login.
- El interceptor global de axios limpia sesion y redirige a `/login` ante respuestas `401`.

Archivos relevantes:

- `frontend/src/auth/services/auth.service.js`
- `frontend/src/shared/auth/session.js`
- `frontend/src/shared/services/api.service.js`
- `frontend/src/App.jsx`

Este comportamiento era correcto cuando solo existia un token de acceso, pero ya no es suficiente con el nuevo flujo de backend.

## 5. Problema que resuelve esta HU

Cuando el `accessToken` expire, el usuario sera expulsado aunque exista un `refreshToken` valido capaz de renovar la sesion.

Esto genera:

- perdida de continuidad durante el trabajo diario
- relogueos innecesarios para Administrador, Farmaceutico y Auditor
- mala experiencia en modulos de uso prolongado como Inventario, Movimientos, Alertas y Reportes
- desaprovechamiento del nuevo endpoint `POST /api/auth/refresh`
- diferencia entre la arquitectura de autenticacion definida en backend y el comportamiento real del frontend

## 6. Historia de usuario

Como usuario autenticado de `FarmaExpres`,  
quiero que el frontend renueve mi sesion automaticamente cuando expire el token de acceso,  
para continuar usando el sistema sin volver a iniciar sesion mientras mi refresh token siga siendo valido.

## 7. Alcance funcional propuesto

Esta HU cubre los ajustes necesarios en frontend para:

- guardar `accessToken` y `refreshToken` despues del login
- soportar respuestas de login con nombres de campo actuales y nuevos
- consumir `POST /api/auth/refresh`
- actualizar el `accessToken` cuando la renovacion sea exitosa
- reintentar una peticion protegida que falle por `401` debido a token expirado
- cerrar sesion solo cuando no exista refresh token o la renovacion falle
- limpiar tambien el `refreshToken` al cerrar sesion
- mantener el control de roles y rutas protegidas con la sesion renovada
- documentar pruebas de QA para expiracion y renovacion

## 8. Fuera de alcance

No hace parte de esta HU:

- modificar la duracion de los tokens definida por backend
- validar criptograficamente el JWT en frontend
- implementar autorizacion por rol en el gateway
- guardar refresh tokens en base de datos desde frontend
- crear lista de revocacion de access tokens
- cambiar el diseno visual del login o del layout principal

## 9. Cambios tecnicos esperados en frontend

### 9.1 Servicio de autenticacion

Actualizar `frontend/src/auth/services/auth.service.js` para:

- reconocer `accessToken`, `access_token`, `token` o `jwt` como token de acceso
- reconocer `refreshToken` o `refresh_token` como refresh token
- retornar ambos valores desde `login`
- agregar una funcion `refreshSession(refreshToken)` que consuma `POST /api/auth/refresh`
- normalizar la respuesta de refresh para soportar token rotado o token vigente

### 9.2 Persistencia de sesion

Actualizar `frontend/src/shared/auth/session.js` para:

- guardar `authRefreshToken` en `localStorage`
- exponer una funcion para obtener el refresh token activo
- permitir actualizar solo el `accessToken` despues de una renovacion exitosa
- conservar rol, correo y nombre al renovar sesion
- eliminar `authRefreshToken` en `clearSession`
- evitar que `getAuthToken()` borre toda la sesion apenas detecte expiracion local si todavia existe refresh token

### 9.3 Interceptor global de API

Actualizar `frontend/src/shared/services/api.service.js` para:

- interceptar respuestas `401` de rutas protegidas
- excluir login y refresh del reintento automatico
- intentar una unica renovacion con `POST /api/auth/refresh`
- actualizar el header `Authorization` con el nuevo access token
- reintentar la peticion original despues de renovar
- evitar multiples llamadas simultaneas a refresh cuando varias peticiones fallen al mismo tiempo
- limpiar sesion y redirigir a `/login` solo si la renovacion falla

### 9.4 Logout

Actualizar el flujo de cierre de sesion para:

- limpiar `accessToken`, `refreshToken`, rol y datos de usuario
- consumir `POST /api/auth/logout` si backend lo expone en la version implementada
- no bloquear el logout local si el endpoint remoto falla

## 10. Flujo esperado

```text
1. Usuario inicia sesion en /login
2. Frontend recibe accessToken y refreshToken
3. Frontend guarda ambos tokens
4. Frontend usa accessToken en Authorization: Bearer <accessToken>
5. accessToken expira despues de 15 minutos
6. Una peticion protegida recibe 401 del gateway
7. Frontend llama POST /api/auth/refresh con refreshToken
8. Backend entrega nuevo accessToken y opcionalmente nuevo refreshToken
9. Frontend actualiza la sesion local
10. Frontend reintenta la peticion original
11. Usuario continua trabajando sin volver al login
```

Si el `refreshToken` esta vencido, revocado o ausente, el frontend debe limpiar la sesion y redirigir a `/login`.

## 11. Criterios de aceptacion

1. El login debe guardar `accessToken` y `refreshToken` cuando backend los entregue.
2. Las peticiones protegidas deben seguir enviando `Authorization: Bearer <accessToken>`.
3. Si una peticion protegida responde `401` por expiracion del access token, el frontend debe intentar renovar sesion mediante `POST /api/auth/refresh`.
4. Si la renovacion es exitosa, el frontend debe guardar el nuevo access token.
5. Si backend devuelve un nuevo refresh token, el frontend debe reemplazar el anterior.
6. Despues de renovar, el frontend debe reintentar la peticion original una sola vez.
7. El usuario no debe ser redirigido al login cuando la renovacion sea exitosa.
8. Si la renovacion falla por `401`, `403` o refresh token ausente, el frontend debe limpiar sesion y redirigir a `/login`.
9. El endpoint de login no debe disparar renovacion automatica.
10. El endpoint de refresh no debe entrar en ciclos de reintento.
11. El logout debe limpiar tambien el refresh token.
12. El control de rutas protegidas debe seguir funcionando con la sesion renovada.
13. Los roles `ADMIN`, `FARMACEUTICO` y `AUDITOR` deben conservar su navegacion y permisos tras renovar el access token.
14. Los mensajes al usuario no deben indicar que debe volver a iniciar sesion si la renovacion fue exitosa.
15. Deben documentarse pruebas manuales o QA para login, expiracion, refresh exitoso y refresh fallido.

## 12. Casos de prueba sugeridos

### CP-HU-FE-15-01 - Login guarda ambos tokens

- **Accion:** iniciar sesion con credenciales validas.
- **Resultado esperado:** se guardan `authToken` y `authRefreshToken`; el usuario entra a su ruta por rol.

### CP-HU-FE-15-02 - Peticion protegida con access token vigente

- **Accion:** consumir Inventario, Movimientos, Alertas o Reportes con access token valido.
- **Resultado esperado:** la peticion incluye `Authorization: Bearer <accessToken>` y responde correctamente.

### CP-HU-FE-15-03 - Renovacion automatica por token expirado

- **Accion:** usar un access token expirado y refresh token valido.
- **Resultado esperado:** el frontend llama `POST /api/auth/refresh`, actualiza el access token y reintenta la peticion original.

### CP-HU-FE-15-04 - Refresh token expirado o revocado

- **Accion:** usar un refresh token invalido, expirado o revocado.
- **Resultado esperado:** el frontend limpia sesion y redirige a `/login`.

### CP-HU-FE-15-05 - Multiples peticiones con access token expirado

- **Accion:** disparar varias peticiones protegidas al mismo tiempo con access token expirado.
- **Resultado esperado:** el frontend realiza una sola renovacion efectiva y reintenta las peticiones con el nuevo access token.

### CP-HU-FE-15-06 - Logout limpia sesion completa

- **Accion:** cerrar sesion desde el sidebar.
- **Resultado esperado:** se eliminan access token, refresh token y datos de usuario; el usuario vuelve a `/login`.

## 13. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Ciclo infinito de refresh ante 401 | Alto | Marcar la peticion reintentada y excluir `/api/auth/refresh` del interceptor |
| Varias renovaciones simultaneas | Medio | Compartir una promesa de refresh en curso |
| Refresh token ausente por sesiones antiguas | Medio | Limpiar sesion y pedir nuevo login una sola vez |
| Backend rota refresh token y frontend conserva el anterior | Alto | Actualizar `authRefreshToken` cuando venga en la respuesta |
| Mensajes de error desactualizados | Bajo | Ajustar mensajes para diferenciar expiracion recuperable de sesion vencida |

## 14. Beneficios esperados

- Mejor experiencia de usuario al evitar relogueos frecuentes.
- Alineacion del frontend con la nueva arquitectura de autenticacion del backend.
- Menor friccion en flujos largos de trabajo.
- Manejo centralizado y consistente de sesion expirada.
- Preparacion del frontend para validacion JWT centralizada en el gateway.

## 15. Resultado esperado

Al completar esta HU, `FarmaExpres` mantendra una sesion funcional basada en `accessToken` y `refreshToken`.

El frontend dejara de expulsar al usuario inmediatamente cuando expire el JWT de acceso y primero intentara renovar la sesion contra `POST /api/auth/refresh`. Solo cuando el refresh token no exista, este vencido o backend lo rechace, se limpiara la sesion y se redirigira a `/login`.

