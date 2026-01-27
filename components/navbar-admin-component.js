// navbar-complete.js 

class NavbarComplete {
    constructor() {
        this.isMenuOpen = false;
        this.isAdminDropdownOpen = false;
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
    setup() {
        try {
            this.removeOriginalNavbar();
            this.createNavbar(); 
            this.setupFunctionalities(); 
            console.log('✅ Navbar completo inicializado');
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

    // Agrega todos los estilos CSS necesarios (MODIFICADO para lápiz simple)
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
            
            /* Sección superior: Logo | Título | Botón hamburguesa */
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 10px;
                min-height: 50px;
                max-width: 1200px;
                margin: 0 auto;
                position: relative;
            }
            
            /* Contenedor izquierdo para el logo */
            .navbar-left-container {
                display: flex;
                align-items: center;
                flex: 1;
                justify-content: flex-start;
            }
            
            /* Logo del sistema */
            .navbar-logo-link {
                display: flex;
                align-items: center;
                text-decoration: none;
                z-index: 1003;
                height: 70px;
            }

            .navbar-logo-img {
                height: 70px;
                width: auto;
                max-height: 90px;
                transition: transform var(--transition-default);
            }

            /* Efecto hover en el logo */
            .navbar-logo-link:hover .navbar-logo-img {
                transform: scale(1.05);
            }
            
            /* Título "ADMINISTRADOR" centrado */
            .navbar-title {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                font-weight: 700;
                font-size: 26px;
                color: var(--navbar-logo-text);
                text-shadow: var(--text-shadow-effect);
                margin: 0;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1;
                font-family: 'Orbitron', sans-serif;
            }
            
            /* Contenedor derecho para el botón hamburguesa */
            .navbar-right-container {
                display: flex;
                align-items: center;
                flex: 1;
                justify-content: flex-end;
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
                transform: rotate(45deg) translate(5px, 5px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(5px, -5px);
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
            
            /* Sección superior del menú: Perfil del administrador (MODIFICADO) */
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
            }
            
            .admin-profile-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            /* Ícono de lápiz para editar (NUEVO - SOLO ESTO) */
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
            
            /* Botón desplegable de administración CON FUENTE ORBITRON */
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
                max-height: 200px;
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
                
                body.menu-open {
                    overflow: hidden;
                }
            }
            
            /* Responsive para móvil */
            @media (max-width: 480px) {
                .navbar-main-menu {
                    width: 100%;
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
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'navbar-complete-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    // Inserta la estructura HTML del navbar (MODIFICADO para lápiz simple)
    insertHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';
        navbar.innerHTML = `
            <!-- Sección superior con logo, título y botón hamburguesa -->
            <div class="navbar-top-section">
                <div class="navbar-left-container">
                    <a href="/index.html" class="navbar-logo-link">
                        <img src="/assets/images/logo.png" alt="Centinela Logo" class="navbar-logo-img">
                    </a>
                </div>
                
                <h1 class="navbar-title">ADMINISTRADOR</h1>
                
                <div class="navbar-right-container">
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
                
                <!-- Sección superior: Perfil del administrador (MODIFICADO) -->
                <div class="admin-profile-section">
                    <!-- Contenedor para la foto con ícono de lápiz -->
                    <div class="profile-photo-container">
                        <!-- Círculo con imagen del administrador -->
                        <div class="admin-profile-circle">
                            <img src="/assets/images/logo.png" alt="Administrador" class="admin-profile-img" id="adminProfileImg">
                        </div>
                        <!-- Ícono de lápiz para editar (ENLACE a página de edición) -->
                        <a href="/editar-perfil.html" class="edit-profile-icon" id="editProfileIcon">
                            <i class="fas fa-pencil-alt"></i>
                        </a>
                    </div>
                    
                    <!-- Información del administrador -->
                    <div class="admin-info">
                        <div class="admin-name" id="adminName">Bryan Vazquez Segura</div>
                        <div class="admin-role">Administrador</div>
                        <div class="admin-email" id="adminEmail">bryan@ejemplo.com</div>
                    </div>
                </div>
                
                <!-- Sección de navegación: Estado de tickets -->
                <div class="nav-section">
                    <div class="nav-section-title">
                        <i class="fa-solid fa-ticket"></i>
                        <span>Estado de mis tickets</span>
                    </div>
                    <div class="nav-items-container">
                        <div class="nav-item">
                            <i class="fa-solid fa-check-circle"></i>
                            <span class="nav-item-text">Finalizados</span>
                            <span class="nav-item-percentage">18%</span>
                        </div>
                    </div>
                </div>
                
                <!-- Sección de navegación: Tickets por Prioridad -->
                <div class="nav-section">
                    <div class="nav-section-title">
                        <i class="fa-solid fa-flag"></i>
                        <span>Tickets por Prioridad</span>
                    </div>
                    <div class="nav-items-container">
                        <div class="nav-item">
                            <div class="nav-item-priority">
                                <div class="priority-item">
                                    <i class="fa-solid fa-circle" style="color: #FFA500;"></i>
                                    <span>Media</span>
                                    <span class="nav-item-percentage">88%</span>
                                </div>
                                <div class="priority-item">
                                    <i class="fa-solid fa-circle" style="color: #008000;"></i>
                                    <span>Baja</span>
                                    <span class="nav-item-percentage">13%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Sección de espacios vacíos (8 espacios sin texto) -->
                <div class="menu-section">
                    <div class="empty-menu-item"></div>
                </div>
                
                <!-- Sección de opciones de administración (AL FINAL) -->
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
                        <a href="#" class="admin-dropdown-option">
                            <i class="fa-solid fa-users-gear"></i>
                            <span>Gestionar Usuarios</span>
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

    // Configura todas las funcionalidades (SIMPLIFICADO)
    setupFunctionalities() {
        this.setupMenu();  
        this.setupScroll();
        this.loadFontAwesome();
        this.setupAdminDropdown();
        this.loadOrbitronFont();
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