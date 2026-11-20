-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         12.2.2-MariaDB - MariaDB Server
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.14.0.7165
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para muni_db
CREATE DATABASE IF NOT EXISTS `muni_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `muni_db`;

-- Volcando estructura para tabla muni_db.curso_imagenes
CREATE TABLE IF NOT EXISTS `curso_imagenes` (
  `id_imagen` int(11) NOT NULL AUTO_INCREMENT,
  `id_curso` int(11) NOT NULL,
  `ruta_imagen` varchar(255) NOT NULL,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id_imagen`),
  KEY `id_curso` (`id_curso`),
  CONSTRAINT `1` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla muni_db.curso_imagenes: ~2 rows (aproximadamente)
INSERT INTO `curso_imagenes` (`id_imagen`, `id_curso`, `ruta_imagen`, `orden`) VALUES
	(1, 1, 'static/imagenes/1793799219_38c6d932_spider-man-ps4_7680x4320_xtrafondos.com.jpg', 0),
	(2, 2, 'static/imagenes/1794572648_3ee2e26d_grafico1_disposicion_compra.jpg', 0);

-- Volcando estructura para tabla muni_db.cursos
CREATE TABLE IF NOT EXISTS `cursos` (
  `id_curso` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_curso` varchar(150) NOT NULL,
  `descripcion_curso` text DEFAULT NULL,
  `duracion_curso` varchar(100) DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `coste_inscripcion` varchar(100) DEFAULT NULL,
  `ubicacion_curso` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_curso`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla muni_db.cursos: ~2 rows (aproximadamente)
INSERT INTO `cursos` (`id_curso`, `nombre_curso`, `descripcion_curso`, `duracion_curso`, `fecha_inicio`, `coste_inscripcion`, `ubicacion_curso`) VALUES
	(1, 'taller de fulbo', 'aaaaaaaaaaaaaaaaaaaaaaaaaknckanhcuaiescj', '2 meses', '2026-11-28', 'sinko peso', NULL),
	(2, 'curso python', 'vamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paitonvamo a hace un curso de paiton', '2 dia', '2026-11-12', '0,00', NULL);

-- Volcando estructura para tabla muni_db.eventos
CREATE TABLE IF NOT EXISTS `eventos` (
  `id_eventos` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_eventos` varchar(50) NOT NULL,
  `imagen_eventos` varchar(255) DEFAULT NULL,
  `descripcion_eventos` varchar(200) DEFAULT NULL,
  `fecha_eventos` date DEFAULT curdate(),
  `ubicacion_eventos` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_eventos`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla muni_db.eventos: ~7 rows (aproximadamente)
INSERT INTO `eventos` (`id_eventos`, `nombre_eventos`, `imagen_eventos`, `descripcion_eventos`, `fecha_eventos`, `ubicacion_eventos`) VALUES
	(9, 'pan de navidad', 'static/imagenes/1795067325_800c312d_imagen_recortada.jpg', 'se hara una ceremonia de presentacion del pan de navidad gigante por 26° edicion para nuestra comunidad', '2026-12-18', 'SUM'),
	(10, 'Arbol de navidad', 'static/imagenes/1795068615_0265542d_imagen_recortada.jpg', 'se hara la inauguracion del arbol de navidad que decorara la plaza de nuestro municipio', '2026-12-08', 'Plaza San Martin'),
	(11, 'inauguracion de la pileta', 'static/imagenes/1795067749_c1fe2732_imagen_recortada.jpg', 'se hara la inauguracion y se dara por habilitada la pileta municipal', '2026-12-21', 'Complejo Municial'),
	(12, 'Papa Noel', 'static/imagenes/1795067862_88083321_imagen_recortada.jpg', 'se hara un evento realizado para los mas chicos donde el querido papa noel repartira regalos y dara un show', '2026-12-23', 'Plaza San Martin'),
	(13, 'llegaron los reyes magos', 'static/imagenes/1795067938_e9fd7b97_imagen_recortada.jpg', 'se realizara un espectaculo con preencia de los reyes magos para los niños de la comunidad', '2027-01-05', 'Plaza San Martin'),
	(14, 'feria vecinal', 'static/imagenes/1795068114_3405eb75_imagen_recortada.jpg', 'se llevara a cabo una feria para impulsar los emprendimientos de la comunidad', '2027-01-23', 'Plaza Arturo D Andrea'),
	(15, 'dia del niño', 'static/imagenes/1795068214_7c24f0ab_imagen_recortada.jpg', 'se hara una feria de juegos y espectaculo para los nenes', '2027-08-15', 'plaza principal');

-- Volcando estructura para tabla muni_db.noticias
CREATE TABLE IF NOT EXISTS `noticias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha` date DEFAULT curdate(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla muni_db.noticias: ~4 rows (aproximadamente)
INSERT INTO `noticias` (`id`, `nombre`, `imagen`, `descripcion`, `fecha`) VALUES
	(11, 'siniestro vial sobre ruta 68', 'static/imagenes/1795069021_21e4c035_imagen_recortada.jpg', 'lamentamos informar que esta mañana se vivio un accidente vial sobre la ruta 68 a salidas del pueblo, se registraron 2 personas heridas, no se informan fallecidos', '2026-11-20'),
	(12, 'fin de clases', 'static/imagenes/1795069255_faf6b163_imagen_recortada.jpg', 'el ministerio de educacion informo que este viernes 20 de noviembre finaliza el ciclo lectivo del presente año, salvo para aquellos estudiantes que adeuden materias el periodo de recuperacion se extiende hasta el 6 de diciembre', '2026-11-11'),
	(13, 'calle cortada', 'static/imagenes/1795069418_125ecf68_imagen_recortada.jpg', 'se informa que la interseccion entre las calles sarmiento y juan carlos davalos se estara inhabilitado durante unas semanas por arreglos de la misma', '2026-11-17'),
	(14, 'Feriado Nacional', 'static/imagenes/1795069551_7d046f46_imagen_recortada.jpg', 'se informa desde secretaria nacional que el proximo 9 de noviembre no habra actividades escolares u laborales por motivos de la visita del maximo exponente de la religion catolica a nuestro pais', '2026-11-01');

-- Volcando estructura para tabla muni_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) NOT NULL,
  `password_hash` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla muni_db.users: ~1 rows (aproximadamente)
INSERT INTO `users` (`id`, `usuario`, `password_hash`) VALUES
	(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- Volcando estructura para tabla muni_db.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(50) NOT NULL,
  `contraseña_usuario` varchar(20) NOT NULL,
  PRIMARY KEY (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla muni_db.usuarios: ~0 rows (aproximadamente)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
