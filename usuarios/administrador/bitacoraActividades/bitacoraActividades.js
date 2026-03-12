// bitacoraActividades.js - Controlador de la bitácora de actividades

// =============================================
// CLASE PRINCIPAL - BitacoraController
// =============================================
class BitacoraController {
    constructor() {
        this.historialManager = null;
        this.usuarioActual = null;
        this.actividades = [];
        this.fechaSeleccionada = new Date();
        this.flatpickrInstance = null;
        this.loadingOverlay = null;

        this._init();
    }

    // ========== INICIALIZACIÓN ==========

    async _init() {
        try {
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            await this._inicializarManager();
            this._inicializarCalendario();
            this._configurarEventos();
            await this._cargarActividades(this.fechaSeleccionada);

        } catch (error) {
            console.error('Error inicializando bitácora:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    async _inicializarManager() {
        try {
            const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
            this.historialManager = new HistorialUsuarioManager();
        } catch (error) {
            console.error('Error cargando HistorialUsuarioManager:', error);
            throw error;
        }
    }

    _cargarUsuario() {
        try {
            // Intentar cargar desde adminInfo (administradores)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || adminData.uid || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    correo: adminData.correoElectronico || '',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion)
                };
                return;
            }

            // Intentar cargar desde userData (colaboradores)
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                this.usuarioActual = {
                    id: userData.uid || userData.id || `user_${Date.now()}`,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    correo: userData.correo || userData.email || '',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa)
                };
                return;
            }

            // Si no hay datos, usar valores por defecto (para pruebas)
            console.warn('No se encontraron datos de usuario, usando valores por defecto');
            this.usuarioActual = {
                id: `usuario_${Date.now()}`,
                uid: `usuario_${Date.now()}`,
                nombreCompleto: 'Usuario de Prueba',
                correo: 'prueba@centinela.com',
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion'
            };

        } catch (error) {
            console.error('Error cargando usuario:', error);
            throw error;
        }
    }

    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    // ========== INICIALIZAR CALENDARIO (SIN HORA) ==========

    _inicializarCalendario() {
        const calendarioInput = document.getElementById('calendario');
        if (calendarioInput && typeof flatpickr !== 'undefined') {
            try {
                this.flatpickrInstance = flatpickr(calendarioInput, {
                    dateFormat: "Y-m-d",
                    locale: "es",
                    defaultDate: this.fechaSeleccionada,
                    maxDate: new Date(),
                    disableMobile: true,
                    onChange: (selectedDates) => {
                        if (selectedDates.length > 0) {
                            this.fechaSeleccionada = selectedDates[0];
                            this._actualizarFechaTexto();
                            this._cargarActividades(this.fechaSeleccionada);
                        }
                    }
                });
                console.log('Flatpickr inicializado correctamente');
            } catch (error) {
                console.error('Error inicializando Flatpickr:', error);
                calendarioInput.type = 'date';
                calendarioInput.max = this._formatearFechaInput(new Date());
            }
        }

        this._actualizarFechaTexto();
    }

    _formatearFechaInput(fecha) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    _formatearFechaLegible(fecha) {
        return fecha.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    _actualizarFechaTexto() {
        const spanFecha = document.getElementById('fechaSeleccionada');
        if (spanFecha) {
            const hoy = new Date();
            const esHoy = this.fechaSeleccionada.toDateString() === hoy.toDateString();
            spanFecha.textContent = esHoy ? 'Hoy' : this._formatearFechaLegible(this.fechaSeleccionada);
        }
    }

    // ========== CARGA DE ACTIVIDADES ==========

    async _cargarActividades(fecha) {
        this._mostrarCargando('Cargando actividades...');

        try {
            this.actividades = await this.historialManager.obtenerActividadesPorFecha(
                fecha,
                this.usuarioActual.organizacionCamelCase
            );

            this._renderizarActividades();
            this._actualizarContador();

        } catch (error) {
            console.error('Error cargando actividades:', error);
            this._mostrarError('No se pudieron cargar las actividades');
        } finally {
            this._ocultarCargando();
        }
    }

    _renderizarActividades() {
        const contenedor = document.getElementById('listaActividades');
        if (!contenedor) return;

        if (this.actividades.length === 0) {
            contenedor.innerHTML = `
                <div class="sin-actividades">
                    <i class="fas fa-calendar-day"></i>
                    <p>No hay actividades registradas para esta fecha</p>
                    <small>Selecciona otra fecha en el calendario</small>
                </div>
            `;
            return;
        }

        let html = '';
        this.actividades.forEach(act => {
            const uiData = act.toUI();
            const color = uiData.color;

            html += `
                <div class="actividad-item" data-id="${uiData.id}">
                    <div class="actividad-icono" style="border-color: ${color}; color: ${color};">
                        <i class="fas ${uiData.icono}"></i>
                    </div>
                    <div class="actividad-contenido">
                        <div class="actividad-header">
                            <span class="actividad-hora" style="color: ${color};">
                                <i class="fas fa-clock"></i> ${uiData.hora}
                            </span>
                            <span class="actividad-modulo">
                                <i class="fas ${this._getIconoModulo(uiData.modulo)}"></i>
                                ${uiData.modulo}
                            </span>
                            <span class="actividad-tipo" style="background: ${color}20; color: ${color};">
                                ${uiData.tipo}
                            </span>
                        </div>
                        <div class="actividad-descripcion">
                            ${uiData.descripcion}
                        </div>
                        <div class="actividad-usuario">
                            <div class="usuario-info">
                                <i class="fas fa-user"></i>
                                <span class="usuario-nombre">${this._escapeHTML(uiData.usuario.nombre)}</span>
                                <span class="usuario-correo">(${this._escapeHTML(uiData.usuario.correo)})</span>
                            </div>
                            ${this._renderizarDetallesAdicionales(uiData.detalles)}
                        </div>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;
    }

    _getIconoModulo(modulo) {
        const iconos = {
            areas: 'fa-sitemap',
            categorias: 'fa-tags',
            sucursales: 'fa-store',
            regiones: 'fa-map-marked-alt',
            incidencias: 'fa-exclamation-triangle',
            permisos: 'fa-lock',
            usuarios: 'fa-users',
            tema: 'fa-paint-roller',
            login: 'fa-sign-in-alt',
            logout: 'fa-sign-out-alt'
        };
        return iconos[modulo] || 'fa-circle';
    }

    _renderizarDetallesAdicionales(detalles) {
        if (!detalles || Object.keys(detalles).length === 0) return '';

        let html = '<div class="actividad-detalles">';

        if (detalles.ip) {
            html += `<span><i class="fas fa-network-wired"></i> ${detalles.ip}</span>`;
        }

        if (detalles.navegador) {
            html += `<span><i class="fas fa-globe"></i> ${detalles.navegador}</span>`;
        }

        html += '</div>';
        return html;
    }

    _actualizarContador() {
        const spanTotal = document.getElementById('totalActividades');
        if (spanTotal) {
            const total = this.actividades.length;
            spanTotal.textContent = `${total} ${total === 1 ? 'actividad' : 'actividades'}`;
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    _configurarEventos() {
        try {
            document.getElementById('btnVolverDashboard')?.addEventListener('click', () => {
                window.location.href = '/usuarios/administrador/dashboard/dashboard.html';
            });

            document.getElementById('btnRefrescar')?.addEventListener('click', () => {
                this._cargarActividades(this.fechaSeleccionada);
            });

            document.getElementById('btnHoy')?.addEventListener('click', () => {
                this.fechaSeleccionada = new Date();
                if (this.flatpickrInstance) {
                    this.flatpickrInstance.setDate(this.fechaSeleccionada);
                } else {
                    const calendarioInput = document.getElementById('calendario');
                    if (calendarioInput) {
                        calendarioInput.value = this._formatearFechaInput(this.fechaSeleccionada);
                    }
                }
                this._actualizarFechaTexto();
                this._cargarActividades(this.fechaSeleccionada);
            });

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // ========== NAVEGACIÓN ==========

    _redirigirAlLogin() {
        Swal.fire({
            icon: 'error',
            title: 'Sesión no válida',
            text: 'Debes iniciar sesión para continuar',
            confirmButtonText: 'Ir al login'
        }).then(() => {
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
        });
    }

    // ========== UTILIDADES ==========

    _mostrarError(mensaje) {
        this._mostrarNotificacion(mensaje, 'error');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' :
                tipo === 'error' ? 'Error' :
                tipo === 'warning' ? 'Advertencia' : 'Información',
            text: mensaje,
            icon: tipo,
            timer: duracion,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }

    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    _mostrarCargando(mensaje = 'Cargando...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${mensaje}</div>
        `;

        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }

    _ocultarCargando() {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    window.bitacoraDebug = { controller: new BitacoraController() };
});