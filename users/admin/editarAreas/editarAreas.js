// editarAreas.js - VERSIÓN COMPLETA CON SOLO SWEETALERT2 (SIN CARGOS AUTOMÁTICOS)

// Variable global para debugging
window.editarAreaDebug = {
    estado: 'iniciando',
    controller: null
};

// Cargar dependencias
let Area, AreaManager, db, query, serverTimestamp, collection, doc, getDocs, setDoc, where, updateDoc, getDoc;

async function cargarDependencias() {
    try {        
        const firebaseModule = await import('/config/firebase-config.js');
        db = firebaseModule.db;
        
        const firestoreModule = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
        ({ 
            query,
            serverTimestamp,
            collection,
            doc,
            getDocs,
            setDoc,
            where,
            updateDoc,
            getDoc
        } = firestoreModule);
        
        const areaModule = await import('/clases/area.js');
        Area = areaModule.Area;
        AreaManager = areaModule.AreaManager;
        
        iniciarAplicacion();
        
    } catch (error) {
        console.error('❌ Error cargando dependencias:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error de Carga</h4>
            <p><strong>Error:</strong> ${error.message}</p>
            <div class="alert alert-warning mt-3">
                Verifica que los archivos existan:
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
        const app = new EditarAreaController();
        window.editarAreaDebug.controller = app;
        app.init();
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger">Error de Inicialización</h4>
            <p>${error.message}</p>
        `);
    }
}

// ==================== CLASE EDITARAREACONTROLLER ====================
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
        
        // Array para almacenar los cargos
        this.cargos = [];
    }
    
    // MÉTODO PARA CARGAR USUARIO
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
                    cargo: 'administrador',
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
            if (!userData.cargo) userData.cargo = 'usuario';
            if (!userData.nombreCompleto) userData.nombreCompleto = userData.nombre || 'Usuario';
            
            return {
                currentUser: userData
            };
            
        } catch (error) {
            console.error('❌ Error cargando usuario:', error);
            return null;
        }
    }
    
    // MÉTODO PARA CARGAR RESPONSABLES
    async cargarResponsables() {
        const responsableSelect = document.getElementById('responsable');
        if (!responsableSelect) {
            console.error('❌ Select de responsable no encontrado');
            return;
        }
        
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
            if (colaboradores && colaboradores.length > 0) {
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
            console.error('❌ Error cargando responsables:', error);
            this.mostrarNotificacion('Se cargarán solo los responsables disponibles', 'warning');
        }
    }
    
    // MÉTODO PARA CARGAR COLABORADORES
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
                
                if (colaboradoresFB && colaboradoresFB.length > 0) {
                    localStorage.setItem(`colaboradores_${orgKey}`, JSON.stringify(colaboradoresFB));
                    return colaboradoresFB;
                }
            }
            
            const usuariosStorage = localStorage.getItem('usuariosOrganizacion');
            if (usuariosStorage) {
                const usuarios = JSON.parse(usuariosStorage);
                const colaboradoresOrg = usuarios.filter(user => 
                    user.organizacionCamelCase === orgKey && 
                    user.id !== this.userManager.currentUser.id
                );
                
                if (colaboradoresOrg.length > 0) {
                    return colaboradoresOrg;
                }
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Error cargando colaboradores:', error);
            return [];
        }
    }
    
    // CONFIGURAR ORGANIZACIÓN AUTOMÁTICA
    configurarOrganizacionAutomatica() {
        const organizacionSelect = document.getElementById('organizacion');
        if (!organizacionSelect || !this.userManager.currentUser) {
            console.error('❌ No se puede configurar organización');
            return;
        }
        
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
    
    // MOSTRAR INFORMACIÓN DE ORGANIZACIÓN
    mostrarInfoOrganizacion() {
        if (document.querySelector('.organizacion-info')) {
            return;
        }
        
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
                        ${this.userManager.currentUser.correo ? `(${this.userManager.currentUser.correo})` : ''}
                    </p>
                    <p class="mb-0 text-muted small">
                        <i class="fas fa-key me-1"></i>
                        ID Colección: <code>areas_${this.userManager.currentUser.organizacionCamelCase}</code>
                    </p>
                </div>
            </div>
        `;
        
        formHeader.parentNode.insertBefore(infoDiv, formHeader.nextSibling);
    }
    
    init() {
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.inicializarValidaciones();
        
        this.configurarOrganizacionAutomatica();
        this.cargarResponsables();
        this.inicializarGestionCargos();
        this.cargarArea();
    }
    
    verificarElementosDOM() {
        const ids = [
            'btnVolverLista', 'formEditarArea', 'areaId', 'nombreArea',
            'organizacion', 'descripcionArea', 'contadorCaracteres', 
            'responsable', 'btnCancelar', 'btnDesactivarArea', 'btnGuardarCambios',
            'btnAgregarCargo', 'cargosList', 'cargosCounter',
            'fechaCreacion', 'ultimaActualizacion', 'creadoPor', 'estadoActual',
            'btnVerDetalles'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
        });
    }
    
    inicializarEventos() {
        try {
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.replaceWith(btnVolverLista.cloneNode(true));
                const nuevoBtnVolver = document.getElementById('btnVolverLista');
                nuevoBtnVolver.addEventListener('click', () => this.volverALista());
            }
            
            const descripcionArea = document.getElementById('descripcionArea');
            if (descripcionArea) {
                descripcionArea.removeEventListener('input', this._inputHandler);
                this._inputHandler = () => this.actualizarContadorCaracteres();
                descripcionArea.addEventListener('input', this._inputHandler);
            }
            
            const btnCancelar = document.getElementById('btnCancelar');
            if (btnCancelar) {
                btnCancelar.replaceWith(btnCancelar.cloneNode(true));
                const nuevoBtnCancelar = document.getElementById('btnCancelar');
                nuevoBtnCancelar.addEventListener('click', () => this.cancelarEdicion());
            }
            
            const btnDesactivarArea = document.getElementById('btnDesactivarArea');
            if (btnDesactivarArea) {
                btnDesactivarArea.replaceWith(btnDesactivarArea.cloneNode(true));
                const nuevoBtnDesactivar = document.getElementById('btnDesactivarArea');
                nuevoBtnDesactivar.addEventListener('click', () => this.prepararDesactivacion());
            }
            
            const btnAgregarCargo = document.getElementById('btnAgregarCargo');
            if (btnAgregarCargo) {
                const nuevoBoton = btnAgregarCargo.cloneNode(true);
                btnAgregarCargo.parentNode.replaceChild(nuevoBoton, btnAgregarCargo);
                nuevoBoton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.agregarCargo();
                });
            }
            
            const btnVerDetalles = document.getElementById('btnVerDetalles');
            if (btnVerDetalles) {
                btnVerDetalles.replaceWith(btnVerDetalles.cloneNode(true));
                const nuevoBtnVer = document.getElementById('btnVerDetalles');
                nuevoBtnVer.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.verDetallesArea();
                });
            }
            
            const formEditarArea = document.getElementById('formEditarArea');
            if (formEditarArea) {
                formEditarArea.removeEventListener('submit', this._submitHandler);
                this._submitHandler = (e) => {
                    e.preventDefault();
                    this.validarYPrepararGuardado();
                };
                formEditarArea.addEventListener('submit', this._submitHandler);
            }
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
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
            contador.className = longitud > 450 ? 'text-warning' : 'text-success';
        }
    }
    
    async cargarArea() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const areaId = urlParams.get('id');
        
        if (!areaId) {
            console.error('❌ No se proporcionó ID de área');
            this.mostrarError('No se especificó qué área editar');
            return;
        }
        
        this.mostrarCargando('Cargando información del área...');
        
        const collectionName = `areas_${this.userManager.currentUser.organizacionCamelCase}`;
        const areaRef = doc(db, collectionName, areaId);
        const areaSnap = await getDoc(areaRef);
        
        if (areaSnap.exists()) {
            const areaData = areaSnap.data();
            this.areaActual = new Area(areaId, areaData);
            
            await this.cargarDatosEnFormulario();
            this.datosOriginales = this.obtenerDatosFormulario();
            
            this.ocultarCargando();
            
            // Actualizar título
            document.title = `Editar ${this.areaActual.nombreArea} - Sistema Centinela`;

            const nombreTitulo = document.getElementById('nombreAreaTitulo');
            if (nombreTitulo) {
                nombreTitulo.textContent = this.areaActual.nombreArea;
            } else {
                const titulo = document.querySelector('h1');
                if (titulo) {
                    if (titulo.innerHTML.includes('Editar Área') && !titulo.innerHTML.includes(this.areaActual.nombreArea)) {
                        titulo.innerHTML = titulo.innerHTML.replace(
                            'Editar Área', 
                            `Editar Área: ${this.areaActual.nombreArea}`
                        );
                    } else if (!titulo.innerHTML.includes('Editar Área:')) {
                        titulo.innerHTML += `: ${this.areaActual.nombreArea}`;
                    }
                }
            }
            
        } else {
            this.ocultarCargando();
            this.mostrarError('Área no encontrada');
        }
        
    } catch (error) {
        console.error('❌ Error cargando área:', error);
        this.ocultarCargando();
        this.mostrarError('Error cargando área: ' + error.message);
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
    
    // ========== GESTIÓN DE CARGOS ==========
    
    inicializarGestionCargos() {
        // Vacío - El evento ya está en inicializarEventos()
    }
    
    cargarCargosExistentes() {
        this.cargos = [];
        
        if (this.areaActual.cargos) {
            if (Array.isArray(this.areaActual.cargos)) {
                this.areaActual.cargos.forEach((cargo, index) => {
                    if (cargo && cargo.nombre) {
                        this.cargos.push({
                            id: cargo.id || `cargo_${cargo.nombre.toLowerCase().replace(/\s+/g, '_')}_${index}`,
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || ''
                        });
                    }
                });
            } else if (typeof this.areaActual.cargos === 'object') {
                Object.keys(this.areaActual.cargos).forEach(key => {
                    const cargo = this.areaActual.cargos[key];
                    if (cargo && cargo.nombre) {
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
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'swal-dark',
                title: 'swal-title',
                htmlContainer: 'swal-html',
                confirmButton: 'swal-confirm-btn-danger',
                cancelButton: 'swal-cancel-btn'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.cargos = this.cargos.filter(c => c.id !== cargoId);
                this.renderizarCargos();
                this.actualizarContadorCargos();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El cargo fue eliminado correctamente',
                    confirmButtonColor: '#2f8cff',
                    customClass: {
                        popup: 'swal-dark',
                        title: 'swal-title',
                        htmlContainer: 'swal-html',
                        confirmButton: 'swal-confirm-btn'
                    }
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
    
    // ========== 🔥 VER DETALLES DEL ÁREA CON SWEETALERT2 ==========
    
    async verDetallesArea() {
        try {
            if (!this.areaActual) {
                this.mostrarError('No hay área cargada');
                return;
            }

            const cargosValidos = this.cargos.filter(c => c.nombre && c.nombre.trim() !== '');
            const cantidadCargos = cargosValidos.length;
            
            // Generar HTML para cargos
            let cargosHTML = '';
            
            if (cargosValidos.length === 0) {
                cargosHTML = `
                    <div style="
                        text-align: center;
                        padding: 30px;
                        background: var(--color-bg-tertiary);
                        border-radius: var(--border-radius-medium);
                        border: 1px dashed var(--color-border-light);
                    ">
                        <i class="fas fa-briefcase" style="font-size: 48px; color: var(--color-accent-secondary); margin-bottom: 15px;"></i>
                        <p style="color: var(--color-text-secondary); margin: 0; font-size: 14px;">
                            Esta área no tiene cargos asignados
                        </p>
                    </div>
                `;
            } else {
                cargosHTML = cargosValidos.map((cargo, index) => `
                    <div style="
                        background: var(--color-bg-tertiary);
                        border: 1px solid var(--color-border-light);
                        border-radius: var(--border-radius-medium);
                        padding: 18px;
                        margin-bottom: 15px;
                        transition: all 0.2s ease;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="
                                    background: var(--color-accent-secondary);
                                    color: white;
                                    width: 28px;
                                    height: 28px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    border-radius: 50%;
                                    font-size: 13px;
                                    font-weight: bold;
                                ">${index + 1}</span>
                                <strong style="
                                    color: var(--color-text-primary);
                                    font-family: var(--font-family-primary);
                                    font-size: 14px;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                ">
                                    ${cargo.nombre}
                                </strong>
                            </div>
                            <span style="
                                background: rgba(47, 140, 255, 0.1);
                                color: var(--color-accent-secondary);
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 11px;
                                border: 1px solid rgba(47, 140, 255, 0.3);
                                font-family: var(--font-family-secondary);
                                text-transform: uppercase;
                            ">
                                <i class="fas fa-briefcase me-1"></i>Cargo
                            </span>
                        </div>
                        ${cargo.descripcion ? `
                            <div style="
                                margin-left: 40px;
                                padding-left: 15px;
                                border-left: 2px solid var(--color-accent-secondary);
                                color: var(--color-text-secondary);
                                font-size: 13px;
                                line-height: 1.6;
                                font-family: var(--font-family-secondary);
                            ">
                                ${cargo.descripcion}
                            </div>
                        ` : `
                            <div style="
                                margin-left: 40px;
                                padding-left: 15px;
                                border-left: 2px solid var(--color-border-light);
                                color: var(--color-text-secondary);
                                font-size: 12px;
                                font-style: italic;
                                font-family: var(--font-family-secondary);
                            ">
                                Sin descripción
                            </div>
                        `}
                    </div>
                `).join('');
            }

            // Información del área
            const fechaCreacion = this.areaActual.fechaCreacion ? 
                new Date(this.areaActual.fechaCreacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'No disponible';

            const fechaActualizacion = this.areaActual.fechaActualizacion ? 
                new Date(this.areaActual.fechaActualizacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'No disponible';

            const responsableNombre = this.areaActual.responsableNombre || 
                (document.getElementById('responsable')?.selectedOptions[0]?.text || 'No asignado');

            await Swal.fire({
                title: `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 5px 0;">
                        <i class="fas fa-building" style="color: var(--color-accent-primary); font-size: 28px;"></i>
                        <span style="
                            color: var(--color-text-primary);
                            font-family: var(--font-family-primary);
                            font-size: 22px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">
                            ${this.areaActual.nombreArea}
                        </span>
                    </div>
                `,
                html: `
                    <div style="text-align: left; max-height: 70vh; overflow-y: auto; padding-right: 5px;">
                        <!-- Estado y Organización -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 15px 20px;
                            background: var(--color-bg-tertiary);
                            border-radius: var(--border-radius-medium);
                            margin-bottom: 20px;
                            border: 1px solid var(--color-border-light);
                        ">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="
                                    background: rgba(0, 255, 149, 0.1);
                                    color: var(--color-success);
                                    padding: 6px 16px;
                                    border-radius: 20px;
                                    font-size: 12px;
                                    border: 1px solid rgba(0, 255, 149, 0.3);
                                    font-family: var(--font-family-secondary);
                                    text-transform: uppercase;
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                ">
                                    <i class="fas fa-circle" style="font-size: 8px;"></i>
                                    Activa
                                </span>
                                <span style="
                                    color: var(--color-text-secondary);
                                    font-size: 13px;
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                ">
                                    <i class="fas fa-building" style="color: var(--color-accent-secondary);"></i>
                                    ${this.userManager.currentUser.organizacion}
                                </span>
                            </div>
                            <span style="
                                background: var(--color-accent-secondary);
                                color: white;
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 11px;
                                font-family: var(--font-family-secondary);
                            ">
                                <i class="fas fa-hashtag me-1"></i>
                                ${this.areaActual.id.substring(0, 8)}...
                            </span>
                        </div>

                        <!-- Descripción -->
                        <div style="margin-bottom: 25px;">
                            <h6 style="
                                color: var(--color-accent-primary);
                                font-family: var(--font-family-primary);
                                font-size: 13px;
                                margin-bottom: 12px;
                                border-bottom: 1px solid var(--color-border-light);
                                padding-bottom: 8px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i class="fas fa-align-left" style="color: var(--color-accent-secondary);"></i>
                                Descripción
                            </h6>
                            <div style="
                                background: var(--color-bg-tertiary);
                                border: 1px solid var(--color-border-light);
                                border-radius: var(--border-radius-medium);
                                padding: 15px 20px;
                                color: var(--color-text-secondary);
                                font-size: 14px;
                                line-height: 1.6;
                                font-family: var(--font-family-secondary);
                            ">
                                ${this.areaActual.descripcion || 'No hay descripción disponible'}
                            </div>
                        </div>

                        <!-- Responsable -->
                        <div style="margin-bottom: 25px;">
                            <h6 style="
                                color: var(--color-accent-primary);
                                font-family: var(--font-family-primary);
                                font-size: 13px;
                                margin-bottom: 12px;
                                border-bottom: 1px solid var(--color-border-light);
                                padding-bottom: 8px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i class="fas fa-user-tie" style="color: var(--color-accent-secondary);"></i>
                                Responsable del Área
                            </h6>
                            <div style="
                                background: var(--color-bg-tertiary);
                                border: 1px solid var(--color-border-light);
                                border-radius: var(--border-radius-medium);
                                padding: 12px 20px;
                                display: flex;
                                align-items: center;
                                gap: 12px;
                            ">
                                <i class="fas fa-user-circle" style="font-size: 32px; color: var(--color-accent-secondary);"></i>
                                <div>
                                    <strong style="color: var(--color-text-primary); font-size: 15px; display: block;">
                                        ${responsableNombre}
                                    </strong>
                                    <small style="color: var(--color-text-secondary);">
                                        ${responsableNombre.includes('Administrador') ? 'Administrador del sistema' : 'Responsable asignado'}
                                    </small>
                                </div>
                            </div>
                        </div>

                        <!-- Cargos -->
                        <div style="margin-bottom: 25px;">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 12px;
                                border-bottom: 1px solid var(--color-border-light);
                                padding-bottom: 8px;
                            ">
                                <h6 style="
                                    color: var(--color-accent-primary);
                                    font-family: var(--font-family-primary);
                                    font-size: 13px;
                                    margin: 0;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                ">
                                    <i class="fas fa-briefcase" style="color: var(--color-accent-secondary);"></i>
                                    Cargos del Área
                                </h6>
                                <span style="
                                    background: var(--color-accent-secondary);
                                    color: white;
                                    padding: 4px 14px;
                                    border-radius: 20px;
                                    font-size: 11px;
                                    font-family: var(--font-family-secondary);
                                ">
                                    ${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}
                                </span>
                            </div>
                            <div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">
                                ${cargosHTML}
                            </div>
                        </div>

                        <!-- Información del Sistema -->
                        <div style="
                            background: var(--color-bg-tertiary);
                            border: 1px solid var(--color-border-light);
                            border-radius: var(--border-radius-medium);
                            padding: 20px;
                            margin-top: 10px;
                        ">
                            <h6 style="
                                color: var(--color-accent-primary);
                                font-family: var(--font-family-primary);
                                font-size: 12px;
                                margin-bottom: 15px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i class="fas fa-info-circle" style="color: var(--color-accent-secondary);"></i>
                                Información del Sistema
                            </h6>
                            <div style="
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 15px;
                            ">
                                <div>
                                    <small style="
                                        color: var(--color-accent-primary);
                                        display: block;
                                        margin-bottom: 4px;
                                        font-size: 10px;
                                        text-transform: uppercase;
                                        opacity: 0.8;
                                    ">ID del Área</small>
                                    <code style="
                                        color: var(--color-accent-secondary);
                                        background: var(--color-bg-primary);
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        font-size: 11px;
                                        border: 1px solid var(--color-border-light);
                                    ">${this.areaActual.id}</code>
                                </div>
                                <div>
                                    <small style="
                                        color: var(--color-accent-primary);
                                        display: block;
                                        margin-bottom: 4px;
                                        font-size: 10px;
                                        text-transform: uppercase;
                                        opacity: 0.8;
                                    ">Colección</small>
                                    <code style="
                                        color: var(--color-accent-secondary);
                                        background: var(--color-bg-primary);
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        font-size: 11px;
                                        border: 1px solid var(--color-border-light);
                                    ">areas_${this.userManager.currentUser.organizacionCamelCase}</code>
                                </div>
                                <div>
                                    <small style="
                                        color: var(--color-accent-primary);
                                        display: block;
                                        margin-bottom: 4px;
                                        font-size: 10px;
                                        text-transform: uppercase;
                                        opacity: 0.8;
                                    ">Fecha de Creación</small>
                                    <span style="
                                        color: var(--color-text-secondary);
                                        font-size: 12px;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                    ">
                                        <i class="fas fa-calendar" style="color: var(--color-accent-secondary);"></i>
                                        ${fechaCreacion}
                                    </span>
                                </div>
                                <div>
                                    <small style="
                                        color: var(--color-accent-primary);
                                        display: block;
                                        margin-bottom: 4px;
                                        font-size: 10px;
                                        text-transform: uppercase;
                                        opacity: 0.8;
                                    ">Última Actualización</small>
                                    <span style="
                                        color: var(--color-text-secondary);
                                        font-size: 12px;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                    ">
                                        <i class="fas fa-clock" style="color: var(--color-accent-secondary);"></i>
                                        ${fechaActualizacion}
                                    </span>
                                </div>
                                <div style="grid-column: span 2;">
                                    <small style="
                                        color: var(--color-accent-primary);
                                        display: block;
                                        margin-bottom: 4px;
                                        font-size: 10px;
                                        text-transform: uppercase;
                                        opacity: 0.8;
                                    ">Creado por</small>
                                    <span style="
                                        color: var(--color-text-secondary);
                                        font-size: 12px;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                    ">
                                        <i class="fas fa-user" style="color: var(--color-accent-secondary);"></i>
                                        ${this.areaActual.creadoPor || 'Desconocido'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                icon: 'info',
                iconColor: '#2f8cff',
                confirmButtonText: '<i class="fas fa-check me-2"></i>Cerrar',
                confirmButtonColor: '#2f8cff',
                showCancelButton: true,
                cancelButtonText: '<i class="fas fa-edit me-2"></i>Editar Área',
                cancelButtonColor: '#545454',
                customClass: {
                    popup: 'swal-dark',
                    title: 'swal-title',
                    htmlContainer: 'swal-html',
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                },
                reverseButtons: true
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel) {
                    document.getElementById('nombreArea')?.focus();
                }
            });

        } catch (error) {
            console.error('❌ Error mostrando detalles:', error);
            this.mostrarError('Error al cargar los detalles');
        }
    }
    
    // VALIDACIÓN
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
            this.mostrarError('Debe agregar al menos un cargo con nombre para el área');
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
            if (!this.validarFormulario()) {
                return;
            }
            
            if (!this.hayCambios()) {
                this.mostrarNotificacion('No hay cambios para guardar', 'info');
                return;
            }
            
            const datosActualizados = this.obtenerDatosFormulario();
            
            const result = await Swal.fire({
                title: '¿Guardar cambios?',
                html: this.generarHTMLCambios(datosActualizados),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#2f8cff',
                cancelButtonColor: '#545454',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    popup: 'swal-dark',
                    title: 'swal-title',
                    htmlContainer: 'swal-html',
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                }
            });
            
            if (result.isConfirmed) {
                await this.confirmarGuardado(datosActualizados);
            }
            
        } catch (error) {
            console.error('❌ Error en validación:', error);
            this.mostrarError('Error validando datos: ' + error.message);
        }
    }
    
 generarHTMLCambios(datosActualizados) {
    let cambiosHTML = '<div style="text-align: left; max-height: 400px; overflow-y: auto; padding-right: 10px;">';
    
    if (this.datosOriginales) {
        // ========== 1. CAMBIOS EN NOMBRE ==========
        if (this.datosOriginales.nombreArea !== datosActualizados.nombreArea) {
            cambiosHTML += `
                <div style="margin-bottom: 20px; padding: 10px; background: rgba(47, 140, 255, 0.1); border-radius: 8px;">
                    <h6 style="color: var(--color-accent-secondary); margin-bottom: 8px;">
                        <i class="fas fa-tag me-2"></i>Nombre del Área
                    </h6>
                    <div style="color: #777171; text-decoration: line-through; margin-bottom: 5px;">
                        ${this.datosOriginales.nombreArea}
                    </div>
                    <div style="color: #21a16c;">
                        <i class="fas fa-arrow-right me-2"></i>${datosActualizados.nombreArea}
                    </div>
                </div>
            `;
        }
        
        // ========== 2. CAMBIOS EN DESCRIPCIÓN ==========
        if (this.datosOriginales.descripcion !== datosActualizados.descripcion) {
            cambiosHTML += `
                <div style="margin-bottom: 20px; padding: 10px; background: rgba(0, 255, 149, 0.1); border-radius: 8px;">
                    <h6 style="color: var(--color-success); margin-bottom: 8px;">
                        <i class="fas fa-align-left me-2"></i>Descripción
                    </h6>
                    <div style="color: #999; text-decoration: line-through; margin-bottom: 5px;">
                        ${this.datosOriginales.descripcion.substring(0, 80)}${this.datosOriginales.descripcion.length > 80 ? '...' : ''}
                    </div>
                    <div style="color: #17a56a;">
                        <i class="fas fa-arrow-right me-2"></i>${datosActualizados.descripcion.substring(0, 80)}${datosActualizados.descripcion.length > 80 ? '...' : ''}
                    </div>
                </div>
            `;
        }
        
        // ========== 3. ANÁLISIS DE CARGOS ==========
        const cargosOriginal = this.datosOriginales.cargos || {};
        const cargosNuevos = datosActualizados.cargos || {};
        
        // Convertir a arrays
        const cargosOriginalArray = Object.entries(cargosOriginal).map(([id, cargo]) => ({
            id,
            nombre: cargo.nombre || '',
            descripcion: cargo.descripcion || ''
        }));
        
        const cargosNuevosArray = Object.entries(cargosNuevos).map(([id, cargo]) => ({
            id,
            nombre: cargo.nombre || '',
            descripcion: cargo.descripcion || ''
        }));
        
        // Identificar cargos nuevos y modificados
        const cargosAgregados = [];
        const cargosModificados = [];
        
        cargosNuevosArray.forEach(nuevo => {
            const original = cargosOriginalArray.find(c => c.id === nuevo.id);
            
            if (!original) {
                // Cargo nuevo
                cargosAgregados.push(nuevo);
            } else {
                // Verificar si hubo cambios
                if (original.nombre !== nuevo.nombre || original.descripcion !== nuevo.descripcion) {
                    cargosModificados.push({
                        id: nuevo.id,
                        nombreOriginal: original.nombre,
                        nombreNuevo: nuevo.nombre,
                        descripcionOriginal: original.descripcion,
                        descripcionNuevo: nuevo.descripcion
                    });
                }
            }
        });
        
        // ========== 4. RESUMEN DE CARGOS ==========
        if (cargosAgregados.length > 0 || cargosModificados.length > 0) {
            cambiosHTML += `
                <div style="margin-bottom: 15px;">
                    <h6 style="color: var(--color-accent-primary); margin-bottom: 10px;">
                        <i class="fas fa-briefcase me-2"></i>Cambios en Cargos
                    </h6>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                        <span style="background: rgba(0, 255, 149, 0.1); color: #00ff95; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(0, 255, 149, 0.3);">
                            <i class="fas fa-plus-circle me-1"></i>${cargosAgregados.length} nuevos
                        </span>
                        <span style="background: rgba(255, 204, 0, 0.1); color: #ffcc00; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255, 204, 0, 0.3);">
                            <i class="fas fa-edit me-1"></i>${cargosModificados.length} modificados
                        </span>
                    </div>
            `;
            
            // ========== 5. CARGOS NUEVOS ==========
            if (cargosAgregados.length > 0) {
                cambiosHTML += `
                    <div style="margin-bottom: 20px;">
                        <h6 style="color: #00ff95; font-size: 13px; margin-bottom: 8px;">
                            <i class="fas fa-plus-circle me-2"></i>Cargos Nuevos:
                        </h6>
                `;
                
                cargosAgregados.forEach((cargo, index) => {
                    cambiosHTML += `
                        <div style="background: rgba(0, 255, 149, 0.05); padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #00ff95;">
                            <strong style="color: white; display: block; margin-bottom: 5px;">
                                #${index + 1}: ${cargo.nombre}
                            </strong>
                            <span style="color: #ccc; font-size: 12px;">
                                ${cargo.descripcion || '<i>Sin descripción</i>'}
                            </span>
                        </div>
                    `;
                });
                
                cambiosHTML += `</div>`;
            }
            
            // ========== 6. CARGOS MODIFICADOS ==========
            if (cargosModificados.length > 0) {
                cambiosHTML += `
                    <div style="margin-bottom: 15px;">
                        <h6 style="color: #ffcc00; font-size: 13px; margin-bottom: 8px;">
                            <i class="fas fa-edit me-2"></i>Cargos Modificados:
                        </h6>
                `;
                
                cargosModificados.forEach((cargo, index) => {
                    cambiosHTML += `
                        <div style="background: rgba(255, 204, 0, 0.05); padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #ffcc00;">
                            <strong style="color: white; display: block; margin-bottom: 8px;">
                                #${index + 1}: ${cargo.nombreNuevo}
                            </strong>
                            <div style="margin-left: 5px;">
                                ${cargo.nombreOriginal !== cargo.nombreNuevo ? `
                                    <div style="margin-bottom: 5px;">
                                        <span style="color: #999; font-size: 11px;">Nombre:</span>
                                        <span style="color: #999; text-decoration: line-through; margin: 0 5px;">${cargo.nombreOriginal}</span>
                                        <span style="color: #00ff95;">→ ${cargo.nombreNuevo}</span>
                                    </div>
                                ` : ''}
                                ${cargo.descripcionOriginal !== cargo.descripcionNuevo ? `
                                    <div>
                                        <span style="color: #999; font-size: 11px;">Descripción:</span>
                                        <span style="color: #999; text-decoration: line-through; margin: 0 5px;">${cargo.descripcionOriginal.substring(0, 30)}${cargo.descripcionOriginal.length > 30 ? '...' : ''}</span>
                                        <span style="color: #00ff95;">→ ${cargo.descripcionNuevo.substring(0, 30)}${cargo.descripcionNuevo.length > 30 ? '...' : ''}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                cambiosHTML += `</div>`;
            }
            
            cambiosHTML += `</div>`; // Cerrar div de cargos
        }
        
        // ========== 7. CAMBIOS EN RESPONSABLE ==========
        if (this.datosOriginales.responsable !== datosActualizados.responsable) {
            const responsableOriginal = this.datosOriginales.responsableNombre || 'No asignado';
            const responsableNuevo = datosActualizados.responsableNombre || 'No asignado';
            
            cambiosHTML += `
                <div style="margin-top: 15px; padding: 10px; background: rgba(47, 140, 255, 0.1); border-radius: 8px;">
                    <h6 style="color: var(--color-accent-secondary); margin-bottom: 8px;">
                        <i class="fas fa-user-tie me-2"></i>Responsable
                    </h6>
                    <div style="color: #999; text-decoration: line-through; margin-bottom: 5px;">
                        ${responsableOriginal}
                    </div>
                    <div style="color: #00ff95;">
                        <i class="fas fa-arrow-right me-2"></i>${responsableNuevo}
                    </div>
                </div>
            `;
        }
    }
    
    if (cambiosHTML === '<div style="text-align: left; max-height: 400px; overflow-y: auto; padding-right: 10px;">') {
        cambiosHTML += '<p style="color: var(--color-text-secondary); text-align: center; padding: 20px;">No se detectaron cambios</p>';
    }
    
    cambiosHTML += '</div>';
    return cambiosHTML;
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
            responsableNombre: responsableNombre,
            organizacionCamelCase: this.userManager.currentUser.organizacionCamelCase,
            actualizadoPor: this.userManager.currentUser.id,
            fechaActualizacion: new Date().toISOString()
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
            confirmButtonColor: '#2f8cff',
            customClass: {
                popup: 'swal-dark',
                title: 'swal-title',
                htmlContainer: 'swal-html',
                confirmButton: 'swal-confirm-btn'
            }
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }
    
    // ========== 🔥 ALERTA DE CIERRE AUTOMÁTICO ==========
    async mostrarAlertaGuardadoExitoso() {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            customClass: {
                popup: 'swal-dark'
            }
        });
        
        await Toast.fire({
            icon: 'success',
            title: '✅ Cambios guardados correctamente'
        });
    }
    
    // ========== 🔥 GUARDADO CON CIERRE AUTOMÁTICO ==========
    async confirmarGuardado(datosActualizados) {
        try {
            if (!this.areaActual) {
                throw new Error('No hay área para actualizar');
            }
            
            this.mostrarCargando('Actualizando área...');
            
            const areaActualizada = await this.actualizarAreaEnFirebase(datosActualizados);
            
            this.ocultarCargando();
            
            this.areaActual = areaActualizada;
            this.datosOriginales = this.obtenerDatosFormulario();
            
            await this.mostrarAlertaGuardadoExitoso();
            
            setTimeout(() => {
                this.volverALista();
            }, 3100);
            
        } catch (error) {
            console.error('❌ Error actualizando área:', error);
            this.ocultarCargando();
            this.mostrarError('Error actualizando área: ' + error.message);
        }
    }
    
    async actualizarAreaEnFirebase(datosActualizados) {
        try {
            const collectionName = `areas_${this.userManager.currentUser.organizacionCamelCase}`;
            const areaId = this.areaActual.id;
            
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            const cargosActuales = areaSnap.exists() ? areaSnap.data().cargos || {} : {};
            
            const cargosParaGuardar = {};
            
            Object.keys(datosActualizados.cargos).forEach(key => {
                const cargoData = datosActualizados.cargos[key];
                
                let idExistente = null;
                for (const [id, cargo] of Object.entries(cargosActuales)) {
                    if (cargo.nombre === cargoData.nombre) {
                        idExistente = id;
                        break;
                    }
                }
                
                if (!idExistente && cargosActuales[key]) {
                    idExistente = key;
                }
                
                const cargoId = idExistente || key;
                
                cargosParaGuardar[cargoId] = {
                    nombre: cargoData.nombre,
                    descripcion: cargoData.descripcion || ''
                };
            });
            
            const updateData = {
                nombreArea: datosActualizados.nombreArea,
                descripcion: datosActualizados.descripcion || '',
                cargos: cargosParaGuardar,
                responsable: datosActualizados.responsable || '',
                responsableNombre: datosActualizados.responsableNombre || '',
                actualizadoPor: this.userManager.currentUser.id,
                fechaActualizacion: serverTimestamp()
            };
            
            await updateDoc(areaRef, updateData);
            
            const areaActualizada = new Area(areaId, {
                ...this.areaActual,
                ...updateData,
                fechaActualizacion: new Date()
            });
            
            return areaActualizada;
            
        } catch (error) {
            console.error('❌ Error en actualizarAreaEnFirebase:', error);
            throw error;
        }
    }
    
    // DESACTIVACIÓN
    prepararDesactivacion() {
        if (!this.areaActual) return;
        
        Swal.fire({
            title: '¿Desactivar área?',
            html: `
                <div style="text-align: left;">
                    <div class="alert alert-danger mb-3">
                        <i class="fas fa-exclamation-circle"></i>
                        <strong>¡Atención!</strong> Esta acción desactivará el área.
                    </div>
                    <p><strong>Área:</strong> ${this.areaActual.nombreArea}</p>
                    <div class="mb-3">
                        <label for="swal-motivo" class="form-label">Motivo de desactivación (opcional):</label>
                        <textarea id="swal-motivo" class="form-control" rows="2" placeholder="Explique brevemente el motivo..."></textarea>
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4d',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'swal-dark',
                title: 'swal-title',
                htmlContainer: 'swal-html',
                confirmButton: 'swal-confirm-btn-danger',
                cancelButton: 'swal-cancel-btn'
            },
            preConfirm: () => {
                const motivo = document.getElementById('swal-motivo')?.value || '';
                return this.confirmarDesactivacion(motivo);
            }
        });
    }
    
    async confirmarDesactivacion(motivo = '') {
        try {
            if (!this.areaActual) return;
            
            this.mostrarCargando('Desactivando área...');
            
            const collectionName = `areas_${this.userManager.currentUser.organizacionCamelCase}`;
            const areaRef = doc(db, collectionName, this.areaActual.id);
            
            await updateDoc(areaRef, {
                estado: 'inactiva',
                desactivadoPor: this.userManager.currentUser.id,
                fechaDesactivacion: serverTimestamp(),
                motivoDesactivacion: motivo
            });
            
            this.ocultarCargando();
            
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal-dark'
                }
            });
            
            await Toast.fire({
                icon: 'warning',
                title: 'Área desactivada'
            });
            
            setTimeout(() => {
                this.volverALista();
            }, 3100);
            
        } catch (error) {
            console.error('❌ Error desactivando área:', error);
            this.ocultarCargando();
            this.mostrarError('Error desactivando área: ' + error.message);
        }
    }
    
    // NAVEGACIÓN
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
                cancelButtonText: 'No, continuar',
                customClass: {
                    popup: 'swal-dark',
                    title: 'swal-title',
                    htmlContainer: 'swal-html',
                    confirmButton: 'swal-confirm-btn-danger',
                    cancelButton: 'swal-cancel-btn'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    this.volverALista();
                }
            });
        } else {
            this.volverALista();
        }
    }
    
    continuarEdicion() {
        setTimeout(() => {
            const nombreArea = document.getElementById('nombreArea');
            if (nombreArea) {
                nombreArea.focus();
            }
        }, 300);
    }
    
    // INTERFAZ
    mostrarCargando(mensaje = 'Cargando...') {
        if (this.loadingOverlay) {
            this.ocultarCargando();
        }
        
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
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
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
            timerProgressBar: true,
            customClass: {
                popup: 'swal-dark'
            }
        });
        
        let icono = tipo;
        if (tipo === 'danger') icono = 'error';
        
        Toast.fire({
            icon: icono,
            title: mensaje
        });
    }
}

// INICIAR APLICACIÓN
cargarDependencias();