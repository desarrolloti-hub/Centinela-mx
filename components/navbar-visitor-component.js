// navbar-complete.js - Versión simplificada solo para colores
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
            /* NAVBAR COMPLETO - Estilos específicos */
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
                font-size: 26px;
                color: var(--navbar-logo-text);
                text-decoration: none;
                z-index: 1003;
                text-shadow: var(--text-shadow-effect);
                position: relative; /* Para posicionar el efecto de luz */
            }

            .navbar-logo-img {
                height: 50px; /* Aumentado de 40px a 50px */
                transition: var(--transition-default);
                position: relative;
                z-index: 2; /* Asegura que el logo esté sobre el efecto */
            }

            /* Efecto de luz circular parpadeante detrás del logo */
            .navbar-brand::before {
                content: '';
                position: absolute;
                left: -3px; /* Ajusta según el tamaño de tu logo */
                top: 50%;
                transform: translateY(0%);
                width: 60px; /* Tamaño del círculo de luz */
                height: 60px;
                background: radial-gradient(
                    circle,
                    rgb(255, 255, 255) 0%,
                    rgba(255, 255, 255, 0.5) 30%,
                    rgba(255, 255, 255, 0.05) 65%,
                    transparent 70%
                );
                border-radius: 50%;
                z-index: 1;
                animation: parpadeo-luz 3s infinite ease-in-out;
                opacity: 0.7;
            }

            /* Para logos con fondo oscuro - versión con color */
            .navbar-brand.luz-color::before {
                background: radial-gradient(
                    circle,
                    rgba(0, 150, 255, 0.4) 0%,
                    rgba(0, 150, 255, 0.2) 30%,
                    rgba(0, 150, 255, 0.1) 50%,
                    transparent 70%
                );
            }

            /* Animación de parpadeo */
            @keyframes parpadeo-luz {
                0%, 100% {
                    opacity: 0.3;
                    transform: translateY(-50%) scale(0.95);
                }
                25% {
                    opacity: 0.7;
                    transform: translateY(-50%) scale(1.05);
                }
                50% {
                    opacity: 0.4;
                    transform: translateY(-50%) scale(1);
                }
                75% {
                    opacity: 0.8;
                    transform: translateY(-50%) scale(1.02);
                }
            }

            /* Versión alternativa con efecto más sutil */
            .navbar-brand.luz-sutil::before {
                animation: parpadeo-sutil 4s infinite ease-in-out;
            }

            @keyframes parpadeo-sutil {
                0%, 100% {
                    opacity: 0.2;
                    transform: translateY(-50%) scale(1);
                }
                50% {
                    opacity: 0.5;
                    transform: translateY(-50%) scale(1.1);
                }
            }

            /* Efecto hover opcional */
            .navbar-brand:hover .navbar-logo-img {
                transform: scale(1.05);
            }

            .navbar-brand:hover::before {
                opacity: 0.8;
                animation-duration: 2s;
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
                color: var(--navbar-text);
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                transition: var(--transition-default);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .navbar-main-menu a:hover {
                text-shadow: var(--navbar-link-hover);
            }
            
            .navbar-main-menu a.active {
                color: var(--color-active);
                font-weight: 600;
            }
            
            /* BOTÓN HAMBURGUESA */
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
                background-color: var(--navbar-text);
                margin: 5px 0;
                border-radius: var(--border-radius-small);
                transition: var(--transition-default);
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
                .navbar-top-section {
                    padding: 15px 8px;
                    position: relative;
                    flex-wrap: nowrap;
                }
                
                .navbar-hamburger-btn {
                    display: block;
                    order: 3;
                    margin-right: 15px;
                }
                
                .navbar-brand {
                    order: 2;
                    flex: 1;
                    text-align: center;
                    justify-content: center;
                }
                
                .navbar-main-menu {
                    position: fixed;
                    top: 0;
                    right: -100%;
                    left: auto;
                    width: 100%;
                    height: 100vh;
                    background-color: var(--navbar-scrolled-bg);
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
                
                .navbar-main-menu li {
                    width: 100%;
                    max-width: 300px;
                    border-bottom: 1px solid var(--color-border-light);
                    opacity: 0;
                    transform: translateX(20px);
                    transition: var(--transition-default);
                }
                
                .navbar-main-menu.active li {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .navbar-main-menu a {
                    padding: 15px 20px;
                    font-size: 18px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    justify-content: flex-start;
                    text-align: left;
                    border-radius: var(--border-radius-medium);
                    margin: 5px 0;
                    color: var(--color-text-light);
                }
                
                .navbar-main-menu a:hover {
                    background-color: var(--color-hover);
                    padding-left: 25px;
                }
                
                body.mobile-menu-open {
                    overflow: hidden;
                }
            }
            
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
                    <a href="/index.html" class="navbar-brand">
                        <img src="/assets/images/logo.png" alt="" class="navbar-logo-img">
                        <span>CENTINELA</span>
                    </a>
                    
                    <ul class="navbar-main-menu" id="navbarMainMenu">
                        <li><a href="/index.html" class="active"><i class="fas fa-home"></i> <span>Inicio</span></a></li>
                        <li><a href="/visitors/products/products.html"><i class="fas fa-box-open"></i> <span>¿Quienes somos?</span></a></li>
                        <li><a href="/visitors/planes/planes.html"><i class="fas fa-box-open"></i> <span>Planes</span></a></li>
                        <li><a href="/visitors/contact/contact.html"><i class="fas fa-map-marker-alt"></i> <span>Contactanos</span></a></li>
                        <li><a href="/visitors/login/login.html"><i class="fas fa-envelope"></i> <span>Inicio de sesion</span></a></li>
                    </ul>

                    <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>
                
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

        function openMobileMenu() {
            mainMenu.classList.add('active');
            hamburgerBtn.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('mobile-menu-open');
            isMenuOpen = true;
        }

        function closeMobileMenu() {
            mainMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
            isMenuOpen = false;
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

        mainMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    setTimeout(closeMobileMenu, 300);
                }
            });
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

    function markActiveLink() {
        const currentPage = window.location.pathname;
        const menuLinks = document.querySelectorAll('.navbar-main-menu a');

        menuLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    }

    window.NavbarComplete = {
        toggleMenu: function () {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn) hamburgerBtn.click();
        },
    };

    // Cargar recursos necesarios
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
})();