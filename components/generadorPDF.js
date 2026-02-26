// =============================================
// GENERADOR DE PDF ESTILO IPH (INTEGRADO Y CORREGIDO)
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
        // DATOS DEL CASO
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

        const estadoColor = incidencia.estado === 'finalizada' ? '#28a745' : '#ffc107';
        pdf.setTextColor(estadoColor);
        pdf.text(incidencia.getEstadoTexto?.() || incidencia.estado, col2 + 25, yPos);

        const riesgoColor = this.getRiesgoColorHex(incidencia.nivelRiesgo);
        pdf.setTextColor(riesgoColor);
        pdf.text(incidencia.getNivelRiesgoTexto?.() || incidencia.nivelRiesgo, col2 + 25, yPos + 6);

        pdf.setTextColor(0, 0, 0);
        pdf.text(incidencia.reportadoPorId || 'No disponible', col2 + 25, yPos + 12);

        yPos += 25;

        // =============================================
        // FECHAS Y HORARIOS
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

        const fechaInicio = incidencia.getFechaInicioFormateada?.() || new Date(incidencia.fechaInicio).toLocaleString('es-MX');
        const fechaFin = incidencia.getFechaFinalizacionFormateada?.() || (incidencia.fechaFinalizacion ? new Date(incidencia.fechaFinalizacion).toLocaleString('es-MX') : 'En proceso');

        pdf.text(`• Fecha de inicio: ${fechaInicio}`, margen + 5, yPos);
        pdf.text(`• Fecha de finalización: ${fechaFin}`, margen + 5, yPos + 6);
        pdf.text(`• Última actualización: ${incidencia.getFechaCreacionFormateada?.() || 'No disponible'}`, margen + 5, yPos + 12);

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
        // HISTORIAL DE SEGUIMIENTO
        // =============================================

        if (datos.config.incluirSeguimiento) {
            const seguimientos = incidencia.getSeguimientosArray?.() || [];

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

                seguimientos.forEach((seg, index) => {
                    if (yPos > 260) {
                        pdf.addPage();
                        this.agregarEncabezadoPagina(pdf, incidencia.id, pagina++);
                        yPos = 45;
                    }

                    pdf.setFillColor(index % 2 === 0 ? 250 : 245, index % 2 === 0 ? 250 : 245, index % 2 === 0 ? 250 : 245);
                    pdf.rect(margen, yPos - 4, anchoContenido, 20, 'F');

                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(0, 40, 80);

                    const fecha = seg.fecha ? new Date(seg.fecha).toLocaleString('es-MX') : 'Fecha no disponible';
                    pdf.text(`• ${fecha}`, margen + 2, yPos);

                    pdf.setFont('helvetica', 'italic');
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`por: ${seg.usuarioNombre || 'Usuario'}`, margen + 50, yPos);

                    yPos += 5;

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(8);
                    pdf.setTextColor(40, 40, 40);

                    const descSeg = this.ajustarTexto(pdf, seg.descripcion || 'Sin descripción', anchoContenido - 10);
                    descSeg.forEach(linea => {
                        pdf.text(linea, margen + 5, yPos);
                        yPos += 4;
                    });

                    if (seg.evidencias && seg.evidencias.length > 0) {
                        pdf.setFontSize(7);
                        pdf.setTextColor(0, 102, 204);
                        pdf.text(`📷 ${seg.evidencias.length} evidencia(s) adjunta(s)`, margen + 5, yPos + 2);
                        yPos += 6;
                    } else {
                        yPos += 2;
                    }
                });
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

    // NUEVO: Método para cargar imagen con reintentos
    async cargarImagenConReintento(url, intentosRestantes) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            // Configurar CORS
            img.crossOrigin = 'Anonymous';

            // Timeout para la carga
            const timeout = setTimeout(() => {
                img.src = '';
                reject(new Error('Timeout cargando imagen'));
            }, 10000); // 10 segundos máximo

            img.onload = () => {
                clearTimeout(timeout);

                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Comprimir la imagen si es muy grande
                    const maxDimension = 1200;
                    let dataURL;

                    if (img.width > maxDimension || img.height > maxDimension) {
                        // Redimensionar si es necesario
                        const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        dataURL = canvas.toDataURL('image/jpeg', 0.6);
                    } else {
                        dataURL = canvas.toDataURL('image/jpeg', 0.7);
                    }

                    resolve({
                        data: dataURL,
                        width: canvas.width,
                        height: canvas.height
                    });
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = (error) => {
                clearTimeout(timeout);
                console.error('Error cargando imagen:', url, error);
                reject(error);
            };

            // Intentar con diferentes estrategias CORS
            img.src = url;
        });
    },

    // NUEVO: Determinar formato de imagen
    getImageFormat(dataURL) {
        if (dataURL.includes('data:image/png')) {
            return 'PNG';
        } else if (dataURL.includes('data:image/jpeg') || dataURL.includes('data:image/jpg')) {
            return 'JPEG';
        } else if (dataURL.includes('data:image/gif')) {
            return 'GIF';
        }
        return 'JPEG'; // Por defecto
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