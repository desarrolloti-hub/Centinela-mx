// areas.js - VERSIÓN SIN BOOTSTRAP
window.appDebug = {
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
    const container = document.querySelector('.centinela-container') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-carga';
    errorDiv.innerHTML = `
        <h4><i class="fas fa-exclamation-triangle"></i>Error de Carga</h4>
        <p>${mensaje}</p>
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
        const app = new AreasController();
        window.appDebug.controller = app;
        app.init();
    } catch (error) {
        console.error('[Error]', error.message);
        mostrarErrorInterfaz(error.message);
    }
}

class AreasController {
    constructor() {
        this.areaManager = new AreaManager();
        this.areas = [];
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
        this.filaExpandida = null;

        this.userManager = this.cargarUsuarioDesdeStorage();

        if (!this.userManager || !this.userManager.currentUser) {
            this.redirigirAlLogin();
            return;
        }
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
            confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }

    init() {
        if (!this.userManager || !this.userManager.currentUser) {
            this.redirigirAlLogin();
            return;
        }

        this.inicializarEventos();
        this.cargarAreas();
    }

    inicializarEventos() {
        const btnNuevaArea = document.getElementById('btnNuevaArea');
        if (btnNuevaArea) {
            btnNuevaArea.addEventListener('click', () => this.irACrearArea());
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
            this.areas = await this.areaManager.getAreasByOrganizacion(organizacionCamelCase);

            this.actualizarTabla();
            this.ocultarCargando();
        } catch (error) {
            this.mostrarError('Error cargando áreas');
        }
    }

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
                    <h6><i class="fas fa-briefcase"></i>Cargos del Área</h6>
                    <span class="badge">${cantidad} ${cantidad === 1 ? 'cargo' : 'cargos'}</span>
                </div>
                <div class="cargos-lista">${cargosHTML}</div>
            </div>
        `;

        filaCargos.appendChild(celda);
        filaReferencia.parentNode.insertBefore(filaCargos, filaReferencia.nextSibling);
    }

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
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                this.eliminarArea(areaId);
            }
        });
    }

    async eliminarArea(areaId) {
        try {
            const organizacionCamelCase = this.userManager.currentUser.organizacionCamelCase;
            await this.areaManager.eliminarArea(areaId, this.userManager.currentUser.id, organizacionCamelCase);

            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'El área fue eliminada correctamente',
                confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)'
            });

            await this.cargarAreas();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el área',
                confirmButtonColor: 'var(--color-accent-secondary, #2f8cff)'
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

    truncarTexto(texto, maxLongitud = 30) {
        if (!texto) return '';
        if (texto.length <= maxLongitud) return texto;
        return texto.substring(0, maxLongitud) + '...';
    }

    async verDetalles(areaId) {
        try {
            const area = this.areas.find(a => a.id === areaId);
            if (!area) {
                this.mostrarError('Área no encontrada');
                return;
            }
            
            const cantidadCargos = area.getCantidadCargos();
            const nombreAreaTruncado = this.truncarTexto(area.nombreArea, 25);
            
            Swal.fire({
                customClass: {
                    popup: 'swal-detalles-nuevo',
                    confirmButton: 'swal2-confirm',
                    cancelButton: 'swal2-cancel',
                    actions: 'swal2-actions'
                },
                title: `<div class="swal-titulo-container">
                    <div class="swal-titulo-area">
                        <i class="fas fa-building"></i>
                        <span class="swal-titulo-texto" title="${area.nombreArea}">${nombreAreaTruncado}</span>
                    </div>
                </div>`,
                html: `
                    <div class="swal-detalles-container">
                        <div class="swal-seccion">
                            <h6 class="swal-seccion-titulo"><i class="fas fa-align-left"></i> Descripción del Área</h6>
                            <p class="swal-descripcion">${area.descripcion || 'No hay descripción disponible para esta área.'}</p>
                        </div>
                        
                        <div class="swal-seccion">
                            <h6 class="swal-seccion-titulo"><i class="fas fa-briefcase"></i> Cargos (${cantidadCargos})</h6>
                        </div>
                        
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
                showConfirmButton: true,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-edit"></i> Editar Área',
                cancelButtonText: '<i class="fas fa-times"></i> Cerrar',
                reverseButtons: false,
                buttonsStyling: false
            }).then((result) => {
                if (result.isConfirmed) {
                    this.irAEditarArea(area.id);
                }
            });
        } catch (error) {
            this.mostrarError('Error al cargar detalles');
        }
    }

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
                        <i class="fas fa-inbox fa-3x text-muted"></i>
                        <p class="text-muted">No se encontraron áreas</p>
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

    crearFilaArea(area) {
        const fila = document.createElement('tr');
        fila.id = `fila-${area.id}`;
        fila.className = 'area-row';

        if (this.filaExpandida === area.id) {
            fila.classList.add('expanded');
        }

        const cantidadCargos = area.getCantidadCargos();

        fila.innerHTML = `
            <td class="text-center" data-label="">
                <span class="toggle-icon"><i class="fas fa-chevron-right"></i></span>
            </td>
            <td data-label="Nombre">
                <div>
                    <strong class="area-nombre">${area.nombreArea}</strong>
                    <div class="text-muted small">${area.descripcion?.substring(0, 60) || ''}${area.descripcion?.length > 60 ? '...' : ''}</div>
                </div>
            </td>
            <td data-label="Organización">${area.organizacionCamelCase || this.userManager.currentUser.organizacion}</td>
            <td data-label="Cargos">
                <span class="cargo-count-badge">
                    <i class="fas fa-briefcase"></i>${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}
                </span>
            </td>
            <td data-label="Estado">${area.getEstadoBadge ? area.getEstadoBadge() : '<span class="badge-activo">Activa</span>'}</td>
            <td data-label="Fecha Creación"><div class="small">${area.getFechaCreacionFormateada?.() || 'No disponible'}</div></td>
            <td data-label="Acciones"><div class="action-buttons">${this.obtenerBotonesAccion(area)}</div></td>
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
            <button class="btn btn-primary" data-action="ver" data-id="${area.id}" title="Ver detalles">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-warning" data-action="editar" data-id="${area.id}" title="Editar Área">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" data-action="eliminar" data-id="${area.id}" title="Eliminar">
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

        if (paginacionElement) {
            paginacionElement.innerHTML = '';

            if (totalPaginas > 1) {
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
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-3">Cargando áreas...</p>
                    </td>
                </tr>
            `;
        }
    }

    ocultarCargando() { }

    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }

    mostrarNotificacion(mensaje, tipo) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
        });
        
        let icono = tipo === 'danger' ? 'error' : tipo;
        Toast.fire({ icon: icono, title: mensaje });
    }
}

cargarDependencias();