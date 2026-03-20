/**
 * PDF CONSUMO GENERATOR - Sistema Centinela
 * VERSIÓN: 3.3 - Versión final con resumen de consumo detallado
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES
// =============================================
export const coloresConsumo = {
    ...coloresBase,
    servicios: {
        firestore: '#3b82f6',
        storage: '#f97316',
        functions: '#8b5cf6',
        auth: '#10b981',
        fcm: '#ec4899',
        total: '#0dcaf0'
    }
};

// =============================================
// CLASE PDF CONSUMO GENERATOR
// =============================================
class PDFConsumoGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        this.datosConsumo = null;
        this.empresaSeleccionada = null;
        this.fechaGeneracion = new Date();
    }

    configurar(config) {
        if (config.datosConsumo) this.datosConsumo = config.datosConsumo;
        if (config.empresaNombre) this.empresaNombre = config.empresaNombre;
        if (config.empresaId) this.empresaId = config.empresaId;
        if (config.ultimaActualizacion) this.ultimaActualizacion = config.ultimaActualizacion;
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.authToken) this.authToken = config.authToken;
    }

    async generarReporte(datosConsumo, opciones = {}) {
        try {
            const { mostrarAlerta = true, empresaNombre = 'Empresa', empresaId = '', ultimaActualizacion = new Date() } = opciones;

            if (mostrarAlerta) {
                Swal.fire({
                    title: 'Generando Reporte de Consumo...',
                    html: `
                        <div style="text-align: center; margin: 10px 0;">
                            <i class="fas fa-chart-line fa-2x" style="color: #c9a03d; animation: pulse 1s infinite;"></i>
                        </div>
                        <div class="progress-bar-container" style="width:100%; height:20px; background:rgba(0,0,0,0.1); border-radius:10px; margin-top:10px;">
                            <div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:10px; transition:width 0.3s;"></div>
                        </div>
                        <p style="margin-top: 10px; font-size: 12px;">Procesando métricas de consumo...</p>
                    `,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        let progreso = 0;
                        const intervalo = setInterval(() => {
                            progreso += 8;
                            if (progreso <= 90) {
                                const barra = document.querySelector('.progress-bar');
                                if (barra) barra.style.width = progreso + '%';
                            }
                        }, 150);
                        window._intervaloProgreso = intervalo;
                    }
                });
            }

            await this.cargarLibrerias();
            if (mostrarAlerta && window._intervaloProgreso) clearInterval(window._intervaloProgreso);

            await this.cargarLogoCentinela();
            await this.cargarLogoOrganizacion();

            this.datosConsumo = datosConsumo;
            this.empresaNombre = empresaNombre;
            this.empresaId = empresaId;
            this.ultimaActualizacion = ultimaActualizacion;
            this.fechaGeneracion = new Date();

            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            // Página 1: Tarjetas de métricas
            await this._generarPagina1(pdf, datosConsumo);
            
            // Página 2: Gráfica de distribución
            await this._generarPagina2(pdf, datosConsumo);
            
            // Página 3: Resumen de consumo detallado
            await this._generarPagina3(pdf, datosConsumo);

            const nombreArchivo = `CONSUMO_${this.empresaNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${this.formatearFechaArchivo()}.pdf`;

            if (mostrarAlerta) {
                if (window._intervaloProgreso) clearInterval(window._intervaloProgreso);
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;
        } catch (error) {
            console.error('Error generando reporte:', error);
            if (window._intervaloProgreso) clearInterval(window._intervaloProgreso);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el reporte: ' + error.message });
            }
            throw error;
        }
    }

    async _generarPagina1(pdf, datos) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;

        // ENCABEZADO
        this.dibujarEncabezadoBase(pdf, 'REPORTE DE CONSUMO', this.empresaNombre || 'SISTEMA CENTINELA');

        // INFO DE EMPRESA
        pdf.setDrawColor(200, 200, 200);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margen, yPos, anchoContenido, 28, 3, 3, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(26, 59, 93);
        pdf.text(this.empresaNombre || 'Empresa', margen + 8, yPos + 10);

        const fechaActualizacion = datos.ultimaActualizacion ? 
            new Date(datos.ultimaActualizacion.seconds * 1000).toLocaleString('es-MX') : 'No disponible';
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`ID: ${this.empresaId || 'No disponible'}`, margen + 8, yPos + 18);
        pdf.text(`Última actualización: ${fechaActualizacion}`, margen + 8, yPos + 24);
        
        yPos += 32;

        // MÉTRICAS
        const anchoTarjeta = (anchoContenido - 20) / 3;
        const altoTarjeta = 52;
        
        const fs = datos.firestore || { lectura: 0, escritura: 0, actualizacion: 0, eliminacion: 0, total: 0 };
        const st = datos.storage || { subida: 0, descarga: 0, eliminacion: 0, total: 0 };
        const fn = datos.functions || { invocacion: 0, invocaciones: 0, notificacionesPushEnviadas: 0, usuariosNotificados: 0, total: 0 };
        const au = datos.autenticacion || { inicioSesion: 0, cierreSesion: 0, registro: 0, total: 0 };
        const fcm = datos.fcm || { notificacionEnviada: 0, tokenRegistrado: 0, tokenEliminado: 0, total: 0 };
        
        const invocacionesTotales = (fn.invocacion || 0) + (fn.invocaciones || 0);
        const notificacionesPush = fn.notificacionesPushEnviadas || 0;
        const usuariosNotificados = fn.usuariosNotificados || 0;
        const totalGeneral = fs.total + st.total + (fn.total || invocacionesTotales) + au.total + fcm.total;
        
        // Fila 1
        this._dibujarTarjeta(pdf, 'Firestore', this._formatearNumero(fs.total), 
            `L:${fs.lectura} / E:${fs.escritura} / U:${fs.actualizacion} / D:${fs.eliminacion}`,
            margen, yPos, anchoTarjeta, altoTarjeta, '#3b82f6');
        
        this._dibujarTarjeta(pdf, 'Storage', this._formatearNumero(st.total),
            `Sub:${st.subida} / Desc:${st.descarga} / Elim:${st.eliminacion}`,
            margen + anchoTarjeta + 10, yPos, anchoTarjeta, altoTarjeta, '#f97316');
        
        this._dibujarTarjeta(pdf, 'Cloud Functions', this._formatearNumero(invocacionesTotales),
            `Invocaciones: ${invocacionesTotales}`,
            margen + (anchoTarjeta + 10) * 2, yPos, anchoTarjeta, altoTarjeta, '#8b5cf6');
        
        yPos += altoTarjeta + 12;
        
        // Fila 2
        this._dibujarTarjeta(pdf, 'Authentication', this._formatearNumero(au.total),
            `Login:${au.inicioSesion} Logout:${au.cierreSesion} Reg:${au.registro}`,
            margen, yPos, anchoTarjeta, altoTarjeta, '#10b981');
        
        this._dibujarTarjetaCompacta(pdf, 'FCM Notificaciones', this._formatearNumero(notificacionesPush),
            `Usuarios:${usuariosNotificados} Tokens:${fcm.tokenRegistrado} Elim:${fcm.tokenEliminado}`,
            margen + anchoTarjeta + 10, yPos, anchoTarjeta, altoTarjeta, '#ec4899');
        
        this._dibujarTarjetaCompacta(pdf, 'Total Operaciones', this._formatearNumero(totalGeneral),
            `${this._formatearNumero(totalGeneral)} ops (${notificacionesPush} push)`,
            margen + (anchoTarjeta + 10) * 2, yPos, anchoTarjeta, altoTarjeta, '#0dcaf0');
        
        this.dibujarPiePagina(pdf);
    }

    async _generarPagina2(pdf, datos) {
        // Agregar nueva página
        pdf.addPage();
        
        const margen = 20;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = 25;
        
        // Título de la página de gráficas
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(26, 59, 93);
        pdf.text('ANÁLISIS GRÁFICO DE CONSUMO', anchoPagina / 2, yPos, { align: 'center' });
        yPos += 15;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Empresa: ${this.empresaNombre}`, anchoPagina / 2, yPos, { align: 'center' });
        yPos += 25;
        
        // Extraer datos
        const fs = datos.firestore || { total: 0 };
        const st = datos.storage || { total: 0 };
        const fn = datos.functions || { invocacion: 0, invocaciones: 0, total: 0 };
        const au = datos.autenticacion || { total: 0 };
        const fcm = datos.fcm || { total: 0 };
        
        const invocacionesTotales = (fn.invocacion || 0) + (fn.invocaciones || 0);
        
        // Gráfica: Distribución por servicio (tamaño completo)
        const altoGrafica = 180;
        await this._dibujarGraficaCircularCanvas(pdf, 'Distribución por servicio',
            [
                { nombre: 'Firestore', valor: fs.total, color: '#3b82f6' },
                { nombre: 'Storage', valor: st.total, color: '#f97316' },
                { nombre: 'Cloud Functions', valor: invocacionesTotales, color: '#8b5cf6' },
                { nombre: 'Authentication', valor: au.total, color: '#10b981' },
                { nombre: 'FCM', valor: fcm.total, color: '#ec4899' }
            ],
            margen, yPos, anchoContenido, altoGrafica);
        
        this.dibujarPiePagina(pdf);
    }

    async _generarPagina3(pdf, datos) {
        // Agregar nueva página
        pdf.addPage();
        
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = 30;
        
        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(26, 59, 93);
        pdf.text('RESUMEN DETALLADO DE CONSUMO', anchoPagina / 2, yPos, { align: 'center' });
        yPos += 20;
        
        // Resumen de métricas detalladas
        const fs = datos.firestore || { lectura: 0, escritura: 0, actualizacion: 0, eliminacion: 0, total: 0 };
        const st = datos.storage || { subida: 0, descarga: 0, eliminacion: 0, total: 0 };
        const fn = datos.functions || { invocacion: 0, invocaciones: 0, notificacionesPushEnviadas: 0, usuariosNotificados: 0, total: 0 };
        const au = datos.autenticacion || { inicioSesion: 0, cierreSesion: 0, registro: 0, total: 0 };
        const fcm = datos.fcm || { tokenRegistrado: 0, tokenEliminado: 0 };
        
        const invocacionesTotales = (fn.invocacion || 0) + (fn.invocaciones || 0);
        const notificacionesPush = fn.notificacionesPushEnviadas || 0;
        const usuariosNotificados = fn.usuariosNotificados || 0;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Firestore', margen, yPos);
        yPos += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Total: ${this._formatearNumero(fs.total)} operaciones`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Lecturas: ${this._formatearNumero(fs.lectura)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Escrituras: ${this._formatearNumero(fs.escritura)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Actualizaciones: ${this._formatearNumero(fs.actualizacion)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Eliminaciones: ${this._formatearNumero(fs.eliminacion)}`, margen + 5, yPos);
        yPos += 10;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Storage', margen, yPos);
        yPos += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Total: ${this._formatearNumero(st.total)} operaciones`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Subidas: ${this._formatearNumero(st.subida)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Descargas: ${this._formatearNumero(st.descarga)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Eliminaciones: ${this._formatearNumero(st.eliminacion)}`, margen + 5, yPos);
        yPos += 10;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Cloud Functions', margen, yPos);
        yPos += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Invocaciones: ${this._formatearNumero(invocacionesTotales)}`, margen + 5, yPos);
        yPos += 10;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Authentication', margen, yPos);
        yPos += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Total: ${this._formatearNumero(au.total)} operaciones`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Login: ${this._formatearNumero(au.inicioSesion)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Logout: ${this._formatearNumero(au.cierreSesion)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Registro: ${this._formatearNumero(au.registro)}`, margen + 5, yPos);
        yPos += 10;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Notificaciones Push (FCM)', margen, yPos);
        yPos += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Enviadas: ${this._formatearNumero(notificacionesPush)} notificaciones`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Usuarios notificados: ${this._formatearNumero(usuariosNotificados)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Tokens registrados: ${this._formatearNumero(fcm.tokenRegistrado)}`, margen + 5, yPos);
        yPos += 5;
        pdf.text(`  Tokens eliminados: ${this._formatearNumero(fcm.tokenEliminado)}`, margen + 5, yPos);
        
        this.dibujarPiePagina(pdf);
    }

    _dibujarTarjeta(pdf, titulo, valorGrande, detalle, x, y, ancho, alto, colorHex) {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 4, 4, 'FD');
        
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(x, y, ancho, 3, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text(titulo, x + 6, y + 10);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(26, 59, 93);
        pdf.text(valorGrande, x + 6, y + 24);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        const lineasDetalle = this._dividirTexto(detalle, ancho - 12);
        lineasDetalle.forEach((linea, i) => {
            pdf.text(linea, x + 6, y + 32 + (i * 3.5));
        });
    }

    _dibujarTarjetaCompacta(pdf, titulo, valorGrande, detalle, x, y, ancho, alto, colorHex) {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 4, 4, 'FD');
        
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(x, y, ancho, 3, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text(titulo, x + 6, y + 10);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(26, 59, 93);
        pdf.text(valorGrande, x + 6, y + 24);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        pdf.text(detalle, x + 6, y + 34);
    }

    async _dibujarGraficaCircularCanvas(pdf, titulo, datos, x, y, ancho, alto) {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#1a3b5d';
        ctx.fillText(titulo, 40, 50);
        
        const total = datos.reduce((sum, d) => sum + d.valor, 0);
        
        if (total === 0) {
            ctx.font = 'italic 18px Arial';
            ctx.fillStyle = '#999';
            ctx.fillText('Sin datos disponibles', canvas.width/2 - 80, canvas.height/2);
        } else {
            const centroX = canvas.width * 0.4;
            const centroY = canvas.height * 0.55;
            const radio = Math.min(canvas.width * 0.22, canvas.height * 0.3);
            let anguloInicio = 0;
            
            datos.forEach((d) => {
                const angulo = (d.valor / total) * 360;
                const anguloFin = anguloInicio + angulo;
                const radInicio = (anguloInicio * Math.PI) / 180;
                const radFin = (anguloFin * Math.PI) / 180;
                
                ctx.beginPath();
                ctx.moveTo(centroX, centroY);
                ctx.arc(centroX, centroY, radio, radInicio, radFin);
                ctx.closePath();
                ctx.fillStyle = d.color;
                ctx.fill();
                
                anguloInicio = anguloFin;
            });
            
            ctx.beginPath();
            ctx.arc(centroX, centroY, radio * 0.45, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            let yLeyenda = 60;
            datos.forEach((d) => {
                const porcentaje = total > 0 ? Math.round((d.valor / total) * 100) : 0;
                ctx.fillStyle = d.color;
                ctx.fillRect(canvas.width - 200, yLeyenda, 16, 16);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#555';
                ctx.fillText(`${d.nombre}: ${porcentaje}% (${this._formatearNumero(d.valor)})`, canvas.width - 175, yLeyenda + 12);
                yLeyenda += 28;
            });
            
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#1a3b5d';
            ctx.fillText(`Total: ${this._formatearNumero(total)} operaciones`, centroX - 80, centroY + radio + 40);
        }
        
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, ancho, alto);
    }

    _dividirTexto(texto, anchoMax) {
        if (!texto) return [''];
        const longitudMax = Math.floor(anchoMax / 2.2);
        if (texto.length <= longitudMax) return [texto];
        
        const palabras = texto.split(' ');
        const lineas = [];
        let lineaActual = '';
        
        for (const palabra of palabras) {
            const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
            if (prueba.length <= longitudMax) {
                lineaActual = prueba;
            } else {
                if (lineaActual) lineas.push(lineaActual);
                lineaActual = palabra;
            }
        }
        if (lineaActual) lineas.push(lineaActual);
        return lineas;
    }

    _formatearNumero(num) {
        if (num === undefined || num === null) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}

export const generadorPDFConsumo = new PDFConsumoGenerator();
export default generadorPDFConsumo;