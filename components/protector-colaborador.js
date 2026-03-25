// protector-colaborador.js
// Protector de rutas para colaboradores basado en permisos de Firestore

import { PermisoManager } from '/clases/permiso.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Plantilla HTML para la vista de acceso denegado
const ACCESO_DENEGADO_HTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Denegado</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .denied-container {
            max-width: 500px;
            width: 100%;
            animation: fadeIn 0.5s ease-out;
        }

        .denied-card {
            background: white;
            border-radius: 20px;
            padding: 40px 30px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
        }

        .denied-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #f44336, #ff9800);
        }

        .icon-container {
            margin-bottom: 20px;
        }

        .lock-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #f44336, #d32f2f);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            animation: shake 0.5s ease-in-out;
        }

        .lock-icon svg {
            width: 40px;
            height: 40px;
            fill: white;
        }

        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 600;
        }

        .access-denied-text {
            color: #f44336;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .message {
            color: #666;
            line-height: 1.6;
            margin-bottom: 25px;
            font-size: 16px;
        }

        .admin-contact {
            background: #f5f5f5;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
        }

        .admin-contact p {
            color: #555;
            font-size: 14px;
            margin-bottom: 10px;
        }

        .admin-contact strong {
            color: #667eea;
            display: block;
            font-size: 16px;
        }

        .button-group {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #666;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .module-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #999;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @media (max-width: 480px) {
            .denied-card {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="denied-container">
        <div class="denied-card">
            <div class="icon-container">
                <div class="lock-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                </div>
            </div>
            <h1>Acceso Denegado</h1>
            <div class="access-denied-text">⚠️ No tienes permisos para acceder a esta sección</div>
            <div class="message">
                Lo sentimos, tu perfil de usuario no cuenta con los permisos necesarios para visualizar el módulo de <strong id="moduloNombre"></strong>.
            </div>
            <div class="admin-contact">
                <p>📞 ¿Necesitas acceso?</p>
                <strong>Contacta al administrador del sistema</strong>
                <p style="margin-top: 10px; font-size: 12px;">Solicita la activación del módulo correspondiente</p>
            </div>
            <div class="button-group">
                <button onclick="window.history.back()" class="btn btn-secondary">← Volver atrás</button>
                <button onclick="window.location.href='/dashboard'" class="btn btn-primary">Ir al Dashboard</button>
            </div>
            <div class="module-info">
                <span>ID de referencia: <span id="referenciaId"></span></span>
            </div>
        </div>
    </div>
    <script>
        // Mostrar el módulo solicitado en la página
        const urlParams = new URLSearchParams(window.location.search);
        const modulo = urlParams.get('modulo') || 'desconocido';
        const nombreModulo = {
            'areas': 'Áreas',
            'sucursales': 'Sucursales',
            'regiones': 'Regiones',
            'incidencias': 'Incidencias',
            'categorias': 'Categorías'
        };
        document.getElementById('moduloNombre').textContent = nombreModulo[modulo] || modulo;
        document.getElementById('referenciaId').textContent = Math.random().toString(36).substring(2, 10).toUpperCase();
    </script>
</body>
</html>
`;

class ProtectorColaborador {
    constructor() {
        this.permisoManager = null;
        this.usuarioActual = null;
        this.auth = getAuth();
        this.permisosCache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de cache
    }

    /**
     * Inicializa el protector y verifica permisos
     * @param {string} modulo - El módulo a proteger ('areas', 'sucursales', 'regiones', 'incidencias', 'categorias')
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<boolean>} - true si tiene acceso, false si no
     */
    async proteger(modulo, options = {}) {
        const {
            redirigirSiNoAcceso = true,
            mostrarVistaDenegada = true,
            urlRedireccion = null,
            callbackDenegado = null
        } = options;

        try {
            // Esperar autenticación
            const usuario = await this._esperarAutenticacion();

            if (!usuario) {
                console.warn('⚠️ Usuario no autenticado');
                if (redirigirSiNoAcceso) {
                    this._redirigirLogin();
                }
                return false;
            }

            this.usuarioActual = usuario;

            // Obtener permisos del usuario
            const tienePermiso = await this._verificarPermisoModulo(modulo);

            if (!tienePermiso) {
                console.warn(`⚠️ Usuario ${usuario.email} no tiene permiso para: ${modulo}`);

                if (callbackDenegado && typeof callbackDenegado === 'function') {
                    await callbackDenegado(modulo, this.usuarioActual);
                }

                if (redirigirSiNoAcceso) {
                    if (urlRedireccion) {
                        window.location.href = urlRedireccion;
                    } else if (mostrarVistaDenegada) {
                        this._mostrarAccesoDenegado(modulo);
                    } else {
                        this._redirigirDashboard();
                    }
                }

                return false;
            }

            console.log(`✅ Acceso concedido para módulo: ${modulo}`);
            return true;

        } catch (error) {
            console.error('❌ Error en protector de página:', error);

            if (redirigirSiNoAcceso) {
                this._mostrarError(error.message);
            }

            return false;
        }
    }

    /**
     * Espera a que el usuario esté autenticado
     * @returns {Promise<Object|null>}
     */
    _esperarAutenticacion() {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                unsubscribe();
                resolve(user);
            });

            // Timeout por si tarda demasiado
            setTimeout(() => {
                unsubscribe();
                resolve(null);
            }, 5000);
        });
    }

    /**
     * Verifica si el usuario tiene permiso para un módulo específico
     * @param {string} modulo 
     * @returns {Promise<boolean>}
     */
    async _verificarPermisoModulo(modulo) {
        try {
            // Verificar cache
            if (this._cacheValido()) {
                const permisoCache = this.permisosCache?.permisos?.[modulo];
                if (permisoCache !== undefined) {
                    console.log(`📦 Usando cache para módulo: ${modulo} = ${permisoCache}`);
                    return permisoCache === true;
                }
            }

            // Obtener información del usuario desde localStorage
            const userData = this._obtenerUserData();

            if (!userData || !userData.organizacionCamelCase) {
                console.warn('No se encontró información de organización del usuario');
                return false;
            }

            if (!userData.areaId || !userData.cargoId) {
                console.warn('Usuario no tiene área o cargo asignado');
                return false;
            }

            // Inicializar PermisoManager
            this.permisoManager = new PermisoManager();

            // Obtener el permiso para el área y cargo del usuario
            const permiso = await this.permisoManager.obtenerPorCargoYArea(
                userData.cargoId,
                userData.areaId,
                userData.organizacionCamelCase
            );

            if (!permiso) {
                console.warn('No se encontró configuración de permisos para el usuario');
                return false;
            }

            // Verificar permiso específico
            const tienePermiso = permiso.puedeAcceder(modulo);

            // Guardar en cache
            this._actualizarCache(permiso);

            return tienePermiso;

        } catch (error) {
            console.error('Error verificando permiso:', error);
            return false;
        }
    }

    /**
     * Obtiene los datos del usuario desde localStorage
     * @returns {Object|null}
     */
    _obtenerUserData() {
        try {
            // Intentar obtener de adminInfo primero
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const data = JSON.parse(adminInfo);
                if (data.areaId && data.cargoId) {
                    return data;
                }
            }

            // Intentar obtener de userData
            const userData = localStorage.getItem('userData');
            if (userData) {
                return JSON.parse(userData);
            }

            return null;
        } catch (error) {
            console.error('Error obteniendo userData:', error);
            return null;
        }
    }

    /**
     * Verifica si el cache es válido
     * @returns {boolean}
     */
    _cacheValido() {
        return this.cacheTimestamp && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
    }

    /**
     * Actualiza el cache de permisos
     * @param {Permiso} permiso 
     */
    _actualizarCache(permiso) {
        this.permisosCache = permiso;
        this.cacheTimestamp = Date.now();
    }

    /**
     * Limpia el cache de permisos
     */
    limpiarCache() {
        this.permisosCache = null;
        this.cacheTimestamp = null;
        console.log('🧹 Cache de permisos limpiado');
    }

    /**
     * Muestra la vista de acceso denegado
     * @param {string} modulo 
     */
    _mostrarAccesoDenegado(modulo) {
        // Reemplazar el contenido del body
        document.body.innerHTML = ACCESO_DENEGADO_HTML;

        // Actualizar el módulo en la página
        const moduloElement = document.getElementById('moduloNombre');
        if (moduloElement) {
            const nombresModulo = {
                'areas': 'Áreas',
                'sucursales': 'Sucursales',
                'regiones': 'Regiones',
                'incidencias': 'Incidencias',
                'categorias': 'Categorías'
            };
            moduloElement.textContent = nombresModulo[modulo] || modulo;
        }

        // Actualizar referencia
        const referenciaElement = document.getElementById('referenciaId');
        if (referenciaElement) {
            referenciaElement.textContent = Math.random().toString(36).substring(2, 10).toUpperCase();
        }

        document.title = 'Acceso Denegado';
    }

    /**
     * Muestra un error genérico
     * @param {string} mensaje 
     */
    _mostrarError(mensaje) {
        document.body.innerHTML = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .error-card {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        text-align: center;
                        max-width: 500px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    h1 { color: #f44336; margin-bottom: 20px; }
                    p { color: #666; margin-bottom: 20px; }
                    button {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    button:hover { transform: translateY(-2px); }
                </style>
            </head>
            <body>
                <div class="error-card">
                    <h1>⚠️ Error de Autenticación</h1>
                    <p>${mensaje}</p>
                    <button onclick="window.location.href='/login'">Ir al Login</button>
                </div>
            </body>
            </html>
        `;
        document.title = 'Error';
    }

    /**
     * Redirige al login
     */
    _redirigirLogin() {
        window.location.href = '/login';
    }

    /**
     * Redirige al dashboard
     */
    _redirigirDashboard() {
        window.location.href = '/dashboard';
    }

    /**
     * Obtiene todos los permisos del usuario actual
     * @returns {Promise<Object|null>}
     */
    async obtenerTodosPermisos() {
        try {
            if (this._cacheValido() && this.permisosCache) {
                return this.permisosCache.permisos;
            }

            const userData = this._obtenerUserData();
            if (!userData || !userData.organizacionCamelCase || !userData.areaId || !userData.cargoId) {
                return null;
            }

            this.permisoManager = new PermisoManager();
            const permiso = await this.permisoManager.obtenerPorCargoYArea(
                userData.cargoId,
                userData.areaId,
                userData.organizacionCamelCase
            );

            if (permiso) {
                this._actualizarCache(permiso);
                return permiso.permisos;
            }

            return null;

        } catch (error) {
            console.error('Error obteniendo todos los permisos:', error);
            return null;
        }
    }

    /**
     * Verifica si el usuario tiene acceso a múltiples módulos
     * @param {Array<string>} modulos 
     * @returns {Promise<Object>}
     */
    async verificarMultiplesModulos(modulos) {
        const resultados = {};

        for (const modulo of modulos) {
            resultados[modulo] = await this._verificarPermisoModulo(modulo);
        }

        return resultados;
    }

    /**
     * Genera un componente HTML que muestra/oculta elementos según permisos
     * @param {string} modulo 
     * @returns {string} - HTML con data attributes para control visual
     */
    generarComponenteVisual(modulo) {
        return `
            <div class="permiso-container" data-modulo="${modulo}" data-permiso="${modulo}">
                <!-- El contenido se mostrará/ocultará mediante CSS/JS -->
                <div class="permiso-content" style="display: none;">
                    Este contenido será visible solo si tiene permisos
                </div>
                <div class="permiso-denegado" style="display: none;">
                    <p>No tienes permisos para ver este contenido</p>
                </div>
            </div>
        `;
    }
}

// Exportar una instancia única del protector
const protectorColaborador = new ProtectorColaborador();

// Exportar la clase y la instancia
export { ProtectorColaborador, protectorColaborador, ACCESO_DENEGADO_HTML };