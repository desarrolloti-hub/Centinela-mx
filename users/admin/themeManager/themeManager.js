// =============================================
// THEME MANAGER - Centinela Security
// Vista de administración - Gestión de temas
// =============================================

// Importar solo UserManager (ya que user.js ya importa Firebase)
import { UserManager } from '/clases/user.js';

class ThemeManager {
    constructor(userManager = null) {
        // Estado del manager
        this.currentTheme = 'default';
        this.root = document.documentElement;
        this.initialized = false;
        this.selectedThemeId = null;
        
        // Referencia al UserManager para obtener datos del usuario
        this.userManager = userManager || window.userManager;
        
        console.log('🎨 ThemeManager creado', { 
            tieneUserManager: !!this.userManager,
            usuarioActual: this.userManager?.currentUser 
        });
        
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
                    '--color-bg-primary': '#000000',
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
                    '--color-bg-primary': '#000000',
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
            'camo-green': {
                name: 'Camuflaje Militar',
                description: 'Tema inspirado en patrones de camuflaje',
                colors: {
                    '--color-bg-primary': '#000000',
                    '--color-bg-secondary': '#1a271a',    
                    '--color-bg-tertiary': '#2d3d2d',    
                    '--color-bg-light': '#e0ecd9',       
                    '--color-text-primary': '#c2d4c2',
                    '--color-text-secondary': '#7a8c7a',    
                    '--color-text-light': '#e8f0e8',
                    '--color-text-dark': '#142014',
                    '--color-accent-primary': '#5d6b3d',   
                    '--color-accent-secondary': '#788f45', 
                    '--color-accent-footer': '#4a5a30', 
                    '--color-shadow': 'rgba(93, 107, 61, 0.35)',
                    '--color-glow': 'rgba(120, 143, 69, 0.45)',
                    '--color-hover': 'rgba(93, 107, 61, 0.12)',
                    '--color-active': '#788f45',
                    '--color-border-light': 'rgba(120, 143, 69, 0.2)',
                    '--color-border-dark': '#4a5a30',
                    '--navbar-bg': 'linear-gradient(135deg, #1a271a 0%, #2d3d2d 100%)',
                    '--navbar-text': '#c2d4c2',
                    '--navbar-logo-text': '#788f45',
                    '--navbar-scrolled-bg': '#162016',
                    '--footer-bg-primary': '#1a271a',
                    '--footer-bg-secondary': '#2d3d2d',
                    '--footer-text-primary': '#c2d4c2',
                    '--footer-text-secondary': '#7a8c7a',
                    '--footer-social-bg': '#142014'
                }
            },
            'military-green': {
                name: 'Verde Militar',
                description: 'Tema inspirado en equipamiento militar y camuflaje',
                colors: {
                    '--color-bg-primary': '#000000',
                    '--color-bg-secondary': '#0d1c0d', 
                    '--color-bg-tertiary': '#1a2c1a', 
                    '--color-bg-light': '#e8f5e0',    
                    '--color-text-primary': '#d4e8d4', 
                    '--color-text-secondary': '#8ba88b',   
                    '--color-text-light': '#f0f8f0',
                    '--color-text-dark': '#0a140a',
                    '--color-accent-primary': '#556b2f',
                    '--color-accent-secondary': '#6b8e23',
                    '--color-accent-footer': '#4d5d2b',    
                    '--color-shadow': 'rgba(85, 107, 47, 0.4)',
                    '--color-glow': 'rgba(107, 142, 35, 0.5)',   
                    '--color-hover': 'rgba(85, 107, 47, 0.15)',
                    '--color-active': '#6b8e23', 
                    '--color-border-light': 'rgba(107, 142, 35, 0.25)',
                    '--color-border-dark': '#4d5d2b',
                    '--navbar-bg': '#0d1c0d',
                    '--navbar-text': '#d4e8d4',
                    '--navbar-logo-text': '#6b8e23', 
                    '--navbar-scrolled-bg': '#091409',
                    '--footer-bg-primary': '#0d1c0d',
                    '--footer-bg-secondary': '#1a2c1a',
                    '--footer-text-primary': '#d4e8d4',
                    '--footer-text-secondary': '#8ba88b',
                    '--footer-social-bg': '#0a140a'
                }
            },
            'purple-matrix': {
                name: 'Matrix Púrpura',
                description: 'Morados profundos y vibrantes',
                colors: {
                    '--color-bg-primary': '#000000',
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
                    '--color-bg-primary': '#000000',
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
                    '--color-bg-primary': '#000000',
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
            'gold-24k': {
                name: 'Oro 24K',
                description: 'Tema de máximo lujo con oro puro',
                colors: {
                    '--color-bg-primary': '#0c0a06',     
                    '--color-bg-secondary': '#1c170f',
                    '--color-bg-tertiary': '#332c1f',  
                    '--color-bg-light': '#f9efcc',  
                    '--color-text-primary': '#ffeaa7',
                    '--color-text-secondary': '#d4b483',
                    '--color-text-light': '#fff4d1',       
                    '--color-text-dark': '#1c170f',
                    '--color-accent-primary': '#ffd166',
                    '--color-accent-secondary': '#f9c74f',
                    '--color-accent-footer': '#e6b422',
                    '--color-shadow': 'rgba(255, 209, 102, 0.4)', 
                    '--color-glow': 'rgba(249, 199, 79, 0.6)',
                    '--color-hover': 'rgba(255, 209, 102, 0.15)',
                    '--color-active': '#f9c74f',
                    '--color-border-light': 'rgba(249, 199, 79, 0.3)',
                    '--color-border-dark': '#e6b422',
                    '--navbar-bg': 'linear-gradient(135deg, #1c170f 0%, #332c1f 100%)',
                    '--navbar-text': '#ffeaa7',    
                    '--navbar-logo-text': '#f9c74f',     
                    '--navbar-scrolled-bg': '#18130c',
                    '--footer-bg-primary': '#1c170f',
                    '--footer-bg-secondary': '#332c1f',
                    '--footer-text-primary': '#ffeaa7', 
                    '--footer-text-secondary': '#d4b483',
                    '--footer-social-bg': '#0c0a06'
                }
            },
            'orange-fire': {
                name: 'Fuego Naranja',
                description: 'Naranjas vibrantes y cálidos',
                colors: {
                    '--color-bg-primary': '#000000',
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
                    '--color-bg-primary': '#000000',
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
                    '--color-bg-primary': '#000000',
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
    async init() {
        if (this.initialized) {
            console.log('ThemeManager ya está inicializado');
            return;
        }
        
        console.log('Inicializando ThemeManager...');
        
        // Cargar tema guardado
        await this.loadSavedTheme();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Generar lista de temas
        this.generateThemeList();
        
        // Actualizar UI
        this.updateUI();
        
        this.initialized = true;
        
        console.log('🎨 Theme Manager (Admin View) inicializado correctamente');
        console.log('Temas disponibles:', Object.keys(this.getThemePresets()).length);
        
        // Hacerlo disponible globalmente
        window.themeManager = this;
    }

    // =============================================
    // GENERAR LISTA DE TEMAS EN EL DOM
    // =============================================
    generateThemeList() {
        const container = document.getElementById('themeList');
        if (!container) {
            console.error('No se encontró el contenedor #themeList');
            return;
        }
        
        console.log('Generando lista de temas...');
        
        const themePresets = this.getThemePresets();
        const themeIds = Object.keys(themePresets);
        
        console.log(`Generando ${themeIds.length} temas`);
        
        container.innerHTML = '';
        
        themeIds.forEach(themeId => {
            const theme = themePresets[themeId];
            
            const themeElement = document.createElement('div');
            themeElement.className = 'theme-item';
            themeElement.dataset.themeId = themeId;
            
            // Crear vista previa de colores (5 colores principales)
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
        
        console.log('Lista de temas generada correctamente');
        
        // Marcar tema actual como activo
        this.markCurrentTheme();
    }

    // =============================================
    // CONFIGURAR EVENT LISTENERS
    // =============================================
    setupEventListeners() {
        console.log('Configurando event listeners...');
        
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
            console.log('Botón aplicar configurado');
        } else {
            console.error('No se encontró el botón #applyTheme');
        }
        
        // Botón restablecer
        const resetBtn = document.getElementById('resetTheme');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefault();
            });
            console.log('Botón restablecer configurado');
        } else {
            console.error('No se encontró el botón #resetTheme');
        }
        
        console.log('Event listeners configurados correctamente');
    }

    // =============================================
    // FUNCIONALIDADES PRINCIPALES
    // =============================================
    selectThemeItem(themeItem) {
        console.log('Seleccionando tema:', themeItem.dataset.themeId);
        
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
        
        if (!theme) {
            console.error('Tema no encontrado:', themeId);
            return;
        }
        
        console.log('Aplicando previsualización del tema:', theme.name);
        
        // Aplicar colores temporalmente (solo para previsualización)
        Object.keys(theme.colors).forEach(key => {
            this.root.style.setProperty(key, theme.colors[key]);
        });
        
        // Actualizar nombre en previsualización
        const nameElement = document.getElementById('currentThemeName');
        if (nameElement) {
            nameElement.textContent = theme.name;
        }
    }

    async applySelectedTheme() {
        if (!this.selectedThemeId) {
            this.showNotification('Selecciona un tema primero', 'error');
            console.warn('No hay tema seleccionado');
            return;
        }
        
        const themePresets = this.getThemePresets();
        const theme = themePresets[this.selectedThemeId];
        
        if (!theme) {
            console.error('Tema no encontrado:', this.selectedThemeId);
            return;
        }
        
        console.log('Aplicando tema:', theme.name);
        
        // Aplicar tema permanentemente
        this.applyColors(theme.colors);
        
        // Actualizar tema actual
        this.currentTheme = this.selectedThemeId;
        
        // Guardar en localStorage (para respaldo)
        this.saveToLocalStorage(this.selectedThemeId, theme);
        
        // Guardar en Firebase si está disponible
        await this.saveThemeToFirebase(this.selectedThemeId);
        
        // Actualizar UI
        this.updateUI();
        
        // MOSTRAR NOTIFICACIÓN
        this.showNotification(`Tema "${theme.name}" aplicado correctamente`);
        
        // MARCA COMO ACTIVO
        this.markCurrentTheme();
        
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

    async resetToDefault() {
        console.log('Restableciendo a tema predeterminado');
        this.selectedThemeId = 'default';
        await this.applySelectedTheme();
    }

    // =============================================
    // ACTUALIZACIÓN DE INTERFAZ
    // =============================================
    updateUI() {
        const themePresets = this.getThemePresets();
        const currentTheme = themePresets[this.currentTheme];
        
        if (currentTheme) {
            const nameElement = document.getElementById('currentThemeName');
            if (nameElement) {
                nameElement.textContent = currentTheme.name;
            }
        }
        
        // Actualizar hora de última modificación
        const lastSave = localStorage.getItem('centinela-theme-last-save');
        const updateTimeElement = document.getElementById('updateTime');
        if (updateTimeElement && lastSave) {
            const saveDate = new Date(parseInt(lastSave));
            updateTimeElement.textContent = saveDate.toLocaleString();
        }
        
        console.log('UI actualizada. Tema actual:', this.currentTheme);
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
            console.log('Tema actual marcado como activo:', this.currentTheme);
        } else {
            console.warn('No se encontró el elemento del tema actual:', this.currentTheme);
        }
    }

    // =============================================
    // FIREBASE INTEGRATION
    // =============================================
    
    /**
     * Obtener funciones de Firebase (igual que en user.js)
     */
    async getFirebaseFunctions() {
        try {
            // Importar dinámicamente las funciones de Firestore
            const firebaseFirestore = await import(
                "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js"
            );
            
            // Importar db desde el config
            const { db } = await import('/config/firebase-config.js');
            
            return {
                ...firebaseFirestore,
                db
            };
        } catch (error) {
            console.error('Error obteniendo funciones de Firebase:', error);
            throw error;
        }
    }
    
    /**
     * Guarda el tema en Firebase y sincroniza con colaboradores
     */
    async saveThemeToFirebase(themeId) {
        try {
            console.log('🔥 Guardando tema en Firebase:', themeId);
            
            // Verificar que haya un usuario autenticado
            const currentUser = this.userManager?.currentUser;
            
            if (!currentUser) {
                console.warn('⚠️ No hay usuario autenticado, solo guardando en localStorage');
                this.showNotification('No hay usuario autenticado. Tema guardado localmente.', 'warning');
                return;
            }
            
            console.log('👤 Usuario actual:', {
                id: currentUser.id,
                cargo: currentUser.cargo,
                organizacion: currentUser.organizacion,
                organizacionCamelCase: currentUser.organizacionCamelCase
            });
            
            // Obtener funciones de Firebase
            const firebase = await this.getFirebaseFunctions();
            const { db, doc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } = firebase;
            
            // Guardar según el tipo de usuario
            if (currentUser.cargo === 'administrador') {
                // ===========================================
                // ADMINISTRADOR: Guardar y sincronizar
                // ===========================================
                console.log('💼 Guardando tema para administrador...');
                
                // 1. Guardar en administradores
                await updateDoc(doc(db, "administradores", currentUser.id), {
                    theme: themeId,
                    fechaActualizacion: serverTimestamp()
                });
                
                console.log('✅ Tema guardado para administrador en Firebase');
                
                // 2. Sincronizar a todos sus colaboradores
                await this.syncThemeToAllColaboradores(themeId, currentUser);
                
                this.showNotification(`🎨 Tema "${this.getThemePresets()[themeId].name}" aplicado a toda la organización`);
                
            } else if (currentUser.cargo === 'colaborador') {
                // ===========================================
                // COLABORADOR: Solo guardar para sí mismo
                // ===========================================
                console.log('👥 Guardando tema para colaborador...');
                
                const coleccionColaboradores = `colaboradores_${currentUser.organizacionCamelCase}`;
                await updateDoc(doc(db, coleccionColaboradores, currentUser.id), {
                    theme: themeId,
                    fechaActualizacion: serverTimestamp()
                });
                
                console.log('✅ Tema guardado para colaborador en Firebase');
                this.showNotification('🎨 Tema personal guardado correctamente');
                
            } else {
                throw new Error('❌ Tipo de usuario no reconocido');
            }
            
            // Disparar evento para sincronización entre pestañas
            window.dispatchEvent(new CustomEvent('themeUpdatedInFirebase', {
                detail: { 
                    themeId, 
                    userId: currentUser.id,
                    cargo: currentUser.cargo 
                }
            }));
            
        } catch (error) {
            console.error('❌ Error guardando tema en Firebase:', error);
            this.showNotification(`❌ Error guardando tema: ${error.message}`, 'error');
        }
    }
    
    /**
     * Sincroniza el tema a todos los colaboradores del administrador
     */
    async syncThemeToAllColaboradores(themeId, administrador) {
        try {
            console.log(`🔄 Sincronizando tema a colaboradores de: ${administrador.organizacion}`);
            
            // Obtener funciones de Firebase
            const firebase = await this.getFirebaseFunctions();
            const { db, collection, query, where, getDocs, writeBatch, serverTimestamp } = firebase;
            
            const coleccionColaboradores = `colaboradores_${administrador.organizacionCamelCase}`;
            
            // Obtener todos los colaboradores activos
            const colabQuery = query(
                collection(db, coleccionColaboradores),
                where("eliminado", "==", false),
                where("status", "==", true)
            );
            
            const colabSnapshot = await getDocs(colabQuery);
            
            if (colabSnapshot.empty) {
                console.log('👥 No hay colaboradores para sincronizar');
                return;
            }
            
            console.log(`🔄 Sincronizando tema a ${colabSnapshot.size} colaboradores...`);
            
            // Preparar todas las actualizaciones
            const batch = writeBatch(db);
            let updatedCount = 0;
            
            colabSnapshot.forEach(docSnap => {
                batch.update(docSnap.ref, {
                    theme: themeId,
                    fechaActualizacion: serverTimestamp(),
                    themeUpdatedBy: administrador.id,
                    themeUpdatedAt: serverTimestamp()
                });
                updatedCount++;
            });
            
            // Ejecutar todas las actualizaciones en lote
            await batch.commit();
            
            console.log(`✅ Tema sincronizado a ${updatedCount} colaboradores`);
            
        } catch (error) {
            console.error('❌ Error sincronizando tema a colaboradores:', error);
            throw error;
        }
    }
    
    /**
     * Carga el tema desde Firebase
     */
    async loadThemeFromFirebase() {
        try {
            console.log('🔍 Cargando tema desde Firebase...');
            
            if (!this.userManager?.currentUser) {
                console.log('👤 Usuario no autenticado, usando tema por defecto');
                return;
            }
            
            const currentUser = this.userManager.currentUser;
            
            // Obtener funciones de Firebase
            const firebase = await this.getFirebaseFunctions();
            const { db, doc, getDoc } = firebase;
            
            let themeId = 'default';
            
            // Obtener tema según tipo de usuario
            if (currentUser.cargo === 'administrador') {
                const adminDoc = await getDoc(doc(db, "administradores", currentUser.id));
                if (adminDoc.exists()) {
                    const data = adminDoc.data();
                    themeId = data.theme || 'default';
                    console.log('💼 Tema cargado para administrador:', themeId);
                }
            } else if (currentUser.cargo === 'colaborador') {
                const coleccionColaboradores = `colaboradores_${currentUser.organizacionCamelCase}`;
                const colabDoc = await getDoc(doc(db, coleccionColaboradores, currentUser.id));
                if (colabDoc.exists()) {
                    const data = colabDoc.data();
                    themeId = data.theme || 'default';
                    console.log('👥 Tema cargado para colaborador:', themeId);
                }
            }
            
            // Aplicar el tema si es diferente al actual
            if (themeId !== this.currentTheme) {
                const themePresets = this.getThemePresets();
                const theme = themePresets[themeId];
                
                if (theme) {
                    this.currentTheme = themeId;
                    this.applyColors(theme.colors);
                    console.log(`🎨 Tema cargado desde Firebase: ${theme.name}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error cargando tema desde Firebase:', error);
        }
    }

    // =============================================
    // LOCALSTORAGE (RESPALDO)
    // =============================================
    saveToLocalStorage(themeId, themeData) {
        const saveData = {
            themeId: themeId,
            data: themeData,
            savedAt: Date.now()
        };
        
        localStorage.setItem('centinela-theme', JSON.stringify(saveData));
        localStorage.setItem('centinela-theme-last-save', Date.now().toString());
        
        console.log('💾 Tema guardado en localStorage:', themeId);
        
        // Disparar evento de storage para sincronizar entre pestañas
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'centinela-theme',
            newValue: JSON.stringify(saveData)
        }));
    }

    async loadSavedTheme() {
        try {
            // Primero intentar cargar desde Firebase
            await this.loadThemeFromFirebase();
            
            // Si no hay tema de Firebase, cargar de localStorage
            if (this.currentTheme === 'default') {
                const saved = localStorage.getItem('centinela-theme');
                
                if (saved) {
                    try {
                        const themeData = JSON.parse(saved);
                        this.currentTheme = themeData.themeId;
                        this.selectedThemeId = themeData.themeId;
                        
                        const themePresets = this.getThemePresets();
                        if (themePresets[this.currentTheme] && themeData.data.colors) {
                            // Aplicar tema guardado
                            this.applyColors(themeData.data.colors);
                            console.log('💾 Tema cargado desde localStorage:', this.currentTheme);
                        } else {
                            await this.resetToDefault();
                        }
                    } catch (e) {
                        console.error('❌ Error cargando tema de localStorage:', e);
                        await this.resetToDefault();
                    }
                } else {
                    await this.resetToDefault();
                }
            }
            
        } catch (error) {
            console.error('❌ Error cargando tema guardado:', error);
            await this.resetToDefault();
        }
    }

    // =============================================
    // UTILIDADES
    // =============================================
    showNotification(message, type = 'success') {
        console.log(`💬 Mostrando notificación: ${message}`);
        
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
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
            font-family: 'Orbitron', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(notification);
        
        // Asegurarse de que las animaciones estén definidas
        if (!document.getElementById('themeNotificationStyles')) {
            const style = document.createElement('style');
            style.id = 'themeNotificationStyles';
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
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
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
export function initThemeManager() {
    console.log('🎨 Inicializando ThemeManager...');
    
    // Crear ThemeManager con UserManager si está disponible
    const themeManager = new ThemeManager(window.userManager);
    
    // Inicializar
    themeManager.init();
    
    return themeManager;
}

// Inicialización automática si se usa como script
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 DOM cargado, inicializando ThemeManager...');
        
        // Esperar a que UserManager esté disponible si existe
        if (!window.userManager && typeof UserManager !== 'undefined') {
            console.log('👤 Creando UserManager para ThemeManager...');
            window.userManager = new UserManager();
        }
        
        const themeManager = new ThemeManager(window.userManager);
        await themeManager.init();
        window.themeManager = themeManager;
        
        console.log('✅ ThemeManager inicializado y disponible como window.themeManager');
    });
}