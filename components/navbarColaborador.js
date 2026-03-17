// [file name]: navbarColaborador.js
// [file path]: /components/navbarColaborador.js

class NavbarComplete {
    constructor() {
        this.isMenuOpen = false;
        this.isAdminDropdownOpen = false;
        this.isHerramientasDropdownOpen = false;
        this.currentUser = null;
        this.userRole = null;
        this.permisos = null;
        this.permisoManager = null;
        this.notificacionManager = null;
        this.notificacionesNoLeidas = 0;
        this.notificaciones = [];
        this.dropdownNotificacionesAbierto = false;
        this.init();
    }

    init() {
        if (window.NavbarCompleteLoaded) {
            return;
        }

        window.NavbarCompleteLoaded = true;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            setTimeout(() => this.setup(), 100);
        }
    }

    async setup() {
        try {
            this.removeOriginalNavbar();
            this.createNavbar();
            this.setupFunctionalities();

            this.loadUserDataFromLocalStorage();
            await this.importPermisoManager();
            await this.obtenerPermisosReales();
            this.updateNavbarWithUserData();
            this.filterMenuByPermissions();

            await this._initNotificacionManager();
            await this._cargarNotificaciones();
            this._iniciarListenerNotificaciones();

        } catch (error) {
            console.error('❌ Error en navbar:', error);
        }
    }

    async _initNotificacionManager() {
        try {
            const { NotificacionAreaManager } = await import('/clases/notificacionArea.js');
            this.notificacionManager = new NotificacionAreaManager();
        } catch (error) {
            console.error('Error inicializando notificacionManager:', error);
        }
    }

    async _cargarNotificaciones() {
        if (!this.notificacionManager || !this.currentUser?.id || !this.currentUser?.organizacionCamelCase) {
            return;
        }

        try {
            console.log('🔍 Usuario actual:', {
                id: this.currentUser.id,
                areaId: this.currentUser.areaId,
                organizacion: this.currentUser.organizacionCamelCase
            });

            // Obtener TODAS las notificaciones del usuario (sin filtrar)
            const todasNotificaciones = await this.notificacionManager.obtenerNotificaciones(
                this.currentUser.id,
                this.currentUser.organizacionCamelCase,
                false, // todas
                20
            );

            console.log('📬 Notificaciones sin filtrar:', todasNotificaciones.length);

            // El usuario tiene areaAsignadaId
            const areaUsuario = this.currentUser.areaId;

            if (!areaUsuario) {
                console.log('ℹ️ Usuario sin área asignada');
                this.notificaciones = [];
                this.notificacionesNoLeidas = 0;
            } else {
                // Filtrar SOLO las notificaciones que incluyen el área del usuario
                this.notificaciones = todasNotificaciones.filter(notif => {
                    // Verificar por areasIds (array de IDs)
                    if (notif.areasIds && Array.isArray(notif.areasIds) && notif.areasIds.length > 0) {
                        const pertenece = notif.areasIds.includes(areaUsuario);
                        if (pertenece) {
                            console.log(`✅ Notificación ${notif.id} es para área ${areaUsuario}`);
                        }
                        return pertenece;
                    }

                    // Fallback: verificar areasDestino
                    if (notif.areasDestino && Array.isArray(notif.areasDestino)) {
                        const pertenece = notif.areasDestino.some(area => area.id === areaUsuario);
                        if (pertenece) {
                            console.log(`✅ Notificación ${notif.id} es para área ${areaUsuario} (por areasDestino)`);
                        }
                        return pertenece;
                    }

                    return false;
                });

                // Calcular no leídas
                this.notificacionesNoLeidas = this.notificaciones.filter(n => !n.leida).length;
            }

            console.log(`📬 Notificaciones filtradas: ${this.notificaciones.length} (${this.notificacionesNoLeidas} no leídas)`);

            this._actualizarBadgeNotificaciones();
            this._renderizarNotificaciones();

        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        }
    }

    _iniciarListenerNotificaciones() {
        if (!this.notificacionManager || !this.currentUser?.id || !this.currentUser?.organizacionCamelCase) {
            return;
        }

        setInterval(() => {
            this._cargarNotificaciones();
        }, 30000);
    }

    _actualizarBadgeNotificaciones() {
        const badge = document.getElementById('notificacionesBadge');
        if (!badge) return;

        if (this.notificacionesNoLeidas > 0) {
            badge.textContent = this.notificacionesNoLeidas > 99 ? '99+' : this.notificacionesNoLeidas;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    _renderizarNotificaciones() {
        const container = document.getElementById('notificacionesLista');
        if (!container) return;

        if (this.notificaciones.length === 0) {
            container.innerHTML = `
                <div class="notificaciones-vacia">
                    <i class="fas fa-bell-slash"></i>
                    <p>No hay notificaciones nuevas</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.notificaciones.slice(0, 5).forEach(notif => {
            const notifUI = notif.toUI();
            html += `
                <div class="notificacion-item" data-id="${notif.id}" data-url="${notifUI.urlDestino}">
                    <div class="notificacion-icono" style="background-color: ${notifUI.color}20; color: ${notifUI.color}">
                        <i class="fas ${notifUI.icono}"></i>
                    </div>
                    <div class="notificacion-contenido">
                        <div class="notificacion-titulo">${notifUI.titulo}</div>
                        <div class="notificacion-mensaje">${notifUI.mensaje}</div>
                        <div class="notificacion-detalles">
                            ${notifUI.sucursalNombre ? `<span><i class="fas fa-store"></i> ${notifUI.sucursalNombre}</span>` : ''}
                            ${notifUI.nivelRiesgo ? `<span class="riesgo-${notifUI.nivelRiesgo}"><i class="fas fa-exclamation-triangle"></i> ${notifUI.nivelRiesgo}</span>` : ''}
                        </div>
                        <div class="notificacion-tiempo">${notifUI.tiempoRelativo}</div>
                    </div>
                    <div class="notificacion-estado ${notifUI.leida ? 'leida' : 'no-leida'}"></div>
                </div>
            `;
        });

        if (this.notificaciones.length > 5) {
            html += `
                <div class="notificaciones-ver-mas">
                    <a href="/usuarios/colaboradores/notificaciones/notificaciones.html">Ver ${this.notificaciones.length - 5} más</a>
                </div>
            `;
        }

        container.innerHTML = html;

        container.querySelectorAll('.notificacion-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const id = item.dataset.id;
                const url = item.dataset.url;
                
                if (this.notificacionManager) {
                    await this.notificacionManager.marcarComoLeida(
                        this.currentUser.id,
                        id,
                        this.currentUser.organizacionCamelCase
                    );
                    
                    // Actualizar contador local
                    this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);
                    this._actualizarBadgeNotificaciones();
                    
                    // Marcar como leída en la UI
                    const notifIndex = this.notificaciones.findIndex(n => n.id === id);
                    if (notifIndex !== -1) {
                        this.notificaciones[notifIndex].leida = true;
                    }
                }
                
                if (url) {
                    window.location.href = url;
                }
            });
        });
    }

    async _marcarTodasLeidas() {
        if (!this.notificacionManager || !this.currentUser?.id || !this.currentUser?.organizacionCamelCase) {
            return;
        }

        try {
            await this.notificacionManager.marcarTodasComoLeidas(
                this.currentUser.id,
                this.currentUser.organizacionCamelCase
            );
            
            this.notificacionesNoLeidas = 0;
            this.notificaciones.forEach(n => n.leida = true);
            this._actualizarBadgeNotificaciones();
            this._renderizarNotificaciones();
            
        } catch (error) {
            console.error('Error marcando todas como leídas:', error);
        }
    }

    _configurarNotificacionesDropdown() {
        const notificacionesBtn = document.getElementById('notificacionesBtn');
        const notificacionesDropdown = document.getElementById('notificacionesDropdown');
        const marcarTodasBtn = document.getElementById('marcarTodasBtn');

        if (!notificacionesBtn || !notificacionesDropdown) return;

        notificacionesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dropdownNotificacionesAbierto = !this.dropdownNotificacionesAbierto;
            notificacionesDropdown.classList.toggle('active', this.dropdownNotificacionesAbierto);
        });

        document.addEventListener('click', (e) => {
            if (!notificacionesBtn.contains(e.target) && !notificacionesDropdown.contains(e.target)) {
                this.dropdownNotificacionesAbierto = false;
                notificacionesDropdown.classList.remove('active');
            }
        });

        if (marcarTodasBtn) {
            marcarTodasBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._marcarTodasLeidas();
            });
        }
    }

    removeOriginalNavbar() {
        const originalHeader = document.getElementById('main-header');
        originalHeader?.remove();
    }

    createNavbar() {
        this.addStyles();
        this.insertHTML();
        this.adjustBodyPadding();
    }

    addStyles() {
        if (document.getElementById('navbar-complete-styles')) return;

        const styles = /*css*/`
            #complete-navbar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                z-index: 1000;
                background-color: var(--navbar-bg);
                box-shadow: 0 2px 10px transparent;
                transition: var(--transition-default);
                font-family: var(--font-family-primary);
            }
            
            #complete-navbar.scrolled {
                background-color: var(--navbar-scrolled-bg);
                box-shadow: var(--navbar-scrolled-shadow);
            }
            
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 20px;
                min-height: 50px;
                margin: 0;
                position: relative;
                width: 100%;
                box-sizing: border-box;
            }
            
            .navbar-left-container {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 10px;
                flex: 0 0 auto;
                margin-right: auto;
            }
            
            .navbar-logo-link {
                display: flex;
                align-items: center;
                text-decoration: none;
                z-index: 1003;
                height: 70px;
                flex: 0 0 auto;
            }

            .logo-circle-container {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                overflow: hidden;
                border: 3px solid var(--color-accent-primary);
                background-color: var(--color-bg-secondary);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                flex-shrink: 0;
            }

            .navbar-logo-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform var(--transition-default);
                display: block;
            }

            .navbar-logo-link:hover .logo-circle-container {
                transform: scale(1.05);
                border-color: var(--color-accent-secondary);
            }
            
            .logo-separator {
                width: 2px;
                height: 45px;
                background: linear-gradient(
                    to bottom,
                    var(--color-accent-primary) 0%,
                    var(--color-accent-primary) 20%,
                    var(--color-accent-primary) 80%,
                    var(--color-accent-primary) 100%
                );
                margin: 0 5px;
                border-radius: 1px;
                flex-shrink: 0;
            }
            
            .org-text-logo {
                display: none;
                align-items: center;
                justify-content: center;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background-color: var(--color-accent-primary);
                color: white;
                font-weight: bold;
                font-size: 14px;
                text-align: center;
                border: 3px solid var(--color-accent-primary);
                flex-shrink: 0;
            }
            
            .navbar-title {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                font-weight: 700;
                font-size: 24px;
                color: var(--navbar-logo-text);
                text-shadow: var(--text-shadow-effect);
                margin: 0;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1;
                font-family: 'Orbitron', sans-serif;
                text-align: center;
                width: max-content;
            }
            
            .navbar-right-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex: 0 0 auto;
                margin-left: auto;
                gap: 15px;
            }

            .navbar-notificaciones-container {
                position: relative;
            }
            
            .navbar-notificaciones-btn {
                background: none;
                border: none;
                color: var(--navbar-text);
                font-size: 20px;
                cursor: pointer;
                position: relative;
                padding: 8px;
                border-radius: 50%;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .navbar-notificaciones-btn:hover {
                background-color: var(--color-bg-secondary);
                transform: scale(1.1);
            }
            
            .notificaciones-badge {
                position: absolute;
                top: 0;
                right: 0;
                background-color: #dc3545;
                color: white;
                font-size: 11px;
                font-weight: bold;
                min-width: 18px;
                height: 18px;
                border-radius: 9px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                border: 2px solid var(--navbar-bg);
            }
            
            .notificaciones-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 350px;
                background-color: var(--color-bg-primary);
                border-radius: var(--border-radius-medium);
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                border: 1px solid var(--color-border-light);
                z-index: 1004;
                display: none;
                margin-top: 10px;
            }
            
            .notificaciones-dropdown.active {
                display: block;
            }
            
            .notificaciones-header {
                padding: 15px;
                border-bottom: 1px solid var(--color-border-light);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notificaciones-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--color-text-primary);
            }
            
            .notificaciones-marcar-todas {
                background: none;
                border: none;
                color: var(--color-accent-primary);
                font-size: 12px;
                cursor: pointer;
                padding: 5px 10px;
                border-radius: var(--border-radius-small);
                transition: all 0.3s ease;
            }
            
            .notificaciones-marcar-todas:hover {
                background-color: var(--color-bg-secondary);
            }
            
            .notificaciones-lista {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px;
            }
            
            .notificacion-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
                border-radius: var(--border-radius-small);
                cursor: pointer;
                transition: all 0.3s ease;
                border: 1px solid transparent;
                margin-bottom: 5px;
            }
            
            .notificacion-item:hover {
                background-color: var(--color-bg-secondary);
                border-color: var(--color-border-light);
                transform: translateX(-2px);
            }
            
            .notificacion-icono {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .notificacion-contenido {
                flex: 1;
            }
            
            .notificacion-titulo {
                font-weight: 600;
                font-size: 14px;
                color: var(--color-text-primary);
                margin-bottom: 4px;
            }
            
            .notificacion-mensaje {
                font-size: 13px;
                color: var(--color-text-secondary);
                margin-bottom: 4px;
                line-height: 1.4;
            }
            
            .notificacion-detalles {
                display: flex;
                gap: 10px;
                font-size: 11px;
                color: var(--color-text-tertiary);
                margin-bottom: 4px;
                flex-wrap: wrap;
            }
            
            .notificacion-detalles span {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .riesgo-bajo { color: #28a745; }
            .riesgo-medio { color: #ffc107; }
            .riesgo-alto { color: #fd7e14; }
            .riesgo-critico { color: #dc3545; }
            
            .notificacion-tiempo {
                font-size: 10px;
                color: var(--color-text-tertiary);
            }
            
            .notificacion-estado {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-top: 5px;
            }
            
            .notificacion-estado.no-leida {
                background-color: #007bff;
                box-shadow: 0 0 5px #007bff;
            }
            
            .notificacion-estado.leida {
                background-color: transparent;
            }
            
            .notificaciones-vacia,
            .notificaciones-cargando {
                padding: 30px;
                text-align: center;
                color: var(--color-text-secondary);
            }
            
            .notificaciones-vacia i,
            .notificaciones-cargando i {
                font-size: 40px;
                margin-bottom: 10px;
                opacity: 0.5;
            }
            
            .notificaciones-footer, .notificaciones-ver-mas {
                padding: 12px 15px;
                border-top: 1px solid var(--color-border-light);
                text-align: center;
            }
            
            .notificaciones-footer a, .notificaciones-ver-mas a {
                color: var(--color-accent-primary);
                text-decoration: none;
                font-size: 13px;
                font-weight: 500;
            }
            
            .notificaciones-footer a:hover, .notificaciones-ver-mas a:hover {
                text-decoration: underline;
            }
            
            .navbar-hamburger-btn {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: none;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                padding: 0;
                position: relative;
                z-index: 1002;
                transition: var(--transition-default);
                flex-shrink: 0;
            }
            
            .hamburger-line {
                display: block;
                width: 25px;
                height: 3px;
                background-color: var(--navbar-text);
                margin: 3px 0;
                border-radius: var(--border-radius-small);
                transition: var(--transition-default);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(6.3px, 6.3px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(6.3px, -6.3px);
            }
            
            .navbar-main-menu {
                position: fixed;
                top: 0;
                right: -100%;
                width: 25%;
                height: 100vh;
                background-color: var(--navbar-scrolled-bg);
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1001;
                overflow-y: auto;
                box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
                visibility: hidden;
                opacity: 0;
                overflow-x: hidden;
            }
            
            .navbar-main-menu.active {
                right: 0;
                visibility: visible;
                opacity: 1;
            }
            
            .admin-profile-section {
                padding: 30px 25px 20px;
                background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-primary) 100%);
                color: var(--color-text-primary);
                border-bottom: 1px solid var(--color-border-light);
                text-align: center;
                position: relative;
            }
            
            .profile-photo-container {
                position: relative;
                width: 120px;
                height: 120px;
                margin: 0 auto 20px;
                display: inline-block;
            }
            
            .admin-profile-circle {
                width: 100%;
                height: 100%;
                border-radius: var(--border-radius-circle);
                overflow: hidden;
                border: 3px solid var(--color-accent-primary);
                background-color: var(--color-bg-secondary);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .admin-profile-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .profile-placeholder {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: var(--color-accent-primary);
                font-size: 40px;
            }

            .profile-placeholder span {
                font-size: 12px;
                margin-top: 5px;
                font-weight: bold;
            }
            
            .edit-profile-icon {
                position: absolute;
                bottom: 5px;
                right: 5px;
                background-color: var(--color-accent-primary);
                width: 35px;
                height: 35px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid white;
                z-index: 10;
                text-decoration: none;
                color: white;
            }
            
            .edit-profile-icon:hover {
                background-color: var(--color-accent-secondary);
                transform: scale(1.1) rotate(10deg);
                color: white;
            }
            
            .edit-profile-icon i {
                font-size: 14px;
            }
            
            .admin-info {
                margin-bottom: 20px;
            }
            
            .admin-name {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 5px;
                color: var(--color-text-primary);
                font-family: 'Orbitron', sans-serif;
                min-height: 25px;
            }
            
            .admin-role {
                font-size: 14px;
                color: var(--color-text-secondary);
                margin-bottom: 10px;
                font-family: 'Orbitron', sans-serif;
            }
            
            .admin-email {
                font-size: 13px;
                color: var(--color-text-tertiary);
                min-height: 20px;
            }

            .admin-organization {
                font-size: 13px;
                color: var(--color-accent-primary);
                margin-top: 5px;
                font-weight: 600;
            }
            
            .herramientas-dropdown-btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                padding: 14px 16px;
                background-color: var(--color-bg-primary);
                border: 2px solid var(--color-border-medium);
                border-radius: var(--border-radius-medium);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
                font-weight: 600;
                color: var(--color-text-primary);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
                font-family: 'Orbitron', sans-serif;
                margin-bottom: 15px;
            }
            
            .herramientas-dropdown-btn:hover {
                background-color: var(--color-bg-secondary);
                transform: translateY(-2px);
                box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15);
            }
            
            .herramientas-dropdown-btn:active {
                transform: translateY(0);
            }
            
            .herramientas-dropdown-btn i {
                transition: transform 0.3s ease;
                font-size: 14px;
            }
            
            .herramientas-dropdown-btn.active i {
                transform: rotate(180deg);
            }
            
            .herramientas-dropdown-options {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 20px;
                padding: 15px;
                background-color: var(--color-bg-tertiary);
                border-radius: var(--border-radius-medium);
                border: 1px solid var(--color-border-light);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                max-height: 0;
                overflow: hidden;
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .herramientas-dropdown-options.active {
                max-height: 500px;
                opacity: 1;
                overflow: visible;
            }
            
            .herramientas-dropdown-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 15px;
                background-color: var(--color-bg-primary);
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-small);
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                color: var(--color-text-primary);
                font-weight: 500;
                font-family: 'Orbitron', sans-serif;
                word-break: break-word;
                white-space: normal;
            }
            
            .herramientas-dropdown-option:hover {
                background-color: var(--color-bg-secondary);
                transform: translateX(5px);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
            }
            
            .herramientas-dropdown-option i {
                width: 20px;
                text-align: center;
                font-size: 16px;
                color: var(--color-accent-primary);
                flex-shrink: 0;
            }
            
            .herramientas-dropdown-option span {
                flex: 1;
                white-space: normal;
                word-break: break-word;
            }
            
            .nav-section {
                padding: 20px 25px;
                border-bottom: 1px solid var(--color-border-light);
                overflow-x: hidden;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .nav-section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
                color: var(--color-text-secondary);
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: 'Orbitron', sans-serif;
            }
            
            .menu-section {
                padding: 20px 25px;
                border-bottom: 1px solid var(--color-border-light);
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .empty-menu-item {
                padding: 10px 15px;
                border-radius: var(--border-radius-small);
                transition: var(--transition-default);
                height: 40px;
                background-color: transparent;
                border: none;
                cursor: default;
            }
            
            .admin-options-section {
                padding: 20px 25px;
                border-top: 1px solid var(--color-border-light);
                margin-top: auto;
            }
            
            .admin-dropdown-btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                padding: 14px 16px;
                background-color: var(--color-bg-primary);
                border: 2px solid var(--color-border-medium);
                border-radius: var(--border-radius-medium);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
                font-weight: 600;
                color: var(--color-text-primary);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
                font-family: 'Orbitron', sans-serif;
            }
            
            .admin-dropdown-btn:hover {
                background-color: var(--color-bg-secondary);
                transform: translateY(-2px);
                box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15);
            }
            
            .admin-dropdown-btn:active {
                transform: translateY(0);
            }
            
            .admin-dropdown-btn i {
                transition: transform 0.3s ease;
                font-size: 14px;
            }
            
            .admin-dropdown-btn.active i {
                transform: rotate(180deg);
            }
            
            .admin-dropdown-options {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 15px;
                padding: 15px;
                background-color: var(--color-bg-tertiary);
                border-radius: var(--border-radius-medium);
                border: 1px solid var(--color-border-light);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                max-height: 0;
                overflow: hidden;
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                overflow-x: hidden;
            }
            
            .admin-dropdown-options.active {
                max-height: 350px;
                opacity: 1;
                overflow: visible;
            }
            
            .admin-dropdown-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 15px;
                background-color: var(--color-bg-primary);
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-small);
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                color: var(--color-text-primary);
                font-weight: 500;
                font-family: 'Orbitron', sans-serif;
                word-break: break-word;
                white-space: normal;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .admin-dropdown-option:hover {
                background-color: var(--color-bg-secondary);
                transform: translateX(5px);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
            }
            
            .admin-dropdown-option i {
                width: 20px;
                text-align: center;
                font-size: 16px;
                color: var(--color-accent-primary);
                flex-shrink: 0;
            }
            
            .admin-dropdown-option span {
                flex: 1;
                white-space: normal;
                word-break: break-word;
                line-height: 1.4;
            }
            
            .logout-option {
                background: linear-gradient(135deg, #ff6b6b, #ff5252);
                border-color: #ff5252;
                color: white;
            }
            
            .logout-option:hover {
                background: linear-gradient(135deg, #ff5252, #ff3838);
                border-color: #ff3838;
            }
            
            .logout-option i {
                color: white;
            }
            
            .navbar-mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .navbar-mobile-overlay.active {
                display: block;
                opacity: 1;
            }
            
            @media (max-width: 992px) {
                .navbar-main-menu {
                    width: 85%;
                }
                
                .logo-circle-container {
                    width: 50px;
                    height: 50px;
                }

                .org-text-logo {
                    width: 50px;
                    height: 50px;
                    font-size: 12px;
                }

                .logo-separator {
                    height: 35px;
                }
                
                .navbar-title {
                    font-size: 22px;
                }

                body.menu-open {
                    overflow: hidden;
                }
                
                .herramientas-dropdown-option {
                    padding: 12px 12px;
                    gap: 10px;
                }
                
                .herramientas-dropdown-option i {
                    font-size: 14px;
                }
                
                .herramientas-dropdown-option span {
                    font-size: 14px;
                }

                .herramientas-dropdown-options.active {
                    max-height: 500px;
                }
                
                .notificaciones-dropdown {
                    width: 300px;
                    right: -50px;
                }
            }
            
            @media (max-width: 768px) {
                .navbar-top-section {
                    padding: 5px 15px;
                }
                
                .navbar-main-menu {
                    width: 100%;
                }

                .logo-circle-container {
                    width: 40px;
                    height: 40px;
                }

                .org-text-logo {
                    width: 40px;
                    height: 40px;
                    font-size: 10px;
                }
                
                .logo-separator {
                    height: 30px;
                    margin: 0 3px;
                }
                
                .navbar-title {
                    font-size: 18px;
                    white-space: normal;
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .profile-photo-container {
                    width: 100px;
                    height: 100px;
                }
                
                .edit-profile-icon {
                    width: 30px;
                    height: 30px;
                }
                
                .admin-dropdown-btn {
                    padding: 12px 14px;
                    font-size: 15px;
                }

                .herramientas-dropdown-btn {
                    padding: 12px 14px;
                    font-size: 15px;
                }
                
                .navbar-hamburger-btn {
                    width: 36px;
                    height: 36px;
                }
                
                .hamburger-line {
                    width: 22px;
                    height: 2.5px;
                }
                
                .admin-dropdown-options {
                    padding: 12px;
                }
                
                .admin-dropdown-options.active {
                    max-height: 550px;
                }

                .herramientas-dropdown-options {
                    padding: 12px;
                }
                
                .herramientas-dropdown-options.active {
                    max-height: 500px;
                }
                
                .admin-dropdown-option {
                    padding: 14px 12px;
                    gap: 12px;
                }
                
                .admin-dropdown-option i {
                    font-size: 16px;
                    width: 24px;
                }
                
                .admin-dropdown-option span {
                    font-size: 15px;
                    line-height: 1.4;
                }

                .herramientas-dropdown-option {
                    padding: 14px 12px;
                    gap: 12px;
                }
                
                .nav-section-title {
                    font-size: 15px;
                }
                
                .notificaciones-dropdown {
                    width: 280px;
                    right: -70px;
                }
            }
            
            @media (max-width: 480px) {
                .navbar-top-section {
                    padding: 5px 10px;
                }
                
                .navbar-title {
                    font-size: 16px;
                    max-width: 120px;
                }
                
                .logo-circle-container {
                    width: 36px;
                    height: 36px;
                }
                
                .org-text-logo {
                    width: 36px;
                    height: 36px;
                    font-size: 9px;
                }
                
                .logo-separator {
                    height: 28px;
                    margin: 0 2px;
                }
                
                .navbar-hamburger-btn {
                    width: 32px;
                    height: 32px;
                }
                
                .hamburger-line {
                    width: 20px;
                    height: 2px;
                }
                
                .admin-dropdown-option {
                    padding: 12px 10px;
                }
                
                .admin-dropdown-option span {
                    font-size: 14px;
                }

                .herramientas-dropdown-option {
                    padding: 12px 10px;
                }
                
                .notificaciones-dropdown {
                    width: 260px;
                    right: -80px;
                }
            }
            
            @media (min-width: 1600px) {
                .navbar-top-section {
                    padding: 5px 40px;
                }
                
                .navbar-title {
                    font-size: 28px;
                }
                
                .logo-circle-container {
                    width: 55px;
                    height: 55px;
                }
                
                .org-text-logo {
                    width: 55px;
                    height: 55px;
                    font-size: 16px;
                }
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'navbar-complete-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    insertHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';
        navbar.innerHTML = `
            <div class="navbar-top-section">
                <div class="navbar-left-container">
                    <a href="/usuarios/colaboradores/panelControl/panelControl.html" class="navbar-logo-link">
                        <div class="logo-circle-container">
                            <img src="/assets/images/logo.png" alt="Centinela Logo" class="navbar-logo-img">
                        </div>
                    </a>
                    
                    <div class="logo-separator"></div>
                    
                    <a href="/usuarios/colaboradores/panelControl/panelControl.html" class="navbar-logo-link" id="orgLogoLink">
                        <div class="logo-circle-container" id="orgLogoContainer">
                            <img src="/assets/images/logo.png" alt="Logo Organización" 
                                 class="navbar-logo-img" id="orgLogoImg">
                            <div class="org-text-logo" id="orgTextLogo" style="display: none;">ORG</div>
                        </div>
                    </a>
                </div>
                
                <h1 class="navbar-title">CENTINELA</h1>
                
                <div class="navbar-right-container">
                    <div class="navbar-notificaciones-container">
                        <button class="navbar-notificaciones-btn" id="notificacionesBtn">
                            <i class="fas fa-bell"></i>
                            <span class="notificaciones-badge" id="notificacionesBadge" style="display: none;">0</span>
                        </button>
                        <div class="notificaciones-dropdown" id="notificacionesDropdown">
                            <div class="notificaciones-header">
                                <h3>Notificaciones</h3>
                                <button class="notificaciones-marcar-todas" id="marcarTodasBtn">
                                    <i class="fas fa-check-double"></i> Marcar todas
                                </button>
                            </div>
                            <div class="notificaciones-lista" id="notificacionesLista">
                                <div class="notificaciones-cargando">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Cargando notificaciones...</p>
                                </div>
                            </div>
                            <div class="notificaciones-footer">
                                <a href="/usuarios/colaboradores/notificaciones/notificaciones.html">Ver todas</a>
                            </div>
                        </div>
                    </div>

                    <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>
            </div>
            
            <div class="navbar-mobile-overlay" id="navbarMobileOverlay"></div>
            
            <div class="navbar-main-menu" id="navbarMainMenu">
                
                <div class="admin-profile-section">
                    <div class="profile-photo-container">
                        <div class="admin-profile-circle">
                            <img src="/assets/images/logo.png" alt="Usuario" class="admin-profile-img" id="userProfileImg">
                            <div class="profile-placeholder" id="profilePlaceholder" style="display: none;">
                                <i class="fas fa-user"></i>
                                <span>Usuario</span>
                            </div>
                        </div>
                        <a href="/users/colaborador/perfil/perfil.html" class="edit-profile-icon" id="editProfileIcon">
                            <i class="fas fa-pencil-alt"></i>
                        </a>
                    </div>
                    
                    <div class="admin-info">
                        <div class="admin-name" id="userName">Cargando...</div>
                        <div class="admin-role" id="userRole">Colaborador</div>
                        <div class="admin-email" id="userEmail">cargando@email.com</div>
                        <div class="admin-organization" id="userOrganization"></div>
                    </div>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">
                        <i class="fa-solid fa-cubes"></i>
                        <span>Módulos del Sistema</span>
                    </div>
                    
                    <button class="herramientas-dropdown-btn" id="herramientasDropdownBtn">
                        <span>Accesos Rápidos</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    
                    <div class="herramientas-dropdown-options" id="herramientasDropdownOptions">
                        <a href="/usuarios/colaboradores/areas/areas.html" class="herramientas-dropdown-option" id="areasBtn">
                            <i class="fa-solid fa-map"></i>
                            <span>Áreas</span>
                        </a>

                        <a href="/usuarios/colaboradores/categorias/categorias.html" class="herramientas-dropdown-option" id="categoriasBtn">
                            <i class="fa-solid fa-tags"></i>
                            <span>Categorías</span>
                        </a>

                        <a href="/usuarios/colaboradores/sucursales/sucursales.html" class="herramientas-dropdown-option" id="sucursalesBtn">
                            <i class="fa-solid fa-store"></i>
                            <span>Sucursales</span>
                        </a>

                        <a href="/usuarios/colaboradores/regiones/regiones.html" class="herramientas-dropdown-option" id="regionesBtn">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>Regiones</span>
                        </a>

                        <a href="/usuarios/colaboradores/incidencias/incidencias.html" class="herramientas-dropdown-option" id="incidenciasBtn">
                            <i class="fa-solid fa-exclamation-triangle"></i>
                            <span>Incidencias</span>
                        </a>

                        <a href="/usuarios/colaboradores/incidenciasCanalizadasColaborador/incidenciasCanalizadasColaborador.html" class="herramientas-dropdown-option" id="incidenciasCanalizadasBtn">
                            <i class="fa-solid fa-check-circle"></i>
                            <span>Incidencias Canalizadas</span>
                        </a>
                    </div>
                </div>
                
                <div class="menu-section">
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                </div>
                
                <div class="admin-options-section">
                    <button class="admin-dropdown-btn" id="userDropdownBtn">
                        <span>Opciones de Colaborador</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    
                    <div class="admin-dropdown-options" id="userDropdownOptions">
                        <a href="/users/colaborador/perfil/perfil.html" class="admin-dropdown-option">
                            <i class="fa-solid fa-user-pen"></i>
                            <span>Editar Perfil</span>
                        </a>
                        <a href="/users/colaborador/configuracion/configuracion.html" class="admin-dropdown-option">
                            <i class="fa-solid fa-sliders-h"></i>
                            <span>Preferencias</span>
                        </a>
                        <a href="/users/colaborador/ayuda/ayuda.html" class="admin-dropdown-option">
                            <i class="fa-solid fa-circle-question"></i>
                            <span>Ayuda</span>
                        </a>
                        <a href="#" class="admin-dropdown-option logout-option" id="logoutOption">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>Cerrar Sesión</span>
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.prepend(navbar);
    }

    adjustBodyPadding() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        const updatePadding = () => {
            document.body.style.paddingTop = `${navbar.offsetHeight}px`;
        };

        updatePadding();

        const resizeObserver = new ResizeObserver(updatePadding);
        resizeObserver.observe(navbar);
    }

    loadUserDataFromLocalStorage() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

            if (!isLoggedIn) {
                return false;
            }

            const userDataString = localStorage.getItem('userData');

            if (userDataString) {
                const userData = JSON.parse(userDataString);

                let fotoUsuario = null;
                let fotoOrganizacion = null;

                if (userData.fotoUsuario && userData.fotoUsuario.length > 10) {
                    fotoUsuario = userData.fotoUsuario;
                } else {
                    const userFotoKey = localStorage.getItem('userFoto');
                    if (userFotoKey && userFotoKey.length > 10) {
                        fotoUsuario = userFotoKey;
                    }
                }

                if (userData.fotoOrganizacion && userData.fotoOrganizacion.length > 10) {
                    fotoOrganizacion = userData.fotoOrganizacion;
                } else {
                    const orgLogoKey = localStorage.getItem('organizacionLogo');
                    if (orgLogoKey && orgLogoKey.length > 10) {
                        fotoOrganizacion = orgLogoKey;
                    }
                }

                this.currentUser = {
                    id: userData.id || localStorage.getItem('userId'),
                    uid: userData.id,
                    correoElectronico: userData.email || localStorage.getItem('userEmail'),
                    nombreCompleto: userData.nombreCompleto || localStorage.getItem('userNombre'),
                    rol: userData.rol || localStorage.getItem('userRole'),
                    organizacion: userData.organizacion || localStorage.getItem('userOrganizacion'),
                    organizacionCamelCase: userData.organizacionCamelCase || localStorage.getItem('userOrganizacionCamelCase'),
                    fotoUsuario: fotoUsuario,
                    fotoOrganizacion: fotoOrganizacion,
                    areaId: userData.areaAsignadaId || userData.areaId || localStorage.getItem('userAreaId') || '',
                    cargoId: userData.cargoId || localStorage.getItem('userCargoId') || '',
                    status: userData.status || 'activo',
                    verificado: userData.verificado || true,
                    ultimoAcceso: userData.ultimoAcceso || userData.sessionStart
                };

                this.userRole = this.currentUser.rol?.toLowerCase() || 'colaborador';
                
                console.log('✅ Usuario cargado en navbar:', {
                    nombre: this.currentUser.nombreCompleto,
                    areaId: this.currentUser.areaId,
                    cargoId: this.currentUser.cargoId,
                    rol: this.currentUser.rol
                });

                return true;
            }

            this.currentUser = {
                id: localStorage.getItem('userId'),
                correoElectronico: localStorage.getItem('userEmail'),
                nombreCompleto: localStorage.getItem('userNombre'),
                rol: localStorage.getItem('userRole'),
                organizacion: localStorage.getItem('userOrganizacion'),
                organizacionCamelCase: localStorage.getItem('userOrganizacionCamelCase'),
                fotoUsuario: localStorage.getItem('userFoto') || null,
                fotoOrganizacion: localStorage.getItem('organizacionLogo') || null,
                areaId: localStorage.getItem('userAreaId') || '',
                cargoId: localStorage.getItem('userCargoId') || ''
            };

            if (this.currentUser.nombreCompleto && this.currentUser.rol) {
                this.userRole = this.currentUser.rol?.toLowerCase() || 'colaborador';
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Error al cargar usuario desde localStorage:', error);
            return false;
        }
    }

    async importPermisoManager() {
        try {
            const { PermisoManager } = await import('/clases/permiso.js');
            this.permisoManager = new PermisoManager();

            if (this.currentUser?.organizacionCamelCase) {
                this.permisoManager.organizacionCamelCase = this.currentUser.organizacionCamelCase;
            }
        } catch (error) {
            console.warn('⚠️ Error importando PermisoManager en navbar:', error);
        }
    }

    async obtenerPermisosReales() {
        try {
            if (this.userRole === 'administrador' || this.userRole === 'master') {
                this.permisos = {
                    areas: true,
                    categorias: true,
                    sucursales: true,
                    regiones: true,
                    incidencias: true,
                    incidenciasCanalizadas: true,
                    usuarios: true,
                    permisos: true,
                    admin: true
                };
                return;
            }

            if (!this.currentUser?.areaId || !this.currentUser?.cargoId) {
                this.permisos = {
                    areas: false,
                    categorias: false,
                    sucursales: false,
                    regiones: false,
                    incidencias: true,
                    incidenciasCanalizadas: true,
                    usuarios: false,
                    permisos: false,
                    admin: false
                };
                return;
            }

            if (this.permisoManager) {
                try {
                    const permiso = await this.permisoManager.obtenerPorCargoYArea(
                        this.currentUser.cargoId,
                        this.currentUser.areaId,
                        this.currentUser.organizacionCamelCase
                    );

                    if (permiso) {
                        this.permisos = {
                            areas: permiso.puedeAcceder('areas'),
                            categorias: permiso.puedeAcceder('categorias'),
                            sucursales: permiso.puedeAcceder('sucursales'),
                            regiones: permiso.puedeAcceder('regiones'),
                            incidencias: permiso.puedeAcceder('incidencias'),
                            incidenciasCanalizadas: true,
                            usuarios: false,
                            permisos: false,
                            admin: false
                        };
                        return;
                    }
                } catch (error) {
                    console.warn('Error consultando permisos en Firebase:', error);
                }
            }

            this.permisos = {
                areas: false,
                categorias: false,
                sucursales: false,
                regiones: false,
                incidencias: true,
                incidenciasCanalizadas: true,
                usuarios: false,
                permisos: false,
                admin: false
            };

        } catch (error) {
            console.error('Error en obtenerPermisosReales:', error);
            this.permisos = {
                areas: false,
                categorias: false,
                sucursales: false,
                regiones: false,
                incidencias: true,
                incidenciasCanalizadas: true,
                usuarios: false,
                permisos: false,
                admin: false
            };
        }
    }

    filterMenuByPermissions() {
        if (!this.permisos) {
            return;
        }

        const menuItems = [
            {
                id: 'areasBtn',
                modulo: 'areas',
                elemento: document.getElementById('areasBtn'),
                texto: 'Áreas',
                siempreVisible: false
            },
            {
                id: 'categoriasBtn',
                modulo: 'categorias',
                elemento: document.getElementById('categoriasBtn'),
                texto: 'Categorías',
                siempreVisible: false
            },
            {
                id: 'sucursalesBtn',
                modulo: 'sucursales',
                elemento: document.getElementById('sucursalesBtn'),
                texto: 'Sucursales',
                siempreVisible: false
            },
            {
                id: 'regionesBtn',
                modulo: 'regiones',
                elemento: document.getElementById('regionesBtn'),
                texto: 'Regiones',
                siempreVisible: false
            },
            {
                id: 'incidenciasBtn',
                modulo: 'incidencias',
                elemento: document.getElementById('incidenciasBtn'),
                texto: 'Incidencias',
                siempreVisible: false
            },
            {
                id: 'incidenciasCanalizadasBtn',
                modulo: 'incidenciasCanalizadas',
                elemento: document.getElementById('incidenciasCanalizadasBtn'),
                texto: 'Incidencias Canalizadas',
                siempreVisible: true
            }
        ];

        let itemsVisibles = 0;

        menuItems.forEach(item => {
            if (!item.elemento) return;

            let debeMostrarse = false;

            if (item.siempreVisible) {
                debeMostrarse = true;
            } else {
                debeMostrarse = this.verificarPermiso(item.modulo);
            }

            if (debeMostrarse) {
                item.elemento.style.display = 'flex';
                itemsVisibles++;
            } else {
                item.elemento.style.display = 'none';
            }
        });

        this.checkEmptySections(itemsVisibles);
    }

    verificarPermiso(modulo) {
        if (this.userRole === 'administrador' || this.userRole === 'master') {
            return true;
        }

        if (modulo && this.permisos) {
            return this.permisos[modulo] === true;
        }

        return false;
    }

    checkEmptySections(itemsVisibles) {
        const navSection = document.querySelector('.nav-section');
        if (!navSection) return;

        if (itemsVisibles === 0) {
            navSection.style.display = 'none';
        } else {
            navSection.style.display = 'block';
        }
    }

    updateNavbarWithUserData() {
        if (!this.currentUser) {
            const userName = document.getElementById('userName');
            const userRole = document.getElementById('userRole');
            const userEmail = document.getElementById('userEmail');
            const userOrganization = document.getElementById('userOrganization');

            if (userName) userName.textContent = 'No autenticado';
            if (userRole) userRole.textContent = 'Visitante';
            if (userEmail) userEmail.textContent = 'Inicia sesión para continuar';
            if (userOrganization) userOrganization.textContent = '';

            return;
        }

        this.updateOrganizationLogo();
        this.updateUserMenuInfo();
        this.setupEditProfileLink();
    }

    updateOrganizationLogo() {
        const organizationLogoImg = document.getElementById('orgLogoImg');
        const orgTextLogo = document.getElementById('orgTextLogo');
        const orgLogoLink = document.getElementById('orgLogoLink');
        const orgLogoContainer = document.getElementById('orgLogoContainer');

        if (!organizationLogoImg || !orgTextLogo || !orgLogoLink || !orgLogoContainer) return;

        if (this.currentUser.fotoOrganizacion && this.currentUser.fotoOrganizacion.length > 10) {
            organizationLogoImg.src = this.currentUser.fotoOrganizacion;
            organizationLogoImg.alt = `Logo de ${this.currentUser.organizacion}`;
            organizationLogoImg.style.display = 'block';
            orgTextLogo.style.display = 'none';
            organizationLogoImg.title = this.currentUser.organizacion;

            organizationLogoImg.onerror = (e) => {
                this.showOrgTextLogo();
            };
        } else {
            this.showOrgTextLogo();
        }

        orgLogoLink.href = '/usuarios/colaboradores/panelControl/panelControl.html';
    }

    showOrgTextLogo() {
        const organizationLogoImg = document.getElementById('orgLogoImg');
        const orgTextLogo = document.getElementById('orgTextLogo');

        if (!organizationLogoImg || !orgTextLogo) return;

        organizationLogoImg.style.display = 'none';
        orgTextLogo.style.display = 'flex';

        const orgName = this.currentUser?.organizacion || 'Organización';
        const initials = orgName
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 3);

        orgTextLogo.textContent = initials;
        orgTextLogo.title = orgName;
    }

    updateUserMenuInfo() {
        const userName = document.getElementById('userName');
        if (userName) userName.textContent = this.currentUser.nombreCompleto || 'Usuario';

        const userRole = document.getElementById('userRole');
        if (userRole) {
            const rol = this.currentUser.rol || 'colaborador';
            userRole.textContent = rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
        }

        const userEmail = document.getElementById('userEmail');
        if (userEmail) userEmail.textContent = this.currentUser.correoElectronico || 'No especificado';

        const userOrganization = document.getElementById('userOrganization');
        if (userOrganization) userOrganization.textContent = this.currentUser.organizacion || 'Sin organización';

        const userProfileImg = document.getElementById('userProfileImg');
        const profilePlaceholder = document.getElementById('profilePlaceholder');

        if (userProfileImg && profilePlaceholder) {
            if (this.currentUser.fotoUsuario && this.currentUser.fotoUsuario.length > 10) {
                userProfileImg.src = this.currentUser.fotoUsuario;
                userProfileImg.style.display = 'block';
                profilePlaceholder.style.display = 'none';
                userProfileImg.alt = `Foto de ${this.currentUser.nombreCompleto}`;

                userProfileImg.onerror = (e) => {
                    this.showProfilePlaceholder();
                };
            } else {
                this.showProfilePlaceholder();
            }
        }
    }

    showProfilePlaceholder() {
        const userProfileImg = document.getElementById('userProfileImg');
        const profilePlaceholder = document.getElementById('profilePlaceholder');

        if (!userProfileImg || !profilePlaceholder) return;

        userProfileImg.style.display = 'none';
        profilePlaceholder.style.display = 'flex';

        const placeholderText = profilePlaceholder.querySelector('span');
        if (placeholderText && this.currentUser?.nombreCompleto) {
            const initials = this.currentUser.nombreCompleto
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
            placeholderText.textContent = initials;
        }
    }

    setupEditProfileLink() {
        const editProfileIcon = document.getElementById('editProfileIcon');
        if (editProfileIcon) {
            editProfileIcon.href = '/users/colaborador/perfil/perfil.html';
        }
    }

    setupFunctionalities() {
        this.setupMenu();
        this.setupScroll();
        this.loadFontAwesome();
        this.setupUserDropdown();
        this.setupHerramientasDropdown();
        this.loadOrbitronFont();
        this.setupLogout();
        this._configurarNotificacionesDropdown();
    }

    setupMenu() {
        const hamburgerBtn = document.getElementById('navbarHamburger');
        const mainMenu = document.getElementById('navbarMainMenu');
        const overlay = document.getElementById('navbarMobileOverlay');

        if (!hamburgerBtn || !mainMenu || !overlay) return;

        const toggleMenu = () => {
            this.isMenuOpen = !this.isMenuOpen;

            mainMenu.classList.toggle('active', this.isMenuOpen);
            hamburgerBtn.classList.toggle('active', this.isMenuOpen);
            overlay.classList.toggle('active', this.isMenuOpen);
            document.body.classList.toggle('menu-open', this.isMenuOpen);

            if (!this.isMenuOpen) {
                if (this.isAdminDropdownOpen) {
                    this.toggleUserDropdown(false);
                }
                if (this.isHerramientasDropdownOpen) {
                    this.toggleHerramientasDropdown(false);
                }
            }
        };

        const closeMenu = () => {
            if (this.isMenuOpen) {
                this.isMenuOpen = false;
                mainMenu.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                overlay.classList.remove('active');
                document.body.classList.remove('menu-open');

                if (this.isAdminDropdownOpen) {
                    this.toggleUserDropdown(false);
                }
                if (this.isHerramientasDropdownOpen) {
                    this.toggleHerramientasDropdown(false);
                }
            }
        };

        hamburgerBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMenu);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) closeMenu();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && this.isMenuOpen) closeMenu();
        });
    }

    setupHerramientasDropdown() {
        const dropdownBtn = document.getElementById('herramientasDropdownBtn');
        const dropdownOptions = document.getElementById('herramientasDropdownOptions');

        if (!dropdownBtn || !dropdownOptions) return;

        const toggleDropdown = () => {
            // Cerrar el otro dropdown si está abierto
            if (this.isAdminDropdownOpen) {
                this.toggleUserDropdown(false);
            }
            
            this.isHerramientasDropdownOpen = !this.isHerramientasDropdownOpen;
            this.toggleHerramientasDropdown(this.isHerramientasDropdownOpen);
        };

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) &&
                !dropdownOptions.contains(e.target) &&
                this.isHerramientasDropdownOpen) {
                this.toggleHerramientasDropdown(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isHerramientasDropdownOpen) {
                this.toggleHerramientasDropdown(false);
            }
        });

        const options = dropdownOptions.querySelectorAll('.herramientas-dropdown-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                setTimeout(() => {
                    this.toggleHerramientasDropdown(false);
                }, 100);
            });
        });
    }

    setupUserDropdown() {
        const dropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownOptions = document.getElementById('userDropdownOptions');

        if (!dropdownBtn || !dropdownOptions) return;

        const toggleDropdown = () => {
            // Cerrar el otro dropdown si está abierto
            if (this.isHerramientasDropdownOpen) {
                this.toggleHerramientasDropdown(false);
            }
            
            this.isAdminDropdownOpen = !this.isAdminDropdownOpen;
            this.toggleUserDropdown(this.isAdminDropdownOpen);
        };

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) &&
                !dropdownOptions.contains(e.target) &&
                this.isAdminDropdownOpen) {
                this.toggleUserDropdown(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isAdminDropdownOpen) {
                this.toggleUserDropdown(false);
            }
        });
    }

    setupLogout() {
        const logoutOption = document.getElementById('logoutOption');

        if (!logoutOption) return;

        logoutOption.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const confirmLogout = await this.showLogoutConfirmation();

            if (confirmLogout) {
                await this.performLogout();
            }
        });
    }

    async showLogoutConfirmation() {
        return new Promise((resolve) => {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '¿Cerrar sesión?',
                    text: '¿Estás seguro de que deseas salir del sistema?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, cerrar sesión',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    reverseButtons: true
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            } else {
                const confirmed = confirm('¿Estás seguro de que deseas cerrar sesión?');
                resolve(confirmed);
            }
        });
    }

    async performLogout() {
        try {
            this.clearAllStorage();
            await this.showLogoutSuccessMessage();
            this.redirectToLogin();

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            this.clearAllStorage();
            this.redirectToLogin();
        }
    }

    clearAllStorage() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            this.clearSessionCookies();
            this.clearIndexedDB();
        } catch (error) {
            console.warn('⚠️ Error al limpiar almacenamiento:', error);
        }
    }

    clearSessionCookies() {
        try {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

                if (name.includes('session') || name.includes('auth') || name.includes('firebase')) {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                }
            }
        } catch (error) {
            console.warn('⚠️ Error al limpiar cookies:', error);
        }
    }

    async clearIndexedDB() {
        try {
            const databases = ['firebaseLocalStorageDb', 'firestore', 'centinela-db'];

            for (const dbName of databases) {
                try {
                    await indexedDB.deleteDatabase(dbName);
                } catch (e) { }
            }
        } catch (error) {
            console.warn('⚠️ Error al limpiar indexedDB:', error);
        }
    }

    async showLogoutSuccessMessage() {
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                icon: 'success',
                title: 'Sesión cerrada',
                text: 'Has cerrado sesión exitosamente. Redirigiendo...',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true
            });
        }
    }

    redirectToLogin() {
        const timestamp = new Date().getTime();
        const loginUrl = `/usuarios/visitantes/inicioSesion/inicioSesion.html?logout=true&timestamp=${timestamp}&nocache=1`;
        window.location.href = loginUrl;
    }

    toggleUserDropdown(show) {
        const dropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownOptions = document.getElementById('userDropdownOptions');

        if (dropdownBtn && dropdownOptions) {
            dropdownBtn.classList.toggle('active', show);
            dropdownOptions.classList.toggle('active', show);
            this.isAdminDropdownOpen = show;
        }
    }

    toggleHerramientasDropdown(show) {
        const dropdownBtn = document.getElementById('herramientasDropdownBtn');
        const dropdownOptions = document.getElementById('herramientasDropdownOptions');

        if (dropdownBtn && dropdownOptions) {
            dropdownBtn.classList.toggle('active', show);
            dropdownOptions.classList.toggle('active', show);
            this.isHerramientasDropdownOpen = show;
        }
    }

    setupScroll() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }
    }

    loadOrbitronFont() {
        if (!document.querySelector('link[href*="orbitron"]')) {
            const orbitronLink = document.createElement('link');
            orbitronLink.rel = 'stylesheet';
            orbitronLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap';
            document.head.appendChild(orbitronLink);
        }
    }
}

new NavbarComplete();