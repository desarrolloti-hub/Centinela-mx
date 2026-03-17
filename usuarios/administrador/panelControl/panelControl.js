// panelControl.js - Cargador de datos reales para el Panel de Control
// Versión con 6 tarjetas - SIN ANIMACIONES PARPADEANTES
// CORREGIDO: getCantidadCargos() → getCantidadCargosTotal()

import { UserManager } from '/clases/user.js';
import { IncidenciaManager } from '/clases/incidencia.js';
import { RegionManager } from '/clases/region.js';
import { SucursalManager } from '/clases/sucursal.js';
import { AreaManager } from '/clases/area.js';

// ============================================
// CLASE PRINCIPAL PanelControlManager
// ============================================
class PanelControlManager {
    constructor() {
        this.userManager = new UserManager();
        this.incidenciaManager = new IncidenciaManager();
        this.regionManager = new RegionManager();
        this.sucursalManager = new SucursalManager();
        this.areaManager = new AreaManager();

        this.organizacionActual = null;
        this.usuarioActualId = null;
        this.estadisticas = {
            incidencias: 0,
            regiones: 0,
            sucursales: 0,
            areas: 0,
            cargos: 0,
            usuarios: 0
        };

        // Referencias a elementos DOM
        this.elementos = {
            incidencias: document.getElementById('total-incidencias'),
            regiones: document.getElementById('total-regiones'),
            sucursales: document.getElementById('total-sucursales'),
            areas: document.getElementById('total-areas'),
            cargos: document.getElementById('total-cargos'),
            usuarios: document.getElementById('total-usuarios')
        };

        // Referencias a las tarjetas KPI
        this.tarjetas = {
            incidencias: document.getElementById('kpi-incidencias'),
            regiones: document.getElementById('kpi-regiones'),
            sucursales: document.getElementById('kpi-sucursales'),
            areas: document.getElementById('kpi-areas'),
            cargos: document.getElementById('kpi-cargos'),
            usuarios: document.getElementById('kpi-usuarios')
        };

        // URLs para navegación (TODAS excepto cargos)
        this.urls = {
            incidencias: '/usuarios/administrador/incidencias/incidencias.html',
            regiones: '/usuarios/administrador/regiones/regiones.html',
            sucursales: '/usuarios/administrador/sucursales/sucursales.html',
            areas: '/usuarios/administrador/areas/areas.html',
            // cargos: NO TIENE URL - no será cliqueable
            usuarios: '/usuarios/administrador/usuarios/usuarios.html'
        };

        // Variable para debugging
        window.panelControlDebug = {
            estado: 'iniciando',
            controller: this
        };
    }

    // ============================================
    // MÉTODO PRINCIPAL - Cargar todas las estadísticas
    // ============================================
    async cargarTodasLasEstadisticas() {
        try {
            // Mostrar indicador de carga
            this._mostrarCargando();

            // Esperar a que el usuario esté autenticado
            await this._esperarAutenticacion();

            if (!this.userManager.currentUser) {
                this._mostrarError('No se pudo autenticar al usuario');
                this._redirigirAlLogin();
                return;
            }

            const usuario = this.userManager.currentUser;
            this.organizacionActual = usuario.organizacionCamelCase;
            this.usuarioActualId = usuario.id;

            if (!this.organizacionActual) {
                this._mostrarError('El usuario no tiene una organización asignada');
                this._redirigirAlLogin();
                return;
            }

            // Configurar eventos de clic para las tarjetas KPI (EXCEPTO CARGOS)
            this._configurarNavegacionKPI();

            // Configurar eventos para las tarjetas de registro
            this._configurarNavegacionRegistro();

            // NOTA: Los estilos ya están en CSS, no necesitamos agregarlos desde JS

            // Cargar todas las estadísticas en paralelo
            await Promise.all([
                this._cargarIncidencias(),
                this._cargarRegiones(),
                this._cargarSucursales(),
                this._cargarAreasYCargos(),
                this._cargarUsuarios()
            ]);

            // Actualizar la interfaz
            this._actualizarUI();

        } catch (error) {
            this._mostrarError('Error al cargar los datos: ' + error.message);
        }
    }

    // ========== CONFIGURAR NAVEGACIÓN KPI (EXCEPTO CARGOS) ==========
    _configurarNavegacionKPI() {
        // Asignar evento de clic a cada tarjeta KPI (SOLO las que tienen URL)
        Object.keys(this.tarjetas).forEach(key => {
            const tarjeta = this.tarjetas[key];

            // Solo configurar si existe URL para esta tarjeta
            if (tarjeta && this.urls[key]) {
                tarjeta.style.cursor = 'pointer';
                tarjeta.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._navegarA(key);
                });
            } else if (tarjeta && key === 'cargos') {
                // Para cargos, asegurar que NO sea cliqueable
                tarjeta.style.cursor = 'default';
            }
        });
    }

    // ========== CONFIGURAR NAVEGACIÓN REGISTRO (2 TARJETAS) ==========
    _configurarNavegacionRegistro() {
        // Tarjeta: Nueva Incidencia
        const cardNuevaIncidencia = document.getElementById('card-nueva-incidencia');
        if (cardNuevaIncidencia) {
            cardNuevaIncidencia.style.cursor = 'pointer';
            cardNuevaIncidencia.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/usuarios/administrador/crearIncidencias/crearIncidencias.html';
            });
        }

        // Tarjeta: Nuevo Usuario
        const cardNuevoUsuario = document.getElementById('card-nuevo-usuario');
        if (cardNuevoUsuario) {
            cardNuevoUsuario.style.cursor = 'pointer';
            cardNuevoUsuario.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/usuarios/administrador/crearUsuarios/crearUsuarios.html';
            });
        }
    }

    // ========== MÉTODO DE NAVEGACIÓN ==========
    _navegarA(destino) {
        // Verificar si existe la URL
        if (this.urls[destino]) {
            window.location.href = this.urls[destino];
        } else {
            this._mostrarNotificacion('No se encontró la página de destino', 'error');
        }
    }

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

    /**
     * Muestra indicadores de carga en todas las tarjetas
     */
    _mostrarCargando() {
        Object.values(this.elementos).forEach(el => {
            if (el) el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        });
    }

    /**
     * Espera a que el usuario esté autenticado
     */
    async _esperarAutenticacion(timeout = 10000) {
        const startTime = Date.now();

        while (!this.userManager.currentUser) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Tiempo de espera agotado esperando autenticación');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Carga el total de incidencias
     */
    async _cargarIncidencias() {
        try {
            const incidencias = await this.incidenciaManager.getIncidenciasByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.incidencias = incidencias.length;

        } catch (error) {
            this.estadisticas.incidencias = 0;
        }
    }

    /**
     * Carga el total de regiones
     */
    async _cargarRegiones() {
        try {
            const regiones = await this.regionManager.getRegionesByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.regiones = regiones.length;

        } catch (error) {
            this.estadisticas.regiones = 0;
        }
    }

    /**
     * Carga el total de sucursales
     */
    async _cargarSucursales() {
        try {
            const sucursales = await this.sucursalManager.getSucursalesByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.sucursales = sucursales.length;

        } catch (error) {
            this.estadisticas.sucursales = 0;
        }
    }

    /**
     * Carga el total de áreas y la suma de todos los cargos
     * CORREGIDO: getCantidadCargos() → getCantidadCargosTotal()
     */
    async _cargarAreasYCargos() {
        try {
            const areas = await this.areaManager.getAreasByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.areas = areas.length;

            // Calcular total de cargos sumando los cargos de cada área
            let totalCargos = 0;
            areas.forEach(area => {
                totalCargos += area.getCantidadCargosTotal(); // ← CORREGIDO AQUÍ
            });

            this.estadisticas.cargos = totalCargos;

        } catch (error) {
            this.estadisticas.areas = 0;
            this.estadisticas.cargos = 0;
        }
    }

    /**
     * Carga el total de usuarios (EXCLUYENDO al usuario actual)
     */
    async _cargarUsuarios() {
        try {
            let totalUsuarios = 0;

            // ===== CONTAR ADMINISTRADORES DE LA ORGANIZACIÓN ACTUAL =====
            const todosLosAdministradores = await this.userManager.getAdministradores(true);

            // Filtrar solo los administradores de esta organización
            const adminsDeMiOrganizacion = todosLosAdministradores.filter(
                admin => admin.organizacionCamelCase === this.organizacionActual
            );

            // Excluir al usuario actual
            const adminsExcluyendoActual = adminsDeMiOrganizacion.filter(
                admin => admin.id !== this.usuarioActualId
            ).length;

            totalUsuarios += adminsExcluyendoActual;

            // ===== CONTAR COLABORADORES DE LA ORGANIZACIÓN ACTUAL =====
            const colaboradores = await this.userManager.getColaboradoresByOrganizacion(
                this.organizacionActual,
                true // true para incluir inactivos
            );

            totalUsuarios += colaboradores.length;

            this.estadisticas.usuarios = totalUsuarios;

        } catch (error) {
            this.estadisticas.usuarios = 0;
        }
    }

    /**
     * Actualiza los números en las tarjetas KPI
     */
    _actualizarUI() {
        // Actualizar cada elemento si existe
        if (this.elementos.incidencias) {
            this.elementos.incidencias.textContent = this.estadisticas.incidencias;
        }

        if (this.elementos.regiones) {
            this.elementos.regiones.textContent = this.estadisticas.regiones;
        }

        if (this.elementos.sucursales) {
            this.elementos.sucursales.textContent = this.estadisticas.sucursales;
        }

        if (this.elementos.areas) {
            this.elementos.areas.textContent = this.estadisticas.areas;
        }

        if (this.elementos.cargos) {
            this.elementos.cargos.textContent = this.estadisticas.cargos;
        }

        if (this.elementos.usuarios) {
            this.elementos.usuarios.textContent = this.estadisticas.usuarios;
        }
    }

    // ========== UTILIDADES ==========
    _mostrarError(mensaje) {
        this._mostrarNotificacion(mensaje, 'error');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        // Restaurar valores por defecto en caso de error
        if (tipo === 'error') {
            if (this.elementos.incidencias) this.elementos.incidencias.textContent = '0';
            if (this.elementos.regiones) this.elementos.regiones.textContent = '0';
            if (this.elementos.sucursales) this.elementos.sucursales.textContent = '0';
            if (this.elementos.areas) this.elementos.areas.textContent = '0';
            if (this.elementos.cargos) this.elementos.cargos.textContent = '0';
            if (this.elementos.usuarios) this.elementos.usuarios.textContent = '0';
        }

        if (window.Swal) {
            Swal.fire({
                title: tipo === 'success' ? 'Éxito' :
                    tipo === 'error' ? 'Error' :
                        tipo === 'warning' ? 'Advertencia' : 'Información',
                text: mensaje,
                icon: tipo,
                timer: duracion,
                timerProgressBar: true,
                showConfirmButton: false,
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    }

    /**
     * Refresca todas las estadísticas
     */
    async refrescarEstadisticas() {
        await this.cargarTodasLasEstadisticas();
    }
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

// Crear instancia del manager
const panelManager = new PanelControlManager();

// Hacer accesible globalmente para debugging
window.panelManager = panelManager;

// Función para inicializar el panel cuando el DOM esté listo
async function inicializarPanel() {
    // Verificar que SweetAlert2 esté cargado
    if (typeof Swal === 'undefined') {
        return;
    }

    // Esperar un momento para que otros scripts carguen
    await new Promise(resolve => setTimeout(resolve, 500));

    // Cargar estadísticas
    await panelManager.cargarTodasLasEstadisticas();

    // Configurar refresco automático cada 5 minutos
    setInterval(() => {
        panelManager.refrescarEstadisticas();
    }, 5 * 60 * 1000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanel);

// Exportar para uso en otros archivos
export { PanelControlManager, panelManager };