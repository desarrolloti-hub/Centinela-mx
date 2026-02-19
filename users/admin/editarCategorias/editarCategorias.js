/**
 * EDITAR CATEGORÍAS - Sistema Centinela
 * VERSIÓN CORREGIDA - Con adaptaciones para el nuevo HTML
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
                    editor.style.transition = 'var(--transition-default)';
                    editor.style.boxShadow = '0 0 0 4px var(--color-accent-primary, #c0c0c0)';
                    setTimeout(() => {
                        editor.style.boxShadow = 'var(--shadow-normal)';
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
                        editor.style.transition = 'var(--transition-default)';
                        editor.style.boxShadow = '0 0 0 4px var(--color-accent-primary, #c0c0c0)';
                        setTimeout(() => {
                            editor.style.boxShadow = 'var(--shadow-normal)';
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

    // Actualizar título en el header de la tarjeta
    const headerTitle = document.getElementById('categoriaNombreHeader');
    if (headerTitle) {
        headerTitle.textContent = categoriaActual.nombre || 'Categoría';
    }

    // Actualizar campos del formulario
    document.getElementById('nombreCategoria').value = categoriaActual.nombre || '';
    
    // Descripción - si existe en el modelo, si no, usar campo vacío
    const descripcionInput = document.getElementById('descripcionCategoria');
    if (descripcionInput) {
        descripcionInput.value = categoriaActual.descripcion || '';
    }
    
    // Actualizar color
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.value = categoriaActual.color || '#c0c0c0';
    }

    // Actualizar previsualización de color
    const colorPreview = document.getElementById('colorPreview');
    if (colorPreview) {
        colorPreview.style.backgroundColor = categoriaActual.color || '#c0c0c0';
    }

    const colorHex = document.getElementById('colorHex');
    if (colorHex) {
        colorHex.textContent = categoriaActual.color || '#c0c0c0';
    }
    
    // Actualizar contador de caracteres
    actualizarContadorCaracteres();
}

function actualizarContadorCaracteres() {
    const descripcion = document.getElementById('descripcionCategoria');
    const contador = document.getElementById('contadorCaracteres');
    
    if (descripcion && contador) {
        contador.textContent = descripcion.value.length;
    }
}

function cargarSubcategorias() {
    const lista = document.getElementById('listaSubcategorias');
    if (!lista) return;

    const totalSubElement = document.getElementById('totalSubcategorias');
    if (totalSubElement) totalSubElement.textContent = `(${subcategorias.length} ${subcategorias.length === 1 ? 'subcategoría' : 'subcategorías'})`;

    if (!subcategorias || subcategorias.length === 0) {
        lista.innerHTML = `
            <div class="cargos-empty">
                <i class="fas fa-folder-open mb-2"></i>
                <p>No hay subcategorías agregadas</p>
                <small class="text-muted">Haga clic en "Nueva Subcategoría" para añadir una</small>
            </div>
        `;
        return;
    }

    lista.innerHTML = '';

    subcategorias.forEach((sub, index) => {
        const item = crearTarjetaSubcategoria(sub, index);
        lista.appendChild(item);
    });
}

function crearTarjetaSubcategoria(sub, index) {
    const div = document.createElement('div');
    div.className = 'cargo-item';
    div.dataset.id = sub.id;

    // Determinar color de la subcategoría
    let colorActual = sub.color;
    if (!colorActual || sub.heredaColor) {
        colorActual = categoriaActual.color || '#c0c0c0';
    }

    const badgeColor = sub.heredaColor ? 'var(--color-accent-primary, #c0c0c0)' : 'var(--color-accent-secondary, #2f8cff)';
    const badgeIcon = sub.heredaColor ? 'fa-paint-brush' : 'fa-palette';
    const badgeText = sub.heredaColor ? 'Hereda color' : 'Color propio';
    const descripcion = sub.descripcion || 'Sin descripción';

    div.innerHTML = `
        <div class="cargo-header">
            <h6 class="cargo-titulo">
                <i class="fas fa-folder-open me-2"></i>
                Subcategoría #${index + 1}
                <span style="display: inline-flex; align-items: center; gap: 4px; margin-left: 10px; padding: 2px 8px; background: ${badgeColor}20; color: ${badgeColor}; border-radius: 30px; font-size: 10px;">
                    <i class="fas ${badgeIcon}" style="font-size: 8px;"></i>
                    ${badgeText}
                </span>
            </h6>
            <button type="button" class="btn-eliminar-cargo" onclick="eliminarSubcategoria('${sub.id}')">
                <i class="fas fa-trash-alt me-1"></i>
                Eliminar
            </button>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label">Nombre de la Subcategoría *</label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fas fa-tag"></i></span>
                    <input type="text" class="form-control" 
                           id="sub_nombre_${sub.id}"
                           value="${escapeHTML(sub.nombre)}"
                           placeholder="Ej: Frontend, Backend, Marketing Digital"
                           onchange="actualizarSubcategoriaCampo('${sub.id}', 'nombre', this.value)">
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label">Descripción</label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fas fa-align-left"></i></span>
                    <input type="text" class="form-control" 
                           id="sub_descripcion_${sub.id}"
                           value="${escapeHTML(sub.descripcion)}"
                           placeholder="Breve descripción"
                           onchange="actualizarSubcategoriaCampo('${sub.id}', 'descripcion', this.value)">
                </div>
            </div>
        </div>
    `;

    return div;
}

// Función global para actualizar campos de subcategoría
window.actualizarSubcategoriaCampo = function(id, campo, valor) {
    const sub = subcategorias.find(s => s.id === id);
    if (sub) {
        sub[campo] = valor;
    }
};

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
        icono.className = 'fas fa-plus-circle me-2';
        icono.style.color = 'var(--color-accent-primary, #c0c0c0)';

        document.getElementById('heredarColorPadre').checked = true;
        document.getElementById('colorPersonalizadoGroup').style.display = 'none';

        // Color base para nueva subcategoría
        const colorBase = categoriaActual.color || '#c0c0c0';
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
        icono.className = 'fas fa-edit me-2';
        icono.style.color = 'var(--color-accent-secondary, #2f8cff)';

        document.getElementById('nombreSubcategoria').value = sub.nombre || '';
        document.getElementById('descripcionSubcategoria').value = sub.descripcion || '';
        document.getElementById('subcategoriaId').value = sub.id;

        const hereda = sub.heredaColor !== false;
        document.getElementById('heredarColorPadre').checked = hereda;

        if (hereda) {
            document.getElementById('colorPersonalizadoGroup').style.display = 'none';
        } else {
            document.getElementById('colorPersonalizadoGroup').style.display = 'block';
            const colorValue = sub.color || categoriaActual.color || '#c0c0c0';
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
            // Verificar si ya existe una subcategoría con ese nombre
            const existe = Object.values(categoriaActual.subcategorias || {}).some(
                s => s.nombre && s.nombre.toLowerCase() === nombre.toLowerCase()
            );
            
            if (existe) {
                throw new Error(`Ya existe una subcategoría con el nombre "${nombre}" en esta categoría`);
            }

            // Generar nuevo ID
            const nuevoSubId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            
            if (!categoriaActual.subcategorias) {
                categoriaActual.subcategorias = {};
            }
            
            categoriaActual.subcategorias[nuevoSubId] = {
                nombre: nombre,
                descripcion: descripcion,
                heredaColor: heredaColor,
                color: !heredaColor ? color : null,
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            };

            mostrarNotificacion('✅ Subcategoría creada exitosamente', 'success');

        } else if (modoEdicionSubcategoria === 'editar' && subId) {
            const subExistente = categoriaActual.subcategorias[subId];
            if (!subExistente) {
                throw new Error('Subcategoría no encontrada');
            }

            // Verificar duplicado de nombre (excepto la misma)
            const existeDuplicado = Object.entries(categoriaActual.subcategorias || {}).some(
                ([id, s]) => id !== subId && s.nombre && s.nombre.toLowerCase() === nombre.toLowerCase()
            );
            
            if (existeDuplicado) {
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
 * ELIMINAR SUBCATEGORÍA
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
        colorPreview = categoriaActual.color || '#c0c0c0';
    }

    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
        html: `
            <div style="text-align: left; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
                    <div style="width: 60px; height: 60px; background-color: ${colorPreview}; border-radius: var(--border-radius-medium, 8px); border: 2px solid var(--color-border-light, rgba(255,255,255,0.1)); box-shadow: var(--shadow-small, 0 2px 8px var(--color-shadow));"></div>
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: var(--color-text-primary, #ffffff); font-size: 20px; font-weight: 600;">${escapeHTML(sub.nombre || 'Sin nombre')}</h3>
                        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(var(--color-accent-primary-rgb, 192, 192, 192), 0.15); color: var(--color-accent-primary, #c0c0c0); border-radius: 30px; font-size: 12px;">
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
            // Eliminar subcategoría
            delete categoriaActual.subcategorias[subcategoriaId];

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
    const descripcion = document.getElementById('descripcionCategoria').value.trim();

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
        categoriaActual.descripcion = descripcion;

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
            document.getElementById('colorPicker').value = categoriaActual.color || '#c0c0c0';
            document.getElementById('descripcionCategoria').value = categoriaActual.descripcion || '';
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
    const descripcionActual = document.getElementById('descripcionCategoria').value.trim();
    
    const hayCambiosEnCategoria = nombreActual !== categoriaActual.nombre ||
        colorActual !== (categoriaActual.color || '#c0c0c0') ||
        descripcionActual !== (categoriaActual.descripcion || '');

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
    
    // Configurar contador de caracteres
    const descripcion = document.getElementById('descripcionCategoria');
    if (descripcion) {
        descripcion.addEventListener('input', actualizarContadorCaracteres);
    }
}

function inicializarEventos() {
    const btnGuardar = document.getElementById('btnGuardarCategoria');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCategoria);
    }
    
    const btnVolverLista = document.getElementById('btnVolverLista');
    if (btnVolverLista) {
        btnVolverLista.addEventListener('click', cancelarEdicion);
    }
    
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicion);
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
 * MOSTRAR NOTIFICACIÓN CON SWEETALERT2
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
window.actualizarSubcategoriaCampo = actualizarSubcategoriaCampo;