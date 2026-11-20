// Cloudflare debe conservar el despliegue activo si faltan credenciales.
// Nunca se imprimen valores ni se modifica la configuración del proyecto.
if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === 'main') {
  const obligatorias = ['USUARIO_DEMO', 'CONTRASENA_DEMO', 'CONTRASENA_INVITADO', 'SECRETO_SESION'];
  const ausentes = obligatorias.filter(nombre => !process.env[nombre]);
  if (ausentes.length) {
    console.error('PUBLICACION DETENIDA: faltan valores de acceso en producción: ' + ausentes.join(', ') + '. Se conserva el despliegue anterior.');
    process.exit(1);
  }
  console.log('Variables de acceso presentes. Sus valores permanecen ocultos.');
}
