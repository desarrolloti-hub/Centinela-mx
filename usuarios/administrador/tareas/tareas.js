// tareas.js - VERSIÓN NOTAS CON CHECKBOX
// ESTILO: COMO EN LA IMAGEN "mi prueba" CON CHECKBOX Y FLECHITA

import { TareaManager } from '/clases/tarea.js';
import { UserManager } from '/clases/user.js';

// ========== CONFIGURACIÓN DE RUTAS ==========
const RUTAS = {
    general: '/usuarios/administrador/crearTareaGeneral/crearTareaGeneral.html',
    personal: '/usuarios/administrador/crearTareaPersonal/crearTareaPersonal.html',
    compartida: '/usuarios/administrador/crearTareaCompartida/crearTareaCompartida.html',
    area: '/usuarios/administrador/crearTareaArea/crearTareaArea.html'
};

// ========== VARIABLES GLOBALES ==========
let tareaManager = null;
let userManager = null;
let usuarioActual = null;
let tareaActual = null;
let modoEdicion = false;

// Configuración de búsqueda
let terminoBusqueda = '';
let todasLasTareas = [];
let tareasFiltradas = [];

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('🚀 Inicializando Notas (versión con checkbox)...');

        // 1. Inicializar managers
        userManager = new UserManager();
        const { TareaManager } = await import('/clases/tarea.js');
        tareaManager = new TareaManager();

        // 2. Esperar a que se cargue el usuario
        await esperarUsuario();

        // 3. Si no hay usuario, redirigir
        if (!usuarioActual) {
            console.error('❌ No hay usuario autenticado');
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
            return;
        }

        console.log('👤 Usuario actual:', usuarioActual.nombreCompleto);
        console.log('🆔 ID del usuario:', usuarioActual.id);
        console.log('📍 Área asignada ID:', usuarioActual.areaAsignadaId);
        console.log('👔 Cargo ID:', usuarioActual.cargoId);

        // 4. Guardar información en localStorage
        localStorage.setItem('adminInfo', JSON.stringify({
            id: usuarioActual.id,
            uid: usuarioActual.uid,
            nombreCompleto: usuarioActual.nombreCompleto,
            organizacion: usuarioActual.organizacion,
            organizacionCamelCase: usuarioActual.organizacionCamelCase,
            rol: usuarioActual.rol,
            correoElectronico: usuarioActual.correoElectronico,
            areaAsignadaId: usuarioActual.areaAsignadaId,
            cargoId: usuarioActual.cargoId,
            timestamp: new Date().toISOString()
        }));

        // 5. Cargar notas desde Firebase
        await cargarTareas();

        // 6. Configurar búsqueda
        configurarBusqueda();

        // 7. Configurar eventos
        configurarEventos();

    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarError(error.message || 'Error al cargar la página');
    }
});

// ========== ESPERAR USUARIO ==========
async function esperarUsuario() {
    for (let i = 0; i < 30; i++) {
        if (userManager.currentUser) {
            usuarioActual = userManager.currentUser;
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
}

// ========== CARGAR TAREAS DESDE FIREBASE ==========
async function cargarTareas() {
    try {
        mostrarEstadoCarga();

        if (!usuarioActual?.organizacionCamelCase) {
            throw new Error('No hay organización definida');
        }

        console.log('📦 Cargando notas desde Firebase...');

        // Obtener TODAS las notas sin filtrar
        todasLasTareas = await tareaManager.getTodasLasTareas(
            usuarioActual.organizacionCamelCase
        );

        console.log(`✅ ${todasLasTareas.length} notas totales cargadas`);

        // 🔍 DEPURACIÓN: Mostrar todas las notas
        console.log('📋 TODAS las notas de la organización:');
        todasLasTareas.forEach(t => {
            console.log(`   - "${t.nombreActividad}": tipo=${t.tipo}, completada=${t.completada}, creadoPor=${t.creadoPor}`);

            // Mostrar detalles de visibilidad
            if (t.tipo === 'compartida') {
                console.log(`      👥 Compartida con:`, t.usuariosCompartidosIds);
            }
            if (t.tipo === 'area') {
                console.log(`      🏢 Área: ${t.areaId}, Cargos:`, t.cargosIds);
            }
        });

        tareasFiltradas = [...todasLasTareas];

        // Clasificar notas según visibilidad del usuario
        clasificarTareas();

    } catch (error) {
        console.error('❌ Error cargando notas:', error);
        mostrarErrorEnSecciones(error.message);
    }
}

// ========== CONFIGURAR BÚSQUEDA ==========
function configurarBusqueda() {
    const inputBuscar = document.getElementById('searchInput');

    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                terminoBusqueda = e.target.value.trim().toLowerCase();
                filtrarYRenderizar();
            }, 300);
        });

        inputBuscar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                terminoBusqueda = e.target.value.trim().toLowerCase();
                filtrarYRenderizar();
            }
        });
    }
}

// ========== FILTRAR Y RENDERIZAR ==========
function filtrarYRenderizar() {
    if (!todasLasTareas.length) {
        tareasFiltradas = [];
    } else if (!terminoBusqueda || terminoBusqueda.length < 2) {
        tareasFiltradas = [...todasLasTareas];
    } else {
        tareasFiltradas = todasLasTareas.filter(t =>
            (t.nombreActividad && t.nombreActividad.toLowerCase().includes(terminoBusqueda)) ||
            (t.descripcion && t.descripcion.toLowerCase().includes(terminoBusqueda))
        );
    }

    clasificarTareas();
}

// ========== CLASIFICAR TAREAS POR VISIBILIDAD ==========
function clasificarTareas() {
    console.log('📊 CLASIFICANDO notas según visibilidad del usuario:');
    console.log('   👤 Usuario:', usuarioActual.nombreCompleto);
    console.log('   🆔 ID:', usuarioActual.id);
    console.log('   🏢 Área:', usuarioActual.areaAsignadaId);
    console.log('   👔 Cargo:', usuarioActual.cargoId);

    // El creador SIEMPRE puede ver sus propias notas
    const esCreador = (tarea) => tarea.creadoPor === usuarioActual.id;

    // Filtrar según visibilidad para CADA tipo
    const tareasGenerales = tareasFiltradas.filter(t =>
        t.tipo === 'global' || t.tipo === 'general' // Las generales/globales son visibles para todos
    );

    const tareasPersonales = tareasFiltradas.filter(t =>
        t.tipo === 'personal' && t.creadoPor === usuarioActual.id
    );

    const tareasCompartidas = tareasFiltradas.filter(t => {
        if (t.tipo !== 'compartida') return false;

        // ✅ El creador SIEMPRE ve sus notas compartidas
        if (esCreador(t)) {
            console.log(`   🔍 Compartida "${t.nombreActividad}": ✅ VISIBLE (es el creador)`);
            return true;
        }

        // Si no es el creador, verificar si está en la lista
        const esVisible = t.usuariosCompartidosIds?.includes(usuarioActual.id);
        if (esVisible) {
            console.log(`   🔍 Compartida "${t.nombreActividad}": ✅ VISIBLE (en lista)`);
        }
        return esVisible;
    });

    const tareasArea = tareasFiltradas.filter(t => {
        if (t.tipo !== 'area') return false;

        // ✅ El creador SIEMPRE ve sus notas de área
        if (esCreador(t)) {
            console.log(`   🔍 Área "${t.nombreActividad}": ✅ VISIBLE (es el creador)`);
            return true;
        }

        // Verificar área
        if (t.areaId && t.areaId !== usuarioActual.areaAsignadaId) {
            return false;
        }

        // Verificar cargos si existen
        if (t.cargosIds && t.cargosIds.length > 0) {
            return t.cargosIds.includes(usuarioActual.cargoId);
        }

        return true;
    });

    console.log('📊 RESULTADO DE CLASIFICACIÓN:', {
        total: tareasFiltradas.length,
        generales: tareasGenerales.length,
        personales: tareasPersonales.length,
        compartidas: tareasCompartidas.length,
        area: tareasArea.length
    });

    renderizarSeccion('tareasGenerales', tareasGenerales, 'general');
    renderizarSeccion('tareasPersonales', tareasPersonales, 'personal');
    renderizarSeccion('tareasCompartidas', tareasCompartidas, 'compartida');
    renderizarSeccion('tareasArea', tareasArea, 'area');

    document.getElementById('countGenerales').textContent = tareasGenerales.length;
    document.getElementById('countPersonales').textContent = tareasPersonales.length;
    document.getElementById('countCompartidas').textContent = tareasCompartidas.length;
    document.getElementById('countArea').textContent = tareasArea.length;
}

function renderizarSeccion(containerId, tareas, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!tareas || tareas.length === 0) {
        container.innerHTML = getEmptyStateHTML(tipo);
        return;
    }

    let html = '';
    tareas.forEach(tarea => {
        html += crearTarjetaNota(tarea);
    });

    container.innerHTML = html;

    // Configurar eventos para las tarjetas
    container.querySelectorAll('.tarea-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // No abrir el detalle si se hizo clic en un checkbox o botón
            if (e.target.closest('.item-checkbox') || e.target.closest('button')) return;
            const tareaId = card.dataset.tareaId;
            if (tareaId) {
                abrirModalDetalle(tareaId);
            }
        });
    });

    // Configurar eventos para los checkboxes (marcar items directamente)
    container.querySelectorAll('.item-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            e.stopPropagation();
            const tareaId = checkbox.dataset.tareaId;
            const itemId = checkbox.dataset.itemId;
            const completado = checkbox.checked;

            await marcarItemNota(tareaId, itemId, completado);
        });
    });
}

// ========== CREAR TARJETA DE NOTA (ESTILO IMAGEN) ==========
function crearTarjetaNota(tarea) {
    const tipoClass = {
        'general': 'tipo-general',
        'global': 'tipo-general',
        'personal': 'tipo-personal',
        'compartida': 'tipo-compartida',
        'area': 'tipo-area'
    }[tarea.tipo] || 'tipo-general';

    const tipoTexto = {
        'general': 'General',
        'global': 'General',
        'personal': 'Personal',
        'compartida': 'Compartida',
        'area': 'Área'
    }[tarea.tipo] || 'General';

    const fecha = tarea.fechaCreacion instanceof Date ?
        tarea.fechaCreacion : new Date(tarea.fechaCreacion);

    const fechaStr = fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '');

    // Verificar si el usuario actual es el creador
    const esCreador = tarea.creadoPor === usuarioActual?.id;

    // Obtener items del checklist
    const items = tarea.getItemsArray ? tarea.getItemsArray() :
        (tarea.items ? Object.values(tarea.items) : []);

    // Si no hay items, mostrar la nota simple como en la imagen
    if (items.length === 0) {
        return `
            <div class="tarea-card ${tarea.completada ? 'completada' : ''}" data-tarea-id="${tarea.id}">
                <div class="tarea-header">
                    <h3 class="tarea-titulo">${escapeHTML(tarea.nombreActividad || 'Sin título')}</h3>
                    <span class="tarea-tipo-badge ${tipoClass}">${escapeHTML(tipoTexto)}</span>
                </div>
                
                ${tarea.descripcion ? `
                    <p class="tarea-descripcion">${escapeHTML(tarea.descripcion)}</p>
                ` : ''}
                
                <div class="tarea-footer">
                    <span class="tarea-creador">
                        <i class="fas fa-user"></i>
                        ${escapeHTML(tarea.creadoPorNombre || 'Usuario')}
                        ${esCreador ? '<span style="color: #ffc107; font-size: 10px; margin-left: 4px;">(tú)</span>' : ''}
                    </span>
                    <span class="tarea-fecha">
                        <i class="fas fa-calendar"></i>
                        ${escapeHTML(fechaStr)}
                    </span>
                </div>
            </div>
        `;
    }

    // Con items del checklist - ESTILO COMO EN LA IMAGEN
    const itemsHTML = items.map((item, index) => {
        const itemId = item.id || `item_${index}`;
        return `
            <div class="item-row" style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
                <input type="checkbox" class="item-checkbox" 
                       data-tarea-id="${tarea.id}" 
                       data-item-id="${itemId}"
                       ${item.completado ? 'checked' : ''}>
                <span style="color: var(--color-text-primary); font-size: 14px; ${item.completado ? 'text-decoration: line-through; color: var(--color-text-dim);' : ''}">
                    ${escapeHTML(item.texto || item)}
                </span>
            </div>
        `;
    }).join('');

    return `
        <div class="tarea-card" data-tarea-id="${tarea.id}" style="cursor: pointer;">
            <div class="tarea-header" style="margin-bottom: 10px;">
                <h3 class="tarea-titulo" style="font-size: 16px; margin: 0;">${escapeHTML(tarea.nombreActividad || 'Sin título')}</h3>
                <span class="tarea-tipo-badge ${tipoClass}">${escapeHTML(tipoTexto)}</span>
            </div>
            
            ${tarea.descripcion ? `
                <p style="color: var(--color-text-secondary); font-size: 13px; margin: 5px 0 10px 0; border-left: 2px solid var(--color-accent-primary); padding-left: 8px;">
                    ${escapeHTML(tarea.descripcion)}
                </p>
            ` : ''}
            
            <!-- Items del checklist - ESTILO IMAGEN -->
            <div style="margin: 10px 0;">
                ${itemsHTML}
            </div>
            
            <div class="tarea-footer" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--color-border-light); display: flex; justify-content: space-between; align-items: center;">
                <span class="tarea-creador" style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--color-text-dim);">
                    <i class="fas fa-user"></i>
                    ${escapeHTML(tarea.creadoPorNombre || 'Usuario')}
                    ${esCreador ? '<span style="color: #ffc107; font-size: 10px;">(tú)</span>' : ''}
                </span>
                <span class="tarea-fecha" style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--color-text-dim);">
                    <i class="fas fa-calendar"></i>
                    ${escapeHTML(fechaStr)}
                </span>
            </div>
        </div>
    `;
}

// ========== MARCAR ITEM DE NOTA ==========
async function marcarItemNota(tareaId, itemId, completado) {
    try {
        console.log(`📝 Marcando item ${itemId} como ${completado ? 'completado' : 'pendiente'}`);

        await tareaManager.marcarItemTarea(
            tareaId,
            itemId,
            completado,
            usuarioActual,
            usuarioActual.organizacionCamelCase
        );

        // Actualizar la vista sin recargar todo
        const tarea = todasLasTareas.find(t => t.id === tareaId);
        if (tarea && tarea.items && tarea.items[itemId]) {
            tarea.items[itemId].completado = completado;
            if (tarea._calcularProgreso) {
                tarea._calcularProgreso();
            }
        }

        // Actualizar el checkbox visualmente
        const checkbox = document.querySelector(`.item-checkbox[data-tarea-id="${tareaId}"][data-item-id="${itemId}"]`);
        if (checkbox) {
            checkbox.checked = completado;

            // Actualizar estilo del texto del item
            const itemRow = checkbox.closest('.item-row');
            if (itemRow) {
                const textSpan = itemRow.querySelector('span:not(.item-checkbox)');
                if (textSpan) {
                    if (completado) {
                        textSpan.style.textDecoration = 'line-through';
                        textSpan.style.color = 'var(--color-text-dim)';
                    } else {
                        textSpan.style.textDecoration = 'none';
                        textSpan.style.color = 'var(--color-text-primary)';
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error marcando item:', error);

        // Revertir el checkbox
        const checkbox = document.querySelector(`.item-checkbox[data-tarea-id="${tareaId}"][data-item-id="${itemId}"]`);
        if (checkbox) {
            checkbox.checked = !completado;
        }

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el item',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

function getEmptyStateHTML(tipo) {
    const mensajes = {
        'general': {
            titulo: 'No hay notas generales',
            descripcion: 'Las notas generales son visibles para toda la organización.',
            boton: 'CREAR NOTA GENERAL',
            ruta: RUTAS.general
        },
        'personal': {
            titulo: 'No hay notas personales',
            descripcion: 'Las notas personales son visibles solo para ti.',
            boton: 'CREAR NOTA PERSONAL',
            ruta: RUTAS.personal
        },
        'compartida': {
            titulo: 'No hay notas compartidas',
            descripcion: 'Las notas compartidas son visibles para ti y las personas con quienes las compartas.',
            boton: 'CREAR NOTA COMPARTIDA',
            ruta: RUTAS.compartida
        },
        'area': {
            titulo: 'No hay notas por área',
            descripcion: 'Las notas por área son visibles para usuarios de áreas específicas.',
            boton: 'CREAR NOTA POR ÁREA',
            ruta: RUTAS.area
        }
    };

    const msg = mensajes[tipo] || mensajes['general'];

    return `
        <div class="empty-state">
            <div class="empty-state-content">
                <i class="fas fa-sticky-note"></i>
                <h3>${escapeHTML(msg.titulo)}</h3>
                <p>${escapeHTML(msg.descripcion)}</p>
                <button class="btn-add-first" data-ruta="${msg.ruta}">
                    <i class="fas fa-plus-circle"></i> ${escapeHTML(msg.boton)}
                </button>
            </div>
        </div>
    `;
}

// ========== CONFIGURAR EVENTOS ==========
function configurarEventos() {
    const btnNuevaTarea = document.getElementById('btnNuevaTarea');
    if (btnNuevaTarea) {
        btnNuevaTarea.addEventListener('click', abrirModalNuevaTarea);
    }

    const btnCrearGeneral = document.getElementById('btnCrearGeneral');
    if (btnCrearGeneral) {
        btnCrearGeneral.addEventListener('click', () => navegarACrear('general'));
    }

    const btnCrearPersonal = document.getElementById('btnCrearPersonal');
    if (btnCrearPersonal) {
        btnCrearPersonal.addEventListener('click', () => navegarACrear('personal'));
    }

    const btnCrearCompartida = document.getElementById('btnCrearCompartida');
    if (btnCrearCompartida) {
        btnCrearCompartida.addEventListener('click', () => navegarACrear('compartida'));
    }

    const btnCrearArea = document.getElementById('btnCrearArea');
    if (btnCrearArea) {
        btnCrearArea.addEventListener('click', () => navegarACrear('area'));
    }

    document.addEventListener('click', (e) => {
        const btnAddFirst = e.target.closest('.btn-add-first');
        if (btnAddFirst) {
            const ruta = btnAddFirst.dataset.ruta;
            if (ruta) {
                window.location.href = ruta;
            }
        }
    });

    const filterSelect = document.getElementById('filterTipo');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            filtrarPorTipo(e.target.value);
        });
    }
}

// ========== NAVEGACIÓN A CREAR NOTAS ==========
function navegarACrear(tipo) {
    const ruta = RUTAS[tipo];
    if (ruta) {
        window.location.href = ruta;
    } else {
        console.error(`Ruta no encontrada para tipo: ${tipo}`);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la ruta para crear esta nota',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

// ========== FILTRAR POR TIPO ==========
function filtrarPorTipo(tipo) {
    if (tipo === 'todas') {
        tareasFiltradas = [...todasLasTareas];
    } else {
        const tipoMap = {
            'generales': 'general',
            'personales': 'personal',
            'compartidas': 'compartida',
            'area': 'area'
        };
        const tipoReal = tipoMap[tipo];

        if (tipoReal) {
            tareasFiltradas = todasLasTareas.filter(t =>
                t.tipo === tipoReal || (tipoReal === 'general' && t.tipo === 'global')
            );
        }
    }

    clasificarTareas();
}

// ========== MODAL NUEVA NOTA ==========
function abrirModalNuevaTarea() {
    let modal = document.getElementById('modalNuevaTarea');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalNuevaTarea';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>Crear nueva nota</h3>
                    <p>Selecciona el tipo de nota</p>
                </div>
                <div class="modal-options">
                    <div class="modal-option" data-tipo="general">
                        <i class="fas fa-globe"></i>
                        <div class="option-info">
                            <h4>Nota General</h4>
                            <p>Visible para toda la organización</p>
                        </div>
                    </div>
                    <div class="modal-option" data-tipo="personal">
                        <i class="fas fa-user"></i>
                        <div class="option-info">
                            <h4>Nota Personal</h4>
                            <p>Visible solo para ti</p>
                        </div>
                    </div>
                    <div class="modal-option" data-tipo="compartida">
                        <i class="fas fa-share-alt"></i>
                        <div class="option-info">
                            <h4>Nota Compartida</h4>
                            <p>Comparte con usuarios específicos</p>
                        </div>
                    </div>
                    <div class="modal-option" data-tipo="area">
                        <i class="fas fa-building"></i>
                        <div class="option-info">
                            <h4>Nota por Área</h4>
                            <p>Asignada a un área específica</p>
                        </div>
                    </div>
                </div>
                <button class="modal-close" id="cerrarModal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('.modal-option').forEach(option => {
            option.addEventListener('click', () => {
                const tipo = option.dataset.tipo;
                navegarACrear(tipo);
            });
        });

        document.getElementById('cerrarModal').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// ========== MODAL DE DETALLE DE NOTA ==========
async function abrirModalDetalle(tareaId) {
    try {
        Swal.fire({
            title: 'Cargando detalles...',
            html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px;"></i>',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)'
        });

        const tarea = await tareaManager.getTareaById(tareaId, usuarioActual.organizacionCamelCase);

        if (!tarea) {
            throw new Error('Nota no encontrada');
        }

        tareaActual = tarea;
        modoEdicion = false;

        console.log('🔍 VERIFICACIÓN DE PROPIETARIO:');
        console.log('   👤 Usuario actual ID:', usuarioActual.id);
        console.log('   📝 Creador de la nota ID:', tarea.creadoPor);
        console.log('   ✅ ¿Es el creador?', tarea.creadoPor === usuarioActual.id);
        console.log('   👑 ¿Es administrador?', usuarioActual.rol === 'administrador');

        Swal.close();
        mostrarModalDetalle();

    } catch (error) {
        console.error('Error cargando nota:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la nota',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

// ========== MODAL DE DETALLE ==========
function mostrarModalDetalle() {
    let modal = document.getElementById('modalDetalleTarea');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDetalleTarea';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    // LÓGICA DE PERMISOS - SOLO EL CREADOR PUEDE EDITAR/ELIMINAR
    const esCreador = tareaActual.creadoPor === usuarioActual.id;
    const esAdmin = usuarioActual.rol === 'administrador';
    const puedeEditar = esCreador || esAdmin;

    // Obtener items del checklist
    const items = tareaActual.getItemsArray ? tareaActual.getItemsArray() :
        (tareaActual.items ? Object.values(tareaActual.items) : []);

    const itemsHTML = items.map((item, index) => {
        const itemId = item.id || `item_${index}`;
        return `
            <div class="modal-item" style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--color-border-light);">
                <input type="checkbox" class="item-checkbox-edit" 
                       data-item-id="${itemId}"
                       ${item.completado ? 'checked' : ''}
                       ${!modoEdicion ? 'disabled' : ''}>
                ${modoEdicion ? `
                    <input type="text" class="item-input-edit" value="${escapeHTML(item.texto || item)}" data-item-id="${itemId}" style="flex: 1;">
                    <button class="btn-item-action delete" data-item-id="${itemId}" title="Eliminar item">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <span style="flex: 1; color: var(--color-text-primary); ${item.completado ? 'text-decoration: line-through; color: var(--color-text-dim);' : ''}">
                        ${escapeHTML(item.texto || item)}
                    </span>
                `}
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-container modal-detalle">
            <div class="modal-header">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    ${modoEdicion ? `
                        <input type="text" id="editTitulo" class="modal-input" value="${escapeHTML(tareaActual.nombreActividad)}" placeholder="Título de la nota" style="flex: 1; margin-right: 10px;">
                    ` : `
                        <h3 style="flex: 1;">${escapeHTML(tareaActual.nombreActividad)}</h3>
                    `}
                    <span class="tarea-tipo-badge ${getTipoClass(tareaActual.tipo)}">${getTipoTexto(tareaActual.tipo)}</span>
                </div>
            </div>
            
            <div class="modal-body">
                ${modoEdicion ? `
                    <div class="modal-field">
                        <label>Descripción</label>
                        <textarea id="editDescripcion" class="modal-textarea" rows="3" placeholder="Descripción de la nota">${escapeHTML(tareaActual.descripcion || '')}</textarea>
                    </div>
                ` : tareaActual.descripcion ? `
                    <div class="modal-field">
                        <label>Descripción</label>
                        <p class="modal-descripcion">${escapeHTML(tareaActual.descripcion)}</p>
                    </div>
                ` : ''}
                
                <!-- Items del checklist -->
                ${items.length > 0 ? `
                    <div class="modal-field">
                        <label>Items del Checklist</label>
                        <div class="modal-items-list">
                            ${itemsHTML}
                        </div>
                    </div>
                ` : ''}
                
                <div class="modal-field">
                    <label>Información</label>
                    <div class="modal-info-grid">
                        <div class="modal-info-item">
                            <span class="info-label">CREADO POR:</span>
                            <span class="info-value">${escapeHTML(tareaActual.creadoPorNombre || tareaActual.creadoPor || 'Usuario')}</span>
                        </div>
                        <div class="modal-info-item">
                            <span class="info-label">FECHA:</span>
                            <span class="info-value">${formatearFecha(tareaActual.fechaCreacion)}</span>
                        </div>
                        ${tareaActual.fechaLimite ? `
                            <div class="modal-info-item">
                                <span class="info-label">FECHA LÍMITE:</span>
                                <span class="info-value" style="color: ${tareaActual.estaVencida && tareaActual.estaVencida() ? '#dc3545' : '#ffc107'}">
                                    <i class="fas fa-clock"></i> ${formatearFecha(tareaActual.fechaLimite)}
                                </span>
                            </div>
                        ` : ''}
                        ${tareaActual.tipo === 'compartida' && tareaActual.usuariosCompartidosIds?.length ? `
                            <div class="modal-info-item">
                                <span class="info-label">COMPARTIDA CON:</span>
                                <span class="info-value">${tareaActual.usuariosCompartidosIds.length} usuario(s)</span>
                            </div>
                        ` : ''}
                        ${tareaActual.tipo === 'area' && tareaActual.areaId ? `
                            <div class="modal-info-item">
                                <span class="info-label">ÁREA:</span>
                                <span class="info-value">${escapeHTML(tareaActual.areaId)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                ${modoEdicion ? `
                    <button class="btn-modal btn-save" id="guardarCambios">
                        <i class="fas fa-save"></i> Guardar cambios
                    </button>
                    <button class="btn-modal btn-cancel" id="cancelarEdicion">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                ` : `
                    ${puedeEditar ? `
                        <button class="btn-modal btn-edit" id="editarTarea">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-modal btn-delete" id="eliminarTareaBtn">
                            <i class="fas fa-trash-alt"></i> Eliminar
                        </button>
                    ` : ''}
                    <button class="btn-modal btn-close" id="cerrarModalDetalle">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                `}
            </div>
        </div>
    `;

    modal.classList.add('active');
    configurarEventosModal(modal);
}

// ========== CONFIGURAR EVENTOS DEL MODAL ==========
function configurarEventosModal(modal) {
    // Botón Editar
    const btnEditar = document.getElementById('editarTarea');
    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            modoEdicion = true;
            mostrarModalDetalle();
        });
    }

    // Botón Eliminar Nota
    const btnEliminarTarea = document.getElementById('eliminarTareaBtn');
    if (btnEliminarTarea) {
        btnEliminarTarea.addEventListener('click', eliminarTareaCompleta);
    }

    // Botón Cancelar Edición
    const btnCancelar = document.getElementById('cancelarEdicion');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            modoEdicion = false;
            mostrarModalDetalle();
        });
    }

    // Botón Guardar Cambios
    const btnGuardar = document.getElementById('guardarCambios');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCambiosTarea);
    }

    // Botón Cerrar
    const btnCerrar = document.getElementById('cerrarModalDetalle');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            modal.classList.remove('active');
            tareaActual = null;
            modoEdicion = false;
        });
    }

    // Eventos para items en modo edición
    if (modoEdicion) {
        // Checkboxes de items
        modal.querySelectorAll('.item-checkbox-edit').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                // Solo registrar, no guardar aún
                console.log('Item marcado:', e.target.dataset.itemId, e.target.checked);
            });
        });

        // Botones eliminar item
        modal.querySelectorAll('.btn-item-action.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemRow = btn.closest('.modal-item');
                if (itemRow) {
                    itemRow.remove();
                }
            });
        });
    }

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            tareaActual = null;
            modoEdicion = false;
        }
    });
}

// ========== GUARDAR CAMBIOS DE NOTA ==========
async function guardarCambiosTarea() {
    try {
        const nuevoTitulo = document.getElementById('editTitulo')?.value.trim();
        const nuevaDescripcion = document.getElementById('editDescripcion')?.value.trim();

        if (!nuevoTitulo) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'El título de la nota no puede estar vacío',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return;
        }

        // Obtener items actualizados
        const nuevosItems = {};
        const itemRows = document.querySelectorAll('.modal-item');

        itemRows.forEach((row, index) => {
            const checkbox = row.querySelector('.item-checkbox-edit');
            const input = row.querySelector('.item-input-edit');

            if (input) {
                const texto = input.value.trim();
                if (texto) {
                    const itemId = input.dataset.itemId || `item_${Date.now()}_${index}`;
                    nuevosItems[itemId] = {
                        id: itemId,
                        texto: texto,
                        completado: checkbox ? checkbox.checked : false,
                        fechaCreacion: new Date().toISOString()
                    };
                }
            }
        });

        Swal.fire({
            title: 'Guardando cambios...',
            html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px;"></i>',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)'
        });

        const datosActualizados = {
            nombreActividad: nuevoTitulo,
            descripcion: nuevaDescripcion,
            items: nuevosItems
        };

        await tareaManager.actualizarTarea(
            tareaActual.id,
            datosActualizados,
            usuarioActual,
            usuarioActual.organizacionCamelCase
        );

        Swal.close();

        await Swal.fire({
            icon: 'success',
            title: 'Cambios guardados',
            text: 'La nota se actualizó correctamente',
            timer: 1500,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });

        await cargarTareas();

        const modal = document.getElementById('modalDetalleTarea');
        if (modal) {
            modal.classList.remove('active');
        }

        tareaActual = null;
        modoEdicion = false;

    } catch (error) {
        console.error('Error guardando cambios:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron guardar los cambios',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

// ========== ELIMINAR NOTA COMPLETA ==========
async function eliminarTareaCompleta() {
    const result = await Swal.fire({
        title: '¿Eliminar nota?',
        html: `
            <div style="text-align: center;">
                <p style="color: var(--color-text-primary); margin-bottom: 15px;">
                    ¿Estás seguro de eliminar la nota <strong style="color: #dc3545;">"${escapeHTML(tareaActual.nombreActividad)}"</strong>?
                </p>
                <p style="color: var(--color-text-dim); font-size: 0.9rem;">
                    Esta acción no se puede deshacer.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'SÍ, ELIMINAR',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#2f8cff',
        reverseButtons: true,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });

    if (!result.isConfirmed) return;

    try {
        Swal.fire({
            title: 'Eliminando nota...',
            html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px;"></i>',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)'
        });

        await tareaManager.eliminarTarea(
            tareaActual.id,
            usuarioActual,
            usuarioActual.organizacionCamelCase
        );

        Swal.close();

        await Swal.fire({
            icon: 'success',
            title: 'Nota eliminada',
            text: 'La nota se eliminó correctamente',
            timer: 1500,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });

        const modal = document.getElementById('modalDetalleTarea');
        if (modal) {
            modal.classList.remove('active');
        }

        await cargarTareas();

        tareaActual = null;
        modoEdicion = false;

    } catch (error) {
        console.error('Error eliminando nota:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar la nota',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

// ========== FUNCIONES AUXILIARES ==========
function getTipoClass(tipo) {
    const clases = {
        'general': 'tipo-general',
        'global': 'tipo-general',
        'personal': 'tipo-personal',
        'compartida': 'tipo-compartida',
        'area': 'tipo-area'
    };
    return clases[tipo] || 'tipo-general';
}

function getTipoTexto(tipo) {
    const textos = {
        'general': 'General',
        'global': 'General',
        'personal': 'Personal',
        'compartida': 'Compartida',
        'area': 'Área'
    };
    return textos[tipo] || 'General';
}

function formatearFecha(fecha) {
    if (!fecha) return 'No disponible';
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '');
}

// ========== ESTADOS DE CARGA Y ERROR ==========
function mostrarEstadoCarga() {
    const secciones = ['tareasGenerales', 'tareasPersonales', 'tareasCompartidas', 'tareasArea'];

    secciones.forEach(seccionId => {
        const container = document.getElementById(seccionId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <h3>Cargando notas...</h3>
                        <p>Obteniendo datos de Firebase</p>
                    </div>
                </div>
            `;
        }
    });
}

function mostrarErrorEnSecciones(mensaje) {
    const secciones = ['tareasGenerales', 'tareasPersonales', 'tareasCompartidas', 'tareasArea'];

    secciones.forEach(seccionId => {
        const container = document.getElementById(seccionId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-content">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>${escapeHTML(mensaje)}</h3>
                        <button onclick="window.location.reload()" class="reload-btn">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    });
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        confirmButtonColor: '#2f8cff'
    });
}

// ========== UTILIDADES ==========
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}