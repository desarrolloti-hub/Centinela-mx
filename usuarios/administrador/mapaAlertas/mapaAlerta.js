// mapaAlerta.js - VERSIÓN COMPLETA CON TABLA DE REGIONES Y LÍMITES DE MÉXICO

import { SucursalManager } from '/clases/sucursal.js';
import { RegionManager } from '/clases/region.js';

// =============================================
// CONFIGURACIÓN DEL MAPA - LÍMITES DE MÉXICO
// =============================================
const CONFIG = {
    centro: [23.6345, -102.5528], // Centro de México (cambiado de Guadalajara a centro del país)
    zoom: 6, // Zoom más alejado para ver todo México
    zoomMin: 5, // Zoom mínimo permitido (no deja alejarse más de México)
    zoomMax: 18, // Zoom máximo permitido
    // LÍMITES GEOGRÁFICOS DE MÉXICO
    // Norte: 32.718° (frontera con USA)
    // Sur: 14.532° (frontera con Guatemala)
    // Este: -86.711° (Cancún / Caribe)
    // Oeste: -118.365° (Baja California)
    bounds: {
        north: 32.718,  // Límite norte (frontera USA)
        south: 14.532,  // Límite sur (frontera Guatemala)
        west: -118.365, // Límite oeste (Baja California)
        east: -86.711   // Límite este (Cancún)
    },
    wsUrl: 'ws://localhost:8080/alertas',
    colores: {
        alta: '#ff4444',
        media: '#ffbb33',
        baja: '#00C851'
    }
};

// Estado global
let mapa = null;
let alertas = [];
let sucursales = [];
let regiones = [];
let marcadores = {
    alertas: {},
    sucursales: {}
};
let filtros = {
    severidad: 'todas',
    zona: ''
};
let sucursalManager = null;
let regionManager = null;
let usuarioActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando mapa con colores de región y límites de México...');

    try {
        // 1. Inicializar mapa
        if (!inicializarMapa()) return;

        // 2. Cargar usuario
        cargarUsuario();

        // 3. Inicializar managers
        sucursalManager = new SucursalManager();
        regionManager = new RegionManager();

        // 4. Cargar regiones primero (para tener los colores)
        await cargarRegiones();

        // 5. Cargar sucursales
        await cargarSucursales();

        // 6. Cargar alertas de ejemplo
        cargarAlertasEjemplo();

        // 7. Cargar tabla de regiones
        await cargarRegionesEnTabla();

        // 8. Configurar eventos
        configurarEventos();
        actualizarReloj();

        console.log('✅ Todo listo!');

    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError(error.message);
    }
});

// =============================================
// INICIALIZAR MAPA CON LÍMITES DE MÉXICO
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

        // Crear mapa con límites
        mapa = L.map('mapa', {
            center: CONFIG.centro,
            zoom: CONFIG.zoom,
            minZoom: CONFIG.zoomMin,
            maxZoom: CONFIG.zoomMax,
            // =============================================
            // AQUÍ SE APLICA EL LÍMITE GEOGRÁFICO DE MÉXICO
            // =============================================
            maxBounds: [
                [CONFIG.bounds.south, CONFIG.bounds.west], // Suroeste (esquina inferior izquierda)
                [CONFIG.bounds.north, CONFIG.bounds.east]  // Noreste (esquina superior derecha)
            ],
            maxBoundsViscosity: 1.0 // Qué tan estricto es el límite (1 = no deja salir)
        });

        // Capa base
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap | Centinela-MX'
        }).addTo(mapa);

        // =============================================
        // OPCIÓN: Agregar una capa con los límites visibles (opcional)
        // =============================================
        // Dibujar un rectángulo que muestre los límites de México
        // Comenta esto si no quieres ver el rectángulo
        const mexicoBounds = [
            [CONFIG.bounds.south, CONFIG.bounds.west],
            [CONFIG.bounds.north, CONFIG.bounds.east]
        ];
        L.rectangle(mexicoBounds, {
            color: "#00cfff",
            weight: 2,
            opacity: 0.5,
            fillOpacity: 0,
            dashArray: '5, 5'
        }).addTo(mapa).bindPopup('🌮 Límites de México 🇲🇽');

        console.log('✅ Mapa inicializado con límites de México');
        return true;

    } catch (error) {
        console.error('❌ Error mapa:', error);
        return false;
    }
}

// ========== CARGAR USUARIO ==========
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
            console.log('👤 Usuario:', usuarioActual.nombreCompleto);
        } else {
            // Intentar con userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && userData.organizacionCamelCase) {
                usuarioActual = {
                    id: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || 'Usuario',
                    organizacion: userData.organizacion,
                    organizacionCamelCase: userData.organizacionCamelCase
                };
            } else {
                // Datos por defecto para desarrollo
                usuarioActual = {
                    organizacionCamelCase: 'pollosRay',
                    nombreCompleto: 'Admin'
                };
            }
        }
    } catch (error) {
        console.error('Error cargando usuario:', error);
        usuarioActual = { organizacionCamelCase: 'pollosRay' };
    }
}

// ========== CARGAR REGIONES ==========
async function cargarRegiones() {
    try {
        regiones = await regionManager.getRegionesByOrganizacion(
            usuarioActual.organizacionCamelCase,
            usuarioActual
        );

        console.log(`✅ Cargadas ${regiones.length} regiones`);

        // Mostrar colores en consola para debug
        regiones.forEach(r => {
            console.log(`   - ${r.nombre}: ${r.color}`);
        });

    } catch (error) {
        console.error('❌ Error cargando regiones:', error);
        regiones = [];
    }
}

// ========== CARGAR SUCURSALES ==========
async function cargarSucursales() {
    try {
        const data = await sucursalManager.getSucursalesByOrganizacion(
            usuarioActual.organizacionCamelCase
        );

        if (data?.length) {
            sucursales = data;

            // Cargar la región de cada sucursal (para obtener el color)
            for (const sucursal of sucursales) {
                if (sucursal.latitud && sucursal.longitud) {
                    // =============================================
                    // VALIDAR QUE LAS COORDENADAS ESTÉN DENTRO DE MÉXICO
                    // =============================================
                    const lat = parseFloat(sucursal.latitud);
                    const lng = parseFloat(sucursal.longitud);

                    // Verificar si está dentro de los límites de México
                    if (lat >= CONFIG.bounds.south && lat <= CONFIG.bounds.north &&
                        lng >= CONFIG.bounds.west && lng <= CONFIG.bounds.east) {
                        // Obtener la región de la sucursal
                        const region = await sucursal.getRegion();
                        agregarSucursalAlMapa(sucursal, region);
                    } else {
                        console.warn(`⚠️ Sucursal "${sucursal.nombre}" está fuera de México (${lat}, ${lng})`);
                    }
                }
            }

            console.log(`✅ Cargadas ${sucursales.length} sucursales con colores de región`);
        } else {
            console.log('ℹ️ No hay sucursales, cargando ejemplos');
            cargarSucursalesEjemplo();
        }

        actualizarStats();

    } catch (error) {
        console.error('❌ Error cargando sucursales:', error);
        cargarSucursalesEjemplo();
    }
}

// ========== SUCURSALES DE EJEMPLO (RESPALDO) ==========
function cargarSucursalesEjemplo() {
    // =============================================
    // SUCURSALES DE EJEMPLO DENTRO DE MÉXICO
    // =============================================
    const ejemplos = [
        {
            id: 'suc1',
            nombre: 'Sucursal Centro',
            tipo: 'MATRIZ',
            direccion: 'Av. Juárez 123',
            ciudad: 'Guadalajara',
            estado: 'Jalisco',
            zona: 'Centro',
            contacto: '3312345678',
            latitud: 20.6767,  // Guadalajara - DENTRO DE MÉXICO
            longitud: -103.3475,
            regionId: 'reg1',
            getRegion: async () => ({
                nombre: 'Región Centro',
                color: '#ff4444'
            })
        },
        {
            id: 'suc2',
            nombre: 'Sucursal Chapultepec',
            tipo: 'SUCURSAL',
            direccion: 'Av. Chapultepec 456',
            ciudad: 'Guadalajara',
            estado: 'Jalisco',
            zona: 'Chapultepec',
            contacto: '3398765432',
            latitud: 20.6742,  // Guadalajara - DENTRO DE MÉXICO
            longitud: -103.3645,
            regionId: 'reg2',
            getRegion: async () => ({
                nombre: 'Región Norte',
                color: '#00C851'
            })
        },
        {
            id: 'suc3',
            nombre: 'Sucursal Providencia',
            tipo: 'SUCURSAL',
            direccion: 'Av. Providencia 789',
            ciudad: 'Guadalajara',
            estado: 'Jalisco',
            zona: 'Providencia',
            contacto: '3356781234',
            latitud: 20.7157,  // Guadalajara - DENTRO DE MÉXICO
            longitud: -103.3917,
            regionId: 'reg3',
            getRegion: async () => ({
                nombre: 'Región Sur',
                color: '#2f8cff'
            })
        },
        {
            id: 'suc4',
            nombre: 'Sucursal Monterrey',
            tipo: 'SUCURSAL',
            direccion: 'Av. Constitución 456',
            ciudad: 'Monterrey',
            estado: 'Nuevo León',
            zona: 'Centro',
            contacto: '8123456789',
            latitud: 25.6866,  // Monterrey - DENTRO DE MÉXICO
            longitud: -100.3161,
            regionId: 'reg4',
            getRegion: async () => ({
                nombre: 'Región Norte',
                color: '#ffbb33'
            })
        },
        {
            id: 'suc5',
            nombre: 'Sucursal Cancún',
            tipo: 'SUCURSAL',
            direccion: 'Blvd. Kukulcán 123',
            ciudad: 'Cancún',
            estado: 'Quintana Roo',
            zona: 'Hotelera',
            contacto: '9981234567',
            latitud: 21.1619,  // Cancún - DENTRO DE MÉXICO
            longitud: -86.8515,
            regionId: 'reg5',
            getRegion: async () => ({
                nombre: 'Región Caribe',
                color: '#00cfff'
            })
        }
    ];

    ejemplos.forEach(s => agregarSucursalAlMapa(s, null));
    sucursales = ejemplos;
    console.log('ℹ️ Usando sucursales de ejemplo dentro de México');
}

// ========== AGREGAR SUCURSAL AL MAPA CON COLOR DE REGIÓN ==========
function agregarSucursalAlMapa(sucursal, region) {
    if (!mapa) return;

    // Obtener color de la región o color por defecto
    const colorRegion = region?.color || '#2f8cff';
    const nombreRegion = region?.nombre || 'Sin región';

    // Crear ícono con el color de la región
    const icono = L.divIcon({
        className: 'marcador-sucursal',
        html: `<i class="fas fa-store" style="color: ${colorRegion}; font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Formatear teléfono
    const telefono = sucursal.contacto ?
        sucursal.contacto.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') :
        'No disponible';

    // Dirección completa
    const direccion = [
        sucursal.direccion,
        sucursal.ciudad,
        sucursal.estado,
        sucursal.zona ? `Zona: ${sucursal.zona}` : null
    ].filter(Boolean).join(', ') || 'Dirección no disponible';

    // Tipo de sucursal
    const tipoDisplay = sucursal.tipo ?
        sucursal.tipo.replace(/_/g, ' ').toUpperCase() :
        'SUCURSAL';

    // Fecha de creación formateada
    let fechaCreacion = 'N/A';
    if (sucursal.fechaCreacion) {
        try {
            if (sucursal.fechaCreacion.toDate) {
                fechaCreacion = sucursal.fechaCreacion.toDate().toLocaleDateString('es-MX');
            } else if (sucursal.fechaCreacion instanceof Date) {
                fechaCreacion = sucursal.fechaCreacion.toLocaleDateString('es-MX');
            } else if (typeof sucursal.fechaCreacion === 'string') {
                fechaCreacion = new Date(sucursal.fechaCreacion).toLocaleDateString('es-MX');
            }
        } catch (e) {
            console.warn('Error formateando fecha:', e);
        }
    }

    // Crear popup con el color de la región en el header
    const popupContent = `
        <div class="popup-sucursal">
            <div class="popup-header" style="border-bottom-color: ${colorRegion};">
                <i class="fas fa-store" style="color: ${colorRegion};"></i>
                <span style="color: ${colorRegion};">${escapeHTML(sucursal.nombre)}</span>
            </div>
            
            <div class="region-badge" style="background: ${colorRegion}20; color: ${colorRegion}; border: 1px solid ${colorRegion}40;">
                <i class="fas fa-globe"></i> ${escapeHTML(nombreRegion)}
            </div>
            
            <div class="info-row">
                <i class="fas fa-map-pin" style="color: ${colorRegion};"></i>
                <span>${escapeHTML(direccion)}</span>
            </div>
            
            <div class="info-row">
                <i class="fas fa-phone" style="color: ${colorRegion};"></i>
                <span>${escapeHTML(telefono)}</span>
            </div>
            
            <div class="info-row">
                <i class="fas fa-tag" style="color: ${colorRegion};"></i>
                <span>${escapeHTML(tipoDisplay)}</span>
            </div>
            
            <div class="footer">
                <i class="fas fa-calendar"></i> Creada: ${fechaCreacion}
            </div>
        </div>
    `;

    const marcador = L.marker([sucursal.latitud, sucursal.longitud], { icon: icono })
        .bindPopup(popupContent)
        .addTo(mapa);

    marcadores.sucursales[sucursal.id] = marcador;
}

// ========== CARGAR ALERTAS DE EJEMPLO ==========
function cargarAlertasEjemplo() {
    // =============================================
    // ALERTAS DE EJEMPLO DENTRO DE MÉXICO
    // =============================================
    const ejemplos = [
        {
            id: 'a1',
            titulo: '🔥 Incendio en taller',
            descripcion: 'Fuego en nivel 2',
            lat: 20.6767,
            lng: -103.3475,
            severidad: 'alta',
            zona: 'Centro',
            timestamp: new Date().toISOString()
        },
        {
            id: 'a2',
            titulo: '🚗 Accidente vehicular',
            descripcion: 'Choque entre dos autos',
            lat: 20.6597,
            lng: -103.3496,
            severidad: 'media',
            zona: 'Chapultepec',
            timestamp: new Date().toISOString()
        },
        {
            id: 'a3',
            titulo: '💧 Fuga de agua',
            descripcion: 'Reporte de fuga',
            lat: 20.6427,
            lng: -103.3225,
            severidad: 'baja',
            zona: 'Providencia',
            timestamp: new Date().toISOString()
        },
        {
            id: 'a4',
            titulo: '🚨 Robo en comercio',
            descripcion: 'Alarma activada',
            lat: 25.6866,
            lng: -100.3161,
            severidad: 'alta',
            zona: 'Monterrey',
            timestamp: new Date().toISOString()
        },
        {
            id: 'a5',
            titulo: '🌊 Inundación',
            descripcion: 'Zona afectada por lluvias',
            lat: 21.1619,
            lng: -86.8515,
            severidad: 'media',
            zona: 'Cancún',
            timestamp: new Date().toISOString()
        }
    ];

    ejemplos.forEach(alerta => {
        // =============================================
        // VALIDAR QUE LA ALERTA ESTÉ DENTRO DE MÉXICO
        // =============================================
        if (alerta.lat >= CONFIG.bounds.south && alerta.lat <= CONFIG.bounds.north &&
            alerta.lng >= CONFIG.bounds.west && alerta.lng <= CONFIG.bounds.east) {
            agregarAlerta(alerta);
        } else {
            console.warn(`⚠️ Alerta "${alerta.titulo}" está fuera de México`);
        }
    });
}

// ========== AGREGAR ALERTA ==========
function agregarAlerta(alerta) {
    if (!mapa) return;
    if (marcadores.alertas[alerta.id]) return;

    alertas.push(alerta);

    const icono = L.divIcon({
        className: 'marcador-alerta',
        html: `<i class="fas fa-exclamation-triangle" style="color: ${CONFIG.colores[alerta.severidad]}; font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    const popupContent = `
        <div class="popup-alerta">
            <div class="titulo" style="color: ${CONFIG.colores[alerta.severidad]};">
                <i class="fas fa-exclamation-triangle"></i> ${escapeHTML(alerta.titulo)}
            </div>
            <div style="margin: 8px 0;">${escapeHTML(alerta.descripcion)}</div>
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #888;">
                <span><i class="fas fa-map-pin"></i> ${escapeHTML(alerta.zona || 'Sin zona')}</span>
                <span><i class="fas fa-clock"></i> ${calcularTiempo(alerta.timestamp)}</span>
            </div>
            <div style="margin-top: 5px;">
                <span class="severidad-badge" style="background: ${CONFIG.colores[alerta.severidad]}20; color: ${CONFIG.colores[alerta.severidad]};">
                    ${alerta.severidad.toUpperCase()}
                </span>
            </div>
        </div>
    `;

    const marcador = L.marker([alerta.lat, alerta.lng], { icon: icono })
        .bindPopup(popupContent)
        .addTo(mapa);

    marcadores.alertas[alerta.id] = marcador;
    actualizarLista();
    actualizarStats();
}

// ========== ACTUALIZAR LISTA DE ALERTAS ==========
function actualizarLista() {
    const container = document.getElementById('listaAlertas');
    if (!container) return;

    if (!alertas.length) {
        container.innerHTML = `
            <div class="loading-alertas">
                <i class="fas fa-check-circle" style="color: #00C851;"></i>
                No hay alertas activas en México
                <br>
                <small style="color: #888;">${sucursales.length} sucursales disponibles</small>
            </div>
        `;
        return;
    }

    container.innerHTML = alertas.map(a => `
        <div class="alerta-item ${a.severidad}" onclick="window.centrarEnAlerta('${a.id}')">
            <div class="alerta-titulo">${escapeHTML(a.titulo)}</div>
            <div class="alerta-descripcion">${escapeHTML(a.descripcion)}</div>
            <div class="alerta-meta">
                <span><i class="fas fa-map-pin"></i> ${escapeHTML(a.zona || 'Sin zona')}</span>
                <span><i class="fas fa-clock"></i> ${calcularTiempo(a.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function actualizarStats() {
    document.getElementById('statAltas').textContent = alertas.filter(a => a.severidad === 'alta').length;
    document.getElementById('statMedias').textContent = alertas.filter(a => a.severidad === 'media').length;
    document.getElementById('statBajas').textContent = alertas.filter(a => a.severidad === 'baja').length;
    document.getElementById('statSucursales').textContent = sucursales.length;
    document.getElementById('contadorAlertas').textContent = alertas.length;
}

// ========== CARGAR Y MOSTRAR REGIONES EN TABLA ==========
async function cargarRegionesEnTabla() {
    try {
        const tbody = document.getElementById('regionesTableBody');
        if (!tbody) return;

        // Mostrar loading
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-state">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <h3>Cargando regiones...</h3>
                    </div>
                </td>
            </tr>
        `;

        // Obtener regiones si no las tenemos
        if (!regiones.length) {
            regiones = await regionManager.getRegionesByOrganizacion(
                usuarioActual.organizacionCamelCase,
                usuarioActual
            );
        }

        if (!regiones.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: var(--color-text-dim);">
                        <i class="fas fa-map-marked-alt" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px; display: block;"></i>
                        No hay regiones configuradas
                    </td>
                </tr>
            `;
            return;
        }

        // Contar sucursales por región
        const sucursalesPorRegion = {};
        sucursales.forEach(s => {
            if (s.regionId) {
                sucursalesPorRegion[s.regionId] = (sucursalesPorRegion[s.regionId] || 0) + 1;
            }
        });

        // Renderizar tabla
        tbody.innerHTML = regiones.map(region => {
            const count = sucursalesPorRegion[region.id] || 0;

            // Formatear fecha
            let fecha = 'N/A';
            if (region.fechaCreacion) {
                try {
                    if (region.fechaCreacion.toDate) {
                        fecha = region.fechaCreacion.toDate().toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });
                    } else if (region.fechaCreacion instanceof Date) {
                        fecha = region.fechaCreacion.toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });
                    } else if (typeof region.fechaCreacion === 'string') {
                        fecha = new Date(region.fechaCreacion).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });
                    }
                } catch (e) {
                    console.warn('Error formateando fecha:', e);
                }
            }

            return `
                <tr>
                    <td data-label="COLOR">
                        <div class="region-color-cell">
                            <div class="region-color-sample" style="background-color: ${region.color};"></div>
                            <span class="region-color-hex">${region.color}</span>
                        </div>
                    </td>
                    <td data-label="REGIÓN">
                        <span class="region-name">${escapeHTML(region.nombre)}</span>
                    </td>
                    <td data-label="SUCURSALES">
                        <span class="sucursales-count ${count === 0 ? 'empty' : ''}">${count}</span>
                    </td>
                    <td data-label="FECHA">
                        <span style="color: var(--color-text-dim);">${fecha}</span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando tabla de regiones:', error);
        const tbody = document.getElementById('regionesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #ff4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                        Error al cargar regiones
                    </td>
                </tr>
            `;
        }
    }
}

// ========== REFRESCAR TABLA DE REGIONES ==========
async function refrescarTablaRegiones() {
    try {
        // Mostrar loading en el botón
        const btn = document.getElementById('btnRefrescarRegiones');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        btn.disabled = true;

        // Recargar regiones de Firebase
        regiones = await regionManager.getRegionesByOrganizacion(
            usuarioActual.organizacionCamelCase,
            usuarioActual
        );

        // Actualizar tabla
        await cargarRegionesEnTabla();

        // Restaurar botón
        btn.innerHTML = originalHTML;
        btn.disabled = false;

        // Mostrar notificación
        Swal.fire({
            icon: 'success',
            title: 'Regiones actualizadas',
            text: `Se cargaron ${regiones.length} regiones`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });

    } catch (error) {
        console.error('Error refrescando regiones:', error);

        // Restaurar botón
        const btn = document.getElementById('btnRefrescarRegiones');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refrescar';
            btn.disabled = false;
        }

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron actualizar las regiones',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

// ========== FILTROS ==========
function aplicarFiltros() {
    filtros.severidad = document.getElementById('filtroSeveridad').value;
    filtros.zona = document.getElementById('buscarZona').value.toLowerCase();

    // Filtrar alertas
    Object.keys(marcadores.alertas).forEach(id => {
        const a = alertas.find(x => x.id == id);
        if (a) {
            const okSeveridad = filtros.severidad === 'todas' || a.severidad === filtros.severidad;
            const okZona = !filtros.zona || (a.zona && a.zona.toLowerCase().includes(filtros.zona));

            if (okSeveridad && okZona) {
                if (!mapa.hasLayer(marcadores.alertas[id])) marcadores.alertas[id].addTo(mapa);
            } else {
                if (mapa.hasLayer(marcadores.alertas[id])) mapa.removeLayer(marcadores.alertas[id]);
            }
        }
    });

    // Filtrar sucursales por zona
    Object.keys(marcadores.sucursales).forEach(id => {
        const s = sucursales.find(x => x.id === id);
        if (s) {
            const textoBusqueda = [
                s.nombre,
                s.ciudad,
                s.direccion,
                s.zona
            ].filter(Boolean).join(' ').toLowerCase();

            const okZona = !filtros.zona || textoBusqueda.includes(filtros.zona);

            if (okZona) {
                if (!mapa.hasLayer(marcadores.sucursales[id])) marcadores.sucursales[id].addTo(mapa);
            } else {
                if (mapa.hasLayer(marcadores.sucursales[id])) mapa.removeLayer(marcadores.sucursales[id]);
            }
        }
    });

    actualizarLista();
}

function limpiarFiltros() {
    document.getElementById('filtroSeveridad').value = 'todas';
    document.getElementById('buscarZona').value = '';
    filtros = { severidad: 'todas', zona: '' };
    aplicarFiltros();
}

function centrarMapa() {
    if (!mapa) return;
    const todos = [...Object.values(marcadores.alertas), ...Object.values(marcadores.sucursales)];
    if (todos.length) {
        mapa.fitBounds(L.featureGroup(todos).getBounds().pad(0.1));
    } else {
        mapa.setView(CONFIG.centro, CONFIG.zoom);
    }
}

// ========== FUNCIONES DE CENTRADO ==========
window.centrarEnAlerta = (id) => {
    const a = alertas.find(x => x.id == id);
    if (a && marcadores.alertas[id]) {
        mapa.setView([a.lat, a.lng], 16);
        marcadores.alertas[id].openPopup();
    }
};

window.centrarEnSucursal = (id) => {
    const s = sucursales.find(x => x.id === id);
    if (s && marcadores.sucursales[id]) {
        mapa.setView([s.latitud, s.longitud], 17);
        marcadores.sucursales[id].openPopup();
    }
};

// ========== UTILIDADES ==========
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function calcularTiempo(timestamp) {
    const minutos = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutos < 1) return 'ahora';
    if (minutos === 1) return '1 min';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `${horas}h`;
}

function actualizarReloj() {
    setInterval(() => {
        const el = document.getElementById('ultimaActualizacion');
        if (el) el.textContent = new Date().toLocaleTimeString();
    }, 1000);
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

// ========== CONFIGURAR EVENTOS ==========
function configurarEventos() {
    // Filtros
    document.getElementById('btnAplicarFiltros')?.addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
    document.getElementById('btnCentrarMapa')?.addEventListener('click', centrarMapa);

    // Búsqueda en tiempo real
    document.getElementById('buscarZona')?.addEventListener('input', (e) => {
        filtros.zona = e.target.value.toLowerCase();
        aplicarFiltros();
    });

    // Botón refrescar regiones
    document.getElementById('btnRefrescarRegiones')?.addEventListener('click', refrescarTablaRegiones);
}

// ========== SIMULADOR DE ALERTAS (OPCIONAL) ==========
function iniciarSimuladorAlertas() {
    const zonas = ['Centro', 'Chapultepec', 'Providencia', 'Monterrey', 'Cancún', 'CDMX', 'Tijuana'];
    const severidades = ['alta', 'media', 'baja'];
    const titulos = [
        '🔥 Incendio', '🚗 Accidente', '💧 Fuga', '⚡ Corto circuito',
        '🚨 Robo', '🏥 Emergencia médica', '🐕 Perro agresivo'
    ];

    setInterval(() => {
        // Generar coordenadas dentro de México
        const lat = 19.0 + (Math.random() - 0.5) * 10; // Entre ~14° y ~24°
        const lng = -102.0 + (Math.random() - 0.5) * 15; // Entre ~-109° y ~-95°

        const nuevaAlerta = {
            id: Date.now(),
            titulo: titulos[Math.floor(Math.random() * titulos.length)],
            descripcion: 'Evento detectado en la zona',
            lat: lat,
            lng: lng,
            severidad: severidades[Math.floor(Math.random() * 3)],
            timestamp: new Date().toISOString(),
            zona: zonas[Math.floor(Math.random() * zonas.length)]
        };

        // =============================================
        // VALIDAR QUE LA ALERTA SIMULADA ESTÉ DENTRO DE MÉXICO
        // =============================================
        if (nuevaAlerta.lat >= CONFIG.bounds.south && nuevaAlerta.lat <= CONFIG.bounds.north &&
            nuevaAlerta.lng >= CONFIG.bounds.west && nuevaAlerta.lng <= CONFIG.bounds.east) {
            agregarAlerta(nuevaAlerta);
        }
    }, 15000);
}

// Descomentar para pruebas sin backend real
// iniciarSimuladorAlertas();