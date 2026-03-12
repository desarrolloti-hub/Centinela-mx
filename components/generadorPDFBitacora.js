/**
 * GENERADOR PDF BITÁCORA - Sistema Centinela
 * VERSIÓN: 1.2 - OPTIMIZADO: Más rápido, un solo botón
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES PARA BITÁCORA
// =============================================
export const coloresBitacora = {
    ...coloresBase,
    actividad: '#00cfff'
};

// =============================================
// CLASE GENERADOR PDF BITÁCORA
// =============================================
class GeneradorPDFBitacora extends PDFBaseGenerator {
    constructor() {
        super();

        this.usuarioActual = null;
        this.actividades = [];
        this.fechaSeleccionada = null;
        this.organizacionNombre = '';

        this.fonts = {
            tituloPrincipal: 18,
            titulo: 16,
            subtitulo: 14,
            normal: 11,
            small: 10,
            mini: 9,
            micro: 8
        };
    }

    configurar(config) {
        if (config.usuarioActual) this.usuarioActual = config.usuarioActual;
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.organizacionNombre) this.organizacionNombre = config.organizacionNombre;
        if (config.authToken) this.authToken = config.authToken;
    }

    async cargarLibrerias() {
        try {
            if (!window.jspdf) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }

            if (!window.jspdf?.autoTable) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js');
            }

            this.jsPDF = window.jspdf?.jsPDF;
            if (!this.jsPDF) throw new Error('No se pudo cargar jsPDF');

            return true;
        } catch (error) {
            console.error('Error cargando librerías:', error);
            throw error;
        }
    }

    async generarBitacoraPDF(actividades, fecha, opciones = {}) {
        const startTime = performance.now();

        try {
            const { mostrarAlerta = true } = opciones;

            // Mostrar solo un loading simple y rápido
            if (mostrarAlerta) {
                Swal.fire({
                    title: 'Generando PDF...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }

            // Cargar librerías en paralelo
            await Promise.all([
                this.cargarLibrerias(),
                this.cargarLogoCentinela(),
                this.cargarLogoOrganizacion()
            ]);

            this.actividades = actividades;
            this.fechaSeleccionada = fecha;

            // Crear PDF
            const pdf = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Generar contenido
            this._generarBitacoraDia(pdf, actividades, fecha);

            // Nombre del archivo
            const fechaStr = this._formatearFechaArchivo(fecha);
            const nombreArchivo = `bitacora_${fechaStr}.pdf`;

            const endTime = performance.now();
            console.log(`⏱️ PDF generado en ${(endTime - startTime).toFixed(0)}ms`);

            if (mostrarAlerta) {
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;

        } catch (error) {
            console.error('Error generando bitácora PDF:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo generar la bitácora: ' + error.message,
                    confirmButtonColor: '#00cfff'
                });
            }
            throw error;
        }
    }

    _generarBitacoraDia(pdf, actividades, fecha) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);

        this.paginaActualReal = 1;
        this.totalPaginas = Math.max(1, Math.ceil(actividades.length / 25));

        // Encabezado
        const fechaFormateada = fecha.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.dibujarEncabezadoBase(
            pdf,
            'BITÁCORA DE ACTIVIDADES',
            this.organizacionActual?.nombre || 'SISTEMA CENTINELA'
        );

        let yPos = this.alturaEncabezado + 5;

        // Información del día
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(margen, yPos - 3, anchoContenido, 20, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresBase.primario);
        pdf.text('FECHA CONSULTADA', margen + 5, yPos);
        yPos += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(80, 80, 80);
        pdf.text(fechaFormateada, margen + 5, yPos);
        yPos += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.secundario);
        pdf.text(`Total: ${actividades.length} actividad(es)`, margen + 5, yPos);
        yPos += 12;

        // Tabla de actividades
        if (actividades.length === 0) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(150, 150, 150);
            pdf.text('No hay actividades registradas para esta fecha', anchoPagina / 2, yPos + 20, { align: 'center' });
        } else {
            this._dibujarTablaActividades(pdf, actividades, margen, yPos, anchoContenido);
        }

        // Pie de página
        this.dibujarPiePagina(pdf);
    }

    _dibujarTablaActividades(pdf, actividades, margen, yInicio, anchoContenido) {
        const headers = [['Hora', 'Módulo', 'Tipo', 'Usuario', 'Descripción']];
        const columnWidths = [18, 25, 22, 35, anchoContenido - 100];

        const body = actividades.map(act => {
            const uiData = act.toUI ? act.toUI() : this._extraerUIData(act);
            return [
                uiData.hora || '--:--',
                uiData.modulo || 'N/A',
                uiData.tipo || 'N/A',
                uiData.usuario?.nombre || 'Desconocido',
                uiData.descripcion || 'Sin descripción'
            ];
        });

        pdf.autoTable({
            startY: yInicio,
            head: headers,
            body: body,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
                overflow: 'linebreak',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [0, 207, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: columnWidths[0], halign: 'center' },
                1: { cellWidth: columnWidths[1] },
                2: { cellWidth: columnWidths[2], halign: 'center' },
                3: { cellWidth: columnWidths[3] },
                4: { cellWidth: columnWidths[4] }
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: margen, right: margen },
            didDrawPage: (data) => {
                this.paginaActualReal = data.pageNumber;
            }
        });
    }

    _extraerUIData(act) {
        return {
            id: act.id || act._id || '',
            hora: act.hora || this._extraerHora(act.fecha),
            modulo: act.modulo || 'N/A',
            tipo: act.tipo || act.tipoActividad || 'N/A',
            descripcion: act.descripcion || act.accion || 'Sin descripción',
            usuario: {
                nombre: act.usuarioNombre || act.usuario?.nombre || 'Desconocido',
                correo: act.usuarioCorreo || act.usuario?.correo || ''
            }
        };
    }

    _extraerHora(fecha) {
        if (!fecha) return '--:--';
        try {
            const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
            return fechaObj.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch {
            return '--:--';
        }
    }

    _formatearFechaArchivo(fecha) {
        if (!fecha) return '';
        try {
            const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
            const year = fechaObj.getFullYear();
            const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const day = String(fechaObj.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        } catch {
            return '';
        }
    }
}

export const generadorBitacoraPDF = new GeneradorPDFBitacora();
export default generadorBitacoraPDF;