// Importar UserManager
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
        
        // Cargar tema desde el usuario
        await this.loadUserTheme();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Generar lista de temas
        this.generateThemeList();
        
        // Actualizar UI
        this.updateUI();
        
        // Inicializar visualización de colores
        this.initColorDisplay();
        
        this.initialized = true;
        
        console.log('🎨 Theme Manager (Admin View) inicializado correctamente');
        console.log('Temas disponibles:', Object.keys(this.getThemePresets()).length);
        
        // Hacerlo disponible globalmente
        window.themeManager = this;
    }

    // =============================================
    // INICIALIZAR VISUALIZACIÓN DE COLORES
    // =============================================
    initColorDisplay() {
        console.log('Inicializando visualización de colores...');
        
        // Actualizar visualización inicial
        this.updateColorDisplay();
        
        // Actualizar cada vez que cambie el tema
        document.addEventListener('themeChanged', () => {
            this.updateColorDisplay();
        });
    }

    // =============================================
    // ACTUALIZAR VISUALIZACIÓN DE COLORES
    // =============================================
    updateColorDisplay() {
        const colors = this.getCurrentColors();
        
        // Actualizar elementos de visualización si existen
        const elements = {
            'bg-primary': '--color-bg-primary',
            'bg-secondary': '--color-bg-secondary',
            'text-primary': '--color-text-primary',
            'text-secondary': '--color-text-secondary'
        };
        
        Object.keys(elements).forEach(key => {
            const element = document.querySelector(`.color-display.${key}`);
            if (element) {
                element.style.backgroundColor = colors[elements[key]];
                
                // Agregar texto con el valor del color si hay un span dentro
                const colorValue = element.querySelector('.color-value');
                if (colorValue) {
                    colorValue.textContent = colors[elements[key]];
                }
            }
        });
        
        console.log('Visualización de colores actualizada');
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
        
        // Actualizar visualización de colores
        this.updateColorDisplay();
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
            this.showNotification('Selecciona un tema primero', 'warning');
            console.warn('No hay tema seleccionado');
            return;
        }
        
        const themePresets = this.getThemePresets();
        const theme = themePresets[this.selectedThemeId];
        
        if (!theme) {
            console.error('Tema no encontrado:', this.selectedThemeId);
            return;
        }
        
        // Verificar si SweetAlert2 está disponible
        if (typeof Swal === 'undefined') {
            console.error('SweetAlert2 no está disponible');
            alert(`¿Aplicar tema ${theme.name}?`);
            // Continuar con la aplicación del tema
        } else {
            // Mostrar confirmación con SweetAlert2
            const result = await Swal.fire({
                title: '¿Aplicar tema?',
                html: `¿Deseas aplicar el tema <strong>${theme.name}</strong>?<br><small>${theme.description}</small>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Aplicar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: this.getCurrentColors()['--color-accent-primary'],
                cancelButtonColor: this.getCurrentColors()['--color-border-light'],
                background: this.getCurrentColors()['--color-bg-primary'],
                color: this.getCurrentColors()['--color-text-primary']
            });
            
            if (!result.isConfirmed) {
                console.log('Aplicación de tema cancelada por el usuario');
                // Revertir previsualización
                this.previewTheme(this.currentTheme);
                return;
            }
        }
        
        console.log('Aplicando tema:', theme.name);
        
        // Aplicar tema permanentemente
        this.applyColors(theme.colors);
        
        // Actualizar tema actual
        this.currentTheme = this.selectedThemeId;
        
        // Guardar en el usuario actual
        await this.saveThemeToUser(this.selectedThemeId);
        
        // Actualizar UI
        this.updateUI();
        
        // Mostrar éxito
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                title: '¡Tema aplicado!',
                text: `El tema "${theme.name}" se ha aplicado correctamente`,
                icon: 'success',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: this.getCurrentColors()['--color-accent-primary'],
                background: this.getCurrentColors()['--color-bg-primary'],
                color: this.getCurrentColors()['--color-text-primary']
            });
        } else {
            alert(`Tema "${theme.name}" aplicado correctamente`);
        }
        
        // Marca como activo
        this.markCurrentTheme();
        
        // Actualizar visualización de colores
        this.updateColorDisplay();
        
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
        // Verificar si SweetAlert2 está disponible
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: '¿Restablecer tema?',
                text: '¿Deseas restablecer el tema predeterminado?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Restablecer',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: this.getCurrentColors()['--color-accent-primary'],
                cancelButtonColor: this.getCurrentColors()['--color-border-light'],
                background: this.getCurrentColors()['--color-bg-primary'],
                color: this.getCurrentColors()['--color-text-primary']
            });
            
            if (!result.isConfirmed) {
                console.log('Restablecimiento cancelado por el usuario');
                return;
            }
        } else {
            if (!confirm('¿Restablecer tema predeterminado?')) {
                return;
            }
        }
        
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
            
            // Actualizar última actualización si existe
            const updateElement = document.querySelector('.last-update');
            if (updateElement) {
                updateElement.textContent = new Date().toLocaleString();
            }
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
    // INTEGRACIÓN CON USERMANAGER
    // =============================================
    
    /**
     * Guarda el tema en el usuario actual
     */
    async saveThemeToUser(themeId) {
        try {
            console.log('💾 Guardando tema en usuario:', themeId);
            
            if (!this.userManager?.currentUser) {
                console.warn('⚠️ No hay usuario autenticado, guardando en localStorage');
                this.saveThemeToLocalStorage(themeId);
                return 'Tema guardado localmente';
            }
            
            const currentUser = this.userManager.currentUser;
            
            // Guardar en localStorage como respaldo
            this.saveThemeToLocalStorage(themeId);
            
            // Guardar en el usuario usando el UserManager
            const updateData = {
                theme: themeId,
                fechaActualizacion: new Date()
            };
            
            // Determinar tipo de usuario y colección
            let result;
            if (currentUser.cargo === 'administrador') {
                result = await this.userManager.updateUser(
                    currentUser.id,
                    updateData,
                    'administrador'
                );
                
                // Si el administrador quiere sincronizar a colaboradores
                if (this.userManager.esAdministrador()) {
                    const sync = await this.syncThemeToColaboradores(themeId);
                    if (sync) {
                        return `Tema aplicado y sincronizado a ${sync} colaboradores`;
                    }
                }
            } else {
                result = await this.userManager.updateUser(
                    currentUser.id,
                    updateData,
                    'colaborador',
                    currentUser.organizacionCamelCase
                );
            }
            
            console.log('✅ Tema guardado en usuario');
            return 'Tema guardado correctamente';
            
        } catch (error) {
            console.error('❌ Error guardando tema:', error);
            // Fallback a localStorage
            this.saveThemeToLocalStorage(themeId);
            throw error;
        }
    }
    
    /**
     * Sincroniza el tema a los colaboradores del administrador
     */
    async syncThemeToColaboradores(themeId) {
        try {
            if (!this.userManager?.currentUser || !this.userManager.esAdministrador()) {
                return 0;
            }
            
            const currentUser = this.userManager.currentUser;
            
            // Obtener todos los colaboradores de la organización
            const colaboradores = await this.userManager.getColaboradoresByOrganizacion(
                currentUser.organizacionCamelCase
            );
            
            let syncCount = 0;
            
            // Actualizar tema de cada colaborador
            for (const colaborador of colaboradores) {
                if (!colaborador.eliminado && colaborador.status) {
                    try {
                        await this.userManager.updateUser(
                            colaborador.id,
                            { theme: themeId },
                            'colaborador',
                            currentUser.organizacionCamelCase
                        );
                        syncCount++;
                    } catch (error) {
                        console.warn(`Error sincronizando tema a ${colaborador.nombreCompleto}:`, error);
                    }
                }
            }
            
            console.log(`✅ Tema sincronizado a ${syncCount} colaboradores`);
            return syncCount;
            
        } catch (error) {
            console.error('❌ Error sincronizando tema:', error);
            return 0;
        }
    }
    
    /**
     * Carga el tema desde el usuario actual
     */
    async loadUserTheme() {
        try {
            console.log('🔍 Cargando tema desde usuario...');
            
            let themeId = 'default';
            
            // 1. Intentar cargar desde localStorage primero
            const savedTheme = this.loadThemeFromLocalStorage();
            if (savedTheme) {
                themeId = savedTheme;
                console.log('📱 Tema cargado de localStorage:', themeId);
            }
            
            // 2. Si hay usuario autenticado, cargar su tema
            if (this.userManager?.currentUser) {
                const userTheme = this.userManager.currentUser.theme;
                if (userTheme && userTheme !== 'default') {
                    themeId = userTheme;
                    console.log('👤 Tema cargado del usuario:', themeId);
                }
            }
            
            // 3. Aplicar el tema
            this.applyThemeById(themeId);
            
        } catch (error) {
            console.error('❌ Error cargando tema:', error);
            this.applyDefaultTheme();
        }
    }
    
    /**
     * Guarda el tema en localStorage
     */
    saveThemeToLocalStorage(themeId) {
        try {
            const themeData = {
                themeId: themeId,
                savedAt: new Date().toISOString(),
                appliedAt: new Date().toISOString()
            };
            
            localStorage.setItem('centinela-theme', JSON.stringify(themeData));
            console.log('💾 Tema guardado en localStorage:', themeId);
            
        } catch (error) {
            console.warn('⚠️ No se pudo guardar en localStorage:', error);
        }
    }
    
    /**
     * Carga el tema desde localStorage
     */
    loadThemeFromLocalStorage() {
        try {
            const savedTheme = localStorage.getItem('centinela-theme');
            if (savedTheme) {
                const themeData = JSON.parse(savedTheme);
                return themeData.themeId;
            }
        } catch (error) {
            console.warn('⚠️ No se pudo leer tema de localStorage:', error);
        }
        return null;
    }
    
    /**
     * Aplica un tema por su ID
     */
    applyThemeById(themeId) {
        const themePresets = this.getThemePresets();
        const theme = themePresets[themeId];
        
        if (theme) {
            this.currentTheme = themeId;
            this.applyColors(theme.colors);
            console.log(`🎨 Tema aplicado: ${theme.name}`);
        } else {
            console.warn(`⚠️ Tema ${themeId} no encontrado, usando predeterminado`);
            this.applyDefaultTheme();
        }
    }
    
    /**
     * Aplica el tema predeterminado
     */
    applyDefaultTheme() {
        const defaultTheme = this.getThemePresets()['default'];
        this.currentTheme = 'default';
        this.applyColors(defaultTheme.colors);
        console.log('🎨 Tema predeterminado aplicado');
    }

    // =============================================
    // UTILIDADES
    // =============================================
    showNotification(message, type = 'success') {
        console.log(`💬 Mostrando notificación: ${message} - Tipo: ${type}`);
        
        // Verificar si SweetAlert2 está disponible
        if (typeof Swal === 'undefined') {
            // Fallback a alert normal
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        } else {
            // Configurar icono según tipo
            const iconMap = {
                'success': 'success',
                'error': 'error',
                'warning': 'warning',
                'info': 'info'
            };
            
            Swal.fire({
                title: type === 'success' ? '¡Éxito!' : 
                       type === 'error' ? 'Error' : 
                       type === 'warning' ? 'Advertencia' : 'Información',
                text: message,
                icon: iconMap[type] || 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: this.getCurrentColors()['--color-bg-primary'],
                color: this.getCurrentColors()['--color-text-primary'],
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
        }
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