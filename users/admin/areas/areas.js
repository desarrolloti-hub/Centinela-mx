// areas.js - VERSIÓN CORREGIDA CON BINDING DE MÉTODOS
console.log('🚀 areas.js iniciando...');

// Variable global para debugging
window.appDebug = {
    estado: 'iniciando',
    controller: null
};

// Cargar dependencias
let Area, AreaManager, db;

async function cargarDependencias() {
    try {
        console.log('1️⃣ Cargando dependencias...');
        
        // Cargar firebase-config
        const firebaseModule = await import('/config/firebase-config.js');
        db = firebaseModule.db;
        console.log('✅ Firebase cargado');
        
        // Cargar clases
        const areaModule = await import('/clases/area.js');
        Area = areaModule.Area;
        AreaManager = areaModule.AreaManager;
        console.log('✅ Clases cargadas');
        
        // Iniciar aplicación
        iniciarAplicacion();
        
    } catch (error) {
        console.error('❌ Error cargando dependencias:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error de Carga</h4>
            <p><strong>Error:</strong> ${error.message}</p>
            <div class="alert alert-warning mt-3">
                Verifica que los archivos existan en:
                <ul class="mb-0 mt-2">
                    <li><code>/config/firebase-config.js</code></li>
                    <li><code>/clases/area.js</code></li>
                </ul>
            </div>
        `);
    }
}

function mostrarErrorInterfaz(mensajeHTML) {
    const container = document.querySelector('.container-fluid') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4';
    errorDiv.innerHTML = mensajeHTML;
    container.prepend(errorDiv);
}

function iniciarAplicacion() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarController);
    } else {
        inicializarController();
    }
}

function inicializarController() {
    try {
        console.log('🎯 Inicializando controller...');
        
        const app = new AreasController();
        window.appDebug.controller = app;
        
        // Vincular todos los métodos al contexto correcto
        app.bindMethods();
        
        // Inicializar
        app.init();
        
        console.log('✅ Aplicación lista');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger">Error de Inicialización</h4>
            <p>${error.message}</p>
        `);
    }
}

// ==================== CLASE AREASCONTROLLER ====================
class AreasController {
    constructor() {
        console.log('🛠️ Creando AreasController...');
        
        this.areaManager = new AreaManager();
        this.areas = [];
        this.filtroActual = 'todas';
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
        this.areaSeleccionada = null;
        
        // Usuario demo
        this.userManager = {
            currentUser: {
                id: 'admin_demo',
                nombre: 'Administrador',
                cargo: 'administrador',
                organizacion: 'Mi Empresa',
                organizacionCamelCase: 'miEmpresa'
            }
        };
        
        console.log('✅ Controller creado');
    }
    
    // ========== VINCULAR MÉTODOS (IMPORTANTE) ==========
    bindMethods() {
        console.log('🔗 Vinculando métodos...');
        
        // Vincular todos los métodos que se usan en event listeners
        this.mostrarFormularioNuevaArea = this.mostrarFormularioNuevaArea.bind(this);
        this.guardarArea = this.guardarArea.bind(this);
        this.generarColorAleatorio = this.generarColorAleatorio.bind(this);
        this.ejecutarAccionConfirmada = this.ejecutarAccionConfirmada.bind(this);
        
        // Vincular métodos de filtros
        this.aplicarFiltroTodas = () => this.aplicarFiltro('todas');
        this.aplicarFiltroActivas = () => this.aplicarFiltro('activas');
        this.aplicarFiltroInactivas = () => this.aplicarFiltro('inactivas');
        this.aplicarFiltroEliminadas = () => this.aplicarFiltro('eliminadas');
        
        // Vincular búsqueda
        this.buscarAreas = this.buscarAreas.bind(this);
        
        console.log('✅ Métodos vinculados');
    }
    
    init() {
        console.log('🎬 Iniciando aplicación...');
        
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.cargarAreas();
        
        console.log('✅ Aplicación iniciada');
    }
    
    verificarElementosDOM() {
        console.log('🔍 Verificando DOM...');
        
        const ids = [
            'btnNuevaArea', 'tablaAreasBody', 'statsContainer', 'searchInput',
            'modalArea', 'formArea', 'btnGuardarArea', 'btnColorRandom',
            'btnFiltrarTodas', 'btnFiltrarActivas', 'btnFiltrarInactivas', 'btnFiltrarEliminadas',
            'toggleEliminadas', 'modalConfirmar', 'btnConfirmarAccion'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${el ? '✅' : '❌'} ${id}`);
        });
    }
    
    inicializarEventos() {
        console.log('🎮 Configurando eventos...');
        
        try {
            // Botón nueva área
            const btnNuevaArea = document.getElementById('btnNuevaArea');
            if (btnNuevaArea) {
                btnNuevaArea.addEventListener('click', this.mostrarFormularioNuevaArea);
                console.log('✅ Evento btnNuevaArea');
            }
            
            // Botón guardar área
            const btnGuardarArea = document.getElementById('btnGuardarArea');
            if (btnGuardarArea) {
                btnGuardarArea.addEventListener('click', this.guardarArea);
                console.log('✅ Evento btnGuardarArea');
            }
            
            // Botón color aleatorio
            const btnColorRandom = document.getElementById('btnColorRandom');
            if (btnColorRandom) {
                btnColorRandom.addEventListener('click', this.generarColorAleatorio);
                console.log('✅ Evento btnColorRandom');
            }
            
            // Filtros
            document.getElementById('btnFiltrarTodas')?.addEventListener('click', this.aplicarFiltroTodas);
            document.getElementById('btnFiltrarActivas')?.addEventListener('click', this.aplicarFiltroActivas);
            document.getElementById('btnFiltrarInactivas')?.addEventListener('click', this.aplicarFiltroInactivas);
            document.getElementById('btnFiltrarEliminadas')?.addEventListener('click', this.aplicarFiltroEliminadas);
            console.log('✅ Eventos de filtro');
            
            // Búsqueda
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', this.buscarAreas);
                console.log('✅ Evento searchInput');
            }
            
            // Toggle eliminadas
            const toggleEliminadas = document.getElementById('toggleEliminadas');
            if (toggleEliminadas) {
                toggleEliminadas.addEventListener('change', (e) => {
                    this.cargarAreas(e.target.checked);
                });
                console.log('✅ Evento toggleEliminadas');
            }
            
            // Confirmación
            const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
            if (btnConfirmarAccion) {
                btnConfirmarAccion.addEventListener('click', this.ejecutarAccionConfirmada);
                console.log('✅ Evento btnConfirmarAccion');
            }
            
            console.log('✅ Todos los eventos configurados');
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }
    
    // ========== MÉTODOS CRUD ==========
    
    async cargarAreas(incluirEliminadas = false) {
        try {
            this.mostrarCargando();
            
            const organizacion = this.userManager.currentUser.organizacionCamelCase;
            console.log(`📥 Cargando áreas para: ${organizacion}`);
            
            this.areas = await this.areaManager.getAreasByOrganizacion(organizacion, incluirEliminadas);
            console.log(`📊 ${this.areas.length} áreas cargadas`);
            
            this.actualizarEstadisticas();
            this.actualizarTabla();
            
        } catch (error) {
            console.error('❌ Error cargando áreas:', error);
            this.mostrarError('Error cargando áreas: ' + error.message);
        }
    }
    
    async guardarArea() {
        console.log('💾 Guardando área...');
        
        try {
            const form = document.getElementById('formArea');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const areaId = document.getElementById('areaId').value;
            const esNueva = !areaId;
            
            // Obtener datos del formulario
            const areaData = {
                nombreArea: document.getElementById('nombreArea').value.trim(),
                descripcion: document.getElementById('descripcion').value.trim(),
                caracteristicas: document.getElementById('caracteristicas').value.trim(),
                color: document.getElementById('color').value,
                icono: document.getElementById('icono').value,
                capacidadMaxima: parseInt(document.getElementById('capacidadMaxima').value) || 0,
                presupuestoAnual: parseFloat(document.getElementById('presupuestoAnual').value) || 0,
                activo: document.getElementById('activo').checked,
                objetivos: document.getElementById('objetivos').value.split('\n').filter(o => o.trim() !== '')
            };
            
            console.log('📝 Datos del formulario:', areaData);
            
            if (esNueva) {
                // Crear nueva área
                console.log('🆕 Creando nueva área...');
                await this.areaManager.crearArea(
                    areaData, 
                    this.userManager.currentUser.id, 
                    this.userManager
                );
                this.mostrarExito('✅ Área creada exitosamente');
                
            } else {
                // Actualizar área existente
                console.log('✏️ Actualizando área:', areaId);
                await this.areaManager.actualizarArea(
                    areaId,
                    areaData,
                    this.userManager.currentUser.id
                );
                this.mostrarExito('✅ Área actualizada exitosamente');
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalArea'));
            if (modal) {
                modal.hide();
            }
            
            // Recargar lista
            await this.cargarAreas();
            
        } catch (error) {
            console.error('❌ Error guardando área:', error);
            this.mostrarError('Error guardando área: ' + error.message);
        }
    }
    
    mostrarFormularioNuevaArea() {
        console.log('📝 Mostrando formulario para nueva área');
        
        try {
            // Limpiar formulario
            const form = document.getElementById('formArea');
            if (form) {
                form.reset();
            }
            
            document.getElementById('areaId').value = '';
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-building me-2"></i>Nueva Área';
            document.getElementById('btnGuardarArea').textContent = 'Crear Área';
            document.getElementById('btnGuardarArea').className = 'btn btn-primary';
            
            // Generar color aleatorio
            this.generarColorAleatorio();
            
            // Mostrar modal
            const modalElement = document.getElementById('modalArea');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
            
        } catch (error) {
            console.error('❌ Error mostrando formulario:', error);
        }
    }
    
    async mostrarFormularioEdicion(areaId) {
        try {
            console.log('✏️ Cargando área para edición:', areaId);
            
            const area = await this.areaManager.getAreaById(areaId);
            if (!area) {
                this.mostrarError('Área no encontrada');
                return;
            }
            
            // Llenar formulario
            document.getElementById('areaId').value = area.id;
            document.getElementById('nombreArea').value = area.nombreArea;
            document.getElementById('descripcion').value = area.descripcion || '';
            document.getElementById('caracteristicas').value = area.caracteristicas || '';
            document.getElementById('color').value = area.color || '#3498db';
            document.getElementById('icono').value = area.icono || 'fas fa-building';
            document.getElementById('capacidadMaxima').value = area.capacidadMaxima || 0;
            document.getElementById('presupuestoAnual').value = area.presupuestoAnual || 0;
            document.getElementById('activo').checked = area.activo !== false;
            document.getElementById('objetivos').value = Array.isArray(area.objetivos) ? area.objetivos.join('\n') : '';
            
            document.getElementById('modalTitle').innerHTML = `<i class="fas fa-edit me-2"></i>Editar Área: ${area.nombreArea}`;
            document.getElementById('btnGuardarArea').textContent = 'Actualizar Área';
            document.getElementById('btnGuardarArea').className = 'btn btn-warning';
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('modalArea'));
            modal.show();
            
        } catch (error) {
            console.error('❌ Error cargando área para edición:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    // ========== ACCIONES ==========
    
    async eliminarArea(areaId) {
        try {
            console.log('🗑️ Eliminando área:', areaId);
            await this.areaManager.eliminarArea(areaId, this.userManager.currentUser.id);
            this.mostrarExito('Área eliminada exitosamente');
            await this.cargarAreas();
        } catch (error) {
            console.error('❌ Error eliminando área:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    async restaurarArea(areaId) {
        try {
            console.log('🔄 Restaurando área:', areaId);
            await this.areaManager.restaurarArea(areaId, this.userManager.currentUser.id);
            this.mostrarExito('Área restaurada exitosamente');
            await this.cargarAreas();
        } catch (error) {
            console.error('❌ Error restaurando área:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    async activarArea(areaId) {
        try {
            console.log('✅ Activando área:', areaId);
            await this.areaManager.activarArea(areaId, this.userManager.currentUser.id);
            this.mostrarExito('Área activada exitosamente');
            await this.cargarAreas();
        } catch (error) {
            console.error('❌ Error activando área:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    async desactivarArea(areaId) {
        try {
            console.log('⏸️ Desactivando área:', areaId);
            await this.areaManager.desactivarArea(areaId, this.userManager.currentUser.id);
            this.mostrarExito('Área desactivada exitosamente');
            await this.cargarAreas();
        } catch (error) {
            console.error('❌ Error desactivando área:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    async verDetalles(areaId) {
        try {
            console.log('👁️ Mostrando detalles:', areaId);
            
            const area = await this.areaManager.getAreaById(areaId);
            if (!area) {
                this.mostrarError('Área no encontrada');
                return;
            }
            
            const detalles = area.toUI();
            const contenido = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-4">
                            <div class="area-color me-3" style=" width: 30px; height: 30px;"></div>
                            <div>
                                <h4>${detalles.nombreArea}</h4>
                                <div class="d-flex align-items-center">
                                    ${detalles.estadoBadge}
                                    <span class="ms-3"><i class="fas fa-building me-1"></i>${detalles.organizacion}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <h6><i class="fas fa-align-left me-2"></i>Descripción</h6>
                            <p class="text-muted">${detalles.descripcion || 'Sin descripción'}</p>
                        </div>
                        
                        <div class="mb-4">
                            <h6><i class="fas fa-star me-2"></i>Características</h6>
                            <p class="text-muted">${detalles.caracteristicas || 'Sin características'}</p>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información</h6>
                            </div>
                            <div class="card-body">
                                <p class="mb-2"><strong>Creación:</strong> ${detalles.fechaCreacion}</p>
                                <p class="mb-2"><strong>Última actualización:</strong> ${detalles.fechaActualizacion}</p>
                                <p class="mb-2"><strong>Cargos:</strong> ${detalles.totalCargos} total, ${detalles.cargosActivos} activos</p>
                                <p class="mb-2"><strong>Capacidad:</strong> ${detalles.capacidadMaxima === 0 ? 'Ilimitado' : detalles.capacidadMaxima}</p>
                                <p class="mb-0"><strong>Presupuesto:</strong> ${detalles.presupuestoAnual}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('detallesContent').innerHTML = contenido;
            new bootstrap.Modal(document.getElementById('modalDetalles')).show();
            
        } catch (error) {
            console.error('❌ Error mostrando detalles:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    solicitarEliminacion(areaId) {
        console.log('⚠️ Solicitando confirmación para eliminar:', areaId);
        
        this.areaSeleccionada = areaId;
        
        document.getElementById('confirmarMensaje').innerHTML = `
            <p>¿Está seguro de eliminar esta área?</p>
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Advertencia:</strong> Esta acción marcará el área como eliminada.
            </div>
        `;
        
        document.getElementById('btnConfirmarAccion').textContent = 'Eliminar';
        document.getElementById('btnConfirmarAccion').className = 'btn btn-danger';
        
        new bootstrap.Modal(document.getElementById('modalConfirmar')).show();
    }
    
    ejecutarAccionConfirmada() {
        console.log('✅ Ejecutando acción confirmada');
        
        if (this.areaSeleccionada) {
            this.eliminarArea(this.areaSeleccionada);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
        }
    }
    
    ejecutarAccion(accion, areaId) {
        console.log(`🎯 Ejecutando acción: ${accion} para ${areaId}`);
        
        switch(accion) {
            case 'ver':
                this.verDetalles(areaId);
                break;
            case 'editar':
                this.mostrarFormularioEdicion(areaId);
                break;
            case 'eliminar':
                this.solicitarEliminacion(areaId);
                break;
            case 'activar':
                this.activarArea(areaId);
                break;
            case 'desactivar':
                this.desactivarArea(areaId);
                break;
            case 'restaurar':
                this.restaurarArea(areaId);
                break;
        }
    }
    
    // ========== INTERFAZ ==========
    
    actualizarEstadisticas() {
        const total = this.areas.length;
        const activas = this.areas.filter(a => a.estaActiva()).length;
        const inactivas = this.areas.filter(a => !a.activo && !a.eliminado).length;
        const eliminadas = this.areas.filter(a => a.eliminado).length;
        
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="col-md-3">
                    <div class="stats-card total">
                        <i class="fas fa-building"></i>
                        <div class="number">${total}</div>
                        <div class="label">Total Áreas</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card activas">
                        <i class="fas fa-check-circle"></i>
                        <div class="number">${activas}</div>
                        <div class="label">Áreas Activas</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card inactivas">
                        <i class="fas fa-pause-circle"></i>
                        <div class="number">${inactivas}</div>
                        <div class="label">Áreas Inactivas</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card eliminadas">
                        <i class="fas fa-trash-alt"></i>
                        <div class="number">${eliminadas}</div>
                        <div class="label">Áreas Eliminadas</div>
                    </div>
                </div>
            `;
        }
    }
    
    actualizarTabla() {
        const tbody = document.getElementById('tablaAreasBody');
        if (!tbody) return;
        
        const areasFiltradas = this.filtrarAreas(this.areas);
        const areasPaginadas = this.paginarAreas(areasFiltradas, this.paginacionActual);
        
        tbody.innerHTML = '';
        
        if (areasPaginadas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No se encontraron áreas</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        areasPaginadas.forEach((area, index) => {
            const numero = (this.paginacionActual - 1) * this.elementosPorPagina + index + 1;
            const fila = this.crearFilaArea(area, numero);
            tbody.appendChild(fila);
        });
        
        this.actualizarPaginacion(areasFiltradas.length);
    }
    
    crearFilaArea(area, numero) {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${numero}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="area-color" style="background-color: ${area.color || ''};"></div>
                    <div>
                        <strong>${area.nombreArea}</strong>
                        <div class="text-muted small">${area.descripcion?.substring(0, 50) || ''}${area.descripcion?.length > 50 ? '...' : ''}</div>
                    </div>
                </div>
            </td>
            <td>${area.nombreOrganizacion}</td>
            <td>
                <span class="badge bg-primary">${area.getCantidadCargos()} cargos</span>
                <div class="small text-muted">${area.getCargosActivos().length} activos</div>
            </td>
            <td>${area.getEstadoBadge()}</td>
            <td>
                <div class="small">${area.getFechaCreacionFormateada()}</div>
            </td>
            <td>
                <div class="action-buttons">
                    ${this.obtenerBotonesAccion(area)}
                </div>
            </td>
        `;
        
        // Asignar eventos
        setTimeout(() => {
            fila.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.closest('[data-action]').dataset.action;
                    const id = e.target.closest('[data-action]').dataset.id;
                    this.ejecutarAccion(action, id);
                });
            });
        }, 50);
        
        return fila;
    }
    
    obtenerBotonesAccion(area) {
        if (area.eliminado) {
            return `
                <button class="btn btn-sm btn-success" data-action="restaurar" data-id="${area.id}" title="Restaurar">
                    <i class="fas fa-undo"></i>
                </button>
            `;
        } else {
            return `
                <button class="btn btn-sm btn-primary" data-action="ver" data-id="${area.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" data-action="editar" data-id="${area.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${area.activo ? 
                    `<button class="btn btn-sm btn-secondary" data-action="desactivar" data-id="${area.id}" title="Desactivar">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${area.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>` : 
                    `<button class="btn btn-sm btn-success" data-action="activar" data-id="${area.id}" title="Activar">
                        <i class="fas fa-play"></i>
                    </button>`
                }
            `;
        }
    }
    
    // ========== UTILIDADES ==========
    
    generarColorAleatorio() {
        const colores = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
        const colorInput = document.getElementById('color');
        if (colorInput) {
            colorInput.value = colores[Math.floor(Math.random() * colores.length)];
        }
    }
    
    aplicarFiltro(filtro) {
        this.filtroActual = filtro;
        this.paginacionActual = 1;
        this.actualizarTabla();
    }
    
    buscarAreas() {
        this.paginacionActual = 1;
        this.actualizarTabla();
    }
    
    filtrarAreas(listaAreas) {
        let filtradas = [...listaAreas];
        
        switch(this.filtroActual) {
            case 'activas':
                filtradas = filtradas.filter(a => a.activo && !a.eliminado);
                break;
            case 'inactivas':
                filtradas = filtradas.filter(a => !a.activo && !a.eliminado);
                break;
            case 'eliminadas':
                filtradas = filtradas.filter(a => a.eliminado);
                break;
        }
        
        const termino = document.getElementById('searchInput')?.value.toLowerCase() || '';
        if (termino) {
            filtradas = filtradas.filter(area => 
                area.nombreArea.toLowerCase().includes(termino) ||
                area.descripcion.toLowerCase().includes(termino)
            );
        }
        
        return filtradas;
    }
    
    paginarAreas(listaAreas, pagina) {
        const inicio = (pagina - 1) * this.elementosPorPagina;
        const fin = inicio + this.elementosPorPagina;
        return listaAreas.slice(inicio, fin);
    }
    
    actualizarPaginacion(totalElementos) {
        const totalPaginas = Math.ceil(totalElementos / this.elementosPorPagina);
        const paginacionElement = document.getElementById('pagination');
        const infoElement = document.getElementById('paginationInfo');
        
        if (infoElement) {
            const inicio = (this.paginacionActual - 1) * this.elementosPorPagina + 1;
            const fin = Math.min(this.paginacionActual * this.elementosPorPagina, totalElementos);
            infoElement.textContent = `Mostrando ${inicio} - ${fin} de ${totalElementos} áreas`;
        }
        
        if (paginacionElement && totalPaginas > 1) {
            paginacionElement.innerHTML = '';
            
            // Botón anterior
            const liAnterior = document.createElement('li');
            liAnterior.className = `page-item ${this.paginacionActual === 1 ? 'disabled' : ''}`;
            liAnterior.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
            liAnterior.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.paginacionActual > 1) {
                    this.cambiarPagina(this.paginacionActual - 1);
                }
            });
            paginacionElement.appendChild(liAnterior);
            
            // Números de página
            for (let i = 1; i <= totalPaginas; i++) {
                const li = document.createElement('li');
                li.className = `page-item ${this.paginacionActual === i ? 'active' : ''}`;
                li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
                li.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.cambiarPagina(i);
                });
                paginacionElement.appendChild(li);
            }
            
            // Botón siguiente
            const liSiguiente = document.createElement('li');
            liSiguiente.className = `page-item ${this.paginacionActual === totalPaginas ? 'disabled' : ''}`;
            liSiguiente.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
            liSiguiente.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.paginacionActual < totalPaginas) {
                    this.cambiarPagina(this.paginacionActual + 1);
                }
            });
            paginacionElement.appendChild(liSiguiente);
        }
    }
    
    cambiarPagina(pagina) {
        this.paginacionActual = pagina;
        this.actualizarTabla();
    }
    
    mostrarCargando() {
        const tbody = document.getElementById('tablaAreasBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-3">Cargando áreas...</p>
                    </td>
                </tr>
            `;
        }
    }
    
    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
    }
    
    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }
    
    mostrarNotificacion(mensaje, tipo) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    }
}

// ========== INICIAR APLICACIÓN ==========
console.log('🎬 Iniciando carga...');
cargarDependencias();