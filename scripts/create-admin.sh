#!/bin/bash

set -e

ENV_FILE=".env.local"

echo "======================================"
echo " Crear nuevo administrador"
echo "======================================"
echo

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: no existe el archivo $ENV_FILE"
  exit 1
fi

DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f2-)

DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"
DATABASE_URL="${DATABASE_URL%\'}"
DATABASE_URL="${DATABASE_URL#\'}"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL no está definido en $ENV_FILE"
  exit 1
fi

read -p "Correo del administrador: " ADMIN_EMAIL
read -p "Nombre del administrador: " ADMIN_NAME

read -s -p "Contraseña del administrador: " ADMIN_PASSWORD
echo
read -s -p "Confirmar contraseña: " ADMIN_PASSWORD_CONFIRM
echo

if [ -z "$ADMIN_EMAIL" ]; then
  echo "Error: el correo no puede estar vacío."
  exit 1
fi

if [ -z "$ADMIN_NAME" ]; then
  echo "Error: el nombre no puede estar vacío."
  exit 1
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: la contraseña no puede estar vacía."
  exit 1
fi

if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  echo "Error: las contraseñas no coinciden."
  exit 1
fi

export DATABASE_URL
export ADMIN_EMAIL
export ADMIN_NAME
export ADMIN_PASSWORD

echo
echo "Creando administrador..."
npm run create-admin

unset DATABASE_URL
unset ADMIN_EMAIL
unset ADMIN_NAME
unset ADMIN_PASSWORD
unset ADMIN_PASSWORD_CONFIRM

echo
echo "Administrador creado correctamente."
