## LISTARO

LISTARO es una plataforma web que centraliza y facilita la gestión del inventario de un hotel, permitiendo controlar productos, movimientos y existencias de forma organizada, trazable y según los permisos de cada usuario.

## Alpha en InfinityFree

La aplicación usa una API PHP en `api/` y una base de datos MySQL. La carpeta
`js/` ya no guarda cuentas ni inventario en `localStorage`; la sesión se maneja
con cookies PHP y los datos se validan en el servidor.

### Instalación

1. En el panel de InfinityFree crea una base de datos MySQL y copia sus datos
   de conexión.
2. Copia `api/config.example.php` como `api/config.php` y completa:
   `db_host`, `db_name`, `db_user` y `db_pass`.
3. Sube todo el contenido de `LISTARO` al directorio público del sitio
   (`htdocs` o equivalente).
4. Abre `https://tu-dominio/api/install.php` usando una petición POST. Puedes
   hacerlo desde la consola del navegador:

   ```js
   fetch("api/install.php", { method: "POST" }).then((r) => r.text()).then(console.log)
   ```

5. Comprueba el acceso con `demo@listaro.co` y `demo1234`.
6. Borra `api/install.php` del hosting después de instalar la base de datos.

InfinityFree debe servir el proyecto por HTTPS para que las cookies de sesión
funcionen correctamente. No publiques `api/config.php`; el `.htaccess` de la
carpeta API bloquea su lectura desde el navegador, pero el archivo tampoco debe
subirse a repositorios públicos.

Para una instalación manual, importa `api/schema.sql` en MySQL y omite el paso
del instalador. `api/config.example.php` es solo una plantilla y no contiene
credenciales reales.

### Roles y entregas en una base ya creada

Si la base ya tenía las tablas y ya agregaste la columna `usuarios.rol`, importa
una sola vez `api/migration_roles_entregas.sql` para crear la tabla de entregas.
El administrador puede crear usuarios y cambiar roles desde `Paginas/usuarios.html`.
Las entregas se gestionan desde `Paginas/entregas.html`.

- `administrador`: usuarios, edificios, habitaciones, inventario y entregas.
- `almacenista`: edificios e inventario; puede registrar movimientos y entregas.
- `repartidor`: consulta los edificios y habitaciones, registra el surtido
  como entrada de inventario y actualiza sus entregas. No puede crear ni
  eliminar artículos, registrar salidas ni modificar la configuración.

El registro público permite crear cuentas de almacenista o repartidor. Por
seguridad, las cuentas de administrador solo se crean desde la gestión de
usuarios de otro administrador.

## Descripción del proyecto

LISTARO es un sistema web de gestión y control de inventario diseñado para establecimientos hoteleros. Su propósito es centralizar y organizar la información relacionada con los productos y elementos utilizados en las diferentes áreas de un hotel, facilitando el control de existencias y el seguimiento de los movimientos de inventario.

La plataforma permite registrar y administrar productos, consultar existencias, gestionar entradas y salidas, realizar búsquedas y filtros, consultar el historial de movimientos y generar alertas cuando un producto alcanza o se encuentra por debajo de su stock mínimo. Además, incorpora autenticación, control de usuarios y permisos según los diferentes roles del sistema.

LISTARO contempla tres perfiles principales: Administrador, Encargado de Inventario y Empleado de Área, cada uno con diferentes niveles de acceso y responsabilidades. De esta manera, el sistema permite mantener una trazabilidad de las operaciones, asociando cada movimiento con el usuario responsable, el producto, la fecha, la cantidad y el tipo de operación realizada.

El proyecto busca reemplazar procesos manuales, hojas de cálculo o información dispersa por una plataforma centralizada que facilite la consulta de información, el control de inventario y la toma de decisiones relacionadas con compras y reposición.
