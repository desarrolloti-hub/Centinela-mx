/**
 * CATEGORÍAS - Sistema Centinela
 * VERSIÓN FINAL - CON SWEETALERT2 Y ELIMINACIÓN CORREGIDA
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaExpandidaId = null;
let itemAEliminar = null;
let tipoEliminacion = null;
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

        console.log('✅ CategoriaManager cargado');
        console.log('📁 Colección:', categoriaManager?.nombreColeccion);

        mostrarInfoEmpresa();
        await cargarCategorias();
        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
}

function obtenerDatosEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        empresaActual = {
            nombre: userData.organizacion || 'Mi Empresa'
        };
    } catch (error) {
        empresaActual = { nombre: 'Mi Empresa' };
    }
}

function mostrarInfoEmpresa() {
    const header = document.querySelector('.header-title h1');
    if (header && !document.getElementById('badge-empresa')) {
        const badge = document.createElement('span');
        badge.id = 'badge-empresa';
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(16,185,129,0.1);
            border: 1px solid rgba(16,185,129,0.3);
            color: #10b981;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-left: 12px;
        `;
        badge.innerHTML = `<i class="fas fa-building"></i> ${empresaActual.nombre}`;
        header.appendChild(badge);
    }
}

// =============================================
// FUNCIONES GLOBALES
// =============================================
window.editarCategoria = function (id) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${id}`;
};

window.agregarSubcategoria = function (id) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${id}&nuevaSubcategoria=true`;
};

window.editarSubcategoria = function (catId, subId) {
    event?.stopPropagation();
    window.location.href = `/users/admin/editarCategorias/editarCategorias.html?id=${catId}&editarSubcategoria=${subId}`;
};

// =============================================
// VER DETALLES
// =============================================
window.verDetalles = async function (categoriaId) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    let subcategoriasArray = [];

    if (categoria.subcategorias) {
        if (typeof categoria.subcategorias === 'object') {
            if (categoria.subcategorias.forEach) {
                // Es un Map
                categoria.subcategorias.forEach((value, key) => {
                    if (value && typeof value === 'object') {
                        // Convertir Map a objeto si es necesario
                        if (value instanceof Map) {
                            const subObj = {};
                            value.forEach((v, k) => { subObj[k] = v; });
                            subcategoriasArray.push(subObj);
                        } else {
                            subcategoriasArray.push(value);
                        }
                    }
                });
            } else {
                // Es un objeto plano
                subcategoriasArray = Object.values(categoria.subcategorias);
            }
        }
    }

    const html = `
        <div style="padding: 20px;">
            <h4 style="color: white; margin-bottom: 20px;">${categoria.nombre}</h4>
            <p><strong>Descripción:</strong> ${categoria.descripcion || 'Sin descripción'}</p>
            <p><strong>Color:</strong> 
                <span style="display:inline-block; width:20px; height:20px; background:${categoria.color || '#2f8cff'}; border-radius:4px; vertical-align:middle;"></span> 
                ${categoria.color || '#2f8cff'}
            </p>
            <p><strong>Subcategorías:</strong> ${subcategoriasArray.length}</p>
            
            ${subcategoriasArray.length > 0 ? `
                <h5 style="color: #f97316; margin-top: 20px;">Lista de Subcategorías</h5>
                <div style="margin-top: 10px;">
                    ${subcategoriasArray.map((s, i) => `
                        <div style="background: rgba(0,0,0,0.2); padding: 10px; margin-bottom: 8px; border-radius: 8px;">
                            <strong>${i + 1}. ${s.nombre || 'Sin nombre'}</strong>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">${s.descripcion || 'Sin descripción'}</p>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #6b7280; margin-top: 20px;">No hay subcategorías</p>'}
        </div>
    `;

    document.getElementById('detallesContent').innerHTML = html;
    abrirModal('modalDetalles');
};

window.verDetallesSubcategoria = async function (categoriaId, subcategoriaId) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    let subcategoria = null;

    if (categoria.subcategorias) {
        if (typeof categoria.subcategorias === 'object') {
            if (categoria.subcategorias.get) {
                // Es un Map
                const subMap = categoria.subcategorias.get(subcategoriaId);
                if (subMap) {
                    subcategoria = {};
                    if (subMap instanceof Map) {
                        subMap.forEach((value, key) => { subcategoria[key] = value; });
                    } else {
                        subcategoria = subMap;
                    }
                }
            } else {
                // Es un objeto
                subcategoria = categoria.subcategorias[subcategoriaId];
            }
        }
    }

    if (!subcategoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Subcategoría no encontrada',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff'
        });
        return;
    }

    const html = `
        <div style="padding: 20px;">
            <h4 style="color: #f97316; margin-bottom: 20px;">${subcategoria.nombre || 'Sin nombre'}</h4>
            <p><strong>Categoría padre:</strong> ${categoria.nombre}</p>
            <p><strong>Descripción:</strong> ${subcategoria.descripcion || 'Sin descripción'}</p>
            ${subcategoria.color ? `
                <p><strong>Color:</strong> 
                    <span style="display:inline-block; width:20px; height:20px; background:${subcategoria.color}; border-radius:4px; vertical-align:middle;"></span> 
                    ${subcategoria.color}
                </p>
                <p><strong>Hereda color:</strong> ${subcategoria.heredaColor ? 'Sí' : 'No'}</p>
            ` : ''}
        </div>
    `;

    document.getElementById('detallesContent').innerHTML = html;
    abrirModal('modalDetalles');
};

// =============================================
// 🎯 ELIMINAR CON SWEETALERT2
// =============================================
window.eliminarCategoria = async function (categoriaId) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    // Verificar si tiene subcategorías
    let tieneSubcategorias = false;
    if (categoria.subcategorias) {
        if (typeof categoria.subcategorias === 'object') {
            if (categoria.subcategorias.size !== undefined) {
                tieneSubcategorias = categoria.subcategorias.size > 0;
            } else {
                tieneSubcategorias = Object.keys(categoria.subcategorias).length > 0;
            }
        }
    }

    if (tieneSubcategorias) {
        Swal.fire({
            icon: 'warning',
            title: 'No se puede eliminar',
            text: `La categoría "${categoria.nombre}" tiene subcategorías asociadas`,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar categoría?',
        text: `Estás a punto de eliminar "${categoria.nombre}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        try {
            await categoriaManager.eliminarCategoria(categoriaId);

            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: `La categoría "${categoria.nombre}" ha sido eliminada`,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#10b981',
                timer: 2000,
                timerProgressBar: true
            });

            await cargarCategorias();

        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo eliminar: ${error.message}`,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#2f8cff'
            });
        }
    }
};

// =============================================
// 🎯 ELIMINAR SUBCATEGORÍA - VERSIÓN CORREGIDA
// =============================================
window.eliminarSubcategoria = async function (categoriaId, subcategoriaId) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Categoría no encontrada',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff'
        });
        return;
    }

    // 🔥 CORREGIDO: Obtener la subcategoría correctamente
    let subcategoria = null;
    let subcategoriaNombre = '';

    try {
        if (categoria.subcategorias) {
            if (typeof categoria.subcategorias === 'object') {
                // CASO 1: Es un Map
                if (categoria.subcategorias.get) {
                    const subMap = categoria.subcategorias.get(subcategoriaId);
                    if (subMap) {
                        if (subMap instanceof Map) {
                            subcategoria = {};
                            subMap.forEach((value, key) => { subcategoria[key] = value; });
                        } else {
                            subcategoria = subMap;
                        }
                    }
                }
                // CASO 2: Es un objeto plano
                else if (categoria.subcategorias[subcategoriaId]) {
                    subcategoria = categoria.subcategorias[subcategoriaId];
                }
            }
        }
    } catch (e) {
        console.error('Error al obtener subcategoría:', e);
    }

    // Si no encontramos la subcategoría, intentamos buscarla en el array
    if (!subcategoria) {
        // Intentar convertir a array y buscar
        let subArray = [];
        if (categoria.subcategorias) {
            if (categoria.subcategorias.forEach) {
                categoria.subcategorias.forEach((value, key) => {
                    if (key === subcategoriaId) {
                        if (value instanceof Map) {
                            subcategoria = {};
                            value.forEach((v, k) => { subcategoria[k] = v; });
                        } else {
                            subcategoria = value;
                        }
                    }
                });
            }
        }
    }

    subcategoriaNombre = subcategoria?.nombre || 'Sin nombre';

    if (!subcategoria) {
        console.error('Subcategoría no encontrada:', { categoriaId, subcategoriaId, categoria });
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Subcategoría no encontrada',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff'
        });
        return;
    }

    // Confirmación con SweetAlert2
    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
        html: `Estás a punto de eliminar "<strong style="color: #ef4444;">${subcategoriaNombre}</strong>"<br>de la categoría "<strong>${categoria.nombre}</strong>"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        try {
            // 🔥 CORREGIDO: Eliminar subcategoría
            if (categoria.eliminarSubcategoria) {
                categoria.eliminarSubcategoria(subcategoriaId);
            } else if (categoria.subcategorias && categoria.subcategorias.delete) {
                categoria.subcategorias.delete(subcategoriaId);
            } else if (categoria.subcategorias && typeof categoria.subcategorias === 'object') {
                delete categoria.subcategorias[subcategoriaId];
            }

            // Actualizar en Firebase
            await categoriaManager.actualizarCategoria(categoriaId, {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion,
                color: categoria.color
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: `La subcategoría "${subcategoriaNombre}" ha sido eliminada`,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#10b981',
                timer: 2000,
                timerProgressBar: true
            });

            // Recargar subcategorías
            await cargarSubcategorias(categoriaId);

            // Actualizar contador en la fila de categoría
            const categoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaId}"]`);
            if (categoriaRow) {
                // Recalcular número de subcategorías
                let numSub = 0;
                if (categoria.subcategorias) {
                    if (categoria.subcategorias.size !== undefined) {
                        numSub = categoria.subcategorias.size;
                    } else {
                        numSub = Object.keys(categoria.subcategorias).length;
                    }
                }

                const badge = categoriaRow.querySelector('td[data-label="Subcategorías"] span');
                if (badge) {
                    badge.innerHTML = `<i class="fas fa-folder${numSub > 0 ? '-open' : ''}"></i> ${numSub} ${numSub === 1 ? 'subcategoría' : 'subcategorías'}`;
                    badge.style.background = numSub > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)';
                    badge.style.color = numSub > 0 ? '#10b981' : '#9ca3af';
                }

                const btnEliminar = categoriaRow.querySelector('.btn-outline-danger');
                if (btnEliminar) {
                    btnEliminar.disabled = numSub > 0;
                }
            }

        } catch (error) {
            console.error('Error al eliminar subcategoría:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo eliminar: ${error.message}`,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#2f8cff'
            });
        }
    }
};

// =============================================
// MODALES
// =============================================
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// =============================================
// CARGAR CATEGORÍAS
// =============================================
async function cargarCategorias() {
    if (!categoriaManager) return;

    try {
        const tbody = document.getElementById('tablaCategoriasBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Cargando categorías...</td></tr>';

        categoriasCache = await categoriaManager.obtenerTodasCategorias();
        console.log('📦 Categorías cargadas:', categoriasCache?.length || 0);

        if (!categoriasCache || categoriasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-tags" style="font-size:48px; color:rgba(16,185,129,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay categorías</h5>
                            <a href="/users/admin/crearCategorias/crearCategorias.html" class="btn-nueva-categoria" style="display:inline-flex; margin-top:16px;">
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
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar categorías',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff'
        });
    }
}

async function crearFilaCategoria(categoria, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'categoria-row';
    tr.dataset.id = categoria.id;

    tr.onclick = (e) => {
        if (!e.target.closest('.btn-group')) {
            toggleSubcategorias(categoria.id);
        }
    };

    // Contar subcategorías
    let numSub = 0;
    if (categoria.subcategorias) {
        if (typeof categoria.subcategorias === 'object') {
            if (categoria.subcategorias.size !== undefined) {
                numSub = categoria.subcategorias.size;
            } else {
                numSub = Object.keys(categoria.subcategorias).length;
            }
        }
    }

    const color = categoria.color || '#2f8cff';

    tr.innerHTML = `
        <td style="width:50px;">
            <i class="fas fa-chevron-right expand-icon"></i>
        </td>
        <td data-label="Nombre">
            <div style="display:flex; align-items:center;">
                <div style="width:4px; height:24px; background:${color}; border-radius:2px; margin-right:12px;"></div>
                <strong style="color:white;">${categoria.nombre}</strong>
            </div>
        </td>
        <td data-label="Color" style="text-align:center;">
            <div class="color-display">
                <span class="color-indicator" style="background-color: ${color};"></span>
                <span>${color}</span>
            </div>
        </td>
        <td data-label="Subcategorías">
            <span style="display:inline-block; padding:4px 12px; border-radius:20px; 
                  background:${numSub > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)'}; 
                  color:${numSub > 0 ? '#10b981' : '#9ca3af'};">
                <i class="fas fa-folder${numSub > 0 ? '-open' : ''}"></i>
                ${numSub} ${numSub === 1 ? 'subcategoría' : 'subcategorías'}
            </span>
        </td>
        <td data-label="Acciones">
            <div class="btn-group">
                <button type="button" class="btn btn-outline-info" onclick="window.verDetalles('${categoria.id}')" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-outline-warning" onclick="window.editarCategoria('${categoria.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-outline-danger" onclick="window.eliminarCategoria('${categoria.id}')" title="Eliminar" ${numSub > 0 ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    // Fila de subcategorías
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
                        Subcategorías de <span style="color:#2f8cff;">"${categoria.nombre}"</span>
                    </h6>
                    <button class="btn-agregar-sub" onclick="window.agregarSubcategoria('${categoria.id}')">
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

    console.log(`🔍 Cargando subcategorías de: ${categoria.nombre}`);

    // OBTENER SUBCATEGORÍAS
    let subcategoriasArray = [];

    try {
        if (categoria.subcategorias) {
            if (typeof categoria.subcategorias === 'object') {
                // CASO 1: Es un Map
                if (categoria.subcategorias.forEach) {
                    categoria.subcategorias.forEach((value, key) => {
                        if (value && typeof value === 'object') {
                            // Si el valor es un Map, convertirlo a objeto
                            if (value instanceof Map) {
                                const subObj = {};
                                value.forEach((v, k) => { subObj[k] = v; });
                                subcategoriasArray.push(subObj);
                            } else {
                                subcategoriasArray.push(value);
                            }
                        }
                    });
                }
                // CASO 2: Es un objeto plano
                else {
                    subcategoriasArray = Object.values(categoria.subcategorias);
                }
            }
        }
    } catch (e) {
        console.warn('Error al obtener subcategorías:', e);
        subcategoriasArray = [];
    }

    console.log(`📋 Encontradas: ${subcategoriasArray.length} subcategorías`);

    if (subcategoriasArray.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:rgba(0,0,0,0.2); border-radius:8px;">
                <i class="fas fa-folder-open" style="font-size:32px; color:#6b7280; margin-bottom:8px;"></i>
                <p style="color:#6b7280; margin-bottom:12px;">No hay subcategorías</p>
                <button class="btn-agregar-sub" onclick="window.agregarSubcategoria('${categoriaId}')">
                    <i class="fas fa-plus-circle"></i> Crear subcategoría
                </button>
            </div>
        `;
        return;
    }

    // Ordenar por nombre
    subcategoriasArray.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = `
        <div style="background:rgba(0,0,0,0.2); border-radius:8px; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; min-width:600px;">
                <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <th style="padding:12px; text-align:left; color:#9ca3af;">#</th>
                        <th style="padding:12px; text-align:left; color:#9ca3af;">Nombre</th>
                        <th style="padding:12px; text-align:left; color:#9ca3af;">Descripción</th>
                        <th style="padding:12px; text-align:left; color:#9ca3af;">Color</th>
                        <th style="padding:12px; text-align:left; color:#9ca3af;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    subcategoriasArray.forEach((sub, index) => {
        const colorSub = sub.color || categoria.color || '#2f8cff';
        const hereda = sub.heredaColor ? true : false;

        html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:12px; color:#9ca3af;">${index + 1}</td>
                <td style="padding:12px;">
                    <div style="display:flex; align-items:center; flex-wrap:wrap;">
                        <span style="display:inline-block; width:12px; height:12px; background:${colorSub}; border-radius:4px; margin-right:8px;"></span>
                        <span style="color:white; margin-right:8px;">${sub.nombre || 'Sin nombre'}</span>
                        ${hereda ?
                '<span style="padding:2px 6px; background:rgba(16,185,129,0.1); color:#10b981; border-radius:12px; font-size:10px;">Hereda</span>' :
                sub.color ? '<span style="padding:2px 6px; background:rgba(249,115,22,0.1); color:#f97316; border-radius:12px; font-size:10px;">Propio</span>' : ''
            }
                    </div>
                </td>
                <td style="padding:12px; color:#d1d5db;">${sub.descripcion || '<span style="color:#6b7280;">-</span>'}</td>
                <td style="padding:12px;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="display:inline-block; width:16px; height:16px; background:${colorSub}; border-radius:4px;"></span>
                        <span style="color:#9ca3af; font-size:11px;">${colorSub}</span>
                    </div>
                </td>
                <td style="padding:12px;">
                    <div style="display:flex; gap:4px;">
                        <button class="btn" onclick="window.verDetallesSubcategoria('${categoriaId}', '${sub.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn" onclick="window.editarSubcategoria('${categoriaId}', '${sub.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.eliminarSubcategoria('${categoriaId}', '${sub.id}')" title="Eliminar">
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

function toggleSubcategorias(categoriaId) {
    const row = document.getElementById(`sub-${categoriaId}`);
    const icon = document.querySelector(`.categoria-row[data-id="${categoriaId}"] .expand-icon`);

    if (!row || !icon) return;

    if (categoriaExpandidaId && categoriaExpandidaId !== categoriaId) {
        const prevRow = document.getElementById(`sub-${categoriaExpandidaId}`);
        const prevIcon = document.querySelector(`.categoria-row[data-id="${categoriaExpandidaId}"] .expand-icon`);
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

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Inicializando sistema de categorías...');

    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            cerrarModal(e.target.id);
        }
    });

    await inicializarCategoriaManager();
});

// Funciones globales
window.cerrarModal = cerrarModal;