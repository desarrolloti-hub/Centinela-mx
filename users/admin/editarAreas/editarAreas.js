// editar-area.js - MÓDULO PARA EDICIÓN/CREACIÓN DE ÁREAS
console.log('🚀 editar-area.js iniciando...');

// Variable global para debugging
window.editarAreaDebug = {
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
        console.log('🎯 Inicializando EditarAreaController...');
        
        const app = new EditarAreaController();
        window.editarAreaDebug.controller = app;
        
        // Inicializar
        app.init();
        
        console.log('✅ Controlador de edición listo');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger">Error de Inicialización</h4>
            <p>${error.message}</p>
        `);
    }
}

// ==================== CLASE EDITARAREACONTROLLER ====================
class EditarAreaController {
    constructor() {
        console.log('🛠️ Creando EditarAreaController...');
        
        this.areaManager = new AreaManager();
        this.areaActual = null;
        this.datosOriginales = null;
        this.modoCreacion = false; // Indica si estamos creando nueva área
        
        // Usuario demo (DEBE SER IGUAL QUE EN areas.js)
        this.userManager = {
    currentUser: {
        id: 'admin_default',
        nombre: 'Administrador',
        cargo: 'administrador',
        organizacion: 'Tu Empresa',  // MISMO NOMBRE QUE EN LOS OTROS
        organizacionCamelCase: 'tuEmpresa'  // MISMO CAMELCASE QUE EN LOS OTROS
    }
};
        
        console.log('✅ Controller creado');
    }
    
    async init() {
        console.log('🎬 Iniciando aplicación de edición...');
        
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.inicializarValidaciones();
        
        // Obtener ID del área desde la URL
        await this.cargarArea();
        
        console.log('✅ Aplicación de edición iniciada');
    }
    
    verificarElementosDOM() {
        console.log('🔍 Verificando elementos del formulario...');
        
        const ids = [
            'btnVolverLista', 'formEditarArea', 'areaId', 'nombreArea',
            'colorIdentificacion', 'btnColorRandom', 'iconoArea',
            'iconoPreview', 'organizacion', 'descripcionArea',
            'contadorCaracteres', 'responsable', 'capacidadMaxima',
            'fechaCreacion', 'ultimaActualizacion', 'creadoPor', 'estadoActual',
            'btnCancelar', 'btnDesactivarArea', 'btnGuardarCambios',
            'modalConfirmacion', 'modalDesactivacion', 'modalExito',
            'btnConfirmarGuardar', 'btnConfirmarDesactivacion',
            'btnContinuarEdicion', 'btnVolverListaExito'
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
                btnCancelar.addEventListener('click', () => this.cancelarEdicion());
                console.log('✅ Evento btnCancelar');
            }
            
            // Botón desactivar área (solo en modo edición)
            const btnDesactivarArea = document.getElementById('btnDesactivarArea');
            if (btnDesactivarArea) {
                btnDesactivarArea.addEventListener('click', () => this.prepararDesactivacion());
                console.log('✅ Evento btnDesactivarArea');
            }
            
            // Formulario submit
            const formEditarArea = document.getElementById('formEditarArea');
            if (formEditarArea) {
                formEditarArea.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.validarYPrepararGuardado();
                });
                console.log('✅ Evento formEditarArea');
            }
            
            // Confirmación guardar cambios
            const btnConfirmarGuardar = document.getElementById('btnConfirmarGuardar');
            if (btnConfirmarGuardar) {
                btnConfirmarGuardar.addEventListener('click', () => this.confirmarGuardado());
                console.log('✅ Evento btnConfirmarGuardar');
            }
            
            // Confirmación desactivación
            const btnConfirmarDesactivacion = document.getElementById('btnConfirmarDesactivacion');
            if (btnConfirmarDesactivacion) {
                btnConfirmarDesactivacion.addEventListener('click', () => this.confirmarDesactivacion());
                console.log('✅ Evento btnConfirmarDesactivacion');
            }
            
            // Botones después de éxito
            const btnContinuarEdicion = document.getElementById('btnContinuarEdicion');
            if (btnContinuarEdicion) {
                btnContinuarEdicion.addEventListener('click', () => this.continuarEdicion());
                console.log('✅ Evento btnContinuarEdicion');
            }
            
            const btnVolverListaExito = document.getElementById('btnVolverListaExito');
            if (btnVolverListaExito) {
                btnVolverListaExito.addEventListener('click', () => this.volverALista());
                console.log('✅ Evento btnVolverListaExito');
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
    
    // ========== CARGA DE DATOS ==========
    
    async cargarArea() {
        try {
            console.log('🔍 Intentando obtener área...');
            
            // Obtener parámetro 'id' de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const areaId = urlParams.get('id');
            
            if (areaId) {
                console.log(`🔄 Cargando área existente con ID: ${areaId}`);
                this.modoCreacion = false;
                
                // Mostrar carga
                this.mostrarCargando('Cargando información del área...');
                
                // Cargar área desde Firebase
                this.areaActual = await this.areaManager.getAreaById(areaId);
                
                if (this.areaActual) {
                    // Cargar datos en formulario
                    await this.cargarDatosEnFormulario();
                    
                    // Guardar datos originales para comparación
                    this.datosOriginales = this.obtenerDatosFormulario();
                    
                    this.ocultarCargando();
                    console.log('✅ Área cargada:', this.areaActual.nombreArea);
                    
                    // Actualizar título de la página
                    this.actualizarTituloPagina(this.areaActual.nombreArea);
                    
                    return;
                } else {
                    console.warn('⚠️ Área no encontrada en Firebase');
                    this.mostrarAdvertencia('Área no encontrada. Se creará una nueva área con los datos proporcionados.');
                    this.modoCreacion = true;
                }
            } else {
                console.log('🆕 Modo creación: No hay ID en la URL');
                this.modoCreacion = true;
            }
            
            // Si estamos en modo creación, inicializar formulario vacío
            await this.inicializarFormularioCreacion();
            
        } catch (error) {
            console.error('❌ Error cargando área:', error);
            this.ocultarCargando();
            this.mostrarError('Error cargando área: ' + error.message);
            this.modoCreacion = true;
            await this.inicializarFormularioCreacion();
        }
    }
    
    async inicializarFormularioCreacion() {
        console.log('🆕 Inicializando formulario para creación...');
        
        // Configurar interfaz para creación
        this.configurarInterfazModoCreacion();
        
        // Inicializar valores por defecto
        document.getElementById('nombreArea').value = '';
        document.getElementById('descripcionArea').value = '';
        document.getElementById('colorIdentificacion').value = '#3498db';
        document.getElementById('iconoArea').value = 'fas fa-building';
        document.getElementById('capacidadMaxima').value = 0;
        
        // Limpiar campos de auditoría
        document.getElementById('fechaCreacion').value = 'Nueva área';
        document.getElementById('ultimaActualizacion').value = 'Nueva área';
        document.getElementById('creadoPor').value = this.userManager.currentUser.nombre;
        document.getElementById('estadoActual').value = 'Activo';
        document.getElementById('estadoActual').className = 'form-control bg-success text-white';
        
        // Ocultar botón de desactivar en modo creación
        const btnDesactivar = document.getElementById('btnDesactivarArea');
        if (btnDesactivar) {
            btnDesactivar.style.display = 'none';
        }
        
        // Actualizar contador y preview
        this.actualizarContadorCaracteres();
        this.actualizarIconoPreview();
        
        console.log('✅ Formulario listo para creación');
    }
    
    configurarInterfazModoCreacion() {
        console.log('🎨 Configurando interfaz para creación...');
        
        // Actualizar título de la página
        document.title = 'Crear Nueva Área - Sistema Centinela';
        
        // Actualizar encabezado
        const titulo = document.querySelector('h1');
        if (titulo) {
            titulo.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Crear Nueva Área';
        }
        
        const subtitulo = document.querySelector('.text-muted');
        if (subtitulo) {
            subtitulo.textContent = 'Complete el formulario para crear una nueva área';
        }
        
        // Cambiar texto del botón guardar
        const btnGuardar = document.getElementById('btnGuardarCambios');
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Crear Área';
        }
        
        // Actualizar textos de confirmación
        const confirmacionMensaje = document.getElementById('confirmacionMensaje');
        if (confirmacionMensaje) {
            confirmacionMensaje.innerHTML = `
                <p>¿Está seguro de crear una nueva área con los siguientes datos?</p>
            `;
        }
        
        console.log('✅ Interfaz configurada para creación');
    }
    
    actualizarTituloPagina(nombreArea) {
        // Actualizar título de la página
        document.title = `Editar ${nombreArea} - Sistema Centinela`;
        
        // Actualizar encabezado
        const titulo = document.querySelector('h1');
        if (titulo) {
            titulo.innerHTML = `<i class="fas fa-edit me-2"></i>Editar Área: ${nombreArea}`;
        }
    }
    
    async cargarDatosEnFormulario() {
        console.log('📝 Cargando datos en formulario...');
        
        if (!this.areaActual) return;
        
        // ID del área
        const areaIdInput = document.getElementById('areaId');
        if (areaIdInput) {
            areaIdInput.value = this.areaActual.id;
        }
        
        // Información básica
        document.getElementById('nombreArea').value = this.areaActual.nombreArea || '';
        document.getElementById('colorIdentificacion').value = this.areaActual.color || '#3498db';
        document.getElementById('iconoArea').value = this.areaActual.icono || 'fas fa-building';
        document.getElementById('descripcionArea').value = this.areaActual.descripcion || '';
        document.getElementById('capacidadMaxima').value = this.areaActual.capacidadMaxima || 0;
        
        // Configurar organización (si está en el formulario)
        const organizacionSelect = document.getElementById('organizacion');
        if (organizacionSelect && this.areaActual.nombreOrganizacion) {
            // Buscar opción que coincida con el nombre de la organización
            for (let option of organizacionSelect.options) {
                if (option.text === this.areaActual.nombreOrganizacion) {
                    option.selected = true;
                    break;
                }
            }
        }
        
        // Información de auditoría
        if (this.areaActual.getFechaCreacionFormateada) {
            document.getElementById('fechaCreacion').value = this.areaActual.getFechaCreacionFormateada();
        } else if (this.areaActual._formatearFecha) {
            document.getElementById('fechaCreacion').value = this.areaActual._formatearFecha(this.areaActual.fechaCreacion);
        } else {
            document.getElementById('fechaCreacion').value = 'No disponible';
        }
        
        const ultimaActualizacion = document.getElementById('ultimaActualizacion');
        if (ultimaActualizacion) {
            if (this.areaActual.fechaActualizacion && this.areaActual._formatearFecha) {
                ultimaActualizacion.value = this.areaActual._formatearFecha(this.areaActual.fechaActualizacion);
            } else {
                ultimaActualizacion.value = 'No disponible';
            }
        }
        
        document.getElementById('creadoPor').value = this.areaActual.creadoPor || 'Desconocido';
        
        // Estado actual
        const estadoText = this.areaActual.getEstado ? this.areaActual.getEstado() : 'Activo';
        const estadoInput = document.getElementById('estadoActual');
        if (estadoInput) {
            estadoInput.value = estadoText;
            
            // Aplicar clases según estado
            if (this.areaActual.eliminado) {
                estadoInput.classList.add('bg-danger', 'text-white');
            } else if (!this.areaActual.activo) {
                estadoInput.classList.add('bg-warning', 'text-dark');
            } else {
                estadoInput.classList.add('bg-success', 'text-white');
            }
        }
        
        // Configurar botón de desactivar según estado
        const btnDesactivar = document.getElementById('btnDesactivarArea');
        if (btnDesactivar && !this.modoCreacion) {
            if (this.areaActual.eliminado) {
                btnDesactivar.innerHTML = '<i class="fas fa-trash-restore me-2"></i>Restaurar Área';
                btnDesactivar.classList.remove('btn-danger');
                btnDesactivar.classList.add('btn-success');
            } else if (!this.areaActual.activo) {
                btnDesactivar.innerHTML = '<i class="fas fa-power-on me-2"></i>Activar Área';
                btnDesactivar.classList.remove('btn-danger');
                btnDesactivar.classList.add('btn-success');
            } else {
                btnDesactivar.innerHTML = '<i class="fas fa-power-off me-2"></i>Desactivar Área';
                btnDesactivar.classList.add('btn-danger');
                btnDesactivar.classList.remove('btn-success');
            }
            btnDesactivar.style.display = 'block';
        }
        
        // Actualizar contador y preview
        this.actualizarContadorCaracteres();
        this.actualizarIconoPreview();
        
        console.log('✅ Datos cargados en formulario');
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
    
    // ========== MÉTODOS DE VALIDACIÓN ==========
    
    validarFormulario() {
        console.log('✅ Validando formulario...');
        
        const form = document.getElementById('formEditarArea');
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        const nombreArea = document.getElementById('nombreArea').value.trim();
        const descripcion = document.getElementById('descripcionArea').value.trim();
        
        // Validar que el nombre no esté vacío
        if (!nombreArea) {
            this.mostrarError('El nombre del área es obligatorio');
            return false;
        }
        
        // Validar que el nombre no sea demasiado corto
        if (nombreArea.length < 3) {
            this.mostrarError('El nombre del área debe tener al menos 3 caracteres');
            return false;
        }
        
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
        
        // Validar que haya seleccionado un icono
        const icono = document.getElementById('iconoArea').value;
        if (!icono) {
            this.mostrarError('Debe seleccionar un icono para el área');
            return false;
        }
        
        console.log('✅ Formulario válido');
        return true;
    }
    
    hayCambios() {
        if (this.modoCreacion || !this.datosOriginales) return true;
        
        const datosActuales = this.obtenerDatosFormulario();
        
        // Comparar datos actuales con originales
        const camposComparar = ['nombreArea', 'descripcion', 'color', 'icono', 'capacidadMaxima'];
        
        for (let campo of camposComparar) {
            if (datosActuales[campo] !== this.datosOriginales[campo]) {
                console.log(`📝 Cambio detectado en ${campo}:`, 
                    this.datosOriginales[campo], '→', datosActuales[campo]);
                return true;
            }
        }
        
        return false;
    }
    
    async validarYPrepararGuardado() {
        try {
            console.log('🔄 Validando y preparando guardado...');
            
            if (!this.validarFormulario()) {
                return;
            }
            
            // Verificar si hay cambios (en modo edición)
            if (!this.modoCreacion && !this.hayCambios()) {
                this.mostrarInfo('No hay cambios para guardar');
                return;
            }
            
            // Obtener datos actualizados
            const datosActualizados = this.obtenerDatosFormulario();
            
            console.log('📋 Datos a guardar:', datosActualizados);
            
            // Mostrar modal de confirmación
            this.mostrarModalConfirmacion(datosActualizados);
            
        } catch (error) {
            console.error('❌ Error en validación:', error);
            this.mostrarError('Error validando datos: ' + error.message);
        }
    }
    
    obtenerDatosFormulario() {
        console.log('📋 Obteniendo datos del formulario...');
        
        // Obtener icono sin texto descriptivo
        const iconoCompleto = document.getElementById('iconoArea').value;
        const iconoClase = iconoCompleto.split(' ')[0];
        
        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            color: document.getElementById('colorIdentificacion').value,
            icono: iconoClase,
            capacidadMaxima: parseInt(document.getElementById('capacidadMaxima').value) || 0,
            
            // Campos que podrían estar en el formulario
            organizacion: document.getElementById('organizacion')?.value || '',
            responsable: document.getElementById('responsable')?.value || ''
        };
    }
    
    obtenerDatosCompletosParaFirebase(datosBasicos) {
        // Datos completos para Firebase (igual que en crearAreas.js)
        return {
            nombreArea: datosBasicos.nombreArea,
            descripcion: datosBasicos.descripcion,
            caracteristicas: '', // Campo no presente en este formulario
            color: datosBasicos.color,
            icono: datosBasicos.icono,
            capacidadMaxima: datosBasicos.capacidadMaxima,
            presupuestoAnual: 0, // Valor por defecto
            activo: true,
            objetivos: [],
            
            // Usar la organización del usuario
            nombreOrganizacion: this.userManager.currentUser.organizacion,
            organizacionCamelCase: this.userManager.currentUser.organizacionCamelCase
        };
    }
    
    // ========== MÉTODOS DE GUARDADO ==========
    
    mostrarModalConfirmacion(datosActualizados) {
        console.log('📝 Mostrando modal de confirmación...');
        
        const mensaje = document.getElementById('confirmacionMensaje');
        if (mensaje) {
            let cambiosHTML = '';
            let tituloModal = '';
            
            if (this.modoCreacion) {
                tituloModal = 'Crear Nueva Área';
                cambiosHTML = `
                    <div class="card mt-3">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-2">
                                <div class="area-color me-3" style="background-color: ${datosActualizados.color}; width: 20px; height: 20px; border-radius: 3px;"></div>
                                <h6 class="mb-0">${datosActualizados.nombreArea}</h6>
                            </div>
                            <p class="mb-1"><small><strong>Organización:</strong> ${this.userManager.currentUser.organizacion}</small></p>
                            <p class="mb-1"><small><strong>Icono:</strong> <i class="${datosActualizados.icono}"></i></small></p>
                            <p class="mb-0"><small><strong>Descripción:</strong> ${datosActualizados.descripcion.substring(0, 100)}${datosActualizados.descripcion.length > 100 ? '...' : ''}</small></p>
                        </div>
                    </div>
                `;
            } else {
                tituloModal = 'Guardar Cambios';
                if (this.datosOriginales) {
                    if (this.datosOriginales.nombreArea !== datosActualizados.nombreArea) {
                        cambiosHTML += `<p><strong>Nombre:</strong> ${this.datosOriginales.nombreArea} → ${datosActualizados.nombreArea}</p>`;
                    }
                    
                    if (this.datosOriginales.color !== datosActualizados.color) {
                        cambiosHTML += `
                            <p>
                                <strong>Color:</strong> 
                                <span class="d-inline-block me-2" style="background-color: ${this.datosOriginales.color}; width: 15px; height: 15px; border-radius: 3px;"></span>
                                → 
                                <span class="d-inline-block" style="background-color: ${datosActualizados.color}; width: 15px; height: 15px; border-radius: 3px;"></span>
                            </p>
                        `;
                    }
                    
                    if (this.datosOriginales.icono !== datosActualizados.icono) {
                        cambiosHTML += `<p><strong>Icono:</strong> <i class="${this.datosOriginales.icono}"></i> → <i class="${datosActualizados.icono}"></i></p>`;
                    }
                    
                    if (this.datosOriginales.capacidadMaxima !== datosActualizados.capacidadMaxima) {
                        cambiosHTML += `<p><strong>Capacidad máxima:</strong> ${this.datosOriginales.capacidadMaxima} → ${datosActualizados.capacidadMaxima}</p>`;
                    }
                    
                    if (!cambiosHTML) {
                        cambiosHTML = '<p class="text-muted">No se detectaron cambios específicos</p>';
                    }
                }
                
                cambiosHTML = `
                    <div class="card mt-3">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">Cambios detectados:</h6>
                            ${cambiosHTML}
                            <p class="mt-2 mb-0"><small><strong>Descripción:</strong> ${datosActualizados.descripcion.substring(0, 80)}${datosActualizados.descripcion.length > 80 ? '...' : ''}</small></p>
                        </div>
                    </div>
                `;
            }
            
            const mensajePrincipal = this.modoCreacion ? 
                '¿Está seguro de crear una nueva área con los siguientes datos?' : 
                '¿Está seguro de guardar los siguientes cambios?';
            
            mensaje.innerHTML = `
                <p>${mensajePrincipal}</p>
                ${cambiosHTML}
            `;
            
            // Actualizar título del modal
            const modalTitulo = document.querySelector('#modalConfirmacion .modal-title');
            if (modalTitulo) {
                modalTitulo.innerHTML = `<i class="fas ${this.modoCreacion ? 'fa-plus-circle' : 'fa-save'} me-2"></i>${tituloModal}`;
            }
            
            // Actualizar texto del botón confirmar
            const btnConfirmar = document.getElementById('btnConfirmarGuardar');
            if (btnConfirmar) {
                btnConfirmar.textContent = this.modoCreacion ? 'Sí, Crear Área' : 'Sí, Guardar Cambios';
            }
        }
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
        modal.show();
    }
    
    async confirmarGuardado() {
        try {
            console.log('✅ Confirmando guardado...');
            
            // Cerrar modal de confirmación
            const modalConfirmacion = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion'));
            if (modalConfirmacion) {
                modalConfirmacion.hide();
            }
            
            // Mostrar estado de carga
            this.mostrarCargando(this.modoCreacion ? 'Creando nueva área...' : 'Actualizando área...');
            
            // Obtener datos actualizados
            const datosActualizados = this.obtenerDatosFormulario();
            
            let resultado;
            
            if (this.modoCreacion) {
                // CREAR NUEVA ÁREA
                const datosCompletos = this.obtenerDatosCompletosParaFirebase(datosActualizados);
                
                console.log('🆕 Creando nueva área:', datosCompletos.nombreArea);
                
                // Usar el método crearArea del AreaManager (igual que en crearAreas.js)
                resultado = await this.areaManager.crearArea(
                    datosCompletos,
                    this.userManager.currentUser.id, // idOrganizacion
                    this.userManager
                );
                
                // Guardar referencia al área creada
                this.areaActual = resultado;
                this.modoCreacion = false; // Ahora estamos en modo edición
                
            } else {
                // ACTUALIZAR ÁREA EXISTENTE
                console.log('🔄 Actualizando área existente:', this.areaActual.id);
                
                resultado = await this.areaManager.actualizarArea(
                    this.areaActual.id,
                    datosActualizados,
                    this.userManager.currentUser.id
                );
                
                // Actualizar referencia local
                this.areaActual = resultado;
            }
            
            // Actualizar datos originales
            this.datosOriginales = this.obtenerDatosFormulario();
            
            // Ocultar carga
            this.ocultarCargando();
            
            console.log('✅ Operación exitosa:', this.areaActual.nombreArea);
            
            // Mostrar modal de éxito
            this.mostrarModalExito(
                this.modoCreacion ? 'Área creada correctamente' : 'Área actualizada correctamente'
            );
            
        } catch (error) {
            console.error('❌ Error en guardado:', error);
            this.ocultarCargando();
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    // ========== MÉTODOS DE DESACTIVACIÓN (solo modo edición) ==========
    
    prepararDesactivacion() {
        console.log('🔄 Preparando desactivación...');
        
        if (!this.areaActual || this.modoCreacion) return;
        
        const modal = document.getElementById('modalDesactivacion');
        const mensaje = document.getElementById('desactivacionMensaje');
        
        if (!this.areaActual.activo || this.areaActual.eliminado) {
            // Modo restauración/activación
            const titulo = modal.querySelector('.modal-title');
            const btnConfirmar = document.getElementById('btnConfirmarDesactivacion');
            
            if (this.areaActual.eliminado) {
                titulo.innerHTML = '<i class="fas fa-trash-restore me-2"></i>Confirmar Restauración';
                mensaje.textContent = '¿Está seguro de restaurar esta área?';
                btnConfirmar.innerHTML = 'Sí, Restaurar Área';
                btnConfirmar.classList.remove('btn-danger');
                btnConfirmar.classList.add('btn-success');
            } else {
                titulo.innerHTML = '<i class="fas fa-power-on me-2"></i>Confirmar Activación';
                mensaje.textContent = '¿Está seguro de activar esta área?';
                btnConfirmar.innerHTML = 'Sí, Activar Área';
                btnConfirmar.classList.remove('btn-danger');
                btnConfirmar.classList.add('btn-success');
            }
        } else {
            // Modo desactivación normal
            const titulo = modal.querySelector('.modal-title');
            const btnConfirmar = document.getElementById('btnConfirmarDesactivacion');
            
            titulo.innerHTML = '<i class="fas fa-power-off me-2"></i>Confirmar Desactivación';
            mensaje.textContent = '¿Está seguro de desactivar esta área? Esta acción puede ser reversible.';
            btnConfirmar.innerHTML = 'Sí, Desactivar Área';
            btnConfirmar.classList.add('btn-danger');
            btnConfirmar.classList.remove('btn-success');
        }
        
        // Mostrar modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }
    
    async confirmarDesactivacion() {
        try {
            console.log('🔄 Confirmando cambio de estado...');
            
            if (!this.areaActual || this.modoCreacion) return;
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalDesactivacion'));
            modal.hide();
            
            // Mostrar carga
            this.mostrarCargando('Procesando...');
            
            let resultado;
            let mensajeExito;
            
            if (this.areaActual.eliminado) {
                // Restaurar área
                resultado = await this.areaManager.restaurarArea(
                    this.areaActual.id,
                    this.userManager.currentUser.id
                );
                mensajeExito = 'Área restaurada correctamente';
            } else if (!this.areaActual.activo) {
                // Activar área
                resultado = await this.areaManager.activarArea(
                    this.areaActual.id,
                    this.userManager.currentUser.id
                );
                mensajeExito = 'Área activada correctamente';
            } else {
                // Desactivar área
                resultado = await this.areaManager.desactivarArea(
                    this.areaActual.id,
                    this.userManager.currentUser.id
                );
                mensajeExito = 'Área desactivada correctamente';
            }
            
            if (resultado) {
                // Recargar datos del área
                this.areaActual = await this.areaManager.getAreaById(this.areaActual.id);
                
                // Actualizar interfaz
                await this.cargarDatosEnFormulario();
                
                this.ocultarCargando();
                this.mostrarModalExito(mensajeExito);
                
                console.log('✅ Estado actualizado:', mensajeExito);
            }
            
        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            this.ocultarCargando();
            this.mostrarError('Error cambiando estado: ' + error.message);
        }
    }
    
    // ========== MÉTODOS DE NAVEGACIÓN ==========
    
    volverALista() {
        console.log('⬅️ Volviendo a lista de áreas...');
        window.location.href = '/areas.html';
    }
    
    cancelarEdicion() {
        console.log('❌ Cancelando edición...');
        
        if (this.hayCambios()) {
            if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
                this.volverALista();
            }
        } else {
            this.volverALista();
        }
    }
    
    continuarEdicion() {
        console.log('✏️ Continuando edición...');
        // El modal ya se cierra automáticamente
        // Enfocar en el primer campo
        setTimeout(() => {
            document.getElementById('nombreArea').focus();
        }, 300);
    }
    
    // ========== MÉTODOS DE INTERFAZ ==========
    
    mostrarModalExito(mensaje) {
        console.log('🎉 Mostrando modal de éxito...');
        
        const titulo = document.getElementById('exitoTitulo');
        const mensajeElemento = document.getElementById('exitoMensaje');
        
        if (titulo && mensajeElemento) {
            titulo.textContent = '¡Operación Exitosa!';
            mensajeElemento.textContent = mensaje;
        }
        
        // Actualizar botón "Continuar Editando" según el modo
        const btnContinuar = document.getElementById('btnContinuarEdicion');
        if (btnContinuar) {
            btnContinuar.textContent = this.modoCreacion ? 'Crear Otra Área' : 'Seguir Editando';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();
    }
    
    mostrarCargando(mensaje = 'Cargando...') {
        // Remover overlay anterior si existe
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.remove();
        }
        
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
    
    mostrarInfo(mensaje) {
        this.mostrarNotificacion(mensaje, 'info');
    }
    
    mostrarAdvertencia(mensaje) {
        this.mostrarNotificacion(mensaje, 'warning');
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
console.log('🎬 Iniciando carga de editar-area.js...');
cargarDependencias();