// crearTareaCompartida.js - VERSIÓN MEJORADA CON CHECKLIST Y RECORDATORIOS
// Integración con la clase Tarea mejorada

import { UserManager } from '/clases/user.js';

class CrearTareaCompartidaController {
    constructor() {
        this.tareaManager = null;
        this.userManager = null;
        this.usuarioActual = null;

        // Cache de usuarios
        this.usuarios = [];
        this.usuariosFiltrados = [];

        // Items del checklist
        this.items = [];

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            console.log('🚀 Inicializando CrearTareaCompartidaController (versión mejorada)...');

            this.userManager = new UserManager();
            console.log('✅ UserManager inicializado');

            await this._obtenerUsuarioActual();

            if (!this.usuarioActual) {
                this._redirigirAlLogin();
                return;
            }

            console.log('👤 Usuario actual:', this.usuarioActual.nombreCompleto);

            await this._cargarTareaManager();
            await this._cargarUsuarios();
            this._configurarEventos();
            this._configurarOrganizacion();
            this._configurarContadores();
            this._configurarFechaRecordatorio();
            this._configurarItemsChecklist();

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ========== OBTENER USUARIO ACTUAL ==========
    async _obtenerUsuarioActual() {
        for (let i = 0; i < 30; i++) {
            if (this.userManager.currentUser) {
                this.usuarioActual = this.userManager.currentUser;
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return this._cargarUsuarioLocalStorage();
    }

    // ========== CARGA DE USUARIO DESDE LOCALSTORAGE ==========
    _cargarUsuarioLocalStorage() {
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

            return false;

        } catch (error) {
            console.error('Error cargando usuario de localStorage:', error);
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

    // ========== CARGA DE USUARIOS ==========
    async _cargarUsuarios() {
        try {
            const usuariosContainer = document.getElementById('usuariosContainer');
            if (usuariosContainer) {
                usuariosContainer.innerHTML = `
                    <div class="loading-users">
                        <i class="fas fa-spinner fa-spin"></i> Cargando usuarios...
                    </div>
                `;
            }

            if (!this.usuarioActual?.organizacionCamelCase) {
                throw new Error('No hay organización definida');
            }

            console.log('📦 Cargando usuarios para organización:', this.usuarioActual.organizacionCamelCase);

            const colaboradores = await this.userManager.getColaboradoresByOrganizacion(
                this.usuarioActual.organizacionCamelCase,
                true
            );

            const administradores = await this.userManager.getAdministradores(true);

            const adminsFiltrados = administradores.filter(admin =>
                admin.organizacionCamelCase === this.usuarioActual.organizacionCamelCase &&
                admin.id !== this.usuarioActual.id
            );

            this.usuarios = [
                ...colaboradores.filter(u => u.id !== this.usuarioActual.id),
                ...adminsFiltrados
            ];

            this.usuariosFiltrados = [...this.usuarios];
            this._renderizarUsuarios();

        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this._cargarUsuariosEjemplo();
        }
    }

    _cargarUsuariosEjemplo() {
        console.log('📝 Usando datos de ejemplo para usuarios');

        this.usuarios = [
            {
                id: 'user1',
                nombreCompleto: 'Juan Pérez',
                correoElectronico: 'juan@ejemplo.com',
                areaAsignadaNombre: 'Seguridad',
                rol: 'colaborador'
            },
            {
                id: 'user2',
                nombreCompleto: 'María García',
                correoElectronico: 'maria@ejemplo.com',
                areaAsignadaNombre: 'Operaciones',
                rol: 'colaborador'
            },
            {
                id: 'user3',
                nombreCompleto: 'Carlos López',
                correoElectronico: 'carlos@ejemplo.com',
                areaAsignadaNombre: 'Mantenimiento',
                rol: 'colaborador'
            },
            {
                id: 'user4',
                nombreCompleto: 'Ana Martínez',
                correoElectronico: 'ana@ejemplo.com',
                areaAsignadaNombre: 'Administración',
                rol: 'administrador'
            }
        ];

        this.usuariosFiltrados = [...this.usuarios];
        this._renderizarUsuarios();

        Swal.fire({
            icon: 'warning',
            title: 'Modo de desarrollo',
            text: 'Usando datos de ejemplo. Los usuarios no se cargaron de Firebase.',
            timer: 3000,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }

    _renderizarUsuarios() {
        const container = document.getElementById('usuariosContainer');
        if (!container) return;

        if (!this.usuariosFiltrados || this.usuariosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="loading-users">
                    <i class="fas fa-users-slash"></i>
                    <p>No hay usuarios disponibles</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.usuariosFiltrados.forEach(usuario => {
            const iniciales = this._obtenerIniciales(usuario.nombreCompleto || 'Usuario');
            const areaNombre = usuario.areaAsignadaNombre || usuario.area || 'Sin área';
            const rol = usuario.rol === 'administrador' ? 'Admin' : 'Colaborador';
            const rolColor = usuario.rol === 'administrador' ? '#ffc107' : 'var(--color-accent-primary)';

            html += `
                <div class="usuario-item" data-usuario-id="${usuario.id}">
                    <input type="checkbox" class="usuario-checkbox" value="${usuario.id}">
                    <div class="usuario-avatar" style="border-color: ${rolColor};">${iniciales}</div>
                    <div class="usuario-info">
                        <span class="usuario-nombre">${usuario.nombreCompleto || 'Usuario'}</span>
                        <span class="usuario-correo">${usuario.correoElectronico || usuario.correo || 'Sin correo'}</span>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                            <span class="usuario-area">${areaNombre}</span>
                            <span class="usuario-rol" style="color: ${rolColor}; font-size: 11px;">
                                <i class="fas ${usuario.rol === 'administrador' ? 'fa-crown' : 'fa-user'}"></i> ${rol}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.usuario-item').forEach(item => {
            const checkbox = item.querySelector('.usuario-checkbox');
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this._actualizarEstiloUsuario(item, checkbox.checked);
                }
                this._actualizarContadorUsuarios();
            });

            checkbox.addEventListener('change', (e) => {
                this._actualizarEstiloUsuario(item, e.target.checked);
                this._actualizarContadorUsuarios();
            });
        });

        this._actualizarContadorUsuarios();
    }

    _obtenerIniciales(nombre) {
        if (!nombre) return 'U';
        return nombre.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
    }

    _actualizarEstiloUsuario(item, seleccionado) {
        if (seleccionado) {
            item.classList.add('seleccionado');
        } else {
            item.classList.remove('seleccionado');
        }
    }

    _actualizarContadorUsuarios() {
        const checkboxes = document.querySelectorAll('.usuario-checkbox:checked');
        const countSpan = document.getElementById('selectedUsersCount');
        if (countSpan) {
            countSpan.textContent = checkboxes.length;
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

            // Establecer fecha por defecto (hoy + 7 días)
            const fechaDefault = new Date();
            fechaDefault.setDate(fechaDefault.getDate() + 7);
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

    // ========== CONFIGURACIÓN ==========
    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput && this.usuarioActual) {
            orgInput.value = this.usuarioActual.organizacion || 'Sin organización';
        }
    }

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

            const form = document.getElementById('formTareaCompartida');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            const buscarInput = document.getElementById('buscarUsuarios');
            if (buscarInput) {
                buscarInput.addEventListener('input', (e) => {
                    this._filtrarUsuarios(e.target.value);
                });
            }

            const btnSeleccionarTodos = document.getElementById('seleccionarTodosUsuarios');
            const btnDeseleccionarTodos = document.getElementById('deseleccionarTodosUsuarios');

            if (btnSeleccionarTodos) {
                btnSeleccionarTodos.addEventListener('click', () => this._seleccionarTodosUsuarios(true));
            }

            if (btnDeseleccionarTodos) {
                btnDeseleccionarTodos.addEventListener('click', () => this._seleccionarTodosUsuarios(false));
            }

            console.log('✅ Eventos configurados');

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // ========== GESTIÓN DE USUARIOS ==========
    _filtrarUsuarios(termino) {
        if (!termino.trim()) {
            this.usuariosFiltrados = [...this.usuarios];
        } else {
            const terminoLower = termino.toLowerCase();
            this.usuariosFiltrados = this.usuarios.filter(usuario => {
                const nombre = (usuario.nombreCompleto || '').toLowerCase();
                const correo = (usuario.correoElectronico || usuario.correo || '').toLowerCase();
                return nombre.includes(terminoLower) || correo.includes(terminoLower);
            });
        }

        this._renderizarUsuarios();
    }

    _seleccionarTodosUsuarios(seleccionar) {
        const checkboxes = document.querySelectorAll('.usuario-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = seleccionar;
            const item = checkbox.closest('.usuario-item');
            if (item) {
                this._actualizarEstiloUsuario(item, seleccionar);
            }
        });
        this._actualizarContadorUsuarios();
    }

    _obtenerUsuariosSeleccionados() {
        const usuariosIds = [];
        document.querySelectorAll('.usuario-checkbox:checked').forEach(checkbox => {
            usuariosIds.push(checkbox.value);
        });
        return usuariosIds;
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

        const usuariosSeleccionados = this._obtenerUsuariosSeleccionados();
        const esPersonal = usuariosSeleccionados.length === 0;

        if (esPersonal && this.items.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Tarea vacía',
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
                    this._guardarTarea(nombre, esPersonal, usuariosSeleccionados);
                }
            });
        } else {
            this._guardarTarea(nombre, esPersonal, usuariosSeleccionados);
        }
    }

    async _guardarTarea(nombre, esPersonal = false, usuariosSeleccionados = []) {
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
                tipo: esPersonal ? 'personal' : 'compartida',
                usuariosCompartidosIds: esPersonal ? [] : usuariosSeleccionados,
                fechaLimite: fechaLimite,
                tieneRecordatorio: tieneRecordatorioCheck?.checked || false
            };

            console.log('📝 Guardando tarea:', tareaData);

            const nuevaTarea = await this.tareaManager.crearTarea(tareaData, this.usuarioActual);

            console.log('✅ Tarea creada:', nuevaTarea);

            // Mostrar resumen detallado
            let resumenHTML = `
                <div style="text-align: left; color: var(--color-text-primary);">
                    <p><strong>Tarea:</strong> ${nombre}</p>
                    <p><strong>Tipo:</strong> ${esPersonal ? 'Personal' : 'Compartida'}</p>
                    <p><strong>Creado por:</strong> ${this.usuarioActual.nombreCompleto}</p>
            `;

            if (!esPersonal) {
                resumenHTML += `<p><strong>Compartida con:</strong> ${usuariosSeleccionados.length} usuario(s)</p>`;
            }

            if (fechaLimite) {
                resumenHTML += `<p><strong>Fecha límite:</strong> ${fechaLimite.toLocaleDateString('es-MX')}</p>`;
            }

            resumenHTML += `<p><strong>Items en checklist:</strong> ${this.items.length}</p>`;
            resumenHTML += `</div>`;

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: '¡Tarea creada exitosamente!',
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

    // ========== NAVEGACIÓN Y UTILIDADES ==========
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
    console.log('📄 DOM cargado, iniciando controller de tarea compartida (versión mejorada)...');
    new CrearTareaCompartidaController();
});