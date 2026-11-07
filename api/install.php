<?php

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Usa POST para ejecutar el instalador una sola vez.');
}

$pdo = db();
$schema = file_get_contents(__DIR__ . '/schema.sql');
$statements = array_filter(array_map('trim', preg_split('/;\s*(?:\r\n|\n|\r)/', $schema)));

try {
    $pdo->beginTransaction();
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }

    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE correo = ?');
    $stmt->execute(['demo@listaro.co']);
    if (!$stmt->fetch()) {
        $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, correo, clave, rol) VALUES (?, ?, ?, ?)');
        $stmt->execute(['Cuenta demo', 'demo@listaro.co', password_hash('demo1234', PASSWORD_DEFAULT), 'administrador']);
        $userId = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare('INSERT INTO edificios (usuario_id, nombre, direccion, notas) VALUES (?, ?, ?, ?)');
        $stmt->execute([$userId, 'Hotel Central', 'Cra. 7 #45-12, Bogotá', '']);
        $buildingId = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare('INSERT INTO habitaciones (edificio_id, nombre, piso, estado) VALUES (?, ?, ?, ?)');
        $stmt->execute([$buildingId, 'Habitación 101', '1', 'activa']);
    }
    $pdo->commit();
    header('Content-Type: text/plain; charset=utf-8');
    echo "Instalación completada. Borra api/install.php del hosting.";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo 'La instalación falló: ' . $error->getMessage();
}
