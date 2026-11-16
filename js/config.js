/* =====================================================================
   CONFIGURACIÓN GENERAL — Florería Rosas de Lima
   ---------------------------------------------------------------------
   Aquí vive todo lo que cambia poco: WhatsApp, dirección, avisos,
   promociones, etc. Los arreglos, el delivery y "Arme su ramo" están
   en la carpeta /data.

   Lo que aún no se tiene queda como '[PENDIENTE]' (o vacío en las listas).
   La página lo muestra como "por confirmar" y nunca inventa el dato.
   ===================================================================== */
window.CONFIG = {
  nombre: 'Florería Rosas de Lima',

  // WhatsApp para pedidos: formato internacional, sin espacios ni "+".
  // OJO: si lo cambia, cámbielo también en index.html (Buscar y reemplazar).
  whatsapp: '51922175593',
  whatsappVisible: '922 175 593',

  direccion: 'Av. Francisco Bolognesi 405, Comas 15314, Lima',
  // Texto con el que Google Maps ubica el local (mapa y botón "Cómo llegar").
  mapaBusqueda: 'Av. Francisco Bolognesi 405, Comas 15314, Lima, Perú',
  // Si el dueño tiene el link de su ficha de Google Maps, péguelo aquí.
  linkMaps: '[PENDIENTE]',

  // Frase de atención (viene del volante del dueño) y horario de la tienda.
  atencion: 'Atención inmediata las 24 horas por WhatsApp.',
  horario: 'Todos los días, a cualquier hora.',
  metodosPago: [],                   // ej. ['Yape', 'Plin', 'Transferencia', 'Efectivo']

  // Redes: deje '' si no tiene. Solo se muestran las que tengan link.
  instagram: '',
  facebook: '',
  tiktok: '',

  // Link al Libro de Reclamaciones (si la florería lo tiene). Vacío = no se muestra.
  libroReclamaciones: '',

  // El dueño NO quiere mostrar precios: se trabaja por código.
  // Si algún día cambia de idea: ponga true y llene "precio" en data/productos.json.
  mostrarPrecios: false,

  // Barra de avisos de arriba. En celular rotan de uno en uno.
  anuncios: [
    'Atención inmediata las 24 horas',
    'Delivery en Lima',
    'Pedidos por WhatsApp: 922 175 593'
  ],

  // Los banners de la portada (cumpleaños, sepelios, matrimonios, graduación y empresas)
  // están escritos en index.html, dentro de <section class="heroes">: cada <article class="hero">
  // es un banner con su frase, sus fotos y sus botones. Cambian solos cada 7 segundos.

  // Carrusel "Los más buscados": códigos de los 6 arreglos, en el orden en que salen.
  // Los eligió el desarrollador (3 de cumpleaños y 3 de velorios): que el dueño confirme cuáles son.
  masBuscados: ['CUM-01', 'VEL-01', 'ANI-01', 'MAT-01', 'GRA-02', 'VEL-26'],

  // OFERTA DEL DÍA: un arreglo distinto cada día, con reloj hasta la medianoche.
  // OJO: el texto promete un "precio especial". Es un EJEMPLO: antes de publicar,
  // el dueño debe confirmar que dará esa oferta y qué arreglos entran.
  // Para ocultar toda la sección: activa: false.
  ofertaDelDia: {
    activa: false,
    etiqueta: 'Solo por hoy',
    titulo: 'Oferta del día',
    texto: 'Precio especial hasta la medianoche. Pídalo con su código y se lo confirmamos por WhatsApp.',
    // Un código por día, en este orden: domingo, lunes, martes, miércoles, jueves, viernes, sábado.
    // Si pone menos de 7, la lista se repite.
    codigos: ['CUM-01', 'CUM-04', 'CUM-03', 'CUM-02', 'CUM-16', 'CUM-24', 'ANI-01']
  },

  // Promociones y destacados (los banners grandes debajo de la portada).
  // Aquí van las promociones reales del dueño (descuentos, regalos, fechas
  // especiales) cuando las confirme. Hoy solo anuncian las secciones.
  //   tema:   'rosa' | 'oscuro' | 'crema'
  //   ancha:  true = ocupa todo el ancho en computadora
  //   enlace: '#seccion' de esta página, o 'whatsapp' para abrir el chat
  promociones: [
    {
      tema: 'rosa', etiqueta: 'Cumpleaños', titulo: 'Sorprenda en su día',
      texto: 'Ramos en papel coreano, girasoles y arreglos con tulipanes.',
      boton: 'Ver arreglos', enlace: '#cumpleanos', foto: 'img/fotos/cum-04.jpg'
    },
    {
      tema: 'oscuro', etiqueta: 'Velorios · 24 horas', titulo: 'Acompañe con flores',
      texto: 'Coronas de corazón y lágrimas florales. Atención inmediata.',
      boton: 'Ver arreglos', enlace: '#velorios', foto: 'img/fotos/vel-01.jpg'
    },
    {
      tema: 'rosa', etiqueta: 'A su gusto', titulo: 'Arme su ramo',
      texto: 'Elija las flores, los colores y los detalles. Le cotizamos por WhatsApp.',
      boton: 'Empezar', enlace: '#arma-tu-ramo', foto: 'img/fotos/cum-19.jpg'
    },
    {
      tema: 'crema', etiqueta: 'Aniversarios', titulo: 'Rosas rojas para decirlo todo',
      texto: 'Ramos redondos de rosas con lluvia y lirio.',
      boton: 'Ver ramos', enlace: '#aniversarios', foto: 'img/fotos/ani-01.jpg'
    },
    {
      tema: 'crema', etiqueta: 'Matrimonios', titulo: 'Su día, a su estilo',
      texto: 'Bouquets de novia, caminos de mesa, arcos y decoración del auto.',
      boton: 'Ver matrimonios', enlace: '#matrimonios', foto: 'img/fotos/mat-01.jpg'
    },
    {
      tema: 'rosa', etiqueta: 'Graduación', titulo: 'Felicite con un detalle único',
      texto: 'Ramos y boxes con osito graduado, globos y chocolates.',
      boton: 'Ver graduación', enlace: '#graduacion', foto: 'img/fotos/gra-02.jpg'
    },
    {
      tema: 'oscuro', etiqueta: 'Pedido urgente', titulo: '¿Lo necesita hoy?',
      texto: 'Escríbanos por WhatsApp y le confirmamos la entrega de inmediato.',
      boton: 'Escribir por WhatsApp', enlace: 'whatsapp', foto: 'img/fotos/vel-04.jpg'
    }
  ]
};
