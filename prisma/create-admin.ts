/**
 * Script para creación o actualización de usuario administrador de bootstrap en producción.
 * 
 * NOTA DE SEGURIDAD:
 * Para evitar que las credenciales queden grabadas en el historial de comandos de la shell (~/.bash_history),
 * se recomienda exportar las variables antes de la ejecución o configurar las variables de entorno en el
 * proveedor de hosting, en lugar de pasarlas en una sola línea en el comando de ejecución.
 * 
 * Ejemplo de ejecución segura por consola:
 *   export ADMIN_EMAIL="admin@ejemplo.com"
 *   export ADMIN_NAME="Administrador"
 *   read -s -p "Introduce contraseña: " ADMIN_PASSWORD
 *   export ADMIN_PASSWORD
 *   npm run create-admin
 *   unset ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD
 */
import { PrismaClient } from '@prisma/client';
// Replicamos el patrón de inicialización de PrismaClient con PrismaPg y pg Pool
// establecido en 'src/lib/db.ts' y 'prisma/seed.ts' para mantener consistencia 
// con la configuración del controlador de base de datos de la aplicación.
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const getPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("La variable de entorno DATABASE_URL no está definida.");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.error("Error: Las variables de entorno ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD son obligatorias.");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Validación básica del formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    console.error("Error: El formato de ADMIN_EMAIL no es válido.");
    process.exit(1);
  }

  // Validación de longitud mínima de contraseña para producción (segura)
  if (password.length < 8) {
    console.error("Error: La contraseña (ADMIN_PASSWORD) debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const prisma = getPrismaClient();

  try {
    // Generar hash seguro de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Buscar si el usuario ya existe
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      console.log(`Usuario existente encontrado con el email: ${normalizedEmail}`);
      console.log("Actualizando nombre y credenciales...");

      // Actualizar datos del usuario
      user = await prisma.user.update({
        where: { email: normalizedEmail },
        data: { name },
      });

      // Crear o actualizar la contraseña asociada
      await prisma.userCredential.upsert({
        where: { userId: user.id },
        update: { passwordHash },
        create: {
          userId: user.id,
          passwordHash,
        },
      });

      console.log(`Usuario actualizado con éxito. ID: ${user.id}`);
    } else {
      console.log(`Creando nuevo usuario con el email: ${normalizedEmail}...`);

      const userId = crypto.randomUUID();

      await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: userId,
            email: normalizedEmail,
            name,
          },
        });

        await tx.userCredential.create({
          data: {
            userId: newUser.id,
            passwordHash,
          },
        });
      });

      console.log(`Usuario creado con éxito. ID: ${userId}`);
    }
  } catch (error: unknown) {
    console.error("Ocurrió un error al procesar el usuario:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error fatal en la ejecución del script:");
  console.error(err.message || err);
  process.exit(1);
});
