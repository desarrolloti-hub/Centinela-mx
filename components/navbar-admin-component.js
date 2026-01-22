// navbar-complete.js 

class NavbarComplete {
    constructor() {
        this.isMenuOpen = false;
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
            
            /* Menú lateral (ocupa 25% en desktop, 85-100% en móvil) */
            .navbar-main-menu {
                position: fixed;
                top: 0;
                right: -100%;  /* Oculto por defecto */
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
            
            /* Sección del perfil del administrador */
            .admin-section {
                padding: 30px 25px 20px;
                background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-primary) 100%);
                color: var(--color-text-primary);
                border-bottom: 1px solid var(--color-border-light);
            }
            
            /* Tarjeta del administrador */
            .admin-card {
                background: var(--color-bg-tertiary);
                border-radius: var(--border-radius-medium);
                padding: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid var(--color-border-light);
            }
            
            /* Foto de perfil circular */
            .profile-photo {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px;
                border-radius: var(--border-radius-circle);
                overflow: hidden;
                border: 3px solid var(--color-accent-primary);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* Formulario de perfil del administrador */
            .admin-form h2 {
                font-size: 18px;
                margin-bottom: 20px;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                color: var(--color-text-primary);
            }
            
            /* Campos del formulario */
            .input-group {
                position: relative;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                background: var(--color-bg-tertiary);
                border-radius: var(--border-radius-small);
                padding: 10px 15px;
                border: 1px solid var(--color-border-light);
                transition: var(--transition-default);
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
            
            /* Responsive para tablet */
            @media (max-width: 992px) {
                .navbar-main-menu {
                    width: 85%;  /* Menú más ancho en tablet */
                }
                
                body.menu-open {
                    overflow: hidden;  /* Bloquear scroll cuando menú está abierto */
                }
            }
            
            /* Responsive para móvil */
            @media (max-width: 480px) {
                .navbar-main-menu {
                    width: 100%;  /* Menú ocupa todo el ancho en móvil */
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
            
            <!-- Menú lateral con perfil del administrador -->
            <div class="navbar-main-menu" id="navbarMainMenu">
                <div class="admin-section">
                    <div class="admin-card">
                        <div class="profile-photo">
                            <img src="/assets/images/logo.png" alt="Administrador">
                        </div>
                        
                        <form class="admin-form">
                            <h2><i class="fa-solid fa-user-shield"></i> Perfil Administrador</h2>
                            
                            <!-- Campos de información del administrador -->
                            <div class="input-group">
                                <i class="fa-solid fa-id-card"></i>
                                <input type="text" placeholder="ID Administrador" readonly>
                            </div>
                            
                            <div class="input-group">
                                <i class="fa-solid fa-user"></i>
                                <input type="text" placeholder="Nombre completo" readonly>
                            </div>
                            
                            <div class="input-group">
                                <i class="fa-solid fa-envelope"></i>
                                <input type="email" placeholder="Correo electrónico" readonly>
                            </div>
                            
                            <div class="input-group">
                                <i class="fa-solid fa-phone"></i>
                                <input type="tel" placeholder="Teléfono" readonly>
                            </div>
                            
                            <div class="input-group">
                                <i class="fa-solid fa-clock"></i>
                                <input type="text" placeholder="Último acceso" readonly>
                            </div>
                            
                            <div class="input-group">
                                <i class="fa-solid fa-calendar"></i>
                                <input type="text" placeholder="Fecha de creación" readonly>
                            </div>

                            <div class="input-group">
                                <i class="fa-solid fa-users-cog"></i>
                                <input type="text" placeholder="Gestión de cuentas" readonly>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.prepend(navbar);  // Inserta al inicio del body
    }

    // Ajusta el padding del body para que el contenido no quede debajo del navbar
    adjustBodyPadding() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        const updatePadding = () => {
            document.body.style.paddingTop = `${navbar.offsetHeight}px`;
        };

        updatePadding();  // Ajustar inicialmente

        // Observar cambios de tamaño del navbar
        const resizeObserver = new ResizeObserver(updatePadding);
        resizeObserver.observe(navbar);
    }

    // Configura todas las funcionalidades del navbar
    setupFunctionalities() {
        this.setupMenu();  
        this.setupScroll();
        this.loadFontAwesome();
    }

    // Configura la funcionalidad del menú hamburguesa
    setupMenu() {
        const hamburgerBtn = document.getElementById('navbarHamburger');
        const mainMenu = document.getElementById('navbarMainMenu');
        const overlay = document.getElementById('navbarMobileOverlay');

        if (!hamburgerBtn || !mainMenu || !overlay) return;

        // Alternar apertura/cierre del menú
        const toggleMenu = () => {
            this.isMenuOpen = !this.isMenuOpen;

            mainMenu.classList.toggle('active', this.isMenuOpen);
            hamburgerBtn.classList.toggle('active', this.isMenuOpen);
            overlay.classList.toggle('active', this.isMenuOpen);
            document.body.classList.toggle('menu-open', this.isMenuOpen);
        };

        // Cerrar menú
        const closeMenu = () => {
            if (this.isMenuOpen) {
                this.isMenuOpen = false;
                mainMenu.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                overlay.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        };

        // Event listeners
        hamburgerBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMenu);
        
        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) closeMenu();
        });

        // Cerrar menú al redimensionar a desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && this.isMenuOpen) closeMenu();
        });
    }

    // Configura efecto visual al hacer scroll
    setupScroll() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // Carga Font Awesome si no está disponible
    loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }
    }
}

// Inicializa automáticamente al cargar la página
new NavbarComplete();