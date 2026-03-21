// incidencias.js - VERSIÓN OPTIMIZADA CON PAGINACIÓN Y CÓDIGO COMPLETO

import { generadorIPH } from '/components/iph-generator.js';
import '/components/visualizadorPDF.js';

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let organizacionActual = null;
let sucursalesCache = [];
let categoriasCache = [];
let subcategoriasCache = [];
let usuariosCache = [];
let authToken = null;

// Configuración de paginación - OPTIMIZADA
const ITEMS_POR_PAGINA = 20;  // 20 por página para mejor rendimiento
let paginaActual = 1;
let totalIncidencias = 0;
let totalPaginas = 0;

// Filtros activos
let filtrosActivos = {
    estado: 'todos',
    nivelRiesgo: 'todos',
    sucursalId: 'todos'
};

// Cache de la última consulta (para evitar recargas innecesarias)
let ultimaConsulta = null;

// =============================================
// FUNCIÓN PARA OBTENER USUARIO ACTUAL
// =============================================
function obtenerUsuarioActual() {
    try {
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
// =============================================
async function inicializarIncidenciaManager() {
    try {
        await obtenerDatosOrganizacion();
        await obtenerTokenAuth();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        // Cargar datos de apoyo (sucursales, categorías, etc.) - estos sí se cargan completos
        await Promise.all([
            cargarSucursales().catch(() => { }),
            cargarCategorias().catch(() => { }),
            cargarSubcategorias().catch(() => { }),
            cargarUsuarios().catch(() => { })
        ]);

        // Cargar primera página de incidencias
        await cargarIncidenciasPagina(1);

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
        if (window.firebase && firebase.auth) {
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
        const usuario = obtenerUsuarioActual();
        if (usuario) {
            organizacionActual = {
                nombre: usuario.organizacion || 'Mi Empresa',
                camelCase: usuario.organizacionCamelCase || ''
            };
            return;
        }

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
    cargarIncidenciasPagina(1);
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
    cargarIncidenciasPagina(1);
}

function construirConstraintsParaConsulta() {
    const constraints = [];

    // Agregar filtros en orden para usar los índices
    if (filtrosActivos.estado !== 'todos') {
        constraints.push({ field: "estado", value: filtrosActivos.estado });
    }

    if (filtrosActivos.sucursalId !== 'todos') {
        constraints.push({ field: "sucursalId", value: filtrosActivos.sucursalId });
    }

    if (filtrosActivos.nivelRiesgo !== 'todos') {
        constraints.push({ field: "nivelRiesgo", value: filtrosActivos.nivelRiesgo });
    }

    return constraints;
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
        // Buscar incidencia en caché o cargar específicamente
        let incidencia = null;
        
        // Intentar obtener de la página actual
        const fila = document.querySelector(`tr[data-id="${incidenciaId}"]`);
        if (fila && fila.incidenciaData) {
            incidencia = fila.incidenciaData;
        }

        if (!incidencia) {
            // Cargar incidencia específica desde Firestore
            incidencia = await incidenciaManager.getIncidenciaById(incidenciaId, organizacionActual.camelCase);
        }

        if (!incidencia) {
            throw new Error('Incidencia no encontrada');
        }

        if (incidencia.pdfUrl) {
            window.visualizadorPDF.abrir(incidencia.pdfUrl, `Incidencia ${incidencia.id}`);
        } else {
            Swal.fire({
                icon: 'info',
                title: 'PDF no disponible',
                text: 'Esta incidencia aún no tiene un PDF generado.'
            });
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

window.generarIPHMultiple = async function () {
    try {
        Swal.fire({
            icon: 'info',
            title: 'Información',
            text: 'Los PDFs se generan automáticamente al crear o modificar incidencias.',
            confirmButtonText: 'Entendido'
        });
    } catch (error) {
        console.error('Error:', error);
    }
};

// =============================================
// CARGAR INCIDENCIAS CON PAGINACIÓN
// =============================================
async function cargarIncidenciasPagina(pagina) {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        if (!tbody) return;

        // Mostrar skeleton loader
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div class="skeleton-loader">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p style="margin-top: 12px; color: var(--color-text-secondary);">Cargando incidencias...</p>
                    </div>
                </td>
            </tr>
        `;

        // Obtener usuario actual
        const usuarioActual = obtenerUsuarioActual();

        // Construir consulta paginada
        const coleccion = `incidencias_${organizacionActual.camelCase}`;
        const incidenciasCollection = collection(db, coleccion);
        
        // Construir constraints según filtros activos
        let constraints = [];
        
        // Siempre filtrar por organización (usando el nombre de la colección)
        // Usar el índice compuesto más específico según los filtros
        
        if (filtrosActivos.estado !== 'todos') {
            constraints.push(where("estado", "==", filtrosActivos.estado));
        }
        
        if (filtrosActivos.sucursalId !== 'todos') {
            constraints.push(where("sucursalId", "==", filtrosActivos.sucursalId));
        }
        
        if (filtrosActivos.nivelRiesgo !== 'todos') {
            constraints.push(where("nivelRiesgo", "==", filtrosActivos.nivelRiesgo));
        }
        
        // Siempre ordenar por fechaCreación descendente
        constraints.push(orderBy("fechaCreacion", "desc"));
        
        // Paginación: calcular offset
        const offset = (pagina - 1) * ITEMS_POR_PAGINA;
        
        // Crear consulta con límite y offset
        let incidenciasQuery;
        
        if (offset === 0) {
            // Primera página
            incidenciasQuery = query(
                incidenciasCollection,
                ...constraints,
                limit(ITEMS_POR_PAGINA)
            );
        } else {
            // Necesitamos un cursor para paginación eficiente
            // Primero obtener el último documento de la página anterior
            const lastDocQuery = query(
                incidenciasCollection,
                ...constraints,
                limit(offset)
            );
            
            const lastDocSnapshot = await getDocs(lastDocQuery);
            const lastDoc = lastDocSnapshot.docs[lastDocSnapshot.docs.length - 1];
            
            if (lastDoc) {
                incidenciasQuery = query(
                    incidenciasCollection,
                    ...constraints,
                    startAfter(lastDoc),
                    limit(ITEMS_POR_PAGINA)
                );
            } else {
                incidenciasQuery = query(
                    incidenciasCollection,
                    ...constraints,
                    limit(ITEMS_POR_PAGINA)
                );
            }
        }
        
        // Registrar lectura para estadísticas
        await consumo.registrarFirestoreLectura(coleccion, `página ${pagina}`);
        
        // Ejecutar consulta
        const snapshot = await getDocs(incidenciasQuery);
        
        // Obtener total de incidencias para paginación
        const totalQuery = query(incidenciasCollection, ...constraints);
        const totalSnapshot = await getDocs(totalQuery);
        totalIncidencias = totalSnapshot.size;
        totalPaginas = Math.ceil(totalIncidencias / ITEMS_POR_PAGINA);
        
        // Convertir a objetos Incidencia
        const incidencias = [];
        snapshot.forEach(doc => {
            try {
                const incidencia = new Incidencia(doc.id, doc.data());
                incidencias.push(incidencia);
            } catch (error) {
                console.error('Error procesando incidencia:', error);
            }
        });
        
        // Actualizar UI
        if (incidencias.length === 0 && pagina === 1) {
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
            return;
        }
        
        renderizarIncidencias(incidencias);
        
    } catch (error) {
        console.error('Error al cargar incidencias:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

function renderizarIncidencias(incidencias) {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (!tbody) return;

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA + 1;
        const fin = Math.min(inicio + incidencias.length - 1, totalIncidencias);
        paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${totalIncidencias} incidencias`;
    }

    tbody.innerHTML = '';

    incidencias.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion();
}

function renderizarPaginacion() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';
    
    // Botón anterior
    html += `
        <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="irPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        </li>
    `;
    
    // Mostrar máximo 5 páginas a la vez
    const maxPagesToShow = 5;
    let startPage = Math.max(1, paginaActual - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPaginas, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="irPagina(1)">1</button>
            </li>
            ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
        `;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="irPagina(${i})">${i}</button>
            </li>
        `;
    }
    
    if (endPage < totalPaginas) {
        html += `
            ${endPage < totalPaginas - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            <li class="page-item">
                <button class="page-link" onclick="irPagina(${totalPaginas})">${totalPaginas}</button>
            </li>
        `;
    }
    
    // Botón siguiente
    html += `
        <li class="page-item ${paginaActual === totalPaginas || totalPaginas === 0 ? 'disabled' : ''}">
            <button class="page-link" onclick="irPagina(${paginaActual + 1})" ${paginaActual === totalPaginas || totalPaginas === 0 ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </li>
    `;
    
    pagination.innerHTML = html;
}

window.irPagina = function (pagina) {
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaActual) return;
    paginaActual = pagina;
    cargarIncidenciasPagina(pagina);
};

function crearFilaIncidencia(incidencia, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'incidencia-row';
    tr.dataset.id = incidencia.id;
    // Guardar referencia de la incidencia para acceso rápido
    tr.incidenciaData = incidencia;

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
            <span class="incidencia-id" title="${incidencia.id}">${incidencia.id.substring(0, 12)}...</span>
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

    setTimeout(() => {
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

// Funciones auxiliares
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