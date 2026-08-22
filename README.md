# ListaDeTareas

Componente React para gestionar listas de tareas, pensado para reutilizarse en distintos proyectos y clientes. Cada proyecto que lo instala mantiene sus propias tareas de forma independiente.

## Qué hace

- CRUD de tareas: agregar, modificar, cambiar estado (pendiente/finalizado) y borrar (con confirmación).
- Agrupa las tareas en dos secciones — **Pendientes** y **Completados** — cada una plegable/desplegable.
- Reordenar tareas arrastrando y soltando (drag & drop), incluyendo mover una tarea de un grupo a otro (esto también cambia su estado).
- Numeración automática de tareas dentro de cada grupo.
- Responde automáticamente a tema claro/oscuro.
- Lee su estado inicial desde un archivo `tareas.xml`, sin backend ni base de datos.
- Sin dependencias externas de estilos: los estilos van inline en el propio componente.

## Cómo funciona

- Al montarse, el componente hace `fetch('./tareas.xml')` **relativo a la app que lo consume** (no al paquete instalado en `node_modules`). Si el archivo existe y tiene contenido, carga esas tareas; si no existe o está vacío, arranca con la lista vacía.
- A partir de ahí, todo el CRUD (agregar, modificar, cambiar estado, borrar, reordenar) vive **solo en memoria** dentro del componente — el paquete no descarga ni guarda ningún archivo por sí mismo.
- Guardar los cambios es responsabilidad del proyecto que lo instala: quien mantiene el `tareas.xml` (editarlo a mano, generarlo desde otro flujo propio, etc.) y hace commit/push de ese proyecto es quien decide cómo persistir el estado.
- Como el `tareas.xml` que lee el componente vive en el proyecto del cliente (no dentro de `node_modules`), **actualizar el paquete nunca toca ni pisa las tareas ya cargadas**: `npm update` solo reemplaza el código del componente dentro de `node_modules/@marcosdemarte/lista-de-tareas`.
- Al instalar el paquete por primera vez en un proyecto nuevo, viene con la estructura del XML pero vacía (`<tareas></tareas>`), lista para empezar a cargar tareas desde cero.

## Tema claro/oscuro

El componente detecta automáticamente si tu proyecto está en modo oscuro, sin necesitar ninguna prop:

- Revisa el atributo `data-theme="dark"`/`data-theme="light"` o la clase `dark`/`light` en `<html>` (lo que usan `next-themes` y Tailwind en modo `class`).
- Si no encuentra ninguno de esos dos, cae en la preferencia del sistema operativo (`prefers-color-scheme`).
- Escucha cambios en tiempo real, así que si el usuario togglea el tema con un botón propio del proyecto, el componente se actualiza solo.

## Instalación

```bash
npm install @marcosdemarte/lista-de-tareas
```

Requiere autenticación contra GitHub Packages (el paquete se publica bajo el scope `@marcosdemarte`). Configurá un `.npmrc` en tu proyecto:

```
@marcosdemarte:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

y definí la variable de entorno `GITHUB_TOKEN` con un token de GitHub que tenga permiso `read:packages`. No hardcodees el token dentro del `.npmrc`.

## Actualización

1. Verificá que el proyecto tenga el `.npmrc` con el scope `@marcosdemarte` apuntando a GitHub Packages (ver [Instalación](#instalación)) y que la variable de entorno `GITHUB_TOKEN` esté seteada en esa consola.
   - Si el repositorio de este paquete es privado, el token necesita además el scope `repo` (no solo `read:packages`/`write:packages`), o vas a ver un `401 Unauthorized` al instalar.
2. Instalá la última versión publicada:

   ```bash
   npm install @marcosdemarte/lista-de-tareas@latest
   ```

   `npm update @marcosdemarte/lista-de-tareas` también funciona, pero solo mueve la versión dentro del rango que ya tengas en tu `package.json` (por ejemplo `^1.0.20` no sube a `2.0.0`); `@latest` es más directo si querés asegurarte de traer la versión más nueva.

3. Para fijar una versión específica en vez de la última:

   ```bash
   npm install @marcosdemarte/lista-de-tareas@1.0.20
   ```

En todos los casos las tareas ya cargadas en tu `tareas.xml` local quedan intactas (ver [Cómo funciona](#cómo-funciona)) — el update solo reemplaza el código dentro de `node_modules`.

## Uso

```javascript
import ListaDeTareas from '@marcosdemarte/lista-de-tareas';

function App() {
  return (
    <div>
      <ListaDeTareas />
    </div>
  );
}
```

Asegurate de que `tareas.xml` esté accesible desde la raíz servida por tu app (por ejemplo, en `public/tareas.xml` si usás Create React App o Vite), para que el `fetch('./tareas.xml')` lo encuentre.
