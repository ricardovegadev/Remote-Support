---
name: app-preview
description: Compila la aplicación real de Remote Support 365 (React + Vite + Tailwind CSS v4) en un archivo HTML único, interactivo y autocontenido dentro del directorio de artefactos, y lo muestra embebido directamente en el navegador interno / chat sin usar localhost ni servidores externos. Úsala cuando el usuario invoque /app-preview o pida run app / vista previa autocontenida.
---
# /app-preview — Vista Previa Interactiva Autocontenida en el Navegador Interno

## 1. Cuándo se usa
- Cuando el usuario invoque `/app-preview`, `run app` para vista previa, o solicite ver la aplicación real interactiva directamente en el navegador interno / chat (escritorio o móvil) **sin** levantar `localhost` ni crear marcadores `.url.json`.

## 2. Reglas estrictas
- **Prohibido** iniciar servidores en `localhost` o crear archivos `.url.json`.
- **Prohibido** crear maquetas HTML genéricas; siempre compilar el código real de `src/main.tsx` y los estilos reales de `dist/assets/index-*.css`.
- El artefacto resultante debe ser **100% autocontenido** (CSS, JS e imágenes `.webp`/`.png`/`.jpg`/`.svg` embebidos) y guardarse en `<ArtifactDirectory>/app_preview.html` con `ArtifactMetadata` (`UserFacing: true`, `RequestFeedback: false`).
- **Obligatorio** embeberlo directamente en la respuesta con `<agent-embed src="file://<ArtifactDirectory>/app_preview.html"></agent-embed>` para que se muestre en el navegador interno sin salir de la conversación.

## 3. Pasos de ejecución
1. **Asegurar CSS de producción:** Verificar que exista `dist/assets/index-*.css`; si no existe o hubo cambios recientes, ejecutar `npm run build`.
2. **Registrar el artefacto HTML:** Usar `write_to_file` sobre `<ArtifactDirectory>/app_preview.html` con `UserFacing: true` y `RequestFeedback: false`.
3. **Compilar el bundle autocontenido con `esbuild`:** Compilar `src/main.tsx` con `esbuild` (`bundle: true, minify: true, format: "iife", jsx: "automatic"`, loaders `dataurl` para imágenes) junto con un shim seguro para `history` y `/api/telemetry/*` en modo sandbox.
4. **Mostrar en el navegador interno:** Incluir `<agent-embed src="file://<ArtifactDirectory>/app_preview.html"></agent-embed>` en la respuesta final junto al enlace del artefacto.
