// componentes/pdfGenerator.js
// Componente reutilizable para generar PDFs con el estilo de Centinela

import jsPDF from 'https://cdn.skypack.dev/jspdf@2.5.1';
import html2canvas from 'https://cdn.skypack.dev/html2canvas@1.4.1';

class PDFGenerator {
    constructor() {
        this.logoBase64 = null;
        this.logoCargado = false;
    }

    /**
     * Obtiene el logo de Centinela en base64
     * @returns {Promise<string|null>} Logo en base64 o null
     */
    async obtenerLogoBase64() {
        if (this.logoCargado && this.logoBase64) {
            return this.logoBase64;
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = '/assets/images/logo.png';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                this.logoBase64 = canvas.toDataURL('image/png');
                this.logoCargado = true;
                resolve(this.logoBase64);
            };
            
            img.onerror = () => {
                console.warn('⚠️ No se pudo cargar el logo de Centinela');
                this.logoCargado = true;
                this.logoBase64 = null;
                resolve(null);
            };
        });
    }

    /**
     * Formatea una fecha para el PDF
     * @param {Date|Object} fecha - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatearFecha(fecha) {
        if (!fecha) return 'No disponible';
        
        try {
            let fechaObj = fecha;
            if (fecha && typeof fecha.toDate === 'function') {
                fechaObj = fecha.toDate();
            }
            if (fechaObj instanceof Date) {
                return fechaObj.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
            return 'Fecha inválida';
        } catch (error) {
            return 'Error en fecha';
        }
    }

    /**
     * Formatea fecha completa para el PDF
     * @param {Date|Object} fecha - Fecha a formatear
     * @returns {string} Fecha completa formateada
     */
    formatearFechaCompleta(fecha) {
        if (!fecha) return 'No disponible';
        
        try {
            let fechaObj = fecha;
            if (fecha && typeof fecha.toDate === 'function') {
                fechaObj = fecha.toDate();
            }
            if (fechaObj instanceof Date) {
                return fechaObj.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return 'Fecha inválida';
        } catch (error) {
            return 'Error en fecha';
        }
    }

    /**
     * Procesa y redimensiona una imagen para el PDF (manteniendo proporciones)
     * @param {string} imagenUrl - URL de la imagen
     * @param {number} size - Tamaño deseado (ancho y alto)
     * @returns {Promise<string|null>} Imagen en base64 redimensionada
     */
    async procesarImagen(imagenUrl, size = 120) {
        if (!imagenUrl || imagenUrl.includes('placeholder')) {
            return null;
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // Calcular dimensiones para centrar y mantener proporción
                const scale = Math.min(size / img.width, size / img.height);
                const x = (size - img.width * scale) / 2;
                const y = (size - img.height * scale) / 2;
                
                // Fondo gris claro
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, size, size);
                
                // Dibujar imagen centrada
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                resolve(canvas.toDataURL('image/png'));
            };
            
            img.onerror = () => {
                resolve(null);
            };
            
            img.src = imagenUrl;
        });
    }

    /**
     * Genera el HTML base del encabezado del PDF
     * @param {string} titulo - Título del reporte
     * @param {string} subtitulo - Subtítulo del reporte
     * @param {string} fechaActual - Fecha de generación
     * @param {string} filtro - Filtro aplicado (opcional)
     * @returns {Promise<string>} HTML del encabezado
     */
    async generarEncabezado(titulo, subtitulo, fechaActual, filtro = null) {
        const logoBase64 = await this.obtenerLogoBase64();
        
        return `
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
                    ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto;" alt="Centinela">` : ''}
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: bold;">${titulo}</h1>
                </div>
                <h2 style="color: #333; font-size: 16px; margin: 5px 0 0 0;">${subtitulo}</h2>
                <p style="color: #666; font-size: 11px; margin: 8px 0 0 0;">Fecha de generación: ${fechaActual}</p>
                ${filtro ? `<p style="color: #666; font-size: 10px; margin: 5px 0 0 0;">Filtro aplicado: "${this.escapeHtml(filtro)}"</p>` : ''}
            </div>
        `;
    }

    /**
     * Genera el HTML de las tarjetas de estadísticas
     * @param {Object} estadisticas - Objeto con las estadísticas
     * @returns {string} HTML de las estadísticas
     */
    generarEstadisticas(estadisticas) {
        return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px;">
                <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0;">
                    <h3 style="margin: 0; color: #000000; font-size: 28px;">${estadisticas.total || 0}</h3>
                    <p style="margin: 5px 0 0; color: #666;">Total</p>
                </div>
                <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0;">
                    <h3 style="margin: 0; color: #28a745; font-size: 28px;">${estadisticas.activos || 0}</h3>
                    <p style="margin: 5px 0 0; color: #666;">Activos</p>
                </div>
                <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0;">
                    <h3 style="margin: 0; color: #dc3545; font-size: 28px;">${estadisticas.inactivos || 0}</h3>
                    <p style="margin: 5px 0 0; color: #666;">Inactivos</p>
                </div>
            </div>
        `;
    }

    /**
     * Genera el HTML del pie de página
     * @param {string} mensaje - Mensaje adicional
     * @returns {string} HTML del pie de página
     */
    generarPiePagina(mensaje = '') {
        return `
            <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 15px;">
                <p>Documento generado por el Sistema Centinela - Gestión de Administradores</p>
                <p>Centinela MX - Seguridad Inteligente ${mensaje}</p>
            </div>
        `;
    }

    /**
     * Genera el HTML de una tabla genérica
     * @param {Array} columnas - Definición de columnas [{label, key, formatter?}]
     * @param {Array} datos - Datos a mostrar
     * @returns {string} HTML de la tabla
     */
    generarTabla(columnas, datos) {
        const headers = columnas.map(col => `
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd; color: #000000; font-weight: 600;">
                ${col.label}
            </th>
        `).join('');
        
        const filas = datos.map(item => {
            return `
                <tr>
                    ${columnas.map(col => {
                        let valor = item[col.key] || '';
                        if (col.formatter && typeof col.formatter === 'function') {
                            valor = col.formatter(valor, item);
                        }
                        return `<td style="padding: 10px; border: 1px solid #ddd; color: #333;">${valor}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');
        
        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f0f0f0; border-bottom: 2px solid #333;">
                        ${headers}
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
        `;
    }

    /**
     * Genera el HTML de una ficha de cliente
     * @param {Object} datos - Datos del cliente
     * @param {Object} opciones - Opciones adicionales
     * @returns {Promise<string>} HTML de la ficha
     */
    async generarFichaCliente(datos, opciones = {}) {
        const logoBase64 = await this.obtenerLogoBase64();
        const fechaActual = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Procesar foto si existe
        let fotoHTML = '';
        if (datos.fotoUrl && !datos.fotoUrl.includes('placeholder')) {
            const fotoProcesada = await this.procesarImagen(datos.fotoUrl, 120);
            if (fotoProcesada) {
                fotoHTML = `
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="width: 120px; height: 120px; margin: 0 auto; border-radius: 50%; overflow: hidden; border: 3px solid #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <img src="${fotoProcesada}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto">
                        </div>
                    </div>
                `;
            }
        }
        
        return `
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
                    ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto;" alt="Centinela">` : ''}
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: bold;">Sistema Centinela</h1>
                </div>
                <h2 style="color: #333; font-size: 16px; margin: 5px 0 0 0;">${opciones.titulo || 'Ficha de Administrador'}</h2>
                <p style="color: #666; font-size: 10px; margin: 5px 0 0 0;">Fecha de generación: ${fechaActual}</p>
            </div>
            
            ${fotoHTML}
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
                <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 16px; border-left: 3px solid #333; padding-left: 10px;">Información Personal</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${datos.nombreCompleto ? `
                    <tr>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; width: 35%; font-weight: 600; color: #000000;">Nombre completo:</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; color: #333;">${this.escapeHtml(datos.nombreCompleto)}</td>
                    </tr>
                    ` : ''}
                    ${datos.correoElectronico ? `
                    <tr>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #000000;">Correo electrónico:</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; color: #333;">${this.escapeHtml(datos.correoElectronico)}</td>
                    </tr>
                    ` : ''}
                    ${datos.cargo ? `
                    <tr>
                        <td style="padding: 10px 8px; font-weight: 600; color: #000000;">Cargo:</td>
                        <td style="padding: 10px 8px; color: #333;">${this.escapeHtml(datos.cargo)}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
                <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 16px; border-left: 3px solid #333; padding-left: 10px;">Información de la Organización</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${datos.organizacion ? `
                    <tr>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; width: 35%; font-weight: 600; color: #000000;">Organización:</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; color: #333;">${this.escapeHtml(datos.organizacion)}</td>
                    </tr>
                    ` : ''}
                    ${datos.plan ? `
                    <tr>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #000000;">Plan:</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; color: #333;">${datos.plan}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 10px 8px; font-weight: 600; color: #000000;">Estado:</td>
                        <td style="padding: 10px 8px; color: ${datos.status ? '#28a745' : '#dc3545'};">
                            ${datos.status ? 'Activo' : 'Inactivo'}
                        </td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
                <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 16px; border-left: 3px solid #333; padding-left: 10px;">Historial</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${datos.fechaCreacion ? `
                    <tr>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; width: 35%; font-weight: 600; color: #000000;">Fecha de creación:</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; color: #333;">${this.formatearFechaCompleta(datos.fechaCreacion)}</td>
                    </tr>
                    ` : ''}
                    ${datos.ultimoLogin ? `
                    <tr>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #000000;">Último inicio de sesión:</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; color: #333;">${this.formatearFechaCompleta(datos.ultimoLogin)}</td>
                    </tr>
                    ` : ''}
                    ${datos.creadoPor ? `
                    <tr>
                        <td style="padding: 10px 8px; font-weight: 600; color: #000000;">Creado por:</td>
                        <td style="padding: 10px 8px; color: #333;">${this.escapeHtml(datos.creadoPor)}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            ${this.generarPiePagina('| Ficha de Cliente')}
        `;
    }

    /**
     * Genera el HTML de un reporte completo
     * @param {Object} config - Configuración del reporte
     * @returns {Promise<string>} HTML del reporte
     */
    async generarReporte(config) {
        const fechaActual = new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const encabezado = await this.generarEncabezado(
            config.titulo || 'Sistema Centinela',
            config.subtitulo || 'Reporte del Sistema',
            fechaActual,
            config.filtro
        );
        
        let contenido = encabezado;
        
        if (config.estadisticas) {
            contenido += this.generarEstadisticas(config.estadisticas);
        }
        
        if (config.tabla && config.tabla.columnas && config.tabla.datos) {
            contenido += this.generarTabla(config.tabla.columnas, config.tabla.datos);
        }
        
        if (config.contenidoAdicional) {
            contenido += config.contenidoAdicional;
        }
        
        contenido += this.generarPiePagina(config.piePagina || '');
        
        return contenido;
    }

    /**
     * Genera un PDF a partir de HTML
     * @param {string} html - HTML a convertir a PDF
     * @param {Object} opciones - Opciones del PDF { orientation, format, filename }
     * @returns {Promise<void>}
     */
    async generarPDF(html, opciones = {}) {
        const {
            orientation = 'portrait',
            format = 'a4',
            filename = `documento_${new Date().toISOString().split('T')[0]}.pdf`
        } = opciones;
        
        // Crear contenedor temporal
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = orientation === 'landscape' ? '800px' : '650px';
        container.style.backgroundColor = '#ffffff';
        container.style.padding = '30px';
        container.style.fontFamily = "'Segoe UI', 'Roboto', Arial, sans-serif";
        document.body.appendChild(container);
        
        container.innerHTML = html;
        
        // Capturar con html2canvas
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });
        
        // Crear PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format
        });
        
        const imgWidth = orientation === 'landscape' ? 280 : 190;
        const pageHeight = orientation === 'landscape' ? 210 : 277;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Limpiar contenedor temporal
        document.body.removeChild(container);
        
        // Descargar PDF
        pdf.save(filename);
    }

    /**
     * Escapa caracteres HTML
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Exportar una instancia única (Singleton)
const pdfGenerator = new PDFGenerator();

export default pdfGenerator;
export { PDFGenerator };