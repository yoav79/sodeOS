# Cerebro Empresarial

Cerebro Empresarial es una aplicación web interna para empresas basada en "cerebros" organizados como nodos Markdown anidados de forma recursiva.

El sistema se rige bajo la regla de diseño central de que **todo elemento del árbol es un nodo/página**; no existe una separación rígida entre carpetas y documentos.

---

## Stack Tecnológico y Decisiones Iniciales

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) con arquitectura de Server/Client Components.
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) para tipado estricto.
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) (diseño moderno y rápido sin archivo de configuración JS).
- **Linter**: [ESLint](https://eslint.org/) para verificar consistencia y calidad de código.
- **Alias de importación**: `@/*` mapeado al directorio `src/`.
- **Estructura base**: Uso de la carpeta `src/` para organizar el código de la aplicación.
- **Base de datos (Futura)**: PostgreSQL a través de Supabase (por implementar en fases posteriores).
- **Editor Markdown (Futuro)**: CodeMirror + Markdown preview (por implementar en fases posteriores).
- **Exportación (Futura)**: Soporte para descarga de páginas en formato `.md` y cerebros en formato `.zip`.

---

## Estructura del Proyecto

```
sodeOS/
├── src/
│   ├── app/           # Rutas y páginas de la aplicación
│   ├── components/    # Componentes de UI reutilizables
│   ├── lib/           # Utilidades y constantes globales
│   └── types/         # Definiciones de tipos del dominio
├── public/            # Archivos estáticos y assets
├── .env.local.example # Configuración de variables de entorno
├── tsconfig.json      # Configuración de TypeScript
└── eslint.config.mjs  # Configuración de ESLint
```

---

## Comandos de Desarrollo

En la raíz del proyecto, puedes ejecutar:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Levantar la build de producción localmente
npm run start

# Ejecutar el linter para validación de código
npm run lint
```
