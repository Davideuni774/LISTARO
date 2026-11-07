<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

function body()
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function reply($data = null, $status = 200)
{
    http_response_code($status);
    echo json_encode(['ok' => $status < 400, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function fail($message, $status = 400)
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function requiredText($data, $key, $message)
{
    $value = trim((string)($data[$key] ?? ''));
    if ($value === '') {
        fail($message);
    }
    return $value;
}

function userId()
{
    if (empty($_SESSION['user_id'])) {
        fail('Tu sesión ha expirado. Inicia sesión nuevamente.', 401);
    }
    return (int)$_SESSION['user_id'];
}

function user()
{
    $id = userId();
    $stmt = db()->prepare('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) {
        session_destroy();
        fail('La cuenta ya no existe.', 401);
    }
    return $user;
}

function currentRole()
{
    $account = user();
    return $account['rol'];
}

function requireRole($roles)
{
    if (!in_array(currentRole(), $roles, true)) {
        fail('No tienes permisos para realizar esta acción.', 403);
    }
}

function ownedBuilding($id, $uid)
{
    $role = currentRole();
    $stmt = db()->prepare(
        'SELECT * FROM edificios
         WHERE id = ? AND (? IN ("administrador", "almacenista", "repartidor") OR usuario_id = ?)'
    );
    $stmt->execute([(int)$id, $role, $uid]);
    $building = $stmt->fetch();
    if (!$building) {
        fail('Edificio no encontrado.', 404);
    }
    return $building;
}

function ownedRoom($id, $uid)
{
    $role = currentRole();
    $stmt = db()->prepare(
        'SELECT h.*, e.nombre AS edificio_nombre
         FROM habitaciones h
         INNER JOIN edificios e ON e.id = h.edificio_id
         WHERE h.id = ? AND (? IN ("administrador", "almacenista", "repartidor") OR e.usuario_id = ?)'
    );
    $stmt->execute([(int)$id, $role, $uid]);
    $room = $stmt->fetch();
    if (!$room) {
        fail('Habitación no encontrada.', 404);
    }
    return $room;
}

function ownedItem($id, $uid)
{
    $role = currentRole();
    $stmt = db()->prepare(
        'SELECT i.*
         FROM items i
         INNER JOIN habitaciones h ON h.id = i.habitacion_id
         INNER JOIN edificios e ON e.id = h.edificio_id
         WHERE i.id = ? AND (? IN ("administrador", "almacenista", "repartidor") OR e.usuario_id = ?)'
    );
    $stmt->execute([(int)$id, $role, $uid]);
    $item = $stmt->fetch();
    if (!$item) {
        fail('Artículo no encontrado.', 404);
    }
    return $item;
}

function nowText()
{
    return date('Y-m-d H:i:s');
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$data = body();

if ($action === 'session' && $method === 'GET') {
    if (empty($_SESSION['user_id'])) {
        reply(null);
    }
    reply(user());
}

if ($action === 'login' && $method === 'POST') {
    $correo = strtolower(trim((string)($data['correo'] ?? '')));
    $clave = (string)($data['clave'] ?? '');
    $stmt = db()->prepare('SELECT id, nombre, correo, clave, rol FROM usuarios WHERE correo = ?');
    $stmt->execute([$correo]);
    $account = $stmt->fetch();
    if (!$account || !password_verify($clave, $account['clave'])) {
        fail('Correo o contraseña incorrectos.', 422);
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$account['id'];
    unset($account['clave']);
    reply($account);
}

if ($action === 'register' && $method === 'POST') {
    $nombre = requiredText($data, 'nombre', 'Completa todos los campos.');
    $correo = strtolower(trim((string)($data['correo'] ?? '')));
    $clave = (string)($data['clave'] ?? '');
    $confirmar = (string)($data['confirmar'] ?? '');
    $rol = $data['rol'] ?? 'almacenista';
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        fail('Escribe un correo válido.');
    }
    if (strlen($clave) < 8) {
        fail('La contraseña necesita al menos 8 caracteres.');
    }
    if ($clave !== $confirmar) {
        fail('Las contraseñas no coinciden.');
    }
    if (!in_array($rol, ['almacenista', 'repartidor'], true)) {
        fail('El tipo de usuario seleccionado no es válido.');
    }
    $stmt = db()->prepare('SELECT id FROM usuarios WHERE correo = ?');
    $stmt->execute([$correo]);
    if ($stmt->fetch()) {
        fail('Ese correo ya tiene una cuenta. Inicia sesión.');
    }
    $stmt = db()->prepare('INSERT INTO usuarios (nombre, correo, clave, rol) VALUES (?, ?, ?, ?)');
    $stmt->execute([$nombre, $correo, password_hash($clave, PASSWORD_DEFAULT), $rol]);
    $id = (int)db()->lastInsertId();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $id;
    reply(['id' => $id, 'nombre' => $nombre, 'correo' => $correo, 'rol' => $rol], 201);
}

if ($action === 'logout' && $method === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    reply(null);
}

$uid = userId();

if ($action === 'buildings' && $method === 'GET') {
    requireRole(['administrador', 'almacenista', 'repartidor']);
    $role = currentRole();
    $stmt = db()->prepare(
        'SELECT e.*,
          COUNT(DISTINCT h.id) AS habitaciones,
          COALESCE(SUM(i.cantidad), 0) AS unidades,
          COALESCE(SUM(CASE WHEN i.cantidad < i.minimo THEN 1 ELSE 0 END), 0) AS alertas
         FROM edificios e
         LEFT JOIN habitaciones h ON h.edificio_id = e.id
         LEFT JOIN items i ON i.habitacion_id = h.id
         WHERE ? IN ("administrador", "almacenista", "repartidor") OR e.usuario_id = ?
         GROUP BY e.id
         ORDER BY e.nombre'
    );
    $stmt->execute([$role, $uid]);
    reply($stmt->fetchAll());
}

if ($action === 'building' && $method === 'GET') {
    $building = ownedBuilding($_GET['id'] ?? 0, $uid);
    reply($building);
}

if ($action === 'create-building' && $method === 'POST') {
    requireRole(['administrador']);
    $nombre = requiredText($data, 'nombre', 'El edificio necesita un nombre.');
    $stmt = db()->prepare('INSERT INTO edificios (usuario_id, nombre, direccion, notas) VALUES (?, ?, ?, ?)');
    $stmt->execute([$uid, $nombre, trim((string)($data['direccion'] ?? '')), trim((string)($data['notas'] ?? ''))]);
    reply(['id' => (int)db()->lastInsertId()], 201);
}

if ($action === 'rooms' && $method === 'GET') {
    $building = ownedBuilding($_GET['building_id'] ?? 0, $uid);
    $stmt = db()->prepare(
        'SELECT h.*,
          COUNT(i.id) AS items,
          COALESCE(SUM(i.cantidad), 0) AS unidades,
          COALESCE(SUM(CASE WHEN i.cantidad < i.minimo THEN 1 ELSE 0 END), 0) AS alertas
         FROM habitaciones h
         LEFT JOIN items i ON i.habitacion_id = h.id
         WHERE h.edificio_id = ?
         GROUP BY h.id
         ORDER BY h.nombre'
    );
    $stmt->execute([$building['id']]);
    reply($stmt->fetchAll());
}

if ($action === 'room' && $method === 'GET') {
    reply(ownedRoom($_GET['id'] ?? 0, $uid));
}

if ($action === 'create-room' && $method === 'POST') {
    requireRole(['administrador']);
    $building = ownedBuilding($data['edificio_id'] ?? 0, $uid);
    $nombre = requiredText($data, 'nombre', 'La habitación necesita un nombre.');
    $stmt = db()->prepare('INSERT INTO habitaciones (edificio_id, nombre, piso, estado) VALUES (?, ?, ?, ?)');
    $stmt->execute([$building['id'], $nombre, trim((string)($data['piso'] ?? '')), $data['estado'] ?? 'activa']);
    reply(['id' => (int)db()->lastInsertId()], 201);
}

if ($action === 'items' && $method === 'GET') {
    $room = ownedRoom($_GET['room_id'] ?? 0, $uid);
    $stmt = db()->prepare('SELECT * FROM items WHERE habitacion_id = ? ORDER BY categoria, nombre');
    $stmt->execute([$room['id']]);
    reply($stmt->fetchAll());
}

if ($action === 'movements' && $method === 'GET') {
    $room = ownedRoom($_GET['room_id'] ?? 0, $uid);
    $stmt = db()->prepare(
        'SELECT m.*, i.nombre AS item_nombre
         FROM movimientos m
         INNER JOIN items i ON i.id = m.item_id
         WHERE i.habitacion_id = ?
         ORDER BY m.id DESC LIMIT 12'
    );
    $stmt->execute([$room['id']]);
    reply($stmt->fetchAll());
}

if ($action === 'create-item' && $method === 'POST') {
    requireRole(['administrador', 'almacenista']);
    $room = ownedRoom($data['habitacion_id'] ?? 0, $uid);
    $nombre = requiredText($data, 'nombre', 'El artículo necesita un nombre.');
    $cantidad = filter_var($data['cantidad'] ?? 0, FILTER_VALIDATE_INT);
    $minimo = filter_var($data['minimo'] ?? 0, FILTER_VALIDATE_INT);
    if ($cantidad === false || $minimo === false || $cantidad < 0 || $minimo < 0) {
        fail('Cantidad y mínimo no pueden ser negativos.');
    }
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO items (habitacion_id, nombre, categoria, cantidad, minimo, estado) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$room['id'], $nombre, trim((string)($data['categoria'] ?? 'General')), $cantidad, $minimo, $data['estado'] ?? 'bueno']);
    $itemId = (int)$pdo->lastInsertId();
    if ($cantidad > 0) {
        $stmt = $pdo->prepare('INSERT INTO movimientos (item_id, usuario_id, tipo, cantidad, nota, fecha) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$itemId, $uid, 'entrada', $cantidad, 'Registro inicial', nowText()]);
    }
    $pdo->commit();
    reply(['id' => $itemId], 201);
}

if ($action === 'move-item' && $method === 'POST') {
    requireRole(['administrador', 'almacenista', 'repartidor']);
    $item = ownedItem($data['item_id'] ?? 0, $uid);
    $tipo = $data['tipo'] ?? '';
    $cantidad = filter_var($data['cantidad'] ?? 0, FILTER_VALIDATE_INT);
    if (currentRole() === 'repartidor' && $tipo !== 'entrada') {
        fail('El repartidor solo puede registrar surtidos como entradas.', 403);
    }
    if (!in_array($tipo, ['entrada', 'salida'], true) || $cantidad === false || $cantidad <= 0) {
        fail('Registra una cantidad válida y un movimiento correcto.');
    }
    $nueva = $tipo === 'entrada' ? (int)$item['cantidad'] + $cantidad : (int)$item['cantidad'] - $cantidad;
    if ($nueva < 0) {
        fail('Solo quedan ' . $item['cantidad'] . ' unidades de ' . $item['nombre'] . '.');
    }
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('UPDATE items SET cantidad = ? WHERE id = ?');
    $stmt->execute([$nueva, $item['id']]);
    $stmt = $pdo->prepare('INSERT INTO movimientos (item_id, usuario_id, tipo, cantidad, nota, fecha) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$item['id'], $uid, $tipo, $cantidad, trim((string)($data['nota'] ?? '')), nowText()]);
    $pdo->commit();
    reply(['cantidad' => $nueva, 'bajoMinimo' => $nueva < (int)$item['minimo']]);
}

if ($action === 'delete-item' && $method === 'POST') {
    requireRole(['administrador', 'almacenista']);
    $item = ownedItem($data['item_id'] ?? 0, $uid);
    $stmt = db()->prepare('DELETE FROM items WHERE id = ?');
    $stmt->execute([$item['id']]);
    reply(null);
}

if ($action === 'users' && $method === 'GET') {
    requireRole(['administrador']);
    $stmt = db()->query('SELECT id, nombre, correo, rol, creado_en FROM usuarios ORDER BY nombre');
    reply($stmt->fetchAll());
}

if ($action === 'create-user' && $method === 'POST') {
    requireRole(['administrador']);
    $nombre = requiredText($data, 'nombre', 'El usuario necesita un nombre.');
    $correo = strtolower(trim((string)($data['correo'] ?? '')));
    $clave = (string)($data['clave'] ?? '');
    $rol = $data['rol'] ?? '';
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        fail('Escribe un correo válido.');
    }
    if (strlen($clave) < 8) {
        fail('La contraseña necesita al menos 8 caracteres.');
    }
    if (!in_array($rol, ['administrador', 'almacenista', 'repartidor'], true)) {
        fail('Selecciona un rol válido.');
    }
    $stmt = db()->prepare('SELECT id FROM usuarios WHERE correo = ?');
    $stmt->execute([$correo]);
    if ($stmt->fetch()) {
        fail('Ese correo ya tiene una cuenta.');
    }
    $stmt = db()->prepare('INSERT INTO usuarios (nombre, correo, clave, rol) VALUES (?, ?, ?, ?)');
    $stmt->execute([$nombre, $correo, password_hash($clave, PASSWORD_DEFAULT), $rol]);
    reply(['id' => (int)db()->lastInsertId()], 201);
}

if ($action === 'update-user-role' && $method === 'POST') {
    requireRole(['administrador']);
    $id = (int)($data['id'] ?? 0);
    $rol = $data['rol'] ?? '';
    if (!in_array($rol, ['administrador', 'almacenista', 'repartidor'], true)) {
        fail('Selecciona un rol válido.');
    }
    if ($id === $uid && $rol !== 'administrador') {
        fail('No puedes quitarte el rol de administrador.');
    }
    $stmt = db()->prepare('UPDATE usuarios SET rol = ? WHERE id = ?');
    $stmt->execute([$rol, $id]);
    reply(null);
}

if ($action === 'repartidores' && $method === 'GET') {
    requireRole(['administrador', 'almacenista']);
    $stmt = db()->query("SELECT id, nombre FROM usuarios WHERE rol = 'repartidor' ORDER BY nombre");
    reply($stmt->fetchAll());
}

if ($action === 'deliveries' && $method === 'GET') {
    requireRole(['administrador', 'almacenista', 'repartidor']);
    $role = currentRole();
    $sql = 'SELECT d.*, e.nombre AS edificio_nombre, u.nombre AS repartidor_nombre
            FROM entregas d
            INNER JOIN edificios e ON e.id = d.edificio_id
            LEFT JOIN usuarios u ON u.id = d.repartidor_id
            WHERE (? <> "repartidor" OR d.repartidor_id = ?)
            ORDER BY d.id DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute([$role, $uid]);
    reply($stmt->fetchAll());
}

if ($action === 'create-delivery' && $method === 'POST') {
    requireRole(['administrador', 'almacenista']);
    $building = ownedBuilding($data['edificio_id'] ?? 0, $uid);
    $destinatario = requiredText($data, 'destinatario', 'La entrega necesita un destinatario.');
    $repartidorId = !empty($data['repartidor_id']) ? (int)$data['repartidor_id'] : null;
    if ($repartidorId !== null) {
        $stmt = db()->prepare("SELECT id FROM usuarios WHERE id = ? AND rol = 'repartidor'");
        $stmt->execute([$repartidorId]);
        if (!$stmt->fetch()) {
            fail('El repartidor seleccionado no existe.');
        }
    }
    $stmt = db()->prepare(
        'INSERT INTO entregas
         (edificio_id, repartidor_id, creado_por, destinatario, direccion, detalle, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $building['id'], $repartidorId, $uid, $destinatario,
        trim((string)($data['direccion'] ?? '')),
        trim((string)($data['detalle'] ?? '')),
        nowText(),
    ]);
    reply(['id' => (int)db()->lastInsertId()], 201);
}

if ($action === 'update-delivery' && $method === 'POST') {
    requireRole(['administrador', 'almacenista', 'repartidor']);
    $id = (int)($data['id'] ?? 0);
    $role = currentRole();
    $stmt = db()->prepare('SELECT * FROM entregas WHERE id = ?');
    $stmt->execute([$id]);
    $delivery = $stmt->fetch();
    if (!$delivery) {
        fail('Entrega no encontrada.', 404);
    }
    if ($role === 'repartidor' && (int)$delivery['repartidor_id'] !== $uid) {
        fail('Esta entrega no está asignada a tu cuenta.', 403);
    }
    $estado = $data['estado'] ?? '';
    if (!in_array($estado, ['pendiente', 'en_ruta', 'entregada', 'cancelada'], true)) {
        fail('Estado de entrega no válido.');
    }
    $fecha = $estado === 'entregada' ? nowText() : null;
    $stmt = db()->prepare('UPDATE entregas SET estado = ?, entregado_en = ? WHERE id = ?');
    $stmt->execute([$estado, $fecha, $id]);
    reply(null);
}

fail('Acción no encontrada.', 404);
