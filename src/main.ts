import './styles/styles.css';
import { initDB } from './db/database';
import { iniciar } from './controllers/recetarioController';

const root = document.getElementById('app')!;
root.innerHTML = '<p class="cargando">🍳 Calentando la cocina...</p>';

initDB()
  .then(() => iniciar(root))
  .catch((err) => {
    console.error(err);
    root.innerHTML = '<p class="cargando">No se pudo abrir la base de datos. Recarga la página.</p>';
  });
