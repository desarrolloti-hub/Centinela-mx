// crearAreas.js - VERSIÓN CON VALIDACIONES DE CARACTERES Y MENSAJES SIMPLIFICADOS

window.crearAreaDebug = {
    estado: 'iniciando',
    controller: null
};

let Area, AreaManager;

// LÍMITES DE CARACTERES
const LIMITES = {
    NOMBRE_AREA: 50,
    DESCRIPCION_AREA: 500,
    NOMBRE_CARGO: 50,
    DESCRIPCION_CARGO: 200
};

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
    const container = document.querySelector('.container-fluid, .centinela-container') || document.body;
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
        
        // Aplicar límites de caracteres a los campos
        this.aplicarLimitesCaracteres();
    }
    
    aplicarLimitesCaracteres() {
        // Campo nombre área
        const nombreArea = document.getElementById('nombreArea');
        if (nombreArea) {
            nombreArea.maxLength = LIMITES.NOMBRE_AREA;
            nombreArea.addEventListener('input', () => this.validarLongitudCampo(nombreArea, LIMITES.NOMBRE_AREA, 'El nombre del área'));
        }
        
        // Campo descripción área
        const descripcionArea = document.getElementById('descripcionArea');
        if (descripcionArea) {
            descripcionArea.maxLength = LIMITES.DESCRIPCION_AREA;
            descripcionArea.addEventListener('input', () => this.validarLongitudCampo(descripcionArea, LIMITES.DESCRIPCION_AREA, 'La descripción'));
        }
    }
    
    validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this.mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }
    
    validarLongitudCargo(nombre, descripcion) {
        if (nombre.length > LIMITES.NOMBRE_CARGO) {
            this.mostrarNotificacion(`El nombre del cargo no puede exceder ${LIMITES.NOMBRE_CARGO} caracteres`, 'warning', 3000);
            return false;
        }
        if (descripcion.length > LIMITES.DESCRIPCION_CARGO) {
            this.mostrarNotificación(`La descripción del cargo no puede exceder ${LIMITES.DESCRIPCION_CARGO} caracteres`, 'warning', 3000);
            return false;
        }
        return true;
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
            contador.textContent = `${longitud}/${LIMITES.DESCRIPCION_AREA}`;
            
            // Cambiar color si se acerca al límite
            if (longitud > LIMITES.DESCRIPCION_AREA * 0.9) {
                contador.style.color = 'var(--color-warning)';
            } else if (longitud > LIMITES.DESCRIPCION_AREA * 0.95) {
                contador.style.color = 'var(--color-danger)';
            } else {
                contador.style.color = 'var(--color-accent-primary)';
            }
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
        
        if (nombreArea.length > LIMITES.NOMBRE_AREA) {
            this.mostrarError(`El nombre del área no puede exceder ${LIMITES.NOMBRE_AREA} caracteres`);
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
        
        if (descripcion.length > LIMITES.DESCRIPCION_AREA) {
            this.mostrarError(`La descripción no puede exceder ${LIMITES.DESCRIPCION_AREA} caracteres`);
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
        
        // Validar límites de caracteres de los cargos
        for (const cargo of this.cargos) {
            if (cargo.nombre && cargo.nombre.length > LIMITES.NOMBRE_CARGO) {
                this.mostrarError(`El nombre del cargo no puede exceder ${LIMITES.NOMBRE_CARGO} caracteres`);
                return false;
            }
            if (cargo.descripcion && cargo.descripcion.length > LIMITES.DESCRIPCION_CARGO) {
                this.mostrarError(`La descripción del cargo no puede exceder ${LIMITES.DESCRIPCION_CARGO} caracteres`);
                return false;
            }
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
            
            const result = await Swal.fire({
                title: '¿Confirmar creación?',
                text: '¿Está seguro de crear esta área?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, crear',
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
            if (input) {
                input.focus();
                input.maxLength = LIMITES.NOMBRE_CARGO;
            }
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
                        <button type="button" class="btn-eliminar-cargo" onclick="window.crearAreaDebug.controller.eliminarCargo('${cargo.id}')">
                            <i class="fas fa-trash-alt me-1"></i>
                            Eliminar
                        </button>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Nombre del Cargo *</label>
                            <div class="input-group">
                                <input type="text" class="form-control" 
                                       id="cargo_nombre_${cargo.id}"
                                       value="${this.escapeHTML(cargo.nombre)}"
                                       placeholder="Ej: Gerente, Analista, Coordinador"
                                       maxlength="${LIMITES.NOMBRE_CARGO}"
                                       onchange="window.crearAreaDebug.controller.actualizarCargo('${cargo.id}', 'nombre', this.value)">
                            </div>
                            <div class="char-limit-info">
                                <span class="char-counter">${cargo.nombre?.length || 0}/${LIMITES.NOMBRE_CARGO}</span>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Descripción del Cargo</label>
                            <div class="input-group">
                                <input type="text" class="form-control" 
                                       id="cargo_descripcion_${cargo.id}"
                                       value="${this.escapeHTML(cargo.descripcion)}"
                                       placeholder="Responsabilidades principales"
                                       maxlength="${LIMITES.DESCRIPCION_CARGO}"
                                       onchange="window.crearAreaDebug.controller.actualizarCargo('${cargo.id}', 'descripcion', this.value)">
                            </div>
                            <div class="char-limit-info">
                                <span class="char-counter">${cargo.descripcion?.length || 0}/${LIMITES.DESCRIPCION_CARGO}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cargosList.innerHTML = html;
        
        // Actualizar contadores en tiempo real
        this.cargos.forEach(cargo => {
            const nombreInput = document.getElementById(`cargo_nombre_${cargo.id}`);
            if (nombreInput) {
                nombreInput.addEventListener('input', (e) => {
                    this.actualizarCargo(cargo.id, 'nombre', e.target.value);
                    const counter = e.target.closest('.col-md-6').querySelector('.char-counter');
                    if (counter) counter.textContent = `${e.target.value.length}/${LIMITES.NOMBRE_CARGO}`;
                });
            }
            
            const descInput = document.getElementById(`cargo_descripcion_${cargo.id}`);
            if (descInput) {
                descInput.addEventListener('input', (e) => {
                    this.actualizarCargo(cargo.id, 'descripcion', e.target.value);
                    const counter = e.target.closest('.col-md-6').querySelector('.char-counter');
                    if (counter) counter.textContent = `${e.target.value.length}/${LIMITES.DESCRIPCION_CARGO}`;
                });
            }
        });
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
        
        const cargosArray = this.cargos
            .filter(c => c.nombre && c.nombre.trim() !== '')
            .map(c => ({
                nombre: c.nombre.trim(),
                descripcion: c.descripcion ? c.descripcion.trim() : ''
            }));
        
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
            
            // MENSAJE SIMPLIFICADO - SOLO ÉXITO
            await Swal.fire({
                icon: 'success',
                title: '¡Área creada!',
                text: 'El área se ha creado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Preguntar qué hacer después
            const result = await Swal.fire({
                title: '¿Qué desea hacer?',
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Ver lista',
                denyButtonText: 'Crear otra',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2f8cff',
                denyButtonColor: '#3a9871'
            });
            
            if (result.isConfirmed) {
                this.verAreaCreada();
            } else if (result.isDenied) {
                this.crearOtraArea();
            }
            
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
        this.mostrarNotificacion(mensaje, 'error');
    }
    
    mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duracion,
            timerProgressBar: true
        });
        
        let icono = tipo === 'danger' || tipo === 'error' ? 'error' : tipo;
        Toast.fire({ icon: icono, title: mensaje });
    }
}

cargarDependencias();