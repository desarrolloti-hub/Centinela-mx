
import generadorIPH from './iph-generator.js';

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let organizacionActual = null;
let incidenciasCache = [];
let sucursalesCache = [];
let categoriasCache = [];
let subcategoriasCache = [];
let usuariosCache = [];
let authToken = null;

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
        await obtenerDatosOrganizacion();
        await obtenerTokenAuth();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        await cargarSucursales();
        await cargarCategorias();
        await cargarSubcategorias();
        await cargarUsuarios();
        await cargarIncidencias();

        // Configurar generador IPH con datos de caché
        generadorIPH.configurar({
            organizacionActual,
            sucursalesCache,
            categoriasCache,
            subcategoriasCache,
            usuariosCache,
            authToken
        });

        configurarEventListeners();
        agregarBotonIPHMultiple();

        return true;
    } catch (error) {
        console.error('Error al inicializar incidencias:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

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
        console.warn('Error obteniendo token:', error);
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

async function cargarSubcategorias() {
    try {
        const { SubcategoriaManager } = await import('/clases/subcategoria.js');
        const subcategoriaManager = new SubcategoriaManager();
        subcategoriasCache = await subcategoriaManager.obtenerTodasSubcategorias();
    } catch (error) {
        console.error('Error cargando subcategorías:', error);
        subcategoriasCache = [];
    }
}

async function cargarUsuarios() {
    try {
        const { UsuarioManager } = await import('/clases/usuario.js');
        const usuarioManager = new UsuarioManager();
        if (organizacionActual.camelCase) {
            usuariosCache = await usuarioManager.obtenerUsuariosPorOrganizacion(organizacionActual.camelCase);
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usuariosCache = [];
    }
}

function configurarEventListeners() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltros);
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
}

// =============================================
// FUNCIONES DE FILTRADO
// =============================================
function aplicarFiltros() {
    filtrosActivos.estado = document.getElementById('filtroEstado').value;
    filtrosActivos.nivelRiesgo = document.getElementById('filtroRiesgo').value;
    filtrosActivos.sucursalId = document.getElementById('filtroSucursal').value;

    paginaActual = 1;
    renderizarIncidencias();
}

function limpiarFiltros() {
    document.getElementById('filtroEstado').value = 'todos';
    document.getElementById('filtroRiesgo').value = 'todos';
    document.getElementById('filtroSucursal').value = 'todos';

    filtrosActivos = {
        estado: 'todos',
        nivelRiesgo: 'todos',
        sucursalId: 'todos'
    };

    paginaActual = 1;
    renderizarIncidencias();
}

function filtrarIncidencias(incidencias) {
    return incidencias.filter(inc => {
        if (filtrosActivos.estado !== 'todos' && inc.estado !== filtrosActivos.estado) {
            return false;
        }

        if (filtrosActivos.nivelRiesgo !== 'todos' && inc.nivelRiesgo !== filtrosActivos.nivelRiesgo) {
            return false;
        }

        if (filtrosActivos.sucursalId !== 'todos' && inc.sucursalId !== filtrosActivos.sucursalId) {
            return false;
        }

        return true;
    });
}

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================
window.verDetallesIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/verIncidencias/verIncidencias.html?id=${incidenciaId}`;
};

window.seguimientoIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/segimientoIncidencias/segimientoIncidencias.html?id=${incidenciaId}`;
};

window.generarIPH = async function (incidenciaId, event) {
    event?.stopPropagation();

    try {
        const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
        if (!incidencia) {
            throw new Error('Incidencia no encontrada');
        }

        await generadorIPH.generarIPH(incidencia);
    } catch (error) {
        console.error('Error al generar IPH:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el IPH: ' + error.message
        });
    }
};

window.generarIPHMultiple = async function () {
    try {
        // Por ahora, como no hay checkboxes, generamos para todas las visibles
        const incidenciasVisibles = incidenciasCache.slice(0, 5); // Limitar a 5

        if (incidenciasVisibles.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin incidencias',
                text: 'No hay incidencias para generar informes.'
            });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Múltiples IPHs',
            text: `Vas a generar ${incidenciasVisibles.length} informes. ¿Continuar?`,
            showCancelButton: true,
            confirmButtonText: 'SÍ, GENERAR',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#1a3b5d'
        });

        if (!confirm.isConfirmed) return;

        await generadorIPH.generarIPHMultiple(incidenciasVisibles);

    } catch (error) {
        console.error('Error generando IPHs múltiples:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
};

// =============================================
// CARGAR INCIDENCIAS
// =============================================
async function cargarIncidencias() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">Cargando incidencias...</td></tr>';

        incidenciasCache = await incidenciaManager.getIncidenciasByOrganizacion(organizacionActual.camelCase);

        if (!incidenciasCache || incidenciasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-exclamation-triangle" style="font-size:48px; color:rgba(255,193,7,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay incidencias registradas</h5>
                            <p style="color: var(--color-text-dim); margin-bottom: 20px;">Comienza registrando la primera incidencia de tu organización.</p>
                            <a href="/users/admin/crearIncidencias/crearIncidencia.html" class="btn-nueva-incidencia-header" style="display:inline-flex; margin-top:16px;">
                                <i class="fas fa-plus-circle"></i> Crear Incidencia
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        renderizarIncidencias();

    } catch (error) {
        console.error('Error al cargar incidencias:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

function renderizarIncidencias() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (!tbody) return;

    const incidenciasFiltradas = filtrarIncidencias(incidenciasCache);

    incidenciasFiltradas.sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : 0;
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : 0;
        return fechaB - fechaA;
    });

    const totalItems = incidenciasFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const incidenciasPagina = incidenciasFiltradas.slice(inicio, fin);

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} incidencias`;
    }

    tbody.innerHTML = '';

    incidenciasPagina.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="irPagina(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

window.irPagina = function (pagina) {
    paginaActual = pagina;
    renderizarIncidencias();
};

function crearFilaIncidencia(incidencia, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'incidencia-row';
    tr.dataset.id = incidencia.id;

    const riesgoTexto = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
    const riesgoColor = incidencia.getNivelRiesgoColor ? incidencia.getNivelRiesgoColor() : '';
    const estadoTexto = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;

    const fechaInicio = incidencia.fechaInicio ?
        (incidencia.fechaInicio.toDate ?
            incidencia.fechaInicio.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
            new Date(incidencia.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })) :
        'N/A';

    tr.innerHTML = `
        <td data-label="ID / Folio">
            <span class="incidencia-id" title="${incidencia.id}">${incidencia.id.substring(0, 8)}...</span>
        </td>
        <td data-label="Sucursal">
            <div style="display: flex; align-items: center;">
                <div style="width:4px; height:24px; background:#00cfff; border-radius:2px; margin-right:12px; flex-shrink:0;"></div>
                <div>
                    <strong title="${obtenerNombreSucursal(incidencia.sucursalId)}">${obtenerNombreSucursal(incidencia.sucursalId)}</strong>
                </div>
            </div>
        </td>
        <td data-label="Categoría">
            <div style="display: flex; align-items: center;">
                <span>${obtenerNombreCategoria(incidencia.categoriaId)}</span>
            </div>
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
        <td data-label="Fecha">
            ${fechaInicio}
        </td>
        <td data-label="Acciones">
            <div class="btn-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn" data-action="ver" data-id="${incidencia.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn" data-action="iph" data-id="${incidencia.id}" title="Generar IPH">
                    <i class="fas fa-file-pdf" style="color: #c0392b;"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="seguimiento" data-id="${incidencia.id}" title="Seguimiento">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    setTimeout(() => {
        tr.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'ver') window.verDetallesIncidencia(id, e);
                else if (action === 'iph') window.generarIPH(id, e);
                else if (action === 'seguimiento') window.seguimientoIncidencia(id, e);
            });
        });
    }, 50);
}

function agregarBotonIPHMultiple() {
    const cardHeader = document.querySelector('.card-header');
    if (cardHeader) {
        const btnIPHMultiple = document.createElement('button');
        btnIPHMultiple.className = 'btn-nueva-incidencia-header';
        btnIPHMultiple.style.marginLeft = '10px';
        btnIPHMultiple.innerHTML = '<i class="fas fa-file-pdf"></i> IPH Múltiple';
        btnIPHMultiple.onclick = window.generarIPHMultiple;

        const btnNueva = cardHeader.querySelector('.btn-nueva-incidencia-header');
        if (btnNueva) {
            btnNueva.parentNode.insertBefore(btnIPHMultiple, btnNueva.nextSibling);
        } else {
            cardHeader.appendChild(btnIPHMultiple);
        }
    }
}

// Funciones auxiliares para obtener nombres
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
    if (!usuarioId) return 'Sistema';
    const usuario = usuariosCache.find(u => u.id === usuarioId);
    return usuario ? usuario.nombreCompleto || usuario.email || 'Usuario' : 'Usuario desconocido';
}

function obtenerCargoUsuario(usuarioId) {
    if (!usuarioId) return '';
    const usuario = usuariosCache.find(u => u.id === usuarioId);
    return usuario ? usuario.cargo || 'No especificado' : '';
}

// =============================================
// UTILIDADES
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
                <td colspan="7" style="text-align:center; padding:40px;">
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
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error de inicialización</h5>
                        <p>No se pudo cargar el módulo de incidencias.</p>
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