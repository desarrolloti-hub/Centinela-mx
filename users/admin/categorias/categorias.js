/**
 * CATEGORÍAS - Sistema Centinela
 * SweetAlert de detalles IDÉNTICO al de áreas (con descripción izquierda, info derecha)
 * BOTONES: Editar a la izquierda, Cerrar a la derecha
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaExpandidaId = null;
let empresaActual = null;
let categoriasCache = [];

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarCategoriaManager() {
    try {
        obtenerDatosEmpresa();

        const { CategoriaManager } = await import('/clases/categoria.js');
        categoriaManager = new CategoriaManager();

        await cargarCategorias();
        return true;
    } catch (error) {
        console.error('Error al inicializar categorías:', error);
        return false;
    }
}

function obtenerDatosEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        empresaActual = {
            nombre: userData.organizacion || 'Mi Empresa',
            camelCase: userData.organizacionCamelCase || ''
        };
    } catch (error) {
        empresaActual = { nombre: 'Mi Empresa', camelCase: '' };
    }
}

// =============================================
// FUNCIONES GLOBALES
// =============================================
window.editarCategoria = function (id, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${id}`;
};

window.agregarSubcategoria = function (id, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${id}&nuevaSubcategoria=true`;
};

window.editarSubcategoria = function (catId, subId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${catId}&editarSubcategoria=${subId}`;
};

// =============================================
// VER DETALLES - SweetAlert IDÉNTICO AL DE ÁREAS
// =============================================
window.verDetalles = async function (categoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    // Limitar longitud del nombre para evitar desbordamiento
    const nombreCategoriaTruncado = categoria.nombre && categoria.nombre.length > 25 
        ? categoria.nombre.substring(0, 22) + '...' 
        : categoria.nombre;

    // Obtener subcategorías como array
    let subcategoriasArray = [];

    if (categoria.subcategorias && typeof categoria.subcategorias === 'object') {
        if (categoria.subcategorias.forEach) {
            categoria.subcategorias.forEach((value, key) => {
                if (value && typeof value === 'object') {
                    const sub = value instanceof Map ? Object.fromEntries(value) : value;
                    subcategoriasArray.push({ ...sub, id: key });
                }
            });
        } else {
            subcategoriasArray = Object.keys(categoria.subcategorias).map(key => ({
                ...categoria.subcategorias[key],
                id: key
            }));
        }
    }

    const cantidadSub = subcategoriasArray.length;

    // Generar HTML para subcategorías
    let subcategoriasHTML = '';

    if (cantidadSub === 0) {
        subcategoriasHTML = '<div class="modal-empty-message">Esta categoría no tiene subcategorías asignadas</div>';
    } else {
        subcategoriasHTML = subcategoriasArray.map(sub => {
            const subNombre = sub.nombre || 'Sin nombre';
            const subDesc = sub.descripcion || 'Sin descripción';
            
            return `
                <div class="subcategoria-item-modal">
                    <strong>
                        <i class="fas fa-folder"></i>
                        ${escapeHTML(subNombre)}
                    </strong>
                    <p>${escapeHTML(subDesc)}</p>
                </div>
            `;
        }).join('');
    }

    Swal.fire({
        customClass: {
            popup: 'swal2-popup',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel',
            closeButton: 'swal2-close',
            actions: 'swal2-actions'
        },
        title: `<div class="swal-titulo-container">
            <div class="swal-titulo-categoria">
                <i class="fas fa-tags"></i>
                <span class="swal-titulo-texto" title="${escapeHTML(categoria.nombre)}">${escapeHTML(nombreCategoriaTruncado)}</span>
            </div>
        </div>`,
        html: `
            <div class="swal-detalles-container">
                <!-- SECCIÓN DESCRIPCIÓN -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-align-left"></i> DESCRIPCIÓN DE LA CATEGORÍA</h6>
                    <p class="swal-descripcion">${escapeHTML(categoria.descripcion) || 'No hay descripción disponible para esta categoría.'}</p>
                </div>

                <!-- SECCIÓN COLOR -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-palette"></i> COLOR DE LA CATEGORÍA</h6>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="display:inline-block; width:30px; height:30px; background:${categoria.color || '#2f8cff'}; border-radius:4px; border:2px solid rgba(255,255,255,0.1);"></span>
                        <span style="color: var(--color-text-secondary);">${categoria.color || '#2f8cff'}</span>
                    </div>
                </div>

                <!-- SECCIÓN SUBCATEGORÍAS -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-folder-open"></i> SUBCATEGORÍAS (${cantidadSub})</h6>
                    <div class="subcategorias-lista-modal">
                        ${subcategoriasHTML}
                    </div>
                </div>
            </div>
        `,
        icon: null,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-edit"></i> EDITAR CATEGORÍA',
        cancelButtonText: '<i class="fas fa-times"></i> CERRAR',
        reverseButtons: false, // EDITAR a la izquierda, CERRAR a la derecha
        buttonsStyling: false, // Para que tome los estilos personalizados del CSS
        focusConfirm: false,
        focusCancel: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.editarCategoria(categoria.id, event);
        }
    });
};

// =============================================
// VER DETALLES DE SUBCATEGORÍA
// =============================================
window.verDetallesSubcategoria = async function (categoriaId, subcategoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    let subcategoria = null;
    let subcategoriaNombre = '';

    if (categoria.subcategorias) {
        if (categoria.subcategorias.get) {
            const sub = categoria.subcategorias.get(subcategoriaId);
            if (sub) {
                subcategoria = sub instanceof Map ? Object.fromEntries(sub) : sub;
            }
        } else {
            subcategoria = categoria.subcategorias[subcategoriaId];
        }
    }

    if (!subcategoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Subcategoría no encontrada',
            customClass: {
                popup: 'swal2-popup',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            },
            buttonsStyling: false
        });
        return;
    }

    const colorSub = subcategoria.color || categoria.color || '#2f8cff';
    const hereda = subcategoria.heredaColor || false;
    
    const nombreCorto = subcategoria.nombre && subcategoria.nombre.length > 25 
        ? subcategoria.nombre.substring(0, 22) + '...' 
        : subcategoria.nombre || 'Subcategoría';

    Swal.fire({
        customClass: {
            popup: 'swal2-popup',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel',
            closeButton: 'swal2-close',
            actions: 'swal2-actions'
        },
        title: `<div class="swal-titulo-container">
            <div class="swal-titulo-categoria">
                <i class="fas fa-folder"></i>
                <span class="swal-titulo-texto" title="${escapeHTML(subcategoria.nombre || '')}">${escapeHTML(nombreCorto)}</span>
            </div>
        </div>`,
        html: `
            <div class="swal-detalles-container">
                <!-- CATEGORÍA PADRE -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-sitemap"></i> CATEGORÍA PADRE</h6>
                    <p class="swal-descripcion">${escapeHTML(categoria.nombre)}</p>
                </div>

                <!-- DESCRIPCIÓN -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-align-left"></i> DESCRIPCIÓN DE LA SUBCATEGORÍA</h6>
                    <p class="swal-descripcion">${escapeHTML(subcategoria.descripcion) || 'No hay descripción disponible.'}</p>
                </div>

                <!-- COLOR -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-palette"></i> COLOR</h6>
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span style="display:inline-block; width:30px; height:30px; background:${colorSub}; border-radius:4px; border:2px solid rgba(255,255,255,0.1);"></span>
                        <span style="color: var(--color-text-secondary);">${colorSub}</span>
                        ${hereda ? '<span class="badge badge-hereda" style="background:rgba(16,185,129,0.1); color:#10b981; padding:2px 8px; border-radius:12px; font-size:0.7rem;">HEREDA</span>' : ''}
                    </div>
                </div>

                <!-- INFORMACIÓN DEL SISTEMA -->
                <div class="swal-seccion">
                    <h6 class="swal-seccion-titulo"><i class="fas fa-info-circle"></i> INFORMACIÓN DEL SISTEMA</h6>
                    <div class="swal-info-grid">
                        <div class="swal-info-item">
                            <small>ID SUBCATEGORÍA</small>
                            <span><i class="fas fa-fingerprint"></i> ${subcategoriaId.substring(0, 8)}...</span>
                        </div>
                        <div class="swal-info-item">
                            <small>HEREDA COLOR</small>
                            <span><i class="fas ${hereda ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${hereda ? 'SÍ' : 'NO'}</span>
                        </div>
                        <div class="swal-info-item">
                            <small>FECHA CREACIÓN</small>
                            <span><i class="fas fa-calendar"></i> ${subcategoria.fechaCreacion ? new Date(subcategoria.fechaCreacion).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No disponible'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        icon: null,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-edit"></i> EDITAR SUBCATEGORÍA',
        cancelButtonText: '<i class="fas fa-times"></i> CERRAR',
        reverseButtons: false,
        buttonsStyling: false,
        focusConfirm: false,
        focusCancel: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.editarSubcategoria(categoriaId, subcategoriaId, event);
        }
    });
};

// =============================================
// ELIMINAR CATEGORÍA
// =============================================
window.eliminarCategoria = async function (categoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    // Contar subcategorías
    let numSub = 0;

    if (categoria.subcategorias) {
        if (typeof categoria.subcategorias === 'object') {
            if (categoria.subcategorias.forEach) {
                numSub = categoria.subcategorias.size;
            } else {
                numSub = Object.keys(categoria.subcategorias).length;
            }
        }
    }

    const result = await Swal.fire({
        title: '¿Eliminar categoría?',
        html: `
            <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                <strong style="color: #ff4d4d;">"${escapeHTML(categoria.nombre)}"</strong>
            </p>
            ${numSub > 0 ? `
                <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin: 5px 0;">
                    <i class="fas fa-folder-open" style="color: #ef4444;"></i>
                    Tiene ${numSub} subcategoría${numSub !== 1 ? 's' : ''}
                </p>
            ` : ''}
            <p style="color: var(--color-text-dim); font-size: 0.8rem; margin-top: 15px;">
                Esta acción no se puede deshacer.
            </p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ELIMINAR',
        cancelButtonText: 'CANCELAR',
        reverseButtons: false,
        focusCancel: true,
        customClass: {
            popup: 'swal2-popup',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel'
        },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Eliminando...',
                html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #ef4444;"></i>',
                allowOutsideClick: false,
                showConfirmButton: false,
                customClass: {
                    popup: 'swal2-popup'
                },
                buttonsStyling: false
            });

            await categoriaManager.eliminarCategoria(categoriaId);

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: `"${categoria.nombre}" ha sido eliminada.`,
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'swal2-popup'
                },
                buttonsStyling: false
            });

            await cargarCategorias();

        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al eliminar',
                customClass: {
                    popup: 'swal2-popup',
                    confirmButton: 'swal2-confirm'
                },
                buttonsStyling: false
            });
        }
    }
};

// =============================================
// ELIMINAR SUBCATEGORÍA
// =============================================
window.eliminarSubcategoria = async function (categoriaId, subcategoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Categoría no encontrada',
            customClass: {
                popup: 'swal2-popup',
                confirmButton: 'swal2-confirm'
            },
            buttonsStyling: false
        });
        return;
    }

    let subcategoria = null;
    let subcategoriaNombre = '';

    if (categoria.subcategorias) {
        if (categoria.subcategorias.get) {
            const sub = categoria.subcategorias.get(subcategoriaId);
            if (sub) {
                subcategoria = sub instanceof Map ? Object.fromEntries(sub) : sub;
            }
        } else {
            subcategoria = categoria.subcategorias[subcategoriaId];
        }
    }

    if (!subcategoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Subcategoría no encontrada',
            customClass: {
                popup: 'swal2-popup',
                confirmButton: 'swal2-confirm'
            },
            buttonsStyling: false
        });
        return;
    }

    subcategoriaNombre = subcategoria.nombre || 'Sin nombre';

    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
        html: `
            <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                <strong style="color: #ff4d4d;">"${escapeHTML(subcategoriaNombre)}"</strong>
            </p>
            <p style="color: var(--color-text-dim); font-size: 0.8rem; margin-top: 15px;">
                Esta acción no se puede deshacer.
            </p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ELIMINAR',
        cancelButtonText: 'CANCELAR',
        reverseButtons: false,
        focusCancel: true,
        customClass: {
            popup: 'swal2-popup',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel'
        },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        try {
            if (categoria.eliminarSubcategoria) {
                categoria.eliminarSubcategoria(subcategoriaId);
            } else if (categoria.subcategorias && categoria.subcategorias.delete) {
                categoria.subcategorias.delete(subcategoriaId);
            } else {
                delete categoria.subcategorias[subcategoriaId];
            }

            await categoriaManager.actualizarCategoria(categoriaId, {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion,
                color: categoria.color,
                subcategorias: categoria.subcategorias
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: `"${subcategoriaNombre}" ha sido eliminada.`,
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: 'swal2-popup'
                },
                buttonsStyling: false
            });

            const categoriaActualizada = await categoriaManager.obtenerCategoriaPorId(categoriaId);
            const index = categoriasCache.findIndex(c => c.id === categoriaId);
            if (index !== -1) categoriasCache[index] = categoriaActualizada;

            await cargarSubcategorias(categoriaId);

            const categoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaId}"]`);
            if (categoriaRow) {
                let numSub = 0;
                if (categoriaActualizada.subcategorias) {
                    numSub = categoriaActualizada.subcategorias.size || 
                            Object.keys(categoriaActualizada.subcategorias).length;
                }
                const badge = categoriaRow.querySelector('td[data-label="Subcategorías"] span');
                if (badge) {
                    badge.innerHTML = `<i class="fas fa-folder${numSub > 0 ? '-open' : ''}"></i> ${numSub} ${numSub === 1 ? 'subcategoría' : 'subcategorías'}`;
                    badge.className = numSub > 0 ? 'subcategoria-count-badge' : 'badge';
                }
            }

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                customClass: {
                    popup: 'swal2-popup',
                    confirmButton: 'swal2-confirm'
                },
                buttonsStyling: false
            });
        }
    }
};

// =============================================
// CARGAR CATEGORÍAS
// =============================================
async function cargarCategorias() {
    if (!categoriaManager) return;

    try {
        const tbody = document.getElementById('tablaCategoriasBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Cargando categorías...</td></tr>';

        categoriasCache = await categoriaManager.obtenerTodasCategorias();

        if (!categoriasCache || categoriasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-tags" style="font-size:48px; color:rgba(16,185,129,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay categorías</h5>
                            <a href="/users/admin/crearCategorias/crearCategorias.html" class="btn-nueva-categoria-header" style="display:inline-flex; margin-top:16px;">
                                <i class="fas fa-plus-circle"></i> Crear Categoría
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        categoriasCache.sort((a, b) => a.nombre.localeCompare(b.nombre));

        for (const categoria of categoriasCache) {
            await crearFilaCategoria(categoria, tbody);
        }

    } catch (error) {
        console.error('Error al cargar categorías:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar categorías',
            customClass: {
                popup: 'swal2-popup',
                confirmButton: 'swal2-confirm'
            },
            buttonsStyling: false
        });
    }
}

async function crearFilaCategoria(categoria, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'categoria-row';
    tr.dataset.id = categoria.id;

    tr.onclick = (e) => {
        if (!e.target.closest('.action-buttons') && !e.target.closest('.btn') && !e.target.closest('.subcategoria-count-badge') && !e.target.closest('.toggle-icon')) {
            toggleSubcategorias(categoria.id);
        }
    };

    let numSub = 0;
    if (categoria.subcategorias) {
        if (categoria.subcategorias.size !== undefined) {
            numSub = categoria.subcategorias.size;
        } else {
            numSub = Object.keys(categoria.subcategorias).length;
        }
    }

    const color = categoria.color || '#2f8cff';
    
    const nombreTruncado = categoria.nombre && categoria.nombre.length > 30 
        ? categoria.nombre.substring(0, 27) + '...' 
        : categoria.nombre;

    tr.innerHTML = `
        <td class="text-center" style="width:50px;" data-label="">
            <span class="toggle-icon"><i class="fas fa-chevron-right"></i></span>
        </td>
        <td data-label="Nombre">
            <div class="d-flex align-items-center">
                <div style="width:4px; height:24px; background:${color}; border-radius:2px; margin-right:12px; flex-shrink:0;"></div>
                <div>
                    <strong class="categoria-nombre" style="color:white;" title="${escapeHTML(categoria.nombre || '')}">${escapeHTML(nombreTruncado)}</strong>
                </div>
            </div>
        </td>
        <td data-label="Color" style="text-align:center;">
            <div class="color-display">
                <span class="color-indicator" style="background-color: ${color};"></span>
                <span>${color}</span>
            </div>
        </td>
        <td data-label="Subcategorías">
            <span class="${numSub > 0 ? 'subcategoria-count-badge' : 'badge'}" style="${numSub === 0 ? 'background:rgba(107,114,128,0.2); color:#9ca3af;' : ''}">
                <i class="fas fa-folder${numSub > 0 ? '-open' : ''}"></i>
                ${numSub} ${numSub === 1 ? 'subcategoría' : 'subcategorías'}
            </span>
        </td>
        <td data-label="Acciones">
            <div class="action-buttons">
                <button type="button" class="btn btn-primary" data-action="ver" data-id="${categoria.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-warning" data-action="editar" data-id="${categoria.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-danger" data-action="eliminar" data-id="${categoria.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    const subRow = document.createElement('tr');
    subRow.className = 'subcategoria-row';
    subRow.id = `sub-${categoria.id}`;
    subRow.style.display = 'none';

    subRow.innerHTML = `
        <td colspan="5" style="padding:0; border-top:none;">
            <div class="subcategorias-container">
                <div class="subcategorias-header">
                    <h6>
                        <i class="fas fa-list-ul"></i>
                        Subcategorías de <span style="color:#2f8cff;">"${escapeHTML(categoria.nombre)}"</span>
                    </h6>
                    <button class="btn-agregar-sub" onclick="window.agregarSubcategoria('${categoria.id}', event)">
                        <i class="fas fa-plus-circle"></i> Agregar
                    </button>
                </div>
                <div id="sub-content-${categoria.id}">
                    <div style="text-align:center; padding:20px; color:#6b7280;">
                        <i class="fas fa-spinner fa-spin"></i> Cargando subcategorías...
                    </div>
                </div>
            </div>
        </td>
    `;

    tbody.appendChild(subRow);

    setTimeout(() => {
        tr.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'ver') window.verDetalles(id, e);
                else if (action === 'editar') window.editarCategoria(id, e);
                else if (action === 'eliminar') window.eliminarCategoria(id, e);
            });
        });
        
        const badge = tr.querySelector('.subcategoria-count-badge');
        if (badge) {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSubcategorias(categoria.id);
            });
        }
        
        const toggleIcon = tr.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSubcategorias(categoria.id);
            });
        }
        
        const categoriaNombre = tr.querySelector('.categoria-nombre');
        if (categoriaNombre) {
            categoriaNombre.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSubcategorias(categoria.id);
            });
        }
    }, 50);

    await cargarSubcategorias(categoria.id);
}

// =============================================
// CARGAR SUBCATEGORÍAS
// =============================================
async function cargarSubcategorias(categoriaId) {
    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    const container = document.getElementById(`sub-content-${categoriaId}`);
    if (!container) return;

    let subcategoriasArray = [];

    try {
        if (categoria.subcategorias) {
            if (categoria.subcategorias.forEach) {
                categoria.subcategorias.forEach((value, key) => {
                    if (value && typeof value === 'object') {
                        const sub = value instanceof Map ? Object.fromEntries(value) : value;
                        subcategoriasArray.push({ ...sub, id: key });
                    }
                });
            } else {
                subcategoriasArray = Object.keys(categoria.subcategorias).map(key => ({
                    ...categoria.subcategorias[key],
                    id: key
                }));
            }
        }
    } catch (e) {
        subcategoriasArray = [];
    }

    if (subcategoriasArray.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:rgba(0,0,0,0.2); border-radius:8px;">
                <i class="fas fa-folder-open" style="font-size:32px; color:#6b7280;"></i>
                <p style="color:#6b7280;">No hay subcategorías</p>
                <button class="btn-agregar-sub" onclick="window.agregarSubcategoria('${categoriaId}', event)">
                    <i class="fas fa-plus-circle"></i> Crear subcategoría
                </button>
            </div>
        `;
        return;
    }

    subcategoriasArray.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = `
        <div class="subcategorias-tabla-wrapper">
            <table class="subcategorias-tabla">
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th style="width: 25%;">Nombre</th>
                        <th style="width: 35%;">Descripción</th>
                        <th style="width: 15%;">Color</th>
                        <th style="width: 110px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    subcategoriasArray.forEach((sub, index) => {
        const colorSub = sub.color || categoria.color || '#2f8cff';
        const hereda = sub.heredaColor || false;
        
        const descripcionTruncada = sub.descripcion && sub.descripcion.length > 40 
            ? sub.descripcion.substring(0, 37) + '...' 
            : sub.descripcion || '';
            
        const nombreTruncado = sub.nombre && sub.nombre.length > 18 
            ? sub.nombre.substring(0, 15) + '...' 
            : sub.nombre || 'Sin nombre';

        html += `
            <tr>
                <td data-label="#">${index + 1}</td>
                <td data-label="Nombre">
                    <div class="subcategoria-nombre-contenedor" style="flex-wrap: nowrap;">
                        <span class="color-indicator" style="background-color: ${colorSub}; width:12px; height:12px; flex-shrink:0;"></span>
                        <span class="subcategoria-nombre-texto" style="max-width:120px;" title="${escapeHTML(sub.nombre || '')}">${escapeHTML(nombreTruncado)}</span>
                        ${hereda ? '<span class="subcategoria-badge badge-hereda" style="flex-shrink:0;">HEREDA</span>' : ''}
                        ${!hereda && sub.color ? '<span class="subcategoria-badge badge-propio" style="flex-shrink:0;">PROPIO</span>' : ''}
                    </div>
                </td>
                <td data-label="Descripción">
                    <span class="subcategoria-descripcion" style="max-width:200px;" title="${escapeHTML(sub.descripcion || '')}">${escapeHTML(descripcionTruncada) || '-'}</span>
                </td>
                <td data-label="Color">
                    <div class="subcategoria-color-contenedor">
                        <span class="subcategoria-color-muestra" style="background-color: ${colorSub};"></span>
                        <span class="subcategoria-color-texto">${colorSub}</span>
                    </div>
                </td>
                <td data-label="Acciones">
                    <div class="subcategoria-acciones">
                        <button class="btn" onclick="window.verDetallesSubcategoria('${categoriaId}', '${sub.id}', event)" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn" onclick="window.editarSubcategoria('${categoriaId}', '${sub.id}', event)" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.eliminarSubcategoria('${categoriaId}', '${sub.id}', event)" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// =============================================
// UTILIDADES
// =============================================
function toggleSubcategorias(categoriaId) {
    const row = document.getElementById(`sub-${categoriaId}`);
    const icon = document.querySelector(`.categoria-row[data-id="${categoriaId}"] .toggle-icon i`);

    if (!row || !icon) return;

    if (categoriaExpandidaId && categoriaExpandidaId !== categoriaId) {
        const prevRow = document.getElementById(`sub-${categoriaExpandidaId}`);
        const prevIcon = document.querySelector(`.categoria-row[data-id="${categoriaExpandidaId}"] .toggle-icon i`);
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
        categoriaExpandidaId = categoriaId;
    } else {
        row.style.display = 'none';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
        categoriaExpandidaId = null;
    }
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    await inicializarCategoriaManager();
});