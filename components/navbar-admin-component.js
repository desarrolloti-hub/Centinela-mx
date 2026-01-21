// navbar-complete.js - Versión con menú lateral al 25%
(function () {
    'use strict';

    // Evitar carga duplicada
    if (window.NavbarCompleteLoaded) {
        console.log('🔄 Navbar completo ya cargado, omitiendo...');
        return;
    }
    window.NavbarCompleteLoaded = true;

    console.log('🚀 Iniciando navbar completo...');

    // Inicializar cuando el DOM esté listo
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

    // Crear navbar completo
    async function createCompleteNavbar() {
        addCompleteStyles();
        createNavbarHTML();
        adjustBodyPadding();
    }

    function addCompleteStyles() {
        const styleId = 'navbar-complete-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* NAVBAR COMPLETO */
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
            
            .navbar-main-container {
                display: flex;
                flex-direction: column;
                padding: 0;
            }
            
            /* Parte superior - Distribución: Logo | ADMINISTRADOR (centrado) | Botón */
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 10px;
                min-height: 50px;
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                box-sizing: border-box;
                position: relative;
            }
            
            /* Contenedor izquierdo con logo - Pegado a la izquierda */
            .navbar-left-container {
                display: flex;
                align-items: center;
                flex: 1;
                justify-content: flex-start;
                padding-left: 10px;
            }
            
            /* Logo a la izquierda - MÁS GRANDE */
            .navbar-logo-link {
                display: flex;
                align-items: center;
                text-decoration: none;
                z-index: 1003;
                height: 70px; /* Aumentado para logo más grande */
                overflow: visible;
                margin-left: 0;
            }

            .navbar-logo-img {
                height: 70px; /* Logo más grande - aumentado de 50px a 70px */
                width: auto;
                max-height: 90px;
                transition: var(--transition-default);
                position: relative;
                z-index: 2;
            }

            /* Efecto hover opcional */
            .navbar-logo-link:hover .navbar-logo-img {
                transform: scale(1.05);
            }
            
            /* Texto ADMINISTRADOR centrado */
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
            
            /* Contenedor derecho con botón hamburguesa - Pegado a la derecha */
            .navbar-right-container {
                display: flex;
                align-items: center;
                flex: 1;
                justify-content: flex-end;
                padding-right: 10px;
            }
            
            /* BOTÓN HAMBURGUESA - SIEMPRE VISIBLE - Pegado a la derecha */
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
                margin-right: 0;
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
                transform: rotate(45deg) translate(5px, 5px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(5px, -5px);
            }
            
            /* MENÚ LATERAL - 25% EN DESKTOP - COMPLETAMENTE OCULTO POR DEFECTO */
            .navbar-main-menu {
                position: fixed;
                top: 0;
                right: -100%; /* COMPLETAMENTE OCULTO POR DEFECTO */
                width: 25%;
                height: 100vh;
                background-color: var(--navbar-scrolled-bg);
                list-style: none;
                margin: 0;
                padding: 100px 30px 30px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1001;
                overflow-y: auto;
                box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
                visibility: hidden; /* Oculta completamente cuando no está activo */
                opacity: 0; /* Transparencia completa cuando no está activo */
            }
            
            .navbar-main-menu.active {
                right: 0;
                visibility: visible; /* Visible cuando está activo */
                opacity: 1; /* Opaco cuando está activo */
            }
            
            .navbar-main-menu li {
                opacity: 0;
                transform: translateX(20px);
                transition: var(--transition-default);
            }
            
            .navbar-main-menu.active li {
                opacity: 1;
                transform: translateX(0);
            }
            
            /* Animación escalonada para los items del menú */
            .navbar-main-menu.active li:nth-child(1) { transition-delay: 0.1s; }
            .navbar-main-menu.active li:nth-child(2) { transition-delay: 0.15s; }
            .navbar-main-menu.active li:nth-child(3) { transition-delay: 0.2s; }
            .navbar-main-menu.active li:nth-child(4) { transition-delay: 0.25s; }
            .navbar-main-menu.active li:nth-child(5) { transition-delay: 0.3s; }
            
            .navbar-main-menu a {
                color: var(--navbar-text);
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                transition: var(--transition-default);
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 15px 20px;
                border-radius: var(--border-radius-medium);
                width: 100%;
                box-sizing: border-box;
            }
            
            .navbar-main-menu a:hover {
                background-color: var(--color-hover);
                padding-left: 25px;
            }
            
            .navbar-main-menu a.active {
                color: var(--color-active);
                font-weight: 600;
                background-color: var(--color-hover-light);
            }
            
            /* Overlay para móvil/desktop */
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
            
            /* ====== RESPONSIVE - MÓVIL ====== */
            @media (max-width: 992px) {
                .navbar-top-section {
                    padding: 5px 10px;
                    min-height: 60px;
                }
                
                .navbar-left-container {
                    flex: none;
                    width: auto;
                    padding-left: 5px;
                }
                
                .navbar-title {
                    font-size: 22px;
                    left: 50%;
                    transform: translateX(-50%);
                    top: 50%;
                    transform: translate(-50%, -50%);
                }
                
                .navbar-right-container {
                    flex: none;
                    width: auto;
                    padding-right: 5px;
                }
                
                .navbar-logo-img {
                    height: 60px; /* Mantener grande en móvil también */
                    max-height: 60px;
                }
                
                /* MENÚ OCUPA 100% EN MÓVIL */
                .navbar-main-menu {
                    width: 85%;
                    right: -100%; /* Siempre completamente oculto */
                    padding: 90px 20px 30px;
                }
                
                .navbar-main-menu.active {
                    right: 0;
                    visibility: visible;
                    opacity: 1;
                }
                
                .navbar-main-menu a {
                    font-size: 18px;
                    padding: 18px 20px;
                }
                
                body.menu-open {
                    overflow: hidden;
                }
            }
            
            @media (max-width: 768px) {
                .navbar-title {
                    font-size: 20px;
                }
                
                .navbar-logo-img {
                    height: 55px;
                }
                
                .navbar-main-menu {
                    width: 90%;
                }
            }
            
            @media (max-width: 480px) {
                .navbar-title {
                    font-size: 18px;
                }
                
                .navbar-logo-img {
                    height: 50px;
                }
                
                .navbar-main-menu {
                    width: 100%;
                    padding: 80px 15px 20px;
                }
                
                .navbar-main-menu a {
                    font-size: 16px;
                    padding: 16px 15px;
                }
            }
            
            /* Desktop grande */
            @media (min-width: 1400px) {
                .navbar-main-menu {
                    width: 400px; /* Máximo 400px */
                }
            }
            
            /* Desktop pequeño */
            @media (min-width: 993px) and (max-width: 1399px) {
                .navbar-main-menu {
                    width: 30%; /* Un poco más en pantallas medianas */
                }
            }
        `;

        document.head.appendChild(styles);
    }

    function createNavbarHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';

        navbar.innerHTML = /*html*/ `
            <div class="navbar-main-container">
                <div class="navbar-top-section">
                    <!-- Contenedor izquierdo con logo - PEGADO A LA IZQUIERDA -->
                    <div class="navbar-left-container">
                        <a href="/index.html" class="navbar-logo-link">
                            <img src="/assets/images/logo.png" alt="Centinela Logo" class="navbar-logo-img">
                        </a>
                    </div>
                    
                    <!-- Texto ADMINISTRADOR centrado -->
                    <h1 class="navbar-title">ADMINISTRADOR</h1>
                    
                    <!-- Contenedor derecho con botón hamburguesa - PEGADO A LA DERECHA -->
                    <div class="navbar-right-container">
                        <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                            <span class="hamburger-line"></span>
                            <span class="hamburger-line"></span>
                            <span class="hamburger-line"></span>
                        </button>
                    </div>
                </div>
                
                <!-- Overlay para cerrar menú -->
                <div class="navbar-mobile-overlay" id="navbarMobileOverlay"></div>
                
                <!-- Menú lateral - INICIALMENTE OCULTO -->
                <ul class="navbar-main-menu" id="navbarMainMenu">
                    <li><a href="/index.html"><i class="fas fa-home"></i> Inicio</a></li>
                    <li><a href="/quienes-somos.html"><i class="fas fa-users"></i> Quiénes Somos</a></li>
                    <li><a href="/servicios.html"><i class="fas fa-concierge-bell"></i> Servicios</a></li>
                    <li><a href="/capacitacion.html"><i class="fas fa-graduation-cap"></i> Capacitación</a></li>
                    <li><a href="/contacto.html"><i class="fas fa-envelope"></i> Contacto</a></li>
                </ul>
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
    }

    function setupAllFunctionalities() {
        setupResponsiveMenu();
        setupScrollEffects();
        markActiveLink();
    }

    function setupResponsiveMenu() {
        const hamburgerBtn = document.getElementById('navbarHamburger');
        const mainMenu = document.getElementById('navbarMainMenu');
        const overlay = document.getElementById('navbarMobileOverlay');

        if (!hamburgerBtn || !mainMenu || !overlay) return;

        let isMenuOpen = false;

        function openMenu() {
            mainMenu.classList.add('active');
            hamburgerBtn.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('menu-open');
            isMenuOpen = true;

            // Animar items del menú
            const menuItems = mainMenu.querySelectorAll('li');
            menuItems.forEach((item, index) => {
                item.style.transitionDelay = `${0.1 + (index * 0.05)}s`;
            });
        }

        function closeMenu() {
            mainMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('menu-open');
            isMenuOpen = false;

            // Resetear delays
            const menuItems = mainMenu.querySelectorAll('li');
            menuItems.forEach(item => {
                item.style.transitionDelay = '0s';
            });
        }

        function toggleMenu() {
            if (isMenuOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        hamburgerBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMenu);

        // Cerrar menú al hacer clic en un enlace
        mainMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(closeMenu, 300);
            });
        });

        // Cerrar menú con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMenu();
            }
        });

        // Cerrar menú al redimensionar a desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && isMenuOpen) {
                closeMenu();
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

    function markActiveLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const menuLinks = document.querySelectorAll('.navbar-main-menu a');

        menuLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            const linkPage = linkHref.split('/').pop();

            // Para la página de inicio
            if (currentPage === '' || currentPage === 'index.html' || currentPage === '/') {
                if (linkHref === '/index.html' || linkHref === '/') {
                    link.classList.add('active');
                }
            }
            // Para otras páginas
            else if (linkPage === currentPage) {
                link.classList.add('active');
            }
        });
    }

    window.NavbarComplete = {
        toggleMenu: function () {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn) hamburgerBtn.click();
        },
        openMenu: function () {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn && !hamburgerBtn.classList.contains('active')) {
                hamburgerBtn.click();
            }
        },
        closeMenu: function () {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn && hamburgerBtn.classList.contains('active')) {
                hamburgerBtn.click();
            }
        }
    };

    // Cargar Font Awesome si no está cargado
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
})();