// editarSucursales.js - VERSIÓN ACTUALIZADA CON CAMPOS DIRECTOS

// Variable global para debugging
window.editarSucursalDebug = {
    estado: 'iniciando',
    controller: null
};

// =============================================
// CLASE PRINCIPAL - EditarSucursalController
// =============================================
class EditarSucursalController {
    constructor() {
        this.sucursalManager = null;
        this.regionManager = null;
        this.usuarioActual = null;
        this.sucursalActual = null;
        this.loadingOverlay = null;
        this.notificacionActual = null;

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

            // 2. Verificar que sea administrador
            if (!this.usuarioActual.esAdministrador || typeof this.usuarioActual.esAdministrador === 'function' 
                ? !this.usuarioActual.esAdministrador() 
                : true) {
                throw new Error('Solo los administradores pueden editar sucursales');
            }

            // 3. Obtener ID de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const sucursalId = urlParams.get('id');
            const orgFromUrl = urlParams.get('org');

            if (!sucursalId) {
                throw new Error('No se especificó la sucursal a editar');
            }

            // Validar organización
            if (orgFromUrl && orgFromUrl !== this.usuarioActual.organizacionCamelCase) {
                throw new Error('No tienes permiso para editar esta sucursal');
            }

            this.sucursalId = sucursalId;

            // 4. Cargar managers
            await this._cargarManagers();

            // 5. Cargar regiones
            await this._cargarRegiones();

            // 6. Cargar estados de México
            this._cargarEstados();

            // 7. Cargar datos de la sucursal
            await this._cargarDatosSucursal();

            // 8. Configurar eventos
            this._configurarEventos();

            window.editarSucursalDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            setTimeout(() => this._volverALista(), 3000);
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========

    async _cargarManagers() {
        try {
            const { SucursalManager, ESTADOS_MEXICO } = await import('/clases/sucursal.js');
            const { RegionManager } = await import('/clases/region.js');
            
            this.sucursalManager = new SucursalManager();
            this.regionManager = new RegionManager();
            this.ESTADOS_MEXICO = ESTADOS_MEXICO;
            
        } catch (error) {
            console.error('Error cargando managers:', error);
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
                    correo: adminData.correoElectronico || '',
                    esAdministrador: () => true
                };
                return;
            }

            // SEGUNDO: Intentar userManager global
            if (window.userManager && window.userManager.currentUser) {
                this.usuarioActual = window.userManager.currentUser;
                return;
            }

            throw new Error('No se encontró información de usuario');

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

    // ========== CARGA DE REGIONES ==========

    async _cargarRegiones() {
        try {
            const regiones = await this.regionManager.getRegionesByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            const select = document.getElementById('regionSucursal');
            if (!select) return;

            select.innerHTML = '<option value="">-- Seleccione una región --</option>';

            if (regiones.length === 0) {
                select.innerHTML = '<option value="">-- No hay regiones disponibles --</option>';
                return;
            }

            regiones.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.nombre;
                option.setAttribute('data-region-nombre', region.nombre);
                select.appendChild(option);
            });

        } catch (error) {
            console.error('Error cargando regiones:', error);
            const select = document.getElementById('regionSucursal');
            if (select) {
                select.innerHTML = '<option value="">-- Error cargando regiones --</option>';
            }
        }
    }

    _cargarEstados() {
        const select = document.getElementById('estadoSucursal');
        if (!select || !this.ESTADOS_MEXICO) return;

        select.innerHTML = '<option value="">-- Seleccione un estado --</option>';
        
        this.ESTADOS_MEXICO.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            select.appendChild(option);
        });
    }

    // ========== CARGA DE DATOS DE SUCURSAL ==========

    async _cargarDatosSucursal() {
        try {
            this._mostrarCargando('Cargando datos de la sucursal...');

            const sucursal = await this.sucursalManager.getSucursalById(
                this.sucursalId,
                this.usuarioActual.organizacionCamelCase
            );

            if (!sucursal) {
                throw new Error('No se encontró la sucursal especificada');
            }

            this.sucursalActual = sucursal;

            // Llenar campos del formulario
            this._llenarFormulario(sucursal);

            this._ocultarCargando();

        } catch (error) {
            this._ocultarCargando();
            console.error('Error cargando datos de sucursal:', error);
            throw error;
        }
    }

    _llenarFormulario(sucursal) {
        // Campos principales
        this._setValue('sucursalId', sucursal.id);
        this._setValue('organizacionCamelCase', sucursal.organizacionCamelCase);
        this._setValue('nombreSucursal', sucursal.nombre || '');
        this._setValue('tipoSucursal', sucursal.tipo || '');
        
        // Ubicación (campos directos)
        this._setValue('zonaSucursal', sucursal.zona || '');
        this._setValue('ciudadSucursal', sucursal.ciudad || '');
        this._setValue('direccionSucursal', sucursal.direccion || '');
        
        // Contacto
        this._setValue('contactoSucursal', sucursal.contacto || '');
        
        // Coordenadas (campos directos)
        this._setValue('latitudSucursal', sucursal.latitud || '');
        this._setValue('longitudSucursal', sucursal.longitud || '');
        
        // Seleccionar región (con timeout para esperar que carguen las opciones)
        if (sucursal.regionId) {
            setTimeout(() => {
                const regionSelect = document.getElementById('regionSucursal');
                if (regionSelect) {
                    regionSelect.value = sucursal.regionId;
                }
            }, 500);
        }
        
        // Seleccionar estado
        if (sucursal.estado) {
            setTimeout(() => {
                const estadoSelect = document.getElementById('estadoSucursal');
                if (estadoSelect) {
                    estadoSelect.value = sucursal.estado;
                }
            }, 100);
        }
    }

    _setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
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
                btnCancelar.addEventListener('click', () => this._cancelarEdicion());
            }

            // Botón Actualizar
            const btnActualizar = document.getElementById('btnActualizarSucursal');
            if (btnActualizar) {
                btnActualizar.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYActualizar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('formEditarSucursal');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYActualizar();
                });
            }

            // Validaciones en tiempo real para teléfono
            const telefono = document.getElementById('contactoSucursal');
            if (telefono) {
                telefono.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // ========== VALIDACIÓN Y ACTUALIZACIÓN ==========

    _validarYActualizar() {
        // Obtener elementos
        const elements = {
            nombreSucursal: document.getElementById('nombreSucursal'),
            tipoSucursal: document.getElementById('tipoSucursal'),
            regionSucursal: document.getElementById('regionSucursal'),
            estadoSucursal: document.getElementById('estadoSucursal'),
            ciudadSucursal: document.getElementById('ciudadSucursal'),
            direccionSucursal: document.getElementById('direccionSucursal'),
            latitudSucursal: document.getElementById('latitudSucursal'),
            longitudSucursal: document.getElementById('longitudSucursal'),
            contactoSucursal: document.getElementById('contactoSucursal'),
            zonaSucursal: document.getElementById('zonaSucursal')
        };

        // Validar campos requeridos
        const errores = [];

        if (!elements.nombreSucursal.value.trim()) {
            elements.nombreSucursal.classList.add('is-invalid');
            errores.push('El nombre de la sucursal es obligatorio');
        } else {
            elements.nombreSucursal.classList.remove('is-invalid');
        }

        if (!elements.tipoSucursal.value.trim()) {
            elements.tipoSucursal.classList.add('is-invalid');
            errores.push('El tipo de sucursal es obligatorio');
        } else {
            elements.tipoSucursal.classList.remove('is-invalid');
        }

        if (!elements.regionSucursal.value) {
            elements.regionSucursal.classList.add('is-invalid');
            errores.push('Debe seleccionar una región');
        } else {
            elements.regionSucursal.classList.remove('is-invalid');
        }

        if (!elements.estadoSucursal.value) {
            elements.estadoSucursal.classList.add('is-invalid');
            errores.push('Debe seleccionar un estado');
        } else {
            elements.estadoSucursal.classList.remove('is-invalid');
        }

        if (!elements.ciudadSucursal.value.trim()) {
            elements.ciudadSucursal.classList.add('is-invalid');
            errores.push('La ciudad es obligatoria');
        } else {
            elements.ciudadSucursal.classList.remove('is-invalid');
        }

        if (!elements.direccionSucursal.value.trim()) {
            elements.direccionSucursal.classList.add('is-invalid');
            errores.push('La dirección es obligatoria');
        } else {
            elements.direccionSucursal.classList.remove('is-invalid');
        }

        if (!elements.latitudSucursal.value.trim()) {
            elements.latitudSucursal.classList.add('is-invalid');
            errores.push('La latitud es obligatoria');
        } else {
            elements.latitudSucursal.classList.remove('is-invalid');
        }

        if (!elements.longitudSucursal.value.trim()) {
            elements.longitudSucursal.classList.add('is-invalid');
            errores.push('La longitud es obligatoria');
        } else {
            elements.longitudSucursal.classList.remove('is-invalid');
        }

        // Validar teléfono
        if (!elements.contactoSucursal.value.trim()) {
            elements.contactoSucursal.classList.add('is-invalid');
            errores.push('El teléfono de contacto es obligatorio');
        } else {
            const telefono = elements.contactoSucursal.value.replace(/\D/g, '');
            if (telefono.length < 10) {
                elements.contactoSucursal.classList.add('is-invalid');
                errores.push('El teléfono debe tener 10 dígitos');
            } else {
                elements.contactoSucursal.classList.remove('is-invalid');
            }
        }

        if (errores.length > 0) {
            this._mostrarErrorValidacion(errores);
            return;
        }

        // Confirmar actualización
        this._confirmarActualizacion();
    }

    _mostrarErrorValidacion(errores) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            html: errores.map(msg => `• ${msg}`).join('<br>'),
            confirmButtonText: 'Corregir',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }

    _confirmarActualizacion() {
        const regionSelect = document.getElementById('regionSucursal');
        const regionOption = regionSelect.options[regionSelect.selectedIndex];
        const regionNombre = regionOption.getAttribute('data-region-nombre') || regionOption.textContent;

        const nombre = document.getElementById('nombreSucursal').value.trim();
        const tipo = document.getElementById('tipoSucursal').value.trim();
        const regionId = regionSelect.value;
        const estado = document.getElementById('estadoSucursal').value;
        const ciudad = document.getElementById('ciudadSucursal').value.trim();
        const direccion = document.getElementById('direccionSucursal').value.trim();
        const zona = document.getElementById('zonaSucursal').value.trim();
        const contacto = document.getElementById('contactoSucursal').value.trim();
        const latitud = document.getElementById('latitudSucursal').value.trim();
        const longitud = document.getElementById('longitudSucursal').value.trim();

        Swal.fire({
            title: 'Actualizar sucursal',
            html: `
                <div style="text-align: left; color: var(--color-text-secondary);">
                    <p><strong style="color: var(--color-text-primary);">Nombre:</strong> ${nombre}</p>
                    <p><strong style="color: var(--color-text-primary);">Tipo:</strong> ${tipo}</p>
                    <p><strong style="color: var(--color-text-primary);">Región:</strong> ${regionNombre}</p>
                    <p><strong style="color: var(--color-text-primary);">Estado:</strong> ${estado}</p>
                    <p><strong style="color: var(--color-text-primary);">Ciudad:</strong> ${ciudad}</p>
                    <p><strong style="color: var(--color-text-primary);">Dirección:</strong> ${direccion}</p>
                    <p><strong style="color: var(--color-text-primary);">Zona:</strong> ${zona || 'No especificada'}</p>
                    <p><strong style="color: var(--color-text-primary);">Contacto:</strong> ${contacto}</p>
                    <p><strong style="color: var(--color-text-primary);">Coordenadas:</strong> ${latitud}, ${longitud}</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                this._actualizarSucursal();
            }
        });
    }

    async _actualizarSucursal() {
        const btnActualizar = document.getElementById('btnActualizarSucursal');
        const originalHTML = btnActualizar ? btnActualizar.innerHTML : '<i class="fas fa-save"></i>Actualizar Sucursal';

        try {
            if (btnActualizar) {
                btnActualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
                btnActualizar.disabled = true;
            }

            // Obtener datos del formulario (campos directos)
            const sucursalData = {
                nombre: document.getElementById('nombreSucursal').value.trim(),
                tipo: document.getElementById('tipoSucursal').value.trim(),
                regionId: document.getElementById('regionSucursal').value,
                estado: document.getElementById('estadoSucursal').value,
                ciudad: document.getElementById('ciudadSucursal').value.trim(),
                direccion: document.getElementById('direccionSucursal').value.trim(),
                zona: document.getElementById('zonaSucursal').value.trim(),
                contacto: document.getElementById('contactoSucursal').value.trim(),
                latitud: document.getElementById('latitudSucursal').value.trim(),
                longitud: document.getElementById('longitudSucursal').value.trim()
            };

            // Actualizar sucursal
            const sucursalActualizada = await this.sucursalManager.actualizarSucursal(
                this.sucursalId,
                sucursalData,
                this.usuarioActual.id,
                this.usuarioActual.organizacionCamelCase
            );

            // Mostrar éxito
            await this._mostrarExitoActualizacion(sucursalActualizada);

        } catch (error) {
            console.error('Error actualizando sucursal:', error);
            this._mostrarError(error.message || 'No se pudo actualizar la sucursal');
        } finally {
            if (btnActualizar) {
                btnActualizar.innerHTML = originalHTML;
                btnActualizar.disabled = false;
            }
        }
    }

    async _mostrarExitoActualizacion(sucursal) {
        const contactoMostrar = sucursal.contacto || 'No especificado';
        const ubicacionCompleta = sucursal.getUbicacionCompleta ? 
            sucursal.getUbicacionCompleta() : 
            `${sucursal.direccion}, ${sucursal.ciudad}, ${sucursal.estado}`;

        await Swal.fire({
            icon: 'success',
            title: '¡Sucursal actualizada!',
            html: `
                <div style="text-align: left;">
                    <p><strong>Nombre:</strong> ${sucursal.nombre}</p>
                    <p><strong>Tipo:</strong> ${sucursal.tipo}</p>
                    <p><strong>Ubicación:</strong> ${ubicacionCompleta}</p>
                    <p><strong>Contacto:</strong> ${contactoMostrar}</p>
                </div>
            `,
            confirmButtonText: 'Ir a Sucursales',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        }).then(() => {
            this._volverALista();
        });
    }

    // ========== NAVEGACIÓN ==========

    _volverALista() {
        window.location.href = '/users/admin/sucursales/sucursales.html';
    }

    _cancelarEdicion() {
        Swal.fire({
            title: '¿Cancelar edición?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                this._volverALista();
            }
        });
    }

    // ========== UTILIDADES ==========

    _mostrarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            confirmButtonText: 'Entendido',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }

    _mostrarCargando(mensaje = 'Procesando...') {
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
    window.editarSucursalDebug.controller = new EditarSucursalController();
});