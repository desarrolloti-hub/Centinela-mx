// protector-rutas.js - Protector de rutas unificado con auto-ejecución
// Valida:
// - Master: Acceso total
// - Administrador: Según su PLAN (módulos activos en el plan)
// - Colaborador: Según sus PERMISOS (desde la clase Permiso)

import { userManager } from '/clases/usuario.js';
import { PlanPersonalizadoManager, MODULOS_SISTEMA } from '/clases/plan.js';
import { permisoManager } from '/clases/permiso.js';

// =============================================
// CONFIGURACIÓN DE RUTAS PROTEGIDAS
// =============================================
const RUTAS_PROTEGIDAS = {
    // ========== PANEL PRINCIPAL ========== 
    '/dashboard/': {
        modulo: 'dashboard',
        nombre: 'Panel Principal',
        soloAdmin: false
    },
    '/dashboard/index.html': {
        modulo: 'dashboard',
        nombre: 'Panel Principal',
        soloAdmin: false
    },
    
    // ========== ÁREAS (Solo Administradores) ==========
    '/areas/lista.html': {
        modulo: 'areas',
        nombre: 'Gestión de Áreas',
        soloAdmin: true
    },
    '/areas/crear.html': {
        modulo: 'areas',
        nombre: 'Crear Área',
        soloAdmin: true
    },
    '/areas/editar.html': {
        modulo: 'areas',
        nombre: 'Editar Área',
        soloAdmin: true
    },
    
    // ========== CATEGORÍAS (Solo Administradores) ==========
    '/categorias/lista.html': {
        modulo: 'categorias',
        nombre: 'Gestión de Categorías',
        soloAdmin: true
    },
    '/categorias/crear.html': {
        modulo: 'categorias',
        nombre: 'Crear Categoría',
        soloAdmin: true
    },
    '/categorias/editar.html': {
        modulo: 'categorias',
        nombre: 'Editar Categoría',
        soloAdmin: true
    },
    
    // ========== SUCURSALES (Solo Administradores) ==========
    '/sucursales/lista.html': {
        modulo: 'sucursales',
        nombre: 'Gestión de Sucursales',
        soloAdmin: true
    },
    '/sucursales/crear.html': {
        modulo: 'sucursales',
        nombre: 'Crear Sucursal',
        soloAdmin: true
    },
    '/sucursales/editar.html': {
        modulo: 'sucursales',
        nombre: 'Editar Sucursal',
        soloAdmin: true
    },
    
    // ========== REGIONES (Solo Administradores) ==========
    '/regiones/lista.html': {
        modulo: 'regiones',
        nombre: 'Gestión de Regiones',
        soloAdmin: true
    },
    '/regiones/crear.html': {
        modulo: 'regiones',
        nombre: 'Crear Región',
        soloAdmin: true
    },
    '/regiones/editar.html': {
        modulo: 'regiones',
        nombre: 'Editar Región',
        soloAdmin: true
    },
    
    // ========== INCIDENCIAS ==========
    '/incidencias/lista.html': {
        modulo: 'incidencias',
        nombre: 'Lista de Incidencias',
        soloAdmin: false
    },
    '/incidencias/crear.html': {
        modulo: 'incidencias',
        nombre: 'Crear Incidencia',
        soloAdmin: false
    },
    '/incidencias/editar.html': {
        modulo: 'incidencias',
        nombre: 'Editar Incidencia',
        soloAdmin: false
    },
    '/incidencias/canalizadas.html': {
        modulo: 'incidencias',
        nombre: 'Incidencias Canalizadas',
        soloAdmin: false
    },
    '/incidencias/detalle.html': {
        modulo: 'incidencias',
        nombre: 'Detalle de Incidencia',
        soloAdmin: false
    },
    
    // ========== ALERTAS ==========
    '/alertas/mapa.html': {
        modulo: 'alertas',
        nombre: 'Mapa de Alertas',
        soloAdmin: false
    },
    '/alertas/detalle.html': {
        modulo: 'alertas',
        nombre: 'Detalle de Alerta',
        soloAdmin: false
    },
    
    // ========== USUARIOS (Solo Administradores) ==========
    '/usuarios/lista.html': {
        modulo: 'usuarios',
        nombre: 'Gestión de Usuarios',
        soloAdmin: true
    },
    '/usuarios/crear.html': {
        modulo: 'usuarios',
        nombre: 'Crear Usuario',
        soloAdmin: true
    },
    '/usuarios/editar.html': {
        modulo: 'usuarios',
        nombre: 'Editar Usuario',
        soloAdmin: true
    },
    '/usuarios/permisos.html': {
        modulo: 'usuarios',
        nombre: 'Configurar Permisos',
        soloAdmin: true
    },
    
    // ========== ESTADÍSTICAS ==========
    '/estadisticas/': {
        modulo: 'estadisticas',
        nombre: 'Estadísticas',
        soloAdmin: false
    },
    '/estadisticas/index.html': {
        modulo: 'estadisticas',
        nombre: 'Estadísticas',
        soloAdmin: false
    },
    '/estadisticas/reportes.html': {
        modulo: 'estadisticas',
        nombre: 'Reportes Estadísticos',
        soloAdmin: false
    },
    
    // ========== TAREAS ==========
    '/tareas/lista.html': {
        modulo: 'tareas',
        nombre: 'Lista de Tareas',
        soloAdmin: false
    },
    '/tareas/crear.html': {
        modulo: 'tareas',
        nombre: 'Crear Tarea',
        soloAdmin: false
    },
    '/tareas/editar.html': {
        modulo: 'tareas',
        nombre: 'Editar Tarea',
        soloAdmin: false
    },
    
    // ========== PLANES (Solo Master) ==========
    '/planes/lista.html': {
        modulo: 'planes',
        nombre: 'Gestión de Planes',
        soloAdmin: true,
        rolesRequeridos: ['master']
    },
    '/planes/crear.html': {
        modulo: 'planes',
        nombre: 'Crear Plan',
        soloAdmin: true,
        rolesRequeridos: ['master']
    },
    '/planes/editar.html': {
        modulo: 'planes',
        nombre: 'Editar Plan',
        soloAdmin: true,
        rolesRequeridos: ['master']
    }
};

class ProtectorRutas {
    constructor() {
        this.userManager = null;
        this.gestorPlanes = null;
        this.permisoManager = null;
        this.inicializado = false;
        this.permisosColaborador = null;
    }
    
    async inicializar() {
        if (this.inicializado) return this;
        
        try {
            this.userManager = new userManager();
            this.gestorPlanes = new PlanPersonalizadoManager();
            this.permisoManager = new permisoManager();
            
            // Esperar a que se cargue el usuario actual
            if (!this.userManager.usuarioActual) {
                await new Promise((resolver) => {
                    const verificarUsuario = setInterval(() => {
                        if (this.userManager.usuarioActual) {
                            clearInterval(verificarUsuario);
                            resolver();
                        }
                    }, 100);
                    
                    setTimeout(() => {
                        clearInterval(verificarUsuario);
                        resolver();
                    }, 5000);
                });
            }
            
            // Si es colaborador, cargar sus permisos desde Firestore
            if (this.userManager.usuarioActual && this.userManager.usuarioActual.esColaborador()) {
                await this.cargarPermisosColaborador();
            }
            
            this.inicializado = true;
            console.log('✅ Protector de rutas inicializado');
            return this;
            
        } catch (error) {
            console.error('❌ Error inicializando protector de rutas:', error);
            throw error;
        }
    }
    
    /**
     * Carga los permisos del colaborador desde Firestore
     */
    async cargarPermisosColaborador() {
        try {
            const usuario = this.userManager.usuarioActual;
            if (!usuario || !usuario.esColaborador()) return;
            
            // Obtener permisos según su área y cargo asignado
            if (usuario.areaAsignadaId && usuario.cargoId) {
                const permiso = await this.permisoManager.obtenerPorCargoYArea(
                    usuario.cargoId,
                    usuario.areaAsignadaId,
                    usuario.organizacionCamelCase
                );
                
                if (permiso) {
                    this.permisosColaborador = permiso;
                    // Guardar en almacenamiento local para acceso rápido
                    localStorage.setItem('permisos-usuario', JSON.stringify(permiso.permisos));
                    localStorage.setItem('id-permisos-usuario', permiso.id);
                    console.log('✅ Permisos de colaborador cargados:', permiso.obtenerModulosActivos());
                } else {
                    console.warn('⚠️ No se encontraron permisos para este colaborador');
                    this.permisosColaborador = null;
                }
            }
        } catch (error) {
            console.error('Error cargando permisos de colaborador:', error);
            this.permisosColaborador = null;
        }
    }
    
    /**
     * Obtiene la configuración de protección para una ruta específica
     */
    obtenerConfiguracionRuta(ruta) {
        // Buscar coincidencia exacta
        if (RUTAS_PROTEGIDAS[ruta]) {
            return RUTAS_PROTEGIDAS[ruta];
        }
        
        // Buscar coincidencia parcial (para rutas con parámetros)
        for (const [rutaConfig, config] of Object.entries(RUTAS_PROTEGIDAS)) {
            if (ruta.includes(rutaConfig) && rutaConfig !== '/') {
                return config;
            }
        }
        
        return null;
    }
    
    /**
     * Verifica si el usuario tiene acceso a la ruta actual
     */
    async verificarAcceso() {
        await this.inicializar();
        
        const rutaActual = window.location.pathname;
        const configRuta = this.obtenerConfiguracionRuta(rutaActual);
        
        // Si la ruta no está en la lista de protegidas, permitir acceso
        if (!configRuta) {
            return { permitido: true, mensaje: '', redirigirA: null, tipo: null };
        }
        
        // Si no hay usuario autenticado
        if (!this.userManager.usuarioActual) {
            return {
                permitido: false,
                mensaje: 'No has iniciado sesión. Por favor, inicia sesión para continuar.',
                redirigirA: '/login.html',
                tipo: 'no-autenticado'
            };
        }
        
        const usuario = this.userManager.usuarioActual;
        
        // Verificar roles requeridos específicos (como master para planes)
        if (configRuta.rolesRequeridos && configRuta.rolesRequeridos.length > 0) {
            const tieneRolRequerido = configRuta.rolesRequeridos.includes(usuario.rol);
            if (!tieneRolRequerido) {
                return {
                    permitido: false,
                    mensaje: `Acceso restringido. Esta página requiere rol: ${configRuta.rolesRequeridos.join(' o ')}. Tu rol actual es: ${usuario.rol}.`,
                    redirigirA: '/dashboard/',
                    tipo: 'rol-no-autorizado'
                };
            }
        }
        
        // ========== MASTER - Acceso total ==========
        if (usuario.esMaster()) {
            return { permitido: true, mensaje: '', redirigirA: null, tipo: null };
        }
        
        // ========== ADMINISTRADOR - Validación por PLAN ==========
        if (usuario.esAdministrador()) {
            return await this.verificarAccesoAdministrador(usuario, configRuta);
        }
        
        // ========== COLABORADOR - Validación por PERMISOS ==========
        if (usuario.esColaborador()) {
            return await this.verificarAccesoColaborador(usuario, configRuta);
        }
        
        return {
            permitido: false,
            mensaje: 'Tipo de usuario no reconocido. Contacta al administrador.',
            redirigirA: '/login.html',
            tipo: 'rol-desconocido'
        };
    }
    
    /**
     * Verifica acceso para ADMINISTRADOR basado en su PLAN
     */
    async verificarAccesoAdministrador(usuario, configRuta) {
        try {
            // Obtener plan desde almacenamiento local o Firestore
            let infoPlan = this.obtenerPlanDesdeAlmacenamientoLocal();
            
            if (!infoPlan || !infoPlan.mapasActivos) {
                const plan = await this.gestorPlanes.obtenerPorId(usuario.plan || 'gratis');
                if (plan) {
                    infoPlan = plan.paraInterfaz();
                    localStorage.setItem('plan-usuario', JSON.stringify(infoPlan));
                }
            }
            
            // Verificar si el módulo está activo en el plan
            const idModulo = configRuta.modulo;
            const tieneModulo = infoPlan?.mapasActivos?.[idModulo] === true;
            
            if (!tieneModulo) {
                const nombrePlan = infoPlan?.nombre || usuario.plan || 'tu plan actual';
                return {
                    permitido: false,
                    mensaje: `No tienes acceso al módulo "${idModulo}". Tu plan "${nombrePlan}" no incluye esta funcionalidad. Por favor, contacta a RSI para actualizar tu plan.`,
                    redirigirA: '/dashboard/',
                    tipo: 'plan-sin-modulo'
                };
            }
            
            return { permitido: true, mensaje: '', redirigirA: null, tipo: null };
            
        } catch (error) {
            console.error('Error verificando acceso por plan:', error);
            return {
                permitido: false,
                mensaje: 'Error al verificar tu plan. Por favor, contacta a soporte.',
                redirigirA: '/dashboard/',
                tipo: 'error-plan'
            };
        }
    }
    
    /**
     * Verifica acceso para COLABORADOR basado en sus PERMISOS
     */
    async verificarAccesoColaborador(usuario, configRuta) {
        try {
            // Si la ruta es solo para administradores, denegar acceso
            if (configRuta.soloAdmin) {
                return {
                    permitido: false,
                    mensaje: `"${configRuta.nombre}" es una sección exclusiva para administradores. Contacta con tu administrador si necesitas acceso.`,
                    redirigirA: '/dashboard/',
                    tipo: 'admin-only'
                };
            }
            
            // Obtener permisos del colaborador
            let permisos = this.permisosColaborador;
            
            // Si no están cargados, intentar cargarlos ahora
            if (!permisos) {
                await this.cargarPermisosColaborador();
                permisos = this.permisosColaborador;
            }
            
            // Si no hay permisos configurados
            if (!permisos) {
                return {
                    permitido: false,
                    mensaje: 'No tienes permisos configurados en el sistema. Contacta con tu administrador para que te asigne los permisos necesarios.',
                    redirigirA: '/dashboard/',
                    tipo: 'colaborador-sin-permisos'
                };
            }
            
            // Verificar si tiene acceso al módulo
            const idModulo = configRuta.modulo;
            const tieneModulo = permisos.puedeAcceder(idModulo);
            
            if (!tieneModulo) {
                // Obtener nombre del módulo para mensaje más claro
                const nombresModulos = {
                    areas: 'Áreas',
                    categorias: 'Categorías',
                    sucursales: 'Sucursales',
                    regiones: 'Regiones',
                    incidencias: 'Incidencias',
                    usuarios: 'Usuarios',
                    estadisticas: 'Estadísticas',
                    tareas: 'Tareas',
                    dashboard: 'Panel Principal',
                    alertas: 'Alertas'
                };
                
                const nombreModulo = nombresModulos[idModulo] || idModulo;
                
                return {
                    permitido: false,
                    mensaje: `No tienes acceso al módulo "${nombreModulo}". Contacta con tu administrador para solicitar acceso.`,
                    redirigirA: '/dashboard/',
                    tipo: 'colaborador-sin-modulo'
                };
            }
            
            return { permitido: true, mensaje: '', redirigirA: null, tipo: null };
            
        } catch (error) {
            console.error('Error verificando acceso por permisos:', error);
            return {
                permitido: false,
                mensaje: 'Error al verificar tus permisos. Por favor, contacta a soporte.',
                redirigirA: '/dashboard/',
                tipo: 'error-permisos'
            };
        }
    }
    
    /**
     * Obtiene el plan desde almacenamiento local
     */
    obtenerPlanDesdeAlmacenamientoLocal() {
        try {
            const planStr = localStorage.getItem('plan-usuario');
            if (planStr) {
                try {
                    return JSON.parse(planStr);
                } catch (e) {
                    return { id: planStr, nombre: planStr, mapasActivos: {} };
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Obtiene información detallada del plan del usuario
     */
    async obtenerInfoPlan(usuario) {
        const planLocal = this.obtenerPlanDesdeAlmacenamientoLocal();
        if (planLocal && planLocal.mapasActivos) {
            return planLocal;
        }
        
        try {
            const plan = await this.gestorPlanes.obtenerPorId(usuario.plan || 'gratis');
            if (plan) {
                const infoPlan = plan.paraInterfaz();
                localStorage.setItem('plan-usuario', JSON.stringify(infoPlan));
                return infoPlan;
            }
        } catch (error) {
            console.error('Error obteniendo plan:', error);
        }
        
        return {
            id: usuario.plan || 'gratis',
            nombre: usuario.plan || 'gratis',
            mapasActivos: {}
        };
    }
    
    /**
     * Obtiene los menús accesibles para el usuario actual
     */
    async obtenerMenusAccesibles() {
        await this.inicializar();
        
        const usuario = this.userManager.usuarioActual;
        if (!usuario) return [];
        
        // Definición de todos los menús del sistema
        const todosLosMenus = [
            { id: 'dashboard', nombre: 'Panel Principal', icono: 'fa-chart-line', url: '/dashboard/', soloAdmin: false },
            { id: 'incidencias', nombre: 'Incidencias', icono: 'fa-exclamation-triangle', url: '/incidencias/lista.html', soloAdmin: false },
            { id: 'alertas', nombre: 'Alertas', icono: 'fa-bell', url: '/alertas/mapa.html', soloAdmin: false },
            { id: 'tareas', nombre: 'Tareas', icono: 'fa-tasks', url: '/tareas/lista.html', soloAdmin: false },
            { id: 'estadisticas', nombre: 'Estadísticas', icono: 'fa-chart-bar', url: '/estadisticas/', soloAdmin: false },
            { id: 'areas', nombre: 'Áreas', icono: 'fa-building', url: '/areas/lista.html', soloAdmin: true },
            { id: 'categorias', nombre: 'Categorías', icono: 'fa-tags', url: '/categorias/lista.html', soloAdmin: true },
            { id: 'sucursales', nombre: 'Sucursales', icono: 'fa-store', url: '/sucursales/lista.html', soloAdmin: true },
            { id: 'regiones', nombre: 'Regiones', icono: 'fa-map', url: '/regiones/lista.html', soloAdmin: true },
            { id: 'usuarios', nombre: 'Usuarios', icono: 'fa-users', url: '/usuarios/lista.html', soloAdmin: true },
            { id: 'planes', nombre: 'Planes', icono: 'fa-cubes', url: '/planes/lista.html', soloAdmin: true, soloMaster: true }
        ];
        
        // MASTER - todos los menús
        if (usuario.esMaster()) {
            return todosLosMenus;
        }
        
        // ADMINISTRADOR - según plan
        if (usuario.esAdministrador()) {
            const infoPlan = await this.obtenerInfoPlan(usuario);
            const menusAccesibles = [];
            
            for (const menu of todosLosMenus) {
                // Saltar menús solo para master
                if (menu.soloMaster) continue;
                
                // Verificar si el módulo está en el plan
                if (infoPlan.mapasActivos?.[menu.id] === true) {
                    menusAccesibles.push(menu);
                }
            }
            
            return menusAccesibles;
        }
        
        // COLABORADOR - según permisos
        if (usuario.esColaborador()) {
            if (!this.permisosColaborador) {
                await this.cargarPermisosColaborador();
            }
            
            const menusAccesibles = [];
            
            for (const menu of todosLosMenus) {
                // Colaboradores NO pueden ver menús soloAdmin
                if (menu.soloAdmin) continue;
                if (menu.soloMaster) continue;
                
                // Verificar si tiene permiso para este módulo
                if (this.permisosColaborador?.puedeAcceder(menu.id)) {
                    menusAccesibles.push(menu);
                }
            }
            
            return menusAccesibles;
        }
        
        return [];
    }
    
    /**
     * Muestra mensaje de error de acceso
     */
    mostrarErrorAcceso(resultado) {
        let icono = '🔒';
        let titulo = 'Acceso Denegado';
        let colorTitulo = '#dc2626';
        
        switch (resultado.tipo) {
            case 'plan-sin-modulo':
                icono = '📦';
                titulo = 'Plan Sin Acceso';
                colorTitulo = '#f59e0b';
                break;
            case 'colaborador-sin-modulo':
                icono = '🔐';
                titulo = 'Sin Permisos';
                colorTitulo = '#ef4444';
                break;
            case 'colaborador-sin-permisos':
                icono = '⚠️';
                titulo = 'Sin Permisos Configurados';
                colorTitulo = '#ef4444';
                break;
            case 'admin-only':
                icono = '👑';
                titulo = 'Acceso Restringido a Administradores';
                colorTitulo = '#8b5cf6';
                break;
            case 'rol-no-autorizado':
                icono = '👤';
                titulo = 'Rol No Autorizado';
                colorTitulo = '#8b5cf6';
                break;
            case 'no-autenticado':
                icono = '🚪';
                titulo = 'Sesión Requerida';
                colorTitulo = '#3b82f6';
                break;
            default:
                icono = '🔒';
                titulo = 'Acceso Denegado';
                colorTitulo = '#dc2626';
        }
        
        const divError = document.createElement('div');
        divError.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        divError.innerHTML = `
            <div style="background: white; border-radius: 24px; padding: 40px; max-width: 450px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div style="font-size: 56px; margin-bottom: 20px;">${icono}</div>
                <h2 style="margin: 0 0 12px 0; color: ${colorTitulo};">${titulo}</h2>
                <p style="color: #4b5563; margin-bottom: 28px; line-height: 1.5;">${resultado.mensaje}</p>
                <button id="btn-ir-dashboard" style="background: #2563eb; color: white; border: none; padding: 12px 28px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500;">
                    Ir al Dashboard
                </button>
            </div>
        `;
        
        document.body.appendChild(divError);
        
        document.getElementById('btn-ir-dashboard')?.addEventListener('click', () => {
            window.location.href = resultado.redirigirA || '/dashboard/';
        });
    }
    
    /**
     * Protege la ruta actual automáticamente
     */
    async protegerRuta(alPermitido, alDenegado) {
        try {
            const resultado = await this.verificarAcceso();
            
            if (resultado.permitido) {
                if (alPermitido) alPermitido();
                // Disparar evento para scripts que necesiten saber que el acceso fue concedido
                window.dispatchEvent(new CustomEvent('acceso-concedido', {
                    detail: {
                        usuario: this.userManager.usuarioActual,
                        permisos: this.permisosColaborador,
                        menus: await this.obtenerMenusAccesibles()
                    }
                }));
                return true;
            } else {
                if (alDenegado) {
                    alDenegado(resultado);
                } else {
                    this.mostrarErrorAcceso(resultado);
                }
                return false;
            }
        } catch (error) {
            console.error('Error en protección de ruta:', error);
            this.mostrarErrorAcceso({
                permitido: false,
                mensaje: 'Error al verificar tus permisos. Por favor, recarga la página o contacta a soporte.',
                redirigirA: '/login.html',
                tipo: 'error-sistema'
            });
            return false;
        }
    }
    
    /**
     * Guarda los datos de acceso en almacenamiento local después del login
     */
    async guardarDatosAccesoEnAlmacenamientoLocal() {
        await this.inicializar();
        
        const usuario = this.userManager.usuarioActual;
        if (!usuario) return;
        
        localStorage.setItem('rol-usuario', usuario.rol);
        localStorage.setItem('id-usuario', usuario.id);
        
        if (usuario.esMaster()) {
            localStorage.setItem('plan-usuario', JSON.stringify({ id: 'master', nombre: 'Master' }));
        } 
        else if (usuario.esAdministrador()) {
            const infoPlan = await this.obtenerInfoPlan(usuario);
            localStorage.setItem('plan-usuario', JSON.stringify(infoPlan));
        } 
        else if (usuario.esColaborador() && this.permisosColaborador) {
            localStorage.setItem('permisos-usuario', JSON.stringify(this.permisosColaborador.permisos));
            const infoPlan = await this.obtenerInfoPlan(usuario);
            if (infoPlan) localStorage.setItem('plan-usuario', JSON.stringify(infoPlan));
        }
        
        console.log('✅ Datos de acceso guardados en almacenamiento local');
    }
}

// Crear instancia única
const protectorRutas = new ProtectorRutas();

// Auto-ejecución al cargar la página
(async () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => protectorRutas.protegerRuta());
    } else {
        await protectorRutas.protegerRuta();
    }
})();

// Exportar
export { ProtectorRutas, protectorRutas, RUTAS_PROTEGIDAS };