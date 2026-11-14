---
name: architecture
description: Criterios de arquitectura y buenas prácticas generales. Úsala al crear un módulo, endpoint o servicio nuevo, al decidir dónde va un código, al añadir una dependencia o una abstracción, y al planificar una feature.
---
# architecture

Antes de diseñar nada, mira cómo lo hace ya el proyecto (`docs/project.md`, un módulo vecino) y haz lo mismo. La coherencia con lo existente pesa más que cualquier regla de aquí.

## Dónde va cada cosa

- **Tres capas, dependencias hacia dentro**: entrada (rutas, vistas, componentes) → lógica de negocio → acceso a datos. La entrada valida y traduce; no contiene reglas de negocio ni consultas.
- **Organiza por funcionalidad** (`pedidos/`, `usuarios/`), no por tipo técnico, cuando el proyecto lo permita.
- Un módulo expone poco y esconde el resto. Si para cambiar una cosa hay que tocar cinco módulos, la frontera está mal puesta.

## Cuánto construir

- Lo más simple que resuelve lo pedido. Sin capas, opciones ni configuración para usos futuros.
- Abstrae al tercer caso repetido, no al primero. Duplicar dos veces es más barato que una abstracción equivocada.
- Una dependencia nueva es una decisión: comprueba que no exista ya algo equivalente en el proyecto, que esté mantenida, y anótala en `docs/decisions.md`.

## Datos y errores

- **Valida en la frontera** todo lo que viene de fuera: usuario, red, archivos, variables de entorno. Dentro, confía en los tipos.
- **Autoriza en el servidor en cada operación**: quién es y si puede hacerlo sobre *ese* recurso. La interfaz que oculta un botón no es seguridad.
- No silencies errores. Captura solo donde puedas hacer algo útil; el resto, que suba con contexto.
- Al usuario, mensajes genéricos; el detalle va al log. Nunca secretos ni datos personales en logs.
- Configuración y secretos por variables de entorno, leídas en un único sitio y validadas al arrancar.

## Tests

- Prueba comportamiento por la interfaz pública, no detalles internos.
- Prioriza lógica de negocio, permisos y casos límite. Un bug corregido lleva su test.
- Los tests no dependen de red externa, del orden de ejecución ni de la hora real.

## Señales de alarma

Para y replantea si ves: un archivo que hace de todo, lógica de negocio copiada entre entrada y servicio, dependencias circulares, un «arreglo» que desactiva una validación o un test, o un cambio que crece mucho más de lo pedido.
