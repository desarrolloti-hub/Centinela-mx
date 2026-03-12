// crearPermiso.js - VERSIÓN CORREGIDA Y MEJORADA
// BASADA EN CREAR REGIONES - AHORA CON CONEXIÓN A FIREBASE

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

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Configurar organización automática
            this._configurarOrganizacion();

        } catch (error) {
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

            // Si no hay nada, redirigir al login
            return false;

        } catch (error) {
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
            // Importar la clase de permisos con Firebase
            const { PermisoManager } = await import('/clases/permiso.js');
            const { AreaManager } = await import('/clases/area.js');

            this.permisoManager = new PermisoManager();
            this.areaManager = new AreaManager();

        } catch (error) {
            throw new Error('No se pudieron cargar los módulos necesarios. Verifica la consola.');
        }
    }

    // ========== CARGA DE ÁREAS ==========
    async _cargarAreas() {
        try {
            const areaSelect = document.getElementById('areaSelect');
            if (areaSelect) {
                areaSelect.innerHTML = '<option value="" disabled selected>-- Cargando áreas... --</option>';
            }

            if (!this.usuarioActual?.organizacionCamelCase) {
                throw new Error('No hay organización definida');
            }

            this.areas = await this.areaManager.getAreasByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            // Llenar select de áreas
            this._llenarSelectAreas();

        } catch (error) {
            const areaSelect = document.getElementById('areaSelect');
            if (areaSelect) {
                areaSelect.innerHTML = '<option value="" disabled selected>-- Error cargando áreas --</option>';
            }

            // No mostrar error si es por falta de datos (puede ser normal)
            if (!error.message.includes('organización definida')) {
                this._mostrarError('No se pudieron cargar las áreas. Recarga la página.');
            }
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

    // ========== CONFIGURACIÓN DE ORGANIZACIÓN ==========
    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput && this.usuarioActual) {
            orgInput.value = this.usuarioActual.organizacion || 'Sin organización';
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

            // Configurar eventos de checkboxes de permisos
            this._configurarCheckboxesPermisos();

            // Configurar botones de acciones rápidas
            this._configurarAccionesRapidas();

        } catch (error) {
            // Silenciar error
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

                // Estado inicial
                this._actualizarEstiloCard(card, checkbox.checked);
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
                text: 'No has seleccionado ningún permiso. El cargo no tendrá acceso a ningún módulo en el dashboard.',
                showCancelButton: true,
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'Revisar permisos',
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    this._verificarPermisoExistente(areaId, cargoId, permisos);
                }
            });
            return;
        }

        // Validar que no exista ya un permiso para este área y cargo
        this._verificarPermisoExistente(areaId, cargoId, permisos);
    }

    async _verificarPermisoExistente(areaId, cargoId, permisos) {
        try {
            const existe = await this.permisoManager.verificarExistente(
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
            this._guardarPermiso(areaId, cargoId, permisos);

        } catch (error) {
            this._mostrarError('Error al verificar permiso existente');
        }
    }

    async _guardarPermiso(areaId, cargoId, permisos) {
        const btnCrear = document.getElementById('registerBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Permiso';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            // Validar que tengamos los datos necesarios
            if (!this.usuarioActual || !this.usuarioActual.organizacionCamelCase) {
                throw new Error('No hay información de usuario válida');
            }

            // Crear objeto userManager para pasar a la clase
            const userManager = {
                currentUser: {
                    id: this.usuarioActual.id,
                    uid: this.usuarioActual.uid,
                    organizacionCamelCase: this.usuarioActual.organizacionCamelCase,
                    nombreCompleto: this.usuarioActual.nombreCompleto
                }
            };

            const permisoData = {
                areaId: areaId,
                cargoId: cargoId,
                permisos: permisos,
                organizacionCamelCase: this.usuarioActual.organizacionCamelCase,
                usuarioActual: userManager.currentUser
            };

            // Obtener nombres para mostrar en el mensaje de éxito
            const area = this.areas.find(a => a.id === areaId);
            const cargoNombre = this._getCargoNombre(areaId, cargoId);

            // Crear permiso usando el manager (AHORA GUARDA EN FIREBASE)
            const nuevoPermiso = await this.permisoManager.crearPermiso(
                permisoData,
                userManager
            );

            // Obtener lista de módulos activos para mostrar
            const modulosActivos = Object.entries(permisos)
                .filter(([_, valor]) => valor === true)
                .map(([modulo]) => modulo);

            // Nombres amigables para los módulos
            const nombresModulos = {
                areas: 'Áreas',
                categorias: 'Categorías',
                sucursales: 'Sucursales',
                regiones: 'Regiones',
                incidencias: 'Incidencias'
            };

            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Permiso creado!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Área:</strong> ${area?.nombreArea || 'No especificada'}</p>
                        <p><strong>Cargo:</strong> ${cargoNombre || 'No especificado'}</p>
                        <p><strong>Módulos con acceso:</strong> ${modulosActivos.length}</p>
                        <div style="margin-top: 15px; background: rgba(47,140,255,0.1); padding: 15px; border-radius: 8px;">
                            ${modulosActivos.length > 0 ?
                        modulosActivos.map(modulo =>
                            `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                        <i class="fas fa-check-circle" style="color: #2f8cff;"></i>
                                        <span style="color: var(--color-text-primary);">${nombresModulos[modulo] || modulo}</span>
                                    </div>`
                        ).join('')
                        : '<p style="color: var(--color-text-dim); margin: 0;">Sin módulos asignados</p>'
                    }
                        </div>
                    </div>
                `,
                confirmButtonText: 'Ver permisos'
            });

            this._volverALista();

        } catch (error) {
            Swal.close();

            let mensajeError = error.message || 'No se pudo crear el permiso';

            // Mensajes más amigables
            if (mensajeError.includes('organización')) {
                mensajeError = 'Error con la organización del usuario. Intenta recargar la página.';
            } else if (mensajeError.includes('Ya existe')) {
                mensajeError = error.message; // Mantener el mensaje específico
            } else if (mensajeError.includes('permission')) {
                mensajeError = 'No tienes permisos para realizar esta acción.';
            } else if (mensajeError.includes('network')) {
                mensajeError = 'Error de conexión. Verifica tu internet.';
            }

            this._mostrarError(mensajeError);
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
        window.location.href = '/usuarios/administrador/permisos/permisos.html';
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