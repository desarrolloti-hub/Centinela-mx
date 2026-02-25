/**
 * INCIDENCIAS - Sistema Centinela
 * Basado en la estructura de categorías
 * USANDO IncidenciaManager en lugar de Incidencia estática
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let incidenciaExpandidaId = null;
let organizacionActual = null;
let incidenciasCache = [];
let sucursalesCache = [];
let categoriasCache = [];

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

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        await cargarSucursales();
        await cargarCategorias();
        await cargarIncidencias();
        
        configurarEventListeners();
        
        return true;
    } catch (error) {
        console.error('Error al inicializar incidencias:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

async function obtenerDatosOrganizacion() {
    try {
        // Intentar obtener de userManager primero
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            organizacionActual = {
                nombre: user.organizacion || 'Mi Empresa',
                camelCase: user.organizacionCamelCase || ''
            };
            return;
        }

        // Fallback a localStorage
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
            
            // Llenar el filtro de sucursales
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

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================
window.verDetallesIncidencia = async function (incidenciaId, event) {
    event?.stopPropagation();

    const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
    if (!incidencia) return;

    // Obtener datos relacionados
    const sucursal = sucursalesCache.find(s => s.id === incidencia.sucursalId);
    const categoria = categoriasCache.find(c => c.id === incidencia.categoriaId);

    const fechaInicio = incidencia.getFechaInicioFormateada ? 
        incidencia.getFechaInicioFormateada() : 
        new Date(incidencia.fechaInicio).toLocaleString('es-MX');

    const fechaFinalizacion = incidencia.fechaFinalizacion ? 
        (incidencia.getFechaFinalizacionFormateada ? 
            incidencia.getFechaFinalizacionFormateada() : 
            new Date(incidencia.fechaFinalizacion).toLocaleString('es-MX')) : 
        'No finalizada';

    const riesgoColor = incidencia.getNivelRiesgoColor ? 
        incidencia.getNivelRiesgoColor() : 
        (incidencia.nivelRiesgo === 'critico' ? '#dc3545' : 
         incidencia.nivelRiesgo === 'alto' ? '#fd7e14' : 
         incidencia.nivelRiesgo === 'medio' ? '#ffc107' : '#28a745');

    Swal.fire({
        title: `Incidencia: ${incidencia.id}`,
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-info-circle" style="margin-right: 8px;"></i>INFORMACIÓN GENERAL
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <p style="margin: 5px 0;"><strong>Sucursal:</strong></p>
                            <p style="color: var(--color-text-secondary);">${sucursal ? sucursal.nombre : 'No disponible'}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Categoría:</strong></p>
                            <p style="color: var(--color-text-secondary);">${categoria ? categoria.nombre : incidencia.categoriaId || 'No disponible'}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Subcategoría:</strong></p>
                            <p style="color: var(--color-text-secondary);">${incidencia.subcategoriaId || 'No especificada'}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Reportado por ID:</strong></p>
                            <p style="color: var(--color-text-secondary);">${incidencia.reportadoPorId || 'No disponible'}</p>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-align-left" style="margin-right: 8px;"></i>DETALLES
                    </h4>
                    <p style="color: var(--color-text-secondary); margin: 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
                        ${escapeHTML(incidencia.detalles) || 'No hay detalles disponibles.'}
                    </p>
                </div>

                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>RIESGO Y ESTADO
                    </h4>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>
                            <p style="margin: 5px 0;"><strong>Nivel de Riesgo:</strong></p>
                            <span class="riesgo-badge ${incidencia.nivelRiesgo}" style="background: ${riesgoColor}20; color: ${riesgoColor}; border-color: ${riesgoColor}40;">
                                <i class="fas fa-exclamation-circle"></i>
                                ${incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo}
                            </span>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Estado:</strong></p>
                            <span class="estado-badge ${incidencia.estado}">
                                <i class="fas ${incidencia.estado === 'finalizada' ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado}
                            </span>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-calendar-alt" style="margin-right: 8px;"></i>FECHAS
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <p style="margin: 5px 0;"><strong>Fecha de Inicio:</strong></p>
                            <p style="color: var(--color-text-secondary);"><i class="fas fa-play"></i> ${fechaInicio}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Fecha de Finalización:</strong></p>
                            <p style="color: var(--color-text-secondary);"><i class="fas fa-stop"></i> ${fechaFinalizacion}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-history" style="margin-right: 8px;"></i>SEGUIMIENTO
                    </h4>
                    ${renderizarSeguimientoResumen(incidencia)}
                </div>
            </div>
        `,
        icon: null,
        width: 800,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: 'VER SEGUIMIENTO COMPLETO',
        cancelButtonText: 'CERRAR',
        reverseButtons: false
    }).then((result) => {
        if (result.isConfirmed) {
            toggleSeguimiento(incidencia.id);
        }
    });
};

function renderizarSeguimientoResumen(incidencia) {
    const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];
    
    if (seguimientos.length === 0) {
        return '<p style="color: var(--color-text-dim); text-align: center; padding: 20px;">No hay seguimiento registrado</p>';
    }
    
    // Mostrar solo los últimos 3 seguimientos
    const ultimos = seguimientos.slice(0, 3);
    
    return ultimos.map(seg => `
        <div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; border-left: 3px solid var(--color-accent-primary);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: var(--color-accent-primary); font-weight: 600;">${escapeHTML(seg.usuarioNombre || 'Usuario')}</span>
                <span style="color: var(--color-text-dim); font-size: 0.75rem;">${new Date(seg.fecha).toLocaleString()}</span>
            </div>
            <p style="color: var(--color-text-secondary); margin: 0; font-size: 0.9rem;">${escapeHTML(seg.descripcion)}</p>
        </div>
    `).join('');
}

window.editarIncidencia = function (id, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarIncidencias/editarIncidencias.html?id=${id}`;
};

window.eliminarIncidencia = async function (incidenciaId, event) {
    event?.stopPropagation();

    const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
    if (!incidencia) return;

    const result = await Swal.fire({
        title: '¿Eliminar incidencia?',
        html: `
            <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                <strong style="color: #ff4d4d;">"${incidencia.id}"</strong>
            </p>
            <p style="color: var(--color-text-dim); font-size: 0.8rem; margin-top: 15px;">
                Esta acción no se puede deshacer. Se eliminará toda la información asociada.
            </p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ELIMINAR',
        cancelButtonText: 'CANCELAR',
        reverseButtons: false,
        focusCancel: true
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Eliminando...',
                html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #ef4444;"></i>',
                allowOutsideClick: false,
                showConfirmButton: false
            });

            // Obtener usuario actual
            const usuario = window.userManager?.currentUser || { id: 'sistema' };
            
            await incidenciaManager.eliminarIncidencia(
                incidenciaId, 
                usuario.id, 
                organizacionActual.camelCase,
                true // eliminar archivos
            );

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: `La incidencia "${incidencia.id}" ha sido eliminada.`,
                timer: 2000,
                showConfirmButton: false
            });

            await cargarIncidencias();

        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al eliminar'
            });
        }
    }
};

window.finalizarIncidencia = async function (incidenciaId, event) {
    event?.stopPropagation();

    const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
    if (!incidencia) return;

    if (incidencia.estado === 'finalizada') {
        Swal.fire({
            icon: 'info',
            title: 'Incidencia ya finalizada',
            text: 'Esta incidencia ya ha sido marcada como finalizada.'
        });
        return;
    }

    const { value: descripcion } = await Swal.fire({
        title: 'Finalizar Incidencia',
        input: 'textarea',
        inputLabel: 'Comentario de cierre',
        inputPlaceholder: 'Describa las acciones tomadas para finalizar esta incidencia...',
        inputAttributes: {
            'aria-label': 'Escriba su comentario'
        },
        showCancelButton: true,
        confirmButtonText: 'FINALIZAR',
        cancelButtonText: 'CANCELAR',
        inputValidator: (value) => {
            if (!value) {
                return 'Debe ingresar un comentario de cierre';
            }
        }
    });

    if (descripcion) {
        try {
            Swal.fire({
                title: 'Finalizando...',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });

            // Obtener usuario actual
            const usuario = window.userManager?.currentUser || { id: 'sistema', nombreCompleto: 'Sistema' };
            
            await incidenciaManager.finalizarIncidencia(
                incidenciaId,
                usuario.id,
                usuario.nombreCompleto,
                descripcion,
                organizacionActual.camelCase
            );

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: '¡Finalizada!',
                text: 'La incidencia ha sido marcada como finalizada.',
                timer: 1500,
                showConfirmButton: false
            });

            await cargarIncidencias();

        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al finalizar la incidencia'
            });
        }
    }
};

window.toggleSeguimiento = function (incidenciaId) {
    const row = document.getElementById(`seguimiento-${incidenciaId}`);
    const icon = document.querySelector(`.incidencia-row[data-id="${incidenciaId}"] .toggle-icon i`);

    if (!row || !icon) return;

    if (incidenciaExpandidaId && incidenciaExpandidaId !== incidenciaId) {
        const prevRow = document.getElementById(`seguimiento-${incidenciaExpandidaId}`);
        const prevIcon = document.querySelector(`.incidencia-row[data-id="${incidenciaExpandidaId}"] .toggle-icon i`);
        if (prevRow) prevRow.style.display = 'none';
        if (prevIcon) {
            prevIcon.classList.remove('fa-chevron-down');
            prevIcon.classList.add('fa-chevron-right');
        }
    }

    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
        incidenciaExpandidaId = incidenciaId;
        
        // Cargar seguimiento si es necesario
        cargarSeguimiento(incidenciaId);
    } else {
        row.style.display = 'none';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
        incidenciaExpandidaId = null;
    }
};

async function cargarSeguimiento(incidenciaId) {
    const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
    if (!incidencia) return;

    const container = document.getElementById(`seguimiento-content-${incidenciaId}`);
    if (!container) return;

    const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

    if (seguimientos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:rgba(0,0,0,0.2); border-radius:8px;">
                <i class="fas fa-history" style="font-size:32px; color:#6b7280;"></i>
                <p style="color:#6b7280;">No hay seguimiento registrado</p>
                <button class="btn-agregar-seguimiento" onclick="window.agregarSeguimiento('${incidenciaId}', event)">
                    <i class="fas fa-plus-circle"></i> Agregar seguimiento
                </button>
            </div>
        `;
        return;
    }

    seguimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let html = `
        <div style="background: rgba(0,0,0,0.2); border-radius: 12px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 100%;">
                <thead>
                    <tr>
                        <th style="padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">#</th>
                        <th style="padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">Usuario</th>
                        <th style="padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">Descripción</th>
                        <th style="padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
    `;

    seguimientos.forEach((seg, index) => {
        const fecha = new Date(seg.fecha).toLocaleString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">${index + 1}</td>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">
                    <span class="seguimiento-usuario">${escapeHTML(seg.usuarioNombre || 'Usuario')}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">
                    <span class="seguimiento-descripcion">${escapeHTML(seg.descripcion)}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">
                    <span class="seguimiento-fecha"><i class="fas fa-clock"></i> ${fecha}</span>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 15px; text-align: right;">
            <button class="btn-agregar-seguimiento" onclick="window.agregarSeguimiento('${incidenciaId}', event)">
                <i class="fas fa-plus-circle"></i> Agregar seguimiento
            </button>
        </div>
    `;

    container.innerHTML = html;
}

window.agregarSeguimiento = async function (incidenciaId, event) {
    event?.stopPropagation();

    const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
    if (!incidencia) return;

    const { value: descripcion } = await Swal.fire({
        title: 'Agregar Seguimiento',
        input: 'textarea',
        inputLabel: 'Descripción',
        inputPlaceholder: 'Describa las acciones realizadas...',
        inputAttributes: {
            'aria-label': 'Escriba su seguimiento'
        },
        showCancelButton: true,
        confirmButtonText: 'AGREGAR',
        cancelButtonText: 'CANCELAR',
        inputValidator: (value) => {
            if (!value) {
                return 'Debe ingresar una descripción';
            }
        }
    });

    if (descripcion) {
        try {
            Swal.fire({
                title: 'Guardando...',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });

            // Obtener usuario actual
            const usuario = window.userManager?.currentUser || { id: 'sistema', nombreCompleto: 'Sistema' };
            
            await incidenciaManager.agregarSeguimiento(
                incidenciaId,
                usuario.id,
                usuario.nombreCompleto,
                descripcion,
                [], // sin archivos por ahora
                organizacionActual.camelCase
            );

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: '¡Agregado!',
                text: 'Seguimiento registrado correctamente.',
                timer: 1500,
                showConfirmButton: false
            });

            // Recargar la incidencia para obtener el seguimiento actualizado
            const incidenciaActualizada = await incidenciaManager.getIncidenciaById(incidenciaId, organizacionActual.camelCase);
            const index = incidenciasCache.findIndex(i => i.id === incidenciaId);
            if (index !== -1) {
                incidenciasCache[index] = incidenciaActualizada;
            }

            // Recargar seguimiento
            await cargarSeguimiento(incidenciaId);

        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al agregar seguimiento'
            });
        }
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px;">Cargando incidencias...</td></tr>';

        incidenciasCache = await incidenciaManager.getIncidenciasByOrganizacion(organizacionActual.camelCase);

        if (!incidenciasCache || incidenciasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-exclamation-triangle" style="font-size:48px; color:rgba(255,193,7,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay incidencias registradas</h5>
                            <p style="color: var(--color-text-dim); margin-bottom: 20px;">Comienza registrando la primera incidencia de tu organización.</p>
                            <a href="/users/admin/crearIncidencias/crearIncidencias.html" class="btn-nueva-incidencia-header" style="display:inline-flex; margin-top:16px;">
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

    // Aplicar filtros
    const incidenciasFiltradas = filtrarIncidencias(incidenciasCache);
    
    // Ordenar por fecha (más recientes primero)
    incidenciasFiltradas.sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : 0;
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : 0;
        return fechaB - fechaA;
    });

    // Paginación
    const totalItems = incidenciasFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const incidenciasPagina = incidenciasFiltradas.slice(inicio, fin);

    // Actualizar info de paginación
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} incidencias`;
    }

    // Generar filas
    tbody.innerHTML = '';

    incidenciasPagina.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    // Renderizar paginación
    renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <a class="page-link" href="#" onclick="event.preventDefault(); irPagina(${i})">${i}</a>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

window.irPagina = function (pagina) {
    paginaActual = pagina;
    renderizarIncidencias();
};

async function crearFilaIncidencia(incidencia, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'incidencia-row';
    tr.dataset.id = incidencia.id;

    tr.onclick = (e) => {
        if (!e.target.closest('.action-buttons') && !e.target.closest('.btn') && !e.target.closest('.toggle-icon')) {
            toggleSeguimiento(incidencia.id);
        }
    };

    // Obtener datos relacionados
    const sucursal = sucursalesCache.find(s => s.id === incidencia.sucursalId);
    const categoria = categoriasCache.find(c => c.id === incidencia.categoriaId);

    const riesgoTexto = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
    const riesgoColor = incidencia.getNivelRiesgoColor ? incidencia.getNivelRiesgoColor() : '';
    const estadoTexto = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;
    
    const fechaInicio = incidencia.fechaInicio ? 
        (incidencia.fechaInicio.toDate ? 
            incidencia.fechaInicio.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 
            new Date(incidencia.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })) : 
        'N/A';

    tr.innerHTML = `
        <td class="text-center" style="width:50px;" data-label="">
            <span class="toggle-icon"><i class="fas fa-chevron-right"></i></span>
        </td>
        <td data-label="ID / Folio">
            <span class="incidencia-id" title="${incidencia.id}">${incidencia.id.substring(0, 12)}...</span>
        </td>
        <td data-label="Sucursal">
            <div style="display: flex; align-items: center;">
                <i class="fas fa-store" style="margin-right: 8px; color: var(--color-accent-primary);"></i>
                <span>${sucursal ? sucursal.nombre : 'No disponible'}</span>
            </div>
        </td>
        <td data-label="Categoría">
            <div style="display: flex; align-items: center;">
                <i class="fas fa-tag" style="margin-right: 8px; color: var(--color-accent-secondary);"></i>
                <span>${categoria ? categoria.nombre : 'No disponible'}</span>
            </div>
        </td>
        <td data-label="Riesgo">
            <span class="riesgo-badge ${incidencia.nivelRiesgo}" style="background: ${riesgoColor}20; color: ${riesgoColor}; border-color: ${riesgoColor}40;">
                <i class="fas fa-exclamation-circle"></i>
                ${riesgoTexto}
            </span>
        </td>
        <td data-label="Estado">
            <span class="estado-badge ${incidencia.estado}">
                <i class="fas ${incidencia.estado === 'finalizada' ? 'fa-check-circle' : 'fa-clock'}"></i>
                ${estadoTexto}
            </span>
        </td>
        <td data-label="Fecha">
            <i class="fas fa-calendar-alt" style="margin-right: 5px; color: var(--color-text-dim);"></i>
            ${fechaInicio}
        </td>
        <td data-label="Acciones">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn" data-action="ver" data-id="${incidencia.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-warning" data-action="editar" data-id="${incidencia.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${incidencia.estado !== 'finalizada' ? `
                    <button type="button" class="btn btn-success" data-action="finalizar" data-id="${incidencia.id}" title="Finalizar">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button type="button" class="btn btn-danger" data-action="eliminar" data-id="${incidencia.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    // Crear fila de seguimiento expandible
    const seguimientoRow = document.createElement('tr');
    seguimientoRow.className = 'seguimiento-row';
    seguimientoRow.id = `seguimiento-${incidencia.id}`;
    seguimientoRow.style.display = 'none';

    seguimientoRow.innerHTML = `
        <td colspan="8" style="padding:0; border-top:none;">
            <div class="seguimiento-container">
                <div class="seguimiento-header">
                    <h6>
                        <i class="fas fa-history"></i>
                        Seguimiento de incidencia <span style="color: var(--color-accent-primary);">"${incidencia.id}"</span>
                    </h6>
                    <button class="btn-agregar-seguimiento" onclick="window.agregarSeguimiento('${incidencia.id}', event)">
                        <i class="fas fa-plus-circle"></i> Agregar
                    </button>
                </div>
                <div id="seguimiento-content-${incidencia.id}">
                    <div style="text-align:center; padding:20px; color:#6b7280;">
                        <i class="fas fa-spinner fa-spin"></i> Cargando seguimiento...
                    </div>
                </div>
            </div>
        </td>
    `;

    tbody.appendChild(seguimientoRow);

    // Asignar event listeners a los botones
    setTimeout(() => {
        tr.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'ver') window.verDetallesIncidencia(id, e);
                else if (action === 'editar') window.editarIncidencia(id, e);
                else if (action === 'eliminar') window.eliminarIncidencia(id, e);
                else if (action === 'finalizar') window.finalizarIncidencia(id, e);
            });
        });
        
        const toggleIcon = tr.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSeguimiento(incidencia.id);
            });
        }
    }, 50);

    // Precargar seguimiento
    setTimeout(() => {
        cargarSeguimiento(incidencia.id);
    }, 100);
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
                <td colspan="8" style="text-align:center; padding:40px;">
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
                <td colspan="8" style="text-align:center; padding:40px;">
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