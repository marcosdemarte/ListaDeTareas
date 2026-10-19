"use server";

import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "tareas.xml");

export async function obtenerTareasXML() {
    try {
        if (!fs.existsSync(filePath)) {
            return "<tareas></tareas>";
        }
        return fs.readFileSync(filePath, "utf8");
    } catch (error) {
        console.error("Error leyendo XML:", error);
        return "<tareas></tareas>";
    }
}

export async function guardarTareasXML(xmlContent) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, xmlContent, "utf8");
        return { success: true };
    } catch (error) {
        console.error("Error guardando XML:", error);
        return { success: false, error: error.message };
    }
}