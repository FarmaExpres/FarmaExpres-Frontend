# Documentación del Layout — FarmaExpres

## Descripción General
Este documento describe la estructura visual del sistema FarmaExpres, mostrando cada una de las vistas principales del sistema junto con sus funcionalidades. Sirve como guía para el desarrollo del frontend y referencia para la experiencia de usuario.

---

## Demo del Sistema

Puedes visualizar la demo del sistema en el siguiente enlace:

👉 [FarmaExpres Demo](https://temenico.my.canva.site/farmaexpres)

## Autenticación (Authentication)

### Inicio de Sesión (Login)

Descripción:  
Pantalla principal de acceso al sistema donde el usuario ingresa sus credenciales.

Elementos:
- Input de correo electrónico
- Input de contraseña
- Botón de acceso
- Acceso a recuperación de contraseña

![Login](./Layout/images/login.png)

---

### Recuperar Contraseña

Descripción:  
Permite al usuario recuperar el acceso mediante correo electrónico.

Elementos:
- Input de correo
- Botón para envío de código
- Mensaje informativo

![Forgot Password](./Layout/images/auth-forgot-password-modal.png)

---

## Navegación del Sistema (Sidebar)

### Administrador

Descripción:  
Menú completo con acceso a todos los módulos del sistema.

![Sidebar Admin](./Layout/images/sidebar-admin.png)

---

### Farmacéutico

Descripción:  
Menú enfocado en operaciones de inventario.

![Sidebar Pharmacist](./Layout/images/sidebar-pharmacis.png)

---

### Auditor

Descripción:  
Menú orientado a revisión y control del sistema.

![Sidebar Auditor](./Layout/images/sidebar-auditor.png)

---

## Dashboard

Descripción:  
Vista principal con resumen general del sistema.

Elementos:
- Indicadores (medicamentos, stock, valor, alertas)
- Gráficos de movimientos
- Resumen de alertas
- Medicamentos con mayor movimiento

![Dashboard](./Layout/images/dashboard.png)

---

## Gestión de Usuarios (Users)

Descripción:  
Permite crear, visualizar y gestionar usuarios del sistema.

Elementos:
- Lista de usuarios
- Roles asignados
- Botón de creación
- Modal de registro

![Users](./Layout/images/users.png)

---

## Gestión de Medicamentos (Medicines)

Descripción:  
Permite administrar los medicamentos del inventario.

Elementos:
- Tabla de medicamentos
- Búsqueda
- Estado de vencimiento
- Modal de creación

![Medicines](./Layout/images/medicines.png)

---

## Inventario (Inventory)

### Control de Stock

Descripción:  
Vista general del estado del inventario con análisis de stock.

Elementos:
- Productos críticos
- Indicadores de stock
- Niveles visuales
- Sugerencias de reposición

![Inventory](./Layout/images/inventory.png)

---

### Registro de Entradas

Descripción:  
Permite registrar el ingreso de medicamentos al inventario.

Elementos:
- Selección de medicamento
- Cantidad
- Motivo
- Historial de entradas

![Inventory Entries](./Layout/images/inventory-entries.png)

---

### Registro de Salidas

Descripción:  
Permite registrar la salida de medicamentos del inventario.

Elementos:
- Selección de medicamento
- Cantidad
- Motivo
- Historial de salidas

![Inventory Exits](./Layout/images/inventory-exits.png)

---

## Movimientos (Movements)

Descripción:  
Historial completo de entradas y salidas del sistema.

Elementos:
- Filtros por tipo, fecha y usuario
- Tabla de movimientos
- Estados de registros

![Movements](./Layout/images/movements.png)

---

## Alertas (Alerts)

Descripción:  
Centro de notificaciones del sistema.

Elementos:
- Medicamentos vencidos
- Próximos a vencer
- Bajo stock

![Alerts](./Layout/images/alerts.png)

---

### Destrucción de Medicamentos

Descripción:  
Permite registrar la destrucción de productos vencidos.

Elementos:
- Información del producto
- Cantidad a destruir
- Método de destrucción
- Observaciones

![Destruction Modal](./Layout/images/alerts-destruction-modal.png)
![Destruction Modal](./Layout/images/destruction.png)

---

## Reportes (Reports)

### Inventario

![Reports Inventory](./Layout/images/reports-inventory.png)

---

### Movimientos

![Reports Movements](./Layout/images/reports-movements.png)

---

### Próximos a Vencer

![Reports Expiring](./Layout/images/reports-expiring.png)

---

### Bajo Stock

![Reports Low Stock](./Layout/images/reports-low-stock.png)

---

### Por Usuario

![Reports By User](./Layout/images/reports-by-user.png)

---

## Auditoría (Audit)

### Historial

![Audit History](./Layout/images/audit-history.png)

---

### Inconsistencias

![Audit Inconsistencies](./Layout/images/audit-inconsistencies.png)

---

### Observaciones

![Audit Observations](./Layout/images/audit-observations.png)

---

### Métricas

![Audit Metrics](./Layout/images/audit-metrics.png)

---

## Funcionalidades Globales

### Cambio de Contraseña

Descripción:  
Permite al usuario actualizar su contraseña.

Elementos:
- Contraseña actual
- Nueva contraseña
- Confirmación
- Validaciones de seguridad

![Change Password](./Layout/images/user-change-password-modal.png)

---

## Conclusión

El sistema FarmaExpres cuenta con una estructura modular clara, basada en roles y funcionalidades específicas. Cada vista está diseñada para facilitar la gestión del inventario farmacéutico, garantizando control, trazabilidad y seguridad en las operaciones.