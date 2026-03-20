// tareas.js - VERSIÓN CON FORMULARIO INLINE (COMO EN LA IMAGEN)
// BASADO EN LAS IMÁGENES DE REFERENCIA

import { TareaManager } from '/clases/tarea.js';
import { UserManager } from '/clases/user.js';
import { AreaManager } from '/clases/area.js';

class TareasController {
    constructor() {
        this.tareaManager = null;
        this.userManager = null;
        this.areaManager = null;
        this.usuarioActual = null;

        // Datos
        this.todasLasTareas = [];
        this.tareasFiltradas = [];
        this.tipoActual = 'todas';
        this.terminoBusqueda = '';

        // Cachés
        this.cacheUsuarios = {};
        this.cacheAreas = {};
        this.usuariosDisponibles = [];
        this.areasDisponibles = [];

        // Estado del formulario
        this.modoEdicion = false;
        this.tareaActual = null;
        this.tipoSeleccionado = 'personal';
        this.itemsActuales = [];

        // Cache para creación
        this.usuarios = [];
        this.usuariosFiltrados = [];
        this.areas = [];
        this.areasFiltradas = [];
        this.cargos = [];
        this.cargosFiltrados = [];
        this.areaSeleccionada = null;

        this.init();
    }

    async init() {
        try {
            this.userManager = new UserManager();
            this.areaManager = new AreaManager();
            const { TareaManager } = await import('/clases/tarea.js');
            this.tareaManager = new TareaManager();

            await this._esperarUsuario();

            if (!this.usuarioActual) {
                window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
                return;
            }

            localStorage.setItem('adminInfo', JSON.stringify({
                id: this.usuarioActual.id,
                uid: this.usuarioActual.uid,
                nombreCompleto: this.usuarioActual.nombreCompleto,
                organizacion: this.usuarioActual.organizacion,
                organizacionCamelCase: this.usuarioActual.organizacionCamelCase,
                rol: this.usuarioActual.rol,
                correoElectronico: this.usuarioActual.correoElectronico,
                areaAsignadaId: this.usuarioActual.areaAsignadaId,
                cargoId: this.usuarioActual.cargoId
            }));

            await this._cargarUsuarios();
            await this._cargarAreas();
            await this._cargarTareas();

            this._configurarEventos();

        } catch (error) {
            this._mostrarError(error.message);
        }
    }

    async _esperarUsuario() {
        for (let i = 0; i < 30; i++) {
            if (this.userManager.currentUser) {
                this.usuarioActual = this.userManager.currentUser;
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return this._cargarUsuarioLocalStorage();
    }

    _cargarUsuarioLocalStorage() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const data = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: data.id || data.uid,
                    uid: data.uid || data.id,
                    nombreCompleto: data.nombreCompleto || 'Usuario',
                    organizacion: data.organizacion || 'Sin organización',
                    organizacionCamelCase: data.organizacionCamelCase || this._generarCamelCase(data.organizacion),
                    rol: data.rol || 'administrador',
                    correoElectronico: data.correoElectronico || '',
                    areaAsignadaId: data.areaAsignadaId,
                    cargoId: data.cargoId
                };
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    _generarCamelCase(texto) {
        if (!texto) return 'sinOrganizacion';
        return texto.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
    }

    async _cargarUsuarios() {
        try {
            if (!this.usuarioActual?.organizacionCamelCase) return;

            const colaboradores = await this.userManager.getColaboradoresByOrganizacion(
                this.usuarioActual.organizacionCamelCase, true
            );
            const administradores = await this.userManager.getAdministradores(true);

            this.usuariosDisponibles = [
                ...colaboradores.filter(u => u.id !== this.usuarioActual.id),
                ...administradores.filter(a => a.organizacionCamelCase === this.usuarioActual.organizacionCamelCase && a.id !== this.usuarioActual.id)
            ];

            this.usuariosDisponibles.forEach(u => {
                this.cacheUsuarios[u.id] = u.nombreCompleto || 'Usuario';
            });

        } catch (error) {
            this.usuariosDisponibles = [];
        }
    }

    async _cargarAreas() {
        try {
            if (!this.usuarioActual?.organizacionCamelCase) return;

            this.areasDisponibles = await this.areaManager.getAreasByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            this.areasDisponibles = this.areasDisponibles.filter(a => a.estado === 'activa');

        } catch (error) {
            this.areasDisponibles = [];
        }
    }

    async _cargarTareas() {
        try {
            this._mostrarCarga();

            if (!this.usuarioActual?.organizacionCamelCase) {
                throw new Error('No hay organización definida');
            }

            this.todasLasTareas = await this.tareaManager.getTodasLasTareas(
                this.usuarioActual.organizacionCamelCase
            );

            this._aplicarFiltros();

        } catch (error) {
            this._mostrarErrorEnGrid(error.message);
        }
    }

    _aplicarFiltros() {
        if (this.terminoBusqueda && this.terminoBusqueda.length >= 2) {
            this.tareasFiltradas = this.todasLasTareas.filter(t =>
                (t.nombreActividad && t.nombreActividad.toLowerCase().includes(this.terminoBusqueda)) ||
                (t.descripcion && t.descripcion.toLowerCase().includes(this.terminoBusqueda))
            );
        } else {
            this.tareasFiltradas = [...this.todasLasTareas];
        }

        if (this.tipoActual !== 'todas') {
            this.tareasFiltradas = this.tareasFiltradas.filter(t => {
                if (this.tipoActual === 'generales') {
                    return t.tipo === 'global' || t.tipo === 'general';
                }
                if (this.tipoActual === 'personales') {
                    return t.tipo === 'personal' && t.creadoPor === this.usuarioActual.id;
                }
                if (this.tipoActual === 'compartidas') {
                    if (t.tipo !== 'compartida') return false;
                    return t.creadoPor === this.usuarioActual.id ||
                        (t.usuariosCompartidosIds && t.usuariosCompartidosIds.includes(this.usuarioActual.id));
                }
                if (this.tipoActual === 'area') {
                    if (t.tipo !== 'area') return false;
                    if (t.creadoPor === this.usuarioActual.id) return true;
                    if (t.areaId && t.areaId !== this.usuarioActual.areaAsignadaId) return false;
                    if (t.cargosIds && t.cargosIds.length > 0) {
                        return t.cargosIds.includes(this.usuarioActual.cargoId);
                    }
                    return true;
                }
                return true;
            });
        }

        this._renderizarTareas();
    }

    _renderizarTareas() {
        const container = document.getElementById('tareasGrid');
        if (!container) return;

        if (!this.tareasFiltradas || this.tareasFiltradas.length === 0) {
            container.innerHTML = this._getEmptyStateHTML();
            return;
        }

        let html = '';
        this.tareasFiltradas.forEach(tarea => {
            html += this._crearTarjetaNota(tarea);
        });

        container.innerHTML = html;

        container.querySelectorAll('.btn-card-action.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tareaId = btn.dataset.id;
                this._abrirFormularioEdicion(tareaId);
            });
        });

        container.querySelectorAll('.btn-card-action.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tareaId = btn.dataset.id;
                this._eliminarTarea(tareaId);
            });
        });

        container.querySelectorAll('.tarea-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const tareaId = checkbox.dataset.tareaId;
                const itemId = checkbox.dataset.itemId;
                this._marcarItem(tareaId, itemId, checkbox.checked);
            });
        });
    }

    _crearTarjetaNota(tarea) {
        const tipoClass = {
            'global': 'tipo-general',
            'general': 'tipo-general',
            'personal': 'tipo-personal',
            'compartida': 'tipo-compartida',
            'area': 'tipo-area'
        }[tarea.tipo] || 'tipo-general';

        const tipoTexto = {
            'global': 'General',
            'general': 'General',
            'personal': 'Personal',
            'compartida': 'Compartida',
            'area': 'Área'
        }[tarea.tipo] || 'General';

        const fecha = tarea.fechaCreacion ? new Date(tarea.fechaCreacion) : new Date();
        const fechaStr = fecha.toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const esCreador = tarea.creadoPor === this.usuarioActual?.id;
        const items = tarea.items ? Object.values(tarea.items) : [];

        let itemsPreview = '';
        if (items.length > 0) {
            itemsPreview = '<div class="tarea-items-preview">';
            items.slice(0, 3).forEach(item => {
                itemsPreview += `
                    <div class="tarea-item-preview ${item.completado ? 'completado' : ''}">
                        <input type="checkbox" class="tarea-item-checkbox" 
                               data-tarea-id="${tarea.id}" 
                               data-item-id="${item.id}"
                               ${item.completado ? 'checked' : ''}>
                        <span>${this._escapeHTML(item.texto)}</span>
                    </div>
                `;
            });
            if (items.length > 3) {
                itemsPreview += `<div class="tarea-mas-items">+${items.length - 3} items más</div>`;
            }
            itemsPreview += '</div>';
        }

        return `
            <div class="tarea-card" data-tarea-id="${tarea.id}">
                <div class="tarea-header">
                    <h3 class="tarea-titulo">${this._escapeHTML(tarea.nombreActividad || 'Sin título')}</h3>
                    <span class="tarea-tipo-badge ${tipoClass}">${tipoTexto}</span>
                </div>
                
                ${tarea.descripcion ? `
                    <p class="tarea-contenido">${this._escapeHTML(tarea.descripcion)}</p>
                ` : ''}
                
                ${itemsPreview}
                
                <div class="tarea-footer">
                    <span class="tarea-creador">
                        <i class="fas fa-user"></i>
                        ${this._escapeHTML(tarea.creadoPorNombre || 'Usuario')}
                        ${esCreador ? '<span style="color: #ffc107; margin-left: 4px;">(tú)</span>' : ''}
                    </span>
                    <span class="tarea-fecha">
                        <i class="fas fa-calendar"></i>
                        ${fechaStr}
                    </span>
                </div>
                
                <div class="tarea-acciones">
                    <button class="btn-card-action edit" data-id="${tarea.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-card-action delete" data-id="${tarea.id}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    async _marcarItem(tareaId, itemId, completado) {
        try {
            await this.tareaManager.marcarItemTarea(
                tareaId, itemId, completado,
                this.usuarioActual, this.usuarioActual.organizacionCamelCase
            );

            const tarea = this.todasLasTareas.find(t => t.id === tareaId);
            if (tarea && tarea.items && tarea.items[itemId]) {
                tarea.items[itemId].completado = completado;
            }

        } catch (error) {
            const checkbox = document.querySelector(`.tarea-item-checkbox[data-tarea-id="${tareaId}"][data-item-id="${itemId}"]`);
            if (checkbox) checkbox.checked = !completado;

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar el item',
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--color-bg-secondary)'
            });
        }
    }

    // ========== FUNCIONES PARA EL FORMULARIO INLINE ==========

    _mostrarFormularioCreacion() {
        this.modoEdicion = false;
        this.tareaActual = null;
        this.tipoSeleccionado = 'personal';
        this.areaSeleccionada = null;
        this.itemsActuales = [];

        document.getElementById('notaId').value = '';
        document.getElementById('notaTitulo').value = '';
        document.getElementById('notaDescripcion').value = '';
        document.getElementById('tieneRecordatorio').checked = false;
        document.getElementById('fechaLimite').value = this._getFechaPorDefecto('personal');
        document.getElementById('fechaContainer').style.display = 'none';

        this._renderizarItemsInline([]);
        this._seleccionarTipoFormulario('personal');

        document.getElementById('formularioCreacion').style.display = 'block';
        document.getElementById('formularioCreacion').scrollIntoView({ behavior: 'smooth' });

        setTimeout(() => {
            document.getElementById('notaTitulo').focus();
        }, 100);
    }

    _ocultarFormulario() {
        document.getElementById('formularioCreacion').style.display = 'none';
    }

    _seleccionarTipoFormulario(tipo) {
        this.tipoSeleccionado = tipo;

        document.querySelectorAll('.tipo-option').forEach(opt => {
            if (opt.dataset.tipo === tipo) {
                opt.classList.add('seleccionado');
            } else {
                opt.classList.remove('seleccionado');
            }
        });

        const titulos = {
            'general': 'Nueva Nota General',
            'personal': 'Nueva Nota Personal',
            'compartida': 'Nueva Nota Compartida',
            'area': 'Nueva Nota por Área'
        };
        document.getElementById('formularioTitulo').textContent = titulos[tipo] || 'Nueva Nota';

        this._renderizarCamposEspecificosInline(tipo);
        this._actualizarFechaPorDefecto();
    }

    _actualizarFechaPorDefecto() {
        const fechaInput = document.getElementById('fechaLimite');
        if (!fechaInput) return;
        fechaInput.value = this._getFechaPorDefecto(this.tipoSeleccionado);
    }

    _getFechaPorDefecto(tipo) {
        const fecha = new Date();
        switch (tipo) {
            case 'general': fecha.setDate(fecha.getDate() + 30); break;
            case 'area': fecha.setDate(fecha.getDate() + 14); break;
            default: fecha.setDate(fecha.getDate() + 7);
        }
        return fecha.toISOString().split('T')[0];
    }

    _agregarItemFormulario() {
        const itemsList = document.getElementById('itemsList');
        if (!itemsList) return;

        const noItems = itemsList.querySelector('.no-items');
        if (noItems) noItems.remove();

        const newItemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const html = `
            <div class="item-row" data-item-id="${newItemId}">
                <input type="checkbox" class="item-checkbox">
                <input type="text" class="item-texto" value="" placeholder="Escribe un item...">
                <button type="button" class="btn-eliminar-item" title="Eliminar item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        itemsList.insertAdjacentHTML('beforeend', html);

        const newRow = itemsList.lastElementChild;
        const input = newRow.querySelector('.item-texto');
        const deleteBtn = newRow.querySelector('.btn-eliminar-item');

        input.focus();

        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            newRow.remove();
        });
    }

    _renderizarItemsInline(items) {
        const container = document.getElementById('itemsList');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<p class="no-items">No hay items. Agrega uno nuevo.</p>';
            return;
        }

        let html = '';
        items.forEach(item => {
            html += `
                <div class="item-row" data-item-id="${item.id}">
                    <input type="checkbox" class="item-checkbox" ${item.completado ? 'checked' : ''}>
                    <input type="text" class="item-texto" value="${this._escapeHTML(item.texto)}" placeholder="Escribe un item...">
                    <button type="button" class="btn-eliminar-item" title="Eliminar item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.item-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const row = e.target.closest('.item-row');
                if (row) {
                    const texto = row.querySelector('.item-texto');
                    if (e.target.checked) {
                        texto.style.textDecoration = 'line-through';
                        texto.style.color = 'var(--color-text-dim)';
                    } else {
                        texto.style.textDecoration = 'none';
                        texto.style.color = 'var(--color-text-primary)';
                    }
                }
            });
        });

        container.querySelectorAll('.btn-eliminar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const row = e.target.closest('.item-row');
                if (row) row.remove();
            });
        });
    }

    _renderizarCamposEspecificosInline(tipo) {
        const container = document.getElementById('camposEspecificos');
        if (!container) return;

        let html = '';

        switch (tipo) {
            case 'personal':
                html = ''; // Prioridad eliminada
                break;
            case 'compartida':
                html = this._getHTMLUsuariosCreacion();
                break;
            case 'area':
                html = this._getHTMLAreasCreacion();
                break;
            case 'general':
                html = this._getHTMLGeneral();
                break;
        }

        container.innerHTML = html;

        if (tipo === 'compartida' && html) {
            this._configurarSelectorUsuariosCreacion();
        } else if (tipo === 'area' && html) {
            this._configurarSelectorAreasCreacion();
        }
    }

    // ========== HTML PARA CAMPOS ESPECÍFICOS ==========

    _getHTMLUsuariosCreacion() {
        if (this.usuariosDisponibles.length === 0) {
            return '<p class="no-items">No hay usuarios disponibles</p>';
        }

        let html = `
            <div class="campos-especificos">
                <h6 class="section-title"><i class="fas fa-users"></i> Compartir con usuarios</h6>
                
                <div class="acciones-rapidas">
                    <button type="button" class="btn-accion-rapida" id="seleccionarTodosUsuarios">
                        <i class="fas fa-check-double"></i> Seleccionar Todos
                    </button>
                    <button type="button" class="btn-accion-rapida" id="deseleccionarTodosUsuarios">
                        <i class="fas fa-times"></i> Deseleccionar Todos
                    </button>
                </div>
                
                <div class="usuarios-container" id="usuariosContainer">
        `;

        this.usuariosDisponibles.forEach(usuario => {
            const iniciales = this._obtenerIniciales(usuario.nombreCompleto);
            html += `
                <div class="usuario-item" data-usuario-id="${usuario.id}">
                    <input type="checkbox" class="usuario-checkbox" value="${usuario.id}">
                    <div class="usuario-avatar">${iniciales}</div>
                    <div class="usuario-info">
                        <span class="usuario-nombre">${this._escapeHTML(usuario.nombreCompleto)}</span>
                        <span class="usuario-correo">${this._escapeHTML(usuario.correoElectronico || '')}</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div class="selected-summary" id="selectedUsersSummary">
                    <i class="fas fa-users"></i>
                    <span id="selectedUsersCount">0</span> usuarios seleccionados
                </div>
            </div>
        `;

        return html;
    }

    _getHTMLUsuariosEdicion(tareaData) {
        if (this.usuariosDisponibles.length === 0) {
            return '<p class="no-items">No hay usuarios disponibles</p>';
        }

        const seleccionados = tareaData?.usuariosCompartidosIds || [];

        let html = `
            <div class="campos-especificos">
                <h6 class="section-title"><i class="fas fa-users"></i> Compartir con usuarios</h6>
                
                <div class="acciones-rapidas">
                    <button type="button" class="btn-accion-rapida" id="seleccionarTodosUsuarios">
                        <i class="fas fa-check-double"></i> Seleccionar Todos
                    </button>
                    <button type="button" class="btn-accion-rapida" id="deseleccionarTodosUsuarios">
                        <i class="fas fa-times"></i> Deseleccionar Todos
                    </button>
                </div>
                
                <div class="usuarios-container" id="usuariosContainer">
        `;

        this.usuariosDisponibles.forEach(usuario => {
            const iniciales = this._obtenerIniciales(usuario.nombreCompleto);
            const seleccionado = seleccionados.includes(usuario.id) ? 'checked' : '';

            html += `
                <div class="usuario-item" data-usuario-id="${usuario.id}">
                    <input type="checkbox" class="usuario-checkbox" value="${usuario.id}" ${seleccionado}>
                    <div class="usuario-avatar">${iniciales}</div>
                    <div class="usuario-info">
                        <span class="usuario-nombre">${this._escapeHTML(usuario.nombreCompleto)}</span>
                        <span class="usuario-correo">${this._escapeHTML(usuario.correoElectronico || '')}</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div class="selected-summary" id="selectedUsersSummary">
                    <i class="fas fa-users"></i>
                    <span id="selectedUsersCount">${seleccionados.length}</span> usuarios seleccionados
                </div>
            </div>
        `;

        return html;
    }

    _getHTMLAreasCreacion() {
        if (this.areasDisponibles.length === 0) {
            return '<p class="no-items">No hay áreas disponibles</p>';
        }

        let html = `
            <div class="campos-especificos">
                <h6 class="section-title"><i class="fas fa-building"></i> Asignar a Área</h6>
                
                <div class="areas-container" id="areasContainer">
        `;

        this.areasDisponibles.forEach(area => {
            const iniciales = this._obtenerIniciales(area.nombreArea);
            const totalCargos = area.cargos ? Object.keys(area.cargos).length : 0;

            html += `
                <div class="area-item" data-area-id="${area.id}">
                    <input type="radio" class="area-radio" name="areaSeleccionada" value="${area.id}">
                    <div class="area-icon">${iniciales}</div>
                    <div class="area-info">
                        <span class="area-nombre">${this._escapeHTML(area.nombreArea)}</span>
                        <span class="area-descripcion">${this._escapeHTML(area.descripcion || 'Sin descripción')}</span>
                        <span class="area-badge">${totalCargos} cargos</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        html += `
            <div id="cargosSection" style="margin-top: 20px; display: none;">
                <h6 class="section-title"><i class="fas fa-user-tag"></i> Cargos específicos (opcional)</h6>
                <div class="cargos-container" id="cargosContainer">
                    <div class="loading-cargos"><i class="fas fa-spinner fa-spin"></i> Cargando cargos...</div>
                </div>
                <div class="selected-summary" id="selectedCargosSummary" style="display: none;">
                    <i class="fas fa-users"></i>
                    <span id="selectedCargosCount">0</span> cargos seleccionados
                </div>
            </div>
        `;

        html += `</div>`;

        return html;
    }

    _getHTMLAreasEdicion(tareaData) {
        if (this.areasDisponibles.length === 0) {
            return '<p class="no-items">No hay áreas disponibles</p>';
        }

        const areaSeleccionada = tareaData?.areaId || null;
        const cargosSeleccionados = tareaData?.cargosIds || [];

        let html = `
            <div class="campos-especificos">
                <h6 class="section-title"><i class="fas fa-building"></i> Asignar a Área</h6>
                
                <div class="areas-container" id="areasContainer">
        `;

        this.areasDisponibles.forEach(area => {
            const iniciales = this._obtenerIniciales(area.nombreArea);
            const totalCargos = area.cargos ? Object.keys(area.cargos).length : 0;
            const seleccionado = areaSeleccionada === area.id ? 'checked' : '';

            html += `
                <div class="area-item" data-area-id="${area.id}">
                    <input type="radio" class="area-radio" name="areaSeleccionada" value="${area.id}" ${seleccionado}>
                    <div class="area-icon">${iniciales}</div>
                    <div class="area-info">
                        <span class="area-nombre">${this._escapeHTML(area.nombreArea)}</span>
                        <span class="area-descripcion">${this._escapeHTML(area.descripcion || 'Sin descripción')}</span>
                        <span class="area-badge">${totalCargos} cargos</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        html += `
            <div id="cargosSection" style="margin-top: 20px; ${!areaSeleccionada ? 'display: none;' : ''}">
                <h6 class="section-title"><i class="fas fa-user-tag"></i> Cargos específicos (opcional)</h6>
                <div class="cargos-container" id="cargosContainer">
                    <div class="loading-cargos"><i class="fas fa-spinner fa-spin"></i> Cargando cargos...</div>
                </div>
                <div class="selected-summary" id="selectedCargosSummary" style="${cargosSeleccionados.length === 0 ? 'display: none;' : ''}">
                    <i class="fas fa-users"></i>
                    <span id="selectedCargosCount">${cargosSeleccionados.length}</span> cargos seleccionados
                </div>
            </div>
        `;

        html += `</div>`;

        return html;
    }

    _getHTMLGeneral() {
        return `
            <div class="campos-especificos">
                <div class="visibility-info" style="padding: 15px; text-align: center;">
                    <i class="fas fa-eye" style="font-size: 24px; margin-right: 10px;"></i>
                    <span>Esta nota será visible para <strong>todos los usuarios</strong> de la organización</span>
                </div>
            </div>
        `;
    }

    // ========== CONFIGURACIÓN DE SELECTORES ==========

    _configurarSelectorUsuariosCreacion() {
        const container = document.getElementById('usuariosContainer');
        if (!container) return;

        container.querySelectorAll('.usuario-item').forEach(item => {
            const checkbox = item.querySelector('.usuario-checkbox');

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this._actualizarEstiloItem(item, checkbox.checked);
                }
                this._actualizarContadorUsuarios();
            });

            checkbox.addEventListener('change', (e) => {
                this._actualizarEstiloItem(item, e.target.checked);
                this._actualizarContadorUsuarios();
            });
        });

        document.getElementById('seleccionarTodosUsuarios')?.addEventListener('click', () => {
            container.querySelectorAll('.usuario-checkbox').forEach(cb => {
                cb.checked = true;
                this._actualizarEstiloItem(cb.closest('.usuario-item'), true);
            });
            this._actualizarContadorUsuarios();
        });

        document.getElementById('deseleccionarTodosUsuarios')?.addEventListener('click', () => {
            container.querySelectorAll('.usuario-checkbox').forEach(cb => {
                cb.checked = false;
                this._actualizarEstiloItem(cb.closest('.usuario-item'), false);
            });
            this._actualizarContadorUsuarios();
        });

        this._actualizarContadorUsuarios();
    }

    _configurarSelectorAreasCreacion() {
        const areasContainer = document.getElementById('areasContainer');
        if (!areasContainer) return;

        areasContainer.querySelectorAll('.area-item').forEach(item => {
            const radio = item.querySelector('.area-radio');

            item.addEventListener('click', (e) => {
                if (e.target !== radio) {
                    radio.checked = true;
                    this._seleccionarAreaCreacion(item.dataset.areaId);
                }
            });

            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this._seleccionarAreaCreacion(item.dataset.areaId);
                }
            });
        });
    }

    async _seleccionarAreaCreacion(areaId) {
        document.querySelectorAll('.area-item').forEach(item => {
            if (item.dataset.areaId === areaId) {
                item.classList.add('seleccionado');
            } else {
                item.classList.remove('seleccionado');
            }
        });

        this.areaSeleccionada = this.areasDisponibles.find(a => a.id === areaId);
        document.getElementById('cargosSection').style.display = 'block';
        await this._cargarCargosAreaCreacion(areaId);
    }

    async _cargarCargosAreaCreacion(areaId) {
        const area = this.areasDisponibles.find(a => a.id === areaId);
        if (!area) return;

        const cargosContainer = document.getElementById('cargosContainer');
        if (!cargosContainer) return;

        let cargos = [];
        if (area.cargos) {
            cargos = Object.entries(area.cargos)
                .filter(([_, cargo]) => cargo.estado !== 'inactivo')
                .map(([id, cargo]) => ({ id, ...cargo }));
        }

        if (cargos.length === 0) {
            cargosContainer.innerHTML = '<p class="no-items">No hay cargos disponibles en esta área</p>';
            return;
        }

        let html = '';
        cargos.forEach(cargo => {
            html += `
                <div class="cargo-item" data-cargo-id="${cargo.id}">
                    <input type="checkbox" class="cargo-checkbox" value="${cargo.id}">
                    <div class="cargo-icon"><i class="fas fa-user-tie"></i></div>
                    <div class="cargo-info">
                        <span class="cargo-nombre">${this._escapeHTML(cargo.nombre)}</span>
                        <span class="cargo-descripcion">${this._escapeHTML(cargo.descripcion || '')}</span>
                    </div>
                </div>
            `;
        });

        cargosContainer.innerHTML = html;

        cargosContainer.querySelectorAll('.cargo-item').forEach(item => {
            const checkbox = item.querySelector('.cargo-checkbox');

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this._actualizarEstiloItem(item, checkbox.checked);
                }
                this._actualizarContadorCargos();
            });

            checkbox.addEventListener('change', (e) => {
                this._actualizarEstiloItem(item, e.target.checked);
                this._actualizarContadorCargos();
            });
        });

        this._actualizarContadorCargos();
    }

    // ========== UTILIDADES PARA SELECTORES ==========

    _actualizarEstiloItem(item, seleccionado) {
        if (seleccionado) {
            item.classList.add('seleccionado');
        } else {
            item.classList.remove('seleccionado');
        }
    }

    _actualizarContadorUsuarios() {
        const count = document.querySelectorAll('.usuario-checkbox:checked').length;
        const span = document.getElementById('selectedUsersCount');
        if (span) span.textContent = count;
    }

    _actualizarContadorCargos() {
        const count = document.querySelectorAll('.cargo-checkbox:checked').length;
        const summary = document.getElementById('selectedCargosSummary');
        const span = document.getElementById('selectedCargosCount');

        if (summary && span) {
            if (count > 0) {
                span.textContent = count;
                summary.style.display = 'flex';
            } else {
                summary.style.display = 'none';
            }
        }
    }

    // ========== GUARDAR NOTA ==========

    async _guardarNota() {
        const titulo = document.getElementById('notaTitulo').value.trim();
        if (!titulo) {
            this._mostrarError('El título es requerido');
            return;
        }

        const tipo = this.tipoSeleccionado;
        const notaId = document.getElementById('notaId').value;
        const descripcion = document.getElementById('notaDescripcion').value.trim();
        const tieneRecordatorio = document.getElementById('tieneRecordatorio').checked;
        const fechaLimiteInput = document.getElementById('fechaLimite').value;

        const items = {};
        document.querySelectorAll('#itemsList .item-row').forEach((row, index) => {
            const checkbox = row.querySelector('.item-checkbox');
            const input = row.querySelector('.item-texto');
            const texto = input.value.trim();

            if (texto) {
                const itemId = row.dataset.itemId || `item_${Date.now()}_${index}`;
                items[itemId] = {
                    id: itemId,
                    texto: texto,
                    completado: checkbox ? checkbox.checked : false,
                    fechaCreacion: new Date().toISOString()
                };
            }
        });

        let usuariosCompartidosIds = [];
        let areaId = null;
        let cargosIds = [];

        if (tipo === 'compartida') {
            usuariosCompartidosIds = Array.from(document.querySelectorAll('.usuario-checkbox:checked')).map(cb => cb.value);
        } else if (tipo === 'area') {
            const areaRadio = document.querySelector('.area-radio:checked');
            if (areaRadio) {
                areaId = areaRadio.value;
                cargosIds = Array.from(document.querySelectorAll('.cargo-checkbox:checked')).map(cb => cb.value);
            } else {
                this._mostrarError('Debes seleccionar un área');
                return;
            }
        }

        let fechaLimite = null;
        if (tieneRecordatorio && fechaLimiteInput) {
            fechaLimite = new Date(fechaLimiteInput);
            fechaLimite.setHours(23, 59, 59, 999);
        }

        const tareaData = {
            nombreActividad: titulo,
            descripcion: descripcion,
            items: items,
            tipo: tipo === 'general' ? 'global' : tipo,
            fechaLimite: fechaLimite,
            tieneRecordatorio: tieneRecordatorio
        };

        if (tipo === 'compartida') {
            tareaData.usuariosCompartidosIds = usuariosCompartidosIds;
        } else if (tipo === 'area') {
            tareaData.areaId = areaId;
            tareaData.cargosIds = cargosIds;
        }

        Swal.fire({
            title: 'Guardando...',
            html: '<i class="fas fa-spinner fa-spin"></i>',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)'
        });

        try {
            if (notaId) {
                await this.tareaManager.actualizarTarea(
                    notaId, tareaData,
                    this.usuarioActual, this.usuarioActual.organizacionCamelCase
                );
            } else {
                await this.tareaManager.crearTarea(tareaData, this.usuarioActual);
            }

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: `Nota ${notaId ? 'actualizada' : 'creada'} correctamente`,
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--color-bg-secondary)'
            });

            this._ocultarFormulario();
            await this._cargarTareas();

        } catch (error) {
            Swal.close();
            this._mostrarError(error.message);
        }
    }

    // ========== ABRIR FORMULARIO DE EDICIÓN (CON SCROLL FIX Y FOCUS SIN MOVER SCROLL) ==========

    async _abrirFormularioEdicion(tareaId) {
        Swal.fire({
            title: 'Cargando...',
            html: '<i class="fas fa-spinner fa-spin"></i>',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)'
        });

        try {
            this.tareaActual = await this.tareaManager.getTareaById(
                tareaId, this.usuarioActual.organizacionCamelCase
            );

            if (!this.tareaActual) throw new Error('Nota no encontrada');

            Swal.close();

            this.modoEdicion = true;
            this.tipoSeleccionado = this.tareaActual.tipo === 'global' ? 'general' : this.tareaActual.tipo;
            this.areaSeleccionada = null;

            document.getElementById('notaId').value = this.tareaActual.id;
            document.getElementById('notaTitulo').value = this.tareaActual.nombreActividad || '';
            document.getElementById('notaDescripcion').value = this.tareaActual.descripcion || '';

            const items = this.tareaActual.items ? Object.values(this.tareaActual.items) : [];
            this._renderizarItemsInline(items);

            const tieneRecordatorio = this.tareaActual.tieneRecordatorio || false;
            document.getElementById('tieneRecordatorio').checked = tieneRecordatorio;

            if (this.tareaActual.fechaLimite) {
                const fecha = new Date(this.tareaActual.fechaLimite);
                document.getElementById('fechaLimite').value = fecha.toISOString().split('T')[0];
            } else {
                document.getElementById('fechaLimite').value = '';
            }

            document.getElementById('fechaContainer').style.display = tieneRecordatorio ? 'block' : 'none';

            const titulos = {
                'general': 'Editar Nota General',
                'personal': 'Editar Nota Personal',
                'compartida': 'Editar Nota Compartida',
                'area': 'Editar Nota por Área'
            };
            document.getElementById('formularioTitulo').textContent = titulos[this.tipoSeleccionado] || 'Editar Nota';

            document.querySelectorAll('.tipo-option').forEach(opt => {
                if (opt.dataset.tipo === this.tipoSeleccionado) {
                    opt.classList.add('seleccionado');
                } else {
                    opt.classList.remove('seleccionado');
                }
            });

            await this._renderizarCamposEspecificosEdicion(this.tipoSeleccionado, this.tareaActual);

            const formulario = document.getElementById('formularioCreacion');
            const tituloInput = document.getElementById('notaTitulo');
            const scrollActual = window.scrollY;

            formulario.style.display = 'block';

            window.scrollTo({
                top: scrollActual,
                behavior: 'instant'
            });

            setTimeout(() => {
                if (tituloInput) {
                    const scrollPosAntes = window.scrollY;
                    tituloInput.focus();
                    tituloInput.select();
                    if (window.scrollY !== scrollPosAntes) {
                        window.scrollTo({
                            top: scrollPosAntes,
                            behavior: 'instant'
                        });
                    }
                }
            }, 50);

        } catch (error) {
            Swal.close();
            this._mostrarError('Error al cargar la nota');
        }
    }

    async _renderizarCamposEspecificosEdicion(tipo, tareaData) {
        const container = document.getElementById('camposEspecificos');
        if (!container) return;

        let html = '';

        switch (tipo) {
            case 'personal':
                html = ''; // Prioridad eliminada
                break;
            case 'compartida':
                html = this._getHTMLUsuariosEdicion(tareaData);
                break;
            case 'area':
                html = this._getHTMLAreasEdicion(tareaData);
                break;
            case 'general':
                html = this._getHTMLGeneral();
                break;
            default:
                html = '';
        }

        container.innerHTML = html;

        if (tipo === 'compartida' && html) {
            this._configurarSelectorUsuariosEdicion(tareaData);
        } else if (tipo === 'area' && html) {
            await this._configurarSelectorAreasEdicion(tareaData);
        }
    }

    _configurarSelectorUsuariosEdicion(tareaData) {
        const container = document.getElementById('usuariosContainer');
        if (!container) return;

        container.querySelectorAll('.usuario-item').forEach(item => {
            const checkbox = item.querySelector('.usuario-checkbox');

            if (checkbox.checked) {
                item.classList.add('seleccionado');
            }

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this._actualizarEstiloItem(item, checkbox.checked);
                }
                this._actualizarContadorUsuarios();
            });

            checkbox.addEventListener('change', (e) => {
                this._actualizarEstiloItem(item, e.target.checked);
                this._actualizarContadorUsuarios();
            });
        });

        document.getElementById('seleccionarTodosUsuarios')?.addEventListener('click', () => {
            container.querySelectorAll('.usuario-checkbox').forEach(cb => {
                cb.checked = true;
                this._actualizarEstiloItem(cb.closest('.usuario-item'), true);
            });
            this._actualizarContadorUsuarios();
        });

        document.getElementById('deseleccionarTodosUsuarios')?.addEventListener('click', () => {
            container.querySelectorAll('.usuario-checkbox').forEach(cb => {
                cb.checked = false;
                this._actualizarEstiloItem(cb.closest('.usuario-item'), false);
            });
            this._actualizarContadorUsuarios();
        });

        this._actualizarContadorUsuarios();
    }

    async _configurarSelectorAreasEdicion(tareaData) {
        const areasContainer = document.getElementById('areasContainer');
        if (!areasContainer) return;

        areasContainer.querySelectorAll('.area-item').forEach(item => {
            const radio = item.querySelector('.area-radio');

            if (radio.checked) {
                item.classList.add('seleccionado');
            }

            item.addEventListener('click', (e) => {
                if (e.target !== radio) {
                    radio.checked = true;
                    this._seleccionarAreaEdicion(item.dataset.areaId, tareaData);
                }
            });

            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this._seleccionarAreaEdicion(item.dataset.areaId, tareaData);
                }
            });
        });

        if (tareaData?.areaId) {
            await this._cargarCargosAreaEdicion(tareaData.areaId, tareaData);
        }
    }

    async _seleccionarAreaEdicion(areaId, tareaData) {
        document.querySelectorAll('.area-item').forEach(item => {
            if (item.dataset.areaId === areaId) {
                item.classList.add('seleccionado');
            } else {
                item.classList.remove('seleccionado');
            }
        });

        this.areaSeleccionada = this.areasDisponibles.find(a => a.id === areaId);
        document.getElementById('cargosSection').style.display = 'block';
        await this._cargarCargosAreaEdicion(areaId, tareaData);
    }

    async _cargarCargosAreaEdicion(areaId, tareaData = null) {
        const area = this.areasDisponibles.find(a => a.id === areaId);
        if (!area) return;

        const cargosContainer = document.getElementById('cargosContainer');
        if (!cargosContainer) return;

        let cargos = [];
        if (area.cargos) {
            cargos = Object.entries(area.cargos)
                .filter(([_, cargo]) => cargo.estado !== 'inactivo')
                .map(([id, cargo]) => ({ id, ...cargo }));
        }

        if (cargos.length === 0) {
            cargosContainer.innerHTML = '<p class="no-items">No hay cargos disponibles en esta área</p>';
            return;
        }

        const cargosSeleccionados = tareaData?.cargosIds || [];

        let html = '';
        cargos.forEach(cargo => {
            const seleccionado = cargosSeleccionados.includes(cargo.id) ? 'checked' : '';
            html += `
                <div class="cargo-item" data-cargo-id="${cargo.id}">
                    <input type="checkbox" class="cargo-checkbox" value="${cargo.id}" ${seleccionado}>
                    <div class="cargo-icon"><i class="fas fa-user-tie"></i></div>
                    <div class="cargo-info">
                        <span class="cargo-nombre">${this._escapeHTML(cargo.nombre)}</span>
                        <span class="cargo-descripcion">${this._escapeHTML(cargo.descripcion || '')}</span>
                    </div>
                </div>
            `;
        });

        cargosContainer.innerHTML = html;

        cargosContainer.querySelectorAll('.cargo-item').forEach(item => {
            const checkbox = item.querySelector('.cargo-checkbox');

            if (checkbox.checked) {
                item.classList.add('seleccionado');
            }

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this._actualizarEstiloItem(item, checkbox.checked);
                }
                this._actualizarContadorCargos();
            });

            checkbox.addEventListener('change', (e) => {
                this._actualizarEstiloItem(item, e.target.checked);
                this._actualizarContadorCargos();
            });
        });

        this._actualizarContadorCargos();
    }

    // ========== ELIMINAR TAREA ==========

    async _eliminarTarea(tareaId) {
        const result = await Swal.fire({
            title: '¿Eliminar nota?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--color-bg-secondary)',
            confirmButtonColor: '#dc3545'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Eliminando...',
            html: '<i class="fas fa-spinner fa-spin"></i>',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)'
        });

        try {
            await this.tareaManager.eliminarTarea(
                tareaId, this.usuarioActual, this.usuarioActual.organizacionCamelCase
            );

            Swal.close();

            await Swal.fire({
                icon: 'success',
                title: 'Eliminada',
                text: 'La nota se eliminó correctamente',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--color-bg-secondary)'
            });

            await this._cargarTareas();

        } catch (error) {
            Swal.close();
            this._mostrarError(error.message);
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    _configurarEventos() {
        document.getElementById('btnCrearNota')?.addEventListener('click', () => {
            this._mostrarFormularioCreacion();
        });

        document.getElementById('cerrarFormulario')?.addEventListener('click', () => {
            this._ocultarFormulario();
        });

        document.getElementById('cancelarNota')?.addEventListener('click', () => {
            this._ocultarFormulario();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tipoActual = btn.dataset.tipo;
                this._aplicarFiltros();
            });
        });

        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.terminoBusqueda = e.target.value.trim().toLowerCase();
                this._aplicarFiltros();
            }, 300);
        });

        document.querySelectorAll('.tipo-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const tipo = opt.dataset.tipo;
                this._seleccionarTipoFormulario(tipo);
            });
        });

        document.getElementById('guardarNota')?.addEventListener('click', () => this._guardarNota());

        document.getElementById('tieneRecordatorio')?.addEventListener('change', (e) => {
            document.getElementById('fechaContainer').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('btnAgregarItem')?.addEventListener('click', () => {
            this._agregarItemFormulario();
        });
    }

    // ========== ESTADOS DE UI ==========

    _mostrarCarga() {
        const container = document.getElementById('tareasGrid');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <h3>Cargando notas...</h3>
                    </div>
                </div>
            `;
        }
    }

    _mostrarErrorEnGrid(mensaje) {
        const container = document.getElementById('tareasGrid');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-content">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Error</h3>
                        <p>${this._escapeHTML(mensaje)}</p>
                        <button onclick="window.location.reload()" class="reload-btn">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    }

    _getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-sticky-note"></i>
                    <h3>No hay notas</h3>
                    <p>No se encontraron notas para mostrar</p>
                </div>
            </div>
        `;
    }

    // ========== UTILIDADES ==========

    _obtenerIniciales(nombre) {
        if (!nombre) return 'U';
        return nombre.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
    }

    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    _mostrarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            background: 'var(--color-bg-secondary)',
            confirmButtonColor: '#2f8cff'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TareasController();
});