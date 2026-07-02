# Guía de Despliegue en Producción — sodeOS

Este documento detalla el procedimiento para desplegar y mantener la aplicación **sodeOS (cerebro-empresarial)** en un servidor Linux (Ubuntu/Debian) utilizando **Node.js**, **PM2**, **Nginx** como reverse proxy, y **PostgreSQL**.

---

## Prerrequisitos en el Servidor

Antes de comenzar, asegúrese de tener instalados los siguientes paquetes en su servidor Linux:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (se recomienda v20 LTS o superior)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL y Nginx
sudo apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx git

# Instalar PM2 de manera global para gestionar el proceso Node.js
sudo npm install -g pm2
```

---

## 1. Configuración de Base de Datos (PostgreSQL)

Entre a la consola de PostgreSQL y cree la base de datos y el usuario:

```bash
sudo -i -u postgres psql
```

Dentro del prompt de SQL, ejecute:

```sql
CREATE DATABASE sodeos_prod;
CREATE USER sodeos_user WITH PASSWORD 'cambiar_por_una_contrasena_segura';
GRANT ALL PRIVILEGES ON DATABASE sodeos_prod TO sodeos_user;
ALTER DATABASE sodeos_prod OWNER TO sodeos_user;
\q
```
*Nota: PostgreSQL viene configurado por defecto para escuchar únicamente en `127.0.0.1` (localhost), garantizando que no esté expuesto públicamente.*

---

## 2. Preparación de la Carpeta del Proyecto

1. Clonar el repositorio en el directorio deseado (por ejemplo, `/var/www/sodeos`):
   ```bash
   sudo mkdir -p /var/www/sodeos
   sudo chown -R $USER:$USER /var/www/sodeos
   git clone git@github.com:yoav79/sodeOS.git /var/www/sodeos
   cd /var/www/sodeos
   ```

2. Configurar las variables de entorno de producción:
   ```bash
   cp .env.production.example .env.local
   nano .env.local
   ```
   Rellene las credenciales de base de datos (`DATABASE_URL`), R2, OpenAI y Serper API.

---

## 3. Primer Despliegue Manual

Para el primer inicio de la aplicación, siga estos pasos manualmente para asegurarse de que todo configure de forma limpia:

1. **Instalar dependencias**:
   ```bash
   npm ci
   ```

2. **Aplicar Migraciones de Prisma**:
   ```bash
   npx prisma migrate deploy
   ```
   *ADVERTENCIA: En producción nunca use `prisma migrate dev` ya que podría resetear la base de datos. Utilice siempre `prisma migrate deploy`.*

3. **(Opcional) Poblar base de datos con datos semilla**:
   ```bash
   npm run prisma:seed
   ```

4. **Compilar el proyecto**:
   ```bash
   npm run build
   ```

5. **Iniciar la aplicación con PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

6. **Guardar lista de procesos de PM2 y configurar arranque del sistema**:
   ```bash
   pm2 save
   pm2 startup
   ```
   *Copie y ejecute el comando que la salida de `pm2 startup` le indique para configurar el inicio del servicio al reiniciar el servidor.*

---

## 4. Configuración del Reverse Proxy (Nginx)

1. Copie el archivo de configuración provisto al directorio de Nginx:
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/sodeos
   ```

2. Edite el archivo para ajustar los placeholders de dominio y las rutas de certificados:
   ```bash
   sudo nano /etc/nginx/sites-available/sodeos
   ```

3. Habilite el sitio creando el enlace simbólico y valide la configuración:
   ```bash
   sudo ln -s /etc/nginx/sites-available/sodeos /etc/nginx/sites-enabled/
   sudo nginx -t
   ```

4. Reinicie Nginx si la verificación fue exitosa:
   ```bash
   sudo systemctl reload nginx
   ```

5. **Configuración de SSL con Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
   ```
   Certbot modificará automáticamente la configuración de Nginx para redirigir y apuntar a los certificados SSL recién generados.

---

## 5. Despliegues Posteriores (Automatizados)

Para actualizaciones subsiguientes, se ha creado un script automatizado seguro `deploy.sh`. 

1. Asegúrese de otorgar permisos de ejecución al script antes de usarlo por primera vez:
   ```bash
   chmod +x deploy.sh
   ```

2. Ejecute el script cada vez que necesite desplegar cambios:
   ```bash
   ./deploy.sh
   ```

### ¿Qué realiza `deploy.sh`?
- Verifica que el entorno sea un repositorio Git y que exista `.env.local`.
- Realiza `git fetch` y `git pull` de la rama configurada (por defecto `main`).
- Instala limpiamente dependencias con `npm ci`.
- Ejecuta `npx prisma migrate deploy` para actualizar el esquema de base de datos sin alterar datos.
- Compila la aplicación con `npm run build`.
- Realiza un `pm2 startOrReload` de manera segura y sin downtime (gracias al modo cluster).

---

## 6. Operación y Mantenimiento

### Ver Logs del Servidor
```bash
# Ver logs de la aplicación Next.js/PM2 en tiempo real
pm2 logs sodeos

# Ver logs de errores de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Monitoreo de Procesos
```bash
pm2 monit
```

### Rollback Rápido (Reversión)
Si un despliegue falla en producción, puede volver rápidamente al último commit estable:
```bash
git checkout <commit-hash-anterior>
npm ci
npm run build
pm2 reload sodeos
```

### Backups Automáticos de Base de Datos
Se recomienda programar un cron job diario para respaldar la base de datos de PostgreSQL:

```bash
# Crear directorio de respaldo
mkdir -p ~/backups/db

# Comando de respaldo manual
pg_dump -U sodeos_user -h 127.0.0.1 sodeos_prod > ~/backups/db/sodeos_backup_$(date +%F).sql
```

---

## 7. Despliegue Remoto desde Computadora Local

El script `deploy.remote.sh` permite automatizar el ciclo de actualización enviando los cambios locales al repositorio Git remoto y ejecutando el despliegue en el servidor de aplicación vía SSH de manera controlada.

### Configuración del Entorno Local

1. Cree el archivo de configuración `.env.deploy.local` en la raíz de su máquina local de desarrollo:
   ```bash
   APP_SSH_HOST=your-app-server-ip-or-domain
   APP_SSH_USER=ubuntu
   APP_REMOTE_PATH=/var/www/sodeos
   DEPLOY_BRANCH=main
   APP_SSH_PORT=22
   # APP_SSH_KEY_PATH=/path/to/private/ssh/key  # Opcional si usa ssh-agent
   ```
   *Nota: Este archivo está ignorado en `.gitignore` por defecto para evitar subir credenciales.*

2. Otorgue permisos de ejecución al script local:
   ```bash
   chmod +x deploy.remote.sh
   ```

3. Ejecute el despliegue:
   ```bash
   ./deploy.remote.sh
   ```

### Pasos ejecutados por el script local:
- Carga las variables de `.env.deploy.local`.
- Valida que Git esté instalado y que se encuentre en la raíz del repositorio.
- Verifica que el estado de trabajo local esté limpio de cambios sin commit.
- Valida que la rama local coincida con la rama configurada (`DEPLOY_BRANCH`).
- Empuja automáticamente los cambios locales al repositorio Git de origen (`git push origin`).
- Se conecta vía SSH al servidor de aplicación y ejecuta el script local del servidor `./deploy.sh` cargando la rama como variable de entorno.

---

## 8. Arquitectura con Servidor PostgreSQL Separado

Cuando el servidor de aplicación y el servidor de base de datos PostgreSQL corren de forma distribuida en infraestructura separada:

### Configuración en el Servidor de Base de Datos

1. **Configuración de Escucha (`postgresql.conf`)**:
   Habilite el servicio para escuchar en su dirección IP de red privada (o en todas usando `*` si la red interna es de confianza):
   ```text
   listen_addresses = '*'
   ```

2. **Control de Acceso (`pg_hba.conf`)**:
   Restrinja el acceso de base de datos a nivel de aplicación agregando una regla específica en el archivo `/etc/postgresql/.../main/pg_hba.conf`. Permita únicamente la IP del servidor de aplicación:
   ```text
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    sodeos_prod     sodeos_user     APP_SERVER_PRIVATE_IP/32  scram-sha-256
   ```

3. **Firewall del Sistema (UFW / Security Groups)**:
   Bloquee el puerto `5432` a nivel público. Solo habilite el tráfico de entrada desde la IP del servidor de aplicación:
   ```bash
   sudo ufw allow from APP_SERVER_PRIVATE_IP to any port 5432 proto tcp
   ```

### Configuración en el Servidor de Aplicación

1. **Conexión de Base de Datos (`.env.local`)**:
   Actualice la cadena de conexión de Prisma para que apunte a la IP o Host privado del servidor PostgreSQL remoto en lugar de `127.0.0.1`:
   ```bash
   DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_PRIVATE_HOST:5432/DB_NAME?schema=public"
   ```

2. **Seguridad y Cifrado (SSL)**:
   Si la comunicación entre servidores pasa por redes públicas o no seguras, habilite SSL añadiendo el parámetro a la cadena de conexión (ej: `&sslmode=require` o `&sslcert=...`).

3. **Copias de Seguridad (Backups)**:
   Las copias de seguridad de la base de datos deben configurarse y programarse a nivel del servidor PostgreSQL (mediante un cron job con `pg_dump`) o dirigirse directamente a un almacenamiento en la nube externo e independiente.

