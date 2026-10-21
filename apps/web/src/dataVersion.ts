// Se importa antes que cualquier store: si el modelo de datos cambió, descarta lo guardado
// en localStorage para que los stores arranquen con la semilla nueva.
const DATA_VERSION = '8'
const KEY = 'tiendita-data-version'

try {
  if (localStorage.getItem(KEY) !== DATA_VERSION) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('tiendita-'))
      .forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(KEY, DATA_VERSION)
  }
} catch {
  /* almacenamiento no disponible: los stores usan la semilla en memoria */
}
