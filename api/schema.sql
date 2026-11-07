CREATE TABLE usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(190) NOT NULL,
  clave VARCHAR(255) NOT NULL,
  rol ENUM('administrador', 'almacenista', 'repartidor') NOT NULL DEFAULT 'almacenista',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE edificios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  direccion VARCHAR(255) NOT NULL DEFAULT '',
  notas TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_edificios_usuario (usuario_id),
  CONSTRAINT fk_edificios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE habitaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  edificio_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  piso VARCHAR(40) NOT NULL DEFAULT '',
  estado VARCHAR(30) NOT NULL DEFAULT 'activa',
  PRIMARY KEY (id),
  KEY idx_habitaciones_edificio (edificio_id),
  CONSTRAINT fk_habitaciones_edificio FOREIGN KEY (edificio_id) REFERENCES edificios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  habitacion_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  categoria VARCHAR(120) NOT NULL DEFAULT 'General',
  cantidad INT UNSIGNED NOT NULL DEFAULT 0,
  minimo INT UNSIGNED NOT NULL DEFAULT 0,
  estado VARCHAR(30) NOT NULL DEFAULT 'bueno',
  PRIMARY KEY (id),
  KEY idx_items_habitacion (habitacion_id),
  CONSTRAINT fk_items_habitacion FOREIGN KEY (habitacion_id) REFERENCES habitaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimientos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('entrada', 'salida') NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  nota VARCHAR(255) NOT NULL DEFAULT '',
  fecha DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_movimientos_item (item_id),
  CONSTRAINT fk_movimientos_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE entregas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  edificio_id INT UNSIGNED NOT NULL,
  repartidor_id INT UNSIGNED NULL,
  creado_por INT UNSIGNED NOT NULL,
  destinatario VARCHAR(160) NOT NULL,
  direccion VARCHAR(255) NOT NULL DEFAULT '',
  detalle TEXT NOT NULL,
  estado ENUM('pendiente', 'en_ruta', 'entregada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME NOT NULL,
  entregado_en DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_entregas_edificio (edificio_id),
  KEY idx_entregas_repartidor (repartidor_id),
  CONSTRAINT fk_entregas_edificio FOREIGN KEY (edificio_id) REFERENCES edificios (id) ON DELETE CASCADE,
  CONSTRAINT fk_entregas_repartidor FOREIGN KEY (repartidor_id) REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT fk_entregas_creador FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
