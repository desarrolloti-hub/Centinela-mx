/**
 * CATEGORÍAS - Sistema Centinela
 * VERSIÓN CORREGIDA - Integración completa con CategoriaManager
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaExpandidaId = null;
let itemAEliminar = null;
let tipoEliminacion = null;
let empresaActual = null;

// =============================================
// INICIALIZACIÓN - Carga dinámica de la clase
// =============================================
async function inicializarCategoriaManager() {
    try {
        // Obtener datos de la empresa desde localStorage
        obtenerDatosEmpresa();

        const { CategoriaManager } = await import('/clases/categoria.js');
        categoriaManager = new CategoriaManager();

        console.log('✅ CategoriaManager cargado correctamente');
        console.log('📁 Colección:', categoriaManager?.nombreColeccion);
        console.log('🏢 Empresa:', categoriaManager?.empresaNombre);

        // Mostrar información de la empresa
        mostrarInfoEmpresa();

        // Configurar eventos de modales
        configurarEventoConfirmar();

        // Cargar categorías después de inicializar el manager
        await cargarCategorias();
        return true;
    } catch (error) {
        console.error('❌ Error al cargar CategoriaManager:', error);
        mostrarErrorCritico(error);
        return false;
    }
}

function obtenerDatosEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const organizacionLogo = localStorage.getItem('organizacionLogo');

        empresaActual = {
            id: userData.organizacionCamelCase || userData.organizacion || '',
            nombre: userData.organizacion || 'No especificada',
            camelCase: userData.organizacionCamelCase || '',
            logo: organizacionLogo || userData.fotoOrganizacion || ''
        };

        console.log('📊 Datos de empresa cargados:', empresaActual);
    } catch (error) {
        console.error('Error obteniendo datos de empresa:', error);
        empresaActual = { id: '', nombre: 'No especificada', camelCase: '' };
    }
}

function mostrarErrorCritico(error) {
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alerta.style.zIndex = '9999';
    alerta.style.minWidth = '400px';
    alerta.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
            <div>
                <strong>Error crítico</strong><br>
                ${error.message || 'No se pudo cargar el módulo de categorías'}
                <button class="btn btn-sm btn-danger ms-2" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt me-1"></i>Recargar
                </button>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alerta);
}

function mostrarInfoEmpresa() {
    try {
        if (!empresaActual) obtenerDatosEmpresa();

        // Agregar badge de empresa en el header
        const header = document.querySelector('.dashboard-title') || document.querySelector('h1');
        if (header && !document.getElementById('badge-empresa-categorias')) {
            const badgeEmpresa = document.createElement('div');
            badgeEmpresa.id = 'badge-empresa-categorias';
            badgeEmpresa.className = 'badge-empresa';
            badgeEmpresa.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 12px;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
                border: 1px solid rgba(16, 185, 129, 0.3);
                color: #10b981;
                padding: 10px 20px;
                border-radius: 12px;
                font-size: 14px;
                margin-left: 16px;
                backdrop-filter: blur(5px);
            `;

            let logoSrc = '';
            if (empresaActual.logo) {
                logoSrc = `<img src="${empresaActual.logo}" alt="Logo" style="width: 24px; height: 24px; border-radius: 6px; object-fit: cover;">`;
            }

            badgeEmpresa.innerHTML = `
                ${logoSrc || '<i class="fas fa-building"></i>'}
                <span>
                    <span style="opacity: 0.8;">Empresa:</span> 
                    <strong style="color: #34d399;">${empresaActual.nombre}</strong>
                </span>
                <span style="opacity: 0.6; font-size: 12px; border-left: 1px solid rgba(16,185,129,0.3); padding-left: 12px;">
                    <i class="fas fa-database"></i> ${categoriaManager?.nombreColeccion || ''}
                </span>
            `;

            if (header.parentElement) {
                header.parentElement.insertBefore(badgeEmpresa, header.nextSibling);
            }
        }
    } catch (error) {
        console.error('Error mostrando info de empresa:', error);
    }
}

// =============================================
// FUNCIONES GLOBALES
// =============================================

window.editarCategoria = function (categoriaId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${categoriaId}`;
};

window.agregarSubcategoria = function (categoriaId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${categoriaId}&nuevaSubcategoria=true`;
};

window.editarSubcategoria = function (categoriaId, subcategoriaId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${categoriaId}&editarSubcategoria=${subcategoriaId}`;
};

window.verDetalles = async function (categoriaId) {
    event?.stopPropagation();

    if (!categoriaManager) {
        mostrarAlerta('warning', 'El sistema no está listo. Por favor, espera un momento.');
        return;
    }

    try {
        const categoria = await categoriaManager.obtenerCategoria(categoriaId);
        if (!categoria) {
            mostrarAlerta('danger', 'Categoría no encontrada');
            return;
        }

        const subcategoriasArray = Array.from(categoria.subcategorias.values()).map(subMap => {
            const subObj = {};
            subMap.forEach((value, key) => { subObj[key] = value; });
            return subObj;
        });

        const detallesContent = document.getElementById('detallesContent');
        detallesContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="mb-3" style="color: #10b981;">
                        <i class="fas fa-tag me-2"></i>Información de la Categoría
                    </h6>
                    <div class="info-card p-3" style="background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-color);">
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">NOMBRE:</label>
                            <p class="text-light fs-5 fw-bold mb-0">${categoria.nombre}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">DESCRIPCIÓN:</label>
                            <p class="text-light mb-0">${categoria.descripcion || '<span class="text-muted fst-italic">Sin descripción</span>'}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">COLOR:</label>
                            <div class="d-flex align-items-center">
                                <span class="color-preview me-2" style="background-color: ${categoria.color || '#2f8cff'}; width: 30px; height: 30px; border-radius: 8px;"></span>
                                <span class="text-light">${categoria.color || '#2f8cff'}</span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">EMPRESA:</label>
                            <p class="text-light mb-0">
                                <i class="fas fa-building me-1" style="color: #10b981;"></i>
                                ${categoria.empresaNombre || empresaActual?.nombre || 'No especificada'}
                            </p>
                        </div>
                        <div class="row">
                            <div class="col-6">
                                <label class="form-label text-muted small mb-1">ID:</label>
                                <p class="text-light"><small class="text-muted">${categoria.id}</small></p>
                            </div>
                            <div class="col-6">
                                <label class="form-label text-muted small mb-1">FECHA CREACIÓN:</label>
                                <p class="text-light">
                                    <small>${new Date(categoria.fechaCreacion).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</small>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6 class="mb-3" style="color: #f97316;">
                        <i class="fas fa-list-ul me-2"></i>Subcategorías (${categoria.subcategorias.size})
                    </h6>
                    <div class="subcategorias-container" style="max-height: 350px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px;">
                        ${subcategoriasArray.map((subcat, index) => `
                            <div class="subcategoria-item mb-2 p-3" style="border: 1px solid var(--border-color); border-radius: 10px; background: rgba(255,255,255,0.02);">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span class="badge bg-secondary me-2" style="background: #4b5563 !important;">${index + 1}</span>
                                        <strong style="color: #fff;">${subcat.nombre || 'Sin nombre'}</strong>
                                    </div>
                                    <span class="badge bg-dark">ID: ${subcat.id?.substring(0, 8) || ''}...</span>
                                </div>
                                <small class="text-muted d-block mt-2">${subcat.descripcion || '<span class="fst-italic">Sin descripción</span>'}</small>
                                ${subcat.color ? `
                                <div class="mt-2">
                                    <span class="color-indicator" style="background-color: ${subcat.color}; width: 12px; height: 12px; border-radius: 4px; display: inline-block;"></span>
                                    <small class="text-muted ms-1">${subcat.color}</small>
                                    ${subcat.heredaColor ? '<span class="badge bg-success ms-2" style="font-size: 10px;">Hereda</span>' : ''}
                                </div>
                                ` : ''}
                            </div>
                        `).join('')}
                        ${categoria.subcategorias.size === 0 ?
                '<div class="text-center py-5 text-muted"><i class="fas fa-inbox fa-3x mb-3 opacity-50"></i><p>No hay subcategorías registradas</p></div>' : ''}
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalDetalles'));
        modal.show();

    } catch (error) {
        console.error('Error al cargar detalles:', error);
        mostrarAlerta('danger', 'Error al cargar los detalles de la categoría');
    }
};

window.verDetallesSubcategoria = async function (categoriaId, subcategoriaId) {
    event?.stopPropagation();

    if (!categoriaManager) {
        mostrarAlerta('warning', 'El sistema no está listo. Por favor, espera un momento.');
        return;
    }

    try {
        const categoria = await categoriaManager.obtenerCategoria(categoriaId);
        if (!categoria) {
            mostrarAlerta('danger', 'Categoría no encontrada');
            return;
        }

        const subcategoriaMap = categoria.obtenerSubcategoria(subcategoriaId);
        if (!subcategoriaMap) {
            mostrarAlerta('danger', 'Subcategoría no encontrada');
            return;
        }

        const subcategoria = {};
        subcategoriaMap.forEach((value, key) => { subcategoria[key] = value; });

        const detallesContent = document.getElementById('detallesContent');
        detallesContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="mb-3" style="color: #f97316;">
                        <i class="fas fa-tag me-2"></i>Información de la Subcategoría
                    </h6>
                    <div class="info-card p-3" style="background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-color);">
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">NOMBRE:</label>
                            <p class="text-light fs-5 fw-bold mb-0">${subcategoria.nombre || ''}</p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">CATEGORÍA PADRE:</label>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge" style="background: #2f8cff;">${categoria.nombre}</span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">DESCRIPCIÓN:</label>
                            <p class="text-light">${subcategoria.descripcion || '<span class="text-muted fst-italic">Sin descripción</span>'}</p>
                        </div>
                        ${subcategoria.color ? `
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">COLOR:</label>
                            <div class="d-flex align-items-center gap-2">
                                <span class="color-preview" style="background-color: ${subcategoria.color}; width: 30px; height: 30px; border-radius: 8px;"></span>
                                <span class="text-light">${subcategoria.color}</span>
                                ${subcategoria.heredaColor ? '<span class="badge bg-success">Hereda de categoría</span>' : '<span class="badge bg-warning">Color propio</span>'}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="info-card p-3" style="background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-color);">
                        <h6 class="mb-3" style="color: #10b981;">
                            <i class="fas fa-info-circle me-2"></i>Detalles adicionales
                        </h6>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">ID DE REFERENCIA:</label>
                            <p class="text-light"><small class="text-muted">${subcategoria.id || ''}</small></p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">FECHA DE CREACIÓN:</label>
                            <p class="text-light">
                                <small>${new Date(subcategoria.fechaCreacion).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</small>
                            </p>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small mb-1">EMPRESA:</label>
                            <p class="text-light">
                                <i class="fas fa-building me-1" style="color: #10b981;"></i>
                                ${categoria.empresaNombre || empresaActual?.nombre || 'No especificada'}
                            </p>
                        </div>
                        <div class="alert alert-info mt-3" style="background: rgba(47, 140, 255, 0.1); border: 1px solid rgba(47, 140, 255, 0.2);">
                            <i class="fas fa-sitemap me-2" style="color: #2f8cff;"></i>
                            <small>Esta subcategoría pertenece a la categoría <strong style="color: #2f8cff;">${categoria.nombre}</strong>.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalDetalles'));
        modal.show();

    } catch (error) {
        console.error('Error al cargar detalles de subcategoría:', error);
        mostrarAlerta('danger', 'Error al cargar los detalles de la subcategoría');
    }
};

window.eliminarCategoria = async function (categoriaId) {
    event?.stopPropagation();

    if (!categoriaManager) {
        mostrarAlerta('warning', 'El sistema no está listo. Por favor, espera un momento.');
        return;
    }

    try {
        const categoria = await categoriaManager.obtenerCategoria(categoriaId);
        if (!categoria) {
            mostrarAlerta('danger', 'Categoría no encontrada');
            return;
        }

        if (categoria.subcategorias.size > 0) {
            mostrarAlerta('warning',
                `<div class="text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2" style="color: #f59e0b;"></i>
                    <p class="mb-0"><strong>No se puede eliminar</strong></p>
                    <p class="small">La categoría tiene ${categoria.subcategorias.size} subcategoría(s) asociada(s)</p>
                </div>`
            );
            return;
        }

        itemAEliminar = categoriaId;
        tipoEliminacion = 'categoria';

        document.getElementById('confirmarMensaje').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>¡Atención!</strong> Esta acción no se puede deshacer.
            </div>
            <div class="text-center mb-4">
                <div style="font-size: 48px; color: #ef4444; margin-bottom: 16px;">
                    <i class="fas fa-tag"></i>
                </div>
                <h5 class="mb-2">¿Eliminar categoría?</h5>
                <p class="mb-3">Estás a punto de eliminar <strong class="text-danger fs-5">"${categoria.nombre}"</strong></p>
            </div>
            <div class="bg-dark p-3 rounded-3" style="background: rgba(0,0,0,0.3) !important;">
                <div class="d-flex align-items-center mb-2">
                    <i class="fas fa-building me-2" style="color: #10b981;"></i>
                    <small class="text-muted">Empresa: <strong>${categoria.empresaNombre || empresaActual?.nombre || 'No especificada'}</strong></small>
                </div>
                <div class="d-flex align-items-center">
                    <i class="fas fa-database me-2" style="color: #2f8cff;"></i>
                    <small class="text-muted">Colección: <strong>${categoriaManager.nombreColeccion}</strong></small>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
        modal.show();

    } catch (error) {
        console.error('Error al preparar eliminación:', error);
        mostrarAlerta('danger', 'Error al cargar la categoría para eliminar');
    }
};

window.eliminarSubcategoria = async function (categoriaId, subcategoriaId) {
    event?.stopPropagation();

    if (!categoriaManager) {
        mostrarAlerta('warning', 'El sistema no está listo. Por favor, espera un momento.');
        return;
    }

    try {
        const categoria = await categoriaManager.obtenerCategoria(categoriaId);
        if (!categoria) {
            mostrarAlerta('danger', 'Categoría no encontrada');
            return;
        }

        const subcategoriaMap = categoria.obtenerSubcategoria(subcategoriaId);
        if (!subcategoriaMap) {
            mostrarAlerta('danger', 'Subcategoría no encontrada');
            return;
        }

        const subcategoria = {};
        subcategoriaMap.forEach((value, key) => { subcategoria[key] = value; });

        itemAEliminar = { categoriaId, subcategoriaId };
        tipoEliminacion = 'subcategoria';

        document.getElementById('confirmarMensaje').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>¡Atención!</strong> Esta acción no se puede deshacer.
            </div>
            <div class="text-center mb-4">
                <div style="font-size: 48px; color: #ef4444; margin-bottom: 16px;">
                    <i class="fas fa-folder-open"></i>
                </div>
                <h5 class="mb-2">¿Eliminar subcategoría?</h5>
                <p class="mb-3">Estás a punto de eliminar <strong class="text-danger fs-5">"${subcategoria.nombre}"</strong></p>
            </div>
            <div class="bg-dark p-3 rounded-3" style="background: rgba(0,0,0,0.3) !important;">
                <div class="d-flex align-items-center mb-2">
                    <i class="fas fa-folder me-2" style="color: #2f8cff;"></i>
                    <small class="text-muted">Categoría padre: <strong>${categoria.nombre}</strong></small>
                </div>
                <div class="d-flex align-items-center mb-2">
                    <i class="fas fa-building me-2" style="color: #10b981;"></i>
                    <small class="text-muted">Empresa: <strong>${categoria.empresaNombre || empresaActual?.nombre || 'No especificada'}</strong></small>
                </div>
                ${subcategoria.color ? `
                <div class="d-flex align-items-center">
                    <span class="color-indicator me-2" style="background-color: ${subcategoria.color}; width: 12px; height: 12px; border-radius: 4px;"></span>
                    <small class="text-muted">Color: <strong>${subcategoria.color}</strong></small>
                </div>
                ` : ''}
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
        modal.show();

    } catch (error) {
        console.error('Error al preparar eliminación:', error);
        mostrarAlerta('danger', 'Error al cargar la subcategoría para eliminar');
    }
};

// =============================================
// FUNCIÓN PARA CARGAR CATEGORÍAS
// =============================================
async function cargarCategorias() {
    if (!categoriaManager) {
        console.warn('CategoriaManager no inicializado');
        return;
    }

    try {
        const tbody = document.getElementById('tablaCategoriasBody');
        if (!tbody) {
            console.error('No se encontró el elemento tablaCategoriasBody');
            return;
        }

        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2 text-muted">Cargando categorías...</p></td></tr>';

        const categoriasArray = await categoriaManager.obtenerTodasCategorias();

        if (!categoriasArray || categoriasArray.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="empty-state" style="padding: 40px 20px;">
                            <div style="font-size: 64px; color: rgba(16, 185, 129, 0.3); margin-bottom: 20px;">
                                <i class="fas fa-tags"></i>
                            </div>
                            <h5 style="color: #fff; margin-bottom: 12px;">No hay categorías</h5>
                            <p style="color: var(--text-dim); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
                                Comienza creando tu primera categoría para <strong style="color: #10b981;">${categoriaManager.empresaNombre || empresaActual?.nombre || 'tu empresa'}</strong>
                            </p>
                            <a href="/users/admin/crearCategorias/crearCategorias.html" class="btn btn-primary btn-lg">
                                <i class="fas fa-plus-circle me-2"></i>Crear Categoría
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        // Ordenar categorías por nombre
        categoriasArray.sort((a, b) => a.nombre.localeCompare(b.nombre));

        for (const categoria of categoriasArray) {
            await crearFilaCategoria(categoria, tbody);
        }

    } catch (error) {
        console.error('Error al cargar categorías:', error);
        const tbody = document.getElementById('tablaCategoriasBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div style="color: #ef4444;">
                            <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                            <h5>Error al cargar categorías</h5>
                            <p class="text-muted">${error.message || 'Intenta recargar la página'}</p>
                            <button class="btn btn-outline-danger mt-2" onclick="window.location.reload()">
                                <i class="fas fa-sync-alt me-2"></i>Recargar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        mostrarAlerta('danger', 'Error al cargar las categorías desde Firebase');
    }
}

async function crearFilaCategoria(categoria, tbody) {
    // Crear fila principal de categoría
    const tr = document.createElement('tr');
    tr.className = 'categoria-row';
    tr.dataset.id = categoria.id;
    tr.dataset.tipo = 'categoria';

    tr.style.cursor = 'pointer';
    tr.onclick = (e) => {
        if (!e.target.closest('.btn-group') && !e.target.closest('.expand-cell')) {
            toggleSubcategorias(categoria.id);
        }
    };

    tr.onmouseenter = () => {
        if (!tr.classList.contains('expanded')) {
            tr.style.backgroundColor = 'rgba(47, 140, 255, 0.05)';
        }
    };

    tr.onmouseleave = () => {
        if (!tr.classList.contains('expanded')) {
            tr.style.backgroundColor = '';
        }
    };

    // Color de la categoría para el indicador
    const colorCategoria = categoria.color || '#2f8cff';

    tr.innerHTML = `
        <td class="expand-cell" style="width: 50px;">
            <i class="fas fa-chevron-right expand-icon" style="transition: transform 0.2s ease;"></i>
        </td>
        <td class="categoria-cell">
            <div class="d-flex align-items-center">
                <div style="width: 4px; height: 24px; background: ${colorCategoria}; border-radius: 2px; margin-right: 12px;"></div>
                <strong style="font-size: 15px;">${categoria.nombre}</strong>
                ${categoria.descripcion ? `
                <span class="ms-2 text-muted" title="${categoria.descripcion}">
                    <i class="fas fa-info-circle" style="font-size: 12px;"></i>
                </span>
                ` : ''}
                ${categoria.color ? `
                <span class="ms-2">
                    <span class="color-indicator" style="background-color: ${categoria.color}; width: 12px; height: 12px; border-radius: 4px; display: inline-block;"></span>
                </span>
                ` : ''}
            </div>
        </td>
        <td class="categoria-cell">
            <div class="d-flex align-items-center">
                <span class="text-muted">-</span>
            </div>
        </td>
        <td class="categoria-cell">
            <div class="d-flex align-items-center gap-2">
                <span class="badge" style="background: ${categoria.subcategorias.size > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)'}; color: ${categoria.subcategorias.size > 0 ? '#10b981' : '#9ca3af'}; padding: 6px 12px; border-radius: 20px;">
                    <i class="fas ${categoria.subcategorias.size > 0 ? 'fa-folder-open' : 'fa-folder'} me-1" style="font-size: 12px;"></i>
                    ${categoria.subcategorias.size} ${categoria.subcategorias.size === 1 ? 'subcategoría' : 'subcategorías'}
                </span>
            </div>
        </td>
        <td class="categoria-cell">
            <div class="btn-group btn-group-sm" role="group" style="gap: 6px;">
                <button type="button" class="btn btn-outline-info btn-sm rounded-3" onclick="window.verDetalles('${categoria.id}')" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-outline-warning btn-sm rounded-3" onclick="window.editarCategoria('${categoria.id}')" title="Editar categoría">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-outline-success btn-sm rounded-3" onclick="window.agregarSubcategoria('${categoria.id}')" title="Agregar subcategoría">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm rounded-3" onclick="window.eliminarCategoria('${categoria.id}')" title="Eliminar categoría" ${categoria.subcategorias.size > 0 ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    // Crear fila para subcategorías
    const subcategoriaRow = document.createElement('tr');
    subcategoriaRow.className = 'subcategoria-row d-none';
    subcategoriaRow.id = `subcategorias-${categoria.id}`;
    subcategoriaRow.dataset.parentId = categoria.id;

    subcategoriaRow.innerHTML = `
        <td colspan="5" class="p-0 border-top-0">
            <div class="subcategorias-container p-4" style="background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5));">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h6 class="mb-1 text-light" style="font-size: 16px; font-weight: 600;">
                            <i class="fas fa-list-ul me-2" style="color: #2f8cff;"></i>
                            Subcategorías de <span style="color: #2f8cff;">"${categoria.nombre}"</span>
                        </h6>
                        <small class="text-muted">
                            <i class="fas fa-building me-1"></i> Empresa: ${categoria.empresaNombre || empresaActual?.nombre || 'No especificada'}
                        </small>
                    </div>
                    <button class="btn btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border: none; color: white; padding: 8px 16px; border-radius: 20px;" onclick="window.agregarSubcategoria('${categoria.id}')">
                        <i class="fas fa-plus-circle me-1"></i>Agregar Subcategoría
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm mb-0" style="color: #fff;">
                        <thead style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <tr>
                                <th width="40" style="color: #9ca3af; font-weight: 500;">#</th>
                                <th style="color: #9ca3af; font-weight: 500;">Nombre</th>
                                <th style="color: #9ca3af; font-weight: 500;">Descripción</th>
                                <th width="80" style="color: #9ca3af; font-weight: 500;">Color</th>
                                <th width="180" style="color: #9ca3af; font-weight: 500;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="subcategorias-body-${categoria.id}"></tbody>
                    </table>
                </div>
            </div>
        </td>
    `;

    tbody.appendChild(subcategoriaRow);

    // Cargar subcategorías
    await cargarSubcategorias(categoria.id);
}

async function cargarSubcategorias(categoriaId) {
    if (!categoriaManager) return;

    try {
        const tbody = document.getElementById(`subcategorias-body-${categoriaId}`);
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando...</td></tr>';

        const categoria = await categoriaManager.obtenerCategoria(categoriaId);

        if (categoria && categoria.subcategorias) {
            const subcategoriasArray = Array.from(categoria.subcategorias.values())
                .map(subMap => {
                    const subObj = {};
                    subMap.forEach((value, key) => { subObj[key] = value; });
                    return subObj;
                })
                .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

            tbody.innerHTML = '';

            subcategoriasArray.forEach((subcategoria, index) => {
                const tr = document.createElement('tr');
                tr.className = 'subcategoria-item';
                tr.style.transition = 'background-color 0.2s ease';
                tr.onmouseenter = function () { this.style.backgroundColor = 'rgba(47, 140, 255, 0.05)'; };
                tr.onmouseleave = function () { this.style.backgroundColor = ''; };

                // Color de la subcategoría
                const colorSub = subcategoria.color || categoria.color || '#2f8cff';

                tr.innerHTML = `
                    <td style="color: #9ca3af;">${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="color-indicator me-2" style="background-color: ${colorSub}; width: 16px; height: 16px; border-radius: 4px;"></span>
                            <span style="font-weight: 500;">${subcategoria.nombre || ''}</span>
                            ${subcategoria.heredaColor ? `
                            <span class="ms-2 badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 10px;">
                                <i class="fas fa-paint-brush me-1"></i>Hereda
                            </span>
                            ` : `
                            <span class="ms-2 badge" style="background: rgba(249, 115, 22, 0.1); color: #f97316; font-size: 10px;">
                                <i class="fas fa-palette me-1"></i>Propio
                            </span>
                            `}
                        </div>
                    </td>
                    <td>
                        <small style="color: #d1d5db;">${subcategoria.descripcion || '<span class="text-muted fst-italic">Sin descripción</span>'}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="color-indicator" style="background-color: ${colorSub}; width: 20px; height: 20px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.1);"></span>
                            <small style="color: #9ca3af;">${colorSub}</small>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group" style="gap: 4px;">
                            <button type="button" class="btn btn-outline-info btn-sm rounded-2" onclick="window.verDetallesSubcategoria('${categoriaId}', '${subcategoria.id}')" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-warning btn-sm rounded-2" onclick="window.editarSubcategoria('${categoriaId}', '${subcategoria.id}')" title="Editar subcategoría">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-sm rounded-2" onclick="window.eliminarSubcategoria('${categoriaId}', '${subcategoria.id}')" title="Eliminar subcategoría">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            if (categoria.subcategorias.size === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="5" class="text-center py-5">
                        <div style="color: #6b7280;">
                            <i class="fas fa-folder-open fa-3x mb-3 opacity-50"></i>
                            <p class="mb-2">No hay subcategorías registradas</p>
                            <button class="btn btn-sm btn-outline-primary" onclick="window.agregarSubcategoria('${categoriaId}')" style="border-radius: 20px; padding: 6px 16px;">
                                <i class="fas fa-plus-circle me-1"></i>Crear primera subcategoría
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }

    } catch (error) {
        console.error('Error al cargar subcategorías:', error);
        const tbody = document.getElementById(`subcategorias-body-${categoriaId}`);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-3">
                        <div style="color: #ef4444;">
                            <i class="fas fa-exclamation-circle"></i>
                            Error al cargar subcategorías
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

function toggleSubcategorias(categoriaId) {
    const categoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaId}"]`);
    const subcategoriaRow = document.getElementById(`subcategorias-${categoriaId}`);

    if (!categoriaRow || !subcategoriaRow) return;

    const icon = categoriaRow.querySelector('.expand-icon');

    if (categoriaExpandidaId && categoriaExpandidaId !== categoriaId) {
        const prevCategoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaExpandidaId}"]`);
        const prevSubcategoriaRow = document.getElementById(`subcategorias-${categoriaExpandidaId}`);
        const prevIcon = prevCategoriaRow?.querySelector('.expand-icon');

        if (prevSubcategoriaRow && !prevSubcategoriaRow.classList.contains('d-none')) {
            prevSubcategoriaRow.classList.add('d-none');
            prevCategoriaRow?.classList.remove('expanded');
            prevCategoriaRow.style.backgroundColor = '';
            if (prevIcon) {
                prevIcon.classList.remove('fa-chevron-down');
                prevIcon.classList.add('fa-chevron-right');
            }
        }
    }

    if (subcategoriaRow.classList.contains('d-none')) {
        subcategoriaRow.classList.remove('d-none');
        categoriaRow.classList.add('expanded');
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
        categoriaRow.style.backgroundColor = 'rgba(47, 140, 255, 0.1)';
        categoriaExpandidaId = categoriaId;

        setTimeout(() => {
            subcategoriaRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        subcategoriaRow.classList.add('d-none');
        categoriaRow.classList.remove('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
        categoriaRow.style.backgroundColor = '';
        categoriaExpandidaId = null;
    }
}

async function configurarEventoConfirmar() {
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    if (!btnConfirmar) return;

    const nuevoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);

    nuevoBtn.addEventListener('click', async function () {
        if (!categoriaManager) {
            mostrarAlerta('warning', 'El sistema no está listo');
            return;
        }

        const btn = this;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Eliminando...';
        btn.disabled = true;

        try {
            if (tipoEliminacion === 'categoria') {
                await categoriaManager.eliminarCategoria(itemAEliminar);

                bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
                await cargarCategorias();

                mostrarAlerta('success',
                    `<div class="d-flex align-items-center">
                        <i class="fas fa-check-circle fa-2x me-3" style="color: #10b981;"></i>
                        <div>
                            <strong>Categoría eliminada</strong><br>
                            <small>La categoría se ha eliminado correctamente</small>
                        </div>
                    </div>`
                );

                if (categoriaExpandidaId === itemAEliminar) {
                    categoriaExpandidaId = null;
                }

            } else if (tipoEliminacion === 'subcategoria') {
                const { categoriaId, subcategoriaId } = itemAEliminar;
                const categoria = await categoriaManager.obtenerCategoria(categoriaId);

                if (categoria) {
                    const subcategoriaMap = categoria.obtenerSubcategoria(subcategoriaId);
                    const subcategoria = {};
                    subcategoriaMap?.forEach((value, key) => { subcategoria[key] = value; });

                    categoria.eliminarSubcategoria(subcategoriaId);
                    await categoriaManager.actualizarCategoria(categoriaId, {
                        nombre: categoria.nombre,
                        descripcion: categoria.descripcion
                    });

                    bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
                    await cargarSubcategorias(categoriaId);

                    // Actualizar contador de subcategorías en la fila
                    const categoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaId}"]`);
                    const badgeContenedor = categoriaRow?.querySelector('.badge');
                    if (badgeContenedor) {
                        badgeContenedor.innerHTML = `<i class="fas fa-folder${categoria.subcategorias.size > 0 ? '-open' : ''} me-1"></i> ${categoria.subcategorias.size} ${categoria.subcategorias.size === 1 ? 'subcategoría' : 'subcategorías'}`;
                        badgeContenedor.style.background = categoria.subcategorias.size > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)';
                        badgeContenedor.style.color = categoria.subcategorias.size > 0 ? '#10b981' : '#9ca3af';
                    }

                    // Actualizar botón eliminar categoría
                    const btnEliminar = categoriaRow?.querySelector('.btn-outline-danger');
                    if (btnEliminar) {
                        btnEliminar.disabled = categoria.subcategorias.size > 0;
                    }

                    mostrarAlerta('success',
                        `<div class="d-flex align-items-center">
                            <i class="fas fa-check-circle fa-2x me-3" style="color: #10b981;"></i>
                            <div>
                                <strong>Subcategoría eliminada</strong><br>
                                <small>"${subcategoria?.nombre || ''}" se ha eliminado correctamente</small>
                            </div>
                        </div>`
                    );
                }
            }

        } catch (error) {
            console.error('Error al eliminar:', error);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar'))?.hide();
            mostrarAlerta('danger',
                `<div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-circle fa-2x me-3" style="color: #ef4444;"></i>
                    <div>
                        <strong>Error al eliminar</strong><br>
                        <small>${error.message || 'Intenta nuevamente'}</small>
                    </div>
                </div>`
            );
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            itemAEliminar = null;
            tipoEliminacion = null;
        }
    });
}

function mostrarAlerta(tipo, mensaje) {
    const alertasExistentes = document.querySelectorAll('.alert-notification');
    alertasExistentes.forEach(alerta => alerta.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo} alert-notification alert-dismissible fade show position-fixed`;
    alert.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 350px;
        max-width: 450px;
        padding: 16px 20px;
        border: none;
        border-radius: 12px;
        background: ${tipo === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' :
            tipo === 'danger' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                tipo === 'warning' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                    'linear-gradient(135deg, #3b82f6, #2563eb)'};
        color: white;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        animation: slideInRight 0.3s ease;
    `;

    if (typeof mensaje === 'string' && mensaje.includes('<div')) {
        alert.innerHTML = mensaje + '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>';
    } else {
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="flex-grow-1">${mensaje}</div>
                <button type="button" class="btn-close btn-close-white ms-3" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    document.body.appendChild(alert);

    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

function inicializarEventos() {
    // Filtro de categorías eliminadas
    document.getElementById('toggleEliminadas')?.addEventListener('change', function (e) {
        console.log('Mostrar eliminadas:', e.target.checked);
        mostrarAlerta('info', 'Filtro de categorías eliminadas (en desarrollo)');
    });

    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                bootstrap.Modal.getInstance(this)?.hide();
            }
        });
    });

    // Estilos CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100px); opacity: 0; }
        }
        
        .categoria-cell {
            transition: background-color 0.2s ease;
        }
        
        .categoria-row.expanded .categoria-cell {
            background-color: rgba(47, 140, 255, 0.1) !important;
        }
        
        .subcategoria-item {
            transition: background-color 0.2s ease;
        }
        
        .color-indicator {
            width: 20px;
            height: 20px;
            border-radius: 6px;
            display: inline-block;
            border: 2px solid rgba(255,255,255,0.1);
        }
        
        .color-preview {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            border: 2px solid rgba(255,255,255,0.1);
        }
        
        .btn-group .btn {
            transition: all 0.2s ease;
        }
        
        .btn-group .btn:hover {
            transform: translateY(-2px);
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
        }
        
        .empty-state i {
            font-size: 64px;
            color: rgba(16, 185, 129, 0.3);
            margin-bottom: 20px;
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Inicializando página de categorías...');

    inicializarEventos();

    const exito = await inicializarCategoriaManager();

    if (!exito) {
        mostrarAlerta('danger', 'No se pudo inicializar el sistema. Recarga la página.');
    }
});