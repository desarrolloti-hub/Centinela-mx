// generadorPDFMapaCalor.js - Componente externo para generar PDF del mapa de calor
// Totalmente independiente, no modifica tu lógica existente

// generadorPDFMapaCalor.js - Componente externo para generar PDF del mapa de calor
// Totalmente independiente, no modifica tu lógica existente

export class GeneradorPDFMapaCalor {
    constructor() {
        this.generando = false;
        this.estiloOriginal = null;
        this.capasOriginales = [];
    }

    /**
     * Captura el mapa actual con el heatmap activo y genera un PDF
     * @param {Object} mapa - Instancia del mapa de Leaflet
     * @param {Object} opciones - Opciones adicionales
     * @returns {Promise<boolean>} - True si se generó correctamente
     */
    async generarPDF(mapa, opciones = {}) {
        if (this.generando) {
            Swal.fire({
                icon: 'info',
                title: 'Espera',
                text: 'Ya se está generando un PDF, espera un momento...',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return false;
        }

        if (!mapa) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo capturar el mapa',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            return false;
        }

        this.generando = true;

        try {
            // Mostrar alerta de progreso
            Swal.fire({
                title: 'Generando PDF del Mapa de Calor',
                html: `
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-fire" style="font-size: 48px; color: #ff8844;"></i>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.1); border-radius: 10px; margin-top: 10px; overflow: hidden;">
                        <div id="pdfProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ff8844, #ff4444); border-radius: 10px; transition: width 0.3s ease;"></div>
                    </div>
                    <p id="pdfProgressText" style="margin-top: 12px; font-size: 0.85rem;">Capturando mapa...</p>
                `,
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    // Actualizar progreso inicial
                    const barra = document.getElementById('pdfProgressBar');
                    const texto = document.getElementById('pdfProgressText');
                    if (barra) barra.style.width = '10%';
                    if (texto) texto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturando mapa...';
                }
            });

            // Capturar el mapa como imagen
            const imagenMapa = await this._capturarMapa(mapa);
            
            if (!imagenMapa) {
                throw new Error('No se pudo capturar el mapa');
            }

            // Actualizar progreso
            this._actualizarProgreso(50, 'Generando PDF...');

            // Asegurar que jsPDF está cargado
            await this._cargarLibrerias();

            // Generar el PDF
            const pdf = await this._crearPDF(imagenMapa, opciones);

            // Actualizar progreso
            this._actualizarProgreso(90, 'Finalizando...');

            // Obtener nombre del archivo
            const fecha = this._formatearFechaArchivo();
            const organizacion = this._obtenerOrganizacion();
            const nombreArchivo = `MAPA_CALOR_${organizacion}_${fecha}.pdf`;

            // Cerrar alerta
            Swal.close();
            
            // Mostrar opciones de descarga
            await this._mostrarOpcionesDescarga(pdf, nombreArchivo);
            
            this.generando = false;
            return true;

        } catch (error) {
            console.error('Error generando PDF del mapa de calor:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo generar el PDF del mapa de calor',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
            this.generando = false;
            return false;
        }
    }

    /**
     * Actualiza la barra de progreso
     */
    _actualizarProgreso(porcentaje, mensaje) {
        const barra = document.getElementById('pdfProgressBar');
        const texto = document.getElementById('pdfProgressText');
        if (barra) barra.style.width = `${porcentaje}%`;
        if (texto) texto.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${mensaje}`;
    }

    /**
     * Captura el mapa actual como imagen
     */
    async _capturarMapa(mapa) {
        return new Promise(async (resolve, reject) => {
            try {
                // Asegurar que html2canvas está disponible
                if (typeof html2canvas === 'undefined') {
                    // Cargar html2canvas si no está disponible
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = async () => {
                        const imagen = await this._capturarConCanvas(mapa);
                        resolve(imagen);
                    };
                    script.onerror = () => reject(new Error('No se pudo cargar html2canvas'));
                    document.head.appendChild(script);
                } else {
                    const imagen = await this._capturarConCanvas(mapa);
                    resolve(imagen);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Captura usando canvas
     */
    async _capturarConCanvas(mapa) {
        // Obtener el contenedor del mapa
        const contenedorMapa = mapa.getContainer();
        
        // Esperar un momento para que el mapa se estabilice
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
            const canvas = await html2canvas(contenedorMapa, {
                scale: 2,
                backgroundColor: null,
                logging: false,
                useCORS: true,
                allowTaint: false,
                onclone: (clonedDoc, element) => {
                    // Asegurar que los tiles del mapa se carguen correctamente
                    console.log('Clonando documento para captura...');
                }
            });
            
            return canvas.toDataURL('image/png', 1.0);
            
        } catch (error) {
            console.error('Error en html2canvas:', error);
            throw new Error('No se pudo capturar el mapa: ' + error.message);
        }
    }

    /**
     * Carga las librerías necesarias para el PDF
     */
    async _cargarLibrerias() {
        // Verificar si jsPDF ya está disponible
        if (window.jspdf && window.jspdf.jsPDF) {
            return Promise.resolve();
        }
        
        // Intentar obtener jsPDF de diferentes formas
        if (typeof jspdf !== 'undefined') {
            window.jspdf = { jsPDF: jspdf };
            return Promise.resolve();
        }
        
        // Cargar jsPDF
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                // Esperar a que se inicialice
                setTimeout(() => {
                    if (window.jspdf && window.jspdf.jsPDF) {
                        resolve();
                    } else if (typeof jspdf !== 'undefined') {
                        window.jspdf = { jsPDF: jspdf };
                        resolve();
                    } else {
                        reject(new Error('No se pudo cargar jsPDF'));
                    }
                }, 200);
            };
            script.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
            document.head.appendChild(script);
        });
    }

    /**
     * Crea el PDF con la imagen del mapa
     */
    async _crearPDF(imagenMapa, opciones = {}) {
        // Obtener jsPDF
        let jsPDFLib;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDFLib = window.jspdf.jsPDF;
        } else if (typeof jspdf !== 'undefined') {
            jsPDFLib = jspdf;
        } else {
            throw new Error('jsPDF no está disponible');
        }
        
        // Crear PDF en orientación horizontal para mejor visualización del mapa
        const pdf = new jsPDFLib({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const altoPagina = pdf.internal.pageSize.getHeight();
        const margen = 10;
        
        // Calcular dimensiones de la imagen
        const anchoImagen = anchoPagina - (margen * 2);
        const altoImagen = altoPagina - 45; // Dejar espacio para título y pie
        
        // Dibujar borde decorativo
        pdf.setDrawColor(201, 160, 61);
        pdf.setLineWidth(0.5);
        pdf.rect(margen - 2, margen - 2, anchoPagina - (margen * 2) + 4, altoPagina - (margen * 2) + 4, 'S');
        
        // =============================================
        // ENCABEZADO
        // =============================================
        // Título principal
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(26, 59, 93);
        pdf.text('MAPA DE CALOR - CENTINELA', anchoPagina / 2, 12, { align: 'center' });
        
        // Subtítulo
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Reporte de zonas de calor por incidencias', anchoPagina / 2, 19, { align: 'center' });
        
        // Línea decorativa
        pdf.setDrawColor(201, 160, 61);
        pdf.setLineWidth(0.5);
        pdf.line(margen, 23, anchoPagina - margen, 23);
        
        // =============================================
        // IMAGEN DEL MAPA
        // =============================================
        const yImagen = 28;
        
        // Fondo blanco para la imagen
        pdf.setFillColor(255, 255, 255);
        pdf.rect(margen, yImagen, anchoImagen, altoImagen, 'F');
        
        // Agregar la imagen del mapa
        pdf.addImage(imagenMapa, 'PNG', margen, yImagen, anchoImagen, altoImagen);
        
        // =============================================
        // PIE DE PÁGINA
        // =============================================
        const yPie = altoPagina - 10;
        
        pdf.setDrawColor(201, 160, 61);
        pdf.setLineWidth(0.3);
        pdf.line(margen, yPie - 3, anchoPagina - margen, yPie - 3);
        
        // Información de la organización
        const organizacion = this._obtenerOrganizacion();
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Organización: ${organizacion}`, margen, yPie);
        
        // Fecha de generación
        const fechaStr = this._formatearFechaVisualizacion(new Date());
        pdf.text(`Generado: ${fechaStr}`, anchoPagina / 2, yPie, { align: 'center' });
        
        // Número de página
        pdf.text('Página 1 de 1', anchoPagina - margen, yPie, { align: 'right' });
        
        // =============================================
        // LEYENDA DEL MAPA DE CALOR
        // =============================================
        this._agregarLeyendaHeatmap(pdf, margen, anchoPagina - margen, yPie - 8);
        
        return pdf;
    }

    /**
     * Agrega una leyenda del mapa de calor al PDF
     */
    _agregarLeyendaHeatmap(pdf, xIzq, xDer, yPos) {
        const anchoLeyenda = 90;
        const xLeyenda = xDer - anchoLeyenda;
        
        pdf.setFontSize(7);
        pdf.setTextColor(80, 80, 80);
        pdf.text('Leyenda de intensidad:', xLeyenda, yPos);
        
        // Colores del heatmap
        const colores = [
            { color: '#00C851', intensidad: 'Baja', pos: 0 },
            { color: '#ffbb33', intensidad: 'Media', pos: 25 },
            { color: '#ff8844', intensidad: 'Alta', pos: 55 },
            { color: '#ff4444', intensidad: 'Crítica', pos: 80 }
        ];
        
        colores.forEach(item => {
            pdf.setFillColor(item.color);
            pdf.rect(xLeyenda + item.pos, yPos + 2, 8, 4, 'F');
            pdf.setFontSize(6);
            pdf.setTextColor(80, 80, 80);
            pdf.text(item.intensidad, xLeyenda + item.pos, yPos - 1);
        });
    }

    /**
     * Obtiene el nombre de la organización
     */
    _obtenerOrganizacion() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const data = JSON.parse(adminInfo);
                return data.organizacionCamelCase || data.organizacion || 'MiEmpresa';
            }
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            return userData.organizacionCamelCase || userData.organizacion || 'MiEmpresa';
        } catch {
            return 'Centinela';
        }
    }

    /**
     * Muestra opciones de descarga del PDF
     */
    async _mostrarOpcionesDescarga(pdf, nombreArchivo) {
        const resultado = await Swal.fire({
            title: 'PDF Generado',
            text: '¿Qué deseas hacer con el PDF del mapa de calor?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'Descargar',
            cancelButtonText: 'Visualizar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#3b82f6',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
        
        if (resultado.isConfirmed) {
            // Descargar
            pdf.save(nombreArchivo);
            Swal.fire({
                icon: 'success',
                title: 'Descargado',
                text: `PDF guardado como ${nombreArchivo}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2500,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
            });
        } else {
            // Visualizar en nueva pestaña
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
    }

    /**
     * Formatea fecha para nombre de archivo
     */
    _formatearFechaArchivo() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        const hora = String(fecha.getHours()).padStart(2, '0');
        const minuto = String(fecha.getMinutes()).padStart(2, '0');
        return `${año}${mes}${dia}_${hora}${minuto}`;
    }

    /**
     * Formatea fecha para visualización
     */
    _formatearFechaVisualizacion(fecha) {
        return fecha.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Instancia única para usar en toda la aplicación
export const generadorPDFMapaCalor = new GeneradorPDFMapaCalor();
