# Recetario Caótico

Un recetario hermoso y divertido donde los usuarios añaden recetas con ingredientes inesperados, las buscan por **ingrediente** y las clasifican por **nivel de caos** (dificultad de 1 a 5). Todo se guarda en una base de datos **SQLite**.

**Sitio desplegado:** En vercel

## Funcionalidades

-  **Crear** recetas con nombre, descripción, emoji o foto, tiempo, porciones, nivel de caos, ingredientes y pasos.
-  **Leer**: galería de tarjetas y vista detallada de cada receta.
-  **Actualizar** cualquier receta.
-  **Eliminar** recetas.
-  **Buscar por ingrediente**: escribe uno o varios separados por coma (`huevo, queso`) y se muestran las recetas que contienen todos.
-  **Filtrar por nivel de caos** y ordenar (más recientes, menos/más caos, más rápidas).
-  **Dados del caos**: genera ingredientes aleatorios para inspirarte.
-  **Sorpréndeme**: abre una receta al azar.
-  Los datos **persisten entre sesiones**.

##  Tecnologías

- TypeScript + Vite
- SQLite en el navegador con [sql.js](https://github.com/sql-js/sql.js), guardado en `localStorage` (Opción B del enunciado)
- Arquitectura MVC (`models`, `views`, `controllers`)
- GitHub y Vercel

## Cómo ejecutarlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compilación para producción
```
