/**
 * CATEGORÍAS - Sistema Centinela
 * VERSIÓN FINAL - CON ELIMINACIÓN EN CASCADA (FORZADA) Y MODAL CORREGIDO
 * CORREGIDO: Uso de 'rol' en lugar de 'cargo'
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

        await cargarCategorias();
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar categorías:', error);
        return false;
    }
}

function obtenerDatosEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        empresaActual = {
            // ✅ CORREGIDO: Solo se usa información de organización, no 'cargo'
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
// VER DETALLES
// =============================================
window.verDetalles = async function (categoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    let subcategoriasArray = [];

    if (categoria.subcategorias && typeof categoria.subcategorias === 'object') {
        if (categoria.subcategorias.forEach) {
            // Es un Map
            categoria.subcategorias.forEach((value, key) => {
                if (value && typeof value === 'object') {
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

    const html = `
        <div style="padding: 10px;">
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

    document.getElementById('modalTitulo').innerHTML = `<i class="fas fa-tag"></i> ${escapeHTML(categoria.nombre)}`;
    document.getElementById('detallesContent').innerHTML = html;
    abrirModal('modalDetalles');
};

window.verDetallesSubcategoria = async function (categoriaId, subcategoriaId, event) {
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
            text: 'Subcategoría no encontrada'
        });
        return;
    }

    const html = `
        <div style="padding: 10px;">
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

    document.getElementById('modalTitulo').innerHTML = `<i class="fas fa-folder-open"></i> ${escapeHTML(subcategoria.nombre || 'Subcategoría')}`;
    document.getElementById('detallesContent').innerHTML = html;
    abrirModal('modalDetalles');
};

// =============================================
// 🎯 ELIMINAR CATEGORÍA CON TODAS SUS SUBCATEGORÍAS
// 🔥 CORREGIDO: Elimina primero las subcategorías y luego la categoría
// =============================================
window.eliminarCategoria = async function (categoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    // Contar subcategorías
    let subcategoriasIds = [];
    let numSub = 0;

    if (categoria.subcategorias) {
        if (typeof categoria.subcategorias === 'object') {
            if (categoria.subcategorias.forEach) {
                // Es un Map - obtener los IDs
                categoria.subcategorias.forEach((value, key) => {
                    subcategoriasIds.push(key);
                });
                numSub = categoria.subcategorias.size;
            } else {
                // Es un objeto plano
                subcategoriasIds = Object.keys(categoria.subcategorias);
                numSub = subcategoriasIds.length;
            }
        }
    }

    // SweetAlert personalizado para eliminación en cascada
    const result = await Swal.fire({
        title: '¿Eliminar categoría?',
        html: `
            <div style="text-align: center; padding: 10px;">
                <h3 style="color: #ffffff; margin-bottom: 16px; font-size: 20px;">
                    "${escapeHTML(categoria.nombre)}"
                </h3>
                
                ${numSub > 0 ? `
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <i class="fas fa-folder-open" style="color: #ef4444; font-size: 20px;"></i>
                            <span style="color: #ef4444; font-weight: 600; font-size: 16px;">
                                Esta categoría tiene ${numSub} subcategoría${numSub !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <p style="color: #fca5a5; margin: 0; font-size: 14px;">
                            Se eliminarán TODAS las subcategorías junto con la categoría
                        </p>
                    </div>
                ` : `
                    <p style="color: #9ca3af; margin-bottom: 16px;">
                        Esta categoría no tiene subcategorías asociadas.
                    </p>
                `}
                
                <p style="color: #9ca3af; font-size: 14px; margin-top: 8px;">
                    <i class="fas fa-info-circle"></i> 
                    Esta acción <strong style="color: #ef4444;">no se puede deshacer</strong>.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: numSub > 0 ? 'Sí, eliminar todo' : 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true
    });

    if (result.isConfirmed) {
        try {
            // Mostrar loading
            Swal.fire({
                title: 'Eliminando...',
                html: `
                    <div style="text-align: center; padding: 10px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                        <p style="color: #ffffff; margin-bottom: 8px;">Eliminando categoría y ${numSub > 0 ? `sus ${numSub} subcategorías` : ''}...</p>
                        <p style="color: #9ca3af; font-size: 12px;">Por favor espera...</p>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false
            });

            // 🔥 PASO 1: Eliminar todas las subcategorías UNA POR UNA
            if (numSub > 0) {
                for (const subId of subcategoriasIds) {
                    try {
                        // Eliminar subcategoría del objeto local
                        if (categoria.eliminarSubcategoria) {
                            categoria.eliminarSubcategoria(subId);
                        } else if (categoria.subcategorias && categoria.subcategorias.delete) {
                            categoria.subcategorias.delete(subId);
                        } else if (categoria.subcategorias && typeof categoria.subcategorias === 'object') {
                            delete categoria.subcategorias[subId];
                        }
                    } catch (subError) {
                        // Continuamos aunque una subcategoría falle
                    }
                }

                // 🔥 PASO 2: Actualizar la categoría SIN subcategorías
                await categoriaManager.actualizarCategoria(categoriaId, {
                    nombre: categoria.nombre,
                    descripcion: categoria.descripcion,
                    color: categoria.color,
                    subcategorias: {} // Vaciar todas las subcategorías
                });
            }

            // 🔥 PASO 3: AHORA SÍ, eliminar la categoría (ya no tiene subcategorías)
            await categoriaManager.eliminarCategoria(categoriaId);

            // Cerrar loading
            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Categoría eliminada!',
                html: `
                    <div style="text-align: center;">
                        <p style="color: #ffffff; margin-bottom: 8px;">
                            <strong style="color: #10b981;">"${escapeHTML(categoria.nombre)}"</strong> 
                            ha sido eliminada
                        </p>
                        ${numSub > 0 ? `
                            <p style="color: #9ca3af; font-size: 14px;">
                                Se eliminaron ${numSub} subcategoría${numSub !== 1 ? 's' : ''}
                            </p>
                        ` : ''}
                    </div>
                `,
                timer: 3000,
                timerProgressBar: true
            });

            // Recargar categorías
            await cargarCategorias();

        } catch (error) {
            console.error('❌ Error al eliminar categoría:', error);

            Swal.close();

            Swal.fire({
                icon: 'error',
                title: 'Error',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p style="color: #ef4444; margin-bottom: 12px;">
                            No se pudo eliminar la categoría
                        </p>
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #ef4444;">
                            <p style="margin: 0; color: #ef4444; font-size: 13px;">
                                <strong>Error:</strong> ${error.message || 'Error desconocido'}
                            </p>
                        </div>
                    </div>
                `
            });
        }
    }
};

// =============================================
// 🎯 ELIMINAR SUBCATEGORÍA DESDE LA TABLA
// =============================================
window.eliminarSubcategoria = async function (categoriaId, subcategoriaId, event) {
    event?.stopPropagation();

    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Categoría no encontrada'
        });
        return;
    }

    // Obtener la subcategoría
    let subcategoria = null;
    let subcategoriaNombre = '';

    try {
        if (categoria.subcategorias) {
            if (typeof categoria.subcategorias === 'object') {
                // Caso 1: Es un Map
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
                // Caso 2: Es un objeto plano
                else if (categoria.subcategorias[subcategoriaId]) {
                    subcategoria = categoria.subcategorias[subcategoriaId];
                }
            }
        }
    } catch (e) {
        // Silencioso
    }

    // Si no encontramos la subcategoría, intentamos buscarla en el array
    if (!subcategoria) {
        if (categoria.subcategorias && categoria.subcategorias.forEach) {
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

    subcategoriaNombre = subcategoria?.nombre || 'Sin nombre';

    if (!subcategoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Subcategoría no encontrada'
        });
        return;
    }

    // Confirmación con SweetAlert2
    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
        html: `
            <div style="text-align: center; padding: 10px;">
                <p style="color: #ffffff; margin-bottom: 8px;">
                    Eliminarás:
                </p>
                <p style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <strong style="color: #ef4444; font-size: 18px;">${escapeHTML(subcategoriaNombre)}</strong>
                </p>
                <p style="color: #9ca3af; font-size: 14px;">
                    <i class="fas fa-info-circle"></i> 
                    Esta acción <strong style="color: #ef4444;">no se puede deshacer</strong>.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        try {
            // ELIMINAR SUBCATEGORÍA
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
                color: categoria.color,
                subcategorias: categoria.subcategorias
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: `La subcategoría "${subcategoriaNombre}" ha sido eliminada`,
                timer: 2000,
                timerProgressBar: true
            });

            // 🔥 IMPORTANTE: Recargar la categoría para obtener los datos actualizados
            const categoriaActualizada = await categoriaManager.obtenerCategoriaPorId(categoriaId);
            const index = categoriasCache.findIndex(c => c.id === categoriaId);
            if (index !== -1) {
                categoriasCache[index] = categoriaActualizada;
            }

            // Recargar subcategorías en la tabla
            await cargarSubcategorias(categoriaId);

            // Actualizar contador en la fila de categoría
            const categoriaRow = document.querySelector(`.categoria-row[data-id="${categoriaId}"]`);
            if (categoriaRow) {
                // Recalcular número de subcategorías
                let numSub = 0;
                if (categoriaActualizada.subcategorias) {
                    if (categoriaActualizada.subcategorias.size !== undefined) {
                        numSub = categoriaActualizada.subcategorias.size;
                    } else {
                        numSub = Object.keys(categoriaActualizada.subcategorias).length;
                    }
                }

                const badge = categoriaRow.querySelector('td[data-label="Subcategorías"] span');
                if (badge) {
                    badge.innerHTML = `<i class="fas fa-folder${numSub > 0 ? '-open' : ''}"></i> ${numSub} ${numSub === 1 ? 'subcategoría' : 'subcategorías'}`;
                    badge.style.background = numSub > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)';
                    badge.style.color = numSub > 0 ? '#10b981' : '#9ca3af';
                }
            }

        } catch (error) {
            console.error('❌ Error al eliminar subcategoría:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo eliminar: ${error.message}`
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
        console.error('❌ Error al cargar categorías:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar categorías'
        });
    }
}

async function crearFilaCategoria(categoria, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'categoria-row';
    tr.dataset.id = categoria.id;

    tr.onclick = (e) => {
        if (!e.target.closest('.btn-group') && !e.target.closest('.btn-sub-action')) {
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
                <strong style="color:white;">${escapeHTML(categoria.nombre)}</strong>
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
                <button type="button" class="btn btn-outline-info" onclick="window.verDetalles('${categoria.id}', event)" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-outline-warning" onclick="window.editarCategoria('${categoria.id}', event)" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-outline-danger" onclick="window.eliminarCategoria('${categoria.id}', event)" title="Eliminar">
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
    await cargarSubcategorias(categoria.id);
}

// =============================================
// CARGAR SUBCATEGORÍAS - VERSIÓN RESPONSIVE MEJORADA
// =============================================
async function cargarSubcategorias(categoriaId) {
    const categoria = categoriasCache.find(c => c.id === categoriaId);
    if (!categoria) return;

    const container = document.getElementById(`sub-content-${categoriaId}`);
    if (!container) return;

    // OBTENER SUBCATEGORÍAS
    let subcategoriasArray = [];

    try {
        if (categoria.subcategorias) {
            if (typeof categoria.subcategorias === 'object') {
                // CASO 1: Es un Map
                if (categoria.subcategorias.forEach) {
                    categoria.subcategorias.forEach((value, key) => {
                        if (value && typeof value === 'object') {
                            if (value instanceof Map) {
                                const subObj = {};
                                value.forEach((v, k) => { subObj[k] = v; });
                                subcategoriasArray.push({ ...subObj, id: key });
                            } else {
                                subcategoriasArray.push({ ...value, id: key });
                            }
                        }
                    });
                }
                // CASO 2: Es un objeto plano
                else {
                    subcategoriasArray = Object.keys(categoria.subcategorias).map(key => ({
                        ...categoria.subcategorias[key],
                        id: key
                    }));
                }
            }
        }
    } catch (e) {
        subcategoriasArray = [];
    }

    if (subcategoriasArray.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:rgba(0,0,0,0.2); border-radius:8px;">
                <i class="fas fa-folder-open" style="font-size:32px; color:#6b7280; margin-bottom:8px;"></i>
                <p style="color:#6b7280; margin-bottom:12px;">No hay subcategorías</p>
                <button class="btn-agregar-sub" onclick="window.agregarSubcategoria('${categoriaId}', event)">
                    <i class="fas fa-plus-circle"></i> Crear subcategoría
                </button>
            </div>
        `;
        return;
    }

    // Ordenar por nombre
    subcategoriasArray.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = `
        <div class="subcategorias-tabla-wrapper">
            <table class="subcategorias-tabla">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Color</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    subcategoriasArray.forEach((sub, index) => {
        const colorSub = sub.color || categoria.color || '#2f8cff';
        const hereda = sub.heredaColor ? true : false;

        html += `
            <tr>
                <td data-label="#">${index + 1}</td>
                <td data-label="Nombre">
                    <div class="subcategoria-nombre-contenedor">
                        <span class="color-indicator" style="background-color: ${colorSub}; width:12px; height:12px;"></span>
                        <span class="subcategoria-nombre-texto">${escapeHTML(sub.nombre || 'Sin nombre')}</span>
                        ${hereda ?
                '<span class="subcategoria-badge badge-hereda">Hereda</span>' :
                sub.color ? '<span class="subcategoria-badge badge-propio">Propio</span>' : ''
            }
                    </div>
                </td>
                <td data-label="Descripción">
                    <span class="subcategoria-descripcion">${escapeHTML(sub.descripcion) || '<span style="color:#6b7280;">-</span>'}</span>
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
// UTILIDADES
// =============================================
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
    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            cerrarModal(e.target.id);
        }
    });

    await inicializarCategoriaManager();
});

// Funciones globales
window.cerrarModal = cerrarModal;