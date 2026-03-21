// ========== gestionPlanesSistema.js - GESTIÓN DE PLANES DEL SISTEMA ==========
// SUPER ADMIN: Crea y gestiona los planes disponibles para los administradores

import { db } from '/config/firebase-config.js';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import consumo from '/clases/consumoFirebase.js';

// ========== VARIABLES GLOBALES ==========
let todosLosPlanes = [];
let planEditandoId = null;

// Módulos disponibles en el sistema
const MODULOS_DISPONIBLES = [
    { id: 'areas', nombre: 'Áreas', icono: 'fa-building', descripcion: 'Gestión de áreas organizacionales' },
    { id: 'categorias', nombre: 'Categorías', icono: 'fa-tags', descripcion: 'Gestión de categorías de incidencias' },
    { id: 'sucursales', nombre: 'Sucursales', icono: 'fa-store', descripcion: 'Gestión de sucursales' },
    { id: 'regiones', nombre: 'Regiones', icono: 'fa-globe', descripcion: 'Gestión de regiones geográficas' },
    { id: 'incidencias', nombre: 'Incidencias', icono: 'fa-exclamation-triangle', descripcion: 'Gestión y seguimiento de incidencias' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fa-chart-line', descripcion: 'Visualización y descarga de reportes' },
    { id: 'notificaciones', nombre: 'Notificaciones', icono: 'fa-bell', descripcion: 'Gestión de alertas y notificaciones' },
    { id: 'dashboard', nombre: 'Dashboard', icono: 'fa-tachometer-alt', descripcion: 'Panel de control principal' },
    { id: 'usuarios', nombre: 'Usuarios', icono: 'fa-users', descripcion: 'Gestión de colaboradores' },
    { id: 'configuracion', nombre: 'Configuración', icono: 'fa-cog', descripcion: 'Configuración del sistema' },
    { id: 'bitacora', nombre: 'Bitácora', icono: 'fa-history', descripcion: 'Historial de actividades' }
];

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando panel de gestión de planes del sistema...');
        
        // Verificar Super Admin
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.rol !== 'superadmin' && userData.rol !== 'super_admin') {
            mostrarNoSuperAdmin();
            return;
        }
        
        // Cargar módulos en el grid
        cargarModulosGrid();
        
        // Cargar planes existentes
        await cargarPlanes();
        
        // Configurar eventos
        configurarEventos();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarError('Error al cargar el panel: ' + error.message);
    }
});

// ========== CARGAR MÓDULOS EN EL GRID ==========
function cargarModulosGrid() {
    const grid = document.getElementById('modulosGrid');
    if (!grid) return;
    
    grid.innerHTML = MODULOS_DISPONIBLES.map(modulo => `
        <div class="modulo-checkbox" data-modulo="${modulo.id}">
            <input type="checkbox" id="modulo_${modulo.id}" name="modulos" value="${modulo.id}">
            <i class="fas ${modulo.icono}" style="color: var(--color-accent-primary);"></i>
            <label for="modulo_${modulo.id}">${modulo.nombre}</label>
        </div>
    `).join('');
}

// ========== CARGAR PLANES DESDE FIRESTORE ==========
async function cargarPlanes() {
    try {
        mostrarLoading();
        
        const planesCollection = collection(db, 'planes_sistema');
        const q = query(planesCollection, orderBy('fechaCreacion', 'desc'));
        
        await consumo.registrarFirestoreLectura('planes_sistema', 'lista todos los planes');
        
        const snapshot = await getDocs(q);
        
        todosLosPlanes = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            todosLosPlanes.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✅ Cargados ${todosLosPlanes.length} planes del sistema`);
        
        renderizarPlanes();
        
    } catch (error) {
        console.error('Error cargando planes:', error);
        mostrarError('No se pudieron cargar los planes: ' + error.message);
    }
}

// ========== RENDERIZAR PLANES ==========
function renderizarPlanes() {
    const container = document.getElementById('planesLista');
    const countSpan = document.getElementById('planesCount');
    
    if (!container) return;
    
    if (todosLosPlanes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-crown"></i>
                <h3>No hay planes creados</h3>
                <p>Haz clic en "Crear Nuevo Plan" para comenzar</p>
            </div>
        `;
        countSpan.textContent = '0 planes';
        return;
    }
    
    container.innerHTML = todosLosPlanes.map(plan => `
        <div class="plan-card" data-plan-id="${plan.id}">
            <div class="plan-header">
                <div class="plan-icon" style="background: ${plan.color}20; border: 1px solid ${plan.color}">
                    <i class="fas ${plan.icono}" style="color: ${plan.color}"></i>
                </div>
                <div class="plan-info">
                    <h3>${escapeHTML(plan.nombre)}</h3>
                    <p>${escapeHTML(plan.descripcion || 'Sin descripción')}</p>
                </div>
                <div class="plan-precio">
                    <span class="precio">$${plan.precio}</span>
                    <span class="moneda">/${plan.moneda || 'MXN'}</span>
                    <small>${plan.diasPrueba || 14} días de prueba</small>
                </div>
                <div class="plan-actions">
                    <button class="btn-plan btn-editar" data-action="editar" data-plan-id="${plan.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-plan btn-eliminar" data-action="eliminar" data-plan-id="${plan.id}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
            <div class="plan-body">
                <div class="modulos-lista">
                    ${plan.modulos && plan.modulos.length > 0 ? 
                        plan.modulos.map(moduloId => {
                            const modulo = MODULOS_DISPONIBLES.find(m => m.id === moduloId);
                            return `
                                <span class="modulo-item-plan activo">
                                    <i class="fas ${modulo?.icono || 'fa-cube'}"></i>
                                    ${modulo?.nombre || moduloId}
                                </span>
                            `;
                        }).join('') : 
                        '<span class="modulo-item-plan">Sin módulos seleccionados</span>'
                    }
                </div>
            </div>
        </div>
    `).join('');
    
    countSpan.textContent = `${todosLosPlanes.length} ${todosLosPlanes.length === 1 ? 'plan' : 'planes'}`;
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const planId = btn.dataset.planId;
            const plan = todosLosPlanes.find(p => p.id === planId);
            if (plan) {
                abrirModalEditarPlan(plan);
            }
        });
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const planId = btn.dataset.planId;
            const plan = todosLosPlanes.find(p => p.id === planId);
            if (plan) {
                abrirModalEliminarPlan(plan);
            }
        });
    });
}

// ========== ABRIR MODAL CREAR PLAN ==========
function abrirModalCrearPlan() {
    planEditandoId = null;
    
    const modal = document.getElementById('modalPlan');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('formPlan');
    
    modalTitle.textContent = 'Crear Nuevo Plan';
    form.reset();
    
    // Resetear valores por defecto
    document.getElementById('planColor').value = '#3b82f6';
    document.getElementById('colorPreview').style.background = '#3b82f6';
    document.getElementById('colorValue').textContent = '#3b82f6';
    document.getElementById('planIcono').value = 'fa-chart-line';
    document.getElementById('iconoPreview').className = 'fas fa-chart-line';
    document.getElementById('planDiasPrueba').value = '14';
    document.getElementById('planMoneda').value = 'MXN';
    
    // Desmarcar todos los checkboxes
    document.querySelectorAll('#modulosGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    modal.style.display = 'flex';
}

// ========== ABRIR MODAL EDITAR PLAN ==========
function abrirModalEditarPlan(plan) {
    planEditandoId = plan.id;
    
    const modal = document.getElementById('modalPlan');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Editar Plan';
    
    // Llenar formulario
    document.getElementById('planNombre').value = plan.nombre || '';
    document.getElementById('planDescripcion').value = plan.descripcion || '';
    document.getElementById('planPrecio').value = plan.precio || 0;
    document.getElementById('planMoneda').value = plan.moneda || 'MXN';
    document.getElementById('planColor').value = plan.color || '#3b82f6';
    document.getElementById('colorPreview').style.background = plan.color || '#3b82f6';
    document.getElementById('colorValue').textContent = plan.color || '#3b82f6';
    document.getElementById('planIcono').value = plan.icono || 'fa-chart-line';
    document.getElementById('iconoPreview').className = `fas ${plan.icono || 'fa-chart-line'}`;
    document.getElementById('planDiasPrueba').value = plan.diasPrueba || 14;
    
    // Marcar checkboxes según los módulos del plan
    document.querySelectorAll('#modulosGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = plan.modulos && plan.modulos.includes(cb.value);
    });
    
    modal.style.display = 'flex';
}

// ========== GUARDAR PLAN ==========
async function guardarPlan(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('planNombre').value.trim();
    const descripcion = document.getElementById('planDescripcion').value.trim();
    const precio = parseInt(document.getElementById('planPrecio').value) || 0;
    const moneda = document.getElementById('planMoneda').value;
    const color = document.getElementById('planColor').value;
    const icono = document.getElementById('planIcono').value;
    const diasPrueba = parseInt(document.getElementById('planDiasPrueba').value) || 14;
    
    // Obtener módulos seleccionados
    const modulosSeleccionados = [];
    document.querySelectorAll('#modulosGrid input[type="checkbox"]:checked').forEach(cb => {
        modulosSeleccionados.push(cb.value);
    });
    
    if (!nombre) {
        Swal.fire({
            icon: 'warning',
            title: 'Nombre requerido',
            text: 'Por favor ingresa un nombre para el plan',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }
    
    if (modulosSeleccionados.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Módulos requeridos',
            text: 'Debes seleccionar al menos un módulo para el plan',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }
    
    try {
        Swal.fire({
            title: planEditandoId ? 'Actualizando plan...' : 'Creando plan...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const planData = {
            nombre,
            descripcion,
            precio,
            moneda,
            color,
            icono,
            diasPrueba,
            modulos: modulosSeleccionados,
            fechaActualizacion: serverTimestamp()
        };
        
        if (planEditandoId) {
            // Actualizar plan existente
            const planRef = doc(db, 'planes_sistema', planEditandoId);
            await consumo.registrarFirestoreActualizacion('planes_sistema', planEditandoId);
            await updateDoc(planRef, planData);
            
            Swal.fire({
                icon: 'success',
                title: 'Plan actualizado',
                text: `El plan "${nombre}" ha sido actualizado correctamente`,
                background: '#1a1a1a',
                color: '#fff'
            });
        } else {
            // Crear nuevo plan
            planData.fechaCreacion = serverTimestamp();
            
            const planesCollection = collection(db, 'planes_sistema');
            await consumo.registrarFirestoreEscritura('planes_sistema', 'nuevo plan');
            const docRef = await setDoc(doc(planesCollection), planData);
            
            Swal.fire({
                icon: 'success',
                title: 'Plan creado',
                text: `El plan "${nombre}" ha sido creado correctamente`,
                background: '#1a1a1a',
                color: '#fff'
            });
        }
        
        // Cerrar modal y recargar
        document.getElementById('modalPlan').style.display = 'none';
        await cargarPlanes();
        
    } catch (error) {
        console.error('Error guardando plan:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo guardar el plan',
            background: '#1a1a1a',
            color: '#fff'
        });
    }
}

// ========== ABRIR MODAL ELIMINAR PLAN ==========
function abrirModalEliminarPlan(plan) {
    const modal = document.getElementById('modalEliminar');
    const contenido = document.getElementById('eliminarContenido');
    
    contenido.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;"></i>
            <p>¿Estás seguro de eliminar el plan <strong>"${escapeHTML(plan.nombre)}"</strong>?</p>
            <p style="color: var(--color-text-dim); font-size: 0.85rem;">Esta acción no se puede deshacer.</p>
            ${plan.enUso ? '<p style="color: #f59e0b; margin-top: 10px;"><i class="fas fa-users"></i> Este plan está siendo utilizado por administradores</p>' : ''}
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Configurar confirmación
    const confirmarBtn = document.getElementById('btnConfirmarEliminar');
    const cancelarBtn = document.getElementById('btnCancelarEliminar');
    const closeBtn = document.getElementById('closeEliminarModal');
    
    const handleConfirm = async () => {
        modal.style.display = 'none';
        
        try {
            Swal.fire({
                title: 'Eliminando plan...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            const planRef = doc(db, 'planes_sistema', plan.id);
            await consumo.registrarFirestoreEliminacion('planes_sistema', plan.id);
            await deleteDoc(planRef);
            
            Swal.fire({
                icon: 'success',
                title: 'Plan eliminado',
                text: `El plan "${plan.nombre}" ha sido eliminado correctamente`,
                background: '#1a1a1a',
                color: '#fff'
            });
            
            await cargarPlanes();
            
        } catch (error) {
            console.error('Error eliminando plan:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo eliminar el plan',
                background: '#1a1a1a',
                color: '#fff'
            });
        }
        
        // Limpiar eventos
        confirmarBtn.removeEventListener('click', handleConfirm);
        cancelarBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        modal.style.display = 'none';
    };
    
    confirmarBtn.addEventListener('click', handleConfirm, { once: true });
    cancelarBtn.addEventListener('click', handleCancel, { once: true });
    closeBtn.addEventListener('click', handleCancel, { once: true });
}

// ========== CONFIGURAR EVENTOS ==========
function configurarEventos() {
    // Botón crear plan
    const btnCrear = document.getElementById('btnCrearPlan');
    if (btnCrear) {
        btnCrear.addEventListener('click', abrirModalCrearPlan);
    }
    
    // Formulario guardar plan
    const form = document.getElementById('formPlan');
    if (form) {
        form.addEventListener('submit', guardarPlan);
    }
    
    // Cerrar modal
    const closeModal = document.getElementById('closeModal');
    const cancelarModal = document.getElementById('btnCancelarModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('modalPlan').style.display = 'none';
        });
    }
    
    if (cancelarModal) {
        cancelarModal.addEventListener('click', () => {
            document.getElementById('modalPlan').style.display = 'none';
        });
    }
    
    // Color picker
    const colorPicker = document.getElementById('planColor');
    const colorPreview = document.getElementById('colorPreview');
    const colorValue = document.getElementById('colorValue');
    
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            colorPreview.style.background = color;
            colorValue.textContent = color;
        });
    }
    
    // Icono selector
    const iconoSelect = document.getElementById('planIcono');
    const iconoPreview = document.getElementById('iconoPreview');
    
    if (iconoSelect) {
        iconoSelect.addEventListener('change', (e) => {
            const icono = e.target.value;
            iconoPreview.className = `fas ${icono}`;
        });
    }
    
    // Cerrar modales al hacer click fuera
    window.addEventListener('click', (e) => {
        const modalPlan = document.getElementById('modalPlan');
        const modalEliminar = document.getElementById('modalEliminar');
        
        if (e.target === modalPlan) {
            modalPlan.style.display = 'none';
        }
        
        if (e.target === modalEliminar) {
            modalEliminar.style.display = 'none';
        }
    });
}

// ========== UTILIDADES ==========
function mostrarLoading() {
    const container = document.getElementById('planesLista');
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando planes...</p>
            </div>
        `;
    }
}

function mostrarNoSuperAdmin() {
    const container = document.getElementById('planesLista');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-shield"></i>
                <h3>Acceso no autorizado</h3>
                <p>Esta sección es exclusiva para Super Administradores</p>
            </div>
        `;
    }
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        background: '#1a1a1a',
        color: '#fff'
    });
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}