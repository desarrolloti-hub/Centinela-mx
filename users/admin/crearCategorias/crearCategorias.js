// crearCategorias.js - VERSIÓN FINAL
// SIN empresaId/estado, con herencia de color configurable
// MODIFICADO: integración de info de organización en el header
// CORREGIDO: eliminado ícono duplicado en SweetAlert de éxito y simplificado el mensaje

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
        this.categoriaManager = null;
        this.usuarioActual = null;
        this.categoriaEnProceso = null;
        this.categoriaCreadaReciente = null;
        this.loadingOverlay = null;
        this.notificacionActual = null;

        // Array para almacenar subcategorías
        this.subcategorias = [];

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========

    async _init() {
        try {
            // 1. Cargar usuario
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

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

            // 7. Actualizar UI con información de la organización (en el header)
            this._actualizarInfoOrganizacion();

            window.crearCategoriaDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========

    async _cargarCategoriaManager() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            this.categoriaManager = new CategoriaManager();
        } catch (error) {
            console.error('Error cargando CategoriaManager:', error);
            throw error;
        }
    }

    // ========== CARGA DE USUARIO ==========

    _cargarUsuario() {
        try {
            // PRIMERO: Intentar adminInfo (para administradores)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);

                this.usuarioActual = {
                    id: adminData.id || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || ''
                };
                return;
            }

            // SEGUNDO: Intentar userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {

                this.usuarioActual = {
                    id: userData.uid || userData.id || `user_${Date.now()}`,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || ''
                };
                return;
            }

            // TERCERO: Datos por defecto (para desarrollo)
            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'pollos Ray',
                organizacionCamelCase: 'pollosRay',
                correo: 'admin@centinela.com'
            };

        } catch (error) {
            console.error('Error cargando usuario:', error);
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
        const orgCamelCaseInput = document.getElementById('organizacionCamelCase');
        const orgNombreInput = document.getElementById('organizacionNombre');

        if (orgCamelCaseInput) {
            orgCamelCaseInput.value = this.usuarioActual.organizacionCamelCase;
        }

        if (orgNombreInput) {
            orgNombreInput.value = this.usuarioActual.organizacion;
        }
    }

    // NUEVA VERSIÓN: inserta la info dentro del header-description
    _actualizarInfoOrganizacion() {
        const container = document.getElementById('organizacionInfo');
        if (!container) return;

        const coleccion = `categorias_${this.usuarioActual.organizacionCamelCase}`;

        container.innerHTML = `
            <div class="info-item">
                <i class="fas fa-building"></i>
                <span><strong>Organización:</strong> ${this.usuarioActual.organizacion}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-user-shield"></i>
                <span><strong>Administrador:</strong> ${this.usuarioActual.nombreCompleto} (${this.usuarioActual.correo})</span>
            </div>
            <div class="info-item">
                <i class="fas fa-database"></i>
                <span class="coleccion-badge">
                    <i class="fas fa-tag"></i> ${coleccion}
                </span>
            </div>
        `;
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    _configurarEventos() {
        try {
            // Botón Volver
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            const btnCancel = document.getElementById('btnCancel');
            if (btnCancel) {
                btnCancel.addEventListener('click', () => this._cancelarCreacion());
            }

            // Formulario Submit
            const form = document.getElementById('crearCategoriaForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
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

                    // Actualizar previsualización de colores en subcategorías
                    this._renderizarSubcategorias();
                });
            }

            // Contador de caracteres
            const descripcionInput = document.getElementById('descripcionCategoria');
            if (descripcionInput) {
                descripcionInput.addEventListener('input', () => this._actualizarContadorCaracteres());
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _inicializarValidaciones() {
        this._actualizarContadorCaracteres();
    }

    _actualizarContadorCaracteres() {
        const descripcion = document.getElementById('descripcionCategoria');
        const contador = document.getElementById('contadorCaracteres');

        if (descripcion && contador) {
            const longitud = descripcion.value.length;
            contador.textContent = longitud;

            if (longitud > 500) {
                contador.style.color = 'var(--color-danger)';
            } else if (longitud > 400) {
                contador.style.color = 'var(--color-warning)';
            } else {
                contador.style.color = 'var(--color-success)';
            }
        }
    }

    // ========== GESTIÓN DE SUBCATEGORÍAS ==========

    _inicializarGestionSubcategorias() {
        const btnAgregar = document.getElementById('btnAgregarSubcategoria');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', () => this._agregarSubcategoria());
        }
    }

    _agregarSubcategoria() {
        const subcatId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        this.subcategorias.push({
            id: subcatId,
            nombre: '',
            descripcion: '',
            heredaColor: true,
            colorPersonalizado: '#ff5733'
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
        Swal.fire({
            title: '¿Eliminar subcategoría?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
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

    _cambiarHerenciaColor(subcatId, heredaColor) {
        const subcategoria = this.subcategorias.find(s => s.id === subcatId);
        if (subcategoria) {
            subcategoria.heredaColor = heredaColor;
            this._renderizarSubcategorias();
        }
    }

    _actualizarColorPersonalizado(subcatId, color) {
        const subcategoria = this.subcategorias.find(s => s.id === subcatId);
        if (subcategoria) {
            subcategoria.colorPersonalizado = color;
        }
    }

    _renderizarSubcategorias() {
        const container = document.getElementById('subcategoriasList');
        if (!container) return;

        if (this.subcategorias.length === 0) {
            container.innerHTML = `
                <div class="subcategorias-empty">
                    <i class="fas fa-sitemap"></i>
                    <p>No hay subcategorías agregadas</p>
                    <small>
                        Las subcategorías heredarán automáticamente el color de la categoría principal
                    </small>
                </div>
            `;
            return;
        }

        let html = '';
        const colorCategoria = document.getElementById('colorPickerNative')?.value || '#2f8cff';

        this.subcategorias.forEach((subcat, index) => {
            const colorEfectivo = subcat.heredaColor ? colorCategoria : (subcat.colorPersonalizado || '#ff5733');

            html += `
                <div class="subcategoria-item" id="subcategoria_${subcat.id}" style="border-left-color: ${colorEfectivo};">
                    <div class="subcategoria-header">
                        <h6 class="subcategoria-titulo">
                            <i class="fas fa-sitemap"></i>
                            Subcategoría #${index + 1}
                            <span class="color-badge" style="background: ${colorEfectivo};"></span>
                        </h6>
                        <button type="button" class="btn-eliminar-subcategoria" 
                                onclick="window.crearCategoriaDebug.controller._eliminarSubcategoria('${subcat.id}')">
                            <i class="fas fa-trash-alt"></i>
                            Eliminar
                        </button>
                    </div>
                    
                    <div class="subcategoria-grid">
                        <div class="subcategoria-campo">
                            <label class="subcategoria-label">
                                <i class="fas fa-tag"></i>
                                Nombre *
                            </label>
                            <input type="text" class="subcategoria-input" 
                                   id="subcat_nombre_${subcat.id}"
                                   value="${this._escapeHTML(subcat.nombre)}"
                                   placeholder="Ej: Procesadores, Ventas, Redes"
                                   onchange="window.crearCategoriaDebug.controller._actualizarSubcategoria('${subcat.id}', 'nombre', this.value)">
                        </div>
                        <div class="subcategoria-campo">
                            <label class="subcategoria-label">
                                <i class="fas fa-align-left"></i>
                                Descripción
                            </label>
                            <input type="text" class="subcategoria-input" 
                                   id="subcat_descripcion_${subcat.id}"
                                   value="${this._escapeHTML(subcat.descripcion)}"
                                   placeholder="Descripción opcional"
                                   onchange="window.crearCategoriaDebug.controller._actualizarSubcategoria('${subcat.id}', 'descripcion', this.value)">
                        </div>
                    </div>
                    
                    <div class="subcategoria-color-control">
                        <div class="herencia-color">
                            <label class="herencia-checkbox">
                                <input type="checkbox" 
                                       ${subcat.heredaColor ? 'checked' : ''}
                                       onchange="window.crearCategoriaDebug.controller._cambiarHerenciaColor('${subcat.id}', this.checked)">
                                <span>Heredar color de categoría</span>
                            </label>
                        </div>
                        
                        <div class="color-personalizado" style="${subcat.heredaColor ? 'opacity: 0.5; pointer-events: none;' : ''}">
                            <span class="color-personalizado-label">
                                <i class="fas fa-palette"></i>
                                Color:
                            </span>
                            <input type="color" class="color-personalizado-input" 
                                   id="subcat_color_${subcat.id}"
                                   value="${subcat.colorPersonalizado || '#ff5733'}"
                                   ${subcat.heredaColor ? 'disabled' : ''}
                                   onchange="window.crearCategoriaDebug.controller._actualizarColorPersonalizado('${subcat.id}', this.value);
                                            window.crearCategoriaDebug.controller._renderizarSubcategorias();">
                        </div>
                        
                        <div class="color-actual">
                            <span>Color efectivo:</span>
                            <span class="color-muestra" style="background: ${colorEfectivo};"></span>
                            <span style="font-family: monospace;">${colorEfectivo}</span>
                        </div>
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

        // Validar subcategorías
        const subcategoriasValidas = this.subcategorias.filter(s => s.nombre && s.nombre.trim() !== '');
        if (this.subcategorias.length > 0 && subcategoriasValidas.length === 0) {
            this._mostrarError('Las subcategorías agregadas deben tener nombre');
            return;
        }

        // Obtener datos
        const datos = this._obtenerDatosFormulario(subcategoriasValidas);

        // Guardar
        this._guardarCategoria(datos);
    }

    _obtenerDatosFormulario(subcategoriasValidas) {
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const descripcion = document.getElementById('descripcionCategoria').value.trim();
        const color = document.getElementById('colorPickerNative')?.value || '#2f8cff';

        // Procesar subcategorías - SOLO IDs TEMPORALES
        const subcategorias = {};

        subcategoriasValidas.forEach(subcat => {
            const tempId = subcat.id;
            subcategorias[tempId] = {
                id: tempId, // Temporal, se mantiene para referencia
                nombre: subcat.nombre.trim(),
                descripcion: subcat.descripcion?.trim() || '',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                heredaColor: subcat.heredaColor !== undefined ? subcat.heredaColor : true,
                color: !subcat.heredaColor ? (subcat.colorPersonalizado || null) : null
            };
        });

        return {
            nombre: nombre,
            descripcion: descripcion,
            color: color,
            subcategorias: subcategorias,
            organizacionCamelCase: this.usuarioActual.organizacionCamelCase,
            organizacionNombre: this.usuarioActual.organizacion
        };
    }

    async _guardarCategoria(datos) {
        const btnSave = document.getElementById('btnSave');
        const originalHTML = btnSave.innerHTML;

        try {
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btnSave.disabled = true;

            // Verificar si ya existe
            const existe = await this.categoriaManager.verificarCategoriaExistente(
                datos.nombre,
                this.usuarioActual.organizacionCamelCase
            );

            if (existe) {
                this._mostrarError(`Ya existe una categoría con el nombre "${datos.nombre}"`);
                return;
            }

            // Crear categoría
            const nuevaCategoria = await this.categoriaManager.crearCategoria(datos);

            this.categoriaCreadaReciente = nuevaCategoria;

            // Mostrar éxito simplificado (sin detalles)
            await Swal.fire({
                icon: 'success',
                title: '¡Categoría creada!',
                text: 'La categoría se ha guardado correctamente.',
                confirmButtonText: 'Ver categorías'
            }).then(() => {
                this._volverALista();
            });

        } catch (error) {
            console.error('Error guardando categoría:', error);
            this._mostrarError(error.message || 'No se pudo crear la categoría');
        } finally {
            btnSave.innerHTML = originalHTML;
            btnSave.disabled = false;
        }
    }

    // ========== NAVEGACIÓN ==========

    _volverALista() {
        window.location.href = '/users/admin/categorias/categorias.html';
    }

    _cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar',
            confirmButtonColor: '#d33'
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
            confirmButtonText: 'Ir al login'
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

        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;

        const iconos = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        notificacion.innerHTML = `
            <i class="fas ${iconos[tipo] || 'fa-info-circle'}"></i>
            <div style="flex: 1;">${mensaje}</div>
            <button style="background: none; border: none; color: inherit; cursor: pointer; padding: 0 5px;" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notificacion);
        this.notificacionActual = notificacion;

        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.remove();
            }
        }, duracion);
    }

    _mostrarCargando(mensaje = 'Guardando...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${mensaje}</div>
        `;

        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }

    _ocultarCargando() {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    window.crearCategoriaDebug.controller = new CrearCategoriaController();
});