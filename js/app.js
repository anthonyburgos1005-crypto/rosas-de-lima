/* =====================================================================
   Florería Rosas de Lima — Lógica de la página
   ---------------------------------------------------------------------
   Qué hace este archivo:
   1. Carga los datos de /data (productos, delivery, arme su ramo).
   2. Dibuja avisos, promociones y los catálogos de cada evento.
   3. Maneja la búsqueda, los favoritos y el formulario de pedido.
   4. Arma los mensajes de WhatsApp de cada formulario.
   No usa librerías: es JavaScript puro.
   ===================================================================== */
(function () {
  'use strict';

  const C = window.CONFIG;
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  /* ---------- Utilidades ---------- */

  // ¿El dato todavía no está? (vacío o marcado como [PENDIENTE])
  const pendiente = (v) => !v || String(v).trim() === '' || String(v).includes('[PENDIENTE');
  const esSi = (v) => String(v || '').trim().toUpperCase() === 'SI' || v === true;

  // Evita que un texto de los datos rompa el HTML.
  const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Para buscar sin importar tildes ni mayúsculas: "Corazón" = "corazon".
  const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const soles = (n) => 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 });
  const tienePrecio = (v) => C.mostrarPrecios && v !== '' && v !== null && v !== undefined && !isNaN(Number(v));

  // Link de WhatsApp con el mensaje ya escrito.
  const linkWhatsApp = (mensaje) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  const abrirWhatsApp = (mensaje) => {
    const url = linkWhatsApp(mensaje);
    const ventana = window.open(url, '_blank', 'noopener');
    if (!ventana) window.location.href = url; // si el navegador bloquea la pestaña nueva
  };

  // "2026-11-14" -> "sábado, 14 de noviembre de 2026"
  const fechaLarga = (iso) => {
    if (!iso) return '';
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  // "16:30" -> "4:30 p. m."
  const horaCorta = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
  };
  const hoyISO = () => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  };

  // Lee un archivo de /data. Si falla, devuelve null y la página sigue funcionando.
  const cargar = async (nombre) => {
    try {
      const r = await fetch(`data/${nombre}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn(`No se pudo cargar data/${nombre}.json`, e);
      return null;
    }
  };

  /* ---------- Estado ---------- */
  const estado = {
    productos: [],
    distritos: [],
    grupos: [],
    catalogos: [],            // un catálogo por cada evento de la página
    modo: null,               // null | 'busqueda' | 'favoritos'
    busqueda: '',
    favoritos: new Set(),
    productoActual: null,
    verTodosDistritos: false
  };
  try { estado.favoritos = new Set(JSON.parse(localStorage.getItem('rdl-favoritos') || '[]')); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  const guardarFavoritos = () => { try { localStorage.setItem('rdl-favoritos', JSON.stringify([...estado.favoritos])); } catch (e) { /* idem */ } };

  const disponibles = () => estado.productos.filter((p) => esSi(p.disponible));
  // Orden general: destacados primero, luego por el campo "orden".
  const porOrden = (a, b) => (esSi(b.destacado) - esSi(a.destacado)) || ((Number(a.orden) || 0) - (Number(b.orden) || 0));

  /* ---------- Mensajes generales de WhatsApp ---------- */
  const SALUDO = `Hola, ${C.nombre}.`;
  const MENSAJES = {
    general: `${SALUDO} Quisiera hacer un pedido.`,
    velorio: `${SALUDO} Necesito un arreglo para un velorio.`,
    distrito: `${SALUDO} Quisiera saber si hacen delivery a mi distrito.`
  };
  const prepararLinksWhatsApp = (raiz = document) => {
    $$('[data-wa]', raiz).forEach((a) => { a.href = linkWhatsApp(MENSAJES[a.dataset.wa] || MENSAJES.general); });
  };

  /* ---------- Barra de avisos ---------- */
  const iniciarAnuncio = () => {
    const caja = $('#anuncio');
    const avisos = C.anuncios || [];
    if (!avisos.length) { caja.hidden = true; return; }
    caja.innerHTML = avisos.map((t, i) => `<span class="${i === 0 ? 'activo' : ''}">${escapar(t)}</span>`).join('');
    if (avisos.length < 2) return;
    // En celular solo cabe uno: van rotando. En computadora se ven todos (lo decide el CSS).
    let actual = 0;
    setInterval(() => {
      const items = $$('span', caja);
      items[actual].classList.remove('activo');
      actual = (actual + 1) % items.length;
      items[actual].classList.add('activo');
    }, 4500);
  };

  /* ---------- Portada: banners deslizables ---------- */
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Cada banner es un <article class="hero"> de index.html. El que se ve lleva la clase "activa" (anima su texto).
  const iniciarHeroes = () => {
    const caja = $('#heroes');
    if (!caja) return;
    const slides = $$('.hero', caja);
    montarCarrusel(caja, $('#heroesPuntos'), $('#heroesAntes'), $('#heroesDespues'), 7000);
    if (!('IntersectionObserver' in window)) { slides.forEach((s) => s.classList.add('activa')); return; }
    const ver = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => en.target.classList.toggle('activa', en.isIntersecting));
    }, { root: caja, threshold: 0.55 });
    slides.forEach((s) => ver.observe(s));
  };

  /* ---------- Carrusel deslizable (sirve para "Los más buscados" y para Promociones) ---------- */
  // caja: el contenedor que se desliza; puntos: donde van los puntitos; antes/despues: las flechas;
  // cadaMs: cada cuánto avanza solo (0 = no avanza solo).
  const montarCarrusel = (caja, puntos, antes, despues, cadaMs) => {
    const primera = caja.firstElementChild;
    if (!primera) return;
    // Cuánto avanza cada paso: el ancho de una tarjeta más el espacio entre tarjetas.
    const paso = () => primera.getBoundingClientRect().width + (Number.isNaN(parseFloat(getComputedStyle(caja).columnGap)) ? 16 : parseFloat(getComputedStyle(caja).columnGap));
    const maximo = () => Math.max(0, caja.scrollWidth - caja.clientWidth);
    const posiciones = () => Math.max(1, Math.round(maximo() / paso()) + 1);
    const indice = () => Math.min(posiciones() - 1, Math.round(caja.scrollLeft / paso()));
    const ir = (i) => caja.scrollTo({ left: Math.min(i * paso(), maximo()), behavior: sinMovimiento ? 'auto' : 'smooth' });

    const actualizar = () => {
      const n = posiciones();
      if ($$('button', puntos).length !== n) {
        puntos.innerHTML = Array.from({ length: n }, (_, i) => `<button type="button" aria-label="Ir a la posición ${i + 1} de ${n}"></button>`).join('');
      }
      puntos.hidden = n < 2;
      const i = indice();
      $$('button', puntos).forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
      antes.disabled = i === 0;
      despues.disabled = i >= n - 1;
    };

    antes.addEventListener('click', () => ir(indice() - 1));
    despues.addEventListener('click', () => ir(indice() + 1));
    puntos.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) ir($$('button', puntos).indexOf(b));
    });
    let espera = null;
    caja.addEventListener('scroll', () => { clearTimeout(espera); espera = setTimeout(actualizar, 80); }, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();

    // Avanza solo mientras esté a la vista y nadie lo esté usando.
    if (sinMovimiento || !cadaMs) return;
    let aLaVista = false;
    let pausado = false;
    let reanudar = null;
    const pausar = () => { pausado = true; clearTimeout(reanudar); reanudar = setTimeout(() => { pausado = false; }, 9000); };
    ['pointerdown', 'touchstart', 'wheel', 'focusin', 'mouseenter'].forEach((ev) => caja.addEventListener(ev, pausar, { passive: true }));
    [antes, despues, puntos].forEach((el) => el.addEventListener('click', pausar));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entradas) => { aLaVista = entradas[0].isIntersecting; }, { threshold: 0.4 }).observe(caja);
    }
    setInterval(() => {
      if (!aLaVista || pausado || document.hidden) return;
      const i = indice();
      ir(i >= posiciones() - 1 ? 0 : i + 1);
    }, cadaMs);
  };

  /* ---------- Oferta del día ---------- */
  const iniciarOferta = () => {
    const O = C.ofertaDelDia;
    if (!O || !O.activa || !(O.codigos || []).length) return;
    // El arreglo del día sale de la lista según el día de la semana (0 = domingo).
    const codigo = O.codigos[new Date().getDay() % O.codigos.length];
    const p = estado.productos.find((x) => x.codigo === codigo && esSi(x.disponible));
    if (!p) return;

    $('#ofertaEtiqueta').textContent = O.etiqueta || '';
    $('#ofertaEtiqueta').hidden = !O.etiqueta;
    $('#ofertaTitulo').textContent = O.titulo || 'Oferta del día';
    $('#ofertaNombre').textContent = p.nombre;
    $('#ofertaCodigo').textContent = p.codigo;
    $('#ofertaDesc').textContent = O.texto || '';
    $('#ofertaFoto').src = p.foto;
    $('#ofertaFoto').alt = p.nombre;
    $('#ofertaAbrir').setAttribute('aria-label', `Pedir la oferta del día: ${p.nombre}, código ${p.codigo}`);
    $('#oferta').hidden = false;
    [$('#ofertaAbrir'), $('#ofertaPedir')].forEach((b) => b.addEventListener('click', () => abrirPedido(p.codigo, true)));

    // Reloj: cuenta lo que falta para la medianoche.
    const dos = (n) => String(n).padStart(2, '0');
    const tic = () => {
      const ahora = new Date();
      const medianoche = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
      const s = Math.max(0, Math.floor((medianoche - ahora) / 1000));
      $('#relojH').textContent = dos(Math.floor(s / 3600));
      $('#relojM').textContent = dos(Math.floor((s % 3600) / 60));
      $('#relojS').textContent = dos(s % 60);
    };
    tic();
    setInterval(tic, 1000);
  };

  /* ---------- Carrusel "Los más buscados" ---------- */
  const iniciarCarrusel = () => {
    const caja = $('#carrusel');
    const puntos = $('#carruselPuntos');
    const antes = $('#carruselAntes');
    const despues = $('#carruselDespues');
    const lista = (C.masBuscados || [])
      .map((codigo) => estado.productos.find((p) => p.codigo === codigo && esSi(p.disponible)))
      .filter(Boolean);
    if (!lista.length) { $('#mas-buscados').hidden = true; return; }

    caja.innerHTML = lista.map((p, i) => {
      const fav = estado.favoritos.has(p.codigo);
      return `
        <article class="slide">
          <span class="slide-num" aria-hidden="true">${i + 1}</span>
          <div class="slide-foto${p.evento === 'Velorios' ? ' oscura' : ''}">
            <button class="item-abrir" type="button" data-pedir="${escapar(p.codigo)}" aria-label="Pedir ${escapar(p.nombre)}, código ${escapar(p.codigo)}">
              <img src="${escapar(p.foto)}" alt="${escapar(p.nombre)}" loading="lazy" width="400" height="500">
            </button>
            <button class="fav" type="button" data-fav="${escapar(p.codigo)}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de' : 'Guardar en'} favoritos: ${escapar(p.nombre)}">
              <svg aria-hidden="true"><use href="#i-corazon"/></svg>
            </button>
          </div>
          <div>
            <p class="sobretitulo">${escapar(p.evento)}</p>
            <h3>${escapar(p.nombre)}</h3>
            <p class="item-meta"><span class="codigo">${escapar(p.codigo)}</span><span>${escapar(p.tipo || '')}</span></p>
          </div>
          <button class="boton boton-primario boton-chico" type="button" data-pedir="${escapar(p.codigo)}">Pedir por WhatsApp</button>
        </article>`;
    }).join('');

    montarCarrusel(caja, puntos, antes, despues, 4500);
  };

  /* ---------- Categorías: un círculo por cada tipo de arreglo ---------- */
  const pintarCategorias = () => {
    const grupos = [];
    estado.catalogos.forEach((cat) => {
      const prods = disponibles().filter((p) => p.evento === cat.evento).sort(porOrden);
      if (!prods.length) return;
      const tipos = [...new Set(prods.map((p) => p.tipo).filter(Boolean))];
      if (tipos.length < 2) { grupos.push({ evento: cat.evento, tipo: 'Todos', nombre: cat.evento, detalle: '', foto: prods[0].foto, n: prods.length }); return; }
      tipos.forEach((t) => {
        const deEsteTipo = prods.filter((p) => p.tipo === t);
        grupos.push({ evento: cat.evento, tipo: t, nombre: t, detalle: cat.evento, foto: deEsteTipo[0].foto, n: deEsteTipo.length });
      });
    });
    if (!grupos.length) { $('#categorias').hidden = true; return; }

    $('#categoriasLista').innerHTML = grupos.map((g) => `
      <button class="categoria" type="button" data-cat-evento="${escapar(g.evento)}" data-cat-tipo="${escapar(g.tipo)}">
        <span class="categoria-foto${g.evento === 'Velorios' ? ' oscura' : ''}"><img src="${escapar(g.foto)}" alt="" loading="lazy" width="200" height="250"></span>
        <span class="categoria-nombre">${escapar(g.nombre)}<small>${escapar(g.detalle ? g.detalle + ' · ' : '')}${g.n}</small></span>
      </button>`).join('');

    $('#categoriasLista').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat-evento]');
      if (!b) return;
      const cat = estado.catalogos.find((c) => c.evento === b.dataset.catEvento);
      if (!cat) return;
      cat.tipo = b.dataset.catTipo;
      cat.visibles = cat.porPagina;
      pintarCatalogo(cat);
      cat.el.closest('section').scrollIntoView();
    });
  };

  /* ---------- Promociones ---------- */
  const pintarPromos = () => {
    const promos = C.promociones || [];
    if (!promos.length) { $('#promociones').hidden = true; return; }
    $('#promos').innerHTML = promos.map((p) => {
      const esWa = p.enlace === 'whatsapp';
      const clases = ['promo', p.tema === 'oscuro' ? 'oscuro' : `promo-${p.tema || 'crema'}`].join(' ');
      return `
        <a class="${clases}" href="${esWa ? linkWhatsApp(MENSAJES.general) : escapar(p.enlace || '#')}"${esWa ? ' target="_blank" rel="noopener"' : ''}>
          <span class="promo-texto">
            ${p.etiqueta ? `<span class="promo-etiqueta">${escapar(p.etiqueta)}</span>` : ''}
            <span class="promo-titulo">${escapar(p.titulo)}</span>
            ${p.texto ? `<span class="promo-desc">${escapar(p.texto)}</span>` : ''}
            ${p.boton ? `<span class="promo-boton">${escapar(p.boton)}<svg class="icono" aria-hidden="true"><use href="#i-flecha"/></svg></span>` : ''}
          </span>
          <span class="promo-foto"><img src="${escapar(p.foto)}" alt="" loading="lazy" width="600" height="750"></span>
        </a>`;
    }).join('');
    montarCarrusel($('#promos'), $('#promosPuntos'), $('#promosAntes'), $('#promosDespues'), 6000);
  };

  /* ---------- Encabezado: menú, búsqueda y favoritos ---------- */
  const iniciarCabecera = () => {
    const boton = $('#menuBoton');
    const menu = $('#menu');
    const cerrarMenu = () => { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); boton.setAttribute('aria-label', 'Abrir menú'); };
    boton.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

    // Cualquier enlace interno (#seccion) cierra el menú y sale de búsqueda/favoritos,
    // para que la sección de destino esté visible cuando el navegador salte a ella.
    document.addEventListener('click', (e) => {
      const enlace = e.target.closest('a[href^="#"]');
      if (!enlace) return;
      cerrarMenu();
      if (estado.modo) salirDeResultados(false);
    });

    // Búsqueda
    const barra = $('#barraBusqueda');
    const abrir = $('#abrirBusqueda');
    const campo = $('#buscador');
    abrir.addEventListener('click', () => {
      barra.hidden = !barra.hidden;
      abrir.setAttribute('aria-expanded', String(!barra.hidden));
      if (!barra.hidden) campo.focus();
      else if (estado.modo === 'busqueda') salirDeResultados();
    });
    campo.addEventListener('input', () => {
      estado.busqueda = campo.value.trim();
      if (estado.busqueda.length >= 2) { estado.modo = 'busqueda'; pintarResultados(); }
      else if (estado.modo === 'busqueda') salirDeResultados(false);
    });

    // Favoritos
    $('#verFavoritos').addEventListener('click', () => {
      estado.modo = 'favoritos';
      pintarResultados();
      window.scrollTo(0, 0);
      $('#resultadosTitulo').focus({ preventScroll: true });
    });
    $('#cerrarResultados').addEventListener('click', () => salirDeResultados());
    pintarCuentaFavoritos();
  };

  const pintarCuentaFavoritos = () => {
    const cuenta = $('#cuentaFav');
    cuenta.textContent = estado.favoritos.size;
    cuenta.hidden = estado.favoritos.size === 0;
    $('#verFavoritos').setAttribute('aria-label', `Ver mis favoritos (${estado.favoritos.size})`);
  };

  /* ---------- Tarjeta de un arreglo ---------- */
  const itemHTML = (p, i, mostrarEvento) => {
    const fav = estado.favoritos.has(p.codigo);
    return `
      <article class="item entra" style="animation-delay:${Math.min(i, 7) * 45}ms">
        <div class="item-foto">
          <button class="item-abrir" type="button" data-pedir="${escapar(p.codigo)}" aria-label="Pedir ${escapar(p.nombre)}, código ${escapar(p.codigo)}">
            <img src="${escapar(p.foto)}" alt="${escapar(p.nombre)}" loading="lazy" width="400" height="500">
          </button>
          ${esSi(p.destacado) ? '<span class="etiqueta-dest">Destacado</span>' : ''}
          <button class="fav" type="button" data-fav="${escapar(p.codigo)}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de' : 'Guardar en'} favoritos: ${escapar(p.nombre)}">
            <svg aria-hidden="true"><use href="#i-corazon"/></svg>
          </button>
        </div>
        <div>
          <h3>${escapar(p.nombre)}</h3>
          <p class="item-meta">
            <span class="codigo">${escapar(p.codigo)}</span>
            <span>${escapar(mostrarEvento ? p.evento : (p.tipo || ''))}</span>
            ${tienePrecio(p.precio) ? `<span class="precio">${soles(p.precio)}</span>` : ''}
          </p>
        </div>
        <button class="boton boton-linea boton-chico" type="button" data-pedir="${escapar(p.codigo)}">Pedir</button>
      </article>`;
  };

  /* ---------- Catálogos por evento (Cumpleaños, Velorios, Aniversarios) ---------- */
  // Cada <div class="catalogo" data-evento="..."> del HTML se convierte en un catálogo
  // con sus filtros por tipo, su cuadrícula y su botón "Ver más".
  const iniciarCatalogos = () => {
    estado.catalogos = $$('.catalogo[data-evento]').map((el) => {
      const cat = { el, evento: el.dataset.evento, porPagina: Number(el.dataset.pagina) || 8, tipo: 'Todos', visibles: 0 };
      cat.visibles = cat.porPagina;
      el.innerHTML = '<div class="tipos" role="group" aria-label="Filtrar por tipo"></div><div class="grilla"></div><div class="catalogo-pie"><button class="boton boton-linea" type="button" data-vermas hidden></button></div>';
      el.addEventListener('click', (e) => {
        const tipo = e.target.closest('[data-tipo]');
        if (tipo) { cat.tipo = tipo.dataset.tipo; cat.visibles = cat.porPagina; pintarCatalogo(cat); return; }
        if (e.target.closest('[data-vermas]')) { cat.visibles += cat.porPagina; pintarCatalogo(cat); }
      });
      pintarCatalogo(cat);
      return cat;
    });
  };

  const pintarCatalogo = (cat) => {
    const todos = disponibles().filter((p) => p.evento === cat.evento).sort(porOrden);
    const cajaTipos = $('.tipos', cat.el);
    const grilla = $('.grilla', cat.el);
    const verMas = $('[data-vermas]', cat.el);

    // Filtros por tipo: solo si el evento tiene más de un tipo.
    const tipos = [...new Set(todos.map((p) => p.tipo).filter(Boolean))];
    cajaTipos.hidden = tipos.length < 2;
    if (tipos.length >= 2) {
      cajaTipos.innerHTML = ['Todos', ...tipos].map((t) => {
        const n = t === 'Todos' ? todos.length : todos.filter((p) => p.tipo === t).length;
        return `<button class="tipo" type="button" data-tipo="${escapar(t)}" aria-pressed="${t === cat.tipo}">${escapar(t)} <small>${n}</small></button>`;
      }).join('');
    }

    const lista = cat.tipo === 'Todos' ? todos : todos.filter((p) => p.tipo === cat.tipo);
    if (!estado.productos.length) {
      grilla.innerHTML = '<p class="catalogo-vacio">No pudimos cargar los arreglos en este momento. Escríbanos por WhatsApp y le enviamos los modelos.</p>';
    } else if (!lista.length) {
      grilla.innerHTML = '<p class="catalogo-vacio">Pronto agregaremos arreglos aquí. Mientras tanto, consúltenos por WhatsApp.</p>';
    } else {
      grilla.innerHTML = lista.slice(0, cat.visibles).map((p, i) => itemHTML(p, i, false)).join('');
    }
    const faltan = lista.length - cat.visibles;
    verMas.hidden = faltan <= 0;
    if (faltan > 0) verMas.textContent = `Ver más arreglos (${faltan})`;
  };

  /* ---------- Resultados: búsqueda y favoritos ---------- */
  const pintarResultados = () => {
    const seccion = $('#resultados');
    const esFav = estado.modo === 'favoritos';
    const q = normalizar(estado.busqueda);
    const lista = disponibles()
      .filter((p) => esFav ? estado.favoritos.has(p.codigo) : normalizar(`${p.nombre} ${p.codigo} ${p.evento} ${p.tipo} ${p.descripcion}`).includes(q))
      .sort(porOrden);

    seccion.hidden = false;
    $('#contenido').classList.add('modo-resultados');
    $('#resultadosSobre').textContent = esFav ? 'Sus arreglos guardados' : 'Resultados de la búsqueda';
    $('#resultadosTitulo').textContent = esFav ? 'Mis favoritos' : `“${estado.busqueda}”`;
    $('#resultadosConteo').textContent = lista.length ? `${lista.length} ${lista.length === 1 ? 'arreglo' : 'arreglos'}` : '';
    $('#resultadosGrilla').innerHTML = lista.length
      ? lista.map((p, i) => itemHTML(p, i, true)).join('')
      : `<p class="catalogo-vacio">${esFav
          ? 'Aún no tiene favoritos. Toque el corazón de los arreglos que le gusten para guardarlos aquí.'
          : 'No encontramos arreglos con esa búsqueda. Pruebe con otra palabra o escríbanos por WhatsApp.'}</p>`;

    // Botón para consultar todos los favoritos de una sola vez.
    const botonFav = $('#enviarFavoritos');
    botonFav.hidden = !(esFav && lista.length);
    if (!botonFav.hidden) {
      const lineas = lista.map((p) => `• ${p.codigo} - ${p.nombre}`).join('\n');
      botonFav.href = linkWhatsApp(`${SALUDO} Quisiera consultar por estos arreglos:\n\n${lineas}\n\nQuedo a la espera de los precios. Gracias.`);
    }
  };

  const salirDeResultados = (subir = true) => {
    estado.modo = null;
    estado.busqueda = '';
    $('#buscador').value = '';
    $('#barraBusqueda').hidden = true;
    $('#abrirBusqueda').setAttribute('aria-expanded', 'false');
    $('#resultados').hidden = true;
    $('#contenido').classList.remove('modo-resultados');
    // Los corazones pudieron cambiar mientras se veían los resultados.
    estado.catalogos.forEach(pintarCatalogo);
    $$('#carrusel [data-fav]').forEach((b) => b.setAttribute('aria-pressed', String(estado.favoritos.has(b.dataset.fav))));
    if (subir) window.scrollTo(0, 0);
  };

  /* ---------- Clics en cualquier tarjeta: Pedir y Favoritos ---------- */
  const iniciarClicsDeTarjetas = () => {
    document.addEventListener('click', (e) => {
      const fav = e.target.closest('[data-fav]');
      if (fav) {
        const codigo = fav.dataset.fav;
        estado.favoritos.has(codigo) ? estado.favoritos.delete(codigo) : estado.favoritos.add(codigo);
        guardarFavoritos();
        pintarCuentaFavoritos();
        if (estado.modo === 'favoritos') { pintarResultados(); return; }
        const activo = estado.favoritos.has(codigo);
        $$(`[data-fav="${CSS.escape(codigo)}"]`).forEach((b) => {
          b.setAttribute('aria-pressed', String(activo));
          b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^(Quitar de|Guardar en)/, activo ? 'Quitar de' : 'Guardar en'));
        });
        return;
      }
      const pedir = e.target.closest('[data-pedir]');
      if (pedir) abrirPedido(pedir.dataset.pedir);
    });
  };

  /* ---------- Pedido directo por WhatsApp ---------- */
  // Al tocar "Pedir" se abre WhatsApp con el pedido ya escrito (arreglo, código, evento y foto).
  // No se hacen preguntas: la fecha, la dirección y la dedicatoria se coordinan en el chat.
  const abrirPedido = (codigo, esOferta = false) => {
    const p = estado.productos.find((x) => x.codigo === codigo);
    if (!p) return;
    const lineas = [
      `${SALUDO} Quisiera pedir este arreglo:`,
      '',
      `*Arreglo:* ${p.nombre}`,
      `*Código:* ${p.codigo}`,
      `*Evento:* ${p.evento}`
    ];
    if (p.tipo) lineas.push(`*Categoría:* ${p.tipo}`);
    if (esOferta) lineas.push('*Oferta del día:* sí, la vi en la página');
    if (tienePrecio(p.precio)) lineas.push(`*Precio:* ${soles(p.precio)}`);
    try { lineas.push(`*Foto:* ${new URL(p.foto, window.location.href).href}`); } catch (e) { /* sin foto en el mensaje */ }
    lineas.push('', 'Por favor, indíqueme el precio y la disponibilidad. Luego le paso la fecha, la dirección de entrega y la dedicatoria. Gracias.');
    abrirWhatsApp(lineas.join('\n'));
  };

  /* ---------- Arme su ramo ---------- */
  const iniciarRamo = () => {
    const form = $('#formRamo');
    const caja = $('#ramoOpciones');
    if (!estado.grupos.length) { $('#arma-tu-ramo').hidden = true; return; }

    caja.innerHTML = estado.grupos.map((g, i) => `
      <fieldset class="ramo-grupo">
        <legend><span class="ramo-paso">${String(i + 1).padStart(2, '0')}</span>${escapar(g.pregunta || g.grupo)}</legend>
        <div class="pastillas">
          ${g.opciones.map((o) => `
            <label class="pastilla">
              <input type="${g.tipo === 'varias' ? 'checkbox' : 'radio'}" name="g${i}" value="${escapar(o.opcion)}">
              <span>${escapar(o.opcion)}${tienePrecio(o.precio_extra) && Number(o.precio_extra) > 0 ? ' (+' + soles(o.precio_extra) + ')' : ''}</span>
            </label>`).join('')}
        </div>
      </fieldset>`).join('');

    // Lo que el cliente lleva elegido en cada grupo.
    const elegido = () => estado.grupos.map((g, i) => ({
      grupo: g.grupo,
      tipo: g.tipo,
      opciones: $$(`input[name="g${i}"]:checked`, form).map((inp) => g.opciones.find((o) => o.opcion === inp.value))
    }));

    const pintarResumen = () => {
      const sel = elegido();
      $('#ramoLista').innerHTML = sel.map((s) => {
        const texto = s.opciones.map((o) => o.opcion).join(', ');
        const falta = s.tipo === 'varias' ? 'Sin elegir' : 'Falta elegir';
        return `<li class="${texto ? '' : 'vacio'}"><span>${escapar(s.grupo)}</span><span>${escapar(texto || falta)}</span></li>`;
      }).join('');
      if (C.mostrarPrecios) {
        const total = sel.flatMap((s) => s.opciones).reduce((t, o) => t + (Number(o.precio_extra) || 0), 0);
        $('#ramoTotal').hidden = false;
        $('#ramoTotal').textContent = `Precio referencial: ${soles(total)}`;
      }
      $('#ramoError').hidden = true;
    };
    pintarResumen();
    form.addEventListener('change', pintarResumen);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const sel = elegido();
      const faltan = sel.filter((s) => s.tipo !== 'varias' && !s.opciones.length).map((s) => s.grupo.toLowerCase());
      const error = $('#ramoError');
      if (faltan.length) {
        error.textContent = `Por favor, elija: ${faltan.join(', ')}.`;
        error.hidden = false;
        return;
      }
      if (!form.reportValidity()) return;
      const f = Object.fromEntries(new FormData(form).entries());
      const lineas = [`${SALUDO} Quisiera cotizar un ramo armado a mi gusto:`, ''];
      sel.forEach((s) => { if (s.opciones.length) lineas.push(`*${s.grupo}:* ${s.opciones.map((o) => o.opcion).join(', ')}`); });
      lineas.push('', `*Nombre:* ${f.nombre}`);
      if (f.detalle) lineas.push(`*Detalle:* ${f.detalle}`);
      lineas.push('', 'Quedo a la espera de la cotización. Gracias.');
      abrirWhatsApp(lineas.join('\n'));
    });
  };

  /* ---------- Cotice su evento ---------- */
  const iniciarCotiza = () => {
    const form = $('#formCotiza');
    const tipo = $('#cotizaTipo');
    form.elements.fecha.min = hoyISO();

    // La pregunta de "tamaño" cambia según el evento.
    const TAMANOS = {
      'Decoración de anda': ['Tamaño aproximado del anda', 'Ej. 2 m × 1.5 m'],
      'Otro evento': ['Tamaño del evento o del espacio', 'Ej. 50 personas, salón pequeño']
    };
    const ajustarTamano = () => {
      const [etiqueta, ejemplo] = TAMANOS[tipo.value] || ['Cantidad aproximada de invitados', 'Ej. 100 invitados'];
      $('#cotizaTamanoEtiqueta').textContent = etiqueta;
      $('#cotizaTamano').placeholder = ejemplo;
    };
    tipo.addEventListener('change', ajustarTamano);

    // Las tarjetas de evento dejan elegido el tipo y llevan al formulario.
    $$('[data-cotizar]').forEach((tarjeta) => {
      tarjeta.addEventListener('click', () => {
        tipo.value = tarjeta.dataset.cotizar;
        ajustarTamano();
        $('#cotiza').scrollIntoView();
        form.elements.fecha.focus({ preventScroll: true });
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form).entries());
      const lineas = [
        `${SALUDO} Quisiera cotizar la decoración de un evento:`,
        '',
        `*Tipo de evento:* ${f.tipo}`,
        `*Fecha:* ${fechaLarga(f.fecha)}`,
        `*Distrito o lugar:* ${f.lugar}`
      ];
      if (f.tamano) lineas.push(`*${$('#cotizaTamanoEtiqueta').textContent}:* ${f.tamano}`);
      if (f.presupuesto) lineas.push(`*Presupuesto aproximado:* ${/^[\d.,\s]+$/.test(f.presupuesto) ? 'S/ ' + f.presupuesto.trim() : f.presupuesto}`);
      if (f.detalles) lineas.push(`*Detalles e ideas:* ${f.detalles}`);
      lineas.push('', `*Nombre:* ${f.nombre}`, '', 'Quedo a la espera de su propuesta. Gracias.');
      abrirWhatsApp(lineas.join('\n'));
    });
  };

  /* ---------- Delivery ---------- */
  const pintarDelivery = () => {
    const q = normalizar($('#buscadorDistrito').value);
    const lista = estado.distritos.filter((d) => !q || normalizar(`${d.distrito} ${d.zona}`).includes(q));
    // En celular la lista completa es larga: se muestran 8 y un botón para ver el resto.
    const LIMITE = 8;
    const recortar = !q && !estado.verTodosDistritos && lista.length > LIMITE;
    const mostrados = recortar ? lista.slice(0, LIMITE) : lista;

    $('#deliveryLista').innerHTML = mostrados.map((d) => `
      <li>
        <span><span class="distrito-nombre">${escapar(d.distrito)}</span><span class="distrito-zona">${escapar(d.zona || '')}${tienePrecio(d.costo) ? ' · ' + soles(d.costo) : ''}</span></span>
        <span class="distrito-tiempo">${escapar(d.tiempo_estimado || 'Consultar')}</span>
      </li>`).join('');
    $('#deliveryVacio').hidden = lista.length > 0;

    let mas = $('#deliveryMas');
    if (recortar && !mas) {
      mas = document.createElement('div');
      mas.className = 'delivery-mas';
      mas.id = 'deliveryMas';
      mas.innerHTML = `<button class="boton boton-linea" type="button">Ver todos los distritos (${lista.length})</button>`;
      mas.firstElementChild.addEventListener('click', () => { estado.verTodosDistritos = true; pintarDelivery(); });
      $('#deliveryLista').after(mas);
    }
    if (mas) mas.hidden = !recortar;
  };

  const iniciarDelivery = () => {
    if (!estado.distritos.length) { $('#deliveryLista').innerHTML = ''; $('#deliveryVacio').hidden = false; return; }
    pintarDelivery();
    $('#buscadorDistrito').addEventListener('input', pintarDelivery);
  };

  /* ---------- Datos de contacto (desde config.js) ---------- */
  const pintarContacto = () => {
    const consulta = encodeURIComponent(C.mapaBusqueda || C.direccion);
    $('#datoDireccion').textContent = C.direccion;
    $('#pieDireccion').textContent = C.direccion;
    $('#comoLlegar').href = pendiente(C.linkMaps) ? `https://www.google.com/maps/search/?api=1&query=${consulta}` : C.linkMaps;
    $('#datoWhatsapp').textContent = C.whatsappVisible;
    $('#pieWhatsapp').textContent = C.whatsappVisible;
    const atencion = [pendiente(C.atencion) ? '' : C.atencion, pendiente(C.horario) ? '' : C.horario].filter(Boolean).join(' ');
    $('#datoHorario').textContent = atencion || 'Consúltenos por WhatsApp.';
    if (C.metodosPago && C.metodosPago.length) {
      const pagos = C.metodosPago.join(', ');
      $('#datoPagos').textContent = pagos;
      $('#faqPagos').textContent = `Aceptamos: ${pagos}. Le confirmamos los datos de pago por WhatsApp.`;
    }
    // Redes: solo las que tengan link.
    const redes = [['Instagram', C.instagram], ['Facebook', C.facebook], ['TikTok', C.tiktok]].filter(([, url]) => !pendiente(url));
    if (redes.length) {
      const html = redes.map(([n, url]) => `<a class="enlace" href="${escapar(url)}" target="_blank" rel="noopener">${n}</a>`).join('');
      $('#datoRedes').innerHTML = html; $('#datoRedesFila').hidden = false;
      $('#pieRedes').innerHTML = html.replaceAll('class="enlace" ', ''); $('#pieRedes').hidden = false;
    }
    if (!pendiente(C.libroReclamaciones)) { $('#pieLibro').hidden = false; $('#pieLibro a').href = C.libroReclamaciones; }
    $('#anio').textContent = new Date().getFullYear();
  };

  /* ---------- Aparición suave al bajar ---------- */
  const iniciarRevelado = () => {
    const elementos = $$('.revelar:not(.visible)');
    if (!('IntersectionObserver' in window)) { elementos.forEach((el) => el.classList.add('visible')); return; }
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visible'); observador.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    elementos.forEach((el) => observador.observe(el));
  };

  /* ---------- Arranque ---------- */
  const iniciar = async () => {
    prepararLinksWhatsApp();
    iniciarAnuncio();
    iniciarHeroes();
    pintarPromos();
    iniciarCabecera();
    iniciarClicsDeTarjetas();
    pintarContacto();
    iniciarCotiza();
    iniciarRevelado();

    const [prod, deliv, ramo] = await Promise.all([cargar('productos'), cargar('delivery'), cargar('arma_tu_ramo')]);
    estado.productos = (prod && prod.productos) || [];
    estado.distritos = (deliv && deliv.distritos) || [];
    estado.grupos = (ramo && ramo.grupos) || [];

    iniciarCatalogos();
    pintarCategorias();
    iniciarCarrusel();
    iniciarOferta();
    iniciarRamo();
    iniciarDelivery();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
