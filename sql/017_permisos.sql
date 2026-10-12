-- Permisos editables por el Administrador (ABM de usuarios → «Tipos de usuario y permisos»).
-- Valor efectivo: permiso del usuario > permiso del tipo de usuario (rol) > valor por defecto del sistema.
-- Solo se guardan las excepciones; borrar la fila vuelve al valor heredado.
CREATE TABLE IF NOT EXISTS permiso_rol (
  rol VARCHAR(40) NOT NULL,
  permiso VARCHAR(40) NOT NULL,
  permitido BOOLEAN NOT NULL,
  PRIMARY KEY (rol, permiso)
);
CREATE TABLE IF NOT EXISTS permiso_usuario (
  username VARCHAR(80) NOT NULL REFERENCES usuario(username) ON DELETE CASCADE,
  permiso VARCHAR(40) NOT NULL,
  permitido BOOLEAN NOT NULL,
  PRIMARY KEY (username, permiso)
);

NOTIFY pgrst, 'reload schema';
