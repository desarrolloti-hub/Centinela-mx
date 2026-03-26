// protector-colaborador.js - Protector para Colaboradores
// Valida acceso según los PERMISOS asignados por el administrador

import { GestorUsuarios } from '/clases/usuario.js';
import { GestorPermisos } from '/clases/permiso.js';

// Configuración de rutas para colaboradores
const RUTAS_COLABORADOR = {
    // ========== PANEL PRINCIPAL ==========
    '/dashboard/': {
        modulo: 'dashboard',
        nombre: 'Panel Principal'
    },
    '/dashboard/index.html': {
        modulo: 'dashboard',
        nombre: 'Panel Principal'
    },
    
    // ========== INCIDENCIAS ==========
    '/incidencias/lista.html': {
        modulo: 'incidencias',
        nombre: 'Lista de Incidencias'
    },
    '/incidencias/crear.html': {
        modulo: 'incidencias',
        nombre: 'Crear Incidencia'
    },
    '/incidencias/editar.html': {
        modulo: 'incidencias',
        nombre: 'Editar Incidencia'
    },
    '/incidencias/canalizadas.html': {
        modulo: 'incidencias',
        nombre: 'Incidencias Canalizadas'
    },
    '/incidencias/detalle.html': {
        modulo: 'incidencias',
        nombre: 'Detalle de Incidencia'
    },
    
    // ========== ALERTAS ==========
    '/alertas/mapa.html': {
        modulo: 'alertas',
        nombre: 'Mapa de Alertas'
    },
    '/alertas/detalle.html': {
        modulo: 'alertas',
        nombre: 'Detalle de Alerta'
    },
    
    // ========== ESTADÍSTICAS ==========
    '/estadisticas/': {
        modulo: 'estadisticas',
        nombre: 'Estadísticas'
    },
    '/estadisticas/index.html': {
        modulo: 'estadisticas',
        nombre: 'Estadísticas'
    },
    '/estadisticas/reportes.html': {
        modulo: 'estadisticas',
        nombre: 'Reportes Estadísticos'
    },
    
    // ========== TAREAS ==========
    '/tareas/lista.html': {
        modulo: 'tareas',
        nombre: 'Lista de Tareas'
    },
    '/tareas/crear.html': {
        modulo: 'tareas',
        nombre: 'Crear Tarea'
    },
    '/tareas/editar.html': {
        modulo: 'tareas',
        nombre: 'Editar Tarea'
    }
};

class ProtectorColaborador {
    constructor() {
        this.gestorUsuarios = null;
        this.gestorPermisos = null;
        this.inicializado = false;
        this.permisosUsuario = null;
    }
    
    async inicializar() {
        if (this.inicializado) return this;
        
        try {
            this.gestorUsuarios = new GestorUsuarios();
            this.gestorPermisos = new GestorPermisos();
            
            // Esperar a que se cargue el usuario actual
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
            
            // Cargar permisos del colaborador
            if (this.gestorUsuarios.usuarioActual && this.gestorUsuarios.usuarioActual.esColaborador()) {
                await this.cargarPermisos();
            }
            
            this.inicializado = true;
            console.log('✅ Protector de colaboradores inicializado');
            return this;
            
        } catch (error) {
            console.error('❌ Error inicializando protector de colaboradores:', error);
            throw error;
        }
    }
    
    async cargarPermisos() {
        try {
            const usuario = this.gestorUsuarios.usuarioActual;
            if (!usuario || !usuario.esColaborador()) return;
            
            if (usuario.areaAsignadaId && usuario.cargoId) {
                const permiso = await this.gestorPermisos.obtenerPorCargoYArea(
                    usuario.cargoId,
                    usuario.areaAsignadaId,
                    usuario.organizacionCamelCase
                );
                
                if (permiso) {
                    this.permisosUsuario = permiso;
                    localStorage.setItem('permisos-usuario', JSON.stringify(permiso.permisos));
                    console.log('✅ Permisos cargados:', permiso.obtenerModulosActivos());
                }
            }
        } catch (error) {
            console.error('Error cargando permisos:', error);
        }
    }
    
    obtenerConfiguracionRuta(ruta) {
        if (RUTAS_COLABORADOR[ruta]) {
            return RUTAS_COLABORADOR[ruta];
        }
        
        for (const [rutaConfig, config] of Object.entries(RUTAS_COLABORADOR)) {
            if (ruta.includes(rutaConfig) && rutaConfig !== '/') {
                return config;
            }
        }
        
        return null;
    }
    
    async verificarAcceso() {
        await this.inicializar();
        
        const rutaActual = window.location.pathname;
        const configRuta = this.obtenerConfiguracionRuta(rutaActual);
        
        if (!configRuta) {
            return { permitido: true, mensaje: '', redirigirA: null };
        }
        
        if (!this.gestorUsuarios.usuarioActual) {
            return {
                permitido: false,
                mensaje: 'No has iniciado sesión. Por favor, inicia sesión para continuar.',
                redirigirA: '/login.html'
            };
        }
        
        const usuario = this.gestorUsuarios.usuarioActual;
        
        // Solo colaboradores pueden usar este protector
        if (!usuario.esColaborador()) {
            return {
                permitido: false,
                mensaje: 'No tienes permisos de colaborador para acceder a esta página.',
                redirigirA: '/dashboard/'
            };
        }
        
        // Verificar según los PERMISOS del colaborador
        return await this.verificarPorPermisos(usuario, configRuta);
    }
    
    async verificarPorPermisos(usuario, configRuta) {
        try {
            // Asegurar que tenemos los permisos cargados
            if (!this.permisosUsuario) {
                await this.cargarPermisos();
            }
            
            if (!this.permisosUsuario) {
                return {
                    permitido: false,
                    mensaje: 'No tienes permisos configurados. Contacta a tu administrador para que te asigne acceso.',
                    redirigirA: '/dashboard/'
                };
            }
            
            const idModulo = configRuta.modulo;
            const tieneAcceso = this.permisosUsuario.puedeAcceder(idModulo);
            
            if (!tieneAcceso) {
                const nombresModulos = {
                    dashboard: 'Panel Principal',
                    incidencias: 'Incidencias',
                    alertas: 'Alertas',
                    estadisticas: 'Estadísticas',
                    tareas: 'Tareas'
                };
                
                const nombreModulo = nombresModulos[idModulo] || idModulo;
                
                return {
                    permitido: false,
                    mensaje: `No tienes acceso al módulo "${nombreModulo}". Contacta a tu administrador para solicitar acceso.`,
                    redirigirA: '/dashboard/'
                };
            }
            
            return { permitido: true, mensaje: '', redirigirA: null };
            
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return {
                permitido: false,
                mensaje: 'Error al verificar tus permisos. Contacta a soporte.',
                redirigirA: '/dashboard/'
            };
        }
    }
    
    async obtenerMenusAccesibles() {
        await this.inicializar();
        
        const usuario = this.gestorUsuarios.usuarioActual;
        if (!usuario || !usuario.esColaborador()) return [];
        
        if (!this.permisosUsuario) {
            await this.cargarPermisos();
        }
        
        if (!this.permisosUsuario) return [];
        
        const todosLosMenus = [
            { id: 'dashboard', nombre: 'Panel Principal', icono: 'fa-chart-line', url: '/dashboard/' },
            { id: 'incidencias', nombre: 'Incidencias', icono: 'fa-exclamation-triangle', url: '/incidencias/lista.html' },
            { id: 'alertas', nombre: 'Alertas', icono: 'fa-bell', url: '/alertas/mapa.html' },
            { id: 'estadisticas', nombre: 'Estadísticas', icono: 'fa-chart-bar', url: '/estadisticas/' },
            { id: 'tareas', nombre: 'Tareas', icono: 'fa-tasks', url: '/tareas/lista.html' }
        ];
        
        const menusAccesibles = [];
        
        for (const menu of todosLosMenus) {
            if (this.permisosUsuario.puedeAcceder(menu.id)) {
                menusAccesibles.push(menu);
            }
        }
        
        return menusAccesibles;
    }
    
    /**
     * Obtiene el permiso específico para una acción dentro de un módulo
     */
    tienePermiso(modulo, accion = null) {
        if (!this.permisosUsuario) return false;
        
        // Para colaboradores, el acceso al módulo ya le da todos los permisos dentro de él
        return this.permisosUsuario.puedeAcceder(modulo);
    }
    
    mostrarErrorAcceso(mensaje) {
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
            font-family: system-ui, sans-serif;
        `;
        
        divError.innerHTML = `
            <div style="background: white; border-radius: 24px; padding: 40px; max-width: 450px; text-align: center;">
                <div style="font-size: 56px; margin-bottom: 20px;">🔐</div>
                <h2 style="margin: 0 0 12px 0; color: #dc2626;">Acceso Denegado</h2>
                <p style="color: #4b5563; margin-bottom: 28px;">${mensaje}</p>
                <button id="btn-dashboard" style="background: #2563eb; color: white; border: none; padding: 12px 28px; border-radius: 10px; cursor: pointer;">
                    Ir al Dashboard
                </button>
            </div>
        `;
        
        document.body.appendChild(divError);
        document.getElementById('btn-dashboard')?.addEventListener('click', () => {
            window.location.href = '/dashboard/';
        });
    }
    
    async protegerRuta() {
        const resultado = await this.verificarAcceso();
        
        if (resultado.permitido) {
            window.dispatchEvent(new CustomEvent('colaborador-acceso-concedido', {
                detail: {
                    usuario: this.gestorUsuarios.usuarioActual,
                    permisos: this.permisosUsuario,
                    menus: await this.obtenerMenusAccesibles()
                }
            }));
            return true;
        } else {
            this.mostrarErrorAcceso(resultado.mensaje);
            return false;
        }
    }
}

const protectorColaborador = new ProtectorColaborador();

// Auto-ejecutar
(async () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => protectorColaborador.protegerRuta());
    } else {
        await protectorColaborador.protegerRuta();
    }
})();

export { ProtectorColaborador, protectorColaborador };