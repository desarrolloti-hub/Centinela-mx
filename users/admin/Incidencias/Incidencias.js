/**
 * INCIDENCIAS - Sistema Centinela
 * Versión completa con tabla estilo regiones
 * MODIFICADO: Botón eliminar reemplazado por botón seguimiento
 * MODIFICADO: Eliminado botón IPH Múltiple
 * MODIFICADO: Eliminada barra azul de sucursal
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let organizacionActual = null;
let incidenciasCache = [];
let sucursalesCache = [];
let categoriasCache = [];

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;

// Filtros activos
let filtrosActivos = {
    estado: 'todos',
    nivelRiesgo: 'todos',
    sucursalId: 'todos'
};

// =============================================
// INICIALIZACIÓN
//==============================================
async function inicializarIncidenciaManager() {
    try {
        await obtenerDatosOrganizacion();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        await cargarSucursales();
        await cargarCategorias();
        await cargarIncidencias();

        configurarEventListeners();

        return true;
    } catch (error) {
        console.error('Error al inicializar incidencias:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

async function obtenerDatosOrganizacion() {
    try {
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            organizacionActual = {
                nombre: user.organizacion || 'Mi Empresa',
                camelCase: user.organizacionCamelCase || ''
            };
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

        organizacionActual = {
            nombre: userData.organizacion || adminInfo.organizacion || 'Mi Empresa',
            camelCase: userData.organizacionCamelCase || adminInfo.organizacionCamelCase || ''
        };
    } catch (error) {
        organizacionActual = { nombre: 'Mi Empresa', camelCase: '' };
    }
}

async function cargarSucursales() {
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();

        if (organizacionActual.camelCase) {
            sucursalesCache = await sucursalManager.getSucursalesByOrganizacion(organizacionActual.camelCase);

            const filtroSucursal = document.getElementById('filtroSucursal');
            if (filtroSucursal) {
                filtroSucursal.innerHTML = '<option value="todos">Todas las sucursales</option>';
                sucursalesCache.forEach(suc => {
                    const option = document.createElement('option');
                    option.value = suc.id;
                    option.textContent = suc.nombre;
                    filtroSucursal.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        sucursalesCache = [];
    }
}

async function cargarCategorias() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        categoriasCache = await categoriaManager.obtenerTodasCategorias();
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categoriasCache = [];
    }
}

function configurarEventListeners() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltros);
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
}

// =============================================
// FUNCIONES DE FILTRADO
// =============================================
function aplicarFiltros() {
    filtrosActivos.estado = document.getElementById('filtroEstado').value;
    filtrosActivos.nivelRiesgo = document.getElementById('filtroRiesgo').value;
    filtrosActivos.sucursalId = document.getElementById('filtroSucursal').value;

    paginaActual = 1;
    renderizarIncidencias();
}

function limpiarFiltros() {
    document.getElementById('filtroEstado').value = 'todos';
    document.getElementById('filtroRiesgo').value = 'todos';
    document.getElementById('filtroSucursal').value = 'todos';

    filtrosActivos = {
        estado: 'todos',
        nivelRiesgo: 'todos',
        sucursalId: 'todos'
    };

    paginaActual = 1;
    renderizarIncidencias();
}

function filtrarIncidencias(incidencias) {
    return incidencias.filter(inc => {
        if (filtrosActivos.estado !== 'todos' && inc.estado !== filtrosActivos.estado) {
            return false;
        }

        if (filtrosActivos.nivelRiesgo !== 'todos' && inc.nivelRiesgo !== filtrosActivos.nivelRiesgo) {
            return false;
        }

        if (filtrosActivos.sucursalId !== 'todos' && inc.sucursalId !== filtrosActivos.sucursalId) {
            return false;
        }

        return true;
    });
}

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================
window.verDetallesIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/verIncidencias/verIncidencias.html?id=${incidenciaId}`;
};

window.seguimientoIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/segimientoIncidencias/segimientoIncidencias.html?id=${incidenciaId}`;
};

// =============================================
// GENERADOR DE PDF ESTILO IPH (ADAPTADO A LA CLASE INCIDENCIA)
// =============================================

const generadorPDF = {
    jsPDF: null,
    html2canvas: null,

    async cargarLibrerias() {
        try {
            if (!window.jspdf) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (!window.html2canvas) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
            this.jsPDF = window.jspdf?.jsPDF;
            this.html2canvas = window.html2canvas;
            if (!this.jsPDF || !this.html2canvas) {
                throw new Error('No se pudieron cargar las librerías necesarias');
            }
            return true;
        } catch (error) {
            console.error('Error cargando librerías:', error);
            throw error;
        }
    },

    cargarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async generarPDFIncidencia(incidenciaId, organizacionCamelCase, opciones = {}) {
        try {
            Swal.fire({
                title: 'Generando IPH...',
                html: '<div class="progress-bar-container" style="width:100%; height:20px; background:rgba(255,255,255,0.1); border-radius:10px; margin-top:10px;"><div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #00c6ff, #0072ff); border-radius:10px; transition:width 0.3s;"></div></div>',
                allowOutsideClick: false,
                showConfirmButton: false
            });

            await this.cargarLibrerias();

            const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
            if (!incidencia) throw new Error('Incidencia no encontrada');

            const sucursal = sucursalesCache.find(s => s.id === incidencia.sucursalId);
            const categoria = categoriasCache.find(c => c.id === incidencia.categoriaId);

            const config = {
                incluirImagenes: opciones.incluirImagenes !== false,
                incluirSeguimiento: opciones.incluirSeguimiento !== false,
                calidadImagenes: opciones.calidadImagenes || 0.7
            };

            const pdf = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            await this.generarFormatoIPH(pdf, incidencia, {
                sucursal,
                categoria,
                config
            });

            const nombreArchivo = `IPH_${incidencia.id}_${this.formatearFecha(new Date())}.pdf`;

            Swal.close();
            await this.mostrarOpcionesDescarga(pdf, nombreArchivo);

            return pdf;

        } catch (error) {
            console.error('Error generando PDF:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al generar el PDF'
            });
            throw error;
        }
    },

    async generarFormatoIPH(pdf, incidencia, datos) {
        let pagina = 1;
        const margen = 20;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = 25;

        // =============================================
        // ENCABEZADO OFICIAL - IPH
        // =============================================

        pdf.setFillColor(0, 40, 80);
        pdf.rect(0, 0, anchoPagina, 35, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INFORME POLICIAL HOMOLOGADO', anchoPagina / 2, 18, { align: 'center' });

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('SISTEMA CENTINELA - SEGURIDAD CIUDADANA', anchoPagina / 2, 28, { align: 'center' });

        yPos = 45;

        pdf.setDrawColor(0, 40, 80);
        pdf.setLineWidth(0.5);
        pdf.line(margen, yPos - 5, anchoPagina - margen, yPos - 5);

        pdf.setFontSize(14);
        pdf.setTextColor(0, 40, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`IPH N°: ${incidencia.id}`, margen, yPos);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Fecha de emisión: ${new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}`, anchoPagina - margen, yPos, { align: 'right' });

        yPos += 15;

        // =============================================
        // DATOS DEL CASO (USANDO MÉTODOS DE LA CLASE)
        // =============================================

        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(margen - 2, yPos - 8, anchoContenido + 4, 40, 3, 3, 'F');

        pdf.setFontSize(12);
        pdf.setTextColor(0, 40, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DATOS GENERALES DEL CASO', margen, yPos);
        yPos += 8;

        const col1 = margen;
        const col2 = anchoPagina / 2 + 5;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);

        pdf.text('Sucursal:', col1, yPos);
        pdf.text('Categoría:', col1, yPos + 6);
        pdf.text('Subcategoría:', col1, yPos + 12);

        pdf.text('Estado:', col2, yPos);
        pdf.text('Nivel de Riesgo:', col2, yPos + 6);
        pdf.text('Reportado por:', col2, yPos + 12);

        yPos += 4;

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(datos.sucursal?.nombre || incidencia.sucursalId, col1 + 25, yPos);
        pdf.text(datos.categoria?.nombre || incidencia.categoriaId, col1 + 25, yPos + 6);
        pdf.text(incidencia.subcategoriaId || 'No especificada', col1 + 25, yPos + 12);

        // Usar métodos de la clase para estado y riesgo
        const estadoColor = incidencia.getEstadoColor ? incidencia.getEstadoColor() : (incidencia.estado === 'finalizada' ? '#28a745' : '#ffc107');
        pdf.setTextColor(estadoColor);
        pdf.text(incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado, col2 + 25, yPos);

        const riesgoColor = incidencia.getNivelRiesgoColor ? incidencia.getNivelRiesgoColor() : this.getRiesgoColorHex(incidencia.nivelRiesgo);
        pdf.setTextColor(riesgoColor);
        pdf.text(incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo, col2 + 25, yPos + 6);

        pdf.setTextColor(0, 0, 0);
        pdf.text(incidencia.reportadoPorId || 'No disponible', col2 + 25, yPos + 12);

        yPos += 25;

        // =============================================
        // FECHAS Y HORARIOS (USANDO MÉTODOS DE LA CLASE)
        // =============================================

        pdf.setFillColor(240, 248, 255);
        pdf.roundedRect(margen - 2, yPos - 8, anchoContenido + 4, 30, 3, 3, 'F');

        pdf.setFontSize(11);
        pdf.setTextColor(0, 40, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INFORMACIÓN TEMPORAL', margen, yPos);
        yPos += 8;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);

        const fechaInicio = incidencia.getFechaInicioFormateada ? incidencia.getFechaInicioFormateada() : new Date(incidencia.fechaInicio).toLocaleString('es-MX');
        const fechaFin = incidencia.getFechaFinalizacionFormateada ? incidencia.getFechaFinalizacionFormateada() : (incidencia.fechaFinalizacion ? new Date(incidencia.fechaFinalizacion).toLocaleString('es-MX') : 'En proceso');

        pdf.text(`• Fecha de inicio: ${fechaInicio}`, margen + 5, yPos);
        pdf.text(`• Fecha de finalización: ${fechaFin}`, margen + 5, yPos + 6);
        pdf.text(`• Última actualización: ${incidencia.getFechaCreacionFormateada ? incidencia.getFechaCreacionFormateada() : 'No disponible'}`, margen + 5, yPos + 12);

        yPos += 25;

        // =============================================
        // DESCRIPCIÓN DETALLADA
        // =============================================

        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(margen - 2, yPos - 8, anchoContenido + 4, 40, 3, 3, 'F');

        pdf.setFontSize(11);
        pdf.setTextColor(0, 40, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DESCRIPCIÓN DE LOS HECHOS', margen, yPos);
        yPos += 8;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);

        const descripcion = incidencia.detalles || 'No hay descripción disponible.';
        const lineasDesc = this.ajustarTexto(pdf, descripcion, anchoContenido - 10);

        lineasDesc.forEach((linea) => {
            if (yPos > 250) {
                pdf.addPage();
                this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                yPos = 45;
            }
            pdf.text(linea, margen + 5, yPos);
            yPos += 5;
        });

        yPos += 10;

        // =============================================
        // EVIDENCIAS FOTOGRÁFICAS - VERSIÓN CORREGIDA (SOPORTE PARA OBJETOS)
        // =============================================

        if (datos.config.incluirImagenes && incidencia.imagenes && incidencia.imagenes.length > 0) {
            console.log(`Procesando ${incidencia.imagenes.length} imágenes...`);
            console.log('Estructura de imágenes:', incidencia.imagenes);

            if (yPos > 220) {
                pdf.addPage();
                this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                yPos = 45;
            }

            pdf.setFillColor(0, 40, 80);
            pdf.rect(margen - 2, yPos - 8, anchoContenido + 4, 8, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('EVIDENCIAS FOTOGRÁFICAS', anchoPagina / 2, yPos - 2, { align: 'center' });
            yPos += 10;

            pdf.setTextColor(0, 0, 0);

            const imgPorFila = 2;
            const imgWidth = (anchoContenido - 20) / imgPorFila;

            for (let i = 0; i < incidencia.imagenes.length; i++) {
                try {
                    if (i % imgPorFila === 0 && i > 0) {
                        if (yPos + 60 > 280) {
                            pdf.addPage();
                            this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                            yPos = 45;
                        }
                    }

                    const columna = i % imgPorFila;
                    const xPos = margen + 5 + (columna * (imgWidth + 10));

                    this.actualizarProgreso(Math.round((i + 1) / incidencia.imagenes.length * 100));

                    // IMPORTANTE: Obtener la URL y comentario según la estructura de tu clase
                    let imgUrl = '';
                    let comentario = '';

                    // Verificar si es un objeto (como lo guarda tu clase)
                    if (typeof incidencia.imagenes[i] === 'object' && incidencia.imagenes[i] !== null) {
                        imgUrl = incidencia.imagenes[i].url || '';
                        comentario = incidencia.imagenes[i].comentario || '';
                    } else {
                        // Si es string directo (por si acaso)
                        imgUrl = String(incidencia.imagenes[i]);
                    }

                    if (!imgUrl) {
                        console.warn(`Imagen ${i + 1} no tiene URL válida`);
                        throw new Error('URL no válida');
                    }

                    console.log(`Cargando imagen ${i + 1}:`, imgUrl);
                    if (comentario) {
                        console.log(`Comentario: ${comentario}`);
                    }

                    // Usar el proxy que te funcionaba
                    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(imgUrl);

                    const response = await fetch(proxyUrl);

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();

                    if (!blob.type.startsWith('image/')) {
                        throw new Error('El blob no es una imagen válida');
                    }

                    // Convertir blob a data URL
                    const imgData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });

                    // Obtener dimensiones
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = imgData;
                    });

                    // Dibujar marco
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setFillColor(250, 250, 250);
                    pdf.roundedRect(xPos - 2, yPos - 2, imgWidth + 4, 55, 2, 2, 'FD');

                    // Calcular dimensiones
                    const imgHeight = 40;
                    const imgAspectRatio = img.width / img.height;
                    const displayWidth = imgWidth;
                    const displayHeight = Math.min(40, displayWidth / imgAspectRatio);
                    const yOffset = (40 - displayHeight) / 2;

                    pdf.addImage(
                        imgData,
                        'JPEG',
                        xPos,
                        yPos + yOffset,
                        displayWidth,
                        displayHeight,
                        undefined,
                        'FAST'
                    );

                    // Mostrar comentario si existe
                    if (comentario) {
                        pdf.setFontSize(6);
                        pdf.setTextColor(80, 80, 80);
                        const comentarioCorto = comentario.length > 30 ? comentario.substring(0, 27) + '...' : comentario;
                        pdf.text(comentarioCorto, xPos + imgWidth / 2, yPos + 55, { align: 'center' });
                    }

                    pdf.setFontSize(7);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`Evidencia ${i + 1}`, xPos + imgWidth / 2, yPos + 48, { align: 'center' });

                    console.log(`Imagen ${i + 1} agregada correctamente`);

                    if (columna === 1 || i === incidencia.imagenes.length - 1) {
                        yPos += 65;
                    }

                } catch (error) {
                    console.error(`Error procesando imagen ${i + 1}:`, error);

                    const columna = i % imgPorFila;
                    const xPos = margen + 5 + (columna * (imgWidth + 10));

                    // Mostrar placeholder
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setFillColor(240, 240, 240);
                    pdf.roundedRect(xPos - 2, yPos - 2, imgWidth + 4, 55, 2, 2, 'FD');

                    pdf.setFontSize(8);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text('Error al cargar', xPos + imgWidth / 2, yPos + 20, { align: 'center' });
                    pdf.text('imagen', xPos + imgWidth / 2, yPos + 28, { align: 'center' });

                    pdf.setFontSize(7);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`Evidencia ${i + 1}`, xPos + imgWidth / 2, yPos + 48, { align: 'center' });

                    if (columna === 1 || i === incidencia.imagenes.length - 1) {
                        yPos += 65;
                    }
                }
            }
            yPos += 10;
        }
        // =============================================
        // HISTORIAL DE SEGUIMIENTO (USANDO MÉTODOS DE LA CLASE) - CORREGIDO CON IMÁGENES
        // =============================================

        if (datos.config.incluirSeguimiento) {
            const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

            if (seguimientos.length > 0) {
                if (yPos > 200) {
                    pdf.addPage();
                    this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                    yPos = 45;
                }

                pdf.setFillColor(0, 40, 80);
                pdf.rect(margen - 2, yPos - 8, anchoContenido + 4, 8, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text('HISTORIAL DE SEGUIMIENTO', anchoPagina / 2, yPos - 2, { align: 'center' });
                yPos += 10;

                for (let s = 0; s < seguimientos.length; s++) {
                    const seg = seguimientos[s];

                    if (yPos > 260) {
                        pdf.addPage();
                        this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                        yPos = 45;
                    }

                    // Fondo para cada entrada
                    pdf.setFillColor(s % 2 === 0 ? 250 : 245, s % 2 === 0 ? 250 : 245, s % 2 === 0 ? 250 : 245);
                    pdf.rect(margen, yPos - 4, anchoContenido, 20, 'F');

                    // Fecha y usuario
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(0, 40, 80);

                    const fecha = seg.fecha ? new Date(seg.fecha).toLocaleString('es-MX') : 'Fecha no disponible';
                    pdf.text(`• ${fecha}`, margen + 2, yPos);

                    pdf.setFont('helvetica', 'italic');
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`por: ${seg.usuarioNombre || 'Usuario'} (${seg.id || 'Seguimiento'})`, margen + 50, yPos);

                    yPos += 5;

                    // Descripción
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(8);
                    pdf.setTextColor(40, 40, 40);

                    const descSeg = this.ajustarTexto(pdf, seg.descripcion || 'Sin descripción', anchoContenido - 10);
                    descSeg.forEach(linea => {
                        pdf.text(linea, margen + 5, yPos);
                        yPos += 4;
                    });
                    yPos += 2;

                    // =============================================
                    // EVIDENCIAS DEL SEGUIMIENTO (IMÁGENES)
                    // =============================================
                    if (seg.evidencias && seg.evidencias.length > 0) {
                        console.log(`Procesando ${seg.evidencias.length} evidencias del seguimiento ${seg.id}...`);

                        pdf.setFontSize(7);
                        pdf.setTextColor(0, 102, 204);
                        pdf.text(`📷 Evidencias adjuntas (${seg.evidencias.length}):`, margen + 5, yPos);
                        yPos += 5;

                        // Mostrar miniaturas de las evidencias
                        const evidenciasPorFila = 4;
                        const anchoEvidencia = (anchoContenido - 30) / evidenciasPorFila;

                        for (let e = 0; e < seg.evidencias.length; e++) {
                            try {
                                // Verificar espacio
                                if (yPos + 45 > 280) {
                                    pdf.addPage();
                                    this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                                    yPos = 45;
                                }

                                const columna = e % evidenciasPorFila;
                                const fila = Math.floor(e / evidenciasPorFila);

                                // Si cambiamos de fila, ajustar Y
                                if (columna === 0 && e > 0) {
                                    yPos += 40;
                                }

                                const xEvidencia = margen + 5 + (columna * (anchoEvidencia + 5));
                                const yEvidencia = yPos + (fila * 0); // La fila ya la manejamos con yPos

                                // Obtener URL de la evidencia
                                let evidenciaUrl = '';
                                let evidenciaComentario = '';

                                if (typeof seg.evidencias[e] === 'object' && seg.evidencias[e] !== null) {
                                    evidenciaUrl = seg.evidencias[e].url || '';
                                    evidenciaComentario = seg.evidencias[e].comentario || '';
                                } else {
                                    evidenciaUrl = String(seg.evidencias[e]);
                                }

                                if (!evidenciaUrl) continue;

                                console.log(`Cargando evidencia ${e + 1} del seguimiento:`, evidenciaUrl);

                                // Cargar imagen con proxy
                                const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(evidenciaUrl);
                                const response = await fetch(proxyUrl);

                                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                                const blob = await response.blob();
                                if (!blob.type.startsWith('image/')) throw new Error('No es imagen');

                                // Convertir a data URL
                                const imgData = await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });

                                // Obtener dimensiones
                                const img = new Image();
                                await new Promise((resolve, reject) => {
                                    img.onload = resolve;
                                    img.onerror = reject;
                                    img.src = imgData;
                                });

                                // Dibujar marco de la evidencia
                                pdf.setDrawColor(200, 200, 200);
                                pdf.setFillColor(250, 250, 250);
                                pdf.roundedRect(xEvidencia - 1, yEvidencia - 1, anchoEvidencia + 2, 35, 1, 1, 'FD');

                                // Calcular dimensiones
                                const evidenciaAltura = 30;
                                const aspectRatio = img.width / img.height;
                                const displayWidth = anchoEvidencia;
                                const displayHeight = Math.min(evidenciaAltura, displayWidth / aspectRatio);
                                const yOffset = (evidenciaAltura - displayHeight) / 2;

                                // Agregar imagen
                                pdf.addImage(
                                    imgData,
                                    'JPEG',
                                    xEvidencia,
                                    yEvidencia + yOffset,
                                    displayWidth,
                                    displayHeight,
                                    undefined,
                                    'FAST'
                                );

                                // Mostrar comentario si existe
                                if (evidenciaComentario) {
                                    pdf.setFontSize(5);
                                    pdf.setTextColor(80, 80, 80);
                                    const comentarioCorto = evidenciaComentario.length > 20 ?
                                        evidenciaComentario.substring(0, 17) + '...' : evidenciaComentario;
                                    pdf.text(comentarioCorto, xEvidencia + anchoEvidencia / 2, yEvidencia + 33, { align: 'center' });
                                }

                                // Número de evidencia
                                pdf.setFontSize(5);
                                pdf.setTextColor(100, 100, 100);
                                pdf.text(`${e + 1}`, xEvidencia + anchoEvidencia - 3, yEvidencia + 6);

                            } catch (error) {
                                console.error(`Error cargando evidencia ${e + 1} del seguimiento:`, error);

                                // Placeholder para evidencia fallida
                                const columna = e % evidenciasPorFila;
                                const xEvidencia = margen + 5 + (columna * (anchoEvidencia + 5));

                                pdf.setDrawColor(200, 200, 200);
                                pdf.setFillColor(240, 240, 240);
                                pdf.roundedRect(xEvidencia - 1, yPos - 1, anchoEvidencia + 2, 35, 1, 1, 'FD');

                                pdf.setFontSize(6);
                                pdf.setTextColor(150, 150, 150);
                                pdf.text('Error', xEvidencia + anchoEvidencia / 2, yPos + 15, { align: 'center' });
                                pdf.text('imagen', xEvidencia + anchoEvidencia / 2, yPos + 22, { align: 'center' });
                            }

                            // Al final de cada fila o al terminar, actualizar yPos
                            if (e === seg.evidencias.length - 1) {
                                const filasNecesarias = Math.ceil(seg.evidencias.length / evidenciasPorFila);
                                yPos += 40 * filasNecesarias;
                            }
                        }
                        yPos += 5;
                    }

                    // Línea separadora entre seguimientos
                    pdf.setDrawColor(200, 200, 200);
                    pdf.line(margen, yPos - 2, anchoPagina - margen, yPos - 2);
                    yPos += 3;
                }
            }
        }

        // =============================================
        // FIRMAS Y VALIDACIÓN
        // =============================================

        pdf.addPage();
        this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
        yPos = 45;

        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(margen - 2, yPos - 8, anchoContenido + 4, 70, 3, 3, 'F');

        pdf.setFontSize(14);
        pdf.setTextColor(0, 40, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VALIDACIÓN DEL INFORME', anchoPagina / 2, yPos, { align: 'center' });
        yPos += 15;

        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');

        const qrText = `IPH: ${incidencia.id}\nFecha: ${new Date().toLocaleDateString('es-MX')}\nOrganización: ${organizacionActual.nombre}`;
        const lineasQR = qrText.split('\n');

        pdf.rect(margen + 20, yPos, 40, 40, 'D');
        pdf.setFontSize(6);
        lineasQR.forEach((linea, idx) => {
            pdf.text(linea, margen + 22, yPos + 10 + (idx * 5));
        });

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('_________________________', anchoPagina - 80, yPos + 15);
        pdf.text('_________________________', anchoPagina - 80, yPos + 35);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Firma del responsable', anchoPagina - 80, yPos + 20);
        pdf.text('Sello de la organización', anchoPagina - 80, yPos + 40);

        pdf.setFontSize(40);
        pdf.setTextColor(230, 230, 230);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VALIDADO', anchoPagina / 2, 200, { align: 'center', angle: 45 });

        this.agregarPiePagina(pdf);
    },

    agregarEncabezadoPagina(pdf, iphId, pagina) {
        const anchoPagina = pdf.internal.pageSize.getWidth();

        pdf.setFillColor(0, 40, 80);
        pdf.rect(0, 0, anchoPagina, 20, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`IPH N°: ${iphId}`, 20, 13);
        pdf.text(`Página ${pagina}`, anchoPagina - 30, 13);

        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.5);
        pdf.line(20, 18, anchoPagina - 20, 18);
    },

    agregarPiePagina(pdf) {
        const total = pdf.internal.getNumberOfPages();
        const anchoPagina = pdf.internal.pageSize.getWidth();

        for (let i = 1; i <= total; i++) {
            pdf.setPage(i);

            pdf.setDrawColor(200, 200, 200);
            pdf.line(20, 282, anchoPagina - 20, 282);

            pdf.setFontSize(7);
            pdf.setTextColor(128, 128, 128);
            pdf.setFont('helvetica', 'italic');

            const fecha = new Date().toLocaleString('es-MX');
            pdf.text(`Documento generado por Sistema Centinela - ${fecha}`, 20, 290);
            pdf.text(`Página ${i} de ${total}`, anchoPagina - 50, 290);
            pdf.text('Este documento es una representación impresa de un IPH electrónico', anchoPagina / 2, 295, { align: 'center' });
        }
    },

    ajustarTexto(pdf, texto, anchoMaximo) {
        if (!texto) return [''];
        const palabras = texto.split(' ');
        const lineas = [];
        let lineaActual = '';

        palabras.forEach(palabra => {
            const pruebaLinea = lineaActual ? `${lineaActual} ${palabra}` : palabra;
            const ancho = pdf.getTextWidth(pruebaLinea);

            if (ancho <= anchoMaximo) {
                lineaActual = pruebaLinea;
            } else {
                if (lineaActual) lineas.push(lineaActual);
                lineaActual = palabra;
            }
        });

        if (lineaActual) lineas.push(lineaActual);
        return lineas;
    },

    getRiesgoColorHex(nivel) {
        const colores = {
            'bajo': '#28a745',
            'medio': '#ffc107',
            'alto': '#fd7e14',
            'critico': '#dc3545'
        };
        return colores[nivel] || '#6c757d';
    },

    formatearFecha(fecha) {
        const d = fecha;
        return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}_${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}`;
    },

    actualizarProgreso(porcentaje) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) progressBar.style.width = `${porcentaje}%`;
    },

    async mostrarOpcionesDescarga(pdf, nombreArchivo) {
        const result = await Swal.fire({
            title: 'IPH Generado',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-file-pdf" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <p style="color: var(--color-text-primary); margin: 10px 0;">
                        El Informe Policial Homologado se ha generado correctamente.
                    </p>
                </div>
            `,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'DESCARGAR',
            cancelButtonText: 'CANCELAR',
            showDenyButton: true,
            denyButtonText: 'VISUALIZAR'
        });

        if (result.isConfirmed) {
            pdf.save(nombreArchivo);
        } else if (result.isDenied) {
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        }
    },

    async generarPDFMultiple(incidenciasIds) {
        try {
            if (incidenciasIds.length === 0) return;

            Swal.fire({
                title: 'Generando IPHs...',
                html: `<div>Procesando ${incidenciasIds.length} incidencia(s)...</div>`,
                allowOutsideClick: false,
                showConfirmButton: false
            });

            for (const id of incidenciasIds) {
                await this.generarPDFIncidencia(id, organizacionActual.camelCase, {
                    mostrarAlerta: false
                });
            }

            Swal.close();

            Swal.fire({
                icon: 'success',
                title: '¡Completado!',
                text: `Se generaron ${incidenciasIds.length} informes correctamente.`,
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error generando múltiples PDFs:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
            throw error;
        }
    }
};

// =============================================
// FUNCIONES PARA PDF (INTERFAZ)
// =============================================

window.generarPDFIncidencia = async function (incidenciaId, event) {
    event?.stopPropagation();

    try {
        const { value: opciones } = await Swal.fire({
            title: 'Generar Informe Policial',
            html: `
                <div style="text-align: left; padding: 15px;">
                    <h4 style="color: var(--color-accent-primary); margin-bottom: 20px; font-family: 'Orbitron', sans-serif;">
                        <i class="fas fa-shield-alt"></i> IPH - Opciones
                    </h4>
                    
                    <div style="margin-bottom: 20px; padding: 10px; background: rgba(0,40,80,0.1); border-radius: 8px;">
                        <p style="color: var(--color-text-primary); margin: 0;">
                            <i class="fas fa-info-circle" style="color: var(--color-accent-primary);"></i>
                            El Informe Policial Homologado incluirá:
                        </p>
                        <ul style="color: var(--color-text-secondary); margin-top: 10px; padding-left: 25px;">
                            <li>Datos generales del caso</li>
                            <li>Descripción detallada de los hechos</li>
                            <li>Todas las evidencias fotográficas</li>
                            <li>Historial completo de seguimiento</li>
                            <li>Código de validación y firmas</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="incluirImagenes" checked>
                            <span style="color: var(--color-text-primary);">Incluir imágenes en alta calidad</span>
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="incluirSeguimiento" checked>
                            <span style="color: var(--color-text-primary);">Incluir historial completo</span>
                        </label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'GENERAR IPH',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#002850',
            focusConfirm: false,
            preConfirm: () => {
                return {
                    incluirImagenes: document.getElementById('incluirImagenes')?.checked ?? true,
                    incluirSeguimiento: document.getElementById('incluirSeguimiento')?.checked ?? true
                };
            }
        });

        if (opciones) {
            await generadorPDF.generarPDFIncidencia(
                incidenciaId,
                organizacionActual.camelCase,
                opciones
            );
        }

    } catch (error) {
        console.error('Error al generar IPH:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el informe: ' + error.message
        });
    }
};

// =============================================
// CARGAR INCIDENCIAS
// =============================================
async function cargarIncidencias() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">Cargando incidencias...</td></tr>';

        incidenciasCache = await incidenciaManager.getIncidenciasByOrganizacion(organizacionActual.camelCase);

        if (!incidenciasCache || incidenciasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-exclamation-triangle" style="font-size:48px; color:rgba(255,193,7,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay incidencias registradas</h5>
                            <p style="color: var(--color-text-dim); margin-bottom: 20px;">Comienza registrando la primera incidencia de tu organización.</p>
                            <a href="/users/admin/crearIncidencias/crearIncidencia.html" class="btn-nueva-incidencia-header" style="display:inline-flex; margin-top:16px;">
                                <i class="fas fa-plus-circle"></i> Crear Incidencia
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        renderizarIncidencias();

    } catch (error) {
        console.error('Error al cargar incidencias:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

function renderizarIncidencias() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (!tbody) return;

    const incidenciasFiltradas = filtrarIncidencias(incidenciasCache);

    incidenciasFiltradas.sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : 0;
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : 0;
        return fechaB - fechaA;
    });

    const totalItems = incidenciasFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const incidenciasPagina = incidenciasFiltradas.slice(inicio, fin);

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} incidencias`;
    }

    tbody.innerHTML = '';

    incidenciasPagina.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="irPagina(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

window.irPagina = function (pagina) {
    paginaActual = pagina;
    renderizarIncidencias();
};

function crearFilaIncidencia(incidencia, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'incidencia-row';
    tr.dataset.id = incidencia.id;

    const sucursal = sucursalesCache.find(s => s.id === incidencia.sucursalId);
    const categoria = categoriasCache.find(c => c.id === incidencia.categoriaId);

    const riesgoTexto = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
    const riesgoColor = incidencia.getNivelRiesgoColor ? incidencia.getNivelRiesgoColor() : '';
    const estadoTexto = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;

    const fechaInicio = incidencia.fechaInicio ?
        (incidencia.fechaInicio.toDate ?
            incidencia.fechaInicio.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
            new Date(incidencia.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })) :
        'N/A';

    tr.innerHTML = `
        <td data-label="ID / Folio">
            <span class="incidencia-id" title="${incidencia.id}">${incidencia.id}</span>
        </td>
        <td data-label="Sucursal">
            <div style="display: flex; align-items: center;">
                <div>
                    <strong style="color:white;" title="${sucursal ? sucursal.nombre : 'No disponible'}">${sucursal ? sucursal.nombre : 'No disponible'}</strong>
                </div>
            </div>
        </td>
        <td data-label="Categoría">
            <div style="display: flex; align-items: center;">
                <span>${categoria ? categoria.nombre : 'No disponible'}</span>
            </div>
        </td>
        <td data-label="Riesgo">
            <span class="riesgo-badge ${incidencia.nivelRiesgo}" style="background: ${riesgoColor}20; color: ${riesgoColor}; border-color: ${riesgoColor}40;">
                ${riesgoTexto}
            </span>
        </td>
        <td data-label="Estado">
            <span class="estado-badge ${incidencia.estado}">
                ${estadoTexto}
            </span>
        </td>
        <td data-label="Fecha">
            ${fechaInicio}
        </td>
        <td data-label="Acciones">
            <div class="btn-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn" data-action="ver" data-id="${incidencia.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn" data-action="pdf" data-id="${incidencia.id}" title="Generar IPH">
                    <i class="fas fa-file-pdf" style="color: #dc3545;"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="seguimiento" data-id="${incidencia.id}" title="Seguimiento">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    setTimeout(() => {
        tr.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'ver') window.verDetallesIncidencia(id, e);
                else if (action === 'pdf') window.generarPDFIncidencia(id, e);
                else if (action === 'seguimiento') window.seguimientoIncidencia(id, e);
            });
        });
    }, 50);
}

// =============================================
// UTILIDADES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarError(mensaje) {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error</h5>
                        <p>${escapeHTML(mensaje)}</p>
                        <button class="btn-nueva-incidencia-header" onclick="location.reload()" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function mostrarErrorInicializacion() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error de inicialización</h5>
                        <p>No se pudo cargar el módulo de incidencias.</p>
                        <button class="btn-nueva-incidencia-header" onclick="location.reload()" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    await inicializarIncidenciaManager();
});