class NavbarComplete {
    constructor() {
        this.isMenuOpen = false;
        this.isAdminDropdownOpen = false;
        this.currentUser = null;
        this.userRole = null;
        this.init();      
    }

    // Inicializa el navbar evitando duplicados
    init() {
        if (window.NavbarCompleteLoaded) {
            console.log('🔄 Navbar ya cargado');
            return;
        }

        window.NavbarCompleteLoaded = true; 

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            setTimeout(() => this.setup(), 100);
        }
    }

    // Configuración principal del navbar
    async setup() {
        try {
            this.removeOriginalNavbar();
            this.createNavbar(); 
            this.setupFunctionalities(); 
            this.loadUserDataFromLocalStorage();
            this.updateNavbarWithUserData();
            console.log('✅ Navbar completo inicializado con datos del usuario');
        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Remueve el navbar original si existe
    removeOriginalNavbar() {
        const originalHeader = document.getElementById('main-header');
        originalHeader?.remove(); 
    }

    // Crea el navbar completo
    createNavbar() {
        this.addStyles();   
        this.insertHTML();       
        this.adjustBodyPadding();
    }

    // Agrega todos los estilos CSS necesarios
    addStyles() {
        if (document.getElementById('navbar-complete-styles')) return;

        const styles = `
            /* Navbar fijo en la parte superior */
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
            
            /* Efecto al hacer scroll */
            #complete-navbar.scrolled {
                background-color: var(--navbar-scrolled-bg);
                box-shadow: var(--navbar-scrolled-shadow);
            }
            
            /* Sección superior */
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
            
            /* Contenedor izquierdo para el logo */
            .navbar-left-container {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 10px;
                flex: 0 0 auto;
                margin-right: auto;
            }
            
            /* Logo del sistema */
            .navbar-logo-link {
                display: flex;
                align-items: center;
                text-decoration: none;
                z-index: 1003;
                height: 70px;
                flex: 0 0 auto;
            }

            /* Contenedor para logo circular */
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

            /* Todos los logos en círculo perfecto */
            .navbar-logo-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform var(--transition-default);
                display: block;
            }

            /* Efecto hover en el logo */
            .navbar-logo-link:hover .logo-circle-container {
                transform: scale(1.05);
                border-color: var(--color-accent-secondary);
            }
            
            /* BARRA SEPARADORA ENTRE LOGOS */
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
            
            /* Logo de organización cuando es texto */
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
            
            /* Título "CENTINELA" centrado */
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
            
            /* Contenedor derecho para el botón hamburguesa */
            .navbar-right-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex: 0 0 auto;
                margin-left: auto;
            }
            
            /* Botón hamburguesa */
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
            
            /* Líneas del botón hamburguesa */
            .hamburger-line {
                display: block;
                width: 25px;
                height: 3px;
                background-color: var(--navbar-text);
                margin: 3px 0;
                border-radius: var(--border-radius-small);
                transition: var(--transition-default);
            }
            
            /* Animación a "X" cuando está activo */
            .navbar-hamburger-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(6.3px, 6.3px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(6.3px, -6.3px);
            }
            
            /* Menú lateral */
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
            }
            
            /* Cuando el menú está activo (visible) */
            .navbar-main-menu.active {
                right: 0;
                visibility: visible;
                opacity: 1;
            }
            
            /* Sección superior del menú: Perfil del usuario */
            .admin-profile-section {
                padding: 30px 25px 20px;
                background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-primary) 100%);
                color: var(--color-text-primary);
                border-bottom: 1px solid var(--color-border-light);
                text-align: center;
                position: relative;
            }
            
            /* Contenedor para la foto de perfil con lápiz */
            .profile-photo-container {
                position: relative;
                width: 120px;
                height: 120px;
                margin: 0 auto 20px;
                display: inline-block;
            }
            
            /* Círculo de imagen del usuario */
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

            /* Placeholder para foto cuando no hay imagen */
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
            
            /* Ícono de lápiz para editar */
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
            
            /* Información del usuario */
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
            
            /* Sección de navegación */
            .nav-section {
                padding: 20px 25px;
                border-bottom: 1px solid var(--color-border-light);
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
            
            .nav-items-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .nav-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 15px;
                border-radius: var(--border-radius-small);
                transition: var(--transition-default);
                cursor: pointer;
                text-decoration: none;
                color: var(--color-text-primary);
            }
            
            .nav-item:hover {
                background-color: var(--color-bg-secondary);
            }
            
            .nav-item i {
                width: 20px;
                text-align: center;
                font-size: 16px;
            }
            
            .nav-item-text {
                font-size: 15px;
                flex-grow: 1;
                font-family: 'Orbitron', sans-serif;
            }
            
            .nav-item-percentage {
                font-size: 14px;
                font-weight: 600;
                color: var(--color-accent-primary);
                font-family: 'Orbitron', sans-serif;
                background-color: var(--color-bg-tertiary);
                padding: 2px 8px;
                border-radius: 12px;
                min-width: 20px;
                text-align: center;
            }
            
            /* Sección de espacios vacíos */
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
            
            /* Sección de opciones de usuario */
            .admin-options-section {
                padding: 20px 25px;
                border-top: 1px solid var(--color-border-light);
                margin-top: auto;
            }
            
            /* Botón desplegable */
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
            
            /* Contenedor de opciones expandido */
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
            
            /* Overlay para cerrar el menú */
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
            
            /* Responsive para tablet */
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
            }
            
            /* Responsive para móvil */
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
                
                .navbar-hamburger-btn {
                    width: 36px;
                    height: 36px;
                }
                
                .hamburger-line {
                    width: 22px;
                    height: 2.5px;
                }
            }
            
            /* Para pantallas muy pequeñas */
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
            }
            
            /* Para pantallas extra grandes */
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

    // Inserta la estructura HTML del navbar
    insertHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';
        navbar.innerHTML = `
            <!-- Sección superior con logo, título y botón hamburguesa -->
            <div class="navbar-top-section">
                <div class="navbar-left-container">
                    <!-- Logo del sistema Centinela -->
                    <a href="/users/colaborador/dashboardColaborador/dashboardColaborador.html" class="navbar-logo-link">
                        <div class="logo-circle-container">
                            <img src="/assets/images/logo.png" alt="Centinela Logo" class="navbar-logo-img">
                        </div>
                    </a>
                    
                    <!-- BARRA SEPARADORA ENTRE LOGOS -->
                    <div class="logo-separator"></div>
                    
                    <!-- Logo de la organización -->
                    <a href="/users/colaborador/dashboardColaborador/dashboardColaborador.html" class="navbar-logo-link" id="orgLogoLink">
                        <div class="logo-circle-container" id="orgLogoContainer">
                            <img src="/assets/images/logo.png" alt="Logo Organización" 
                                 class="navbar-logo-img" id="orgLogoImg">
                            <div class="org-text-logo" id="orgTextLogo" style="display: none;">ORG</div>
                        </div>
                    </a>
                </div>
                
                <!-- Título CENTRADO -->
                <h1 class="navbar-title">CENTINELA</h1>
                
                <div class="navbar-right-container">
                    <!-- Botón hamburguesa -->
                    <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>
            </div>
            
            <!-- Overlay para cerrar menú en móvil -->
            <div class="navbar-mobile-overlay" id="navbarMobileOverlay"></div>
            
            <!-- Menú lateral -->
            <div class="navbar-main-menu" id="navbarMainMenu">
                
                <!-- Sección superior: Perfil del usuario -->
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
                
                <!-- SECCIÓN DE MENÚ - Mis Herramientas -->
                <div class="nav-section">
                    <div class="nav-section-title">
                        <i class="fa-solid fa-briefcase"></i>
                        <span>Mis Herramientas</span>
                    </div>
                    <div class="nav-items-container">
                        <a href="/users/colaborador/mis-tareas/mis-tareas.html" class="nav-item" id="misTareasBtn">
                            <i class="fa-solid fa-check-circle"></i>
                            <span class="nav-item-text">Mis Tareas</span>
                            <span class="nav-item-percentage" id="tareasPendientes">0</span>
                        </a>
                        <a href="/users/colaborador/proyectos/proyectos.html" class="nav-item" id="proyectosBtn">
                            <i class="fa-solid fa-project-diagram"></i>
                            <span class="nav-item-text">Proyectos</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--color-accent-primary);"></i>
                        </a>
                        <a href="/users/colaborador/calendario/calendario.html" class="nav-item" id="calendarioBtn">
                            <i class="fa-solid fa-calendar"></i>
                            <span class="nav-item-text">Calendario</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--color-accent-primary);"></i>
                        </a>
                        <a href="/users/colaborador/notificaciones/notificaciones.html" class="nav-item" id="notificacionesBtn">
                            <i class="fa-solid fa-bell"></i>
                            <span class="nav-item-text">Notificaciones</span>
                            <span class="nav-item-percentage" id="notificacionesNoLeidas">0</span>
                        </a>
                    </div>
                </div>
                
                <!-- Sección de espacios vacíos -->
                <div class="menu-section">
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                    <div class="empty-menu-item"></div>
                </div>
                
                <!-- Sección de opciones de usuario -->
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

    // Ajusta el padding del body
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

    // Carga los datos del usuario desde localStorage
    loadUserDataFromLocalStorage() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn) {
                console.warn('⚠️ No hay sesión activa en localStorage');
                return false;
            }
            
            console.log('🔍 VERIFICANDO localStorage:');
            console.log('   - isLoggedIn:', localStorage.getItem('isLoggedIn'));
            console.log('   - userData:', localStorage.getItem('userData') ? '✅ Existe' : '❌ No existe');
            console.log('   - userFoto:', localStorage.getItem('userFoto') ? '✅ Existe' : '❌ No existe');
            console.log('   - userFoto length:', localStorage.getItem('userFoto') ? localStorage.getItem('userFoto').length : 0);
            console.log('   - organizacionLogo:', localStorage.getItem('organizacionLogo') ? '✅ Existe' : '❌ No existe');
            console.log('   - organizacionLogo length:', localStorage.getItem('organizacionLogo') ? localStorage.getItem('organizacionLogo').length : 0);
            
            const userDataString = localStorage.getItem('userData');
            
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                
                console.log('📦 Contenido de userData:', {
                    tieneFotoUsuario: !!userData.fotoUsuario,
                    fotoUsuarioLength: userData.fotoUsuario ? userData.fotoUsuario.length : 0,
                    tieneFotoOrganizacion: !!userData.fotoOrganizacion,
                    fotoOrganizacionLength: userData.fotoOrganizacion ? userData.fotoOrganizacion.length : 0
                });
                
                let fotoUsuario = null;
                let fotoOrganizacion = null;
                
                if (userData.fotoUsuario && userData.fotoUsuario.length > 10) {
                    fotoUsuario = userData.fotoUsuario;
                    console.log('📸 Usando fotoUsuario de userData');
                } else {
                    const userFotoKey = localStorage.getItem('userFoto');
                    if (userFotoKey && userFotoKey.length > 10) {
                        fotoUsuario = userFotoKey;
                        console.log('📸 Usando userFoto de key individual');
                    }
                }
                
                if (userData.fotoOrganizacion && userData.fotoOrganizacion.length > 10) {
                    fotoOrganizacion = userData.fotoOrganizacion;
                    console.log('🏢 Usando fotoOrganizacion de userData');
                } else {
                    const orgLogoKey = localStorage.getItem('organizacionLogo');
                    if (orgLogoKey && orgLogoKey.length > 10) {
                        fotoOrganizacion = orgLogoKey;
                        console.log('🏢 Usando organizacionLogo de key individual');
                    }
                }
                
                this.currentUser = {
                    id: userData.id || localStorage.getItem('userId'),
                    uid: userData.id,
                    correoElectronico: userData.email || localStorage.getItem('userEmail'),
                    nombreCompleto: userData.nombreCompleto || localStorage.getItem('userNombre'),
                    cargo: userData.cargo || localStorage.getItem('userRole'),
                    organizacion: userData.organizacion || localStorage.getItem('userOrganizacion'),
                    organizacionCamelCase: userData.organizacionCamelCase || localStorage.getItem('userOrganizacionCamelCase'),
                    fotoUsuario: fotoUsuario,
                    fotoOrganizacion: fotoOrganizacion,
                    status: userData.status || 'activo',
                    verificado: userData.verificado || true,
                    ultimoAcceso: userData.ultimoAcceso || userData.sessionStart
                };
                
                console.log('✅ Usuario cargado DESDE localStorage CON IMÁGENES:', {
                    nombre: this.currentUser.nombreCompleto,
                    email: this.currentUser.correoElectronico,
                    cargo: this.currentUser.cargo,
                    organizacion: this.currentUser.organizacion,
                    tieneFotoUsuario: !!this.currentUser.fotoUsuario,
                    fotoUsuarioLength: this.currentUser.fotoUsuario ? this.currentUser.fotoUsuario.length : 0,
                    tieneFotoOrganizacion: !!this.currentUser.fotoOrganizacion,
                    fotoOrganizacionLength: this.currentUser.fotoOrganizacion ? this.currentUser.fotoOrganizacion.length : 0
                });
                
                this.userRole = this.currentUser.cargo?.toLowerCase() || 'colaborador';
                return true;
            }
            
            this.currentUser = {
                id: localStorage.getItem('userId'),
                correoElectronico: localStorage.getItem('userEmail'),
                nombreCompleto: localStorage.getItem('userNombre'),
                cargo: localStorage.getItem('userRole'),
                organizacion: localStorage.getItem('userOrganizacion'),
                organizacionCamelCase: localStorage.getItem('userOrganizacionCamelCase'),
                fotoUsuario: localStorage.getItem('userFoto') || null,
                fotoOrganizacion: localStorage.getItem('organizacionLogo') || null
            };
            
            if (this.currentUser.nombreCompleto && this.currentUser.cargo) {
                console.log('✅ Usuario cargado desde claves individuales localStorage');
                this.userRole = this.currentUser.cargo?.toLowerCase() || 'colaborador';
                return true;
            }
            
            console.warn('⚠️ No se encontraron datos de usuario en localStorage');
            return false;
            
        } catch (error) {
            console.error('❌ Error al cargar usuario desde localStorage:', error);
            return false;
        }
    }

    // Actualiza el navbar con los datos del usuario
    updateNavbarWithUserData() {
        if (!this.currentUser) {
            console.log('⚠️ No hay datos de usuario para mostrar');
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

        console.log('🔄 Actualizando navbar con datos del usuario...');

        this.updateOrganizationLogo();
        this.updateUserMenuInfo();
        this.setupEditProfileLink();
    }

    // Actualiza el logo de la organización
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
            
            console.log('🖼️ Logo de organización cargado desde localStorage (Base64) - Length:', this.currentUser.fotoOrganizacion.length);
            
            organizationLogoImg.onload = () => {
                console.log('✅ Logo de organización cargado exitosamente');
            };
            organizationLogoImg.onerror = (e) => {
                console.error('❌ Error al cargar logo de organización:', e);
                this.showOrgTextLogo();
            };
        } else {
            this.showOrgTextLogo();
        }

        orgLogoLink.href = '/users/colaborador/dashboardColaborador/dashboardColaborador.html';
    }

    // Muestra iniciales cuando no hay logo
    showOrgTextLogo() {
        const organizationLogoImg = document.getElementById('orgLogoImg');
        const orgTextLogo = document.getElementById('orgTextLogo');
        
        if (!organizationLogoImg || !orgTextLogo) return;
        
        console.log('📝 Usando iniciales para logo de organización');
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

    // Actualiza la información del usuario
    updateUserMenuInfo() {
        const userName = document.getElementById('userName');
        if (userName) userName.textContent = this.currentUser.nombreCompleto || 'Usuario';

        const userRole = document.getElementById('userRole');
        if (userRole) userRole.textContent = 'Colaborador';

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
                
                console.log('🖼️ Foto de perfil cargada desde localStorage (Base64) - Length:', this.currentUser.fotoUsuario.length);
                
                userProfileImg.onload = () => {
                    console.log('✅ Foto de perfil cargada exitosamente');
                };
                userProfileImg.onerror = (e) => {
                    console.error('❌ Error al cargar foto de perfil:', e);
                    this.showProfilePlaceholder();
                };
            } else {
                this.showProfilePlaceholder();
            }
        }
    }

    // Muestra placeholder cuando no hay foto
    showProfilePlaceholder() {
        const userProfileImg = document.getElementById('userProfileImg');
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        
        if (!userProfileImg || !profilePlaceholder) return;
        
        console.log('👤 Usando placeholder para foto de perfil');
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

    // Configura el enlace de edición de perfil
    setupEditProfileLink() {
        const editProfileIcon = document.getElementById('editProfileIcon');
        if (editProfileIcon) {
            editProfileIcon.href = '/users/colaborador/perfil/perfil.html';
        }
    }

    // Capitaliza primera letra
    capitalizeFirst(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    // Configura todas las funcionalidades
    setupFunctionalities() {
        this.setupMenu();  
        this.setupScroll();
        this.loadFontAwesome();
        this.setupUserDropdown();
        this.loadOrbitronFont();
        this.setupLogout();
    }

    // Configura el menú hamburguesa
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
            
            if (!this.isMenuOpen && this.isAdminDropdownOpen) {
                this.toggleUserDropdown(false);
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

    // Configura el dropdown de usuario
    setupUserDropdown() {
        const dropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownOptions = document.getElementById('userDropdownOptions');

        if (!dropdownBtn || !dropdownOptions) return;

        const toggleDropdown = () => {
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

    // Configura el cierre de sesión
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

    // Muestra confirmación para cerrar sesión
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

    // Realiza el cierre de sesión COMPLETO
    async performLogout() {
        console.log('🚪 Cerrando sesión...');
        
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

    // Limpia TODO el almacenamiento
    clearAllStorage() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            this.clearSessionCookies();
            this.clearIndexedDB();
            console.log('🗑️ Todos los datos de sesión eliminados');
        } catch (error) {
            console.warn('⚠️ Error al limpiar almacenamiento:', error);
        }
    }

    // Limpia cookies de sesión
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

    // Limpia indexedDB
    async clearIndexedDB() {
        try {
            const databases = ['firebaseLocalStorageDb', 'firestore', 'centinela-db'];
            
            for (const dbName of databases) {
                try {
                    await indexedDB.deleteDatabase(dbName);
                } catch (e) {}
            }
        } catch (error) {
            console.warn('⚠️ Error al limpiar indexedDB:', error);
        }
    }

    // Muestra mensaje de éxito al cerrar sesión
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

    // Redirige al login
    redirectToLogin() {
        const timestamp = new Date().getTime();
        const loginUrl = `/users/visitors/login/login.html?logout=true&timestamp=${timestamp}&nocache=1`;
        window.location.href = loginUrl;
    }

    // Alterna la visibilidad del dropdown
    toggleUserDropdown(show) {
        const dropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownOptions = document.getElementById('userDropdownOptions');
        
        if (dropdownBtn && dropdownOptions) {
            dropdownBtn.classList.toggle('active', show);
            dropdownOptions.classList.toggle('active', show);
            this.isAdminDropdownOpen = show;
        }
    }

    // Configura efecto al hacer scroll
    setupScroll() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // Carga Font Awesome
    loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }
    }

    // Carga la fuente Orbitron
    loadOrbitronFont() {
        if (!document.querySelector('link[href*="orbitron"]')) {
            const orbitronLink = document.createElement('link');
            orbitronLink.rel = 'stylesheet';
            orbitronLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap';
            document.head.appendChild(orbitronLink);
        }
    }
}

// Inicialización automática
new NavbarComplete();