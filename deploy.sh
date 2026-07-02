#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE AUTOMATIZADO - sodeOS (cerebro-empresarial)
# ==============================================================================
# Uso: ./deploy.sh
# NOTA: Ejecutar este script en el servidor dentro de la carpeta del proyecto.
# Si el script no tiene permisos de ejecución, ejecutar: chmod +x deploy.sh

set -euo pipefail

# Colores para salida en consola
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;3m' # No Color

echo -e "${BLUE}=== Iniciando proceso de despliegue para sodeOS ===${NC}"

# 1. Verificar si estamos dentro de un repositorio de Git
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Este script debe ser ejecutado dentro de un repositorio de Git.${NC}"
    exit 1
fi

# 2. Verificar existencia de package.json
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: No se encontró package.json en el directorio actual.${NC}"
    exit 1
fi

# 3. Verificar existencia de .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}ERROR: Falta el archivo .env.local con las variables de entorno de producción.${NC}"
    echo -e "${YELLOW}Por favor, copie .env.production.example a .env.local y configure sus credenciales antes de continuar.${NC}"
    exit 1
fi

# 4. Git fetch y pull de la rama configurada
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
echo -e "${YELLOW}Actualizando código desde la rama: ${DEPLOY_BRANCH}...${NC}"
git fetch origin
git checkout "$DEPLOY_BRANCH"
git pull origin "$DEPLOY_BRANCH"
echo -e "${GREEN}Código actualizado correctamente.${NC}"

# 5. Instalar dependencias limpias (incluye devDependencies para el build)
echo -e "${YELLOW}Instalando dependencias (npm ci)...${NC}"
npm ci
echo -e "${GREEN}Dependencias instaladas.${NC}"

# 6. Aplicar migraciones pendientes de Prisma
echo -e "${YELLOW}Aplicando migraciones de base de datos con Prisma...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}Base de datos actualizada con éxito.${NC}"

# 7. Compilar Next.js para producción
echo -e "${YELLOW}Compilando la aplicación Next.js (npm run build)...${NC}"
npm run build
echo -e "${GREEN}Aplicación compilada con éxito.${NC}"

# 8. Arrancar o recargar proceso con PM2
echo -e "${YELLOW}Recargando proceso en PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}ERROR: PM2 no está instalado globalmente en el sistema.${NC}"
    echo -e "${YELLOW}Por favor, instálelo con: npm install -g pm2${NC}"
    exit 1
fi

pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo -e "${GREEN}=== Despliegue completado con éxito ===${NC}"
echo -e "${BLUE}El servicio 'sodeos' se encuentra corriendo y monitoreado por PM2.${NC}"
