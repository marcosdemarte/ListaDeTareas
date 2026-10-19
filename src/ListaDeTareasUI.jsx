"use client";

import React, { useState, useEffect, useRef } from "react";
import { obtenerTareasXML, guardarTareasXML } from "./actions";

// Píxeles que hay que mover el mouse antes de considerar que es un arrastre
// (así un simple clic sobre el ítem no lo "agarra").
const UMBRAL_ARRASTRE = 4;

const esCompletada = (t) =>
  t.estado === "finalizado" || t.estado === "completado";

function parsearXML(xmlText) {
  const xmlDoc = new DOMParser().parseFromString(xmlText, "application/xml");
  const nodos = xmlDoc.getElementsByTagName("tarea");
  const lista = [];
  for (let i = 0; i < nodos.length; i++) {
    lista.push({
      id: i + 1,
      texto: nodos[i].textContent,
      estado: nodos[i].getAttribute("estado") || "pendiente",
    });
  }
  return lista;
}

export default function ListaDeTareasUI() {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [filtro, setFiltro] = useState("pendiente");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");

  // Estado visual del arrastre: { id, desde, hasta, top, left, width, height }
  const [arrastre, setArrastre] = useState(null);
  const dragRef = useRef(null);
  const filaRefs = useRef({});
  const quitarListeners = useRef(null);

  useEffect(() => {
    obtenerTareasXML().then((xmlText) => setTareas(parsearXML(xmlText)));
    // Si el componente se desmonta en medio de un arrastre, limpiamos los listeners
    return () => quitarListeners.current?.();
  }, []);

  const tareasPendientes = tareas.filter((t) => t.estado === "pendiente");
  const tareasCompletadas = tareas.filter(esCompletada);
  const tareasFiltradas =
    filtro === "pendiente" ? tareasPendientes : tareasCompletadas;

  const sincronizarConXML = async (updatedTareas) => {
    setGuardando(true);
    setErrorGuardado("");
    try {
      let xmlString = "<tareas>\n";
      updatedTareas.forEach((t) => {
        const textoEscaped = t.texto
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        xmlString += `    <tarea estado="${t.estado}">${textoEscaped}</tarea>\n`;
      });
      xmlString += "</tareas>";

      const res = await guardarTareasXML(xmlString);
      if (!res?.success) {
        console.error("No se pudo guardar el XML:", res?.error);
        setErrorGuardado(
          `No se pudo guardar en el XML${res?.error ? `: ${res.error}` : ""}`,
        );
      }

      // Siempre se vuelve a leer el XML: lo que se ve es lo que está guardado
      const xmlText = await obtenerTareasXML();
      setTareas(parsearXML(xmlText));
    } catch (error) {
      console.error("Error sincronizando con el XML:", error);
      setErrorGuardado("Error al sincronizar con el XML");
    } finally {
      setGuardando(false);
    }
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

  // ---------------------------------------------------------------------------
  // Reordenamiento por arrastre (pointer events).
  // Se usa esto y no el drag & drop nativo de HTML5 porque durante un arrastre
  // nativo el navegador ignora el CSS "cursor" (no se puede mostrar la mano
  // cerrada) y porque el hueco punteado que aparecía bajo el mouse no aceptaba
  // el "drop", así que al soltar ahí no se guardaba nada.
  // ---------------------------------------------------------------------------

  // Reordena solo dentro de la pestaña visible y respeta las posiciones que
  // ocupan en el XML las tareas del otro estado.
  const reordenar = async (visibles, desde, hasta) => {
    const nuevoOrden = visibles.filter((_, i) => i !== desde);
    nuevoOrden.splice(hasta, 0, visibles[desde]);

    const idsVisibles = new Set(visibles.map((t) => t.id));
    let k = 0;
    const copia = tareas.map((t) =>
      idsVisibles.has(t.id) ? nuevoOrden[k++] : t,
    );

    setTareas(copia); // evita el parpadeo mientras se guarda
    await sincronizarConXML(copia); // lista inactiva -> guarda XML -> relee XML
  };

  const iniciarPresion = (e, t, index) => {
    if (guardando || editandoId === t.id) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest("button, select, input, textarea, option, a")) return;

    const fila = filaRefs.current[t.id];
    if (!fila) return;

    const rect = fila.getBoundingClientRect();
    const scrollY = window.scrollY;
    const visibles = tareasFiltradas;

    // Centro vertical (en coordenadas de página) de cada ítem en su posición original
    const centros = visibles.map((x, i) => {
      if (i === index) return null;
      const el = filaRefs.current[x.id];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top + scrollY + r.height / 2;
    });

    dragRef.current = {
      id: t.id,
      desde: index,
      hasta: index,
      startX: e.clientX,
      startY: e.clientY,
      offsetY: e.clientY - rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      centros,
      iniciado: false,
    };

    const mover = (ev) => {
      const d = dragRef.current;
      if (!d) return;

      if (!d.iniciado) {
        const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
        if (dist < UMBRAL_ARRASTRE) return;
        d.iniciado = true;
        window.getSelection?.()?.removeAllRanges();
      }

      // Posición destino = cantidad de ítems (sin contar el agarrado) que
      // quedan por encima del cursor. Si es igual a la original, el hueco
      // punteado queda en el lugar de origen.
      const yPagina = ev.clientY + window.scrollY;
      let hasta = 0;
      d.centros.forEach((c) => {
        if (c !== null && c < yPagina) hasta++;
      });
      d.hasta = hasta;

      setArrastre({
        id: d.id,
        desde: d.desde,
        hasta,
        top: ev.clientY - d.offsetY,
        left: d.left,
        width: d.width,
        height: d.height,
      });
    };

    const terminar = (cancelado) => {
      quitarListeners.current?.();
      const d = dragRef.current;
      dragRef.current = null;
      setArrastre(null);

      if (!d || !d.iniciado || cancelado) return;
      if (d.hasta === d.desde) return; // soltado en su lugar: nada que guardar
      reordenar(visibles, d.desde, d.hasta);
    };

    const soltar = () => terminar(false);
    const cancelar = () => terminar(true);

    quitarListeners.current = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
      quitarListeners.current = null;
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
  };

  const colorActivo = filtro === "pendiente" ? "#ef4444" : "#4ade80";

  const renderFila = (t, numero, index, fantasma = false) => {
    const editando = editandoId === t.id;
    const baseStyle = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#222222",
      border: "1px solid #2a2a2a",
      padding: "10px 16px",
      borderRadius: "4px",
      gap: "15px",
      boxSizing: "border-box",
      width: "100%",
    };
    const style = fantasma
      ? {
          ...baseStyle,
          position: "fixed",
          top: arrastre.top,
          left: arrastre.left,
          width: arrastre.width,
          height: arrastre.height,
          zIndex: 50,
          pointerEvents: "none",
          cursor: "grabbing", // mano cerrada mientras se arrastra
          opacity: 0.95,
          background: "#2c2c2c",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }
      : {
          ...baseStyle,
          cursor: editando ? "default" : "grab", // mano abierta al pasar por encima
        };

    return (
      <div
        key={t.id}
        ref={(el) => {
          if (fantasma) return;
          if (el) filaRefs.current[t.id] = el;
          else delete filaRefs.current[t.id];
        }}
        onPointerDown={
          fantasma ? undefined : (e) => iniciarPresion(e, t, index)
        }
        style={style}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
          }}
        >
          <span
            style={{
              color: colorActivo,
              fontWeight: "bold",
              fontSize: "1.05rem",
              minWidth: "24px",
            }}
          >
            {numero}.
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
                  t.estado === "finalizado" || t.estado === "completado"
                    ? "#a1a1aa"
                    : "#ffffff",
                fontSize: "1rem",
                textDecoration:
                  t.estado === "finalizado" || t.estado === "completado"
                    ? "line-through"
                    : "none",
                flex: 1,
                wordBreak: "break-word",
              }}
            >
              {t.texto}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <select
            value={t.estado === "finalizado" ? "completado" : t.estado}
            onChange={(e) =>
              cambiarEstado(
                t.id,
                e.target.value === "completado" ? "finalizado" : "pendiente",
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
            }}
          >
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
                }}
              >
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
                }}
              >
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
                }}
              >
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
                }}
              >
                Borrar
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Armado de la lista: sin el ítem agarrado, con el hueco punteado en la
  // posición destino (que al empezar es la posición original).
  const filasSinAgarrada = arrastre
    ? tareasFiltradas.filter((t) => t.id !== arrastre.id)
    : tareasFiltradas;
  const agarrada = arrastre
    ? tareasFiltradas.find((t) => t.id === arrastre.id)
    : null;

  const hueco = (
    <div
      key="hueco-punteado"
      style={{
        border: "2px dashed #555",
        borderRadius: "4px",
        width: "100%",
        height: arrastre ? `${arrastre.height}px` : "48px",
        background: "rgba(255,255,255,0.02)",
        boxSizing: "border-box",
      }}
    />
  );

  const filasRender = [];
  filasSinAgarrada.forEach((t, i) => {
    if (arrastre && i === arrastre.hasta) filasRender.push(hueco);
    const indiceOriginal = tareasFiltradas.findIndex((x) => x.id === t.id);
    const numero = i + 1 + (arrastre && i >= arrastre.hasta ? 1 : 0);
    filasRender.push(renderFila(t, numero, indiceOriginal));
  });
  if (arrastre && arrastre.hasta >= filasSinAgarrada.length)
    filasRender.push(hueco);
  if (agarrada)
    filasRender.push(
      renderFila(agarrada, arrastre.hasta + 1, arrastre.desde, true),
    );

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
      }}
    >
      {arrastre && (
        <style>{`* { cursor: grabbing !important; user-select: none !important; }`}</style>
      )}

      {errorGuardado && !guardando && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 15,
            right: 15,
            background: "#7f1d1d",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "0.85rem",
            zIndex: 10,
          }}
        >
          {errorGuardado}
        </div>
      )}

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
          }}
        >
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
        }}
      >
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
        }}
      >
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
          }}
        >
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
        }}
      >
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
          }}
        >
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
            }}
          >
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
          }}
        >
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
            }}
          >
            {tareasCompletadas.length}
          </span>
        </button>
      </div>

      {/* Lista */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingBottom: "50px",
        }}
      >
        {tareasFiltradas.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#71717a",
              padding: "20px 0",
            }}
          >
            No hay tareas en esta categoría.
          </div>
        ) : (
          filasRender
        )}
      </div>
    </div>
  );
}
