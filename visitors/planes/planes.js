//Funcionalidad de expansión
document.addEventListener('DOMContentLoaded', function () {
    const planCards = document.querySelectorAll('.plan-card');

    // Pre-cálculo de alturas para evitar parpadeo
    planCards.forEach(card => {
        const expandedView = card.querySelector('.plan-expanded-view');
        // Ocultar completamente al inicio
        expandedView.style.display = 'none';
    });

    // Función para expandir tarjeta
    function expandCard(card) {
        const expandedView = card.querySelector('.plan-expanded-view');
        const compactView = card.querySelector('.plan-compact-view');

        // Mostrar la vista expandida primero
        expandedView.style.display = 'block';
        expandedView.style.opacity = '0';
        expandedView.style.transform = 'translateY(20px)';

        // Calcular altura necesaria
        const compactHeight = compactView.offsetHeight;
        const expandedHeight = expandedView.scrollHeight;

        // Aplicar altura a la tarjeta
        card.style.height = expandedHeight + 'px';

        // Animación de fade-in
        setTimeout(() => {
            expandedView.style.opacity = '1';
            expandedView.style.transform = 'translateY(0)';
            compactView.style.opacity = '0';
        }, 10);

        card.classList.add('expanded');
        card.setAttribute('data-expanded', 'true');
    }

    // Función para contraer tarjeta
    function collapseCard(card) {
        const expandedView = card.querySelector('.plan-expanded-view');
        const compactView = card.querySelector('.plan-compact-view');
        const compactHeight = compactView.scrollHeight;

        // Animación de fade-out
        expandedView.style.opacity = '0';
        expandedView.style.transform = 'translateY(20px)';
        compactView.style.opacity = '1';

        // Reducir altura después de la animación
        setTimeout(() => {
            card.style.height = compactHeight + 'px';
            expandedView.style.display = 'none';
            card.classList.remove('expanded');
            card.setAttribute('data-expanded', 'false');
        }, 300);
    }

    // Para dispositivos móviles: toggle al hacer clic
    planCards.forEach(card => {
        card.addEventListener('click', function (e) {
            // Solo aplicar en móviles
            if (window.innerWidth <= 768) {
                // Evitar que se active al hacer clic en el botón de ordenar
                if (!e.target.closest('.order-btn')) {
                    const isExpanded = this.getAttribute('data-expanded') === 'true';

                    // Cerrar otras tarjetas primero
                    planCards.forEach(otherCard => {
                        if (otherCard !== this && otherCard.getAttribute('data-expanded') === 'true') {
                            collapseCard(otherCard);
                        }
                    });

                    // Alternar estado actual
                    if (isExpanded) {
                        collapseCard(this);
                    } else {
                        expandCard(this);
                    }
                }
            }
        });

        // Para desktop: hover
        card.addEventListener('mouseenter', function () {
            if (window.innerWidth > 768) {
                expandCard(this);
            }
        });

        card.addEventListener('mouseleave', function () {
            if (window.innerWidth > 768) {
                collapseCard(this);
            }
        });

        // Soporte para teclado (accesibilidad)
        card.addEventListener('focus', function () {
            expandCard(this);
        });

        card.addEventListener('blur', function () {
            // Solo contraer si no es en móvil (en móvil se maneja con click)
            if (window.innerWidth > 768) {
                collapseCard(this);
            }
        });
    });

    // Cerrar tarjeta expandida al hacer clic fuera en móviles
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 768) {
            if (!e.target.closest('.plan-card')) {
                planCards.forEach(card => {
                    if (card.getAttribute('data-expanded') === 'true') {
                        collapseCard(card);
                    }
                });
            }
        }
    });

    // Inicializar alturas después de cargar todo
    window.addEventListener('load', function () {
        planCards.forEach(card => {
            const compactView = card.querySelector('.plan-compact-view');
            const compactHeight = compactView.scrollHeight;
            card.style.height = compactHeight + 'px';
        });
    });
});