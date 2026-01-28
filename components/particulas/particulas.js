// =============================================
// SISTEMA DE PARTÍCULAS ANIMADAS
// Integrado con Theme Manager
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    // Busca el elemento canvas
    const canvas = document.getElementById("particle-canvas");
    if (!canvas) {
        console.warn("Canvas de partículas no encontrado");
        return;
    }

    const ctx = canvas.getContext("2d");

    // Ajustar tamaño del canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();

    // Variables de partículas
    let particles = [];
    let particleColors = {
        primary: "rgba(192, 192, 192, 0.8)",  // Plateado por defecto
        secondary: "rgba(255, 255, 255, 0.8)" // Blanco por defecto
    };

    // =============================================
    // OBTENER COLORES DEL TEMA ACTUAL
    // =============================================
    function updateColorsFromTheme() {
        const root = document.documentElement;
        
        // Obtener color de acento primario del CSS
        const accentColor = getComputedStyle(root)
            .getPropertyValue('--color-accent-primary')
            .trim();
        
        console.log('🎨 Color de acento detectado:', accentColor);
        
        // Si hay un color válido, usarlo
        if (accentColor && accentColor !== '#c0c0c0' && !accentColor.startsWith('var(')) {
            // Convertir HEX a RGBA
            if (accentColor.startsWith('#')) {
                const rgb = hexToRgb(accentColor);
                particleColors.primary = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
                
                // Crear color secundario más claro
                const lighter = {
                    r: Math.min(255, rgb.r + 40),
                    g: Math.min(255, rgb.g + 40),
                    b: Math.min(255, rgb.b + 40)
                };
                particleColors.secondary = `rgba(${lighter.r}, ${lighter.g}, ${lighter.b}, 0.8)`;
            } else if (accentColor.includes('rgb')) {
                // Ya es RGB/RGBA, usar directamente
                particleColors.primary = accentColor.replace(')', ', 0.8)').replace('rgb', 'rgba');
                
                // Crear versión más clara
                const match = accentColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
                if (match) {
                    const r = Math.min(255, parseInt(match[1]) + 40);
                    const g = Math.min(255, parseInt(match[2]) + 40);
                    const b = Math.min(255, parseInt(match[3]) + 40);
                    particleColors.secondary = `rgba(${r}, ${g}, ${b}, 0.8)`;
                }
            }
            
            console.log('🎨 Colores de partículas actualizados:', particleColors);
            
            // Actualizar colores de las partículas existentes
            updateParticlesColors();
        }
    }

    // =============================================
    // CONVERTIR HEX A RGB
    // =============================================
    function hexToRgb(hex) {
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
    // ACTUALIZAR COLORES DE PARTÍCULAS
    // =============================================
    function updateParticlesColors() {
        particles.forEach(particle => {
            particle.color = Math.random() > 0.7 ? 
                particleColors.secondary : 
                particleColors.primary;
        });
    }

    // =============================================
    // CREAR PARTÍCULAS
    // =============================================
    function createParticles() {
        particles = [];
        const particleCount = Math.floor(window.innerWidth / 15);
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 1 - 0.5,
                speedY: Math.random() * 1 - 0.5,
                color: Math.random() > 0.7 ? 
                    particleColors.secondary : 
                    particleColors.primary,
            });
        }
    }

    // =============================================
    // ANIMACIÓN
    // =============================================
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Mover partícula
            p.x += p.speedX;
            p.y += p.speedY;

            // Rebote en bordes
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

            // Dibujar partícula
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            // Dibujar líneas de conexión
            for (let j = i; j < particles.length; j++) {
                const p2 = particles[j];
                const distance = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));

                if (distance < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = p.color.replace('0.8', '0.2');
                    ctx.lineWidth = 0.7;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    }

    // =============================================
    // INICIALIZAR
    // =============================================
    function init() {
        // Obtener colores iniciales del tema
        updateColorsFromTheme();
        
        // Crear partículas
        createParticles();
        
        // Iniciar animación
        animate();
        
        console.log('✅ Partículas inicializadas');
    }

    // =============================================
    // ESCUCHAR CAMBIOS DE TEMA
    // =============================================
    document.addEventListener('themeChanged', function(event) {
        console.log('🔄 Tema cambiado, actualizando partículas...');
        
        // Pequeño delay para asegurar que los colores CSS se actualizaron
        setTimeout(() => {
            updateColorsFromTheme();
        }, 100);
    });

    // Escuchar cambios en localStorage
    window.addEventListener('storage', function(event) {
        if (event.key === 'centinela-theme') {
            console.log('🔄 Tema cambiado desde otra pestaña');
            setTimeout(() => {
                updateColorsFromTheme();
            }, 100);
        }
    });

    // Escuchar resize
    window.addEventListener("resize", function() {
        resizeCanvas();
        createParticles();
    });

    // Iniciar
    init();
});