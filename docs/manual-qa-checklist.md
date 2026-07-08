# Manual QA Checklist — Sode OS

## 1. Objetivo
Este documento sirve como la guía de ejecución y control para validar manualmente los flujos de negocio críticos de Sode OS, garantizando la seguridad en el aislamiento de inquilinos (multi-tenant), el cumplimiento de límites de uso por plan, la persistencia en el registro de auditoría, las autorizaciones por rol y la robustez general de la plataforma antes del paso a producción de nuevas versiones.

---

## 2. Alcance
* **Flujos Funcionales:** Autenticación de sesiones, actualización de perfiles personales, creación y navegación en cerebros (brains), manipulación de nodos de información, gestión de adjuntos (attachments), asistente y agente de Inteligencia Artificial (AI), y límites de cuotas mensuales.
* **Flujos Administrativos:** Dashboard global de KPI, listado y detalle de organizaciones, creación de inquilinos y autocompletado inteligente de propietarios (owner search).
* **Control de Seguridad:** Validación de roles en base de datos (`Sysadmin`, `OrgRole`, `BrainRole`), aislamiento de datos entre inquilinos y sanitización de registros de auditoría.
* **Resolución de Host:** Validación de inquilinos en desarrollo local (localhost fallback).

---

## 3. Fuera de Alcance por ahora
* Ejecución de pruebas de carga automatizadas o de concurrencia.
* Flujo de envío físico de correos electrónicos de bienvenida o enlaces smtp.
* Modal o pantalla del selector manual de organización activa (multi-tenant con selector de UI).
* Pasarelas de facturación, suscripciones o cobro recurrente (Billing).

---

## 4. Roles y Permisos

| Rol | Nivel | Descripción y Permisos Asignados |
| :--- | :--- | :--- |
| **Sysadmin** | Global | Usuario con `isSysadmin: true`. Accede a la consola de administración centralizada (`/admin`), puede listar, ver y crear organizaciones y buscar correos de propietarios de forma global. |
| **Usuario Estándar** | Global | No tiene privilegios de sysadmin. Solo opera dentro de las organizaciones a las que pertenece. |
| **org_owner** | Organización | Propietario de la organización. Puede crear cerebros y agregar usuarios a la organización o cerebro. |
| **org_member** | Organización | Miembro básico. Puede ver cerebros a los que sea explícitamente invitado o aquellos que pertenezcan a la organización y tengan visibilidad permitida. |
| **owner** | Cerebro | Administrador del cerebro. Puede borrar el cerebro, modificar su configuración, crear o borrar nodos y cambiar roles de otros miembros del cerebro. |
| **editor** | Cerebro | Puede crear, renombrar, mover y editar el contenido markdown de los nodos, así como subir y borrar adjuntos. |
| **reader** | Cerebro | Acceso de solo lectura a los nodos y adjuntos. No puede realizar modificaciones ni interactuar con herramientas mutables de IA. |

---

## 5. Datos Previos Requeridos (Fixtures / Manual Setup)
Para ejecutar la batería de pruebas, se requiere contar con los siguientes estados/fixtures en la base de datos de desarrollo (ej. ejecutados vía prisma studio o script manual):

1. **Usuario A (Sysadmin):** `isSysadmin: true`.
2. **Usuario B (Owner de Org 1):** Pertenece a la organización `Acme Corp` (slug: `acme-corp`) con rol `org_owner`.
3. **Usuario C (Member de Org 1):** Pertenece a la organización `Acme Corp` con rol `org_member`.
4. **Usuario D (Owner de Org 2):** Pertenece a la organización `Globex` (slug: `globex`) con rol `org_owner`.
5. **Organización demo (slug: `demo`):** Debe existir para pruebas de fallback de desarrollo.
6. **Plan limits Free/Pro:** Límites de uso mensuales bajos configurados en base de datos o mocks para simular desbordamiento rápidamente.

---

## 6. Convenciones de Registro de Resultados
Los casos se ejecutan manualmente. Para cada caso se reporta:
* **Estado:** `[ ] Pendiente` / `[PASS]` / `[FAIL]` / `[BLOCKED]`
* **Evidencia/Notas:** Cualquier detalle relevante del navegador o logs de consola del servidor en caso de fallos.

---

## 7. Casos de Prueba Manuales

### Categoría 1: Autenticación (AUTH)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-001** | Ninguna. | 1. Ir a `/login`. <br>2. Ingresar credenciales válidas y hacer submit. | Redirección al `/dashboard`. Cookie de sesión inyectada correctamente. | `- [ ]` Pendiente | |
| **AUTH-002** | Ninguna. | 1. Ir a `/login`. <br>2. Ingresar contraseña incorrecta y enviar. | Error `"Credenciales incorrectas"` visible. No inicia sesión. | `- [ ]` Pendiente | |
| **AUTH-003** | `REGISTRATION_ACCESS_CODE` configurado en `.env`. | 1. Ir a `/register`. <br>2. Completar campos y usar el access code correcto de registro. | Creación exitosa (`201 Created`). Redirección a login o dashboard. | `- [ ]` Pendiente | |
| **AUTH-004** | `REGISTRATION_ACCESS_CODE` configurado en `.env`. | 1. Ir a `/register`. <br>2. Completar campos y usar un access code incorrecto. | Error `"El código de acceso de registro es incorrecto."` en pantalla. | `- [ ]` Pendiente | |
| **AUTH-005** | Sesión de usuario activa. | 1. Ir al header y pulsar `"Cerrar sesión"` (o ir a `/api/auth/logout` vía post). | Sesión destruida. Redirección automática a la página `/login`. | `- [ ]` Pendiente | |
| **AUTH-006** | Sesión de usuario activa. | 1. Consumir `GET /api/auth/me`. | Retorna JSON con los datos del usuario actual y estatus `200 OK`. | `- [ ]` Pendiente | |
| **AUTH-007** | Sin sesión activa. | 1. Intentar acceder directamente a `/dashboard` o `/brains`. | Redirección automática a la página `/login` mediante middleware/auth guards. | `- [ ]` Pendiente | |

---

### Categoría 2: Perfil de Usuario (PROFILE)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PROFILE-001** | Sesión activa. | 1. Ir a `/profile`. <br>2. Modificar el nombre y guardar cambios. | Los cambios se guardan y reflejan tras recargar la página. | `- [ ]` Pendiente | |
| **PROFILE-002** | Sesión activa. | 1. Ir a cambiar contraseña. <br>2. Ingresar contraseña actual correcta y nueva contraseña válida de 12+ caracteres. | Contraseña actualizada con éxito. | `- [ ]` Pendiente | |
| **PROFILE-003** | Sesión activa. | 1. Ir a cambiar contraseña. <br>2. Ingresar contraseña actual incorrecta. | Mensaje de error visible. La contraseña no se modifica en BD. | `- [ ]` Pendiente | |

---

### Categoría 3: Multi-tenant y Aislamiento (MT)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-001** | `Requiere fixture/manual setup`. Usuario pertenece a una sola organización en desarrollo local. | 1. Iniciar sesión desde `localhost:3000`. <br>2. Navegar a `/brains`. | El sistema resuelve y carga la organización del usuario (`resolveActiveOrganizationForUser`). | `- [ ]` Pendiente | |
| **MT-002** | Usuario B (Org 1) y Brain 2 perteneciente a Org 2. | 1. Con sesión de Usuario B activa, intentar navegar a `/brains/[brainId2]`. | Redirección a Acceso Denegado (403) o error de No Encontrado (404). | `- [ ]` Pendiente | |
| **MT-003** | `Requiere fixture/manual setup`. Usuario con múltiples membresías de organización en localhost. | 1. Iniciar sesión. <br>2. Abrir `/brains` sin subdominio. | El backend de desarrollo debe lanzar error controlado o solicitar selección en lugar de elegir al azar. | `- [ ]` Pendiente | |
| **MT-004** | Organización tiene `isActive: false` en base de datos. | 1. Iniciar sesión e intentar cargar el `/dashboard`. | Mensaje indicando que la organización está suspendida o inactiva. Acceso denegado. | `- [ ]` Pendiente | |

---

### Categoría 4: Gestión de Cerebros (BRAIN)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BRAIN-001** | Sesión activa de un `org_owner`. | 1. Ir a `/brains/new` (o pulsar `"Nuevo Cerebro"`). <br>2. Completar formulario y guardar. | Cerebro creado. Asociado de forma transparente a la organización correcta en la BD. | `- [ ]` Pendiente | |
| **BRAIN-002** | Cerebros existentes en la organización del usuario. | 1. Navegar a `/brains`. | Se muestra el listado ordenado por última actualización. | `- [ ]` Pendiente | |
| **BRAIN-003** | Cerebro existe. Usuario tiene rol `reader` en él. | 1. Navegar a `/brains/[brainId]`. | Acceso exitoso de solo lectura. Opciones de añadir nodo u ordenar deshabilitadas. | `- [ ]` Pendiente | |
| **BRAIN-004** | Cerebro existe. Usuario tiene rol `editor` en él. | 1. Navegar a `/brains/[brainId]`. <br>2. Intentar renombrar o agregar nodos. | Las modificaciones se guardan exitosamente en la base de datos. | `- [ ]` Pendiente | |
| **BRAIN-005** | Cerebro existe. Usuario no es miembro del cerebro pero sí de la organización. | 1. Intentar acceder a `/brains/[brainId]`. | Redirección a pantalla 403 (Acceso Denegado). | `- [ ]` Pendiente | |
| **BRAIN-006** | `Confirmar flujo UI exacto antes de ejecutar`. Cerebro existe, rol `owner`. | 1. Ir a configuración del cerebro. <br>2. Eliminar el cerebro. | El cerebro ya no aparece en el listado y sus nodos quedan inaccesibles. | `- [ ]` Pendiente | |

---

### Categoría 5: Gestión de Nodos (NODE)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NODE-001** | Cerebro abierto con rol `editor` o superior. | 1. Pulsar `"Nuevo Nodo"` en la barra lateral. <br>2. Introducir nombre y confirmar. | El nodo se crea y aparece de inmediato en la jerarquía del cerebro. | `- [ ]` Pendiente | |
| **NODE-002** | Nodo activo seleccionado, rol `editor`. | 1. Escribir texto markdown en el editor. <br>2. Guardar cambios. | El contenido se guarda de forma transparente. | `- [ ]` Pendiente | |
| **NODE-003** | Nodo activo seleccionado, rol `editor`. | 1. Cambiar el nombre del nodo en la barra de herramientas. | El nodo cambia de título y actualiza su slug correspondiente. | `- [ ]` Pendiente | |
| **NODE-004** | Varios nodos creados. | 1. Arrastrar un nodo dentro de otro (cambiar parentId). | La jerarquía visual y de datos se actualiza sin errores. | `- [ ]` Pendiente | |
| **NODE-005** | `Confirmar flujo UI exacto antes de ejecutar`. Nodo modificado. | 1. Ir al panel de versiones del nodo. | Se muestra la lista de versiones anteriores guardadas históricamente. | `- [ ]` Pendiente | |
| **NODE-006** | `Confirmar flujo UI exacto antes de ejecutar`. Versión anterior seleccionada. | 1. Pulsar `"Restaurar versión"`. | El contenido del nodo vuelve al estado de esa versión seleccionada. | `- [ ]` Pendiente | |
| **NODE-007** | Nodo activo seleccionado. | 1. Pulsar `"Archivar nodo"`. | El nodo se remueve del árbol de navegación activa y va a papelera. | `- [ ]` Pendiente | |

---

### Categoría 6: Archivos Adjuntos (ATTACH)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ATTACH-001** | Nodo abierto, rol `editor`. | 1. Subir un archivo de tipo permitido (ej. PDF de 1MB). | Archivo subido con éxito, extraído de texto iniciado, listado en adjuntos. | `- [ ]` Pendiente | |
| **ATTACH-002** | Nodo abierto, rol `editor`. | 1. Subir archivo que exceda el límite del plan (ej. 10MB en Plan Free). | La UI bloquea la subida y arroja el error correspondiente de límites. | `- [ ]` Pendiente | |
| **ATTACH-003** | `Requiere fixture/manual setup`. Cuota total de storage de la organización agotada. | 1. Intentar subir cualquier archivo válido. | Se rechaza la subida por backend devolviendo error de límite. | `- [ ]` Pendiente | |
| **ATTACH-004** | Adjunto existente en el nodo. | 1. Pulsar en descargar archivo adjunto. | Descarga exitosa. La sesión del usuario se valida para autorizar la descarga. | `- [ ]` Pendiente | |
| **ATTACH-005** | Adjunto existente en el nodo, rol `editor`. | 1. Pulsar en borrar adjunto. | El adjunto se remueve. Se genera un registro de auditoría `ATTACHMENT_DELETED`. | `- [ ]` Pendiente | |

---

### Categoría 7: Inteligencia Artificial (AI)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AI-001** | Nodo abierto, rol `editor`. | 1. Escribir comando de IA en barra del editor y enviar. | Retorna la respuesta markdown propuesta en tiempo real. | `- [ ]` Pendiente | |
| **AI-002** | Agente de IA disponible en el editor. | 1. Activar pestaña del Agente. <br>2. Definir una tarea (Plan) y confirmar. | El agente genera una serie de pasos secuenciales y planes de acción. | `- [ ]` Pendiente | |
| **AI-003** | Plan del agente generado. | 1. Confirmar y ejecutar el plan. | El agente escribe y propone inserciones de texto en el nodo. | `- [ ]` Pendiente | |
| **AI-004** | Propuestas del agente creadas. | 1. Pulsar en aplicar cambios propuestos con confirmación. | El contenido markdown del nodo es reemplazado/actualizado con la propuesta. | `- [ ]` Pendiente | |
| **AI-005** | Mocks de cuota de IA en base de datos. Peticiones al límite. | 1. Intentar hacer una consulta de IA. | Retorna error HTTP 429 de límite de peticiones mensuales excedidas. | `- [ ]` Pendiente | |

---

### Categoría 8: Límites de Uso (USAGE)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **USAGE-001** | Sesión activa. | 1. Consumir `GET /api/usage/summary`. | Retorna JSON con desglose de solicitudes de IA, almacenamiento y uploads. | `- [ ]` Pendiente | |
| **USAGE-002** | Sesión activa en el dashboard de la organización. | 1. Visualizar la tarjeta de uso en la UI. | Muestra gráficos y barras de progreso del consumo real del mes. | `- [ ]` Pendiente | |
| **USAGE-003** | Organización tiene asignado plan `enterprise`. | 1. Consultar consumo de recursos. | Los límites no imponen restricciones (se manejan valores `null` en backend). | `- [ ]` Pendiente | |

---

### Categoría 9: Bitácora de Auditoría (AUDIT)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUDIT-001** | Sysadmin logueado, sin logs de auditoría en la BD. | 1. Ir a `/admin/audit-logs`. | La interfaz muestra un state vacío claro indicando que no hay logs aún. | `- [ ]` Pendiente | |
| **AUDIT-002** | Logs guardados en la base de datos. | 1. Ir a `/admin/audit-logs`. <br>2. Aplicar un filtro restrictivo que no devuelva nada. | Muestra mensaje de empty state invitando a reajustar los filtros. | `- [ ]` Pendiente | |
| **AUDIT-003** | Acciones previas ejecutadas (crear org, borrar cerebro). | 1. Navegar por los registros de auditoría. | Se muestran eventos tipo `ORG_CREATED`, `BRAIN_DELETED` con actor y fecha. | `- [ ]` Pendiente | |
| **AUDIT-004** | Evento de auditoría con metadatos. | 1. Expandir los detalles de un log de auditoría. | El JSON renderizado no debe exponer claves bloqueadas (passwords, tokens). | `- [ ]` Pendiente | |

---

### Categoría 10: Consola Sysadmin (ADMIN)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN-001** | Sesión activa de un no-sysadmin (usuario normal). | 1. Forzar navegación directa a `/admin` o `/admin/organizations`. | Redirección inmediata al `/dashboard` o pantalla de Acceso Denegado. | `- [ ]` Pendiente | |
| **ADMIN-002** | Sesión activa de Sysadmin. | 1. Ir a `/admin`. | Muestra métricas globales y KPIs del servidor. | `- [ ]` Pendiente | |
| **ADMIN-003** | Organizaciones creadas en el sistema. | 1. Ir a `/admin/organizations`. | Se muestra el listado paginado con filtros de plan y estado activo. | `- [ ]` Pendiente | |
| **ADMIN-004** | Sesión de Sysadmin activa en `/admin/organizations`. | 1. Pulsar en `"Crear organización"`. <br>2. Introducir un email inexistente de owner. | El validador detecta la ausencia del email y devuelve un `404 Not Found` en la UI. | `- [ ]` Pendiente | |
| **ADMIN-005** | Sesión de Sysadmin activa en `/admin/organizations`. | 1. Escribir nombre de organización y esperar sugerencia. | El slug se autocompleta con caracteres seguros y en minúsculas. | `- [ ]` Pendiente | |
| **ADMIN-006** | Sesión de Sysadmin activa en `/admin/organizations`. | 1. Enviar el formulario con un slug que ya existe en el sistema. | El backend responde con error `409` y el formulario muestra que el slug ya está en uso. | `- [ ]` Pendiente | |
| **ADMIN-007** | Email de propietario válido registrado en base de datos. | 1. Completar formulario de creación de organización usando ese email. | Éxito en creación (`201 Created`). El modal se limpia y cierra automáticamente. | `- [ ]` Pendiente | |
| **ADMIN-008** | Organización recién creada. | 1. Ir a `/admin/organizations/[orgId]` de la nueva org. | Se muestra información general, lista de cerebros (vacía) y contadores en 0. | `- [ ]` Pendiente | |

---

### Categoría 11: Seguridad y Aislamiento de Datos (SEC)

| ID | Precondiciones | Pasos de Reproducción | Resultado Esperado | Estado | Notas / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Sin sesión activa. | 1. Intentar llamar a `GET /api/admin/organizations` o `GET /api/brains`. | El endpoint devuelve una respuesta JSON de error con código HTTP 401. | `- [ ]` Pendiente | |
| **SEC-002** | Sesión activa de no-sysadmin. | 1. Intentar llamar a `POST /api/admin/organizations`. | El endpoint rechaza la petición devolviendo un código HTTP 403. | `- [ ]` Pendiente | |
| **SEC-003** | Sesión activa de sysadmin. | 1. Realizar una llamada a `GET /api/admin/users/search?q=test`. | Retorna únicamente los campos seguros `{ id, email, name }`. No expone contraseñas. | `- [ ]` Pendiente | |
| **SEC-004** | Ninguna. | 1. Examinar cookies del navegador y localStorage tras iniciar sesión. | No se guardan contraseñas en plano, datos sensibles o tokens del backend. | `- [ ]` Pendiente | |
