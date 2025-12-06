import { useState, useEffect } from "react";
import { xml2js, js2xml } from "xml-js";
import "./ListaDeTareas.css";

export const ListaDeTareas = () => {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");

  // Cargar desde localStorage (simulación de XML)
  useEffect(() => {
    const xmlGuardado = localStorage.getItem("tareasXML");
    if (xmlGuardado) {
      const json = xml2js(xmlGuardado, { compact: true });
      const lista = json.tareas.tarea.map((t) => ({
        texto: t._text,
        estado: t._attributes.estado,
      }));
      setTareas(lista);
    }
  }, []);

  // Guardar en XML dentro de localStorage
  useEffect(() => {
    const json = {
      tareas: {
        tarea: tareas.map((t) => ({
          _attributes: { estado: t.estado },
          _text: t.texto,
        })),
      },
    };
    const xml = js2xml(json, { compact: true, spaces: 4 });
    localStorage.setItem("tareasXML", xml);
  }, [tareas]);

  const agregarTarea = () => {
    if (!nuevaTarea.trim()) return;
    setTareas([...tareas, { texto: nuevaTarea, estado: "pendiente" }]);
    setNuevaTarea("");
  };

  const borrarTarea = (index) => {
    setTareas(tareas.filter((_, i) => i !== index));
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
      </div>

      <ul className="lista">
        {tareas.map((t, i) => (
          <li key={i} className={`item ${t.estado}`}>
            <span>{t.texto}</span>

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
