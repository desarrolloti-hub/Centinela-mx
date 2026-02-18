// areas.js - VERSIÓN COMPLETA CON SWEETALERT2 (CLASES NATIVAS)
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
        mostrarErrorInterfaz(error.message);
    }
}

function mostrarErrorInterfaz(mensaje) {
    const container = document.querySelector('.container-fluid') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4 error-carga';
    errorDiv.innerHTML = `
        <h4 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error de Carga</h4>
        <p><strong>Error:</strong> ${mensaje}</p>
        <div class="alert alert-warning mt-3">
            Verifica que los archivos existan en:
            <ul class="mb-0 mt-2">
                <li><code>/config/firebase-config.js</code></li>
                <li><code>/clases/area.js</code></li>
            </ul>
        </div>
    `;
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
        mostrarErrorInterfaz(error.message);
    }
}

class AreasController {
    constructor() {
        console.log('🛠️ Creando AreasController...');

        this.areaManager = new AreaManager();
        this.areas = [];
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
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

            return { currentUser: userData };

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
            confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }

    init() {
        console.log('🎬 Iniciando aplicación...');

        if (!this.userManager || !this.userManager.currentUser) {
            this.redirigirAlLogin();
            return;
        }

        this.verificarElementosDOM();
        this.inicializarEventos();
        this.cargarAreas();
    }

    verificarElementosDOM() {
        const ids = ['btnNuevaArea', 'tablaAreasBody', 'vistaLista'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${el ? '✅' : '❌'} ${id}`);
        });
    }

    inicializarEventos() {
        try {
            const btnNuevaArea = document.getElementById('btnNuevaArea');
            if (btnNuevaArea) {
                btnNuevaArea.addEventListener('click', () => this.irACrearArea());
            }
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }

    irACrearArea() {
        window.location.href = '/users/admin/crearAreas/crearAreas.html';
    }

    irAEditarArea(areaId) {
        window.location.href = `/users/admin/editarAreas/editarAreas.html?id=${areaId}`;
    }

    async cargarAreas() {
        try {
            this.mostrarCargando();

            const organizacionCamelCase = this.userManager.currentUser.organizacionCamelCase;
            this.areas = await this.obtenerAreasDeColeccionEspecifica(organizacionCamelCase);

            this.actualizarTabla();
            this.ocultarCargando();
        } catch (error) {
            console.error('❌ Error cargando áreas:', error);
            this.mostrarError('Error cargando áreas: ' + error.message);
        }
    }

    async obtenerAreasDeColeccionEspecifica(organizacionCamelCase) {
        try {
            const collectionName = `areas_${organizacionCamelCase}`;
            const q = query(collection(db, collectionName));
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

                    area.getEstadoBadge = function () {
                        return '<span class="badge badge-activo">Activa</span>';
                    };

                    area.nombreOrganizacion = this.userManager.currentUser.organizacion;
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

            return areas;

        } catch (error) {
            if (error.code === 'failed-precondition' || error.code === 'not-found') {
                return [];
            }
            throw error;
        }
    }

    // ========== DESPLEGABLE DE CARGOS ==========

    toggleCargos(areaId, event) {
        if (event?.target.closest('.action-buttons, [data-action], .btn')) {
            return;
        }

        const fila = document.getElementById(`fila-${areaId}`);
        if (!fila) return;

        if (this.filaExpandida === areaId) {
            fila.classList.remove('expanded');
            const filaCargos = document.getElementById(`cargos-${areaId}`);
            if (filaCargos) filaCargos.remove();
            this.filaExpandida = null;
        } else {
            if (this.filaExpandida) {
                const filaAnterior = document.getElementById(`fila-${this.filaExpandida}`);
                if (filaAnterior) filaAnterior.classList.remove('expanded');
                const cargosAnteriores = document.getElementById(`cargos-${this.filaExpandida}`);
                if (cargosAnteriores) cargosAnteriores.remove();
            }

            fila.classList.add('expanded');
            this.filaExpandida = areaId;
            this.mostrarCargosDesplegables(areaId, fila);
        }
    }

    mostrarCargosDesplegables(areaId, filaReferencia) {
        const area = this.areas.find(a => a.id === areaId);
        if (!area) return;

        const cargos = area.getCargosAsArray();
        const cantidad = area.getCantidadCargos();

        const filaCargos = document.createElement('tr');
        filaCargos.id = `cargos-${areaId}`;
        filaCargos.className = 'cargos-dropdown-row';

        const celda = document.createElement('td');
        celda.colSpan = 7;
        celda.className = 'p-0';

        let cargosHTML = '';

        if (cargos.length === 0) {
            cargosHTML = '<div class="swal-cargos-empty">Esta área no tiene cargos asignados</div>';
        } else {
            cargosHTML = cargos.map((cargo, index) => `
                <div class="swal-cargo-item-simple">
                    <div class="swal-cargo-nombre-simple">
                        <i class="fas fa-user-tie"></i>
                        ${cargo.nombre || 'Sin nombre'}
                    </div>
                    <div class="swal-cargo-descripcion-simple">
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
                <div class="cargos-lista">${cargosHTML}</div>
            </div>
        `;

        filaCargos.appendChild(celda);
        filaReferencia.parentNode.insertBefore(filaCargos, filaReferencia.nextSibling);
    }

    // ========== ELIMINAR CON SWEETALERT2 ==========

    solicitarEliminacion(areaId) {
        Swal.fire({
            title: '¿Eliminar área?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--color-danger, #ff4d4d)',
            cancelButtonColor: 'var(--color-accent-secondary, #3085d6)',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.eliminarArea(areaId);
            }
        });
    }

    async eliminarArea(areaId) {
        try {
            const collectionName = `areas_${this.userManager.currentUser.organizacionCamelCase}`;
            const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
            const areaRef = doc(db, collectionName, areaId);
            await deleteDoc(areaRef);

            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'El área fue eliminada correctamente',
                confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm'
                }
            });

            await this.cargarAreas();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el área: ' + error.message,
                confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm'
                }
            });
        }
    }

    ejecutarAccion(accion, areaId) {
        switch (accion) {
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

    // ========== VER DETALLES CON SWEETALERT - ORGANIZADO COMO LA IMAGEN ==========
  // ========== VER DETALLES CON SWEETALERT - ESTILOS EN CSS ==========
async verDetalles(areaId) {
    try {
        const area = this.areas.find(a => a.id === areaId);
        if (!area) {
            this.mostrarError('Área no encontrada');
            return;
        }
        
        const cantidadCargos = area.getCantidadCargos();
        
        Swal.fire({
            title: `<div class="swal-titulo-container">
                <div class="swal-titulo-area">
                    <i class="fas fa-building"></i> Área: ${area.nombreArea}
                </div>
                <!-- El badge "Activa" se aplica con CSS, no necesitas ponerlo aquí -->
            </div>`,
            html: `
                <div class="swal-detalles-container">
                    <!-- DESCRIPCIÓN -->
                    <div class="swal-seccion">
                        <h6 class="swal-seccion-titulo"><i class="fas fa-align-left"></i> Descripción del Área</h6>
                        <p class="swal-descripcion">${area.descripcion || 'No hay descripción disponible para esta área.'}</p>
                    </div>
                    
                    <!-- SOLO EL NÚMERO DE CARGOS -->
                    <div class="swal-seccion">
                        <h6 class="swal-seccion-titulo"><i class="fas fa-briefcase"></i> Cargos (${cantidadCargos})</h6>
                    </div>
                    
                    <!-- INFORMACIÓN DEL SISTEMA -->
                    <div class="swal-seccion">
                        <h6 class="swal-seccion-titulo"><i class="fas fa-info-circle"></i> Información del Sistema</h6>
                        <div class="swal-info-grid">
                            <div class="swal-info-item">
                                <small>Fecha Creación</small>
                                <span><i class="fas fa-calendar"></i> ${area.getFechaCreacionFormateada?.() || 'No disponible'}</span>
                            </div>
                            <div class="swal-info-item">
                                <small>Última Actualización</small>
                                <span><i class="fas fa-clock"></i> ${area.getFechaActualizacionFormateada?.() || 'No disponible'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            icon: null,
            confirmButtonText: '<i class="fas fa-edit"></i> Editar Área',
            confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)',
            showCancelButton: true,
            cancelButtonText: '<i class="fas fa-times"></i> Cerrar',
            cancelButtonColor: 'var(--color-bg-tertiary, #545454)',
            customClass: {
                popup: 'swal2-popup swal-detalles-nuevo',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            },
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                this.irAEditarArea(area.id);
            }
        });
    } catch (error) {
        this.mostrarError('Error: ' + error.message);
    }
}
    // ========== INTERFAZ ==========

    actualizarTabla() {
        const tbody = document.getElementById('tablaAreasBody');
        if (!tbody) return;

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
            tbody.appendChild(this.crearFilaArea(area));
        });

        this.actualizarPaginacion(this.areas.length);
    }

    // ========== CREAR FILA CON BADGE ROJO PARA CARGOS ==========

    crearFilaArea(area) {
        const fila = document.createElement('tr');
        fila.id = `fila-${area.id}`;
        fila.className = 'area-row';

        if (this.filaExpandida === area.id) {
            fila.classList.add('expanded');
        }

        const cantidadCargos = area.getCantidadCargos();

        fila.innerHTML = `
            <td class="text-center">
                <span class="toggle-icon"><i class="fas fa-chevron-right"></i></span>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div>
                        <strong class="area-nombre">${area.nombreArea}</strong>
                        <div class="text-muted small">${area.descripcion?.substring(0, 60) || ''}${area.descripcion?.length > 60 ? '...' : ''}</div>
                    </div>
                </div>
            </td>
            <td>${area.nombreOrganizacion || this.userManager.currentUser.organizacion}</td>
            <td>
                <span class="cargo-count-badge">
                    <i class="fas fa-briefcase me-1"></i>${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}
                </span>
            </td>
            <td>${area.getEstadoBadge ? area.getEstadoBadge() : '<span class="badge badge-activo">Activa</span>'}</td>
            <td><div class="small">${area.getFechaCreacionFormateada?.() || 'No disponible'}</div></td>
            <td><div class="action-buttons">${this.obtenerBotonesAccion(area)}</div></td>
        `;

        fila.addEventListener('click', (e) => this.toggleCargos(area.id, e));

        const toggleIcon = fila.querySelector('.toggle-icon');
        if (toggleIcon) toggleIcon.addEventListener('click', (e) => { e.stopPropagation(); this.toggleCargos(area.id, e); });

        const badgeCargos = fila.querySelector('.cargo-count-badge');
        if (badgeCargos) badgeCargos.addEventListener('click', (e) => { e.stopPropagation(); this.toggleCargos(area.id, e); });

        const areaNombre = fila.querySelector('.area-nombre');
        if (areaNombre) areaNombre.addEventListener('click', (e) => { e.stopPropagation(); this.toggleCargos(area.id, e); });

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

    paginarAreas(listaAreas, pagina) {
        const inicio = (pagina - 1) * this.elementosPorPagina;
        return listaAreas.slice(inicio, inicio + this.elementosPorPagina);
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
            liAnterior.innerHTML = '<a class="page-link" href="#" aria-label="Anterior"><span aria-hidden="true">&laquo;</span></a>';
            liAnterior.addEventListener('click', (e) => { e.preventDefault(); if (this.paginacionActual > 1) this.cambiarPagina(this.paginacionActual - 1); });
            paginacionElement.appendChild(liAnterior);

            for (let i = 1; i <= totalPaginas; i++) {
                const li = document.createElement('li');
                li.className = `page-item ${this.paginacionActual === i ? 'active' : ''}`;
                li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
                li.addEventListener('click', (e) => { e.preventDefault(); this.cambiarPagina(i); });
                paginacionElement.appendChild(li);
            }

            const liSiguiente = document.createElement('li');
            liSiguiente.className = `page-item ${this.paginacionActual === totalPaginas ? 'disabled' : ''}`;
            liSiguiente.innerHTML = '<a class="page-link" href="#" aria-label="Siguiente"><span aria-hidden="true">&raquo;</span></a>';
            liSiguiente.addEventListener('click', (e) => { e.preventDefault(); if (this.paginacionActual < totalPaginas) this.cambiarPagina(this.paginacionActual + 1); });
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

    ocultarCargando() { }

    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
    }

    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }

    mostrarNotificacion(mensaje, tipo) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed notificacion-flotante`;
        alert.setAttribute('role', 'alert');

        const icono = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const color = tipo === 'success' ? 'var(--color-success, #00ff95)' : 'var(--color-danger, #ff4d4d)';

        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${icono} me-3 fs-4" style="color: ${color};"></i>
                <div>
                    <strong>${tipo === 'success' ? 'Éxito' : 'Error'}</strong><br>
                    <span>${mensaje}</span>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
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