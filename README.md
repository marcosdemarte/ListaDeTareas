# ListaDeTareas

Componente React para gestionar listas de tareas con persistencia en XML.

## Instalación

```bash
npm install @marcosdemarte/lista-de-tareas
```

## Actualización

Para actualizar a la versión específica (ej. 1.0.12):

```bash
npm install @marcosdemarte/lista-de-tareas@1.0.12
```

Para actualizar a la última versión:

```bash
npm update @marcosdemarte/lista-de-tareas
```

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

## Características

- Gestión de tareas con CRUD
- Persistencia en XML local
- Estilos CSS incluidos
- Sin dependencias externas adicionales
- Compatible con actualizaciones manteniendo tareas existentes

## Persistencia de Datos

El componente lee y guarda las tareas en un archivo `tareas.xml` local:
- Al iniciar, busca y carga el archivo `tareas.xml` del proyecto
- Las modificaciones se pueden guardar usando el botón "Descargar XML"
- Al actualizar la versión del paquete, las tareas del XML local se mantienen intactas