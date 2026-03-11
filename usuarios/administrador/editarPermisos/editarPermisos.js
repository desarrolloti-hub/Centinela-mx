// editarPermisos.js - EDICIÓN DE PERMISOS
// MISMO ESTILO QUE CREAR PERMISOS

// =============================================
// CLASE PRINCIPAL - EditarPermisoController
// =============================================
class EditarPermisoController {
    constructor() {
        this.permisoManager = null;
        this.areaManager = null;
        this.usuarioActual = null;
        this.permisoActual = null;
        this.areas = [];
        this.permisoId = null;

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            // Obtener ID del permiso de la URL
            const urlParams = new URLSearchParams(window.location.search);
            this.permisoId = urlParams.get('id');

            if (!this.permisoId) {
                throw new Error('No se especificó el ID del permiso');
            }

            // 1. Cargar usuario desde localStorage
            const usuarioCargado = this._cargarUsuario();

            if (!usuarioCargado) {
                this._redirigirAlLogin();
                return;
            }

            // 2. Cargar managers
            await this._cargarManagers();

            // 3. Cargar áreas
            await this._cargarAreas();

            // 4. Cargar permiso
            await this._cargarPermiso();

            // 5. Configurar eventos
            this._configurarEventos();

            // 6. Configurar organización automática
            this._configurarOrganizacion();

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ========== CARGA DE USUARIO ==========
    _cargarUsuario() {
        try {
            // Intentar obtener de adminInfo (guardado por regiones.js o permisos.js)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || adminData.uid || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || adminData.correo || ''
                };
                return true;
            }

            // Intentar obtener de userData
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
                return true;
            }

            // Intentar obtener de window.userManager (si existe)
            if (window.userManager && window.userManager.currentUser) {
                const user = window.userManager.currentUser;
                this.usuarioActual = {
                    id: user.id || user.uid,
                    uid: user.uid || user.id,
                    nombreCompleto: user.nombreCompleto || 'Administrador',
                    organizacion: user.organizacion || 'Mi Organización',
                    organizacionCamelCase: user.organizacionCamelCase ||
                        this._generarCamelCase(user.organizacion),
                    correo: user.correoElectronico || user.correo || ''
                };

                // Guardar en localStorage para futuras cargas
                localStorage.setItem('adminInfo', JSON.stringify({
                    id: this.usuarioActual.id,
                    uid: this.usuarioActual.uid,
                    nombreCompleto: this.usuarioActual.nombreCompleto,
                    organizacion: this.usuarioActual.organizacion,
                    organizacionCamelCase: this.usuarioActual.organizacionCamelCase,
                    correoElectronico: this.usuarioActual.correo,
                    timestamp: new Date().toISOString()
                }));

                return true;
            }

            // Intentar obtener de selectedPermiso (desde la vista de lista)
            const selectedPermiso = localStorage.getItem('selectedPermiso');
            if (selectedPermiso) {
                const permisoData = JSON.parse(selectedPermiso);
                this.usuarioActual = {
                    id: permisoData.adminId || 'admin',
                    uid: permisoData.adminId || 'admin',
                    nombreCompleto: permisoData.admin || 'Administrador',
                    organizacion: permisoData.organizacion || 'Mi Organización',
                    organizacionCamelCase: permisoData.organizacionCamelCase ||
                        this._generarCamelCase(permisoData.organizacion),
                    correo: ''
                };
                return true;
            }

            // Si no hay nada, redirigir al login
            return false;

        } catch (error) {
            console.error('Error cargando usuario:', error);
            return false;
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

    // ========== CARGA DE DEPENDENCIAS ==========
    async _cargarManagers() {
        try {
            const { PermisoManager } = await import('/clases/permiso.js');
            const { AreaManager } = await import('/clases/area.js');

            this.permisoManager = new PermisoManager();
            this.areaManager = new AreaManager();

        } catch (error) {
            console.error('❌ Error cargando managers:', error);
            throw new Error('No se pudieron cargar los módulos necesarios. Verifica la consola.');
        }
    }

    // ========== CARGA DE ÁREAS ==========
    async _cargarAreas() {
        try {
            if (!this.usuarioActual?.organizacionCamelCase) {
                throw new Error('No hay organización definida');
            }

            this.areas = await this.areaManager.getAreasByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

        } catch (error) {
            console.error('❌ Error cargando áreas:', error);
            throw error;
        }
    }

    // ========== CARGA DE PERMISO ==========
    async _cargarPermiso() {
        try {
            // Intentar obtener de localStorage primero (desde la vista de lista)
            const selectedPermiso = localStorage.getItem('selectedPermiso');
            let permisoData = null;

            if (selectedPermiso) {
                permisoData = JSON.parse(selectedPermiso);
                if (permisoData.id === this.permisoId) {
                    this.permisoActual = permisoData;
                }
            }

            // Si no está en localStorage, cargar desde Firebase
            if (!this.permisoActual) {
                this.permisoActual = await this.permisoManager.obtenerPorId(
                    this.permisoId,
                    this.usuarioActual.organizacionCamelCase
                );

                if (!this.permisoActual) {
                    throw new Error('Permiso no encontrado');
                }
            }

            // NO mostramos el ID del permiso - Eliminamos el código que mostraba el ID
            // Simplemente cargamos los datos en el formulario

            // Cargar datos en el formulario
            this._cargarDatosFormulario();

        } catch (error) {
            console.error('Error cargando permiso:', error);
            throw error;
        }
    }

    // ========== CARGAR DATOS EN FORMULARIO ==========
    _cargarDatosFormulario() {
        if (!this.permisoActual) return;

        // Organización
        document.getElementById('organization').value = this.usuarioActual.organizacion;

        // Área
        const area = this.areas.find(a => a.id === this.permisoActual.areaId);
        document.getElementById('areaNombre').value = area?.nombreArea || this.permisoActual.areaId || 'No especificada';
        document.getElementById('areaId').value = this.permisoActual.areaId;

        // Cargo
        let cargoNombre = this.permisoActual.cargoId;
        if (area && area.cargos && this.permisoActual.cargoId) {
            cargoNombre = area.cargos[this.permisoActual.cargoId]?.nombre || this.permisoActual.cargoId;
        }
        document.getElementById('cargoNombre').value = cargoNombre || 'No especificado';
        document.getElementById('cargoId').value = this.permisoActual.cargoId;

        // Permisos
        const permisos = this.permisoActual.permisos || {};

        // Áreas
        const chkAreas = document.getElementById('permisoAreas');
        if (chkAreas) {
            chkAreas.checked = permisos.areas || false;
            this._actualizarEstiloCard(document.getElementById('permisoAreasCard'), chkAreas.checked);
        }

        // Categorías
        const chkCategorias = document.getElementById('permisoCategorias');
        if (chkCategorias) {
            chkCategorias.checked = permisos.categorias || false;
            this._actualizarEstiloCard(document.getElementById('permisoCategoriasCard'), chkCategorias.checked);
        }

        // Sucursales
        const chkSucursales = document.getElementById('permisoSucursales');
        if (chkSucursales) {
            chkSucursales.checked = permisos.sucursales || false;
            this._actualizarEstiloCard(document.getElementById('permisoSucursalesCard'), chkSucursales.checked);
        }

        // Regiones
        const chkRegiones = document.getElementById('permisoRegiones');
        if (chkRegiones) {
            chkRegiones.checked = permisos.regiones || false;
            this._actualizarEstiloCard(document.getElementById('permisoRegionesCard'), chkRegiones.checked);
        }

        // Incidencias
        const chkIncidencias = document.getElementById('permisoIncidencias');
        if (chkIncidencias) {
            chkIncidencias.checked = permisos.incidencias || false;
            this._actualizarEstiloCard(document.getElementById('permisoIncidenciasCard'), chkIncidencias.checked);
        }
    }

    // ========== CONFIGURACIÓN DE ORGANIZACIÓN ==========
    _configurarOrganizacion() {
        // Ya se configura en _cargarDatosFormulario
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
            const btnCancelar = document.getElementById('cancelBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarEdicion());
            }

            // Botón Guardar Cambios
            const btnGuardar = document.getElementById('guardarBtn');
            if (btnGuardar) {
                btnGuardar.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._guardarCambios();
                });
            }

            // Configurar eventos de checkboxes de permisos
            this._configurarCheckboxesPermisos();

            // Configurar botones de acciones rápidas
            this._configurarAccionesRapidas();

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _configurarCheckboxesPermisos() {
        const modulos = ['Areas', 'Categorias', 'Sucursales', 'Regiones', 'Incidencias'];

        modulos.forEach(modulo => {
            const checkbox = document.getElementById(`permiso${modulo}`);
            const card = document.getElementById(`permiso${modulo}Card`);

            if (checkbox && card) {
                // Evento click en la tarjeta
                card.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this._actualizarEstiloCard(card, checkbox.checked);
                    }
                });

                // Evento change en el checkbox
                checkbox.addEventListener('change', (e) => {
                    this._actualizarEstiloCard(card, e.target.checked);
                });
            }
        });
    }

    _actualizarEstiloCard(card, activo) {
        if (activo) {
            card.classList.add('activo');
        } else {
            card.classList.remove('activo');
        }
    }

    _configurarAccionesRapidas() {
        // Seleccionar todos
        const btnSeleccionarTodos = document.getElementById('seleccionarTodos');
        if (btnSeleccionarTodos) {
            btnSeleccionarTodos.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('.permiso-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = true;
                    const card = checkbox.closest('.permiso-card');
                    if (card) this._actualizarEstiloCard(card, true);
                });
            });
        }

        // Deseleccionar todos
        const btnDeseleccionarTodos = document.getElementById('deseleccionarTodos');
        if (btnDeseleccionarTodos) {
            btnDeseleccionarTodos.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('.permiso-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                    const card = checkbox.closest('.permiso-card');
                    if (card) this._actualizarEstiloCard(card, false);
                });
            });
        }
    }

    // ========== OBTENER PERMISOS SELECCIONADOS ==========
    _obtenerPermisosSeleccionados() {
        const permisos = {
            areas: document.getElementById('permisoAreas')?.checked || false,
            categorias: document.getElementById('permisoCategorias')?.checked || false,
            sucursales: document.getElementById('permisoSucursales')?.checked || false,
            regiones: document.getElementById('permisoRegiones')?.checked || false,
            incidencias: document.getElementById('permisoIncidencias')?.checked || false
        };

        return permisos;
    }

    // ========== GUARDAR CAMBIOS ==========
    async _guardarCambios() {
        const btnGuardar = document.getElementById('guardarBtn');
        const originalHTML = btnGuardar ? btnGuardar.innerHTML : '<i class="fas fa-save"></i>Guardar Cambios';

        try {
            if (btnGuardar) {
                btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnGuardar.disabled = true;
            }

            // Validar que tengamos los datos necesarios
            if (!this.usuarioActual || !this.usuarioActual.organizacionCamelCase) {
                throw new Error('No hay información de usuario válida');
            }

            if (!this.permisoActual || !this.permisoActual.id) {
                throw new Error('No hay información del permiso a editar');
            }

            // Obtener permisos seleccionados
            const nuevosPermisos = this._obtenerPermisosSeleccionados();

            // Actualizar permiso usando el manager
            const permisoActualizado = await this.permisoManager.actualizarPermiso(
                this.permisoActual.id,
                nuevosPermisos,
                this.usuarioActual.id || this.usuarioActual.uid,
                this.usuarioActual.organizacionCamelCase
            );

            // Limpiar localStorage
            localStorage.removeItem('selectedPermiso');

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Permiso actualizado!',
                text: 'Los cambios han sido guardados correctamente.',
                timer: 2000,
                showConfirmButton: false
            });

            this._volverALista();

        } catch (error) {
            console.error('❌ Error guardando cambios:', error);

            let mensajeError = error.message || 'No se pudo actualizar el permiso';

            // Mensajes más amigables
            if (mensajeError.includes('organización')) {
                mensajeError = 'Error con la organización del usuario. Intenta recargar la página.';
            } else if (mensajeError.includes('permission')) {
                mensajeError = 'No tienes permisos para realizar esta acción.';
            } else if (mensajeError.includes('network')) {
                mensajeError = 'Error de conexión. Verifica tu internet.';
            }

            this._mostrarError(mensajeError);
        } finally {
            if (btnGuardar) {
                btnGuardar.innerHTML = originalHTML;
                btnGuardar.disabled = false;
            }
        }
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        // Limpiar localStorage
        localStorage.removeItem('selectedPermiso');
        window.location.href = '/usuarios/administrador/permisos/permisos.html';
    }

    _cancelarEdicion() {
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
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
        });
    }

    // ========== UTILIDADES ==========
    _mostrarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            confirmButtonText: 'Entendido'
        });
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    new EditarPermisoController();
});