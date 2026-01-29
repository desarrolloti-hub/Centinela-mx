// =============================================
// THEME LOADER - Carga el tema en todas las vistas
// Adaptado a tu personalization.css
// =============================================

class ThemeLoader {
    constructor() {
        this.root = document.documentElement;
        this.cssVariables = this.getCssVariables();
    }

    // =============================================
    // OBTENER TODAS LAS VARIABLES DE TU CSS
    // =============================================
    getCssVariables() {
        return [
            // Colores base
            '--color-bg-primary',
            '--color-bg-secondary', 
            '--color-bg-tertiary',
            '--color-bg-light',
            
            // Texto
            '--color-text-primary',
            '--color-text-secondary',
            '--color-text-light',
            '--color-text-dark',
            
            // Acentos
            '--color-accent-primary',
            '--color-accent-secondary',
            '--color-accent-footer',
            
            // Efectos
            '--color-shadow',
            '--color-glow',
            '--text-shadow-effect',
            
            // Estados
            '--color-hover',
            '--color-active',
            
            // Bordes
            '--color-border-light',
            '--color-border-dark',
            
            // Sombras
            '--shadow-normal',
            '--shadow-large',
            '--shadow-small',
            
            // Transiciones
            '--transition-default',
            '--transition-fast',
            '--transition-slow',
            
            // Bordes redondeados
            '--border-radius-small',
            '--border-radius-medium',
            '--border-radius-large',
            '--border-radius-circle',
            
            // Fuentes
            '--font-family-primary',
            '--font-family-secondary',
            
            // Navbar
            '--navbar-bg',
            '--navbar-text',
            '--navbar-logo-text',
            '--navbar-link-hover',
            '--navbar-scrolled-bg',
            '--navbar-scrolled-shadow',
            
            // Footer
            '--footer-bg-primary',
            '--footer-bg-secondary',
            '--footer-text-primary',
            '--footer-text-secondary',
            '--footer-accent',
            '--footer-link-hover',
            '--footer-social-bg',
            '--footer-social-hover',
            '--footer-border-accent'
        ];
    }

    // =============================================
    // CARGAR TEMA DESDE LOCALSTORAGE
    // =============================================
    loadTheme() {
        const saved = localStorage.getItem('centinela-theme');
        
        if (saved) {
            try {
                const themeData = JSON.parse(saved);
                
                if (themeData.data && themeData.data.colors) {
                    // Aplicar colores del tema
                    this.applyColors(themeData.data.colors);
                    console.log(`🎨 Tema "${themeData.data.name}" cargado`);
                }
            } catch (e) {
                console.error('Error cargando tema:', e);
                this.applyDefaultTheme();
            }
        } else {
            console.log('🎨 Usando tema por defecto');
            // Tu CSS ya tiene los valores por defecto
        }
    }

    // =============================================
    // APLICAR COLORES AL DOCUMENTO
    // =============================================
    applyColors(colors) {
        Object.keys(colors).forEach(key => {
            // Aplicar solo si la variable existe en tu CSS
            if (this.cssVariables.includes(key)) {
                this.root.style.setProperty(key, colors[key]);
            }
        });
    }

    // =============================================
    // APLICAR TEMA POR DEFECTO
    // =============================================
    applyDefaultTheme() {
        // Tu CSS ya tiene los valores por defecto en :root
        // Solo necesitamos reiniciar cualquier cambio previo
        this.cssVariables.forEach(variable => {
            this.root.style.removeProperty(variable);
        });
    }

    // =============================================
    // ESCUCHAR CAMBIOS DE TEMA
    // =============================================
    setupThemeSync() {
        // Escuchar cambios en localStorage de otras pestañas
        window.addEventListener('storage', (event) => {
            if (event.key === 'centinela-theme') {
                console.log('🔄 Tema actualizado desde otra pestaña');
                this.loadTheme();
                
                // Notificar a componentes
                const themeChanged = new CustomEvent('themeChanged', {
                    detail: { reload: true }
                });
                document.dispatchEvent(themeChanged);
            }
        });

        // Escuchar cambios del Theme Manager
        document.addEventListener('themeChanged', (event) => {
            if (event.detail && event.detail.themeId) {
                this.loadTheme();
            }
        });
    }

    // =============================================
    // INICIALIZAR
    // =============================================
    init() {
        this.loadTheme();
        this.setupThemeSync();
        
        // Hacerlo disponible globalmente
        window.themeLoader = this;
        
        console.log('✅ Theme Loader inicializado');
        console.log('📋 Variables CSS detectadas:', this.cssVariables.length);
    }
}

// =============================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    const themeLoader = new ThemeLoader();
    themeLoader.init();
});

// Función para aplicar estilos personalizados a SweetAlert2
function applySweetAlertStyles() {
    // Verificar si ya se aplicaron los estilos
    if (document.getElementById('sweetalert-custom-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'sweetalert-custom-styles';
    style.textContent = /*css*/`
        /* Estilos personalizados para SweetAlert2 */
        .swal2-popup {
            background: var(--color-bg-tertiary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-medium) !important;
            box-shadow: var(--shadow-large) !important;
            backdrop-filter: blur(8px) !important;
            font-family: 'Rajdhani', sans-serif !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary) !important;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
        }
        
        .swal2-html-container {
            color: var(--color-text-secondary) !important;
            font-size: 1rem !important;
        }
        
        .swal2-confirm {
            background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary)) !important;
            color: white !important;
            border: none !important;
            border-radius: var(--border-radius-small) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            box-shadow: var(--shadow-small) !important;
        }
        
        .swal2-confirm:hover {
            background: linear-gradient(135deg, var(--color-accent-secondary), var(--color-accent-primary)) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal) !important;
        }
        
        .swal2-cancel {
            background: linear-gradient(135deg, var(--color-bg-tertiary), var(--color-text-secondary)) !important;
            color: var(--color-text-primary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-small) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            box-shadow: var(--shadow-small) !important;
        }
        
        .swal2-cancel:hover {
            background: linear-gradient(135deg, var(--color-text-secondary), var(--color-bg-tertiary)) !important;
            border-color: var(--color-accent-primary) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal) !important;
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Estilos de SweetAlert2 aplicados');
}

// Aplicar estilos cuando SweetAlert2 esté disponible
function initSweetAlertStyles() {
    // Verificar periódicamente si SweetAlert2 está disponible
    const checkInterval = setInterval(() => {
        if (typeof Swal !== 'undefined') {
            clearInterval(checkInterval);
            applySweetAlertStyles();
            
            // También aplicar después de que se abra un modal
            const originalFire = Swal.fire;
            Swal.fire = function(...args) {
                setTimeout(applySweetAlertStyles, 10);
                return originalFire.apply(this, args);
            };
        }
    }, 100);
    
    // Timeout después de 5 segundos
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 5000);
}

// Ejecutar cuando el documento esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSweetAlertStyles);
} else {
    initSweetAlertStyles();
}

// Exportar la función para uso externo
window.applySweetAlertStyles = applySweetAlertStyles;