// editarRegiones.js - VERSIÓN MEJORADA (BASADA EN CREAR REGIONES)

// LÍMITES DE CARACTERES
const LIMITES = {
    NOMBRE_REGION: 50
};

// =============================================
// CLASE PRINCIPAL - EditarRegionController
// =============================================
class EditarRegionController {
    constructor() {
        this.regionManager = null;
        this.usuarioActual = null;
        this.regionOriginal = null;

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            // 1. Cargar usuario
            await this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            // 2. Obtener ID de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const regionId = urlParams.get('id');
            const orgCamelCase = urlParams.get('org');

            if (!regionId || !orgCamelCase) {
                throw new Error('No se especificó la región a editar');
            }

            // Verificar que la organización coincida
            if (this.usuarioActual.organizacionCamelCase !== orgCamelCase) {
                throw new Error('No tienes permisos para editar esta región');
            }

            // 3. Cargar RegionManager
            await this._cargarRegionManager();

            // 4. Configurar eventos básicos
            this._configurarEventos();

            // 5. Cargar datos de la región
            await this._cargarDatosRegion(regionId, orgCamelCase);

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError(error.message, true);
        }
    }

    // ========== CARGA DE USUARIO ==========
    async _cargarUsuario() {
        try {
            // Mostrar loader
            Swal.fire({
                title: 'Verificando sesión...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Esperar a que window.userManager.currentUser esté disponible
            let attempts = 0;
            const maxAttempts = 30;
            
            while (attempts < maxAttempts) {
                if (window.userManager && window.userManager.currentUser) {
                    const admin = window.userManager.currentUser;
                    
                    this.usuarioActual = {
                        id: admin.id,
                        uid: admin.id,
                        nombreCompleto: admin.nombreCompleto,
                        organizacion: admin.organizacion,
                        organizacionCamelCase: admin.organizacionCamelCase,
                        correo: admin.correoElectronico
                    };
                    
                    Swal.close();
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            Swal.close();
            throw new Error('No se pudo detectar el usuario actual');

        } catch (error) {
            Swal.close();
            console.error('Error cargando usuario:', error);
            throw error;
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========
    async _cargarRegionManager() {
        try {
            const { RegionManager } = await import('/clases/region.js');
            this.regionManager = new RegionManager();
        } catch (error) {
            console.error('Error cargando RegionManager:', error);
            throw error;
        }
    }

    // ========== CARGA DE DATOS DE LA REGIÓN ==========
    async _cargarDatosRegion(regionId, orgCamelCase) {
        try {
            Swal.fire({
                title: 'Cargando datos...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Obtener región por ID
            const region = await this.regionManager.getRegionById(regionId, orgCamelCase);

            if (!region) {
                throw new Error('Región no encontrada');
            }

            this.regionOriginal = region;

            // Llenar formulario con los datos
            this._llenarFormulario(region, orgCamelCase);

            Swal.close();

        } catch (error) {
            Swal.close();
            console.error('Error cargando región:', error);
            this._mostrarError(error.message || 'No se pudo cargar la región', true);
        }
    }

    _llenarFormulario(region, orgCamelCase) {
        const elements = this._obtenerElementosDOM();

        elements.regionId.value = region.id;
        elements.organizacionCamelCase.value = orgCamelCase;
        elements.organization.value = region.organizacion || this.usuarioActual.organizacion;
        elements.nombreRegion.value = region.nombre || '';
        elements.colorRegion.value = region.color || '#2f8cff';

        // Actualizar display de color
        if (elements.colorDisplay) {
            elements.colorDisplay.style.backgroundColor = region.color || '#2f8cff';
        }
        if (elements.colorHex) {
            elements.colorHex.textContent = region.color || '#2f8cff';
        }

        // Guardar valores originales para detectar cambios
        elements.nombreRegion.defaultValue = region.nombre || '';
        elements.colorRegion.defaultValue = region.color || '#2f8cff';

        // Actualizar título
        if (elements.formMainTitle) {
            elements.formMainTitle.innerHTML = `<i class="fas fa-map-marked-alt"></i> Editar Región: ${region.nombre}`;
        }

        // Actualizar contador
        this._actualizarContadorCaracteres();
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            const elements = this._obtenerElementosDOM();

            // Botón Volver a la lista
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            if (elements.cancelBtn) {
                elements.cancelBtn.addEventListener('click', () => this._cancelarEdicion());
            }

            // Botón Actualizar
            if (elements.updateBtn) {
                elements.updateBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYActualizar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('editForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYActualizar();
                });
            }

            // Color Preview
            const colorPreviewCard = document.getElementById('colorPreviewCard');
            const colorPickerNative = document.getElementById('colorRegion');

            if (colorPreviewCard && colorPickerNative) {
                colorPreviewCard.addEventListener('click', () => {
                    colorPickerNative.click();
                });

                colorPickerNative.addEventListener('input', (e) => {
                    const color = e.target.value;
                    if (elements.colorDisplay) {
                        elements.colorDisplay.style.backgroundColor = color;
                    }
                    if (elements.colorHex) {
                        elements.colorHex.textContent = color;
                    }
                });
            }

            // Contador de caracteres para el nombre
            if (elements.nombreRegion) {
                elements.nombreRegion.addEventListener('input', () => this._actualizarContadorCaracteres());
                elements.nombreRegion.maxLength = LIMITES.NOMBRE_REGION;
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _obtenerElementosDOM() {
        return {
            organization: document.getElementById('organization'),
            nombreRegion: document.getElementById('nombreRegion'),
            colorRegion: document.getElementById('colorRegion'),
            regionId: document.getElementById('regionId'),
            organizacionCamelCase: document.getElementById('organizacionCamelCase'),
            updateBtn: document.getElementById('updateBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            formMainTitle: document.getElementById('formMainTitle'),
            colorDisplay: document.getElementById('colorDisplay'),
            colorHex: document.getElementById('colorHex'),
            contadorCaracteres: document.getElementById('contadorCaracteres')
        };
    }

    _actualizarContadorCaracteres() {
        const elements = this._obtenerElementosDOM();
        const nombreInput = elements.nombreRegion;
        const contador = elements.contadorCaracteres;

        if (nombreInput && contador) {
            const longitud = nombreInput.value.length;
            contador.textContent = `${longitud}/${LIMITES.NOMBRE_REGION}`;

            // Cambiar color si se acerca al límite
            if (longitud > LIMITES.NOMBRE_REGION * 0.9) {
                contador.style.color = 'var(--color-warning)';
            } else if (longitud > LIMITES.NOMBRE_REGION * 0.95) {
                contador.style.color = 'var(--color-danger)';
            } else {
                contador.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    // ========== VALIDACIÓN Y ACTUALIZACIÓN ==========
    _validarYActualizar() {
        const elements = this._obtenerElementosDOM();

        // Validar nombre
        const nombre = elements.nombreRegion.value.trim();

        if (!nombre) {
            elements.nombreRegion.classList.add('is-invalid');
            this._mostrarError('El nombre de la región es obligatorio');
            return;
        }

        if (nombre.length < 3) {
            elements.nombreRegion.classList.add('is-invalid');
            this._mostrarError('El nombre debe tener al menos 3 caracteres');
            return;
        }

        if (nombre.length > LIMITES.NOMBRE_REGION) {
            elements.nombreRegion.classList.add('is-invalid');
            this._mostrarError(`El nombre no puede exceder ${LIMITES.NOMBRE_REGION} caracteres`);
            return;
        }

        elements.nombreRegion.classList.remove('is-invalid');

        // Verificar si hubo cambios
        const nombreOriginal = elements.nombreRegion.defaultValue;
        const colorOriginal = elements.colorRegion.defaultValue;
        const colorNuevo = elements.colorRegion.value;

        if (nombre === nombreOriginal && colorNuevo === colorOriginal) {
            this._mostrarInfo('No se detectaron cambios en la región');
            return;
        }

        // Mostrar confirmación
        this._confirmarActualizacion({
            nombre: nombre,
            color: colorNuevo
        });
    }

    async _confirmarActualizacion(nuevosDatos) {
        const elements = this._obtenerElementosDOM();

        const result = await Swal.fire({
            title: 'Actualizar región',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <p><strong>Nombre:</strong> ${nuevosDatos.nombre}</p>
                    <p><strong>Color:</strong> 
                        <span style="display: inline-block; width: 20px; height: 20px; background: ${nuevosDatos.color}; border-radius: 4px; vertical-align: middle; margin-right: 5px;"></span>
                        ${nuevosDatos.color}
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ACTUALIZAR',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: 'var(--color-accent-primary)',
            cancelButtonColor: 'var(--color-danger)',
            allowOutsideClick: false
        });

        if (result.isConfirmed) {
            await this._actualizarRegion(nuevosDatos);
        }
    }

    async _actualizarRegion(nuevosDatos) {
        const elements = this._obtenerElementosDOM();
        const btnActualizar = elements.updateBtn;
        const originalHTML = btnActualizar ? btnActualizar.innerHTML : '<i class="fas fa-save"></i>Actualizar Región';

        try {
            if (btnActualizar) {
                btnActualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
                btnActualizar.disabled = true;
            }

            // Mostrar loader
            // Mostrar loader (VERSIÓN CORREGIDA CON SCROLL)


            // Preparar datos a actualizar
            const datosActualizar = {};
            
            if (nuevosDatos.nombre !== elements.nombreRegion.defaultValue) {
                datosActualizar.nombre = nuevosDatos.nombre;
            }
            
            if (nuevosDatos.color !== elements.colorRegion.defaultValue) {
                datosActualizar.color = nuevosDatos.color;
            }

            // Actualizar región
            await this.regionManager.updateRegion(
                elements.regionId.value,
                datosActualizar,
                elements.organizacionCamelCase.value,
                this.usuarioActual.id
            );

            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Región actualizada!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Nombre:</strong> ${nuevosDatos.nombre}</p>
                        <p><strong>Color:</strong> 
                            <span style="display:inline-block; width:20px; height:20px; background:${nuevosDatos.color}; border-radius:4px; margin-right:8px; vertical-align:middle;"></span>
                            ${nuevosDatos.color}
                        </p>
                    </div>
                `,
                confirmButtonText: 'Ver regiones'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error actualizando región:', error);
            Swal.close();
            this._mostrarError(error.message || 'No se pudo actualizar la región');
        } finally {
            if (btnActualizar) {
                btnActualizar.innerHTML = originalHTML;
                btnActualizar.disabled = false;
            }
        }
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        window.location.href = '/users/admin/regiones/regiones.html';
    }

    _cancelarEdicion() {
        Swal.fire({
            title: '¿Cancelar edición?',
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

    // ========== UTILIDADES ==========
    _mostrarError(mensaje, redirigir = false) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            confirmButtonText: 'Entendido'
        }).then(() => {
            if (redirigir) {
                this._volverALista();
            }
        });
    }

    _mostrarInfo(mensaje) {
        Swal.fire({
            icon: 'info',
            title: 'Información',
            text: mensaje,
            confirmButtonText: 'Entendido'
        });
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    new EditarRegionController();
});