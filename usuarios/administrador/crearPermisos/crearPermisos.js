// crearPermiso.js - CONTROLADOR PARA CREACIÓN DE PERMISOS GENERALES

// =============================================
// CLASE PRINCIPAL - CrearPermisoController
// =============================================
class CrearPermisoController {
    constructor() {
        this.permisoManager = null;
        this.areaManager = null;
        this.usuarioActual = null;

        // Cache de áreas y cargos
        this.areas = [];
        this.cargosPorArea = {};

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

            // 2. Cargar managers
            await this._cargarManagers();

            // 3. Cargar áreas
            await this._cargarAreas();

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Configurar organización automática
            this._configurarOrganizacion();

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========
    async _cargarManagers() {
        try {
            const { PermisoManager } = await import('/clases/permiso.js');
            const { AreaManager } = await import('/clases/area.js');

            this.permisoManager = new PermisoManager();
            this.areaManager = new AreaManager();
        } catch (error) {
            console.error('Error cargando managers:', error);
            throw error;
        }
    }

    // ========== CARGA DE ÁREAS ==========
    async _cargarAreas() {
        try {
            const areaSelect = document.getElementById('areaSelect');
            if (areaSelect) {
                areaSelect.innerHTML = '<option value="" disabled selected>-- Cargando áreas... --</option>';
            }

            this.areas = await this.areaManager.getAreasByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            // Llenar select de áreas
            this._llenarSelectAreas();

        } catch (error) {
            console.error('Error cargando áreas:', error);
            const areaSelect = document.getElementById('areaSelect');
            if (areaSelect) {
                areaSelect.innerHTML = '<option value="" disabled selected>-- Error cargando áreas --</option>';
            }
            this._mostrarError('No se pudieron cargar las áreas. Recarga la página.');
        }
    }

    _llenarSelectAreas() {
        const areaSelect = document.getElementById('areaSelect');
        if (!areaSelect) return;

        if (!this.areas || this.areas.length === 0) {
            areaSelect.innerHTML = '<option value="" disabled selected>-- No hay áreas disponibles --</option>';
            return;
        }

        areaSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un área --</option>';

        this.areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.nombreArea;
            areaSelect.appendChild(option);
        });
    }

    // ========== CARGA DE CARGOS POR ÁREA ==========
    _cargarCargosPorArea(areaId) {
        const cargoSelect = document.getElementById('cargoSelect');
        if (!cargoSelect) return;

        // Limpiar select
        cargoSelect.innerHTML = '';
        cargoSelect.disabled = true;

        if (!areaId) {
            cargoSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona un área --</option>';
            return;
        }

        const area = this.areas.find(a => a.id === areaId);
        if (!area) {
            cargoSelect.innerHTML = '<option value="" disabled selected>-- Área no encontrada --</option>';
            return;
        }

        const cargos = area.getCargosAsArray ? area.getCargosAsArray() : [];

        if (!cargos || cargos.length === 0) {
            cargoSelect.innerHTML = '<option value="" disabled selected>-- No hay cargos en esta área --</option>';
            return;
        }

        cargoSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un cargo --</option>';

        cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.id;
            option.textContent = cargo.nombre;
            cargoSelect.appendChild(option);
        });

        cargoSelect.disabled = false;
    }

    // ========== CARGA DE USUARIO ==========
    _cargarUsuario() {
        try {
            // Intentar adminInfo (para administradores)
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

            // Intentar userData
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

            // Datos por defecto (para desarrollo)
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

    // ========== CONFIGURACIÓN DE ORGANIZACIÓN ==========
    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput) {
            orgInput.value = this.usuarioActual.organizacion;
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
            const btnCancelar = document.getElementById('cancelBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Botón Crear Permiso
            const btnCrearPermiso = document.getElementById('registerBtn');
            if (btnCrearPermiso) {
                btnCrearPermiso.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('formPermisoPrincipal');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Select de Área - Cambio para cargar cargos
            const areaSelect = document.getElementById('areaSelect');
            if (areaSelect) {
                areaSelect.addEventListener('change', (e) => {
                    const areaId = e.target.value;
                    this._cargarCargosPorArea(areaId);
                });
            }

            // Efecto visual en checkboxes de permisos
            const permisosItems = document.querySelectorAll('.permiso-item');
            permisosItems.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');

                item.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                    }
                    this._actualizarEstiloCheckbox(item, checkbox.checked);
                });

                checkbox.addEventListener('change', (e) => {
                    this._actualizarEstiloCheckbox(item, e.target.checked);
                });

                // Estado inicial
                this._actualizarEstiloCheckbox(item, checkbox.checked);
            });

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _actualizarEstiloCheckbox(item, checked) {
        if (checked) {
            item.classList.add('activo');
        } else {
            item.classList.remove('activo');
        }
    }

    // ========== OBTENER PERMISOS SELECCIONADOS ==========
    _obtenerPermisosSeleccionados() {
        const permisos = {
            // Módulos principales
            dashboard: document.getElementById('permisoDashboard')?.checked || false,
            usuarios: document.getElementById('permisoUsuarios')?.checked || false,
            incidencias: document.getElementById('permisoIncidencias')?.checked || false,
            estadisticas: document.getElementById('permisoEstadisticas')?.checked || false,
            configuracion: document.getElementById('permisoConfiguracion')?.checked || false,

            // Submódulos
            roles: document.getElementById('permisoRoles')?.checked || false,
            permisos: document.getElementById('permisoPermisos')?.checked || false,
            auditoria: document.getElementById('permisoAuditoria')?.checked || false,
            reportes: document.getElementById('permisoReportes')?.checked || false,

            // Acciones específicas
            verIncidencias: document.getElementById('permisoVerIncidencias')?.checked || false,
            gestionarUsuarios: document.getElementById('permisoGestionarUsuarios')?.checked || false,
            gestionarRoles: document.getElementById('permisoGestionarRoles')?.checked || false
        };

        return permisos;
    }

    // ========== VALIDACIÓN Y GUARDADO ==========
    _validarYGuardar() {
        // Validar área
        const areaSelect = document.getElementById('areaSelect');
        const areaId = areaSelect.value;

        if (!areaId) {
            areaSelect.classList.add('is-invalid');
            this._mostrarError('Debes seleccionar un área');
            return;
        }
        areaSelect.classList.remove('is-invalid');

        // Validar cargo
        const cargoSelect = document.getElementById('cargoSelect');
        const cargoId = cargoSelect.value;

        if (!cargoId) {
            cargoSelect.classList.add('is-invalid');
            this._mostrarError('Debes seleccionar un cargo');
            return;
        }
        cargoSelect.classList.remove('is-invalid');

        // Obtener permisos seleccionados
        const permisos = this._obtenerPermisosSeleccionados();
        const permisosActivos = Object.values(permisos).filter(v => v === true).length;

        // Si no hay permisos seleccionados, mostrar advertencia pero permitir continuar
        if (permisosActivos === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin permisos seleccionados',
                text: 'No has seleccionado ningún permiso. El cargo no tendrá acceso a ningún módulo del dashboard.',
                showCancelButton: true,
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'Revisar permisos',
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    this._verificarPermisoExistente(areaId, cargoId);
                }
            });
            return;
        }

        // Validar que no exista ya un permiso para este área y cargo
        this._verificarPermisoExistente(areaId, cargoId);
    }

    async _verificarPermisoExistente(areaId, cargoId) {
        try {
            const existe = await this.permisoManager.verificarPermisoExistente(
                areaId,
                cargoId,
                this.usuarioActual.organizacionCamelCase
            );

            if (existe) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Permiso existente',
                    html: `
                        <p style="color: var(--color-text-secondary);">
                            Ya existe un permiso configurado para esta área y cargo.
                        </p>
                        <p style="color: var(--color-text-dim); font-size: 0.9rem; margin-top: 10px;">
                            Puedes editar el permiso existente o seleccionar otra combinación.
                        </p>
                    `,
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            // Si no existe, proceder a guardar
            this._guardarPermiso(areaId, cargoId);

        } catch (error) {
            console.error('Error verificando permiso existente:', error);
            this._mostrarError('Error al verificar permiso existente');
        }
    }

    async _guardarPermiso(areaId, cargoId) {
        const btnCrear = document.getElementById('registerBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Permiso';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            const permisos = this._obtenerPermisosSeleccionados();

            const permisoData = {
                areaId: areaId,
                cargoId: cargoId,
                permisos: permisos
            };

            // Obtener nombres para mostrar en el mensaje de éxito
            const area = this.areas.find(a => a.id === areaId);
            const cargoNombre = this._getCargoNombre(areaId, cargoId);

            // Crear permiso usando el manager
            await this.permisoManager.crearPermiso(
                permisoData,
                { currentUser: this.usuarioActual }
            );

            // Obtener lista de permisos activos para mostrar
            const permisosActivos = Object.entries(permisos)
                .filter(([_, valor]) => valor === true)
                .map(([modulo]) => modulo);

            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Permiso creado!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Área:</strong> ${area?.nombreArea || 'No especificada'}</p>
                        <p><strong>Cargo:</strong> ${cargoNombre || 'No especificado'}</p>
                        <p><strong>Módulos con acceso:</strong> ${permisosActivos.length}</p>
                        <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px;">
                            ${permisosActivos.map(modulo =>
                    `<span style="display:inline-block; padding:3px 8px; background:rgba(47,140,255,0.1); border-radius:15px; color:var(--color-text-primary); font-size:11px;">${modulo}</span>`
                ).join(' ')}
                        </div>
                    </div>
                `,
                confirmButtonText: 'Ver permisos'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando permiso:', error);
            Swal.close();
            this._mostrarError(error.message || 'No se pudo crear el permiso');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    _getCargoNombre(areaId, cargoId) {
        const area = this.areas.find(a => a.id === areaId);
        if (!area || !area.cargos) return null;
        return area.cargos[cargoId]?.nombre || null;
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        window.location.href = '/usuarios/permisos/permisos.html';
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
    new CrearPermisoController();
});