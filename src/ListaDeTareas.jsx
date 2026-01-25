import React, { useState, useEffect } from "react";
import { xml2js, js2xml } from "xml-js";
import "./ListaDeTareas.css";

const ListaDeTareas = () => {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Cargar desde archivo XML local
  useEffect(() => {
    const cargarTareas = async () => {
      try {
        // Intentar cargar desde archivo XML local
        try {
          const response = await fetch('./tareas.xml');
          if (response.ok) {
            const xmlContent = await response.text();
            if (xmlContent.trim()) {
              const json = xml2js(xmlContent, { compact: true });
              const lista = Array.isArray(json?.tareas?.tarea)
                ? json.tareas.tarea.map((t) => ({
                    texto: t._text,
                    estado: t._attributes?.estado || "pendiente",
                  }))
                : json?.tareas?.tarea
                ? [
                    {
                      texto: json.tareas.tarea._text,
                      estado: json.tareas.tarea._attributes?.estado || "pendiente",
                    },
                  ]
                : [];
              setTareas(lista);
              return;
            }
          }
        } catch (fetchErr) {
          console.log("No se pudo leer tareas.xml, iniciando con lista vacía");
        }
        
        // Si no existe el archivo o está vacío, iniciar con array vacío
        setTareas([]);
      } catch (err) {
        console.error("Error al cargar tareas:", err);
        setTareas([]);
      }
    };
    
    cargarTareas();
  }, []);

  // Descargar XML cuando las tareas cambian
  const descargarXML = () => {
    const json = {
      tareas: {
        tarea: tareas.map((t) => ({
          _attributes: { estado: t.estado },
          _text: t.texto,
        })),
      },
    };
    const xml = js2xml(json, { compact: true, spaces: 4 });
    
    // Crear blob y descargar
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tareas.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const agregarTarea = () => {
    if (!nuevaTarea.trim()) return;
    setTareas([...tareas, { texto: nuevaTarea, estado: "pendiente" }]);
    setNuevaTarea("");
  };

  const borrarTarea = (index) => {
    if (window.confirm('¿Seguro que desea borrar esta tarea?')) {
      setTareas(tareas.filter((_, i) => i !== index));
    }
  };

  const modificarTarea = (index, nuevoTexto) => {
    const nuevas = [...tareas];
    nuevas[index].texto = nuevoTexto;
    setTareas(nuevas);
  };

  const cambiarEstado = (index, nuevoEstado) => {
    const nuevas = [...tareas];
    nuevas[index].estado = nuevoEstado;
    setTareas(nuevas);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const nuevasTareas = [...tareas];
    const [draggedTarea] = nuevasTareas.splice(draggedIndex, 1);
    nuevasTareas.splice(dropIndex, 0, draggedTarea);
    
    setTareas(nuevasTareas);
  };

  return (
    <div className="lista-container">
      <h2 className="titulo">Lista de Tareas</h2>

      <div className="form-agregar">
        <input
          type="text"
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          placeholder="Escribe una nueva tarea..."
        />
        <button onClick={agregarTarea}>Agregar</button>
        <button onClick={descargarXML} className="btn-descargar">
          Descargar XML
        </button>
      </div>

      <ul className="lista">
        {Array.isArray(tareas) &&
          tareas.map((t, i) => (
            <li 
              key={i} 
              className={`item ${t.estado}`} 
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
            >
              <span className="numero">{i + 1}.</span>
              <span className="texto">{t.texto}</span>

              <select
                value={t.estado}
                onChange={(e) => cambiarEstado(i, e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="finalizado">Finalizado</option>
              </select>

              <button onClick={() => borrarTarea(i)}>Borrar</button>
              <button
                onClick={() => {
                  const nuevoTexto = prompt("Modificar tarea:", t.texto);
                  if (nuevoTexto) modificarTarea(i, nuevoTexto);
                }}>
                Modificar
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default ListaDeTareas;
