"use client";

import React from "react";
import ListaDeTareasUI from "./ListaDeTareasUI.jsx";

export default function ListaDeTareas() {
    // Garantiza estrictamente que solo funcione en desarrollo local
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    return <ListaDeTareasUI />;
}