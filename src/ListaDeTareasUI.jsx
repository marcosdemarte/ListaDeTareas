"use client";

import React, { useState, useEffect } from "react";
import { obtenerTareasXML, guardarTareasXML } from "./actions";

export default function ListaDeTareasUI() {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [filtro, setFiltro] = useState("pendiente");

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
      xmlString += `    <tarea estado="${t.estado}">${t.texto}</tarea>\n`;
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

  const tareasFiltradas = tareas.filter((t) => t.estado === filtro);

  return (
    <div
      style={{
        background: "#1a1a1a",
        color: "#fff",
        padding: "20px",
        borderRadius: "8px",
        margin: "20px 0",
        border: "1px solid #333",
      }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        Lista de Tareas (Local Dev)
      </h2>

      <form
        onSubmit={agregarTarea}
        style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          placeholder="Descripción de la tarea..."
          style={{
            flex: 1,
            padding: "10px",
            background: "#2a2a2a",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}>
          Agregar
        </button>
      </form>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "20px",
          borderBottom: "1px solid #444",
          paddingBottom: "10px",
        }}>
        <button
          onClick={() => setFiltro("pendiente")}
          style={{
            background: "none",
            border: "none",
            color: filtro === "pendiente" ? "#ff4d4f" : "#aaa",
            cursor: "pointer",
            fontWeight: "bold",
          }}>
          Pendientes ({tareas.filter((t) => t.estado === "pendiente").length})
        </button>
        <button
          onClick={() => setFiltro("finalizado")}
          style={{
            background: "none",
            border: "none",
            color: filtro === "finalizado" ? "#52c41a" : "#aaa",
            cursor: "pointer",
            fontWeight: "bold",
          }}>
          Completados ({tareas.filter((t) => t.estado === "finalizado").length})
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {tareasFiltradas.map((t, index) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#252525",
              padding: "10px 15px",
              marginBottom: "8px",
              borderRadius: "4px",
            }}>
            <span>
              {index + 1}. {t.texto}
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={t.estado}
                onChange={(e) => cambiarEstado(t.id, e.target.value)}
                style={{
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  padding: "5px",
                  borderRadius: "4px",
                }}>
                <option value="pendiente">Pendiente</option>
                <option value="finalizado">Finalizado</option>
              </select>
              <button
                onClick={() => borrarTarea(t.id)}
                style={{
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
