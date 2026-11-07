/* ============================================================
   Listaro - cliente de la API PHP
   La sesión y el inventario viven en MySQL, no en localStorage.
   ============================================================ */

const Datos = (() => {
  let sesion = null;
  let sesionCargada = false;

  function apiUrl(action, params = {}) {
    const base = window.location.pathname.split("/").includes("Paginas")
      ? "../api/index.php"
      : "api/index.php";
    const query = new URLSearchParams({ action, ...params });
    return `${base}?${query}`;
  }

  async function pedir(action, options = {}, params = {}) {
    const respuesta = await fetch(apiUrl(action, params), {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !resultado.ok) {
      throw new Error(resultado.error || "No se pudo completar la operación.");
    }
    return resultado.data;
  }

  async function cargarSesion() {
    if (!sesionCargada) {
      sesion = await pedir("session");
      sesionCargada = true;
    }
    return sesion;
  }

  function usuarioActual() {
    return sesion;
  }

  async function entrar(correo, clave) {
    sesion = await pedir("login", {
      method: "POST",
      body: JSON.stringify({ correo, clave }),
    });
    sesionCargada = true;
    return sesion;
  }

  async function registrar(datos) {
    sesion = await pedir("register", {
      method: "POST",
      body: JSON.stringify(datos),
    });
    sesionCargada = true;
    return sesion;
  }

  async function salir() {
    await pedir("logout", { method: "POST" });
    sesion = null;
    sesionCargada = true;
  }

  async function exigirSesion() {
    const usuario = await cargarSesion();
    if (!usuario) {
      const enPaginas = window.location.pathname.split("/").includes("Paginas");
      window.location.href = enPaginas ? "login.html" : "Paginas/login.html";
      return null;
    }
    return usuario;
  }

  async function edificiosDe() {
    return pedir("buildings");
  }

  async function edificio(id) {
    return pedir("building", {}, { id });
  }

  async function habitacionesDe(edificioId) {
    return pedir("rooms", {}, { building_id: edificioId });
  }

  async function habitacion(id) {
    const room = await pedir("room", {}, { id });
    return {
      ...room,
      edificioId: Number(room.edificio_id),
      edificioNombre: room.edificio_nombre,
    };
  }

  async function itemsDe(habitacionId) {
    return pedir("items", {}, { room_id: habitacionId });
  }

  async function movimientosDe(habitacionId) {
    const movimientos = await pedir("movements", {}, { room_id: habitacionId });
    return movimientos.map((movimiento) => ({
      ...movimiento,
      itemNombre: movimiento.item_nombre,
    }));
  }

  async function resumen() {
    const lista = await edificiosDe();
    return {
      edificios: lista.length,
      habitaciones: lista.reduce((suma, edificio) => suma + Number(edificio.habitaciones), 0),
      unidades: lista.reduce((suma, edificio) => suma + Number(edificio.unidades), 0),
      alertas: lista.reduce((suma, edificio) => suma + Number(edificio.alertas), 0),
    };
  }

  async function crearEdificio(_, datos) {
    return pedir("create-building", {
      method: "POST",
      body: JSON.stringify(datos),
    });
  }

  async function crearHabitacion(edificioId, datos) {
    return pedir("create-room", {
      method: "POST",
      body: JSON.stringify({ ...datos, edificio_id: edificioId }),
    });
  }

  async function crearItem(habitacionId, datos) {
    return pedir("create-item", {
      method: "POST",
      body: JSON.stringify({ ...datos, habitacion_id: habitacionId }),
    });
  }

  async function registrarMovimiento(itemId, tipo, cantidad, nota = "") {
    return pedir("move-item", {
      method: "POST",
      body: JSON.stringify({ item_id: itemId, tipo, cantidad, nota }),
    });
  }

  async function borrarItem(itemId) {
    return pedir("delete-item", {
      method: "POST",
      body: JSON.stringify({ item_id: itemId }),
    });
  }

  async function usuarios() {
    return pedir("users");
  }

  async function crearUsuario(datos) {
    return pedir("create-user", {
      method: "POST",
      body: JSON.stringify(datos),
    });
  }

  async function cambiarRol(id, rol) {
    return pedir("update-user-role", {
      method: "POST",
      body: JSON.stringify({ id, rol }),
    });
  }

  async function repartidores() {
    return pedir("repartidores");
  }

  async function entregas() {
    return pedir("deliveries");
  }

  async function crearEntrega(datos) {
    return pedir("create-delivery", {
      method: "POST",
      body: JSON.stringify(datos),
    });
  }

  async function actualizarEntrega(id, estado) {
    return pedir("update-delivery", {
      method: "POST",
      body: JSON.stringify({ id, estado }),
    });
  }

  return {
    cargarSesion, usuarioActual, entrar, registrar, salir, exigirSesion,
    edificiosDe, edificio, habitacionesDe, habitacion, itemsDe,
    movimientosDe, resumen, crearEdificio, crearHabitacion, crearItem,
    registrarMovimiento, borrarItem, usuarios, crearUsuario, cambiarRol,
    repartidores, entregas, crearEntrega, actualizarEntrega,
  };
})();
