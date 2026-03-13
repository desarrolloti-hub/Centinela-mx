import { generadorIPH } from '/components/iph-generator.js';

// =============================================
// VARIABLES GLOBALES - Incidencias Canalizadas
// =============================================
let incidenciaManager = null;
let organizacionActual = null;
let incidenciasCache = [];
let sucursalesCache = [];
let categoriasCache = [];
let subcategoriasCache = [];
let usuariosCache = [];
let authToken = null;

// Configuración del área actual (del usuario logueado)
let areaActual = {
    id: null,
    nombre: 'Cargando...',
    icono: 'fa-layer-group'
};

// Mapeo de áreas a íconos
const ICONOS_AREA = {
    'mantenimiento': 'fa-tools',
    'caja': 'fa-cash-register',
    'rh': 'fa-users',
    'recursos-humanos': 'fa-users',
    'redes': 'fa-network-wired',
    'sistemas': 'fa-laptop-code',
    'seguridad': 'fa-shield-alt',
    'limpieza': 'fa-broom',
    'almacen': 'fa-warehouse',
    'ventas': 'fa-chart-line',
    'compras': 'fa-shopping-cart',
    'default': 'fa-layer-group'
};

// Mapeo de áreas a nombres legibles
const NOMBRES_AREA = {
    'mantenimiento': 'Mantenimiento',
    'caja': 'Caja',
    'rh': 'Recursos Humanos',
    'recursos-humanos': 'Recursos Humanos',
    'redes': 'Redes y Comunicaciones',
    'sistemas': 'Sistemas',
    'seguridad': 'Seguridad',
    'limpieza': 'Limpieza',
    'almacen': 'Almacén',
    'ventas': 'Ventas',
    'compras': 'Compras'
};

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;

// Filtros activos
let filtrosActivos = {
    estado: 'todos',
    nivelRiesgo: 'todos',
    sucursalId: 'todos'
};

// =============================================
// INICIALIZACIÓN
//==============================================
async function inicializarIncidenciaManager() {
    try {
        console.log('🚀 Inicializando módulo de incidencias canalizadas...');

        await obtenerDatosOrganizacion();
        await obtenerTokenAuth();
        await obtenerAreaUsuario();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        // Cargar datos en paralelo
        await Promise.all([
            cargarSucursales().catch(() => { }),
            cargarCategorias().catch(() => { }),
            cargarUsuarios().catch(() => { })
        ]);

        await procesarSubcategoriasDesdeCategorias();
        await cargarIncidenciasCanalizadas();

        // Configurar generador IPH
        if (generadorIPH && typeof generadorIPH.configurar === 'function') {
            generadorIPH.configurar({
                organizacionActual,
                sucursalesCache,
                categoriasCache,
                subcategoriasCache,
                usuariosCache,
                authToken
            });
        }

        configurarEventListeners();
        actualizarInterfazArea();
        actualizarEstadisticas();

        console.log('✅ Módulo de incidencias canalizadas inicializado correctamente');

        return true;

    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

// =============================================
// OBTENER ÁREA DEL USUARIO ACTUAL
// =============================================
async function obtenerAreaUsuario() {
    try {
        console.log('🔍 Obteniendo área del usuario...');

        // Intentar obtener del userManager
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            console.log('Usuario desde userManager:', user);

            areaActual.id = user.area || user.areaId || user.departamento || null;
            areaActual.nombre = user.areaNombre || user.departamentoNombre || formatearNombreArea(areaActual.id);
        }
        // Si no, del localStorage
        else {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

            areaActual.id = userData.area || adminInfo.area || userData.departamento || null;
            areaActual.nombre = userData.areaNombre || adminInfo.areaNombre || formatearNombreArea(areaActual.id);
        }

        // Si no hay área, mostrar mensaje pero permitir continuar
        if (!areaActual.id) {
            console.warn('⚠️ Usuario sin área asignada - Mostrando todas las incidencias canalizadas');
            areaActual.nombre = 'Todas las áreas';
            areaActual.id = 'todas';
        }

        // Asignar ícono según el área
        areaActual.icono = ICONOS_AREA[areaActual.id?.toLowerCase()] || ICONOS_AREA['default'];

        console.log('✅ Área actual:', areaActual);

    } catch (error) {
        console.error('Error obteniendo área del usuario:', error);
        areaActual.nombre = 'Error al cargar área';
        areaActual.id = null;
    }
}

function formatearNombreArea(areaId) {
    if (!areaId) return 'No especificada';

    // Buscar en el mapeo de nombres
    if (NOMBRES_AREA[areaId.toLowerCase()]) {
        return NOMBRES_AREA[areaId.toLowerCase()];
    }

    // Si no está en el mapeo, formatear el ID
    return areaId
        .split('_')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
        .join(' ');
}

function actualizarInterfazArea() {
    // Actualizar elementos de la interfaz
    const areaActualNombre = document.getElementById('areaActualNombre');
    const badgeAreaInfo = document.getElementById('badgeAreaInfo');

    if (areaActualNombre) {
        areaActualNombre.textContent = areaActual.nombre;
    }

    if (badgeAreaInfo) {
        badgeAreaInfo.innerHTML = `<i class="fas ${areaActual.icono}"></i> Canalizadas - ${areaActual.nombre}`;
    }
}

// =============================================
// FUNCIONES DE CARGA DE DATOS
// =============================================
async function obtenerTokenAuth() {
    try {
        if (window.firebase) {
            const user = firebase.auth().currentUser;
            if (user) {
                authToken = await user.getIdToken();
            }
        }
        if (!authToken) {
            const token = localStorage.getItem('firebaseToken') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('token');
            if (token) {
                authToken = token;
            }
        }
    } catch (error) {
        authToken = null;
    }
}

async function obtenerDatosOrganizacion() {
    try {
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            organizacionActual = {
                nombre: user.organizacion || 'Mi Empresa',
                camelCase: user.organizacionCamelCase || ''
            };
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

        organizacionActual = {
            nombre: userData.organizacion || adminInfo.organizacion || 'Mi Empresa',
            camelCase: userData.organizacionCamelCase || adminInfo.organizacionCamelCase || ''
        };

    } catch (error) {
        organizacionActual = { nombre: 'Mi Empresa', camelCase: '' };
    }
}

async function cargarSucursales() {
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();

        if (organizacionActual.camelCase) {
            sucursalesCache = await sucursalManager.getSucursalesByOrganizacion(organizacionActual.camelCase);

            const filtroSucursal = document.getElementById('filtroSucursal');
            if (filtroSucursal) {
                filtroSucursal.innerHTML = '<option value="todos">Todas las sucursales</option>';
                sucursalesCache.forEach(suc => {
                    const option = document.createElement('option');
                    option.value = suc.id;
                    option.textContent = suc.nombre;
                    filtroSucursal.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        sucursalesCache = [];
    }
}

async function cargarCategorias() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        categoriasCache = await categoriaManager.obtenerTodasCategorias();
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categoriasCache = [];
    }
}

async function procesarSubcategoriasDesdeCategorias() {
    try {
        subcategoriasCache = [];

        if (!categoriasCache || categoriasCache.length === 0) {
            return;
        }

        categoriasCache.forEach(categoria => {
            if (categoria.subcategorias) {
                // Caso 1: subcategorias es un Map
                if (categoria.subcategorias instanceof Map) {
                    categoria.subcategorias.forEach((sub, id) => {
                        subcategoriasCache.push({
                            id: id,
                            nombre: sub.nombre || 'Sin nombre',
                            descripcion: sub.descripcion || '',
                            color: sub.color || categoria.color,
                            heredaColor: sub.heredaColor !== false,
                            categoriaId: categoria.id,
                            categoriaNombre: categoria.nombre
                        });
                    });
                }
                // Caso 2: subcategorias es un objeto
                else if (typeof categoria.subcategorias === 'object' && categoria.subcategorias !== null) {
                    Object.keys(categoria.subcategorias).forEach(id => {
                        const sub = categoria.subcategorias[id];
                        subcategoriasCache.push({
                            id: id,
                            nombre: sub.nombre || 'Sin nombre',
                            descripcion: sub.descripcion || '',
                            color: sub.color || categoria.color,
                            heredaColor: sub.heredaColor !== false,
                            categoriaId: categoria.id,
                            categoriaNombre: categoria.nombre
                        });
                    });
                }
                // Caso 3: subcategorias es un array
                else if (Array.isArray(categoria.subcategorias)) {
                    categoria.subcategorias.forEach((sub, index) => {
                        subcategoriasCache.push({
                            id: sub.id || `sub_${categoria.id}_${index}`,
                            nombre: sub.nombre || 'Sin nombre',
                            descripcion: sub.descripcion || '',
                            color: sub.color || categoria.color,
                            heredaColor: sub.heredaColor !== false,
                            categoriaId: categoria.id,
                            categoriaNombre: categoria.nombre
                        });
                    });
                }
            }
        });

    } catch (error) {
        console.error('Error procesando subcategorías:', error);
        subcategoriasCache = [];
    }
}

async function cargarUsuarios() {
    try {
        const modulo = await import('/clases/user.js').catch(() => null);
        if (!modulo) {
            usuariosCache = [];
            return;
        }

        const UsuarioManager = modulo.UsuarioManager || modulo.default || modulo;

        if (typeof UsuarioManager !== 'function') {
            usuariosCache = [];
            return;
        }

        const usuarioManager = new UsuarioManager();

        if (organizacionActual.camelCase && typeof usuarioManager.obtenerUsuariosPorOrganizacion === 'function') {
            usuariosCache = await usuarioManager.obtenerUsuariosPorOrganizacion(organizacionActual.camelCase);
        } else {
            usuariosCache = [];
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usuariosCache = [];
    }
}

// =============================================
// CARGAR INCIDENCIAS CANALIZADAS
// =============================================
async function cargarIncidenciasCanalizadas() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i> Cargando incidencias canalizadas...</td></tr>';

        // Obtener todas las incidencias de la organización
        const todasIncidencias = await incidenciaManager.getIncidenciasByOrganizacion(organizacionActual.camelCase);

        // Filtrar solo las que están canalizadas al área actual
        incidenciasCache = filtrarPorAreaCanalizada(todasIncidencias);

        if (!incidenciasCache || incidenciasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-directions" style="font-size:48px; color:rgba(0,207,255,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay incidencias canalizadas</h5>
                            <p style="color: var(--color-text-dim); margin-bottom: 20px;">
                                No se han encontrado incidencias canalizadas a ${areaActual.nombre}.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        renderizarIncidencias();
        actualizarEstadisticas();

    } catch (error) {
        console.error('Error al cargar incidencias canalizadas:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

// Función para filtrar incidencias por área canalizada
function filtrarPorAreaCanalizada(incidencias) {
    if (!incidencias || !Array.isArray(incidencias)) return [];

    // Si el usuario no tiene área específica, mostrar todas las canalizadas
    if (areaActual.id === 'todas' || !areaActual.id) {
        return incidencias.filter(inc => inc.areaDestino || inc.areaCanalizada);
    }

    // Filtrar por área específica
    return incidencias.filter(inc => {
        // Buscar en diferentes campos donde podría estar el área destino
        const areaDestino = inc.areaDestino ||
            inc.areaCanalizada ||
            inc.departamentoDestino ||
            inc.areaAsignada;

        // Comparar con el área actual (case insensitive)
        if (areaDestino) {
            return areaDestino.toLowerCase() === areaActual.id.toLowerCase();
        }

        return false;
    });
}

// =============================================
// FUNCIONES DE FILTRADO Y RENDERIZADO
// =============================================
function configurarEventListeners() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const btnRefrescar = document.getElementById('btnRefrescar');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltros);
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }

    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', refrescarIncidencias);
    }
}

function aplicarFiltros() {
    filtrosActivos.estado = document.getElementById('filtroEstado')?.value || 'todos';
    filtrosActivos.nivelRiesgo = document.getElementById('filtroRiesgo')?.value || 'todos';
    filtrosActivos.sucursalId = document.getElementById('filtroSucursal')?.value || 'todos';

    paginaActual = 1;
    renderizarIncidencias();
}

function limpiarFiltros() {
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroRiesgo = document.getElementById('filtroRiesgo');
    const filtroSucursal = document.getElementById('filtroSucursal');

    if (filtroEstado) filtroEstado.value = 'todos';
    if (filtroRiesgo) filtroRiesgo.value = 'todos';
    if (filtroSucursal) filtroSucursal.value = 'todos';

    filtrosActivos = {
        estado: 'todos',
        nivelRiesgo: 'todos',
        sucursalId: 'todos'
    };

    paginaActual = 1;
    renderizarIncidencias();
}

async function refrescarIncidencias() {
    const btnRefrescar = document.getElementById('btnRefrescar');
    if (btnRefrescar) {
        btnRefrescar.classList.add('fa-spin');
    }

    await cargarIncidenciasCanalizadas();

    setTimeout(() => {
        if (btnRefrescar) {
            btnRefrescar.classList.remove('fa-spin');
        }
    }, 500);
}

function filtrarIncidencias(incidencias) {
    return incidencias.filter(inc => {
        // Filtro por estado
        if (filtrosActivos.estado !== 'todos' && inc.estado !== filtrosActivos.estado) {
            return false;
        }

        // Filtro por nivel de riesgo
        if (filtrosActivos.nivelRiesgo !== 'todos' && inc.nivelRiesgo !== filtrosActivos.nivelRiesgo) {
            return false;
        }

        // Filtro por sucursal
        if (filtrosActivos.sucursalId !== 'todos' && inc.sucursalId !== filtrosActivos.sucursalId) {
            return false;
        }

        return true;
    });
}

function renderizarIncidencias() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (!tbody) return;

    const incidenciasFiltradas = filtrarIncidencias(incidenciasCache);

    // Ordenar por fecha de canalización (más reciente primero)
    incidenciasFiltradas.sort((a, b) => {
        const fechaA = a.fechaCanalizacion || a.fechaCreacion || a.fechaInicio;
        const fechaB = b.fechaCanalizacion || b.fechaCreacion || b.fechaInicio;
        return new Date(fechaB) - new Date(fechaA);
    });

    const totalItems = incidenciasFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const incidenciasPagina = incidenciasFiltradas.slice(inicio, fin);

    // Actualizar info de paginación
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} incidencias canalizadas`;
    }

    // Limpiar y renderizar
    tbody.innerHTML = '';
    incidenciasPagina.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion(totalPaginas);
    actualizarEstadisticas();
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="window.irPagina(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

window.irPagina = function (pagina) {
    paginaActual = pagina;
    renderizarIncidencias();
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function actualizarEstadisticas() {
    const totalEl = document.getElementById('totalIncidencias');
    const pendientesEl = document.getElementById('pendientesArea');
    const enProcesoEl = document.getElementById('enProcesoArea');

    if (totalEl) {
        totalEl.textContent = incidenciasCache.length;
    }

    if (pendientesEl) {
        const pendientes = incidenciasCache.filter(inc => inc.estado === 'pendiente').length;
        pendientesEl.textContent = pendientes;
    }

    if (enProcesoEl) {
        const enProceso = incidenciasCache.filter(inc => inc.estado === 'en_proceso').length;
        enProcesoEl.textContent = enProceso;
    }
}

// =============================================
// FUNCIÓN PARA CREAR FILA DE INCIDENCIA
// =============================================
function crearFilaIncidencia(incidencia, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'incidencia-row';
    tr.dataset.id = incidencia.id;

    // Obtener textos y colores
    const riesgoTexto = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
    const riesgoColor = incidencia.getNivelRiesgoColor ? incidencia.getNivelRiesgoColor() : '';
    const estadoTexto = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;

    // Formatear fecha de canalización
    const fechaCanalizacion = incidencia.fechaCanalizacion || incidencia.fechaCreacion || incidencia.fechaInicio;
    let fechaFormateada = 'N/A';
    let horaFormateada = '';

    if (fechaCanalizacion) {
        const fecha = fechaCanalizacion.toDate ? fechaCanalizacion.toDate() : new Date(fechaCanalizacion);
        fechaFormateada = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        horaFormateada = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }

    // Obtener origen (quién canalizó)
    const origen = incidencia.usuarioCanalizo || incidencia.creadoPor || 'Sistema';
    const nombreOrigen = obtenerNombreUsuario(origen);

    tr.innerHTML = `
        <td data-label="ID / Folio">
            <span class="incidencia-id" title="${incidencia.id}">${incidencia.id.substring(0, 8)}...</span>
        </td>
        <td data-label="Sucursal">
            <div style="display: flex; align-items: center;">
                <div style="width:4px; height:24px; background:var(--color-accent-primary); border-radius:2px; margin-right:12px; flex-shrink:0;"></div>
                <div>
                    <strong title="${obtenerNombreSucursal(incidencia.sucursalId)}">${obtenerNombreSucursal(incidencia.sucursalId)}</strong>
                </div>
            </div>
        </td>
        <td data-label="Categoría">
            ${obtenerNombreCategoria(incidencia.categoriaId)}
        </td>
        <td data-label="Subcategoría">
            ${obtenerNombreSubcategoria(incidencia.subcategoriaId)}
        </td>
        <td data-label="Riesgo">
            <span class="riesgo-badge ${incidencia.nivelRiesgo}" style="background: ${riesgoColor}20; color: ${riesgoColor}; border-color: ${riesgoColor}40;">
                ${riesgoTexto}
            </span>
        </td>
        <td data-label="Estado">
            <span class="estado-badge ${incidencia.estado}">
                ${estadoTexto}
            </span>
        </td>
        <td data-label="Fecha Canalización">
            <div class="fecha-canalizacion">
                <span class="fecha">${fechaFormateada}</span>
                <span class="hora">${horaFormateada}</span>
            </div>
        </td>
        <td data-label="Origen">
            <span class="origen-badge" title="Canalizado por">
                <i class="fas fa-user"></i> ${nombreOrigen}
            </span>
        </td>
        <td data-label="Acciones">
            <div class="btn-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn" data-action="ver" data-id="${incidencia.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn" data-action="seguimiento" data-id="${incidencia.id}" title="Seguimiento">
                    <i class="fas fa-history"></i>
                </button>
                <button type="button" class="btn" data-action="detalles-canalizacion" data-id="${incidencia.id}" title="Detalles de canalización">
                    <i class="fas fa-directions"></i>
                </button>
                <button type="button" class="btn" data-action="iph" data-id="${incidencia.id}" title="Generar IPH">
                    <i class="fas fa-file-pdf" style="color: #c0392b;"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    // Agregar event listeners después de un pequeño retraso
    setTimeout(() => {
        tr.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'ver':
                        window.verDetallesIncidencia(id, e);
                        break;
                    case 'seguimiento':
                        window.seguimientoIncidencia(id, e);
                        break;
                    case 'detalles-canalizacion':
                        mostrarDetallesCanalizacion(id, e);
                        break;
                    case 'iph':
                        window.generarIPH(id, e);
                        break;
                }
            });
        });
    }, 50);
}

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================
window.verDetallesIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/usuarios/administrador/verIncidencias/verIncidencias.html?id=${incidenciaId}`;
};

window.seguimientoIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/usuarios/administrador/segimientoIncidencias/segimientoIncidencias.html?id=${incidenciaId}`;
};

window.generarIPH = async function (incidenciaId, event) {
    event?.stopPropagation();

    try {
        const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
        if (!incidencia) {
            throw new Error('Incidencia no encontrada');
        }

        if (generadorIPH && typeof generadorIPH.generarIPH === 'function') {
            await generadorIPH.generarIPH(incidencia);
        }
    } catch (error) {
        console.error('Error al generar IPH:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el IPH: ' + error.message
        });
    }
};

// Función para mostrar detalles de canalización
function mostrarDetallesCanalizacion(incidenciaId, event) {
    event?.stopPropagation();

    const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
    if (!incidencia) return;

    const modal = document.getElementById('modalDetallesCanalizacion');
    const modalBody = document.getElementById('modalCanalizacionBody');

    if (!modal || !modalBody) return;

    const fechaCanalizacion = incidencia.fechaCanalizacion || incidencia.fechaCreacion;
    const fecha = fechaCanalizacion ? new Date(fechaCanalizacion).toLocaleString('es-MX') : 'Fecha no disponible';

    const origen = incidencia.usuarioCanalizo || incidencia.creadoPor || 'Sistema';
    const nombreOrigen = obtenerNombreUsuario(origen);
    const cargoOrigen = obtenerCargoUsuario(origen);

    modalBody.innerHTML = `
        <div class="canalizacion-timeline">
            <div class="timeline-item origen">
                <div class="timeline-content">
                    <h6><i class="fas fa-paper-plane"></i> Origen de la canalización</h6>
                    <p><strong>Usuario:</strong> ${nombreOrigen}</p>
                    <p><strong>Cargo:</strong> ${cargoOrigen || 'No especificado'}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                </div>
            </div>
            <div class="timeline-item destino">
                <div class="timeline-content">
                    <h6><i class="fas fa-map-pin"></i> Destino</h6>
                    <p><strong>Área:</strong> ${areaActual.nombre}</p>
                    <p><strong>Motivo:</strong> ${incidencia.motivoCanalizacion || 'Atención requerida'}</p>
                </div>
            </div>
        </div>
        <div class="asignacion-info">
            <p><strong>ID Incidencia:</strong> ${incidencia.id}</p>
            <p><strong>Prioridad:</strong> <span class="riesgo-badge ${incidencia.nivelRiesgo}" style="display:inline-block;">${incidencia.nivelRiesgo}</span></p>
            <p><strong>Estado actual:</strong> <span class="estado-badge ${incidencia.estado}" style="display:inline-block;">${incidencia.estado}</span></p>
        </div>
    `;

    modal.classList.add('show');
}

// Función para cerrar modal
window.cerrarModalCanalizacion = function () {
    const modal = document.getElementById('modalDetallesCanalizacion');
    if (modal) {
        modal.classList.remove('show');
    }
};

// Cerrar modal con click fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalDetallesCanalizacion');
    if (modal && modal.classList.contains('show')) {
        if (!e.target.closest('.modal-content') && !e.target.closest('[data-action="detalles-canalizacion"]')) {
            modal.classList.remove('show');
        }
    }
});

// =============================================
// FUNCIONES AUXILIARES
// =============================================
function obtenerNombreSucursal(sucursalId) {
    if (!sucursalId) return 'No especificada';
    const sucursal = sucursalesCache.find(s => s.id === sucursalId);
    return sucursal ? sucursal.nombre : 'No disponible';
}

function obtenerNombreCategoria(categoriaId) {
    if (!categoriaId) return 'No especificada';
    const categoria = categoriasCache.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'No disponible';
}

function obtenerNombreSubcategoria(subcategoriaId) {
    if (!subcategoriaId) return 'No especificada';
    const subcategoria = subcategoriasCache.find(s => s.id === subcategoriaId);
    return subcategoria ? subcategoria.nombre : 'No disponible';
}

function obtenerNombreUsuario(usuarioId) {
    if (!usuarioId || usuarioId === 'Sistema') return 'Sistema';
    const usuario = usuariosCache.find(u => u.id === usuarioId);
    return usuario ? usuario.nombreCompleto || usuario.email || 'Usuario' : 'Usuario desconocido';
}

function obtenerCargoUsuario(usuarioId) {
    if (!usuarioId) return '';
    const usuario = usuariosCache.find(u => u.id === usuarioId);
    return usuario ? usuario.cargo || '' : '';
}

// =============================================
// FUNCIONES DE ERROR Y UTILIDADES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarError(mensaje) {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error</h5>
                        <p>${escapeHTML(mensaje)}</p>
                        <button class="btn-nueva-incidencia-header" onclick="location.reload()" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function mostrarErrorInicializacion() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error de inicialización</h5>
                        <p>No se pudo cargar el módulo de incidencias canalizadas.</p>
                        <button class="btn-nueva-incidencia-header" onclick="location.reload()" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    await inicializarIncidenciaManager();
});

// Exponer funciones globales necesarias
window.refrescarIncidencias = refrescarIncidencias;
window.mostrarDetallesCanalizacion = mostrarDetallesCanalizacion;