// areas.js - VERSIÓN SIN EDICIÓN, REDIRIGE A OTRAS PÁGINAS
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
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
        this.areaSeleccionada = null;
        
        this.userManager = {
    currentUser: {
        id: 'admin_default',
        nombre: 'Administrador',
        cargo: 'administrador',
        organizacion: 'Tu Empresa',  // Cambia esto
        organizacionCamelCase: 'tuEmpresa'  // Cambia esto también
    }
        };
        
        console.log('✅ Controller creado');
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
            'btnNuevaArea', 'tablaAreasBody', 'toggleEliminadas',
            'modalConfirmar', 'btnConfirmarAccion',
            'vistaLista'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${el ? '✅' : '❌'} ${id}`);
        });
    }
    
    inicializarEventos() {
        console.log('🎮 Configurando eventos...');
        
        try {
            // Botón nueva área - Redirige a crear área
            const btnNuevaArea = document.getElementById('btnNuevaArea');
            if (btnNuevaArea) {
                btnNuevaArea.addEventListener('click', () => this.irACrearArea());
                console.log('✅ Evento btnNuevaArea configurado para redirección');
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
                btnConfirmarAccion.addEventListener('click', () => this.ejecutarAccionConfirmada());
                console.log('✅ Evento btnConfirmarAccion');
            }
            
            console.log('✅ Todos los eventos configurados');
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }
    
    // ========== MÉTODOS DE NAVEGACIÓN ==========
    
    irACrearArea() {
        console.log('➡️ Redirigiendo a página de creación de áreas...');
        
        // 🎯 AJUSTA ESTA RUTA SEGÚN TU ESTRUCTURA
        // Opción 1: Si editarAreas.html está en el mismo directorio que areas.html:
        // window.location.href = 'crearAreas.html';
        
        // Opción 2: Si está en un directorio paralelo (recomendado basado en tu estructura):
        window.location.href = '/users/admin/crearAreas/crearAreas.html';
        
        // Opción 3: Si usas rutas absolutas:
        // window.location.href = '/users/admin/crearAreas/crearAreas.html';
    }
    
    // ✅ CORRECIÓN APLICADA AQUÍ
    irAEditarArea(areaId) {
        console.log(`➡️ Redirigiendo a editar área: ${areaId}`);
        
        // 🚨 ELIMINADO: sessionStorage.setItem('areaIdParaEditar', areaId);
        // 🚨 ELIMINADO: window.location.href = '/users/admin/editarAreas/editarAreas.html';
        
        // ✅ CORRECCIÓN: Pasar el ID por URL como parámetro
        window.location.href = `/users/admin/editarAreas/editarAreas.html?id=${areaId}`;
    }
    
    // ========== MÉTODOS CRUD ==========
    
    async cargarAreas(incluirEliminadas = false) {
        try {
            this.mostrarCargando();
            
            const organizacion = this.userManager.currentUser.organizacionCamelCase;
            console.log(`📥 Cargando áreas para: ${organizacion}`);
            
            this.areas = await this.areaManager.getAreasByOrganizacion(organizacion, incluirEliminadas);
            console.log(`📊 ${this.areas.length} áreas cargadas`);
            
            this.actualizarTabla();
            
        } catch (error) {
            console.error('❌ Error cargando áreas:', error);
            this.mostrarError('Error cargando áreas: ' + error.message);
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
            
            // Crear un modal simple para mostrar detalles
            const detallesHTML = `
                <div class="modal fade" id="modalDetallesTemp" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="fas fa-info-circle me-2"></i>Detalles del Área</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="d-flex align-items-center mb-4">
                                            <div class="area-color me-3" style="background-color: ${detalles.color || '#3498db'}; width: 30px; height: 30px;"></div>
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
                                                <p class="mb-0"><strong>Presupuesto:</strong> $${detalles.presupuestoAnual}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Crear y mostrar el modal
            const modalDiv = document.createElement('div');
            modalDiv.innerHTML = detallesHTML;
            document.body.appendChild(modalDiv);
            
            const modal = new bootstrap.Modal(document.getElementById('modalDetallesTemp'));
            modal.show();
            
            // Remover el modal del DOM después de cerrar
            modalDiv.addEventListener('hidden.bs.modal', () => {
                modalDiv.remove();
            });
            
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
            case 'editar':  // Redirige a la página de edición
                this.irAEditarArea(areaId);
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
    
    actualizarTabla() {
        const tbody = document.getElementById('tablaAreasBody');
        if (!tbody) return;
        
        const areasPaginadas = this.paginarAreas(this.areas, this.paginacionActual);
        
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
        
        this.actualizarPaginacion(this.areas.length);
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
                <!-- Botón EDITAR - Redirige a editarAreas.html -->
                <button class="btn btn-sm btn-warning" data-action="editar" data-id="${area.id}" title="Editar Área">
                    <i class="fas fa-edit"></i>
                </button>
                ${area.activo ? 
                    `<button class="btn btn-sm btn-secondary" data-action="desactivar" data-id="${area.id}" title="Desactivar">
                        <i class="fas fa-pause"></i>
                    </button>` : 
                    `<button class="btn btn-sm btn-success" data-action="activar" data-id="${area.id}" title="Activar">
                        <i class="fas fa-play"></i>
                    </button>`
                }
                <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${area.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
    }
    
    // ========== UTILIDADES ==========
    
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