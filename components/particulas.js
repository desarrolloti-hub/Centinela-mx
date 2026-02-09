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
        this.primaryColor = 'rgba(192, 192, 192, 0.8)'; // Color por defecto
        this.secondaryColor = 'rgba(255, 255, 255, 0.8)'; // Color por defecto
        
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
            // Inyectar estilos CSS
            this.injectStyles();
            
            // Buscar canvas
            this.canvas = document.getElementById("particle-canvas");
            if (!this.canvas) {
                console.warn("Canvas de partículas no encontrado");
                return;
            }
            
            this.ctx = this.canvas.getContext("2d");
            
            // Añadir clase al body
            document.body.classList.add('particulas-active');
            
            // Ajustar tamaño
            this.resizeCanvas();
            
            // Inicializar UserManager (si aún no está inicializado)
            if (!window.userManager) {
                this.userManager = new UserManager();
                window.userManager = this.userManager; // Guardar referencia global
            } else {
                this.userManager = window.userManager; // Usar instancia existente
            }
            
            // CARGAR TEMAS EN ESTE ORDEN:
            // 1. Primero intentar desde localStorage (más rápido)
            await this.loadFromLocalStorage();
            
            // 2. Luego desde base de datos (si hay usuario)
            await this.loadColorsFromDatabase();
            
            // 3. Si todo falla, usar colores por defecto
            if (!this.currentTheme) {
                this.useDefaultColors();
            }
            
            // Crear partículas con los colores actuales
            this.createParticles();
            
            // Iniciar animación
            this.animate();
            
            // Configurar eventos
            this.setupEventListeners();
            
            console.log('✅ ParticleSystem listo con tema:', this.currentTheme);
            
        } catch (error) {
            console.error('❌ Error inicializando ParticleSystem:', error);
            // Usar colores por defecto
            this.useDefaultColors();
            this.createParticles();
            this.animate();
        }
    }
    
    // =============================================
    // INYECTAR ESTILOS CSS
    // =============================================
    injectStyles() {
        // Verificar si los estilos ya existen
        if (document.querySelector('style[data-particle-styles]')) {
            return;
        }
        
        const style = document.createElement('style');
        style.setAttribute('data-particle-styles', 'true');
        style.textContent = `
            /* =============================================
               SISTEMA DE PARTÍCULAS ANIMADAS - CENTINELA
               ============================================= */
            
            body.particulas-active {
                margin: 0;
                font-family: 'Rajdhani', sans-serif;
                background-color: var(--color-bg-primary, #000000);
                /* Color de fondo por si el canvas tarda en cargar */
            }
            
            /* --- LA MAGIA ESTÁ AQUÍ --- */
            #particle-canvas {
                position: fixed;
                /* 1. Lo deja fijo en la pantalla, no se moverá con el scroll. */
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                /* 2. LO MÁS IMPORTANTE: Lo envía detrás de todo el demás contenido. */
            }
            
            /* --- Estilos para tu contenido --- */
            /* Este es un ejemplo de cómo se vería tu contenedor de login ahora */
            .login-container {
                /* Centra el formulario en la pantalla */
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                /* Ocupa el 100% de la altura de la pantalla */
            
                /* Estilos del formulario para que se vea bien sobre el fondo */
                color: var(--color-text-primary, white);
                text-align: center;
            }
            
            /* Un estilo para la caja del formulario */
            .form-box {
                background: rgba(12, 12, 30, 0.7);
                /* Fondo semi-transparente para que resalte */
                padding: 30px 40px;
                border-radius: 8px;
                border: 1px solid var(--color-accent-primary, rgba(255, 153, 28, 0.4));
                backdrop-filter: blur(5px);
                /* Efecto de desenfoque en el fondo (opcional, se ve genial) */
            }
        `;
        document.head.appendChild(style);
        console.log('🎨 Estilos CSS inyectados');
    }
    
    // =============================================
    // CARGAR DESDE LOCALSTORAGE (MÁS RÁPIDO)
    // =============================================
    async loadFromLocalStorage() {
        const savedTheme = localStorage.getItem('centinela-theme');
        if (savedTheme) {
            try {
                const themeData = JSON.parse(savedTheme);
                console.log('📂 Usando tema de localStorage:', themeData.themeId);
                this.loadThemeColors(themeData.themeId);
                return true;
            } catch (e) {
                console.warn('⚠️ Error parseando tema de localStorage:', e);
                return false;
            }
        }
        return false;
    }
    
    // =============================================
    // CARGAR COLORES DESDE BASE DE DATOS
    // =============================================
    async loadColorsFromDatabase() {
        console.log('🎨 Cargando colores desde base de datos...');
        
        try {
            // Verificar si UserManager está listo
            if (!this.userManager) {
                console.log('⏳ UserManager no disponible');
                return false;
            }
            
            // Esperar a que UserManager esté listo
            let attempts = 0;
            while (!this.userManager.currentUser && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 300));
                attempts++;
                console.log(`⏳ Esperando usuario... intento ${attempts}`);
            }
            
            // Obtener usuario actual
            const currentUser = this.userManager.currentUser;
            
            if (!currentUser) {
                console.log('👤 No hay usuario autenticado');
                return false;
            }
            
            // Obtener tema del usuario
            let themeId = currentUser.theme;
            
            console.log('🎯 Tema del usuario desde DB:', themeId);
            
            // Validar tema
            if (!themeId || themeId === 'predeterminado') {
                themeId = 'default';
            }
            
            // Cargar colores del tema
            this.loadThemeColors(themeId);
            
            // Guardar estado actual
            this.currentTheme = themeId;
            
            // También guardar en localStorage para futuras cargas rápidas
            localStorage.setItem('centinela-theme', JSON.stringify({
                themeId: themeId,
                timestamp: Date.now()
            }));
            
            return true;
            
        } catch (error) {
            console.error('🔥 Error cargando colores desde DB:', error);
            return false;
        }
    }
    
    // =============================================
    // CARGAR COLORES DEL TEMA
    // =============================================
    loadThemeColors(themeId) {
        const themePresets = this.getThemePresets();
        const theme = themePresets[themeId];
        
        if (!theme) {
            console.warn(`⚠️ Tema ${themeId} no encontrado`);
            return false;
        }
        
        // Obtener color de acento principal
        const accentColor = theme.colors['--color-accent-primary'];
        
        console.log('🎨 Color de acento detectado:', accentColor);
        
        // Actualizar colores de partículas
        this.updateParticleColors(accentColor);
        
        // Guardar tema actual
        this.currentTheme = themeId;
        
        return true;
    }
    
    // =============================================
    // ACTUALIZAR COLORES DE PARTÍCULAS
    // =============================================
    updateParticleColors(accentColor) {
        // Convertir HEX a RGBA
        if (accentColor.startsWith('#')) {
            const rgb = this.hexToRgb(accentColor);
            this.primaryColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
            
            // Crear color secundario más claro
            const lighter = {
                r: Math.min(255, rgb.r + 40),
                g: Math.min(255, rgb.g + 40),
                b: Math.min(255, rgb.b + 40)
            };
            this.secondaryColor = `rgba(${lighter.r}, ${lighter.g}, ${lighter.b}, 0.8)`;
            
        } else if (accentColor.includes('rgb')) {
            // Ya es RGB/RGBA
            this.primaryColor = accentColor.replace(')', ', 0.8)').replace('rgb', 'rgba');
            
            // Crear versión más clara
            const match = accentColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.min(255, parseInt(match[1]) + 40);
                const g = Math.min(255, parseInt(match[2]) + 40);
                const b = Math.min(255, parseInt(match[3]) + 40);
                this.secondaryColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
            } else {
                this.secondaryColor = this.primaryColor;
            }
        } else {
            // Color por defecto
            this.primaryColor = 'rgba(192, 192, 192, 0.8)';
            this.secondaryColor = 'rgba(255, 255, 255, 0.8)';
        }
        
        // Actualizar partículas existentes
        if (this.particles.length > 0) {
            this.updateExistingParticles();
        }
        
        console.log('🎨 Colores actualizados:', { 
            primary: this.primaryColor, 
            secondary: this.secondaryColor 
        });
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('particle-colors', JSON.stringify({
            primary: this.primaryColor,
            secondary: this.secondaryColor,
            timestamp: Date.now()
        }));
    }
    
    // =============================================
    // ACTUALIZAR PARTÍCULAS EXISTENTES
    // =============================================
    updateExistingParticles() {
        this.particles.forEach(particle => {
            particle.color = Math.random() > 0.7 ? this.secondaryColor : this.primaryColor;
        });
    }
    
    // =============================================
    // USAR COLORES POR DEFECTO
    // =============================================
    useDefaultColors() {
        this.primaryColor = 'rgba(192, 192, 192, 0.8)';
        this.secondaryColor = 'rgba(255, 255, 255, 0.8)';
        this.currentTheme = 'default';
        
        // Actualizar partículas si ya existen
        if (this.particles.length > 0) {
            this.updateExistingParticles();
        }
        
        console.log('🎨 Usando colores por defecto');
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
        
        console.log(`✨ Creando ${particleCount} partículas con tema:`, this.currentTheme);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 1 - 0.5,
                speedY: Math.random() * 1 - 0.5,
                color: Math.random() > 0.7 ? this.secondaryColor : this.primaryColor,
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
        const resizeHandler = () => {
            this.resizeCanvas();
            this.createParticles();
        };
        window.addEventListener("resize", resizeHandler);
        
        // Cambios de tema desde ThemeLoader
        const themeChangeHandler = (event) => {
            if (event.detail?.themeId) {
                console.log('🔄 Tema cambiado desde ThemeLoader:', event.detail.themeId);
                this.loadThemeColors(event.detail.themeId);
            }
        };
        document.addEventListener('themeApplied', themeChangeHandler);
        
        // Cambios en UserManager
        const userUpdateHandler = async () => {
            console.log('👤 Usuario actualizado, actualizando partículas...');
            await this.loadColorsFromDatabase();
        };
        document.addEventListener('userUpdated', userUpdateHandler);
        
        // Cambios en localStorage (otras pestañas)
        const storageHandler = (event) => {
            if (event.key === 'centinela-theme') {
                console.log('🔄 Tema cambiado desde otra pestaña');
                setTimeout(async () => {
                    await this.loadColorsFromDatabase();
                }, 100);
            }
            
            if (event.key === 'particle-colors') {
                console.log('🎨 Colores de partículas actualizados desde otra pestaña');
                try {
                    const colors = JSON.parse(event.newValue);
                    if (colors) {
                        this.primaryColor = colors.primary;
                        this.secondaryColor = colors.secondary;
                        this.updateExistingParticles();
                    }
                } catch (e) {
                    console.warn('Error cargando colores:', e);
                }
            }
        };
        window.addEventListener('storage', storageHandler);
        
        // Guardar referencias para poder removerlas después
        this.eventListeners = {
            resize: resizeHandler,
            themeApplied: themeChangeHandler,
            userUpdated: userUpdateHandler,
            storage: storageHandler
        };
    }
    
    // =============================================
    // OBTENER PRESETS DE TEMAS
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
        
        // Remover clase del body
        document.body.classList.remove('particulas-active');
        
        // Remover estilos inyectados
        const styles = document.querySelectorAll('style[data-particle-styles]');
        styles.forEach(style => style.remove());
        
        // Remover event listeners
        if (this.eventListeners) {
            window.removeEventListener("resize", this.eventListeners.resize);
            document.removeEventListener('themeApplied', this.eventListeners.themeApplied);
            document.removeEventListener('userUpdated', this.eventListeners.userUpdated);
            window.removeEventListener('storage', this.eventListeners.storage);
        }
        
        console.log('🧹 ParticleSystem destruido');
    }
}

// =============================================
// INICIALIZACIÓN AUTOMÁTICA (SINGLETON)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando sistema de partículas...');
    
    // Verificar si ya existe una instancia
    if (window.particleSystem) {
        console.log('🔄 Reciclando instancia existente de ParticleSystem');
        try {
            window.particleSystem.destroy();
        } catch (e) {
            console.warn('Error al destruir instancia anterior:', e);
        }
    }
    
    // Crear nueva instancia
    window.particleSystem = new ParticleSystem();
    
    console.log('✅ Sistema de partículas funcionando');
});

// =============================================
// FUNCIÓN PÚBLICA PARA ACTUALIZAR COLORS
// =============================================
/**
 * Función pública para actualizar colores de partículas desde cualquier parte
 * @param {string} themeId - ID del tema a aplicar
 */
window.updateParticleColors = function(themeId) {
    if (window.particleSystem) {
        window.particleSystem.loadThemeColors(themeId);
        return true;
    }
    return false;
};

/**
 * Función pública para forzar recarga de colores
 */
window.reloadParticleColors = async function() {
    if (window.particleSystem) {
        await window.particleSystem.loadColorsFromDatabase();
        return true;
    }
    return false;
};