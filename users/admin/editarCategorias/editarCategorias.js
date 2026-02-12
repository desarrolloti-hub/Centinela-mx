/**
 * EDITAR CATEGORÍAS - Sistema Centinela
 * VERSIÓN CORREGIDA - Compatible con la clase Categoria (objetos, no Maps)
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

        console.log('✅ CategoriaManager cargado correctamente');
        console.log('📁 Colección:', categoriaManager?.nombreColeccion);

        return true;
    } catch (error) {
        console.error('❌ Error al cargar CategoriaManager:', error);

        Swal.fire({
            title: 'Error crítico',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 15px;">No se pudo cargar el módulo de categorías.</p>
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #ef4444;">
                        <p style="margin: 0; color: #ef4444; font-size: 0.9em;">
                            <i class="fas fa-exclamation-triangle"></i> 
                            <strong>Error:</strong> ${error.message || 'Error desconocido'}
                        </p>
                    </div>
                </div>
            `,
            icon: 'error',
            background: '#0a0a0a',
            color: '#ffffff',
            confirmButtonColor: '#ef4444',
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

        console.log('📊 Datos de empresa para edición:', empresaActual);
    } catch (error) {
        console.error('Error obteniendo datos de empresa:', error);
        empresaActual = { id: '', nombre: 'No especificada', camelCase: '' };
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Inicializando editor de categorías...');

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

    mostrarInfoEmpresa();

    // Verificar si viene con parámetro de nueva subcategoría
    const nuevaSubcategoria = urlParams.get('nuevaSubcategoria');
    if (nuevaSubcategoria === 'true') {
        setTimeout(() => {
            abrirEditorSubcategoria('crear');
            setTimeout(() => {
                const editor = document.getElementById('subcategoriaEditorContainer');
                if (editor) {
                    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    editor.style.transition = 'box-shadow 0.3s ease';
                    editor.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.5)';
                    setTimeout(() => {
                        editor.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.25)';
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
                        editor.style.transition = 'box-shadow 0.3s ease';
                        editor.style.boxShadow = '0 0 0 4px rgba(249, 115, 22, 0.5)';
                        setTimeout(() => {
                            editor.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.25)';
                        }, 1500);
                    }
                }, 200);

                const subNombre = subcategorias.find(s => s.id === editarSubcategoriaId)?.nombre || 'subcategoría';
                mostrarNotificacion(`✏️ Editando: ${subNombre}`, 'info');
            } else {
                console.error('Subcategoría no encontrada:', editarSubcategoriaId);
                mostrarNotificacion('Error: Subcategoría no encontrada', 'error');
            }
        }, 600);
    }
});

function mostrarInfoEmpresa() {
    try {
        const header = document.querySelector('.dashboard-title') || document.querySelector('h1');
        if (header && !document.getElementById('badge-empresa-editar')) {
            const badgeEmpresa = document.createElement('div');
            badgeEmpresa.id = 'badge-empresa-editar';
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
            if (empresaActual?.logo) {
                logoSrc = `<img src="${empresaActual.logo}" alt="Logo" style="width: 24px; height: 24px; border-radius: 6px; object-fit: cover;">`;
            }

            badgeEmpresa.innerHTML = `
                ${logoSrc || '<i class="fas fa-building"></i>'}
                <span>
                    <span style="opacity: 0.8;">Empresa:</span> 
                    <strong style="color: #34d399;">${empresaActual?.nombre || categoriaActual?.organizacionNombre || 'No especificada'}</strong>
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

/**
 * CARGA LA CATEGORÍA DESDE FIRESTORE
 * CORREGIDO: Maneja objetos, NO Maps
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

        console.log('📦 Categoría cargada:', categoriaActual);
        console.log('📁 Subcategorías (objeto):', categoriaActual.subcategorias);

        // 🔥 CORREGIDO: Convertir objeto de subcategorías a array
        subcategorias = [];
        
        if (categoriaActual.subcategorias && typeof categoriaActual.subcategorias === 'object') {
            // Iterar sobre las propiedades del objeto
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

        console.log('✅ Categoría cargada:', {
            id: categoriaActual.id,
            nombre: categoriaActual.nombre,
            subcategorias: subcategorias.length,
            color: categoriaActual.color
        });

    } catch (error) {
        console.error('Error al cargar categoría:', error);
        mostrarNotificacion('Error al cargar la categoría', 'error');
    }
}

function actualizarUICategoria() {
    if (!categoriaActual) return;

    // Actualizar título
    const tituloElement = document.querySelector('.dashboard-title span');
    if (tituloElement) {
        tituloElement.innerHTML = `Editar <span style="color: #2f8cff; font-weight: 700;">${escapeHTML(categoriaActual.nombre)}</span>`;
    }

    // Actualizar campos del formulario
    document.getElementById('nombreCategoria').value = categoriaActual.nombre || '';
    document.getElementById('colorPicker').value = categoriaActual.color || '#2f8cff';

    // Actualizar previsualización de color
    const colorPreview = document.getElementById('colorPreview');
    if (colorPreview) {
        colorPreview.style.backgroundColor = categoriaActual.color || '#2f8cff';
    }

    const colorHex = document.getElementById('colorHex');
    if (colorHex) {
        colorHex.textContent = categoriaActual.color || '#2f8cff';
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
                <div style="font-size: 64px; color: rgba(249, 115, 22, 0.2); margin-bottom: 16px;">
                    <i class="fas fa-folder-open"></i>
                </div>
                <h3 style="color: #f97316; margin-bottom: 12px;">No hay subcategorías</h3>
                <p style="color: var(--text-dim); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
                    Esta categoría aún no tiene subcategorías. Crea la primera haciendo clic en el botón superior.
                </p>
                <button class="btn-add-subcategoria" onclick="abrirEditorSubcategoria('crear')" style="background: linear-gradient(135deg, #f97316, #ea580c); border: none; padding: 12px 24px; border-radius: 30px; color: white; font-weight: 600;">
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
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
    `;

    div.onmouseenter = function () {
        this.style.background = 'rgba(47, 140, 255, 0.05)';
        this.style.borderColor = 'rgba(47, 140, 255, 0.3)';
    };
    div.onmouseleave = function () {
        this.style.background = 'rgba(255, 255, 255, 0.02)';
        this.style.borderColor = 'var(--border-color)';
    };

    // Determinar color de la subcategoría
    let colorActual = sub.color;
    if (!colorActual || sub.heredaColor) {
        colorActual = categoriaActual.color || '#2f8cff';
    }

    const badgeColor = sub.heredaColor ? '#10b981' : '#f97316';
    const badgeIcon = sub.heredaColor ? 'fa-paint-brush' : 'fa-palette';
    const badgeText = sub.heredaColor ? 'Hereda color' : 'Color propio';
    const descripcion = sub.descripcion || 'Sin descripción';

    div.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 16px; flex: 1;">
            <div style="width: 40px; height: 40px; background-color: ${colorActual}; border-radius: 10px; border: 2px solid rgba(255,255,255,0.1);"></div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #fff;">${escapeHTML(sub.nombre || 'Sin nombre')}</h4>
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: ${badgeColor}15; color: ${badgeColor}; border-radius: 20px; font-size: 11px; font-weight: 500;">
                        <i class="fas ${badgeIcon}" style="font-size: 10px;"></i>
                        ${badgeText}
                    </span>
                </div>
                <p style="margin: 0 0 6px 0; color: #d1d5db; font-size: 14px;">${escapeHTML(descripcion)}</p>
                <small style="color: #6b7280; font-size: 11px;">
                    <i class="fas fa-fingerprint"></i> ID: ${sub.id?.substring(0, 8) || ''}...
                    ${sub.fechaActualizacion ? ` | <i class="fas fa-clock"></i> ${new Date(sub.fechaActualizacion).toLocaleDateString()}` : ''}
                </small>
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-left: 20px;">
            <button class="btn-sub-action edit" onclick="abrirEditorSubcategoria('editar', '${sub.id}')" 
                    style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); color: #f97316; padding: 8px 12px; border-radius: 8px;"
                    onmouseenter="this.style.background='rgba(249,115,22,0.2)'; this.style.borderColor='#f97316';"
                    onmouseleave="this.style.background='rgba(249,115,22,0.1)'; this.style.borderColor='rgba(249,115,22,0.3)';">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sub-action delete" onclick="eliminarSubcategoria('${sub.id}')"
                    style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 8px 12px; border-radius: 8px;"
                    onmouseenter="this.style.background='rgba(239,68,68,0.2)'; this.style.borderColor='#ef4444';"
                    onmouseleave="this.style.background='rgba(239,68,68,0.1)'; this.style.borderColor='rgba(239,68,68,0.3)';">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return div;
}

/**
 * ABRIR EDITOR DE SUBCATEGORÍA
 * CORREGIDO: Funciona con objetos, no Maps
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
        icono.style.color = '#10b981';

        document.getElementById('heredarColorPadre').checked = true;
        document.getElementById('colorPersonalizadoGroup').style.display = 'none';

        // Color base para nueva subcategoría
        const colorBase = categoriaActual.color || '#2f8cff';
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
        icono.style.color = '#f97316';

        document.getElementById('nombreSubcategoria').value = sub.nombre || '';
        document.getElementById('descripcionSubcategoria').value = sub.descripcion || '';
        document.getElementById('subcategoriaId').value = sub.id;

        const hereda = sub.heredaColor !== false;
        document.getElementById('heredarColorPadre').checked = hereda;

        if (hereda) {
            document.getElementById('colorPersonalizadoGroup').style.display = 'none';
        } else {
            document.getElementById('colorPersonalizadoGroup').style.display = 'block';
            const colorValue = sub.color || categoriaActual.color || '#2f8cff';
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
 * CORREGIDO: Actualiza el objeto subcategorias correctamente
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
            // 🔥 CORREGIDO: Usar el método de la clase Categoria
            if (categoriaActual.existeSubcategoria(nombre)) {
                throw new Error(`Ya existe una subcategoría con el nombre "${nombre}" en esta categoría`);
            }

            // Agregar subcategoría - esto genera un ID temporal
            const nuevoSubId = categoriaActual.agregarSubcategoria(nombre, descripcion, heredaColor, color);
            
            // Si no hereda color, asignar color personalizado
            if (!heredaColor && color) {
                categoriaActual.subcategorias[nuevoSubId].color = color;
                categoriaActual.subcategorias[nuevoSubId].heredaColor = false;
            }

            mostrarNotificacion('✅ Subcategoría creada exitosamente', 'success');

        } else if (modoEdicionSubcategoria === 'editar' && subId) {
            // Verificar si el nombre ya existe en otra subcategoría
            const subExistente = categoriaActual.subcategorias[subId];
            if (!subExistente) {
                throw new Error('Subcategoría no encontrada');
            }

            const nombreAnterior = subExistente.nombre;
            if (nombre !== nombreAnterior && categoriaActual.existeSubcategoria(nombre)) {
                throw new Error(`Ya existe otra subcategoría con el nombre "${nombre}"`);
            }

            // 🔥 CORREGIDO: Actualizar directamente en el objeto
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

        // 🔥 IMPORTANTE: Guardar TODA la categoría en Firestore
        await categoriaManager.actualizarCategoria(categoriaActual.id, {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion,
            color: categoriaActual.color,
            subcategorias: categoriaActual.subcategorias // Enviar el objeto completo
        });

        // Recargar categoría para obtener los datos actualizados
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
 * CORREGIDO: Usa el método de la clase Categoria
 */
async function eliminarSubcategoria(subcategoriaId) {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }

    const sub = subcategorias.find(s => s.id === subcategoriaId);
    if (!sub) return;

    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
        html: `
            <div style="text-align: center; padding: 10px;">
                <div style="font-size: 64px; color: #ef4444; margin-bottom: 16px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h5 style="margin-bottom: 16px; color: #fff;">Estás a punto de eliminar:</h5>
                <p style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <strong style="color: #ef4444; font-size: 18px;">${escapeHTML(sub.nombre || '')}</strong>
                </p>
                <p style="color: #9ca3af; font-size: 14px;">Esta acción no se puede deshacer.</p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: '#0a0a0a',
        color: '#ffffff'
    });

    if (result.isConfirmed) {
        try {
            // 🔥 CORREGIDO: Usar el método de la clase
            categoriaActual.eliminarSubcategoria(subcategoriaId);

            // Guardar cambios en Firestore
            await categoriaManager.actualizarCategoria(categoriaActual.id, {
                nombre: categoriaActual.nombre,
                descripcion: categoriaActual.descripcion,
                color: categoriaActual.color,
                subcategorias: categoriaActual.subcategorias
            });

            await cargarCategoria(categoriaActual.id);

            Swal.fire({
                title: '¡Eliminada!',
                text: `La subcategoría "${sub.nombre}" ha sido eliminada.`,
                icon: 'success',
                confirmButtonColor: '#10b981',
                background: '#0a0a0a',
                color: '#ffffff',
                timer: 2000,
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
 * GUARDAR CATEGORÍA (CAMBIO DE NOMBRE/COLOR)
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

        const nombreAnterior = categoriaActual.nombre;
        const colorAnterior = categoriaActual.color;

        // Actualizar el objeto actual
        categoriaActual.nombre = nombre;
        categoriaActual.color = color;

        // 🔥 IMPORTANTE: Enviar TODOS los datos, incluyendo subcategorías
        await categoriaManager.actualizarCategoria(categoriaActual.id, {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion,
            color: categoriaActual.color,
            subcategorias: categoriaActual.subcategorias // NO perder las subcategorías
        });

        // Recargar categoría para confirmar cambios
        await cargarCategoria(categoriaActual.id);

        Swal.fire({
            title: '¡Guardado!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 16px;"></i>
                    <p>La categoría ha sido actualizada correctamente.</p>
                </div>
            `,
            icon: 'success',
            confirmButtonColor: '#10b981',
            background: '#0a0a0a',
            color: '#ffffff',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error al guardar categoría:', error);
        mostrarNotificacion(`Error: ${error.message}`, 'error');

        // Revertir cambios locales si hay error
        if (categoriaActual) {
            document.getElementById('nombreCategoria').value = categoriaActual.nombre;
            document.getElementById('colorPicker').value = categoriaActual.color || '#2f8cff';
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

    // Verificar cambios en subcategorías
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
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Seguir editando',
            background: '#0a0a0a',
            color: '#ffffff'
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

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notisExistentes = document.querySelectorAll('.notificacion-flotante');
    notisExistentes.forEach(n => n.remove());

    const noti = document.createElement('div');
    noti.className = 'notificacion-flotante';

    const colores = {
        success: '#10b981',
        error: '#ef4444',
        info: '#2f8cff',
        warning: '#f59e0b'
    };

    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    noti.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${colores[tipo] || colores.info};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        max-width: 400px;
    `;

    noti.innerHTML = `
        <i class="fas ${iconos[tipo] || 'fa-info-circle'}" style="font-size: 20px;"></i>
        <span style="flex: 1;">${mensaje}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; opacity: 0.7; cursor: pointer; padding: 4px;">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(noti);

    if (!document.querySelector('#notificacion-styles')) {
        const style = document.createElement('style');
        style.id = 'notificacion-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        noti.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => noti.remove(), 300);
    }, 5000);
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