// crearTareaArea.js - VERSIÓN PARA TAREAS POR ÁREA
// CON SELECCIÓN DE ÁREA Y CARGOS ESPECÍFICOS

import { TareaManager } from '/clases/tarea.js';
import { AreaManager } from '/clases/area.js';

// =============================================
// CLASE PRINCIPAL - CrearTareaAreaController
// =============================================
class CrearTareaAreaController {
    constructor() {
        this.tareaManager = null;
        this.areaManager = null;
        this.usuarioActual = null;

        // Cache de áreas
        this.areas = [];
        this.areasFiltradas = [];

        // Cache de cargos
        this.cargos = [];
        this.cargosFiltrados = [];

        // Área seleccionada
        this.areaSeleccionada = null;

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
            console.log('🚀 Inicializando CrearTareaAreaController...');

            // 1. Cargar usuario
            await this._cargarUsuario();

            // 2. Si no hay usuario, redirigir
            if (!this.usuarioActual) {
                this._redirigirAlLogin();
                return;
            }

            console.log('👤 Usuario actual:', this.usuarioActual.nombreCompleto);

            // 3. Inicializar TareaManager y AreaManager
            this.tareaManager = new TareaManager();
            this.areaManager = new AreaManager();
            console.log('✅ Managers inicializados');

            // 4. Cargar áreas
            await this._cargarAreas();

            // 5. Configurar eventos
            this._configurarEventos();

            // 6. Configurar organización automática
            this._configurarOrganizacion();

            // 7. Configurar contadores de caracteres
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

    // ========== CARGA DE ÁREAS ==========
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

            // Usar AreaManager para obtener áreas
            this.areas = await this.areaManager.getAreasByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            // Filtrar solo áreas activas
            this.areas = this.areas.filter(area => area.estado === 'activa');

            console.log(`✅ ${this.areas.length} áreas activas encontradas`);

            this.areasFiltradas = [...this.areas];

            // Renderizar áreas
            this._renderizarAreas();

        } catch (error) {
            console.error('❌ Error cargando áreas:', error);

            // Mostrar error en el contenedor
            const areasContainer = document.getElementById('areasContainer');
            if (areasContainer) {
                areasContainer.innerHTML = `
                    <div class="loading-areas" style="color: var(--color-danger);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error cargando áreas: ${error.message}</p>
                        <button class="btn-accion-rapida" onclick="location.reload()">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </div>
                `;
            }

            // Usar datos de ejemplo si falla la carga
            this._cargarAreasEjemplo();
        }
    }

    _cargarAreasEjemplo() {
        console.log('📝 Usando datos de ejemplo para áreas');

        // Datos de ejemplo para desarrollo
        this.areas = [
            {
                id: 'area1',
                nombreArea: 'Seguridad',
                descripcion: 'Área encargada de la seguridad',
                cargos: {
                    'cargo1': { nombre: 'Supervisor de Seguridad', descripcion: 'Supervisa operaciones', estado: 'activo' },
                    'cargo2': { nombre: 'Guardia', descripcion: 'Vigilancia', estado: 'activo' }
                },
                estado: 'activa'
            },
            {
                id: 'area2',
                nombreArea: 'Operaciones',
                descripcion: 'Área de operaciones diarias',
                cargos: {
                    'cargo3': { nombre: 'Coordinador', descripcion: 'Coordina actividades', estado: 'activo' },
                    'cargo4': { nombre: 'Operador', descripcion: 'Ejecuta tareas', estado: 'activo' }
                },
                estado: 'activa'
            },
            {
                id: 'area3',
                nombreArea: 'Mantenimiento',
                descripcion: 'Mantenimiento general',
                cargos: {
                    'cargo5': { nombre: 'Técnico', descripcion: 'Reparaciones', estado: 'activo' }
                },
                estado: 'activa'
            }
        ];

        this.areasFiltradas = [...this.areas];
        this._renderizarAreas();

        // Mostrar advertencia
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
            const totalCargos = area.getCantidadCargosActivos ? area.getCantidadCargosActivos() :
                (area.cargos ? Object.keys(area.cargos).length : 0);

            html += `
                <div class="area-item" data-area-id="${area.id}">
                    <input type="radio" class="area-radio" name="areaSeleccionada" value="${area.id}">
                    <div class="area-icon">
                        ${iniciales}
                    </div>
                    <div class="area-info">
                        <span class="area-nombre">${area.nombreArea || 'Área'}</span>
                        <span class="area-descripcion">${area.descripcion || 'Sin descripción'}</span>
                        <span class="area-badge">${totalCargos} cargos</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Agregar eventos a los radios
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
        return nombre
            .split(' ')
            .map(p => p[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // ========== SELECCIÓN DE ÁREA Y CARGOS ==========
    async _seleccionarArea(areaId) {
        // Actualizar estilo visual
        document.querySelectorAll('.area-item').forEach(item => {
            if (item.dataset.areaId === areaId) {
                item.classList.add('seleccionado');
            } else {
                item.classList.remove('seleccionado');
            }
        });

        // Guardar área seleccionada
        this.areaSeleccionada = this.areas.find(a => a.id === areaId);

        // Actualizar resumen
        const selectedAreaText = document.getElementById('selectedAreaText');
        if (selectedAreaText && this.areaSeleccionada) {
            selectedAreaText.textContent = `Área: ${this.areaSeleccionada.nombreArea}`;
        }

        // Cargar cargos del área
        await this._cargarCargos(areaId);
    }

    async _cargarCargos(areaId) {
        try {
            const area = this.areas.find(a => a.id === areaId);
            if (!area) return;

            // Obtener cargos activos
            let cargos = [];
            if (area.cargos) {
                if (typeof area.cargos === 'object') {
                    cargos = Object.entries(area.cargos)
                        .filter(([_, cargo]) => cargo.estado !== 'inactivo')
                        .map(([id, cargo]) => ({
                            id,
                            ...cargo
                        }));
                }
            }

            this.cargos = cargos;
            this.cargosFiltrados = [...cargos];

            // Mostrar sección de cargos
            const cargosSection = document.getElementById('cargosSection');
            const cargosAcciones = document.getElementById('cargosAcciones');

            if (cargos.length > 0) {
                cargosSection.style.display = 'block';
                cargosAcciones.style.display = 'block';
                this._renderizarCargos();
            } else {
                cargosSection.style.display = 'none';
                cargosAcciones.style.display = 'none';

                // Ocultar resumen de cargos
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
                    <input type="checkbox" class="cargo-checkbox" id="cargo_${cargo.id}" value="${cargo.id}">
                    <div class="cargo-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="cargo-info">
                        <span class="cargo-nombre">${cargo.nombre || 'Cargo'}</span>
                        <span class="cargo-descripcion">${cargo.descripcion || 'Sin descripción'}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Agregar eventos a los checkboxes
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
        const checkboxes = document.querySelectorAll('.cargo-checkbox:checked');

        checkboxes.forEach(checkbox => {
            cargosIds.push(checkbox.value);
        });

        return cargosIds;
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
            const form = document.getElementById('formTareaArea');
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

            // Búsqueda de áreas
            const buscarInput = document.getElementById('buscarAreas');
            if (buscarInput) {
                buscarInput.addEventListener('input', (e) => {
                    this._filtrarAreas(e.target.value);
                });
            }

            // Acciones rápidas cargos
            const btnSeleccionarTodos = document.getElementById('seleccionarTodosCargos');
            const btnDeseleccionarTodos = document.getElementById('deseleccionarTodosCargos');

            if (btnSeleccionarTodos) {
                btnSeleccionarTodos.addEventListener('click', () => this._seleccionarTodosCargos(true));
            }

            if (btnDeseleccionarTodos) {
                btnDeseleccionarTodos.addEventListener('click', () => this._seleccionarTodosCargos(false));
            }

            console.log('✅ Eventos configurados');

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
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

        // Restaurar selección si existe
        if (this.areaSeleccionada) {
            const radio = document.querySelector(`.area-radio[value="${this.areaSeleccionada.id}"]`);
            if (radio) {
                radio.checked = true;
                document.querySelector(`.area-item[data-area-id="${this.areaSeleccionada.id}"]`)?.classList.add('seleccionado');
            }
        }
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

        // Validar que haya un área seleccionada
        if (!this.areaSeleccionada) {
            this._mostrarError('Debes seleccionar un área');
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
            const cargosSeleccionados = this._obtenerCargosSeleccionados();

            // Crear objeto de datos de la tarea
            const tareaData = {
                nombreActividad: nombre,
                descripcion: descripcion,
                items: items,
                tipo: 'area',
                areaId: this.areaSeleccionada.id,
                cargosIds: cargosSeleccionados.length > 0 ? cargosSeleccionados : []
            };

            console.log('📝 Guardando tarea por área:', tareaData);

            // Usar TareaManager para crear la tarea
            const nuevaTarea = await this.tareaManager.crearTarea(tareaData, this.usuarioActual);

            console.log('✅ Tarea por área creada:', nuevaTarea);

            Swal.close();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Tarea creada!',
                html: `
                    <div style="text-align: left; color: var(--color-text-primary);">
                        <p><strong>Tarea:</strong> ${nombre}</p>
                        <p><strong>Área:</strong> ${this.areaSeleccionada.nombreArea}</p>
                        <p><strong>Items:</strong> ${items.length}</p>
                        ${cargosSeleccionados.length > 0 ?
                        `<p><strong>Cargos específicos:</strong> ${cargosSeleccionados.length}</p>` :
                        '<p><strong>Todos los cargos del área</strong></p>'}
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
    console.log('📄 DOM cargado, iniciando controller de tarea por área...');
    new CrearTareaAreaController();
});