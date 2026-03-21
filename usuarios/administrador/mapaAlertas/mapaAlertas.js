// mapaAlertas.js - VERSIÓN CORREGIDA (SOLO INCIDENCIAS REALES)

import { SucursalManager } from '/clases/sucursal.js';
import { RegionManager } from '/clases/region.js';
import { IncidenciaManager } from '/clases/incidencia.js';

// =============================================
// CONFIGURACIÓN DEL MAPA
// =============================================
const CONFIG = {
    centro: [23.6345, -102.5528],
    zoom: 6,
    zoomMin: 5,
    zoomMax: 18,
    bounds: {
        north: 32.718,
        south: 14.532,
        west: -118.365,
        east: -86.711
    },
    colores: {
        critico: '#ff4444',
        alto: '#ff8844',
        medio: '#ffbb33',
        bajo: '#00C851'
    },
    nivelesRiesgo: {
        'critico': { color: '#ff4444', icono: 'fa-skull-crossbones', texto: 'CRÍTICO' },
        'alto': { color: '#ff8844', icono: 'fa-exclamation-triangle', texto: 'ALTO' },
        'medio': { color: '#ffbb33', icono: 'fa-exclamation-circle', texto: 'MEDIO' },
        'bajo': { color: '#00C851', icono: 'fa-info-circle', texto: 'BAJO' }
    }
};

// Estado global
let mapa = null;
let incidencias = [];
let sucursales = [];
let regiones = [];
let sucursalesMap = new Map();
let marcadores = {
    incidencias: {},
    sucursales: {}
};
let filtros = {
    zona: '',
    regionId: null,
    regionNombre: null
};
let sucursalManager = null;
let regionManager = null;
let incidenciaManager = null;
let usuarioActual = null;
let unsubscribeIncidencias = null;
let incidenciasCargadas = false; // Bandera para saber si ya se cargaron las incidencias iniciales

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando mapa con incidencias reales...');

    try {
        // 1. Inicializar mapa
        if (!inicializarMapa()) return;

        // 2. Cargar usuario
        cargarUsuario();

        // 3. Inicializar managers
        sucursalManager = new SucursalManager();
        regionManager = new RegionManager();
        incidenciaManager = new IncidenciaManager();

        // 4. Cargar datos
        await cargarRegiones();
        await cargarSucursales();

        // 5. Cargar UI
        await cargarRegionesEnSelector();
        await cargarRegionesEnLista();

        // 6. Iniciar listener de incidencias (solo incidencias reales)
        iniciarListenerIncidencias();

        // 7. Configurar eventos
        configurarEventos();
        configurarPaneles();
        configurarSelectorRegion();

        console.log('✅ Todo listo!');

    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError(error.message);
    }
});

// =============================================
// INICIALIZAR MAPA
// =============================================
function inicializarMapa() {
    try {
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet no cargado');
            return false;
        }

        const mapaElement = document.getElementById('mapa');
        if (!mapaElement) {
            console.error('❌ Elemento #mapa no encontrado');
            return false;
        }

        mapa = L.map('mapa', {
            center: CONFIG.centro,
            zoom: CONFIG.zoom,
            minZoom: CONFIG.zoomMin,
            maxZoom: CONFIG.zoomMax,
            maxBounds: [
                [CONFIG.bounds.south, CONFIG.bounds.west],
                [CONFIG.bounds.north, CONFIG.bounds.east]
            ],
            maxBoundsViscosity: 1.0
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap | Centinela-MX'
        }).addTo(mapa);

        console.log('✅ Mapa inicializado');
        return true;

    } catch (error) {
        console.error('❌ Error mapa:', error);
        return false;
    }
}

// =============================================
// CARGAR USUARIO
// =============================================
function cargarUsuario() {
    try {
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const data = JSON.parse(adminInfo);
            usuarioActual = {
                id: data.id,
                nombreCompleto: data.nombreCompleto,
                organizacion: data.organizacion,
                organizacionCamelCase: data.organizacionCamelCase || 'pollosRay'
            };
        } else {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && userData.organizacionCamelCase) {
                usuarioActual = {
                    id: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || 'Usuario',
                    organizacion: userData.organizacion,
                    organizacionCamelCase: userData.organizacionCamelCase
                };
            } else {
                usuarioActual = { organizacionCamelCase: 'pollosRay' };
            }
        }
        console.log('👤 Usuario:', usuarioActual.organizacionCamelCase);
    } catch (error) {
        console.error('Error cargando usuario:', error);
        usuarioActual = { organizacionCamelCase: 'pollosRay' };
    }
}

// =============================================
// CARGAR REGIONES
// =============================================
async function cargarRegiones() {
    try {
        regiones = await regionManager.getRegionesByOrganizacion(
            usuarioActual.organizacionCamelCase,
            usuarioActual
        );
        console.log(`✅ Cargadas ${regiones.length} regiones`);
    } catch (error) {
        console.error('❌ Error cargando regiones:', error);
        regiones = [];
    }
}

// =============================================
// CARGAR SUCURSALES
// =============================================
async function cargarSucursales() {
    try {
        const data = await sucursalManager.getSucursalesByOrganizacion(
            usuarioActual.organizacionCamelCase
        );

        if (data?.length) {
            sucursales = data;

            sucursales.forEach(s => {
                sucursalesMap.set(s.id, s);
            });

            for (const sucursal of sucursales) {
                if (sucursal.latitud && sucursal.longitud) {
                    const lat = parseFloat(sucursal.latitud);
                    const lng = parseFloat(sucursal.longitud);

                    if (lat >= CONFIG.bounds.south && lat <= CONFIG.bounds.north &&
                        lng >= CONFIG.bounds.west && lng <= CONFIG.bounds.east) {
                        const region = await sucursal.getRegion();
                        agregarSucursalAlMapa(sucursal, region);
                    }
                }
            }
            console.log(`✅ Cargadas ${sucursales.length} sucursales`);
        } else {
            console.warn('⚠️ No hay sucursales en Firebase');
        }

        actualizarStats();

    } catch (error) {
        console.error('❌ Error cargando sucursales:', error);
    }
}

// =============================================
// AGREGAR SUCURSAL AL MAPA
// =============================================
function agregarSucursalAlMapa(sucursal, region) {
    if (!mapa) return;

    const colorRegion = region?.color || '#2f8cff';
    const nombreRegion = region?.nombre || 'Sin región';
    const regionId = region?.id || null;

    sucursal.regionId = regionId;
    sucursal.regionNombre = nombreRegion;
    sucursal.regionColor = colorRegion;

    const icono = L.divIcon({
        className: 'marcador-sucursal',
        html: `<i class="fas fa-store" style="color: ${colorRegion}; font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    const direccion = [sucursal.direccion, sucursal.ciudad, sucursal.estado].filter(Boolean).join(', ') || 'Dirección no disponible';
    const telefono = sucursal.contacto ? sucursal.contacto.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : 'No disponible';

    const popupContent = `
        <div style="min-width: 250px;">
            <div style="border-bottom: 2px solid ${colorRegion}; padding-bottom: 5px; margin-bottom: 8px;">
                <i class="fas fa-store" style="color: ${colorRegion};"></i>
                <strong style="color: ${colorRegion};"> ${escapeHTML(sucursal.nombre)}</strong>
            </div>
            <div style="background: ${colorRegion}20; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; margin-bottom: 8px;">
                <i class="fas fa-globe"></i> ${escapeHTML(nombreRegion)}
            </div>
            <div><i class="fas fa-map-pin"></i> ${escapeHTML(direccion)}</div>
            <div><i class="fas fa-phone"></i> ${escapeHTML(telefono)}</div>
            <div><i class="fas fa-tag"></i> ${escapeHTML(sucursal.tipo || 'SUCURSAL')}</div>
        </div>
    `;

    const marcador = L.marker([sucursal.latitud, sucursal.longitud], { icon: icono })
        .bindPopup(popupContent)
        .addTo(mapa);

    marcadores.sucursales[sucursal.id] = marcador;
}

// =============================================
// INICIAR LISTENER DE INCIDENCIAS REALES
// =============================================
function iniciarListenerIncidencias() {
    console.log('📡 Iniciando listener de incidencias reales...');

    try {
        if (!window.db) {
            console.warn('⚠️ db no disponible');
            return;
        }

        import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js").then(({ collection, query, orderBy, limit, where, onSnapshot }) => {
            const collectionName = `incidencias_${usuarioActual.organizacionCamelCase}`;
            console.log(`📁 Escuchando colección: ${collectionName}`);

            // Query para obtener solo incidencias pendientes, ordenadas por fecha
            const incidenciasRef = collection(window.db, collectionName);
            const q = query(
                incidenciasRef,
                where("estado", "==", "pendiente"),
                orderBy("fechaCreacion", "desc"),
                limit(20)
            );

            unsubscribeIncidencias = onSnapshot(q, async (snapshot) => {
                console.log(`📊 Cambio detectado: ${snapshot.docChanges().length} cambios`);

                const nuevasIncidencias = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const fecha = data.fechaCreacion?.toDate?.() || new Date();

                    nuevasIncidencias.push({
                        id: doc.id,
                        sucursalId: data.sucursalId,
                        titulo: data.detalles?.substring(0, 60) || 'Incidencia sin título',
                        descripcion: data.detalles || '',
                        nivelRiesgo: data.nivelRiesgo || 'bajo',
                        estado: data.estado || 'pendiente',
                        fecha: fecha,
                        categoriaId: data.categoriaId,
                        subcategoriaId: data.subcategoriaId,
                        fechaCreacion: fecha
                    });
                });

                // Guardar incidencias
                const incidenciasAnteriores = [...incidencias];
                incidencias = nuevasIncidencias;

                // Detectar nuevas incidencias (comparar por ID)
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const fecha = data.fechaCreacion?.toDate?.() || new Date();

                        const nuevaIncidencia = {
                            id: change.doc.id,
                            sucursalId: data.sucursalId,
                            titulo: data.detalles?.substring(0, 60) || 'Incidencia sin título',
                            descripcion: data.detalles || '',
                            nivelRiesgo: data.nivelRiesgo || 'bajo',
                            fecha: fecha
                        };

                        // Verificar si es realmente nueva (no estaba en la lista anterior)
                        const yaExiste = incidenciasAnteriores.some(inc => inc.id === change.doc.id);

                        if (!yaExiste && incidenciasCargadas) {
                            console.log('🔔 NUEVA INCIDENCIA DETECTADA:', nuevaIncidencia.id);

                            const sucursal = sucursalesMap.get(nuevaIncidencia.sucursalId);
                            if (sucursal) {
                                mostrarNotificacionIncidencia(nuevaIncidencia, sucursal);
                                centrarEnSucursal(sucursal.id);
                            }
                        }
                    }
                });

                // Marcar que ya se cargaron las incidencias iniciales
                incidenciasCargadas = true;

                // Actualizar UI
                actualizarListaIncidencias();
                actualizarStats();

                console.log(`✅ Incidencias cargadas: ${incidencias.length} pendientes`);

            }, (error) => {
                console.error('❌ Error en listener de incidencias:', error);
            });

            console.log('✅ Listener de incidencias activo');
        });

    } catch (error) {
        console.error('❌ Error iniciando listener:', error);
    }
}

// =============================================
// ACTUALIZAR LISTA DE INCIDENCIAS EN EL PANEL
// =============================================
function actualizarListaIncidencias() {
    const container = document.getElementById('listaIncidencias');
    if (!container) return;

    // Tomar solo las últimas 5 incidencias PENDIENTES
    const ultimasIncidencias = incidencias.slice(0, 5);

    if (!ultimasIncidencias.length) {
        container.innerHTML = `
            <div class="no-incidencias">
                <i class="fas fa-check-circle"></i> No hay incidencias pendientes
            </div>
        `;
        const badge = document.getElementById('incidenciasBadge');
        if (badge) badge.textContent = '0';
        return;
    }

    const badge = document.getElementById('incidenciasBadge');
    if (badge) badge.textContent = ultimasIncidencias.length;

    container.innerHTML = ultimasIncidencias.map(inc => {
        const nivel = CONFIG.nivelesRiesgo[inc.nivelRiesgo] || CONFIG.nivelesRiesgo.bajo;
        const sucursal = sucursalesMap.get(inc.sucursalId);
        const sucursalNombre = sucursal?.nombre || 'Sucursal desconocida';

        return `
            <div class="incidencia-item ${inc.nivelRiesgo}" onclick="window.centrarEnSucursal('${inc.sucursalId}')">
                <div class="incidencia-header">
                    <i class="fas ${nivel.icono}" style="color: ${nivel.color};"></i>
                    <span class="incidencia-nivel" style="color: ${nivel.color};">${nivel.texto}</span>
                    <span class="incidencia-fecha">${formatearFecha(inc.fecha)}</span>
                </div>
                <div class="incidencia-titulo">${escapeHTML(inc.titulo)}</div>
                <div class="incidencia-descripcion">${escapeHTML(inc.descripcion.substring(0, 80))}${inc.descripcion.length > 80 ? '...' : ''}</div>
                <div class="incidencia-meta">
                    <span><i class="fas fa-store"></i> ${escapeHTML(sucursalNombre)}</span>
                    <span class="incidencia-estado pendiente">Pendiente</span>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================
// MOSTRAR NOTIFICACIÓN DE NUEVA INCIDENCIA
// =============================================
function mostrarNotificacionIncidencia(incidencia, sucursal) {
    const nivel = CONFIG.nivelesRiesgo[incidencia.nivelRiesgo] || CONFIG.nivelesRiesgo.bajo;

    console.log('🔔 Mostrando notificación para incidencia:', incidencia.id);

    // Notificación con SweetAlert
    Swal.fire({
        title: '🚨 NUEVA INCIDENCIA',
        html: `
            <div style="text-align: left;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <i class="fas ${nivel.icono}" style="color: ${nivel.color}; font-size: 2rem;"></i>
                    <div>
                        <span style="background: ${nivel.color}20; color: ${nivel.color}; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: bold;">
                            ${nivel.texto}
                        </span>
                    </div>
                </div>
                <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 8px;">
                    ${escapeHTML(incidencia.titulo)}
                </div>
                <div style="color: #aaa; margin-bottom: 12px;">
                    ${escapeHTML(incidencia.descripcion.substring(0, 100))}${incidencia.descripcion.length > 100 ? '...' : ''}
                </div>
                <div style="border-top: 1px solid var(--color-border-light); padding-top: 10px;">
                    <div><i class="fas fa-store"></i> <strong>Sucursal:</strong> ${escapeHTML(sucursal?.nombre || 'Desconocida')}</div>
                    <div><i class="fas fa-map-pin"></i> <strong>Ubicación:</strong> ${escapeHTML(sucursal?.ciudad || '')}, ${escapeHTML(sucursal?.estado || '')}</div>
                    <div><i class="fas fa-clock"></i> <strong>Hora:</strong> ${formatearFecha(incidencia.fecha)}</div>
                </div>
            </div>
        `,
        icon: 'warning',
        showConfirmButton: true,
        confirmButtonText: 'VER EN MAPA',
        showCancelButton: true,
        cancelButtonText: 'CERRAR',
        confirmButtonColor: nivel.color,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        didOpen: () => {
            // Reproducir sonido si está disponible
            try {
                const audio = new Audio('/assets/sounds/notificacion.mp3');
                audio.play().catch(e => console.log('Sonido no disponible'));
            } catch (e) {
                console.log('Error reproduciendo sonido');
            }
        }
    }).then((result) => {
        if (result.isConfirmed && sucursal) {
            centrarEnSucursal(sucursal.id);
        }
    });

    // Mostrar notificación toast adicional
    Swal.fire({
        title: `${nivel.texto} - Nueva incidencia`,
        text: `${incidencia.titulo} en ${sucursal?.nombre || 'sucursal desconocida'}`,
        icon: 'warning',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });
}

// =============================================
// CENTRAR EN SUCURSAL
// =============================================
function centrarEnSucursal(sucursalId) {
    const sucursal = sucursalesMap.get(sucursalId);
    if (sucursal && marcadores.sucursales[sucursalId]) {
        mapa.setView([sucursal.latitud, sucursal.longitud], 16);
        marcadores.sucursales[sucursalId].openPopup();

        // Resaltar el marcador temporalmente
        const marker = marcadores.sucursales[sucursalId];
        const originalIcon = marker.getIcon();

        // Crear un efecto de resaltado
        const highlightIcon = L.divIcon({
            className: 'marcador-sucursal highlight',
            html: `<i class="fas fa-store" style="color: ${sucursal.regionColor}; font-size: 2.5rem; filter: drop-shadow(0 0 15px ${sucursal.regionColor});"></i>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        marker.setIcon(highlightIcon);
        setTimeout(() => {
            marker.setIcon(originalIcon);
        }, 2000);
    }
}

window.centrarEnSucursal = centrarEnSucursal;

// =============================================
// ACTUALIZAR ESTADÍSTICAS
// =============================================
function actualizarStats() {
    const criticas = incidencias.filter(i => i.nivelRiesgo === 'critico').length;
    const altas = incidencias.filter(i => i.nivelRiesgo === 'alto').length;
    const medias = incidencias.filter(i => i.nivelRiesgo === 'medio').length;
    const bajas = incidencias.filter(i => i.nivelRiesgo === 'bajo').length;

    const altasMini = document.getElementById('statAltasMini');
    const mediasMini = document.getElementById('statMediasMini');
    const bajasMini = document.getElementById('statBajasMini');
    const sucursalesMini = document.getElementById('statSucursalesMini');

    if (altasMini) altasMini.textContent = criticas + altas;
    if (mediasMini) mediasMini.textContent = medias;
    if (bajasMini) bajasMini.textContent = bajas;
    if (sucursalesMini) sucursalesMini.textContent = sucursales.length;
}

// =============================================
// CARGAR REGIONES EN SELECTOR
// =============================================
async function cargarRegionesEnSelector() {
    const container = document.getElementById('regionList');
    if (!container) return;

    if (!regiones.length) {
        container.innerHTML = '<div class="loading-regions">No hay regiones disponibles</div>';
        return;
    }

    const sucursalesPorRegion = {};
    sucursales.forEach(s => {
        if (s.regionId) {
            sucursalesPorRegion[s.regionId] = (sucursalesPorRegion[s.regionId] || 0) + 1;
        }
    });

    container.innerHTML = regiones.map(region => {
        const count = sucursalesPorRegion[region.id] || 0;
        return `
            <div class="region-option" data-region-id="${region.id}" data-region-name="${escapeHTML(region.nombre)}" data-region-color="${region.color}">
                <div class="region-color-dot" style="background-color: ${region.color};"></div>
                <span class="region-option-name">${escapeHTML(region.nombre)}</span>
                <span class="region-option-count">${count} sucursales</span>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.region-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const regionId = opt.dataset.regionId;
            const regionName = opt.dataset.regionName;
            const regionColor = opt.dataset.regionColor;
            filtrarPorRegion(regionId, regionName, regionColor);
            cerrarDropdown();
        });
    });
}

// =============================================
// CARGAR REGIONES EN LISTA LATERAL
// =============================================
async function cargarRegionesEnLista() {
    const container = document.getElementById('regionesList');
    if (!container) return;

    if (!regiones.length) {
        container.innerHTML = '<div class="no-incidencias" style="padding: 15px;">No hay regiones</div>';
        return;
    }

    const sucursalesPorRegion = {};
    sucursales.forEach(s => {
        if (s.regionId) {
            sucursalesPorRegion[s.regionId] = (sucursalesPorRegion[s.regionId] || 0) + 1;
        }
    });

    container.innerHTML = regiones.map(region => {
        const count = sucursalesPorRegion[region.id] || 0;
        return `
            <div class="region-item">
                <div class="region-color" style="background-color: ${region.color};"></div>
                <span class="region-name">${escapeHTML(region.nombre)}</span>
                <span class="region-count">${count} suc.</span>
            </div>
        `;
    }).join('');
}

// =============================================
// FILTRAR POR REGIÓN
// =============================================
function filtrarPorRegion(regionId, regionName, regionColor) {
    filtros.regionId = regionId;
    filtros.regionNombre = regionName;

    const btn = document.getElementById('btnSeleccionarRegion');
    if (btn) {
        btn.innerHTML = `
            <i class="fas fa-map-marker-alt"></i>
            <span style="background: ${regionColor}20; padding: 2px 8px; border-radius: 20px; color: ${regionColor};">
                ${escapeHTML(regionName)}
            </span>
            <i class="fas fa-chevron-down"></i>
        `;
    }

    mostrarBadgeRegionActiva(regionName, regionColor);

    Object.keys(marcadores.sucursales).forEach(id => {
        const s = sucursales.find(x => x.id === id);
        if (s) {
            if (s.regionId === regionId) {
                if (!mapa.hasLayer(marcadores.sucursales[id])) {
                    marcadores.sucursales[id].addTo(mapa);
                }
            } else {
                if (mapa.hasLayer(marcadores.sucursales[id])) {
                    mapa.removeLayer(marcadores.sucursales[id]);
                }
            }
        }
    });

    const sucursalesRegion = Object.values(marcadores.sucursales).filter((m, idx) => {
        const s = sucursales.find(x => x.id === Object.keys(marcadores.sucursales)[idx]);
        return s && s.regionId === regionId;
    });

    if (sucursalesRegion.length > 0) {
        const grupo = L.featureGroup(sucursalesRegion);
        mapa.fitBounds(grupo.getBounds().pad(0.2));
    }
}

function mostrarTodasLasSucursales() {
    filtros.regionId = null;
    filtros.regionNombre = null;

    const btn = document.getElementById('btnSeleccionarRegion');
    if (btn) {
        btn.innerHTML = `
            <i class="fas fa-map-marker-alt"></i>
            <span>Seleccionar una Región</span>
            <i class="fas fa-chevron-down"></i>
        `;
    }

    ocultarBadgeRegionActiva();

    Object.keys(marcadores.sucursales).forEach(id => {
        if (!mapa.hasLayer(marcadores.sucursales[id])) {
            marcadores.sucursales[id].addTo(mapa);
        }
    });

    const todos = Object.values(marcadores.sucursales);
    if (todos.length > 0) {
        const grupo = L.featureGroup(todos);
        mapa.fitBounds(grupo.getBounds().pad(0.1));
    }
}

function mostrarBadgeRegionActiva(nombre, color) {
    let badge = document.getElementById('regionActiveBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'regionActiveBadge';
        badge.className = 'region-active-badge';
        const fullscreen = document.querySelector('.map-fullscreen');
        if (fullscreen) fullscreen.appendChild(badge);
    }
    badge.innerHTML = `
        <i class="fas fa-map-marker-alt" style="color: ${color};"></i>
        <span>Filtrando por:</span>
        <div class="badge-color" style="background-color: ${color};"></div>
        <strong style="color: ${color};">${escapeHTML(nombre)}</strong>
        <button id="btnQuitarFiltroRegion" style="background: none; border: none; color: #888; cursor: pointer; margin-left: 8px;">
            <i class="fas fa-times-circle"></i>
        </button>
    `;
    badge.style.display = 'flex';

    const btnQuitar = document.getElementById('btnQuitarFiltroRegion');
    if (btnQuitar) {
        btnQuitar.addEventListener('click', mostrarTodasLasSucursales);
    }
}

function ocultarBadgeRegionActiva() {
    const badge = document.getElementById('regionActiveBadge');
    if (badge) badge.style.display = 'none';
}

// =============================================
// CONFIGURAR SELECTOR DE REGIÓN
// =============================================
function configurarSelectorRegion() {
    const btn = document.getElementById('btnSeleccionarRegion');
    const dropdown = document.getElementById('regionDropdown');
    const limpiarBtn = document.getElementById('limpiarFiltroRegion');

    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            btn.classList.toggle('active');
        });
    }

    if (limpiarBtn) {
        limpiarBtn.addEventListener('click', () => {
            mostrarTodasLasSucursales();
            if (dropdown) dropdown.classList.remove('show');
            if (btn) btn.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            btn.classList.remove('active');
        }
    });
}

function cerrarDropdown() {
    const dropdown = document.getElementById('regionDropdown');
    const btn = document.getElementById('btnSeleccionarRegion');
    if (dropdown) dropdown.classList.remove('show');
    if (btn) btn.classList.remove('active');
}

// =============================================
// CENTRAR MAPA
// =============================================
function centrarMapa() {
    if (!mapa) return;
    const todos = [...Object.values(marcadores.incidencias), ...Object.values(marcadores.sucursales)];
    if (todos.length) {
        mapa.fitBounds(L.featureGroup(todos).getBounds().pad(0.1));
    } else {
        mapa.setView(CONFIG.centro, CONFIG.zoom);
    }
}

// =============================================
// REFRESCAR REGIONES
// =============================================
async function refrescarRegiones() {
    try {
        const btn = document.getElementById('btnRefrescarRegiones');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Cargando...</span>';
            btn.disabled = true;
        }

        regiones = await regionManager.getRegionesByOrganizacion(
            usuarioActual.organizacionCamelCase,
            usuarioActual
        );

        await cargarRegionesEnLista();
        await cargarRegionesEnSelector();

        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Actualizar</span>';
            btn.disabled = false;
        }

        Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: `Se cargaron ${regiones.length} regiones`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });

    } catch (error) {
        console.error('Error:', error);
        const btn = document.getElementById('btnRefrescarRegiones');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Actualizar</span>';
            btn.disabled = false;
        }
    }
}

// =============================================
// CONFIGURAR PANELES
// =============================================
function configurarPaneles() {
    // Panel de incidencias
    const incidenciasHeader = document.getElementById('toggleIncidencias');
    const incidenciasList = document.querySelector('.incidencias-list');
    const incidenciasChevron = document.getElementById('incidenciasChevron');

    if (incidenciasHeader && incidenciasList && incidenciasChevron) {
        let incidenciasOpen = true;
        incidenciasHeader.addEventListener('click', () => {
            incidenciasOpen = !incidenciasOpen;
            incidenciasList.style.display = incidenciasOpen ? 'block' : 'none';
            incidenciasChevron.className = incidenciasOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        });
        incidenciasList.style.display = 'block';
    }

    // Panel de regiones
    const regionsHeader = document.getElementById('toggleRegions');
    const regionsPanel = document.getElementById('regionsPanel');
    const regionsList = document.querySelector('.regions-list');
    const regionsChevron = document.getElementById('regionsChevron');

    if (regionsHeader && regionsPanel && regionsList && regionsChevron) {
        let regionsOpen = false;
        regionsHeader.addEventListener('click', () => {
            regionsOpen = !regionsOpen;
            regionsList.style.display = regionsOpen ? 'block' : 'none';
            regionsChevron.className = regionsOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            regionsPanel.style.transform = regionsOpen ? 'translateY(0)' : 'translateY(calc(100% - 45px))';
        });
        regionsList.style.display = 'none';
        regionsPanel.style.transform = 'translateY(calc(100% - 45px))';
    }
}

// =============================================
// CONFIGURAR EVENTOS
// =============================================
function configurarEventos() {
    const btnCentrar = document.getElementById('btnCentrarMapa');
    if (btnCentrar) btnCentrar.addEventListener('click', centrarMapa);

    const btnRefrescar = document.getElementById('btnRefrescarRegiones');
    if (btnRefrescar) btnRefrescar.addEventListener('click', refrescarRegiones);
}

// =============================================
// UTILIDADES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    try {
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        return date.toLocaleString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
    } catch {
        return 'Fecha inválida';
    }
}

function mostrarError(msg) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });
}