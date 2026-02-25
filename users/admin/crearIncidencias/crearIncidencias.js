// crearIncidencias.js - VERSIÓN COMPLETA CON BUSCADORES Y EDITOR MODAL
// Basado en el estilo de regiones

// Variable global para debugging
window.crearIncidenciaDebug = {
    estado: 'iniciando',
    controller: null
};

// LÍMITES DE CARACTERES
const LIMITES = {
    DETALLES_INCIDENCIA: 1000
};

// =============================================
// CLASE EDITOR DE IMAGEN MODAL
// =============================================
class ImageEditorModal {
    constructor() {
        this.modal = document.getElementById('imageEditorModal');
        this.canvas = document.getElementById('modalImageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.elements = [];
        this.currentTool = 'circle';
        this.currentColor = '#ff0000';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentFile = null;
        this.currentIndex = -1;
        this.onSaveCallback = null;
        this.comentario = '';

        this.init();
    }

    init() {
        if (!this.modal) return;

        // Configurar eventos del modal
        document.getElementById('btnCerrarModal')?.addEventListener('click', () => this.hide());
        document.getElementById('modalCancelar')?.addEventListener('click', () => this.hide());

        // Herramientas
        document.getElementById('modalToolCircle')?.addEventListener('click', () => {
            this.setTool('circle');
            document.getElementById('modalToolCircle').classList.add('active');
            document.getElementById('modalToolArrow').classList.remove('active');
        });

        document.getElementById('modalToolArrow')?.addEventListener('click', () => {
            this.setTool('arrow');
            document.getElementById('modalToolArrow').classList.add('active');
            document.getElementById('modalToolCircle').classList.remove('active');
        });

        // Color picker
        document.getElementById('modalColorPicker')?.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            document.getElementById('modalColorValue').textContent = e.target.value;
        });

        // Limpiar todo
        document.getElementById('modalLimpiarTodo')?.addEventListener('click', () => {
            this.elements = [];
            this.redrawCanvas();
        });

        // Guardar cambios
        document.getElementById('modalGuardarCambios')?.addEventListener('click', () => {
            this.saveImage();
        });

        // Eventos del canvas
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hide();
            }
        });
    }

    show(file, index, comentario = '', onSaveCallback) {
        this.currentFile = file;
        this.currentIndex = index;
        this.comentario = comentario;
        this.onSaveCallback = onSaveCallback;
        this.elements = [];

        // Establecer tool activo por defecto
        document.getElementById('modalToolCircle').classList.add('active');
        document.getElementById('modalToolArrow').classList.remove('active');
        this.currentTool = 'circle';

        // Cargar imagen
        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                // Ajustar canvas manteniendo proporción
                const maxWidth = 1200;
                const maxHeight = 800;
                let width = this.image.width;
                let height = this.image.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }

                this.canvas.width = width;
                this.canvas.height = height;
                this.redrawCanvas();

                document.getElementById('modalImageInfo').textContent =
                    `Editando: ${file.name} (${width}x${height})`;

                // Cargar comentario si existe
                document.getElementById('modalComentario').value = comentario || '';
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);

        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.image = null;
        this.elements = [];
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    redrawCanvas() {
        if (!this.ctx || !this.image) return;

        // Dibujar imagen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

        // Dibujar elementos
        this.elements.forEach(el => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = el.color;
            this.ctx.lineWidth = 3;
            this.ctx.fillStyle = this.hexToRgba(el.color, 0.2);

            if (el.type === 'circle') {
                this.ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.fill();
            } else if (el.type === 'arrow') {
                const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
                const arrowLength = 15;

                // Línea
                this.ctx.beginPath();
                this.ctx.moveTo(el.startX, el.startY);
                this.ctx.lineTo(el.endX, el.endY);
                this.ctx.stroke();

                // Punta de flecha
                this.ctx.beginPath();
                this.ctx.moveTo(el.endX, el.endY);
                this.ctx.lineTo(
                    el.endX - arrowLength * Math.cos(angle - Math.PI / 6),
                    el.endY - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                this.ctx.lineTo(
                    el.endX - arrowLength * Math.cos(angle + Math.PI / 6),
                    el.endY - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                this.ctx.closePath();
                this.ctx.fillStyle = el.color;
                this.ctx.fill();
            }
        });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    startDrawing(e) {
        if (!this.image) return;

        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.startX = (e.clientX - rect.left) * scaleX;
        this.startY = (e.clientY - rect.top) * scaleY;
    }

    draw(e) {
        if (!this.isDrawing || !this.image) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        // Redibujar para vista previa
        this.redrawCanvas();
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = 3;

        if (this.currentTool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(currentX - this.startX, 2) +
                Math.pow(currentY - this.startY, 2)
            );
            this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.fillStyle = this.hexToRgba(this.currentColor, 0.2);
            this.ctx.fill();
        } else if (this.currentTool === 'arrow') {
            // Línea
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();

            // Punta de flecha (preview)
            const angle = Math.atan2(currentY - this.startY, currentX - this.startX);
            const arrowLength = 15;

            this.ctx.beginPath();
            this.ctx.moveTo(currentX, currentY);
            this.ctx.lineTo(
                currentX - arrowLength * Math.cos(angle - Math.PI / 6),
                currentY - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            this.ctx.lineTo(
                currentX - arrowLength * Math.cos(angle + Math.PI / 6),
                currentY - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fill();
        }
    }

    stopDrawing() {
        if (!this.isDrawing || !this.image) return;

        // Guardar el elemento dibujado
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Necesitamos la última posición del mouse
        const lastMouseMove = (e) => {
            const currentX = (e.clientX - rect.left) * scaleX;
            const currentY = (e.clientY - rect.top) * scaleY;

            if (this.currentTool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(currentX - this.startX, 2) +
                    Math.pow(currentY - this.startY, 2)
                );

                // Solo guardar si el radio es significativo
                if (radius > 5) {
                    this.elements.push({
                        type: 'circle',
                        x: this.startX,
                        y: this.startY,
                        radius: radius,
                        color: this.currentColor
                    });
                }
            } else if (this.currentTool === 'arrow') {
                const distance = Math.sqrt(
                    Math.pow(currentX - this.startX, 2) +
                    Math.pow(currentY - this.startY, 2)
                );

                // Solo guardar si la distancia es significativa
                if (distance > 5) {
                    this.elements.push({
                        type: 'arrow',
                        startX: this.startX,
                        startY: this.startY,
                        endX: currentX,
                        endY: currentY,
                        color: this.currentColor
                    });
                }
            }

            this.redrawCanvas();
            document.removeEventListener('mousemove', lastMouseMove);
        };

        document.addEventListener('mousemove', lastMouseMove);
        this.isDrawing = false;
    }

    saveImage() {
        if (!this.canvas || !this.currentFile) return;

        // Obtener comentario
        const comentario = document.getElementById('modalComentario').value;

        // Convertir canvas a blob
        this.canvas.toBlob((blob) => {
            // Crear nuevo archivo con las ediciones
            const editedFile = new File([blob], `edited_${this.currentFile.name}`, {
                type: 'image/png'
            });

            // Llamar callback con el archivo editado y comentario
            if (this.onSaveCallback) {
                this.onSaveCallback(this.currentIndex, editedFile, comentario, this.elements);
            }

            this.hide();
        }, 'image/png');
    }
}

// =============================================
// CLASE PRINCIPAL - CrearIncidenciaController
// =============================================
class CrearIncidenciaController {
    constructor() {
        this.incidenciaManager = null;
        this.usuarioActual = null;
        this.sucursales = [];
        this.categorias = [];
        this.subcategoriasCache = {};
        this.categoriaSeleccionada = null;
        this.imagenesSeleccionadas = []; // { file, preview, comentario, elementos, edited }
        this.imageEditorModal = null;
        this.loadingOverlay = null;

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========

    async _init() {
        try {
            // 1. Cargar usuario
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            // 2. Inicializar IncidenciaManager
            await this._inicializarManager();

            // 3. Cargar datos relacionados (sucursales, categorías)
            await this._cargarDatosRelacionados();

            // 4. Configurar organización automática
            this._configurarOrganizacion();

            // 5. Inicializar fecha/hora
            this._inicializarDateTimePicker();

            // 6. Configurar eventos
            this._configurarEventos();

            // 7. Inicializar validaciones
            this._inicializarValidaciones();

            // 8. Inicializar modal editor
            this.imageEditorModal = new ImageEditorModal();

            window.crearIncidenciaDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
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
            flatpickr(fechaInput, {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                locale: "es",
                defaultDate: new Date(),
                minuteIncrement: 1
            });
        }
    }

    // ========== CARGA DE DATOS ==========

    async _cargarDatosRelacionados() {
        try {
            // Cargar sucursales
            await this._cargarSucursales();

            // Cargar categorías
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

            const selectSucursal = document.getElementById('sucursalIncidencia');
            if (selectSucursal) {
                if (this.sucursales.length === 0) {
                    selectSucursal.innerHTML = '<option value="">-- No hay sucursales disponibles --</option>';
                } else {
                    selectSucursal.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
                    this.sucursales.forEach(suc => {
                        const option = document.createElement('option');
                        option.value = suc.id;
                        option.textContent = suc.nombre;
                        selectSucursal.appendChild(option);
                    });
                }

                // Inicializar Select2 con búsqueda en tiempo real
                setTimeout(() => {
                    if (typeof $ !== 'undefined' && $.fn.select2) {
                        $(selectSucursal).select2({
                            placeholder: "Buscar sucursal...",
                            allowClear: true,
                            width: '100%',
                            minimumInputLength: 0,
                            language: {
                                noResults: function () {
                                    return "No se encontraron resultados";
                                },
                                searching: function () {
                                    return "Buscando...";
                                },
                                inputTooShort: function () {
                                    return "Escribe para buscar...";
                                }
                            },
                            matcher: function (params, data) {
                                // Búsqueda case-insensitive en tiempo real
                                if ($.trim(params.term) === '') {
                                    return data;
                                }

                                // Convertir a minúsculas para comparación
                                const term = params.term.toLowerCase();
                                const text = data.text.toLowerCase();

                                if (text.indexOf(term) > -1) {
                                    return data;
                                }

                                return null;
                            }
                        });

                        // Abrir el dropdown automáticamente al hacer clic
                        $(selectSucursal).next('.select2-container').find('.select2-selection').on('click', function () {
                            $(selectSucursal).select2('open');
                        });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error cargando sucursales:', error);
            const selectSucursal = document.getElementById('sucursalIncidencia');
            if (selectSucursal) {
                selectSucursal.innerHTML = '<option value="">-- Error cargando sucursales --</option>';
            }
            throw error;
        }
    }

    async _cargarCategorias() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            const categoriaManager = new CategoriaManager();

            this.categorias = await categoriaManager.obtenerTodasCategorias();

            const selectCategoria = document.getElementById('categoriaIncidencia');
            if (selectCategoria) {
                if (this.categorias.length === 0) {
                    selectCategoria.innerHTML = '<option value="">-- No hay categorías disponibles --</option>';
                } else {
                    selectCategoria.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
                    this.categorias.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.nombre;
                        selectCategoria.appendChild(option);
                    });
                }

                // Inicializar Select2 con búsqueda en tiempo real
                setTimeout(() => {
                    if (typeof $ !== 'undefined' && $.fn.select2) {
                        $(selectCategoria).select2({
                            placeholder: "Buscar categoría...",
                            allowClear: true,
                            width: '100%',
                            minimumInputLength: 0,
                            language: {
                                noResults: function () {
                                    return "No se encontraron resultados";
                                },
                                searching: function () {
                                    return "Buscando...";
                                },
                                inputTooShort: function () {
                                    return "Escribe para buscar...";
                                }
                            },
                            matcher: function (params, data) {
                                // Búsqueda case-insensitive en tiempo real
                                if ($.trim(params.term) === '') {
                                    return data;
                                }

                                // Convertir a minúsculas para comparación
                                const term = params.term.toLowerCase();
                                const text = data.text.toLowerCase();

                                if (text.indexOf(term) > -1) {
                                    return data;
                                }

                                return null;
                            }
                        });

                        // Abrir el dropdown automáticamente al hacer clic
                        $(selectCategoria).next('.select2-container').find('.select2-selection').on('click', function () {
                            $(selectCategoria).select2('open');
                        });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
            const selectCategoria = document.getElementById('categoriaIncidencia');
            if (selectCategoria) {
                selectCategoria.innerHTML = '<option value="">-- Error cargando categorías --</option>';
            }
            throw error;
        }
    }

    // ========== CARGA DE USUARIO ==========

    _cargarUsuario() {
        try {
            // PRIMERO: Intentar adminInfo (para administradores)
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
                    correo: adminData.correoElectronico || ''
                };
                return;
            }

            // SEGUNDO: Intentar userData
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

            // TERCERO: Datos por defecto (para desarrollo)
            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                correo: 'admin@centinela.com'
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

    // ========== APLICAR LÍMITES DE CARACTERES ==========

    _inicializarValidaciones() {
        // Campo detalles incidencia
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

        // Inicializar contadores
        this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
    }

    _actualizarContador(inputId, counterId, limite) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);

        if (input && counter) {
            const longitud = input.value.length;
            counter.textContent = `${longitud}/${limite}`;

            // Cambiar color si se acerca al límite
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

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    _configurarEventos() {
        try {
            // Botón Volver a la lista
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            const btnCancelar = document.getElementById('btnCancelar');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Botón Crear Incidencia
            const btnCrear = document.getElementById('btnCrearIncidencia');
            if (btnCrear) {
                btnCrear.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Botón Agregar Imágenes
            const btnAgregarImagen = document.getElementById('btnAgregarImagen');
            if (btnAgregarImagen) {
                btnAgregarImagen.addEventListener('click', () => {
                    document.getElementById('inputImagenes').click();
                });
            }

            // Input de imágenes
            const inputImagenes = document.getElementById('inputImagenes');
            if (inputImagenes) {
                inputImagenes.addEventListener('change', (e) => this._procesarImagenes(e.target.files));
            }

            // Formulario Submit
            const form = document.getElementById('formIncidenciaPrincipal');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Evento cambio de categoría (para cargar subcategorías)
            const selectCategoria = document.getElementById('categoriaIncidencia');
            if (selectCategoria) {
                selectCategoria.addEventListener('change', (e) => this._cargarSubcategorias(e.target.value));
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _procesarImagenes(files) {
        if (!files || files.length === 0) return;

        // Convertir FileList a Array
        const nuevosArchivos = Array.from(files);

        // Validar tamaño (máximo 5MB por imagen)
        const maxSize = 5 * 1024 * 1024; // 5MB
        const archivosValidos = nuevosArchivos.filter(file => {
            if (file.size > maxSize) {
                this._mostrarNotificacion(`La imagen ${file.name} excede 5MB`, 'warning');
                return false;
            }
            return true;
        });

        // Agregar a la lista
        archivosValidos.forEach(file => {
            this.imagenesSeleccionadas.push({
                file: file,
                preview: URL.createObjectURL(file),
                comentario: '',
                elementos: [],
                edited: false
            });
        });

        // Actualizar vista previa
        this._actualizarVistaPreviaImagenes();

        // Limpiar input
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
                    ${img.comentario ? `<div class="image-comment"><i class="fas fa-comment"></i> ${img.comentario.substring(0, 30)}${img.comentario.length > 30 ? '...' : ''}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        // Agregar eventos a los botones
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
                    // Actualizar imagen con los cambios
                    this.imagenesSeleccionadas[savedIndex].file = editedFile;
                    this.imagenesSeleccionadas[savedIndex].comentario = comentario;
                    this.imagenesSeleccionadas[savedIndex].elementos = elementos;
                    this.imagenesSeleccionadas[savedIndex].edited = true;

                    // Actualizar preview URL
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
                // Liberar URL object
                if (this.imagenesSeleccionadas[index].preview) {
                    URL.revokeObjectURL(this.imagenesSeleccionadas[index].preview);
                }
                this.imagenesSeleccionadas.splice(index, 1);
                this._actualizarVistaPreviaImagenes();
            }
        });
    }

    async _cargarSubcategorias(categoriaId) {
        const selectSubcategoria = document.getElementById('subcategoriaIncidencia');
        if (!selectSubcategoria) return;

        if (!categoriaId) {
            selectSubcategoria.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            selectSubcategoria.disabled = true;
            return;
        }

        const categoria = this.categorias.find(c => c.id === categoriaId);
        if (!categoria) return;

        this.categoriaSeleccionada = categoria;

        try {
            let subcategoriasArray = [];

            if (categoria.subcategorias) {
                if (typeof categoria.subcategorias.forEach === 'function') {
                    categoria.subcategorias.forEach((value, key) => {
                        if (value && typeof value === 'object') {
                            const sub = value instanceof Map ? Object.fromEntries(value) : value;
                            subcategoriasArray.push({ ...sub, id: key });
                        }
                    });
                } else {
                    subcategoriasArray = Object.keys(categoria.subcategorias).map(key => ({
                        ...categoria.subcategorias[key],
                        id: key
                    }));
                }
            }

            if (subcategoriasArray.length === 0) {
                selectSubcategoria.innerHTML = '<option value="">-- No hay subcategorías disponibles --</option>';
                selectSubcategoria.disabled = true;
                return;
            }

            selectSubcategoria.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            subcategoriasArray.forEach(sub => {
                if (sub.nombre) {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nombre;
                    selectSubcategoria.appendChild(option);
                }
            });
            selectSubcategoria.disabled = false;

        } catch (error) {
            console.error('Error cargando subcategorías:', error);
            selectSubcategoria.innerHTML = '<option value="">-- Error cargando subcategorías --</option>';
            selectSubcategoria.disabled = true;
        }
    }

    // ========== VALIDACIÓN Y GUARDADO ==========

    _validarYGuardar() {
        // Validar sucursal
        const sucursalSelect = document.getElementById('sucursalIncidencia');
        const sucursalId = sucursalSelect.value;
        if (!sucursalId) {
            this._mostrarError('Debe seleccionar una sucursal');
            return;
        }

        // Validar categoría
        const categoriaSelect = document.getElementById('categoriaIncidencia');
        const categoriaId = categoriaSelect.value;
        if (!categoriaId) {
            this._mostrarError('Debe seleccionar una categoría');
            return;
        }

        // Validar nivel de riesgo
        const riesgoSelect = document.getElementById('nivelRiesgo');
        const nivelRiesgo = riesgoSelect.value;
        if (!nivelRiesgo) {
            this._mostrarError('Debe seleccionar el nivel de riesgo');
            return;
        }

        // Validar estado
        const estadoSelect = document.getElementById('estadoIncidencia');
        const estado = estadoSelect.value;
        if (!estado) {
            this._mostrarError('Debe seleccionar el estado');
            return;
        }

        // Validar fecha/hora
        const fechaInput = document.getElementById('fechaHoraIncidencia');
        const fechaHora = fechaInput.value;
        if (!fechaHora) {
            this._mostrarError('Debe seleccionar fecha y hora');
            return;
        }

        // Validar detalles
        const detallesInput = document.getElementById('detallesIncidencia');
        const detalles = detallesInput.value.trim();
        if (!detalles) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción de la incidencia es obligatoria');
            return;
        }
        if (detalles.length < 10) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción debe tener al menos 10 caracteres');
            return;
        }
        if (detalles.length > LIMITES.DETALLES_INCIDENCIA) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError(`La descripción no puede exceder ${LIMITES.DETALLES_INCIDENCIA} caracteres`);
            return;
        }
        detallesInput.classList.remove('is-invalid');

        // Obtener subcategoría
        const subcategoriaSelect = document.getElementById('subcategoriaIncidencia');
        const subcategoriaId = subcategoriaSelect.value;

        // Confirmar antes de guardar
        this._confirmarYGuardar({
            sucursalId,
            categoriaId,
            subcategoriaId: subcategoriaId || '',
            nivelRiesgo,
            estado,
            fechaHora,
            detalles,
            imagenes: this.imagenesSeleccionadas
        });
    }

    async _confirmarYGuardar(datos) {
        // Obtener nombres para mostrar en confirmación
        const sucursal = this.sucursales.find(s => s.id === datos.sucursalId);
        const categoria = this.categorias.find(c => c.id === datos.categoriaId);

        const riesgoTexto = {
            'bajo': 'Bajo',
            'medio': 'Medio',
            'alto': 'Alto',
            'critico': 'Crítico'
        }[datos.nivelRiesgo] || datos.nivelRiesgo;

        const estadoTexto = {
            'pendiente': 'Pendiente',
            'finalizada': 'Finalizada'
        }[datos.estado] || datos.estado;

        const imagenesConComentarios = datos.imagenes.filter(img => img.comentario).length;

        const confirmResult = await Swal.fire({
            title: '¿Crear incidencia?',
            html: `
                <div style="text-align: left; max-height: 400px; overflow-y: auto;">
                    <p><strong>Organización:</strong> ${this.usuarioActual.organizacion}</p>
                    <p><strong>Sucursal:</strong> ${sucursal?.nombre || 'No especificada'}</p>
                    <p><strong>Categoría:</strong> ${categoria?.nombre || 'No especificada'}</p>
                    <p><strong>Nivel de Riesgo:</strong> 
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; 
                            background: ${this._getRiesgoColor(datos.nivelRiesgo)}20; 
                            color: ${this._getRiesgoColor(datos.nivelRiesgo)};">
                            ${riesgoTexto}
                        </span>
                    </p>
                    <p><strong>Estado:</strong> ${estadoTexto}</p>
                    <p><strong>Fecha/Hora:</strong> ${datos.fechaHora}</p>
                    <p><strong>Descripción:</strong><br>
                        <span style="color: var(--color-text-secondary);">${this._escapeHTML(datos.detalles.substring(0, 200))}${datos.detalles.length > 200 ? '...' : ''}</span>
                    </p>
                    <p><strong>Imágenes:</strong> ${datos.imagenes.length} seleccionada(s)</p>
                    ${imagenesConComentarios > 0 ? `<p><strong>Con comentarios:</strong> ${imagenesConComentarios}</p>` : ''}
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'CREAR INCIDENCIA',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#28a745',
            reverseButtons: false
        });

        if (confirmResult.isConfirmed) {
            await this._guardarIncidencia(datos);
        }
    }

    _getRiesgoColor(nivel) {
        const colores = {
            'bajo': '#28a745',
            'medio': '#ffc107',
            'alto': '#fd7e14',
            'critico': '#dc3545'
        };
        return colores[nivel] || '#28a745';
    }

    async _guardarIncidencia(datos) {
        const btnCrear = document.getElementById('btnCrearIncidencia');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check me-2"></i>Crear Incidencia';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
                btnCrear.disabled = true;
            }

            this._mostrarCargando('Creando incidencia y subiendo imágenes...');

            // Preparar fecha
            const fechaObj = new Date(datos.fechaHora);

            // Preparar datos para la incidencia
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

            // Extraer archivos de las imágenes
            const archivos = datos.imagenes.map(img => img.file);

            // Crear la incidencia usando el manager
            const nuevaIncidencia = await this.incidenciaManager.crearIncidencia(
                incidenciaData,
                this.usuarioActual,
                archivos
            );

            this._ocultarCargando();

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Incidencia creada!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>ID:</strong> <span style="color: var(--color-accent-primary);">${nuevaIncidencia.id}</span></p>
                        <p><strong>Sucursal:</strong> ${datos.sucursalId}</p>
                        <p><strong>Categoría:</strong> ${datos.categoriaId}</p>
                        <p><strong>Imágenes subidas:</strong> ${datos.imagenes.length}</p>
                    </div>
                `,
                confirmButtonText: 'Ver incidencias'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando incidencia:', error);
            this._ocultarCargando();
            this._mostrarError(error.message || 'No se pudo crear la incidencia');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    // ========== NAVEGACIÓN ==========

    _volverALista() {
        window.location.href = '/users/admin/incidencias/incidencias.html';
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
                // Liberar URLs de objetos
                this.imagenesSeleccionadas.forEach(img => {
                    if (img.preview) {
                        URL.revokeObjectURL(img.preview);
                    }
                });
                this._volverALista();
            }
        });
    }

    _redirigirAlLogin() {
        Swal.fire({
            icon: 'error',
            title: 'Sesión no válida',
            text: 'Debes iniciar sesión para continuar',
            confirmButtonText: 'Ir al login'
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
    }

    // ========== UTILIDADES ==========

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

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    window.crearIncidenciaDebug.controller = new CrearIncidenciaController();
});