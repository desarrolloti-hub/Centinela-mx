// incidencias.js - VERSIÓN CON PAGINACIÓN REAL EN FIRESTORE

import { generadorIPH } from '/components/iph-generator.js';
import '/components/visualizadorPDF.js';

// =============================================
// IMPORTAR FIRESTORE DIRECTAMENTE PARA PAGINACIÓN
// =============================================
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';
import { Incidencia } from '/clases/incidencia.js';
import consumo from '/clases/consumoFirebase.js';

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

// Configuración de paginación REAL
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;
let totalIncidencias = 0;
let totalPaginas = 0;
let ultimoDocumento = null; // Para paginación con cursor
let primerDocumento = null; // Para paginación hacia atrás
let incidenciasActuales = []; // Solo las incidencias de la página actual

// Filtros activos
let filtrosActivos = {
    estado: 'todos',
    nivelRiesgo: 'todos',
    sucursalId: 'todos'
};

// Cache de consultas para evitar recargas innecesarias
let ultimaConsultaHash = '';

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
// GENERAR HASH DE CONSULTA PARA CACHÉ
// =============================================
function generarConsultaHash() {
    return JSON.stringify({
        estado: filtrosActivos.estado,
        nivelRiesgo: filtrosActivos.nivelRiesgo,
        sucursalId: filtrosActivos.sucursalId,
        pagina: paginaActual
    });
}

// =============================================
// CONSTRUIR CONSTRAINTS DE CONSULTA
// =============================================
function construirConstraints() {
    const constraints = [];
    
    // Ordenar por fechaCreacion descendente (SIEMPRE)
    constraints.push(orderBy("fechaCreacion", "desc"));
    
    // Agregar filtros en orden para usar índices
    if (filtrosActivos.estado !== 'todos') {
        constraints.push(where("estado", "==", filtrosActivos.estado));
    }
    
    if (filtrosActivos.sucursalId !== 'todos') {
        constraints.push(where("sucursalId", "==", filtrosActivos.sucursalId));
    }
    
    if (filtrosActivos.nivelRiesgo !== 'todos') {
        constraints.push(where("nivelRiesgo", "==", filtrosActivos.nivelRiesgo));
    }
    
    return constraints;
}

// =============================================
// CONTAR TOTAL DE INCIDENCIAS CON FILTROS
// =============================================
async function contarTotalIncidencias() {
    try {
        const collectionName = `incidencias_${organizacionActual.camelCase}`;
        const incidenciasCollection = collection(db, collectionName);
        
        const constraints = construirConstraints();
        
        // Quitar el orderBy para el conteo (más eficiente)
        const constraintsSinOrder = constraints.filter(c => c.type !== 'orderBy');
        
        const q = query(incidenciasCollection, ...constraintsSinOrder);
        const snapshot = await getCountFromServer(q);
        
        return snapshot.data().count;
    } catch (error) {
        console.error('Error contando incidencias:', error);
        // Fallback: obtener todas (solo si es necesario)
        return 0;
    }
}

// =============================================
// CARGAR INCIDENCIAS CON PAGINACIÓN REAL
// =============================================
async function cargarIncidenciasPagina(pagina) {
    if (!organizacionActual?.camelCase) {
        console.error('No hay organización configurada');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        if (!tbody) return;

        // Mostrar loader
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p style="margin-top: 12px; color: var(--color-text-secondary);">Cargando incidencias...</p>
                </td>
            </tr>
        `;

        const collectionName = `incidencias_${organizacionActual.camelCase}`;
        const incidenciasCollection = collection(db, collectionName);
        
        // Construir consulta con filtros
        let constraints = construirConstraints();
        
        // Si no es la primera página, usar startAfter
        if (pagina > 1 && ultimoDocumento) {
            constraints.push(startAfter(ultimoDocumento));
        }
        
        // Limitar resultados
        constraints.push(limit(ITEMS_POR_PAGINA));
        
        const q = query(incidenciasCollection, ...constraints);
        
        // Registrar lectura para estadísticas
        await consumo.registrarFirestoreLectura(collectionName, `página ${pagina}`);
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty && pagina === 1) {
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
        
        // Guardar último documento para la siguiente página
        if (snapshot.docs.length > 0) {
            ultimoDocumento = snapshot.docs[snapshot.docs.length - 1];
            
            // Si es página 1, guardar primer documento para navegación
            if (pagina === 1 && snapshot.docs.length > 0) {
                primerDocumento = snapshot.docs[0];
            }
        }
        
        // Obtener total de incidencias (solo la primera vez o cuando cambian filtros)
        const hashActual = generarConsultaHash();
        if (hashActual !== ultimaConsultaHash) {
            totalIncidencias = await contarTotalIncidencias();
            totalPaginas = Math.ceil(totalIncidencias / ITEMS_POR_PAGINA);
            ultimaConsultaHash = hashActual;
        }
        
        // Convertir a objetos Incidencia
        incidenciasActuales = [];
        snapshot.forEach(doc => {
            try {
                const data = doc.data();
                const incidencia = new Incidencia(doc.id, {
                    ...data,
                    id: doc.id,
                    fechaCreacion: data.fechaCreacion?.toDate?.() || data.fechaCreacion,
                    fechaInicio: data.fechaInicio?.toDate?.() || data.fechaInicio,
                    fechaActualizacion: data.fechaActualizacion?.toDate?.() || data.fechaActualizacion
                });
                incidenciasActuales.push(incidencia);
            } catch (error) {
                console.error('Error procesando incidencia:', error);
            }
        });
        
        // Renderizar
        renderizarIncidencias();
        
    } catch (error) {
        console.error('Error cargando incidencias:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

function renderizarIncidencias() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (!tbody) return;

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA + 1;
        const fin = Math.min(inicio + incidenciasActuales.length - 1, totalIncidencias);
        
        if (totalIncidencias > 0) {
            paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${totalIncidencias} incidencias`;
        } else {
            paginationInfo.textContent = `Mostrando 0 de 0 incidencias`;
        }
    }

    tbody.innerHTML = '';

    incidenciasActuales.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion();
}

function renderizarPaginacion() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalPaginas <= 1) {
        pagination.innerHTML = '';
        return;
    }

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
    
    // Si vamos a una página anterior, necesitamos reiniciar la consulta
    if (pagina < paginaActual) {
        // Reiniciar cursor para ir a página anterior (requiere nueva consulta desde inicio)
        ultimoDocumento = null;
        paginaActual = pagina;
        
        // Para ir a página anterior, cargamos desde el inicio con el nuevo límite
        cargarDesdeInicioPagina(pagina);
    } else {
        paginaActual = pagina;
        cargarIncidenciasPagina(pagina);
    }
};

// Función para cargar una página específica desde el inicio
async function cargarDesdeInicioPagina(pagina) {
    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p style="margin-top: 12px;">Cargando página ${pagina}...</p>
                    </td>
                </tr>
            `;
        }
        
        const collectionName = `incidencias_${organizacionActual.camelCase}`;
        const incidenciasCollection = collection(db, collectionName);
        
        let constraints = construirConstraints();
        constraints.push(limit((pagina - 1) * ITEMS_POR_PAGINA + ITEMS_POR_PAGINA));
        
        const q = query(incidenciasCollection, ...constraints);
        const snapshot = await getDocs(q);
        
        if (snapshot.docs.length > 0) {
            // Obtener los documentos de la página deseada
            const startIndex = (pagina - 1) * ITEMS_POR_PAGINA;
            const docsPagina = snapshot.docs.slice(startIndex, startIndex + ITEMS_POR_PAGINA);
            
            if (docsPagina.length > 0) {
                ultimoDocumento = docsPagina[docsPagina.length - 1];
                
                incidenciasActuales = [];
                docsPagina.forEach(doc => {
                    try {
                        const data = doc.data();
                        const incidencia = new Incidencia(doc.id, {
                            ...data,
                            id: doc.id,
                            fechaCreacion: data.fechaCreacion?.toDate?.() || data.fechaCreacion,
                            fechaInicio: data.fechaInicio?.toDate?.() || data.fechaInicio,
                            fechaActualizacion: data.fechaActualizacion?.toDate?.() || data.fechaActualizacion
                        });
                        incidenciasActuales.push(incidencia);
                    } catch (error) {
                        console.error('Error procesando incidencia:', error);
                    }
                });
                
                renderizarIncidencias();
            } else {
                // No hay incidencias en esta página
                cargarIncidenciasPagina(1);
            }
        } else {
            cargarIncidenciasPagina(1);
        }
        
    } catch (error) {
        console.error('Error cargando página desde inicio:', error);
        cargarIncidenciasPagina(1);
    }
}

// =============================================
// FUNCIONES DE FILTRADO (re-carga con nuevos filtros)
// =============================================
function aplicarFiltros() {
    filtrosActivos.estado = document.getElementById('filtroEstado')?.value || 'todos';
    filtrosActivos.nivelRiesgo = document.getElementById('filtroRiesgo')?.value || 'todos';
    filtrosActivos.sucursalId = document.getElementById('filtroSucursal')?.value || 'todos';
    
    // Reiniciar paginación
    paginaActual = 1;
    ultimoDocumento = null;
    primerDocumento = null;
    ultimaConsultaHash = '';
    
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
    
    // Reiniciar paginación
    paginaActual = 1;
    ultimoDocumento = null;
    primerDocumento = null;
    ultimaConsultaHash = '';
    
    cargarIncidenciasPagina(1);
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
        const incidencia = incidenciasActuales.find(i => i.id === incidenciaId);
        
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
// CARGAR DATOS DE APOYO
// =============================================
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
        console.error('Error cargando subcategorías:', error);
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
            console.log('📌 Organización:', organizacionActual);
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

// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================
async function inicializarIncidenciaManager() {
    try {
        await obtenerDatosOrganizacion();
        await obtenerTokenAuth();

        // No necesitamos incidenciaManager para la paginación, solo para operaciones
        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        // Cargar datos de apoyo (sucursales, categorías, etc.)
        await Promise.all([
            cargarSucursales().catch(() => { console.warn('Error cargando sucursales'); }),
            cargarCategorias().catch(() => { console.warn('Error cargando categorías'); }),
            cargarSubcategorias().catch(() => { console.warn('Error cargando subcategorías'); }),
            cargarUsuarios().catch(() => { console.warn('Error cargando usuarios'); })
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

        configurarEventListeners();
        agregarBotonIPHMultiple();
        
        // Cargar primera página
        await cargarIncidenciasPagina(1);

        return true;
    } catch (error) {
        console.error('Error al inicializar incidencias:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    await inicializarIncidenciaManager();
});