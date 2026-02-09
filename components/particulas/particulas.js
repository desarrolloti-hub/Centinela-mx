// =============================================
// SISTEMA DE PARTÍCULAS ANIMADAS
// Integrado con Theme Manager - Versión Base de Datos
// =============================================

// Importar UserManager
import { UserManager } from '/clases/user.js';

class ParticleSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.userManager = null;
        this.currentTheme = null;
        this.animationId = null;
        
        console.log('🎯 ParticleSystem inicializado');
        
        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    // =============================================
    // INICIALIZACIÓN
    // =============================================
    async init() {
        try {
            // Buscar canvas
            this.canvas = document.getElementById("particle-canvas");
            if (!this.canvas) {
                console.warn("Canvas de partículas no encontrado");
                return;
            }
            
            this.ctx = this.canvas.getContext("2d");
            
            // Ajustar tamaño
            this.resizeCanvas();
            
            // Inicializar UserManager
            this.userManager = new UserManager();
            
            // Esperar a que UserManager cargue el usuario
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Cargar tema inicial
            await this.loadColorsFromDatabase();
            
            // Crear partículas
            this.createParticles();
            
            // Iniciar animación
            this.animate();
            
            // Configurar eventos
            this.setupEventListeners();
            
            console.log('✅ ParticleSystem listo');
            
        } catch (error) {
            console.error('❌ Error inicializando ParticleSystem:', error);
            // Usar colores por defecto
            this.useDefaultColors();
            this.createParticles();
            this.animate();
        }
    }
    
    // =============================================
    // CARGAR COLORES DESDE BASE DE DATOS
    // =============================================
    async loadColorsFromDatabase() {
        console.log('🎨 Cargando colores desde base de datos...');
        
        try {
            // Verificar si UserManager está listo
            if (!this.userManager) {
                console.log('⏳ UserManager no disponible, usando colores por defecto');
                this.useDefaultColors();
                return;
            }
            
            // Obtener usuario actual
            const currentUser = this.userManager.currentUser;
            
            if (!currentUser) {
                console.log('👤 No hay usuario autenticado');
                
                // Intentar desde localStorage
                const savedTheme = localStorage.getItem('centinela-theme');
                if (savedTheme) {
                    try {
                        const themeData = JSON.parse(savedTheme);
                        console.log('📂 Usando tema de localStorage:', themeData.themeId);
                        this.loadThemeColors(themeData.themeId);
                    } catch (e) {
                        this.useDefaultColors();
                    }
                } else {
                    this.useDefaultColors();
                }
                return;
            }
            
            // Obtener tema del usuario
            let themeId = currentUser.theme;
            
            console.log('🎯 Tema del usuario:', themeId);
            
            // Validar tema
            if (!themeId || themeId === 'predeterminado') {
                themeId = 'default';
            }
            
            // Cargar colores del tema
            this.loadThemeColors(themeId);
            
            // Guardar estado actual
            this.currentTheme = themeId;
            
        } catch (error) {
            console.error('🔥 Error cargando colores:', error);
            this.useDefaultColors();
        }
    }
    
    // =============================================
    // CARGAR COLORES DEL TEMA
    // =============================================
    loadThemeColors(themeId) {
        const themePresets = this.getThemePresets();
        const theme = themePresets[themeId];
        
        if (!theme) {
            console.warn(`⚠️ Tema ${themeId} no encontrado, usando default`);
            this.useDefaultColors();
            return;
        }
        
        // Obtener color de acento principal
        const accentColor = theme.colors['--color-accent-primary'];
        
        console.log('🎨 Color de acento detectado:', accentColor);
        
        // Actualizar colores de partículas
        this.updateParticleColors(accentColor);
    }
    
    // =============================================
    // ACTUALIZAR COLORES DE PARTÍCULAS
    // =============================================
    updateParticleColors(accentColor) {
        let primaryColor, secondaryColor;
        
        // Convertir HEX a RGBA
        if (accentColor.startsWith('#')) {
            const rgb = this.hexToRgb(accentColor);
            primaryColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
            
            // Crear color secundario más claro
            const lighter = {
                r: Math.min(255, rgb.r + 40),
                g: Math.min(255, rgb.g + 40),
                b: Math.min(255, rgb.b + 40)
            };
            secondaryColor = `rgba(${lighter.r}, ${lighter.g}, ${lighter.b}, 0.8)`;
            
        } else if (accentColor.includes('rgb')) {
            // Ya es RGB/RGBA
            primaryColor = accentColor.replace(')', ', 0.8)').replace('rgb', 'rgba');
            
            // Crear versión más clara
            const match = accentColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.min(255, parseInt(match[1]) + 40);
                const g = Math.min(255, parseInt(match[2]) + 40);
                const b = Math.min(255, parseInt(match[3]) + 40);
                secondaryColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
            } else {
                secondaryColor = primaryColor;
            }
        } else {
            // Color por defecto
            primaryColor = 'rgba(192, 192, 192, 0.8)';
            secondaryColor = 'rgba(255, 255, 255, 0.8)';
        }
        
        // Actualizar partículas existentes
        this.updateExistingParticles(primaryColor, secondaryColor);
        
        console.log('🎨 Colores actualizados:', { primaryColor, secondaryColor });
    }
    
    // =============================================
    // ACTUALIZAR PARTÍCULAS EXISTENTES
    // =============================================
    updateExistingParticles(primaryColor, secondaryColor) {
        this.particles.forEach(particle => {
            particle.color = Math.random() > 0.7 ? secondaryColor : primaryColor;
        });
    }
    
    // =============================================
    // USAR COLORES POR DEFECTO
    // =============================================
    useDefaultColors() {
        this.updateParticleColors('#c0c0c0');
    }
    
    // =============================================
    // CONVERTIR HEX A RGB
    // =============================================
    hexToRgb(hex) {
        hex = hex.replace('#', '');
        
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return { r, g, b };
    }
    
    // =============================================
    // CREAR PARTÍCULAS
    // =============================================
    createParticles() {
        this.particles = [];
        const particleCount = Math.floor(window.innerWidth / 15);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 1 - 0.5,
                speedY: Math.random() * 1 - 0.5,
                color: Math.random() > 0.7 ? 
                    'rgba(255, 255, 255, 0.8)' : 
                    'rgba(192, 192, 192, 0.8)',
            });
        }
    }
    
    // =============================================
    // ANIMACIÓN
    // =============================================
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Mover partícula
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Rebote en bordes
            if (p.x < 0 || p.x > this.canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.speedY *= -1;
            
            // Dibujar partícula
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
            
            // Dibujar líneas de conexión
            for (let j = i; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const distance = Math.sqrt(
                    Math.pow(p.x - p2.x, 2) + 
                    Math.pow(p.y - p2.y, 2)
                );
                
                if (distance < 120) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = p.color.replace('0.8', '0.2');
                    this.ctx.lineWidth = 0.7;
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // =============================================
    // AJUSTAR CANVAS
    // =============================================
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // =============================================
    // CONFIGURAR EVENTOS
    // =============================================
    setupEventListeners() {
        // Redimensionamiento
        window.addEventListener("resize", () => {
            this.resizeCanvas();
            this.createParticles();
        });
        
        // Cambios de tema desde ThemeLoader
        document.addEventListener('themeApplied', (event) => {
            if (event.detail?.themeId) {
                console.log('🔄 Tema cambiado desde ThemeLoader:', event.detail.themeId);
                this.loadThemeColors(event.detail.themeId);
            }
        });
        
        // Cambios en UserManager
        document.addEventListener('userUpdated', async () => {
            console.log('👤 Usuario actualizado, actualizando partículas...');
            await this.loadColorsFromDatabase();
        });
        
        // Cambios en localStorage
        window.addEventListener('storage', (event) => {
            if (event.key === 'centinela-theme') {
                console.log('🔄 Tema cambiado desde otra pestaña');
                setTimeout(async () => {
                    await this.loadColorsFromDatabase();
                }, 100);
            }
        });
    }
    
    // =============================================
    // OBTENER PRESETS DE TEMAS (igual que en ThemeLoader)
    // =============================================
    getThemePresets() {
        return {
            'default': {
                name: 'Predeterminado',
                colors: {
                    '--color-accent-primary': '#c0c0c0'
                }
            },
            'dark-blue': {
                name: 'Azul Profundo',
                colors: {
                    '--color-accent-primary': '#3a6ff8'
                }
            },
            'cyberpunk': {
                name: 'Cyberpunk',
                colors: {
                    '--color-accent-primary': '#ff00ff'
                }
            },
            'camo-green': {
                name: 'Camuflaje Militar',
                colors: {
                    '--color-accent-primary': '#5d6b3d'
                }
            },
            'military-green': {
                name: 'Verde Militar',
                colors: {
                    '--color-accent-primary': '#556b2f'
                }
            },
            'purple-matrix': {
                name: 'Matrix Púrpura',
                colors: {
                    '--color-accent-primary': '#9c27b0'
                }
            },
            'red-alert': {
                name: 'Alerta Roja',
                colors: {
                    '--color-accent-primary': '#ff0000'
                }
            },
            'navy-blue': {
                name: 'Azul Marino',
                colors: {
                    '--color-accent-primary': '#1e3a8a'
                }
            },
            'gold-24k': {
                name: 'Oro 24K',
                colors: {
                    '--color-accent-primary': '#ffd166'
                }
            },
            'orange-fire': {
                name: 'Fuego Naranja',
                colors: {
                    '--color-accent-primary': '#ff6600'
                }
            },
            'pink-neon': {
                name: 'Neón Rosa',
                colors: {
                    '--color-accent-primary': '#ff00aa'
                }
            },
            'deep-purple': {
                name: 'Morado Oscuro',
                colors: {
                    '--color-accent-primary': '#6a0dad'
                }
            }
        };
    }
    
    // =============================================
    // DESTRUIR INSTANCIA
    // =============================================
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener("resize", this.resizeCanvas);
        console.log('🧹 ParticleSystem destruido');
    }
}

// =============================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando sistema de partículas...');
    
    // Inicializar el sistema de partículas
    window.particleSystem = new ParticleSystem();
    
    console.log('✅ Sistema de partículas funcionando');
});