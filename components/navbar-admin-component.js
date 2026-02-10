class NavbarComplete {
    constructor() {
        this.isMenuOpen = false;
        this.isAdminDropdownOpen = false;
        this.currentAdmin = null;
        this.userManager = null;
        this.init();      
    }

    // Inicializa el navbar evitando duplicados
    init() {
        if (window.NavbarCompleteLoaded) {
            console.log('🔄 Navbar ya cargado');
            return;
        }

        window.NavbarCompleteLoaded = true; 

        // Esperar a que el DOM esté listo
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
            await this.loadAdminData(); // Cargar datos del administrador
            this.updateNavbarWithAdminData(); // Actualizar navbar con datos
            console.log('✅ Navbar completo inicializado con datos del admin');
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
            
            /* Sección superior: Logo | Título | Botón hamburguesa - MODIFICADO */
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 20px; /* Más padding horizontal */
                min-height: 50px;
                margin: 0;
                position: relative;
                width: 100%;
                box-sizing: border-box;
            }
            
            /* Contenedor izquierdo para el logo - PEGADO A LA IZQUIERDA */
            .navbar-left-container {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 10px; /* Espacio entre logos */
                flex: 0 0 auto; /* No crece, no se encoge */
                margin-right: auto; /* Empuja todo lo demás a la derecha */
            }
            
            /* Logo del sistema - CÍRCULO PERFECTO */
            .navbar-logo-link {
                display: flex;
                align-items: center;
                text-decoration: none;
                z-index: 1003;
                height: 70px;
                flex: 0 0 auto; /* Tamaño fijo */
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
                flex-shrink: 0; /* No se encoge */
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
                flex-shrink: 0; /* No se encoge */
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
                flex-shrink: 0; /* No se encoge */
            }
            
            /* Título "CENTINELA" centrado - AHORA ABSOLUTO */
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
            
            /* Contenedor derecho para el botón hamburguesa - PEGADO A LA DERECHA */
            .navbar-right-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex: 0 0 auto; /* Tamaño fijo */
                margin-left: auto; /* Empuja todo lo demás a la izquierda */
            }
            
            /* Botón hamburguesa - PEGADO A LA DERECHA */
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
                flex-shrink: 0; /* No se encoge */
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
            
            /* Sección superior del menú: Perfil del administrador */
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
            
            /* Círculo de imagen del administrador */
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
            
            /* Información del administrador */
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
            }
            
            .nav-item-priority {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 5px;
            }
            
            .priority-item {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 13px;
                font-family: 'Orbitron', sans-serif;
            }
            
            /* Sección de espacios vacíos (sin texto) */
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
            
            /* Sección de opciones de administración (al final) */
            .admin-options-section {
                padding: 20px 25px;
                border-top: 1px solid var(--color-border-light);
                margin-top: auto;
            }
            
            /* Botón desplegable de administración */
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
            
            /* Overlay para cerrar el menú (en móvil) */
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
                    /* En móviles, el título puede ajustarse */
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
                    /* En móviles pequeños, el título puede ocultarse si hay poco espacio */
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
            
            /* Para pantallas muy pequeñas (menos de 480px) */
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
                    <!-- Logo del sistema Centinela - CÍRCULO - PEGADO A LA IZQUIERDA -->
                    <a href="/users/admin/dashAdmin/dashAdmin.html" class="navbar-logo-link">
                        <div class="logo-circle-container">
                            <img src="/assets/images/logo.png" alt="Centinela Logo" class="navbar-logo-img">
                        </div>
                    </a>
                    
                    <!-- BARRA SEPARADORA ENTRE LOGOS -->
                    <div class="logo-separator"></div>
                    
                    <!-- Logo de la organización - CÍRCULO -->
                    <a href="/users/admin/dashboard/dashboard.html" class="navbar-logo-link" id="orgLogoLink">
                        <div class="logo-circle-container" id="orgLogoContainer">
                            <img src="/assets/images/logo.png" alt="Logo Organización" 
                                 class="navbar-logo-img" id="orgLogoImg">
                            <div class="org-text-logo" id="orgTextLogo" style="display: none;">ORG</div>
                        </div>
                    </a>
                </div>
                
                <!-- Título CENTRADO ABSOLUTAMENTE -->
                <h1 class="navbar-title">CENTINELA</h1>
                
                <div class="navbar-right-container">
                    <!-- Botón hamburguesa - PEGADO A LA DERECHA -->
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
                
                <!-- Sección superior: Perfil del administrador -->
                <div class="admin-profile-section">
                    <!-- Contenedor para la foto con ícono de lápiz -->
                    <div class="profile-photo-container">
                        <!-- Círculo con imagen del administrador -->
                        <div class="admin-profile-circle">
                            <img src="/assets/images/logo.png" alt="Administrador" class="admin-profile-img" id="adminProfileImg">
                            <div class="profile-placeholder" id="profilePlaceholder" style="display: none;">
                                <i class="fas fa-user"></i>
                                <span>Admin</span>
                            </div>
                        </div>
                        <!-- Ícono de lápiz para editar -->
                        <a href="/users/admin/editAdmin/editAdmin.html" class="edit-profile-icon" id="editProfileIcon">
                            <i class="fas fa-pencil-alt"></i>
                        </a>
                    </div>
                    
                    <!-- Información del administrador -->
                    <div class="admin-info">
                        <div class="admin-name" id="adminName">Cargando...</div>
                        <div class="admin-role">Administrador</div>
                        <div class="admin-email" id="adminEmail">cargando@email.com</div>
                        <div class="admin-organization" id="adminOrganization"></div>
                    </div>
                </div>
                
                <!-- SECCIÓN DE ADMINISTRACIÓN: ÁREAS Y PERSONALIZACIÓN -->
                <div class="nav-section">
                    <div class="nav-section-title">
                        <i class="fa-solid fa-gear"></i>
                        <span>Administración</span>
                    </div>
                    <div class="nav-items-container">
                        <!-- Botón para ÁREAS -->
                        <a href="/users/admin/area/area.html" class="nav-item" id="areasBtn">
                            <i class="fa-solid fa-map"></i>
                            <span class="nav-item-text">Áreas</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--color-accent-primary);"></i>
                        </a>

                        <div class="nav-items-container">
                        <!-- Botón para CATEGORIAS -->
                        <a href="/users/admin/categorias/categorias.html" class="nav-item" id="categoriasBtn">
                            <i class="fa-solid fa-tags"></i>
                            <span class="nav-item-text">Categorías</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--color-accent-primary);"></i>
                        </a>
                        
                        <!-- Botón para PERSONALIZACIÓN DE COLORES -->
                        <a href="/users/admin/themeManager/themeManager.html" class="nav-item" id="themeManagerBtn">
                            <i class="fa-solid fa-palette"></i>
                            <span class="nav-item-text">Personalización de colores</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--color-accent-primary);"></i>
                        </a>
                    </div>
                </div>
                
                <!-- Sección de espacios vacíos (reducidos a 6 espacios) -->
                <div class="menu-section">
                    <div class="empty-menu-item"></div>
                </div>
                
                <!-- Sección de opciones de administración -->
                <div class="admin-options-section">
                    <button class="admin-dropdown-btn" id="adminDropdownBtn">
                        <span>Opciones de Administración</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    
                    <div class="admin-dropdown-options" id="adminDropdownOptions">
                        <a href="#" class="admin-dropdown-option">
                            <i class="fa-solid fa-gears"></i>
                            <span>Administración</span>
                        </a>
                        <a href="/users/admin/managementUser/managementUser.html" class="admin-dropdown-option">
                            <i class="fa-solid fa-users-gear"></i>
                            <span>Gestionar Usuarios</span>
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

    // Carga los datos del administrador actual
    async loadAdminData() {
        try {
            // Importar UserManager dinámicamente
            const { UserManager } = await import('/clases/user.js');
            this.userManager = new UserManager();
            
            // Esperar a que UserManager cargue el usuario
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (this.userManager.currentUser) {
                this.currentAdmin = this.userManager.currentUser;
                console.log('👤 Admin cargado en navbar:', {
                    nombre: this.currentAdmin.nombreCompleto,
                    email: this.currentAdmin.correoElectronico,
                    organizacion: this.currentAdmin.organizacion,
                    fotoUsuario: this.currentAdmin.fotoUsuario ? 'Sí' : 'No',
                    fotoOrganizacion: this.currentAdmin.fotoOrganizacion ? 'Sí' : 'No'
                });
            } else {
                // Intentar cargar desde localStorage
                try {
                    const storedUser = JSON.parse(localStorage.getItem('centinela-currentUser'));
                    if (storedUser && storedUser.cargo === 'administrador') {
                        this.currentAdmin = storedUser;
                        console.log('👤 Admin cargado desde localStorage en navbar');
                    }
                } catch (e) {
                    console.warn('No se pudo cargar admin desde localStorage');
                }
            }
        } catch (error) {
            console.error('❌ Error al cargar datos del admin en navbar:', error);
        }
    }

    // Actualiza el navbar con los datos del administrador
    updateNavbarWithAdminData() {
        if (!this.currentAdmin) {
            console.log('⚠️ No hay datos de admin para mostrar en navbar');
            return;
        }

        console.log('🔄 Actualizando navbar con datos del admin...');

        // 1. Actualizar segundo logo (logo de la organización)
        this.updateOrganizationLogo();

        // 2. Actualizar información en el menú desplegable
        this.updateAdminMenuInfo();

        // 3. Actualizar título del navbar si es necesario
        this.updateNavbarTitle();
        
        // 4. Configurar eventos para los botones nuevos
        this.setupAdminButtons();
    }

    // Configura los eventos para los botones de administración
    setupAdminButtons() {
        // Botón de Áreas
        const areasBtn = document.getElementById('areasBtn');
        if (areasBtn) {
            areasBtn.addEventListener('click', (e) => {
                console.log('📍 Navegando a Áreas...');
                // La navegación se maneja automáticamente por el href
            });
        }

        // Botón de Personalización de colores
        const themeManagerBtn = document.getElementById('themeManagerBtn');
        if (themeManagerBtn) {
            themeManagerBtn.addEventListener('click', (e) => {
                console.log('🎨 Navegando a Personalización de colores...');
                // La navegación se maneja automáticamente por el href
            });
        }
    }

    // Actualiza el segundo logo con el logo de la organización
    updateOrganizationLogo() {
        const organizationLogoImg = document.getElementById('orgLogoImg');
        const orgTextLogo = document.getElementById('orgTextLogo');
        const orgLogoLink = document.getElementById('orgLogoLink');
        const orgLogoContainer = document.getElementById('orgLogoContainer');
        
        if (!organizationLogoImg || !orgTextLogo || !orgLogoLink || !orgLogoContainer) return;

        // Si tiene logo de organización
        if (this.currentAdmin.fotoOrganizacion) {
            organizationLogoImg.src = this.currentAdmin.fotoOrganizacion;
            organizationLogoImg.alt = `Logo de ${this.currentAdmin.organizacion}`;
            organizationLogoImg.style.display = 'block';
            orgTextLogo.style.display = 'none';
            
            // Añadir tooltip y atributos
            organizationLogoImg.title = this.currentAdmin.organizacion;
            organizationLogoImg.setAttribute('data-organization', this.currentAdmin.organizacion);
            
            console.log('🏢 Logo de organización actualizado:', this.currentAdmin.organizacion);
        } else {
            // Mostrar texto en lugar de imagen
            organizationLogoImg.style.display = 'none';
            orgTextLogo.style.display = 'flex';
            
            // Crear texto con las iniciales de la organización
            const orgName = this.currentAdmin.organizacion || 'Organización';
            const initials = orgName
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 3);
            
            orgTextLogo.textContent = initials;
            orgTextLogo.title = orgName;
            
            console.log('🏢 Texto de organización mostrado:', initials);
        }

        // Actualizar el enlace del logo para redirigir al dashboard
        orgLogoLink.href = '/users/admin/dashboard/dashboard.html';
        
        // Asegurar que el contenedor sea un círculo perfecto
        orgLogoContainer.style.borderRadius = '50%';
        orgLogoContainer.style.overflow = 'hidden';
    }

    // Actualiza la información del administrador en el menú
    updateAdminMenuInfo() {
        // Nombre del administrador
        const adminName = document.getElementById('adminName');
        if (adminName) {
            adminName.textContent = this.currentAdmin.nombreCompleto || 'Administrador';
        }

        // Email del administrador
        const adminEmail = document.getElementById('adminEmail');
        if (adminEmail) {
            adminEmail.textContent = this.currentAdmin.correoElectronico || 'No especificado';
        }

        // Organización del administrador
        const adminOrganization = document.getElementById('adminOrganization');
        if (adminOrganization) {
            adminOrganization.textContent = this.currentAdmin.organizacion || 'Sin organización';
        }

        // Foto de perfil del administrador
        const adminProfileImg = document.getElementById('adminProfileImg');
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        
        if (adminProfileImg && profilePlaceholder) {
            if (this.currentAdmin.fotoUsuario) {
                adminProfileImg.src = this.currentAdmin.fotoUsuario;
                adminProfileImg.style.display = 'block';
                profilePlaceholder.style.display = 'none';
                console.log('👤 Foto de admin cargada');
            } else {
                adminProfileImg.style.display = 'none';
                profilePlaceholder.style.display = 'flex';
                console.log('👤 Placeholder de foto mostrado');
            }
        }

        console.log('✅ Información del admin actualizada en el menú');
    }

    // Actualiza el título del navbar si es necesario
    updateNavbarTitle() {
        const navbarTitle = document.querySelector('.navbar-title');
        if (navbarTitle && this.currentAdmin.organizacion) {
            // Opcional: Cambiar el título para incluir el nombre de la organización
            // navbarTitle.textContent = `CENTINELA - ${this.currentAdmin.organizacion}`;
        }
    }

    // Configura todas las funcionalidades
    setupFunctionalities() {
        this.setupMenu();  
        this.setupScroll();
        this.loadFontAwesome();
        this.setupAdminDropdown();
        this.loadOrbitronFont();
        this.setupLogout(); // Añadido para cerrar sesión
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
            
            // Cerrar dropdown si está abierto
            if (!this.isMenuOpen && this.isAdminDropdownOpen) {
                this.toggleAdminDropdown(false);
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
                    this.toggleAdminDropdown(false);
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

    // Configura el dropdown de administración
    setupAdminDropdown() {
        const dropdownBtn = document.getElementById('adminDropdownBtn');
        const dropdownOptions = document.getElementById('adminDropdownOptions');

        if (!dropdownBtn || !dropdownOptions) return;

        const toggleDropdown = () => {
            this.isAdminDropdownOpen = !this.isAdminDropdownOpen;
            this.toggleAdminDropdown(this.isAdminDropdownOpen);
        };

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) && 
                !dropdownOptions.contains(e.target) && 
                this.isAdminDropdownOpen) {
                this.toggleAdminDropdown(false);
            }
        });

        // Cerrar dropdown al presionar Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isAdminDropdownOpen) {
                this.toggleAdminDropdown(false);
            }
        });
    }

    // Configura la funcionalidad de cerrar sesión
    setupLogout() {
        const logoutOption = document.getElementById('logoutOption');
        
        if (!logoutOption) return;

        logoutOption.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Confirmar cierre de sesión
            const confirmLogout = await this.showLogoutConfirmation();
            
            if (confirmLogout) {
                await this.performLogout();
            }
        });
    }

    // Muestra confirmación para cerrar sesión
    async showLogoutConfirmation() {
        return new Promise((resolve) => {
            // Usar SweetAlert2 para confirmación
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
                // Fallback si SweetAlert2 no está disponible
                const confirmed = confirm('¿Estás seguro de que deseas cerrar sesión?');
                resolve(confirmed);
            }
        });
    }

    // Realiza el cierre de sesión COMPLETO
    async performLogout() {
        console.log('🚪 Cerrando sesión COMPLETAMENTE...');
        
        try {
            // 1. Cerrar sesión en Firebase si UserManager está disponible
            if (this.userManager && typeof this.userManager.logout === 'function') {
                await this.userManager.logout();
                console.log('🔥 Sesión de Firebase cerrada a través de UserManager');
            } else {
                // Intentar cerrar sesión directamente si firebase está disponible
                await this.signOutFirebaseDirectly();
            }
            
            // 2. Limpiar TODOS los datos de almacenamiento local
            this.clearAllStorage();
            
            console.log('🧹 TODOS los datos de sesión eliminados');
            
            // 3. Mostrar mensaje de éxito
            await this.showLogoutSuccessMessage();
            
            // 4. Redirigir a la página de login con parámetros para evitar caché
            this.redirectToLogin();
            
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            
            // Aún así limpiar almacenamiento y redirigir
            this.clearAllStorage();
            this.redirectToLogin();
        }
    }

    // Intenta cerrar sesión en Firebase directamente
    async signOutFirebaseDirectly() {
        try {
            // Método 1: Si firebase está disponible globalmente
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
                console.log('🔥 Sesión de Firebase cerrada directamente');
                return;
            }
            
            // Método 2: Intentar con la importación dinámica
            const { getAuth, signOut } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js');
            
            // Buscar cualquier app de Firebase inicializada
            const firebaseApps = typeof firebase !== 'undefined' ? firebase.apps : [];
            if (firebaseApps && firebaseApps.length > 0) {
                const auth = getAuth(firebaseApps[0]);
                await signOut(auth);
                console.log('🔥 Sesión de Firebase cerrada con app existente');
            }
            
        } catch (error) {
            console.warn('⚠️ No se pudo cerrar sesión en Firebase directamente:', error);
            // Continuar de todos modos
        }
    }

    // Limpia TODOS los datos de almacenamiento
    clearAllStorage() {
        try {
            // Limpiar localStorage completamente
            localStorage.clear();
            console.log('🗑️ localStorage limpiado');
            
            // Limpiar sessionStorage
            sessionStorage.clear();
            console.log('🗑️ sessionStorage limpiado');
            
            // Limpiar cookies relacionadas con sesión
            this.clearSessionCookies();
            
            // Limpiar indexedDB si es necesario
            this.clearIndexedDB();
            
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
                
                // Eliminar cookies relacionadas con sesión o auth
                if (name.includes('session') || name.includes('auth') || name.includes('firebase')) {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                }
            }
            console.log('🍪 Cookies de sesión limpiadas');
        } catch (error) {
            console.warn('⚠️ Error al limpiar cookies:', error);
        }
    }

    // Limpia indexedDB si existe
    async clearIndexedDB() {
        try {
            // Lista de bases de datos que podrían contener datos de sesión
            const databases = ['firebaseLocalStorageDb', 'firestore', 'centinela-db'];
            
            for (const dbName of databases) {
                try {
                    await indexedDB.deleteDatabase(dbName);
                    console.log(`🗃️ indexedDB ${dbName} eliminada`);
                } catch (e) {
                    // La base de datos podría no existir, continuar
                }
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
                timerProgressBar: true,
                willClose: () => {
                    this.redirectToLogin();
                }
            });
        } else {
            // Fallback simple
            alert('Sesión cerrada exitosamente. Redirigiendo...');
        }
    }

    // Redirige a la página de login
    redirectToLogin() {
        // Agregar timestamp para evitar caché
        const timestamp = new Date().getTime();
        
        // Redirigir con parámetros para forzar cierre de sesión completo
        const loginUrl = `/users/visitors/login/login.html?logout=true&timestamp=${timestamp}&nocache=1`;
        
        // Forzar recarga completa
        window.location.href = loginUrl;
        
        // Doble seguridad: forzar recarga si no redirige en 1 segundo
        setTimeout(() => {
            window.location.replace(loginUrl);
        }, 1000);
    }

    // Alterna la visibilidad del dropdown
    toggleAdminDropdown(show) {
        const dropdownBtn = document.getElementById('adminDropdownBtn');
        const dropdownOptions = document.getElementById('adminDropdownOptions');
        
        if (dropdownBtn && dropdownOptions) {
            dropdownBtn.classList.toggle('active', show);
            dropdownOptions.classList.toggle('active', show);
            this.isAdminDropdownOpen = show;
        }
    }

    // Configura efecto visual al hacer scroll
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

    // Carga la fuente Orbitron desde Google Fonts
    loadOrbitronFont() {
        if (!document.querySelector('link[href*="orbitron"]')) {
            const orbitronLink = document.createElement('link');
            orbitronLink.rel = 'stylesheet';
            orbitronLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap';
            document.head.appendChild(orbitronLink);
        }
    }
}

// Inicializa automáticamente al cargar la página
new NavbarComplete();