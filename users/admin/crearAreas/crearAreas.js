// crear-area.js - MÓDULO PARA CREACIÓN DE ÁREAS
console.log('🚀 crear-area.js iniciando...');

// Variable global para debugging
window.crearAreaDebug = {
    estado: 'iniciando',
    controller: null
};

// Cargar dependencias
let Area, AreaManager, db;

async function cargarDependencias() {
    try {
        console.log('1️⃣ Cargando dependencias...');
        
        // Cargar firebase-config
        const firebaseModule = await import('/config/firebase-config.js');
        db = firebaseModule.db;
        console.log('✅ Firebase cargado');
        
        // Cargar clases
        const areaModule = await import('/clases/area.js');
        Area = areaModule.Area;
        AreaManager = areaModule.AreaManager;
        console.log('✅ Clases cargadas');
        
        // Iniciar aplicación
        iniciarAplicacion();
        
    } catch (error) {
        console.error('❌ Error cargando dependencias:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error de Carga</h4>
            <p><strong>Error:</strong> ${error.message}</p>
            <div class="alert alert-warning mt-3">
                Verifica que los archivos existan:
                <ul class="mb-0 mt-2">
                    <li><code>/config/firebase-config.js</code></li>
                    <li><code>/clases/area.js</code></li>
                </ul>
            </div>
        `);
    }
}

function mostrarErrorInterfaz(mensajeHTML) {
    const container = document.querySelector('.container-fluid') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4';
    errorDiv.innerHTML = mensajeHTML;
    container.prepend(errorDiv);
}

function iniciarAplicacion() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarController);
    } else {
        inicializarController();
    }
}

function inicializarController() {
    try {
        console.log('🎯 Inicializando CrearAreaController...');
        
        const app = new CrearAreaController();
        window.crearAreaDebug.controller = app;
        
        // Inicializar
        app.init();
        
        console.log('✅ Controlador de creación listo');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger">Error de Inicialización</h4>
            <p>${error.message}</p>
        `);
    }
}

// ==================== CLASE CREARAREACONTROLLER ====================
class CrearAreaController {
    constructor() {
        console.log('🛠️ Creando CrearAreaController...');
        
        this.areaManager = new AreaManager();
        
        // Usuario demo (DEBE SER IGUAL QUE EN areas.js)
this.userManager = {
    currentUser: {
        id: 'admin_default',
        nombre: 'Administrador',
        cargo: 'administrador',
        organizacion: 'Tu Empresa',  // MISMO NOMBRE QUE EN areas.js
        organizacionCamelCase: 'tuEmpresa'  // MISMO CAMELCASE QUE EN areas.js
    }
        };
        
        this.areaEnProceso = null;
        console.log('✅ Controller creado');
    }
    
    init() {
        console.log('🎬 Iniciando aplicación de creación...');
        
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.inicializarValidaciones();
        
        console.log('✅ Aplicación de creación iniciada');
    }
    
    verificarElementosDOM() {
        console.log('🔍 Verificando elementos del formulario...');
        
        const ids = [
            'btnVolverLista', 'formCrearArea', 'nombreArea',
            'colorIdentificacion', 'btnColorRandom', 'iconoArea',
            'iconoPreview', 'organizacion', 'descripcionArea',
            'contadorCaracteres', 'responsable', 'btnCancelar',
            'btnGuardarBorrador', 'btnCrearArea',
            'modalConfirmacion', 'modalExito', 'btnConfirmarCreacion',
            'btnCrearOtra', 'btnVerArea'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${el ? '✅' : '❌'} ${id}`);
        });
    }
    
    inicializarEventos() {
        console.log('🎮 Configurando eventos...');
        
        try {
            // Botón volver
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this.volverALista());
                console.log('✅ Evento btnVolverLista');
            }
            
            // Botón color aleatorio
            const btnColorRandom = document.getElementById('btnColorRandom');
            if (btnColorRandom) {
                btnColorRandom.addEventListener('click', () => this.generarColorAleatorio());
                console.log('✅ Evento btnColorRandom');
            }
            
            // Actualizar preview de icono
            const iconoArea = document.getElementById('iconoArea');
            if (iconoArea) {
                iconoArea.addEventListener('change', () => this.actualizarIconoPreview());
                console.log('✅ Evento iconoArea');
            }
            
            // Contador de caracteres
            const descripcionArea = document.getElementById('descripcionArea');
            if (descripcionArea) {
                descripcionArea.addEventListener('input', () => this.actualizarContadorCaracteres());
                console.log('✅ Evento descripcionArea');
            }
            
            // Botón cancelar
            const btnCancelar = document.getElementById('btnCancelar');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this.cancelarCreacion());
                console.log('✅ Evento btnCancelar');
            }
            
            // Botón guardar borrador (pendiente de implementación)
            const btnGuardarBorrador = document.getElementById('btnGuardarBorrador');
            if (btnGuardarBorrador) {
                btnGuardarBorrador.addEventListener('click', () => this.guardarBorrador());
                console.log('✅ Evento btnGuardarBorrador');
            }
            
            // Formulario submit
            const formCrearArea = document.getElementById('formCrearArea');
            if (formCrearArea) {
                formCrearArea.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.validarYPrepararCreacion();
                });
                console.log('✅ Evento formCrearArea');
            }
            
            // Confirmación modal
            const btnConfirmarCreacion = document.getElementById('btnConfirmarCreacion');
            if (btnConfirmarCreacion) {
                btnConfirmarCreacion.addEventListener('click', () => this.confirmarCreacion());
                console.log('✅ Evento btnConfirmarCreacion');
            }
            
            // Botones después de creación exitosa
            const btnCrearOtra = document.getElementById('btnCrearOtra');
            if (btnCrearOtra) {
                btnCrearOtra.addEventListener('click', () => this.crearOtraArea());
                console.log('✅ Evento btnCrearOtra');
            }
            
            const btnVerArea = document.getElementById('btnVerArea');
            if (btnVerArea) {
                btnVerArea.addEventListener('click', () => this.verAreaCreada());
                console.log('✅ Evento btnVerArea');
            }
            
            console.log('✅ Todos los eventos configurados');
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }
    
    inicializarValidaciones() {
        console.log('📋 Inicializando validaciones...');
        
        // Inicializar contador de caracteres
        this.actualizarContadorCaracteres();
        
        // Inicializar preview de icono
        this.actualizarIconoPreview();
    }
    
    // ========== MÉTODOS DE INTERFAZ ==========
    
    generarColorAleatorio() {
        const colores = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
            '#1abc9c', '#34495e', '#7f8c8d', '#d35400', '#c0392b'
        ];
        const colorInput = document.getElementById('colorIdentificacion');
        if (colorInput) {
            const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];
            colorInput.value = colorAleatorio;
            this.mostrarNotificacion(`Color asignado: ${colorAleatorio}`, 'info', 2000);
        }
    }
    
    actualizarIconoPreview() {
        const iconoArea = document.getElementById('iconoArea');
        const iconoPreview = document.getElementById('iconoPreview');
        
        if (iconoArea && iconoPreview) {
            const iconoSeleccionado = iconoArea.value;
            if (iconoSeleccionado) {
                // Extraer solo la clase del icono (remover el texto entre paréntesis)
                const iconoClase = iconoSeleccionado.split(' ')[0];
                iconoPreview.innerHTML = `<i class="${iconoSeleccionado}" style="font-size: 1.5rem;"></i>`;
            } else {
                iconoPreview.innerHTML = '<i class="fas fa-question-circle"></i>';
            }
        }
    }
    
    actualizarContadorCaracteres() {
        const descripcionArea = document.getElementById('descripcionArea');
        const contador = document.getElementById('contadorCaracteres');
        
        if (descripcionArea && contador) {
            const longitud = descripcionArea.value.length;
            contador.textContent = longitud;
            
            // Cambiar color según longitud
            if (longitud < 50) {
                contador.className = 'text-danger';
            } else if (longitud > 450) {
                contador.className = 'text-warning';
            } else {
                contador.className = 'text-success';
            }
        }
    }
    
    // ========== MÉTODOS DE NAVEGACIÓN ==========
    
    volverALista() {
        console.log('⬅️ Volviendo a lista de áreas...');
        
        // Redirigir a la página principal de áreas
        window.location.href = '/areas.html';  // ← CAMBIA ESTA RUTA SEGÚN TU ESTRUCTURA
        
        // Opciones:
        // window.location.href = '/pages/areas.html';
        // window.location.href = '../areas.html';
    }
    
    cancelarCreacion() {
        console.log('❌ Cancelando creación...');
        
        if (confirm('¿Está seguro de cancelar la creación? Los datos no guardados se perderán.')) {
            this.volverALista();
        }
    }
    
    // ========== MÉTODOS DE VALIDACIÓN ==========
    
    validarFormulario() {
        console.log('✅ Validando formulario...');
        
        const form = document.getElementById('formCrearArea');
        const camposRequeridos = [
            'nombreArea',
            'organizacion',
            'descripcionArea'
        ];
        
        // Validación básica de HTML5
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        // Validación personalizada
        const nombreArea = document.getElementById('nombreArea').value.trim();
        const descripcion = document.getElementById('descripcionArea').value.trim();
        
        // Validar longitud mínima de descripción
        if (descripcion.length < 50) {
            this.mostrarError('La descripción debe tener al menos 50 caracteres');
            return false;
        }
        
        // Validar longitud máxima de descripción
        if (descripcion.length > 500) {
            this.mostrarError('La descripción no puede exceder los 500 caracteres');
            return false;
        }
        
        // Validar que el nombre no sea demasiado corto
        if (nombreArea.length < 3) {
            this.mostrarError('El nombre del área debe tener al menos 3 caracteres');
            return false;
        }
        
        // Validar que haya seleccionado un icono
        const icono = document.getElementById('iconoArea').value;
        if (!icono) {
            this.mostrarError('Debe seleccionar un icono para el área');
            return false;
        }
        
        console.log('✅ Formulario válido');
        return true;
    }
    
    async validarYPrepararCreacion() {
        try {
            console.log('🔄 Validando y preparando creación...');
            
            if (!this.validarFormulario()) {
                return;
            }
            
            // Obtener datos del formulario
            const datosArea = this.obtenerDatosFormulario();
            
            console.log('📋 Datos a crear:', datosArea);
            
            // Verificar si el área ya existe
            const existe = await this.areaManager.verificarAreaExistente(
                datosArea.nombreArea,
                this.userManager.currentUser.organizacionCamelCase
            );
            
            if (existe) {
                this.mostrarError('Ya existe un área con ese nombre en esta organización');
                return;
            }
            
            // Guardar datos temporalmente
            this.areaEnProceso = datosArea;
            
            // Mostrar modal de confirmación
            this.mostrarModalConfirmacion(datosArea);
            
        } catch (error) {
            console.error('❌ Error en validación:', error);
            this.mostrarError('Error validando datos: ' + error.message);
        }
    }
    
    obtenerDatosFormulario() {
        console.log('📋 Obteniendo datos del formulario...');
        
        // Obtener organización seleccionada
        const organizacionSelect = document.getElementById('organizacion');
        const orgText = organizacionSelect.options[organizacionSelect.selectedIndex].text;
        
        // Obtener icono sin texto descriptivo
        const iconoCompleto = document.getElementById('iconoArea').value;
        const iconoClase = iconoCompleto.split(' ')[0];
        
        // IMPORTANTE: Usa la misma organización que en areas.js
        // NO conviertas a camelCase si el modelo original no lo espera
        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            caracteristicas: '', // Campo no presente en este formulario
            color: document.getElementById('colorIdentificacion').value,
            icono: iconoClase,
            capacidadMaxima: 0, // Valor por defecto
            presupuestoAnual: 0, // Valor por defecto
            activo: true,
            objetivos: [],
            
            // Usa la organización del usuario, NO la del dropdown
            nombreOrganizacion: this.userManager.currentUser.organizacion, // ← "Mi Empresa"
            organizacionCamelCase: this.userManager.currentUser.organizacionCamelCase // ← "miEmpresa"
        };
    }
    
    // ========== MÉTODOS DE CREACIÓN ==========
    
    mostrarModalConfirmacion(datosArea) {
        console.log('📝 Mostrando modal de confirmación...');
        
        const mensaje = document.getElementById('confirmacionMensaje');
        if (mensaje) {
            mensaje.innerHTML = `
                <p>¿Está seguro de crear la siguiente área?</p>
                <div class="card mt-3">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="area-color me-3" style="background-color: ${datosArea.color}; width: 20px; height: 20px; border-radius: 3px;"></div>
                            <h6 class="mb-0">${datosArea.nombreArea}</h6>
                        </div>
                        <p class="mb-1"><small><strong>Organización:</strong> ${datosArea.nombreOrganizacion}</small></p>
                        <p class="mb-1"><small><strong>Icono:</strong> <i class="${datosArea.icono}"></i></small></p>
                        <p class="mb-0"><small><strong>Descripción:</strong> ${datosArea.descripcion.substring(0, 100)}${datosArea.descripcion.length > 100 ? '...' : ''}</small></p>
                    </div>
                </div>
            `;
        }
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
        modal.show();
    }
    
    async confirmarCreacion() {
        try {
            console.log('✅ Confirmando creación de área...');
            
            if (!this.areaEnProceso) {
                throw new Error('No hay datos de área para crear');
            }
            
            // Cerrar modal de confirmación
            const modalConfirmacion = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion'));
            modalConfirmacion.hide();
            
            // Mostrar estado de carga
            this.mostrarCargando('Creando área...');
            
            console.log('📤 Enviando datos a crearArea:', this.areaEnProceso);
            
            // Crear el área usando el AreaManager
            const nuevaArea = await this.areaManager.crearArea(
                this.areaEnProceso,
                this.userManager.currentUser.id,
                this.userManager
            );
            
            // Ocultar carga
            this.ocultarCargando();
            
            console.log('✅ Área creada exitosamente:', nuevaArea);
            
            // Mostrar modal de éxito
            this.mostrarModalExito(nuevaArea);
            
        } catch (error) {
            console.error('❌ Error creando área:', error);
            this.ocultarCargando();
            this.mostrarError('Error creando área: ' + error.message);
        }
    }
    
    mostrarModalExito(areaCreada) {
        console.log('🎉 Mostrando modal de éxito...');
        
        // Puedes personalizar el mensaje de éxito con datos del área
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();
        
        // Guardar referencia al área creada
        this.areaCreadaReciente = areaCreada;
    }
    
    // ========== ACCIONES POST-CREACIÓN ==========
    
    crearOtraArea() {
        console.log('🔄 Preparando para crear otra área...');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalExito'));
        modal.hide();
        
        // Limpiar formulario
        this.limpiarFormulario();
        
        // Enfocar en primer campo
        setTimeout(() => {
            document.getElementById('nombreArea').focus();
        }, 300);
    }
    
    verAreaCreada() {
        console.log('👁️ Redirigiendo para ver área creada...');
        
        // Redirigir a la tabla de áreas para ver la nueva área
        window.location.href = '/areas.html';  // ← CAMBIA ESTA RUTA
        
        // Si quieres ver detalles específicos:
        // if (this.areaCreadaReciente && this.areaCreadaReciente.id) {
        //     window.location.href = `/pages/area-detalle.html?id=${this.areaCreadaReciente.id}`;
        // } else {
        //     window.location.href = '/areas.html';
        // }
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    limpiarFormulario() {
        console.log('🧹 Limpiando formulario...');
        
        const form = document.getElementById('formCrearArea');
        if (form) {
            form.reset();
        }
        
        // Restablecer valores por defecto
        document.getElementById('colorIdentificacion').value = '#3498db';
        
        // Actualizar contadores y previews
        this.actualizarContadorCaracteres();
        this.actualizarIconoPreview();
        
        // Limpiar datos temporales
        this.areaEnProceso = null;
        
        console.log('✅ Formulario limpio');
    }
    
    guardarBorrador() {
        console.log('💾 Guardando borrador...');
        
        // Esta función guardaría los datos temporalmente
        // Por ahora solo mostramos un mensaje
        this.mostrarNotificacion('Función de guardar borrador en desarrollo', 'info');
        
        // Implementación futura:
        // 1. Guardar en localStorage
        // 2. Guardar en Firestore como "borrador"
        // 3. Marcar como no publicado
    }
    
    // ========== MÉTODOS DE INTERFAZ ==========
    
    mostrarCargando(mensaje = 'Cargando...') {
        // Crear overlay de carga
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        overlay.innerHTML = `
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">${mensaje}</span>
            </div>
            <div class="ms-3 text-light">${mensaje}</div>
        `;
        
        document.body.appendChild(overlay);
        
        // Guardar referencia para removerlo después
        this.loadingOverlay = overlay;
    }
    
    ocultarCargando() {
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
    
    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
    }
    
    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }
    
    mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        // Remover notificación anterior si existe
        if (this.notificacionActual) {
            this.notificacionActual.remove();
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        alert.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        const iconos = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        alert.innerHTML = `
            <i class="fas ${iconos[tipo] || 'fa-info-circle'} me-2"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Guardar referencia
        this.notificacionActual = alert;
        
        // Auto-remover después de la duración
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }
        }, duracion);
    }
}

// ========== INICIAR APLICACIÓN ==========
console.log('🎬 Iniciando carga de crear-area.js...');
cargarDependencias();