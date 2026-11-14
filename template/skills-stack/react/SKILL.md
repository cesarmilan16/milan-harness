---
name: react
description: Buenas prácticas de React. Úsala al crear o modificar componentes, hooks, estado, formularios o peticiones de datos en el cliente.
---
# react

Mira la versión de React en `package.json` y cómo están escritos los componentes vecinos antes de escribir.

## Componentes

- Funciones pequeñas con una responsabilidad. Si pasa de unas 150 líneas o mezcla datos y presentación, divídelo.
- Props tipadas y explícitas. Nada de pasar el objeto entero «por si acaso».
- No definas un componente dentro de otro: se vuelve a montar en cada render y pierde su estado.
- `key` estable y única en listas, sacada del dato. Nunca el índice si la lista cambia de orden o tamaño.

## Estado

- **Lo derivado se calcula en el render**, no se guarda en estado ni se sincroniza con un efecto.
- El estado vive en el componente más cercano que lo necesita. Súbelo solo cuando dos lo comparten.
- Nunca mutes estado ni props: crea copias nuevas.
- Lo que cabe en la URL (filtros, página, pestaña) va en la URL.
- Estado global solo para lo de verdad global (sesión, tema). Los datos del servidor son caché, no estado: usa la librería de datos del proyecto (TanStack Query, SWR o la del framework).

## Efectos

- `useEffect` es para sincronizar con algo externo (suscripción, temporizador, DOM, API del navegador). No para transformar datos ni para reaccionar a un evento: eso va en el manejador del evento.
- Dependencias completas y sin desactivar la regla del linter. Si molesta, el efecto está mal planteado.
- Todo efecto que suscribe o programa algo devuelve su limpieza. Las peticiones se cancelan o se ignoran si el componente cambió.
- `useMemo` y `useCallback` solo con un problema de rendimiento medido.

## Formularios y datos

- Valida en el cliente por comodidad y **siempre otra vez en el servidor**.
- Cada vista con datos contempla cuatro estados: cargando, error, vacío y con datos.
- Desactiva el envío mientras está en curso para evitar duplicados.

## Seguridad y accesibilidad

- Nada de `dangerouslySetInnerHTML` con contenido que venga de usuarios sin sanear.
- Ningún secreto en código de cliente: todo lo que llega al navegador es público.
- HTML semántico (`button`, `a`, `label` asociado a su campo), texto alternativo en imágenes y todo operable con teclado.

## Tests

Prueba lo que ve y hace el usuario (texto, roles, clics), no el estado interno ni detalles de implementación.
