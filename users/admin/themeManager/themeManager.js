// =============================================
// THEME MANAGER - Centinela Security
// Vista de administración - Gestión de temas
// =============================================

class ThemeManager {
    constructor() {
        // Estado del manager
        this.currentTheme = 'default';
        this.root = document.documentElement;
        this.initialized = false;
        
        // Variables CSS del archivo personalization.css
        this.cssVariables = [
            // Colores base
            '--color-bg-primary',
            '--color-bg-secondary',
            '--color-bg-tertiary',
            '--color-bg-light',
            
            // Colores de texto
            '--color-text-primary',
            '--color-text-secondary',
            '--color-text-light',
            '--color-text-dark',
            
            // Colores de acento
            '--color-accent-primary',
            '--color-accent-secondary',
            '--color-accent-footer',
            
            // Efectos visuales
            '--color-shadow',
            '--color-glow',
            
            // Estados
            '--color-hover',
            '--color-active',
            
            // Bordes
            '--color-border-light',
            '--color-border-dark',
            
            // Componentes específicos
            '--navbar-bg',
            '--navbar-text',
            '--navbar-logo-text',
            '--navbar-scrolled-bg',
            
            '--footer-bg-primary',
            '--footer-bg-secondary',
            '--footer-text-primary',
            '--footer-text-secondary',
            '--footer-social-bg'
        ];
    }

    // =============================================
    // TEMAS PREDEFINIDOS - 12 temas completos
    // =============================================
    getThemePresets() {
        return {
            'default': {
                name: 'Predeterminado',
                description: 'Tema oscuro con acentos plateados',
                colors: {
                    '--color-bg-primary': '#000000',
                    '--color-bg-secondary': '#00000000',
                    '--color-bg-tertiary': '#0000007a',
                    '--color-bg-light': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': 'rgba(255, 255, 255, 0.8)',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#000000',
                    '--color-accent-primary': '#c0c0c0',
                    '--color-accent-secondary': '#ffffff',
                    '--color-accent-footer': '#ffffff',
                    '--color-shadow': 'rgba(255, 255, 255, 0.55)',
                    '--color-glow': '#ffffff',
                    '--color-hover': 'rgba(245, 215, 66, 0)',
                    '--color-active': '#c0c0c0',
                    '--color-border-light': 'rgba(255, 255, 255, 0.1)',
                    '--color-border-dark': '#3d8ad6',
                    '--navbar-bg': 'var(--color-bg-secondary)',
                    '--navbar-text': 'var(--color-text-primary)',
                    '--navbar-logo-text': 'var(--color-text-primary)',
                    '--navbar-scrolled-bg': 'var(--color-bg-primary)',
                    '--footer-bg-primary': 'var(--color-bg-secondary)',
                    '--footer-bg-secondary': 'var(--color-bg-tertiary)',
                    '--footer-text-primary': 'var(--color-text-primary)',
                    '--footer-text-secondary': 'var(--color-text-secondary)',
                    '--footer-social-bg': 'rgb(3, 3, 3)'
                }
            },
            'dark-blue': {
                name: 'Azul Profundo',
                description: 'Azules oscuros con acentos vibrantes',
                colors: {
                    '--color-bg-primary': '#0a1929',
                    '--color-bg-secondary': '#0d1b2a',
                    '--color-bg-tertiary': '#1b263b',
                    '--color-bg-light': '#e0e1dd',
                    '--color-text-primary': '#e0e1dd',
                    '--color-text-secondary': '#778da9',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#0a1929',
                    '--color-accent-primary': '#3a6ff8',
                    '--color-accent-secondary': '#00d4ff',
                    '--color-accent-footer': '#3a6ff8',
                    '--color-shadow': 'rgba(58, 111, 248, 0.5)',
                    '--color-glow': '#3a6ff8',
                    '--color-hover': 'rgba(58, 111, 248, 0.2)',
                    '--color-active': '#00d4ff',
                    '--color-border-light': 'rgba(58, 111, 248, 0.2)',
                    '--color-border-dark': '#00d4ff',
                    '--navbar-bg': '#0d1b2a',
                    '--navbar-text': '#e0e1dd',
                    '--navbar-logo-text': '#00d4ff',
                    '--navbar-scrolled-bg': '#0a1929',
                    '--footer-bg-primary': '#0d1b2a',
                    '--footer-bg-secondary': '#1b263b',
                    '--footer-text-primary': '#e0e1dd',
                    '--footer-text-secondary': '#778da9',
                    '--footer-social-bg': '#0a1929'
                }
            },
            'cyberpunk': {
                name: 'Cyberpunk',
                description: 'Tema neón con magenta y cian',
                colors: {
                    '--color-bg-primary': '#0a0a12',
                    '--color-bg-secondary': '#151522',
                    '--color-bg-tertiary': '#1a1a2e',
                    '--color-bg-light': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#a0a0ff',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#000000',
                    '--color-accent-primary': '#ff00ff',
                    '--color-accent-secondary': '#00ffff',
                    '--color-accent-footer': '#ff00ff',
                    '--color-shadow': 'rgba(255, 0, 255, 0.5)',
                    '--color-glow': '#ff00ff',
                    '--color-hover': 'rgba(255, 0, 255, 0.2)',
                    '--color-active': '#00ffff',
                    '--color-border-light': 'rgba(255, 0, 255, 0.2)',
                    '--color-border-dark': '#00ffff',
                    '--navbar-bg': '#151522',
                    '--navbar-text': '#ffffff',
                    '--navbar-logo-text': '#00ffff',
                    '--navbar-scrolled-bg': '#0a0a12',
                    '--footer-bg-primary': '#151522',
                    '--footer-bg-secondary': '#1a1a2e',
                    '--footer-text-primary': '#ffffff',
                    '--footer-text-secondary': '#a0a0ff',
                    '--footer-social-bg': '#0a0a12'
                }
            },
            'green-tech': {
                name: 'Tecnología Verde',
                description: 'Verdes brillantes sobre fondo oscuro',
                colors: {
                    '--color-bg-primary': '#0a140a',
                    '--color-bg-secondary': '#121f12',
                    '--color-bg-tertiary': '#1a291a',
                    '--color-bg-light': '#e8f5e9',
                    '--color-text-primary': '#e8f5e9',
                    '--color-text-secondary': '#a5d6a7',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#0a140a',
                    '--color-accent-primary': '#00ff88',
                    '--color-accent-secondary': '#00ffaa',
                    '--color-accent-footer': '#00ff88',
                    '--color-shadow': 'rgba(0, 255, 136, 0.5)',
                    '--color-glow': '#00ff88',
                    '--color-hover': 'rgba(0, 255, 136, 0.2)',
                    '--color-active': '#00ffaa',
                    '--color-border-light': 'rgba(0, 255, 136, 0.2)',
                    '--color-border-dark': '#00ffaa',
                    '--navbar-bg': '#121f12',
                    '--navbar-text': '#e8f5e9',
                    '--navbar-logo-text': '#00ffaa',
                    '--navbar-scrolled-bg': '#0a140a',
                    '--footer-bg-primary': '#121f12',
                    '--footer-bg-secondary': '#1a291a',
                    '--footer-text-primary': '#e8f5e9',
                    '--footer-text-secondary': '#a5d6a7',
                    '--footer-social-bg': '#0a140a'
                }
            },
            'warm-dark': {
                name: 'Oscuro Cálido',
                description: 'Tono cálido con naranjas',
                colors: {
                    '--color-bg-primary': '#1a120b',
                    '--color-bg-secondary': '#2c1e0f',
                    '--color-bg-tertiary': '#3d2b13',
                    '--color-bg-light': '#f5f5f5',
                    '--color-text-primary': '#f5f5f5',
                    '--color-text-secondary': '#d7ccc8',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#1a120b',
                    '--color-accent-primary': '#ff9800',
                    '--color-accent-secondary': '#ffb74d',
                    '--color-accent-footer': '#ff9800',
                    '--color-shadow': 'rgba(255, 152, 0, 0.5)',
                    '--color-glow': '#ff9800',
                    '--color-hover': 'rgba(255, 152, 0, 0.2)',
                    '--color-active': '#ffb74d',
                    '--color-border-light': 'rgba(255, 152, 0, 0.2)',
                    '--color-border-dark': '#ffb74d',
                    '--navbar-bg': '#2c1e0f',
                    '--navbar-text': '#f5f5f5',
                    '--navbar-logo-text': '#ffb74d',
                    '--navbar-scrolled-bg': '#1a120b',
                    '--footer-bg-primary': '#2c1e0f',
                    '--footer-bg-secondary': '#3d2b13',
                    '--footer-text-primary': '#f5f5f5',
                    '--footer-text-secondary': '#d7ccc8',
                    '--footer-social-bg': '#1a120b'
                }
            },
            'purple-matrix': {
                name: 'Matrix Púrpura',
                description: 'Morados profundos y vibrantes',
                colors: {
                    '--color-bg-primary': '#0f0a1a',
                    '--color-bg-secondary': '#1a1226',
                    '--color-bg-tertiary': '#251a33',
                    '--color-bg-light': '#f3e5f5',
                    '--color-text-primary': '#f3e5f5',
                    '--color-text-secondary': '#ce93d8',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#0f0a1a',
                    '--color-accent-primary': '#9c27b0',
                    '--color-accent-secondary': '#e040fb',
                    '--color-accent-footer': '#9c27b0',
                    '--color-shadow': 'rgba(156, 39, 176, 0.5)',
                    '--color-glow': '#9c27b0',
                    '--color-hover': 'rgba(156, 39, 176, 0.2)',
                    '--color-active': '#e040fb',
                    '--color-border-light': 'rgba(156, 39, 176, 0.2)',
                    '--color-border-dark': '#e040fb',
                    '--navbar-bg': '#1a1226',
                    '--navbar-text': '#f3e5f5',
                    '--navbar-logo-text': '#e040fb',
                    '--navbar-scrolled-bg': '#0f0a1a',
                    '--footer-bg-primary': '#1a1226',
                    '--footer-bg-secondary': '#251a33',
                    '--footer-text-primary': '#f3e5f5',
                    '--footer-text-secondary': '#ce93d8',
                    '--footer-social-bg': '#0f0a1a'
                }
            },
            'red-alert': {
                name: 'Alerta Roja',
                description: 'Rojos intensos para alertas',
                colors: {
                    '--color-bg-primary': '#1a0a0a',
                    '--color-bg-secondary': '#2a1515',
                    '--color-bg-tertiary': '#3a2020',
                    '--color-bg-light': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#ffcccc',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#1a0a0a',
                    '--color-accent-primary': '#ff0000',
                    '--color-accent-secondary': '#ff4444',
                    '--color-accent-footer': '#ff0000',
                    '--color-shadow': 'rgba(255, 0, 0, 0.5)',
                    '--color-glow': '#ff0000',
                    '--color-hover': 'rgba(255, 0, 0, 0.2)',
                    '--color-active': '#ff4444',
                    '--color-border-light': 'rgba(255, 0, 0, 0.2)',
                    '--color-border-dark': '#ff4444',
                    '--navbar-bg': '#2a1515',
                    '--navbar-text': '#ffffff',
                    '--navbar-logo-text': '#ff4444',
                    '--navbar-scrolled-bg': '#1a0a0a',
                    '--footer-bg-primary': '#2a1515',
                    '--footer-bg-secondary': '#3a2020',
                    '--footer-text-primary': '#ffffff',
                    '--footer-text-secondary': '#ffcccc',
                    '--footer-social-bg': '#1a0a0a'
                }
            },
            'navy-blue': {
                name: 'Azul Marino',
                description: 'Azul marino profundo',
                colors: {
                    '--color-bg-primary': '#0a192f',
                    '--color-bg-secondary': '#172a45',
                    '--color-bg-tertiary': '#1e3a5f',
                    '--color-bg-light': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#93c5fd',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#0a192f',
                    '--color-accent-primary': '#1e3a8a',
                    '--color-accent-secondary': '#3b82f6',
                    '--color-accent-footer': '#1e3a8a',
                    '--color-shadow': 'rgba(30, 58, 138, 0.5)',
                    '--color-glow': '#1e3a8a',
                    '--color-hover': 'rgba(30, 58, 138, 0.2)',
                    '--color-active': '#3b82f6',
                    '--color-border-light': 'rgba(30, 58, 138, 0.2)',
                    '--color-border-dark': '#3b82f6',
                    '--navbar-bg': '#172a45',
                    '--navbar-text': '#ffffff',
                    '--navbar-logo-text': '#3b82f6',
                    '--navbar-scrolled-bg': '#0a192f',
                    '--footer-bg-primary': '#172a45',
                    '--footer-bg-secondary': '#1e3a5f',
                    '--footer-text-primary': '#ffffff',
                    '--footer-text-secondary': '#93c5fd',
                    '--footer-social-bg': '#0a192f'
                }
            },
            'golden': {
                name: 'Dorado',
                description: 'Tema lujoso en dorado',
                colors: {
                    '--color-bg-primary': '#1a140a',
                    '--color-bg-secondary': '#2c230f',
                    '--color-bg-tertiary': '#3d3213',
                    '--color-bg-light': '#fff8e1',
                    '--color-text-primary': '#fff8e1',
                    '--color-text-secondary': '#ffecb3',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#1a140a',
                    '--color-accent-primary': '#ffd700',
                    '--color-accent-secondary': '#ffed4e',
                    '--color-accent-footer': '#ffd700',
                    '--color-shadow': 'rgba(255, 215, 0, 0.5)',
                    '--color-glow': '#ffd700',
                    '--color-hover': 'rgba(255, 215, 0, 0.2)',
                    '--color-active': '#ffed4e',
                    '--color-border-light': 'rgba(255, 215, 0, 0.2)',
                    '--color-border-dark': '#ffed4e',
                    '--navbar-bg': '#2c230f',
                    '--navbar-text': '#fff8e1',
                    '--navbar-logo-text': '#ffed4e',
                    '--navbar-scrolled-bg': '#1a140a',
                    '--footer-bg-primary': '#2c230f',
                    '--footer-bg-secondary': '#3d3213',
                    '--footer-text-primary': '#fff8e1',
                    '--footer-text-secondary': '#ffecb3',
                    '--footer-social-bg': '#1a140a'
                }
            },
            'orange-fire': {
                name: 'Fuego Naranja',
                description: 'Naranjas vibrantes y cálidos',
                colors: {
                    '--color-bg-primary': '#1a0f0a',
                    '--color-bg-secondary': '#2c1a0f',
                    '--color-bg-tertiary': '#3d2413',
                    '--color-bg-light': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#ffd9b3',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#1a0f0a',
                    '--color-accent-primary': '#ff6600',
                    '--color-accent-secondary': '#ff8533',
                    '--color-accent-footer': '#ff6600',
                    '--color-shadow': 'rgba(255, 102, 0, 0.5)',
                    '--color-glow': '#ff6600',
                    '--color-hover': 'rgba(255, 102, 0, 0.2)',
                    '--color-active': '#ff8533',
                    '--color-border-light': 'rgba(255, 102, 0, 0.2)',
                    '--color-border-dark': '#ff8533',
                    '--navbar-bg': '#2c1a0f',
                    '--navbar-text': '#ffffff',
                    '--navbar-logo-text': '#ff8533',
                    '--navbar-scrolled-bg': '#1a0f0a',
                    '--footer-bg-primary': '#2c1a0f',
                    '--footer-bg-secondary': '#3d2413',
                    '--footer-text-primary': '#ffffff',
                    '--footer-text-secondary': '#ffd9b3',
                    '--footer-social-bg': '#1a0f0a'
                }
            },
            'pink-neon': {
                name: 'Neón Rosa',
                description: 'Rosa neón vibrante',
                colors: {
                    '--color-bg-primary': '#1a0a14',
                    '--color-bg-secondary': '#2a1520',
                    '--color-bg-tertiary': '#3a202c',
                    '--color-bg-light': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#ffccdd',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#1a0a14',
                    '--color-accent-primary': '#ff00aa',
                    '--color-accent-secondary': '#ff66cc',
                    '--color-accent-footer': '#ff00aa',
                    '--color-shadow': 'rgba(255, 0, 170, 0.5)',
                    '--color-glow': '#ff00aa',
                    '--color-hover': 'rgba(255, 0, 170, 0.2)',
                    '--color-active': '#ff66cc',
                    '--color-border-light': 'rgba(255, 0, 170, 0.2)',
                    '--color-border-dark': '#ff66cc',
                    '--navbar-bg': '#2a1520',
                    '--navbar-text': '#ffffff',
                    '--navbar-logo-text': '#ff66cc',
                    '--navbar-scrolled-bg': '#1a0a14',
                    '--footer-bg-primary': '#2a1520',
                    '--footer-bg-secondary': '#3a202c',
                    '--footer-text-primary': '#ffffff',
                    '--footer-text-secondary': '#ffccdd',
                    '--footer-social-bg': '#1a0a14'
                }
            },
            'deep-purple': {
                name: 'Morado Oscuro',
                description: 'Morados profundos y oscuros',
                colors: {
                    '--color-bg-primary': '#140a1a',
                    '--color-bg-secondary': '#22152a',
                    '--color-bg-tertiary': '#30203a',
                    '--color-bg-light': '#f3e5f5',
                    '--color-text-primary': '#f3e5f5',
                    '--color-text-secondary': '#d8bfd8',
                    '--color-text-light': '#ffffff',
                    '--color-text-dark': '#140a1a',
                    '--color-accent-primary': '#6a0dad',
                    '--color-accent-secondary': '#8a2be2',
                    '--color-accent-footer': '#6a0dad',
                    '--color-shadow': 'rgba(106, 13, 173, 0.5)',
                    '--color-glow': '#6a0dad',
                    '--color-hover': 'rgba(106, 13, 173, 0.2)',
                    '--color-active': '#8a2be2',
                    '--color-border-light': 'rgba(106, 13, 173, 0.2)',
                    '--color-border-dark': '#8a2be2',
                    '--navbar-bg': '#22152a',
                    '--navbar-text': '#f3e5f5',
                    '--navbar-logo-text': '#8a2be2',
                    '--navbar-scrolled-bg': '#140a1a',
                    '--footer-bg-primary': '#22152a',
                    '--footer-bg-secondary': '#30203a',
                    '--footer-text-primary': '#f3e5f5',
                    '--footer-text-secondary': '#d8bfd8',
                    '--footer-social-bg': '#140a1a'
                }
            }
        };
    }

    // =============================================
    // INICIALIZACIÓN DEL MANAGER
    // =============================================
    init() {
        if (this.initialized) return;
        
        this.loadSavedTheme();
        this.setupEventListeners();
        this.generateThemeList();
        this.updateUI();
        this.initialized = true;
        
        console.log('🎨 Theme Manager (Admin View) inicializado');
        
        // Hacerlo disponible globalmente
        window.themeManager = this;
    }

    // =============================================
    // GENERAR LISTA DE TEMAS EN EL DOM
    // =============================================
    generateThemeList() {
        const container = document.getElementById('themeList');
        if (!container) return;
        
        container.innerHTML = '';
        
        const themePresets = this.getThemePresets();
        Object.keys(themePresets).forEach(themeId => {
            const theme = themePresets[themeId];
            
            const themeElement = document.createElement('div');
            themeElement.className = 'theme-item';
            themeElement.dataset.themeId = themeId;
            
            // Crear vista previa de colores (5 colores principales)
            const colorKeys = Object.keys(theme.colors);
            const previewColors = [
                theme.colors['--color-bg-primary'] || '#000000',
                theme.colors['--color-bg-secondary'] || '#111111',
                theme.colors['--color-accent-primary'] || '#c0c0c0',
                theme.colors['--color-accent-secondary'] || '#ffffff',
                theme.colors['--color-text-primary'] || '#ffffff'
            ];
            
            themeElement.innerHTML = `
                <div class="theme-colors">
                    ${previewColors.map(color => 
                        `<div class="theme-color" style="background-color: ${color}"></div>`
                    ).join('')}
                </div>
                <div class="theme-name">${theme.name}</div>
            `;
            
            container.appendChild(themeElement);
        });
        
        // Marcar tema actual como activo
        this.markCurrentTheme();
    }

    // =============================================
    // CONFIGURAR EVENT LISTENERS
    // =============================================
    setupEventListeners() {
        // Selección de temas
        document.addEventListener('click', (e) => {
            const themeItem = e.target.closest('.theme-item');
            if (themeItem) {
                this.selectThemeItem(themeItem);
            }
        });
        
        // Botón aplicar tema
        const applyBtn = document.getElementById('applyTheme');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySelectedTheme();
            });
        }
        
        // Botón restablecer
        const resetBtn = document.getElementById('resetTheme');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefault();
            });
        }
    }

    // =============================================
    // FUNCIONALIDADES PRINCIPALES
    // =============================================
    selectThemeItem(themeItem) {
        // Remover active de todos los temas
        document.querySelectorAll('.theme-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Agregar active al seleccionado
        themeItem.classList.add('active');
        
        // Actualizar tema seleccionado
        this.selectedThemeId = themeItem.dataset.themeId;
        
        // Aplicar vista previa del tema
        this.previewTheme(this.selectedThemeId);
    }

    previewTheme(themeId) {
        const themePresets = this.getThemePresets();
        const theme = themePresets[themeId];
        
        if (!theme) return;
        
        // Aplicar colores temporalmente (solo para previsualización)
        Object.keys(theme.colors).forEach(key => {
            this.root.style.setProperty(key, theme.colors[key]);
        });
        
        // Actualizar nombre en previsualización
        document.getElementById('currentThemeName').textContent = theme.name;
    }

    applySelectedTheme() {
        if (!this.selectedThemeId) {
            this.showNotification('Selecciona un tema primero', 'error');
            return;
        }
        
        const themePresets = this.getThemePresets();
        const theme = themePresets[this.selectedThemeId];
        
        // Aplicar tema permanentemente
        this.applyColors(theme.colors);
        
        // Actualizar tema actual
        this.currentTheme = this.selectedThemeId;
        
        // Guardar en localStorage
        this.saveToLocalStorage(this.selectedThemeId, theme);
        
        // Actualizar UI
        this.updateUI();
        
        // MOSTRAR NOTIFICACIÓN
        this.showNotification(`Tema "${theme.name}" aplicado correctamente`);
        
        // MARCA COMO ACTIVO
        this.markCurrentTheme();
        
        // =============================================
        // ¡EVENTO AÑADIDO AQUÍ!
        // =============================================
        // Disparar evento para notificar a partículas y otros componentes
        const themeChangedEvent = new CustomEvent('themeChanged', {
            detail: {
                themeId: this.selectedThemeId,
                themeName: theme.name,
                colors: theme.colors
            }
        });
        document.dispatchEvent(themeChangedEvent);
        
        console.log(`🎨 Evento themeChanged disparado para tema: ${theme.name}`);
    }

    applyColors(colors) {
        Object.keys(colors).forEach(key => {
            this.root.style.setProperty(key, colors[key]);
        });
    }

    resetToDefault() {
        this.selectedThemeId = 'default';
        this.applySelectedTheme();
    }

    // =============================================
    // ACTUALIZACIÓN DE INTERFAZ
    // =============================================
    updateUI() {
        const themePresets = this.getThemePresets();
        const currentTheme = themePresets[this.currentTheme];
        
        if (currentTheme) {
            document.getElementById('currentThemeName').textContent = currentTheme.name;
        }
        
        // Actualizar hora de última modificación
        const lastSave = localStorage.getItem('centinela-theme-last-save');
        if (lastSave) {
            const saveDate = new Date(parseInt(lastSave));
            document.getElementById('updateTime').textContent = saveDate.toLocaleString();
        }
    }

    markCurrentTheme() {
        // Remover active de todos
        document.querySelectorAll('.theme-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Agregar active al tema actual
        const currentItem = document.querySelector(`[data-theme-id="${this.currentTheme}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
            this.selectedThemeId = this.currentTheme;
        }
    }

    // =============================================
    // LOCALSTORAGE
    // =============================================
    saveToLocalStorage(themeId, themeData) {
        const saveData = {
            themeId: themeId,
            data: themeData,
            savedAt: Date.now()
        };
        
        localStorage.setItem('centinela-theme', JSON.stringify(saveData));
        localStorage.setItem('centinela-theme-last-save', Date.now().toString());
        
        // Disparar evento de storage para sincronizar entre pestañas
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'centinela-theme',
            newValue: JSON.stringify(saveData)
        }));
    }

    loadSavedTheme() {
        const saved = localStorage.getItem('centinela-theme');
        
        if (saved) {
            try {
                const themeData = JSON.parse(saved);
                this.currentTheme = themeData.themeId;
                
                const themePresets = this.getThemePresets();
                if (themePresets[this.currentTheme] && themeData.data.colors) {
                    // Aplicar tema guardado
                    this.applyColors(themeData.data.colors);
                }
                
                console.log('🎨 Tema cargado desde localStorage');
            } catch (e) {
                console.error('Error cargando tema:', e);
                this.resetToDefault();
            }
        } else {
            this.resetToDefault();
        }
    }

    // =============================================
    // UTILIDADES
    // =============================================
    showNotification(message, type = 'success') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            ${message}
        `;
        
        // Estilos para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--color-accent-primary)' : '#ff4444'};
            color: var(--color-text-dark);
            padding: 15px 25px;
            border-radius: var(--border-radius-medium);
            box-shadow: var(--shadow-large);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
            font-family: var(--font-family-primary, 'Orbitron');
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Añadir estilos de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =============================================
    // API PÚBLICA
    // =============================================
    getCurrentTheme() {
        const themePresets = this.getThemePresets();
        return {
            id: this.currentTheme,
            name: themePresets[this.currentTheme] ? themePresets[this.currentTheme].name : 'Predeterminado',
            colors: this.getCurrentColors()
        };
    }

    getCurrentColors() {
        const colors = {};
        this.cssVariables.forEach(variable => {
            colors[variable] = getComputedStyle(this.root).getPropertyValue(variable).trim();
        });
        return colors;
    }
}

// =============================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    const themeManager = new ThemeManager();
    themeManager.init();
});