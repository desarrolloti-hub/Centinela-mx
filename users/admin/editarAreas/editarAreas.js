// editarAreas.js - VERSIÓN COMPLETA CON SOLO SWEETALERT2 (SIN MODALES BOOTSTRAP)
console.log('🚀 editarAreas.js iniciando...');

// Variable global para debugging
window.editarAreaDebug = {
    estado: 'iniciando',
    controller: null
};

// Cargar dependencias
let Area, AreaManager, db, query, serverTimestamp, collection, doc, getDocs, setDoc, where, updateDoc, getDoc;

async function cargarDependencias() {
    try {
        console.log('1️⃣ Cargando dependencias...');
        
        const firebaseModule = await import('/config/firebase-config.js');
        db = firebaseModule.db;
        console.log('✅ Firebase cargado');
        
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
        console.log('✅ Firestore functions cargadas');
        
        const areaModule = await import('/clases/area.js');
        Area = areaModule.Area;
        AreaManager = areaModule.AreaManager;
        console.log('✅ Clases cargadas');
        
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
        console.log('🎯 Inicializando EditarAreaController...');
        
        const app = new EditarAreaController();
        window.editarAreaDebug.controller = app;
        
        app.init();
        
        console.log('✅ Controlador de edición listo');
        
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
        console.log('🛠️ Creando EditarAreaController...');
        
        this.areaManager = new AreaManager();
        this.userManager = this.cargarUsuarioDesdeStorage();
        
        if (!this.userManager || !this.userManager.currentUser) {
            console.error('❌ No se pudo cargar información del usuario');
            this.redirigirAlLogin();
            throw new Error('Usuario no autenticado');
        }
        
        console.log('✅ Usuario cargado:', this.userManager.currentUser);
        this.areaActual = null;
        this.datosOriginales = null;
        this.loadingOverlay = null;
        
        // Array para almacenar los cargos
        this.cargos = [];
    }
    
    // MÉTODO PARA CARGAR USUARIO
    cargarUsuarioDesdeStorage() {
        console.log('📂 Cargando datos del usuario desde almacenamiento...');
        
        try {
            let userData = null;
            
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                console.log('🔑 Datos de admin encontrados:', adminData);
                
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
                    console.log('👤 Datos de usuario encontrados:', userData);
                    userData.nombreCompleto = userData.nombreCompleto || userData.nombre || 'Usuario';
                    userData.esResponsable = false;
                }
            }
            
            if (!userData) {
                console.error('❌ No se encontraron datos de usuario');
                return null;
            }
            
            if (!userData.id) userData.id = `user_${Date.now()}`;
            if (!userData.organizacion) userData.organizacion = 'Sin organización';
            if (!userData.organizacionCamelCase) {
                userData.organizacionCamelCase = this.convertirACamelCase(userData.organizacion);
            }
            if (!userData.cargo) userData.cargo = 'usuario';
            if (!userData.nombreCompleto) userData.nombreCompleto = userData.nombre || 'Usuario';
            
            console.log('✅ Usuario procesado:', {
                id: userData.id,
                nombre: userData.nombreCompleto,
                cargo: userData.cargo,
                organizacion: userData.organizacion,
                organizacionCamelCase: userData.organizacionCamelCase
            });
            
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
        console.log('👥 Cargando lista de responsables...');
        
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
                
                console.log('✅ Admin agregado como responsable:', this.userManager.currentUser.nombreCompleto);
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
                
                console.log(`✅ ${colaboradores.length} colaboradores cargados`);
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
        console.log('📋 Buscando colaboradores en el sistema...');
        
        try {
            const orgKey = this.userManager.currentUser.organizacionCamelCase;
            const colaboradoresStorage = localStorage.getItem(`colaboradores_${orgKey}`);
            
            if (colaboradoresStorage) {
                const colaboradores = JSON.parse(colaboradoresStorage);
                if (colaboradores.length > 0) {
                    console.log('✅ Colaboradores encontrados en localStorage:', colaboradores.length);
                    return colaboradores;
                }
            }
            
            if (this.areaManager && typeof this.areaManager.obtenerColaboradoresPorOrganizacion === 'function') {
                console.log('🔍 Buscando colaboradores en Firebase...');
                const colaboradoresFB = await this.areaManager.obtenerColaboradoresPorOrganizacion(orgKey);
                
                if (colaboradoresFB && colaboradoresFB.length > 0) {
                    localStorage.setItem(`colaboradores_${orgKey}`, JSON.stringify(colaboradoresFB));
                    console.log('✅ Colaboradores cargados desde Firebase:', colaboradoresFB.length);
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
                    console.log('✅ Colaboradores encontrados en usuarios organizacionales:', colaboradoresOrg.length);
                    return colaboradoresOrg;
                }
            }
            
            console.log('ℹ️ No se encontraron colaboradores adicionales');
            return [];
            
        } catch (error) {
            console.error('❌ Error cargando colaboradores:', error);
            return [];
        }
    }
    
    // CONFIGURAR ORGANIZACIÓN AUTOMÁTICA
    configurarOrganizacionAutomatica() {
        console.log('🏢 Configurando organización automática...');
        
        const organizacionSelect = document.getElementById('organizacion');
        if (!organizacionSelect || !this.userManager.currentUser) {
            console.error('❌ No se puede configurar organización');
            return;
        }
        
        const organizacionUsuario = this.userManager.currentUser.organizacion;
        
        console.log('📝 Datos para organización:', {
            organizacion: organizacionUsuario,
            orgCamelCase: this.userManager.currentUser.organizacionCamelCase
        });
        
        organizacionSelect.innerHTML = '';
        
        const option = document.createElement('option');
        option.value = this.userManager.currentUser.organizacionCamelCase || 'adminOrg';
        option.text = `${organizacionUsuario} (Organización del Administrador)`;
        option.selected = true;
        organizacionSelect.add(option);
        
        organizacionSelect.disabled = true;
        organizacionSelect.style.backgroundColor = '#f8f9fa';
        organizacionSelect.style.cursor = 'not-allowed';
        
        console.log('✅ Organización configurada automáticamente:', organizacionUsuario);
        
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
        console.log('🎬 Iniciando aplicación de edición...');
        console.log('👤 Usuario actual:', this.userManager.currentUser);
        
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.inicializarValidaciones();
        
        this.configurarOrganizacionAutomatica();
        this.cargarResponsables();
        this.inicializarGestionCargos();
        this.cargarArea();
        
        console.log('✅ Aplicación de edición iniciada');
    }
    
    verificarElementosDOM() {
        console.log('🔍 Verificando elementos del formulario...');
        
        const ids = [
            'btnVolverLista', 'formEditarArea', 'areaId', 'nombreArea',
            'organizacion', 'descripcionArea', 'contadorCaracteres', 
            'responsable', 'btnCancelar', 'btnDesactivarArea', 'btnGuardarCambios',
            'btnAgregarCargo', 'cargosList', 'cargosCounter',
            'fechaCreacion', 'ultimaActualizacion', 'creadoPor', 'estadoActual'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${el ? '✅' : '❌'} ${id}`);
        });
    }
    
    inicializarEventos() {
        console.log('🎮 Configurando eventos...');
        
        try {
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this.volverALista());
                console.log('✅ Evento btnVolverLista');
            }
            
            const descripcionArea = document.getElementById('descripcionArea');
            if (descripcionArea) {
                descripcionArea.addEventListener('input', () => this.actualizarContadorCaracteres());
                console.log('✅ Evento descripcionArea');
            }
            
            const btnCancelar = document.getElementById('btnCancelar');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this.cancelarEdicion());
                console.log('✅ Evento btnCancelar');
            }
            
            const btnDesactivarArea = document.getElementById('btnDesactivarArea');
            if (btnDesactivarArea) {
                btnDesactivarArea.addEventListener('click', () => this.prepararDesactivacion());
                console.log('✅ Evento btnDesactivarArea');
            }
            
            const btnAgregarCargo = document.getElementById('btnAgregarCargo');
            if (btnAgregarCargo) {
                btnAgregarCargo.addEventListener('click', () => this.agregarCargo());
                console.log('✅ Evento btnAgregarCargo');
            }
            
            const formEditarArea = document.getElementById('formEditarArea');
            if (formEditarArea) {
                formEditarArea.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.validarYPrepararGuardado();
                });
                console.log('✅ Evento formEditarArea');
            }
            
            console.log('✅ Todos los eventos configurados');
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }
    
    inicializarValidaciones() {
        console.log('📋 Inicializando validaciones...');
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
    
    // CARGA DE DATOS
    async cargarArea() {
        try {
            console.log('🔍 Intentando obtener área...');
            
            const urlParams = new URLSearchParams(window.location.search);
            const areaId = urlParams.get('id');
            
            if (!areaId) {
                console.error('❌ No se proporcionó ID de área');
                this.mostrarError('No se especificó qué área editar');
                return;
            }
            
            console.log(`🔄 Cargando área existente con ID: ${areaId}`);
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
                console.log('✅ Área cargada:', this.areaActual.nombreArea);
                
                document.title = `Editar ${this.areaActual.nombreArea} - Sistema Centinela`;
                const titulo = document.querySelector('h1');
                if (titulo) {
                    titulo.innerHTML = `<i class="fas fa-edit me-2"></i>Editar Área: ${this.areaActual.nombreArea}`;
                }
            } else {
                console.warn('⚠️ Área no encontrada');
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
        console.log('📝 Cargando datos en formulario...');
        
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
        console.log('✅ Datos cargados en formulario');
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
    
    // GESTIÓN DE CARGOS
    inicializarGestionCargos() {
        console.log('💼 Inicializando gestión de cargos...');
        
        const btnAgregarCargo = document.getElementById('btnAgregarCargo');
        if (btnAgregarCargo) {
            btnAgregarCargo.addEventListener('click', () => this.agregarCargo());
            console.log('✅ Evento btnAgregarCargo');
        }
    }
    
    cargarCargosExistentes() {
        console.log('💼 Cargando cargos existentes...');
        
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
        }
        
        if (this.cargos.length === 0) {
            this.agregarCargo();
        } else {
            this.renderizarCargos();
            this.actualizarContadorCargos();
        }
    }
    
    agregarCargo() {
        console.log('➕ Agregando nuevo cargo...');
        
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
        console.log('🗑️ Eliminando cargo:', cargoId);
        
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
        console.log('🖼️ Renderizando cargos...');
        
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
            console.log(`✅ Cargo ${cargoId} actualizado: ${campo} = ${valor}`);
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
    
    // VALIDACIÓN
    validarFormulario() {
        console.log('✅ Validando formulario...');
        
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
        
        console.log('✅ Validación manual exitosa');
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
            console.log('🔄 Validando y preparando guardado...');
            
            if (!this.validarFormulario()) {
                return;
            }
            
            if (!this.hayCambios()) {
                this.mostrarNotificacion('No hay cambios para guardar', 'info');
                return;
            }
            
            const datosActualizados = this.obtenerDatosFormulario();
            console.log('📋 Datos a guardar:', datosActualizados);
            
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
        let cambiosHTML = '<div style="text-align: left;">';
        
        if (this.datosOriginales) {
            if (this.datosOriginales.nombreArea !== datosActualizados.nombreArea) {
                cambiosHTML += `<p><strong>Nombre:</strong><br>
                    <span style="color: #999; text-decoration: line-through;">${this.datosOriginales.nombreArea}</span><br>
                    <span style="color: #00ff95;">→ ${datosActualizados.nombreArea}</span></p>`;
            }
            
            const cargosOriginalesCount = Object.keys(this.datosOriginales.cargos || {}).length;
            const cargosActualesCount = Object.keys(datosActualizados.cargos || {}).length;
            if (cargosOriginalesCount !== cargosActualesCount) {
                cambiosHTML += `<p><strong>Cargos:</strong> ${cargosOriginalesCount} → ${cargosActualesCount}</p>`;
            }
            
            if (this.datosOriginales.responsable !== datosActualizados.responsable) {
                const responsableOriginal = this.datosOriginales.responsableNombre || 'No asignado';
                const responsableNuevo = datosActualizados.responsableNombre || 'No asignado';
                cambiosHTML += `<p><strong>Responsable:</strong> ${responsableOriginal} → ${responsableNuevo}</p>`;
            }
        }
        
        cambiosHTML += '</div>';
        return cambiosHTML || '<p>No se detectaron cambios específicos</p>';
    }
    
    obtenerDatosFormulario() {
        console.log('📋 Obteniendo datos del formulario...');
        
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
        
        console.log('💼 Cargos válidos:', cargosValidos.length);
        
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
            console.log('✅ Confirmando guardado...');
            
            if (!this.areaActual) {
                throw new Error('No hay área para actualizar');
            }
            
            this.mostrarCargando('Actualizando área...');
            
            console.log('📤 Enviando datos a actualizar:', datosActualizados);
            
            const areaActualizada = await this.actualizarAreaEnFirebase(datosActualizados);
            
            this.ocultarCargando();
            console.log('✅ Área actualizada exitosamente:', areaActualizada);
            
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
            console.log('🚀 Actualizando área en Firebase...');
            
            const collectionName = `areas_${this.userManager.currentUser.organizacionCamelCase}`;
            const areaId = this.areaActual.id;
            
            console.log(`📂 Colección destino: ${collectionName}`);
            console.log(`🆔 ID del área: ${areaId}`);
            
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            const cargosActuales = areaSnap.exists() ? areaSnap.data().cargos || {} : {};
            
            console.log('📂 Cargos actuales en Firebase:', cargosActuales);
            console.log('📝 Cargos del formulario:', datosActualizados.cargos);
            
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
            
            console.log('📝 Cargos a guardar (con IDs preservados):', cargosParaGuardar);
            
            const updateData = {
                nombreArea: datosActualizados.nombreArea,
                descripcion: datosActualizados.descripcion || '',
                cargos: cargosParaGuardar,
                responsable: datosActualizados.responsable || '',
                responsableNombre: datosActualizados.responsableNombre || '',
                actualizadoPor: this.userManager.currentUser.id,
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('📝 Datos para actualizar:', updateData);
            
            await updateDoc(areaRef, updateData);
            
            console.log(`✅ Área actualizada en: ${collectionName}/${areaId}`);
            
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
        console.log('🔄 Preparando desactivación...');
        
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
            console.log('🔄 Confirmando desactivación...');
            
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
            
            console.log('✅ Área desactivada correctamente');
            
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
        console.log('⬅️ Volviendo a lista de áreas...');
        window.location.href = '/users/admin/areas/areas.html';
    }
    
    cancelarEdicion() {
        console.log('❌ Cancelando edición...');
        
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
        console.log('✏️ Continuando edición...');
        
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
console.log('🎬 Iniciando carga de editarAreas.js...');
cargarDependencias();