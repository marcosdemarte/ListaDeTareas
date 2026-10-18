"use server";

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";

const filePath = path.join(process.cwd(), "data", "tareas.xml");
const dataDir = path.join(process.cwd(), "data");

async function asegurarArchivo() {
    if (!fs.existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        const defaultXml = `<tareas>\n</tareas>`;
        await writeFile(filePath, defaultXml, "utf-8");
    }
}

export async function obtenerTareasXML() {
    try {
        await asegurarArchivo();
        return await readFile(filePath, "utf-8");
    } catch (error) {
        return "<tareas></tareas>";
    }
}

export async function guardarTareasXML(xmlContent) {
    try {
        await asegurarArchivo();
        if (!xmlContent.trim().startsWith("<tareas")) return false;
        await writeFile(filePath, xmlContent, "utf-8");
        return true;
    } catch (error) {
        return false;
    }
}