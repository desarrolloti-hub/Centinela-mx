// protector-colaborador.js
// Módulo de protección para colaboradores - Centinela
// Valida permisos según área y cargo asignado
// Uso: <script src="/components/protector-colaborador.js" data-modulo="areas"></script>
// El atributo data-modulo especifica qué módulo requiere la página

(async function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN DE MÓDULOS
    // =============================================
    const MODULOS = {
        // Módulos de gestión
        areas: { nombreAmigable: 'Áreas', requierePermiso: true },
        categorias: { nombreAmigable: 'Categorías', requierePermiso: true },
        sucursales: { nombreAmigable: 'Sucursales', requierePermiso: true },
        regiones: { nombreAmigable: 'Regiones', requierePermiso: true },
        incidencias: { nombreAmigable: 'Incidencias', requierePermiso: true },
        monitoreo: { nombreAmigable: 'Mapa de Alertas', requierePermiso: true },
        usuarios: { nombreAmigable: 'Usuarios', requierePermiso: true },
        estadisticas: { nombreAmigable: 'Estadísticas', requierePermiso: true },
        tareas: { nombreAmigable: 'Tareas', requierePermiso: true },
        permisos: { nombreAmigable: 'Roles y Permisos', requierePermiso: true },
        
        // Módulos siempre permitidos (no requieren validación)
        dashboard: { nombreAmigable: 'Dashboard', requierePermiso: false },
        perfil: { nombreAmigable: 'Perfil', requierePermiso: false },
        configuracion: { nombreAmigable: 'Configuración', requierePermiso: false },
        ayuda: { nombreAmigable: 'Ayuda', requierePermiso: false },
        bitacora: { nombreAmigable: 'Bitácora', requierePermiso: false },
        panelControl: { nombreAmigable: 'Panel de Control', requierePermiso: false }
    };

    // =============================================
    // CLASE PROTECTOR COLABORADOR
    // =============================================
    class ProtectorColaborador {
        constructor() {
            this.usuarioActual = null;
            this.userRole = null;
            this.permisos = null;
            this.moduloRequerido = null;
            this.nombreModulo = null;
            this.requierePermiso = true;
            this.redirigiendo = false;
            this.permisoManager = null;
        }

        async iniciar() {
            try {
                // 1. Obtener el módulo requerido desde el atributo data-modulo
                this._obtenerModuloRequerido();
                
                // 2. Si no se especificó módulo, no hacer nada (dejar pasar)
                if (!this.moduloRequerido) {
                    return;
                }
                
                // 3. Si el módulo no requiere permiso (dashboard, perfil, etc.), dejar pasar
                if (!this.requierePermiso) {
                    return;
                }
                
                // 4. Cargar usuario y permisos
                this._cargarUsuarioColaborador();
                
                // 5. Si no es colaborador, dejar pasar (administradores tienen acceso total)
                if (this.userRole !== 'colaborador') {
                    return;
                }
                
                // 6. Verificar que tenga área y cargo asignados
                if (!this.usuarioActual?.areaAsignadaId || !this.usuarioActual?.cargoId) {
                    this._redirigirDashboard();
                    return;
                }
                
                // 7. Verificar que esté activo
                if (this.usuarioActual?.status === false) {
                    this._redirigirDashboard();
                    return;
                }
                
                // 8. Obtener permisos reales desde Firestore
                await this._importarPermisoManager();
                await this._obtenerPermisosReales();
                
                // 9. Validar si tiene permiso para este módulo
                const tienePermiso = this._tienePermisoModulo(this.moduloRequerido);
                
                if (!tienePermiso) {
                    // Redirigir al dashboard silenciosamente
                    this._redirigirDashboard();
                }
                
            } catch (error) {
                console.error('Error en protector colaborador:', error);
                // En caso de error, redirigir al dashboard por seguridad
                this._redirigirDashboard();
            }
        }

        _obtenerModuloRequerido() {
            // Buscar el script actual
            const scripts = document.querySelectorAll('script[src*="protector-colaborador.js"]');
            let scriptActual = null;
            
            for (const script of scripts) {
                if (script.src && script.src.includes('protector-colaborador.js')) {
                    scriptActual = script;
                    break;
                }
            }
            
            if (!scriptActual) return;
            
            // Obtener el atributo data-modulo
            const modulo = scriptActual.getAttribute('data-modulo');
            
            if (modulo && MODULOS[modulo]) {
                this.moduloRequerido = modulo;
                this.nombreModulo = MODULOS[modulo].nombreAmigable;
                this.requierePermiso = MODULOS[modulo].requierePermiso;
            } else if (modulo) {
                // Módulo no reconocido, pero asumimos que requiere permiso por seguridad
                this.moduloRequerido = modulo;
                this.nombreModulo = modulo;
                this.requierePermiso = true;
            }
        }

        _cargarUsuarioColaborador() {
            try {
                // Intentar obtener de localStorage (igual que el navbar)
                const userDataStr = localStorage.getItem('userData');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    this.userRole = userData.rol?.toLowerCase() || 'colaborador';
                    this.usuarioActual = {
                        id: userData.id || userData.uid,
                        uid: userData.uid || userData.id,
                        rol: this.userRole,
                        nombreCompleto: userData.nombreCompleto || userData.nombre,
                        organizacionCamelCase: userData.organizacionCamelCase,
                        areaAsignadaId: userData.areaAsignadaId || userData.areaId,
                        cargoId: userData.cargoId,
                        status: userData.status !== false
                    };
                    return;
                }
                
                // Si no hay userData, verificar si es admin
                const adminInfoStr = localStorage.getItem('adminInfo');
                if (adminInfoStr) {
                    const adminData = JSON.parse(adminInfoStr);
                    this.userRole = adminData.rol?.toLowerCase() || 'administrador';
                    return;
                }
                
                this.usuarioActual = null;
                this.userRole = null;
                
            } catch (error) {
                console.error('Error cargando usuario:', error);
                this.usuarioActual = null;
                this.userRole = null;
            }
        }

        async _importarPermisoManager() {
            try {
                const { PermisoManager } = await import('/clases/permiso.js');
                this.permisoManager = new PermisoManager();
                
                if (this.usuarioActual?.organizacionCamelCase) {
                    this.permisoManager.organizacionCamelCase = this.usuarioActual.organizacionCamelCase;
                }
            } catch (error) {
                console.warn('Error importando PermisoManager:', error);
            }
        }

        async _obtenerPermisosReales() {
            try {
                // Si no tiene área o cargo, no tiene permisos
                if (!this.usuarioActual?.areaAsignadaId || !this.usuarioActual?.cargoId) {
                    this.permisos = this._permisosVacios();
                    return;
                }
                
                // Buscar permiso en Firebase
                if (this.permisoManager) {
                    try {
                        const permiso = await this.permisoManager.obtenerPorCargoYArea(
                            this.usuarioActual.cargoId,
                            this.usuarioActual.areaAsignadaId,
                            this.usuarioActual.organizacionCamelCase
                        );
                        
                        if (permiso) {
                            this.permisos = {
                                areas: permiso.puedeAcceder('areas') || false,
                                categorias: permiso.puedeAcceder('categorias') || false,
                                sucursales: permiso.puedeAcceder('sucursales') || false,
                                regiones: permiso.puedeAcceder('regiones') || false,
                                incidencias: permiso.puedeAcceder('incidencias') || false,
                                monitoreo: permiso.puedeAcceder('monitoreo') || false,
                                usuarios: permiso.puedeAcceder('usuarios') || false,
                                estadisticas: permiso.puedeAcceder('estadisticas') || false,
                                tareas: permiso.puedeAcceder('tareas') || false,
                                permisos: permiso.puedeAcceder('permisos') || false
                            };
                            return;
                        }
                    } catch (error) {
                        console.warn('Error consultando permisos:', error);
                    }
                }
                
                // Si no se encontró permiso, todos los módulos desactivados
                this.permisos = this._permisosVacios();
                
            } catch (error) {
                console.error('Error obteniendo permisos:', error);
                this.permisos = this._permisosVacios();
            }
        }
        
        _permisosVacios() {
            return {
                areas: false,
                categorias: false,
                sucursales: false,
                regiones: false,
                incidencias: false,
                monitoreo: false,
                usuarios: false,
                estadisticas: false,
                tareas: false,
                permisos: false
            };
        }
        
        _tienePermisoModulo(modulo) {
            // Si no hay permisos cargados, no tiene acceso
            if (!this.permisos) return false;
            
            // Verificar el módulo específico
            switch(modulo) {
                case 'areas': return this.permisos.areas === true;
                case 'categorias': return this.permisos.categorias === true;
                case 'sucursales': return this.permisos.sucursales === true;
                case 'regiones': return this.permisos.regiones === true;
                case 'incidencias': return this.permisos.incidencias === true;
                case 'monitoreo': return this.permisos.monitoreo === true;
                case 'usuarios': return this.permisos.usuarios === true;
                case 'estadisticas': return this.permisos.estadisticas === true;
                case 'tareas': return this.permisos.tareas === true;
                case 'permisos': return this.permisos.permisos === true;
                default: return false;
            }
        }

        _redirigirDashboard() {
            if (this.redirigiendo) return;
            this.redirigiendo = true;
            
            // Determinar dashboard según el rol
            let dashboardUrl = '/usuarios/colaboradores/panelControl/panelControl.html';
            
            if (this.userRole === 'administrador' || this.userRole === 'master') {
                dashboardUrl = '/admin/dashboard.html';
            }
            
            // Usar replace para no guardar la URL denegada en el historial
            window.location.replace(dashboardUrl);
        }
    }

    // =============================================
    // INICIALIZACIÓN AUTOMÁTICA
    // =============================================
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const protector = new ProtectorColaborador();
            protector.iniciar();
        });
    } else {
        const protector = new ProtectorColaborador();
        protector.iniciar();
    }
})();