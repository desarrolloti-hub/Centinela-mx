// panelControl.js - Cargador de datos reales para el Panel de Control
// Versión con 6 tarjetas - SIN ANIMACIONES PARPADEANTES

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
            console.log('📊 Iniciando carga de estadísticas del panel...');

            // Mostrar indicador de carga
            this._mostrarCargando();

            // Esperar a que el usuario esté autenticado
            await this._esperarAutenticacion();

            if (!this.userManager.currentUser) {
                console.error('❌ No hay usuario autenticado');
                this._mostrarError('No se pudo autenticar al usuario');
                this._redirigirAlLogin();
                return;
            }

            const usuario = this.userManager.currentUser;
            this.organizacionActual = usuario.organizacionCamelCase;
            this.usuarioActualId = usuario.id;

            if (!this.organizacionActual) {
                console.error('❌ Usuario no tiene organización asignada');
                this._mostrarError('El usuario no tiene una organización asignada');
                this._redirigirAlLogin();
                return;
            }

            console.log(`✅ Usuario autenticado: ${usuario.nombreCompleto} (ID: ${this.usuarioActualId})`);
            console.log(`🏢 Organización: ${this.organizacionActual}`);

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

            console.log('✅ Estadísticas cargadas:', this.estadisticas);

        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            this._mostrarError('Error al cargar los datos: ' + error.message);
        }
    }

    // ========== CONFIGURAR NAVEGACIÓN KPI (EXCEPTO CARGOS) ==========
    _configurarNavegacionKPI() {
        console.log('🔗 Configurando navegación de tarjetas KPI...');
        console.log('🚫 Tarjeta de CARGOS no será cliqueable');

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
                console.log(`✅ Tarjeta ${key} configurada como cliqueable`);
            } else if (tarjeta && key === 'cargos') {
                // Para cargos, asegurar que NO sea cliqueable
                tarjeta.style.cursor = 'default';
                console.log(`🚫 Tarjeta ${key} NO es cliqueable`);
            }
        });
    }

    // ========== CONFIGURAR NAVEGACIÓN REGISTRO (2 TARJETAS) ==========
    _configurarNavegacionRegistro() {
        console.log('📝 Configurando navegación de tarjetas de registro...');

        // Tarjeta: Nueva Incidencia
        const cardNuevaIncidencia = document.getElementById('card-nueva-incidencia');
        if (cardNuevaIncidencia) {
            cardNuevaIncidencia.style.cursor = 'pointer';
            cardNuevaIncidencia.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('👉 Navegando a: /usuarios/administrador/crearIncidencias/crearIncidencias.html');
                window.location.href = '/usuarios/administrador/crearIncidencias/crearIncidencias.html';
            });
            console.log('✅ Tarjeta Nueva Incidencia configurada');
        }

        // Tarjeta: Nuevo Usuario
        const cardNuevoUsuario = document.getElementById('card-nuevo-usuario');
        if (cardNuevoUsuario) {
            cardNuevoUsuario.style.cursor = 'pointer';
            cardNuevoUsuario.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('👉 Navegando a: /usuarios/administrador/crearUsuarios/crearUsuarios.html');
                window.location.href = '/usuarios/administrador/crearUsuarios/crearUsuarios.html';
            });
            console.log('✅ Tarjeta Nuevo Usuario configurada');
        }
    }

    // ========== MÉTODO DE NAVEGACIÓN ==========
    _navegarA(destino) {
        console.log(`👉 Navegando a: ${this.urls[destino]}`);

        // Verificar si existe la URL
        if (this.urls[destino]) {
            window.location.href = this.urls[destino];
        } else {
            console.error(`❌ URL no encontrada para: ${destino}`);
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
            console.log('📋 Cargando incidencias...');

            const incidencias = await this.incidenciaManager.getIncidenciasByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.incidencias = incidencias.length;

            console.log(`✅ Incidencias cargadas: ${this.estadisticas.incidencias}`);

        } catch (error) {
            console.error('❌ Error cargando incidencias:', error);
            this.estadisticas.incidencias = 0;
        }
    }

    /**
     * Carga el total de regiones
     */
    async _cargarRegiones() {
        try {
            console.log('🗺️ Cargando regiones...');

            const regiones = await this.regionManager.getRegionesByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.regiones = regiones.length;

            console.log(`✅ Regiones cargadas: ${this.estadisticas.regiones}`);

        } catch (error) {
            console.error('❌ Error cargando regiones:', error);
            this.estadisticas.regiones = 0;
        }
    }

    /**
     * Carga el total de sucursales
     */
    async _cargarSucursales() {
        try {
            console.log('🏢 Cargando sucursales...');

            const sucursales = await this.sucursalManager.getSucursalesByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.sucursales = sucursales.length;

            console.log(`✅ Sucursales cargadas: ${this.estadisticas.sucursales}`);

        } catch (error) {
            console.error('❌ Error cargando sucursales:', error);
            this.estadisticas.sucursales = 0;
        }
    }

    /**
     * Carga el total de áreas y la suma de todos los cargos
     */
    async _cargarAreasYCargos() {
        try {
            console.log('📁 Cargando áreas y cargos...');

            const areas = await this.areaManager.getAreasByOrganizacion(
                this.organizacionActual
            );

            this.estadisticas.areas = areas.length;

            // Calcular total de cargos sumando los cargos de cada área
            let totalCargos = 0;
            areas.forEach(area => {
                totalCargos += area.getCantidadCargos();
            });

            this.estadisticas.cargos = totalCargos;

            console.log(`✅ Áreas cargadas: ${this.estadisticas.areas}`);
            console.log(`✅ Cargos totales: ${this.estadisticas.cargos}`);

        } catch (error) {
            console.error('❌ Error cargando áreas y cargos:', error);
            this.estadisticas.areas = 0;
            this.estadisticas.cargos = 0;
        }
    }

    /**
     * Carga el total de usuarios (EXCLUYENDO al usuario actual)
     */
    async _cargarUsuarios() {
        try {
            console.log('👥 Cargando usuarios (excluyendo al actual)...');

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
            console.log(`📊 Administradores de ${this.organizacionActual} (excluyendo actual): ${adminsExcluyendoActual}`);

            // ===== CONTAR COLABORADORES DE LA ORGANIZACIÓN ACTUAL =====
            const colaboradores = await this.userManager.getColaboradoresByOrganizacion(
                this.organizacionActual,
                true // true para incluir inactivos
            );

            totalUsuarios += colaboradores.length;
            console.log(`📊 Colaboradores de ${this.organizacionActual}: ${colaboradores.length}`);

            this.estadisticas.usuarios = totalUsuarios;

            console.log(`✅ Usuarios totales en ${this.organizacionActual} (excluyendo al actual): ${this.estadisticas.usuarios}`);

        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this.estadisticas.usuarios = 0;
        }
    }

    /**
     * Actualiza los números en las tarjetas KPI
     */
    _actualizarUI() {
        console.log('🔄 Actualizando interfaz con datos reales...');

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

        console.log('✅ Actualización de UI completada');
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
        } else {
            console.error('Error:', mensaje);
        }
    }

    /**
     * Refresca todas las estadísticas
     */
    async refrescarEstadisticas() {
        console.log('🔄 Refrescando estadísticas...');
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
    console.log('🚀 Inicializando Panel de Control...');

    // Verificar que SweetAlert2 esté cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }

    // Esperar un momento para que otros scripts carguen
    await new Promise(resolve => setTimeout(resolve, 500));

    // Cargar estadísticas
    await panelManager.cargarTodasLasEstadisticas();

    // Configurar refresco automático cada 5 minutos
    setInterval(() => {
        console.log('🔄 Refrescando automáticamente...');
        panelManager.refrescarEstadisticas();
    }, 5 * 60 * 1000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanel);

// Exportar para uso en otros archivos
export { PanelControlManager, panelManager };