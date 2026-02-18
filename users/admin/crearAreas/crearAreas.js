// crearAreas.js - VERSIÓN LIMPIA (sin cambios necesarios, pero asegurando que los cargos se envían correctamente)

window.crearAreaDebug = {
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
        const app = new CrearAreaController();
        window.crearAreaDebug.controller = app;
        app.init();
    } catch (error) {
        console.error('[Error]', error.message);
        mostrarErrorInterfaz(error.message);
    }
}

class CrearAreaController {
    constructor() {
        this.areaManager = new AreaManager();
        this.userManager = this.cargarUsuarioDesdeStorage();
        
        if (!this.userManager || !this.userManager.currentUser) {
            this.redirigirAlLogin();
            throw new Error('Usuario no autenticado');
        }
        
        this.areaEnProceso = null;
        this.areaCreadaReciente = null;
        this.loadingOverlay = null;
        this.cargos = [];
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
            
            if (!userData) {
                return null;
            }
            
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
                if (colaboradores.length > 0) {
                    return colaboradores;
                }
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
    }
    
    inicializarEventos() {
        const btnVolverLista = document.getElementById('btnVolverLista');
        if (btnVolverLista) {
            btnVolverLista.addEventListener('click', () => this.volverALista());
        }
        
        const descripcionArea = document.getElementById('descripcionArea');
        if (descripcionArea) {
            descripcionArea.addEventListener('input', () => this.actualizarContadorCaracteres());
        }
        
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarCreacion());
        }
        
        const formCrearArea = document.getElementById('formCrearArea');
        if (formCrearArea) {
            formCrearArea.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validarYPrepararCreacion();
            });
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
    
    volverALista() {
        window.location.href = '/users/admin/areas/areas.html';
    }
    
    cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar registro?',
            text: "Se perderán todos los datos ingresados",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                this.volverALista();
            }
        });
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
            this.mostrarError('Debe seleccionar un responsable para el área');
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
    
    async validarYPrepararCreacion() {
        try {
            if (!this.validarFormulario()) return;
            
            const datosArea = this.obtenerDatosFormulario();
            
            const existe = await this.areaManager.verificarAreaExistente(
                datosArea.nombreArea,
                this.userManager.currentUser.organizacionCamelCase
            );
            
            if (existe) {
                this.mostrarError('Ya existe un área con ese nombre en esta organización');
                return;
            }
            
            this.areaEnProceso = datosArea;
            
            const cantidadCargos = this.cargos.length;
            
            const result = await Swal.fire({
                title: '¿Confirmar creación?',
                html: `
                    <div style="text-align: left;">
                        <p>¿Está seguro de crear la siguiente área?</p>
                        <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 8px; margin-top: 10px;">
                            <h6 style="color: var(--color-accent-primary); margin-bottom: 10px;">${datosArea.nombreArea}</h6>
                            <p style="margin-bottom: 5px;"><small><strong>Organización:</strong> ${this.userManager.currentUser.organizacion}</small></p>
                            <p style="margin-bottom: 5px;"><small><strong>Cargos:</strong> ${cantidadCargos}</small></p>
                        </div>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, crear área',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#545454'
            });
            
            if (result.isConfirmed) {
                await this.confirmarCreacion();
            }
            
        } catch (error) {
            this.mostrarError('Error validando datos');
        }
    }
    
    inicializarGestionCargos() {
        const btnAgregarCargo = document.getElementById('btnAgregarCargo');
        if (btnAgregarCargo) {
            btnAgregarCargo.addEventListener('click', () => this.agregarCargo());
        }
    }
    
    agregarCargo() {
        // 🔥 Los IDs locales son SOLO para el frontend
        // El AreaManager generará IDs de Firebase al guardar
        const cargoId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        
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
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.cargos = this.cargos.filter(c => c.id !== cargoId);
                this.renderizarCargos();
                this.actualizarContadorCargos();
                this.mostrarNotificacion('Cargo eliminado', 'success');
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
                        <button type="button" class="btn btn-eliminar-cargo" onclick="window.crearAreaDebug.controller.eliminarCargo('${cargo.id}')">
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
                                       onchange="window.crearAreaDebug.controller.actualizarCargo('${cargo.id}', 'nombre', this.value)">
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
                                       onchange="window.crearAreaDebug.controller.actualizarCargo('${cargo.id}', 'descripcion', this.value)">
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
    
    obtenerDatosFormulario() {
        const userOrgCamel = this.userManager.currentUser.organizacionCamelCase;
        
        // 🔥 SOLO enviamos los nombres y descripciones de los cargos
        // El AreaManager generará los IDs de Firebase
        const cargosArray = this.cargos
            .filter(c => c.nombre && c.nombre.trim() !== '')
            .map(c => ({
                nombre: c.nombre.trim(),
                descripcion: c.descripcion ? c.descripcion.trim() : ''
            }));
        
        // Convertir a objeto con índices numéricos (temporal)
        const cargosObject = {};
        cargosArray.forEach((cargo, index) => {
            cargosObject[`cargo_${index}`] = cargo;
        });
        
        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            cargos: cargosObject,
            organizacionCamelCase: userOrgCamel,
            responsable: 'admin_fijo',
            responsableNombre: this.userManager.currentUser.nombreCompleto
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
    
    async confirmarCreacion() {
        try {
            if (!this.areaEnProceso) {
                throw new Error('No hay datos de área para crear');
            }
            
            this.mostrarCargando('Creando área...');
            
            const nuevaArea = await this.areaManager.crearArea(this.areaEnProceso, this.userManager);
            
            this.ocultarCargando();
            
            this.areaCreadaReciente = nuevaArea;
            
            const cantidadCargos = Object.keys(nuevaArea.cargos || {}).length;
            
            await Swal.fire({
                title: '¡Área creada exitosamente!',
                html: `
                    <div style="text-align: center;">
                        
                        <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 8px; text-align: left;">
                            <p><strong>Nombre del Área:</strong> ${nuevaArea.nombreArea}</p>
                            <p><strong>Organización:</strong> ${this.userManager.currentUser.organizacion}</p>
                            <p><strong>Responsable:</strong> ${this.userManager.currentUser.nombreCompleto}</p>
                            <p><strong>Cargos:</strong> ${cantidadCargos}</p>
                        </div>
                    </div>
                `,
                icon: 'success',
                showConfirmButton: true,
                showDenyButton: true,
                confirmButtonText: 'Ver lista de áreas',
                denyButtonText: 'Crear otra área',
                confirmButtonColor: '#2f8cff',
                denyButtonColor: '#3a9871'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.verAreaCreada();
                } else if (result.isDenied) {
                    this.crearOtraArea();
                }
            });
            
        } catch (error) {
            this.ocultarCargando();
            this.mostrarError('Error creando área');
        }
    }
    
    crearOtraArea() {
        this.limpiarFormulario();
        
        setTimeout(() => {
            const nombreArea = document.getElementById('nombreArea');
            if (nombreArea) nombreArea.focus();
        }, 100);
    }
    
    verAreaCreada() {
        window.location.href = '/users/admin/areas/areas.html';
    }
    
    limpiarFormulario() {
        const form = document.getElementById('formCrearArea');
        if (form) form.reset();
        
        this.cargos = [];
        this.agregarCargo();
        
        const responsableSelect = document.getElementById('responsable');
        if (responsableSelect) {
            for (let i = 0; i < responsableSelect.options.length; i++) {
                if (responsableSelect.options[i].value === 'admin_fijo') {
                    responsableSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        this.actualizarContadorCaracteres();
        this.actualizarContadorCargos();
        this.areaEnProceso = null;
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