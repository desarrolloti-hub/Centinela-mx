// crearTareaGeneral.js - VERSIÓN MEJORADA CON CHECKLIST Y RECORDATORIOS
// VISIBLE PARA TODOS LOS USUARIOS DE LA ORGANIZACIÓN

class CrearTareaGeneralController {
    constructor() {
        this.tareaManager = null;
        this.usuarioActual = null;

        // Items del checklist
        this.items = [];

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            console.log('🚀 Inicializando CrearTareaGeneralController (versión mejorada)...');

            // 1. Cargar usuario
            await this._cargarUsuario();

            // 2. Si no hay usuario, redirigir
            if (!this.usuarioActual) {
                this._redirigirAlLogin();
                return;
            }

            console.log('👤 Usuario actual:', this.usuarioActual.nombreCompleto);

            // 3. Inicializar TareaManager
            await this._cargarTareaManager();

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Configurar organización automática
            this._configurarOrganizacion();

            // 6. Configurar contadores de caracteres
            this._configurarContadores();

            // 7. Configurar items del checklist
            this._configurarItemsChecklist();

            // 8. Configurar fecha y recordatorio
            this._configurarFechaRecordatorio();

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ========== CARGA DE TAREAMANAGER ==========
    async _cargarTareaManager() {
        try {
            const { TareaManager } = await import('/clases/tarea.js');
            this.tareaManager = new TareaManager();
            console.log('✅ TareaManager inicializado');
        } catch (error) {
            console.error('Error cargando TareaManager:', error);
            throw new Error('No se pudo cargar el módulo de tareas');
        }
    }

    // ========== CARGA DE USUARIO ==========
    async _cargarUsuario() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || adminData.uid,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || adminData.correo || '',
                    esAdmin: true
                };
                console.log('✅ Usuario cargado desde adminInfo');
                return true;
            }

            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                this.usuarioActual = {
                    id: userData.uid || userData.id,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || '',
                    esAdmin: userData.rol === 'admin'
                };
                console.log('✅ Usuario cargado desde userData');
                return true;
            }

            console.warn('⚠️ No se encontró usuario');
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

    // ========== CONFIGURACIÓN DE ORGANIZACIÓN ==========
    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput && this.usuarioActual) {
            orgInput.value = this.usuarioActual.organizacion || 'Sin organización';
        }
    }

    // ========== CONFIGURACIÓN DE CONTADORES ==========
    _configurarContadores() {
        const nombreInput = document.getElementById('nombreActividad');
        const descripcionInput = document.getElementById('descripcion');
        const nombreCounter = document.getElementById('nombreCounter');
        const descripcionCounter = document.getElementById('descripcionCounter');

        if (nombreInput && nombreCounter) {
            nombreCounter.textContent = `${nombreInput.value.length}/100`;
            nombreInput.addEventListener('input', () => {
                nombreCounter.textContent = `${nombreInput.value.length}/100`;
            });
        }

        if (descripcionInput && descripcionCounter) {
            descripcionCounter.textContent = `${descripcionInput.value.length}/500`;
            descripcionInput.addEventListener('input', () => {
                descripcionCounter.textContent = `${descripcionInput.value.length}/500`;
            });
        }
    }

    // ========== GESTIÓN DE ITEMS DEL CHECKLIST ==========
    _configurarItemsChecklist() {
        const btnAgregarItem = document.getElementById('btnAgregarItem');
        if (btnAgregarItem) {
            btnAgregarItem.addEventListener('click', () => this._agregarItem());
        }

        // Inicializar con un item por defecto
        setTimeout(() => this._agregarItem(), 100);
    }

    _agregarItem(texto = '') {
        const itemsList = document.getElementById('itemsList');
        const placeholder = document.getElementById('itemsPlaceholder');

        if (placeholder) {
            placeholder.style.display = 'none';
        }

        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const itemIndex = this.items.length + 1;

        const itemHTML = `
            <div class="item-row" data-item-id="${itemId}">
                <span class="item-number">${itemIndex}</span>
                <input type="text" class="item-input" placeholder="Escribe un item..." value="${texto}" maxlength="200">
                <div class="item-actions">
                    <button type="button" class="btn-item-action delete" title="Eliminar item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        itemsList.insertAdjacentHTML('beforeend', itemHTML);

        const newItem = itemsList.lastElementChild;
        const input = newItem.querySelector('.item-input');
        const deleteBtn = newItem.querySelector('.btn-item-action.delete');

        input.addEventListener('input', () => {
            this._actualizarItemsDesdeDOM();
        });

        deleteBtn.addEventListener('click', () => {
            newItem.remove();
            this._actualizarItemsDesdeDOM();
            this._reordenarItems();

            if (this.items.length === 0) {
                const placeholder = document.getElementById('itemsPlaceholder');
                if (placeholder) {
                    placeholder.style.display = 'block';
                }
            }
        });

        input.focus();
        this._actualizarItemsDesdeDOM();
    }

    _actualizarItemsDesdeDOM() {
        const itemsList = document.getElementById('itemsList');
        const itemRows = itemsList.querySelectorAll('.item-row');

        this.items = [];

        itemRows.forEach(row => {
            const input = row.querySelector('.item-input');
            const texto = input.value.trim();

            if (texto !== '') {
                this.items.push(texto);
            }
        });
    }

    _reordenarItems() {
        const itemsList = document.getElementById('itemsList');
        const itemRows = itemsList.querySelectorAll('.item-row');

        itemRows.forEach((row, index) => {
            const numberSpan = row.querySelector('.item-number');
            numberSpan.textContent = index + 1;
        });
    }

    // ========== CONFIGURACIÓN DE FECHA Y RECORDATORIO ==========
    _configurarFechaRecordatorio() {
        const fechaInput = document.getElementById('fechaLimite');
        if (fechaInput) {
            const hoy = new Date().toISOString().split('T')[0];
            fechaInput.min = hoy;

            // Establecer fecha por defecto (hoy + 30 días para tareas generales)
            const fechaDefault = new Date();
            fechaDefault.setDate(fechaDefault.getDate() + 30);
            fechaInput.value = fechaDefault.toISOString().split('T')[0];
        }

        const recordatorioCheck = document.getElementById('tieneRecordatorio');
        const fechaContainer = document.getElementById('fechaContainer');

        if (recordatorioCheck && fechaContainer) {
            recordatorioCheck.addEventListener('change', (e) => {
                fechaContainer.style.opacity = e.target.checked ? '1' : '0.5';
                if (e.target.checked && fechaInput) {
                    fechaInput.focus();
                }
            });
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            const btnCancelar = document.getElementById('cancelarBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            const btnCrear = document.getElementById('crearTareaBtn');
            if (btnCrear) {
                btnCrear.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            const form = document.getElementById('formTareaGeneral');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            console.log('✅ Eventos configurados');

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // ========== VALIDACIÓN Y GUARDADO ==========
    _validarYGuardar() {
        const nombreInput = document.getElementById('nombreActividad');
        const nombre = nombreInput.value.trim();

        if (!nombre) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError('El nombre de la actividad es requerido');
            return;
        }
        nombreInput.classList.remove('is-invalid');

        // Actualizar items desde DOM
        this._actualizarItemsDesdeDOM();

        // Si no hay items, preguntar si desea continuar
        if (this.items.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Tarea sin items',
                text: 'No has agregado ningún item al checklist. ¿Deseas continuar?',
                showCancelButton: true,
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'Agregar items',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    this._guardarTarea(nombre);
                }
            });
        } else {
            this._guardarTarea(nombre);
        }
    }

    async _guardarTarea(nombre) {
        const btnCrear = document.getElementById('crearTareaBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Tarea';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            const descripcion = document.getElementById('descripcion').value.trim();

            // Obtener fecha límite y recordatorio
            const fechaLimiteInput = document.getElementById('fechaLimite');
            const tieneRecordatorioCheck = document.getElementById('tieneRecordatorio');

            let fechaLimite = null;
            if (tieneRecordatorioCheck?.checked && fechaLimiteInput?.value) {
                fechaLimite = new Date(fechaLimiteInput.value);
                fechaLimite.setHours(23, 59, 59, 999); // Fin del día seleccionado
            }

            const tareaData = {
                nombreActividad: nombre,
                descripcion: descripcion,
                items: this.items, // Array de strings para el checklist
                tipo: 'global', // Usamos 'global' en lugar de 'general' para consistencia con la clase Tarea
                fechaLimite: fechaLimite,
                tieneRecordatorio: tieneRecordatorioCheck?.checked || false
            };

            console.log('📝 Guardando tarea general:', tareaData);

            const nuevaTarea = await this.tareaManager.crearTarea(tareaData, this.usuarioActual);

            console.log('✅ Tarea general creada:', nuevaTarea);

            // Mostrar resumen detallado
            let resumenHTML = `
                <div style="text-align: left; color: var(--color-text-primary);">
                    <p><strong>Tarea:</strong> ${nombre}</p>
                    <p><strong>Tipo:</strong> General (visible para toda la organización)</p>
                    <p><strong>Creado por:</strong> ${this.usuarioActual.nombreCompleto}</p>
            `;

            if (fechaLimite) {
                resumenHTML += `<p><strong>Fecha límite:</strong> ${fechaLimite.toLocaleDateString('es-MX')}</p>`;
            }

            resumenHTML += `<p><strong>Items en checklist:</strong> ${this.items.length}</p>`;
            resumenHTML += `</div>`;

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: '¡Tarea general creada exitosamente!',
                html: resumenHTML,
                confirmButtonText: 'Ver tareas',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#2f8cff'
            });

            this._volverALista();

        } catch (error) {
            console.error('❌ Error guardando tarea:', error);
            this._mostrarError(error.message || 'No se pudo crear la tarea');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        window.location.href = '/usuarios/administrador/tareas/tareas.html';
    }

    _cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#2f8cff'
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
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff'
        }).then(() => {
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
        });
    }

    _mostrarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            confirmButtonText: 'Entendido',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            confirmButtonColor: '#2f8cff'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando controller de tarea general (versión mejorada)...');
    new CrearTareaGeneralController();
});