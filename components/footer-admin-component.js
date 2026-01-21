// footer-component.js - Footer con fecha y hora en tiempo real
(function () {
    'use strict';

    // Evitar carga duplicada
    if (window.FooterComponentLoaded) {
        return;
    }
    window.FooterComponentLoaded = true;

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        try {
            removeOriginalFooter();
            createFooterComponent();
            updateDateTime(); // Inicializar fecha y hora
        } catch (error) {
            console.error('Error al inicializar footer:', error);
        }
    }

    function removeOriginalFooter() {
        const originalFooter = document.querySelector('footer');
        if (originalFooter) {
            originalFooter.remove();
        }
    }

    // Crear footer component
    function createFooterComponent() {
        addFooterStyles();
        createFooterHTML();
    }

    function addFooterStyles() {
        const styleId = 'footer-component-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* FOOTER CON MISMO ESTILO QUE NAVBAR */
            .footer-component {
                position: relative;
                bottom: 0;
                left: 0;
                width: 100%;
                background-color: var(--navbar-bg);
                color: var(--navbar-text);
                font-family: var(--font-family-primary, sans-serif);
                padding: 10px 0;
                font-size: 13px;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                z-index: 900;
            }
            
            .footer-component.scrolled {
                background-color: var(--navbar-scrolled-bg);
                box-shadow: var(--navbar-scrolled-shadow);
            }
            
            .footer-bottom-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 15px;
            }
            
            /* ESTRUCTURA PRINCIPAL - DESKTOP */
            .footer-bottom-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                min-height: 40px;
            }
            
            /* LOGO - IZQUIERDA */
            .footer-left {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                justify-content: flex-start;
                min-width: 0;
            }
            
            .footer-logo-link {
                display: flex;
                align-items: center;
                gap: 6px;
                text-decoration: none;
                transition: var(--transition-default);
            }
            
            .footer-logo-link:hover {
                opacity: 0.8;
            }
            
            .footer-logo {
                height: 25px;
                width: auto;
                object-fit: contain;
                filter: brightness(0) invert(1);
            }
            
            .footer-logo-text {
                color: var(--navbar-logo-text);
                font-weight: 500;
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-shadow: var(--text-shadow-effect);
            }
            
            /* COPYRIGHT - CENTRO */
            .footer-center {
                flex: 1;
                text-align: center;
                min-width: 0;
                padding: 0 10px;
            }
            
            .copyright {
                color: var(--navbar-text);
                margin: 0;
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            /* FECHA Y HORA - DERECHA */
            .footer-right {
                display: flex;
                align-items: center;
                flex: 1;
                justify-content: flex-end;
                min-width: 0;
            }
            
            .datetime-container {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 2px;
            }
            
            .date-display, .time-display {
                white-space: nowrap;
                color: var(--navbar-text);
                font-size: 11px;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }
            
            .time-display {
                font-weight: 600;
                font-family: 'Courier New', monospace;
            }
            
            /* ====== RESPONSIVE - TABLET (768px - 480px) ====== */
            @media (max-width: 768px) {
                .footer-component {
                    padding: 8px 0;
                }
                
                .footer-bottom-content {
                    flex-wrap: wrap;
                    justify-content: space-between;
                    gap: 8px;
                }
                
                .footer-left {
                    flex: 0 0 auto;
                    width: 40%;
                    justify-content: flex-start;
                }
                
                .footer-center {
                    flex: 0 0 auto;
                    width: 100%;
                    order: 3;
                    margin-top: 5px;
                    padding: 0;
                }
                
                .footer-right {
                    flex: 0 0 auto;
                    width: 60%;
                    justify-content: flex-end;
                }
                
                .footer-logo {
                    height: 22px;
                }
                
                .footer-logo-text {
                    font-size: 11px;
                }
                
                .copyright {
                    font-size: 11px;
                }
                
                .date-display, .time-display {
                    font-size: 10px;
                }
            }
            
            /* ====== RESPONSIVE - MÓVIL (480px - 320px) ====== */
            @media (max-width: 480px) {
                .footer-component {
                    padding: 6px 0;
                    font-size: 11px;
                }
                
                .footer-bottom-content {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 6px;
                }
                
                .footer-left, .footer-center, .footer-right {
                    width: 100%;
                    flex: none;
                    justify-content: center;
                    text-align: center;
                }
                
                .footer-left {
                    order: 1;
                }
                
                .footer-center {
                    order: 3;
                    margin-top: 4px;
                }
                
                .footer-right {
                    order: 2;
                }
                
                .footer-logo-link {
                    justify-content: center;
                }
                
                .datetime-container {
                    align-items: center;
                }
                
                .footer-logo {
                    height: 20px;
                }
                
                .footer-logo-text {
                    font-size: 10px;
                }
                
                .copyright {
                    font-size: 10px;
                    line-height: 1.3;
                }
                
                .date-display, .time-display {
                    font-size: 9px;
                    text-align: center;
                }
                
                .date-display {
                    display: none;
                }
                
                .time-display {
                    font-size: 10px;
                    font-weight: 700;
                }
            }
            
            /* ====== RESPONSIVE - MÓVIL MUY PEQUEÑO (< 320px) ====== */
            @media (max-width: 320px) {
                .footer-component {
                    padding: 5px 0;
                }
                
                .footer-logo-text {
                    display: none;
                }
                
                .copyright {
                    font-size: 9px;
                }
                
                .time-display {
                    font-size: 9px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    function createFooterHTML() {
        const footer = document.createElement('footer');
        footer.className = 'footer-component';

        footer.innerHTML = /*html*/ `
            <div class="footer-bottom-container">
                <div class="footer-bottom-content">
                    <!-- IZQUIERDA: Logo y RSI Enterprise -->
                    <div class="footer-left">
                        <a href="/index.html" class="footer-logo-link">
                            <img src="/assets/images/logoApp.png" alt="Centinela Logo" class="footer-logo">
                            <span class="footer-logo-text">RSI Enterprise</span>
                        </a>
                    </div>
                    
                    <!-- CENTRO: Copyright -->
                    <div class="footer-center">
                        <p class="copyright">
                            © ${new Date().getFullYear()} RSI Enterprise. Todos los derechos reservados.
                        </p>
                    </div>
                    
                    <!-- DERECHA: Fecha y Hora en tiempo real -->
                    <div class="footer-right">
                        <div class="datetime-container">
                            <div id="currentDate" class="date-display"></div>
                            <div id="currentTime" class="time-display"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(footer);
        
        // Aplicar efecto scrolled al footer también
        setupFooterScrollEffect();
    }

    // Función para aplicar efecto scroll al footer
    function setupFooterScrollEffect() {
        const footer = document.querySelector('.footer-component');
        if (!footer) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                footer.classList.add('scrolled');
            } else {
                footer.classList.remove('scrolled');
            }
        });
    }

    // Función para formatear fecha en español
    function formatDate(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        };

        return date.toLocaleDateString('es-MX', options);
    }

    // Función para formatear fecha abreviada (para móvil)
    function formatShortDate(date) {
        const options = {
            weekday: 'short',
            year: '2-digit',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        };

        return date.toLocaleDateString('es-MX', options);
    }

    // Función para formatear hora
    function formatTime(date) {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };

        return date.toLocaleTimeString('es-MX', options);
    }

    // Función para formatear hora abreviada (sin segundos)
    function formatShortTime(date) {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };

        return date.toLocaleTimeString('es-MX', options);
    }

    // Actualizar fecha y hora de manera responsive
    function updateDateTime() {
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');

        if (!dateElement || !timeElement) return;

        function update() {
            const now = new Date();
            const width = window.innerWidth;

            // Ajustar formato según tamaño de pantalla
            if (width <= 480) {
                // Móvil: mostrar solo hora, fecha oculta
                dateElement.style.display = 'none';
                timeElement.textContent = formatShortTime(now);
            } else if (width <= 768) {
                // Tablet: fecha abreviada
                dateElement.style.display = 'block';
                dateElement.textContent = formatShortDate(now);
                timeElement.textContent = formatShortTime(now);
            } else {
                // Desktop: formato completo
                dateElement.style.display = 'block';
                dateElement.textContent = formatDate(now);
                timeElement.textContent = formatTime(now);
            }
        }

        // Actualizar inmediatamente
        update();

        // Actualizar cada segundo
        setInterval(update, 1000);

        // Actualizar al cambiar tamaño de ventana
        window.addEventListener('resize', update);
    }

    // API mejorada
    window.FooterComponent = {
        refresh: function () {
            updateDateTime();
        },
        updateLogo: function (newSrc) {
            const logo = document.querySelector('.footer-logo');
            if (logo) {
                logo.src = newSrc;
            }
        },
        getCurrentDateTime: function () {
            return {
                date: formatDate(new Date()),
                time: formatTime(new Date())
            };
        },
        toggleResponsiveMode: function (enabled) {
            const dateElement = document.getElementById('currentDate');
            if (dateElement) {
                dateElement.style.display = enabled ? 'none' : 'block';
            }
        }
    };
})();