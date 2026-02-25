// crearIncidencias.js - BASADO EN crearCategorias.js
// Para crear nuevas incidencias con seguimiento inicial

// Variable global para debugging
window.crearIncidenciaDebug = {
    estado: 'iniciando',
    controller: null
};

// LÍMITES DE CARACTERES
const LIMITES = {
    DETALLES_INCIDENCIA: 1000,
    SEGUIMIENTO_INICIAL: 500
};

// =============================================
// CLASE PRINCIPAL - CrearIncidenciaController
// =============================================
class CrearIncidenciaController {
    constructor() {
        this.incidenciaClass = null;
        this.usuarioActual = null;
        this.sucursales = [];
        this.categorias = [];
        this.subcategoriasCache = {};
        this.categoriaSeleccionada = null;
        this.loadingOverlay = null;

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

            // 2. Cargar Incidencia class
            await this._cargarIncidenciaClass();

            // 3. Cargar datos relacionados (sucursales, categorías)
            await this._cargarDatosRelacionados();

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Inicializar validaciones
            this._inicializarValidaciones();

            // 6. Actualizar info del usuario
            this._actualizarInfoUsuario();

            window.crearIncidenciaDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========

    async _cargarIncidenciaClass() {
        try {
            const { Incidencia } = await import('/clases/incidencia.js');
            this.incidenciaClass = Incidencia;
        } catch (error) {
            console.error('Error cargando Incidencia:', error);
            throw error;
        }
    }

    async _cargarDatosRelacionados() {
        try {
            // Cargar sucursales
            await this._cargarSucursales();
            
            // Cargar categorías
            await this._cargarCategorias();
            
        } catch (error) {
            console.error('Error cargando datos relacionados:', error);
            throw error;
        }
    }

    async _cargarSucursales() {
        try {
            const { SucursalManager } = await import('/clases/sucursal.js');
            const sucursalManager = new SucursalManager();
            
            this.sucursales = await sucursalManager.getSucursalesByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            const selectSucursal = document.getElementById('sucursalIncidencia');
            if (selectSucursal) {
                if (this.sucursales.length === 0) {
                    selectSucursal.innerHTML = '<option value="">-- No hay sucursales disponibles --</option>';
                } else {
                    selectSucursal.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
                    this.sucursales.forEach(suc => {
                        const option = document.createElement('option');
                        option.value = suc.id;
                        option.textContent = suc.nombre;
                        selectSucursal.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando sucursales:', error);
            const selectSucursal = document.getElementById('sucursalIncidencia');
            if (selectSucursal) {
                selectSucursal.innerHTML = '<option value="">-- Error cargando sucursales --</option>';
            }
            throw error;
        }
    }

    async _cargarCategorias() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            const categoriaManager = new CategoriaManager();
            
            this.categorias = await categoriaManager.obtenerTodasCategorias();

            const selectCategoria = document.getElementById('categoriaIncidencia');
            if (selectCategoria) {
                if (this.categorias.length === 0) {
                    selectCategoria.innerHTML = '<option value="">-- No hay categorías disponibles --</option>';
                } else {
                    selectCategoria.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
                    this.categorias.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.nombre;
                        selectCategoria.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
            const selectCategoria = document.getElementById('categoriaIncidencia');
            if (selectCategoria) {
                selectCategoria.innerHTML = '<option value="">-- Error cargando categorías --</option>';
            }
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
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
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

    _actualizarInfoUsuario() {
        const usuarioInfo = document.getElementById('usuarioRegistroInfo');
        if (usuarioInfo) {
            usuarioInfo.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <strong>${this.usuarioActual.nombreCompleto}</strong> (${this.usuarioActual.correo || 'Sin email'})
                <span style="margin-left: 10px; opacity: 0.7;">| Organización: ${this.usuarioActual.organizacion}</span>
            `;
        }
    }

    // ========== APLICAR LÍMITES DE CARACTERES ==========

    _inicializarValidaciones() {
        // Campo detalles incidencia
        const detallesInput = document.getElementById('detallesIncidencia');
        if (detallesInput) {
            detallesInput.maxLength = LIMITES.DETALLES_INCIDENCIA;
            detallesInput.addEventListener('input', () => {
                this._validarLongitudCampo(
                    detallesInput, 
                    LIMITES.DETALLES_INCIDENCIA, 
                    'Los detalles'
                );
                this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
            });
        }

        // Campo seguimiento inicial
        const seguimientoInput = document.getElementById('seguimientoInicial');
        if (seguimientoInput) {
            seguimientoInput.maxLength = LIMITES.SEGUIMIENTO_INICIAL;
            seguimientoInput.addEventListener('input', () => {
                this._validarLongitudCampo(
                    seguimientoInput, 
                    LIMITES.SEGUIMIENTO_INICIAL, 
                    'El seguimiento'
                );
                this._actualizarContador('seguimientoInicial', 'contadorSeguimiento', LIMITES.SEGUIMIENTO_INICIAL);
            });
        }

        // Inicializar contadores
        this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
        this._actualizarContador('seguimientoInicial', 'contadorSeguimiento', LIMITES.SEGUIMIENTO_INICIAL);
    }

    _actualizarContador(inputId, counterId, limite) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        
        if (input && counter) {
            const longitud = input.value.length;
            counter.textContent = `${longitud}/${limite}`;

            // Cambiar color si se acerca al límite
            if (longitud > limite * 0.9) {
                counter.style.color = 'var(--color-warning)';
            } else if (longitud > limite * 0.95) {
                counter.style.color = 'var(--color-danger)';
            } else {
                counter.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    _validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this._mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    _configurarEventos() {
        try {
            // Botón Volver a la lista
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            const btnCancelar = document.getElementById('btnCancelar');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Botón Crear Incidencia
            const btnCrear = document.getElementById('btnCrearIncidencia');
            if (btnCrear) {
                btnCrear.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('formIncidenciaPrincipal');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Evento cambio de categoría (para cargar subcategorías)
            const selectCategoria = document.getElementById('categoriaIncidencia');
            if (selectCategoria) {
                selectCategoria.addEventListener('change', (e) => this._cargarSubcategorias(e.target.value));
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    async _cargarSubcategorias(categoriaId) {
        const selectSubcategoria = document.getElementById('subcategoriaIncidencia');
        if (!selectSubcategoria) return;

        if (!categoriaId) {
            selectSubcategoria.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            selectSubcategoria.disabled = true;
            return;
        }

        const categoria = this.categorias.find(c => c.id === categoriaId);
        if (!categoria) return;

        this.categoriaSeleccionada = categoria;

        try {
            let subcategoriasArray = [];

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

            if (subcategoriasArray.length === 0) {
                selectSubcategoria.innerHTML = '<option value="">-- No hay subcategorías disponibles --</option>';
                selectSubcategoria.disabled = true;
                return;
            }

            selectSubcategoria.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            subcategoriasArray.forEach(sub => {
                if (sub.nombre) {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nombre;
                    selectSubcategoria.appendChild(option);
                }
            });
            selectSubcategoria.disabled = false;

        } catch (error) {
            console.error('Error cargando subcategorías:', error);
            selectSubcategoria.innerHTML = '<option value="">-- Error cargando subcategorías --</option>';
            selectSubcategoria.disabled = true;
        }
    }

    // ========== VALIDACIÓN Y GUARDADO ==========

    _validarYGuardar() {
        // Validar sucursal
        const sucursalSelect = document.getElementById('sucursalIncidencia');
        const sucursalId = sucursalSelect.value;
        if (!sucursalId) {
            sucursalSelect.classList.add('is-invalid');
            this._mostrarError('Debe seleccionar una sucursal');
            return;
        }
        sucursalSelect.classList.remove('is-invalid');

        // Validar categoría
        const categoriaSelect = document.getElementById('categoriaIncidencia');
        const categoriaId = categoriaSelect.value;
        if (!categoriaId) {
            categoriaSelect.classList.add('is-invalid');
            this._mostrarError('Debe seleccionar una categoría');
            return;
        }
        categoriaSelect.classList.remove('is-invalid');

        // Validar nivel de riesgo
        const riesgoSelect = document.getElementById('nivelRiesgo');
        const nivelRiesgo = riesgoSelect.value;
        if (!nivelRiesgo) {
            riesgoSelect.classList.add('is-invalid');
            this._mostrarError('Debe seleccionar el nivel de riesgo');
            return;
        }
        riesgoSelect.classList.remove('is-invalid');

        // Validar detalles
        const detallesInput = document.getElementById('detallesIncidencia');
        const detalles = detallesInput.value.trim();
        if (!detalles) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción de la incidencia es obligatoria');
            return;
        }
        if (detalles.length < 10) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción debe tener al menos 10 caracteres');
            return;
        }
        if (detalles.length > LIMITES.DETALLES_INCIDENCIA) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError(`La descripción no puede exceder ${LIMITES.DETALLES_INCIDENCIA} caracteres`);
            return;
        }
        detallesInput.classList.remove('is-invalid');

        // Validar seguimiento inicial si existe
        const seguimientoInput = document.getElementById('seguimientoInicial');
        const seguimiento = seguimientoInput.value.trim();
        if (seguimiento.length > LIMITES.SEGUIMIENTO_INICIAL) {
            seguimientoInput.classList.add('is-invalid');
            this._mostrarError(`El seguimiento no puede exceder ${LIMITES.SEGUIMIENTO_INICIAL} caracteres`);
            return;
        }
        seguimientoInput.classList.remove('is-invalid');

        // Obtener subcategoría
        const subcategoriaSelect = document.getElementById('subcategoriaIncidencia');
        const subcategoriaId = subcategoriaSelect.value;

        // Confirmar antes de guardar
        this._confirmarYGuardar({
            sucursalId,
            categoriaId,
            subcategoriaId: subcategoriaId || '',
            nivelRiesgo,
            detalles,
            seguimientoInicial: seguimiento || null
        });
    }

    async _confirmarYGuardar(datos) {
        // Obtener nombres para mostrar en confirmación
        const sucursal = this.sucursales.find(s => s.id === datos.sucursalId);
        const categoria = this.categorias.find(c => c.id === datos.categoriaId);
        
        let subcategoriaNombre = 'No especificada';
        if (datos.subcategoriaId && this.categoriaSeleccionada?.subcategorias) {
            if (this.categoriaSeleccionada.subcategorias.get) {
                const sub = this.categoriaSeleccionada.subcategorias.get(datos.subcategoriaId);
                if (sub) subcategoriaNombre = sub.nombre || datos.subcategoriaId;
            } else {
                const sub = this.categoriaSeleccionada.subcategorias[datos.subcategoriaId];
                if (sub) subcategoriaNombre = sub.nombre || datos.subcategoriaId;
            }
        }

        const riesgoTexto = {
            'bajo': 'Bajo',
            'medio': 'Medio',
            'alto': 'Alto',
            'critico': 'Crítico'
        }[datos.nivelRiesgo] || datos.nivelRiesgo;

        const confirmResult = await Swal.fire({
            title: '¿Crear incidencia?',
            html: `
                <div style="text-align: left; max-height: 400px; overflow-y: auto;">
                    <p><strong>Sucursal:</strong> ${sucursal?.nombre || 'No especificada'}</p>
                    <p><strong>Categoría:</strong> ${categoria?.nombre || 'No especificada'}</p>
                    <p><strong>Subcategoría:</strong> ${subcategoriaNombre}</p>
                    <p><strong>Nivel de Riesgo:</strong> 
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; 
                            background: ${this._getRiesgoColor(datos.nivelRiesgo)}20; 
                            color: ${this._getRiesgoColor(datos.nivelRiesgo)};">
                            ${riesgoTexto}
                        </span>
                    </p>
                    <p><strong>Descripción:</strong><br>
                        <span style="color: var(--color-text-secondary);">${this._escapeHTML(datos.detalles.substring(0, 200))}${datos.detalles.length > 200 ? '...' : ''}</span>
                    </p>
                    ${datos.seguimientoInicial ? `
                        <p><strong>Seguimiento inicial:</strong><br>
                            <span style="color: var(--color-text-secondary);">${this._escapeHTML(datos.seguimientoInicial.substring(0, 150))}${datos.seguimientoInicial.length > 150 ? '...' : ''}</span>
                        </p>
                    ` : ''}
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'CREAR INCIDENCIA',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#28a745',
            reverseButtons: false
        });

        if (confirmResult.isConfirmed) {
            await this._guardarIncidencia(datos);
        }
    }

    _getRiesgoColor(nivel) {
        const colores = {
            'bajo': '#28a745',
            'medio': '#ffc107',
            'alto': '#fd7e14',
            'critico': '#dc3545'
        };
        return colores[nivel] || '#28a745';
    }

    async _guardarIncidencia(datos) {
        const btnCrear = document.getElementById('btnCrearIncidencia');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check me-2"></i>Crear Incidencia';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
                btnCrear.disabled = true;
            }

            // Preparar datos para la incidencia
            const incidenciaData = {
                sucursalId: datos.sucursalId,
                categoriaId: datos.categoriaId,
                subcategoriaId: datos.subcategoriaId || '',
                nivelRiesgo: datos.nivelRiesgo,
                detalles: datos.detalles,
                imagenes: [] // Por ahora sin imágenes
            };

            // Si hay seguimiento inicial, agregarlo
            if (datos.seguimientoInicial) {
                incidenciaData.seguimientoInicial = {
                    descripcion: datos.seguimientoInicial,
                    evidencias: []
                };
            }

            // Crear la incidencia usando el método estático
            const nuevaIncidencia = await this.incidenciaClass.crear(
                incidenciaData,
                this.usuarioActual
            );

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Incidencia creada!',
                html: `
                    <p>La incidencia ha sido registrada correctamente.</p>
                    <p><strong>ID:</strong> <span style="color: var(--color-accent-primary);">${nuevaIncidencia.id}</span></p>
                `,
                confirmButtonText: 'Ver incidencias'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando incidencia:', error);
            this._mostrarError(error.message || 'No se pudo crear la incidencia');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    // ========== NAVEGACIÓN ==========

    _volverALista() {
        window.location.href = '/users/admin/incidencias/incidencias.html';
    }

    _cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar'
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
        this._mostrarNotificacion(mensaje, 'error');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' : 
                   tipo === 'error' ? 'Error' : 
                   tipo === 'warning' ? 'Advertencia' : 'Información',
            text: mensaje,
            icon: tipo,
            timer: duracion,
            timerProgressBar: true,
            showConfirmButton: false
        });
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
    window.crearIncidenciaDebug.controller = new CrearIncidenciaController();
});