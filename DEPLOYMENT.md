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
