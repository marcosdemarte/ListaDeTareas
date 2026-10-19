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
      // Escape básico para XML si es necesario
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

  const iniciarEdicion = (t) => {
    setEditandoId(t.id);
    setTextoEditado(t.texto);
  };

  const guardarEdicion = (id) => {
    const updated = tareas.map((t) =>
      t.id === id ? { ...t, texto: textoEditado.trim() } : t,
    );
    setTareas(updated);
    setEditandoId(null);
    setTextoEditado("");
    guardarEnXML(updated);
  };

  const moverTarea = (index, direccion) => {
    const tareasFiltradasIds = tareas.filter((t) => t.estado === filtro);
    const itemAMover = tareasFiltradasIds[index];
    const indiceReal = tareas.findIndex((t) => t.id === itemAMover.id);

    const nuevoIndiceReal =
      direccion === "arriba" ? indiceReal - 1 : indiceReal + 1;
    if (nuevoIndiceReal < 0 || nuevoIndiceReal >= tareas.length) return;

    const copia = [...tareas];
    const [removido] = copia.splice(indiceReal, 1);
    copia.splice(nuevoIndiceReal, 0, removido);

    setTareas(copia);
    guardarEnXML(copia);
  };

  const tareasFiltradas = tareas.filter((t) => t.estado === filtro);

  return (
    <div
      style={{
        background: "#121212",
        color: "#e0e0e0",
        padding: "24px",
        borderRadius: "12px",
        margin: "20px auto",
        maxWidth: "800px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        fontFamily: "sans-serif",
        border: "1px solid #2a2a2a",
      }}>
      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: "#fff",
          fontSize: "1.5rem",
        }}>
        Lista de Tareas (Desarrollo Local)
      </h2>

      {/* Formulario para agregar */}
      <form
        onSubmit={agregarTarea}
        style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <input
          type="text"
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          placeholder="Escribe una nueva tarea..."
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: "8px",
            outline: "none",
            fontSize: "0.95rem",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "12px 24px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "background 0.2s",
          }}>
          Agregar
        </button>
      </form>

      {/* Pestañas de filtrado */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          marginBottom: "20px",
          borderBottom: "1px solid #2a2a2a",
          paddingBottom: "12px",
        }}>
        <button
          onClick={() => setFiltro("pendiente")}
          style={{
            background: "transparent",
            border: "none",
            color: filtro === "pendiente" ? "#f87171" : "#888",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
          }}>
          Pendientes ({tareas.filter((t) => t.estado === "pendiente").length})
        </button>
        <button
          onClick={() => setFiltro("finalizado")}
          style={{
            background: "transparent",
            border: "none",
            color: filtro === "finalizado" ? "#4ade80" : "#888",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
          }}>
          Finalizados ({tareas.filter((t) => t.estado === "finalizado").length})
        </button>
      </div>

      {/* Listado de tareas */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {tareasFiltradas.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No hay tareas en esta categoría.
          </p>
        ) : (
          tareasFiltradas.map((t, index) => (
            <li
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#1a1a1a",
                padding: "12px 16px",
                marginBottom: "10px",
                borderRadius: "8px",
                border: "1px solid #2a2a2a",
                gap: "12px",
              }}>
              {/* Ordenar arriba/abajo */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}>
                <button
                  onClick={() => moverTarea(index, "arriba")}
                  disabled={index === 0}
                  style={{
                    background: "none",
                    border: "none",
                    color: index === 0 ? "#444" : "#aaa",
                    cursor: index === 0 ? "default" : "pointer",
                    fontSize: "10px",
                  }}>
                  ▲
                </button>
                <button
                  onClick={() => moverTarea(index, "abajo")}
                  disabled={index === tareasFiltradas.length - 1}
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      index === tareasFiltradas.length - 1 ? "#444" : "#aaa",
                    cursor:
                      index === tareasFiltradas.length - 1
                        ? "default"
                        : "pointer",
                    fontSize: "10px",
                  }}>
                  ▼
                </button>
              </div>

              {/* Texto o Input de edición */}
              <div style={{ flex: 1, wordBreak: "break-word" }}>
                {editandoId === t.id ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={textoEditado}
                      onChange={(e) => setTextoEditado(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        background: "#2a2a2a",
                        color: "#fff",
                        border: "1px solid #555",
                        borderRadius: "4px",
                      }}
                    />
                    <button
                      onClick={() => guardarEdicion(t.id)}
                      style={{
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}>
                      Guardar
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      textDecoration:
                        t.estado === "finalizado" ? "line-through" : "none",
                      color: t.estado === "finalizado" ? "#777" : "#fff",
                    }}>
                    {index + 1}. {t.texto}
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  value={t.estado}
                  onChange={(e) => cambiarEstado(t.id, e.target.value)}
                  style={{
                    background: "#2a2a2a",
                    color: "#fff",
                    border: "1px solid #444",
                    padding: "6px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}>
                  <option value="pendiente">Pendiente</option>
                  <option value="finalizado">Finalizado</option>
                </select>

                {editandoId !== t.id && (
                  <button
                    onClick={() => iniciarEdicion(t)}
                    style={{
                      background: "#d97706",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}>
                    Editar
                  </button>
                )}

                <button
                  onClick={() => borrarTarea(t.id)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}>
                  Borrar
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
