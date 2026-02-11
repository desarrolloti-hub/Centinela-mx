/**
 * CATEGORÍAS - Sistema Centinela
 * VERSIÓN CON FIREBASE - Carga dinámica de la clase
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaExpandidaId = null;
let itemAEliminar = null;
let tipoEliminacion = null;

// =============================================
// INICIALIZACIÓN - Carga dinámica de la clase
// =============================================
async function inicializarCategoriaManager() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        categoriaManager = new CategoriaManager();
        console.log('✅ CategoriaManager cargado correctamente');
        console.log('📁 Colección:', categoriaManager?.nombreColeccion);
        
        // Mostrar información de la empresa
        mostrarInfoEmpresa();
        
        // Cargar categorías después de inicializar el manager
        await cargarCategorias();
        return true;
    } catch (error) {
        console.error('❌ Error al cargar CategoriaManager:', error);
        
        // Mostrar error al usuario
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alerta.style.zIndex = '9999';
        alerta.style.minWidth = '400px';
        alerta.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
                <div>
                    <strong>Error crítico</strong><br>
                    No se pudo cargar el módulo de categorías. 
                    <button class="btn btn-sm btn-danger ms-2" onclick="window.location.reload()">
                        <i class="fas fa-sync-alt me-1"></i>Recargar
                    </button>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alerta);
        
        return false;
    }
}

function mostrarInfoEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const empresaData = JSON.parse(localStorage.getItem('empresa') || '{}');
        
        const empresaNombre = empresaData.nombre || userData.empresa || 'No especificada';
        
        // Agregar badge de empresa en el header
        const header = document.querySelector('.dashboard-title') || document.querySelector('h1');
        if (header && !document.getElementById('badge-empresa-categorias')) {
            const badgeEmpresa = document.createElement('div');
            badgeEmpresa.id = 'badge-empresa-categorias';
            badgeEmpresa.className = 'badge-empresa';
            badgeEmpresa.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.2);
                color: #10b981;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                margin-left: 16px;
            `;
            badgeEmpresa.innerHTML = `
                <i class="fas fa-building"></i>
                <span>Empresa: <strong>${empresaNombre}</strong></span>
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
// FUNCIONES GLOBALES - DECLARADAS CON window
// =============================================

// EDITAR CATEGORÍA - Solo envía el ID
window.editarCategoria = function(categoriaId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${categoriaId}`;
};

// AGREGAR SUBCATEGORÍA
window.agregarSubcategoria = function(categoriaId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${categoriaId}&nuevaSubcategoria=true`;
};

// EDITAR SUBCATEGORÍA
window.editarSubcategoria = function(categoriaId, subcategoriaId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${categoriaId}&editarSubcategoria=${subcategoriaId}`;
};

// VER DETALLES DE CATEGORÍA
window.verDetalles = async function(categoriaId) {
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
        
        const subcategoriasArray = Array.from(categoria.subcategorias.values());
        
        const detallesContent = document.getElementById('detallesContent');
        detallesContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="mb-3">Información de la Categoría</h6>
                    <div class="mb-3">
                        <label class="form-label text-muted">Nombre:</label>
                        <p class="text-light fs-5">${categoria.nombre}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Descripción:</label>
                        <p class="text-light">${categoria.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Empresa:</label>
                        <p class="text-light">${categoria.empresaNombre || 'No especificada'}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">ID:</label>
                        <p class="text-light"><small class="text-muted">${categoria.id}</small></p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Fecha de creación:</label>
                        <p class="text-light">${categoria.fechaCreacion?.toDate?.()?.toLocaleDateString() || 'No disponible'}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6 class="mb-3">Subcategorías (${categoria.subcategorias.size})</h6>
                    <div class="subcategorias-container" style="max-height: 250px; overflow-y: auto;">
                        ${subcategoriasArray.map((subcat, index) => {
                            const subcatObj = {};
                            subcat.forEach((value, key) => { subcatObj[key] = value; });
                            return `
                                <div class="subcategoria-item mb-2 p-2" style="border: 1px solid var(--border-color); border-radius: 8px;">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <span class="badge bg-secondary me-2">${index + 1}</span>
                                            <strong>${subcatObj.nombre || 'Sin nombre'}</strong>
                                        </div>
                                        <span class="badge bg-dark">ID: ${subcatObj.id?.substring(0, 8) || ''}...</span>
                                    </div>
                                    <small class="text-muted d-block mt-1">${subcatObj.descripcion || 'Sin descripción'}</small>
                                </div>
                            `;
                        }).join('')}
                        ${categoria.subcategorias.size === 0 ? 
                            '<div class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x mb-2"></i><p>No hay subcategorías</p></div>' : ''}
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

// VER DETALLES DE SUBCATEGORÍA
window.verDetallesSubcategoria = async function(categoriaId, subcategoriaId) {
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
                    <h6 class="mb-3">Información de la Subcategoría</h6>
                    <div class="mb-3">
                        <label class="form-label text-muted">Nombre:</label>
                        <p class="text-light fs-5">${subcategoria.nombre || ''}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Categoría padre:</label>
                        <div class="d-flex align-items-center gap-2">
                            <p class="text-light mb-0">${categoria.nombre}</p>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Descripción:</label>
                        <p class="text-light">${subcategoria.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Empresa:</label>
                        <p class="text-light">${categoria.empresaNombre || 'No especificada'}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label text-muted">ID de referencia:</label>
                        <p class="text-light"><small class="text-muted">${subcategoria.id || ''}</small></p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted">Fecha de creación:</label>
                        <p class="text-light">${subcategoria.fechaCreacion?.toDate?.()?.toLocaleDateString() || 'No disponible'}</p>
                    </div>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <small>Esta subcategoría pertenece a la categoría <strong>${categoria.nombre}</strong>.</small>
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

// ELIMINAR CATEGORÍA
window.eliminarCategoria = async function(categoriaId) {
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
            mostrarAlerta('warning', 'No se puede eliminar una categoría que tiene subcategorías');
            return;
        }
        
        itemAEliminar = categoriaId;
        tipoEliminacion = 'categoria';
        
        document.getElementById('confirmarMensaje').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>¡Atención!</strong> Esta acción no se puede deshacer.
            </div>
            <p>¿Está seguro de eliminar la categoría <strong class="text-danger">"${categoria.nombre}"</strong>?</p>
            <div class="bg-dark p-3 rounded mt-3">
                <small class="text-muted">
                    <i class="fas fa-exclamation-circle me-1"></i>
                    Esta categoría no tiene subcategorías asociadas.
                </small>
                <br>
                <small class="text-muted">
                    <i class="fas fa-building me-1"></i>
                    Empresa: <strong>${categoria.empresaNombre || 'No especificada'}</strong>
                </small>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
        modal.show();
        
    } catch (error) {
        console.error('Error al preparar eliminación:', error);
        mostrarAlerta('danger', 'Error al cargar la categoría para eliminar');
    }
};

// ELIMINAR SUBCATEGORÍA
window.eliminarSubcategoria = async function(categoriaId, subcategoriaId) {
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
            <p>¿Está seguro de eliminar la subcategoría <strong class="text-danger">"${subcategoria.nombre}"</strong>?</p>
            <div class="bg-dark p-3 rounded mt-3">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    Categoría padre: <strong>${categoria.nombre}</strong>
                </small>
                <br>
                <small class="text-muted">
                    <i class="fas fa-building me-1"></i>
                    Empresa: <strong>${categoria.empresaNombre || 'No especificada'}</strong>
                </small>
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
        
        tbody.innerHTML = '';
        
        const categoriasArray = await categoriaManager.obtenerTodasCategorias();
        
        if (!categoriasArray || categoriasArray.length === 0) {
            // Mostrar mensaje de tabla vacía con información de empresa
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="5" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-tags fa-3x mb-3"></i>
                        <h5>No hay categorías</h5>
                        <p>Comienza creando tu primera categoría para 
                           <strong>${categoriaManager.empresaNombre || 'tu empresa'}</strong></p>
                        <a href="/users/admin/crearCategorias/crearCategorias.html" class="btn btn-primary mt-2">
                            <i class="fas fa-plus me-2"></i>Crear Categoría
                        </a>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }
        
        categoriasArray.forEach(categoria => {
            // Crear fila principal de categoría
            const tr = document.createElement('tr');
            tr.className = 'categoria-row';
            tr.dataset.id = categoria.id;
            tr.dataset.tipo = 'categoria';
            
            tr.style.cursor = 'pointer';
            tr.onclick = (e) => {
                if (!e.target.closest('.btn-group')) {
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
            
            tr.innerHTML = `
                <td class="expand-cell">
                    <i class="fas fa-chevron-right expand-icon"></i>
                </td>
                <td class="categoria-cell">
                    <div class="d-flex align-items-center">
                        <strong>${categoria.nombre}</strong>
                    </div>
                </td>
                <td class="categoria-cell">
                    <div class="d-flex align-items-center">
                        <span class="text-muted">-</span>
                    </div>
                </td>
                <td class="categoria-cell">
                    <span class="badge bg-secondary">
                        ${categoria.subcategorias.size} subcategoría(s)
                    </span>
                </td>
                <td class="categoria-cell">
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-info" onclick="window.verDetalles('${categoria.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-warning" onclick="window.editarCategoria('${categoria.id}')" title="Editar categoría">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="window.eliminarCategoria('${categoria.id}')" title="Eliminar categoría">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
            
            // Crear fila para subcategorías (oculta inicialmente)
            const subcategoriaRow = document.createElement('tr');
            subcategoriaRow.className = 'subcategoria-row d-none';
            subcategoriaRow.id = `subcategorias-${categoria.id}`;
            subcategoriaRow.dataset.parentId = categoria.id;
            
            subcategoriaRow.innerHTML = `
                <td colspan="5" class="p-0 border-top-0">
                    <div class="subcategorias-container bg-dark p-3">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0 text-light">
                                <i class="fas fa-list me-2"></i>
                                Subcategorías de <span class="text-info">"${categoria.nombre}"</span>
                                <span class="badge bg-secondary ms-2">${categoria.subcategorias.size}</span>
                            </h6>
                            <button class="btn btn-sm btn-outline-success" onclick="window.agregarSubcategoria('${categoria.id}')">
                                <i class="fas fa-plus me-1"></i>Agregar Subcategoría
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-dark table-sm mb-0">
                                <thead>
                                    <tr>
                                        <th width="30">#</th>
                                        <th>Nombre</th>
                                        <th>Descripción</th>
                                        <th width="150">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="subcategorias-body-${categoria.id}">
                                    <!-- Subcategorías se llenarán aquí -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </td>
            `;
            
            tbody.appendChild(subcategoriaRow);
            
            // Cargar subcategorías
            cargarSubcategorias(categoria.id);
        });
        
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        mostrarAlerta('danger', 'Error al cargar las categorías desde Firebase');
    }
}

// Cargar subcategorías de una categoría
async function cargarSubcategorias(categoriaId) {
    if (!categoriaManager) return;
    
    try {
        const tbody = document.getElementById(`subcategorias-body-${categoriaId}`);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const categoria = await categoriaManager.obtenerCategoria(categoriaId);
        
        if (categoria && categoria.subcategorias) {
            const subcategoriasArray = Array.from(categoria.subcategorias.values());
            
            subcategoriasArray.forEach((subcategoriaMap, index) => {
                const subcategoria = {};
                subcategoriaMap.forEach((value, key) => { subcategoria[key] = value; });
                
                const tr = document.createElement('tr');
                tr.className = 'subcategoria-item';
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            ${subcategoria.nombre || ''}
                        </div>
                    </td>
                    <td>
                        <small class="text-muted">${subcategoria.descripcion || 'Sin descripción'}</small>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-info btn-sm" onclick="window.verDetallesSubcategoria('${categoriaId}', '${subcategoria.id}')" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-warning btn-sm" onclick="window.editarSubcategoria('${categoriaId}', '${subcategoria.id}')" title="Editar subcategoría">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-sm" onclick="window.eliminarSubcategoria('${categoriaId}', '${subcategoria.id}')" title="Eliminar subcategoría">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Si no hay subcategorías, mostrar mensaje
            if (categoria.subcategorias.size === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="4" class="text-center py-4">
                        <div class="text-muted">
                            <i class="fas fa-inbox fa-2x mb-2"></i>
                            <p>No hay subcategorías registradas</p>
                            <button class="btn btn-sm btn-outline-primary" onclick="window.agregarSubcategoria('${categoriaId}')">
                                <i class="fas fa-plus me-1"></i>Crear primera subcategoría
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }
        
    } catch (error) {
        console.error('Error al cargar subcategorías:', error);
        mostrarAlerta('danger', `Error al cargar las subcategorías: ${error.message}`);
    }
}

// Toggle para mostrar/ocultar subcategorías
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
            prevIcon?.classList.remove('fa-chevron-down');
            prevIcon?.classList.add('fa-chevron-right');
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

// Confirmar eliminación
async function configurarEventoConfirmar() {
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    if (!btnConfirmar) return;
    
    // Remover event listeners anteriores
    const nuevoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);
    
    nuevoBtn.addEventListener('click', async function() {
        if (!categoriaManager) {
            mostrarAlerta('warning', 'El sistema no está listo');
            return;
        }
        
        try {
            if (tipoEliminacion === 'categoria') {
                await categoriaManager.eliminarCategoria(itemAEliminar);
                
                bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
                await cargarCategorias();
                
                mostrarAlerta('success', 'Categoría eliminada correctamente');
                
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
                    
                    const categoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaId}"]`);
                    const badgeContador = categoriaRow?.querySelector('.badge.bg-secondary');
                    if (badgeContador) {
                        badgeContador.textContent = `${categoria.subcategorias.size} subcategoría(s)`;
                    }
                    
                    const subcategoriaHeader = document.querySelector(`#subcategorias-${categoriaId} h6 .badge`);
                    if (subcategoriaHeader) {
                        subcategoriaHeader.textContent = categoria.subcategorias.size;
                    }
                    
                    mostrarAlerta('success', `Subcategoría "${subcategoria?.nombre || ''}" eliminada correctamente`);
                }
            }
            
        } catch (error) {
            console.error('Error al eliminar:', error);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar'))?.hide();
            mostrarAlerta('danger', `Error al eliminar: ${error.message}`);
        }
        
        itemAEliminar = null;
        tipoEliminacion = null;
    });
}

// Mostrar alerta
function mostrarAlerta(tipo, mensaje) {
    const alertasExistentes = document.querySelectorAll('.alert-notification');
    alertasExistentes.forEach(alerta => alerta.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo} alert-notification alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
            <div>${mensaje}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 4000);
}

// Inicializar eventos
function inicializarEventos() {
    document.getElementById('toggleEliminadas')?.addEventListener('change', function(e) {
        console.log('Mostrar eliminadas:', e.target.checked);
        mostrarAlerta('info', `Filtro: ${e.target.checked ? 'Mostrando' : 'Ocultando'} categorías eliminadas (no implementado)`);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                bootstrap.Modal.getInstance(this)?.hide();
            }
        });
    });
    
    // Estilos dinámicos
    const style = document.createElement('style');
    style.textContent = `
        .categoria-cell {
            transition: background-color 0.2s ease;
        }
        
        .categoria-row:hover .categoria-cell {
            background-color: rgba(47, 140, 255, 0.03) !important;
        }
        
        .categoria-row.expanded .categoria-cell {
            background-color: rgba(47, 140, 255, 0.1) !important;
        }
        
        .subcategoria-item:hover {
            background-color: rgba(255, 255, 255, 0.02) !important;
        }
        
        .color-preview {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border: 1px solid var(--color-border-light);
            display: inline-block;
        }
        
        .color-preview-large {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: 2px solid var(--color-border-light);
            display: inline-block;
        }
        
        .color-indicator {
            width: 12px;
            height: 12px;
            border-radius: 4px;
            display: inline-block;
        }
    `;
    document.head.appendChild(style);
}

// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando página de categorías...');
    
    inicializarEventos();
    await configurarEventoConfirmar();
    
    // Inicializar el manager y cargar datos
    const exito = await inicializarCategoriaManager();
    
    if (!exito) {
        mostrarAlerta('danger', 'No se pudo inicializar el sistema. Recarga la página.');
    }
});