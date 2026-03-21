// crearPlan.js - Lógica para gestión de planes
// CONECTADO CON LA CLASE PlanPersonalizado

import { PlanPersonalizadoManager } from '/clases/plan.js';

// =============================================
// CONFIGURACIÓN INICIAL
// =============================================

// Lista completa de módulos del sistema
const MODULOS_SISTEMA = [
    { id: 'areas', nombre: 'Áreas', icono: 'fas fa-building' },
    { id: 'categorias', nombre: 'Categorías', icono: 'fas fa-tags' },
    { id: 'sucursales', nombre: 'Sucursales', icono: 'fas fa-store' },
    { id: 'regiones', nombre: 'Regiones', icono: 'fas fa-map-marker-alt' },
    { id: 'incidencias', nombre: 'Incidencias', icono: 'fas fa-exclamation-triangle' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar' },
    { id: 'notificaciones', nombre: 'Notificaciones', icono: 'fas fa-bell' },
    { id: 'dashboard', nombre: 'Dashboard', icono: 'fas fa-tachometer-alt' },
    { id: 'mapeo', nombre: 'Mapeo', icono: 'fas fa-map' }
];

// Definición de qué módulos incluye cada tipo de plan (para vista previa)
const PLAN_TIPOS = {
    monitoreo: {
        id: 'monitoreo',
        nombre: 'Monitoreo',
        incluye: (moduloId) => moduloId !== 'incidencias',
        descripcion: 'Todos los módulos excepto Incidencias',
        color: '#3b82f6',
        icono: 'fa-chart-line'
    },
    incidencias: {
        id: 'incidencias',
        nombre: 'Incidencias',
        incluye: (moduloId) => moduloId !== 'mapeo',
        descripcion: 'Todos los módulos excepto Mapeo',
        color: '#ef4444',
        icono: 'fa-exclamation-triangle'
    },
    ambos: {
        id: 'completo',
        nombre: 'Completo',
        incluye: () => true,
        descripcion: 'Todos los módulos disponibles',
        color: '#f59e0b',
        icono: 'fa-crown'
    }
};

// Instancia del manager
let planManager = null;

// Estado local para cache
let planesExistentes = [];

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

/**
 * Inicializa el manager de planes
 */
async function inicializarManager() {
    if (!planManager) {
        planManager = new PlanPersonalizadoManager();
    }
    return planManager;
}

/**
 * Carga los planes desde Firestore
 */
async function cargarPlanes() {
    try {
        const manager = await inicializarManager();
        const planes = await manager.obtenerTodos();
        planesExistentes = planes.map(plan => plan.toUI());
        return planesExistentes;
    } catch (error) {
        console.error('Error cargando planes:', error);
        // Fallback a localStorage si hay error
        const stored = localStorage.getItem('sistema_planes_backup');
        if (stored) {
            try {
                planesExistentes = JSON.parse(stored);
            } catch (e) {
                planesExistentes = [];
            }
        }
        return planesExistentes;
    }
}

/**
 * Guarda planes (ahora solo actualiza UI, la persistencia es en Firestore)
 */
function guardarPlanes() {
    // Backup en localStorage por si acaso
    localStorage.setItem('sistema_planes_backup', JSON.stringify(planesExistentes));
    actualizarListadoPlanes();
}

/**
 * Obtiene el módulo incluido según el tipo de plan (para vista previa)
 */
function getModulosPorTipo(tipo) {
    if (!tipo || !PLAN_TIPOS[tipo]) return [];
    
    const incluyeFunc = PLAN_TIPOS[tipo].incluye;
    return MODULOS_SISTEMA.filter(modulo => incluyeFunc(modulo.id));
}

/**
 * Obtiene los módulos excluidos según el tipo de plan
 */
function getModulosExcluidos(tipo) {
    const incluidos = getModulosPorTipo(tipo);
    return MODULOS_SISTEMA.filter(modulo => !incluidos.includes(modulo));
}

/**
 * Genera el mapa de módulos incluidos según el tipo
 * @param {string} tipo - Tipo de plan (monitoreo, incidencias, ambos)
 * @returns {Object} Mapa de módulos { moduloId: true/false }
 */
function generarMapaModulos(tipo) {
    const mapaModulos = {};
    
    MODULOS_SISTEMA.forEach(modulo => {
        if (tipo === 'completo') {
            mapaModulos[modulo.id] = true;
        } else if (tipo === 'monitoreo') {
            mapaModulos[modulo.id] = modulo.id !== 'incidencias';
        } else if (tipo === 'incidencias') {
            mapaModulos[modulo.id] = modulo.id !== 'mapeo';
        } else {
            mapaModulos[modulo.id] = false;
        }
    });
    
    return mapaModulos;
}

/**
 * Actualiza vista previa de módulos
 */
function actualizarVistaPrevia() {
    const monitoreoCheck = document.getElementById('moduloMonitoreo');
    const incidenciasCheck = document.getElementById('moduloIncidencias');
    
    const monitoreo = monitoreoCheck ? monitoreoCheck.checked : false;
    const incidencias = incidenciasCheck ? incidenciasCheck.checked : false;
    
    let tipo = null;
    if (monitoreo && incidencias) tipo = 'ambos';
    else if (monitoreo) tipo = 'monitoreo';
    else if (incidencias) tipo = 'incidencias';
    
    const incluidasDiv = document.getElementById('modulosIncluidosList');
    const excluidasDiv = document.getElementById('modulosExcluidosList');
    const previewInfo = document.getElementById('previewInfo');
    
    if (!tipo) {
        previewInfo.innerHTML = '<p class="text-muted">Selecciona al menos una opción para ver los módulos del plan</p>';
        incluidasDiv.innerHTML = '';
        excluidasDiv.innerHTML = '';
        return;
    }
    
    const tipoInfo = PLAN_TIPOS[tipo];
    previewInfo.innerHTML = `
        <div class="info-tip">
            <i class="fas ${tipoInfo.icono}"></i>
            <span>Plan tipo: <strong style="color: ${tipoInfo.color}">${tipoInfo.nombre}</strong> - ${tipoInfo.descripcion}</span>
        </div>
    `;
    
    const incluidos = getModulosPorTipo(tipo);
    const excluidos = getModulosExcluidos(tipo);
    
    incluidasDiv.innerHTML = incluidos.map(modulo => `
        <div class="modulo-item incluido">
            <i class="${modulo.icono}"></i>
            <span>${modulo.nombre}</span>
        </div>
    `).join('');
    
    excluidasDiv.innerHTML = excluidos.map(modulo => `
        <div class="modulo-item excluido">
            <i class="${modulo.icono}"></i>
            <span>${modulo.nombre}</span>
        </div>
    `).join('');
    
    if (excluidos.length === 0) {
        excluidasDiv.innerHTML = '<div class="modulo-item">✨ No hay módulos excluidos - Plan Completo</div>';
    }
}

/**
 * Actualizar listado de planes en UI
 */
function actualizarListadoPlanes() {
    const container = document.getElementById('planesContainer');
    const countSpan = document.getElementById('planesCount');
    
    if (!container) return;
    
    const count = planesExistentes.length;
    if (countSpan) countSpan.textContent = `(${count}/3)`;
    
    if (count === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No hay planes creados aún. Crea tu primer plan.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = planesExistentes.map((plan, index) => {
        let tipoInfo = PLAN_TIPOS.monitoreo;
        if (plan.tipoBase === 'monitoreo') tipoInfo = PLAN_TIPOS.monitoreo;
        else if (plan.tipoBase === 'incidencias') tipoInfo = PLAN_TIPOS.incidencias;
        else if (plan.tipoBase === 'completo') tipoInfo = PLAN_TIPOS.ambos;
        else tipoInfo = { nombre: plan.tipoBase || 'Personalizado', icono: 'fa-cube' };
        
        return `
            <div class="plan-card" style="--plan-color: ${plan.color}">
                <div class="plan-header">
                    <i class="fas ${plan.icono}" style="color: ${plan.color}"></i>
                    <h4>${escapeHtml(plan.nombre)}</h4>
                </div>
                <div class="plan-price">
                    $${plan.precio.toFixed(2)} <small>MXN</small>
                </div>
                <div class="plan-modules-badge">
                    <i class="fas ${tipoInfo.icono}"></i> ${tipoInfo.nombre}
                </div>
                <div class="plan-desc">${escapeHtml(plan.descripcion || 'Sin descripción')}</div>
                <div class="plan-stats">
                    <span class="badge-modulos">
                        <i class="fas fa-cubes"></i> ${plan.totalModulosActivos || 0} módulos activos
                    </span>
                </div>
                <div class="plan-actions">
                    <button class="btn-delete" data-id="${plan.id}" title="Eliminar plan">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Agregar eventos de eliminación
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planId = btn.dataset.id;
            eliminarPlan(planId);
        });
    });
}

/**
 * Eliminar plan desde Firestore
 */
async function eliminarPlan(planId) {
    const plan = planesExistentes.find(p => p.id === planId);
    if (!plan) return;
    
    const result = await Swal.fire({
        title: '¿Eliminar plan?',
        text: `¿Estás seguro de eliminar "${plan.nombre}"? Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });
    
    if (result.isConfirmed) {
        try {
            const manager = await inicializarManager();
            await manager.eliminarPlan(planId);
            
            // Recargar planes
            await cargarPlanes();
            guardarPlanes();
            
            Swal.fire({
                title: 'Eliminado',
                text: 'El plan ha sido eliminado correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
        } catch (error) {
            console.error('Error eliminando plan:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar el plan. Intenta de nuevo.',
                icon: 'error',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
        }
    }
}

/**
 * Verificar si ya existe un plan con esa combinación
 */
async function existePlanConCombinacion(tipoBase) {
    return planesExistentes.some(plan => plan.tipoBase === tipoBase);
}

/**
 * Crear nuevo plan usando la clase PlanPersonalizado
 */
async function crearPlan(event) {
    event.preventDefault();
    
    // Mostrar loading
    Swal.fire({
        title: 'Creando plan...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        // Obtener valores del formulario
        const nombre = document.getElementById('planNombre').value.trim();
        const descripcion = document.getElementById('planDescripcion').value.trim();
        const precio = parseFloat(document.getElementById('planPrecio').value);
        const color = document.getElementById('planColor').value;
        const icono = document.getElementById('planIcono').value;
        
        const monitoreoCheck = document.getElementById('moduloMonitoreo');
        const incidenciasCheck = document.getElementById('moduloIncidencias');
        
        const monitoreo = monitoreoCheck.checked;
        const incidencias = incidenciasCheck.checked;
        
        let tipoBase = null;
        if (monitoreo && incidencias) tipoBase = 'completo';
        else if (monitoreo) tipoBase = 'monitoreo';
        else if (incidencias) tipoBase = 'incidencias';
        
        // Validaciones
        if (!nombre) {
            Swal.close();
            Swal.fire({
                title: 'Error',
                text: 'Por favor ingresa un nombre para el plan.',
                icon: 'error',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return;
        }
        
        if (isNaN(precio) || precio < 0) {
            Swal.close();
            Swal.fire({
                title: 'Error',
                text: 'Por favor ingresa un precio válido.',
                icon: 'error',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return;
        }
        
        if (!tipoBase) {
            Swal.close();
            Swal.fire({
                title: 'Error',
                text: 'Debes seleccionar al menos un tipo de módulo (Monitoreo o Incidencias).',
                icon: 'error',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return;
        }
        
        // Verificar límite de planes (máximo 3)
        if (planesExistentes.length >= 3) {
            Swal.close();
            Swal.fire({
                title: 'Límite alcanzado',
                text: 'Solo puedes crear un máximo de 3 planes (uno por cada combinación).',
                icon: 'warning',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return;
        }
        
        // Verificar que no exista ya un plan con esa combinación
        if (await existePlanConCombinacion(tipoBase)) {
            Swal.close();
            const nombreTipo = tipoBase === 'monitoreo' ? 'Monitoreo' : tipoBase === 'incidencias' ? 'Incidencias' : 'Completo';
            Swal.fire({
                title: 'Plan ya existe',
                text: `Ya existe un plan de tipo "${nombreTipo}". Solo puede haber un plan por cada combinación.`,
                icon: 'warning',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return;
        }
        
        // Generar mapa de módulos
        const modulosIncluidos = generarMapaModulos(tipoBase);
        
        // Crear el plan usando el manager (sin autenticación)
        const manager = await inicializarManager();
        
        const nuevoPlan = await manager.crearPlan({
            // Datos del administrador (opcional)
            adminId: 'sistema',
            adminEmail: '',
            adminNombre: 'Sistema',
            organizacionId: '',
            organizacionNombre: '',
            organizacionCamelCase: '',
            
            // Datos del plan
            nombre: nombre,
            descripcion: descripcion,
            precio: precio,
            color: color,
            icono: icono,
            tipoBase: tipoBase,
            
            // Mapa de módulos
            modulosIncluidos: modulosIncluidos,
            
            // Configuración
            diasPrueba: 14
        });
        
        // Recargar planes
        await cargarPlanes();
        guardarPlanes();
        
        // Limpiar formulario
        limpiarFormulario();
        
        // Cerrar loading y mostrar éxito
        Swal.close();
        Swal.fire({
            title: '¡Plan creado!',
            text: `El plan "${nombre}" ha sido creado exitosamente.`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
        
    } catch (error) {
        console.error('Error creando plan:', error);
        Swal.close();
        Swal.fire({
            title: 'Error',
            text: error.message || 'No se pudo crear el plan. Intenta de nuevo.',
            icon: 'error',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

/**
 * Limpiar formulario
 */
function limpiarFormulario() {
    document.getElementById('planNombre').value = '';
    document.getElementById('planDescripcion').value = '';
    document.getElementById('planPrecio').value = '';
    document.getElementById('planColor').value = '#0dcaf0';
    const colorValue = document.getElementById('colorValue');
    if (colorValue) colorValue.textContent = '#0dcaf0';
    document.getElementById('planIcono').value = 'fa-chart-line';
    
    const monitoreoCheck = document.getElementById('moduloMonitoreo');
    const incidenciasCheck = document.getElementById('moduloIncidencias');
    
    if (monitoreoCheck) monitoreoCheck.checked = false;
    if (incidenciasCheck) incidenciasCheck.checked = false;
    
    // Actualizar preview del ícono
    actualizarPreviewIcono('fa-chart-line');
    
    // Actualizar vista previa
    actualizarVistaPrevia();
}

/**
 * Actualizar preview del ícono
 */
function actualizarPreviewIcono(iconoClass) {
    const preview = document.getElementById('iconPreview');
    if (preview) {
        preview.innerHTML = `<i class="fas ${iconoClass}"></i>`;
    }
}

/**
 * Escapar HTML para evitar XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Actualizar fecha en footer
 */
function actualizarFecha() {
    const fechaSpan = document.getElementById('fechaActualizacion');
    if (fechaSpan) {
        const ahora = new Date();
        fechaSpan.textContent = ahora.toLocaleString('es-MX');
    }
}

/**
 * Inicializar eventos del formulario
 */
function inicializarEventos() {
    // Formulario
    const form = document.getElementById('formCrearPlan');
    if (form) {
        form.addEventListener('submit', crearPlan);
    }
    
    // Botón limpiar
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFormulario);
    }
    
    // Checkboxes para vista previa
    const monitoreoCheck = document.getElementById('moduloMonitoreo');
    const incidenciasCheck = document.getElementById('moduloIncidencias');
    
    if (monitoreoCheck) {
        monitoreoCheck.addEventListener('change', actualizarVistaPrevia);
    }
    if (incidenciasCheck) {
        incidenciasCheck.addEventListener('change', actualizarVistaPrevia);
    }
    
    // Selector de ícono
    const iconSelect = document.getElementById('planIcono');
    if (iconSelect) {
        iconSelect.addEventListener('change', (e) => {
            actualizarPreviewIcono(e.target.value);
        });
    }
    
    // Color picker
    const colorPicker = document.getElementById('planColor');
    const colorValue = document.getElementById('colorValue');
    if (colorPicker && colorValue) {
        colorPicker.addEventListener('input', (e) => {
            colorValue.textContent = e.target.value;
        });
    }
    
    // Actualizar fecha
    actualizarFecha();
    setInterval(actualizarFecha, 1000);
}

/**
 * Fallback: cargar desde localStorage
 */
function cargarPlanesLocal() {
    const stored = localStorage.getItem('sistema_planes_backup');
    if (stored) {
        try {
            planesExistentes = JSON.parse(stored);
        } catch (e) {
            planesExistentes = [];
        }
    }
    actualizarListadoPlanes();
    return planesExistentes;
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Mostrar loading
        const container = document.getElementById('planesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-pulse"></i>
                    <p>Cargando planes...</p>
                </div>
            `;
        }
        
        // Inicializar manager y cargar planes
        await inicializarManager();
        await cargarPlanes();
        guardarPlanes();
        
        // Inicializar eventos
        inicializarEventos();
        
        // Actualizar preview de ícono inicial
        actualizarPreviewIcono('fa-chart-line');
        
        // Vista previa inicial
        actualizarVistaPrevia();
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        // Fallback: usar localStorage
        cargarPlanesLocal();
        inicializarEventos();
        actualizarPreviewIcono('fa-chart-line');
        actualizarVistaPrevia();
    }
});