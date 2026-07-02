#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE REMOTO - sodeOS (ejecución en computadora local)
# ==============================================================================
# Uso: ./deploy.remote.sh
# NOTA: Este script se ejecuta en la máquina local de desarrollo y requiere 
# configuración previa en un archivo .env.deploy.local local.
# El archivo .env.deploy.local debe tener formato Bash válido (KEY=value).

set -euo pipefail

# Colores para salida en consola
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_FILE=".env.deploy.local"

echo -e "${BLUE}=== Iniciando despliegue remoto para sodeOS ===${NC}"

# 1. Cargar variables desde .env.deploy.local de forma segura (Bash source)
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: Falta el archivo de configuración local '$ENV_FILE'.${NC}"
    echo -e "${YELLOW}Por favor, cree el archivo '$ENV_FILE' con la siguiente estructura:${NC}"
    echo -e "APP_SSH_HOST=192.168.1.100            # IP o dominio del servidor de aplicación"
    echo -e "APP_SSH_USER=ubuntu                   # Usuario de conexión SSH"
    echo -e "APP_REMOTE_PATH=/var/www/sodeos       # Ruta del proyecto en el servidor"
    echo -e "DEPLOY_BRANCH=main                    # Rama de Git a desplegar (default: main)"
    echo -e "APP_SSH_PORT=22                       # Puerto SSH (opcional, default: 22)"
    echo -e "APP_SSH_KEY_PATH=/path/to/key         # Ruta a llave privada SSH (opcional)"
    exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# 2. Configurar valores por defecto
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_SSH_PORT="${APP_SSH_PORT:-22}"
APP_SSH_KEY_PATH="${APP_SSH_KEY_PATH:-}"

# 3. Validar variables requeridas y tipos de datos
if [ -z "${APP_SSH_HOST:-}" ] || [ -z "${APP_SSH_USER:-}" ] || [ -z "${APP_REMOTE_PATH:-}" ]; then
    echo -e "${RED}ERROR: Faltan variables obligatorias en '$ENV_FILE'.${NC}"
    echo -e "${YELLOW}Asegúrese de definir APP_SSH_HOST, APP_SSH_USER y APP_REMOTE_PATH.${NC}"
    exit 1
fi

if [[ ! "$APP_SSH_PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}ERROR: La variable APP_SSH_PORT debe ser un número entero válido.${NC}"
    exit 1
fi

# 4. Validar existencia de Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: Git no está instalado en la máquina local.${NC}"
    exit 1
fi

# 5. Validar que estemos en un repositorio Git
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Este script debe ejecutarse en el directorio raíz de un repositorio Git.${NC}"
    exit 1
fi

# 6. Validar que el repositorio local esté completamente limpio (incluyendo archivos sin trackear)
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}ERROR: El repositorio local tiene cambios pendientes o archivos no trackeados.${NC}"
    git status --short
    exit 1
fi

# 7. Validar rama actual
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
    echo -e "${RED}ERROR: La rama actual ($CURRENT_BRANCH) no coincide con DEPLOY_BRANCH ($DEPLOY_BRANCH).${NC}"
    exit 1
fi

# 8. Confirmación interactiva antes de proceder
CONFIRM_DEPLOY="${CONFIRM_DEPLOY:-false}"
if [ "$CONFIRM_DEPLOY" != "true" ]; then
    echo -e "${YELLOW}Resumen de los parámetros de despliegue:${NC}"
    echo -e " - Rama local/remota: $DEPLOY_BRANCH"
    echo -e " - Servidor SSH:      $APP_SSH_USER@$APP_SSH_HOST:$APP_SSH_PORT"
    echo -e " - Ruta remota:       $APP_REMOTE_PATH"
    echo -e ""
    read -r -p "Escriba exactamente 'DEPLOY' para continuar: " CONFIRM_INPUT
    if [ "$CONFIRM_INPUT" != "DEPLOY" ]; then
        echo -e "${RED}Despliegue abortado por el usuario.${NC}"
        exit 1
    fi
fi

# 9. Empujar cambios al repositorio remoto central
echo -e "${YELLOW}Empujando últimos cambios locales a origin/$DEPLOY_BRANCH...${NC}"
git push origin "$DEPLOY_BRANCH"
echo -e "${GREEN}Push completado con éxito.${NC}"

# 10. Construir argumentos SSH y validar llave si aplica
SSH_ARGS=("-p" "$APP_SSH_PORT")
if [ -n "$APP_SSH_KEY_PATH" ]; then
    if [ ! -f "$APP_SSH_KEY_PATH" ]; then
        echo -e "${RED}ERROR: No se encontró la llave SSH en la ruta: $APP_SSH_KEY_PATH${NC}"
        exit 1
    fi
    SSH_ARGS+=("-i" "$APP_SSH_KEY_PATH")
fi

# 11. Escapar de forma segura la ruta y rama remota
APP_REMOTE_PATH_ESCAPED=$(printf '%q' "$APP_REMOTE_PATH")
DEPLOY_BRANCH_ESCAPED=$(printf '%q' "$DEPLOY_BRANCH")

echo -e "${YELLOW}Conectando por SSH a $APP_SSH_USER@$APP_SSH_HOST...${NC}"

# 12. Conectarse y detonar el despliegue (inicializando el repositorio si no existe)
ssh "${SSH_ARGS[@]}" "$APP_SSH_USER@$APP_SSH_HOST" "bash -lc '
  # Cargar NVM si está configurado en el perfil del usuario
  if [ -f \"\$HOME/.nvm/nvm.sh\" ]; then
    . \"\$HOME/.nvm/nvm.sh\"
  fi

  if [ ! -d \"$APP_REMOTE_PATH\" ]; then
    echo -e \"Creando directorio de destino remotos...\"
    mkdir -p \"$APP_REMOTE_PATH\"
  fi
  if [ ! -w \"$APP_REMOTE_PATH\" ]; then
    echo -e \"\n\033[0;31m[ERROR] El usuario SSH $APP_SSH_USER no tiene permisos de escritura en la ruta: $APP_REMOTE_PATH\033[0m\"
    echo -e \"\033[0;33mPor favor, inicie sesión en el servidor y otorgue la propiedad de la carpeta al usuario ejecutor:\033[0m\"
    echo -e \"    sudo chown -R $APP_SSH_USER:\$(id -gn $APP_SSH_USER) $APP_REMOTE_PATH\n\"
    exit 1
  fi
  cd \"$APP_REMOTE_PATH\"
  if [ ! -d \".git\" ] || [ ! -f \"deploy.sh\" ]; then
    echo -e \"Repositorio incompleto o no detectado en el servidor. Inicializando/reparando git...\"
    if [ -d \".git\" ]; then
      rm -rf \".git\"
    fi
    git init
    git remote add origin git@github.com:yoav79/sodeOS.git
    git fetch origin
    git checkout -f \"$DEPLOY_BRANCH\"
  fi
  if [ ! -f \".env.local\" ]; then
    echo -e \"Archivo .env.local no encontrado en el servidor. Creando plantilla inicial...\"
    cp .env.production.example .env.local
    echo -e \"[ADVERTENCIA] Se creó un .env.local básico. Recuerde editarlo con sus claves de producción reales.\"
  fi
  chmod +x deploy.sh
  DEPLOY_BRANCH=\"$DEPLOY_BRANCH\" ./deploy.sh
'"

echo -e "${GREEN}=== Despliegue remoto ejecutado con éxito ===${NC}"
