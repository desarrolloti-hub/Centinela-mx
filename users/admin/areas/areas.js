// areas.js - VERSIÓN COMPLETA CON FLECHA ESTILO CATEGORÍAS Y SWEETALERT ACORDE AL TEMA
console.log('🚀 areas.js iniciando...');

window.appDebug = {
    estado: 'iniciando',
    controller: null
};

let Area, AreaManager, db, query, collection, getDocs, where;

async function cargarDependencias() {
    try {
        console.log('1️⃣ Cargando dependencias...');
        
        const firebaseModule = await import('/config/firebase-config.js');
        db = firebaseModule.db;
        
        const firestoreModule = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
        ({ query, collection, getDocs, where } = firestoreModule);
        
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

class AreasController {
    constructor() {
        console.log('🛠️ Creando AreasController...');
        
        this.areaManager = new AreaManager();
        this.areas = [];
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
        this.areaSeleccionada = null;
        this.accionPendiente = null;
        
        // 🔥 Control de filas expandidas
        this.filaExpandida = null;
        
        this.userManager = this.cargarUsuarioDesdeStorage();
        
        if (!this.userManager || !this.userManager.currentUser) {
            console.error('❌ No se pudo cargar información del usuario');
            this.redirigirAlLogin();
            return;
        }
        
        console.log('✅ Controller creado con usuario:', this.userManager.currentUser);
    }
    
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
                    timestamp: adminData.timestamp || new Date().toISOString()
                };
            }
            
            if (!userData) {
                const storedUserData = localStorage.getItem('userData');
                if (storedUserData) {
                    userData = JSON.parse(storedUserData);
                    console.log('👤 Datos de usuario encontrados:', userData);
                    userData.nombreCompleto = userData.nombreCompleto || userData.nombre || 'Usuario';
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
            background: '#0a0a0a',
            color: '#ffffff',
            confirmButtonColor: '#2f8cff',
            iconColor: '#ff4d4d'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }
    
    init() {
        console.log('🎬 Iniciando aplicación...');
        
        if (!this.userManager || !this.userManager.currentUser) {
            console.error('❌ Usuario no autenticado');
            this.redirigirAlLogin();
            return;
        }
        
        console.log('👤 Usuario actual:', this.userManager.currentUser);
        
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
            const btnNuevaArea = document.getElementById('btnNuevaArea');
            if (btnNuevaArea) {
                btnNuevaArea.addEventListener('click', () => this.irACrearArea());
                console.log('✅ Evento btnNuevaArea');
            }
            
            const toggleEliminadas = document.getElementById('toggleEliminadas');
            if (toggleEliminadas) {
                toggleEliminadas.addEventListener('change', (e) => {
                    this.cargarAreas(e.target.checked);
                });
                console.log('✅ Evento toggleEliminadas');
            }
            
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
    
    irACrearArea() {
        console.log('➡️ Redirigiendo a página de creación de áreas...');
        window.location.href = '/users/admin/crearAreas/crearAreas.html';
    }
    
    irAEditarArea(areaId) {
        console.log(`➡️ Redirigiendo a editar área: ${areaId}`);
        window.location.href = `/users/admin/editarAreas/editarAreas.html?id=${areaId}`;
    }
    
    async cargarAreas(incluirEliminadas = false) {
        try {
            this.mostrarCargando();
            
            const organizacionCamelCase = this.userManager.currentUser.organizacionCamelCase;
            console.log(`📥 Cargando áreas para organización: ${organizacionCamelCase}`);
            
            this.areas = await this.obtenerAreasDeColeccionEspecifica(organizacionCamelCase);
            
            console.log(`📊 ${this.areas.length} áreas cargadas`);
            
            this.actualizarTabla();
            this.ocultarCargando();
            
        } catch (error) {
            console.error('❌ Error cargando áreas:', error);
            this.mostrarError('Error cargando áreas: ' + error.message);
        }
    }
    
    async obtenerAreasDeColeccionEspecifica(organizacionCamelCase) {
        try {
            console.log(`🔍 Buscando áreas en colección: areas_${organizacionCamelCase}`);
            
            const collectionName = `areas_${organizacionCamelCase}`;
            
            const q = query(
                collection(db, collectionName)
            );
            
            const querySnapshot = await getDocs(q);
            const areas = [];
            
            querySnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    
                    const area = new Area(doc.id, { 
                        ...data, 
                        id: doc.id,
                        nombreOrganizacion: this.userManager.currentUser.organizacion
                    });
                    
                    area.getEstadoBadge = function() {
                        return '<span class="badge badge-activo">Activa</span>';
                    };
                    
                    area.nombreOrganizacion = this.userManager.currentUser.organizacion;
                    
                    console.log(`✅ Área cargada: ${area.nombreArea} - ${area.getCantidadCargos()} cargos`);
                    
                    areas.push(area);
                } catch (error) {
                    console.error(`❌ Error procesando área ${doc.id}:`, error);
                }
            });
            
            areas.sort((a, b) => {
                const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : new Date(0);
                const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : new Date(0);
                return fechaB - fechaA;
            });
            
            console.log(`✅ Encontradas ${areas.length} áreas en ${collectionName}`);
            return areas;
            
        } catch (error) {
            console.error('❌ Error obteniendo áreas:', error);
            
            if (error.code === 'failed-precondition' || error.code === 'not-found') {
                console.log(`⚠️ La colección areas_${organizacionCamelCase} no existe aún.`);
                return [];
            }
            
            throw error;
        }
    }
    
    // ========== 🔥 MÉTODOS PARA DESPLEGABLE DE CARGOS CON FLECHA ==========
    
    toggleCargos(areaId, event) {
        // Evitar que se active si se hace clic en botones de acción
        if (event?.target.closest('.action-buttons, [data-action], .btn')) {
            return;
        }
        
        console.log(`📋 Alternando cargos para área: ${areaId}`);
        
        const fila = document.getElementById(`fila-${areaId}`);
        if (!fila) return;
        
        if (this.filaExpandida === areaId) {
            // 🔽 CONTRAER: quitar clase expanded y eliminar fila de cargos
            fila.classList.remove('expanded');
            
            const filaCargos = document.getElementById(`cargos-${areaId}`);
            if (filaCargos) {
                filaCargos.remove();
            }
            this.filaExpandida = null;
            console.log(`📭 Contraída área: ${areaId}`);
        } else {
            // 🔼 EXPANDIR: cerrar la anterior si existe y abrir la nueva
            
            // Cerrar fila expandida anterior
            if (this.filaExpandida) {
                const filaAnterior = document.getElementById(`fila-${this.filaExpandida}`);
                if (filaAnterior) {
                    filaAnterior.classList.remove('expanded');
                }
                
                const cargosAnteriores = document.getElementById(`cargos-${this.filaExpandida}`);
                if (cargosAnteriores) {
                    cargosAnteriores.remove();
                }
            }
            
            // Abrir nueva fila
            fila.classList.add('expanded');
            this.filaExpandida = areaId;
            this.mostrarCargosDesplegables(areaId, fila);
            console.log(`📬 Expandida área: ${areaId}`);
        }
    }
    
    mostrarCargosDesplegables(areaId, filaReferencia) {
        const area = this.areas.find(a => a.id === areaId);
        if (!area) return;
        
        // Obtener cargos usando los métodos de la clase Area
        const cargos = area.getCargosAsArray();
        const cantidad = area.getCantidadCargos();
        
        console.log(`📋 ${area.nombreArea} - Cargos encontrados:`, cargos);
        
        const filaCargos = document.createElement('tr');
        filaCargos.id = `cargos-${areaId}`;
        filaCargos.className = 'cargos-dropdown-row';
        
        const celda = document.createElement('td');
        celda.colSpan = 7;
        celda.className = 'p-0';
        celda.style.borderBottom = 'none';
        celda.style.backgroundColor = 'transparent';
        
        let cargosHTML = '';
        
        if (cantidad === 0) {
            cargosHTML = `
                <div class="cargos-empty-detalle">
                    <i class="fas fa-info-circle me-2"></i>
                    Esta área no tiene cargos asignados
                </div>
            `;
        } else {
            cargosHTML = cargos.map(cargo => `
                <div class="cargo-item-detalle">
                    <div class="cargo-nombre">
                        <i class="fas fa-user-tie"></i>
                        ${cargo.nombre || 'Sin nombre'}
                    </div>
                    <div class="cargo-descripcion">
                        ${cargo.descripcion || 'Sin descripción'}
                    </div>
                </div>
            `).join('');
        }
        
        celda.innerHTML = `
            <div class="cargos-dropdown">
                <div class="cargos-dropdown-header">
                    <h6><i class="fas fa-briefcase me-2"></i>Cargos del Área</h6>
                    <span class="badge">${cantidad} ${cantidad === 1 ? 'cargo' : 'cargos'}</span>
                </div>
                <div class="cargos-lista">
                    ${cargosHTML}
                </div>
            </div>
        `;
        
        filaCargos.appendChild(celda);
        filaReferencia.parentNode.insertBefore(filaCargos, filaReferencia.nextSibling);
    }
    
    // ========== ACCIONES ==========
    
    async eliminarArea(areaId) {
        try {
            console.log('🗑️ Eliminando área:', areaId);
            
            const collectionName = `areas_${this.userManager.currentUser.organizacionCamelCase}`;
            
            const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
            
            const areaRef = doc(db, collectionName, areaId);
            await deleteDoc(areaRef);
            
            console.log(`✅ Área ${areaId} eliminada permanentemente de ${collectionName}`);
            
            this.mostrarExito('Área eliminada correctamente');
            await this.cargarAreas();
            
        } catch (error) {
            console.error('❌ Error eliminando área:', error);
            this.mostrarError('Error al eliminar: ' + error.message);
        }
    }
    
    solicitarEliminacion(areaId) {
        console.log('⚠️ Solicitando confirmación para eliminar:', areaId);
        
        this.areaSeleccionada = areaId;
        this.accionPendiente = 'eliminar';
        
        document.getElementById('confirmarMensaje').innerHTML = `
            <p>¿Está seguro de eliminar esta área?</p>
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Advertencia:</strong> Esta acción eliminará permanentemente el área y no se podrá recuperar.
            </div>
        `;
        
        document.getElementById('btnConfirmarAccion').textContent = 'Eliminar';
        document.getElementById('btnConfirmarAccion').className = 'btn btn-danger';
        
        new bootstrap.Modal(document.getElementById('modalConfirmar')).show();
    }
    
    ejecutarAccionConfirmada() {
        console.log('✅ Ejecutando acción confirmada');
        
        if (this.areaSeleccionada && this.accionPendiente === 'eliminar') {
            this.eliminarArea(this.areaSeleccionada);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            this.areaSeleccionada = null;
            this.accionPendiente = null;
        }
    }
    
    ejecutarAccion(accion, areaId) {
        console.log(`🎯 Ejecutando acción: ${accion} para ${areaId}`);
        
        switch(accion) {
            case 'ver':
                this.verDetalles(areaId);
                break;
            case 'editar':
                this.irAEditarArea(areaId);
                break;
            case 'eliminar':
                this.solicitarEliminacion(areaId);
                break;
        }
    }
    
    // ========== 🔥 VER DETALLES CON SWEETALERT - ACORDE AL TEMA ==========
    
    async verDetalles(areaId) {
        try {
            console.log('👁️ Mostrando detalles completos:', areaId);
            
            const area = this.areas.find(a => a.id === areaId);
            if (!area) {
                this.mostrarError('Área no encontrada');
                return;
            }
            
            const cargos = area.getCargosAsArray();
            const cantidadCargos = area.getCantidadCargos();
            
            let cargosHTML = '';
            
            if (cargos.length === 0) {
                cargosHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--color-text-secondary, #cccccc); background: rgba(20,20,20,0.5); border-radius: var(--border-radius-small, 5px);">
                        <i class="fas fa-briefcase" style="font-size: 24px; margin-bottom: 10px; color: var(--color-accent-secondary, #2f8cff);"></i>
                        <p style="margin: 0; font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);">Esta área no tiene cargos asignados</p>
                    </div>
                `;
            } else {
                cargosHTML = cargos.map((cargo, index) => `
                    <div style="
                        background: var(--color-bg-tertiary, #141414);
                        border: 1px solid var(--color-border-light, #545454);
                        border-radius: var(--border-radius-small, 5px);
                        padding: 12px 15px;
                        margin-bottom: 10px;
                        transition: all 0.2s ease;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="color: var(--color-text-primary, #ffffff); font-weight: 600; font-family: var(--font-family-primary, 'Orbitron', sans-serif); font-size: 13px;">
                                <i class="fas fa-user-tie" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 8px;"></i>
                                ${cargo.nombre || 'Sin nombre'}
                            </span>
                            <span style="
                                background: var(--color-accent-secondary, #2f8cff);
                                color: white;
                                padding: 3px 10px;
                                border-radius: 20px;
                                font-size: 11px;
                                font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);
                            ">Cargo #${index + 1}</span>
                        </div>
                        <div style="
                            color: var(--color-text-secondary, #cccccc);
                            font-size: 12px;
                            margin-left: 5px;
                            padding-left: 10px;
                            border-left: 2px solid var(--color-accent-secondary, #2f8cff);
                            font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);
                            line-height: 1.5;
                        ">
                            ${cargo.descripcion || 'Sin descripción'}
                        </div>
                    </div>
                `).join('');
            }
            
            const fechaCreacion = area.getFechaCreacionFormateada ? area.getFechaCreacionFormateada() : 'No disponible';
            const fechaActualizacion = area.getFechaActualizacionFormateada ? area.getFechaActualizacionFormateada() : 'No disponible';
            
            Swal.fire({
                title: `
                    <div style="display: flex; align-items: center; gap: 12px; color: var(--color-text-primary, #ffffff);">
                        <i class="fas fa-building" style="color: var(--color-accent-primary, #c0c0c0); font-size: 26px;"></i>
                        <span style="font-family: var(--font-family-primary, 'Orbitron', sans-serif); color: var(--color-text-primary, #ffffff); text-transform: uppercase; letter-spacing: 1px;">${area.nombreArea}</span>
                    </div>
                `,
                html: `
                    <div style="text-align: left; color: var(--color-text-secondary, #cccccc); font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);">
                        <!-- Estado y Organización -->
                        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light, #545454);">
                            <span style="
                                background: rgba(0, 255, 149, 0.1);
                                color: var(--color-success, #00ff95);
                                padding: 5px 16px;
                                border-radius: 20px;
                                border: 1px solid rgba(0, 255, 149, 0.3);
                                font-size: 12px;
                                text-transform: uppercase;
                                font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);
                                letter-spacing: 0.5px;
                            ">
                                <i class="fas fa-circle" style="font-size: 8px; margin-right: 6px;"></i>
                                Activa
                            </span>
                            <span style="color: var(--color-text-secondary, #cccccc); font-size: 13px;">
                                <i class="fas fa-building" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 8px;"></i>
                                ${area.nombreOrganizacion || this.userManager.currentUser.organizacion}
                            </span>
                        </div>
                        
                        <!-- Descripción -->
                        <div style="margin-bottom: 25px;">
                            <h6 style="color: var(--color-accent-primary, #c0c0c0); font-family: var(--font-family-primary, 'Orbitron', sans-serif); font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid var(--color-border-light, #545454); padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-align-left" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 10px;"></i>
                                Descripción
                            </h6>
                            <p style="color: var(--color-text-secondary, #cccccc); margin: 0; padding-left: 8px; font-size: 13px; line-height: 1.6;">
                                ${area.descripcion || 'No hay descripción disponible para esta área.'}
                            </p>
                        </div>
                        
                        <!-- Cargos -->
                        <div style="margin-bottom: 25px;">
                            <h6 style="color: var(--color-accent-primary, #c0c0c0); font-family: var(--font-family-primary, 'Orbitron', sans-serif); font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid var(--color-border-light, #545454); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; letter-spacing: 0.5px;">
                                <span>
                                    <i class="fas fa-briefcase" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 10px;"></i>
                                    Cargos
                                </span>
                                <span style="
                                    background: var(--color-accent-secondary, #2f8cff);
                                    color: white;
                                    padding: 4px 12px;
                                    border-radius: 20px;
                                    font-size: 11px;
                                    font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);
                                ">${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}</span>
                            </h6>
                            <div style="max-height: 280px; overflow-y: auto; padding-right: 5px;">
                                ${cargosHTML}
                            </div>
                        </div>
                        
                        <!-- Información del Sistema -->
                        <div style="
                            background: var(--color-bg-secondary, #0a0a0a);
                            border: 1px solid var(--color-border-light, #545454);
                            border-radius: var(--border-radius-medium, 10px);
                            padding: 18px;
                            margin-top: 15px;
                            box-shadow: var(--shadow-small, 0 2px 8px rgba(0,0,0,0.3));
                        ">
                            <h6 style="color: var(--color-accent-primary, #c0c0c0); font-family: var(--font-family-primary, 'Orbitron', sans-serif); font-size: 12px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-info-circle" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 10px;"></i>
                                Información del Sistema
                            </h6>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <small style="color: var(--color-accent-primary, #c0c0c0); display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; opacity: 0.8;">ID del Área</small>
                                    <code style="color: var(--color-accent-secondary, #2f8cff); background: var(--color-bg-tertiary, #141414); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid var(--color-border-light, #545454);">${area.id}</code>
                                </div>
                                <div>
                                    <small style="color: var(--color-accent-primary, #c0c0c0); display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; opacity: 0.8;">Colección</small>
                                    <code style="color: var(--color-accent-secondary, #2f8cff); background: var(--color-bg-tertiary, #141414); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid var(--color-border-light, #545454);">areas_${this.userManager.currentUser.organizacionCamelCase}</code>
                                </div>
                                <div>
                                    <small style="color: var(--color-accent-primary, #c0c0c0); display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; opacity: 0.8;">Fecha Creación</small>
                                    <span style="color: var(--color-text-secondary, #cccccc); font-size: 12px;">
                                        <i class="fas fa-calendar" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 6px;"></i>
                                        ${fechaCreacion}
                                    </span>
                                </div>
                                <div>
                                    <small style="color: var(--color-accent-primary, #c0c0c0); display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; opacity: 0.8;">Última Actualización</small>
                                    <span style="color: var(--color-text-secondary, #cccccc); font-size: 12px;">
                                        <i class="fas fa-clock" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 6px;"></i>
                                        ${fechaActualizacion}
                                    </span>
                                </div>
                                <div style="grid-column: span 2;">
                                    <small style="color: var(--color-accent-primary, #c0c0c0); display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; opacity: 0.8;">Creado por</small>
                                    <span style="color: var(--color-text-secondary, #cccccc); font-size: 12px;">
                                        <i class="fas fa-user" style="color: var(--color-accent-secondary, #2f8cff); margin-right: 6px;"></i>
                                        ${area.creadoPor || this.userManager.currentUser.nombreCompleto}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                icon: 'info',
                iconColor: '#2f8cff',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonText: '<i class="fas fa-edit" style="margin-right: 8px;"></i>Editar Área',
                confirmButtonColor: '#2f8cff',
                showCancelButton: true,
                cancelButtonText: '<i class="fas fa-times" style="margin-right: 6px;"></i>Cerrar',
                cancelButtonColor: '#545454',
                customClass: {
                    popup: 'swal-dark',
                    title: 'swal-title',
                    htmlContainer: 'swal-html',
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                },
                buttonsStyling: true,
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    this.irAEditarArea(area.id);
                }
            });
            
        } catch (error) {
            console.error('❌ Error mostrando detalles:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    // ========== INTERFAZ ==========
    
    actualizarTabla() {
        const tbody = document.getElementById('tablaAreasBody');
        if (!tbody) return;
        
        // Limpiar estado de expansión al recargar tabla
        this.filaExpandida = null;
        
        const areasPaginadas = this.paginarAreas(this.areas, this.paginacionActual);
        
        tbody.innerHTML = '';
        
        if (areasPaginadas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No se encontraron áreas</p>
                        <p class="small text-muted">Colección: <code>areas_${this.userManager.currentUser.organizacionCamelCase}</code></p>
                    </td>
                </tr>
            `;
            return;
        }
        
        areasPaginadas.forEach((area) => {
            const fila = this.crearFilaArea(area);
            tbody.appendChild(fila);
        });
        
        this.actualizarPaginacion(this.areas.length);
    }
    
    // ========== 🔥 CREAR FILA CON FLECHA ESTILO CATEGORÍAS ==========
    
    crearFilaArea(area) {
        const fila = document.createElement('tr');
        fila.id = `fila-${area.id}`;
        fila.className = 'area-row';
        
        // ✅ AGREGAR CLASE 'expanded' SI ESTÁ EXPANDIDA
        if (this.filaExpandida === area.id) {
            fila.classList.add('expanded');
        }
        
        const cantidadCargos = area.getCantidadCargos();
        
        fila.innerHTML = `
            <td class="text-center">
                <span class="toggle-icon">
                    <i class="fas fa-chevron-right"></i>
                </span>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div>
                        <strong class="area-nombre" style="cursor: pointer;">${area.nombreArea}</strong>
                        <div class="text-muted small">${area.descripcion?.substring(0, 60) || ''}${area.descripcion?.length > 60 ? '...' : ''}</div>
                    </div>
                </div>
            </td>
            <td>${area.nombreOrganizacion || this.userManager.currentUser.organizacion}</td>
            <td>
                <span class="badge bg-primary" style="cursor: pointer;">
                    <i class="fas fa-briefcase me-1"></i>${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}
                </span>
            </td>
            <td>${area.getEstadoBadge ? area.getEstadoBadge() : '<span class="badge badge-activo">Activa</span>'}</td>
            <td>
                <div class="small">${area.getFechaCreacionFormateada ? area.getFechaCreacionFormateada() : 'No disponible'}</div>
            </td>
            <td>
                <div class="action-buttons">
                    ${this.obtenerBotonesAccion(area)}
                </div>
            </td>
        `;
        
        // Evento principal en toda la fila
        fila.addEventListener('click', (e) => this.toggleCargos(area.id, e));
        
        // ✅ Evento específico para la flecha
        const toggleIcon = fila.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCargos(area.id, e);
            });
        }
        
        // Evento específico para el badge de cargos
        const badgeCargos = fila.querySelector('.badge.bg-primary');
        if (badgeCargos) {
            badgeCargos.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCargos(area.id, e);
            });
        }
        
        // Evento para el nombre del área
        const areaNombre = fila.querySelector('.area-nombre');
        if (areaNombre) {
            areaNombre.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCargos(area.id, e);
            });
        }
        
        // Eventos para botones de acción (con stopPropagation)
        setTimeout(() => {
            fila.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.target.closest('[data-action]').dataset.action;
                    const id = e.target.closest('[data-action]').dataset.id;
                    this.ejecutarAccion(action, id);
                });
            });
        }, 50);
        
        return fila;
    }
    
    obtenerBotonesAccion(area) {
        return `
            <button class="btn btn-sm btn-primary" data-action="ver" data-id="${area.id}" title="Ver detalles">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning" data-action="editar" data-id="${area.id}" title="Editar Área">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${area.id}" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        `;
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
            
            const liAnterior = document.createElement('li');
            liAnterior.className = `page-item ${this.paginacionActual === 1 ? 'disabled' : ''}`;
            liAnterior.innerHTML = `<a class="page-link" href="#" aria-label="Anterior"><span aria-hidden="true">&laquo;</span></a>`;
            liAnterior.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.paginacionActual > 1) {
                    this.cambiarPagina(this.paginacionActual - 1);
                }
            });
            paginacionElement.appendChild(liAnterior);
            
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
            
            const liSiguiente = document.createElement('li');
            liSiguiente.className = `page-item ${this.paginacionActual === totalPaginas ? 'disabled' : ''}`;
            liSiguiente.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente"><span aria-hidden="true">&raquo;</span></a>`;
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
        this.filaExpandida = null;
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
                        <p class="mt-3">Cargando áreas de <code>areas_${this.userManager.currentUser.organizacionCamelCase}</code>...</p>
                    </td>
                </tr>
            `;
        }
    }
    
    ocultarCargando() {}
    
    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
    }
    
    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }
    
    mostrarNotificacion(mensaje, tipo) {
        const notificacionesPrevias = document.querySelectorAll('.notificacion-flotante');
        notificacionesPrevias.forEach(n => n.remove());
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed notificacion-flotante`;
        alert.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: var(--shadow-normal, 0 4px 16px rgba(0,0,0,0.5));
            border-left: 4px solid ${tipo === 'success' ? '#00ff95' : '#ff4d4d'};
            background: var(--color-bg-secondary, #0a0a0a);
            color: var(--color-text-secondary, #cccccc);
            border: 1px solid var(--color-border-light, #545454);
        `;
        
        const icono = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${icono} me-3 fs-4" style="color: ${tipo === 'success' ? '#00ff95' : '#ff4d4d'};"></i>
                <div>
                    <strong style="color: var(--color-text-primary, #ffffff);">${tipo === 'success' ? 'Éxito' : 'Error'}</strong><br>
                    <span>${mensaje}</span>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar" style="filter: invert(1) brightness(2);"></button>
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

cargarDependencias();