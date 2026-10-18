"use client";

import React from "react";
import ListaDeTareasUI from "./ListaDeTareasUI.jsx";

export default function ListaDeTareas() {
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    return <ListaDeTareasUI />;
}