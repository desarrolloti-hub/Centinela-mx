// Esta función se asegura de que el código se ejecute solo cuando el HTML esté listo.
document.addEventListener('DOMContentLoaded', function () {

    // Busca el elemento canvas en el HTML
    const canvas = document.getElementById("particle-canvas");
    // Si no lo encuentra, detiene el script para evitar errores.
    if (!canvas) {
        console.error("Error: No se encontró el elemento <canvas> con el id 'particle-canvas'.");
        return;
    }

    const ctx = canvas.getContext("2d");

    // Función para ajustar el tamaño del canvas a la ventana
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();

    // Colores de las partículas
    const blueColor = "rgba(154, 157, 163, 0.8)";
    const orangeColor = "rgba(161, 158, 155, 0.8)";

    let particles = [];
    const particleCount = Math.floor(window.innerWidth / 15);

    // Crea las partículas con posiciones y velocidades aleatorias
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 1 - 0.5,
            speedY: Math.random() * 1 - 0.5,
            color: Math.random() > 0.7 ? orangeColor : blueColor,
        });
    }

    // El corazón de la animación: se ejecuta una y otra vez
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Mueve la partícula
            p.x += p.speedX;
            p.y += p.speedY;

            // Rebote en los bordes
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

            // Dibuja la partícula
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            // Dibuja las líneas de conexión
            for (let j = i; j < particles.length; j++) {
                const p2 = particles[j];
                const distance = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));

                if (distance < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = p.color.replace('0.8', '0.2'); // Hace la línea más transparente
                    ctx.lineWidth = 0.7;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        // Llama a la siguiente actualización de la animación
        requestAnimationFrame(animate);
    }

    // Inicia la animación
    animate();

    // Vuelve a ajustar el canvas si el usuario cambia el tamaño de la ventana
    window.addEventListener("resize", resizeCanvas);
});




//Para agregar las particulas tienes que agregar estos campos
// los css                 componentes/particulas/particulas.css
// este scrip              componentes/particulas/particulas.js
// y por ultimo este id    <canvas id="particle-canvas"></canvas>
