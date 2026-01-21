// =============================================
// FUNCIONALIDAD DE PLANES - VERSIÓN DEFINITIVA
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    const planCards = document.querySelectorAll('.plan-card');
    let activeCard = null;
    let isAnimating = false;

    // Inicializar tarjetas
    function initializeCards() {
        planCards.forEach((card, index) => {
            const expandedView = card.querySelector('.plan-expanded-view');
            const compactView = card.querySelector('.plan-compact-view');

            // Estado inicial: compacta visible, expandida oculta
            expandedView.style.display = 'none';
            expandedView.style.opacity = '0';
            expandedView.style.visibility = 'hidden';

            compactView.style.display = 'flex';
            compactView.style.opacity = '1';
            compactView.style.visibility = 'visible';

            // Calcular y guardar altura compacta
            const compactHeight = compactView.offsetHeight;
            card.dataset.compactHeight = compactHeight;
            card.style.height = compactHeight + 'px';
            card.style.overflow = 'hidden';

            // Calcular altura expandida
            calculateExpandedHeight(card);

            // Configurar transición de altura
            card.style.transition = 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

            // Estado inicial
            card.classList.remove('expanded');
            card.setAttribute('data-expanded', 'false');
            card.dataset.cardIndex = index;
        });
    }

    // Calcular altura expandida
    function calculateExpandedHeight(card) {
        const expandedView = card.querySelector('.plan-expanded-view');

        // Mostrar temporalmente para medir
        expandedView.style.display = 'block';
        expandedView.style.opacity = '1';
        expandedView.style.visibility = 'visible';

        // Forzar reflow
        void expandedView.offsetHeight;

        // Calcular altura total del contenido expandido
        const expandedHeight = expandedView.scrollHeight;
        card.dataset.expandedHeight = expandedHeight;

        // Ocultar de nuevo
        expandedView.style.display = 'none';
        expandedView.style.opacity = '0';
        expandedView.style.visibility = 'hidden';

        return expandedHeight;
    }

    // Expandir tarjeta
    function expandCard(card) {
        if (isAnimating || card === activeCard) return;

        isAnimating = true;

        const expandedView = card.querySelector('.plan-expanded-view');
        const compactView = card.querySelector('.plan-compact-view');

        // Recalcular altura por si el contenido cambió
        calculateExpandedHeight(card);

        // Cerrar tarjeta activa si existe
        if (activeCard && activeCard !== card) {
            collapseCard(activeCard, false);
            setTimeout(() => performExpand(card, expandedView, compactView), 450);
        } else {
            performExpand(card, expandedView, compactView);
        }
    }

    function performExpand(card, expandedView, compactView) {
        // Cambiar altura primero
        card.style.height = card.dataset.expandedHeight + 'px';

        // Esperar a que termine la transición de altura
        setTimeout(() => {
            // Ocultar vista compacta COMPLETAMENTE
            compactView.style.opacity = '0';
            compactView.style.visibility = 'hidden';
            compactView.style.display = 'none';

            // Mostrar vista expandida
            expandedView.style.display = 'block';

            // Forzar reflow
            void expandedView.offsetHeight;

            // Animar opacidad
            requestAnimationFrame(() => {
                expandedView.style.opacity = '1';
                expandedView.style.visibility = 'visible';

                // Completar expansión
                setTimeout(() => {
                    card.classList.add('expanded');
                    card.setAttribute('data-expanded', 'true');
                    activeCard = card;
                    isAnimating = false;
                }, 50);
            });
        }, 400);
    }

    // Colapsar tarjeta
    function collapseCard(card, updateActive = true) {
        if (isAnimating) return;

        isAnimating = true;

        const expandedView = card.querySelector('.plan-expanded-view');
        const compactView = card.querySelector('.plan-compact-view');

        // Ocultar contenido expandido primero
        expandedView.style.opacity = '0';
        expandedView.style.visibility = 'hidden';

        // Esperar a que se oculte el contenido
        setTimeout(() => {
            // Ocultar completamente la vista expandida
            expandedView.style.display = 'none';

            // Mostrar vista compacta
            compactView.style.display = 'flex';

            // Forzar reflow
            void compactView.offsetHeight;

            // Animar
            requestAnimationFrame(() => {
                compactView.style.opacity = '1';
                compactView.style.visibility = 'visible';

                // Reducir altura
                card.style.height = card.dataset.compactHeight + 'px';

                // Completar colapso
                setTimeout(() => {
                    card.classList.remove('expanded');
                    card.setAttribute('data-expanded', 'false');

                    if (updateActive && activeCard === card) {
                        activeCard = null;
                    }

                    isAnimating = false;
                }, 400);
            });
        }, 200);
    }

    // Toggle
    function toggleCard(card) {
        if (card.getAttribute('data-expanded') === 'true') {
            collapseCard(card);
        } else {
            expandCard(card);
        }
    }

    // Event listeners
    planCards.forEach(card => {
        card.addEventListener('click', function (e) {
            if (e.target.closest('.order-btn')) return;
            e.preventDefault();
            e.stopPropagation();
            toggleCard(this);
        });

        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCard(this);
            }
        });
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (activeCard && !activeCard.contains(e.target) && !e.target.closest('.plan-card')) {
            collapseCard(activeCard);
        }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && activeCard) {
            collapseCard(activeCard);
        }
    });

    // Redimensionamiento
    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            planCards.forEach(card => {
                const compactView = card.querySelector('.plan-compact-view');
                const compactHeight = compactView.offsetHeight;
                card.dataset.compactHeight = compactHeight;

                if (card.getAttribute('data-expanded') === 'true') {
                    calculateExpandedHeight(card);
                    card.style.height = card.dataset.expandedHeight + 'px';
                }
            });
        }, 250);
    });

    // Inicializar
    initializeCards();

    // Recalcular después de carga completa
    window.addEventListener('load', function () {
        setTimeout(function () {
            planCards.forEach(card => {
                calculateExpandedHeight(card);
            });
        }, 100);
    });
});