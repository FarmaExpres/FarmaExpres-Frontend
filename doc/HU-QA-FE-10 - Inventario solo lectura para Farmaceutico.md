# HU-QA-FE-10 - Inventario solo lectura para Farmacéutico

## 1. Historia de Usuario

### 1.1 Identificación

- **Título:** Acceso de solo lectura al Inventario para rol Farmacéutico
- **ID:** HU-FE-10
- **Relacionado:** Ajuste RBAC Frontend Inventario
- **Prioridad:** Must Have (Alta)

### 1.2 Descripción

Como **usuario con rol Farmacéutico**,  
quiero **ingresar a la opción Inventario desde el menú lateral y visualizar la tabla de inventario**,  
para **consultar existencias, stock mínimo, precio, referencia FEFO y estado de los medicamentos sin poder modificarlos**.

### 1.3 Justificación

Actualmente, el rol **Farmacéutico** visualiza en el sidebar la opción **Inventario**, pero no puede ingresar al módulo ni consultar su contenido.

Esto genera una inconsistencia funcional y de experiencia de usuario, porque:

- el sistema muestra una opción de navegación que no está habilitada realmente para ese rol;
- el farmacéutico requiere consultar el inventario para apoyar tareas operativas relacionadas con dispensación, reposición y validación de stock;
- la consulta de datos como stock útil, stock mínimo y referencia FEFO es necesaria para la toma de decisiones en el flujo diario;
- la necesidad del rol en este módulo es de **consulta**, no de administración.

Por lo anterior, se requiere habilitar el acceso del rol **Farmacéutico** al módulo **Inventario** bajo un esquema de **solo lectura**.

### 1.4 Criterios de Aceptación

#### Navegación y acceso

- [ ] El rol **Farmacéutico** puede ingresar a la opción **Inventario** desde el menú lateral.
- [ ] La opción **Inventario** deja de comportarse como acceso bloqueado para el rol Farmacéutico.
- [ ] Si el usuario Farmacéutico navega directamente por URL a la ruta de inventario, el sistema permite el acceso.

#### Visualización de información

- [ ] El rol **Farmacéutico** visualiza la tabla de inventario.
- [ ] La tabla muestra información de consulta como:
  - código
  - nombre
  - stock útil
  - stock mínimo
  - precio
  - referencia FEFO
  - estado
- [ ] La información visible para Farmacéutico mantiene el mismo criterio visual del inventario general.

#### Restricción de acciones

- [ ] El rol **Farmacéutico** no visualiza acciones de edición.
- [ ] El rol **Farmacéutico** no visualiza acciones de actualización.
- [ ] El rol **Farmacéutico** no visualiza acciones de eliminación o desactivación.
- [ ] Si intenta acceder por navegación o interacción a acciones de modificación, el sistema debe impedirlo.

#### Control de acceso

- [ ] El rol **Administrador** mantiene acceso completo al módulo Inventario.
- [ ] El rol **Farmacéutico** tiene acceso limitado a consulta.
- [ ] El control de acceso se aplica tanto en menú/sidebar como en rutas del frontend.

#### Respuesta del sistema

**Éxito:**

- [ ] El Farmacéutico puede abrir el módulo y consultar el inventario.

**Sin datos:**

- [ ] Si no existen registros visibles, se muestra mensaje vacío correspondiente.

**Error:**

- [ ] Si falla la carga del inventario, se muestra mensaje de error sin exponer acciones de modificación.

### 1.5 Checklist QA

- [ ] El rol Farmacéutico puede abrir Inventario desde sidebar.
- [ ] El rol Farmacéutico puede consultar la tabla de inventario.
- [ ] La tabla conserva columnas relevantes de consulta.
- [ ] No se muestran botones de editar al Farmacéutico.
- [ ] No se muestran botones de eliminar/desactivar al Farmacéutico.
- [ ] La ruta de inventario respeta acceso por rol.
- [ ] El rol Administrador no pierde capacidades actuales.

### 1.6 Implementación Propuesta

#### Ajuste funcional esperado

Se habilitará el acceso del rol **Farmacéutico** al módulo de inventario existente, reutilizando la vista actual de listado de medicamentos, pero aplicando restricciones visuales y funcionales para que opere en modo **solo lectura**.

#### Cómo se implementará

1. **Habilitar navegación del sidebar para Farmacéutico**
   - Asociar la opción **Inventario** del menú lateral con el módulo/ruta de inventario.
   - Asegurar que el clic del rol Farmacéutico dirija al listado de inventario.

2. **Ajustar permisos de ruta en frontend**
   - Permitir que el rol Farmacéutico acceda a la ruta de inventario.
   - Mantener bloqueadas para Farmacéutico las rutas de creación, edición o acciones de modificación.

3. **Renderizar inventario en modo consulta para Farmacéutico**
   - Reutilizar la tabla actual de medicamentos/inventario.
   - Mostrar únicamente la información de consulta.
   - Ocultar o deshabilitar acciones de edición/desactivación.

4. **Aplicar RBAC en acciones**
   - Validar por rol la visibilidad de botones de acción dentro de la tabla.
   - Evitar que el rol Farmacéutico pueda disparar flujos de actualización o eliminación.

5. **Mantener consistencia con la vista esperada**
   - Conservar columnas como stock útil, stock mínimo, precio, referencia FEFO y estado.
   - Preservar experiencia de lectura similar a la referencia visual esperada.

### 1.7 Archivos que se modificarán

> Sección de alcance técnico esperado para implementar la HU.

- `frontend/src/layout/components/Sidebar.jsx`
  - Habilitar el acceso interactivo del ítem **Inventario** para el rol Farmacéutico.

- `frontend/src/App.jsx`
  - Ajustar permisos de navegación y acceso por ruta al módulo de inventario para el rol Farmacéutico.
  - Mantener protegidas las rutas de creación/edición si continúan siendo exclusivas de administración.

- `frontend/src/medicines/pages/MedicinesPage.jsx`
  - Soportar comportamiento de consulta para Farmacéutico.
  - Restringir disparo de flujos que lleven a crear/editar/desactivar.

- `frontend/src/medicines/components/MedicinesTable.jsx`
  - Ocultar o bloquear acciones de editar y desactivar cuando el rol sea Farmacéutico.

- `frontend/src/shared/constants/roles.js`
  - Ajustar reglas si se requiere centralizar permisos o rutas permitidas por rol.

### 1.8 Notas Técnicas

- La HU no requiere crear una vista nueva; puede apoyarse en la tabla/listado de inventario existente.
- El cambio debe respetar RBAC tanto a nivel visual como de navegación.
- El rol Farmacéutico tendrá permisos de **lectura** sobre inventario, pero no de **modificación**.
- Se recomienda mantener la validación de permisos también a nivel de rutas para evitar accesos directos a acciones no permitidas.

### 1.9 Flujo de Usuario

1. El usuario inicia sesión con rol **Farmacéutico**.  
2. Visualiza la opción **Inventario** en el sidebar.  
3. Hace clic sobre **Inventario**.  
4. El sistema abre la vista del inventario.  
5. El usuario consulta stock útil, stock mínimo, precio, referencia FEFO y estado.  
6. El usuario no dispone de controles para editar ni eliminar registros.  

---

## 2. Casos de Prueba Propuestos (HU-FE-10)

> Ruta sugerida de evidencias: `doc/images/HU-FE-10/`

### CP-HU-FE-10-01 - Acceso a Inventario desde sidebar (Farmacéutico)

- **Objetivo:** Validar que el rol Farmacéutico puede ingresar al módulo Inventario.
- **Acción ejecutada:** Iniciar sesión como farmacéutico y hacer clic en **Inventario**.
- **Resultado esperado:** Se abre la vista de inventario correctamente.
- **Evidencia:** Pendiente.

### CP-HU-FE-10-02 - Visualización de tabla de inventario

- **Objetivo:** Validar que el Farmacéutico visualiza el listado de inventario.
- **Acción ejecutada:** Revisar la tabla cargada en el módulo Inventario.
- **Resultado esperado:** Se muestran columnas de consulta como código, nombre, stock útil, stock mínimo, precio, referencia FEFO y estado.
- **Evidencia:** Pendiente.

### CP-HU-FE-10-03 - Ocultamiento de acciones de edición

- **Objetivo:** Validar que el Farmacéutico no puede editar registros.
- **Acción ejecutada:** Revisar la columna de acciones en la tabla.
- **Resultado esperado:** No se muestran botones de editar para el rol Farmacéutico.
- **Evidencia:** Pendiente.

### CP-HU-FE-10-04 - Ocultamiento de acciones de eliminación/desactivación

- **Objetivo:** Validar que el Farmacéutico no puede desactivar o eliminar registros.
- **Acción ejecutada:** Revisar la columna de acciones en la tabla.
- **Resultado esperado:** No se muestran botones de desactivar/eliminar para el rol Farmacéutico.
- **Evidencia:** Pendiente.

### CP-HU-FE-10-05 - Protección de rutas de modificación

- **Objetivo:** Validar que el Farmacéutico no accede a rutas de cambio.
- **Acción ejecutada:** Intentar navegar manualmente a rutas de crear o editar medicamentos.
- **Resultado esperado:** El sistema bloquea el acceso o redirige a una ruta permitida.
- **Evidencia:** Pendiente.

### CP-HU-FE-10-06 - Acceso completo se mantiene para Administrador

- **Objetivo:** Validar que el cambio no afecta los permisos del Administrador.
- **Acción ejecutada:** Iniciar sesión como administrador y abrir Inventario.
- **Resultado esperado:** El Administrador mantiene acceso completo con acciones disponibles.
- **Evidencia:** Pendiente.

---

## 3. Conclusiones Esperadas

- La HU-FE-10 habilita la consulta del inventario para el rol **Farmacéutico** de forma consistente con el menú lateral.
- Se resuelve la inconsistencia actual entre la opción visible en sidebar y el acceso real al módulo.
- Se mantiene el principio de seguridad por roles, limitando al Farmacéutico a un alcance de **solo lectura**.
