
// crearAreas.js - MÓDULO PARA CREACIÓN DE ÁREAS (SOLO SWEETALERT2)
console.log('🚀 crear-areas.js iniciando...');

// Variable global para debugging
window.crearAreaDebug = {
    estado: 'iniciando',
    controller: null
};

// Cargar dependencias
let Area, AreaManager, db, query, serverTimestamp, collection, doc, getDocs, setDoc, where;

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
            where
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
        console.log('🎯 Inicializando CrearAreaController...');
        
        const app = new CrearAreaController();
        window.crearAreaDebug.controller = app;
        
        app.init();
        
        console.log('✅ Controlador de creación listo');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger">Error de Inicialización</h4>
            <p>${error.message}</p>
        `);
    }
}

// ==================== CLASE CREARAREACONTROLLER ====================
class CrearAreaController {
    constructor() {
        console.log('🛠️ Creando CrearAreaController...');
        
        this.areaManager = new AreaManager();
        this.userManager = this.cargarUsuarioDesdeStorage();
        
        if (!this.userManager || !this.userManager.currentUser) {
            console.error('❌ No se pudo cargar información del usuario');
            this.redirigirAlLogin();
            throw new Error('Usuario no autenticado');
        }
        
        console.log('✅ Usuario cargado:', this.userManager.currentUser);
        this.areaEnProceso = null;
        this.areaCreadaReciente = null;
        this.loadingOverlay = null;
        this.notificacionActual = null;
        
        // Array para almacenar los cargos
        this.cargos = [];
    }
    
    // MÉTODO MEJORADO PARA CARGAR USUARIO
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
                organizacionCamelCase: userData.organizacionCamelCase,
                esResponsable: userData.esResponsable || false
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
                adminOption.style.color = '#2c3e50';
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
            } else {
                const sinColabOption = document.createElement('option');
                sinColabOption.disabled = true;
                sinColabOption.text = '────────── SIN COLABORADORES ──────────';
                responsableSelect.appendChild(sinColabOption);
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
    
    // MÉTODO PARA CARGAR COLABORADORES DESDE EL SISTEMA
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
            console.error('❌ Error cargando colaboradores del sistema:', error);
            return [];
        }
    }
    
    // MÉTODO PARA CONFIGURAR ORGANIZACIÓN AUTOMÁTICA
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
    
    // MOSTRAR INFORMACIÓN DE LA ORGANIZACIÓN EN LA INTERFAZ
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
        console.log('🎬 Iniciando aplicación de creación...');
        console.log('👤 Usuario actual:', this.userManager.currentUser);
        
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.inicializarValidaciones();
        
        this.configurarOrganizacionAutomatica();
        this.cargarResponsables();
        this.inicializarGestionCargos();
        
        console.log('✅ Aplicación de creación iniciada');
    }
    
    verificarElementosDOM() {
        console.log('🔍 Verificando elementos del formulario...');
        
        const ids = [
            'btnVolverLista', 'formCrearArea', 'nombreArea',
            'organizacion', 'descripcionArea', 'contadorCaracteres', 
            'responsable', 'btnCancelar', 'btnCrearArea',
            'btnAgregarCargo', 'cargosList', 'cargosCounter'
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
                btnCancelar.addEventListener('click', () => this.cancelarCreacion());
                console.log('✅ Evento btnCancelar');
            }
            
            const formCrearArea = document.getElementById('formCrearArea');
            if (formCrearArea) {
                formCrearArea.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.validarYPrepararCreacion();
                });
                console.log('✅ Evento formCrearArea');
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
    
    // ========== MÉTODOS DE INTERFAZ ==========
    
    actualizarContadorCaracteres() {
        const descripcionArea = document.getElementById('descripcionArea');
        const contador = document.getElementById('contadorCaracteres');
        
        if (descripcionArea && contador) {
            const longitud = descripcionArea.value.length;
            contador.textContent = longitud;
            contador.className = longitud > 450 ? 'text-warning' : 'text-success';
        }
    }
    
    // ========== MÉTODOS DE NAVEGACIÓN ==========
    
    volverALista() {
        console.log('⬅️ Volviendo a lista de áreas...');
        window.location.href = '/users/admin/areas/areas.html';
    }
    
    cancelarCreacion() {
        console.log('❌ Cancelando creación...');
        
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
    
    // ========== MÉTODOS DE VALIDACIÓN ==========
    
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
    
    async validarYPrepararCreacion() {
        try {
            console.log('🔄 Validando y preparando creación...');
            
            if (!this.validarFormulario()) {
                return;
            }
            
            const datosArea = this.obtenerDatosFormulario();
            
            console.log('📋 Datos a crear:', datosArea);
            console.log('👤 Usuario que crea:', this.userManager.currentUser);
            
            const existe = await this.verificarAreaExistenteEnColeccion(
                datosArea.nombreArea,
                datosArea.organizacionCamelCase
            );
            
            if (existe) {
                this.mostrarError('Ya existe un área con ese nombre en esta organización');
                return;
            }
            
            this.areaEnProceso = datosArea;
            
            // MODAL DE CONFIRMACIÓN CON SWEETALERT2
            const cantidadCargos = Object.keys(datosArea.cargos || {}).length;
            
            const result = await Swal.fire({
                title: '¿Confirmar creación?',
                html: `
                    <div style="text-align: left;">
                        <p>¿Está seguro de crear la siguiente área?</p>
                        <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 8px; margin-top: 10px;">
                            <h6 style="color: var(--color-accent-primary); margin-bottom: 10px;">${datosArea.nombreArea}</h6>
                            <p style="margin-bottom: 5px;"><small><strong>Organización:</strong> ${this.userManager.currentUser.organizacion}</small></p>
                            <p style="margin-bottom: 5px;"><small><strong>Colección:</strong> areas_${datosArea.organizacionCamelCase}</small></p>
                            <p style="margin-bottom: 5px;"><small><strong>Cargos:</strong> ${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}</small></p>
                            <p style="margin-bottom: 0;"><small><strong>Descripción:</strong> ${datosArea.descripcion.substring(0, 100)}${datosArea.descripcion.length > 100 ? '...' : ''}</small></p>
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
            console.error('❌ Error en validación:', error);
            this.mostrarError('Error validando datos: ' + error.message);
        }
    }
    
    // VERIFICAR ÁREA EXISTENTE EN COLECCIÓN ESPECÍFICA
    async verificarAreaExistenteEnColeccion(nombreArea, organizacionCamelCase) {
        try {
            console.log(`🔍 Verificando si ya existe el área "${nombreArea}" en colección areas_${organizacionCamelCase}...`);
            
            const collectionName = `areas_${organizacionCamelCase}`;
            
            const q = query(
                collection(db, collectionName),
                where("nombreArea", "==", nombreArea)
            );
            
            const querySnapshot = await getDocs(q);
            const existe = !querySnapshot.empty;
            
            console.log(`✅ Verificación completada. ¿Existe?: ${existe}`);
            
            if (existe) {
                console.log('⚠️ Ya existe un área con ese nombre:', nombreArea);
            }
            
            return existe;
            
        } catch (error) {
            console.error('❌ Error verificando área existente:', error);
            return false;
        }
    }
    
    // ========== MÉTODOS PARA GESTIÓN DE CARGOS ==========
    
    inicializarGestionCargos() {
        console.log('💼 Inicializando gestión de cargos...');
        
        const btnAgregarCargo = document.getElementById('btnAgregarCargo');
        if (btnAgregarCargo) {
            btnAgregarCargo.addEventListener('click', () => this.agregarCargo());
            console.log('✅ Evento btnAgregarCargo');
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
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // OBTENER DATOS DEL FORMULARIO - CON CARGOS
    obtenerDatosFormulario() {
        console.log('📋 Obteniendo datos del formulario...');
        
        const userOrgCamel = this.userManager.currentUser.organizacionCamelCase;
        
        const cargosValidos = this.cargos.filter(c => c.nombre && c.nombre.trim() !== '');
        
        const cargosObject = {};
        cargosValidos.forEach(cargo => {
            const cargoId = `cargo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            cargosObject[cargoId] = {
                nombre: cargo.nombre.trim(),
                descripcion: cargo.descripcion ? cargo.descripcion.trim() : ''
            };
        });
        
        console.log('💼 Cargos válidos:', cargosValidos.length);
        
        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            cargos: cargosObject,
            organizacionCamelCase: userOrgCamel,
            creadoPor: this.userManager.currentUser.id,
            actualizadoPor: this.userManager.currentUser.id,
            fechaCreacion: new Date().toISOString(),
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
            confirmButtonColor: '#2f8cff'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }
    
    // ========== MÉTODOS DE CREACIÓN ==========
    
    async confirmarCreacion() {
        try {
            console.log('✅ Confirmando creación de área...');
            
            if (!this.areaEnProceso) {
                throw new Error('No hay datos de área para crear');
            }
            
            this.mostrarCargando('Creando área...');
            
            console.log('📤 Enviando datos a crearArea:', this.areaEnProceso);
            
            const nuevaArea = await this.crearAreaEnColeccionEspecifica(this.areaEnProceso);
            
            this.ocultarCargando();
            
            console.log('✅ Área creada exitosamente:', nuevaArea);
            
            this.areaCreadaReciente = nuevaArea;
            
            // MODAL DE ÉXITO CON SWEETALERT2
            const cantidadCargos = Object.keys(nuevaArea.cargos || {}).length;
            const fecha = new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            await Swal.fire({
                title: '¡Área creada exitosamente!',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 64px; color: var(--color-success); margin-bottom: 20px;"></i>
                        <h4 style="color: var(--color-success); margin-bottom: 20px;">¡Área creada correctamente!</h4>
                        <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 8px; text-align: left;">
                            <p><strong>Nombre del Área:</strong> ${nuevaArea.nombreArea}</p>
                            <p><strong>Organización:</strong> ${this.userManager.currentUser.organizacion}</p>
                            <p><strong>Responsable:</strong> ${this.userManager.currentUser.nombreCompleto}</p>
                            <p><strong>Fecha de Creación:</strong> ${fecha}</p>
                            <p><strong>Código de Área:</strong> ${nuevaArea.id} (${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'})</p>
                        </div>
                        <div style="background: rgba(47, 140, 255, 0.1); padding: 10px; border-radius: 8px; margin-top: 15px; text-align: left;">
                            <i class="fas fa-info-circle" style="color: var(--color-accent-secondary);"></i>
                            El área ha sido registrada en el sistema. ¿Qué desea hacer?
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
            console.error('❌ Error creando área:', error);
            this.ocultarCargando();
            this.mostrarError('Error creando área: ' + error.message);
        }
    }
    
    // CREAR ÁREA EN COLECCIÓN ESPECÍFICA - CON CARGOS
    async crearAreaEnColeccionEspecifica(datosArea) {
        try {
            console.log('🚀 Creando área en colección específica...');
            
            const organizacionCamelCase = datosArea.organizacionCamelCase;
            const collectionName = `areas_${organizacionCamelCase}`;
            
            console.log(`📂 Colección destino: ${collectionName}`);
            
            const areaId = this.generarAreaId(datosArea.nombreArea, organizacionCamelCase);
            
            console.log(`🆔 ID generado: ${areaId}`);
            
            const areaFirestoreData = {
                nombreArea: datosArea.nombreArea,
                descripcion: datosArea.descripcion || '',
                cargos: datosArea.cargos || {},
                organizacionCamelCase: organizacionCamelCase,
                creadoPor: datosArea.creadoPor || '',
                actualizadoPor: datosArea.actualizadoPor || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('📝 Datos para Firestore:', areaFirestoreData);
            
            const areaRef = doc(db, collectionName, areaId);
            await setDoc(areaRef, areaFirestoreData);
            
            console.log(`✅ Área guardada en: ${collectionName}/${areaId}`);
            
            const nuevaArea = new Area(areaId, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            return nuevaArea;
            
        } catch (error) {
            console.error('❌ Error en crearAreaEnColeccionEspecifica:', error);
            throw error;
        }
    }
    
    // GENERAR ID ÚNICO PARA EL ÁREA
    generarAreaId(nombreArea, organizacionCamelCase) {
        const nombreNormalizado = nombreArea
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 30);
        
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        
        return `${organizacionCamelCase}_area_${nombreNormalizado}_${timestamp}_${random}`;
    }
    
    // ========== ACCIONES POST-CREACIÓN ==========
    
    crearOtraArea() {
        console.log('🔄 Preparando para crear otra área...');
        
        this.limpiarFormulario();
        
        setTimeout(() => {
            const nombreArea = document.getElementById('nombreArea');
            if (nombreArea) {
                nombreArea.focus();
            }
        }, 100);
    }
    
    verAreaCreada() {
        console.log('👁️ Redirigiendo para ver área creada...');
        window.location.href = '/users/admin/areas/areas.html';
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    limpiarFormulario() {
        console.log('🧹 Limpiando formulario...');
        
        const form = document.getElementById('formCrearArea');
        if (form) {
            form.reset();
        }
        
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
        
        console.log('✅ Formulario limpio');
    }
    
    // ========== MÉTODOS DE INTERFAZ ==========
    
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
    
    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
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
        
        let icono = tipo;
        if (tipo === 'danger') icono = 'error';
        
        Toast.fire({
            icon: icono,
            title: mensaje
        });
    }
}

// ========== INICIAR APLICACIÓN ==========
console.log('🎬 Iniciando carga de crear-areas.js...');
cargarDependencias();