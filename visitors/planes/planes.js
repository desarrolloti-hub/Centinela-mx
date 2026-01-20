// Añadir interactividad a los botones
document.querySelectorAll('.order-btn').forEach(button => {
    button.addEventListener('click', function (e) {
        e.preventDefault();
        const planCard = this.closest('.plan-card');
        const planType = planCard.querySelector('.plan-type').textContent;
        const planPrice = planCard.querySelector('.price').textContent;

        // Efecto visual al hacer clic
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);

        alert(`Has seleccionado el plan ${planType} por $${planPrice}. ¡Gracias por tu interés!`);
    });

    // Manejar navegación por teclado
    button.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
});

// Efecto de enfoque para tarjetas
document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.zIndex = '10';
    });

    card.addEventListener('mouseleave', function () {
        this.style.zIndex = '1';
    });

    // Permitir navegación por teclado entre tarjetas
    card.setAttribute('tabindex', '0');

    card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            const button = this.querySelector('.order-btn');
            if (button) {
                button.focus();
                button.click();
            }
        }
    });
});

// Instrucciones para imágenes
console.log("=== INSTRUCCIONES PARA USAR IMÁGENES ===");
console.log("");
console.log("1. Coloca tu logo en la carpeta /assets/images/ como 'logo.png'");
console.log("");
console.log("2. Si quieres usar imágenes diferentes para cada plan:");
console.log("   - Crea archivos: bronce.png, dorado.png, plateado.png");
console.log("   - Colócalos en /assets/images/");
console.log("   - Actualiza las rutas en cada tarjeta:");
console.log("");
console.log("   Plan Bronce (línea ~127):");
console.log("   Cambiar: <img src='/assets/images/logo.png'>");
console.log("   Por: <img src='/assets/images/bronce.png'>");
console.log("");
console.log("   Plan Dorado (línea ~152):");
console.log("   Cambiar: <img src='/assets/images/logo.png'>");
console.log("   Por: <img src='/assets/images/dorado.png'>");
console.log("");
console.log("   Plan Plateado (línea ~177):");
console.log("   Cambiar: <img src='/assets/images/logo.png'>");
console.log("   Por: <img src='/assets/images/plateado.png'>");