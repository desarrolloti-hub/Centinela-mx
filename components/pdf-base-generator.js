/**
 * PDF BASE GENERATOR - Sistema Centinela
 * VERSIÓN: 2.1 - Con colores dinámicos del sistema (compatible con jsPDF)
 */

// =============================================
// CONFIGURACIÓN DE COLORES BASE - DINÁMICA
// =============================================

/**
 * Convierte cualquier formato de color a RGB string (compatible con jsPDF)
 * jsPDF acepta: "#RRGGBB" o "rgb(r,g,b)" o [r,g,b]
 * NO acepta RGBA con transparencia
 */
function normalizarColorParaJSPDF(color) {
    if (!color) return '#c0c0c0';
    
    const colorStr = String(color).trim();
    
    // Si ya es HEX, devolverlo tal cual
    if (colorStr.startsWith('#')) {
        return colorStr;
    }
    
    // Si es rgb(...) sin alpha, devolverlo tal cual
    if (colorStr.startsWith('rgb(')) {
        return colorStr;
    }
    
    // Si es rgba(...), extraer solo los valores RGB
    if (colorStr.startsWith('rgba(')) {
        const match = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
        }
    }
    
    // Si es un nombre de color básico
    const coloresBasicos = {
        'black': '#000000',
        'white': '#ffffff',
        'red': '#ff0000',
        'green': '#00ff00',
        'blue': '#0000ff'
    };
    
    if (coloresBasicos[colorStr.toLowerCase()]) {
        return coloresBasicos[colorStr.toLowerCase()];
    }
    
    return '#c0c0c0';
}

/**
 * Convierte un color HEX o RGB a objeto RGB {r,g,b} para jsPDF
 */
function colorToRGB(color) {
    const normalized = normalizarColorParaJSPDF(color);
    
    if (normalized.startsWith('#')) {
        return {
            r: parseInt(normalized.slice(1, 3), 16),
            g: parseInt(normalized.slice(3, 5), 16),
            b: parseInt(normalized.slice(5, 7), 16)
        };
    }
    
    if (normalized.startsWith('rgb(')) {
        const match = normalized.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
    }
    
    return { r: 192, g: 192, b: 192 };
}

/**
 * Obtiene los colores actuales del sistema desde CSS variables
 */
export function getSystemColors() {
    const rootStyles = getComputedStyle(document.documentElement);
    
    // Obtener colores del sistema
    let primarioRaw = rootStyles.getPropertyValue('--color-accent-primary').trim();
    let secundarioRaw = rootStyles.getPropertyValue('--color-accent-secondary').trim();
    let textoRaw = rootStyles.getPropertyValue('--color-text-primary').trim() || '#ffffff';
    let textoClaroRaw = rootStyles.getPropertyValue('--color-text-secondary').trim() || '#aaaaaa';
    
    // Si no se encuentran, usar valores por defecto
    if (!primarioRaw || primarioRaw === '') primarioRaw = '#c0c0c0';
    if (!secundarioRaw || secundarioRaw === '') secundarioRaw = '#ffffff';
    
    // Normalizar a formato compatible con jsPDF
    const primario = normalizarColorParaJSPDF(primarioRaw);
    const secundario = normalizarColorParaJSPDF(secundarioRaw);
    const texto = normalizarColorParaJSPDF(textoRaw);
    const textoClaro = normalizarColorParaJSPDF(textoClaroRaw);
    const fondo = normalizarColorParaJSPDF(rootStyles.getPropertyValue('--color-bg-primary').trim() || '#000000');
    const borde = normalizarColorParaJSPDF(rootStyles.getPropertyValue('--color-border-light').trim() || '#dddddd');
    
    // Para los casos donde secundario es blanco, generar un color complementario
    let secundarioFinal = secundario;
    if (secundario === '#ffffff' || secundario === 'rgb(255, 255, 255)') {
        const rgb = colorToRGB(primario);
        // Generar un color más claro pero no blanco
        const r = Math.min(255, rgb.r + 60);
        const g = Math.min(255, rgb.g + 60);
        const b = Math.min(255, rgb.b + 60);
        secundarioFinal = `rgb(${r}, ${g}, ${b})`;
    }
    
    return {
        primario: primario,
        primarioRGB: colorToRGB(primario),
        secundario: secundarioFinal,
        secundarioRGB: colorToRGB(secundarioFinal),
        texto: texto,
        textoRGB: colorToRGB(texto),
        textoClaro: textoClaro,
        textoClaroRGB: colorToRGB(textoClaro),
        fondo: fondo,
        fondoRGB: colorToRGB(fondo),
        borde: borde,
        bordeRGB: colorToRGB(borde),
        exito: '#27ae60',
        advertencia: '#f39c12',
        peligro: '#c0392b'
    };
}

// Variable global actualizable
export let coloresBase = getSystemColors();

// Función para actualizar colores
export function actualizarColoresBase() {
    coloresBase = getSystemColors();
    return coloresBase;
}

// =============================================
// CLASE BASE PDF GENERATOR
// =============================================
export class PDFBaseGenerator {
    constructor() {
        this.jsPDF = null;
        this.logoData = null;
        this.logoOrganizacionData = null;
        this.logoCentinelaCircular = null;
        this.logoOrganizacionCircular = null;
        this.organizacionActual = null;
        this.authToken = null;
        this.totalPaginas = 1;
        this.paginaActualReal = 1;

        // Cache de imágenes convertidas a base64
        this.imagenesBase64Cache = new Map();

        this.fonts = {
            tituloPrincipal: 16,
            titulo: 14,
            subtitulo: 12,
            normal: 10,
            small: 10,
            mini: 9,
            micro: 8
        };

        this.dimensionesLogo = {
            diametro: 18,
            separacion: 10
        };

        this.alturaEncabezado = 42;
        
        // ✅ INICIALIZAR COLORES DINÁMICOS
        this.colores = getSystemColors();
    }

    /**
     * Actualiza los colores (llamar antes de generar PDF si el tema cambió)
     */
    actualizarColores() {
        this.colores = getSystemColors();
    }

    // =============================================
    // CARGA DE LIBRERÍAS
    // =============================================
    async cargarLibrerias() {
        try {
            if (!window.jspdf) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            this.jsPDF = window.jspdf?.jsPDF;
            if (!this.jsPDF) throw new Error('No se pudo cargar jsPDF');
            return true;
        } catch (error) {
            console.error('Error cargando librerías:', error);
            throw error;
        }
    }

    cargarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // =============================================
    // CONVERSIÓN DE IMÁGENES A BASE64 (DIRECTA)
    // =============================================

    async convertirImagenABase64(imagen) {
        try {
            if (typeof imagen === 'string') {
                if (imagen.startsWith('data:image') || imagen.startsWith('blob:')) {
                    return imagen;
                }
                return imagen;
            }

            if (imagen instanceof File || imagen instanceof Blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(imagen);
                });
            }

            if (imagen.file instanceof File || imagen.file instanceof Blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(imagen.file);
                });
            }

            if (imagen.preview && typeof imagen.preview === 'string') {
                return await this.fetchearImagenDesdeURL(imagen.preview);
            }

            if (imagen.url && typeof imagen.url === 'string') {
                return await this.fetchearImagenDesdeURL(imagen.url);
            }

            console.warn('No se pudo convertir imagen:', imagen);
            return null;
        } catch (error) {
            console.error('Error convirtiendo imagen a base64:', error);
            return null;
        }
    }

    async fetchearImagenDesdeURL(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error fetcheando imagen desde URL:', error);
            return null;
        }
    }

    extraerImagenDeObjeto(imagenObj) {
        if (imagenObj instanceof File || imagenObj instanceof Blob) {
            return imagenObj;
        }
        if (imagenObj.file instanceof File || imagenObj.file instanceof Blob) {
            return imagenObj.file;
        }
        if (imagenObj.preview) {
            return imagenObj.preview;
        }
        if (imagenObj.url) {
            return imagenObj.url;
        }
        return null;
    }

    obtenerComentarioImagen(imagenObj) {
        if (!imagenObj) return '';
        if (typeof imagenObj === 'object' && imagenObj.comentario) {
            return imagenObj.comentario;
        }
        if (typeof imagenObj === 'object' && imagenObj.descripcion) {
            return imagenObj.descripcion;
        }
        return '';
    }

    // =============================================
    // CARGA DE LOGOS
    // =============================================
    async cargarLogoCentinela() {
        try {
            const logoBase64 = localStorage.getItem('logo');
            if (logoBase64) {
                if (logoBase64.startsWith('data:image')) {
                    this.logoData = logoBase64;
                } else {
                    this.logoData = 'data:image/png;base64,' + logoBase64;
                }
                this.logoCentinelaCircular = await this.recortarImagenCircular(this.logoData);
                return true;
            }

            try {
                const response = await fetch('/assets/images/logo.png');
                if (response.ok) {
                    const blob = await response.blob();
                    this.logoData = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    this.logoCentinelaCircular = await this.recortarImagenCircular(this.logoData);
                    return true;
                }
            } catch (e) {
                console.warn('No se pudo cargar logo desde assets');
            }

            this.logoData = null;
            this.logoCentinelaCircular = null;
            return false;
        } catch (error) {
            console.error('Error cargando logo:', error);
            return false;
        }
    }

    async cargarLogoOrganizacion() {
        try {
            const logoOrgBase64 = localStorage.getItem('organizacionLogo');
            if (logoOrgBase64) {
                if (logoOrgBase64.startsWith('data:image')) {
                    this.logoOrganizacionData = logoOrgBase64;
                } else {
                    this.logoOrganizacionData = 'data:image/png;base64,' + logoOrgBase64;
                }
                this.logoOrganizacionCircular = await this.recortarImagenCircular(this.logoOrganizacionData);
                return true;
            }
            this.logoOrganizacionData = null;
            this.logoOrganizacionCircular = null;
            return false;
        } catch (error) {
            console.error('Error cargando logo organización:', error);
            return false;
        }
    }

    async recortarImagenCircular(imgData) {
        if (!imgData) return null;
        return new Promise((resolve) => {
            try {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const size = 150;
                        canvas.width = size;
                        canvas.height = size;
                        ctx.clearRect(0, 0, size, size);
                        ctx.beginPath();
                        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        const scale = Math.max(size / img.width, size / img.height);
                        const x = (size - img.width * scale) / 2;
                        const y = (size - img.height * scale) / 2;
                        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);
                        resolve(canvas.toDataURL('image/png'));
                    } catch {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = imgData;
            } catch {
                resolve(null);
            }
        });
    }

    // =============================================
    // FORMATEO DE FECHAS
    // =============================================
    formatearFecha(fecha) {
        if (!fecha) return 'Fecha no disponible';
        try {
            let fechaObj;
            if (fecha && typeof fecha === 'object' && fecha.toDate) {
                fechaObj = fecha.toDate();
            } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
                fechaObj = new Date(fecha.seconds * 1000);
            } else if (typeof fecha === 'string') {
                fechaObj = new Date(fecha);
            } else if (fecha instanceof Date) {
                fechaObj = fecha;
            } else {
                return 'Fecha no disponible';
            }
            if (!(fechaObj instanceof Date) || isNaN(fechaObj.getTime())) {
                return 'Fecha no disponible';
            }
            return fechaObj.toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return 'Fecha no disponible';
        }
    }

    formatearFechaArchivo() {
        const d = new Date();
        return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    }

    formatearFechaVisualizacion(fecha) {
        if (!fecha) return 'Fecha no disponible';
        try {
            const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
            if (isNaN(fechaObj.getTime())) return 'Fecha no disponible';
            return fechaObj.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return 'Fecha no disponible';
        }
    }

    formatearHoraVisualizacion(fecha) {
        if (!fecha) return 'Hora no disponible';
        try {
            const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
            if (isNaN(fechaObj.getTime())) return 'Hora no disponible';
            return fechaObj.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'Hora no disponible';
        }
    }

    // =============================================
    // UTILIDADES DE TEXTO
    // =============================================
    dividirTextoEnLineas(pdf, texto, anchoMaximo) {
        if (!texto) return [''];
        const textoStr = String(texto);
        const parrafos = textoStr.split('\n');
        const todasLasLineas = [];

        for (const parrafo of parrafos) {
            if (parrafo.trim() === '') {
                todasLasLineas.push('');
                continue;
            }
            const palabras = parrafo.split(' ');
            let lineaActual = '';
            for (const palabra of palabras) {
                const textoPrueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
                if (pdf.getTextWidth(textoPrueba) <= anchoMaximo) {
                    lineaActual = textoPrueba;
                } else {
                    if (lineaActual) todasLasLineas.push(lineaActual);
                    lineaActual = palabra;
                }
            }
            if (lineaActual) todasLasLineas.push(lineaActual);
        }
        return todasLasLineas;
    }

    // =============================================
    // ELEMENTOS COMUNES DEL PDF - CON COLORES DINÁMICOS
    // =============================================
  dibujarEncabezadoBase(pdf, titulo, subtitulo) {
    const margen = 15;
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const dimensiones = this.dimensionesLogo;
    const radio = dimensiones.diametro / 2;

    // ✅ OBTENER COLORES DINÁMICOS (ya normalizados para jsPDF)
    const primarioRGB = this.colores.primarioRGB;
    const secundarioRGB = this.colores.secundarioRGB;

    pdf.saveGraphicsState();

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, anchoPagina, this.alturaEncabezado, 'F');

    // ✅ LÍNEA SUPERIOR - Color PRIMARIO del sistema
    pdf.setDrawColor(primarioRGB.r, primarioRGB.g, primarioRGB.b);
    pdf.setFillColor(primarioRGB.r, primarioRGB.g, primarioRGB.b);
    pdf.rect(0, 0, anchoPagina, 4, 'F');

    const yLogo = 20;
    const xLogoDerecha = anchoPagina - margen - (dimensiones.diametro * 2) - dimensiones.separacion;
    const xCentinela = xLogoDerecha;
    const xOrganizacion = xCentinela + dimensiones.diametro + dimensiones.separacion;

    this._dibujarLogos(pdf, xCentinela, xOrganizacion, yLogo, radio);

    // Título con color primario
    pdf.setTextColor(primarioRGB.r, primarioRGB.g, primarioRGB.b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(this.fonts.titulo);
    pdf.text(titulo, anchoPagina / 2, 18, { align: 'center' });

    // Subtítulo con color secundario
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(this.fonts.small);
    pdf.setTextColor(secundarioRGB.r, secundarioRGB.g, secundarioRGB.b);
    pdf.text(subtitulo, anchoPagina / 2, 26, { align: 'center' });

    // ✅ Fecha en color NEGRO
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(this.fonts.small);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Generado: ${this.formatearFecha(new Date())}`, margen, 22);

    // ✅ LÍNEA SEPARADORA - Color SECUNDARIO del sistema
    pdf.setDrawColor(secundarioRGB.r, secundarioRGB.g, secundarioRGB.b);
    pdf.setLineWidth(0.8);
    pdf.line(margen, this.alturaEncabezado - 2, anchoPagina - margen, this.alturaEncabezado - 2);

    pdf.restoreGraphicsState();
}

    _dibujarLogos(pdf, xCentinela, xOrganizacion, yLogo, radio) {
        const bordeRGB = this.colores.bordeRGB;
        
        if (this.logoCentinelaCircular) {
            try {
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(bordeRGB.r, bordeRGB.g, bordeRGB.b);
                pdf.circle(xCentinela + radio, yLogo, radio, 'FD');
                pdf.addImage(this.logoCentinelaCircular, 'PNG',
                    xCentinela, yLogo - radio,
                    this.dimensionesLogo.diametro, this.dimensionesLogo.diametro);
                pdf.setDrawColor(bordeRGB.r, bordeRGB.g, bordeRGB.b);
                pdf.setLineWidth(1);
                pdf.circle(xCentinela + radio, yLogo, radio, 'S');
            } catch (e) {
                this._dibujarPlaceholderCircular(pdf, xCentinela + radio, yLogo, radio, 'C');
            }
        } else {
            this._dibujarPlaceholderCircular(pdf, xCentinela + radio, yLogo, radio, 'C');
        }

        if (this.logoOrganizacionCircular) {
            try {
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(bordeRGB.r, bordeRGB.g, bordeRGB.b);
                pdf.circle(xOrganizacion + radio, yLogo, radio, 'FD');
                pdf.addImage(this.logoOrganizacionCircular, 'PNG',
                    xOrganizacion, yLogo - radio,
                    this.dimensionesLogo.diametro, this.dimensionesLogo.diametro);
                pdf.setDrawColor(bordeRGB.r, bordeRGB.g, bordeRGB.b);
                pdf.setLineWidth(1);
                pdf.circle(xOrganizacion + radio, yLogo, radio, 'S');
            } catch (e) {
                this._dibujarPlaceholderCircular(pdf, xOrganizacion + radio, yLogo, radio, 'ORG');
            }
        } else {
            this._dibujarPlaceholderCircular(pdf, xOrganizacion + radio, yLogo, radio, 'ORG');
        }

        if (this.logoCentinelaCircular || this.logoOrganizacionCircular) {
            const xLineaVertical = xCentinela + this.dimensionesLogo.diametro + (this.dimensionesLogo.separacion / 2);
            pdf.setDrawColor(bordeRGB.r, bordeRGB.g, bordeRGB.b);
            pdf.setLineWidth(0.5);
            pdf.line(xLineaVertical, yLogo - radio - 2, xLineaVertical, yLogo + radio + 2);
        }
    }

    _dibujarPlaceholderCircular(pdf, x, y, radio, texto) {
        const primarioRGB = this.colores.primarioRGB;
        const textoRGB = this.colores.textoRGB;
        
        pdf.setFillColor(245, 245, 245);
        pdf.setGState(new pdf.GState({ opacity: 0.3 }));
        pdf.circle(x, y, radio, 'F');
        pdf.setGState(new pdf.GState({ opacity: 1 }));
        pdf.setFillColor(240, 240, 240);
        pdf.setDrawColor(primarioRGB.r, primarioRGB.g, primarioRGB.b);
        pdf.circle(x, y, radio, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(textoRGB.r, textoRGB.g, textoRGB.b);
        pdf.text(texto, x, y, { align: 'center' });
    }

 dibujarPiePagina(pdf) {
    const margen = 15;
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const alturaPie = 15;
    const yPos = altoPagina - alturaPie - 2;

    // ✅ OBTENER COLORES DINÁMICOS
    const primarioRGB = this.colores.primarioRGB;
    const secundarioRGB = this.colores.secundarioRGB;

    const totalPaginasReales = pdf.internal.getNumberOfPages();
    
    let paginaActual = this.paginaActualReal;
    
    if (!paginaActual || paginaActual < 1) {
        paginaActual = pdf.internal.getCurrentPageInfo().pageNumber;
    }

    pdf.saveGraphicsState();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, yPos - 2, anchoPagina, alturaPie + 4, 'F');
    
    // ✅ Línea con color secundario
    pdf.setDrawColor(secundarioRGB.r, secundarioRGB.g, secundarioRGB.b);
    pdf.setLineWidth(0.5);
    pdf.line(margen, yPos, anchoPagina - margen, yPos);
    
    // ✅ Texto izquierdo en NEGRO
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(this.fonts.micro);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Reporte Generado con Sistema Centinela', margen, yPos + 5);

    // ✅ Texto derecho (paginación) en NEGRO
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(this.fonts.micro);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Página ${paginaActual} de ${totalPaginasReales}`, anchoPagina - margen, yPos + 5, { align: 'right' });
    
    // ✅ Barra inferior con color primario
    pdf.setDrawColor(primarioRGB.r, primarioRGB.g, primarioRGB.b);
    pdf.setFillColor(primarioRGB.r, primarioRGB.g, primarioRGB.b);
    pdf.rect(0, altoPagina - 3, anchoPagina, 3, 'F');
    
    pdf.restoreGraphicsState();
}

    verificarEspacio(pdf, yPos, espacioNecesario) {
        const altoPagina = pdf.internal.pageSize.getHeight();
        const espacioDisponible = altoPagina - yPos - 30;
        
        if (espacioDisponible < espacioNecesario) {
            this.totalPaginas = pdf.internal.getNumberOfPages();
            return false;
        }
        return true;
    }

    async mostrarOpcionesDescarga(pdf, nombreArchivo) {
        const result = await Swal.fire({
            title: 'Reporte Generado',
            html: `<div style="text-align: center;"><i class="fas fa-file-pdf" style="font-size: 48px; color: #c0392b; margin-bottom: 16px;"></i></div>`,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'DESCARGAR',
            cancelButtonText: 'CANCELAR',
            showDenyButton: true,
            denyButtonText: 'VISUALIZAR',
            confirmButtonColor: '#1a3b5d',
            denyButtonColor: '#d70000',
            cancelButtonColor: '#666'
        });
        if (result.isConfirmed) {
            pdf.save(nombreArchivo);
        } else if (result.isDenied) {
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        }
    }
}