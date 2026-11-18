import { EMOJIS, NIVELES, nombreNivel, type Receta } from '../models/receta';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const llamas = (n: number) => '🔥'.repeat(n);

export function renderBase(root: HTMLElement): void {
  root.innerHTML = `
    <header class="hero">
      <div class="flotantes" aria-hidden="true">
        <span style="--x:6%;--d:0s">🍅</span><span style="--x:18%;--d:1.2s">🧀</span>
        <span style="--x:32%;--d:.6s">🌶️</span><span style="--x:68%;--d:1.8s">🥑</span>
        <span style="--x:82%;--d:.3s">🍋</span><span style="--x:93%;--d:1.4s">🥕</span>
      </div>
      <p class="sobre">Cocina con un poquito de desorden</p>
      <h1>Recetario <em>Caótico</em></h1>
      <p class="lema">Recetas con ingredientes inesperados. Busca por lo que tengas en la nevera y mide el nivel de caos.</p>

      <div class="buscador">
        <span>🔍</span>
        <input id="busqueda" type="search" placeholder="Busca por ingrediente o receta (ej: huevo, queso)" autocomplete="off" />
      </div>
      <button id="btn-nueva" class="btn-principal">＋ Nueva receta</button>
    </header>

    <section class="barra">
      <div class="chips-caos" id="chips-caos">
        <button class="chip activo" data-caos="0">Todas</button>
        ${NIVELES.map((n) => `<button class="chip" data-caos="${n.n}">🔥 ${n.n} · ${n.nombre}</button>`).join('')}
      </div>
      <div class="herramientas">
        <select id="orden" aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="caos_asc">Menos caos primero</option>
          <option value="caos_desc">Más caos primero</option>
          <option value="rapidas">Más rápidas</option>
        </select>
        <button id="btn-sorpresa" class="btn-sec">🎲 Sorpréndeme</button>
      </div>
    </section>

    <p id="contador" class="contador"></p>
    <main id="grid" class="grid"></main>

    <footer>Hecho con 🧡 y mucho caos · TypeScript + SQLite (sql.js) · Vercel</footer>

    <datalist id="lista-ing"></datalist>
    <dialog id="dlg"></dialog>
  `;
}

export function renderSugerencias(nombres: string[]): void {
  document.getElementById('lista-ing')!.innerHTML = nombres.map((n) => `<option value="${esc(n)}"></option>`).join('');
}

function portada(r: Receta, grande = false): string {
  const estilo = r.foto ? `style="background-image:url('${r.foto}')"` : '';
  return `<div class="portada ${grande ? 'grande' : ''} ${r.foto ? 'con-foto' : ''}" ${estilo}>
    ${r.foto ? '' : `<span class="emoji">${r.emoji}</span>`}
    <span class="badge-caos">${llamas(r.caos)}</span>
  </div>`;
}

export function renderLista(recetas: Receta[]): void {
  const grid = document.getElementById('grid')!;
  document.getElementById('contador')!.textContent =
    recetas.length === 1 ? '1 receta encontrada' : `${recetas.length} recetas encontradas`;

  if (recetas.length === 0) {
    grid.innerHTML = `<div class="vacio"><span>🥣</span><p>No encontramos recetas con eso.<br>¡Crea la primera y desata el caos!</p></div>`;
    return;
  }

  grid.innerHTML = recetas
    .map((r, i) => {
      const extra = r.ingredientes.length - 4;
      return `
      <article class="card caos-${r.caos}" data-id="${r.id}" style="--i:${i}" tabindex="0">
        ${portada(r)}
        <div class="cuerpo">
          <h3>${esc(r.nombre)}</h3>
          <p class="desc">${esc(r.descripcion)}</p>
          <div class="meta">
            <span>⏱ ${r.minutos} min</span><span>🍽 ${r.porciones}</span><span class="nivel">${nombreNivel(r.caos)}</span>
          </div>
          <div class="ings">
            ${r.ingredientes.slice(0, 4).map((x) => `<span>${esc(cap(x.nombre))}</span>`).join('')}
            ${extra > 0 ? `<span class="mas">+${extra}</span>` : ''}
          </div>
        </div>
      </article>`;
    })
    .join('');
}

export function renderDetalle(dlg: HTMLDialogElement, r: Receta): void {
  const pasos = r.pasos.split('\n').map((p) => p.trim()).filter(Boolean);
  dlg.className = `caos-${r.caos}`;
  dlg.innerHTML = `
    <button class="cerrar" data-accion="cerrar" aria-label="Cerrar">✕</button>
    ${portada(r, true)}
    <div class="detalle" data-id="${r.id}">
      <h2>${esc(r.nombre)}</h2>
      <p class="desc">${esc(r.descripcion)}</p>
      <div class="meta grande">
        <span>⏱ ${r.minutos} min</span><span>🍽 ${r.porciones} porciones</span>
        <span class="nivel">${llamas(r.caos)} ${nombreNivel(r.caos)}</span>
      </div>
      <h4>🧺 Ingredientes</h4>
      <ul class="lista-ing">
        ${r.ingredientes.map((x) => `<li><b>${esc(x.cantidad || '·')}</b> ${esc(cap(x.nombre))}</li>`).join('')}
      </ul>
      <h4>👩‍🍳 Preparación</h4>
      <ol class="pasos">${pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      <div class="acciones">
        <button class="btn-sec" data-accion="editar">✏️ Editar</button>
        <button class="btn-peligro" data-accion="eliminar">🗑️ Eliminar</button>
      </div>
    </div>`;
}

export function filaIngrediente(cantidad = '', nombre = ''): string {
  return `<div class="ing-fila">
    <input class="ing-cant" placeholder="Cantidad" value="${esc(cantidad)}" maxlength="30" />
    <input class="ing-nom" placeholder="Ingrediente" list="lista-ing" value="${esc(nombre)}" maxlength="40" />
    <button type="button" class="quitar" data-accion="quitar-ing" aria-label="Quitar">✕</button>
  </div>`;
}

export function agregarFila(cantidad = '', nombre = ''): void {
  document.getElementById('ing-lista')!.insertAdjacentHTML('beforeend', filaIngrediente(cantidad, nombre));
}

export function renderFormulario(dlg: HTMLDialogElement, r?: Receta): void {
  dlg.className = '';
  dlg.innerHTML = `
    <button class="cerrar" data-accion="cerrar" aria-label="Cerrar">✕</button>
    <form id="form-receta" class="formulario" autocomplete="off">
      <h2>${r ? '✏️ Editar receta' : '🍳 Nueva receta caótica'}</h2>
      <input type="hidden" id="f-id" value="${r ? r.id : ''}" />

      <label>Nombre <input id="f-nombre" required maxlength="60" value="${r ? esc(r.nombre) : ''}" placeholder="Ej: Pizza de cereal" /></label>
      <label>Descripción corta <input id="f-desc" maxlength="120" value="${r ? esc(r.descripcion) : ''}" placeholder="Una frase que abra el apetito" /></label>

      <div class="fila">
        <label>Emoji
          <select id="f-emoji">${EMOJIS.map((e) => `<option ${r?.emoji === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
        </label>
        <label>Minutos <input id="f-min" type="number" min="1" max="600" value="${r?.minutos ?? 30}" /></label>
        <label>Porciones <input id="f-por" type="number" min="1" max="50" value="${r?.porciones ?? 2}" /></label>
      </div>

      <label>Nivel de caos: <strong id="f-caos-txt"></strong>
        <input id="f-caos" type="range" min="1" max="5" value="${r?.caos ?? 3}" />
      </label>

      <div class="bloque-ing">
        <div class="bloque-cab">
          <span>🧺 Ingredientes</span>
          <div>
            <button type="button" class="btn-sec peq" data-accion="add-ing">＋ Añadir</button>
            <button type="button" class="btn-sec peq" data-accion="dados">🎲 Dados del caos</button>
          </div>
        </div>
        <div id="ing-lista">${(r?.ingredientes.length ? r.ingredientes : [{ cantidad: '', nombre: '' }]).map((x) => filaIngrediente(x.cantidad, x.nombre)).join('')}</div>
      </div>

      <label>Preparación <small>(un paso por línea)</small>
        <textarea id="f-pasos" required rows="5" placeholder="Mezcla...&#10;Hornea...">${r ? esc(r.pasos) : ''}</textarea>
      </label>

      <label>Foto (opcional) <input id="f-foto" type="file" accept="image/*" /></label>
      <div id="f-preview">${r?.foto ? `<img class="preview" src="${r.foto}" alt="Vista previa" />` : ''}</div>

      <div class="acciones">
        <button type="submit" class="btn-principal">${r ? 'Guardar cambios' : 'Guardar receta'}</button>
        <button type="button" class="btn-sec" data-accion="cerrar">Cancelar</button>
      </div>
    </form>`;
  actualizarTextoCaos();
}

export function actualizarTextoCaos(): void {
  const v = Number((document.getElementById('f-caos') as HTMLInputElement).value);
  document.getElementById('f-caos-txt')!.textContent = `${llamas(v)} ${nombreNivel(v)}`;
}

export function mostrarPreview(foto: string | null): void {
  document.getElementById('f-preview')!.innerHTML = foto ? `<img class="preview" src="${foto}" alt="Vista previa" />` : '';
}
