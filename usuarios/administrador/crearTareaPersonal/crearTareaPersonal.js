// crearTareaUnificado.js - VERSIÓN UNIFICADA
// Integra todos los tipos de tareas en un solo formulario

import { UserManager } from '/clases/user.js';
import { AreaManager } from '/clases/area.js';

class CrearTareaUnificadoController {
    constructor() {
        this.tareaManager = null;
        this.userManager = null;
        this.areaManager = null;
        this.usuarioActual = null;

        // Tipo de tarea seleccionado
        this.tipoSeleccionado = 'personal'; // personal, compartida, area, general

        // Cache de usuarios
        this.usuarios = [];
        this.usuariosFiltrados = [];

        // Cache de áreas
        this.areas = [];
        this.areasFiltradas = [];

        // Cache de cargos
        this.cargos = [];
        this.cargosFiltrados = [];

        // Área seleccionada
        this.areaSeleccionada = null;

        // Items del checklist
        this.items = [];

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            console.log('🚀 Inicializando CrearTareaUnificadoController...');

            // 1. Cargar usuario
            await this._cargarUsuario();

            // 2. Si no hay usuario, redirigir
            if (!this.usuarioActual) {
                this._redirigirAlLogin();
                return;
            }

            console.log('👤 Usuario actual:', this.usuarioActual.nombreCompleto);

            // 3. Inicializar managers
            await this._cargarManagers();

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

            // 9. Seleccionar tipo por defecto (personal)
            this._seleccionarTipo('personal');

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ========== CARGA DE MANAGERS ==========
    async _cargarManagers() {
        try {
            // Cargar TareaManager
            const { TareaManager } = await import('/clases/tarea.js');
            this.tareaManager = new TareaManager();

            // Inicializar otros managers
            this.userManager = new UserManager();
            this.areaManager = new AreaManager();

            console.log('✅ Managers inicializados');
        } catch (error) {
            console.error('Error cargando managers:', error);
            throw new Error('No se pudieron cargar los módulos necesarios');
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

            // Establecer fecha por defecto según el tipo
            this._actualizarFechaPorDefecto();
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

    _actualizarFechaPorDefecto() {
        const fechaInput = document.getElementById('fechaLimite');
        if (!fechaInput) return;

        const fechaDefault = new Date();

        switch (this.tipoSeleccionado) {
            case 'general':
                fechaDefault.setDate(fechaDefault.getDate() + 30); // 30 días para generales
                break;
            case 'area':
                fechaDefault.setDate(fechaDefault.getDate() + 14); // 14 días para áreas
                break;
            default:
                fechaDefault.setDate(fechaDefault.getDate() + 7); // 7 días para personales/compartidas
        }

        fechaInput.value = fechaDefault.toISOString().split('T')[0];
    }

    // ========== SELECCIÓN DE TIPO DE TAREA ==========
    _seleccionarTipo(tipo) {
        this.tipoSeleccionado = tipo;

        // Actualizar clases de las tarjetas
        document.querySelectorAll('.tipo-tarea-card').forEach(card => {
            card.classList.remove('seleccionado');
        });
        document.getElementById(`tipo${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).classList.add('seleccionado');

        // Actualizar título y descripción
        this._actualizarHeader(tipo);

        // Ocultar todas las secciones específicas
        document.getElementById('prioridadContainer').style.display = 'none';
        document.getElementById('compartirSection').style.display = 'none';
        document.getElementById('areaSection').style.display = 'none';
        document.getElementById('generalSection').style.display = 'none';

        // Mostrar secciones según el tipo
        switch (tipo) {
            case 'personal':
                document.getElementById('prioridadContainer').style.display = 'block';
                this._actualizarInfoPersonal();
                break;
            case 'compartida':
                document.getElementById('compartirSection').style.display = 'block';
                this._cargarUsuarios();
                this._actualizarInfoCompartida();
                break;
            case 'area':
                document.getElementById('areaSection').style.display = 'block';
                this._cargarAreas();
                this._actualizarInfoArea();
                break;
            case 'general':
                document.getElementById('generalSection').style.display = 'block';
                this._actualizarInfoGeneral();
                break;
        }

        // Actualizar fecha por defecto
        this._actualizarFechaPorDefecto();
    }

    _actualizarHeader(tipo) {
        const titulos = {
            'personal': {
                titulo: 'Crear Tarea Personal',
                icono: 'fa-user',
                desc: 'Crea tus propias tareas y checklists personales'
            },
            'compartida': {
                titulo: 'Crear Tarea Compartida',
                icono: 'fa-share-alt',
                desc: 'Crea checklists colaborativos y compártelos con otros usuarios'
            },
            'area': {
                titulo: 'Crear Tarea por Área',
                icono: 'fa-building',
                desc: 'Crea checklists asignados a áreas específicas'
            },
            'general': {
                titulo: 'Crear Tarea General',
                icono: 'fa-globe',
                desc: 'Crea checklists visibles para toda la organización'
            }
        };

        const data = titulos[tipo];
        document.getElementById('mainTitle').innerHTML = `<i class="fas ${data.icono}"></i> ${data.titulo}`;
        document.getElementById('headerDescription').innerHTML = `
            <i class="fas fa-quote-left"></i>
            ${data.desc}
            <i class="fas fa-quote-right"></i>
        `;
        document.getElementById('formTitleIcon').className = `fas ${data.icono}`;
        document.getElementById('formTitle').textContent = data.titulo;
    }

    _actualizarInfoPersonal() {
        const infoList = document.getElementById('infoList');
        infoList.innerHTML = `
            <li>Esta tarea será visible <strong>solo para ti</strong></li>
            <li>Nadie más podrá verla o modificarla</li>
            <li>Puedes agregar múltiples items a tu checklist</li>
            <li>Activa recordatorios para no olvidar fechas importantes</li>
        `;
    }

    _actualizarInfoCompartida() {
        const infoList = document.getElementById('infoList');
        infoList.innerHTML = `
            <li>Los usuarios seleccionados podrán ver y marcar items de esta tarea</li>
            <li>Si no seleccionas usuarios, la tarea será personal (solo visible para ti)</li>
            <li>Solo el creador (tú) puede editar o eliminar la tarea</li>
            <li>Si activas recordatorio, los usuarios verán una alerta cuando se acerque la fecha</li>
        `;
    }

    _actualizarInfoArea() {
        const infoList = document.getElementById('infoList');
        infoList.innerHTML = `
            <li>Los usuarios del área seleccionada podrán ver y marcar items de esta tarea</li>
            <li>Solo el creador (tú) puede editar o eliminar la tarea</li>
            <li>Si activas recordatorio, los usuarios verán una alerta cuando se acerque la fecha</li>
            <li>Los items del checklist pueden marcarse como completados individualmente</li>
        `;
    }

    _actualizarInfoGeneral() {
        const infoList = document.getElementById('infoList');
        infoList.innerHTML = `
            <li>Todos los usuarios de la organización podrán ver y marcar items de esta tarea</li>
            <li>Solo el creador (tú) puede editar o eliminar la tarea</li>
            <li>Si activas recordatorio, todos los usuarios verán una alerta cuando se acerque la fecha</li>
            <li>Las tareas generales son ideales para anuncios, políticas y procedimientos</li>
        `;
    }

    // ========== CARGA DE USUARIOS (para compartidas) ==========
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

    _obtenerUsuariosSeleccionados() {
        const usuariosIds = [];
        document.querySelectorAll('.usuario-checkbox:checked').forEach(checkbox => {
            usuariosIds.push(checkbox.value);
        });
        return usuariosIds;
    }

    // ========== CARGA DE ÁREAS (para tareas por área) ==========
    async _cargarAreas() {
        try {
            const areasContainer = document.getElementById('areasContainer');
            if (areasContainer) {
                areasContainer.innerHTML = `
                    <div class="loading-areas">
                        <i class="fas fa-spinner fa-spin"></i> Cargando áreas...
                    </div>
                `;
            }

            if (!this.usuarioActual?.organizacionCamelCase) {
                throw new Error('No hay organización definida');
            }

            console.log('📦 Cargando áreas para organización:', this.usuarioActual.organizacionCamelCase);

            this.areas = await this.areaManager.getAreasByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            this.areas = this.areas.filter(area => area.estado === 'activa');
            this.areasFiltradas = [...this.areas];
            this._renderizarAreas();

        } catch (error) {
            console.error('❌ Error cargando áreas:', error);
            this._cargarAreasEjemplo();
        }
    }

    _cargarAreasEjemplo() {
        console.log('📝 Usando datos de ejemplo para áreas');

        this.areas = [
            {
                id: 'area1',
                nombreArea: 'Seguridad',
                descripcion: 'Área encargada de la seguridad',
                cargos: {
                    'cargo1': {
                        id: 'cargo1',
                        nombre: 'Supervisor de Seguridad',
                        descripcion: 'Supervisa operaciones',
                        estado: 'activo'
                    },
                    'cargo2': {
                        id: 'cargo2',
                        nombre: 'Guardia',
                        descripcion: 'Vigilancia',
                        estado: 'activo'
                    }
                },
                estado: 'activa'
            },
            {
                id: 'area2',
                nombreArea: 'Operaciones',
                descripcion: 'Área de operaciones diarias',
                cargos: {
                    'cargo3': {
                        id: 'cargo3',
                        nombre: 'Coordinador',
                        descripcion: 'Coordina actividades',
                        estado: 'activo'
                    },
                    'cargo4': {
                        id: 'cargo4',
                        nombre: 'Operador',
                        descripcion: 'Ejecuta tareas',
                        estado: 'activo'
                    }
                },
                estado: 'activa'
            },
            {
                id: 'area3',
                nombreArea: 'Mantenimiento',
                descripcion: 'Mantenimiento general',
                cargos: {
                    'cargo5': {
                        id: 'cargo5',
                        nombre: 'Técnico',
                        descripcion: 'Reparaciones',
                        estado: 'activo'
                    }
                },
                estado: 'activa'
            }
        ];

        this.areasFiltradas = [...this.areas];
        this._renderizarAreas();

        Swal.fire({
            icon: 'warning',
            title: 'Modo de desarrollo',
            text: 'Usando datos de ejemplo. Las áreas no se cargaron de Firebase.',
            timer: 3000,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }

    _renderizarAreas() {
        const container = document.getElementById('areasContainer');
        if (!container) return;

        if (!this.areasFiltradas || this.areasFiltradas.length === 0) {
            container.innerHTML = `
                <div class="loading-areas">
                    <i class="fas fa-building-slash"></i>
                    <p>No hay áreas activas disponibles</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.areasFiltradas.forEach(area => {
            const iniciales = this._obtenerIniciales(area.nombreArea || 'Área');
            const totalCargos = area.cargos ? Object.keys(area.cargos).length : 0;

            html += `
                <div class="area-item" data-area-id="${area.id}">
                    <input type="radio" class="area-radio" name="areaSeleccionada" value="${area.id}">
                    <div class="area-icon">${iniciales}</div>
                    <div class="area-info">
                        <span class="area-nombre">${area.nombreArea || 'Área'}</span>
                        <span class="area-descripcion">${area.descripcion || 'Sin descripción'}</span>
                        <span class="area-badge">${totalCargos} cargos</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.area-item').forEach(item => {
            const radio = item.querySelector('.area-radio');

            item.addEventListener('click', (e) => {
                if (e.target !== radio) {
                    radio.checked = true;
                    this._seleccionarArea(item.dataset.areaId);
                }
            });

            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this._seleccionarArea(item.dataset.areaId);
                }
            });
        });
    }

    _obtenerIniciales(nombre) {
        if (!nombre) return 'A';
        return nombre.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
    }

    // ========== SELECCIÓN DE ÁREA Y CARGOS ==========
    async _seleccionarArea(areaId) {
        document.querySelectorAll('.area-item').forEach(item => {
            if (item.dataset.areaId === areaId) {
                item.classList.add('seleccionado');
            } else {
                item.classList.remove('seleccionado');
            }
        });

        this.areaSeleccionada = this.areas.find(a => a.id === areaId);

        const selectedAreaText = document.getElementById('selectedAreaText');
        if (selectedAreaText && this.areaSeleccionada) {
            selectedAreaText.textContent = `Área: ${this.areaSeleccionada.nombreArea}`;
        }

        await this._cargarCargos(areaId);
    }

    async _cargarCargos(areaId) {
        try {
            const area = this.areas.find(a => a.id === areaId);
            if (!area) return;

            let cargos = [];
            if (area.cargos) {
                if (typeof area.cargos === 'object') {
                    cargos = Object.entries(area.cargos)
                        .filter(([_, cargo]) => cargo.estado !== 'inactivo')
                        .map(([id, cargo]) => ({ id, ...cargo }));
                }
            }

            this.cargos = cargos;
            this.cargosFiltrados = [...cargos];

            const cargosSection = document.getElementById('cargosSection');
            const cargosAcciones = document.getElementById('cargosAcciones');

            if (cargos.length > 0) {
                cargosSection.style.display = 'block';
                cargosAcciones.style.display = 'block';
                this._renderizarCargos();
            } else {
                cargosSection.style.display = 'none';
                cargosAcciones.style.display = 'none';

                const selectedCargosText = document.getElementById('selectedCargosText');
                if (selectedCargosText) {
                    selectedCargosText.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Error cargando cargos:', error);
        }
    }

    _renderizarCargos() {
        const container = document.getElementById('cargosContainer');
        if (!container) return;

        if (!this.cargosFiltrados || this.cargosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="loading-cargos">
                    <i class="fas fa-users-slash"></i>
                    <p>No hay cargos activos en esta área</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.cargosFiltrados.forEach(cargo => {
            html += `
                <div class="cargo-item" data-cargo-id="${cargo.id}">
                    <input type="checkbox" class="cargo-checkbox" value="${cargo.id}">
                    <div class="cargo-icon"><i class="fas fa-user-tie"></i></div>
                    <div class="cargo-info">
                        <span class="cargo-nombre">${cargo.nombre || 'Cargo'}</span>
                        <span class="cargo-descripcion">${cargo.descripcion || 'Sin descripción'}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.cargo-item').forEach(item => {
            const checkbox = item.querySelector('.cargo-checkbox');

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this._actualizarEstiloCargo(item, checkbox.checked);
                }
                this._actualizarContadorCargos();
            });

            checkbox.addEventListener('change', (e) => {
                this._actualizarEstiloCargo(item, e.target.checked);
                this._actualizarContadorCargos();
            });
        });

        this._actualizarContadorCargos();
    }

    _actualizarEstiloCargo(item, seleccionado) {
        if (seleccionado) {
            item.classList.add('seleccionado');
        } else {
            item.classList.remove('seleccionado');
        }
    }

    _actualizarContadorCargos() {
        const checkboxes = document.querySelectorAll('.cargo-checkbox:checked');
        const selectedCargosText = document.getElementById('selectedCargosText');
        const countSpan = document.getElementById('selectedCargosCount');

        if (selectedCargosText && countSpan) {
            if (checkboxes.length > 0) {
                countSpan.textContent = checkboxes.length;
                selectedCargosText.style.display = 'flex';
            } else {
                selectedCargosText.style.display = 'none';
            }
        }
    }

    _obtenerCargosSeleccionados() {
        const cargosIds = [];
        document.querySelectorAll('.cargo-checkbox:checked').forEach(checkbox => {
            cargosIds.push(checkbox.value);
        });
        return cargosIds;
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            // Eventos para selección de tipo
            document.getElementById('tipoPersonal').addEventListener('click', () => this._seleccionarTipo('personal'));
            document.getElementById('tipoCompartida').addEventListener('click', () => this._seleccionarTipo('compartida'));
            document.getElementById('tipoArea').addEventListener('click', () => this._seleccionarTipo('area'));
            document.getElementById('tipoGeneral').addEventListener('click', () => this._seleccionarTipo('general'));

            // Eventos de navegación
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            const btnCancelar = document.getElementById('cancelarBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Evento de creación
            const btnCrear = document.getElementById('crearTareaBtn');
            if (btnCrear) {
                btnCrear.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            const form = document.getElementById('formTarea');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Eventos de búsqueda
            const buscarUsuarios = document.getElementById('buscarUsuarios');
            if (buscarUsuarios) {
                buscarUsuarios.addEventListener('input', (e) => {
                    this._filtrarUsuarios(e.target.value);
                });
            }

            const buscarAreas = document.getElementById('buscarAreas');
            if (buscarAreas) {
                buscarAreas.addEventListener('input', (e) => {
                    this._filtrarAreas(e.target.value);
                });
            }

            // Eventos de acciones rápidas
            const btnSeleccionarTodos = document.getElementById('seleccionarTodosUsuarios');
            const btnDeseleccionarTodos = document.getElementById('deseleccionarTodosUsuarios');

            if (btnSeleccionarTodos) {
                btnSeleccionarTodos.addEventListener('click', () => this._seleccionarTodosUsuarios(true));
            }

            if (btnDeseleccionarTodos) {
                btnDeseleccionarTodos.addEventListener('click', () => this._seleccionarTodosUsuarios(false));
            }

            const btnSeleccionarTodosCargos = document.getElementById('seleccionarTodosCargos');
            const btnDeseleccionarTodosCargos = document.getElementById('deseleccionarTodosCargos');

            if (btnSeleccionarTodosCargos) {
                btnSeleccionarTodosCargos.addEventListener('click', () => this._seleccionarTodosCargos(true));
            }

            if (btnDeseleccionarTodosCargos) {
                btnDeseleccionarTodosCargos.addEventListener('click', () => this._seleccionarTodosCargos(false));
            }

            console.log('✅ Eventos configurados');

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

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

    _filtrarAreas(termino) {
        if (!termino.trim()) {
            this.areasFiltradas = [...this.areas];
        } else {
            const terminoLower = termino.toLowerCase();
            this.areasFiltradas = this.areas.filter(area => {
                const nombre = (area.nombreArea || '').toLowerCase();
                const descripcion = (area.descripcion || '').toLowerCase();
                return nombre.includes(terminoLower) || descripcion.includes(terminoLower);
            });
        }

        this._renderizarAreas();

        if (this.areaSeleccionada) {
            const radio = document.querySelector(`.area-radio[value="${this.areaSeleccionada.id}"]`);
            if (radio) {
                radio.checked = true;
                document.querySelector(`.area-item[data-area-id="${this.areaSeleccionada.id}"]`)?.classList.add('seleccionado');
            }
        }
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

    _seleccionarTodosCargos(seleccionar) {
        const checkboxes = document.querySelectorAll('.cargo-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = seleccionar;
            const item = checkbox.closest('.cargo-item');
            if (item) {
                this._actualizarEstiloCargo(item, seleccionar);
            }
        });
        this._actualizarContadorCargos();
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

        // Validaciones específicas por tipo
        if (this.tipoSeleccionado === 'area' && !this.areaSeleccionada) {
            this._mostrarError('Debes seleccionar un área');
            return;
        }

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

            // Preparar datos según el tipo
            const tareaData = {
                nombreActividad: nombre,
                descripcion: descripcion,
                items: this.items,
                fechaLimite: fechaLimite,
                tieneRecordatorio: tieneRecordatorioCheck?.checked || false
            };

            // Agregar campos específicos según el tipo
            switch (this.tipoSeleccionado) {
                case 'personal':
                    tareaData.tipo = 'personal';
                    tareaData.prioridad = document.getElementById('prioridad')?.value || 'media';
                    break;

                case 'compartida':
                    const usuariosSeleccionados = this._obtenerUsuariosSeleccionados();
                    tareaData.tipo = usuariosSeleccionados.length > 0 ? 'compartida' : 'personal';
                    tareaData.usuariosCompartidosIds = usuariosSeleccionados;
                    break;

                case 'area':
                    tareaData.tipo = 'area';
                    tareaData.areaId = this.areaSeleccionada.id;
                    tareaData.cargosIds = this._obtenerCargosSeleccionados();
                    break;

                case 'general':
                    tareaData.tipo = 'global';
                    break;
            }

            console.log('📝 Guardando tarea:', tareaData);

            const nuevaTarea = await this.tareaManager.crearTarea(tareaData, this.usuarioActual);

            console.log('✅ Tarea creada:', nuevaTarea);

            // Mostrar resumen detallado
            let resumenHTML = this._generarResumenHTML(nombre);

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

    _generarResumenHTML(nombre) {
        const fechaLimiteInput = document.getElementById('fechaLimite');
        const tieneRecordatorioCheck = document.getElementById('tieneRecordatorio');
        let fechaLimite = null;

        if (tieneRecordatorioCheck?.checked && fechaLimiteInput?.value) {
            fechaLimite = new Date(fechaLimiteInput.value);
        }

        const tiposTexto = {
            'personal': 'Personal',
            'compartida': 'Compartida',
            'area': 'Por Área',
            'general': 'General'
        };

        let html = `
            <div style="text-align: left; color: var(--color-text-primary);">
                <p><strong>Tarea:</strong> ${nombre}</p>
                <p><strong>Tipo:</strong> ${tiposTexto[this.tipoSeleccionado]}</p>
                <p><strong>Creado por:</strong> ${this.usuarioActual.nombreCompleto}</p>
        `;

        if (this.tipoSeleccionado === 'area' && this.areaSeleccionada) {
            const cargosSeleccionados = this._obtenerCargosSeleccionados();
            html += `<p><strong>Área:</strong> ${this.areaSeleccionada.nombreArea}</p>`;
            if (cargosSeleccionados.length > 0) {
                html += `<p><strong>Cargos específicos:</strong> ${cargosSeleccionados.length}</p>`;
            } else {
                html += '<p><strong>Todos los cargos del área</strong></p>';
            }
        }

        if (this.tipoSeleccionado === 'compartida') {
            const usuariosSeleccionados = this._obtenerUsuariosSeleccionados();
            if (usuariosSeleccionados.length > 0) {
                html += `<p><strong>Compartida con:</strong> ${usuariosSeleccionados.length} usuario(s)</p>`;
            } else {
                html += '<p><strong>Personal (sin compartir)</strong></p>';
            }
        }

        if (this.tipoSeleccionado === 'personal') {
            const prioridad = document.getElementById('prioridad')?.value || 'media';
            const prioridades = {
                'baja': '🔵 Baja',
                'media': '🟡 Media',
                'alta': '🔴 Alta',
                'urgente': '⚡ Urgente'
            };
            html += `<p><strong>Prioridad:</strong> ${prioridades[prioridad]}</p>`;
        }

        if (fechaLimite) {
            html += `<p><strong>Fecha límite:</strong> ${fechaLimite.toLocaleDateString('es-MX')}</p>`;
        }

        html += `<p><strong>Items:</strong> ${this.items.length}</p>`;
        html += `</div>`;

        return html;
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando controller de tarea unificado...');
    new CrearTareaUnificadoController();
});