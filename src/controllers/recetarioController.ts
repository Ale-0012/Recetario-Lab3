import * as Recetas from '../models/receta';
import {
  actualizarTextoCaos, agregarFila, mostrarPreview, renderBase, renderDetalle,
  renderFormulario, renderLista, renderSugerencias,
} from '../views/recetarioView';

let fotoActual: string | null = null;
let caosActivo = 0;
let dlg: HTMLDialogElement;

const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

/** Reduce la imagen para que quepa en localStorage. */
function reducirImagen(file: File, max = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida'));
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function filtrosActuales(): Recetas.Filtros {
  const terminos = val('busqueda').split(',').map((t) => t.trim()).filter(Boolean);
  return {
    terminos,
    caos: caosActivo || undefined,
    orden: val('orden') as Recetas.Filtros['orden'],
  };
}

function refrescar(): void {
  renderLista(Recetas.listar(filtrosActuales()));
  renderSugerencias(Recetas.nombresIngredientes());
}

function abrirDetalle(id: number): void {
  const r = Recetas.obtener(id);
  if (!r) return;
  renderDetalle(dlg, r);
  if (!dlg.open) dlg.showModal();
}

function abrirFormulario(r?: Recetas.Receta): void {
  fotoActual = r?.foto ?? null;
  renderFormulario(dlg, r);
  if (!dlg.open) dlg.showModal();
}

function guardar(): void {
  const ingredientes = Array.from(document.querySelectorAll('.ing-fila'))
    .map((f) => ({
      cantidad: (f.querySelector('.ing-cant') as HTMLInputElement).value,
      nombre: (f.querySelector('.ing-nom') as HTMLInputElement).value,
    }))
    .filter((i) => i.nombre.trim());

  if (ingredientes.length === 0) {
    alert('Agrega al menos un ingrediente 🧺');
    return;
  }

  const datos: Recetas.NuevaReceta = {
    nombre: val('f-nombre').trim(),
    descripcion: val('f-desc').trim(),
    pasos: val('f-pasos').trim(),
    caos: Number(val('f-caos')),
    minutos: Math.max(1, Number(val('f-min')) || 30),
    porciones: Math.max(1, Number(val('f-por')) || 2),
    emoji: val('f-emoji'),
    foto: fotoActual,
    ingredientes,
  };
  if (!datos.nombre || !datos.pasos) return;

  const id = val('f-id');
  if (id) Recetas.actualizar(Number(id), datos);
  else Recetas.crear(datos);

  dlg.close();
  refrescar();
}

export function iniciar(root: HTMLElement): void {
  Recetas.sembrarEjemplos();
  renderBase(root);
  dlg = document.getElementById('dlg') as HTMLDialogElement;
  refrescar();

  document.getElementById('btn-nueva')!.addEventListener('click', () => abrirFormulario());
  document.getElementById('busqueda')!.addEventListener('input', refrescar);
  document.getElementById('orden')!.addEventListener('change', refrescar);

  document.getElementById('chips-caos')!.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement | null;
    if (!chip) return;
    caosActivo = Number(chip.dataset.caos);
    document.querySelectorAll('#chips-caos .chip').forEach((c) => c.classList.toggle('activo', c === chip));
    refrescar();
  });

  document.getElementById('btn-sorpresa')!.addEventListener('click', () => {
    const todas = Recetas.listar();
    if (todas.length) abrirDetalle(todas[Math.floor(Math.random() * todas.length)].id);
  });

  // Abrir detalle al hacer clic (o Enter) en una tarjeta
  const grid = document.getElementById('grid')!;
  const clickCard = (e: Event) => {
    const card = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (card) abrirDetalle(Number(card.dataset.id));
  };
  grid.addEventListener('click', clickCard);
  grid.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') clickCard(e); });

  // Modal: cerrar al hacer clic fuera
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  // Acciones dentro del modal (delegación)
  dlg.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-accion]') as HTMLElement | null;
    if (!btn) return;
    const accion = btn.dataset.accion;
    const id = Number((dlg.querySelector('.detalle') as HTMLElement | null)?.dataset.id);

    if (accion === 'cerrar') dlg.close();
    else if (accion === 'editar') { const r = Recetas.obtener(id); if (r) abrirFormulario(r); }
    else if (accion === 'eliminar') {
      if (confirm('¿Seguro que quieres eliminar esta receta?')) { Recetas.eliminar(id); dlg.close(); refrescar(); }
    }
    else if (accion === 'add-ing') agregarFila();
    else if (accion === 'quitar-ing') {
      const filas = document.querySelectorAll('.ing-fila');
      if (filas.length > 1) btn.closest('.ing-fila')!.remove();
    }
    else if (accion === 'dados') {
      const nuevos = Recetas.ingredientesAleatorios(3);
      document.querySelectorAll('.ing-fila').forEach((f) => {
        if (!(f.querySelector('.ing-nom') as HTMLInputElement).value.trim()) f.remove();
      });
      nuevos.forEach((i) => agregarFila(i.cantidad, i.nombre));
      const nombre = document.getElementById('f-nombre') as HTMLInputElement;
      if (!nombre.value.trim()) {
        const c = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        nombre.value = `${c(nuevos[0].nombre)} con ${nuevos[1].nombre} y ${nuevos[2].nombre}`;
      }
    }
  });

  dlg.addEventListener('submit', (e) => { e.preventDefault(); guardar(); });
  dlg.addEventListener('input', (e) => { if ((e.target as HTMLElement).id === 'f-caos') actualizarTextoCaos(); });
  dlg.addEventListener('change', async (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id !== 'f-foto' || !t.files?.[0]) return;
    try {
      fotoActual = await reducirImagen(t.files[0]);
      mostrarPreview(fotoActual);
    } catch (err) {
      alert((err as Error).message);
    }
  });
}
