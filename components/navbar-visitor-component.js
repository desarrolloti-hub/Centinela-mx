// navbar-complete.js - Corregido para responsive y modo oscuro
(function () {
    'use strict';

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================

    if (window.NavbarCompleteLoaded) {
        console.log('🔄 Navbar completo ya cargado, omitiendo...');
        return;
    }
    window.NavbarCompleteLoaded = true;

    console.log('🚀 Iniciando navbar completo...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    async function init() {
        try {
            removeOriginalNavbar();
            await createCompleteNavbar();
            setupAllFunctionalities();
            applyDarkModeFromStorage();
            console.log('✅ Navbar completo inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar navbar:', error);
        }
    }

    function removeOriginalNavbar() {
        const originalHeader = document.getElementById('main-header');
        if (originalHeader) {
            originalHeader.remove();
            console.log('🗑️ Navbar original removido');
        }
    }

    // =============================================
    // CREAR NAVBAR COMPLETO
    // =============================================

    async function createCompleteNavbar() {
        addCompleteStyles();
        createNavbarHTML();
        adjustBodyPadding();
    }

    function applyDarkModeFromStorage() {
        // Esta función ya no es necesaria porque ThemeManager se inicializa primero
        // Pero la mantenemos por compatibilidad
        if (window.ThemeManager) {
            // ThemeManager ya aplicó el tema, solo actualizamos el icono
            const isDarkMode = window.ThemeManager.isDarkMode();
            const darkModeBtn = document.getElementById('darkModeToggle');
            if (darkModeBtn) {
                darkModeBtn.innerHTML = isDarkMode ?
                    '<i class="fas fa-sun"></i>' :
                    '<i class="fas fa-moon"></i>';
            }
        }
    }

    function addCompleteStyles() {
        const styleId = 'navbar-complete-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent =/*css*/ `
            /* ====== VARIABLES DE COLOR ====== */
            :root {
                --primary: #fdfbfb;
                --primary-light: #000000;
                --primary-dark: #000000;
                --accent: #c0c0c0;
                --accent-footer: #ffffff;
                --accent-light: #fcfbf9;
                --text: #ffffff;
                --text-light: #ffffff;
                --light: #ffffff;
                --white: #000000;
                --gray: #3d8ad6;
                --dark-gray: #ffffff;
                --text-shadow: 
                    0 0 10px rgb(255, 255, 255),
                    0 0 20px rgb(255, 255, 255),  
                    0 0 30px rgb(255, 255, 255),   
                    0 0 40px rgb(255, 255, 255);  
                --shadow: 0 5px 15px rgba(255, 255, 255, 0.55);
                --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
                --transition: all 0.3s ease-in-out;
                --border-radius: 8px;
                --border-radius-lg: 12px;
            }
            
            /* ====== NAVBAR COMPLETO ====== */
            #complete-navbar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                z-index: 1000;
                background-color: #000000;
                box-shadow: 0 2px 10px #ffffff00;
                transition: var(--transition);
                font-family: 'Orbitron', sans-serif;
            }
            
            #complete-navbar.scrolled {
                background-color: var(--white);
                box-shadow: var(--shadow);
            }
            
            .navbar-main-container {
                display: flex;
                flex-direction: column;
                padding: 0;
            }
            
            /* Parte superior con logo y menú */
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 20px;
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            /* Logo */
            .navbar-brand {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
                font-size: 20px;
                color: var(--primary);
                text-decoration: none;
                z-index: 1003;
                text-shadow: var(--text-shadow); 
            }
            
            .navbar-logo-img {
                height: 40px;
                transition: var(--transition);
            }

            
            /* Menú principal - DESKTOP */
            .navbar-main-menu {
                display: flex;
                list-style: none;
                gap: 25px;
                margin: 0;
                padding: 0;
            }
            
            .navbar-main-menu a {
                color: var(--primary);
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                transition: var(--transition);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .navbar-main-menu a span {
                display: inline-block;
            }
            
            .navbar-main-menu a:hover {
                text-shadow: var(--text-shadow); 
            }
            
            .navbar-main-menu a.active {
                color: var(--accent);
                font-weight: 600;
            }
    
            
            
            
            /* BOTÓN HAMBURGUESA - POSICIONADO A LA DERECHA */
            .navbar-hamburger-btn {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                padding: 0;
                position: relative;
                z-index: 1002;
                margin: 0 15px 0 0;
            }
            
            .hamburger-line {
                display: block;
                width: 25px;
                height: 3px;
                background-color: var(--primary);
                margin: 5px 0;
                border-radius: 3px;
                transition: var(--transition);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(6px, 6px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(6px, -6px);
            }
            
            /* Overlay para móvil */
            .navbar-mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
            }
            
            .navbar-mobile-overlay.active {
                display: block;
            }
            
            /* ====== RESPONSIVE - MÓVIL ====== */
            @media (max-width: 992px) {
                /* NAVBAR SUPERIOR - REORGANIZADO */
                .navbar-top-section {
                    padding: 15px 8px;
                    position: relative;
                    flex-wrap: nowrap;
                    
                }
                
                /* BOTÓN HAMBURGUESA A LA IZQUIERDA */
                .navbar-hamburger-btn {
                    display: block;
                    order: 3;
                    margin-right: 15px;
                    margin-left: 0;
                }
                
                /* LOGO CENTRADO */
                .navbar-brand {
                    order: 2;
                    flex: 1;
                    text-align: center;
                    justify-content: center;
                }
                
                /* MENÚ MÓVIL - SE OCULTA COMPLETAMENTE */
                .navbar-main-menu {
                    position: fixed;
                    top: 0;
                    right: -100%;
                    left:auto;
                    width: 100%;
                    height: 100vh;
                    background-color: var(--white);
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 100px 20px 30px;
                    gap: 0;
                    transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1001;
                    overflow-y: auto;
                    box-shadow: none;
                    opacity: 0;
                    display: flex !important;
                }
                
                .navbar-main-menu.active {
                    right: 0;
                    left: auto;
                    opacity: 1;
                }
                
                /* Animación elementos del menú */
                .navbar-main-menu li {
                    width: 100%;
                    max-width: 300px;
                    border-bottom: 1px solid rgba(249, 249, 249, 0.1);
                    opacity: 0;
                    transform: translateX(20px);
                    transition: var(--transition);
                }
                
                .navbar-main-menu.active li {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .navbar-main-menu li:nth-child(1) { transition-delay: 0.1s; }
                .navbar-main-menu li:nth-child(2) { transition-delay: 0.15s; }
                .navbar-main-menu li:nth-child(3) { transition-delay: 0.2s; }
                .navbar-main-menu li:nth-child(4) { transition-delay: 0.25s; }
                .navbar-main-menu li:nth-child(5) { transition-delay: 0.3s; }
                .navbar-main-menu li:nth-child(6) { transition-delay: 0.35s; }
                
                /* Alineación correcta de iconos en móvil */
                .navbar-main-menu a {
                    padding: 15px 20px;
                    font-size: 18px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    justify-content: flex-start;
                    text-align: left;
                    border-radius: var(--border-radius);
                    margin: 5px 0;
                }
                
                .navbar-main-menu a i {
                    width: 24px;
                    text-align: center;
                    font-size: 1.2rem;
                }
                
                .navbar-main-menu a span {
                    flex: 1;
                }
                
                .navbar-main-menu a:hover {
                    background-color: rgba(245, 215, 66, 0.1);
                    padding-left: 25px;
                }
                
                
                /* Bloquear scroll cuando menú está abierto */
                body.mobile-menu-open {
                    overflow: hidden;
                }
            }
            
            /* Pantallas muy pequeñas */
            @media (max-width: 480px) {
                .navbar-brand span {
                    font-size: 18px;
                }
                
                .navbar-logo-img {
                    height: 35px;
                }
                
                .navbar-main-menu {
                    padding: 90px 15px 20px;
                }
                
                .navbar-main-menu a {
                    font-size: 16px;
                    padding: 14px 15px;
                }
                
                .navbar-main-menu a i {
                    font-size: 1.1rem;
                }
                
                .navbar-hamburger-btn {
                    width: 35px;
                    height: 35px;
                    margin-right: 10px;
                }
                
            }
            
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .result-thumbnail {
                width: 50px;
                height: 50px;
                object-fit: contain;
                border-radius: 6px;
                border: 1px solid #eee;
                background-color: #fafafa;
            }
            
            .result-info {
                flex: 1;
                min-width: 0;
            }
            
            .result-info h4 {
                margin: 0;
                font-size: 0.95rem;
                color: var(--text);
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .result-brand {
                font-weight: 500;
                color: #555;
                font-size: 0.85rem;
                margin: 2px 0;
            }
            
            .result-category {
                color: var(--text-light);
                font-size: 0.75rem;
                margin: 2px 0 0 0;
            }
            
        `;

        document.head.appendChild(styles);
    }

    function createNavbarHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';

        navbar.innerHTML =/*html*/ `
            <div class="navbar-main-container">
                <!-- Parte superior: logo, menú y botones -->
                <div class="navbar-top-section">
                    
                    <!-- Logo -->
                    <a href="/index.html" class="navbar-brand">
                        <img src="/assets/images/logo.png" alt="" class="navbar-logo-img">
                        <span>CENTINELA</span>
                    </a>
                    
                    <!-- Menú principal SIN el botón modo oscuro -->
                    <ul class="navbar-main-menu" id="navbarMainMenu">
                        <li><a href="/index.html" class="active"><i class="fas fa-home"></i> <span>Inicio</span></a></li>
                        <li><a href="/visitors/products/products.html"><i class="fas fa-box-open"></i> <span>¿Quienes somos?</span></a></li>
                        <li><a href="/visitors/planes/planes.html"><i class="fas fa-box-open"></i> <span>Planes</span></a></li>
                        <li><a href="/visitors/contact/contact.html"><i class="fas fa-map-marker-alt"></i> <span>Contactanos</span></a></li>
                        <li><a href="/visitors/login/login.html"><i class="fas fa-envelope"></i> <span>Inicio de sesion</span></a></li>
                    </ul>

                    <!-- Botón hamburguesa a la IZQUIERDA -->
                    <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>
                
                <!-- Overlay para móvil -->
                <div class="navbar-mobile-overlay" id="navbarMobileOverlay"></div>
            </div>
        `;

        document.body.insertBefore(navbar, document.body.firstChild);
    }

    function adjustBodyPadding() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        const navbarHeight = navbar.offsetHeight;
        document.body.style.paddingTop = navbarHeight + 'px';

        const resizeObserver = new ResizeObserver(() => {
            const newHeight = navbar.offsetHeight;
            document.body.style.paddingTop = newHeight + 'px';
        });

        resizeObserver.observe(navbar);

        window.addEventListener('resize', () => {
            const currentHeight = navbar.offsetHeight;
            document.body.style.paddingTop = currentHeight + 'px';
        });
    }

    // =============================================
    // CONFIGURAR TODAS LAS FUNCIONALIDADES
    // =============================================

    function setupAllFunctionalities() {
        setupResponsiveMenu();
        setupDarkMode();
        setupScrollEffects();
        setupPredictiveSearch();
        markActiveLink();
    }

    function setupResponsiveMenu() {
        const hamburgerBtn = document.getElementById('navbarHamburger');
        const mainMenu = document.getElementById('navbarMainMenu');
        const overlay = document.getElementById('navbarMobileOverlay');

        if (!hamburgerBtn || !mainMenu || !overlay) return;

        let isMenuOpen = false;

        function openMobileMenu() {
            mainMenu.classList.add('active');
            hamburgerBtn.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('mobile-menu-open');
            isMenuOpen = true;

            const menuItems = mainMenu.querySelectorAll('li');
            menuItems.forEach((item, index) => {
                item.style.transitionDelay = `${0.1 + (index * 0.05)}s`;
            });
        }

        function closeMobileMenu() {
            mainMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
            isMenuOpen = false;

            const menuItems = mainMenu.querySelectorAll('li');
            menuItems.forEach(item => {
                item.style.transitionDelay = '0s';
            });
        }

        function toggleMobileMenu() {
            if (isMenuOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        }

        hamburgerBtn.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', closeMobileMenu);

        // Cerrar menú al hacer clic en enlaces (móvil)
        mainMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    setTimeout(closeMobileMenu, 300);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMobileMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && isMenuOpen) {
                closeMobileMenu();
            }
        });
    }

    function setupScrollEffects() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    window.NavbarComplete = {
        toggleMenu: function () {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn) hamburgerBtn.click();
        },
    };

    // =============================================
    // CARGAR RECURSOS NECESARIOS
    // =============================================

    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }

    if (!document.querySelector('link[href*="poppins"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }

})();