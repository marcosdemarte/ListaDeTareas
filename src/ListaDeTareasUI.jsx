// Manejadores de Drag and Drop optimizados y corregidos para mapeo global
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
  if (sourceIndex === targetIndex) {
    setDraggedIndex(null);
    setOverIndex(null);
    return;
  }

  // Obtenemos los elementos filtrados actuales (ej: solo pendientes o solo completados)
  const tareasFiltradas =
    filtro === "pendiente" ? tareasPendientes : tareasCompletadas;
  const itemMovido = tareasFiltradas[sourceIndex];
  const targetItem = tareasFiltradas[targetIndex];

  if (!itemMovido || !targetItem) {
    setDraggedIndex(null);
    setOverIndex(null);
    return;
  }

  // Encontramos los índices reales en el array global de tareas
  const indiceRealSource = tareas.findIndex((t) => t.id === itemMovido.id);
  const indiceRealTarget = tareas.findIndex((t) => t.id === targetItem.id);

  if (indiceRealSource === -1 || indiceRealTarget === -1) {
    setDraggedIndex(null);
    setOverIndex(null);
    return;
  }

  // Reordenamos el array global completo
  const copia = [...tareas];
  const [removido] = copia.splice(indiceRealSource, 1);
  copia.splice(indiceRealTarget, 0, removido);

  // Limpiamos los estados visuales del drag
  draggedIndex.current = null;
  setOverIndex(null);

  // Actualizamos el estado local y procedemos a guardar en el servidor XML
  setTareas(copia);
  await sincronizarConXML(copia);
};

const handleDragEnd = () => {
  draggedIndex.current = null;
  setOverIndex(null);
};
