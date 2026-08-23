"use client";

import React, { useState, useEffect, useRef } from "react";
import { xml2js, js2xml } from "xml-js";

const LIGHT_COLORS = {
  bg: "#f9f9f9",
  border: "#ccc",
  cardBg: "#ffffff",
  cardBorder: "#ddd",
  text: "#222222",
  inputBg: "#ffffff",
  inputText: "#222222",
  inputBorder: "#ccc",
  pendienteAccent: "#d9534f",
  completadoAccent: "#5cb85c",
  toggleBtn: "#666666",
};

const DARK_COLORS = {
  bg: "#1e1e1e",
  border: "#3a3a3a",
  cardBg: "#2a2a2a",
  cardBorder: "#3a3a3a",
  text: "#e6e6e6",
  inputBg: "#333333",
  inputText: "#e6e6e6",
  inputBorder: "#555555",
  pendienteAccent: "#e57373",
  completadoAccent: "#81c784",
  toggleBtn: "#aaaaaa",
};

const detectDark = () => {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  const dataTheme = root.getAttribute("data-theme");
  if (dataTheme === "dark") return true;
  if (dataTheme === "light") return false;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
};

const ListaDeTareas = ({ apiEndpoint = "/api/tareas" } = {}) => {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({ pendientes: true, finalizados: true });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const c = isDark ? DARK_COLORS : LIGHT_COLORS;
  const loadedRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());

  // Responder al tema (dark/light) del proyecto que consume el componente
  useEffect(() => {
    setIsDark(detectDark());

    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(detectDark()));
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => setIsDark(detectDark());
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  // Cargar tareas desde el endpoint (que a su vez lee tareas.xml en el servidor)
  useEffect(() => {
    let cancelado = false;

    const cargarTareas = async () => {
      let lista = [];
      let cargaExitosa = false;
      try {
        const response = await fetch(apiEndpoint, { cache: "no-store" });
        if (response.ok) {
          cargaExitosa = true;
          const xmlContent = await response.text();
          if (xmlContent.trim()) {
            const json = xml2js(xmlContent, { compact: true });
            lista = Array.isArray(json?.tareas?.tarea)
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
          }
        } else {
          console.warn(`No se pudieron cargar las tareas (${apiEndpoint} respondió ${response.status}). Mostrando lista vacía, guardado automático desactivado hasta la próxima carga exitosa.`);
        }
      } catch (err) {
        console.warn(`No se pudo contactar ${apiEndpoint}. Mostrando lista vacía, guardado automático desactivado hasta la próxima carga exitosa.`, err);
      }

      // Si el efecto ya fue cancelado (por ejemplo, por el doble montaje de
      // Strict Mode en desarrollo), no aplicamos este resultado: evita que
      // se marque como "ya cargado" antes de tiempo y se dispare un guardado
      // con datos viejos o vacíos.
      if (cancelado) return;
      setTareas(lista);
      // Solo habilitamos el guardado automático si la carga fue realmente
      // exitosa. Si falló (red caída, endpoint no disponible todavía, etc.),
      // dejamos loadedRef en false para no arriesgarnos a pisar tareas.xml
      // con una lista vacía por culpa de un error transitorio.
      if (cargaExitosa) {
        loadedRef.current = true;
      }
    };

    cargarTareas();

    return () => {
      cancelado = true;
    };
  }, [apiEndpoint]);

  // Guarda en el servidor la lista pasada por parámetro. Se llama de forma
  // explícita desde cada acción del usuario (agregar, modificar, borrar,
  // cambiar estado, reordenar) — nunca automáticamente al cargar, para que
  // una simple carga de la página (por ejemplo, tras un hot-reload en
  // desarrollo) no pueda disparar una escritura que compita con la de otra
  // instancia del componente.
  const guardarEnServidor = (lista) => {
    if (!loadedRef.current) {
      console.warn(`Todavía no se completó la carga inicial de ${apiEndpoint}; no se guarda este cambio para no arriesgarse a pisar datos existentes.`);
      return;
    }

    const json = {
      tareas: {
        tarea: lista.map((t) => ({
          _attributes: { estado: t.estado },
          _text: t.texto,
        })),
      },
    };
    const xml = js2xml(json, { compact: true, spaces: 4 });

    const guardar = async () => {
      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: xml,
        });
        if (!response.ok) {
          console.warn(`No se pudieron guardar las tareas (${apiEndpoint} respondió ${response.status}). Revisá que el endpoint esté implementado en tu proyecto.`);
        }
      } catch (err) {
        console.warn(`No se pudo guardar en ${apiEndpoint}.`, err);
      }
    };

    // Encolamos el guardado en vez de dispararlo directo: si dos cambios
    // ocurren muy seguido, se dispararían dos guardados en paralelo, y sin
    // ningún orden garantizado el más viejo podía terminar de responder
    // DESPUÉS que el más nuevo y pisarlo con datos desactualizados. Encolar
    // asegura que siempre se escriban en el mismo orden en que ocurrieron
    // los cambios, uno por vez.
    saveQueueRef.current = saveQueueRef.current.then(guardar);
  };

  const agregarTarea = () => {
    if (!nuevaTarea.trim()) return;
    const nuevas = [...tareas, { texto: nuevaTarea, estado: "pendiente" }];
    setTareas(nuevas);
    setNuevaTarea("");
    guardarEnServidor(nuevas);
  };

  const borrarTarea = (index) => {
    if (window.confirm('¿Seguro que desea borrar esta tarea?')) {
      const nuevas = tareas.filter((_, i) => i !== index);
      setTareas(nuevas);
      guardarEnServidor(nuevas);
    }
  };

  const modificarTarea = (index, nuevoTexto) => {
    const nuevas = [...tareas];
    nuevas[index].texto = nuevoTexto;
    setTareas(nuevas);
    guardarEnServidor(nuevas);
  };

  const iniciarEdicion = (index, textoActual) => {
    setEditingIndex(index);
    setEditText(textoActual);
  };

  const guardarEdicion = () => {
    if (editText.trim()) {
      modificarTarea(editingIndex, editText.trim());
    }
    setEditingIndex(null);
    setEditText("");
  };

  const cancelarEdicion = () => {
    setEditingIndex(null);
    setEditText("");
  };

  const cambiarEstado = (index, nuevoEstado) => {
    const nuevas = [...tareas];
    nuevas[index].estado = nuevoEstado;
    setTareas(nuevas);
    guardarEnServidor(nuevas);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = (e) => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex, targetEstado) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;

    const nuevasTareas = [...tareas];
    const [draggedTarea] = nuevasTareas.splice(draggedIndex, 1);
    draggedTarea.estado = targetEstado;

    if (dropIndex === null) {
      nuevasTareas.push(draggedTarea);
    } else {
      const insertAt = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      nuevasTareas.splice(insertAt, 0, draggedTarea);
    }

    setTareas(nuevasTareas);
    setDraggedIndex(null);
    guardarEnServidor(nuevasTareas);
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <div style={{
      width: '100%',
      margin: '20px 0 0 0',
      padding: '15px',
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      background: c.bg,
      overflowY: 'auto',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        marginBottom: '10px',
        textAlign: 'center',
        color: c.text
      }}>Lista de Tareas</h2>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '15px'
      }}>
        <input
          type="text"
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          placeholder="Escribe una nueva tarea..."
          style={{
            flex: '1',
            padding: '8px',
            background: c.inputBg,
            color: c.inputText,
            border: `1px solid ${c.inputBorder}`,
            borderRadius: '4px'
          }}
        />
        <button onClick={agregarTarea} style={{
          padding: '8px 12px',
          cursor: 'pointer',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>Agregar</button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          border: `1px solid ${c.cardBorder}`,
          borderRadius: '8px',
          padding: '15px',
          background: c.cardBg
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              paddingBottom: '10px',
              borderBottom: `2px solid ${c.pendienteAccent}`,
              fontSize: '1.2rem',
              color: c.pendienteAccent
            }}>Pendientes</h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '5px',
                color: c.toggleBtn,
                transition: 'transform 0.2s'
              }}
              onClick={() => toggleGroup('pendientes')}
            >
              {expandedGroups.pendientes ? '▼' : '▶'}
            </button>
          </div>
            {expandedGroups.pendientes && (
              <ul
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null, "pendiente")}
                style={{
                  listStyle: 'none',
                  padding: '0',
                  minHeight: '20px'
                }}>
            {Array.isArray(tareas) &&
              tareas
                .filter((t) => t.estado === "pendiente")
                .map((t, i) => {
                  const originalIndex = tareas.findIndex((task) => task === t);
                  return (
                    <li
                      key={originalIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px',
                        padding: '8px',
                        border: `1px solid ${c.cardBorder}`,
                        borderRadius: '4px',
                        background: c.cardBg,
                        cursor: 'move'
                      }}
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, originalIndex);
                        e.target.style.opacity = '0.5';
                      }}
                      onDragEnd={(e) => {
                        handleDragEnd(e);
                        e.target.style.opacity = '1';
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, originalIndex, "pendiente")}
                    >
                      {editingIndex === originalIndex ? (
                        <>
                          <input
                            type="text"
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') guardarEdicion();
                              if (e.key === 'Escape') cancelarEdicion();
                            }}
                            style={{
                              flex: '1',
                              padding: '4px 8px',
                              background: c.inputBg,
                              color: c.inputText,
                              border: `1px solid ${c.inputBorder}`,
                              borderRadius: '4px'
                            }}
                          />
                          <button onClick={guardarEdicion} style={{
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>Guardar</button>
                          <button onClick={cancelarEdicion} style={{
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <span style={{
                            fontWeight: 'bold',
                            color: c.pendienteAccent,
                            minWidth: '30px'
                          }}>{i + 1}.</span>
                          <span style={{
                            flex: '1',
                            color: c.pendienteAccent
                          }}>{t.texto}</span>

                          <select
                            value={t.estado}
                            onChange={(e) => cambiarEstado(originalIndex, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              background: c.inputBg,
                              color: c.inputText,
                              border: `1px solid ${c.inputBorder}`,
                              borderRadius: '4px'
                            }}>
                            <option value="pendiente">Pendiente</option>
                            <option value="finalizado">Finalizado</option>
                          </select>

                          <button onClick={() => borrarTarea(originalIndex)} style={{
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>Borrar</button>
                          <button
                            onClick={() => iniciarEdicion(originalIndex, t.texto)}
                            style={{
                              padding: '4px 8px',
                              cursor: 'pointer'
                            }}>
                            Modificar
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        <div style={{
          border: `1px solid ${c.cardBorder}`,
          borderRadius: '8px',
          padding: '15px',
          background: c.cardBg
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              paddingBottom: '10px',
              borderBottom: `2px solid ${c.completadoAccent}`,
              fontSize: '1.2rem',
              color: c.completadoAccent
            }}>Completados</h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '5px',
                color: c.toggleBtn,
                transition: 'transform 0.2s'
              }}
              onClick={() => toggleGroup('finalizados')}
            >
              {expandedGroups.finalizados ? '▼' : '▶'}
            </button>
          </div>
          {expandedGroups.finalizados && (
            <ul
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null, "finalizado")}
              style={{
                listStyle: 'none',
                padding: '0',
                minHeight: '20px'
              }}>
            {Array.isArray(tareas) &&
              tareas
                .filter((t) => t.estado === "finalizado")
                .map((t, i) => {
                  const originalIndex = tareas.findIndex((task) => task === t);
                  return (
                    <li
                      key={originalIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px',
                        padding: '8px',
                        border: `1px solid ${c.cardBorder}`,
                        borderRadius: '4px',
                        background: c.cardBg,
                        cursor: 'move'
                      }}
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, originalIndex);
                        e.target.style.opacity = '0.5';
                      }}
                      onDragEnd={(e) => {
                        handleDragEnd(e);
                        e.target.style.opacity = '1';
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, originalIndex, "finalizado")}
                    >
                      {editingIndex === originalIndex ? (
                        <>
                          <input
                            type="text"
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') guardarEdicion();
                              if (e.key === 'Escape') cancelarEdicion();
                            }}
                            style={{
                              flex: '1',
                              padding: '4px 8px',
                              background: c.inputBg,
                              color: c.inputText,
                              border: `1px solid ${c.inputBorder}`,
                              borderRadius: '4px'
                            }}
                          />
                          <button onClick={guardarEdicion} style={{
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>Guardar</button>
                          <button onClick={cancelarEdicion} style={{
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <span style={{
                            fontWeight: 'bold',
                            color: c.completadoAccent,
                            minWidth: '30px',
                            textDecoration: 'line-through'
                          }}>{i + 1}.</span>
                          <span style={{
                            flex: '1',
                            color: c.completadoAccent,
                            textDecoration: 'line-through'
                          }}>{t.texto}</span>

                          <select
                            value={t.estado}
                            onChange={(e) => cambiarEstado(originalIndex, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              background: c.inputBg,
                              color: c.inputText,
                              border: `1px solid ${c.inputBorder}`,
                              borderRadius: '4px'
                            }}>
                            <option value="pendiente">Pendiente</option>
                            <option value="finalizado">Finalizado</option>
                          </select>

                          <button onClick={() => borrarTarea(originalIndex)} style={{
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}>Borrar</button>
                          <button
                            onClick={() => iniciarEdicion(originalIndex, t.texto)}
                            style={{
                              padding: '4px 8px',
                              cursor: 'pointer'
                            }}>
                            Modificar
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListaDeTareas;
