/**
 * EDITAR CATEGORÍAS - Sistema Centinela
 * VERSIÓN CORREGIDA - Sin iconos duplicados en SweetAlert
 * CORREGIDO: Uso de 'rol' en lugar de 'cargo'
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaActual = null;
let subcategorias = [];
let modoEdicionSubcategoria = 'crear';
let subcategoriaEditando = null;
let empresaActual = null;

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarCategoriaManager() {
    try {
        obtenerDatosEmpresa();

        const { CategoriaManager } = await import('/clases/categoria.js');
        categoriaManager = new CategoriaManager();

        return true;
    } catch (error) {
        console.error('❌ Error al cargar CategoriaManager:', error);

        Swal.fire({
            title: 'Error crítico',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 15px; color: var(--color-text-primary, #ffffff);">No se pudo cargar el módulo de categorías.</p>
                    <div style="background: rgba(var(--color-danger-rgb, 239, 68, 68), 0.1); padding: 12px; border-radius: var(--border-radius-medium, 8px); border-left: 4px solid var(--color-danger, #ef4444);">
                        <p style="margin: 0; color: var(--color-danger, #ef4444); font-size: 0.9em;">
                            <i class="fas fa-exclamation-triangle"></i> 
                            <strong>Error:</strong> ${error.message || 'Error desconocido'}
                        </p>
                    </div>
                </div>
            `,
            confirmButtonText: 'Recargar'
        }).then(() => {
            window.location.reload();
        });

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

    } catch (error) {
        console.error('Error obteniendo datos de empresa:', error);
        empresaActual = { id: '', nombre: 'No especificada', camelCase: '' };
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const exito = await inicializarCategoriaManager();
    if (!exito) return;

    const urlParams = new URLSearchParams(window.location.search);
    const categoriaId = urlParams.get('id');

    if (!categoriaId) {
        mostrarNotificacion('No se especificó la categoría a editar', 'error');
        setTimeout(() => window.location.href = '/users/admin/categorias/categorias.html', 2000);
        return;
    }

    await cargarCategoria(categoriaId);

    inicializarComponentes();
    inicializarEventos();

    cerrarEditorSubcategoria();

    // Verificar si viene con parámetro de nueva subcategoría
    const nuevaSubcategoria = urlParams.get('nuevaSubcategoria');
    if (nuevaSubcategoria === 'true') {
        setTimeout(() => {
            abrirEditorSubcategoria('crear');
            setTimeout(() => {
                const editor = document.getElementById('subcategoriaEditorContainer');
                if (editor) {
                    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    editor.style.transition = 'var(--transition-fast)';
                    editor.style.boxShadow = '0 0 0 4px var(--color-accent-primary, #c0c0c0)';
                    setTimeout(() => {
                        editor.style.boxShadow = '0 12px 28px var(--color-shadow)';
                    }, 1500);
                }
            }, 200);
            mostrarNotificacion('➕ Creando nueva subcategoría', 'info');
        }, 500);
    }

    // Verificar si viene con parámetro de editar subcategoría
    const editarSubcategoriaId = urlParams.get('editarSubcategoria');
    if (editarSubcategoriaId) {
        setTimeout(() => {
            const subcategoriaExiste = subcategorias.some(s => s.id === editarSubcategoriaId);

            if (subcategoriaExiste) {
                abrirEditorSubcategoria('editar', editarSubcategoriaId);

                setTimeout(() => {
                    const editor = document.getElementById('subcategoriaEditorContainer');
                    if (editor) {
                        editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        editor.style.transition = 'var(--transition-fast)';
                        editor.style.boxShadow = '0 0 0 4px var(--color-active, #c0c0c0)';
                        setTimeout(() => {
                            editor.style.boxShadow = '0 12px 28px var(--color-shadow)';
                        }, 1500);
                    }
                }, 200);

                const subNombre = subcategorias.find(s => s.id === editarSubcategoriaId)?.nombre || 'subcategoría';
                mostrarNotificacion(`✏️ Editando: ${subNombre}`, 'info');
            } else {
                mostrarNotificacion('Error: Subcategoría no encontrada', 'error');
            }
        }, 600);
    }
});

/**
 * CARGA LA CATEGORÍA DESDE FIRESTORE
 */
async function cargarCategoria(id) {
    if (!categoriaManager) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }

    try {
        categoriaActual = await categoriaManager.obtenerCategoriaPorId(id);

        if (!categoriaActual) {
            mostrarNotificacion('Categoría no encontrada', 'error');
            setTimeout(() => window.location.href = '/users/admin/categorias/categorias.html', 2000);
            return;
        }

        // Convertir objeto de subcategorías a array
        subcategorias = [];
        
        if (categoriaActual.subcategorias && typeof categoriaActual.subcategorias === 'object') {
            Object.keys(categoriaActual.subcategorias).forEach(key => {
                const sub = categoriaActual.subcategorias[key];
                if (sub && typeof sub === 'object') {
                    subcategorias.push({
                        id: key,
                        nombre: sub.nombre || '',
                        descripcion: sub.descripcion || '',
                        fechaCreacion: sub.fechaCreacion || new Date().toISOString(),
                        fechaActualizacion: sub.fechaActualizacion || new Date().toISOString(),
                        heredaColor: sub.heredaColor !== undefined ? sub.heredaColor : true,
                        color: sub.color || null
                    });
                }
            });
        }

        // Ordenar por nombre
        subcategorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

        actualizarUICategoria();
        cargarSubcategorias();

    } catch (error) {
        console.error('Error al cargar categoría:', error);
        mostrarNotificacion('Error al cargar la categoría', 'error');
    }
}

function actualizarUICategoria() {
    if (!categoriaActual) return;

    // El título ahora es fijo: "Editar Categoría"
    const headerTitle = document.getElementById('categoriaNombreHeader');
    if (headerTitle) {
        headerTitle.textContent = 'Editar Categoría';
    }

    // Actualizar campos del formulario
    document.getElementById('nombreCategoria').value = categoriaActual.nombre || '';
    document.getElementById('colorPicker').value = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';

    // Actualizar previsualización de color
    const colorPreview = document.getElementById('colorPreview');
    if (colorPreview) {
        colorPreview.style.backgroundColor = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
    }

    const colorHex = document.getElementById('colorHex');
    if (colorHex) {
        colorHex.textContent = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
    }
}

function cargarSubcategorias() {
    const lista = document.getElementById('listaSubcategorias');
    if (!lista) return;

    const totalSubElement = document.getElementById('totalSubcategorias');
    if (totalSubElement) totalSubElement.textContent = subcategorias.length;

    if (!subcategorias || subcategorias.length === 0) {
        lista.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 48px 20px;">
                <div style="font-size: 64px; color: rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.2); margin-bottom: 16px;">
                    <i class="fas fa-folder-open"></i>
                </div>
                <h3 style="color: var(--color-accent-primary, #c0c0c0); margin-bottom: 12px;">No hay subcategorías</h3>
                <p style="color: var(--color-text-secondary); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
                    Esta categoría aún no tiene subcategorías. Crea la primera haciendo clic en el botón superior.
                </p>
                <button class="btn-add-subcategoria" onclick="abrirEditorSubcategoria('crear')" style="background: linear-gradient(135deg, var(--color-accent-primary, #c0c0c0), var(--color-active, #c0c0c0)); border: none; padding: 12px 24px; border-radius: 30px; color: var(--color-text-dark, #000000); font-weight: 600; cursor: pointer;">
                    <i class="fas fa-plus-circle me-2"></i>Agregar Subcategoría
                </button>
            </div>
        `;
        return;
    }

    lista.innerHTML = '';

    subcategorias.forEach(sub => {
        const item = crearTarjetaSubcategoria(sub);
        lista.appendChild(item);
    });
}

function crearTarjetaSubcategoria(sub) {
    const div = document.createElement('div');
    div.className = 'subcategoria-item';
    div.dataset.id = sub.id;
    div.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: rgba(var(--color-bg-light-rgb, 255, 255, 255), 0.02);
        border: 1px solid var(--color-border-light);
        border-radius: var(--border-radius-large);
        margin-bottom: 12px;
        transition: var(--transition-default);
    `;

    div.onmouseenter = function () {
        this.style.background = 'rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.05)';
        this.style.borderColor = 'rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.3)';
    };
    div.onmouseleave = function () {
        this.style.background = 'rgba(var(--color-bg-light-rgb, 255, 255, 255), 0.02)';
        this.style.borderColor = 'var(--color-border-light)';
    };

    // Determinar color de la subcategoría
    let colorActual = sub.color;
    if (!colorActual || sub.heredaColor) {
        colorActual = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
    }

    const badgeColor = sub.heredaColor ? 'var(--color-accent-primary, #c0c0c0)' : 'var(--color-active, #c0c0c0)';
    const badgeIcon = sub.heredaColor ? 'fa-paint-brush' : 'fa-palette';
    const badgeText = sub.heredaColor ? 'Hereda color' : 'Color propio';
    const descripcion = sub.descripcion || 'Sin descripción';

    div.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 16px; flex: 1;">
            <div style="width: 40px; height: 40px; background-color: ${colorActual}; border-radius: var(--border-radius-medium); border: 2px solid rgba(255,255,255,0.1);"></div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-primary);">${escapeHTML(sub.nombre || 'Sin nombre')}</h4>
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: ${badgeColor}15; color: ${badgeColor}; border-radius: 20px; font-size: 11px; font-weight: 500;">
                        <i class="fas ${badgeIcon}" style="font-size: 10px;"></i>
                        ${badgeText}
                    </span>
                </div>
                <p style="margin: 0 0 6px 0; color: var(--color-text-secondary); font-size: 14px;">${escapeHTML(descripcion)}</p>
                <small style="color: var(--color-text-dim, #6b7280); font-size: 11px;">
                    <i class="fas fa-fingerprint"></i> ID: ${sub.id?.substring(0, 8) || ''}...
                    ${sub.fechaActualizacion ? ` | <i class="fas fa-clock"></i> ${new Date(sub.fechaActualizacion).toLocaleDateString()}` : ''}
                </small>
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-left: 20px;">
            <button class="btn-sub-action edit" onclick="abrirEditorSubcategoria('editar', '${sub.id}')" 
                    style="background: rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.1); border: 1px solid rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.3); color: var(--color-accent-primary, #c0c0c0); padding: 8px 12px; border-radius: var(--border-radius-medium); cursor: pointer; transition: var(--transition-fast);"
                    onmouseenter="this.style.background='rgba(var(--color-accent-primary-rgb, 192,192,192),0.2)'; this.style.borderColor='var(--color-accent-primary, #c0c0c0)';"
                    onmouseleave="this.style.background='rgba(var(--color-accent-primary-rgb, 192,192,192),0.1)'; this.style.borderColor='rgba(var(--color-accent-primary-rgb, 192,192,192),0.3)';">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sub-action delete" onclick="eliminarSubcategoria('${sub.id}')"
                    style="background: rgba(var(--color-danger-rgb, 239, 68, 68), 0.1); border: 1px solid rgba(var(--color-danger-rgb, 239, 68, 68), 0.3); color: var(--color-danger, #ef4444); padding: 8px 12px; border-radius: var(--border-radius-medium); cursor: pointer; transition: var(--transition-fast);"
                    onmouseenter="this.style.background='rgba(var(--color-danger-rgb, 239,68,68),0.2)'; this.style.borderColor='var(--color-danger, #ef4444)';"
                    onmouseleave="this.style.background='rgba(var(--color-danger-rgb, 239,68,68),0.1)'; this.style.borderColor='rgba(var(--color-danger-rgb, 239,68,68),0.3)';">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return div;
}

/**
 * ABRIR EDITOR DE SUBCATEGORÍA
 */
function abrirEditorSubcategoria(modo, subcategoriaId = null) {
    if (!categoriaActual) {
        mostrarNotificacion('Error: Categoría no cargada', 'error');
        return;
    }

    modoEdicionSubcategoria = modo;

    const editor = document.getElementById('subcategoriaEditorContainer');
    const titulo = document.getElementById('editorTitulo');
    const icono = document.getElementById('editorIcon');

    if (!editor || !titulo || !icono) return;

    const form = document.getElementById('formSubcategoria');
    if (form) form.reset();

    document.getElementById('subcategoriaId').value = '';

    if (modo === 'crear') {
        titulo.textContent = 'Nueva Subcategoría';
        icono.className = 'fas fa-plus-circle';
        icono.style.color = 'var(--color-accent-primary, #c0c0c0)';

        document.getElementById('heredarColorPadre').checked = true;
        document.getElementById('colorPersonalizadoGroup').style.display = 'none';

        // Color base para nueva subcategoría
        const colorBase = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
        document.getElementById('colorSubcategoria').value = colorBase;
        const preview = document.getElementById('subcategoriaColorPreview');
        if (preview) {
            preview.style.backgroundColor = colorBase;
        }
        const hex = document.getElementById('subcategoriaColorHex');
        if (hex) hex.textContent = colorBase;

    } else if (modo === 'editar' && subcategoriaId) {
        const sub = subcategorias.find(s => s.id === subcategoriaId);
        if (!sub) {
            mostrarNotificacion('Subcategoría no encontrada', 'error');
            return;
        }

        subcategoriaEditando = sub;
        titulo.textContent = `Editar: ${sub.nombre || 'Subcategoría'}`;
        icono.className = 'fas fa-edit';
        icono.style.color = 'var(--color-active, #c0c0c0)';

        document.getElementById('nombreSubcategoria').value = sub.nombre || '';
        document.getElementById('descripcionSubcategoria').value = sub.descripcion || '';
        document.getElementById('subcategoriaId').value = sub.id;

        const hereda = sub.heredaColor !== false;
        document.getElementById('heredarColorPadre').checked = hereda;

        if (hereda) {
            document.getElementById('colorPersonalizadoGroup').style.display = 'none';
        } else {
            document.getElementById('colorPersonalizadoGroup').style.display = 'block';
            const colorValue = sub.color || categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
            document.getElementById('colorSubcategoria').value = colorValue;
            const preview = document.getElementById('subcategoriaColorPreview');
            if (preview) {
                preview.style.backgroundColor = colorValue;
            }
            const hex = document.getElementById('subcategoriaColorHex');
            if (hex) hex.textContent = colorValue;
        }
    }

    editor.style.display = 'block';

    setTimeout(() => {
        editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const nombreInput = document.getElementById('nombreSubcategoria');
        if (nombreInput) nombreInput.focus();
    }, 100);
}

function cerrarEditorSubcategoria() {
    const editor = document.getElementById('subcategoriaEditorContainer');
    if (editor) editor.style.display = 'none';
    modoEdicionSubcategoria = 'crear';
    subcategoriaEditando = null;
}

/**
 * GUARDAR SUBCATEGORÍA (CREAR O EDITAR)
 */
async function guardarSubcategoria() {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }

    const nombre = document.getElementById('nombreSubcategoria').value.trim();
    if (!nombre) {
        mostrarNotificacion('El nombre es requerido', 'error');
        document.getElementById('nombreSubcategoria').focus();
        return;
    }

    const btn = document.getElementById('btnGuardarSubcategoria');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
    btn.disabled = true;

    try {
        const descripcion = document.getElementById('descripcionSubcategoria').value.trim();
        const heredaColor = document.getElementById('heredarColorPadre').checked;
        const color = heredaColor ? null : document.getElementById('colorSubcategoria').value;

        const subId = document.getElementById('subcategoriaId').value;

        if (modoEdicionSubcategoria === 'crear') {
            if (categoriaActual.existeSubcategoria(nombre)) {
                throw new Error(`Ya existe una subcategoría con el nombre "${nombre}" en esta categoría`);
            }

            const nuevoSubId = categoriaActual.agregarSubcategoria(nombre, descripcion, heredaColor, color);
            
            if (!heredaColor && color) {
                categoriaActual.subcategorias[nuevoSubId].color = color;
                categoriaActual.subcategorias[nuevoSubId].heredaColor = false;
            }

            mostrarNotificacion('✅ Subcategoría creada exitosamente', 'success');

        } else if (modoEdicionSubcategoria === 'editar' && subId) {
            const subExistente = categoriaActual.subcategorias[subId];
            if (!subExistente) {
                throw new Error('Subcategoría no encontrada');
            }

            const nombreAnterior = subExistente.nombre;
            if (nombre !== nombreAnterior && categoriaActual.existeSubcategoria(nombre)) {
                throw new Error(`Ya existe otra subcategoría con el nombre "${nombre}"`);
            }

            categoriaActual.subcategorias[subId] = {
                ...categoriaActual.subcategorias[subId],
                nombre: nombre,
                descripcion: descripcion,
                heredaColor: heredaColor,
                color: !heredaColor ? color : null,
                fechaActualizacion: new Date().toISOString()
            };

            mostrarNotificacion('✅ Subcategoría actualizada correctamente', 'success');
        }

        await categoriaManager.actualizarCategoria(categoriaActual.id, {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion,
            color: categoriaActual.color,
            subcategorias: categoriaActual.subcategorias
        });

        await cargarCategoria(categoriaActual.id);
        cerrarEditorSubcategoria();

    } catch (error) {
        console.error('Error al guardar subcategoría:', error);
        mostrarNotificacion(`Error: ${error.message}`, 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

/**
 * ELIMINAR SUBCATEGORÍA - SweetAlert sin icono duplicado
 */
async function eliminarSubcategoria(subcategoriaId) {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }

    const sub = subcategorias.find(s => s.id === subcategoriaId);
    if (!sub) return;

    // Determinar color para mostrar
    let colorPreview = sub.color;
    if (!colorPreview || sub.heredaColor) {
        colorPreview = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
    }

    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
        html: `
            <div style="text-align: left; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
                    <div style="width: 60px; height: 60px; background-color: ${colorPreview}; border-radius: var(--border-radius-medium, 8px); border: 2px solid var(--color-border-light, rgba(255,255,255,0.1)); box-shadow: var(--shadow-small, 0 2px 8px var(--color-shadow));"></div>
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: var(--color-text-primary, #ffffff); font-size: 20px; font-weight: 600;">${escapeHTML(sub.nombre || 'Sin nombre')}</h3>
                        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.15); color: var(--color-accent-primary, #c0c0c0); border-radius: var(--border-radius-pill, 30px); font-size: 12px;">
                            <i class="fas ${sub.heredaColor ? 'fa-paint-brush' : 'fa-palette'}"></i>
                            ${sub.heredaColor ? 'Hereda color' : 'Color propio'}
                        </span>
                    </div>
                </div>
                
                <div style="background: var(--color-bg-tertiary, #0000007a); border-radius: var(--border-radius-medium, 8px); padding: 16px; margin-bottom: 20px; border: 1px solid var(--color-border-light, rgba(255,255,255,0.1));">
                    <p style="margin: 0 0 12px 0; color: var(--color-text-secondary, rgba(255,255,255,0.8)); font-size: 14px;">
                        <i class="fas fa-info-circle" style="color: var(--color-accent-primary, #c0c0c0); margin-right: 8px;"></i>
                        ${sub.descripcion || 'Sin descripción'}
                    </p>
                    <div style="display: flex; gap: 20px; color: var(--color-text-dim, #6b7280); font-size: 12px;">
                        <span><i class="fas fa-fingerprint"></i> ID: ${sub.id?.substring(0, 8) || ''}...</span>
                        <span><i class="fas fa-clock"></i> ${sub.fechaActualizacion ? new Date(sub.fechaActualizacion).toLocaleDateString() : 'Fecha desconocida'}</span>
                    </div>
                </div>
                
                <div style="background: rgba(var(--color-danger-rgb, 239, 68, 68), 0.1); border-left: 4px solid var(--color-danger, #ef4444); padding: 12px 16px; border-radius: var(--border-radius-medium, 8px);">
                    <p style="margin: 0; color: var(--color-text-secondary, rgba(255,255,255,0.8)); font-size: 13px;">
                        <i class="fas fa-exclamation-triangle" style="color: var(--color-danger, #ef4444); margin-right: 8px;"></i>
                        Esta acción no se puede deshacer. La subcategoría se eliminará permanentemente.
                    </p>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            categoriaActual.eliminarSubcategoria(subcategoriaId);

            await categoriaManager.actualizarCategoria(categoriaActual.id, {
                nombre: categoriaActual.nombre,
                descripcion: categoriaActual.descripcion,
                color: categoriaActual.color,
                subcategorias: categoriaActual.subcategorias
            });

            await cargarCategoria(categoriaActual.id);

            Swal.fire({
                title: '¡Eliminada!',
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 64px; color: var(--color-accent-primary, #c0c0c0); margin-bottom: 16px;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <p style="color: var(--color-text-primary, #ffffff); font-size: 16px; margin-bottom: 8px;">
                            La subcategoría <strong style="color: var(--color-accent-primary, #c0c0c0);">"${escapeHTML(sub.nombre)}"</strong>
                        </p>
                        <p style="color: var(--color-text-secondary, rgba(255,255,255,0.8)); font-size: 14px;">
                            ha sido eliminada correctamente.
                        </p>
                    </div>
                `,
                timer: 2500,
                timerProgressBar: true,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error al eliminar subcategoría:', error);
            mostrarNotificacion(`Error: ${error.message}`, 'error');
        }
    }
}

/**
 * GUARDAR CATEGORÍA
 */
async function guardarCategoria() {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }

    const nombre = document.getElementById('nombreCategoria').value.trim();
    const color = document.getElementById('colorPicker').value;

    if (!nombre) {
        mostrarNotificacion('El nombre de la categoría es requerido', 'error');
        document.getElementById('nombreCategoria').focus();
        return;
    }

    const btn = document.getElementById('btnGuardarCategoria');
    const originalHTML = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
        btn.disabled = true;

        categoriaActual.nombre = nombre;
        categoriaActual.color = color;

        await categoriaManager.actualizarCategoria(categoriaActual.id, {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion,
            color: categoriaActual.color,
            subcategorias: categoriaActual.subcategorias
        });

        await cargarCategoria(categoriaActual.id);

        Swal.fire({
            title: '¡Guardado!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: var(--color-accent-primary, #c0c0c0); margin-bottom: 16px;"></i>
                    <p style="color: var(--color-text-primary, #ffffff);">La categoría ha sido actualizada correctamente.</p>
                </div>
            `,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error al guardar categoría:', error);
        mostrarNotificacion(`Error: ${error.message}`, 'error');

        if (categoriaActual) {
            document.getElementById('nombreCategoria').value = categoriaActual.nombre;
            document.getElementById('colorPicker').value = categoriaActual.color || 'var(--color-accent-primary, #c0c0c0)';
        }
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

function cancelarEdicion() {
    if (!categoriaActual) {
        window.location.href = '/users/admin/categorias/categorias.html';
        return;
    }

    const nombreActual = document.getElementById('nombreCategoria').value.trim();
    const colorActual = document.getElementById('colorPicker').value;
    const hayCambiosEnCategoria = nombreActual !== categoriaActual.nombre ||
        colorActual !== categoriaActual.color;

    const subcategoriasActuales = [];
    Object.keys(categoriaActual.subcategorias || {}).forEach(key => {
        const sub = categoriaActual.subcategorias[key];
        subcategoriasActuales.push({
            id: key,
            nombre: sub.nombre,
            descripcion: sub.descripcion,
            color: sub.color,
            heredaColor: sub.heredaColor
        });
    });

    const hayCambiosEnSubcategorias = JSON.stringify(subcategorias.map(s => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        color: s.color,
        heredaColor: s.heredaColor
    }))) !== JSON.stringify(subcategoriasActuales);

    if (hayCambiosEnCategoria || hayCambiosEnSubcategorias) {
        Swal.fire({
            title: '¿Cancelar edición?',
            text: 'Tienes cambios sin guardar. ¿Seguro que quieres salir?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Seguir editando'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/users/admin/categorias/categorias.html';
            }
        });
    } else {
        window.location.href = '/users/admin/categorias/categorias.html';
    }
}

function inicializarComponentes() {
    // Configurar color picker de categoría
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', function (e) {
            const preview = document.getElementById('colorPreview');
            const hex = document.getElementById('colorHex');
            if (preview) preview.style.backgroundColor = e.target.value;
            if (hex) hex.textContent = e.target.value;
        });
    }

    // Configurar preset colors para categoría
    document.querySelectorAll('.preset-dot').forEach(btn => {
        btn.addEventListener('click', function () {
            const color = this.dataset.color;
            const colorPicker = document.getElementById('colorPicker');
            const preview = document.getElementById('colorPreview');
            const hex = document.getElementById('colorHex');

            if (colorPicker) colorPicker.value = color;
            if (preview) preview.style.backgroundColor = color;
            if (hex) hex.textContent = color;

            document.querySelectorAll('.preset-dot').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Configurar color picker de subcategoría
    const colorSubcategoria = document.getElementById('colorSubcategoria');
    if (colorSubcategoria) {
        colorSubcategoria.addEventListener('input', function (e) {
            const preview = document.getElementById('subcategoriaColorPreview');
            const hex = document.getElementById('subcategoriaColorHex');
            if (preview) preview.style.backgroundColor = e.target.value;
            if (hex) hex.textContent = e.target.value;
        });
    }
}

function inicializarEventos() {
    const btnGuardar = document.getElementById('btnGuardarCategoria');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCategoria);
    }

    const btnNuevaSub = document.getElementById('btnNuevaSubcategoria');
    if (btnNuevaSub) {
        btnNuevaSub.addEventListener('click', function () {
            abrirEditorSubcategoria('crear');
        });
    }

    const btnGuardarSub = document.getElementById('btnGuardarSubcategoria');
    if (btnGuardarSub) {
        btnGuardarSub.addEventListener('click', guardarSubcategoria);
    }

    const heredarCheckbox = document.getElementById('heredarColorPadre');
    if (heredarCheckbox) {
        heredarCheckbox.addEventListener('change', function () {
            const group = document.getElementById('colorPersonalizadoGroup');
            if (group) {
                group.style.display = this.checked ? 'none' : 'block';
            }
        });
    }

    const nombreCategoria = document.getElementById('nombreCategoria');
    if (nombreCategoria) {
        nombreCategoria.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                guardarCategoria();
            }
        });
    }

    const nombreSubcategoria = document.getElementById('nombreSubcategoria');
    if (nombreSubcategoria) {
        nombreSubcategoria.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                guardarSubcategoria();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            cerrarEditorSubcategoria();
        }
    });
}

/**
 * MOSTRAR NOTIFICACIÓN CON SWEETALERT2 (sin icono duplicado)
 */
function mostrarNotificacion(mensaje, tipo = 'success') {
    Swal.fire({
        title: tipo === 'success' ? 'Éxito' : 
               tipo === 'error' ? 'Error' : 
               tipo === 'warning' ? 'Advertencia' : 'Información',
        text: mensaje,
        icon: tipo,
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
        background: 'var(--color-bg-primary, #0a0a0a)',
        color: 'var(--color-text-primary, #ffffff)'
    });
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exponer funciones globales
window.cargarCategoria = cargarCategoria;
window.guardarCategoria = guardarCategoria;
window.cancelarEdicion = cancelarEdicion;
window.abrirEditorSubcategoria = abrirEditorSubcategoria;
window.cerrarEditorSubcategoria = cerrarEditorSubcategoria;
window.guardarSubcategoria = guardarSubcategoria;
window.eliminarSubcategoria = eliminarSubcategoria;