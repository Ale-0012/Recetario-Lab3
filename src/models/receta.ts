import { getDB, persist } from '../db/database';

export const NIVELES = [
  { n: 1, nombre: 'Tranquilo' },
  { n: 2, nombre: 'Travieso' },
  { n: 3, nombre: 'Alborotado' },
  { n: 4, nombre: 'Desordenado' },
  { n: 5, nombre: 'Caos total' },
];
export const nombreNivel = (n: number) => NIVELES.find((x) => x.n === n)?.nombre ?? '';

export const EMOJIS = ['🍝', '🍕', '🌮', '🍜', '🥘', '🍳', '🥗', '🍰', '🍔', '🥪', '🍲', '🧁', '🥞', '🍣'];

export interface IngredienteReceta {
  nombre: string;
  cantidad: string;
}

export interface Receta {
  id: number;
  nombre: string;
  descripcion: string;
  pasos: string;
  caos: number;
  minutos: number;
  porciones: number;
  emoji: string;
  foto: string | null;
  creado_en: number;
  ingredientes: IngredienteReceta[];
}

export type NuevaReceta = Omit<Receta, 'id' | 'creado_en'>;

export interface Filtros {
  terminos?: string[];
  caos?: number;
  orden?: 'recientes' | 'caos_asc' | 'caos_desc' | 'rapidas';
}

function consultar<T>(sql: string, params: (string | number)[] = []): T[] {
  const stmt = getDB().prepare(sql);
  stmt.bind(params);
  const filas: T[] = [];
  while (stmt.step()) filas.push(stmt.getAsObject() as unknown as T);
  stmt.free();
  return filas;
}

function ingredientesDe(recetaId: number): IngredienteReceta[] {
  return consultar<IngredienteReceta>(
    `SELECT i.nombre AS nombre, ri.cantidad AS cantidad
       FROM receta_ingredientes ri
       JOIN ingredientes i ON i.id = ri.ingrediente_id
      WHERE ri.receta_id = ? ORDER BY ri.rowid`,
    [recetaId]
  );
}

function guardarIngredientes(recetaId: number, lista: IngredienteReceta[]): void {
  for (const ing of lista) {
    const nombre = ing.nombre.trim().toLowerCase();
    if (!nombre) continue;
    getDB().run('INSERT OR IGNORE INTO ingredientes (nombre) VALUES (?)', [nombre]);
    const id = consultar<{ id: number }>('SELECT id FROM ingredientes WHERE nombre = ?', [nombre])[0].id;
    getDB().run(
      'INSERT OR REPLACE INTO receta_ingredientes (receta_id, ingrediente_id, cantidad) VALUES (?, ?, ?)',
      [recetaId, id, ing.cantidad.trim()]
    );
  }
}

function limpiarIngredientesHuerfanos(): void {
  getDB().run('DELETE FROM ingredientes WHERE id NOT IN (SELECT ingrediente_id FROM receta_ingredientes)');
}

/* ---------- CREATE ---------- */
export function crear(r: NuevaReceta): void {
  getDB().run(
    `INSERT INTO recetas (nombre, descripcion, pasos, caos, minutos, porciones, emoji, foto, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.nombre, r.descripcion, r.pasos, r.caos, r.minutos, r.porciones, r.emoji, r.foto, Date.now()]
  );
  const id = Number(getDB().exec('SELECT last_insert_rowid()')[0].values[0][0]);
  guardarIngredientes(id, r.ingredientes);
  persist();
}

/* ---------- READ ---------- */
export function listar(f: Filtros = {}): Receta[] {
  const where: string[] = [];
  const params: (string | number)[] = [];

  // Cada término debe coincidir con el nombre de la receta o con alguno de sus ingredientes
  for (const t of f.terminos ?? []) {
    where.push(`(r.nombre LIKE ? OR EXISTS (
      SELECT 1 FROM receta_ingredientes ri
        JOIN ingredientes i ON i.id = ri.ingrediente_id
       WHERE ri.receta_id = r.id AND i.nombre LIKE ?))`);
    params.push(`%${t}%`, `%${t.toLowerCase()}%`);
  }
  if (f.caos) {
    where.push('r.caos = ?');
    params.push(f.caos);
  }

  const orden = {
    recientes: 'r.id DESC',
    caos_asc: 'r.caos ASC, r.nombre ASC',
    caos_desc: 'r.caos DESC, r.nombre ASC',
    rapidas: 'r.minutos ASC, r.nombre ASC',
  }[f.orden ?? 'recientes'];

  const filas = consultar<Omit<Receta, 'ingredientes'>>(
    `SELECT r.* FROM recetas r ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orden}`,
    params
  );
  return filas.map((r) => ({ ...r, ingredientes: ingredientesDe(r.id) }));
}

export function obtener(id: number): Receta | undefined {
  const fila = consultar<Omit<Receta, 'ingredientes'>>('SELECT * FROM recetas WHERE id = ?', [id])[0];
  return fila ? { ...fila, ingredientes: ingredientesDe(id) } : undefined;
}

export function contar(): number {
  return Number(getDB().exec('SELECT COUNT(*) FROM recetas')[0].values[0][0]);
}

export function nombresIngredientes(): string[] {
  return consultar<{ nombre: string }>('SELECT nombre FROM ingredientes ORDER BY nombre').map((x) => x.nombre);
}

/* ---------- UPDATE ---------- */
export function actualizar(id: number, r: NuevaReceta): void {
  getDB().run(
    `UPDATE recetas SET nombre = ?, descripcion = ?, pasos = ?, caos = ?, minutos = ?,
            porciones = ?, emoji = ?, foto = ? WHERE id = ?`,
    [r.nombre, r.descripcion, r.pasos, r.caos, r.minutos, r.porciones, r.emoji, r.foto, id]
  );
  getDB().run('DELETE FROM receta_ingredientes WHERE receta_id = ?', [id]);
  guardarIngredientes(id, r.ingredientes);
  limpiarIngredientesHuerfanos();
  persist();
}

/* ---------- DELETE ---------- */
export function eliminar(id: number): void {
  getDB().run('DELETE FROM receta_ingredientes WHERE receta_id = ?', [id]);
  getDB().run('DELETE FROM recetas WHERE id = ?', [id]);
  limpiarIngredientesHuerfanos();
  persist();
}

/* ---------- Ingredientes aleatorios (los "dados del caos") ---------- */
const POOL = [
  'plátano', 'queso azul', 'chocolate', 'chile jalapeño', 'atún', 'miel', 'aguacate', 'piña',
  'tocino', 'fresas', 'cacahuate', 'yogur', 'albahaca', 'papas fritas', 'mango', 'huevo',
  'tomate', 'cebolla morada', 'pan tostado', 'limón', 'canela', 'salsa picante', 'espinaca',
  'galletas', 'queso crema', 'pollo', 'arroz', 'zanahoria', 'nutella', 'pepino',
];
const CANTIDADES = ['1 pieza', '2 piezas', '1 taza', '1 cucharada', '100 g', '1 puñado', 'al gusto', '1/2 taza'];

export function ingredientesAleatorios(n = 3): IngredienteReceta[] {
  const copia = [...POOL].sort(() => Math.random() - 0.5).slice(0, n);
  return copia.map((nombre) => ({
    nombre,
    cantidad: CANTIDADES[Math.floor(Math.random() * CANTIDADES.length)],
  }));
}

/* ---------- Datos de ejemplo (solo si la tabla está vacía) ---------- */
const FLAG_SEMBRADO = 'recetario_caotico_sembrado';

export function sembrarEjemplos(): void {
  // Solo se siembra la primera vez: si borras todas las recetas, no vuelven solas
  const yaSembrado = localStorage.getItem(FLAG_SEMBRADO) !== null;
  localStorage.setItem(FLAG_SEMBRADO, '1');
  if (yaSembrado || contar() > 0) return;
  const ejemplos: NuevaReceta[] = [
    {
      nombre: 'Hotcakes de Domingo', emoji: '🥞', caos: 1, minutos: 20, porciones: 3, foto: null,
      descripcion: 'Esponjosos, dorados y perfectos para empezar el día con una sonrisa.',
      pasos: 'Mezcla la harina con el huevo y la leche hasta que no haya grumos.\nDeja reposar la mezcla 5 minutos.\nCalienta una sartén con un poco de mantequilla.\nVierte una porción y voltea cuando salgan burbujas.\nSirve con miel y fruta.',
      ingredientes: [
        { nombre: 'harina', cantidad: '1 taza' }, { nombre: 'huevo', cantidad: '1 pieza' },
        { nombre: 'leche', cantidad: '3/4 taza' }, { nombre: 'mantequilla', cantidad: '1 cucharada' },
        { nombre: 'miel', cantidad: 'al gusto' },
      ],
    },
    {
      nombre: 'Ensalada Arcoíris', emoji: '🥗', caos: 2, minutos: 15, porciones: 2, foto: null,
      descripcion: 'Frescura, color y un toque de limón. Cada bocado es distinto.',
      pasos: 'Corta todas las verduras en cubos pequeños.\nMezcla en un tazón grande.\nAliña con limón, sal y un chorrito de aceite.\nAgrega el aguacate al final para que no se oscurezca.',
      ingredientes: [
        { nombre: 'tomate', cantidad: '2 piezas' }, { nombre: 'pepino', cantidad: '1 pieza' },
        { nombre: 'zanahoria', cantidad: '1 pieza' }, { nombre: 'aguacate', cantidad: '1 pieza' },
        { nombre: 'limón', cantidad: '1 pieza' },
      ],
    },
    {
      nombre: 'Tacos Sorpresa de Piña', emoji: '🌮', caos: 4, minutos: 35, porciones: 4, foto: null,
      descripcion: 'Dulce, picoso y salado a la vez. Los amas o los discutes.',
      pasos: 'Dora el tocino hasta que quede crujiente.\nAsa la piña en rodajas y córtala en cubitos.\nCalienta las tortillas.\nArma los tacos con tocino, piña y jalapeño picado.\nTermina con queso y salsa picante.',
      ingredientes: [
        { nombre: 'tortillas', cantidad: '8 piezas' }, { nombre: 'piña', cantidad: '1/2 pieza' },
        { nombre: 'tocino', cantidad: '200 g' }, { nombre: 'chile jalapeño', cantidad: '2 piezas' },
        { nombre: 'queso', cantidad: '1 puñado' }, { nombre: 'salsa picante', cantidad: 'al gusto' },
      ],
    },
    {
      nombre: 'Postre Misterio de Plátano', emoji: '🍰', caos: 5, minutos: 45, porciones: 6, foto: null,
      descripcion: 'Plátano, chocolate y galletas en una mezcla que desafía toda lógica.',
      pasos: 'Machaca los plátanos con un tenedor.\nDerrite el chocolate a baño maría.\nTritura las galletas y forra un molde.\nAgrega el plátano y baña con el chocolate.\nRefrigera 3 horas y sorpréndete.',
      ingredientes: [
        { nombre: 'plátano', cantidad: '3 piezas' }, { nombre: 'chocolate', cantidad: '150 g' },
        { nombre: 'galletas', cantidad: '1 paquete' }, { nombre: 'queso crema', cantidad: '1/2 taza' },
        { nombre: 'canela', cantidad: 'al gusto' },
      ],
    },
  ];
  ejemplos.forEach(crear);
}
