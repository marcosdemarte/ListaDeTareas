# ListaDeTareas

Componente React para gestionar listas de tareas, pensado para reutilizarse en distintos proyectos y clientes. Cada proyecto que lo instala mantiene sus propias tareas de forma independiente.

## Qué hace

- CRUD de tareas: agregar, modificar, cambiar estado (pendiente/finalizado) y borrar (con confirmación).
- Agrupa las tareas en dos secciones — **Pendientes** y **Completados** — cada una plegable/desplegable.
- Reordenar tareas arrastrando y soltando (drag & drop), incluyendo mover una tarea de un grupo a otro (esto también cambia su estado).
- Numeración automática de tareas dentro de cada grupo.
- Responde automáticamente a tema claro/oscuro.
- Persiste automáticamente en un archivo `tareas.xml` — sin base de datos ni SQL — cada vez que agregás, modificás, borrás, cambiás de estado o reordenás una tarea.
- Sin dependencias externas de estilos: los estilos van inline en el propio componente.

## Cómo funciona

El componente usa `tareas.xml` como su única fuente de verdad (una especie de "base de datos" en archivo), leyendo y escribiendo siempre a través de un endpoint que corre en el servidor de tu proyecto — un componente de React no puede escribir archivos por sí mismo, necesita ese endpoint.

- Al montarse, hace `GET` a `/api/tareas` (podés cambiar la ruta con la prop `apiEndpoint`, ver [Uso](#uso)). Ese endpoint tiene que devolver el contenido de `tareas.xml`. Si no responde bien o el archivo está vacío, arranca con la lista vacía.
- Cada vez que cambia algo (agregar, modificar, cambiar estado, borrar, reordenar/drag&drop), el componente arma el XML actualizado y hace `POST` al mismo endpoint con el nuevo contenido — ese `POST` es el que tiene que sobrescribir `tareas.xml` en el servidor.
- Si el endpoint todavía no existe en tu proyecto, el componente sigue funcionando (podés agregar/editar tareas en memoria), pero avisa por consola que no pudo guardar — nada se pierde silenciosamente sin que te enteres, pero tampoco queda guardado hasta que agregues el endpoint.
- Como la persistencia vive en tu propio servidor (no en `node_modules`), **actualizar el paquete nunca toca ni pisa las tareas ya guardadas**: `npm update` solo reemplaza el código del componente.
- Al instalar el paquete por primera vez en un proyecto nuevo, con el endpoint ya configurado, arranca con la lista vacía hasta que agregues la primera tarea.

### El endpoint `/api/tareas` (Next.js App Router)

Este paquete no incluye el endpoint — cada proyecto lo implementa una vez, porque es el único punto donde hace falta código específico del server de ese proyecto (dónde vive el archivo, permisos, etc). En Next.js (App Router) es un archivo así, `src/app/api/tareas/route.js` (o `.ts`):

```javascript
import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const filePath = path.join(process.cwd(), "data", "tareas.xml");

// Sin esto, Next.js puede cachear el GET como si fuera estático
// y seguir sirviendo una respuesta vieja aunque el archivo cambie.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const xml = await readFile(filePath, "utf-8");
    return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
  } catch {
    return new NextResponse("<tareas></tareas>", { headers: { "Content-Type": "application/xml" } });
  }
}

export async function POST(request) {
  const xml = await request.text();
  await writeFile(filePath, xml, "utf-8");
  return NextResponse.json({ ok: true });
}
```

Con esto, `data/tareas.xml` (en la raíz del proyecto, **no** dentro de `public/`) queda como el archivo real y persistente. Es importante que no esté en `public/`: cualquier archivo ahí queda servido como estático y accesible directamente por URL (`tu-sitio.com/tareas.xml`), lo cual expondría el contenido de tus tareas a cualquiera. Podés versionar `data/tareas.xml` en git como cualquier otro dato, o dejarlo fuera del repo si preferís que cada entorno tenga el suyo.

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
2. Instalá la última versión publicada:

   ```bash
   npm install @marcosdemarte/lista-de-tareas@latest
   ```

   `npm update @marcosdemarte/lista-de-tareas` también funciona, pero solo mueve la versión dentro del rango que ya tengas en tu `package.json` (por ejemplo `^1.0.20` no sube a `2.0.0`); `@latest` es más directo si querés asegurarte de traer la versión más nueva.

3. Para fijar una versión específica en vez de la última:

   ```bash
   npm install @marcosdemarte/lista-de-tareas@1.1.2
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

Recordá implementar el endpoint `/api/tareas` en tu proyecto (ver [Cómo funciona](#cómo-funciona)) para que las tareas queden guardadas de verdad.

Si ya tenés una ruta con ese nombre ocupada, o preferís otra, pasala por prop:

```javascript
<ListaDeTareas apiEndpoint="/api/mis-tareas" />
```
