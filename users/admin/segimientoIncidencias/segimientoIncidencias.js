// seguimientoIncidencia.js - Versión funcional (sin clases)
// Controlador para agregar seguimiento a incidencias existentes

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let usuarioActual = null;
let incidenciaActual = null;
let sucursalesMap = new Map();
let categoriasMap = new Map();
let evidenciasSeleccionadas = [];
let fechaIncidencia = null;
let fechaMinima = null;
let fechaMaxima = null;

// LÍMITES DE CARACTERES
const LIMITES = {
    DESCRIPCION_SEGUIMIENTO: 500
};

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarSeguimiento() {
    try {
        console.log('Inicializando seguimiento de incidencia...');

        // 1. Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const incidenciaId = urlParams.get('id');

        if (!incidenciaId) {
            throw new Error('No se especificó el ID de la incidencia');
        }

        // 2. Cargar usuario
        cargarUsuario();

        if (!usuarioActual) {
            throw new Error('No se pudo cargar información del usuario');
        }

        // 3. Inicializar IncidenciaManager
        await inicializarIncidenciaManager();

        // 4. Cargar la incidencia
        await cargarIncidencia(incidenciaId);

        // 5. Cargar datos relacionados (sucursales, categorías)
        await cargarDatosRelacionados();

        // 6. Mostrar información de la incidencia
        mostrarInfoIncidencia();

        // 7. Mostrar evidencias originales
        mostrarEvidenciasOriginales();

        // 8. Mostrar historial de seguimiento
        mostrarHistorialSeguimiento();

        // 9. Configurar fecha del seguimiento
        configurarFechaSeguimiento();

        // 10. Configurar eventos
        configurarEventos();

        // 11. Inicializar validaciones
        inicializarValidaciones();

        console.log('Seguimiento inicializado correctamente');

    } catch (error) {
        console.error('Error inicializando:', error);
        mostrarError('Error al inicializar: ' + error.message);
        
        // Mostrar mensaje en la interfaz
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
        // Intentar obtener de userManager primero
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

        // Fallback a localStorage
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

        // Guardar fecha de la incidencia para validaciones
        fechaIncidencia = incidenciaActual.fechaInicio;
        
        // Configurar fechas mínima y máxima para el seguimiento
        fechaMinima = fechaIncidencia;
        fechaMaxima = new Date(); // Fecha actual

        document.getElementById('incidenciaId').textContent = incidenciaActual.id;

    } catch (error) {
        console.error('Error cargando incidencia:', error);
        throw error;
    }
}

async function cargarDatosRelacionados() {
    try {
        // Cargar sucursales para mostrar nombres
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();
        const sucursales = await sucursalManager.getSucursalesByOrganizacion(
            usuarioActual.organizacionCamelCase
        );
        
        sucursales.forEach(suc => {
            sucursalesMap.set(suc.id, suc);
        });

        // Cargar categorías para mostrar nombres
        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        const categorias = await categoriaManager.obtenerTodasCategorias();
        
        categorias.forEach(cat => {
            categoriasMap.set(cat.id, cat);
        });

    } catch (error) {
        console.error('Error cargando datos relacionados:', error);
        // No es crítico para la funcionalidad principal
    }
}

// =============================================
// CONFIGURACIÓN DE FECHA
// =============================================
function configurarFechaSeguimiento() {
    const fechaInput = document.getElementById('fechaSeguimiento');
    if (!fechaInput) return;

    const ahora = new Date();

    // Verificar si flatpickr está disponible
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
        // Fallback a input nativo
        fechaInput.type = 'datetime-local';
        fechaInput.value = ahora.toISOString().slice(0, 16);
        fechaInput.min = fechaMinima ? new Date(fechaMinima).toISOString().slice(0, 16) : '';
        fechaInput.max = fechaMaxima ? new Date(fechaMaxima).toISOString().slice(0, 16) : '';
    }

    // Actualizar texto de ayuda con el rango
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

    // Validar que no sea anterior a la fecha de la incidencia
    if (fecha < fechaMinima) {
        mostrarError('La fecha del seguimiento no puede ser anterior a la fecha de la incidencia');
        return false;
    }

    // Validar que no sea posterior a la fecha actual
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

    // Organización
    document.getElementById('infoOrganizacion').textContent = usuarioActual.organizacion;

    // Sucursal
    const sucursal = sucursalesMap.get(incidenciaActual.sucursalId);
    document.getElementById('infoSucursal').textContent = sucursal ? sucursal.nombre : incidenciaActual.sucursalId;

    // Categoría
    const categoria = categoriasMap.get(incidenciaActual.categoriaId);
    document.getElementById('infoCategoria').textContent = categoria ? categoria.nombre : incidenciaActual.categoriaId;

    // Subcategoría
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

    // Nivel de Riesgo
    const riesgoSpan = document.getElementById('infoRiesgo');
    const riesgoTexto = incidenciaActual.getNivelRiesgoTexto ? 
        incidenciaActual.getNivelRiesgoTexto() : incidenciaActual.nivelRiesgo;
    const riesgoColor = incidenciaActual.getNivelRiesgoColor ? 
        incidenciaActual.getNivelRiesgoColor() : obtenerRiesgoColor(incidenciaActual.nivelRiesgo);
    
    riesgoSpan.innerHTML = `<span class="riesgo-badge" style="background: ${riesgoColor}20; color: ${riesgoColor};">${riesgoTexto}</span>`;

    // Estado
    const estadoSpan = document.getElementById('infoEstado');
    const estadoTexto = incidenciaActual.getEstadoTexto ? 
        incidenciaActual.getEstadoTexto() : incidenciaActual.estado;
    const estadoColor = incidenciaActual.getEstadoColor ? 
        incidenciaActual.getEstadoColor() : (incidenciaActual.estado === 'finalizada' ? '#28a745' : '#ffc107');
    
    estadoSpan.innerHTML = `<span class="estado-badge" style="background: ${estadoColor}20; color: ${estadoColor};">${estadoTexto}</span>`;
    
    // Sincronizar select de estado
    const estadoSelect = document.getElementById('estadoSeguimiento');
    if (estadoSelect) {
        estadoSelect.value = incidenciaActual.estado;
    }

    // Fecha de inicio
    document.getElementById('infoFechaInicio').textContent = incidenciaActual.getFechaInicioFormateada ?
        incidenciaActual.getFechaInicioFormateada() : formatearFecha(incidenciaActual.fechaInicio);

    // Reportado por
    document.getElementById('infoReportadoPor').textContent = incidenciaActual.creadoPorNombre || 'No especificado';

    // Descripción
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
    imagenes.forEach((imgUrl, index) => {
        html += `
            <div class="gallery-item">
                <img src="${imgUrl}" alt="Evidencia ${index + 1}" loading="lazy" onclick="window.open('${imgUrl}', '_blank')">
                <div class="gallery-overlay">
                    <button type="button" class="gallery-btn" onclick="window.open('${imgUrl}', '_blank')">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

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

    let html = '';
    seguimientos.forEach((seg, index) => {
        const fecha = seg.fecha ? formatearFecha(seg.fecha) : 'Fecha no disponible';
        const evidencias = seg.evidencias || [];
        
        html += `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <i class="fas fa-${index === 0 ? 'star' : 'comment'}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <div class="timeline-user">
                            <i class="fas fa-user-circle"></i>
                            <span>${escapeHTML(seg.usuarioNombre || 'Usuario')}</span>
                        </div>
                        <div class="timeline-date">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${fecha}</span>
                        </div>
                    </div>
                    <div class="timeline-descripcion">
                        ${escapeHTML(seg.descripcion || 'Sin descripción')}
                    </div>
        `;

        if (evidencias.length > 0) {
            html += `
                    <div class="timeline-evidencias">
                        <h6><i class="fas fa-images"></i> Evidencias (${evidencias.length})</h6>
                        <div class="evidencias-grid">
            `;

            evidencias.forEach((evUrl, evIndex) => {
                html += `
                        <div class="evidencia-item">
                            <img src="${evUrl}" alt="Evidencia ${evIndex + 1}" loading="lazy" onclick="window.open('${evUrl}', '_blank')">
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

    container.innerHTML = html;
}

// =============================================
// CONFIGURACIÓN DE EVENTOS
// =============================================
function configurarEventos() {
    try {
        // Botones de navegación
        document.getElementById('btnVolverLista')?.addEventListener('click', () => volverALista());
        document.getElementById('btnCancelar')?.addEventListener('click', () => cancelar());

        // Botón guardar seguimiento
        document.getElementById('btnGuardarSeguimiento')?.addEventListener('click', (e) => {
            e.preventDefault();
            validarYGuardar();
        });

        // Botón agregar evidencias
        document.getElementById('btnAgregarEvidencias')?.addEventListener('click', () => {
            document.getElementById('inputEvidencias').click();
        });

        // Input de evidencias
        document.getElementById('inputEvidencias')?.addEventListener('change', (e) => procesarEvidencias(e.target.files));

        // Formulario submit
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
    const maxSize = 5 * 1024 * 1024; // 5MB

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
            preview: URL.createObjectURL(file)
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
                    <button type="button" class="preview-btn delete-btn" data-index="${index}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            eliminarEvidencia(parseInt(index));
        });
    });
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
    // Validar fecha
    const fechaInput = document.getElementById('fechaSeguimiento');
    let fechaHora = fechaInput.value;
    
    if (!fechaHora) {
        mostrarError('Debe seleccionar fecha y hora');
        fechaInput.focus();
        return;
    }

    // Convertir string a Date si es necesario
    let fechaObj;
    if (typeof fechaHora === 'string') {
        fechaObj = new Date(fechaHora);
    } else {
        fechaObj = fechaHora;
    }

    if (!validarFechaSeguimiento(fechaObj)) {
        return;
    }

    // Validar descripción
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

    // Validar estado
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

        // Extraer archivos
        const archivos = datos.evidencias.map(ev => ev.file);

        // Agregar seguimiento
        await incidenciaManager.agregarSeguimiento(
            incidenciaActual.id,
            usuarioActual.id,
            usuarioActual.nombreCompleto,
            datos.descripcion,
            archivos,
            usuarioActual.organizacionCamelCase
        );

        // Si cambió el estado, actualizar
        if (datos.nuevoEstado !== incidenciaActual.estado) {
            if (datos.nuevoEstado === 'finalizada') {
                await incidenciaManager.finalizarIncidencia(
                    incidenciaActual.id,
                    usuarioActual.id,
                    usuarioActual.nombreCompleto,
                    'Incidencia finalizada mediante seguimiento',
                    usuarioActual.organizacionCamelCase
                );
            } else {
                // Actualizar estado a pendiente (si se cambió de finalizada a pendiente)
                await incidenciaManager.actualizarIncidencia(
                    incidenciaActual.id,
                    { estado: datos.nuevoEstado },
                    usuarioActual.id,
                    usuarioActual.organizacionCamelCase
                );
            }
        }

        // Limpiar evidencias seleccionadas
        evidenciasSeleccionadas.forEach(ev => {
            if (ev.preview) URL.revokeObjectURL(ev.preview);
        });
        evidenciasSeleccionadas = [];
        actualizarVistaPreviaEvidencias();

        // Recargar la incidencia para obtener los datos actualizados
        await cargarIncidencia(incidenciaActual.id);

        // Actualizar vistas
        mostrarInfoIncidencia();
        mostrarEvidenciasOriginales();
        mostrarHistorialSeguimiento();

        // Limpiar formulario
        document.getElementById('descripcionSeguimiento').value = '';
        actualizarContador('descripcionSeguimiento', 'contadorCaracteres', LIMITES.DESCRIPCION_SEGUIMIENTO);

        // Restablecer fecha a la actual
        const fechaInput = document.getElementById('fechaSeguimiento');
        if (fechaInput) {
            if (fechaInput._flatpickr) {
                fechaInput._flatpickr.setDate(new Date());
            } else {
                fechaInput.value = new Date().toISOString().slice(0, 16);
            }
        }

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