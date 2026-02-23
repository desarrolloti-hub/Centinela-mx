// areas.js - VERSIÓN CORREGIDA (usa estilos globales de personalization.css)

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
        <h4><i class="fas fa-exclamation-triangle"></i> Error de Carga</h4>
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
            confirmButtonText: 'Ir al login'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }

    init() {
        if (!this.userManager || !this.userManager.currentUser) {
            this.redirigirAlLogin();
            return;
        }

        this.actualizarBadgeEmpresa();
        this.inicializarEventos();
        this.cargarAreas();
    }

    actualizarBadgeEmpresa() {
        const badgeEmpresa = document.getElementById('badge-empresa');
        const empresaNombre = badgeEmpresa?.querySelector('.empresa-nombre');
        
        if (badgeEmpresa && empresaNombre && this.userManager?.currentUser?.organizacion) {
            empresaNombre.textContent = this.userManager.currentUser.organizacion;
            badgeEmpresa.style.display = 'inline-flex';
        }
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

    irAEditarCargo(areaId, cargoId, event) {
        event?.stopPropagation();
        window.location.href = `/users/admin/editarAreas/editarAreas.html?id=${areaId}&editarCargo=${cargoId}`;
    }

    irACrearCargo(areaId, event) {
        event?.stopPropagation();
        window.location.href = `/users/admin/editarAreas/editarAreas.html?id=${areaId}&nuevoCargo=true`;
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
        filaCargos.className = 'cargos-row';
        filaCargos.style.display = 'table-row';

        const celda = document.createElement('td');
        celda.colSpan = 7;
        celda.style.padding = '0';
        celda.style.borderTop = 'none';

        // Botón de agregar con el MISMO ESTILO que btn-nueva-area
        const botonAgregarHTML = `
            <button class="btn-nueva-area" style="min-width: auto; padding: 8px 16px !important;" onclick="window.appDebug.controller.irACrearCargo('${area.id}', event)">
                <i class="fas fa-plus"></i> Agregar Cargo
            </button>
        `;

        if (cargos.length === 0) {
            celda.innerHTML = `
                <div class="cargos-container" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)); padding: 20px; border-radius: 0 0 var(--border-radius-large) var(--border-radius-large);">
                    <div class="cargos-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                        <h6 style="color: var(--color-text-primary); font-size: 1rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);">
                            <i class="fas fa-list-ul" style="color: var(--color-text-primary); filter: drop-shadow(0 0 5px var(--color-accent-primary));"></i>
                            Cargos de <span style="color:#2f8cff;">"${this.escapeHTML(area.nombreArea)}"</span>
                        </h6>
                        ${botonAgregarHTML}
                    </div>
                    <div style="text-align:center; padding:30px; background:rgba(0,0,0,0.2); border-radius:8px;">
                        <i class="fas fa-briefcase" style="font-size:32px; color:#6b7280;"></i>
                        <p style="color:#6b7280; margin: 10px 0;">No hay cargos asignados</p>
                        ${botonAgregarHTML}
                    </div>
                </div>
            `;
        } else {
            let cargosHTML = '';
            cargos.forEach((cargo, index) => {
                const descripcionTruncada = cargo.descripcion && cargo.descripcion.length > 40 
                    ? cargo.descripcion.substring(0, 37) + '...' 
                    : cargo.descripcion || '';
                    
                const nombreTruncado = cargo.nombre && cargo.nombre.length > 18 
                    ? cargo.nombre.substring(0, 15) + '...' 
                    : cargo.nombre || 'Sin nombre';

                cargosHTML += `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">${index + 1}</td>
                        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">
                            <div style="display: flex; align-items: center; flex-wrap: nowrap; gap: 8px;">
                                <span style="max-width:120px; color: white;" title="${this.escapeHTML(cargo.nombre || '')}">${this.escapeHTML(nombreTruncado)}</span>
                            </div>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">
                            <span style="max-width:200px; word-break: break-word; white-space: normal; line-height: 1.4; color: var(--color-text-dim);" title="${this.escapeHTML(cargo.descripcion || '')}">${this.escapeHTML(descripcionTruncada) || '-'}</span>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-secondary); vertical-align: middle; font-size: 0.85rem;">
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                <button class="btn" onclick="window.appDebug.controller.verDetallesCargo('${area.id}', '${cargo.id}', event)" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-warning" onclick="window.appDebug.controller.irAEditarCargo('${area.id}', '${cargo.id}', event)" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-danger" onclick="window.appDebug.controller.eliminarCargo('${area.id}', '${cargo.id}', event)" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            celda.innerHTML = `
                <div class="cargos-container" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)); padding: 20px; border-radius: 0 0 var(--border-radius-large) var(--border-radius-large);">
                    <div class="cargos-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                        <h6 style="color: var(--color-text-primary); font-size: 1rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; font-family: var(--font-family-secondary, 'Rajdhani', sans-serif);">
                            <i class="fas fa-list-ul" style="color: var(--color-text-primary); filter: drop-shadow(0 0 5px var(--color-accent-primary));"></i>
                            Cargos de <span style="color:#2f8cff;">"${this.escapeHTML(area.nombreArea)}"</span>
                        </h6>
                        ${botonAgregarHTML}
                    </div>
                    <div style="background: rgba(0, 0, 0, 0.2); border-radius: var(--border-radius-medium); overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; min-width: 100%;">
                            <thead>
                                <tr>
                                    <th style="width: 40px; padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">#</th>
                                    <th style="width: 25%; padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">Nombre</th>
                                    <th style="width: 35%; padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">Descripción</th>
                                    <th style="width: 110px; padding: 12px; text-align: left; color: var(--color-text-dim); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-family: 'Orbitron', sans-serif;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cargosHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        filaCargos.appendChild(celda);
        filaReferencia.parentNode.insertBefore(filaCargos, filaReferencia.nextSibling);
    }

    verDetallesCargo(areaId, cargoId, event) {
        event?.stopPropagation();
        
        const area = this.areas.find(a => a.id === areaId);
        if (!area) return;

        const cargos = area.getCargosAsArray();
        const cargo = cargos.find(c => c.id === cargoId);
        
        if (!cargo) return;

        Swal.fire({
            title: cargo.nombre || 'Cargo',
            html: `
                <div style="text-align: left;">
                    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                        <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                            <i class="fas fa-sitemap" style="margin-right: 8px;"></i>ÁREA
                        </h4>
                        <p style="color: var(--color-text-secondary); margin: 0;">${this.escapeHTML(area.nombreArea)}</p>
                    </div>

                    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                        <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                            <i class="fas fa-align-left" style="margin-right: 8px;"></i>DESCRIPCIÓN
                        </h4>
                        <p style="color: var(--color-text-secondary); margin: 0;">${this.escapeHTML(cargo.descripcion) || 'No hay descripción disponible.'}</p>
                    </div>
                </div>
            `,
            icon: null,
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: 'CERRAR',
            cancelButtonText: 'CANCELAR',
            reverseButtons: false
        });
    }

    async eliminarCargo(areaId, cargoId, event) {
        event?.stopPropagation();

        const area = this.areas.find(a => a.id === areaId);
        if (!area) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Área no encontrada'
            });
            return;
        }

        const cargos = area.getCargosAsArray();
        const cargo = cargos.find(c => c.id === cargoId);
        
        if (!cargo) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Cargo no encontrado'
            });
            return;
        }

        const result = await Swal.fire({
            title: '¿Eliminar cargo?',
            html: `
                <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                    <strong style="color: #ff4d4d;">"${this.escapeHTML(cargo.nombre || 'Sin nombre')}"</strong>
                </p>
                <p style="color: var(--color-text-dim); font-size: 0.8rem; margin-top: 15px;">
                    Esta acción no se puede deshacer.
                </p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ELIMINAR',
            cancelButtonText: 'CANCELAR',
            reverseButtons: false,
            focusCancel: true
        });

        if (result.isConfirmed) {
            try {
                if (area.eliminarCargo) {
                    area.eliminarCargo(cargoId);
                }

                await this.areaManager.actualizarArea(areaId, {
                    nombreArea: area.nombreArea,
                    descripcion: area.descripcion,
                    estado: area.estado,
                    cargos: area.cargos
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: `"${cargo.nombre}" ha sido eliminado.`,
                    timer: 1500,
                    showConfirmButton: false
                });

                const areaActualizada = await this.areaManager.obtenerAreaPorId(areaId);
                const index = this.areas.findIndex(a => a.id === areaId);
                if (index !== -1) this.areas[index] = areaActualizada;

                const filaCargos = document.getElementById(`cargos-${areaId}`);
                if (filaCargos) {
                    filaCargos.remove();
                    this.filaExpandida = null;
                }

                const filaArea = document.getElementById(`fila-${areaId}`);
                if (filaArea) {
                    const cantidadCargos = areaActualizada.getCantidadCargos();
                    const badge = filaArea.querySelector('.cargo-count-badge');
                    if (badge) {
                        badge.innerHTML = `<i class="fas fa-briefcase"></i> ${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}`;
                    }
                }

            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message
                });
            }
        }
    }

    solicitarEliminacion(areaId) {
        Swal.fire({
            title: '¿Eliminar área?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ELIMINAR',
            cancelButtonText: 'CANCELAR',
            reverseButtons: false,
            focusCancel: true
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
                timer: 2000,
                showConfirmButton: false
            });

            await this.cargarAreas();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el área'
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

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
                title: nombreAreaTruncado,
                html: `
                    <div style="text-align: left;">
                        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                            <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                                <i class="fas fa-align-left" style="margin-right: 8px;"></i>DESCRIPCIÓN
                            </h4>
                            <p style="color: var(--color-text-secondary); margin: 0;">${this.escapeHTML(area.descripcion) || 'No hay descripción disponible para esta área.'}</p>
                        </div>
                        
                        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                            <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                                <i class="fas fa-briefcase" style="margin-right: 8px;"></i>CARGOS (${cantidadCargos})
                            </h4>
                            <p style="color: var(--color-text-secondary);">${cantidadCargos === 0 ? 'No hay cargos asignados' : `Esta área tiene ${cantidadCargos} cargo${cantidadCargos !== 1 ? 's' : ''}`}</p>
                        </div>
                        
                        <div>
                            <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>INFORMACIÓN DEL SISTEMA
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">FECHA CREACIÓN</small>
                                    <span style="color: var(--color-text-secondary);"><i class="fas fa-calendar" style="margin-right: 5px;"></i> ${area.getFechaCreacionFormateada?.() || 'No disponible'}</span>
                                </div>
                                <div>
                                    <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">ÚLTIMA ACTUALIZACIÓN</small>
                                    <span style="color: var(--color-text-secondary);"><i class="fas fa-clock" style="margin-right: 5px;"></i> ${area.getFechaActualizacionFormateada?.() || 'No disponible'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                icon: null,
                showConfirmButton: true,
                showCancelButton: true,
                confirmButtonText: 'EDITAR ÁREA',
                cancelButtonText: 'CERRAR',
                reverseButtons: false
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
        
        // SIN PAGINACIÓN - mostrar todas las áreas
        const todasLasAreas = this.areas;

        tbody.innerHTML = '';

        if (todasLasAreas.length === 0) {
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

        todasLasAreas.forEach((area) => {
            tbody.appendChild(this.crearFilaArea(area));
        });

        // Ocultar la paginación completamente
        const paginacionContainer = document.querySelector('.pagination-container');
        if (paginacionContainer) {
            paginacionContainer.style.display = 'none';
        }
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
            <td class="text-center" style="width:50px;" data-label="">
                <span class="toggle-icon" style="background: transparent; border: none;"><i class="fas fa-chevron-right" style="color: white;"></i></span>
            </td>
            <td data-label="Nombre">
                <div style="display: flex; align-items: center;">
                    <div style="width:4px; height:24px; background:#2f8cff; border-radius:2px; margin-right:12px; flex-shrink:0;"></div>
                    <div>
                        <strong class="area-nombre" style="color:white;" title="${this.escapeHTML(area.nombreArea)}">${this.escapeHTML(area.nombreArea)}</strong>
                        ${area.descripcion ? `<div style="color: var(--color-text-dim); font-size:0.75rem; margin-top:2px;">${this.escapeHTML(area.descripcion.substring(0, 60))}${area.descripcion.length > 60 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            </td>
            <td data-label="Organización">${this.escapeHTML(area.organizacionCamelCase || this.userManager.currentUser.organizacion)}</td>
            <td data-label="Cargos">
                <span class="cargo-count-badge">
                    <i class="fas fa-briefcase"></i> ${cantidadCargos} ${cantidadCargos === 1 ? 'cargo' : 'cargos'}
                </span>
            </td>
            <td data-label="Estado">${area.getEstadoBadge ? area.getEstadoBadge() : '<span class="badge-activo">Activa</span>'}</td>
            <td data-label="Fecha Creación"><div style="color: var(--color-text-dim);">${area.getFechaCreacionFormateada?.() || 'No disponible'}</div></td>
            <td data-label="Acciones">
                <div class="action-buttons">
                    <button class="btn" data-action="ver" data-id="${area.id}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning" data-action="editar" data-id="${area.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" data-action="eliminar" data-id="${area.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        fila.addEventListener('click', (e) => this.toggleCargos(area.id, e));

        const toggleIcon = fila.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                this.toggleCargos(area.id, e); 
            });
        }

        const badgeCargos = fila.querySelector('.cargo-count-badge');
        if (badgeCargos) {
            badgeCargos.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                this.toggleCargos(area.id, e); 
            });
        }

        setTimeout(() => {
            fila.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;
                    this.ejecutarAccion(action, id);
                });
            });
        }, 50);

        return fila;
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
        this.mostrarNotificacion(mensaje, 'error');
    }

    mostrarNotificacion(mensaje, tipo) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
        });
        
        Toast.fire({ icon: tipo, title: mensaje });
    }
}

// Exponer el controller para acceso desde los botones de cargo
window.appDebug.controller = null;

cargarDependencias();