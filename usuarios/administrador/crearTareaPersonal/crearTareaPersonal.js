// crearTareaPersonal.js - VERSIÓN SIMPLIFICADA
// SOLO NOMBRE, DESCRIPCIÓN E ITEMS DEL CHECKLIST

import { TareaManager } from '/clases/tarea.js';

// =============================================
// CLASE PRINCIPAL - CrearTareaPersonalController
// =============================================
class CrearTareaPersonalController {
    constructor() {
        this.tareaManager = null;
        this.usuarioActual = null;

        // Items de la tarea
        this.items = [];

        // Contadores de items
        this.itemCounter = 0;

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            console.log('🚀 Inicializando CrearTareaPersonalController...');

            // 1. Cargar usuario
            await this._cargarUsuario();

            // 2. Si no hay usuario, redirigir
            if (!this.usuarioActual) {
                this._redirigirAlLogin();
                return;
            }

            console.log('👤 Usuario actual:', this.usuarioActual.nombreCompleto);

            // 3. Inicializar TareaManager
            this.tareaManager = new TareaManager();
            console.log('✅ TareaManager inicializado');

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Configurar organización automática
            this._configurarOrganizacion();

            // 6. Configurar contadores de caracteres
            this._configurarContadores();

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ========== CARGA DE USUARIO ==========
    async _cargarUsuario() {
        try {
            // Intentar obtener de adminInfo
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
                    correo: adminData.correoElectronico || adminData.correo || ''
                };
                console.log('✅ Usuario cargado desde adminInfo');
                return true;
            }

            // Intentar obtener de userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                this.usuarioActual = {
                    id: userData.uid || userData.id,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || ''
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

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            // Botón Volver a la lista
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            const btnCancelar = document.getElementById('cancelarBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Botón Crear Tarea
            const btnCrear = document.getElementById('crearTareaBtn');
            if (btnCrear) {
                btnCrear.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('formTareaPersonal');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Botón Agregar Item
            const btnAgregarItem = document.getElementById('btnAgregarItem');
            if (btnAgregarItem) {
                btnAgregarItem.addEventListener('click', () => this._agregarItem());
            }

            console.log('✅ Eventos configurados');

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // ========== GESTIÓN DE ITEMS ==========
    _agregarItem() {
        const itemsList = document.getElementById('itemsList');
        const placeholder = document.getElementById('itemsPlaceholder');

        if (placeholder) {
            placeholder.style.display = 'none';
        }

        this.itemCounter++;
        const itemId = `item_${Date.now()}_${this.itemCounter}`;

        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.dataset.itemId = itemId;

        itemRow.innerHTML = `
            <div class="item-number">${this.itemCounter}</div>
            <input type="text" class="item-input" placeholder="Ej: Revisar inventario" maxlength="200">
            <div class="item-actions">
                <button type="button" class="btn-item-action delete" title="Eliminar item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Evento para eliminar
        const deleteBtn = itemRow.querySelector('.delete');
        deleteBtn.addEventListener('click', () => {
            itemRow.remove();
            this._reordenarItems();
            this._mostrarPlaceholderSiEsNecesario();
        });

        itemsList.appendChild(itemRow);

        // Enfocar el input
        const input = itemRow.querySelector('.item-input');
        setTimeout(() => input.focus(), 100);
    }

    _reordenarItems() {
        const items = document.querySelectorAll('.item-row');
        this.itemCounter = 0;

        items.forEach((item, index) => {
            this.itemCounter++;
            const numberDiv = item.querySelector('.item-number');
            if (numberDiv) {
                numberDiv.textContent = this.itemCounter;
            }
        });
    }

    _mostrarPlaceholderSiEsNecesario() {
        const items = document.querySelectorAll('.item-row');
        const placeholder = document.getElementById('itemsPlaceholder');

        if (placeholder) {
            placeholder.style.display = items.length === 0 ? 'block' : 'none';
        }
    }

    _obtenerItems() {
        const items = [];
        const itemRows = document.querySelectorAll('.item-row');

        itemRows.forEach(row => {
            const input = row.querySelector('.item-input');
            const texto = input.value.trim();
            if (texto) {
                items.push(texto);
            }
        });

        return items;
    }

    // ========== VALIDACIÓN Y GUARDADO ==========
    _validarYGuardar() {
        // Validar nombre de actividad
        const nombreInput = document.getElementById('nombreActividad');
        const nombre = nombreInput.value.trim();

        if (!nombre) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError('El nombre de la actividad es requerido');
            return;
        }
        nombreInput.classList.remove('is-invalid');

        // Validar que haya al menos un item
        const items = this._obtenerItems();
        if (items.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin items',
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
                    this._guardarTarea(nombre, items);
                }
            });
            return;
        }

        // Si todo está bien, guardar tarea
        this._guardarTarea(nombre, items);
    }

    async _guardarTarea(nombre, items) {
        const btnCrear = document.getElementById('crearTareaBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Tarea';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            const descripcion = document.getElementById('descripcion').value.trim();

            // Crear objeto de datos de la tarea (solo lo esencial)
            const tareaData = {
                nombreActividad: nombre,
                descripcion: descripcion,
                items: items,
                tipo: 'personal'
            };

            console.log('📝 Guardando tarea personal:', tareaData);

            // Usar TareaManager para crear la tarea
            const nuevaTarea = await this.tareaManager.crearTarea(tareaData, this.usuarioActual);

            console.log('✅ Tarea personal creada:', nuevaTarea);

            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Tarea creada!',
                html: `
                    <div style="text-align: left; color: var(--color-text-primary);">
                        <p><strong>Tarea:</strong> ${nombre}</p>
                        <p><strong>Items:</strong> ${items.length}</p>
                    </div>
                `,
                confirmButtonText: 'Ver mis tareas',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#2f8cff'
            });

            this._volverALista();

        } catch (error) {
            console.error('❌ Error guardando tarea:', error);

            let mensajeError = error.message || 'No se pudo crear la tarea';

            if (mensajeError.includes('organización')) {
                mensajeError = 'Error con la organización del usuario';
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

    // ========== UTILIDADES ==========
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

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando controller de tarea personal...');
    new CrearTareaPersonalController();
});