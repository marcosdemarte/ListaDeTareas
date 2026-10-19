"use client";

import React, { useState, useEffect } from "react";
import { obtenerTareasXML, guardarTareasXML } from "./actions";

export default function ListaDeTareasUI() {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [filtro, setFiltro] = useState("pendiente");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEditado, setTextoEditado] = useState("");

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

  const guardarEnXML = async (updatedTareas) => {
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
  };

  const agregarTarea = (e) => {
    e.preventDefault();
    if (!nuevaTarea.trim()) return;

    const updated = [
      ...tareas,
      { id: Date.now(), texto: nuevaTarea.trim(), estado: "pendiente" },
    ];
    setTareas(updated);
    setNuevaTarea("");
    guardarEnXML(updated);
  };

  const cambiarEstado = (id, nuevoEstado) => {
    const updated = tareas.map((t) =>
      t.id === id ? { ...t, estado: nuevoEstado } : t,
    );
    setTareas(updated);
    guardarEnXML(updated);
  };

  const borrarTarea = (id) => {
    const updated = tareas.filter((t) => t.id !== id);
    setTareas(updated);
    guardarEnXML(updated);
  };

  const iniciarModificacion = (t) => {
    setEditandoId(t.id);
    setTextoEditado(t.texto);
  };

  const guardarModificacion = (id) => {
    const updated = tareas.map((t) =>
      t.id === id ? { ...t, texto: textoEditado.trim() } : t,
    );
    setTareas(updated);
    setEditandoId(null);
    setTextoEditado("");
    guardarEnXML(updated);
  };

  const tareasPendientes = tareas.filter((t) => t.estado === "pendiente");
  const tareasCompletadas = tareas.filter(
    (t) => t.estado === "finalizado" || t.estado === "completado",
  );
  const tareasFiltradas =
    filtro === "pendiente" ? tareasPendientes : tareasCompletadas;

  return (
    <div
      style={{
        background: "#1c1c1c",
        color: "#e0e0e0",
        padding: "20px 30px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: "1px solid #2d2d2d",
        width: "100%",
        boxSizing: "border-box",
      }}>
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

      {/* Formulario con Textarea y Botón Centrado */}
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

      {/* Navegación de Filtros */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #333333",
          marginBottom: "15px",
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
            color: filtro === "pendiente" ? "#ef4444" : "#a1a1aa",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            fontSize: "1rem",
          }}>
          Pendientes
          <span
            style={{
              background: "#ef4444",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.8rem",
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
                ? "2px solid #3b82f6"
                : "2px solid transparent",
            color: filtro === "finalizado" ? "#3b82f6" : "#a1a1aa",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            fontSize: "1rem",
          }}>
          Completados
          <span
            style={{
              background: "#52525b",
              color: "#d4d4d8",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.8rem",
            }}>
            {tareasCompletadas.length}
          </span>
        </button>
      </div>

      {/* Lista de Tareas */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
          tareasFiltradas.map((t, index) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#222222",
                border: "1px solid #2a2a2a",
                padding: "10px 16px",
                borderRadius: "4px",
                gap: "15px",
              }}>
              {/* Número y Texto */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "10px",
                  flex: 1,
                }}>
                <span
                  style={{
                    color: "#ef4444",
                    fontWeight: "bold",
                    fontSize: "1.05rem",
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
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                    />
                    <button
                      onClick={() => guardarModificacion(t.id)}
                      style={{
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}>
                      OK
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      color:
                        t.estado === "finalizado" || t.estado === "completado"
                          ? "#a1a1aa"
                          : "#ffffff",
                      fontSize: "1rem",
                      textDecoration:
                        t.estado === "finalizado" || t.estado === "completado"
                          ? "line-through"
                          : "none",
                    }}>
                    {t.texto}
                  </span>
                )}
              </div>

              {/* Select & Botones de Acción */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <select
                  value={t.estado === "finalizado" ? "completado" : t.estado}
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

                <button
                  onClick={() => borrarTarea(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#a1a1aa",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  onMouseOver={(e) => (e.target.style.color = "#ef4444")}
                  onMouseOut={(e) => (e.target.style.color = "#a1a1aa")}>
                  Borrar
                </button>

                {editandoId !== t.id && (
                  <button
                    onClick={() => iniciarModificacion(t)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#a1a1aa",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                    onMouseOver={(e) => (e.target.style.color = "#ffffff")}
                    onMouseOut={(e) => (e.target.style.color = "#a1a1aa")}>
                    Modificar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
