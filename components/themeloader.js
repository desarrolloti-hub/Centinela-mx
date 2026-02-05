// =============================================
// THEME LOADER - VERSIÓN CON IMPORTACIÓN DIRECTA
// =============================================

// Importar UserManager desde la clase
import { UserManager } from '/clases/user.js';

class ThemeLoader {
    constructor() {
        this.root = document.documentElement;
        this.cssVariables = this.getCssVariables();
        this.userManager = null;
        this.currentThemeId = 'default';
        this.lastAppliedTheme = null;
        this.checkInterval = null;
        this.checkIntervalMs = 30000;
        
        console.log('🎨 ThemeLoader CON IMPORTACIÓN DIRECTA');
        
        // Inicializar UserManager
        this.initUserManager();
    }

    // =============================================
    // INICIALIZAR USERMANAGER
    // =============================================
    async initUserManager() {
        try {
            console.log('🔄 Inicializando UserManager...');
            this.userManager = new UserManager();
            
            // Esperar un momento para que cargue el usuario actual
            setTimeout(() => {
                this.loadTheme();
                this.startThemeMonitoring();
            }, 1000);
            
            console.log('✅ UserManager inicializado');
        } catch (error) {
            console.error('❌ Error inicializando UserManager:', error);
            this.applyThemeById('default');
        }
    }

    // =============================================
    // CARGAR TEMA - ¡ESTA ES LA PARTE IMPORTANTE!
    // =============================================
    async loadTheme() {
        console.log('🎨 CARGANDO TEMA DESDE BASE DE DATOS...');
        
        try {
            // Verificar si UserManager está listo
            if (!this.userManager) {
                console.log('⏳ UserManager no listo, reintentando...');
                setTimeout(() => this.loadTheme(), 1000);
                return;
            }
            
            // Obtener usuario actual DIRECTAMENTE del UserManager
            const currentUser = this.userManager.currentUser;
            
            if (!currentUser) {
                console.log('👤 No hay usuario autenticado');
                
                // Verificar si hay sesión en localStorage como respaldo
                const savedTheme = localStorage.getItem('centinela-theme');
                if (savedTheme) {
                    try {
                        const themeData = JSON.parse(savedTheme);
                        console.log('📂 Usando tema de localStorage:', themeData.themeId);
                        this.applyThemeById(themeData.themeId || 'default');
                    } catch (e) {
                        this.applyThemeById('default');
                    }
                } else {
                    this.applyThemeById('default');
                }
                return;
            }
            
            console.log('✅ USUARIO ENCONTRADO EN USERMANAGER:', {
                id: currentUser.id,
                nombre: currentUser.nombreCompleto,
                cargo: currentUser.cargo,
                theme: currentUser.theme,
                verificado: currentUser.verificado
            });
            
            // Obtener el tema del objeto User
            let themeId = currentUser.theme;
            
            console.log('🎯 TEMA DEL USUARIO:', themeId);
            
            // Si no tiene tema o es predeterminado, usar default
            if (!themeId || themeId === 'predeterminado' || themeId === 'default') {
                themeId = 'default';
            }
            
            // Verificar si el tema existe en nuestros presets
            const themes = this.getThemePresets();
            if (!themes[themeId]) {
                console.warn(`⚠️ Tema ${themeId} no existe, usando default`);
                themeId = 'default';
            }
            
            // Aplicar el tema
            console.log(`🚀 APLICANDO TEMA: ${themeId}`);
            this.applyThemeById(themeId);
            
            // Guardar en localStorage como respaldo
            this.saveThemeToLocalStorage(themeId);
            
        } catch (error) {
            console.error('🔥 ERROR CARGANDO TEMA:', error);
            this.applyThemeById('default');
        }
    }

    // =============================================
    // GUARDAR TEMA EN LOCALSTORAGE
    // =============================================
    saveThemeToLocalStorage(themeId) {
        try {
            const themeData = {
                themeId: themeId,
                appliedAt: new Date().toISOString(),
                user: this.userManager?.currentUser?.id || 'unknown'
            };
            localStorage.setItem('centinela-theme', JSON.stringify(themeData));
        } catch (e) {
            console.warn('No se pudo guardar tema en localStorage');
        }
    }

    // =============================================
    // APLICAR TEMA POR ID (CORREGIDO)
    // =============================================
    applyThemeById(themeId) {
        // Verificar si ya está aplicado el mismo tema
        if (this.currentThemeId === themeId) {
            return;
        }
        
        const themePresets = this.getThemePresets();
        const theme = themePresets[themeId];
        
        if (!theme) {
            console.error(`❌ TEMA ${themeId} NO ENCONTRADO`);
            this.applyDefaultTheme();
            return;
        }
        
        console.log(`🎨 APLICANDO: ${theme.name}`);
        
        // Aplicar colores
        this.applyColors(theme.colors);
        
        // Actualizar estado
        this.currentThemeId = themeId;
        this.lastAppliedTheme = {
            id: themeId,
            name: theme.name,
            appliedAt: new Date()
        };
        
        // Disparar evento
        document.dispatchEvent(new CustomEvent('themeApplied', {
            detail: {
                themeId: themeId,
                themeName: theme.name,
                user: this.userManager?.currentUser?.id
            }
        }));
        
        console.log(`✅ TEMA "${theme.name}" APLICADO CORRECTAMENTE`);
    }

    // =============================================
    // APLICAR COLORES
    // =============================================
    applyColors(colors) {
        Object.keys(colors).forEach(key => {
            this.root.style.setProperty(key, colors[key]);
        });
    }

    // =============================================
    // APLICAR TEMA POR DEFECTO
    // =============================================
    applyDefaultTheme() {
        const defaultTheme = this.getThemePresets()['default'];
        this.applyColors(defaultTheme.colors);
        this.currentThemeId = 'default';
        console.log('🎨 Tema predeterminado aplicado');
    }

    // =============================================
    // MONITOREO EN TIEMPO REAL
    // =============================================
    startThemeMonitoring() {
        console.log('🔄 INICIANDO MONITOREO DE TEMAS (5 segundos)');
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(() => {
            this.checkForThemeChanges();
        }, this.checkIntervalMs);
        
        // También escuchar cambios en la pestaña
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForThemeChanges();
            }
        });
    }

    async checkForThemeChanges() {
        try {
            if (!this.userManager || !this.userManager.currentUser) {
                return;
            }
            
            const currentUser = this.userManager.currentUser;
            const currentTheme = currentUser.theme || 'default';
            
            console.log('🔍 Verificando cambios:', {
                temaActual: this.currentThemeId,
                temaEnBase: currentTheme
            });
            
            if (currentTheme !== this.currentThemeId) {
                console.log(`🔄 ¡CAMBIO DETECTADO! ${this.currentThemeId} → ${currentTheme}`);
                await this.loadTheme();
            }
            
        } catch (error) {
            console.error('Error en monitoreo:', error);
        }
    }

    // =============================================
    // ESCUCHAR CAMBIOS EXTERNOS
    // =============================================
    setupThemeSync() {
        // Escuchar cambios desde el admin
        document.addEventListener('themeChanged', (event) => {
            if (event.detail?.themeId) {
                console.log('🎨 Cambio desde admin:', event.detail.themeId);
                this.applyThemeById(event.detail.themeId);
            }
        });
        
        // Escuchar cambios en UserManager
        document.addEventListener('userUpdated', async () => {
            console.log('👤 Usuario actualizado, recargando tema...');
            await this.loadTheme();
        });
    }

    // =============================================
    // INICIALIZACIÓN COMPLETA
    // =============================================
    async init() {
        console.log('🚀 INICIANDO THEME LOADER...');
        
        // Esperar DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Cargar tema inicial
        await this.loadTheme();
        
        // Configurar monitoreo
        this.setupThemeSync();
        
        // Hacer disponible globalmente
        window.themeLoader = this;
        
        console.log('✅ THEME LOADER LISTO');
    }

    // =============================================
    // PALETA DE TEMAS (COMPLETA - PEGA AQUÍ TUS 12 TEMAS)
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
    // OBTENER VARIABLES CSS
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
            
            // Estados
            '--color-hover',
            '--color-active',
            
            // Bordes
            '--color-border-light',
            '--color-border-dark',
            
            // Navbar
            '--navbar-bg',
            '--navbar-text',
            '--navbar-logo-text',
            '--navbar-scrolled-bg',
            
            // Footer
            '--footer-bg-primary',
            '--footer-bg-secondary',
            '--footer-text-primary',
            '--footer-text-secondary',
            '--footer-social-bg'
        ];
    }
}

// =============================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================
// Asegurarse de que se inicialice cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado - Iniciando ThemeLoader...');
    
    const themeLoader = new ThemeLoader();
    await themeLoader.init();
    
    console.log('✅ ThemeLoader funcionando');
});

// =============================================
// SWEETALERT2 STYLES (OPCIONAL - MANTENER SI LO NECESITAS)
// =============================================
function applySweetAlertStyles() {
    if (document.getElementById('sweetalert-custom-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sweetalert-custom-styles';
    style.textContent = /*css*/`
        .swal2-popup {
            background: var(--color-bg-tertiary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: 10px !important;
            box-shadow: var(--shadow-large) !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary) !important;
            font-family: 'Orbitron', sans-serif !important;
        }
        
        .swal2-confirm {
            background: var(--color-accent-primary) !important;
            color: white !important;
        }
    `;
    document.head.appendChild(style);
}