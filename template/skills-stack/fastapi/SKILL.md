---
name: fastapi
description: Buenas prácticas de FastAPI con Pydantic. Úsala al crear o modificar endpoints, routers, esquemas, dependencias, autenticación, acceso a base de datos o tareas en segundo plano en un proyecto FastAPI.
---
# fastapi

Mira las versiones de FastAPI, Pydantic y del ORM, y sigue la estructura de los routers existentes. Para esquema, índices y migraciones aplica también la skill `database`.

## Estructura

- Un `APIRouter` por dominio. Los endpoints son finos: validan, autorizan y llaman a una función de servicio. La lógica y las consultas no viven en el endpoint.
- Configuración con `pydantic-settings` en un único módulo, validada al arrancar. Sin secretos en el código.
- Recursos compartidos (motor de base de datos, clientes HTTP) se crean una vez en `lifespan`, no por petición.

## Esquemas

- **Esquemas separados para entrada y salida.** Nunca devuelvas el modelo del ORM tal cual: declara `response_model` para que no se filtren campos como el hash de la contraseña.
- No aceptes en la entrada campos que el cliente no debe decidir (`id`, `owner_id`, `is_admin`). Rechaza campos desconocidos si el proyecto lo hace así.
- Restricciones en el esquema: longitudes, rangos, formatos. Límites máximos en listas y cadenas.

## Async

- **No bloquees el event loop.** Dentro de `async def` solo librerías asíncronas. Si la librería es síncrona (driver, `requests`, CPU intensiva), declara el endpoint con `def` o mándalo a un hilo.
- No mezcles sesión síncrona y asíncrona del ORM. Con SQLAlchemy asíncrono no hay carga perezosa: carga las relaciones explícitamente.
- Llamadas HTTP externas siempre con timeout.

## Dependencias y base de datos

- La sesión de base de datos llega por `Depends` con `yield`, una por petición, y se cierra siempre.
- Varias escrituras que deben ir juntas van en una transacción.
- Pagina los listados con un máximo; no devuelvas tablas enteras.

## Seguridad

- Autenticación como dependencia (`Depends(get_current_user)`) aplicada al router, para no olvidarla en un endpoint nuevo.
- **Autoriza sobre el recurso concreto**: comprobar que hay sesión no basta; filtra por el usuario al consultar.
- CORS con orígenes explícitos. Nunca `*` junto con credenciales.
- Contraseñas con un algoritmo de hash lento (argon2 o bcrypt). Tokens con caducidad.
- SQL con parámetros, nunca con f-strings.
- Los errores devuelven `HTTPException` con el código correcto y un mensaje genérico; el detalle va al log.

## Otros

- `BackgroundTasks` solo para trabajo corto y prescindible. Lo que no puede perderse va a una cola.
- Códigos de estado correctos: 201 al crear, 204 sin contenido, 404 si no existe, 403 si no puede, 422 lo da la validación.

## Tests

Con el cliente de test y `dependency_overrides` para la base de datos y el usuario. Cubre en cada endpoint: sin sesión, usuario sin permiso, entrada inválida y el caso correcto.
