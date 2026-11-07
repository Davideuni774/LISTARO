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

  /* ---------------------------------------------------- navegación */
  function pintarNav() {
    const zona = document.querySelector(".nav-acciones");
    if (!zona) return;
    const u = Datos.usuarioActual();
    zona.innerHTML = u
      ? `<a class="btn btn-fantasma" href="${rutaPagina("panel.html")}">Mi panel</a>
         <button class="btn btn-naranja" id="btn-salir">Cerrar sesión</button>`
      : `<a class="btn btn-fantasma" href="${rutaPagina("login.html")}">Entrar</a>
         <a class="btn btn-naranja" href="${rutaPagina("registro.html")}">Crear cuenta</a>`;

    const salir = document.getElementById("btn-salir");
    if (salir) {
      salir.addEventListener("click", () => {
        Datos.salir();
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
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      try {
        Datos.entrar(d.correo, d.clave);
        window.location.href = rutaPagina("panel.html");
      } catch (e) {
        mostrarError("#error-login", e.message);
      }
    });
  }

  function iniciarRegistro() {
    const form = document.getElementById("form-registro");
    if (!form) return;
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      try {
        Datos.registrar(d);
        window.location.href = rutaPagina("panel.html");
      } catch (e) {
        mostrarError("#error-registro", e.message);
      }
    });
  }

  /* ---------------------------------------------------- panel */
  function iniciarPanel() {
    const zona = document.getElementById("lista-edificios");
    if (!zona) return;
    const u = Datos.exigirSesion();
    if (!u) return;

    document.getElementById("saludo").textContent =
      `Hola, ${u.nombre}. Este es el estado de tu inventario.`;

    function pintar() {
      const r = Datos.resumen(u.id);
      document.getElementById("r-edificios").textContent = r.edificios;
      document.getElementById("r-habitaciones").textContent = r.habitaciones;
      document.getElementById("r-unidades").textContent = r.unidades;
      const alertas = document.getElementById("r-alertas");
      alertas.textContent = r.alertas;
      alertas.className = r.alertas ? "naranja" : "";

      const lista = Datos.edificiosDe(u.id);
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

    pintar();

    document.getElementById("form-edificio").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        Datos.crearEdificio(u.id, d);
        ev.target.reset();
        document.getElementById("modal-edificio").hidden = true;
        avisar("Edificio guardado.", "ok");
        pintar();
      } catch (e) {
        avisar(e.message, "error");
      }
    });
  }

  /* ---------------------------------------------------- edificio */
  function iniciarEdificio() {
    const zona = document.getElementById("lista-habitaciones");
    if (!zona) return;
    const u = Datos.exigirSesion();
    if (!u) return;

    const ed = Datos.edificio(parametro("id"), u.id);
    if (!ed) {
      window.location.href = rutaPagina("panel.html");
      return;
    }

    document.title = `${ed.nombre} — Listaro`;
    document.getElementById("ed-titulo").textContent = ed.nombre;
    document.getElementById("ed-miga").textContent = ed.nombre;
    document.getElementById("ed-direccion").textContent =
      ed.direccion || "Sin dirección registrada";

    function pintar() {
      const lista = Datos.habitacionesDe(ed.id);
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

    pintar();

    document.getElementById("form-habitacion").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        Datos.crearHabitacion(ed.id, d);
        ev.target.reset();
        document.getElementById("modal-habitacion").hidden = true;
        avisar("Habitación guardada.", "ok");
        pintar();
      } catch (e) {
        avisar(e.message, "error");
      }
    });
  }

  /* ---------------------------------------------------- habitación */
  function iniciarHabitacion() {
    const cuerpo = document.getElementById("cuerpo-items");
    if (!cuerpo) return;
    const u = Datos.exigirSesion();
    if (!u) return;

    const hab = Datos.habitacion(parametro("id"), u.id);
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

    function pintar() {
      const items = Datos.itemsDe(hab.id);

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
            <button class="btn btn-mini" data-mov="entrada" data-id="${i.id}">Entrada</button>
            <button class="btn btn-mini" data-mov="salida" data-id="${i.id}">Salida</button>
          </td>
          <td><button class="btn btn-mini btn-peligro" data-borrar="${i.id}">Eliminar</button></td>
        </tr>`).join("");

      const movs = Datos.movimientosDe(hab.id);
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

    pintar();

    document.getElementById("form-item").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        Datos.crearItem(hab.id, d);
        ev.target.reset();
        document.getElementById("modal-item").hidden = true;
        avisar("Artículo guardado.", "ok");
        pintar();
      } catch (e) {
        avisar(e.message, "error");
      }
    });

    cuerpo.addEventListener("click", (ev) => {
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
          Datos.registrarMovimiento(Number(mov.dataset.id), mov.dataset.mov, cantidad);
          avisar(mov.dataset.mov === "entrada"
            ? `Entrada registrada: +${cantidad}.`
            : `Salida registrada: −${cantidad}.`, "ok");
          pintar();
        } catch (e) {
          avisar(e.message, "error");
        }
        return;
      }

      const borrar = ev.target.closest("[data-borrar]");
      if (borrar) {
        const nombre = borrar.closest("tr").querySelector(".fuerte").textContent;
        if (!confirm(`¿Eliminar "${nombre}" y su historial de movimientos?`)) return;
        Datos.borrarItem(Number(borrar.dataset.borrar));
        avisar("Artículo eliminado.", "ok");
        pintar();
      }
    });
  }

  /* ---------------------------------------------------- arranque */
  document.addEventListener("DOMContentLoaded", () => {
    pintarNav();
    activarModales();
    iniciarLogin();
    iniciarRegistro();
    iniciarPanel();
    iniciarEdificio();
    iniciarHabitacion();
  });

  return { avisar };
})();
