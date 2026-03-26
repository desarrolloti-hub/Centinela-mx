// protector-admin.js - Protector para Administradores
// SOLO valida acceso según el PLAN del administrador (módulos activos)
// Asume que el usuario ya está autenticado y validado

import { UserManager } from '/clases/user.js';
import { PlanPersonalizadoManager } from '/clases/plan.js';

// Configuración de rutas para administradores
const RUTAS_ADMIN = {
    // ========== PANEL PRINCIPAL ==========
    '/usuarios/administrador/panelControl/panelControl.html': {
        modulo: 'dashboard',
        nombre: 'Panel Principal'
    },
    
    // ========== ÁREAS ==========
    '/usuarios/administrador/areas/areas.html': {
        modulo: 'areas',
        nombre: 'Gestión de Áreas'
    },
    '/usuarios/administrador/crearAreas/crearAreas.html': {
        modulo: 'areas',
        nombre: 'Crear Área'
    },
    '/usuarios/administrador/editarAreas/editarAreas.html': {
        modulo: 'areas',
        nombre: 'Editar Área'
    },
    
    // ========== CATEGORÍAS ==========
    '/usuarios/administrador/categorias/categorias.html': {
        modulo: 'categorias',
        nombre: 'Gestión de Categorías'
    },
    '/usuarios/administrador/crearCategorias/crearCategorias.html': {
        modulo: 'categorias',
        nombre: 'Crear Categoría'
    },
    '/usuarios/administrador/editarCategorias/editarCategorias.html': {
        modulo: 'categorias',
        nombre: 'Editar Categoría'
    },
    
    // ========== SUCURSALES ==========
    '/usuarios/administrador/sucursales/sucursales.html': {
        modulo: 'sucursales',
        nombre: 'Gestión de Sucursales'
    },
    '/usuarios/administrador/crearSucursales/crearSucursales.html': {
        modulo: 'sucursales',
        nombre: 'Crear Sucursal'
    },
    '/usuarios/administrador/editarSucursales/editarSucursales.html': {
        modulo: 'sucursales',
        nombre: 'Editar Sucursal'
    },
    
    // ========== REGIONES ==========
    '/usuarios/administrador/regiones/regiones.html': {
        modulo: 'regiones',
        nombre: 'Gestión de Regiones'
    },
    '/usuarios/administrador/crearRegiones/crearRegiones.html': {
        modulo: 'regiones',
        nombre: 'Crear Región'
    },
    '/usuarios/administrador/editarRegiones/editarRegiones.html': {
        modulo: 'regiones',
        nombre: 'Editar Región'
    },
    
    // ========== INCIDENCIAS ==========
    '/usuarios/administrador/incidencias/incidencias.html': {
        modulo: 'incidencias',
        nombre: 'Lista de Incidencias'
    },
    '/usuarios/administrador/crearIncidencias/crearIncidencias.html': {
        modulo: 'incidencias',
        nombre: 'Crear Incidencia'
    },
    '/usuarios/administrador/incidenciasCanalizadas/incidenciasCanalizadas.html': {
        modulo: 'incidencias',
        nombre: 'Incidencias Canalizadas'
    },
    '/usuarios/administrador/verIncidencias/verIncidencias.html': {
        modulo: 'incidencias',
        nombre: 'Detalle de Incidencia'
    },
    
    // ========== ALERTAS ==========
    '/usuarios/administrador/mapaAlertas/mapaAlertas.html': {
        modulo: 'alertas',
        nombre: 'Mapa de Alertas'
    },
    
    // ========== USUARIOS ==========
    '/usuarios/administrador/usuarios/usuarios.html': {
        modulo: 'usuarios',
        nombre: 'Gestión de Usuarios'
    },
    '/usuarios/administrador/crearUsuarios/crearUsuarios.html': {
        modulo: 'usuarios',
        nombre: 'Crear Usuario'
    },
    '/usuarios/administrador/editarUsuarios/editarUsuarios.html': {
        modulo: 'usuarios',
        nombre: 'Editar Usuario'
    },
    '/usuarios/administrador/permisos/permisos.html': {
        modulo: 'usuarios',
        nombre: 'Ver/Asignar Permisos'
    },
    '/usuarios/administrador/editarPermisos/editarPermisos.html': {
        modulo: 'usuarios',
        nombre: 'Editar Permisos'
    },
    
    // ========== ESTADÍSTICAS ==========
    '/usuarios/administrador/estadisticas/estadisticas.html': {
        modulo: 'estadisticas',
        nombre: 'Estadísticas'
    },
    
    // ========== TAREAS ==========
    '/usuarios/administrador/tareas/tareas.html': {
        modulo: 'tareas',
        nombre: 'Lista de Tareas'
    }
};

class ProtectorAdmin {
    constructor() {
        this.gestorUsuarios = null;
        this.gestorPlanes = null;
        this.inicializado = false;
    }
    
    async inicializar() {
        if (this.inicializado) return this;
        
        try {
            this.gestorUsuarios = new UserManager();
            this.gestorPlanes = new PlanPersonalizadoManager();
            
            // Esperar a que se cargue el usuario actual (sin validar si existe)
            if (!this.gestorUsuarios.usuarioActual) {
                await new Promise((resolver) => {
                    const verificar = setInterval(() => {
                        if (this.gestorUsuarios.usuarioActual) {
                            clearInterval(verificar);
                            resolver();
                        }
                    }, 100);
                    setTimeout(() => {
                        clearInterval(verificar);
                        resolver();
                    }, 5000);
                });
            }
            
            this.inicializado = true;
            console.log('✅ Protector de administradores inicializado');
            return this;
            
        } catch (error) {
            console.error('❌ Error inicializando protector de administradores:', error);
            throw error;
        }
    }
    
    obtenerConfiguracionRuta(ruta) {
        if (RUTAS_ADMIN[ruta]) {
            return RUTAS_ADMIN[ruta];
        }
        
        for (const [rutaConfig, config] of Object.entries(RUTAS_ADMIN)) {
            if (ruta.includes(rutaConfig) && rutaConfig !== '/') {
                return config;
            }
        }
        
        return null;
    }
    
    async verificarPermiso() {
        await this.inicializar();
        
        const rutaActual = window.location.pathname;
        const configRuta = this.obtenerConfiguracionRuta(rutaActual);
        
        // Si la ruta no está en la lista, permitir acceso (no requiere validación)
        if (!configRuta) {
            return { permitido: true, mensaje: '', redirigirA: null };
        }
        
        const usuario = this.gestorUsuarios.usuarioActual;
        
        // Si no hay usuario o no es administrador, denegar acceso
        if (!usuario || !usuario.esAdministrador()) {
            return {
                permitido: false,
                mensaje: 'No tienes permisos de administrador para acceder a esta página.',
                redirigirA: '/usuarios/administrador/panelControl/panelControl.html'
            };
        }
        
        // Verificar según el PLAN del administrador
        return await this.verificarPorPlan(usuario, configRuta);
    }
    
    async verificarPorPlan(usuario, configRuta) {
        try {
            let infoPlan = this.obtenerPlanLocal();
            
            if (!infoPlan || !infoPlan.mapasActivos) {
                const plan = await this.gestorPlanes.obtenerPorId(usuario.plan || 'gratis');
                if (plan) {
                    infoPlan = plan.paraInterfaz();
                    localStorage.setItem('plan-usuario', JSON.stringify(infoPlan));
                }
            }
            
            const tieneModulo = infoPlan?.mapasActivos?.[configRuta.modulo] === true;
            
            if (!tieneModulo) {
                const nombrePlan = infoPlan?.nombre || usuario.plan || 'tu plan actual';
                return {
                    permitido: false,
                    mensaje: `No tienes acceso a "${configRuta.nombre}". Tu plan "${nombrePlan}" no incluye este módulo. Contacta a RSI para actualizar tu plan.`,
                    redirigirA: '/usuarios/administrador/panelControl/panelControl.html'
                };
            }
            
            return { permitido: true, mensaje: '', redirigirA: null };
            
        } catch (error) {
            console.error('Error verificando plan:', error);
            return {
                permitido: false,
                mensaje: 'Error al verificar tu plan. Contacta a soporte.',
                redirigirA: '/usuarios/administrador/panelControl/panelControl.html'
            };
        }
    }
    
    obtenerPlanLocal() {
        try {
            const planStr = localStorage.getItem('plan-usuario');
            if (planStr) {
                return JSON.parse(planStr);
            }
            return null;
        } catch {
            return null;
        }
    }
    
    async obtenerMenusAccesibles() {
        await this.inicializar();
        
        const usuario = this.gestorUsuarios.usuarioActual;
        if (!usuario || !usuario.esAdministrador()) return [];
        
        const todosLosMenus = [
            { id: 'dashboard', nombre: 'Panel Principal', icono: 'fa-chart-line', url: '/usuarios/administrador/panelControl/panelControl.html' },
            { id: 'incidencias', nombre: 'Incidencias', icono: 'fa-exclamation-triangle', url: '/usuarios/administrador/incidencias/incidencias.html' },
            { id: 'alertas', nombre: 'Alertas', icono: 'fa-bell', url: '/usuarios/administrador/mapaAlertas/mapaAlertas.html' },
            { id: 'tareas', nombre: 'Tareas', icono: 'fa-tasks', url: '/usuarios/administrador/tareas/tareas.html' },
            { id: 'estadisticas', nombre: 'Estadísticas', icono: 'fa-chart-bar', url: '/usuarios/administrador/estadisticas/estadisticas.html' },
            { id: 'areas', nombre: 'Áreas', icono: 'fa-building', url: '/usuarios/administrador/areas/areas.html' },
            { id: 'categorias', nombre: 'Categorías', icono: 'fa-tags', url: '/usuarios/administrador/categorias/categorias.html' },
            { id: 'sucursales', nombre: 'Sucursales', icono: 'fa-store', url: '/usuarios/administrador/sucursales/sucursales.html' },
            { id: 'regiones', nombre: 'Regiones', icono: 'fa-map', url: '/usuarios/administrador/regiones/regiones.html' },
            { id: 'usuarios', nombre: 'Usuarios', icono: 'fa-users', url: '/usuarios/administrador/usuarios/usuarios.html' }
        ];
        
        const infoPlan = await this.obtenerInfoPlan(usuario);
        const menusAccesibles = [];
        
        for (const menu of todosLosMenus) {
            if (infoPlan.mapasActivos?.[menu.id] === true) {
                menusAccesibles.push(menu);
            }
        }
        
        return menusAccesibles;
    }
    
    async obtenerInfoPlan(usuario) {
        const planLocal = this.obtenerPlanLocal();
        if (planLocal && planLocal.mapasActivos) return planLocal;
        
        try {
            const plan = await this.gestorPlanes.obtenerPorId(usuario.plan || 'gratis');
            if (plan) {
                const infoPlan = plan.paraInterfaz();
                localStorage.setItem('plan-usuario', JSON.stringify(infoPlan));
                return infoPlan;
            }
        } catch (error) {}
        
        return { id: usuario.plan || 'gratis', nombre: usuario.plan || 'gratis', mapasActivos: {} };
    }
    
    mostrarErrorAcceso(mensaje) {
        // Verificar si ya existe un mensaje de error para no duplicar
        if (document.querySelector('.protector-admin-error')) {
            return;
        }
        
        const divError = document.createElement('div');
        divError.className = 'protector-admin-error';
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
            font-family: system-ui, sans-serif;
        `;
        
        divError.innerHTML = `
            <div style="background: white; border-radius: 24px; padding: 40px; max-width: 450px; text-align: center;">
                <div style="font-size: 56px; margin-bottom: 20px;">👑</div>
                <h2 style="margin: 0 0 12px 0; color: #f59e0b;">Acceso Restringido por Plan</h2>
                <p style="color: #4b5563; margin-bottom: 28px; line-height: 1.5;">${mensaje}</p>
                <button id="btn-dashboard" style="background: #2563eb; color: white; border: none; padding: 12px 28px; border-radius: 10px; cursor: pointer; font-weight: 500;">
                    Ir al Panel Principal
                </button>
            </div>
        `;
        
        document.body.appendChild(divError);
        
        const btnDashboard = document.getElementById('btn-dashboard');
        if (btnDashboard) {
            btnDashboard.addEventListener('click', () => {
                window.location.href = '/usuarios/administrador/panelControl/panelControl.html';
            });
        }
    }
    
    async protegerRuta() {
        const resultado = await this.verificarPermiso();
        
        if (resultado.permitido) {
            // Disparar evento para que la página sepa que tiene acceso
            window.dispatchEvent(new CustomEvent('admin-acceso-concedido', {
                detail: {
                    usuario: this.gestorUsuarios.usuarioActual,
                    menus: await this.obtenerMenusAccesibles()
                }
            }));
            return true;
        } else {
            this.mostrarErrorAcceso(resultado.mensaje);
            return false;
        }
    }
    
    /**
     * Método para verificar si el administrador tiene acceso a un módulo específico
     * Útil para usar en la página después de que el protector ya validó
     */
    async tieneAccesoModulo(moduloId) {
        await this.inicializar();
        
        const usuario = this.gestorUsuarios.usuarioActual;
        if (!usuario || !usuario.esAdministrador()) return false;
        
        const infoPlan = await this.obtenerInfoPlan(usuario);
        return infoPlan.mapasActivos?.[moduloId] === true;
    }
}

const protectorAdmin = new ProtectorAdmin();

// Auto-ejecutar - solo valida permisos, no valida sesión
(async () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => protectorAdmin.protegerRuta());
    } else {
        await protectorAdmin.protegerRuta();
    }
})();

export { ProtectorAdmin, protectorAdmin };