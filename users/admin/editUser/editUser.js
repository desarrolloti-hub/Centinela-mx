/**
 * EDITAR CATEGORÍAS - Sistema Centinela
 * VERSIÓN CON FIREBASE - COMPATIBLE CON TODOS LOS NAVEGADORES
 * SIN import/export - Usa carga dinámica con import()
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let categoriaActual = null;
let subcategorias = [];
let modoEdicionSubcategoria = 'crear';
let subcategoriaEditando = null;

// =============================================
// INICIALIZACIÓN - CARGA DINÁMICA DE LA CLASE
// =============================================
async function inicializarCategoriaManager() {
    try {
        const module = await import('/clases/categoria.js');
        const CategoriaManager = module.CategoriaManager;
        
        categoriaManager = new CategoriaManager();
        console.log('✅ CategoriaManager cargado correctamente');
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
    
    // ============================================
    // DETECCIÓN DE PARÁMETROS - QUÉ FORMULARIO ABRIR
    // ============================================
    
    // CASO 1: AGREGAR NUEVA SUBCATEGORÍA
    const nuevaSubcategoria = urlParams.get('nuevaSubcategoria');
    if (nuevaSubcategoria === 'true') {
        console.log('📝 Modo: Crear nueva subcategoría');
        
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
    
    // CASO 2: EDITAR SUBCATEGORÍA EXISTENTE
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
    
    // CASO 3: SOLO EDITAR CATEGORÍA
    if (!nuevaSubcategoria && !editarSubcategoriaId) {
        console.log('🏷️ Modo: Editar categoría');
    }
});

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
    
    const nombreInput = document.getElementById('nombreCategoria');
    if (nombreInput) nombreInput.value = categoriaActual.nombre || '';
    
    // Color por defecto
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
    
    document.querySelectorAll('.preset-dot').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === fullColor);
    });
    
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
    
    const form = document.getElementById('formSubcategoria');
    if (form) form.reset();
    
    const subcategoriaIdInput = document.getElementById('subcategoriaId');
    if (subcategoriaIdInput) subcategoriaIdInput.value = '';
    
    if (modo === 'crear') {
        titulo.textContent = 'Nueva Subcategoría';
        icono.className = 'fas fa-plus-circle';
        
        const heredarCheckbox = document.getElementById('heredarColorPadre');
        if (heredarCheckbox) heredarCheckbox.checked = true;
        
        const colorPersonalizadoGroup = document.getElementById('colorPersonalizadoGroup');
        if (colorPersonalizadoGroup) colorPersonalizadoGroup.style.display = 'none';
        
        const colorBase = '#FF5733';
        const colorSubcategoria = document.getElementById('colorSubcategoria');
        const subcategoriaColorPreview = document.getElementById('subcategoriaColorPreview');
        const subcategoriaColorHex = document.getElementById('subcategoriaColorHex');
        
        if (colorSubcategoria) colorSubcategoria.value = colorBase;
        if (subcategoriaColorPreview) subcategoriaColorPreview.style.backgroundColor = colorBase;
        if (subcategoriaColorHex) subcategoriaColorHex.textContent = colorBase;
        
    } else if (modo === 'editar' && subcategoriaId) {
        const sub = subcategorias.find(s => s.id === subcategoriaId);
        if (!sub) {
            mostrarNotificacion('Subcategoría no encontrada', 'error');
            return;
        }
        
        subcategoriaEditando = sub;
        titulo.textContent = `Editar: ${sub.nombre || 'Subcategoría'}`;
        icono.className = 'fas fa-edit';
        
        const nombreSubcategoria = document.getElementById('nombreSubcategoria');
        const descripcionSubcategoria = document.getElementById('descripcionSubcategoria');
        const subcategoriaIdInput = document.getElementById('subcategoriaId');
        const heredarCheckbox = document.getElementById('heredarColorPadre');
        const colorPersonalizadoGroup = document.getElementById('colorPersonalizadoGroup');
        const colorSubcategoria = document.getElementById('colorSubcategoria');
        const subcategoriaColorPreview = document.getElementById('subcategoriaColorPreview');
        const subcategoriaColorHex = document.getElementById('subcategoriaColorHex');
        
        if (nombreSubcategoria) nombreSubcategoria.value = sub.nombre || '';
        if (descripcionSubcategoria) descripcionSubcategoria.value = sub.descripcion || '';
        if (subcategoriaIdInput) subcategoriaIdInput.value = sub.id;
        
        const hereda = sub.heredaColor !== false;
        if (heredarCheckbox) heredarCheckbox.checked = hereda;
        
        if (hereda) {
            if (colorPersonalizadoGroup) colorPersonalizadoGroup.style.display = 'none';
        } else {
            if (colorPersonalizadoGroup) colorPersonalizadoGroup.style.display = 'block';
            const colorValue = sub.color || '#FF5733';
            if (colorSubcategoria) colorSubcategoria.value = colorValue;
            if (subcategoriaColorPreview) subcategoriaColorPreview.style.backgroundColor = colorValue;
            if (subcategoriaColorHex) subcategoriaColorHex.textContent = colorValue;
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

// =============================================
// GUARDAR SUBCATEGORÍA
// =============================================
async function guardarSubcategoria() {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }
    
    const nombreInput = document.getElementById('nombreSubcategoria');
    if (!nombreInput) return;
    
    const nombre = nombreInput.value.trim();
    if (!nombre) {
        mostrarNotificacion('El nombre es requerido', 'error');
        nombreInput.focus();
        return;
    }
    
    const descripcionInput = document.getElementById('descripcionSubcategoria');
    const descripcion = descripcionInput ? descripcionInput.value.trim() : '';
    
    const heredarCheckbox = document.getElementById('heredarColorPadre');
    const heredaColor = heredarCheckbox ? heredarCheckbox.checked : true;
    
    const colorPicker = document.getElementById('colorPicker');
    const colorSubcategoria = document.getElementById('colorSubcategoria');
    const color = heredaColor ? 
        (colorPicker ? colorPicker.value : '#FF5733') : 
        (colorSubcategoria ? colorSubcategoria.value : '#FF5733');
    
    const subcategoriaIdInput = document.getElementById('subcategoriaId');
    const subId = subcategoriaIdInput ? subcategoriaIdInput.value : '';
    
    try {
        if (modoEdicionSubcategoria === 'crear') {
            const nuevaSubId = categoriaActual.agregarSubcategoria(nombre, descripcion);
            
            if (!heredaColor) {
                const subMap = categoriaActual.obtenerSubcategoria(nuevaSubId);
                if (subMap) {
                    subMap.set('color', color);
                    subMap.set('heredaColor', false);
                }
            }
            
            await categoriaManager.actualizarCategoria(categoriaActual.id, {
                nombre: categoriaActual.nombre,
                descripcion: categoriaActual.descripcion
            });
            
            mostrarNotificacion('✅ Subcategoría creada exitosamente', 'success');
            
        } else if (modoEdicionSubcategoria === 'editar' && subId) {
            const subMap = categoriaActual.obtenerSubcategoria(subId);
            if (subMap) {
                subMap.set('nombre', nombre);
                subMap.set('descripcion', descripcion);
                subMap.set('color', color);
                subMap.set('heredaColor', heredaColor);
                subMap.set('fechaActualizacion', new Date());
            }
            
            await categoriaManager.actualizarCategoria(categoriaActual.id, {
                nombre: categoriaActual.nombre,
                descripcion: categoriaActual.descripcion
            });
            
            mostrarNotificacion('✅ Subcategoría actualizada', 'success');
        }
        
        await cargarCategoria(categoriaActual.id);
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
    
    const modalMensaje = document.getElementById('modalConfirmacionMensaje');
    if (modalMensaje) {
        modalMensaje.innerHTML = `
            ¿Estás seguro de eliminar <strong>${escapeHTML(sub.nombre || '')}</strong>?<br>
            <span style="font-size: 13px; color: var(--text-dim);">Esta acción no se puede deshacer.</span>
        `;
    }
    
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    if (btnConfirmar) {
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
// GUARDAR CATEGORÍA
// =============================================
async function guardarCategoria() {
    if (!categoriaManager || !categoriaActual) {
        mostrarNotificacion('Error: Sistema no inicializado', 'error');
        return;
    }
    
    const nombreInput = document.getElementById('nombreCategoria');
    if (!nombreInput) return;
    
    const nombre = nombreInput.value.trim();
    if (!nombre) {
        mostrarNotificacion('El nombre de la categoría es requerido', 'error');
        nombreInput.focus();
        return;
    }
    
    const btn = document.getElementById('btnGuardarCategoria');
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;
        
        categoriaActual.nombre = nombre;
        
        await categoriaManager.actualizarCategoria(categoriaActual.id, {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion
        });
        
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
    
    const nombreInput = document.getElementById('nombreCategoria');
    const nombreActual = nombreInput ? nombreInput.value.trim() : '';
    const hayCambiosEnCategoria = nombreActual !== categoriaActual.nombre;
    
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
            `;
        }
        
        if (btnConfirmar) {
            btnConfirmar.style.background = 'var(--text-muted)';
            btnConfirmar.style.color = 'white';
            btnConfirmar.textContent = 'Sí, salir';
            
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
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', function(e) {
            setColorCategoria(e.target.value);
        });
    }
    
    document.querySelectorAll('.preset-dot').forEach(btn => {
        btn.addEventListener('click', function() {
            setColorCategoria(this.dataset.color);
        });
    });
    
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
    const btnGuardar = document.getElementById('btnGuardarCategoria');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCategoria);
    }
    
    const btnNuevaSub = document.getElementById('btnNuevaSubcategoria');
    if (btnNuevaSub) {
        btnNuevaSub.addEventListener('click', function() {
            abrirEditorSubcategoria('crear');
        });
    }
    
    const btnGuardarSub = document.getElementById('btnGuardarSubcategoria');
    if (btnGuardarSub) {
        btnGuardarSub.addEventListener('click', guardarSubcategoria);
    }
    
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
    
    const nombreCategoria = document.getElementById('nombreCategoria');
    if (nombreCategoria) {
        nombreCategoria.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                guardarCategoria();
            }
        });
    }
    
    const nombreSubcategoria = document.getElementById('nombreSubcategoria');
    if (nombreSubcategoria) {
        nombreSubcategoria.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                guardarSubcategoria();
            }
        });
    }
    
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