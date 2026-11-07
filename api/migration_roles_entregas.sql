CREATE TABLE IF NOT EXISTS entregas (
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
