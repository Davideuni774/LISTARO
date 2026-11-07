/* ============================================================
   Listaro — interfaz
   Navegación, modales, avisos y pintado de cada pantalla.
   ============================================================ */

const Listaro = (() => {

  /* ---------------------------------------------------- avisos */
  let temporizador = null;

  function avisar(mensaje, tipo = "ok") {
    const caja = document.getElementById("aviso");
    if (!caja) return;
    caja.textContent = mensaje;
    caja.className = "aviso visible " + tipo;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { caja.className = "aviso"; }, 3200);
  }

  function escapar(texto) {
    const d = document.createElement("div");
    d.textContent = texto == null ? "" : texto;
    return d.innerHTML;
  }

  function parametro(nombre) {
    return Number(new URLSearchParams(window.location.search).get(nombre)) || 0;
  }

  function enPaginas() {
    return window.location.pathname.split("/").includes("Paginas");
  }

  function rutaPagina(nombre) {
    return enPaginas() ? nombre : `Paginas/${nombre}`;
  }

  function rutaInicio() {
    return enPaginas() ? "../index.html" : "index.html";
  }

  function etiquetaRol(rol) {
    return {
      administrador: "Administrador",
      almacenista: "Almacenista",
      repartidor: "Repartidor",
    }[rol] || "Usuario";
  }

  function rutaInicioSesion() {
    return rutaPagina("inicio.html");
  }

  /* ---------------------------------------------------- navegación */
  async function pintarNav() {
    const zona = document.querySelector(".nav-acciones");
    if (!zona) return;
    const u = await Datos.cargarSesion();
    zona.innerHTML = u
      ? `<a class="btn btn-fantasma" href="${rutaInicioSesion()}">Inicio</a>
         <span class="usuario-nav">${escapar(u.nombre)} · ${etiquetaRol(u.rol)}</span>
         <a class="btn btn-fantasma" href="${rutaPagina("panel.html")}">Inventario</a>
         ${u.rol === "administrador"
           ? `<a class="btn btn-fantasma" href="${rutaPagina("usuarios.html")}">Usuarios</a>`
           : ""}
         <a class="btn btn-fantasma" href="${rutaPagina("entregas.html")}">Entregas</a>
         <button class="btn btn-naranja" id="btn-salir">Cerrar sesión</button>`
      : `<a class="btn btn-fantasma" href="${rutaPagina("login.html")}">Entrar</a>
         <a class="btn btn-naranja" href="${rutaPagina("registro.html")}">Crear cuenta</a>`;

    const salir = document.getElementById("btn-salir");
    if (salir) {
      salir.addEventListener("click", async () => {
        await Datos.salir();
        window.location.href = rutaInicio();
      });
    }
  }

  /* ---------------------------------------------------- modales */
  function activarModales() {
    document.addEventListener("click", (ev) => {
      const abre = ev.target.closest("[data-abrir]");
      if (abre) {
        const modal = document.getElementById(abre.dataset.abrir);
        if (modal) {
          modal.hidden = false;
          const primero = modal.querySelector("input, select");
          if (primero) primero.focus();
        }
        return;
      }
      if (ev.target.closest("[data-cerrar]")) {
        ev.target.closest(".modal").hidden = true;
        return;
      }
      if (ev.target.classList.contains("modal")) ev.target.hidden = true;
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        document.querySelectorAll(".modal:not([hidden])").forEach((m) => { m.hidden = true; });
      }
    });
  }

  function mostrarError(selector, mensaje) {
    const caja = document.querySelector(selector);
    if (!caja) return avisar(mensaje, "error");
    caja.textContent = mensaje;
    caja.hidden = false;
  }

  /* ---------------------------------------------------- login y registro */
  function iniciarLogin() {
    const form = document.getElementById("form-login");
    if (!form) return;
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      try {
        await Datos.entrar(d.correo, d.clave);
        window.location.href = rutaInicioSesion();
      } catch (e) {
        mostrarError("#error-login", e.message);
      }
    });
  }

  function iniciarRegistro() {
    const form = document.getElementById("form-registro");
    if (!form) return;
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      try {
        await Datos.registrar(d);
        window.location.href = rutaInicioSesion();
      } catch (e) {
        mostrarError("#error-registro", e.message);
      }
    });
  }

  async function iniciarInicio() {
    const zona = document.getElementById("inicio-contenido");
    if (!zona) return;
    const u = await Datos.exigirSesion();
    if (!u) return;
    const rol = etiquetaRol(u.rol);
    const contenido = {
      administrador: `
        <p class="hero-kicker">Panel de administración</p>
        <h1>Hola, <span class="naranja">${escapar(u.nombre)}.</span></h1>
        <p class="hero-texto">Administra usuarios, edificios, inventario y entregas desde un solo lugar.</p>
        <div class="hero-acciones">
          <a class="btn btn-naranja btn-grande" href="${rutaPagina("panel.html")}">Gestionar inventario</a>
          <a class="btn btn-fantasma btn-grande" href="${rutaPagina("usuarios.html")}">Gestionar usuarios</a>
          <a class="btn btn-fantasma btn-grande" href="${rutaPagina("entregas.html")}">Ver entregas</a>
        </div>`,
      almacenista: `
        <p class="hero-kicker">Panel de almacén</p>
        <h1>Hola, <span class="naranja">${escapar(u.nombre)}.</span></h1>
        <p class="hero-texto">Administra existencias, registra movimientos y prepara las entregas del hotel.</p>
        <div class="hero-acciones">
          <a class="btn btn-naranja btn-grande" href="${rutaPagina("panel.html")}">Ver inventario</a>
          <a class="btn btn-fantasma btn-grande" href="${rutaPagina("entregas.html")}">Gestionar entregas</a>
        </div>`,
      repartidor: `
        <p class="hero-kicker">Panel de reparto</p>
        <h1>Hola, <span class="naranja">${escapar(u.nombre)}.</span></h1>
        <p class="hero-texto">Consulta tus entregas y realiza el surtido de las habitaciones asignadas.</p>
        <div class="hero-acciones">
          <a class="btn btn-naranja btn-grande" href="${rutaPagina("entregas.html")}">Ver mis entregas</a>
          <a class="btn btn-fantasma btn-grande" href="${rutaPagina("panel.html")}">Consultar habitaciones</a>
        </div>`,
    }[u.rol];
    zona.innerHTML = `<span class="pill pill-ok">${rol}</span>${contenido}`;
  }

  /* ---------------------------------------------------- panel */
  async function iniciarPanel() {
    const zona = document.getElementById("lista-edificios");
    if (!zona) return;
    const u = await Datos.exigirSesion();
    if (!u) return;
    document.getElementById("saludo").textContent =
      `Hola, ${u.nombre}. Este es el estado de tu inventario.`;

    async function pintar() {
      const r = await Datos.resumen(u.id);
      document.getElementById("r-edificios").textContent = r.edificios;
      document.getElementById("r-habitaciones").textContent = r.habitaciones;
      document.getElementById("r-unidades").textContent = r.unidades;
      const alertas = document.getElementById("r-alertas");
      alertas.textContent = r.alertas;
      alertas.className = r.alertas ? "naranja" : "";

      const lista = await Datos.edificiosDe(u.id);
      if (!lista.length) {
        zona.className = "";
        zona.innerHTML = `
          <div class="vacio">
            <h3>Aún no tienes edificios</h3>
            <p>Crea el primero y empieza a registrar sus habitaciones.</p>
            <button class="btn btn-naranja" data-abrir="modal-edificio">Crear mi primer edificio</button>
          </div>`;
        return;
      }

      zona.className = "grilla-edificios";
      zona.innerHTML = lista.map((e) => `
        <a class="tarjeta tarjeta-enlace" href="${rutaPagina(`edificio.html?id=${e.id}`)}">
          <div class="tarjeta-tope">
            <h3>${escapar(e.nombre)}</h3>
            ${e.alertas
              ? `<span class="pill pill-alerta">${e.alertas} por reponer</span>`
              : `<span class="pill pill-ok">Al día</span>`}
          </div>
          <p class="sub">${escapar(e.direccion) || "Sin dirección registrada"}</p>
          <div class="mini-stats">
            <span>${e.habitaciones} habitaciones</span>
            <span>${e.unidades} unidades</span>
          </div>
        </a>`).join("");
    }

    await pintar();

    const formularioEdificio = document.getElementById("form-edificio");
    const botonEdificio = document.querySelector('[data-abrir="modal-edificio"]');
    if (u.rol !== "administrador") {
      if (botonEdificio) botonEdificio.hidden = true;
      if (formularioEdificio) formularioEdificio.closest(".modal").remove();
    }
    if (!formularioEdificio || u.rol !== "administrador") return;
    formularioEdificio.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        await Datos.crearEdificio(u.id, d);
        ev.target.reset();
        document.getElementById("modal-edificio").hidden = true;
        avisar("Edificio guardado.", "ok");
        await pintar();
      } catch (e) {
        avisar(e.message, "error");
      }
    });
  }

  /* ---------------------------------------------------- edificio */
  async function iniciarEdificio() {
    const zona = document.getElementById("lista-habitaciones");
    if (!zona) return;
    const u = await Datos.exigirSesion();
    if (!u) return;
    const ed = await Datos.edificio(parametro("id"), u.id);
    if (!ed) {
      window.location.href = rutaPagina("panel.html");
      return;
    }

    document.title = `${ed.nombre} — Listaro`;
    document.getElementById("ed-titulo").textContent = ed.nombre;
    document.getElementById("ed-miga").textContent = ed.nombre;
    document.getElementById("ed-direccion").textContent =
      ed.direccion || "Sin dirección registrada";

    async function pintar() {
      const lista = await Datos.habitacionesDe(ed.id);
      if (!lista.length) {
        zona.className = "";
        zona.innerHTML = `
          <div class="vacio">
            <h3>Este edificio no tiene habitaciones</h3>
            <p>Agrega cuartos, depósitos u oficinas para empezar a inventariar.</p>
            <button class="btn btn-naranja" data-abrir="modal-habitacion">Agregar habitación</button>
          </div>`;
        return;
      }
      zona.className = "grilla-habitaciones";
      zona.innerHTML = lista.map((h) => `
        <a class="tarjeta tarjeta-enlace" href="${rutaPagina(`habitacion.html?id=${h.id}`)}">
          <div class="tarjeta-tope">
            <h3>${escapar(h.nombre)}</h3>
            ${h.alertas
              ? `<span class="pill pill-alerta">${h.alertas} por reponer</span>`
              : `<span class="pill pill-ok">Al día</span>`}
          </div>
          <p class="sub">${h.piso ? "Piso " + escapar(h.piso) + " · " : ""}${escapar(h.estado)}</p>
          <div class="mini-stats">
            <span>${h.items} artículos</span>
            <span>${h.unidades} unidades</span>
          </div>
        </a>`).join("");
    }

    await pintar();

    const formularioHabitacion = document.getElementById("form-habitacion");
    const botonHabitacion = document.querySelector('[data-abrir="modal-habitacion"]');
    if (u.rol !== "administrador") {
      if (botonHabitacion) botonHabitacion.hidden = true;
      if (formularioHabitacion) formularioHabitacion.closest(".modal").remove();
    }
    if (!formularioHabitacion || u.rol !== "administrador") return;
    formularioHabitacion.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        await Datos.crearHabitacion(ed.id, d);
        ev.target.reset();
        document.getElementById("modal-habitacion").hidden = true;
        avisar("Habitación guardada.", "ok");
        await pintar();
      } catch (e) {
        avisar(e.message, "error");
      }
    });
  }

  /* ---------------------------------------------------- habitación */
  async function iniciarHabitacion() {
    const cuerpo = document.getElementById("cuerpo-items");
    if (!cuerpo) return;
    const u = await Datos.exigirSesion();
    if (!u) return;

    const hab = await Datos.habitacion(parametro("id"), u.id);
    if (!hab) {
      window.location.href = rutaPagina("panel.html");
      return;
    }

    document.title = `${hab.nombre} — Listaro`;
    document.getElementById("h-titulo").textContent = hab.nombre;
    document.getElementById("h-miga").textContent = hab.nombre;
    const migaEd = document.getElementById("h-miga-edificio");
    migaEd.textContent = hab.edificioNombre;
    migaEd.href = rutaPagina(`edificio.html?id=${hab.edificioId}`);

    async function pintar() {
      const items = await Datos.itemsDe(hab.id);

      document.getElementById("h-sub").textContent =
        `${hab.piso ? "Piso " + hab.piso + " · " : ""}${hab.estado} · ${items.length} artículos`;

      const envoltura = document.getElementById("zona-tabla");
      const vacio = document.getElementById("zona-vacia");
      envoltura.hidden = items.length === 0;
      vacio.hidden = items.length > 0;

      cuerpo.innerHTML = items.map((i) => `
        <tr data-item="${i.id}">
          <td class="fuerte">${escapar(i.nombre)}</td>
          <td class="sub">${escapar(i.categoria)}</td>
          <td class="cantidad">${i.cantidad}</td>
          <td class="sub">${i.minimo}</td>
          <td>
            <span class="pill ${i.cantidad < i.minimo ? "pill-alerta" : "pill-ok"}">
              ${i.cantidad < i.minimo ? "Bajo mínimo" : "Suficiente"}
            </span>
          </td>
          <td class="acciones-celda">
            <input class="mov-cantidad" type="number" min="1" value="1" aria-label="Cantidad a mover">
            <button class="btn btn-mini" data-mov="entrada" data-id="${i.id}">Surtir</button>
            ${u.rol !== "repartidor"
              ? `<button class="btn btn-mini" data-mov="salida" data-id="${i.id}">Salida</button>`
              : ""}
          </td>
          <td>${u.rol !== "repartidor"
            ? `<button class="btn btn-mini btn-peligro" data-borrar="${i.id}">Eliminar</button>`
            : ""}</td>
        </tr>`).join("");

      const movs = await Datos.movimientosDe(hab.id);
      const historial = document.getElementById("historial");
      historial.hidden = movs.length === 0;
      document.getElementById("lista-movimientos").innerHTML = movs.map((m) => `
        <li>
          <span class="pill ${m.tipo === "entrada" ? "pill-ok" : "pill-alerta"}">
            ${m.tipo === "entrada" ? "Entrada" : "Salida"}
          </span>
          <span class="fuerte">${escapar(m.itemNombre)}</span>
          <span>${m.cantidad} unidades</span>
          <span class="sub">${escapar(m.fecha)}</span>
          ${m.nota ? `<span class="sub">— ${escapar(m.nota)}</span>` : ""}
        </li>`).join("");
    }

    await pintar();

    const formularioItem = document.getElementById("form-item");
    const botonItem = document.querySelector('[data-abrir="modal-item"]');
    if (u.rol === "repartidor") {
      if (botonItem) botonItem.hidden = true;
      if (formularioItem) formularioItem.closest(".modal").remove();
    }
    if (formularioItem) formularioItem.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        await Datos.crearItem(hab.id, d);
        ev.target.reset();
        document.getElementById("modal-item").hidden = true;
        avisar("Artículo guardado.", "ok");
        await pintar();
      } catch (e) {
        avisar(e.message, "error");
      }
    });

    cuerpo.addEventListener("click", async (ev) => {
      const mov = ev.target.closest("[data-mov]");
      if (mov) {
        const fila = mov.closest("tr");
        const campo = fila.querySelector(".mov-cantidad");
        const cantidad = parseInt(campo.value, 10);
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          avisar("Escribe una cantidad mayor que cero.", "error");
          campo.focus();
          return;
        }
        try {
          await Datos.registrarMovimiento(Number(mov.dataset.id), mov.dataset.mov, cantidad);
          avisar(mov.dataset.mov === "entrada"
            ? `Entrada registrada: +${cantidad}.`
            : `Salida registrada: −${cantidad}.`, "ok");
          await pintar();
        } catch (e) {
          avisar(e.message, "error");
        }
        return;
      }

      const borrar = ev.target.closest("[data-borrar]");
      if (borrar) {
        const nombre = borrar.closest("tr").querySelector(".fuerte").textContent;
        if (!confirm(`¿Eliminar "${nombre}" y su historial de movimientos?`)) return;
        await Datos.borrarItem(Number(borrar.dataset.borrar));
        avisar("Artículo eliminado.", "ok");
        await pintar();
      }
    });
  }

  /* ---------------------------------------------------- arranque */
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await Datos.cargarSesion();
      await pintarNav();
      activarModales();
      iniciarLogin();
      iniciarRegistro();
      await iniciarPanel();
      await iniciarEdificio();
      await iniciarHabitacion();
      await iniciarInicio();
    } catch (error) {
      mostrarError("#error-login", error.message);
      mostrarError("#error-registro", error.message);
      avisar(error.message, "error");
    }
  });

  return { avisar };
})();
