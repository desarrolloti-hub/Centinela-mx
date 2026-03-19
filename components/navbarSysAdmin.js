// [file name]: navbarAdministrador.js
// [file path]: /components/navbarAdministrador.js

class NavbarComplete {
    constructor() {
        this.isMenuOpen = false; // Ya no se usará para el menú lateral, pero lo dejamos por si acaso.
        this.isAdminDropdownOpen = false;
        this.isAdministracionDropdownOpen = false;
        this.isIncidenciasDropdownOpen = false;
        this.currentAdmin = null;
        this.userManager = null;
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
            this.createNavbar(); // Este método ahora inserta el nuevo HTML
            this.setupFunctionalities(); // Este método ahora configura la nueva lógica

            this.loadAdminDataFromLocalStorage();
            this.updateNavbarWithAdminData();

            await this.loadAdminDataFromFirebase();
            await this._initNotificacionManager();
            await this._cargarNotificaciones();
            this._iniciarListenerNotificaciones();

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
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
        if (!this.notificacionManager || !this.currentAdmin?.id || !this.currentAdmin?.organizacionCamelCase) {
            return;
        }
        try {
            console.log('🔍 Cargando notificaciones para admin:', this.currentAdmin.id);
            this.notificaciones = await this.notificacionManager.obtenerNotificaciones(
                this.currentAdmin.id,
                this.currentAdmin.organizacionCamelCase,
                true,
                10
            );
            this.notificacionesNoLeidas = await this.notificacionManager.obtenerConteoNoLeidas(
                this.currentAdmin.id,
                this.currentAdmin.organizacionCamelCase
            );
            console.log(`📬 Notificaciones admin: ${this.notificaciones.length} (${this.notificacionesNoLeidas} no leídas)`);
            this._actualizarBadgeNotificaciones();
            this._renderizarNotificaciones();
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        }
    }

    _iniciarListenerNotificaciones() {
        if (!this.notificacionManager || !this.currentAdmin?.id || !this.currentAdmin?.organizacionCamelCase) {
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
                    <a href="/usuarios/administrador/notificaciones/notificaciones.html">Ver ${this.notificaciones.length - 5} más</a>
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
                        this.currentAdmin.id,
                        id,
                        this.currentAdmin.organizacionCamelCase
                    );
                    this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);
                    this._actualizarBadgeNotificaciones();
                }
                if (url) {
                    window.location.href = url;
                }
            });
        });
    }

    async _marcarTodasLeidas() {
        if (!this.notificacionManager || !this.currentAdmin?.id || !this.currentAdmin?.organizacionCamelCase) {
            return;
        }
        try {
            await this.notificacionManager.marcarTodasComoLeidas(
                this.currentAdmin.id,
                this.currentAdmin.organizacionCamelCase
            );
            this.notificacionesNoLeidas = 0;
            this.notificaciones = [];
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

    // [MODIFICADO] Este método ahora inserta el nuevo HTML para el menú visible
    createNavbar() {
        this.addStyles(); // Los estilos también se han modificado
        this.insertHTML();
        this.adjustBodyPadding();
    }

    // [MODIFICADO] Los estilos han sido simplificados y adaptados para el menú visible
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
                min-height: 60px; /* Un poco más alto para el menú visible */
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
            
            /* ===== NUEVA SECCIÓN: CONTENEDOR DEL MENÚ VISIBLE ===== */
            .navbar-menu-container {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-left: auto; /* Empuja el menú hacia la derecha */
                margin-right: 15px; /* Espacio antes de las notificaciones */
                flex: 0 1 auto; /* Permite que se encoja si es necesario */
            }

            /* Estilos para los enlaces del menú visible */
            .navbar-menu-link {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 15px;
                background-color: transparent;
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-medium);
                color: var(--navbar-text);
                font-size: 14px;
                font-weight: 500;
                font-family: 'Orbitron', sans-serif;
                text-decoration: none;
                transition: all 0.3s ease;
                white-space: nowrap;
            }

            .navbar-menu-link i {
                font-size: 16px;
                color: var(--color-accent-primary);
            }

            .navbar-menu-link:hover {
                background-color: var(--color-bg-secondary);
                border-color: var(--color-accent-primary);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            /* Dropdowns para el menú visible (similar a los anteriores, pero en posición absoluta) */
            .navbar-menu-item {
                position: relative;
            }

            .navbar-menu-button {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 15px;
                background-color: transparent;
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-medium);
                color: var(--navbar-text);
                font-size: 14px;
                font-weight: 500;
                font-family: 'Orbitron', sans-serif;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }

            .navbar-menu-button i:first-child {
                font-size: 16px;
                color: var(--color-accent-primary);
            }

            .navbar-menu-button i:last-child {
                font-size: 12px;
                margin-left: 5px;
            }

            .navbar-menu-button:hover {
                background-color: var(--color-bg-secondary);
                border-color: var(--color-accent-primary);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            /* Opciones del dropdown dentro del menú visible */
            .navbar-dropdown-options {
                position: absolute;
                top: 100%;
                right: 0; /* Alineado a la derecha del botón */
                min-width: 220px;
                background-color: var(--color-bg-primary);
                border-radius: var(--border-radius-medium);
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                border: 1px solid var(--color-border-light);
                z-index: 1004;
                display: none;
                margin-top: 10px;
                padding: 8px 0;
            }

            .navbar-dropdown-options.active {
                display: block;
            }

            .navbar-dropdown-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                color: var(--color-text-primary);
                text-decoration: none;
                font-size: 14px;
                font-family: 'Orbitron', sans-serif;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .navbar-dropdown-option i {
                width: 20px;
                text-align: center;
                font-size: 16px;
                color: var(--color-accent-primary);
            }

            .navbar-dropdown-option:hover {
                background-color: var(--color-bg-secondary);
                transform: translateX(5px);
            }

            /* Opción especial para cerrar sesión */
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
            
            /* ===== FIN DE NUEVAS SECCIONES ===== */
            
            .navbar-right-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex: 0 0 auto;
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
            
            /* Eliminamos los estilos del menú hamburguesa y del menú lateral */
            /* .navbar-hamburger-btn, .navbar-main-menu, .admin-profile-section, etc. ya no son necesarios */

            /* [ELIMINADO] .navbar-hamburger-btn, .navbar-main-menu, .admin-profile-section, etc. */
            
            /* Adaptaciones responsive para el nuevo menú */
            @media (max-width: 1200px) {
                .navbar-menu-link span, .navbar-menu-button span {
                    display: none; /* En pantallas medianas, ocultamos el texto y mostramos solo íconos */
                }
                .navbar-menu-link, .navbar-menu-button {
                    padding: 8px 12px;
                }
            }
            
            @media (max-width: 992px) {
                .navbar-title {
                    font-size: 22px;
                }

                body.menu-open {
                    overflow: hidden;
                }
                
                .notificaciones-dropdown {
                    width: 300px;
                    right: -50px;
                }

                /* Ajustes para el menú visible en móvil */
                .navbar-menu-container {
                    position: fixed;
                    top: 70px; /* Debajo de la barra superior */
                    left: 0;
                    width: 100%;
                    background-color: var(--navbar-scrolled-bg);
                    flex-direction: column;
                    align-items: stretch;
                    padding: 15px;
                    gap: 10px;
                    margin: 0;
                    border-top: 1px solid var(--color-border-light);
                    box-shadow: 0 5px 10px rgba(0,0,0,0.1);
                    display: none; /* Oculto por defecto en móvil */
                    z-index: 999;
                }

                .navbar-menu-container.active {
                    display: flex; /* Se muestra cuando se activa (con un botón de menú) */
                }

                .navbar-menu-link, .navbar-menu-button {
                    justify-content: flex-start;
                    padding: 12px 15px;
                }

                .navbar-menu-link span, .navbar-menu-button span {
                    display: inline; /* Mostramos el texto en móvil */
                }

                /* Agregamos un botón de menú para móvil */
                .navbar-mobile-menu-btn {
                    display: flex !important; /* Mostramos el botón de hamburguesa solo en móvil */
                }

                .navbar-dropdown-options {
                    position: static;
                    box-shadow: none;
                    border: 1px solid var(--color-border-light);
                    margin-top: 5px;
                    margin-left: 20px;
                    width: auto;
                }
            }
            
            @media (max-width: 768px) {
                .navbar-top-section {
                    padding: 5px 15px;
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

    // [MODIFICADO] Este método ahora genera el HTML con el menú visible
    insertHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';
        navbar.innerHTML = /*html*/`
            <div class="navbar-top-section">
                <div class="navbar-left-container">
                    <a href="/usuarios/administrador/panelControl/panelControl.html" class="navbar-logo-link">
                        <div class="logo-circle-container">
                            <img src="/assets/images/logo.png" alt="Centinela Logo" class="navbar-logo-img">
                        </div>
                    </a>

                    <div class="logo-separator"></div>

                    <a href="/usuarios/administrador/panelControl/panelControl.html" class="navbar-logo-link" id="orgLogoLink">
                        <div class="logo-circle-container" id="orgLogoContainer">
                            <img src="/assets/images/logo.png" alt="Logo Organización" 
                                 class="navbar-logo-img" id="orgLogoImg">
                            <div class="org-text-logo" id="orgTextLogo" style="display: none;">ORG</div>
                        </div>
                    </a>
                </div>

                <h1 class="navbar-title">CENTINELA</h1>

                <!-- ===== NUEVO: CONTENEDOR DEL MENÚ VISIBLE ===== -->
                <div class="navbar-menu-container" id="navbarMenuContainer">
                    
                    <!-- Dropdown de Gestionar -->
                    <div class="navbar-menu-item">
                        <button class="navbar-menu-button" id="administracionMenuBtn">
                            <i class="fa-solid fa-gears"></i>
                            <span>Gestionar</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="navbar-dropdown-options" id="administracionMenuOptions">
                            <a href="/usuarios/administrador/areas/areas.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-map"></i>
                                <span>Áreas</span>
                            </a>
                            <a href="/usuarios/administrador/categorias/categorias.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-tags"></i>
                                <span>Categorías</span>
                            </a>
                            <a href="/usuarios/administrador/sucursales/sucursales.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-store"></i>
                                <span>Sucursales</span>
                            </a>
                            <a href="/usuarios/administrador/regiones/regiones.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>Regiones</span>
                            </a>
                            <a href="/usuarios/administrador/permisos/permisos.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-lock"></i>
                                <span>Permisos</span>
                            </a>
                            <a href="/usuarios/administrador/usuarios/usuarios.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-users-gear"></i>
                                <span>Usuarios</span>
                            </a>
                        </div>
                    </div>

                    <!-- Dropdown de Incidencias -->
                    <div class="navbar-menu-item">
                        <button class="navbar-menu-button" id="incidenciasMenuBtn">
                            <i class="fa-solid fa-exclamation-triangle"></i>
                            <span>Incidencias</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="navbar-dropdown-options" id="incidenciasMenuOptions">
                            <a href="/usuarios/administrador/incidencias/incidencias.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-list"></i>
                                <span>Lista de Incidencias</span>
                            </a>
                            <a href="/usuarios/administrador/crearIncidencias/crearIncidencias.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-plus-circle"></i>
                                <span>Crear Incidencia</span>
                            </a>
                        </div>
                    </div>

                    <!-- Enlace directo a Bitácora -->
                    <a href="/usuarios/administrador/bitacoraActividades/bitacoraActividades.html" class="navbar-menu-link">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        <span>Bitácora</span>
                    </a>

                    <!-- Dropdown de Configuración -->
                    <div class="navbar-menu-item">
                        <button class="navbar-menu-button" id="adminMenuBtn">
                            <i class="fa-solid fa-user-cog"></i>
                            <span>Configuración</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="navbar-dropdown-options" id="adminMenuOptions">
                            <a href="/usuarios/administrador/administradorTemas/administradorTemas.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-palette"></i>
                                <span>Personalización</span>
                            </a>
                            <a href="#" class="navbar-dropdown-option logout-option" id="logoutOption">
                                <i class="fa-solid fa-right-from-bracket"></i>
                                <span>Cerrar Sesión</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="navbar-right-container">
                    <!-- Botón de menú para móvil (visible solo en pantallas pequeñas) -->
                    <button class="navbar-hamburger-btn navbar-mobile-menu-btn" id="navbarMobileMenuBtn" style="display: none;" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>

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
                                <a href="/usuarios/administrador/notificaciones/notificaciones.html">Ver todas</a>
                            </div>
                        </div>
                    </div>

                    <!-- Perfil de administrador (ahora como ícono con dropdown) -->
                    <div class="navbar-menu-item">
                        <button class="navbar-menu-button" id="profileMenuBtn" style="padding: 5px 10px;">
                            <div class="profile-mini-container" style="width: 30px; height: 30px; border-radius: 50%; overflow: hidden; border: 2px solid var(--color-accent-primary);">
                                <img src="/assets/images/logo.png" alt="Perfil" id="profileMiniImg" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                                <div id="profileMiniPlaceholder" style="display: none; width: 100%; height: 100%; background-color: var(--color-accent-primary); color: white; align-items: center; justify-content: center; font-weight: bold;">AD</div>
                            </div>
                            <i class="fa-solid fa-chevron-down" style="margin-left: 5px;"></i>
                        </button>
                        <div class="navbar-dropdown-options" id="profileMenuOptions" style="right: 0; left: auto; min-width: 200px;">
                            <div style="padding: 15px; border-bottom: 1px solid var(--color-border-light);">
                                <div style="font-weight: 600; color: var(--color-text-primary);" id="profileMenuName">Cargando...</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);" id="profileMenuEmail">cargando@email.com</div>
                                <div style="font-size: 12px; color: var(--color-accent-primary); margin-top: 5px;" id="profileMenuOrg"></div>
                            </div>
                            <a href="/usuarios/administrador/editarAdministrador/editarAdministrador.html" class="navbar-dropdown-option">
                                <i class="fa-solid fa-user-edit"></i>
                                <span>Editar Perfil</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Overlay para móvil (ya no es necesario, pero lo dejamos por si acaso) -->
            <div class="navbar-mobile-overlay" id="navbarMobileOverlay" style="display: none;"></div>
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

    loadAdminDataFromLocalStorage() {
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

                this.currentAdmin = {
                    id: userData.id || localStorage.getItem('userId'),
                    uid: userData.id,
                    correoElectronico: userData.email || localStorage.getItem('userEmail'),
                    nombreCompleto: userData.nombreCompleto || localStorage.getItem('userNombre'),
                    rol: userData.rol || localStorage.getItem('userRole'),
                    organizacion: userData.organizacion || localStorage.getItem('userOrganizacion'),
                    organizacionCamelCase: userData.organizacionCamelCase || localStorage.getItem('userOrganizacionCamelCase'),
                    fotoUsuario: fotoUsuario,
                    fotoOrganizacion: fotoOrganizacion,
                    status: userData.status || 'activo',
                    verificado: userData.verificado || true,
                    ultimoAcceso: userData.ultimoAcceso || userData.sessionStart
                };

                return true;
            }

            this.currentAdmin = {
                id: localStorage.getItem('userId'),
                correoElectronico: localStorage.getItem('userEmail'),
                nombreCompleto: localStorage.getItem('userNombre'),
                rol: localStorage.getItem('userRole'),
                organizacion: localStorage.getItem('userOrganizacion'),
                organizacionCamelCase: localStorage.getItem('userOrganizacionCamelCase'),
                fotoUsuario: localStorage.getItem('userFoto') || null,
                fotoOrganizacion: localStorage.getItem('organizacionLogo') || null
            };

            if (this.currentAdmin.nombreCompleto && this.currentAdmin.rol) {
                return true;
            }

            return false;

        } catch (error) {
            return false;
        }
    }

    async loadAdminDataFromFirebase() {
        try {
            const { UserManager } = await import('/clases/user.js');
            this.userManager = new UserManager();

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (this.userManager.currentUser) {
                const firebaseUser = this.userManager.currentUser;

                let needsUpdate = false;

                if (!this.currentAdmin) {
                    needsUpdate = true;
                } else {
                    if (firebaseUser.nombreCompleto !== this.currentAdmin.nombreCompleto) needsUpdate = true;
                    if (firebaseUser.fotoUsuario !== this.currentAdmin.fotoUsuario) needsUpdate = true;
                    if (firebaseUser.fotoOrganizacion !== this.currentAdmin.fotoOrganizacion) needsUpdate = true;
                    if (firebaseUser.organizacion !== this.currentAdmin.organizacion) needsUpdate = true;
                    if (firebaseUser.correoElectronico !== this.currentAdmin.correoElectronico) needsUpdate = true;
                    if (firebaseUser.rol !== this.currentAdmin.rol) needsUpdate = true;
                }

                if (needsUpdate) {
                    this.currentAdmin = {
                        ...this.currentAdmin,
                        ...firebaseUser,
                        rol: firebaseUser.rol
                    };

                    this.updateNavbarWithAdminData();
                    this.updateLocalStorageFromFirebase(firebaseUser);
                }
            }

        } catch (error) {
        }
    }

    updateLocalStorageFromFirebase(userData) {
        try {
            const currentUserData = JSON.parse(localStorage.getItem('userData') || '{}');
            const updatedUserData = {
                ...currentUserData,
                id: userData.id,
                uid: userData.id,
                email: userData.correoElectronico,
                nombreCompleto: userData.nombreCompleto,
                rol: userData.rol,
                organizacion: userData.organizacion,
                organizacionCamelCase: userData.organizacionCamelCase,
                fotoUsuario: userData.fotoUsuario,
                fotoOrganizacion: userData.fotoOrganizacion,
                status: userData.status,
                verificado: userData.verificado,
                ultimoAcceso: userData.ultimoAcceso
            };

            localStorage.setItem('userData', JSON.stringify(updatedUserData));

            if (userData.fotoUsuario) localStorage.setItem('userFoto', userData.fotoUsuario);
            if (userData.fotoOrganizacion) localStorage.setItem('organizacionLogo', userData.fotoOrganizacion);
            if (userData.nombreCompleto) localStorage.setItem('userNombre', userData.nombreCompleto);
            if (userData.correoElectronico) localStorage.setItem('userEmail', userData.correoElectronico);
            if (userData.rol) localStorage.setItem('userRole', userData.rol);
            if (userData.organizacion) localStorage.setItem('userOrganizacion', userData.organizacion);
            if (userData.organizacionCamelCase) localStorage.setItem('userOrganizacionCamelCase', userData.organizacionCamelCase);

        } catch (error) {
        }
    }

    // [MODIFICADO] Actualiza también los nuevos elementos del perfil
    updateNavbarWithAdminData() {
        if (!this.currentAdmin) {
            const adminName = document.getElementById('adminName');
            const adminEmail = document.getElementById('adminEmail');
            const adminOrganization = document.getElementById('adminOrganization');

            if (adminName) adminName.textContent = 'No autenticado';
            if (adminEmail) adminEmail.textContent = 'Inicia sesión para continuar';
            if (adminOrganization) adminOrganization.textContent = '';

            // Actualizar también los nuevos elementos del perfil
            const profileMenuName = document.getElementById('profileMenuName');
            const profileMenuEmail = document.getElementById('profileMenuEmail');
            const profileMenuOrg = document.getElementById('profileMenuOrg');
            if (profileMenuName) profileMenuName.textContent = 'No autenticado';
            if (profileMenuEmail) profileMenuEmail.textContent = 'Inicia sesión';
            if (profileMenuOrg) profileMenuOrg.textContent = '';

            return;
        }

        this.updateOrganizationLogo();
        this.updateAdminMenuInfo();
        this.setupAdminButtons();
    }

    setupAdminButtons() {
    }

    updateOrganizationLogo() {
        const organizationLogoImg = document.getElementById('orgLogoImg');
        const orgTextLogo = document.getElementById('orgTextLogo');
        const orgLogoLink = document.getElementById('orgLogoLink');
        const orgLogoContainer = document.getElementById('orgLogoContainer');

        if (!organizationLogoImg || !orgTextLogo || !orgLogoLink || !orgLogoContainer) return;

        if (this.currentAdmin?.fotoOrganizacion && this.currentAdmin.fotoOrganizacion.length > 10) {
            organizationLogoImg.src = this.currentAdmin.fotoOrganizacion;
            organizationLogoImg.alt = `Logo de ${this.currentAdmin.organizacion || 'Organización'}`;
            organizationLogoImg.style.display = 'block';
            orgTextLogo.style.display = 'none';
            organizationLogoImg.title = this.currentAdmin.organizacion || 'Organización';
            organizationLogoImg.setAttribute('data-organization', this.currentAdmin.organizacion || '');
        } else {
            this.showOrgTextLogo();
        }

        orgLogoLink.href = '/usuarios/administrador/panelControl/panelControl.html';
        orgLogoContainer.style.borderRadius = '50%';
        orgLogoContainer.style.overflow = 'hidden';
    }

    showOrgTextLogo() {
        const organizationLogoImg = document.getElementById('orgLogoImg');
        const orgTextLogo = document.getElementById('orgTextLogo');

        if (!organizationLogoImg || !orgTextLogo) return;

        organizationLogoImg.style.display = 'none';
        orgTextLogo.style.display = 'flex';

        const orgName = this.currentAdmin?.organizacion || 'Organización';
        const initials = orgName
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 3);

        orgTextLogo.textContent = initials;
        orgTextLogo.title = orgName;
    }

    // [MODIFICADO] Actualiza también los nuevos elementos del perfil
    updateAdminMenuInfo() {
        const adminName = document.getElementById('adminName');
        if (adminName) {
            adminName.textContent = this.currentAdmin?.nombreCompleto || 'Administrador';
        }

        const adminEmail = document.getElementById('adminEmail');
        if (adminEmail) {
            adminEmail.textContent = this.currentAdmin?.correoElectronico || 'No especificado';
        }

        const adminOrganization = document.getElementById('adminOrganization');
        if (adminOrganization) {
            adminOrganization.textContent = this.currentAdmin?.organizacion || 'Sin organización';
        }

        const adminProfileImg = document.getElementById('adminProfileImg');
        const profilePlaceholder = document.getElementById('profilePlaceholder');

        if (adminProfileImg && profilePlaceholder) {
            if (this.currentAdmin?.fotoUsuario && this.currentAdmin.fotoUsuario.length > 10) {
                adminProfileImg.src = this.currentAdmin.fotoUsuario;
                adminProfileImg.style.display = 'block';
                profilePlaceholder.style.display = 'none';
                adminProfileImg.alt = `Foto de ${this.currentAdmin.nombreCompleto || 'Administrador'}`;
            } else {
                this.showProfilePlaceholder();
            }
        }

        // Actualizar el mini perfil
        this.updateMiniProfile();
    }

    // [NUEVO] Actualiza el mini perfil en la barra superior
    updateMiniProfile() {
        const profileMiniImg = document.getElementById('profileMiniImg');
        const profileMiniPlaceholder = document.getElementById('profileMiniPlaceholder');
        const profileMenuName = document.getElementById('profileMenuName');
        const profileMenuEmail = document.getElementById('profileMenuEmail');
        const profileMenuOrg = document.getElementById('profileMenuOrg');

        if (profileMenuName) profileMenuName.textContent = this.currentAdmin?.nombreCompleto || 'Administrador';
        if (profileMenuEmail) profileMenuEmail.textContent = this.currentAdmin?.correoElectronico || '';
        if (profileMenuOrg) profileMenuOrg.textContent = this.currentAdmin?.organizacion || '';

        if (profileMiniImg && profileMiniPlaceholder) {
            if (this.currentAdmin?.fotoUsuario && this.currentAdmin.fotoUsuario.length > 10) {
                profileMiniImg.src = this.currentAdmin.fotoUsuario;
                profileMiniImg.style.display = 'block';
                profileMiniPlaceholder.style.display = 'none';
            } else {
                profileMiniImg.style.display = 'none';
                profileMiniPlaceholder.style.display = 'flex';
                if (this.currentAdmin?.nombreCompleto) {
                    const initials = this.currentAdmin.nombreCompleto
                        .split(' ')
                        .map(word => word.charAt(0))
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);
                    profileMiniPlaceholder.textContent = initials;
                } else {
                    profileMiniPlaceholder.textContent = 'AD';
                }
            }
        }
    }

    showProfilePlaceholder() {
        const adminProfileImg = document.getElementById('adminProfileImg');
        const profilePlaceholder = document.getElementById('profilePlaceholder');

        if (!adminProfileImg || !profilePlaceholder) return;

        adminProfileImg.style.display = 'none';
        profilePlaceholder.style.display = 'flex';

        const placeholderText = profilePlaceholder.querySelector('span');
        if (placeholderText && this.currentAdmin?.nombreCompleto) {
            const initials = this.currentAdmin.nombreCompleto
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
            placeholderText.textContent = initials;
        }
    }

    // [MODIFICADO] Configura las nuevas funcionalidades del menú visible
    setupFunctionalities() {
        // Ya no llamamos a setupMenu() porque no tenemos menú lateral
        // this.setupMenu();
        this.setupScroll();
        this.loadFontAwesome();
        this.loadOrbitronFont();

        // Configurar los nuevos dropdowns
        this.setupNewDropdown('administracionMenuBtn', 'administracionMenuOptions', 'isAdministracionDropdownOpen');
        this.setupNewDropdown('incidenciasMenuBtn', 'incidenciasMenuOptions', 'isIncidenciasDropdownOpen');
        this.setupNewDropdown('adminMenuBtn', 'adminMenuOptions', 'isAdminDropdownOpen');
        this.setupNewDropdown('profileMenuBtn', 'profileMenuOptions', 'isProfileDropdownOpen', true); // Perfil tiene su propia variable

        this.setupLogout(); // Configurar logout
        this._configurarNotificacionesDropdown();

        // Configurar menú móvil
        this.setupMobileMenu();
    }

    // [NUEVO] Configura un dropdown de manera genérica
    setupNewDropdown(buttonId, optionsId, stateVarName, isProfile = false) {
        const btn = document.getElementById(buttonId);
        const options = document.getElementById(optionsId);

        if (!btn || !options) return;

        // Inicializar estado si no existe
        if (!this[stateVarName]) {
            this[stateVarName] = false;
        }

        const toggleDropdown = (show) => {
            this[stateVarName] = show;
            btn.classList.toggle('active', show);
            options.classList.toggle('active', show);
        };

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Cerrar todos los otros dropdowns
            const dropdowns = ['administracionMenuOptions', 'incidenciasMenuOptions', 'adminMenuOptions', 'profileMenuOptions'];
            dropdowns.forEach(id => {
                if (id !== optionsId) {
                    const otherOptions = document.getElementById(id);
                    const otherBtn = document.getElementById(id.replace('Options', 'Btn'));
                    if (otherOptions && otherOptions.classList.contains('active')) {
                        otherOptions.classList.remove('active');
                        if (otherBtn) otherBtn.classList.remove('active');
                        // Actualizar estado
                        if (id === 'administracionMenuOptions') this.isAdministracionDropdownOpen = false;
                        if (id === 'incidenciasMenuOptions') this.isIncidenciasDropdownOpen = false;
                        if (id === 'adminMenuOptions') this.isAdminDropdownOpen = false;
                        if (id === 'profileMenuOptions') this.isProfileDropdownOpen = false;
                    }
                }
            });

            // Abrir/cerrar el actual
            const newState = !this[stateVarName];
            toggleDropdown(newState);
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !options.contains(e.target) && this[stateVarName]) {
                toggleDropdown(false);
            }
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this[stateVarName]) {
                toggleDropdown(false);
            }
        });

        // Opciones dentro del dropdown
        options.querySelectorAll('.navbar-dropdown-option').forEach(option => {
            option.addEventListener('click', () => {
                setTimeout(() => {
                    toggleDropdown(false);
                }, 100);
            });
        });
    }

    // [NUEVO] Configura el menú móvil (para cuando la pantalla es pequeña)
    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('navbarMobileMenuBtn');
        const menuContainer = document.getElementById('navbarMenuContainer');
        const overlay = document.getElementById('navbarMobileOverlay');

        if (!mobileMenuBtn || !menuContainer || !overlay) return;

        // Mostrar el botón solo en móvil (lo manejamos con CSS)
        mobileMenuBtn.style.display = 'none'; // Por defecto oculto, CSS lo mostrará en @media

        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = menuContainer.classList.toggle('active');
            overlay.classList.toggle('active', isActive);
            mobileMenuBtn.classList.toggle('active', isActive);
            document.body.classList.toggle('menu-open', isActive);
        });

        overlay.addEventListener('click', () => {
            menuContainer.classList.remove('active');
            overlay.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            document.body.classList.remove('menu-open');
        });

        // Cerrar al hacer clic en un enlace
        menuContainer.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    menuContainer.classList.remove('active');
                    overlay.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                    document.body.classList.remove('menu-open');
                }
            });
        });
    }

    // [ELIMINADO] setupMenu, setupAdministracionDropdown, setupIncidenciasDropdown, setupAdminDropdown, etc. ya no son necesarios

    setupScroll() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
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
                    confirmButtonText: 'CONFIRMAR',
                    cancelButtonText: 'CANCELAR'
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
            if (this.userManager && typeof this.userManager.logout === 'function') {
                await this.userManager.logout();
            } else {
                await this.signOutFirebaseDirectly();
            }

            this.clearAllStorage();

            await this.showLogoutSuccessMessage();

            this.redirectToLogin();

        } catch (error) {
            this.clearAllStorage();
            this.redirectToLogin();
        }
    }

    async signOutFirebaseDirectly() {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
                return;
            }

            const { getAuth, signOut } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js');

            const firebaseApps = typeof firebase !== 'undefined' ? firebase.apps : [];
            if (firebaseApps && firebaseApps.length > 0) {
                const auth = getAuth(firebaseApps[0]);
                await signOut(auth);
            }

        } catch (error) {
        }
    }

    clearAllStorage() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            this.clearSessionCookies();
            this.clearIndexedDB();

        } catch (error) {
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
        }
    }

    async clearIndexedDB() {
        try {
            const databases = ['firebaseLocalStorageDb', 'firestore', 'centinela-db'];

            for (const dbName of databases) {
                try {
                    await indexedDB.deleteDatabase(dbName);
                } catch (e) {
                }
            }
        } catch (error) {
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
                timerProgressBar: true,
                willClose: () => {
                    this.redirectToLogin();
                }
            });
        } else {
            alert('Sesión cerrada exitosamente. Redirigiendo...');
        }
    }

    redirectToLogin() {
        const timestamp = new Date().getTime();
        const loginUrl = `/usuarios/visitantes/inicioSesion/inicioSesion.html?logout=true&timestamp=${timestamp}&nocache=1`;
        window.location.href = loginUrl;

        setTimeout(() => {
            window.location.replace(loginUrl);
        }, 1000);
    }

    // [ELIMINADOS] toggleAdminDropdown, toggleAdministracionDropdown, toggleIncidenciasDropdown ya no son necesarios

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

