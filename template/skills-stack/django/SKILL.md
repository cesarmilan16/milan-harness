---
name: django
description: Buenas prácticas de Django y Django REST Framework. Úsala al crear o modificar modelos, migraciones, vistas, serializers, formularios, consultas del ORM, permisos, settings o tareas en un proyecto Django.
---
# django

Mira la versión de Django y si el proyecto usa DRF, y sigue la estructura de las apps existentes. Para esquema, índices y migraciones aplica también la skill `database`.

## Estructura

- Apps pequeñas, una por dominio. La lógica de negocio va en el modelo o en un módulo de servicios, no en vistas ni serializers.
- Las vistas hacen tres cosas: autenticar y autorizar, validar la entrada y llamar a la lógica.

## Modelos y migraciones

- Todo cambio de modelo lleva su migración en el mismo commit. Ejecuta `makemigrations --check` antes de terminar.
- **No edites una migración ya aplicada o compartida.** Crea otra.
- Los cambios de datos van en una migración de datos con operación inversa, no a mano en la shell.
- Restricciones (`unique`, `CheckConstraint`) e índices se declaran en el modelo: la base de datos es la última barrera.
- Elige `on_delete` a conciencia; `CASCADE` borra más de lo que parece.

## ORM

- **Evita N+1**: `select_related` para claves foráneas y `prefetch_related` para relaciones múltiples, siempre que recorras una lista y accedas a relaciones.
- `exists()` y `count()` en vez de traer filas; `only()` o `values()` si solo necesitas unos campos.
- Actualizaciones concurrentes con `F()` o `select_for_update()` dentro de `transaction.atomic()`.
- Varias escrituras que deben ir juntas van en `transaction.atomic()`. Los efectos externos (correo, tareas) se lanzan con `transaction.on_commit`.
- Pagina siempre los listados.

## Seguridad

- **Filtra por usuario en el queryset** (`get_queryset`), no solo en la plantilla o en el front. Que alguien pueda pedir el id 43 no debe darle el registro de otro.
- En DRF: `permission_classes` explícitas en cada vista y campos del serializer enumerados. Nunca `fields = '__all__'` en un modelo con datos sensibles, y marca `read_only_fields`.
- SQL crudo solo con parámetros; nunca interpolando cadenas.
- No desactives CSRF salvo en APIs con autenticación por token. No uses `mark_safe` ni `|safe` con contenido de usuarios.
- `SECRET_KEY`, credenciales y `DEBUG` vienen del entorno. `DEBUG = False` y `ALLOWED_HOSTS` definido en producción. Pasa `manage.py check --deploy`.

## Otros

- Usuario personalizado desde el primer día en proyectos nuevos; referencia siempre `settings.AUTH_USER_MODEL`.
- Lo lento (correo, informes, llamadas a terceros) va a una cola de tareas, no dentro de la petición.
- Fechas con zona horaria: `timezone.now()`, nunca `datetime.now()`.

## Tests

Prueba permisos (anónimo, otro usuario, el dueño), validación y lógica de negocio. Usa `assertNumQueries` en los listados para fijar que no aparezca un N+1.
