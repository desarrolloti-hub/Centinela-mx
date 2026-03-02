/**
 * IPH GENERATOR - Sistema Centinela
 * Módulo independiente para generar Informes Policiales Homologados
 * VERSIÓN: 2.0
 */

// =============================================
// CONFIGURACIÓN DE COLORES IPH
// =============================================
export const coloresIPH = {
    primario: '#1a3b5d',      // Azul oscuro institucional
    secundario: '#c9a03d',     // Dorado para acentos
    texto: '#333333',          // Texto principal
    textoClaro: '#666666',     // Texto secundario
    fondo: '#ffffff',          // Fondo blanco
    borde: '#dddddd',          // Bordes grises
    exito: '#27ae60',          // Verde
    advertencia: '#f39c12',    // Naranja
    peligro: '#c0392b'         // Rojo
};

// =============================================
// GENERADOR IPH PRINCIPAL
// =============================================
export const generadorIPH = {
    jsPDF: null,
    logoData: null,
    logoOrganizacionData: null,
    organizacionActual: null,
    sucursalesCache: [],
    categoriasCache: [],
    subcategoriasCache: [],
    usuariosCache: [],
    authToken: null,
    totalPaginas: 1,

    // Tamaños de fuente
    fonts: {
        tituloPrincipal: 16,
        titulo: 14,
        subtitulo: 12,
        normal: 10,
        small: 8,
        mini: 7
    },

    // Dimensiones para logos
    dimensionesLogo: {
        ancho: 25,
        alto: 25,
        separacion: 5
    },

    /**
     * Configurar el generador con datos necesarios
     * @param {Object} config - Configuración
     */
    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.subcategoriasCache) this.subcategoriasCache = config.subcategoriasCache;
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
        if (config.authToken) this.authToken = config.authToken;
    },

    /**
     * Obtener nombre de sucursal por ID
     */
    obtenerNombreSucursal(sucursalId) {
        if (!sucursalId) return 'No especificada';
        const sucursal = this.sucursalesCache.find(s => s.id === sucursalId);
        return sucursal ? sucursal.nombre : 'No disponible';
    },

    /**
     * Obtener nombre de categoría por ID
     */
    obtenerNombreCategoria(categoriaId) {
        if (!categoriaId) return 'No especificada';
        const categoria = this.categoriasCache.find(c => c.id === categoriaId);
        return categoria ? categoria.nombre : 'No disponible';
    },

    /**
     * Obtener nombre de subcategoría por ID
     */
    obtenerNombreSubcategoria(subcategoriaId) {
        if (!subcategoriaId) return 'No especificada';
        const subcategoria = this.subcategoriasCache.find(s => s.id === subcategoriaId);
        return subcategoria ? subcategoria.nombre : 'No disponible';
    },

    /**
     * Obtener nombre de usuario por ID
     */
    obtenerNombreUsuario(usuarioId) {
        if (!usuarioId) return 'Sistema';
        const usuario = this.usuariosCache.find(u => u.id === usuarioId);
        return usuario ? usuario.nombreCompleto || usuario.email || 'Usuario' : 'Usuario desconocido';
    },

    /**
     * Obtener cargo de usuario por ID
     */
    obtenerCargoUsuario(usuarioId) {
        if (!usuarioId) return '';
        const usuario = this.usuariosCache.find(u => u.id === usuarioId);
        return usuario ? usuario.cargo || 'No especificado' : '';
    },

    /**
     * Cargar librería jsPDF dinámicamente
     */
    async cargarLibrerias() {
        try {
            if (!window.jspdf) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            this.jsPDF = window.jspdf?.jsPDF;
            if (!this.jsPDF) {
                throw new Error('No se pudo cargar la librería jsPDF');
            }
            return true;
        } catch (error) {
            console.error('Error cargando librerías:', error);
            throw error;
        }
    },

    /**
     * Cargar script dinámicamente
     */
    cargarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    /**
     * Cargar logo del sistema desde localStorage
     */
    async cargarLogo() {
        try {
            // Intentar cargar el logo de Centinela desde la ruta específica
            // Si no existe, intentar cargar desde localStorage
            const logoBase64 = localStorage.getItem('logo');

            // Intentar cargar desde assets primero
            try {
                const response = await fetch('/assets/images/logo.png');
                if (response.ok) {
                    const blob = await response.blob();
                    this.logoData = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    return true;
                }
            } catch (e) {
                console.warn('No se pudo cargar logo desde assets, usando localStorage');
            }

            // Fallback a localStorage
            if (logoBase64) {
                if (logoBase64.startsWith('data:image')) {
                    this.logoData = logoBase64;
                } else {
                    this.logoData = 'data:image/png;base64,' + logoBase64;
                }
                return true;
            }
            this.logoData = null;
            return false;
        } catch (error) {
            console.warn('Error cargando logo:', error);
            this.logoData = null;
            return false;
        }
    },

    /**
     * Cargar logo de organización desde localStorage
     */
    async cargarLogoOrganizacion() {
        try {
            const logoOrgBase64 = localStorage.getItem('organizacionLogo');
            if (logoOrgBase64) {
                if (logoOrgBase64.startsWith('data:image')) {
                    this.logoOrganizacionData = logoOrgBase64;
                } else {
                    this.logoOrganizacionData = 'data:image/png;base64,' + logoOrgBase64;
                }
                return true;
            }
            this.logoOrganizacionData = null;
            return false;
        } catch (error) {
            console.error('Error cargando logo de organización:', error);
            this.logoOrganizacionData = null;
            return false;
        }
    },

    /**
     * Cargar imagen desde Firebase con proxy CORS
     * @param {string} url - URL de la imagen
     * @returns {Promise<string|null>} - Imagen en base64 o null
     */
    async cargarImagenFirebase(url) {
        if (!url) return null;

        try {
            const fetchOptions = {
                headers: {}
            };

            if (this.authToken) {
                fetchOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            let response = await fetch(url, fetchOptions).catch(() => null);

            if (!response || !response.ok) {
                const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                response = await fetch(proxyUrl, fetchOptions);
            }

            if (!response || !response.ok) {
                throw new Error(`HTTP error! status: ${response?.status}`);
            }

            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) {
                throw new Error('El blob no es una imagen válida');
            }

            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });

        } catch (error) {
            console.error('Error cargando imagen:', error);
            return null;
        }
    },

    /**
     * Ajustar texto al ancho máximo
     */
    ajustarTexto(pdf, texto, anchoMaximo) {
        if (!texto) return [''];
        const textoStr = texto.toString();
        const palabras = textoStr.split(' ');
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

    /**
     * Formatear fecha para nombre de archivo
     */
    formatearFecha(fecha) {
        const d = fecha;
        return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    },

    /**
     * Formatear fecha para visualización
     */
    formatearFechaVisualizacion(fecha) {
        return fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Formatear hora para visualización
     */
    formatearHoraVisualizacion(fecha) {
        return fecha.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /**
     * Actualizar barra de progreso en SweetAlert
     */
    actualizarProgreso(porcentaje) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) progressBar.style.width = `${porcentaje}%`;
    },

    /**
     * Mostrar opciones de descarga/visualización
     */
    async mostrarOpcionesDescarga(pdf, nombreArchivo) {
        const result = await Swal.fire({
            title: 'Informe Generado',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-file-pdf" style="font-size: 48px; color: #c0392b; margin-bottom: 16px;"></i>
                    <p style="color: #333; margin: 10px 0;">
                        El Informe de Incidencia se ha generado correctamente.
                    </p>
                </div>
            `,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'DESCARGAR',
            cancelButtonText: 'CANCELAR',
            showDenyButton: true,
            denyButtonText: 'VISUALIZAR',
            confirmButtonColor: '#1a3b5d',
            denyButtonColor: '#c9a03d',
            cancelButtonColor: '#666'
        });

        if (result.isConfirmed) {
            pdf.save(nombreArchivo);
        } else if (result.isDenied) {
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        }
    },

    /**
     * Dibujar encabezado en todas las páginas
     */
    dibujarEncabezado(pdf, incidencia, paginaActual, totalPaginas) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const altoPagina = pdf.internal.pageSize.getHeight();
        const anchoContenido = anchoPagina - (margen * 2);
        const dimensiones = this.dimensionesLogo;

        // Línea superior decorativa
        pdf.setDrawColor(coloresIPH.primario);
        pdf.setFillColor(coloresIPH.primario);
        pdf.rect(0, 0, anchoPagina, 5, 'F');

        // Logo Centinela (izquierda)
        let xPos = margen;
        if (this.logoData) {
            try {
                pdf.addImage(this.logoData, 'PNG', xPos, 8, dimensiones.ancho, dimensiones.alto);
                xPos += dimensiones.ancho + dimensiones.separacion;
            } catch (e) {
                console.warn('No se pudo agregar logo Centinela');
            }
        }

        // Línea vertical separadora
        if (this.logoData && this.logoOrganizacionData) {
            pdf.setDrawColor(coloresIPH.secundario);
            pdf.setLineWidth(0.5);
            pdf.line(xPos, 8, xPos, 8 + dimensiones.alto);
            xPos += dimensiones.separacion;
        }

        // Logo Organización (derecha)
        if (this.logoOrganizacionData) {
            try {
                pdf.addImage(this.logoOrganizacionData, 'PNG', xPos, 8, dimensiones.ancho, dimensiones.alto);
            } catch (e) {
                console.warn('No se pudo agregar logo organización');
            }
        }

        // Título del informe
        pdf.setTextColor(coloresIPH.primario);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.titulo);

        const fechaActual = new Date();
        const fechaStr = this.formatearFechaVisualizacion(fechaActual);
        const titulo = `INFORME DE INCIDENCIA - ${incidencia.id?.substring(0, 8) || 'N/A'}`;

        // Posicionar título centrado entre logos y borde derecho
        const tituloX = anchoPagina / 2;
        pdf.text(titulo, tituloX, 20, { align: 'center' });

        // Fecha en el lado derecho
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text(`Fecha: ${fechaStr}`, anchoPagina - margen, 20, { align: 'right' });

        // Línea separadora inferior del encabezado
        pdf.setDrawColor(coloresIPH.borde);
        pdf.setLineWidth(0.5);
        pdf.line(margen, 35, anchoPagina - margen, 35);
    },

    /**
     * Dibujar pie de página en todas las páginas
     */
    dibujarPiePagina(pdf, paginaActual, totalPaginas) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const altoPagina = pdf.internal.pageSize.getHeight();
        const yPos = altoPagina - 15;

        // Línea separadora superior del pie
        pdf.setDrawColor(coloresIPH.borde);
        pdf.setLineWidth(0.5);
        pdf.line(margen, yPos - 5, anchoPagina - margen, yPos - 5);

        // Texto del sistema
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text('Informe generado con Sistema Centinela-MX', margen, yPos);

        // Número de página
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text(`Página ${paginaActual} de ${totalPaginas}`, anchoPagina - margen, yPos, { align: 'right' });
    },

    /**
     * Generar IPH para una incidencia
     * @param {Object} incidencia - Objeto de incidencia
     * @param {Object} opciones - Opciones adicionales
     * @returns {Promise<Object>} - PDF generado
     */
    async generarIPH(incidencia, opciones = {}) {
        try {
            const {
                mostrarAlerta = true,
                tituloAlerta = 'Generando Informe de Incidencia...',
                onProgress = null
            } = opciones;

            if (mostrarAlerta) {
                Swal.fire({
                    title: tituloAlerta,
                    html: '<div class="progress-bar-container" style="width:100%; height:20px; background:rgba(255,255,255,0.1); border-radius:10px; margin-top:10px;"><div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:10px; transition:width 0.3s;"></div></div>',
                    allowOutsideClick: false,
                    showConfirmButton: false
                });
            }

            await this.cargarLibrerias();
            await this.cargarLogo();
            await this.cargarLogoOrganizacion();

            const pdf = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Primero calculamos el total de páginas (esto es una aproximación)
            this.totalPaginas = await this.calcularTotalPaginas(incidencia);

            // Generamos el contenido
            await this.generarPaginaIPH(pdf, incidencia, 1, onProgress);

            const nombreArchivo = `INFORME_INCIDENCIA_${incidencia.id?.substring(0, 8) || 'incidencia'}_${this.formatearFecha(new Date())}.pdf`;

            if (mostrarAlerta) {
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;

        } catch (error) {
            console.error('Error generando informe:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Error al generar el informe'
                });
            }
            throw error;
        }
    },

    /**
     * Calcular aproximación del total de páginas
     */
    async calcularTotalPaginas(incidencia) {
        let total = 1; // Página principal

        const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

        // Estimación basada en imágenes y seguimientos
        if (incidencia.imagenes && incidencia.imagenes.length > 3) {
            total += Math.ceil((incidencia.imagenes.length - 3) / 6);
        }

        if (seguimientos.length > 0) {
            total += Math.ceil(seguimientos.length / 2);
        }

        return total;
    },

    /**
     * Generar página de IPH
     */
    async generarPaginaIPH(pdf, incidencia, paginaNum, onProgress) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = 45; // Comenzar después del encabezado

        // Dibujar encabezado en todas las páginas
        this.dibujarEncabezado(pdf, incidencia, paginaNum, this.totalPaginas);

        // =============================================
        // IDENTIFICACIÓN DE LA UNIDAD/PERSONA
        // =============================================
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, 15, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('IDENTIFICACIÓN DE LA UNIDAD/PERSONA', margen + 2, yPos);

        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);
        pdf.text(`ORGANIZACIÓN: ${this.organizacionActual?.nombre || 'No especificada'}`, margen + 2, yPos);
        yPos += 4;
        pdf.text(`SUCURSAL: ${this.obtenerNombreSucursal(incidencia.sucursalId)}`, margen + 2, yPos);

        yPos += 8;

        // =============================================
        // DATOS GENERALES DE LA PUESTA A DISPOSICIÓN
        // =============================================
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, 20, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('DATOS GENERALES DE LA PUESTA A DISPOSICIÓN', margen + 2, yPos);

        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);

        const fechaReporte = incidencia.fechaCreacion ? new Date(incidencia.fechaCreacion) : new Date();
        const fechaStr = this.formatearFechaVisualizacion(fechaReporte);
        const horaStr = this.formatearHoraVisualizacion(fechaReporte);

        pdf.text(`FECHA DEL REPORTE: ${fechaStr}`, margen + 2, yPos);
        pdf.text(`HORA DEL REPORTE: ${horaStr}`, margen + 80, yPos);

        yPos += 4;
        pdf.text(`NÚMERO DE CARPETA DE INVESTIGACIÓN (N.C.I.): ${incidencia.id?.substring(0, 8) || 'N/A'}`, margen + 2, yPos);

        yPos += 4;
        pdf.text(`MINISTERIO PÚBLICO: ${this.obtenerNombreUsuario(incidencia.reportadoPorId)}`, margen + 2, yPos);

        yPos += 8;

        // =============================================
        // CLASIFICACIÓN DE LA INCIDENCIA
        // =============================================
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, 35, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('CLASIFICACIÓN DE LA INCIDENCIA', margen + 2, yPos);

        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);

        pdf.text(`CATEGORÍAS: ${this.obtenerNombreCategoria(incidencia.categoriaId)}`, margen + 2, yPos);
        yPos += 4;
        pdf.text(`SUBCATEGORÍAS: ${this.obtenerNombreSubcategoria(incidencia.subcategoriaId)}`, margen + 2, yPos);
        yPos += 4;

        const nivelRiesgo = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
        pdf.text(`NIVEL DE RIESGO: ${nivelRiesgo?.toUpperCase() || 'NO ESPECIFICADO'}`, margen + 2, yPos);

        yPos += 4;
        const estado = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;
        pdf.text(`ESTADO (Actual): ${estado?.toUpperCase() || 'NO ESPECIFICADO'}`, margen + 2, yPos);

        yPos += 4;
        const fechaInicio = incidencia.fechaInicio ? new Date(incidencia.fechaInicio) : new Date();
        pdf.text(`FECHA INCIDENCIA: ${this.formatearFechaVisualizacion(fechaInicio)}`, margen + 2, yPos);
        pdf.text(`HORA INCIDENCIA: ${this.formatearHoraVisualizacion(fechaInicio)}`, margen + 80, yPos);

        yPos += 8;

        // =============================================
        // REPORTADO POR
        // =============================================
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, 15, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('REPORTADO POR:', margen + 2, yPos);

        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);

        const reportadoPor = this.obtenerNombreUsuario(incidencia.reportadoPorId);
        const cargo = this.obtenerCargoUsuario(incidencia.reportadoPorId);

        pdf.text(`${reportadoPor}`, margen + 2, yPos);
        yPos += 4;
        pdf.text(`CARGO / PUESTO: ${cargo}`, margen + 2, yPos);

        yPos += 8;

        // =============================================
        // DESCRIPCIÓN DE LA INCIDENCIA
        // =============================================
        const alturaDescripcion = 40;
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, alturaDescripcion, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('DESCRIPCIÓN DE LA INCIDENCIA:', margen + 2, yPos);

        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);

        const descripcion = incidencia.detalles || 'No hay descripción disponible.';
        const lineasDesc = this.ajustarTexto(pdf, descripcion, anchoContenido - 10);

        let lineaY = yPos;
        lineasDesc.slice(0, 5).forEach((linea, i) => {
            pdf.text(linea, margen + 5, lineaY + (i * 4));
        });

        yPos += alturaDescripcion - 5;

        // =============================================
        // ANEXOS - EVIDENCIAS FOTOGRÁFICAS PRINCIPALES
        // =============================================
        if (incidencia.imagenes && incidencia.imagenes.length > 0) {
            yPos += 5;

            pdf.setFillColor(coloresIPH.fondo);
            pdf.setDrawColor(coloresIPH.borde);
            pdf.rect(margen, yPos - 3, anchoContenido, 45, 'FD');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(coloresIPH.primario);
            pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS PRINCIPALES', margen + 2, yPos);

            yPos += 5;

            const imgWidth = 45;
            const imgHeight = 35;
            const espaciado = 5;

            for (let i = 0; i < Math.min(incidencia.imagenes.length, 3); i++) {
                const xPos = margen + 5 + (i * (imgWidth + espaciado));

                pdf.setDrawColor(coloresIPH.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');

                try {
                    let imgUrl = '';
                    let comentario = '';

                    if (typeof incidencia.imagenes[i] === 'object') {
                        imgUrl = incidencia.imagenes[i].url || '';
                        comentario = incidencia.imagenes[i].comentario || '';
                    } else {
                        imgUrl = String(incidencia.imagenes[i]);
                    }

                    if (imgUrl) {
                        const imgData = await this.cargarImagenFirebase(imgUrl);

                        if (imgData) {
                            pdf.addImage(imgData, 'JPEG', xPos + 2, yPos + 2, imgWidth - 4, imgHeight - 4, undefined, 'FAST');

                            if (onProgress) onProgress(Math.round((i + 1) / incidencia.imagenes.length * 25));
                        } else {
                            pdf.setFillColor(245, 245, 245);
                            pdf.rect(xPos + 2, yPos + 2, imgWidth - 4, imgHeight - 4, 'F');
                            pdf.setFont('helvetica', 'bold');
                            pdf.setFontSize(this.fonts.mini);
                            pdf.setTextColor(coloresIPH.texto);
                            pdf.text('📷', xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                        }
                    } else {
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.mini);
                        pdf.setTextColor(coloresIPH.texto);
                        pdf.text(`FOTO ${i + 1}`, xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                    }

                    if (comentario) {
                        pdf.setFont('helvetica', 'italic');
                        pdf.setFontSize(this.fonts.mini - 0.5);
                        pdf.setTextColor(coloresIPH.textoClaro);
                        const comentCorto = comentario.length > 25 ? comentario.substring(0, 22) + '...' : comentario;
                        pdf.text(comentCorto, xPos + (imgWidth / 2), yPos + imgHeight + 4, { align: 'center' });
                    }
                } catch (error) {
                    console.warn(`Error procesando imagen principal ${i + 1}:`, error);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.mini);
                    pdf.setTextColor(coloresIPH.texto);
                    pdf.text(`FOTO ${i + 1}`, xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                }
            }

            yPos += imgHeight + 10;
        }

        // =============================================
        // EVIDENCIAS DE CONTINUACIÓN (MÁS DE 3 IMÁGENES)
        // =============================================
        if (incidencia.imagenes && incidencia.imagenes.length > 3) {
            const imagenesRestantes = incidencia.imagenes.slice(3);
            const filasNecesarias = Math.ceil(imagenesRestantes.length / 3);

            for (let fila = 0; fila < filasNecesarias; fila++) {
                if (yPos > 220) {
                    pdf.addPage();
                    paginaNum++;
                    this.dibujarEncabezado(pdf, incidencia, paginaNum, this.totalPaginas);
                    yPos = 45;

                    pdf.setFillColor(coloresIPH.fondo);
                    pdf.setDrawColor(coloresIPH.borde);
                    pdf.rect(margen, yPos - 3, anchoContenido, 45, 'FD');

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.normal);
                    pdf.setTextColor(coloresIPH.primario);
                    pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS (CONTINUACIÓN)', margen + 2, yPos);
                    yPos += 5;
                }

                const imgWidth = 45;
                const imgHeight = 35;
                const espaciado = 5;

                for (let i = 0; i < 3; i++) {
                    const index = fila * 3 + i;
                    if (index >= incidencia.imagenes.length) break;

                    const xPos = margen + 5 + (i * (imgWidth + espaciado));

                    pdf.setDrawColor(coloresIPH.borde);
                    pdf.setFillColor(255, 255, 255);
                    pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');

                    try {
                        let imgUrl = '';
                        let comentario = '';

                        if (typeof incidencia.imagenes[index] === 'object') {
                            imgUrl = incidencia.imagenes[index].url || '';
                            comentario = incidencia.imagenes[index].comentario || '';
                        } else {
                            imgUrl = String(incidencia.imagenes[index]);
                        }

                        if (imgUrl) {
                            const imgData = await this.cargarImagenFirebase(imgUrl);

                            if (imgData) {
                                pdf.addImage(imgData, 'JPEG', xPos + 2, yPos + 2, imgWidth - 4, imgHeight - 4, undefined, 'FAST');

                                if (onProgress) onProgress(Math.round((index + 1) / incidencia.imagenes.length * 50));
                            } else {
                                pdf.setFillColor(245, 245, 245);
                                pdf.rect(xPos + 2, yPos + 2, imgWidth - 4, imgHeight - 4, 'F');
                                pdf.setFont('helvetica', 'bold');
                                pdf.setFontSize(this.fonts.mini);
                                pdf.setTextColor(coloresIPH.texto);
                                pdf.text('📷', xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                            }
                        } else {
                            pdf.setFont('helvetica', 'bold');
                            pdf.setFontSize(this.fonts.mini);
                            pdf.setTextColor(coloresIPH.texto);
                            pdf.text(`FOTO ${index + 1}`, xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                        }

                        if (comentario) {
                            pdf.setFont('helvetica', 'italic');
                            pdf.setFontSize(this.fonts.mini - 0.5);
                            pdf.setTextColor(coloresIPH.textoClaro);
                            const comentCorto = comentario.length > 25 ? comentario.substring(0, 22) + '...' : comentario;
                            pdf.text(comentCorto, xPos + (imgWidth / 2), yPos + imgHeight + 4, { align: 'center' });
                        }
                    } catch (error) {
                        console.warn(`Error procesando imagen continuación ${index + 1}:`, error);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.mini);
                        pdf.setTextColor(coloresIPH.texto);
                        pdf.text(`FOTO ${index + 1}`, xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                    }
                }
                yPos += imgHeight + 15;
            }
        }

        // =============================================
        // HISTORIAL DE SEGUIMIENTO CON EVIDENCIAS
        // =============================================
        const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

        if (seguimientos.length > 0) {
            yPos += 10;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.subtitulo);
            pdf.setTextColor(coloresIPH.primario);
            pdf.text('HISTORIAL DE SEGUIMIENTO', margen, yPos);
            yPos += 8;

            for (let s = 0; s < seguimientos.length; s++) {
                const seg = seguimientos[s];

                if (yPos > 250) {
                    pdf.addPage();
                    paginaNum++;
                    this.dibujarEncabezado(pdf, incidencia, paginaNum, this.totalPaginas);
                    yPos = 45;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.subtitulo);
                    pdf.setTextColor(coloresIPH.primario);
                    pdf.text('HISTORIAL DE SEGUIMIENTO (CONTINUACIÓN)', margen, yPos);
                    yPos += 8;
                }

                pdf.setFillColor(coloresIPH.fondo);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.rect(margen, yPos - 3, anchoContenido, 40, 'FD');

                pdf.setFillColor(coloresIPH.secundario);
                pdf.circle(margen + 12, yPos + 8, 6, 'F');
                pdf.setTextColor(coloresIPH.primario);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.normal);
                pdf.text((s + 1).toString(), margen + 12, yPos + 9, { align: 'center' });

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.primario);

                let fechaStr = 'N/A';
                if (seg.fecha) {
                    const fecha = seg.fecha.toDate ? seg.fecha.toDate() : new Date(seg.fecha);
                    fechaStr = fecha.toLocaleString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }

                pdf.text(fechaStr, margen + 25, yPos + 5);

                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini);
                pdf.setTextColor(coloresIPH.texto);
                pdf.text(`por: ${seg.usuarioNombre || 'Usuario'}`, margen + 25, yPos + 12);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.texto);

                const descSeg = seg.descripcion || 'Sin descripción';
                const lineasSeg = this.ajustarTexto(pdf, descSeg, anchoContenido - 35);
                lineasSeg.slice(0, 2).forEach((linea, i) => {
                    pdf.text(linea, margen + 25, yPos + 20 + (i * 5));
                });

                yPos += 45;

                if (seg.evidencias && seg.evidencias.length > 0) {
                    if (yPos > 250) {
                        pdf.addPage();
                        paginaNum++;
                        this.dibujarEncabezado(pdf, incidencia, paginaNum, this.totalPaginas);
                        yPos = 45;
                    }

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresIPH.primario);
                    pdf.text(`Evidencias del seguimiento #${s + 1}:`, margen, yPos);
                    yPos += 5;

                    const evidenciaWidth = 40;
                    const evidenciaHeight = 30;
                    const espaciadoEvidencia = 5;

                    for (let e = 0; e < Math.min(seg.evidencias.length, 5); e++) {
                        if (e > 0 && e % 3 === 0) {
                            yPos += evidenciaHeight + 10;

                            if (yPos > 250) {
                                pdf.addPage();
                                paginaNum++;
                                this.dibujarEncabezado(pdf, incidencia, paginaNum, this.totalPaginas);
                                yPos = 45;
                                pdf.setFont('helvetica', 'bold');
                                pdf.setFontSize(this.fonts.small);
                                pdf.setTextColor(coloresIPH.primario);
                                pdf.text(`Evidencias del seguimiento #${s + 1} (continuación):`, margen, yPos);
                                yPos += 5;
                            }
                        }

                        const columna = e % 3;
                        const xPos = margen + (columna * (evidenciaWidth + espaciadoEvidencia));

                        pdf.setDrawColor(coloresIPH.borde);
                        pdf.setFillColor(255, 255, 255);
                        pdf.roundedRect(xPos, yPos, evidenciaWidth, evidenciaHeight, 2, 2, 'FD');

                        pdf.setFillColor(coloresIPH.secundario);
                        pdf.circle(xPos + 8, yPos + 8, 4, 'F');
                        pdf.setTextColor(coloresIPH.primario);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.mini);
                        pdf.text((e + 1).toString(), xPos + 8, yPos + 8.5, { align: 'center' });

                        try {
                            let evidenciaUrl = '';
                            let evidenciaComentario = '';

                            if (typeof seg.evidencias[e] === 'object') {
                                evidenciaUrl = seg.evidencias[e].url || '';
                                evidenciaComentario = seg.evidencias[e].comentario || '';
                            } else {
                                evidenciaUrl = String(seg.evidencias[e]);
                            }

                            if (evidenciaUrl) {
                                const imgData = await this.cargarImagenFirebase(evidenciaUrl);

                                if (imgData) {
                                    pdf.addImage(imgData, 'JPEG', xPos + 2, yPos + 2, evidenciaWidth - 4, evidenciaHeight - 4, undefined, 'FAST');

                                    if (onProgress) onProgress(75 + Math.round((e + 1) / seg.evidencias.length * 15));
                                } else {
                                    pdf.setFillColor(245, 245, 245);
                                    pdf.rect(xPos + 2, yPos + 2, evidenciaWidth - 4, evidenciaHeight - 4, 'F');
                                    pdf.setFont('helvetica', 'bold');
                                    pdf.setFontSize(this.fonts.mini);
                                    pdf.setTextColor(coloresIPH.texto);
                                    pdf.text('📷', xPos + (evidenciaWidth / 2), yPos + (evidenciaHeight / 2), { align: 'center' });
                                }
                            }

                            if (evidenciaComentario) {
                                pdf.setFont('helvetica', 'italic');
                                pdf.setFontSize(this.fonts.mini - 0.5);
                                pdf.setTextColor(coloresIPH.textoClaro);
                                const comentCorto = evidenciaComentario.length > 20 ? evidenciaComentario.substring(0, 17) + '...' : evidenciaComentario;
                                pdf.text(comentCorto, xPos + (evidenciaWidth / 2), yPos + evidenciaHeight + 4, { align: 'center' });
                            }
                        } catch (error) {
                            console.warn(`Error procesando evidencia ${e + 1} del seguimiento ${s + 1}:`, error);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setFontSize(this.fonts.mini);
                            pdf.setTextColor(coloresIPH.texto);
                            pdf.text('📷', xPos + (evidenciaWidth / 2), yPos + (evidenciaHeight / 2), { align: 'center' });
                        }
                    }
                    yPos += evidenciaHeight + 15;
                }
                yPos += 5;
            }
        }

        // =============================================
        // CADENA DE CUSTODIA Y FIRMAS
        // =============================================
        if (yPos > 220) {
            pdf.addPage();
            paginaNum++;
            this.dibujarEncabezado(pdf, incidencia, paginaNum, this.totalPaginas);
            yPos = 45;
        }

        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, 15, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('DETALLE DE CADENA DE CUSTODIA (si aplica)', margen + 2, yPos);

        yPos += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);

        pdf.text('____________________________________', margen, yPos);
        pdf.text('____________________________________', anchoPagina - margen - 60, yPos);

        yPos += 4;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.text('FIRMA DEL AGENTE REPORTANTE', margen, yPos);
        pdf.text('FIRMA DEL REVISOR / SUPERVISOR', anchoPagina - margen - 60, yPos);

        yPos += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.text('____________________________________', margen, yPos);

        yPos += 4;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.text('FIRMA DE LA AUTORIDAD RECEPTORA', margen, yPos);

        yPos += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.mini);
        pdf.text(`FECHA DE FIRMA: ${this.formatearFechaVisualizacion(new Date())}`, margen, yPos);

        yPos += 10;

        // =============================================
        // AVISO DE PRIVACIDAD
        // =============================================
        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos, anchoContenido, 20, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('AVISO DE PRIVACIDAD', margen + 2, yPos + 4);

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini - 0.5);
        pdf.setTextColor(coloresIPH.textoClaro);

        const aviso = 'La privacidad de esta información se garantiza a la vez que el responsable del tratamiento sea el responsable de la protección de datos personales. La finalidad de la gestión de datos es la prestación de servicios públicos y la promoción de la igualdad de oportunidades.';
        const lineasAviso = this.ajustarTexto(pdf, aviso, anchoContenido - 10);

        lineasAviso.slice(0, 3).forEach((linea, i) => {
            pdf.text(linea, margen + 2, yPos + 8 + (i * 3));
        });

        // Dibujar pie de página en todas las páginas
        this.dibujarPiePagina(pdf, paginaNum, this.totalPaginas);
    },

    /**
     * Generar IPH para múltiples incidencias
     * @param {Array} incidencias - Array de objetos de incidencia
     * @param {Object} opciones - Opciones adicionales
     */
    async generarIPHMultiple(incidencias, opciones = {}) {
        try {
            if (incidencias.length === 0) return;

            const {
                mostrarAlerta = true,
                tituloAlerta = 'Generando Informes de Incidencia...'
            } = opciones;

            if (mostrarAlerta) {
                Swal.fire({
                    title: tituloAlerta,
                    html: `<div>Procesando ${incidencias.length} incidencia(s)...</div>`,
                    allowOutsideClick: false,
                    showConfirmButton: false
                });
            }

            for (let i = 0; i < incidencias.length; i++) {
                if (mostrarAlerta) {
                    Swal.update({
                        html: `<div>Procesando incidencia ${i + 1} de ${incidencias.length}...</div>`
                    });
                }
                await this.generarIPH(incidencias[i], { mostrarAlerta: false });
            }

            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'success',
                    title: '¡Completado!',
                    text: `Se generaron ${incidencias.length} informes correctamente.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            }

        } catch (error) {
            console.error('Error generando múltiples informes:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message
                });
            }
            throw error;
        }
    }
};

// Exportar instancia única
export default generadorIPH;