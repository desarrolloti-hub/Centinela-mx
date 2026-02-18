// editarAreas.js - VERSIÓN LIMPIA
window.editarAreaDebug = {
    estado: 'iniciando',
    controller: null
};

let Area, AreaManager;

async function cargarDependencias() {
    try {
        const areaModule = await import('/clases/area.js');
        Area = areaModule.Area;
        AreaManager = areaModule.AreaManager;
        
        iniciarAplicacion();
        
    } catch (error) {
        console.error('[Error]', error.message);
        mostrarErrorInterfaz(error.message);
    }
}

function mostrarErrorInterfaz(mensaje) {
    const container = document.querySelector('.container-fluid') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4';
    errorDiv.innerHTML = `<h4 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error: ${mensaje}</h4>`;
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
        const app = new EditarAreaController();
        window.editarAreaDebug.controller = app;
        app.init();
    } catch (error) {
        console.error('[Error]', error.message);
        mostrarErrorInterfaz(error.message);
    }
}

class EditarAreaController {
    constructor() {
        this.areaManager = new AreaManager();
        this.userManager = this.cargarUsuarioDesdeStorage();
        
        if (!this.userManager || !this.userManager.currentUser) {
            this.redirigirAlLogin();
            throw new Error('Usuario no autenticado');
        }
        
        this.areaActual = null;
        this.datosOriginales = null;
        this.loadingOverlay = null;
        this.cargos = [];
        this._inputHandler = null;
        this._submitHandler = null;
    }
    
    cargarUsuarioDesdeStorage() {
        try {
            let userData = null;
            
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                userData = {
                    id: adminData.id || `admin_${Date.now()}`,
                    nombre: adminData.nombreCompleto || 'Administrador',
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    rol: 'administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase || this.convertirACamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || '',
                    fotoUsuario: adminData.fotoUsuario,
                    fotoOrganizacion: adminData.fotoOrganizacion,
                    esSuperAdmin: adminData.esSuperAdmin || true,
                    esAdminOrganizacion: adminData.esAdminOrganizacion || true,
                    timestamp: adminData.timestamp || new Date().toISOString(),
                    esResponsable: true
                };
            }
            
            if (!userData) {
                const storedUserData = localStorage.getItem('userData');
                if (storedUserData) {
                    userData = JSON.parse(storedUserData);
                    userData.nombreCompleto = userData.nombreCompleto || userData.nombre || 'Usuario';
                    userData.esResponsable = false;
                }
            }
            
            if (!userData) return null;
            
            if (!userData.id) userData.id = `user_${Date.now()}`;
            if (!userData.organizacion) userData.organizacion = 'Sin organización';
            if (!userData.organizacionCamelCase) {
                userData.organizacionCamelCase = this.convertirACamelCase(userData.organizacion);
            }
            if (!userData.rol) userData.rol = 'colaborador';
            if (!userData.nombreCompleto) userData.nombreCompleto = userData.nombre || 'Usuario';
            
            return { currentUser: userData };
            
        } catch (error) {
            return null;
        }
    }
    
    async cargarResponsables() {
        const responsableSelect = document.getElementById('responsable');
        if (!responsableSelect) return;
        
        try {
            responsableSelect.innerHTML = '<option value="">Seleccionar responsable...</option>';
            
            if (this.userManager.currentUser) {
                const adminOption = document.createElement('option');
                adminOption.value = 'admin_fijo';
                adminOption.text = `${this.userManager.currentUser.nombreCompleto} (Administrador)`;
                adminOption.selected = true;
                adminOption.style.fontWeight = 'bold';
                responsableSelect.appendChild(adminOption);
            }
            
            const colaboradores = await this.cargarColaboradoresDesdeSistema();
            if (colaboradores?.length > 0) {
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.text = '────────── COLABORADORES ──────────';
                responsableSelect.appendChild(separator);
                
                colaboradores.forEach(colaborador => {
                    const option = document.createElement('option');
                    option.value = colaborador.id || colaborador.userId || `colab_${Date.now()}`;
                    
                    let nombreMostrar = colaborador.nombre || 'Colaborador';
                    if (colaborador.apellido) {
                        nombreMostrar += ` ${colaborador.apellido}`;
                    }
                    if (colaborador.cargo) {
                        nombreMostrar += ` (${colaborador.cargo})`;
                    }
                    
                    option.text = nombreMostrar;
                    responsableSelect.appendChild(option);
                });
            }
            
            const otroSeparator = document.createElement('option');
            otroSeparator.disabled = true;
            otroSeparator.text = '────────── OTRAS OPCIONES ──────────';
            responsableSelect.appendChild(otroSeparator);
            
            const nuevoOption = document.createElement('option');
            nuevoOption.value = 'nuevo';
            nuevoOption.text = '🆕 Asignar nuevo responsable...';
            responsableSelect.appendChild(nuevoOption);
            
        } catch (error) {
            this.mostrarNotificacion('Error cargando responsables', 'warning');
        }
    }
    
    async cargarColaboradoresDesdeSistema() {
        try {
            const orgKey = this.userManager.currentUser.organizacionCamelCase;
            const colaboradoresStorage = localStorage.getItem(`colaboradores_${orgKey}`);
            
            if (colaboradoresStorage) {
                const colaboradores = JSON.parse(colaboradoresStorage);
                if (colaboradores.length > 0) return colaboradores;
            }
            
            if (this.areaManager && typeof this.areaManager.obtenerColaboradoresPorOrganizacion === 'function') {
                const colaboradoresFB = await this.areaManager.obtenerColaboradoresPorOrganizacion(orgKey);
                
                if (colaboradoresFB?.length > 0) {
                    localStorage.setItem(`colaboradores_${orgKey}`, JSON.stringify(colaboradoresFB));
                    return colaboradoresFB;
                }
            }
            
            const usuariosStorage = localStorage.getItem('usuariosOrganizacion');
            if (usuariosStorage) {
                const usuarios = JSON.parse(usuariosStorage);
                return usuarios.filter(user => 
                    user.organizacionCamelCase === orgKey && 
                    user.id !== this.userManager.currentUser.id
                );
            }
            
            return [];
            
        } catch (error) {
            return [];
        }
    }
    
    configurarOrganizacionAutomatica() {
        const organizacionSelect = document.getElementById('organizacion');
        if (!organizacionSelect || !this.userManager.currentUser) return;
        
        const organizacionUsuario = this.userManager.currentUser.organizacion;
        
        organizacionSelect.innerHTML = '';
        
        const option = document.createElement('option');
        option.value = this.userManager.currentUser.organizacionCamelCase || 'adminOrg';
        option.text = `${organizacionUsuario} (Organización del Administrador)`;
        option.selected = true;
        organizacionSelect.add(option);
        
        organizacionSelect.disabled = true;
        organizacionSelect.style.backgroundColor = '#f8f9fa';
        organizacionSelect.style.cursor = 'not-allowed';
        
        this.mostrarInfoOrganizacion();
    }
    
    mostrarInfoOrganizacion() {
        if (document.querySelector('.organizacion-info')) return;
        
        const formHeader = document.querySelector('.card-header');
        if (!formHeader || !this.userManager.currentUser) return;
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'organizacion-info alert alert-info mt-3 mx-3';
        infoDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-building me-3 fs-4"></i>
                <div>
                    <h6 class="mb-1">Organización: <strong>${this.userManager.currentUser.organizacion}</strong></h6>
                    <p class="mb-0 text-muted small">
                        <i class="fas fa-user-shield me-1"></i>
                        Administrador: ${this.userManager.currentUser.nombreCompleto}
                    </p>
                </div>
            </div>
        `;
        
        formHeader.parentNode.insertBefore(infoDiv, formHeader.nextSibling);
    }
    
    init() {
        this.inicializarEventos();
        this.inicializarValidaciones();
        this.configurarOrganizacionAutomatica();
        this.cargarResponsables();
        this.inicializarGestionCargos();
        this.cargarArea();
    }
    
    inicializarEventos() {
        const btnVolverLista = document.getElementById('btnVolverLista');
        if (btnVolverLista) {
            btnVolverLista.addEventListener('click', () => this.volverALista());
        }
        
        const descripcionArea = document.getElementById('descripcionArea');
        if (descripcionArea) {
            if (this._inputHandler) {
                descripcionArea.removeEventListener('input', this._inputHandler);
            }
            this._inputHandler = () => this.actualizarContadorCaracteres();
            descripcionArea.addEventListener('input', this._inputHandler);
        }
        
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarEdicion());
        }
        
        const btnAgregarCargo = document.getElementById('btnAgregarCargo');
        if (btnAgregarCargo) {
            btnAgregarCargo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.agregarCargo();
            });
        }
        
        const btnVerDetalles = document.getElementById('btnVerDetalles');
        if (btnVerDetalles) {
            btnVerDetalles.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.verDetallesArea();
            });
        }
        
        const formEditarArea = document.getElementById('formEditarArea');
        if (formEditarArea) {
            if (this._submitHandler) {
                formEditarArea.removeEventListener('submit', this._submitHandler);
            }
            this._submitHandler = (e) => {
                e.preventDefault();
                this.validarYPrepararGuardado();
            };
            formEditarArea.addEventListener('submit', this._submitHandler);
        }
    }
    
    inicializarValidaciones() {
        this.actualizarContadorCaracteres();
    }
    
    actualizarContadorCaracteres() {
        const descripcionArea = document.getElementById('descripcionArea');
        const contador = document.getElementById('contadorCaracteres');
        
        if (descripcionArea && contador) {
            const longitud = descripcionArea.value.length;
            contador.textContent = longitud;
        }
    }
    
    async cargarArea() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const areaId = urlParams.get('id');
            
            if (!areaId) {
                this.mostrarError('No se especificó qué área editar');
                return;
            }
            
            this.mostrarCargando('Cargando información...');
            
            const area = await this.areaManager.getAreaById(
                areaId, 
                this.userManager.currentUser.organizacionCamelCase
            );
            
            if (area) {
                this.areaActual = area;
                await this.cargarDatosEnFormulario();
                this.datosOriginales = this.obtenerDatosFormulario();
                this.ocultarCargando();
                
                document.title = `Editar ${this.areaActual.nombreArea} - Sistema Centinela`;
                
                const nombreTitulo = document.getElementById('nombreAreaTitulo');
                if (nombreTitulo) {
                    nombreTitulo.textContent = this.areaActual.nombreArea;
                }
            } else {
                this.ocultarCargando();
                this.mostrarError('Área no encontrada');
            }
            
        } catch (error) {
            this.ocultarCargando();
            this.mostrarError('Error cargando área');
        }
    }
    
    async cargarDatosEnFormulario() {
        if (!this.areaActual) return;
        
        document.getElementById('areaId').value = this.areaActual.id;
        document.getElementById('nombreArea').value = this.areaActual.nombreArea || '';
        document.getElementById('descripcionArea').value = this.areaActual.descripcion || '';
        
        await this.cargarResponsableActual();
        this.cargarCargosExistentes();
        
        const fechaCreacionInput = document.getElementById('fechaCreacion');
        if (fechaCreacionInput) {
            fechaCreacionInput.value = this.areaActual.fechaCreacion ? 
                new Date(this.areaActual.fechaCreacion).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }) : 'No disponible';
        }
        
        const ultimaActualizacionInput = document.getElementById('ultimaActualizacion');
        if (ultimaActualizacionInput) {
            ultimaActualizacionInput.value = this.areaActual.fechaActualizacion ? 
                new Date(this.areaActual.fechaActualizacion).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }) : 'No disponible';
        }
        
        const creadoPorInput = document.getElementById('creadoPor');
        if (creadoPorInput) {
            creadoPorInput.value = this.areaActual.creadoPor || 'Desconocido';
        }
        
        const estadoInput = document.getElementById('estadoActual');
        if (estadoInput) {
            estadoInput.value = 'Activa';
            estadoInput.className = 'form-control bg-success text-white';
        }
        
        this.actualizarContadorCaracteres();
    }
    
    async cargarResponsableActual() {
        const responsableSelect = document.getElementById('responsable');
        if (!responsableSelect) return;
        
        if (this.areaActual.responsable) {
            let responsableAsignado = false;
            
            for (let i = 0; i < responsableSelect.options.length; i++) {
                if (responsableSelect.options[i].value === this.areaActual.responsable) {
                    responsableSelect.selectedIndex = i;
                    responsableAsignado = true;
                    break;
                }
            }
            
            if (!responsableAsignado) {
                const option = document.createElement('option');
                option.value = this.areaActual.responsable;
                option.text = this.areaActual.responsableNombre || 'Responsable asignado';
                option.selected = true;
                responsableSelect.appendChild(option);
            }
        } else {
            for (let i = 0; i < responsableSelect.options.length; i++) {
                if (responsableSelect.options[i].value === 'admin_fijo') {
                    responsableSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
    
    inicializarGestionCargos() {}
    
    cargarCargosExistentes() {
        this.cargos = [];
        
        if (this.areaActual.cargos) {
            if (Array.isArray(this.areaActual.cargos)) {
                this.areaActual.cargos.forEach((cargo, index) => {
                    if (cargo?.nombre) {
                        this.cargos.push({
                            id: cargo.id || `cargo_${index}_${Date.now()}`,
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || ''
                        });
                    }
                });
            } else if (typeof this.areaActual.cargos === 'object') {
                Object.keys(this.areaActual.cargos).forEach(key => {
                    const cargo = this.areaActual.cargos[key];
                    if (cargo?.nombre) {
                        this.cargos.push({
                            id: key,
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || ''
                        });
                    }
                });
            }
            
            if (this.cargos.length > 0) {
                this.renderizarCargos();
                this.actualizarContadorCargos();
                return;
            }
        }
        
        this.renderizarCargos();
    }
    
    agregarCargo() {
        const cargoId = `cargo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        
        const nuevoCargo = {
            id: cargoId,
            nombre: '',
            descripcion: ''
        };
        
        this.cargos.push(nuevoCargo);
        this.renderizarCargos();
        this.actualizarContadorCargos();
        
        setTimeout(() => {
            const input = document.getElementById(`cargo_nombre_${cargoId}`);
            if (input) input.focus();
        }, 100);
    }
    
    eliminarCargo(cargoId) {
        Swal.fire({
            title: '¿Eliminar cargo?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4d',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.cargos = this.cargos.filter(c => c.id !== cargoId);
                this.renderizarCargos();
                this.actualizarContadorCargos();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El cargo fue eliminado correctamente',
                    confirmButtonColor: '#2f8cff'
                });
            }
        });
    }
    
    renderizarCargos() {
        const cargosList = document.getElementById('cargosList');
        if (!cargosList) return;
        
        if (this.cargos.length === 0) {
            cargosList.innerHTML = `
                <div class="cargos-empty" id="cargosEmpty">
                    <i class="fas fa-briefcase mb-2"></i>
                    <p>No hay cargos agregados</p>
                    <small class="text-muted">Haga clic en "Agregar Cargo" para añadir uno</small>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.cargos.forEach((cargo, index) => {
            html += `
                <div class="cargo-item" id="cargo_${cargo.id}">
                    <div class="cargo-header">
                        <h6 class="cargo-titulo">
                            <i class="fas fa-briefcase me-2"></i>
                            Cargo #${index + 1}
                        </h6>
                        <button type="button" class="btn btn-eliminar-cargo" onclick="window.editarAreaDebug.controller.eliminarCargo('${cargo.id}')">
                            <i class="fas fa-trash-alt me-1"></i>
                            Eliminar
                        </button>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Nombre del Cargo *</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user-tie"></i></span>
                                <input type="text" class="form-control" 
                                       id="cargo_nombre_${cargo.id}"
                                       value="${this.escapeHTML(cargo.nombre)}"
                                       placeholder="Ej: Gerente, Analista, Coordinador"
                                       onchange="window.editarAreaDebug.controller.actualizarCargo('${cargo.id}', 'nombre', this.value)">
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Descripción del Cargo</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-align-left"></i></span>
                                <input type="text" class="form-control" 
                                       id="cargo_descripcion_${cargo.id}"
                                       value="${this.escapeHTML(cargo.descripcion)}"
                                       placeholder="Responsabilidades principales"
                                       onchange="window.editarAreaDebug.controller.actualizarCargo('${cargo.id}', 'descripcion', this.value)">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cargosList.innerHTML = html;
    }
    
    actualizarCargo(cargoId, campo, valor) {
        const cargo = this.cargos.find(c => c.id === cargoId);
        if (cargo) {
            cargo[campo] = valor;
        }
    }
    
    actualizarContadorCargos() {
        const counter = document.getElementById('cargosCounter');
        if (counter) {
            counter.textContent = `(${this.cargos.length} ${this.cargos.length === 1 ? 'cargo' : 'cargos'})`;
        }
    }
    
    escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    async verDetallesArea() {
        try {
            if (!this.areaActual) {
                this.mostrarError('No hay área cargada');
                return;
            }

            const cargosValidos = this.cargos.filter(c => c.nombre && c.nombre.trim() !== '');
            const cantidadCargos = cargosValidos.length;
            
            let cargosHTML = '';
            
            if (cargosValidos.length === 0) {
                cargosHTML = `
                    <div style="text-align: center; padding: 30px; background: var(--color-bg-tertiary); border-radius: var(--border-radius-medium);">
                        <i class="fas fa-briefcase" style="font-size: 48px; color: var(--color-accent-secondary); margin-bottom: 15px;"></i>
                        <p style="color: var(--color-text-secondary); margin: 0;">Esta área no tiene cargos asignados</p>
                    </div>
                `;
            } else {
                cargosHTML = cargosValidos.map((cargo, index) => `
                    <div style="background: var(--color-bg-tertiary); border: 1px solid var(--color-border-light); border-radius: var(--border-radius-medium); padding: 18px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="background: var(--color-accent-secondary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">${index + 1}</span>
                                <strong style="color: var(--color-text-primary);">${cargo.nombre}</strong>
                            </div>
                        </div>
                        ${cargo.descripcion ? `
                            <div style="margin-left: 40px; padding-left: 15px; border-left: 2px solid var(--color-accent-secondary); color: var(--color-text-secondary); font-size: 13px;">
                                ${cargo.descripcion}
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }

            const fechaCreacion = this.areaActual.fechaCreacion ? 
                new Date(this.areaActual.fechaCreacion).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'No disponible';

            const fechaActualizacion = this.areaActual.fechaActualizacion ? 
                new Date(this.areaActual.fechaActualizacion).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'No disponible';

            const responsableNombre = this.areaActual.responsableNombre || 
                (document.getElementById('responsable')?.selectedOptions[0]?.text || 'No asignado');

            await Swal.fire({
                title: this.areaActual.nombreArea,
                html: `
                    <div style="text-align: left; max-height: 70vh; overflow-y: auto; padding-right: 5px;">
                        <div style="background: var(--color-bg-tertiary); padding: 15px 20px; border-radius: var(--border-radius-medium); margin-bottom: 20px;">
                            <p style="color: var(--color-text-secondary);"><strong>Organización:</strong> ${this.userManager.currentUser.organizacion}</p>
                        </div>

                        <div style="margin-bottom: 25px;">
                            <h6 style="color: var(--color-accent-primary); margin-bottom: 12px;">Descripción</h6>
                            <div style="background: var(--color-bg-tertiary); border: 1px solid var(--color-border-light); border-radius: var(--border-radius-medium); padding: 15px 20px; color: var(--color-text-secondary);">
                                ${this.areaActual.descripcion || 'No hay descripción disponible'}
                            </div>
                        </div>

                        <div style="margin-bottom: 25px;">
                            <h6 style="color: var(--color-accent-primary); margin-bottom: 12px;">Responsable</h6>
                            <div style="background: var(--color-bg-tertiary); border: 1px solid var(--color-border-light); border-radius: var(--border-radius-medium); padding: 12px 20px;">
                                <i class="fas fa-user-circle" style="font-size: 32px; color: var(--color-accent-secondary); margin-right: 12px;"></i>
                                <span>${responsableNombre}</span>
                            </div>
                        </div>

                        <div style="margin-bottom: 25px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <h6 style="color: var(--color-accent-primary); margin: 0;">Cargos del Área</h6>
                                <span style="background: var(--color-accent-secondary); color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px;">
                                    ${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}
                                </span>
                            </div>
                            <div style="max-height: 300px; overflow-y: auto;">${cargosHTML}</div>
                        </div>

                        <div style="background: var(--color-bg-tertiary); border: 1px solid var(--color-border-light); border-radius: var(--border-radius-medium); padding: 20px;">
                            <h6 style="color: var(--color-accent-primary); margin-bottom: 15px;">Información del Sistema</h6>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div><small>Fecha Creación</small><br><span>${fechaCreacion}</span></div>
                                <div><small>Última Actualización</small><br><span>${fechaActualizacion}</span></div>
                                <div><small>Creado por</small><br><span>${this.areaActual.creadoPor || 'Desconocido'}</span></div>
                            </div>
                        </div>
                    </div>
                `,
                icon: 'info',
                iconColor: '#2f8cff',
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#2f8cff',
                showCancelButton: true,
                cancelButtonText: 'Editar Área',
                cancelButtonColor: '#545454',
                reverseButtons: true
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel) {
                    document.getElementById('nombreArea')?.focus();
                }
            });

        } catch (error) {
            this.mostrarError('Error al cargar los detalles');
        }
    }
    
    validarFormulario() {
        const nombreArea = document.getElementById('nombreArea')?.value.trim();
        const descripcion = document.getElementById('descripcionArea')?.value.trim();
        const responsableSelect = document.getElementById('responsable');
        
        if (!nombreArea) {
            this.mostrarError('El nombre del área es requerido');
            return false;
        }
        
        if (!descripcion) {
            this.mostrarError('La descripción es requerida');
            return false;
        }
        
        if (descripcion.length < 20) {
            this.mostrarError('La descripción debe tener al menos 20 caracteres');
            return false;
        }
        
        if (nombreArea.length < 3) {
            this.mostrarError('El nombre del área debe tener al menos 3 caracteres');
            return false;
        }
        
        if (responsableSelect && !responsableSelect.value) {
            this.mostrarError('Debe seleccionar un responsable');
            return false;
        }
        
        if (responsableSelect && 
            (responsableSelect.value.includes('──────────') || 
             responsableSelect.value === 'nuevo')) {
            this.mostrarError('Debe seleccionar un responsable válido');
            return false;
        }
        
        const tieneCargoValido = this.cargos.some(c => c.nombre && c.nombre.trim() !== '');
        if (!tieneCargoValido) {
            this.mostrarError('Debe agregar al menos un cargo con nombre');
            return false;
        }
        
        return true;
    }
    
    hayCambios() {
        if (!this.datosOriginales) return true;
        
        const datosActuales = this.obtenerDatosFormulario();
        
        if (datosActuales.nombreArea !== this.datosOriginales.nombreArea) return true;
        if (datosActuales.descripcion !== this.datosOriginales.descripcion) return true;
        
        const cargosActuales = JSON.stringify(datosActuales.cargos);
        const cargosOriginales = JSON.stringify(this.datosOriginales.cargos || []);
        if (cargosActuales !== cargosOriginales) return true;
        
        if (datosActuales.responsable !== this.datosOriginales.responsable) return true;
        
        return false;
    }
    
    async validarYPrepararGuardado() {
        try {
            if (!this.validarFormulario()) return;
            
            if (!this.hayCambios()) {
                this.mostrarNotificacion('No hay cambios para guardar', 'info');
                return;
            }
            
            const datosActualizados = this.obtenerDatosFormulario();
            
            const result = await Swal.fire({
                title: '¿Guardar cambios?',
                html: '<p>¿Está seguro de guardar los cambios realizados?</p>',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#545454',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar'
            });
            
            if (result.isConfirmed) {
                await this.confirmarGuardado(datosActualizados);
            }
            
        } catch (error) {
            this.mostrarError('Error validando datos');
        }
    }
    
    obtenerDatosFormulario() {
        const cargosValidos = this.cargos.filter(c => c.nombre && c.nombre.trim() !== '');
        
        const cargosObject = {};
        cargosValidos.forEach(cargo => {
            cargosObject[cargo.id] = {
                nombre: cargo.nombre.trim(),
                descripcion: cargo.descripcion ? cargo.descripcion.trim() : ''
            };
        });
        
        const responsableSelect = document.getElementById('responsable');
        let responsableId = '';
        let responsableNombre = '';
        
        if (responsableSelect && responsableSelect.value && 
            !responsableSelect.value.includes('──────────') && 
            responsableSelect.value !== 'nuevo') {
            responsableId = responsableSelect.value;
            responsableNombre = responsableSelect.options[responsableSelect.selectedIndex]?.text || '';
        }
        
        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            cargos: cargosObject,
            responsable: responsableId,
            responsableNombre: responsableNombre
        };
    }
    
    convertirACamelCase(texto) {
        if (!texto) return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }
    
    redirigirAlLogin() {
        Swal.fire({
            icon: 'error',
            title: 'Sesión expirada',
            text: 'Debes iniciar sesión para continuar',
            confirmButtonText: 'Ir al login',
            confirmButtonColor: '#2f8cff'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }
    
    async mostrarAlertaGuardadoExitoso() {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        
        await Toast.fire({ icon: 'success', title: 'Cambios guardados correctamente' });
    }
    
    async confirmarGuardado(datosActualizados) {
        try {
            if (!this.areaActual) {
                throw new Error('No hay área para actualizar');
            }
            
            this.mostrarCargando('Actualizando área...');
            
            await this.areaManager.actualizarArea(
                this.areaActual.id,
                datosActualizados,
                this.userManager.currentUser.id,
                this.userManager.currentUser.organizacionCamelCase
            );
            
            this.ocultarCargando();
            
            Object.assign(this.areaActual, datosActualizados);
            this.datosOriginales = this.obtenerDatosFormulario();
            
            await this.mostrarAlertaGuardadoExitoso();
            
            setTimeout(() => this.volverALista(), 3100);
            
        } catch (error) {
            this.ocultarCargando();
            this.mostrarError('Error actualizando área');
        }
    }
    
    volverALista() {
        window.location.href = '/users/admin/areas/areas.html';
    }
    
    cancelarEdicion() {
        if (this.hayCambios()) {
            Swal.fire({
                title: '¿Cancelar edición?',
                text: "Los cambios no guardados se perderán",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff4d4d',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar'
            }).then((result) => {
                if (result.isConfirmed) this.volverALista();
            });
        } else {
            this.volverALista();
        }
    }
    
    mostrarCargando(mensaje = 'Cargando...') {
        if (this.loadingOverlay) this.ocultarCargando();
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            flex-direction: column;
        `;
        
        overlay.innerHTML = `
            <div class="spinner-border text-light mb-3" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">${mensaje}</span>
            </div>
            <div class="text-light fs-5">${mensaje}</div>
        `;
        
        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }
    
    ocultarCargando() {
        if (this.loadingOverlay?.parentNode) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
    
    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }
    
    mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duracion,
            timerProgressBar: true
        });
        
        let icono = tipo === 'danger' ? 'error' : tipo;
        Toast.fire({ icon: icono, title: mensaje });
    }
}

cargarDependencias();