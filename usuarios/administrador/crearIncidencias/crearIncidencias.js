// crearIncidencias.js - VERSIÓN CON VISTA PREVIA DE PDF
const LIMITES = {
    DETALLES_INCIDENCIA: 1000
};

class CrearIncidenciaController {
    constructor() {
        this.incidenciaManager = null;
        this.usuarioActual = null;
        this.sucursales = [];
        this.categorias = [];
        this.subcategoriasCache = {};
        this.categoriaSeleccionada = null;
        this.imagenesSeleccionadas = [];
        this.imageEditorModal = null;
        this.loadingOverlay = null;
        this.flatpickrInstance = null;
        this.historialManager = null;
        this.areas = [];
        this.AreaManager = null;
        this.notificacionManager = null;
        
        // Para vista previa de PDF (AGREGADO)
        this.pdfGenerator = null;
        this.pdfPreviewModal = null;
        this.pdfBlobGenerado = null;
        this.datosActuales = null;

        this._init();
    }

    async _initHistorialManager() {
        if (!this.historialManager) {
            try {
                const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
                this.historialManager = new HistorialUsuarioManager();
            } catch (error) {
                console.error('Error inicializando historialManager:', error);
            }
        }
        return this.historialManager;
    }

    async _initNotificacionManager() {
        if (!this.notificacionManager) {
            try {
                const { NotificacionAreaManager } = await import('/clases/notificacionArea.js');
                this.notificacionManager = new NotificacionAreaManager();
            } catch (error) {
                console.error('Error inicializando notificacionManager:', error);
            }
        }
        return this.notificacionManager;
    }

    // =============================================
    // INICIALIZAR PDF GENERATOR (AGREGADO)
    // =============================================
    async _initPDFGenerator() {
        if (!this.pdfGenerator) {
            try {
                const { generadorIPH } = await import('/components/iph-generator.js');
                this.pdfGenerator = generadorIPH;
                console.log('✅ PDFGenerator inicializado correctamente');
                return true;
            } catch (error) {
                console.error('Error inicializando PDFGenerator:', error);
                return false;
            }
        }
        return true;
    }

    // =============================================
    // INICIALIZAR MODAL DE VISTA PREVIA PDF (AGREGADO)
    // =============================================
   _initPDFPreviewModal() {
    // Verificar si el modal ya existe
    let modal = document.getElementById('pdfPreviewModal');
    
    if (!modal) {
        const modalHTML = `
            <div id="pdfPreviewModal" class="pdf-preview-modal">
                <div class="pdf-preview-header">
                    <h3><i class="fas fa-file-pdf"></i> Vista Previa del Informe de Incidencia</h3>
                    <button class="pdf-preview-btn pdf-close-btn" id="pdfCloseBtn" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pdf-preview-content">
                    <div class="pdf-preview-loading" id="pdfPreviewLoading">
                        <div class="spinner"></div>
                        <p>Generando vista previa del informe...</p>
                        <p class="small">Esto puede tomar unos segundos dependiendo de las imágenes</p>
                    </div>
                    <iframe id="pdfPreviewIframe" class="pdf-preview-iframe" style="display: none;"></iframe>
                </div>
                <div class="pdf-preview-footer">
                    <button class="btn btn-secondary" id="pdfCancelBtn">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    <button class="btn btn-success" id="pdfAcceptBtn">
                        <i class="fas fa-check-circle"></i> Aceptar y Guardar
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('pdfPreviewModal');
        
        this._addPDFPreviewStyles();
    }
    
    // Asignar referencias
    this.pdfPreviewModal = modal;
    this.pdfPreviewIframe = document.getElementById('pdfPreviewIframe');
    this.pdfPreviewLoading = document.getElementById('pdfPreviewLoading');
    
    // Remover event listeners anteriores para evitar duplicados
    const closeBtn = document.getElementById('pdfCloseBtn');
    const cancelBtn = document.getElementById('pdfCancelBtn');
    const acceptBtn = document.getElementById('pdfAcceptBtn');
    
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', () => this._closePDFPreview());
    }
    
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', () => this._closePDFPreview());
    }
    
    if (acceptBtn) {
        const newAcceptBtn = acceptBtn.cloneNode(true);
        acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
        newAcceptBtn.addEventListener('click', () => this._acceptAndUpload());
    }
    
    // Cerrar al hacer click fuera
    if (this.pdfPreviewModal) {
        // Remover event listener anterior si existe
        if (this._modalClickListener) {
            this.pdfPreviewModal.removeEventListener('click', this._modalClickListener);
        }
        this._modalClickListener = (e) => {
            if (e.target === this.pdfPreviewModal) {
                this._closePDFPreview();
            }
        };
        this.pdfPreviewModal.addEventListener('click', this._modalClickListener);
    }
    
    // Escapar con ESC - remover anterior si existe
    if (this._escListener) {
        document.removeEventListener('keydown', this._escListener);
    }
    this._escListener = (e) => {
        if (this.pdfPreviewModal && this.pdfPreviewModal.style.display === 'flex' && e.key === 'Escape') {
            this._closePDFPreview();
        }
    };
    document.addEventListener('keydown', this._escListener);
}
    
   _addPDFPreviewStyles() {
    if (document.getElementById('pdfPreviewStyles')) return;
    
    const styles = `
        <style id="pdfPreviewStyles">
            .pdf-preview-modal {
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.95);
                flex-direction: column;
                animation: pdfPreviewFadeIn 0.3s ease;
            }
            
            @keyframes pdfPreviewFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .pdf-preview-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: linear-gradient(135deg, #1a3b5d 0%, #0f2a44 100%);
                color: white;
                border-bottom: 2px solid #c9a03d;
            }
            
            .pdf-preview-header h3 {
                margin: 0;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .pdf-preview-header h3 i {
                color: #e74c3c;
            }
            
            .pdf-preview-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: all 0.3s ease;
            }
            
            .pdf-preview-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }
            
            .pdf-preview-content {
                flex: 1;
                padding: 20px;
                background: #1a1a1a;
                position: relative;
                min-height: 0;
            }
            
            .pdf-preview-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .pdf-preview-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: white;
            }
            
            .pdf-preview-loading .spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top-color: #c9a03d;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            
            .pdf-preview-loading p {
                margin: 10px 0;
                font-size: 14px;
            }
            
            .pdf-preview-loading .small {
                font-size: 12px;
                color: #aaa;
            }
            
            .pdf-preview-footer {
                display: flex;
                justify-content: flex-end;
                gap: 15px;
                padding: 16px 24px;
                background: #2d2d2d;
                border-top: 1px solid #444;
            }
            
            .pdf-preview-footer .btn {
                padding: 10px 24px;
                font-family: var(--font-family-secondary);
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                border: none;
            }
            
            .pdf-preview-footer .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .pdf-preview-footer .btn-secondary:hover {
                background: #5a6268;
                transform: translateY(-2px);
            }
            
            .pdf-preview-footer .btn-success {
                background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                border: 1px solid #28a745;
                color: white;
            }
            
            .pdf-preview-footer .btn-success:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            @media (max-width: 768px) {
                .pdf-preview-header {
                    padding: 12px 16px;
                }
                .pdf-preview-header h3 {
                    font-size: 16px;
                }
                .pdf-preview-footer {
                    padding: 12px 16px;
                }
                .pdf-preview-footer .btn {
                    padding: 8px 16px;
                    font-size: 14px;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}
    
    // =============================================
    // MOSTRAR VISTA PREVIA DEL PDF (AGREGADO)
    // =============================================
    async _mostrarVistaPreviaPDF(datos) {
    try {
        // Verificar que el modal esté inicializado
        if (!this.pdfPreviewModal) {
            console.warn('Modal no inicializado, inicializando ahora...');
            this._initPDFPreviewModal();
        }
        
        // Verificar nuevamente después de la inicialización
        if (!this.pdfPreviewModal) {
            throw new Error('No se pudo inicializar el visor de PDF');
        }
        
        this.pdfPreviewModal.style.display = 'flex';
        
        if (this.pdfPreviewIframe) {
            this.pdfPreviewIframe.style.display = 'none';
        }
        if (this.pdfPreviewLoading) {
            this.pdfPreviewLoading.style.display = 'block';
        }
        
        this.datosActuales = datos;
        
        const registroTemporal = this._crearRegistroTemporal(datos);
        
        console.log('📄 Generando vista previa del PDF para incidencia...');
        console.log('📸 Evidencias para vista previa:', registroTemporal.imagenes?.length || 0);
        
        // Verificar que el generador PDF esté disponible
        if (!this.pdfGenerator) {
            await this._initPDFGenerator();
        }
        
        const pdfBlob = await this.pdfGenerator.generarIPH(registroTemporal, {
            mostrarAlerta: false,
            returnBlob: true,
            diagnosticar: false
        });
        
        if (!pdfBlob || pdfBlob.size === 0) {
            throw new Error('El PDF generado está vacío');
        }
        
        console.log(`📦 PDF generado: ${(pdfBlob.size / 1024).toFixed(2)} KB`);
        
        this.pdfBlobGenerado = pdfBlob;
        
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        if (this.pdfPreviewIframe) {
            this.pdfPreviewIframe.src = pdfUrl;
            this.pdfPreviewIframe.style.display = 'block';
        }
        if (this.pdfPreviewLoading) {
            this.pdfPreviewLoading.style.display = 'none';
        }
        
        console.log('✅ Vista previa PDF cargada correctamente');
        
    } catch (error) {
        console.error('❌ Error generando vista previa:', error);
        this._closePDFPreview();
        
        Swal.fire({
            icon: 'error',
            title: 'Error al generar vista previa',
            text: error.message || 'No se pudo generar la vista previa del informe',
            footer: 'Por favor, verifica tu conexión y las imágenes seleccionadas.'
        });
    }
}
    
    _crearRegistroTemporal(datos) {
        const fechaObj = new Date(datos.fechaHora);
        
        const evidenciasProcesadas = datos.imagenes.map((img, index) => {
            return {
                id: `temp_${Date.now()}_${index}`,
                file: img.file,
                preview: img.preview,
                url: img.preview,
                comentario: img.comentario || '',
                elementos: img.elementos || [],
                generatedName: img.generatedName
            };
        });
        
        return {
            id: `PREVIEW_${Date.now()}`,
            sucursalId: datos.sucursalId,
            sucursalNombre: datos.sucursalNombre,
            categoriaId: datos.categoriaId,
            categoriaNombre: datos.categoriaNombre,
            subcategoriaId: datos.subcategoriaId,
            subcategoriaNombre: datos.subcategoriaNombre,
            nivelRiesgo: datos.nivelRiesgo,
            estado: datos.estado,
            fechaInicio: fechaObj,
            detalles: datos.detalles,
            reportadoPorNombre: this.usuarioActual.nombreCompleto,
            imagenes: evidenciasProcesadas,
            fechaCreacion: new Date(),
            getEstadoTexto: () => datos.estado === 'pendiente' ? 'Pendiente' : 'Finalizada',
            getNivelRiesgoTexto: () => this._getRiesgoTexto(datos.nivelRiesgo)
        };
    }
    
    _getRiesgoTexto(riesgo) {
        const riesgos = {
            'bajo': 'Bajo',
            'medio': 'Medio',
            'alto': 'Alto',
            'critico': 'Crítico'
        };
        return riesgos[riesgo] || riesgo;
    }
    
_closePDFPreview() {
    if (this.pdfPreviewModal) {
        this.pdfPreviewModal.style.display = 'none';
        
        // Limpiar iframe
        if (this.pdfPreviewIframe) {
            this.pdfPreviewIframe.src = '';
            this.pdfPreviewIframe.style.display = 'none';
        }
        
        // Limpiar loading
        if (this.pdfPreviewLoading) {
            this.pdfPreviewLoading.style.display = 'block';
        }
    }
}
    
    async _acceptAndUpload() {
        this._closePDFPreview();
        
        if (!this.pdfBlobGenerado) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el PDF. Por favor, intenta de nuevo.'
            });
            return;
        }
        
        await this._guardarIncidencia(this.datosActuales, this.pdfBlobGenerado);
    }

async _init() {
    try {
        this._cargarUsuario();

        if (!this.usuarioActual) {
            throw new Error('No se pudo cargar información del usuario');
        }

        await this._inicializarManager();
        await this._cargarDatosRelacionados();
        await this._cargarAreas();
        await this._initNotificacionManager();
        
        // Inicializar PDF Generator
        await this._initPDFGenerator();

        this._configurarOrganizacion();
        this._inicializarDateTimePicker();
        this._configurarEventos();
        this._inicializarValidaciones();
        this._inicializarValidacionSecuencial();

        this.imageEditorModal = new window.ImageEditorModal();
        
        // Inicializar modal de vista previa (sincrónico)
        this._initPDFPreviewModal();
        
        // Verificar que se inicializó correctamente
        if (!this.pdfPreviewModal) {
            console.error('No se pudo inicializar el modal de vista previa');
        } else {
            console.log('✅ Modal de vista previa inicializado correctamente');
        }

    } catch (error) {
        console.error('Error inicializando:', error);
        this._mostrarError('Error al inicializar: ' + error.message);
    }
}
    _inicializarValidacionSecuencial() {
        const camposDependientes = [
            { id: 'categoriaIncidencia', nombre: 'Categoría' },
            { id: 'nivelRiesgo', nombre: 'Nivel de Riesgo' },
            { id: 'subcategoriaIncidencia', nombre: 'Subcategoría' },
            { id: 'detallesIncidencia', nombre: 'Descripción' },
            { id: 'fechaHoraIncidencia', nombre: 'Fecha y Hora' }
        ];

        camposDependientes.forEach(campo => {
            const element = document.getElementById(campo.id);
            if (element) {
                element.disabled = true;
                element.classList.add('field-disabled');

                const parent = element.closest('.full-width');
                if (parent) {
                    let hint = parent.querySelector('.field-required-hint');
                    if (!hint) {
                        hint = document.createElement('div');
                        hint.className = 'field-required-hint';
                        hint.innerHTML = '<i class="fas fa-exclamation-circle"></i> Primero debes seleccionar una sucursal';
                        hint.style.color = 'var(--color-warning)';
                        hint.style.fontSize = '11px';
                        hint.style.marginTop = '5px';
                        hint.style.display = 'flex';
                        hint.style.alignItems = 'center';
                        hint.style.gap = '5px';
                        parent.appendChild(hint);
                    }
                }
            }
        });

        const sucursalInput = document.getElementById('sucursalIncidencia');
        if (sucursalInput) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-selected-id') {
                        const tieneSucursal = sucursalInput.dataset.selectedId && sucursalInput.dataset.selectedId !== '';
                        this._habilitarCamposPorSucursal(tieneSucursal);
                    }
                });
            });

            observer.observe(sucursalInput, { attributes: true });

            sucursalInput.addEventListener('blur', () => {
                const tieneSucursal = sucursalInput.dataset.selectedId && sucursalInput.dataset.selectedId !== '';
                this._habilitarCamposPorSucursal(tieneSucursal);
            });
        }
    }

    _habilitarCamposPorSucursal(habilitar) {
        const camposDependientes = [
            'categoriaIncidencia',
            'nivelRiesgo',
            'subcategoriaIncidencia',
            'detallesIncidencia',
            'fechaHoraIncidencia'
        ];

        camposDependientes.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                if (habilitar) {
                    campo.disabled = false;
                    campo.classList.remove('field-disabled');

                    const parent = campo.closest('.full-width');
                    const hint = parent?.querySelector('.field-required-hint');
                    if (hint) {
                        hint.style.display = 'none';
                    }
                } else {
                    campo.disabled = true;
                    campo.classList.add('field-disabled');
                    campo.value = campo.tagName === 'SELECT' ? '' : '';

                    const parent = campo.closest('.full-width');
                    const hint = parent?.querySelector('.field-required-hint');
                    if (hint) {
                        hint.style.display = 'flex';
                    }
                }
            }
        });

        if (!habilitar) {
            const categoriaInput = document.getElementById('categoriaIncidencia');
            if (categoriaInput) {
                delete categoriaInput.dataset.selectedId;
                delete categoriaInput.dataset.selectedName;
            }

            const subcategoriaSelect = document.getElementById('subcategoriaIncidencia');
            if (subcategoriaSelect) {
                subcategoriaSelect.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            }

            this.categoriaSeleccionada = null;
        }
    }

    async _inicializarManager() {
        try {
            const { IncidenciaManager } = await import('/clases/incidencia.js');
            this.incidenciaManager = new IncidenciaManager();
        } catch (error) {
            console.error('Error cargando IncidenciaManager:', error);
            throw error;
        }
    }

    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput) {
            orgInput.value = this.usuarioActual.organizacion;
        }
    }

    _inicializarDateTimePicker() {
        const fechaInput = document.getElementById('fechaHoraIncidencia');
        if (fechaInput && typeof flatpickr !== 'undefined') {
            try {
                const ahora = new Date();

                const fechaFormateada = ahora.toLocaleString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                this.flatpickrInstance = flatpickr(fechaInput, {
                    enableTime: true,
                    dateFormat: "Y-m-d H:i",
                    time_24hr: true,
                    locale: "es",
                    defaultDate: ahora,
                    minuteIncrement: 1,
                    maxDate: ahora,
                    disableMobile: true,
                    onChange: function (selectedDates, dateStr, instance) {
                        if (selectedDates.length > 0) {
                            const selectedDate = selectedDates[0];
                            const now = new Date();
                            if (selectedDate > now) {
                                instance.setDate(now, true);
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Fecha no válida',
                                    text: 'No puedes seleccionar una fecha futura',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error inicializando Flatpickr:', error);
                fechaInput.type = 'datetime-local';
                const ahora = new Date();
                fechaInput.value = this._formatearFechaParaInput(ahora);
                fechaInput.max = this._formatearFechaParaInput(ahora);
            }
        } else {
            console.warn('Flatpickr no está disponible, usando input nativo');
            const fechaInput = document.getElementById('fechaHoraIncidencia');
            if (fechaInput) {
                fechaInput.type = 'datetime-local';
                const ahora = new Date();
                fechaInput.value = this._formatearFechaParaInput(ahora);
                fechaInput.max = this._formatearFechaParaInput(ahora);
            }
        }
    }

    _formatearFechaParaInput(fecha) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const hours = String(fecha.getHours()).padStart(2, '0');
        const minutes = String(fecha.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async _cargarDatosRelacionados() {
        try {
            await this._cargarSucursales();
            await this._cargarCategorias();
        } catch (error) {
            console.error('Error cargando datos relacionados:', error);
            throw error;
        }
    }

    async _cargarSucursales() {
        try {
            const { SucursalManager } = await import('/clases/sucursal.js');
            const sucursalManager = new SucursalManager();

            this.sucursales = await sucursalManager.getSucursalesByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

        } catch (error) {
            console.error('Error cargando sucursales:', error);
            throw error;
        }
    }

    async _cargarCategorias() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            const categoriaManager = new CategoriaManager();

            this.categorias = await categoriaManager.obtenerTodasCategorias();

        } catch (error) {
            console.error('Error cargando categorías:', error);
            throw error;
        }
    }

    async _cargarAreas() {
        try {
            const { AreaManager } = await import('/clases/area.js');
            this.AreaManager = new AreaManager();

            if (this.usuarioActual && this.usuarioActual.organizacionCamelCase) {
                const areasObtenidas = await this.AreaManager.getAreasByOrganizacion(
                    this.usuarioActual.organizacionCamelCase,
                    true
                );

                this.areas = areasObtenidas.filter(area => area.estado === 'activa');
                console.log('✅ Áreas activas cargadas:', this.areas.length);
            }
        } catch (error) {
            console.error('Error cargando áreas:', error);
            this.areas = [];
        }
    }

    _cargarUsuario() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || adminData.uid || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || '',
                    email: adminData.correoElectronico || ''
                };
                return;
            }

            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                this.usuarioActual = {
                    id: userData.uid || userData.id || `user_${Date.now()}`,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || ''
                };
                return;
            }

            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                correo: 'admin@centinela.com',
                email: 'admin@centinela.com'
            };

        } catch (error) {
            console.error('Error cargando usuario:', error);
            throw error;
        }
    }

    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    _inicializarValidaciones() {
        const detallesInput = document.getElementById('detallesIncidencia');
        if (detallesInput) {
            detallesInput.maxLength = LIMITES.DETALLES_INCIDENCIA;
            detallesInput.addEventListener('input', () => {
                this._validarLongitudCampo(
                    detallesInput,
                    LIMITES.DETALLES_INCIDENCIA,
                    'Los detalles'
                );
                this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
            });
        }

        this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
    }

    _actualizarContador(inputId, counterId, limite) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);

        if (input && counter) {
            const longitud = input.value.length;
            counter.textContent = `${longitud}/${limite}`;

            if (longitud > limite * 0.9) {
                counter.style.color = 'var(--color-warning)';
            } else if (longitud > limite * 0.95) {
                counter.style.color = 'var(--color-danger)';
            } else {
                counter.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    _validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this._mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    _configurarEventos() {
        try {
            document.getElementById('btnVolverLista')?.addEventListener('click', () => this._volverALista());
            document.getElementById('btnCancelar')?.addEventListener('click', () => this._cancelarCreacion());

            document.getElementById('btnCrearIncidencia')?.addEventListener('click', (e) => {
                e.preventDefault();
                this._validarYMostrarOpciones(); // MODIFICADO: ahora muestra opciones primero
            });

            document.getElementById('btnAgregarImagen')?.addEventListener('click', () => {
                document.getElementById('inputImagenes').click();
            });

            document.getElementById('inputImagenes')?.addEventListener('change', (e) => this._procesarImagenes(e.target.files));

            document.getElementById('formIncidenciaPrincipal')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this._validarYMostrarOpciones(); // MODIFICADO: ahora muestra opciones primero
            });

            document.getElementById('categoriaIncidencia')?.addEventListener('change', (e) => {
                const categoriaId = e.target.dataset.selectedId;
                if (categoriaId) {
                    this._cargarSubcategorias(categoriaId);
                }
            });

            this._configurarSugerencias();

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _configurarSugerencias() {
        const inputSucursal = document.getElementById('sucursalIncidencia');
        const inputCategoria = document.getElementById('categoriaIncidencia');

        if (inputSucursal) {
            inputSucursal.addEventListener('input', (e) => {
                this._mostrarSugerenciasSucursal(e.target.value);
            });

            inputSucursal.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('sugerenciasSucursal').innerHTML = '';
                }, 200);
            });

            inputSucursal.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this._mostrarSugerenciasSucursal(e.target.value);
                }
            });
        }

        if (inputCategoria) {
            inputCategoria.addEventListener('input', (e) => {
                this._mostrarSugerenciasCategoria(e.target.value);
            });

            inputCategoria.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('sugerenciasCategoria').innerHTML = '';
                }, 200);
            });

            inputCategoria.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this._mostrarSugerenciasCategoria(e.target.value);
                }
            });
        }
    }

    _mostrarSugerenciasSucursal(termino) {
        const contenedor = document.getElementById('sugerenciasSucursal');
        if (!contenedor) return;

        const terminoLower = termino.toLowerCase().trim();

        if (terminoLower.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        const sugerencias = this.sucursales.filter(suc =>
            suc.nombre.toLowerCase().includes(terminoLower) ||
            (suc.ciudad && suc.ciudad.toLowerCase().includes(terminoLower)) ||
            (suc.direccion && suc.direccion.toLowerCase().includes(terminoLower))
        ).slice(0, 8);

        if (sugerencias.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencias-lista">
                    <div class="sugerencia-vacia">
                        <i class="fas fa-store"></i>
                        <p>No se encontraron sucursales</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="sugerencias-lista">';
        sugerencias.forEach(suc => {
            const seleccionada = document.getElementById('sucursalIncidencia').dataset.selectedId === suc.id;
            html += `
                <div class="sugerencia-item ${seleccionada ? 'seleccionada' : ''}" 
                     data-id="${suc.id}" 
                     data-nombre="${suc.nombre}">
                    <div class="sugerencia-icono">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="sugerencia-info">
                        <div class="sugerencia-nombre">${this._escapeHTML(suc.nombre)}</div>
                        <div class="sugerencia-detalle">
                            <i class="fas fa-map-marker-alt"></i>
                            ${suc.ciudad || 'Sin ciudad'} - ${suc.direccion || 'Sin dirección'}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.sugerencia-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const nombre = item.dataset.nombre;
                this._seleccionarSucursal(id, nombre);
            });
        });
    }

    _mostrarSugerenciasCategoria(termino) {
        const contenedor = document.getElementById('sugerenciasCategoria');
        if (!contenedor) return;

        const terminoLower = termino.toLowerCase().trim();

        if (terminoLower.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        const sugerencias = this.categorias.filter(cat =>
            cat.nombre.toLowerCase().includes(terminoLower)
        ).slice(0, 8);

        if (sugerencias.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencias-lista">
                    <div class="sugerencia-vacia">
                        <i class="fas fa-tags"></i>
                        <p>No se encontraron categorías</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="sugerencias-lista">';
        sugerencias.forEach(cat => {
            const seleccionada = document.getElementById('categoriaIncidencia').dataset.selectedId === cat.id;
            const totalSubcategorias = cat.subcategorias ?
                (cat.subcategorias instanceof Map ? cat.subcategorias.size : Object.keys(cat.subcategorias).length) : 0;

            html += `
                <div class="sugerencia-item ${seleccionada ? 'seleccionada' : ''}" 
                     data-id="${cat.id}" 
                     data-nombre="${cat.nombre}">
                    <div class="sugerencia-icono">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div class="sugerencia-info">
                        <div class="sugerencia-nombre">${this._escapeHTML(cat.nombre)}</div>
                        <div class="sugerencia-detalle">
                            <i class="fas fa-layer-group"></i>
                            ${totalSubcategorias} subcategorías
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.sugerencia-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const nombre = item.dataset.nombre;
                this._seleccionarCategoria(id, nombre);
            });
        });
    }

    _seleccionarSucursal(id, nombre) {
        const input = document.getElementById('sucursalIncidencia');
        input.value = nombre;
        input.dataset.selectedId = id;
        input.dataset.selectedName = nombre;

        document.getElementById('sugerenciasSucursal').innerHTML = '';

        this._habilitarCamposPorSucursal(true);
    }

    _seleccionarCategoria(id, nombre) {
        const input = document.getElementById('categoriaIncidencia');
        input.value = nombre;
        input.dataset.selectedId = id;
        input.dataset.selectedName = nombre;

        document.getElementById('sugerenciasCategoria').innerHTML = '';

        this._cargarSubcategorias(id);
    }

    async _cargarSubcategorias(categoriaId) {
        const selectSubcategoria = document.getElementById('subcategoriaIncidencia');
        if (!selectSubcategoria) return;

        selectSubcategoria.innerHTML = '<option value="">Cargando subcategorías...</option>';
        selectSubcategoria.disabled = true;

        if (!categoriaId) {
            selectSubcategoria.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            selectSubcategoria.disabled = true;
            return;
        }

        const categoria = this.categorias.find(c => c.id === categoriaId);
        if (!categoria) {
            selectSubcategoria.innerHTML = '<option value="">-- Error: Categoría no encontrada --</option>';
            selectSubcategoria.disabled = true;
            return;
        }

        this.categoriaSeleccionada = categoria;

        try {
            let subcategoriasArray = [];

            if (categoria.subcategorias) {
                if (categoria.subcategorias instanceof Map) {
                    categoria.subcategorias.forEach((valor, clave) => {
                        if (valor && typeof valor === 'object') {
                            subcategoriasArray.push({
                                id: clave,
                                nombre: valor.nombre || clave,
                                ...valor
                            });
                        }
                    });
                }
                else if (categoria.subcategorias.entries && typeof categoria.subcategorias.entries === 'function') {
                    for (const [clave, valor] of categoria.subcategorias.entries()) {
                        if (valor && typeof valor === 'object') {
                            subcategoriasArray.push({
                                id: clave,
                                nombre: valor.nombre || clave,
                                ...valor
                            });
                        }
                    }
                }
                else if (typeof categoria.subcategorias.forEach === 'function') {
                    categoria.subcategorias.forEach((valor, clave) => {
                        if (valor && typeof valor === 'object') {
                            subcategoriasArray.push({
                                id: clave,
                                nombre: valor.nombre || clave,
                                ...valor
                            });
                        }
                    });
                }
                else if (typeof categoria.subcategorias === 'object') {
                    subcategoriasArray = Object.keys(categoria.subcategorias).map(key => ({
                        id: key,
                        nombre: categoria.subcategorias[key]?.nombre || key,
                        ...categoria.subcategorias[key]
                    }));
                }
            }

            if (subcategoriasArray.length === 0) {
                selectSubcategoria.innerHTML = '<option value="">-- No hay subcategorías disponibles --</option>';
                selectSubcategoria.disabled = true;
                return;
            }

            let options = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            subcategoriasArray.forEach(sub => {
                options += `<option value="${sub.id}">${sub.nombre || sub.id}</option>`;
            });

            selectSubcategoria.innerHTML = options;
            selectSubcategoria.disabled = false;

        } catch (error) {
            console.error('Error cargando subcategorías:', error);
            selectSubcategoria.innerHTML = '<option value="">-- Error cargando subcategorías --</option>';
            selectSubcategoria.disabled = true;
        }
    }

    _procesarImagenes(files) {
        if (!files || files.length === 0) return;

        const nuevosArchivos = Array.from(files);
        const maxSize = 10 * 1024 * 1024;
        const maxImages = 20;

        if (this.imagenesSeleccionadas.length + nuevosArchivos.length > maxImages) {
            this._mostrarError(`Máximo ${maxImages} imágenes permitidas`);
            return;
        }

        const archivosValidos = nuevosArchivos.filter(file => {
            if (file.size > maxSize) {
                this._mostrarNotificacion(`La imagen ${file.name} excede ${maxSize / 1024 / 1024}MB`, 'warning');
                return false;
            }

            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                this._mostrarNotificacion(`Formato no válido: ${file.name}. Usa JPG, PNG, GIF o WEBP`, 'warning');
                return false;
            }

            return true;
        });

        archivosValidos.forEach(file => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const cleanFileName = file.name
                .replace(/[^a-zA-Z0-9.]/g, '_')
                .replace(/\s+/g, '_');
            const generatedName = `${timestamp}_${random}_${cleanFileName}`;

            this.imagenesSeleccionadas.push({
                file: file,
                preview: URL.createObjectURL(file),
                comentario: '',
                elementos: [],
                edited: false,
                generatedName: generatedName
            });
        });

        this._actualizarVistaPreviaImagenes();
        document.getElementById('inputImagenes').value = '';
    }

    _actualizarVistaPreviaImagenes() {
        const container = document.getElementById('imagenesPreview');
        const countSpan = document.getElementById('imagenesCount');

        if (!container) return;

        if (countSpan) {
            countSpan.textContent = this.imagenesSeleccionadas.length;
        }

        if (this.imagenesSeleccionadas.length === 0) {
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-images"></i>
                    <p>No hay imágenes seleccionadas</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.imagenesSeleccionadas.forEach((img, index) => {
            html += `
                <div class="preview-item">
                    <img src="${img.preview}" alt="Preview ${index + 1}">
                    <div class="preview-overlay">
                        <button type="button" class="preview-btn edit-btn" data-index="${index}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="preview-btn delete-btn" data-index="${index}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${img.edited ? '<span class="edited-badge"><i class="fas fa-check"></i> Editada</span>' : ''}
                    </div>
                    ${img.comentario ? `<div class="image-comment"><i class="fas fa-comment"></i> ${this._escapeHTML(img.comentario.substring(0, 30))}${img.comentario.length > 30 ? '...' : ''}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this._editarImagen(parseInt(index));
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this._eliminarImagen(parseInt(index));
            });
        });
    }

    _editarImagen(index) {
        if (this.imageEditorModal && this.imagenesSeleccionadas[index]) {
            const img = this.imagenesSeleccionadas[index];
            this.imageEditorModal.show(
                img.file,
                index,
                img.comentario,
                (savedIndex, editedFile, comentario, elementos) => {
                    this.imagenesSeleccionadas[savedIndex].file = editedFile;
                    this.imagenesSeleccionadas[savedIndex].comentario = comentario;
                    this.imagenesSeleccionadas[savedIndex].elementos = elementos;
                    this.imagenesSeleccionadas[savedIndex].edited = true;

                    if (this.imagenesSeleccionadas[savedIndex].preview) {
                        URL.revokeObjectURL(this.imagenesSeleccionadas[savedIndex].preview);
                    }
                    this.imagenesSeleccionadas[savedIndex].preview = URL.createObjectURL(editedFile);

                    this._actualizarVistaPreviaImagenes();
                }
            );
        }
    }

    _eliminarImagen(index) {
        Swal.fire({
            title: '¿Eliminar imagen?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                if (this.imagenesSeleccionadas[index].preview) {
                    URL.revokeObjectURL(this.imagenesSeleccionadas[index].preview);
                }
                this.imagenesSeleccionadas.splice(index, 1);
                this._actualizarVistaPreviaImagenes();
            }
        });
    }

    // =============================================
    // NUEVO MÉTODO: VALIDAR Y MOSTRAR OPCIONES (MODIFICADO)
    // =============================================
    async _validarYMostrarOpciones() {
        const sucursalInput = document.getElementById('sucursalIncidencia');
        const categoriaInput = document.getElementById('categoriaIncidencia');

        const sucursalId = sucursalInput.dataset.selectedId;
        const categoriaId = categoriaInput.dataset.selectedId;

        if (!sucursalId) {
            this._mostrarError('⚠️ Es necesario seleccionar una sucursal primero');
            sucursalInput.focus();
            return;
        }

        if (!categoriaId) {
            this._mostrarError('Debe seleccionar una categoría válida de la lista');
            categoriaInput.focus();
            return;
        }

        const riesgoSelect = document.getElementById('nivelRiesgo');
        const nivelRiesgo = riesgoSelect.value;
        if (!nivelRiesgo) {
            this._mostrarError('Debe seleccionar el nivel de riesgo');
            riesgoSelect.focus();
            return;
        }

        const estadoSelect = document.getElementById('estadoIncidencia');
        const estado = estadoSelect.value;
        if (!estado) {
            this._mostrarError('Debe seleccionar el estado');
            estadoSelect.focus();
            return;
        }

        const fechaInput = document.getElementById('fechaHoraIncidencia');
        let fechaHora = fechaInput.value;

        if (!fechaHora) {
            this._mostrarError('Debe seleccionar fecha y hora');
            fechaInput.focus();
            return;
        }

        const fechaSeleccionada = new Date(fechaHora);
        const ahora = new Date();

        if (fechaSeleccionada > ahora) {
            this._mostrarError('No puede seleccionar una fecha futura');
            fechaInput.focus();
            return;
        }

        const detallesInput = document.getElementById('detallesIncidencia');
        const detalles = detallesInput.value.trim();
        if (!detalles) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción de la incidencia es obligatoria');
            detallesInput.focus();
            return;
        }
        if (detalles.length < 10) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción debe tener al menos 10 caracteres');
            detallesInput.focus();
            return;
        }
        if (detalles.length > LIMITES.DETALLES_INCIDENCIA) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError(`La descripción no puede exceder ${LIMITES.DETALLES_INCIDENCIA} caracteres`);
            detallesInput.focus();
            return;
        }
        detallesInput.classList.remove('is-invalid');

        const subcategoriaSelect = document.getElementById('subcategoriaIncidencia');
        const subcategoriaId = subcategoriaSelect.value;

        const sucursalNombre = sucursalInput.value;
        const categoriaNombre = categoriaInput.value;
        
        const subcategoriaNombre = subcategoriaId ? 
            subcategoriaSelect.options[subcategoriaSelect.selectedIndex]?.text : '';

        // Guardar datos validados
        const datos = {
            sucursalId,
            sucursalNombre,
            categoriaId,
            categoriaNombre,
            subcategoriaId: subcategoriaId || '',
            subcategoriaNombre: subcategoriaNombre || '',
            nivelRiesgo,
            estado,
            fechaHora,
            detalles,
            imagenes: this.imagenesSeleccionadas
        };

        // Mostrar SweetAlert con opciones (como en recuperación)
        const result = await Swal.fire({
            title: 'Confirmar creación de incidencia',
            html: `
                <div style="text-align: left;">
                    <p><strong><i class="fas fa-store"></i> Sucursal:</strong> ${this._escapeHTML(sucursalNombre)}</p>
                    <p><strong><i class="fas fa-tag"></i> Categoría:</strong> ${this._escapeHTML(categoriaNombre)}</p>
                    ${subcategoriaId ? `<p><strong><i class="fas fa-tags"></i> Subcategoría:</strong> ${this._escapeHTML(subcategoriaNombre)}</p>` : ''}
                    <p><strong><i class="fas fa-exclamation-triangle"></i> Riesgo:</strong> ${this._getRiesgoTexto(nivelRiesgo)}</p>
                    <p><strong><i class="fas fa-check-circle"></i> Estado:</strong> ${estado === 'pendiente' ? 'Pendiente' : 'Finalizada'}</p>
                    <p><strong><i class="fas fa-calendar"></i> Fecha:</strong> ${new Date(fechaHora).toLocaleString('es-MX')}</p>
                    <p><strong><i class="fas fa-images"></i> Evidencias:</strong> ${this.imagenesSeleccionadas.length} imagen(es)</p>
                </div>
                <hr>
                <p style="font-size: 12px; color: #aaa;">Selecciona una opción:</p>
            `,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="fas fa-check-circle"></i> Aceptar',
            denyButtonText: '<i class="fas fa-file-pdf"></i> Ver PDF',
            cancelButtonText: '<i class="fas fa-times"></i> Cerrar',
            confirmButtonColor: '#28a745',
            denyButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            reverseButtons: false
        });

        if (result.isConfirmed) {
            await this._guardarIncidencia(datos, null);
        } else if (result.isDenied) {
            await this._generarYMostrarPDFPreview(datos);
        } else {
            console.log('Usuario canceló');
        }
    }

    // =============================================
    // GENERAR Y MOSTRAR VISTA PREVIA PDF (AGREGADO)
    // =============================================
    async _generarYMostrarPDFPreview(datos) {
        Swal.fire({
            title: 'Generando vista previa...',
            text: 'Preparando el informe PDF con tus evidencias',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        await this._mostrarVistaPreviaPDF(datos);
        
        Swal.close();
    }

    // =============================================
    // GUARDAR INCIDENCIA (MODIFICADO para aceptar PDF blob)
    // =============================================
    async _guardarIncidencia(datos, pdfBlobPreGenerado = null) {
        const btnCrear = document.getElementById('btnCrearIncidencia');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check me-2"></i>Crear Incidencia';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
                btnCrear.disabled = true;
            }

            Swal.fire({
                title: 'Creando incidencia...',
                text: 'Subiendo imágenes y guardando información...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const fechaObj = new Date(datos.fechaHora);

            const incidenciaData = {
                sucursalId: datos.sucursalId,
                categoriaId: datos.categoriaId,
                subcategoriaId: datos.subcategoriaId || '',
                nivelRiesgo: datos.nivelRiesgo,
                estado: datos.estado,
                fechaInicio: fechaObj,
                detalles: datos.detalles,
                reportadoPorId: this.usuarioActual.id
            };

            const archivos = datos.imagenes.map(img => img.file);
            const imagenesConDatos = datos.imagenes.map(img => ({
                comentario: img.comentario,
                elementos: img.elementos,
                generatedName: img.generatedName
            }));

            const nuevaIncidencia = await this.incidenciaManager.crearIncidencia(
                incidenciaData,
                this.usuarioActual,
                archivos,
                imagenesConDatos
            );

            console.log('✅ Incidencia creada con', nuevaIncidencia.imagenes.length, 'imágenes');

            Swal.update({
                title: 'Generando PDF...',
                text: 'Creando documento de la incidencia...'
            });

            // Usar PDF pre-generado o generar uno nuevo
            let pdfBlob = pdfBlobPreGenerado;
            if (!pdfBlob) {
                const { generadorIPH } = await import('/components/iph-generator.js');
                pdfBlob = await generadorIPH.generarIPH(nuevaIncidencia, {
                    mostrarAlerta: false,
                    returnBlob: true
                });
            }

            if (pdfBlob && pdfBlob.size > 0) {
                console.log(`📦 PDF generado: ${(pdfBlob.size / 1024).toFixed(2)} KB`);
                
                const pdfFile = new File([pdfBlob], `incidencia_${nuevaIncidencia.id}.pdf`, { type: 'application/pdf' });
                const rutaPDF = nuevaIncidencia.getRutaPDF();
                
                const resultado = await this.incidenciaManager.subirArchivo(pdfFile, rutaPDF);
                
                await this.incidenciaManager.actualizarPDFIncidencia(
                    nuevaIncidencia.id,
                    resultado.url,
                    this.usuarioActual.organizacionCamelCase,
                    this.usuarioActual.id,
                    this.usuarioActual.nombreCompleto
                );
                
                console.log('✅ PDF subido exitosamente:', resultado.url);
            } else {
                console.warn('⚠️ PDF no se pudo generar, pero la incidencia ya está guardada');
            }

            Swal.close();

            const quiereCanalizar = await Swal.fire({
                icon: 'question',
                title: '¿Canalizar esta incidencia?',
                text: '¿Deseas canalizar esta incidencia a alguna área?',
                showCancelButton: true,
                confirmButtonText: 'SÍ, CANALIZAR',
                cancelButtonText: 'NO, FINALIZAR',
                confirmButtonColor: '#28a745'
            });

            let areasCanalizadas = [];

            if (quiereCanalizar.isConfirmed) {
                areasCanalizadas = await this._canalizarAreas(nuevaIncidencia.id, datos.detalles.substring(0, 50));
            }

            const totalCanalizaciones = areasCanalizadas.length;
            const mensajeCanalizacion = totalCanalizaciones > 0
                ? `Canalizada a ${totalCanalizaciones} ${totalCanalizaciones === 1 ? 'área' : 'áreas'}.`
                : 'No se canalizó a ninguna área.';

            const mensajePDF = pdfBlob && pdfBlob.size > 0
                ? '✅ El PDF se ha generado correctamente.'
                : '⚠️ El PDF no se pudo generar, pero la incidencia se guardó.';

            await Swal.fire({
                icon: 'success',
                title: '¡Incidencia creada!',
                html: `
                    <div style="text-align: left;">
                        <p>✅ Incidencia guardada con ${nuevaIncidencia.imagenes.length} imagen(es).</p>
                        <p>${mensajePDF}</p>
                        <p>${mensajeCanalizacion}</p>
                    </div>
                `,
                confirmButtonText: 'Ver incidencias',
                confirmButtonColor: '#28a745'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando incidencia:', error);
            Swal.close();
            this._mostrarError(error.message || 'No se pudo crear la incidencia');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    async _canalizarAreas(incidenciaId, incidenciaTitulo = '') {
        let continuar = true;
        let areasCanalizadas = [];

        while (continuar) {
            const { value: areaId, isConfirmed } = await Swal.fire({
                title: areasCanalizadas.length === 0 ? '¿Canalizar a un área?' : 'Canalizar a otra área',
                text: areasCanalizadas.length === 0
                    ? 'Selecciona el área a la que deseas canalizar esta incidencia'
                    : `Áreas actuales: ${areasCanalizadas.map(a => a.nombre).join(', ')}\n\nSelecciona otra área (o cancela para terminar)`,
                input: 'select',
                inputOptions: this.areas.reduce((opts, area) => {
                    if (!areasCanalizadas.some(a => a.id === area.id)) {
                        opts[area.id] = area.nombreArea;
                    }
                    return opts;
                }, {}),
                inputPlaceholder: 'Selecciona un área',
                showCancelButton: true,
                confirmButtonText: 'CANALIZAR',
                cancelButtonText: areasCanalizadas.length === 0 ? 'NO CANALIZAR' : 'FINALIZAR',
                confirmButtonColor: '#28a745',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Debes seleccionar un área';
                    }
                }
            });

            if (!isConfirmed) {
                continuar = false;
                break;
            }

            if (areaId) {
                const area = this.areas.find(a => a.id === areaId);
                if (area) {
                    areasCanalizadas.push({
                        id: area.id,
                        nombre: area.nombreArea
                    });

                    try {
                        const { doc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
                        const { db } = await import('/config/firebase-config.js');

                        const collectionName = `incidencias_${this.usuarioActual.organizacionCamelCase}`;
                        const incidenciaRef = doc(db, collectionName, incidenciaId);

                        await updateDoc(incidenciaRef, {
                            canalizaciones: arrayUnion({
                                areaId: area.id,
                                areaNombre: area.nombreArea,
                                fechaCanalizacion: new Date(),
                                canalizadoPor: this.usuarioActual.id,
                                canalizadoPorNombre: this.usuarioActual.nombreCompleto,
                                estado: 'pendiente'
                            })
                        });

                        await Swal.fire({
                            icon: 'success',
                            title: 'Área agregada',
                            text: `La incidencia ha sido canalizada a ${area.nombreArea}`,
                            timer: 1500,
                            showConfirmButton: false
                        });

                    } catch (error) {
                        console.error('Error guardando canalización:', error);
                        await Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo canalizar a esta área'
                        });
                    }
                }
            }
        }

        if (areasCanalizadas.length > 0) {
            await this._enviarNotificacionesCanalizacion(areasCanalizadas, incidenciaId, incidenciaTitulo);
        }

        return areasCanalizadas;
    }

    async _enviarNotificacionesCanalizacion(areas, incidenciaId, incidenciaTitulo) {
        try {
            const notificacionManager = await this._initNotificacionManager();

            if (!notificacionManager) {
                console.error('No se pudo inicializar notificacionManager');
                return;
            }

            const sucursalInput = document.getElementById('sucursalIncidencia');
            const categoriaInput = document.getElementById('categoriaIncidencia');
            const riesgoSelect = document.getElementById('nivelRiesgo');

            const areasFormateadas = areas.map(area => ({
                id: area.id,
                nombre: area.nombre
            }));

            console.log('📨 Enviando notificaciones a áreas:', areasFormateadas);
            console.log('👑 Administradores recibirán automáticamente la notificación');

            Swal.fire({
                title: 'Enviando notificaciones...',
                text: 'Notificando a colaboradores de las áreas y administradores',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const resultado = await notificacionManager.notificarMultiplesAreas({
                areas: areasFormateadas,
                incidenciaId: incidenciaId,
                incidenciaTitulo: incidenciaTitulo || 'Incidencia',
                sucursalId: sucursalInput?.dataset.selectedId || '',
                sucursalNombre: sucursalInput?.value || '',
                categoriaId: categoriaInput?.dataset.selectedId || '',
                categoriaNombre: categoriaInput?.value || '',
                nivelRiesgo: riesgoSelect?.value || 'medio',
                tipo: 'canalizacion',
                prioridad: riesgoSelect?.value === 'critico' ? 'urgente' : 'normal',
                remitenteId: this.usuarioActual.id,
                remitenteNombre: this.usuarioActual.nombreCompleto,
                organizacionCamelCase: this.usuarioActual.organizacionCamelCase,
                enviarPush: true
            });

            Swal.close();

            if (resultado.success) {
                let mensaje = `✅ Notificaciones enviadas:`;
                mensaje += `<br>👥 ${resultado.totalColaboradores} colaboradores en ${resultado.areas} áreas`;
                mensaje += `<br>👑 ${resultado.totalAdministradores} administradores`;

                if (resultado.push && resultado.push.enviados > 0) {
                    mensaje += `<br>📱 Push: ${resultado.push.enviados}/${resultado.push.total} enviados`;
                }

                console.log(mensaje);

                Swal.fire({
                    icon: 'success',
                    title: 'Notificaciones enviadas',
                    html: mensaje,
                    timer: 4000,
                    showConfirmButton: false
                });
            } else {
                console.error('❌ Error:', resultado.error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron enviar las notificaciones'
                });
            }

        } catch (error) {
            console.error('Error en _enviarNotificacionesCanalizacion:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        }
    }

    _volverALista() {
        this.imagenesSeleccionadas.forEach(img => {
            if (img.preview) {
                URL.revokeObjectURL(img.preview);
            }
        });
        window.location.href = '../incidencias/incidencias.html';
    }

    _cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.imagenesSeleccionadas.forEach(img => {
                    if (img.preview) {
                        URL.revokeObjectURL(img.preview);
                    }
                });
                this._volverALista();
            }
        });
    }

    _mostrarError(mensaje) {
        this._mostrarNotificacion(mensaje, 'error');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' :
                tipo === 'error' ? 'Error' :
                    tipo === 'warning' ? 'Advertencia' : 'Información',
            text: mensaje,
            icon: tipo,
            timer: duracion,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }

    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    _mostrarCargando(mensaje = 'Guardando...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${mensaje}</div>
        `;

        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }

    _ocultarCargando() {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.crearIncidenciaDebug = { controller: new CrearIncidenciaController() };
});