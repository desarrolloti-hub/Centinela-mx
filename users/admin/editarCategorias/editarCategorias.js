/**
 * EDITAR CATEGORÍAS - Sistema Centinela
 * VERSIÓN CON FIREBASE - Carga dinámica de la clase
 * 
 * Dos formularios:
 * - Form 1: Editar categoría (nombre, color)
 * - Form 2: Crear/Editar subcategoría (nombre, descripción, color)
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaActual = null;
let subcategorias = [];
let modoEdicionSubcategoria = 'crear'; // 'crear' o 'editar'
let subcategoriaEditando = null;

// =============================================
// INICIALIZACIÓN - CARGA DINÁMICA DE LA CLASE
// =============================================
async function inicializarCategoriaManager() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        categoriaManager = new CategoriaManager();
        console.log('✅ CategoriaManager cargado correctamente');
        console.log('📁 Colección:', categoriaManager?.nombreColeccion);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar CategoriaManager:', error);
        
        Swal.fire({
            title: 'Error crítico',
            text: 'No se pudo cargar el módulo de categorías. Por favor, recarga la página.',
            icon: 'error',
            background: '#0a0a0a',
            color: '#ffffff',
            confirmButtonColor: '#ff4d4d',
            confirmButtonText: 'Recargar'
        }).then(() => {
            window.location.reload();
        });
        
        return false;
    }
}

// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando editor de categorías...');
    
    // Inicializar manager
    const exito = await inicializarCategoriaManager();
    if (!exito) return;
    
    // Obtener ID de la categoría de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoriaId = urlParams.get('id');
    
    if (!categoriaId) {
        mostrarNotificacion('No se especificó la categoría a editar', 'error');
        setTimeout(() => window.location.href = '/users/admin/categorias/categorias.html', 1500);
        return;
    }
    
    // Cargar categoría
    await cargarCategoria(categoriaId);
    
    // Inicializar componentes y eventos
    inicializarComponentes();
    inicializarEventos();
    
    // SIEMPRE ocultar editor de subcategoría al inicio
    cerrarEditorSubcategoria();
    
    // Mostrar información de la empresa
    mostrarInfoEmpresa();
    
    // ============================================
    // DETECCIÓN DE PARÁMETROS - QUÉ FORMULARIO ABRIR
    // ============================================
    
    // CASO 1: AGREGAR NUEVA SUBCATEGORÍA (segundo formulario - modo crear)
    const nuevaSubcategoria = urlParams.get('nuevaSubcategoria');
    if (nuevaSubcategoria === 'true') {
        console.log('📝 Modo: Crear nueva subcategoría');
        
        setTimeout(() => {
            abrirEditorSubcategoria('crear');
            
            setTimeout(() => {
                const editor = document.getElementById('subcategoriaEditorContainer');
                if (editor) {
                    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Efecto de resaltado VERDE (crear)
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
    
    // CASO 2: EDITAR SUBCATEGORÍA EXISTENTE (segundo formulario - modo editar)
    const editarSubcategoriaId = urlParams.get('editarSubcategoria');
    if (editarSubcategoriaId) {
        console.log(`✏️ Modo: Editar subcategoría ID: ${editarSubcategoriaId}`);
        
        setTimeout(() => {
            const subcategoriaExiste = subcategorias.some(s => s.id === editarSubcategoriaId);
            
            if (subcategoriaExiste) {
                abrirEditorSubcategoria('editar', editarSubcategoriaId);
                
                setTimeout(() => {
                    const editor = document.getElementById('subcategoriaEditorContainer');
                    if (editor) {
                        editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Efecto de resaltado NARANJA (editar)
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
    
    // CASO 3: SOLO EDITAR CATEGORÍA (primer formulario - sin parámetros adicionales)
    if (!nuevaSubcategoria && !editarSubcategoriaId) {
        console.log('🏷️ Modo: Editar categoría');
        // No hacer nada especial, el editor de subcategoría ya está oculto
    }
});

function mostrarInfoEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const empresaData = JSON.parse(localStorage.getItem('empresa') || '{}');
        
        const empresaNombre = empresaData.nombre || userData.empresa || 'No especificada';
        
        // Agregar badge de empresa en el header
        const header = document.querySelector('.dashboard-title') || document.querySelector('h1');
        if (header && !document.getElementById('badge-empresa-editar')) {
            const badgeEmpresa = document.createElement('div');
            badgeEmpresa.id = 'badge-empresa-editar';
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
// CARGA DE DATOS DESDE FIREBASE
// =============================================
async function cargarCategoria(id) {
    if (!categoriaManager) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }
    
    try {
        categoriaActual = await categoriaManager.obtenerCategoria(id);
        
        if (!categoriaActual) {
            mostrarNotificacion('Categoría no encontrada', 'error');
            setTimeout(() => window.location.href = '/users/admin/categorias/categorias.html', 1500);
            return;
        }
        
        // Convertir subcategorías de Map a array de objetos
        subcategorias = [];
        categoriaActual.subcategorias.forEach((subMap, subId) => {
            const subObj = {};
            subMap.forEach((value, key) => {
                subObj[key] = value;
            });
            subcategorias.push(subObj);
        });
        
        // Ordenar subcategorías por nombre
        subcategorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        
        // Actualizar UI
        actualizarUICategoria();
        cargarSubcategorias();
        
        console.log('✅ Categoría cargada:', categoriaActual.nombre);
        console.log('📦 Subcategorías:', subcategorias.length);
        console.log('🏢 Empresa:', categoriaActual.empresaNombre);
        
    } catch (error) {
        console.error('Error al cargar categoría:', error);
        mostrarNotificacion('Error al cargar la categoría', 'error');
    }
}

// =============================================
// UI - FORMULARIO DE CATEGORÍA (PRIMER FORMULARIO)
// =============================================
function actualizarUICategoria() {
    if (!categoriaActual) return;
    
    const tituloElement = document.querySelector('.dashboard-title span');
    if (tituloElement) {
        tituloElement.innerHTML = `Editar <span style="color: #FF5733">${escapeHTML(categoriaActual.nombre)}</span>`;
    }
    
    document.getElementById('nombreCategoria').value = categoriaActual.nombre || '';
    
    // Agregar información de la empresa
    const infoEmpresa = document.createElement('div');
    infoEmpresa.className = 'alert alert-info mt-3';
    infoEmpresa.style.cssText = `
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #10b981;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
    `;
    infoEmpresa.innerHTML = `
        <i class="fas fa-building"></i>
        Editando categoría de: <strong>${categoriaActual.empresaNombre || 'No especificada'}</strong>
    `;
    
    const container = document.querySelector('.card-body');
    if (container && !document.getElementById('info-empresa-edicion')) {
        infoEmpresa.id = 'info-empresa-edicion';
        container.prepend(infoEmpresa);
    }
    
    // NOTA: La clase Categoria no tiene campo color
    // Usamos un color por defecto o podemos recuperarlo de otro lugar
    setColorCategoria('#FF5733');
}

function setColorCategoria(color) {
    const fullColor = color.startsWith('#') ? color : '#' + color;
    
    const colorPreview = document.getElementById('colorPreview');
    const colorPicker = document.getElementById('colorPicker');
    const colorHex = document.getElementById('colorHex');
    
    if (colorPreview) colorPreview.style.backgroundColor = fullColor;
    if (colorPicker) colorPicker.value = fullColor;
    if (colorHex) colorHex.textContent = fullColor;
    
    // Actualizar presets activos
    document.querySelectorAll('.preset-dot').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === fullColor);
    });
    
    // Actualizar colores de subcategorías que heredan
    let cambios = false;
    subcategorias.forEach(sub => {
        if (sub.heredaColor) {
            sub.color = fullColor;
            cambios = true;
        }
    });
    
    if (cambios) cargarSubcategorias();
}

// =============================================
// UI - LISTA DE SUBCATEGORÍAS
// =============================================
function cargarSubcategorias() {
    const lista = document.getElementById('listaSubcategorias');
    if (!lista) return;
    
    const totalSub = subcategorias.length;
    const totalSubElement = document.getElementById('totalSubcategorias');
    if (totalSubElement) totalSubElement.textContent = totalSub;
    
    if (!subcategorias || totalSub === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No hay subcategorías</h3>
                <p>Haz clic en "Agregar Subcategoría" para crear una nueva</p>
            </div>
        `;
        return;
    }
    
    lista.innerHTML = '';
    
    subcategorias
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
        .forEach(sub => {
            const item = crearTarjetaSubcategoria(sub);
            lista.appendChild(item);
        });
}

function crearTarjetaSubcategoria(sub) {
    const div = document.createElement('div');
    div.className = 'subcategoria-item';
    div.dataset.id = sub.id;
    
    const badgeColor = sub.heredaColor ? '#10b981' : '#f97316';
    const badgeIcon = sub.heredaColor ? 'fa-paint-brush' : 'fa-palette';
    const badgeText = sub.heredaColor ? 'Hereda color' : 'Color propio';
    const descripcion = sub.descripcion || 'Sin descripción';
    const colorActual = sub.color || '#FF5733';
    
    div.innerHTML = `
        <div class="subcategoria-info">
            <div class="subcategoria-color-indicator" style="background-color: ${colorActual};"></div>
            <div class="subcategoria-content">
                <div class="subcategoria-nombre">
                    <h4>${escapeHTML(sub.nombre || 'Sin nombre')}</h4>
                    <span class="subcategoria-badge" style="background: ${badgeColor}15; color: ${badgeColor};">
                        <i class="fas ${badgeIcon}"></i>
                        ${badgeText}
                    </span>
                </div>
                <p class="subcategoria-descripcion">${escapeHTML(descripcion)}</p>
                <small class="subcategoria-id" style="color: var(--text-dim); font-size: 11px;">
                    ID: ${sub.id || ''}
                </small>
            </div>
        </div>
        <div class="subcategoria-actions">
            <button class="btn-sub-action edit" onclick="abrirEditorSubcategoria('editar', '${sub.id}')" title="Editar subcategoría">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sub-action delete" onclick="eliminarSubcategoria('${sub.id}')" title="Eliminar subcategoría">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

// =============================================
// EDITOR DE SUBCATEGORÍA (SEGUNDO FORMULARIO)
// =============================================
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
    
    // Resetear formulario
    const form = document.getElementById('formSubcategoria');
    if (form) form.reset();
    
    document.getElementById('subcategoriaId').value = '';
    
    if (modo === 'crear') {
        // MODO CREAR - Formulario vacío
        titulo.textContent = 'Nueva Subcategoría';
        icono.className = 'fas fa-plus-circle';
        
        document.getElementById('heredarColorPadre').checked = true;
        document.getElementById('colorPersonalizadoGroup').style.display = 'none';
        
        // Usar color por defecto
        const colorBase = '#FF5733';
        document.getElementById('colorSubcategoria').value = colorBase;
        document.getElementById('subcategoriaColorPreview').style.backgroundColor = colorBase;
        document.getElementById('subcategoriaColorHex').textContent = colorBase;
        
    } else if (modo === 'editar' && subcategoriaId) {
        // MODO EDITAR - Cargar datos de la subcategoría
        const sub = subcategorias.find(s => s.id === subcategoriaId);
        if (!sub) {
            mostrarNotificacion('Subcategoría no encontrada', 'error');
            return;
        }
        
        subcategoriaEditando = sub;
        titulo.textContent = `Editar: ${sub.nombre || 'Subcategoría'}`;
        icono.className = 'fas fa-edit';
        
        document.getElementById('nombreSubcategoria').value = sub.nombre || '';
        document.getElementById('descripcionSubcategoria').value = sub.descripcion || '';
        document.getElementById('subcategoriaId').value = sub.id;
        
        const hereda = sub.heredaColor !== false;
        document.getElementById('heredarColorPadre').checked = hereda;
        
        if (hereda) {
            document.getElementById('colorPersonalizadoGroup').style.display = 'none';
        } else {
            document.getElementById('colorPersonalizadoGroup').style.display = 'block';
            const colorValue = sub.color || '#FF5733';
            document.getElementById('colorSubcategoria').value = colorValue;
            document.getElementById('subcategoriaColorPreview').style.backgroundColor = colorValue;
            document.getElementById('subcategoriaColorHex').textContent = colorValue;
        }
    }
    
    // Mostrar editor
    editor.style.display = 'block';
    
    // Scroll y focus
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

// =============================================
// GUARDAR SUBCATEGORÍA (CREAR O ACTUALIZAR)
// =============================================
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
    
    const descripcion = document.getElementById('descripcionSubcategoria').value.trim();
    const heredaColor = document.getElementById('heredarColorPadre').checked;
    const color = heredaColor ? 
        document.getElementById('colorPicker').value : 
        document.getElementById('colorSubcategoria').value;
    
    const subId = document.getElementById('subcategoriaId').value;
    
    try {
        if (modoEdicionSubcategoria === 'crear') {
            // CREAR NUEVA SUBCATEGORÍA
            const nuevaSubId = categoriaActual.agregarSubcategoria(nombre, descripcion);
            
            // Actualizar color si no hereda
            if (!heredaColor) {
                const subMap = categoriaActual.obtenerSubcategoria(nuevaSubId);
                if (subMap) {
                    subMap.set('color', color);
                    subMap.set('heredaColor', false);
                }
            }
            
            // Guardar cambios en Firebase
            await categoriaManager.actualizarCategoria(categoriaActual.id, {
                nombre: categoriaActual.nombre,
                descripcion: categoriaActual.descripcion
            });
            
            mostrarNotificacion('✅ Subcategoría creada exitosamente', 'success');
            
        } else if (modoEdicionSubcategoria === 'editar' && subId) {
            // ACTUALIZAR SUBCATEGORÍA EXISTENTE
            const subMap = categoriaActual.obtenerSubcategoria(subId);
            if (subMap) {
                subMap.set('nombre', nombre);
                subMap.set('descripcion', descripcion);
                subMap.set('color', color);
                subMap.set('heredaColor', heredaColor);
                subMap.set('fechaActualizacion', new Date().toISOString());
            }
            
            // Guardar cambios en Firebase
            await categoriaManager.actualizarCategoria(categoriaActual.id, {
                nombre: categoriaActual.nombre,
                descripcion: categoriaActual.descripcion
            });
            
            mostrarNotificacion('✅ Subcategoría actualizada', 'success');
        }
        
        // Recargar datos
        await cargarCategoria(categoriaActual.id);
        
        // Cerrar editor
        cerrarEditorSubcategoria();
        
    } catch (error) {
        console.error('Error al guardar subcategoría:', error);
        mostrarNotificacion(`Error: ${error.message}`, 'error');
    }
}

// =============================================
// ELIMINAR SUBCATEGORÍA
// =============================================
async function eliminarSubcategoria(subcategoriaId) {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }
    
    const sub = subcategorias.find(s => s.id === subcategoriaId);
    if (!sub) return;
    
    document.getElementById('modalConfirmacionMensaje').innerHTML = `
        ¿Estás seguro de eliminar <strong>${escapeHTML(sub.nombre || '')}</strong>?<br>
        <span style="font-size: 13px; color: var(--text-dim);">Esta acción no se puede deshacer.</span>
        <br>
        <span style="font-size: 13px; color: #10b981;">
            <i class="fas fa-building"></i> Empresa: ${escapeHTML(categoriaActual.empresaNombre || 'No especificada')}
        </span>
    `;
    
    // Configurar botón de confirmación
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    if (btnConfirmar) {
        // Remover event listeners anteriores
        const nuevoBtn = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);
        
        nuevoBtn.onclick = async () => {
            try {
                categoriaActual.eliminarSubcategoria(subcategoriaId);
                await categoriaManager.actualizarCategoria(categoriaActual.id, {
                    nombre: categoriaActual.nombre,
                    descripcion: categoriaActual.descripcion
                });
                
                cerrarModal('modalConfirmacion');
                await cargarCategoria(categoriaActual.id);
                mostrarNotificacion('🗑️ Subcategoría eliminada', 'success');
                
            } catch (error) {
                console.error('Error al eliminar subcategoría:', error);
                mostrarNotificacion(`Error: ${error.message}`, 'error');
                cerrarModal('modalConfirmacion');
            }
        };
    }
    
    abrirModal('modalConfirmacion');
}

// =============================================
// GUARDAR CATEGORÍA (PRIMER FORMULARIO)
// =============================================
async function guardarCategoria() {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }
    
    const nombre = document.getElementById('nombreCategoria').value.trim();
    
    if (!nombre) {
        mostrarNotificacion('El nombre de la categoría es requerido', 'error');
        document.getElementById('nombreCategoria').focus();
        return;
    }
    
    const btn = document.getElementById('btnGuardarCategoria');
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;
        
        // Actualizar datos de la categoría
        categoriaActual.nombre = nombre;
        
        // NOTA: El color no está en la clase Categoria
        // Si quieres guardarlo, necesitas modificar categoria.js
        
        // Guardar en Firebase
        await categoriaManager.actualizarCategoria(categoriaActual.id, {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion
        });
        
        // Recargar categoría para asegurar datos frescos
        await cargarCategoria(categoriaActual.id);
        
        mostrarNotificacion('✅ Categoría guardada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        mostrarNotificacion(`Error al guardar: ${error.message}`, 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// =============================================
// CANCELAR EDICIÓN
// =============================================
function cancelarEdicion() {
    if (!categoriaActual) {
        window.location.href = '/users/admin/categorias/categorias.html';
        return;
    }
    
    const nombreActual = document.getElementById('nombreCategoria').value.trim();
    const hayCambiosEnCategoria = nombreActual !== categoriaActual.nombre;
    
    // Verificar cambios en subcategorías
    const subcategoriasOriginales = [];
    categoriaActual.subcategorias.forEach((subMap) => {
        const subObj = {};
        subMap.forEach((value, key) => { subObj[key] = value; });
        subcategoriasOriginales.push(subObj);
    });
    
    const hayCambiosEnSubcategorias = 
        JSON.stringify(subcategorias.map(s => ({ 
            id: s.id, 
            nombre: s.nombre, 
            descripcion: s.descripcion, 
            color: s.color, 
            heredaColor: s.heredaColor 
        }))) !== 
        JSON.stringify(subcategoriasOriginales.map(s => ({ 
            id: s.id, 
            nombre: s.nombre, 
            descripcion: s.descripcion, 
            color: s.color, 
            heredaColor: s.heredaColor 
        })));
    
    if (hayCambiosEnCategoria || hayCambiosEnSubcategorias) {
        const modal = document.getElementById('modalConfirmacion');
        if (!modal) {
            window.location.href = '/users/admin/categorias/categorias.html';
            return;
        }
        
        const titulo = modal.querySelector('.modal-title span');
        const mensaje = document.getElementById('modalConfirmacionMensaje');
        const btnConfirmar = document.getElementById('btnConfirmarAccion');
        
        if (titulo) titulo.textContent = '¿Cancelar edición?';
        if (mensaje) {
            mensaje.innerHTML = `
                Tienes cambios sin guardar en la categoría o sus subcategorías.<br>
                <strong>¿Seguro que quieres salir?</strong>
                <br><br>
                <span style="font-size: 13px; color: #10b981;">
                    <i class="fas fa-building"></i> Empresa: ${escapeHTML(categoriaActual.empresaNombre || 'No especificada')}
                </span>
            `;
        }
        
        if (btnConfirmar) {
            btnConfirmar.style.background = 'var(--text-muted)';
            btnConfirmar.style.color = 'white';
            btnConfirmar.textContent = 'Sí, salir';
            
            // Remover event listeners anteriores
            const nuevoBtn = btnConfirmar.cloneNode(true);
            btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);
            
            nuevoBtn.onclick = () => {
                cerrarModal('modalConfirmacion');
                window.location.href = '/users/admin/categorias/categorias.html';
            };
        }
        
        abrirModal('modalConfirmacion');
    } else {
        window.location.href = '/users/admin/categorias/categorias.html';
    }
}

// =============================================
// EVENTOS E INICIALIZACIÓN
// =============================================
function inicializarComponentes() {
    // Color picker de categoría
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', function(e) {
            setColorCategoria(e.target.value);
        });
    }
    
    // Presets de color
    document.querySelectorAll('.preset-dot').forEach(btn => {
        btn.addEventListener('click', function() {
            setColorCategoria(this.dataset.color);
        });
    });
    
    // Color picker de subcategoría
    const colorSubcategoria = document.getElementById('colorSubcategoria');
    if (colorSubcategoria) {
        colorSubcategoria.addEventListener('input', function(e) {
            const preview = document.getElementById('subcategoriaColorPreview');
            const hex = document.getElementById('subcategoriaColorHex');
            if (preview) preview.style.backgroundColor = e.target.value;
            if (hex) hex.textContent = e.target.value;
        });
    }
}

function inicializarEventos() {
    // Botón guardar categoría
    const btnGuardar = document.getElementById('btnGuardarCategoria');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCategoria);
    }
    
    // Botón nueva subcategoría
    const btnNuevaSub = document.getElementById('btnNuevaSubcategoria');
    if (btnNuevaSub) {
        btnNuevaSub.addEventListener('click', function() {
            abrirEditorSubcategoria('crear');
        });
    }
    
    // Botón guardar subcategoría
    const btnGuardarSub = document.getElementById('btnGuardarSubcategoria');
    if (btnGuardarSub) {
        btnGuardarSub.addEventListener('click', guardarSubcategoria);
    }
    
    // Checkbox heredar color
    const heredarCheckbox = document.getElementById('heredarColorPadre');
    if (heredarCheckbox) {
        heredarCheckbox.addEventListener('change', function() {
            const group = document.getElementById('colorPersonalizadoGroup');
            if (group) {
                group.style.display = this.checked ? 'none' : 'block';
            }
            
            if (!this.checked && categoriaActual) {
                const colorBase = '#FF5733';
                const colorInput = document.getElementById('colorSubcategoria');
                const preview = document.getElementById('subcategoriaColorPreview');
                const hex = document.getElementById('subcategoriaColorHex');
                
                if (colorInput) colorInput.value = colorBase;
                if (preview) preview.style.backgroundColor = colorBase;
                if (hex) hex.textContent = colorBase;
            }
        });
    }
    
    // Enter en campo nombre categoría
    const nombreCategoria = document.getElementById('nombreCategoria');
    if (nombreCategoria) {
        nombreCategoria.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                guardarCategoria();
            }
        });
    }
    
    // Enter en campo nombre subcategoría
    const nombreSubcategoria = document.getElementById('nombreSubcategoria');
    if (nombreSubcategoria) {
        nombreSubcategoria.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                guardarSubcategoria();
            }
        });
    }
    
    // Tecla ESC para cerrar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarEditorSubcategoria();
            cerrarModal('modalConfirmacion');
        }
    });
}

// =============================================
// UTILIDADES
// =============================================
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notisExistentes = document.querySelectorAll('.notificacion-flotante');
    notisExistentes.forEach(n => n.remove());
    
    const noti = document.createElement('div');
    noti.className = 'notificacion-flotante';
    noti.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#f59e0b'};
        color: white;
        padding: 14px 24px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.2s ease;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    const icon = tipo === 'success' ? 'fa-check-circle' : 
                 tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    noti.innerHTML = `<i class="fas ${icon}" style="font-size: 16px;"></i> ${mensaje}`;
    
    document.body.appendChild(noti);
    
    if (!document.querySelector('#notificacion-styles')) {
        const style = document.createElement('style');
        style.id = 'notificacion-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        noti.style.animation = 'slideIn 0.2s ease reverse';
        setTimeout(() => noti.remove(), 200);
    }, 3000);
}

// =============================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================
window.cargarCategoria = cargarCategoria;
window.guardarCategoria = guardarCategoria;
window.cancelarEdicion = cancelarEdicion;
window.abrirEditorSubcategoria = abrirEditorSubcategoria;
window.cerrarEditorSubcategoria = cerrarEditorSubcategoria;
window.guardarSubcategoria = guardarSubcategoria;
window.eliminarSubcategoria = eliminarSubcategoria;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.setColorCategoria = setColorCategoria;