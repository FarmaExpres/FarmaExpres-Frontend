# HU-QA-FE-12 - Inventario solo lectura para Auditor

## Titulo
Habilitar acceso de solo lectura al modulo **Inventario** para el rol **Auditor**

## Historia de Usuario
Como **auditor**,
quiero **visualizar e ingresar al modulo de Inventario desde el menu lateral en modo solo lectura**,
para **consultar la informacion de existencias, cantidades y estado de los productos sin modificar los datos del sistema**.

## Descripcion
En la interfaz del sistema se observa la opcion **Inventario** dentro del menu lateral. Actualmente, el rol **auditor** no puede ver ni acceder a esta casilla. Se requiere que el rol **auditor** pueda visualizar esta opcion e ingresar al modulo de inventario, pero unicamente con permisos de consulta.

## Justificacion
El auditor necesita acceder a la informacion del inventario para realizar procesos de verificacion, seguimiento y control sobre las existencias registradas en el sistema. Sin embargo, este acceso debe limitarse a la visualizacion de la informacion, evitando modificaciones que puedan afectar la integridad del stock registrado.

## Criterios de aceptacion
1. El usuario con rol **auditor** debe visualizar la opcion **Inventario** en el menu lateral.
2. El usuario con rol **auditor** debe poder ingresar al modulo **Inventario**.
3. El usuario con rol **auditor** solo podra consultar la informacion del inventario.
4. El usuario con rol **auditor** no podra crear, editar ni eliminar registros dentro del modulo **Inventario**.
5. El sistema debe respetar la configuracion de permisos por rol para garantizar acceso unicamente de lectura.
6. El acceso del rol **auditor** al modulo debe limitarse estrictamente a funciones de consulta.

## Prioridad
Alta

## Resultado esperado
El rol **auditor** podra acceder a la opcion **Inventario** y consultar la informacion disponible en modo de solo lectura, sin posibilidad de alterar los datos del inventario.
