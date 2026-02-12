// crearCategorias.js - VERSIÓN CORREGIDA (ESTILO ÁREAS)
console.log('🚀 crearCategorias.js iniciando...');

// Variable global para debugging
window.crearCategoriaDebug = {
    estado: 'iniciando',
    controller: null
};

// =============================================
// CLASE PRINCIPAL - CrearCategoriaController
// =============================================
class CrearCategoriaController {
    constructor() {
        console.log('🛠️ Creando CrearCategoriaController...');
        
        this.categoriaManager = null;
        this.usuarioActual = null;
        this.categoriaEnProceso = null;
        this.categoriaCreadaReciente = null;
        this.loadingOverlay = null;
        this.notificacionActual = null;
        this.elementoConFocoAnterior = null;
        
        // Array para almacenar subcategorías
        this.subcategorias = [];
        
        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    
    async _init() {
        try {
            console.log('🎬 Inicializando controlador...');
            
            // 1. Cargar usuario
            this._cargarUsuario();
            
            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }
            
            console.log('✅ Usuario cargado:', this.usuarioActual);
            
            // 2. Cargar CategoriaManager
            await this._cargarCategoriaManager();
            
            // 3. Configurar eventos
            this._configurarEventos();
            
            // 4. Configurar organización automática
            this._configurarOrganizacion();
            
            // 5. Inicializar validaciones
            this._inicializarValidaciones();
            
            // 6. Inicializar gestión de subcategorías
            this._inicializarGestionSubcategorias();
            
            // 7. Actualizar UI con información de la empresa
            this._actualizarInfoEmpresa();
            
            console.log('✅ Controlador inicializado correctamente');
            window.crearCategoriaDebug.controller = this;
            
        } catch (error) {
            console.error('❌ Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========
    
    async _cargarCategoriaManager() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            this.categoriaManager = new CategoriaManager();
            console.log('✅ CategoriaManager cargado');
            console.log('📁 Colección por defecto:', this.categoriaManager.nombreColeccion);
        } catch (error) {
            console.error('❌ Error cargando CategoriaManager:', error);
            throw error;
        }
    }

    // ========== CARGA DE USUARIO ==========
    
    _cargarUsuario() {
        console.log('📂 Cargando datos del usuario...');
        
        try {
            // PRIMERO: Intentar adminInfo (para administradores)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                console.log('🔑 Datos de admin encontrados');
                
                this.usuarioActual = {
                    id: adminData.id || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    nombre: adminData.nombreCompleto || 'Administrador',
                    cargo: 'administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase || 
                                          this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || '',
                    fotoUsuario: adminData.fotoUsuario,
                    fotoOrganizacion: adminData.fotoOrganizacion,
                    esSuperAdmin: adminData.esSuperAdmin || true,
                    esAdminOrganizacion: adminData.esAdminOrganizacion || true,
                    timestamp: adminData.timestamp || new Date().toISOString()
                };
                return;
            }
            
            // SEGUNDO: Intentar userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                console.log('👤 Datos de usuario encontrados');
                
                this.usuarioActual = {
                    id: userData.uid || userData.id || `user_${Date.now()}`,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    nombre: userData.nombreCompleto || userData.nombre || 'Usuario',
                    cargo: userData.cargo || 'usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase || 
                                          this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || '',
                    timestamp: userData.timestamp || new Date().toISOString()
                };
                return;
            }
            
            // TERCERO: Datos por defecto (para desarrollo)
            console.warn('⚠️ Usando datos por defecto');
            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                nombre: 'Administrador',
                cargo: 'administrador',
                organizacion: 'pollos Ray',
                organizacionCamelCase: 'pollosRay',
                correo: 'admin@centinela.com',
                esSuperAdmin: true,
                esAdminOrganizacion: true
            };
            
        } catch (error) {
            console.error('❌ Error cargando usuario:', error);
            throw error;
        }
    }

    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    // ========== CONFIGURACIÓN DE ORGANIZACIÓN ==========
    
    _configurarOrganizacion() {
        console.log('🏢 Configurando organización automática...');
        
        // Configurar campos ocultos
        const orgCamelCaseInput = document.getElementById('organizacionCamelCase');
        const empresaNombreInput = document.getElementById('empresaNombre');
        
        if (orgCamelCaseInput) {
            orgCamelCaseInput.value = this.usuarioActual.organizacionCamelCase;
        }
        
        if (empresaNombreInput) {
            empresaNombreInput.value = this.usuarioActual.organizacion;
        }
        
        console.log('✅ Organización configurada:', {
            nombre: this.usuarioActual.organizacion,
            camelCase: this.usuarioActual.organizacionCamelCase
        });
    }

    _actualizarInfoEmpresa() {
        const container = document.getElementById('organizacionInfoContainer');
        if (!container) return;
        
        const coleccion = `categorias_${this.usuarioActual.organizacionCamelCase}`;
        
        container.innerHTML = `
            <div class="organizacion-info alert alert-info mt-3 mb-0">
                <div class="d-flex align-items-center">
                    <i class="fas fa-building me-3 fs-4"></i>
                    <div>
                        <h6 class="mb-1">
                            Organización: <strong>${this.usuarioActual.organizacion}</strong>
                        </h6>
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-user-shield me-1"></i>
                            Administrador: ${this.usuarioActual.nombreCompleto}
                            ${this.usuarioActual.correo ? `(${this.usuarioActual.correo})` : ''}
                        </p>
                        <div class="coleccion-badge mt-1">
                            <i class="fas fa-database me-1"></i>
                            ${coleccion}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Actualizar también el código en la tarjeta de información
        const coleccionDisplay = document.getElementById('coleccionDisplay');
        if (coleccionDisplay) {
            coleccionDisplay.textContent = coleccion;
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    
    _configurarEventos() {
        console.log('🎮 Configurando eventos...');
        
        try {
            // Botón Volver
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
                console.log('✅ Evento btnVolverLista');
            }
            
            // Botón Cancelar
            const btnCancel = document.getElementById('btnCancel');
            if (btnCancel) {
                btnCancel.addEventListener('click', () => this._cancelarCreacion());
                console.log('✅ Evento btnCancel');
            }
            
            // Formulario Submit
            const form = document.getElementById('crearCategoriaForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
                console.log('✅ Evento form submit');
            }
            
            // Color Preview
            const colorPreviewCard = document.getElementById('colorPreviewCard');
            const colorPickerNative = document.getElementById('colorPickerNative');
            
            if (colorPreviewCard && colorPickerNative) {
                colorPreviewCard.addEventListener('click', () => {
                    colorPickerNative.click();
                });
                
                colorPickerNative.addEventListener('input', (e) => {
                    const color = e.target.value;
                    document.getElementById('colorDisplay').style.backgroundColor = color;
                    document.getElementById('colorHex').textContent = color;
                });
                
                console.log('✅ Eventos de color');
            }
            
            // Contador de caracteres
            const descripcionInput = document.getElementById('descripcionCategoria');
            if (descripcionInput) {
                descripcionInput.addEventListener('input', () => this._actualizarContadorCaracteres());
                console.log('✅ Evento contador caracteres');
            }
            
            console.log('✅ Todos los eventos configurados');
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }

    _inicializarValidaciones() {
        console.log('📋 Inicializando validaciones...');
        this._actualizarContadorCaracteres();
    }

    _actualizarContadorCaracteres() {
        const descripcion = document.getElementById('descripcionCategoria');
        const contador = document.getElementById('contadorCaracteres');
        
        if (descripcion && contador) {
            const longitud = descripcion.value.length;
            contador.textContent = longitud;
            
            if (longitud > 500) {
                contador.style.color = '#ff4d4d';
            } else if (longitud > 400) {
                contador.style.color = '#ffcc00';
            } else {
                contador.style.color = '#00ff95';
            }
        }
    }

    // ========== GESTIÓN DE SUBCATEGORÍAS ==========
    
    _inicializarGestionSubcategorias() {
        console.log('📂 Inicializando gestión de subcategorías...');
        
        const btnAgregar = document.getElementById('btnAgregarSubcategoria');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', () => this._agregarSubcategoria());
            console.log('✅ Evento btnAgregarSubcategoria');
        }
        
        // No agregar subcategorías por defecto
    }

    _agregarSubcategoria() {
        console.log('➕ Agregando subcategoría...');
        
        const subcatId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        this.subcategorias.push({
            id: subcatId,
            nombre: '',
            descripcion: ''
        });
        
        this._renderizarSubcategorias();
        this._actualizarContadorSubcategorias();
        
        // Enfocar en el nombre
        setTimeout(() => {
            const input = document.getElementById(`subcat_nombre_${subcatId}`);
            if (input) input.focus();
        }, 100);
    }

    _eliminarSubcategoria(subcatId) {
        console.log('🗑️ Eliminando subcategoría:', subcatId);
        
        Swal.fire({
            title: '¿Eliminar subcategoría?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#0a0a0a',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                this.subcategorias = this.subcategorias.filter(s => s.id !== subcatId);
                this._renderizarSubcategorias();
                this._actualizarContadorSubcategorias();
                this._mostrarNotificacion('Subcategoría eliminada', 'success');
            }
        });
    }

    _actualizarSubcategoria(subcatId, campo, valor) {
        const subcategoria = this.subcategorias.find(s => s.id === subcatId);
        if (subcategoria) {
            subcategoria[campo] = valor;
        }
    }

    _renderizarSubcategorias() {
        const container = document.getElementById('subcategoriasList');
        if (!container) return;
        
        if (this.subcategorias.length === 0) {
            container.innerHTML = `
                <div class="subcategorias-empty" id="subcategoriasEmpty">
                    <i class="fas fa-sitemap mb-2"></i>
                    <p>No hay subcategorías agregadas</p>
                    <small class="text-muted">
                        Las subcategorías heredarán automáticamente el color de la categoría principal
                    </small>
                </div>
            `;
            return;
        }
        
        let html = '';
        const color = document.getElementById('colorPickerNative')?.value || '#2f8cff';
        
        this.subcategorias.forEach((subcat, index) => {
            html += `
                <div class="subcategoria-item" id="subcategoria_${subcat.id}" style="border-left-color: ${color};">
                    <div class="subcategoria-header">
                        <h6 class="subcategoria-titulo">
                            <i class="fas fa-sitemap me-2"></i>
                            Subcategoría #${index + 1}
                            <span class="color-badge" style="background: ${color};"></span>
                        </h6>
                        <button type="button" class="btn btn-eliminar-subcategoria" 
                                onclick="window.crearCategoriaDebug.controller._eliminarSubcategoria('${subcat.id}')">
                            <i class="fas fa-trash-alt me-1"></i>
                            Eliminar
                        </button>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label small">Nombre *</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-tag"></i></span>
                                <input type="text" class="form-control" 
                                       id="subcat_nombre_${subcat.id}"
                                       value="${this._escapeHTML(subcat.nombre)}"
                                       placeholder="Ej: Procesadores, Ventas, Redes"
                                       onchange="window.crearCategoriaDebug.controller._actualizarSubcategoria('${subcat.id}', 'nombre', this.value)">
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label small">Descripción</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-align-left"></i></span>
                                <input type="text" class="form-control" 
                                       id="subcat_descripcion_${subcat.id}"
                                       value="${this._escapeHTML(subcat.descripcion)}"
                                       placeholder="Descripción opcional"
                                       onchange="window.crearCategoriaDebug.controller._actualizarSubcategoria('${subcat.id}', 'descripcion', this.value)">
                            </div>
                        </div>
                    </div>
                    <div class="subcategoria-color-info">
                        <i class="fas fa-palette me-1"></i>
                        Hereda color: <span style="color: ${color};">${color}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    _actualizarContadorSubcategorias() {
        const counter = document.getElementById('subcategoriasCounter');
        if (counter) {
            const cantidad = this.subcategorias.length;
            counter.textContent = cantidad;
            counter.className = `badge ${cantidad > 0 ? 'bg-primary' : 'bg-secondary'} ms-2`;
        }
    }

    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ========== VALIDACIÓN Y GUARDADO ==========
    
    _validarYGuardar() {
        console.log('✅ Validando formulario...');
        
        // Validar nombre
        const nombreInput = document.getElementById('nombreCategoria');
        const nombre = nombreInput.value.trim();
        
        if (!nombre) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError('El nombre de la categoría es obligatorio');
            return;
        }
        
        if (nombre.length < 3) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError('El nombre debe tener al menos 3 caracteres');
            return;
        }
        
        nombreInput.classList.remove('is-invalid');
        
        // Obtener datos
        const datos = this._obtenerDatosFormulario();
        
        // Validar que al menos haya una subcategoría si se agregaron
        if (this.subcategorias.length > 0) {
            const subcategoriasValidas = this.subcategorias.filter(s => s.nombre && s.nombre.trim() !== '');
            if (subcategoriasValidas.length === 0) {
                this._mostrarError('Las subcategorías agregadas deben tener nombre');
                return;
            }
        }
        
        console.log('📋 Datos a guardar:', datos);
        
        // Guardar
        this._guardarCategoria(datos);
    }

    _obtenerDatosFormulario() {
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const descripcion = document.getElementById('descripcionCategoria').value.trim();
        const color = document.getElementById('colorPickerNative')?.value || '#2f8cff';
        
        // Procesar subcategorías - SOLO las que tienen nombre
        const subcategoriasValidas = {};
        this.subcategorias.forEach(subcat => {
            if (subcat.nombre && subcat.nombre.trim() !== '') {
                const subcatId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
                subcategoriasValidas[subcatId] = {
                    id: subcatId,
                    nombre: subcat.nombre.trim(),
                    descripcion: subcat.descripcion?.trim() || '',
                    fechaCreacion: new Date().toISOString(),
                    fechaActualizacion: new Date().toISOString(),
                    heredaColor: true,
                    color: null
                };
            }
        });
        
        return {
            nombre: nombre,
            descripcion: descripcion,
            color: color,
            estado: 'activa',
            subcategorias: subcategoriasValidas,
            empresaId: this.usuarioActual.organizacionCamelCase,
            empresaNombre: this.usuarioActual.organizacion
        };
    }

    async _guardarCategoria(datos) {
        console.log('💾 Guardando categoría...');
        
        const btnSave = document.getElementById('btnSave');
        const originalHTML = btnSave.innerHTML;
        
        try {
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
            btnSave.disabled = true;
            
            // Verificar si ya existe
            const existe = await this.categoriaManager.verificarCategoriaExistente(
                datos.nombre,
                datos.empresaId
            );
            
            if (existe) {
                this._mostrarError(`Ya existe una categoría con el nombre "${datos.nombre}"`);
                return;
            }
            
            // Crear categoría
            const nuevaCategoria = await this.categoriaManager.crearCategoria(datos);
            
            console.log('✅✅✅ CATEGORÍA CREADA:', nuevaCategoria);
            
            this.categoriaCreadaReciente = nuevaCategoria;
            
            // Mostrar éxito
            await Swal.fire({
                title: '¡Categoría creada!',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 64px; color: #10b981; margin-bottom: 20px;"></i>
                        <h5 style="color: #fff; margin-bottom: 10px;">${datos.nombre}</h5>
                        <div style="display: flex; align-items: center; justify-content: center; margin: 15px 0;">
                            <div style="width: 30px; height: 30px; background: ${datos.color}; border-radius: 8px; margin-right: 10px;"></div>
                            <span style="font-family: monospace; color: #d1d5db;">${datos.color}</span>
                        </div>
                        <p style="color: #d1d5db; margin-bottom: 5px;">
                            <strong>ID:</strong> ${nuevaCategoria.id.substring(0, 20)}...
                        </p>
                        <p style="color: #10b981; margin-top: 15px;">
                            <i class="fas fa-database me-1"></i>
                            categorias_${datos.empresaId}
                        </p>
                        <p style="color: #d1d5db; margin-top: 10px;">
                            <i class="fas fa-sitemap me-1"></i>
                            ${nuevaCategoria.getCantidadSubcategorias()} subcategorías
                        </p>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Ver categorías',
                confirmButtonColor: '#2f8cff',
                background: '#0a0a0a',
                color: '#fff'
            }).then(() => {
                this._volverALista();
            });
            
        } catch (error) {
            console.error('❌ Error guardando categoría:', error);
            this._mostrarError(error.message || 'No se pudo crear la categoría');
        } finally {
            btnSave.innerHTML = originalHTML;
            btnSave.disabled = false;
        }
    }

    // ========== NAVEGACIÓN ==========
    
    _volverALista() {
        console.log('⬅️ Volviendo a lista de categorías...');
        window.location.href = '/users/admin/categorias/categorias.html';
    }

    _cancelarCreacion() {
        console.log('❌ Cancelando creación...');
        
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            background: '#0a0a0a',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                this._volverALista();
            }
        });
    }

    _redirigirAlLogin() {
        Swal.fire({
            icon: 'error',
            title: 'Sesión no válida',
            text: 'Debes iniciar sesión para continuar',
            confirmButtonText: 'Ir al login',
            confirmButtonColor: '#2f8cff',
            background: '#0a0a0a',
            color: '#fff'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }

    // ========== UTILIDADES ==========
    
    _mostrarError(mensaje) {
        this._mostrarNotificacion(mensaje, 'danger');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        if (this.notificacionActual) {
            this.notificacionActual.remove();
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        alert.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            background: ${tipo === 'danger' ? '#ff4d4d20' : tipo === 'success' ? '#00ff9520' : '#2f8cff20'};
            backdrop-filter: blur(10px);
            color: #fff;
        `;
        
        const iconos = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        alert.innerHTML = `
            <div style="display: flex; align-items: center;">
                <i class="fas ${iconos[tipo] || 'fa-info-circle'} me-2" style="font-size: 18px;"></i>
                <div style="flex: 1;">${mensaje}</div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert" aria-label="Cerrar" style="filter: invert(1);"></button>
            </div>
        `;
        
        document.body.appendChild(alert);
        this.notificacionActual = alert;
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }
        }, duracion);
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando crearCategorias...');
    window.crearCategoriaDebug.controller = new CrearCategoriaController();
});