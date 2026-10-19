"use client";

import React, { useState, useEffect, useRef } from "react";
import { obtenerTareasXML, guardarTareasXML } from "./actions";

export default function ListaDeTareasUI() {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [filtro, setFiltro] = useState("pendiente");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [guardando, setGuardando] = useState(false);

  const draggedIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  useEffect(() => {
    obtenerTareasXML().then((xmlText) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const tareaNodes = xmlDoc.getElementsByTagName("tarea");
      const loadedTareas = [];

      for (let i = 0; i < tareaNodes.length; i++) {
        loadedTareas.push({
          id: i + 1,
          texto: tareaNodes[i].textContent,
          estado: tareaNodes[i].getAttribute("estado") || "pendiente",
        });
      }
      setTareas(loadedTareas);
    });
  }, []);

  const sincronizarConXML = async (updatedTareas) => {
    setGuardando(true);
    let xmlString = "<tareas>\n";
    updatedTareas.forEach((t) => {
      const textoEscaped = t.texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      xmlString += `    <tarea estado="${t.estado}">${textoEscaped}</tarea>\n`;
    });
    xmlString += "</tareas>";

    await guardarTareasXML(xmlString);

    // Recarga formal desde el XML tras guardar
    const xmlText = await obtenerTareasXML();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const tareaNodes = xmlDoc.getElementsByTagName("tarea");
    const reloadedTareas = [];

    for (let i = 0; i < tareaNodes.length; i++) {
      reloadedTareas.push({
        id: i + 1,
        texto: tareaNodes[i].textContent,
        estado: tareaNodes[i].getAttribute("estado") || "pendiente",
      });
    }
    setTareas(reloadedTareas);
    setGuardando(false);
  };

  const agregarTarea = async (e) => {
    e.preventDefault();
    if (!nuevaTarea.trim() || guardando) return;

    const updated = [
      ...tareas,
      { id: Date.now(), texto: nuevaTarea.trim(), estado: "pendiente" },
    ];
    setNuevaTarea("");
    await sincronizarConXML(updated);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    if (guardando) return;
    const updated = tareas.map((t) =>
      t.id === id ? { ...t, estado: nuevoEstado } : t,
    );
    await sincronizarConXML(updated);
  };

  const borrarTarea = async (id) => {
    if (guardando) return;
    const confirmado = window.confirm("¿Está seguro que desea borrar?");
    if (!confirmado) return;

    const updated = tareas.filter((t) => t.id !== id);
    await sincronizarConXML(updated);
  };

  const iniciarModificacion = (t) => {
    setEditandoId(t.id);
    setTextoEditado(t.texto);
  };

  const cancelarModificacion = () => {
    setEditandoId(null);
    setTextoEditado("");
  };

  const guardarModificacion = async (id) => {
    if (guardando) return;
    const updated = tareas.map((t) =>
      t.id === id ? { ...t, texto: textoEditado.trim() } : t,
    );
    setEditandoId(null);
    setTextoEditado("");
    await sincronizarConXML(updated);
  };

  // Manejadores de Drag and Drop con soporte para posición inicial y cursor de mano
  const handleDragStart = (e, index) => {
    draggedIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex.current !== index) {
      setOverIndex(index);
    }
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (guardando || draggedIndex.current === null) return;

    const sourceIndex = draggedIndex.current;
    const sIndex = draggedIndex.current;
    draggedIndex.current = null;
    setOverIndex(null);

    // Si lo suelta en su misma posición inicial, no hace nada
    if (sIndex === targetIndex) return;

    const tareasFiltradas =
      filtro === "pendiente" ? tareasPendientes : tareasCompletadas;
    const itemMovido = tareasFiltradas[sIndex];
    const targetItem = tareasFiltradas[targetIndex];

    if (!itemMovido || !targetItem) return;

    const indiceRealSource = tareas.findIndex((t) => t.id === itemMovido.id);
    const indiceRealTarget = tareas.findIndex((t) => t.id === targetItem.id);

    if (indiceRealSource === -1 || indiceRealTarget === -1) return;

    const copia = [...tareas];
    const [removido] = copia.splice(indiceRealSource, 1);
    copia.splice(indiceRealTarget, 0, removido);

    await sincronizarConXML(copia);
  };

  const handleDragEnd = () => {
    draggedIndex.current = null;
    setOverIndex(null);
  };

  const tareasPendientes = tareas.filter((t) => t.estado === "pendiente");
  const tareasCompletadas = tareas.filter(
    (t) => t.estado === "finalizado" || t.estado === "completado",
  );
  const tareasFiltradas =
    filtro === "pendiente" ? tareasPendientes : tareasCompletadas;

  const colorActivo = filtro === "pendiente" ? "#ef4444" : "#4ade80";

  return (
    <div
      style={{
        background: "#1c1c1c",
        color: "#e0e0e0",
        padding: "20px 30px",
        paddingTop: "3.125rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: "1px solid #2d2d2d",
        width: "100%",
        boxSizing: "border-box",
        opacity: guardando ? 0.7 : 1,
        pointerEvents: guardando ? "none" : "auto",
        position: "relative",
      }}>
      {guardando && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 15,
            background: "#333",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "0.8rem",
            zIndex: 10,
          }}>
          Guardando cambios en XML...
        </div>
      )}

      <h2
        style={{
          textAlign: "center",
          color: "#ffffff",
          fontSize: "1.75rem",
          fontWeight: "bold",
          marginTop: 0,
          marginBottom: "20px",
        }}>
        Lista de Tareas
      </h2>

      {/* Formulario */}
      <form
        onSubmit={agregarTarea}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px",
          marginBottom: "25px",
        }}>
        <textarea
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          placeholder="Descripción de la tarea..."
          rows={3}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "#282828",
            color: "#e0e0e0",
            border: "1px solid #3a3a3a",
            borderRadius: "4px",
            outline: "none",
            fontSize: "1rem",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 30px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
          }}>
          Agregar
        </button>
      </form>

      {/* Pestañas de Filtro */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #333333",
          marginBottom: "15px",
          width: "100%",
        }}>
        <button
          onClick={() => setFiltro("pendiente")}
          style={{
            flex: 1,
            padding: "10px 0",
            background: "none",
            border: "none",
            borderBottom:
              filtro === "pendiente"
                ? "2px solid #ef4444"
                : "2px solid transparent",
            color: filtro === "pendiente" ? "#ef4444" : "#71717a",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}>
          <span>Pendientes</span>
          <span
            style={{
              background: filtro === "pendiente" ? "#ef4444" : "#3f3f46",
              color: "#fff",
              padding: "2px 10px",
              borderRadius: "12px",
              fontSize: "0.8rem",
              display: "inline-block",
              lineHeight: "normal",
            }}>
            {tareasPendientes.length}
          </span>
        </button>
        <button
          onClick={() => setFiltro("finalizado")}
          style={{
            flex: 1,
            padding: "10px 0",
            background: "none",
            border: "none",
            borderBottom:
              filtro === "finalizado"
                ? "2px solid #4ade80"
                : "2px solid transparent",
            color: filtro === "finalizado" ? "#4ade80" : "#71717a",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}>
          <span>Completados</span>
          <span
            style={{
              background: filtro === "finalizado" ? "#4ade80" : "#3f3f46",
              color: filtro === "finalizado" ? "#000" : "#fff",
              padding: "2px 10px",
              borderRadius: "12px",
              fontSize: "0.8rem",
              fontWeight: "bold",
              display: "inline-block",
              lineHeight: "normal",
            }}>
            {tareasCompletadas.length}
          </span>
        </button>
      </div>

      {/* Lista con Líneas Punteadas y Cursor Grab/Grabbing */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingBottom: "50px",
        }}>
        {tareasFiltradas.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#71717a",
              padding: "20px 0",
            }}>
            No hay tareas en esta categoría.
          </div>
        ) : (
          tareasFiltradas.map((t, index) => {
            const isBeingDragged = draggedIndex.current === index;
            const isDropTarget =
              overIndex === index && draggedIndex.current !== index;

            return (
              <React.Fragment key={t.id}>
                {isDropTarget && draggedIndex.current > index && (
                  <div
                    style={{
                      border: "2px dashed #555",
                      borderRadius: "4px",
                      width: "100%",
                      height: "48px",
                      background: "rgba(255,255,255,0.02)",
                      margin: "2px 0",
                      boxSizing: "border-box",
                    }}
                  />
                )}

                <div
                  draggable={editandoId !== t.id}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={handleDragEnter}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#222222",
                    border: "1px solid #2a2a2a",
                    padding: "10px 16px",
                    borderRadius: "4px",
                    gap: "15px",
                    cursor:
                      editandoId !== t.id
                        ? isBeingDragged
                          ? "grabbing"
                          : "grab"
                        : "default",
                    opacity: isBeingDragged ? 0.4 : 1,
                    boxSizing: "border-box",
                    width: "100%",
                  }}>
                  {/* Número y Texto */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: 1,
                    }}>
                    <span
                      style={{
                        color: colorActivo,
                        fontWeight: "bold",
                        fontSize: "1.05rem",
                        minWidth: "24px",
                      }}>
                      {index + 1}.
                    </span>

                    {editandoId === t.id ? (
                      <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                        <input
                          type="text"
                          value={textoEditado}
                          onChange={(e) => setTextoEditado(e.target.value)}
                          style={{
                            flex: 1,
                            background: "#333",
                            color: "#fff",
                            border: "1px solid #555",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            outline: "none",
                          }}
                        />
                      </div>
                    ) : (
                      <span
                        style={{
                          color:
                            t.estado === "finalizado" ||
                            t.estado === "completado"
                              ? "#a1a1aa"
                              : "#ffffff",
                          fontSize: "1rem",
                          textDecoration:
                            t.estado === "finalizado" ||
                            t.estado === "completado"
                              ? "line-through"
                              : "none",
                          flex: 1,
                          wordBreak: "break-word",
                        }}>
                        {t.texto}
                      </span>
                    )}
                  </div>

                  {/* Botones */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}>
                    <select
                      value={
                        t.estado === "finalizado" ? "completado" : t.estado
                      }
                      onChange={(e) =>
                        cambiarEstado(
                          t.id,
                          e.target.value === "completado"
                            ? "finalizado"
                            : "pendiente",
                        )
                      }
                      style={{
                        background: "#2a2a2a",
                        color: "#e0e0e0",
                        border: "1px solid #404040",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}>
                      <option value="pendiente">Pendiente</option>
                      <option value="completado">Completado</option>
                    </select>

                    {editandoId === t.id ? (
                      <>
                        <button
                          onClick={() => guardarModificacion(t.id)}
                          style={{
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            padding: "5px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                          }}>
                          Guardar
                        </button>
                        <button
                          onClick={cancelarModificacion}
                          style={{
                            background: "transparent",
                            color: "#a1a1aa",
                            border: "1px solid #444",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => iniciarModificacion(t)}
                          style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            padding: "5px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                          }}>
                          Editar
                        </button>
                        <button
                          onClick={() => borrarTarea(t.id)}
                          style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            padding: "5px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                          }}>
                          Borrar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isDropTarget && draggedIndex.current < index && (
                  <div
                    style={{
                      border: "2px dashed #555",
                      borderRadius: "4px",
                      width: "100%",
                      height: "48px",
                      background: "rgba(255,255,255,0.02)",
                      margin: "2px 0",
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
