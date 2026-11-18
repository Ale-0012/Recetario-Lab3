import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const STORAGE_KEY = 'recetario_caotico_db_v1';
let db: Database;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Abre la base de datos: la recupera de localStorage o crea una nueva. */
export async function initDB(): Promise<Database> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = localStorage.getItem(STORAGE_KEY);

  try {
    db = saved ? new SQL.Database(base64ToBytes(saved)) : new SQL.Database();
  } catch {
    db = new SQL.Database(); // guardado dañado: empezamos de cero
  }

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS recetas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      pasos       TEXT NOT NULL,
      caos        INTEGER NOT NULL CHECK (caos BETWEEN 1 AND 5),  -- nivel de caos (dificultad)
      minutos     INTEGER NOT NULL DEFAULT 30,
      porciones   INTEGER NOT NULL DEFAULT 2,
      emoji       TEXT NOT NULL DEFAULT '🍝',
      foto        TEXT,
      creado_en   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingredientes (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS receta_ingredientes (
      receta_id      INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
      ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id),
      cantidad       TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (receta_id, ingrediente_id)
    );
  `);
  return db;
}

export function getDB(): Database {
  return db;
}

/** Guarda la base de datos completa en localStorage (persistencia entre sesiones). */
export function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, bytesToBase64(db.export()));
  } catch {
    alert('No se pudo guardar: el almacenamiento del navegador está lleno. Prueba con una foto más pequeña.');
  }
}
