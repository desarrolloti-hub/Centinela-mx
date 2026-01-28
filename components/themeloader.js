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