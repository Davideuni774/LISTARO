const RolesUI = (() => {
  function ruta(nombre) {
    return window.location.pathname.split("/").includes("Paginas")
      ? nombre
      : `Paginas/${nombre}`;
  }

  function escapar(texto) {
    const nodo = document.createElement("div");
    nodo.textContent = texto == null ? "" : texto;
    return nodo.innerHTML;
  }

  async function iniciarUsuarios() {
    const tabla = document.getElementById("lista-usuarios");
    if (!tabla) return;
    const usuario = await Datos.exigirSesion();
    if (!usuario || usuario.rol !== "administrador") {
      window.location.href = ruta("panel.html");
      return;
    }

    async function pintar() {
      const lista = await Datos.usuarios();
      tabla.innerHTML = lista.map((item) => `
        <tr>
          <td>${escapar(item.nombre)}</td>
          <td>${escapar(item.correo)}</td>
          <td>
            <select class="selector-rol" data-id="${item.id}" ${item.id === usuario.id ? "disabled" : ""}>
              ${["administrador", "almacenista", "repartidor"].map((rol) =>
                `<option value="${rol}" ${rol === item.rol ? "selected" : ""}>${rol}</option>`).join("")}
            </select>
          </td>
          <td class="sub">${escapar(item.creado_en)}</td>
        </tr>`).join("");
    }

    await pintar();
    tabla.addEventListener("change", async (evento) => {
      const selector = evento.target.closest(".selector-rol");
      if (!selector) return;
      try {
        await Datos.cambiarRol(Number(selector.dataset.id), selector.value);
      } catch (error) {
        alert(error.message);
        await pintar();
      }
    });

    document.getElementById("form-usuario").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const datos = Object.fromEntries(new FormData(evento.target).entries());
      try {
        await Datos.crearUsuario(datos);
        evento.target.reset();
        await pintar();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  async function iniciarEntregas() {
    const lista = document.getElementById("lista-entregas");
    if (!lista) return;
    const usuario = await Datos.exigirSesion();
    if (!usuario) return;
    if (["repartidor", "administrador", "almacenista"].includes(usuario.rol)) {
      const formulario = document.getElementById("form-entrega");
      const selectRepartidor = document.getElementById("ent-repartidor");
      const selectEdificio = document.getElementById("ent-edificio");
      const puedeCrear = usuario && usuario.rol !== "repartidor";

      if (!puedeCrear) {
        document.getElementById("crear-entrega").hidden = true;
      } else {
        const [edificios, repartidores] = await Promise.all([
          Datos.edificiosDe(),
          Datos.repartidores(),
        ]);
        selectEdificio.innerHTML = edificios.map((edificio) =>
          `<option value="${edificio.id}">${escapar(edificio.nombre)}</option>`).join("");
        selectRepartidor.innerHTML = `<option value="">Sin asignar</option>` +
          repartidores.map((repartidor) =>
            `<option value="${repartidor.id}">${escapar(repartidor.nombre)}</option>`).join("");
      }

      async function pintar() {
        const entregas = await Datos.entregas();
        lista.innerHTML = entregas.map((entrega) => `
          <article class="tarjeta entrega">
            <div class="tarjeta-tope">
              <h3>Entrega #${entrega.id} · ${escapar(entrega.destinatario)}</h3>
              <span class="pill">${escapar(entrega.estado.replace("_", " "))}</span>
            </div>
            <p class="sub">${escapar(entrega.edificio_nombre)} · ${escapar(entrega.direccion)}</p>
            <p>${escapar(entrega.detalle) || "Sin detalle"}</p>
            <p class="sub">Repartidor: ${escapar(entrega.repartidor_nombre || "Sin asignar")}</p>
            <div class="entrega-acciones">
              ${usuario.rol === "repartidor" || usuario.rol === "administrador" || usuario.rol === "almacenista"
                ? `<select class="estado-entrega" data-id="${entrega.id}">
                    ${["pendiente", "en_ruta", "entregada", "cancelada"].map((estado) =>
                      `<option value="${estado}" ${estado === entrega.estado ? "selected" : ""}>${estado.replace("_", " ")}</option>`).join("")}
                   </select>`
                : ""}
            </div>
          </article>`).join("") || '<div class="vacio"><h3>No hay entregas</h3><p>Aún no se han registrado entregas.</p></div>';
      }

      await pintar();
      lista.addEventListener("change", async (evento) => {
        const selector = evento.target.closest(".estado-entrega");
        if (!selector) return;
        try {
          await Datos.actualizarEntrega(Number(selector.dataset.id), selector.value);
          await pintar();
        } catch (error) {
          alert(error.message);
        }
      });

      if (formulario && puedeCrear) {
        formulario.addEventListener("submit", async (evento) => {
          evento.preventDefault();
          try {
            await Datos.crearEntrega(Object.fromEntries(new FormData(formulario).entries()));
            formulario.reset();
            await pintar();
          } catch (error) {
            alert(error.message);
          }
        });
      }
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await iniciarUsuarios();
      await iniciarEntregas();
    } catch (error) {
      const aviso = document.getElementById("aviso");
      if (aviso) {
        aviso.textContent = error.message;
        aviso.className = "aviso visible error";
      }
    }
  });
})();
