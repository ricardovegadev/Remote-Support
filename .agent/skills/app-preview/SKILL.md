---
name: app-preview
description: Compila la aplicación real de Remote Support 365 (React + Vite + Tailwind CSS v4) en un archivo HTML único, interactivo y autocontenido dentro del directorio de artefactos, para abrirlo en una pestaña nueva sin usar localhost ni embeberlo en la consola. Úsala cuando el usuario invoque /app-preview o pida run app / vista previa autocontenida.
---
# /app-preview — Vista Previa Interactiva Autocontenida (Pestaña Nueva)

## 1. Cuándo se usa
- Cuando el usuario invoque `/app-preview`, `run app` para vista previa, o solicite abrir la aplicación real interactiva en una pestaña nueva (escritorio o móvil) **sin** levantar `localhost`, **sin** crear marcadores `.url.json` y **sin** embeberla dentro de la consola.

## 2. Reglas estrictas
- **Prohibido** iniciar servidores en `localhost` o crear archivos `.url.json`.
- **Prohibido** usar `<agent-embed>` dentro del chat/consola; la vista previa debe entregarse como artefacto `.html` para abrir en una pestaña nueva.
- **Prohibido** crear maquetas HTML genéricas; siempre compilar el código real de `src/main.tsx` y los estilos reales de `dist/assets/index-*.css`.
- **Siempre** refrescar el artefacto `<ArtifactDirectory>/app_preview.html` mediante `write_to_file` (`UserFacing: true`, `RequestFeedback: false`) en cada invocación para que la tarjeta de apertura inmediata aparezca en el turno actual.

## 3. Pasos de ejecución
1. **Asegurar CSS de producción:** Verificar que exista `dist/assets/index-*.css`; si no existe o hubo cambios recientes, ejecutar `npm run build`.
2. **Compilar el bundle autocontenido con `esbuild`:** Compilar `src/main.tsx` con `esbuild` (`bundle: true, minify: true, format: "iife", jsx: "automatic"`, loaders `dataurl` para imágenes) junto con un shim seguro para `history` y `/api/telemetry/*` en modo sandbox, y registrar/actualizar `<ArtifactDirectory>/app_preview.html` con `write_to_file` (`UserFacing: true`, `RequestFeedback: false`) para disparar la tarjeta en el turno actual.
3. **Entregar al usuario:** Compartir únicamente el enlace/tarjeta de `app_preview.html` para abrir en una pestaña nueva (sin `<agent-embed>`).
