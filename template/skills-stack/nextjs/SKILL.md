---
name: nextjs
description: Buenas prácticas de Next.js con App Router. Úsala al crear o modificar páginas, layouts, Server Components, Server Actions, route handlers, middleware, caché o variables de entorno en un proyecto Next.js.
---
# nextjs

**Primero la versión.** Mira `next` en `package.json`. El comportamiento de la caché y varias APIs (por ejemplo `params` y `cookies()`) cambian entre versiones mayores: si no estás seguro de cómo funciona algo en esta versión, consulta la documentación de esa versión en lugar de suponerlo. Si el proyecto usa `pages/`, sigue ese modelo y no mezcles.

Para componentes, estado y efectos, aplica también la skill `react`.

## Servidor y cliente

- Por defecto, Server Components. Añade `'use client'` solo donde haya estado, efectos, eventos o APIs del navegador, y lo más abajo posible en el árbol.
- **Los datos se piden en el servidor**, en el componente que los usa. Nada de `useEffect` + `fetch` para la carga inicial.
- Lo que se pasa como props a un Client Component viaja al navegador: pasa solo los campos necesarios, nunca el registro entero de la base de datos.
- El código con secretos o acceso a datos no debe poder importarse desde el cliente (paquete `server-only` si el proyecto lo usa).

## Server Actions y route handlers

Son **endpoints públicos**: cualquiera puede llamarlos con cualquier dato, aunque el botón no se muestre.

- Dentro de cada uno: comprueba la sesión, comprueba el permiso sobre *ese* recurso y valida la entrada con un esquema (Zod o el del proyecto).
- No te fíes de ids ni de campos ocultos que llegan del formulario.
- Devuelve errores controlados; no dejes que una excepción filtre detalles internos.
- Tras modificar datos, revalida la ruta o la etiqueta afectada.

## Autenticación

El middleware sirve para redirigir, **no como única barrera**. La comprobación real se hace donde se leen o escriben los datos.

## Caché

- Decide para cada dato si es estático, se revalida cada cierto tiempo o es por petición, y decláralo explícitamente.
- **Nunca caches de forma compartida datos de un usuario.** Ante la duda, dinámico.

## Variables de entorno

- `NEXT_PUBLIC_*` se incrusta en el JavaScript del navegador. Nunca un secreto ahí.
- Lee y valida las variables en un único módulo.

## Convenciones

- `loading.tsx` y `error.tsx` en las rutas con datos; `not-found` para lo que no existe.
- `next/link` para navegar, `next/image` para imágenes, `next/font` para fuentes.
- La API de metadata para título y descripción, no etiquetas a mano.

## Antes de terminar

Ejecuta `next build` además de los tests: muchos errores de servidor/cliente y de tipos solo aparecen al compilar.
