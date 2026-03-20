// incidencias.js - VERSIÓN MODIFICADA CON CARGA ASÍNCRONA Y ACTUALIZACIÓN EN TIEMPO REAL

import { generadorIPH } from '/components/iph-generator.js';
import '/components/visualizadorPDF.js'; // Importar visualizador

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

// Referencia a listener de Firebase (para limpiar después)
let unsubscribeListener = null;

// =============================================
// FUNCIÓN PARA OBTENER USUARIO ACTUAL DESDE LOCALSTORAGE
// =============================================
function obtenerUsuarioActual() {
    try {
        // Intentar desde adminInfo
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const adminData = JSON.parse(adminInfo);
            return {
                id: adminData.id || adminData.uid,
                uid: adminData.uid || adminData.id,
                nombreCompleto: adminData.nombreCompleto || 'Administrador',
                organizacion: adminData.organizacion,
                organizacionCamelCase: adminData.organizacionCamelCase,
                correo: adminData.correoElectronico || '',
                email: adminData.correoElectronico || ''
            };
        }

        // Intentar desde userData
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            return {
                id: userData.uid || userData.id,
                uid: userData.uid || userData.id,
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                organizacion: userData.organizacion || userData.empresa,
                organizacionCamelCase: userData.organizacionCamelCase,
                correo: userData.correo || userData.email || '',
                email: userData.correo || userData.email || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return null;
    }
}

// =============================================
// INICIALIZACIÓN
//==============================================
async function inicializarIncidenciaManager() {
    try {
        await obtenerDatosOrganizacion();
        await obtenerTokenAuth();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        // Mostrar carga inicial
        mostrarCargando();

        // Cargar datos en paralelo
        await Promise.all([
            cargarSucursales().catch(() => { }),
            cargarCategorias().catch(() => { }),
            cargarSubcategorias().catch(() => { }),
            cargarUsuarios().catch(() => { })
        ]);

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

        // Configurar listener en tiempo real
        configurarListenerTiempoReal();

        configurarEventListeners();
        agregarBotonIPHMultiple();

        return true;
    } catch (error) {
        console.error('Error al inicializar incidencias:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

function mostrarCargando() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p style="margin-top: 10px;">Cargando incidencias...</p>
                </td>
            </tr>
        `;
    }
}

// ✅ NUEVO: Configurar listener en tiempo real para actualizaciones automáticas
function configurarListenerTiempoReal() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        console.warn('No se puede configurar listener sin organizacion');
        return;
    }

    // Limpiar listener anterior si existe
    if (unsubscribeListener && typeof unsubscribeListener === 'function') {
        unsubscribeListener();
    }

    // Configurar listener con el manager
    if (typeof incidenciaManager.suscribirIncidencias === 'function') {
        const usuarioActual = obtenerUsuarioActual();

        unsubscribeListener = incidenciaManager.suscribirIncidencias(
            organizacionActual.camelCase,
            (nuevasIncidencias) => {
                console.log('🔄 Actualización en tiempo real recibida:', nuevasIncidencias.length);

                // Actualizar cache
                incidenciasCache = nuevasIncidencias;

                // Re-renderizar tabla
                renderizarIncidencias();

                // Mostrar notificación silenciosa (opcional)
                if (document.hidden === false) {
                    // Si la página está visible, solo actualiza sin notificar
                    console.log('✅ Tabla actualizada automáticamente');
                }
            },
            usuarioActual,
            (error) => {
                console.error('Error en listener de incidencias:', error);
                // Si hay error, intentar recargar manualmente
                setTimeout(() => cargarIncidencias(), 5000);
            }
        );
    } else {
        // Fallback: recargar cada 30 segundos si no hay listener
        console.warn('⚠️ No hay método suscribirIncidencias, usando polling cada 30s');
        setInterval(() => cargarIncidencias(), 30000);
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
        authToken = null;
    }
}

async function obtenerDatosOrganizacion() {
    try {
        // Primero intentar con usuario actual de localStorage
        const usuario = obtenerUsuarioActual();
        if (usuario) {
            organizacionActual = {
                nombre: usuario.organizacion || 'Mi Empresa',
                camelCase: usuario.organizacionCamelCase || ''
            };
            return;
        }

        // Si no, intentar con window.userManager
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
                const valorActual = filtroSucursal.value;
                filtroSucursal.innerHTML = '<option value="todos">Todas las sucursales</option>';
                sucursalesCache.forEach(suc => {
                    const option = document.createElement('option');
                    option.value = suc.id;
                    option.textContent = suc.nombre;
                    filtroSucursal.appendChild(option);
                });
                // Restaurar valor si existía
                if (valorActual && valorActual !== 'todos') {
                    if (sucursalesCache.some(s => s.id === valorActual)) {
                        filtroSucursal.value = valorActual;
                    }
                }
            }
        }
    } catch (error) {
        sucursalesCache = [];
    }
}

async function cargarCategorias() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        categoriasCache = await categoriaManager.obtenerTodasCategorias();
    } catch (error) {
        categoriasCache = [];
    }
}

async function cargarSubcategorias() {
    try {
        const modulo = await import('/clases/subcategoria.js').catch(() => null);
        if (!modulo) {
            subcategoriasCache = [];
            return;
        }

        const SubcategoriaManager = modulo.SubcategoriaManager || modulo.default;
        if (!SubcategoriaManager) {
            subcategoriasCache = [];
            return;
        }

        const subcategoriaManager = new SubcategoriaManager();

        if (organizacionActual?.camelCase) {
            subcategoriasCache = await subcategoriaManager.obtenerSubcategoriasPorOrganizacion?.(organizacionActual.camelCase) || [];
        } else {
            subcategoriasCache = await subcategoriaManager.obtenerTodasSubcategorias?.() || [];
        }
    } catch (error) {
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
    window.location.href = `../verIncidencias/verIncidencias.html?id=${incidenciaId}`;
};

window.seguimientoIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `../seguimientoIncidencias/seguimientoIncidencias.html?id=${incidenciaId}`;
};

window.verPDF = async function (incidenciaId, event) {
    event?.stopPropagation();

    try {
        const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
        if (!incidencia) {
            throw new Error('Incidencia no encontrada');
        }

        if (incidencia.pdfUrl) {
            window.visualizadorPDF.abrir(incidencia.pdfUrl, `Incidencia ${incidencia.id}`);
        } else {
            Swal.fire({
                icon: 'info',
                title: 'PDF no disponible',
                text: 'Esta incidencia aún no tiene un PDF generado. Se generará automáticamente en breve.'
            });

            if (generadorIPH && typeof generadorIPH.generarIPH === 'function') {
                const confirm = await Swal.fire({
                    title: '¿Generar PDF?',
                    text: '¿Deseas generar el PDF ahora?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'SÍ, GENERAR',
                    cancelButtonText: 'CANCELAR'
                });

                if (confirm.isConfirmed) {
                    await generadorIPH.generarIPH(incidencia);
                    // Recargar incidencia para obtener el pdfUrl
                    await cargarIncidencias();
                }
            }
        }
    } catch (error) {
        console.error('Error al abrir PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo abrir el PDF: ' + error.message
        });
    }
};

window.generarIPH = window.verPDF;

window.generarIPHMultiple = async function () {
    try {
        const incidenciasVisibles = incidenciasCache.slice(0, 5);

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

        if (generadorIPH && typeof generadorIPH.generarIPHMultiple === 'function') {
            await generadorIPH.generarIPHMultiple(incidenciasVisibles);
        }

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
// CARGAR INCIDENCIAS (carga inicial)
// =============================================
async function cargarIncidencias() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        if (!tbody) return;

        const usuarioActual = obtenerUsuarioActual();

        console.log('📤 Cargando incidencias, usuario:', usuarioActual ? usuarioActual.nombreCompleto : 'NO HAY USUARIO');

        incidenciasCache = await incidenciaManager.getIncidenciasByOrganizacion(
            organizacionActual.camelCase,
            {},
            usuarioActual
        );

        console.log('📥 Incidencias cargadas:', incidenciasCache.length);

        if (!incidenciasCache || incidenciasCache.length === 0) {
            mostrarSinIncidencias(tbody);
            return;
        }

        renderizarIncidencias();

    } catch (error) {
        console.error('Error al cargar incidencias:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

function mostrarSinIncidencias(tbody) {
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:rgba(255,193,7,0.3); margin-bottom:16px;"></i>
                    <h5 style="color:white;">No hay incidencias registradas</h5>
                    <p style="color: var(--color-text-dim); margin-bottom: 20px;">Comienza registrando la primera incidencia de tu organización.</p>
                    <a href="../crearIncidencias/crearIncidencias.html" class="btn-nueva-incidencia-header" style="display:inline-flex; margin-top:16px;">
                        <i class="fas fa-plus-circle"></i> Crear Incidencia
                    </a>
                </div>
            </td>
        </tr>
    `;
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
        if (totalItems === 0) {
            paginationInfo.textContent = `No hay incidencias`;
        } else {
            paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} incidencias`;
        }
    }

    tbody.innerHTML = '';

    if (incidenciasPagina.length === 0 && totalItems > 0) {
        // Si no hay incidencias en esta página pero hay en total, resetear a página 1
        if (paginaActual > 1) {
            paginaActual = 1;
            renderizarIncidencias();
            return;
        }
    }

    incidenciasPagina.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalPaginas <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Botón anterior
    if (paginaActual > 1) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="irPagina(${paginaActual - 1})">«</button>
            </li>
        `;
    }

    // Números de página
    const startPage = Math.max(1, paginaActual - 2);
    const endPage = Math.min(totalPaginas, paginaActual + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="irPagina(${i})">${i}</button>
            </li>
        `;
    }

    // Botón siguiente
    if (paginaActual < totalPaginas) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="irPagina(${paginaActual + 1})">»</button>
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
                <button type="button" class="btn" data-action="pdf" data-id="${incidencia.id}" title="Ver PDF">
                    <i class="fas fa-file-pdf" style="color: #c0392b;"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="seguimiento" data-id="${incidencia.id}" title="Seguimiento">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    // Agregar event listeners directamente
    tr.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'ver') window.verDetallesIncidencia(id, e);
            else if (action === 'pdf') window.verPDF(id, e);
            else if (action === 'seguimiento') window.seguimientoIncidencia(id, e);
        });
    });
}

function agregarBotonIPHMultiple() {
    const cardHeader = document.querySelector('.card-header');
    if (cardHeader) {
        // Verificar si ya existe para no duplicar
        if (cardHeader.querySelector('.btn-iph-multiple')) return;

        const btnIPHMultiple = document.createElement('button');
        btnIPHMultiple.className = 'btn-nueva-incidencia-header btn-iph-multiple';
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