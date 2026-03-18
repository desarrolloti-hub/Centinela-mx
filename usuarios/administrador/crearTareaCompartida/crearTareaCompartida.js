// crearTareaCompartida.js - VERSIÓN CORREGIDA CON IMPORTACIÓN
// AHORA IMPORTA CORRECTAMENTE LA CLASE UserManager

// =============================================
// IMPORTACIONES
// =============================================
import { UserManager } from '/clases/user.js';

// =============================================
// CLASE PRINCIPAL - CrearTareaCompartidaController
// =============================================
class CrearTareaCompartidaController {
    constructor() {
        this.tareaManager = null;
        this.userManager = null;
        this.usuarioActual = null;

        // Cache de usuarios
        this.usuarios = [];
        this.usuariosFiltrados = [];

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
            console.log('🚀 Inicializando CrearTareaCompartidaController...');

            // 1. Inicializar UserManager primero
            this.userManager = new UserManager();
            console.log('✅ UserManager inicializado');

            // 2. Obtener usuario actual
            await this._obtenerUsuarioActual();

            // 3. Si no hay usuario, redirigir
            if (!this.usuarioActual) {
                this._redirigirAlLogin();
                return;
            }

            console.log('👤 Usuario actual:', this.usuarioActual.nombreCompleto);

            // 4. Cargar TareaManager
            await this._cargarTareaManager();

            // 5. Cargar usuarios
            await this._cargarUsuarios();

            // 6. Configurar eventos
            this._configurarEventos();

            // 7. Configurar organización automática
            this._configurarOrganizacion();

            // 8. Configurar contadores de caracteres
            this._configurarContadores();

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ========== OBTENER USUARIO ACTUAL ==========
    async _obtenerUsuarioActual() {
        // Esperar a que UserManager cargue el usuario
        for (let i = 0; i < 30; i++) {
            if (this.userManager.currentUser) {
                this.usuarioActual = this.userManager.currentUser;
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Si no hay usuario en UserManager, intentar con localStorage
        return this._cargarUsuarioLocalStorage();
    }

    // ========== CARGA DE USUARIO DESDE LOCALSTORAGE (FALLBACK) ==========
    _cargarUsuarioLocalStorage() {
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

            console.warn('⚠️ No se encontró usuario en localStorage');
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

    // ========== CARGA DE USUARIOS USANDO USERMANAGER ==========
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

            // Usar UserManager para obtener colaboradores
            const colaboradores = await this.userManager.getColaboradoresByOrganizacion(
                this.usuarioActual.organizacionCamelCase,
                true // incluir inactivos
            );

            console.log(`📊 ${colaboradores.length} colaboradores encontrados`);

            // También obtener administradores
            const administradores = await this.userManager.getAdministradores(true);
            console.log(`📊 ${administradores.length} administradores encontrados`);

            // Filtrar administradores de la misma organización
            const adminsFiltrados = administradores.filter(admin =>
                admin.organizacionCamelCase === this.usuarioActual.organizacionCamelCase &&
                admin.id !== this.usuarioActual.id // Excluir al usuario actual
            );

            console.log(`📊 ${adminsFiltrados.length} administradores filtrados`);

            // Combinar y filtrar
            this.usuarios = [
                ...colaboradores.filter(u => u.id !== this.usuarioActual.id),
                ...adminsFiltrados
            ];

            console.log(`✅ Total usuarios disponibles: ${this.usuarios.length}`);

            this.usuariosFiltrados = [...this.usuarios];

            // Renderizar usuarios
            this._renderizarUsuarios();

        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);

            // Mostrar error en el contenedor
            const usuariosContainer = document.getElementById('usuariosContainer');
            if (usuariosContainer) {
                usuariosContainer.innerHTML = `
                    <div class="loading-users" style="color: var(--color-danger);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error cargando usuarios: ${error.message}</p>
                        <button class="btn-accion-rapida" onclick="location.reload()">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </div>
                `;
            }

            // Usar datos de ejemplo si falla la carga
            this._cargarUsuariosEjemplo();
        }
    }

    _cargarUsuariosEjemplo() {
        console.log('📝 Usando datos de ejemplo para usuarios');

        // Datos de ejemplo para desarrollo
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

        // Mostrar advertencia
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
                    <input type="checkbox" class="usuario-checkbox" id="usuario_${usuario.id}" 
                           value="${usuario.id}">
                    <div class="usuario-avatar" style="border-color: ${rolColor};">
                        ${iniciales}
                    </div>
                    <div class="usuario-info">
                        <span class="usuario-nombre">${usuario.nombreCompleto || 'Usuario'}</span>
                        <span class="usuario-correo">${usuario.correoElectronico || usuario.correo || 'Sin correo'}</span>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
                            <span class="usuario-area">${areaNombre}</span>
                            <span class="usuario-rol" style="color: ${rolColor}; font-size: 11px; font-weight: 600;">
                                <i class="fas ${usuario.rol === 'administrador' ? 'fa-crown' : 'fa-user'}"></i>
                                ${rol}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Agregar eventos a los checkboxes
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
        return nombre
            .split(' ')
            .map(p => p[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
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
            const form = document.getElementById('formTareaCompartida');
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

            // Búsqueda de usuarios
            const buscarInput = document.getElementById('buscarUsuarios');
            if (buscarInput) {
                buscarInput.addEventListener('input', (e) => {
                    this._filtrarUsuarios(e.target.value);
                });
            }

            // Acciones rápidas usuarios
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
        this._restaurarSeleccion();
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

    _restaurarSeleccion() {
        this._actualizarContadorUsuarios();
    }

    _obtenerUsuariosSeleccionados() {
        const usuariosIds = [];
        const checkboxes = document.querySelectorAll('.usuario-checkbox:checked');

        checkboxes.forEach(checkbox => {
            usuariosIds.push(checkbox.value);
        });

        return usuariosIds;
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

        // Validar que haya al menos un usuario seleccionado
        const usuariosSeleccionados = this._obtenerUsuariosSeleccionados();
        if (usuariosSeleccionados.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin usuarios',
                text: 'No has seleccionado ningún usuario para compartir. ¿Deseas crear una tarea personal?',
                showCancelButton: true,
                confirmButtonText: 'Sí, crear personal',
                cancelButtonText: 'Seleccionar usuarios',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    this._guardarTarea(nombre, items, true); // true = personal
                }
            });
            return;
        }

        // Si todo está bien, guardar tarea compartida
        this._guardarTarea(nombre, items, false, usuariosSeleccionados);
    }

    async _guardarTarea(nombre, items, esPersonal = false, usuariosSeleccionados = []) {
        const btnCrear = document.getElementById('crearTareaBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Tarea';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            const descripcion = document.getElementById('descripcion').value.trim();

            // Crear objeto de datos de la tarea
            const tareaData = {
                nombreActividad: nombre,
                descripcion: descripcion,
                items: items,
                tipo: esPersonal ? 'personal' : 'compartida',
                usuariosCompartidosIds: esPersonal ? [] : usuariosSeleccionados
            };

            console.log('📝 Guardando tarea:', tareaData);

            // Usar TareaManager para crear la tarea
            const nuevaTarea = await this.tareaManager.crearTarea(tareaData, this.usuarioActual);

            console.log('✅ Tarea creada:', nuevaTarea);

            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Tarea creada!',
                html: `
                    <div style="text-align: left; color: var(--color-text-primary);">
                        <p><strong>Tarea:</strong> ${nombre}</p>
                        <p><strong>Tipo:</strong> ${esPersonal ? 'Personal' : 'Compartida'}</p>
                        <p><strong>Items:</strong> ${items.length}</p>
                        ${!esPersonal ? `<p><strong>Compartida con:</strong> ${usuariosSeleccionados.length} usuario(s)</p>` : ''}
                    </div>
                `,
                confirmButtonText: 'Ver tareas',
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
    console.log('📄 DOM cargado, iniciando controller...');
    new CrearTareaCompartidaController();
});