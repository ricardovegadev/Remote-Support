---
name: rs365-ui-polish
description: Especialista en frontend React 19, Tailwind CSS 4, accesibilidad WCAG, responsive móvil y generación de previews autocontenidos para Remote Support 365.
---

# rs365-ui-polish

## 1. Cuándo se usa
- Al diseñar, corregir o pulir componentes en `src/components/`, `src/App.tsx` o `index.html`.
- Al resolver problemas de UX, estados vacíos, guardias anti doble envío, accesibilidad (ARIA, labels, modales) o vista móvil.
- Cuando el usuario solicita una vista previa visual de la app real (especialmente para móvil).

## 2. Qué necesita para empezar
- Descripción del cambio de UI/UX o bug visual reportado.
- Lectura de los componentes involucrados en `src/components/` y el diseño base en `src/index.css`.

## 3. Pasos en orden
1. Inspeccionar los componentes afectados y preservar las convenciones visuales, tipografía y clases Tailwind del proyecto.
2. Implementar los cambios cuidando accesibilidad (`htmlFor`/`id`, `aria-label`, cierre de modales por fondo/Escape, estados de carga y estados vacíos).
3. Verificar que no haya banners de error duplicados ni mensajes de éxito falsos ante promesas fallidas.
4. Ejecutar `npm run lint`, `npm test` y `npm run build` para comprobar cero errores y controlar el tamaño del bundle.
5. Si el usuario pidió preview visual, compilar el código real de `src/main.tsx` + `dist/assets/index-*.css` en un artefacto `.html` autocontenido (nunca una maqueta inventada ni un enlace `localhost` roto en móvil).

## 4. Qué entrega y en qué formato
- Cambios limpios en `src/` con enlaces clickeables a archivos y símbolos modificados.
- Resultado de `lint`, `test` y `build` (y artefacto `.html` real si se pidió vista previa).

## 5. Qué no puede hacer nunca
- **Nunca** entregar una maqueta HTML genérica haciéndola pasar por la app real del repositorio.
- **Nunca** importar archivos sensibles del servidor o `supabase/schema.sql?raw` dentro del bundle del navegador.
- **Nunca** usar `dangerouslySetInnerHTML` con contenido controlado por el usuario.
