// seguimientoIncidencia.js - VERSIÓN CORREGIDA (TIMELINE SIMPLE SIN PUNTOS)

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let usuarioActual = null;
let incidenciaActual = null;
let sucursalesMap = new Map();
let categoriasMap = new Map();
let evidenciasSeleccionadas = []; // Array de objetos { file, preview, comentario, elementos, edited }
let fechaIncidencia = null;
let fechaMinima = null;
let fechaMaxima = null;
let fechaUltimoSeguimiento = null;
let imageEditorModal = null;
let historialCollapsed = false;

// LÍMITES DE CARACTERES
const LIMITES = {
    DESCRIPCION_SEGUIMIENTO: 500
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

        document.getElementById('btnCerrarModal')?.addEventListener('click', () => this.hide());
        document.getElementById('modalCancelar')?.addEventListener('click', () => this.hide());

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

        document.getElementById('modalColorPicker')?.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            document.getElementById('modalColorValue').textContent = e.target.value;
        });

        document.getElementById('modalLimpiarTodo')?.addEventListener('click', () => {
            this.elements = [];
            this.redrawCanvas();
        });

        document.getElementById('modalGuardarCambios')?.addEventListener('click', () => {
            this.saveImage();
        });

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

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

        document.getElementById('modalToolCircle').classList.add('active');
        document.getElementById('modalToolArrow').classList.remove('active');
        this.currentTool = 'circle';

        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                const maxWidth = 1000;
                const maxHeight = 700;
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
                    `Editando: ${file.name} (${Math.round(width)}x${Math.round(height)})`;

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

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

        this.elements.forEach(el => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = el.color;
            this.ctx.lineWidth = 3;
            
            if (el.type === 'circle') {
                this.ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI);
                this.ctx.stroke();
            } else if (el.type === 'arrow') {
                const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
                const arrowLength = 15;

                this.ctx.beginPath();
                this.ctx.moveTo(el.startX, el.startY);
                this.ctx.lineTo(el.endX, el.endY);
                this.ctx.stroke();

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
        } else if (this.currentTool === 'arrow') {
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();

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

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const lastMouseHandler = (e) => {
            const currentX = (e.clientX - rect.left) * scaleX;
            const currentY = (e.clientY - rect.top) * scaleY;

            if (this.currentTool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(currentX - this.startX, 2) +
                    Math.pow(currentY - this.startY, 2)
                );

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
            document.removeEventListener('mousemove', lastMouseHandler);
        };

        document.addEventListener('mousemove', lastMouseHandler);
        this.isDrawing = false;
    }

    saveImage() {
        if (!this.canvas || !this.currentFile) return;

        const comentario = document.getElementById('modalComentario').value;

        this.canvas.toBlob((blob) => {
            const editedFile = new File([blob], `edited_${this.currentFile.name}`, {
                type: 'image/png'
            });

            if (this.onSaveCallback) {
                this.onSaveCallback(this.currentIndex, editedFile, comentario, this.elements);
            }

            this.hide();
        }, 'image/png');
    }
}

// =============================================
// FUNCIÓN PARA COLLAPSIBLE
// =============================================
function configurarCollapsible() {
    const historialHeader = document.getElementById('historialHeader');
    const historialContent = document.getElementById('historialContent');
    const historialToggle = document.getElementById('historialToggle');

    if (!historialHeader || !historialContent || !historialToggle) return;

    historialHeader.addEventListener('click', () => {
        historialCollapsed = !historialCollapsed;
        
        if (historialCollapsed) {
            historialContent.style.display = 'none';
            historialToggle.style.transform = 'rotate(-90deg)';
        } else {
            historialContent.style.display = 'block';
            historialToggle.style.transform = 'rotate(0deg)';
        }
    });
}

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarSeguimiento() {
    try {
        console.log('Inicializando seguimiento de incidencia...');

        const urlParams = new URLSearchParams(window.location.search);
        const incidenciaId = urlParams.get('id');

        if (!incidenciaId) {
            throw new Error('No se especificó el ID de la incidencia');
        }

        cargarUsuario();

        if (!usuarioActual) {
            throw new Error('No se pudo cargar información del usuario');
        }

        await inicializarIncidenciaManager();
        await cargarIncidencia(incidenciaId);
        await cargarDatosRelacionados();
        
        mostrarInfoIncidencia();
        mostrarEvidenciasOriginales();
        mostrarHistorialSeguimiento();
        configurarFechaSeguimiento();
        configurarEventos();
        inicializarValidaciones();
        configurarCollapsible();

        imageEditorModal = new ImageEditorModal();

        console.log('Seguimiento inicializado correctamente');

    } catch (error) {
        console.error('Error inicializando:', error);
        mostrarError('Error al inicializar: ' + error.message);
        
        const container = document.querySelector('.custom-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" style="margin: 20px; padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error al cargar la incidencia</h4>
                    <p>${error.message}</p>
                    <button class="btn-volver" onclick="window.location.href='/users/admin/incidencias/incidencias.html'" style="margin-top: 15px;">
                        <i class="fas fa-arrow-left"></i> Volver a la lista
                    </button>
                </div>
            `;
        }
    }
}

async function inicializarIncidenciaManager() {
    try {
        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();
    } catch (error) {
        console.error('Error cargando IncidenciaManager:', error);
        throw error;
    }
}

function cargarUsuario() {
    try {
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            usuarioActual = {
                id: user.id || user.uid || `user_${Date.now()}`,
                uid: user.uid || user.id,
                nombreCompleto: user.nombreCompleto || user.nombre || 'Usuario',
                organizacion: user.organizacion || 'Sin organización',
                organizacionCamelCase: user.organizacionCamelCase || generarCamelCase(user.organizacion),
                correo: user.correo || user.email || ''
            };
            return;
        }

        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const adminData = JSON.parse(adminInfo);
            usuarioActual = {
                id: adminData.id || adminData.uid || `admin_${Date.now()}`,
                uid: adminData.uid || adminData.id,
                nombreCompleto: adminData.nombreCompleto || 'Administrador',
                organizacion: adminData.organizacion || 'Sin organización',
                organizacionCamelCase: adminData.organizacionCamelCase || generarCamelCase(adminData.organizacion),
                correo: adminData.correoElectronico || ''
            };
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            usuarioActual = {
                id: userData.uid || userData.id || `user_${Date.now()}`,
                uid: userData.uid || userData.id,
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                organizacionCamelCase: userData.organizacionCamelCase || generarCamelCase(userData.organizacion || userData.empresa),
                correo: userData.correo || userData.email || ''
            };
            return;
        }

        throw new Error('No hay sesión activa');

    } catch (error) {
        console.error('Error cargando usuario:', error);
        throw error;
    }
}

function generarCamelCase(texto) {
    if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

async function cargarIncidencia(incidenciaId) {
    try {
        incidenciaActual = await incidenciaManager.getIncidenciaById(
            incidenciaId,
            usuarioActual.organizacionCamelCase
        );

        if (!incidenciaActual) {
            throw new Error('Incidencia no encontrada');
        }

        fechaIncidencia = incidenciaActual.fechaInicio;
        
        // Obtener la fecha del último seguimiento
        const seguimientos = incidenciaActual.getSeguimientosArray();
        if (seguimientos.length > 0) {
            fechaUltimoSeguimiento = seguimientos[seguimientos.length - 1].fecha;
        } else {
            fechaUltimoSeguimiento = fechaIncidencia;
        }
        
        fechaMinima = fechaUltimoSeguimiento; // No puede ser antes del último seguimiento
        fechaMaxima = new Date();

        document.getElementById('incidenciaId').textContent = incidenciaActual.id;

    } catch (error) {
        console.error('Error cargando incidencia:', error);
        throw error;
    }
}

async function cargarDatosRelacionados() {
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();
        const sucursales = await sucursalManager.getSucursalesByOrganizacion(
            usuarioActual.organizacionCamelCase
        );
        
        sucursales.forEach(suc => {
            sucursalesMap.set(suc.id, suc);
        });

        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        const categorias = await categoriaManager.obtenerTodasCategorias();
        
        categorias.forEach(cat => {
            categoriasMap.set(cat.id, cat);
        });

    } catch (error) {
        console.error('Error cargando datos relacionados:', error);
    }
}

// =============================================
// CONFIGURACIÓN DE FECHA
// =============================================
function configurarFechaSeguimiento() {
    const fechaInput = document.getElementById('fechaSeguimiento');
    if (!fechaInput) return;

    const ahora = new Date();

    if (typeof flatpickr !== 'undefined') {
        flatpickr(fechaInput, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            locale: "es",
            defaultDate: ahora,
            minuteIncrement: 1,
            minDate: fechaMinima,
            maxDate: fechaMaxima,
            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    validarFechaSeguimiento(selectedDates[0]);
                }
            }
        });
    } else {
        fechaInput.type = 'datetime-local';
        fechaInput.value = ahora.toISOString().slice(0, 16);
        fechaInput.min = fechaMinima ? new Date(fechaMinima).toISOString().slice(0, 16) : '';
        fechaInput.max = fechaMaxima ? new Date(fechaMaxima).toISOString().slice(0, 16) : '';
    }

    const helpText = document.getElementById('rangoFechaHelp');
    if (helpText) {
        const fechaMin = formatearFechaParaHelp(fechaMinima);
        const fechaMax = formatearFechaParaHelp(fechaMaxima);
        helpText.innerHTML = `<i class="fas fa-info-circle"></i> Rango permitido: ${fechaMin} - ${fechaMax}`;
    }
}

function formatearFechaParaHelp(fecha) {
    if (!fecha) return 'No disponible';
    try {
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Fecha inválida';
    }
}

function validarFechaSeguimiento(fecha) {
    if (!fecha) return true;

    if (fecha < fechaMinima) {
        mostrarError(`La fecha del seguimiento no puede ser anterior al último seguimiento (${formatearFechaCompacta(fechaMinima)})`);
        return false;
    }

    if (fecha > fechaMaxima) {
        mostrarError('La fecha del seguimiento no puede ser posterior a la fecha actual');
        return false;
    }

    return true;
}

// =============================================
// MOSTRAR INFORMACIÓN
// =============================================
function mostrarInfoIncidencia() {
    if (!incidenciaActual) return;

    document.getElementById('infoOrganizacion').textContent = usuarioActual.organizacion;

    const sucursal = sucursalesMap.get(incidenciaActual.sucursalId);
    document.getElementById('infoSucursal').textContent = sucursal ? sucursal.nombre : incidenciaActual.sucursalId;

    const categoria = categoriasMap.get(incidenciaActual.categoriaId);
    document.getElementById('infoCategoria').textContent = categoria ? categoria.nombre : incidenciaActual.categoriaId;

    let subcategoriaNombre = incidenciaActual.subcategoriaId || 'No especificada';
    if (incidenciaActual.subcategoriaId && categoria && categoria.subcategorias) {
        if (categoria.subcategorias instanceof Map) {
            const sub = categoria.subcategorias.get(incidenciaActual.subcategoriaId);
            if (sub) subcategoriaNombre = sub.nombre || incidenciaActual.subcategoriaId;
        } else if (typeof categoria.subcategorias === 'object') {
            const sub = categoria.subcategorias[incidenciaActual.subcategoriaId];
            if (sub) subcategoriaNombre = sub.nombre || incidenciaActual.subcategoriaId;
        }
    }
    document.getElementById('infoSubcategoria').textContent = subcategoriaNombre;

    const riesgoSpan = document.getElementById('infoRiesgo');
    const riesgoTexto = incidenciaActual.getNivelRiesgoTexto ? 
        incidenciaActual.getNivelRiesgoTexto() : incidenciaActual.nivelRiesgo;
    const riesgoColor = incidenciaActual.getNivelRiesgoColor ? 
        incidenciaActual.getNivelRiesgoColor() : obtenerRiesgoColor(incidenciaActual.nivelRiesgo);
    
    riesgoSpan.innerHTML = `<span class="riesgo-badge" style="background: ${riesgoColor}20; color: ${riesgoColor};">${riesgoTexto}</span>`;

    const estadoSpan = document.getElementById('infoEstado');
    const estadoTexto = incidenciaActual.getEstadoTexto ? 
        incidenciaActual.getEstadoTexto() : incidenciaActual.estado;
    const estadoColor = incidenciaActual.getEstadoColor ? 
        incidenciaActual.getEstadoColor() : (incidenciaActual.estado === 'finalizada' ? '#28a745' : '#ffc107');
    
    estadoSpan.innerHTML = `<span class="estado-badge" style="background: ${estadoColor}20; color: ${estadoColor};">${estadoTexto}</span>`;
    
    const estadoSelect = document.getElementById('estadoSeguimiento');
    if (estadoSelect) {
        estadoSelect.value = incidenciaActual.estado;
    }

    document.getElementById('infoFechaInicio').textContent = incidenciaActual.getFechaInicioFormateada ?
        incidenciaActual.getFechaInicioFormateada() : formatearFecha(incidenciaActual.fechaInicio);

    document.getElementById('infoReportadoPor').textContent = incidenciaActual.creadoPorNombre || 'No especificado';
    document.getElementById('infoDescripcion').textContent = incidenciaActual.detalles || 'Sin descripción';
}

function obtenerRiesgoColor(nivel) {
    const colores = {
        'bajo': '#28a745',
        'medio': '#ffc107',
        'alto': '#fd7e14',
        'critico': '#dc3545'
    };
    return colores[nivel] || '#28a745';
}

function formatearFecha(fecha) {
    if (!fecha) return 'No disponible';
    try {
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Fecha inválida';
    }
}

function formatearFechaCompacta(fecha) {
    if (!fecha) return 'N/A';
    try {
        // Si es timestamp de Firestore
        if (fecha && typeof fecha === 'object' && 'seconds' in fecha) {
            const date = new Date(fecha.seconds * 1000);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Fecha inválida';
    }
}

// =============================================
// MOSTRAR EVIDENCIAS ORIGINALES
// =============================================
function mostrarEvidenciasOriginales() {
    const container = document.getElementById('galeriaOriginal');
    const totalSpan = document.getElementById('totalImagenesOriginales');
    
    if (!container) return;

    const imagenes = incidenciaActual.imagenes || [];

    if (totalSpan) {
        totalSpan.textContent = `${imagenes.length} ${imagenes.length === 1 ? 'imagen' : 'imágenes'}`;
    }

    if (imagenes.length === 0) {
        container.innerHTML = `
            <div class="no-images">
                <i class="fas fa-images"></i>
                <p>No hay evidencias originales</p>
            </div>
        `;
        return;
    }

    let html = '';
    imagenes.forEach((img, index) => {
        const url = typeof img === 'string' ? img : img.url;
        const comentario = typeof img === 'object' && img.comentario ? img.comentario : '';
        
        html += `
            <div class="gallery-item" ${comentario ? `title="${escapeHTML(comentario)}"` : ''}>
                <img src="${url}" alt="Evidencia ${index + 1}" loading="lazy" onclick="window.open('${url}', '_blank')">
                <div class="gallery-overlay">
                    <button type="button" class="gallery-btn" onclick="window.open('${url}', '_blank')">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
                ${comentario ? `<div class="image-comment"><i class="fas fa-comment"></i> ${escapeHTML(comentario.substring(0, 30))}${comentario.length > 30 ? '...' : ''}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// =============================================
// MOSTRAR HISTORIAL DE SEGUIMIENTO (VERSIÓN SIMPLE - SIN PUNTOS)
// =============================================
function mostrarHistorialSeguimiento() {
    const container = document.getElementById('timelineSeguimientos');
    const totalSpan = document.getElementById('totalSeguimientos');
    
    if (!container || !incidenciaActual) return;

    const seguimientos = incidenciaActual.getSeguimientosArray ? 
        incidenciaActual.getSeguimientosArray() : [];

    if (totalSpan) {
        totalSpan.textContent = `${seguimientos.length} ${seguimientos.length === 1 ? 'seguimiento' : 'seguimientos'}`;
    }

    if (seguimientos.length === 0) {
        container.innerHTML = `
            <div class="timeline-empty">
                <i class="fas fa-clock"></i>
                <p>No hay seguimientos registrados</p>
            </div>
        `;
        return;
    }

    // Ordenar del más antiguo al más reciente para mostrar en orden cronológico
    const seguimientosOrdenados = [...seguimientos].sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha) : 0;
        const fechaB = b.fecha ? new Date(b.fecha) : 0;
        return fechaA - fechaB;
    });

    let html = '<div class="timeline-simple">';
    seguimientosOrdenados.forEach((seg, index) => {
        const fecha = seg.fecha ? formatearFechaCompacta(seg.fecha) : 'Fecha no disponible';
        const evidencias = seg.evidencias || [];
        const idSeguimiento = seg.id || `SEG-${index + 1}`;
        
        html += `
            <div class="timeline-simple-item">
                <div class="timeline-simple-content">
                    <div class="timeline-simple-header">
                        <div class="timeline-simple-user">
                            <span class="timeline-simple-name">${escapeHTML(seg.usuarioNombre || 'Usuario')}</span>
                            <span class="timeline-simple-badge">${idSeguimiento}</span>
                        </div>
                        <div class="timeline-simple-date">
                            <i class="far fa-calendar-alt"></i>
                            <span>${fecha}</span>
                        </div>
                    </div>
                    
                    <div class="timeline-simple-description">
                        ${escapeHTML(seg.descripcion || 'Sin descripción')}
                    </div>
        `;

        if (evidencias.length > 0) {
            html += `
                    <div class="timeline-simple-evidencias">
                        <div class="timeline-simple-evidencias-header">
                            <i class="fas fa-images"></i>
                            <span>${evidencias.length} ${evidencias.length === 1 ? 'evidencia' : 'evidencias'}</span>
                        </div>
                        <div class="timeline-simple-evidencias-grid">
            `;

            evidencias.forEach((ev, evIndex) => {
                const url = typeof ev === 'string' ? ev : ev.url;
                const comentario = typeof ev === 'object' && ev.comentario ? ev.comentario : '';
                
                html += `
                            <div class="timeline-simple-evidencia" onclick="window.open('${url}', '_blank')">
                                <img src="${url}" alt="Evidencia ${evIndex + 1}" loading="lazy">
                                ${comentario ? `<div class="timeline-simple-evidencia-comentario" title="${escapeHTML(comentario)}">${escapeHTML(comentario.substring(0, 30))}${comentario.length > 30 ? '...' : ''}</div>` : ''}
                            </div>
                `;
            });

            html += `
                        </div>
                    </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// =============================================
// CONFIGURACIÓN DE EVENTOS
// =============================================
function configurarEventos() {
    try {
        document.getElementById('btnVolverLista')?.addEventListener('click', () => volverALista());
        document.getElementById('btnCancelar')?.addEventListener('click', () => cancelar());

        document.getElementById('btnGuardarSeguimiento')?.addEventListener('click', (e) => {
            e.preventDefault();
            validarYGuardar();
        });

        document.getElementById('btnAgregarEvidencias')?.addEventListener('click', () => {
            document.getElementById('inputEvidencias').click();
        });

        document.getElementById('inputEvidencias')?.addEventListener('change', (e) => procesarEvidencias(e.target.files));

        document.getElementById('formSeguimiento')?.addEventListener('submit', (e) => {
            e.preventDefault();
            validarYGuardar();
        });

    } catch (error) {
        console.error('Error configurando eventos:', error);
    }
}

// =============================================
// EVIDENCIAS
// =============================================
function procesarEvidencias(files) {
    if (!files || files.length === 0) return;

    const nuevosArchivos = Array.from(files);
    const maxSize = 5 * 1024 * 1024;

    const archivosValidos = nuevosArchivos.filter(file => {
        if (file.size > maxSize) {
            mostrarNotificacion(`La imagen ${file.name} excede 5MB`, 'warning');
            return false;
        }
        return true;
    });

    archivosValidos.forEach(file => {
        evidenciasSeleccionadas.push({
            file: file,
            preview: URL.createObjectURL(file),
            comentario: '',
            elementos: [],
            edited: false
        });
    });

    actualizarVistaPreviaEvidencias();
    document.getElementById('inputEvidencias').value = '';
}

function actualizarVistaPreviaEvidencias() {
    const container = document.getElementById('evidenciasPreview');
    const containerParent = document.getElementById('evidenciasPreviewContainer');
    const countSpan = document.getElementById('evidenciasCount');

    if (!container) return;

    if (evidenciasSeleccionadas.length === 0) {
        if (containerParent) containerParent.style.display = 'none';
        return;
    }

    if (containerParent) containerParent.style.display = 'block';
    
    if (countSpan) {
        countSpan.textContent = evidenciasSeleccionadas.length;
    }

    let html = '';
    evidenciasSeleccionadas.forEach((img, index) => {
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
                ${img.comentario ? `<div class="image-comment"><i class="fas fa-comment"></i> ${escapeHTML(img.comentario.substring(0, 25))}${img.comentario.length > 25 ? '...' : ''}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            editarEvidencia(parseInt(index));
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            eliminarEvidencia(parseInt(index));
        });
    });
}

function editarEvidencia(index) {
    if (imageEditorModal && evidenciasSeleccionadas[index]) {
        const img = evidenciasSeleccionadas[index];
        imageEditorModal.show(
            img.file,
            index,
            img.comentario,
            (savedIndex, editedFile, comentario, elementos) => {
                evidenciasSeleccionadas[savedIndex].file = editedFile;
                evidenciasSeleccionadas[savedIndex].comentario = comentario;
                evidenciasSeleccionadas[savedIndex].elementos = elementos;
                evidenciasSeleccionadas[savedIndex].edited = true;

                if (evidenciasSeleccionadas[savedIndex].preview) {
                    URL.revokeObjectURL(evidenciasSeleccionadas[savedIndex].preview);
                }
                evidenciasSeleccionadas[savedIndex].preview = URL.createObjectURL(editedFile);

                actualizarVistaPreviaEvidencias();
            }
        );
    }
}

function eliminarEvidencia(index) {
    if (evidenciasSeleccionadas[index]?.preview) {
        URL.revokeObjectURL(evidenciasSeleccionadas[index].preview);
    }
    evidenciasSeleccionadas.splice(index, 1);
    actualizarVistaPreviaEvidencias();
}

// =============================================
// VALIDACIONES
// =============================================
function inicializarValidaciones() {
    const descripcionInput = document.getElementById('descripcionSeguimiento');
    if (descripcionInput) {
        descripcionInput.maxLength = LIMITES.DESCRIPCION_SEGUIMIENTO;
        descripcionInput.addEventListener('input', () => {
            validarLongitudCampo(
                descripcionInput,
                LIMITES.DESCRIPCION_SEGUIMIENTO,
                'La descripción'
            );
            actualizarContador('descripcionSeguimiento', 'contadorCaracteres', LIMITES.DESCRIPCION_SEGUIMIENTO);
        });
    }

    actualizarContador('descripcionSeguimiento', 'contadorCaracteres', LIMITES.DESCRIPCION_SEGUIMIENTO);
}

function actualizarContador(inputId, counterId, limite) {
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

function validarLongitudCampo(campo, limite, nombreCampo) {
    const longitud = campo.value.length;
    if (longitud > limite) {
        campo.value = campo.value.substring(0, limite);
        mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
    }
}

function validarYGuardar() {
    const fechaInput = document.getElementById('fechaSeguimiento');
    let fechaHora = fechaInput.value;
    
    if (!fechaHora) {
        mostrarError('Debe seleccionar fecha y hora');
        fechaInput.focus();
        return;
    }

    let fechaObj;
    if (typeof fechaHora === 'string') {
        fechaObj = new Date(fechaHora);
    } else {
        fechaObj = fechaHora;
    }

    if (!validarFechaSeguimiento(fechaObj)) {
        return;
    }

    const descripcionInput = document.getElementById('descripcionSeguimiento');
    const descripcion = descripcionInput.value.trim();
    if (!descripcion) {
        descripcionInput.classList.add('is-invalid');
        mostrarError('La descripción del seguimiento es obligatoria');
        descripcionInput.focus();
        return;
    }
    if (descripcion.length < 5) {
        descripcionInput.classList.add('is-invalid');
        mostrarError('La descripción debe tener al menos 5 caracteres');
        descripcionInput.focus();
        return;
    }
    if (descripcion.length > LIMITES.DESCRIPCION_SEGUIMIENTO) {
        descripcionInput.classList.add('is-invalid');
        mostrarError(`La descripción no puede exceder ${LIMITES.DESCRIPCION_SEGUIMIENTO} caracteres`);
        descripcionInput.focus();
        return;
    }
    descripcionInput.classList.remove('is-invalid');

    const estadoSelect = document.getElementById('estadoSeguimiento');
    const nuevoEstado = estadoSelect.value;
    if (!nuevoEstado) {
        mostrarError('Debe seleccionar un estado');
        estadoSelect.focus();
        return;
    }

    confirmarYGuardar({
        fecha: fechaObj,
        descripcion,
        nuevoEstado,
        evidencias: evidenciasSeleccionadas
    });
}

async function confirmarYGuardar(datos) {
    const estadoAnterior = incidenciaActual.estado;
    const estadoTexto = {
        'pendiente': 'Pendiente',
        'finalizada': 'Finalizada'
    }[datos.nuevoEstado] || datos.nuevoEstado;

    const confirmResult = await Swal.fire({
        title: '¿Guardar seguimiento?',
        html: `
            <div style="text-align: left;">
                <p><strong>Fecha:</strong> ${formatearFecha(datos.fecha)}</p>
                <p><strong>Estado:</strong> <span style="color: ${estadoAnterior === datos.nuevoEstado ? 'var(--color-warning)' : 'var(--color-success)'};">${estadoTexto}</span></p>
                <p><strong>Evidencias:</strong> ${datos.evidencias.length} imagen(es)</p>
                <p><strong>Descripción:</strong><br>
                    <span style="color: var(--color-text-secondary);">${escapeHTML(datos.descripcion.substring(0, 200))}${datos.descripcion.length > 200 ? '...' : ''}</span>
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'GUARDAR SEGUIMIENTO',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#28a745'
    });

    if (confirmResult.isConfirmed) {
        await guardarSeguimiento(datos);
    }
}

async function guardarSeguimiento(datos) {
    const btnGuardar = document.getElementById('btnGuardarSeguimiento');
    const originalHTML = btnGuardar ? btnGuardar.innerHTML : '<i class="fas fa-save me-2"></i>Guardar Seguimiento';

    try {
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
            btnGuardar.disabled = true;
        }

        mostrarCargando('Guardando seguimiento y subiendo evidencias...');

        const archivos = datos.evidencias.map(ev => ev.file);

        await incidenciaManager.agregarSeguimiento(
            incidenciaActual.id,
            usuarioActual.id,
            usuarioActual.nombreCompleto,
            datos.descripcion,
            archivos,
            usuarioActual.organizacionCamelCase,
            datos.evidencias, // Objetos completos con comentarios
            datos.fecha // ← Fecha seleccionada por el usuario
        );

        if (datos.nuevoEstado !== incidenciaActual.estado) {
            await incidenciaManager.actualizarIncidencia(
                incidenciaActual.id,
                { estado: datos.nuevoEstado },
                usuarioActual.id,
                usuarioActual.organizacionCamelCase
            );
        }

        // Limpiar evidencias
        evidenciasSeleccionadas.forEach(ev => {
            if (ev.preview) URL.revokeObjectURL(ev.preview);
        });
        evidenciasSeleccionadas = [];
        actualizarVistaPreviaEvidencias();

        // Recargar incidencia
        await cargarIncidencia(incidenciaActual.id);

        // Actualizar UI
        mostrarInfoIncidencia();
        mostrarEvidenciasOriginales();
        mostrarHistorialSeguimiento();

        // Limpiar formulario
        document.getElementById('descripcionSeguimiento').value = '';
        actualizarContador('descripcionSeguimiento', 'contadorCaracteres', LIMITES.DESCRIPCION_SEGUIMIENTO);

        // Actualizar rango de fechas después de guardar
        configurarFechaSeguimiento();

        ocultarCargando();

        await Swal.fire({
            icon: 'success',
            title: '¡Seguimiento guardado!',
            text: 'El seguimiento se ha agregado correctamente',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error guardando seguimiento:', error);
        ocultarCargando();
        mostrarError(error.message || 'No se pudo guardar el seguimiento');
    } finally {
        if (btnGuardar) {
            btnGuardar.innerHTML = originalHTML;
            btnGuardar.disabled = false;
        }
    }
}

// =============================================
// NAVEGACIÓN
// =============================================
function volverALista() {
    window.location.href = '/users/admin/incidencias/incidencias.html';
}

function cancelar() {
    Swal.fire({
        title: '¿Cancelar?',
        text: 'Los cambios no guardados se perderán',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, continuar'
    }).then((result) => {
        if (result.isConfirmed) {
            volverALista();
        }
    });
}

// =============================================
// UTILIDADES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function mostrarError(mensaje) {
    mostrarNotificacion(mensaje, 'error');
}

function mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
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

function mostrarCargando(mensaje = 'Guardando...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">${mensaje}</div>
    `;

    document.body.appendChild(overlay);
}

function ocultarCargando() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    inicializarSeguimiento();
});