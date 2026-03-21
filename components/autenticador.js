// autenticador.js - Componente de autenticación universal
// Importa UserManager desde user.js

import { UserManager } from '/clases/user.js';

(function() {
    'use strict';

    // ==================== VARIABLES GLOBALES ====================
    let userManager = null;
    let currentUser = null;
    let initialized = false;
    let authListeners = [];

    // ==================== FUNCIONES INTERNAS ====================
    
    /**
     * Inicializa el sistema de autenticación
     */
    async function initialize() {
        try {
            console.log('🚀 Inicializando Autenticador...');
            
            // Obtener o crear instancia de UserManager
            if (!window.userManagerInstance) {
                window.userManagerInstance = new UserManager();
                console.log('✅ Nueva instancia de UserManager creada');
            }
            userManager = window.userManagerInstance;
            
            // Esperar a que el usuario actual esté disponible
            let attempts = 0;
            const maxAttempts = 30;
            
            while (!userManager.currentUser && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
            
            currentUser = userManager.currentUser;
            initialized = true;
            
            console.log('👤 Autenticador:', currentUser ? `${currentUser.correoElectronico} (${currentUser.rol})` : 'Sin sesión');
            
            // 🔴 SI NO HAY USUARIO, LO MANDA AL LOGIN
            if (!currentUser) {
                console.log('🔴 Usuario no autenticado - Redirigiendo a login');
                window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
                return;
            }
            
            // Notificar a los listeners
            notifyListeners();
            
            // Actualizar UI automáticamente
            updateUI();
            
        } catch (error) {
            console.error('❌ Error inicializando Autenticador:', error);
            initialized = true;
            // Si hay error, también redirige al login
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
        }
    }

    /**
     * Notifica a todos los listeners
     */
    function notifyListeners() {
        authListeners.forEach(listener => {
            try {
                listener(currentUser);
            } catch (e) {
                console.error('Error en listener:', e);
            }
        });
    }

    /**
     * Actualiza elementos de UI con atributos data-auth
     */
    function updateUI() {
        const userInfo = getCurrentUserInfo();
        
        // Actualizar elementos con data-auth-user-name
        document.querySelectorAll('[data-auth-user-name]').forEach(el => {
            el.textContent = userInfo ? userInfo.nombre : '';
        });
        
        // Actualizar elementos con data-auth-user-email
        document.querySelectorAll('[data-auth-user-email]').forEach(el => {
            el.textContent = userInfo ? userInfo.email : '';
        });
        
        // Actualizar elementos con data-auth-user-rol
        document.querySelectorAll('[data-auth-user-rol]').forEach(el => {
            if (userInfo) {
                let rolTexto = userInfo.rol;
                if (rolTexto === 'master') rolTexto = 'Master';
                if (rolTexto === 'administrador') rolTexto = 'Administrador';
                if (rolTexto === 'colaborador') rolTexto = 'Colaborador';
                el.textContent = rolTexto;
            } else {
                el.textContent = '';
            }
        });
        
        // Actualizar elementos con data-auth-user-org
        document.querySelectorAll('[data-auth-user-org]').forEach(el => {
            el.textContent = userInfo ? (userInfo.organizacion || 'Sistema') : '';
        });
        
        // Actualizar avatares
        document.querySelectorAll('[data-auth-user-avatar]').forEach(el => {
            if (el.tagName === 'IMG' && userInfo) {
                el.src = userInfo.foto;
                el.onerror = function() {
                    this.src = 'https://via.placeholder.com/150/0a2540/ffffff?text=User';
                };
            }
        });
        
        // Mostrar/ocultar elementos según rol
        if (userInfo) {
            document.querySelectorAll('[data-auth-show-master]').forEach(el => {
                el.style.display = userInfo.rol === 'master' ? '' : 'none';
            });
            document.querySelectorAll('[data-auth-show-admin]').forEach(el => {
                el.style.display = userInfo.rol === 'administrador' ? '' : 'none';
            });
            document.querySelectorAll('[data-auth-show-colaborador]').forEach(el => {
                el.style.display = userInfo.rol === 'colaborador' ? '' : 'none';
            });
            document.querySelectorAll('[data-auth-show-authenticated]').forEach(el => {
                el.style.display = '';
            });
            document.querySelectorAll('[data-auth-show-guest]').forEach(el => {
                el.style.display = 'none';
            });
        } else {
            document.querySelectorAll('[data-auth-show-master]').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('[data-auth-show-admin]').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('[data-auth-show-colaborador]').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('[data-auth-show-authenticated]').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('[data-auth-show-guest]').forEach(el => {
                el.style.display = '';
            });
        }
    }

    /**
     * Obtiene información del usuario actual
     */
    function getCurrentUserInfo() {
        if (!currentUser) return null;
        return {
            id: currentUser.id,
            nombre: currentUser.nombreCompleto,
            email: currentUser.correoElectronico,
            rol: currentUser.rol,
            organizacion: currentUser.organizacion,
            organizacionCamelCase: currentUser.organizacionCamelCase,
            foto: currentUser.getFotoUrl(),
            estado: currentUser.getEstadoTexto(),
            verificado: currentUser.estaVerificado(),
            activo: currentUser.estaActivo(),
            plan: currentUser.plan,
            areaAsignadaId: currentUser.areaAsignadaId,
            areaAsignadaNombre: currentUser.areaAsignadaNombre,
            cargo: currentUser.cargo,
            permisos: currentUser.permisosPersonalizados
        };
    }

    // ==================== API PÚBLICA ====================
    
    window.Autenticador = {
        /**
         * Inicia sesión con email y contraseña
         */
        login: async function(email, password) {
            try {
                if (!userManager) {
                    await new Promise(resolve => {
                        const checkInterval = setInterval(() => {
                            if (userManager) {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 100);
                    });
                }
                
                const user = await userManager.iniciarSesion(email, password);
                currentUser = user;
                notifyListeners();
                updateUI();
                
                return {
                    success: true,
                    user: user,
                    message: 'Inicio de sesión exitoso'
                };
            } catch (error) {
                console.error('❌ Error en login:', error);
                return {
                    success: false,
                    error: error.message,
                    message: error.message
                };
            }
        },
        
        /**
         * Cierra la sesión actual
         */
        logout: async function() {
            try {
                if (userManager) {
                    await userManager.logout();
                }
                currentUser = null;
                notifyListeners();
                updateUI();
                
                return {
                    success: true,
                    message: 'Sesión cerrada correctamente'
                };
            } catch (error) {
                console.error('❌ Error en logout:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        /**
         * Obtiene el usuario actual (objeto User completo)
         */
        getUser: function() {
            return currentUser;
        },
        
        /**
         * Obtiene información formateada del usuario
         */
        getUserInfo: function() {
            return getCurrentUserInfo();
        },
        
        /**
         * Verifica si hay sesión activa
         */
        isAuthenticated: function() {
            return currentUser !== null;
        },
        
        /**
         * Verifica si es Master
         */
        isMaster: function() {
            return currentUser ? currentUser.esMaster() : false;
        },
        
        /**
         * Verifica si es Administrador
         */
        isAdmin: function() {
            return currentUser ? currentUser.esAdministrador() : false;
        },
        
        /**
         * Verifica si es Colaborador
         */
        isColaborador: function() {
            return currentUser ? currentUser.esColaborador() : false;
        },
        
        /**
         * Verifica si el usuario está activo
         */
        isActive: function() {
            return currentUser ? currentUser.estaActivo() : false;
        },
        
        /**
         * Verifica si el email está verificado
         */
        isVerified: function() {
            return currentUser ? currentUser.estaVerificado() : false;
        },
        
        /**
         * Verifica si tiene un permiso específico
         */
        hasPermission: function(permiso) {
            return currentUser ? currentUser.tienePermiso(permiso) : false;
        },
        
        /**
         * Obtiene el rol del usuario
         */
        getRol: function() {
            return currentUser ? currentUser.rol : null;
        },
        
        /**
         * Obtiene la organización del usuario
         */
        getOrganizacion: function() {
            return currentUser ? currentUser.organizacion : null;
        },
        
        /**
         * Obtiene el plan del usuario
         */
        getPlan: function() {
            return currentUser ? currentUser.plan : null;
        },
        
        /**
         * Registra un listener para cambios de autenticación
         */
        onAuthChange: function(callback) {
            authListeners.push(callback);
            if (initialized) {
                callback(currentUser);
            }
            return () => {
                const index = authListeners.indexOf(callback);
                if (index > -1) {
                    authListeners.splice(index, 1);
                }
            };
        },
        
        /**
         * Redirige según el rol del usuario
         */
        redirectByRole: function(returnUrl) {
            if (!currentUser) {
                window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
                return;
            }
            
            if (returnUrl) {
                window.location.href = returnUrl;
                return;
            }
            
            if (currentUser.esMaster()) {
                window.location.href = '/usuarios/administradorSistema/panelAdministrador/panelAdministrador.html';
            } else if (currentUser.esAdministrador()) {
                window.location.href = '/usuarios/administrador/panelControl/panelControl.html';
            } else {
                window.location.href = '/usuarios/colaboradores/panelControl/panelControl.html';
            }
        },
        
        /**
         * Actualiza manualmente la UI
         */
        refreshUI: function() {
            updateUI();
        },
        
        /**
         * Espera a que el autenticador esté listo
         */
        ready: function() {
            return new Promise((resolve) => {
                if (initialized) {
                    resolve();
                } else {
                    const checkInterval = setInterval(() => {
                        if (initialized) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                }
            });
        }
    };
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    console.log('✅ Autenticador cargado correctamente');
})();