// footer-component.js - Componente autónomo de footer (CORREGIDO para modo oscuro)
(function () {
    'use strict';

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================

    if (window.FooterComponentLoaded) {
        console.log('🔄 Footer component ya cargado, omitiendo...');
        return;
    }
    window.FooterComponentLoaded = true;

    console.log('🚀 Iniciando footer component...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    async function init() {
        try {
            removeOriginalFooter();
            await createFooterComponent();
            setupFooterFunctionalities();
            observeDarkMode();
            console.log('✅ Footer component inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar footer:', error);
        }
    }

    function removeOriginalFooter() {
        const originalFooter = document.querySelector('footer');
        if (originalFooter) {
            originalFooter.remove();
            console.log('🗑️ Footer original removido');
        }
    }

    // =============================================
    // CREAR FOOTER COMPONENT
    // =============================================

    async function createFooterComponent() {
        addFooterStyles();
        createFooterHTML();
    }

    function addFooterStyles() {
        const styleId = 'footer-component-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent =/*css*/ `
            /* ====== ESTILOS DEL FOOTER ====== */
            * {
                box-sizing: border-box;
                    margin: 0;
                padding: 0;
            }
            .footer-component {
                background-color:  #00000000;
                color: #00000000;
                width: 100%;
                font-family: 'Orbitron', sans-serif;
            }
            
            /* Contenido principal del footer */
            .footer-content {
                background-color: #000000c1;
                padding: 80px 0 40px;
            }
            
            .footer-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            /* Grid del footer */
            .footer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 40px;
            }
            
            /* Columnas del footer */
            .footer-col h3 {
                font-size: 20px;
                margin-bottom: 25px;
                position: relative;
                padding-bottom: 10px;
                color: var( #ffffff) !important;
            }
            
            .footer-col h3::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 50px;
                height: 2px;
                background-color: var(--accent-footer);
            }
            
            /* Logo en el footer */
            .footer-logo {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .footer-logo-img {
                height: 40px;
            }
            
            .footer-logo span {
                font-weight: 700;
                font-size: 20px;
                color: var(--white, #ffffff) !important;
            }
            
            /* Texto "about" */
            .footer-about {
                margin-bottom: 20px;
                opacity: 0.8;
                font-size: 15px;
                line-height: 1.6;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            /* Social icons */
            .footer-social {
                display: flex;
                gap: 15px;
                margin-top: 20px;
            }
            
            .footer-social a {
                width: 40px;
                height: 40px;
                background-color: rgb(255, 255, 255);
                color: var(--white, #ffffff) !important;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease-in-out;
                text-decoration: none;
            }
            
            .footer-social a:hover {
                background-color: var( #f5d742);
                color: var(--primary, #0a2540) !important;
                transform: translateY(-3px);
                shadow: white;
            }
            
            /* Links del footer */
            .footer-links {
                list-style: none;
                padding: 0;
                margin: 0; 
            }
            
            .footer-links li {
                margin-bottom: 12px;
            }
            
            .footer-links a {
                color: rgba(255, 255, 255, 0.7) !important;
                text-decoration: none;
                transition: all 0.3s ease-in-out;
                display: flex;
                align-items: center;
                font-size: 15px;
            }
            
            .footer-links a:hover {
                text-shadow: var(--text-shadow); 
                padding-left: 5px;
            }
            
            .footer-links a i {
                margin-right: 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7) !important;
            }
            
            
            
            /* Información de contacto */
            .footer-contact {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-contact li {
                display: flex;
                align-items: flex-start;
                margin-bottom: 15px;
                font-size: 15px;
                line-height: 1.5;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            .footer-contact i {
                margin-right: 15px;
                color: var(--accent, #f5d742) !important;
                font-size: 18px;
                margin-top: 3px;
                min-width: 20px;
            }
            
            .footer-contact span {
                flex: 1;
                opacity: 0.8;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            /* Sección inferior del footer */
            .footer-bottom {
                background-color: #00000051;
                padding: 20px 0;
            }
            
            .footer-bottom-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .footer-bottom-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .copyright {
                font-size: 14px;
                opacity: 0.8;
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            .copyright a {
                color: rgba(255, 255, 255, 0.9) !important;
                text-decoration: underline;
            }
            
            .copyright a:hover {
                text-shadow: var(--text-shadow); 
            }
            
            .footer-legal {
                display: flex;
                gap: 20px;
            }
            
            .footer-legal a {
                color: rgba(255, 255, 255, 0.7) !important;
                text-decoration: none;
                font-size: 14px;
                transition: all 0.3s ease-in-out;
            }
            
            .footer-legal a:hover {
                text-shadow: 
                0 0 10px rgb(255, 255, 255),
                0 0 20px rgb(255, 255, 255),  
                0 0 30px rgb(255, 255, 255),   
                0 0 40px rgb(255, 255, 255);   
            }
            
            /* ====== RESPONSIVE ====== */
            @media (max-width: 768px) {
                .footer-content {
                    padding: 60px 0 30px;
                }
                
                .footer-grid {
                    gap: 30px;
                }
                
                .footer-bottom-content {
                    flex-direction: column;
                    text-align: center;
                    gap: 15px;
                }
                
                .footer-legal {
                    justify-content: center;
                }
            }
            
            @media (max-width: 480px) {
                .footer-content {
                    padding: 40px 0 20px;
                }
                
                .footer-grid {
                    grid-template-columns: 1fr;
                    gap: 25px;
                }
                
                .footer-col h3 {
                    font-size: 18px;
                    margin-bottom: 20px;
                }
                
                .footer-about {
                    font-size: 14px;
                }
                
                .footer-links a,
                .footer-contact li {
                    font-size: 14px;
                }
                
                .footer-contact i {
                    font-size: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    function createFooterHTML() {
        const footer = document.createElement('footer');
        footer.className = 'footer-component';

        footer.innerHTML =/*html*/ `
        <div class="footer-content">
            <div class="footer-container">
                <div class="footer-grid">
                    <!-- Columna 1: Descripción -->
                    <div class="footer-col">
                    
                        <p class="footer-about">Líderes en soluciones de seguridad electrónica en México.</p>
                        <div class="footer-social">
                            <a href="" target="_blank" title="Facebook">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="" target="_blank" title="Twitter">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="" target="_blank" title="LinkedIn">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                        </div>
                    </div>
                    
                    <!-- Columna 2: Enlaces Rápidos -->
                    <div class="footer-col">
                        <h3>Enlaces Rápidos</h3>
                        <ul class="footer-links">
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Términos y Condiciones</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Política de Privacidad</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Política de Devoluciones</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Proceso de facturación</a></li>
                        </ul>
                    </div>
                    
                    <!-- Columna 3: Servicios -->
                    <div class="footer-col">
                        <h3>Servicios</h3>
                        <ul class="footer-links">
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Seguridad electrónica</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Multimedia</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Desarrollo de Software</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Acerca de nosotros</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Contacto</a></li>
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Únete a RSI</a></li>
                        </ul>
                    </div>
                    
                    <!-- Columna 4: Contacto -->
                    <div class="footer-col">
                        <h3>Contacto</h3>
                        <ul class="footer-contact">
                            <li>
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Calle 31 #110, Col. El Sol, Nezahualcóyotl, Méx</span>
                            </li>
                            <li>
                                <i class="fas fa-phone-alt"></i>
                                <span>55 7690 8248</span>
                            </li>
                            <li>
                                <i class="fas fa-envelope"></i>
                                <span>contacto@rsienterprise.com</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer-bottom">
            <div class="footer-bottom-container">
                <div class="footer-bottom-content">
                    <p class="copyright">
                        © ${new Date().getFullYear()} RSI Enterprise. Todos los derechos reservados.
                    </p>
                    <div class="footer-legal">
                        <a href="">Política de Privacidad</a>
                        <a href="">Términos y Condiciones</a>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(footer);
    }

    // =============================================
    // CONFIGURAR FUNCIONALIDADES DEL FOOTER
    // =============================================

    function setupFooterFunctionalities() {
        // Asegurar que los enlaces externos se abran en nueva pestaña
        const externalLinks = document.querySelectorAll('.footer-component a[href^="http"]');
        externalLinks.forEach(link => {
            if (!link.href.includes(window.location.hostname)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        // Aplicar modo oscuro inicial si está activo
        applyDarkModeInitial();

        console.log('🔧 Funcionalidades del footer configuradas');
    }

    function applyDarkModeInitial() {
        if (document.body.classList.contains('dark-mode')) {
            // Forzar colores de texto en modo oscuro
            const footer = document.querySelector('.footer-component');
            if (footer) {
                footer.classList.add('dark-mode');
            }
        }
    }

    // REEMPLAZA esta función en footer-visitor-component.js
    function observeDarkMode() {
        // Usar ThemeManager si está disponible
        if (window.ThemeManager) {
            window.ThemeManager.onThemeChange((isDarkMode) => {
                const footer = document.querySelector('.footer-component');
                if (footer) {
                    if (isDarkMode) {
                        footer.classList.add('dark-mode');
                    } else {
                        footer.classList.remove('dark-mode');
                    }
                }
            });

            // Aplicar estado inicial
            const isDarkMode = window.ThemeManager.isDarkMode();
            const footer = document.querySelector('.footer-component');
            if (footer && isDarkMode) {
                footer.classList.add('dark-mode');
            }
        } else {
            // Fallback al método anterior
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const footer = document.querySelector('.footer-component');
                        if (footer) {
                            if (document.body.classList.contains('dark-mode')) {
                                footer.classList.add('dark-mode');
                            } else {
                                footer.classList.remove('dark-mode');
                            }
                        }
                    }
                });
            });

            observer.observe(document.body, { attributes: true });
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    window.FooterComponent = {
        refresh: function () {
            // Método para refrescar el footer si es necesario
            console.log('🔄 Footer actualizado');
            // Re-aplicar modo oscuro si está activo
            if (document.body.classList.contains('dark-mode')) {
                const footer = document.querySelector('.footer-component');
                if (footer) {
                    footer.classList.add('dark-mode');
                }
            }
        },

        getVersion: function () {
            return '1.1.0'; // Versión actualizada
        },

        // En footer-visitor-component.js, dentro de window.FooterComponent
        applyDarkMode: function (enable) {
            const footer = document.querySelector('.footer-component');
            if (footer) {
                if (enable) {
                    footer.classList.add('dark-mode');
                } else {
                    footer.classList.remove('dark-mode');
                }
            }
        }
    };

    // =============================================
    // CARGAR RECURSOS NECESARIOS
    // =============================================

    // Verificar si Font Awesome ya está cargado
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }

    // Verificar si la fuente Poppins ya está cargada
    if (!document.querySelector('link[href*="poppins"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }

    console.log('✅ Footer component cargado y listo');
})();