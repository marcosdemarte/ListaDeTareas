const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../../');
const targetDir = path.join(rootDir, 'data');
const targetFile = path.join(targetDir, 'tareas.xml');
const templateFile = path.join(__dirname, '../tareas.template.xml');

try {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    if (!fs.existsSync(targetFile)) {
        if (fs.existsSync(templateFile)) {
            fs.copyFileSync(templateFile, targetFile);
            console.log('✅ Archivo data/tareas.xml inicializado con la tarea por defecto.');
        }
    } else {
        console.log('ℹ️ El archivo data/tareas.xml ya existe. Se conserva intacto.');
    }
} catch (error) {
    console.error('⚠️ Error al inicializar el archivo tareas.xml:', error);
}