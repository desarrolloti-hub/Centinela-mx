/**
 * IPH GENERATOR - Sistema Centinela
 * VERSIÓN: 3.18 - LOGOS Y COMENTARIOS CORREGIDOS
 */

// =============================================
// CONFIGURACIÓN DE COLORES IPH
// =============================================
export const coloresIPH = {
    primario: '#1a3b5d',
    secundario: '#c9a03d',
    texto: '#333333',
    textoClaro: '#666666',
    fondo: '#ffffff',
    borde: '#dddddd',
    exito: '#27ae60',
    advertencia: '#f39c12',
    peligro: '#c0392b'
};

// =============================================
// GENERADOR IPH PRINCIPAL
// =============================================
export const generadorIPH = {
    jsPDF: null,
    logoData: null,
    logoOrganizacionData: null,
    logoCentinelaCircular: null,
    logoOrganizacionCircular: null,
    organizacionActual: null,
    sucursalesCache: [],
    categoriasCache: [],
    subcategoriasCache: [],
    usuariosCache: [],
    authToken: null,
    totalPaginas: 1,
    incidenciaActual: null,

    fonts: {
        tituloPrincipal: 16,
        titulo: 14,
        subtitulo: 12,
        normal: 10,
        small: 8,
        mini: 7,
        micro: 6
    },

    dimensionesLogo: {
        diametro: 18,
        separacion: 10
    },

    alturaEncabezado: 42,

    alturasContenedores: {
        identificacion: 15,
        datosGenerales: 20,
        clasificacion: 35,
        reportadoPor: 15,
        descripcion: 45,
        anexos: 45,
        tarjetaSeguimiento: 60,
        avisoPrivacidad: 20
    },

    imagenesCache: new Map(),

    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.subcategoriasCache) this.subcategoriasCache = config.subcategoriasCache;
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
        if (config.authToken) this.authToken = config.authToken;
        console.log('✅ Generador configurado');
    },

    obtenerNombreSucursal(sucursalId) {
        if (!sucursalId) return 'No especificada';
        const sucursal = this.sucursalesCache.find(s => s.id === sucursalId);
        return sucursal ? sucursal.nombre : 'No disponible';
    },

    obtenerNombreCategoria(categoriaId) {
        if (!categoriaId) return 'No especificada';
        const categoria = this.categoriasCache.find(c => c.id === categoriaId);
        return categoria ? categoria.nombre : 'No disponible';
    },

    obtenerNombreSubcategoria(subcategoriaId) {
        if (!subcategoriaId) return 'No especificada';
        const subcategoria = this.subcategoriasCache.find(s => s.id === subcategoriaId);
        return subcategoria ? subcategoria.nombre : 'No disponible';
    },

    obtenerNombreUsuario(usuarioId) {
        if (!usuarioId) return 'Sistema';
        const usuario = this.usuariosCache.find(u => u.id === usuarioId);
        return usuario ? usuario.nombreCompleto || usuario.email || 'Usuario' : 'Usuario desconocido';
    },

    obtenerCargoUsuario(usuarioId) {
        if (!usuarioId) return '';
        const usuario = this.usuariosCache.find(u => u.id === usuarioId);
        return usuario ? usuario.cargo || 'No especificado' : '';
    },

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

    async cargarLogo() {
        try {
            console.log('🔍 Cargando logo Centinela...');

            // Intentar 1: Desde localStorage
            const logoBase64 = localStorage.getItem('logo');
            if (logoBase64) {
                console.log('✅ Logo Centinela encontrado en localStorage');
                if (logoBase64.startsWith('data:image')) {
                    this.logoData = logoBase64;
                } else {
                    this.logoData = 'data:image/png;base64,' + logoBase64;
                }
                this.logoCentinelaCircular = await this.recortarImagenCircular(this.logoData);
                return true;
            }

            // Intentar 2: Desde assets
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
                    console.log('✅ Logo Centinela cargado desde assets');
                    return true;
                }
            } catch (e) {
                console.warn('No se pudo cargar logo desde assets');
            }

            console.warn('⚠️ Usando placeholder para Centinela');
            this.logoData = null;
            this.logoCentinelaCircular = null;
            return false;

        } catch (error) {
            console.error('Error cargando logo:', error);
            this.logoData = null;
            this.logoCentinelaCircular = null;
            return false;
        }
    },

    async cargarLogoOrganizacion() {
        try {
            console.log('🔍 Cargando logo organización...');

            const logoOrgBase64 = localStorage.getItem('organizacionLogo');
            if (logoOrgBase64) {
                console.log('✅ Logo organización encontrado en localStorage');
                if (logoOrgBase64.startsWith('data:image')) {
                    this.logoOrganizacionData = logoOrgBase64;
                } else {
                    this.logoOrganizacionData = 'data:image/png;base64,' + logoOrgBase64;
                }
                this.logoOrganizacionCircular = await this.recortarImagenCircular(this.logoOrganizacionData);
                return true;
            }

            console.warn('⚠️ Usando placeholder para organización');
            this.logoOrganizacionData = null;
            this.logoOrganizacionCircular = null;
            return false;

        } catch (error) {
            console.error('Error cargando logo de organización:', error);
            this.logoOrganizacionData = null;
            this.logoOrganizacionCircular = null;
            return false;
        }
    },

    extraerUrlImagen(item) {
        if (!item) return null;
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
            const props = ['url', 'URL', 'src', 'path', 'downloadURL', 'imageUrl', 'foto', 'imagen', 'evidencia'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') return item[prop].trim();
            }
        }
        return null;
    },

    extraerComentario(item) {
        if (!item) return '';
        if (typeof item === 'object') {
            const props = ['comentario', 'descripcion', 'nombre', 'titulo', 'caption', 'texto', 'nota'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') return item[prop];
            }
        }
        return '';
    },

    async cargarImagenFirebase(url) {
        if (!url) return null;
        const urlLimpia = url.trim();
        if (this.imagenesCache.has(urlLimpia)) return this.imagenesCache.get(urlLimpia);

        const estrategias = [
            this.cargarConFetch.bind(this),
            this.cargarConProxy.bind(this),
            this.cargarConImage.bind(this)
        ];

        for (const estrategia of estrategias) {
            try {
                const imgData = await estrategia(urlLimpia);
                if (imgData) {
                    this.imagenesCache.set(urlLimpia, imgData);
                    return imgData;
                }
            } catch (error) { }
        }
        return null;
    },

    async cargarConFetch(url) {
        try {
            const response = await fetch(url, {
                headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                mode: 'cors',
                cache: 'force-cache'
            });
            if (!response.ok) return null;
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) return null;
            return await this.blobToBase64(blob);
        } catch {
            return null;
        }
    },

    async cargarConProxy(url) {
        const proxies = [
            'https://corsproxy.io/?' + encodeURIComponent(url),
            'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
            'https://cors-anywhere.herokuapp.com/' + url
        ];

        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    if (blob.type.startsWith('image/')) {
                        return await this.blobToBase64(blob);
                    }
                }
            } catch {
                continue;
            }
        }
        return null;
    },

    cargarConImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

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
    },

    formatearFecha(fecha) {
        if (!fecha) return 'Fecha no disponible';
        try {
            if (fecha && typeof fecha === 'object' && fecha.toDate) {
                fecha = fecha.toDate();
            }
            const fechaObj = new Date(fecha);
            if (isNaN(fechaObj.getTime())) return 'Fecha no disponible';
            return fechaObj.toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Fecha no disponible';
        }
    },

    formatearFechaArchivo() {
        const d = new Date();
        return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    },

    formatearFechaVisualizacion(fecha) {
        return fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatearHoraVisualizacion(fecha) {
        return fecha.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    dibujarEncabezadoFijo(pdf, incidencia, paginaActual, totalPaginas) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const dimensiones = this.dimensionesLogo;
        const radio = dimensiones.diametro / 2;

        pdf.saveGraphicsState();

        // Fondo blanco
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, anchoPagina, this.alturaEncabezado, 'F');

        // Barra superior azul
        pdf.setDrawColor(coloresIPH.primario);
        pdf.setFillColor(coloresIPH.primario);
        pdf.rect(0, 0, anchoPagina, 4, 'F');

        const yLogo = 20;
        const xLogoDerecha = anchoPagina - margen - (dimensiones.diametro * 2) - dimensiones.separacion;
        const xCentinela = xLogoDerecha;
        const xOrganizacion = xCentinela + dimensiones.diametro + dimensiones.separacion;

        // ===== LOGO CENTINELA =====
        if (this.logoCentinelaCircular) {
            try {
                // Fondo blanco para el logo
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.circle(xCentinela + radio, yLogo, radio, 'FD');

                // Agregar imagen
                pdf.addImage(this.logoCentinelaCircular, 'PNG',
                    xCentinela, yLogo - radio,
                    dimensiones.diametro, dimensiones.diametro);

                // Borde gris
                pdf.setDrawColor(coloresIPH.borde);
                pdf.setLineWidth(1);
                pdf.circle(xCentinela + radio, yLogo, radio, 'S');

                console.log('✅ Logo Centinela dibujado');
            } catch (e) {
                console.error('Error dibujando logo Centinela:', e);
                this.dibujarLogoPlaceholderCircular(pdf, xCentinela + radio, yLogo, radio, 'C');
            }
        } else {
            this.dibujarLogoPlaceholderCircular(pdf, xCentinela + radio, yLogo, radio, 'C');
        }

        // ===== LOGO ORGANIZACIÓN =====
        if (this.logoOrganizacionCircular) {
            try {
                // Fondo blanco para el logo
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.circle(xOrganizacion + radio, yLogo, radio, 'FD');

                // Agregar imagen
                pdf.addImage(this.logoOrganizacionCircular, 'PNG',
                    xOrganizacion, yLogo - radio,
                    dimensiones.diametro, dimensiones.diametro);

                // Borde gris
                pdf.setDrawColor(coloresIPH.borde);
                pdf.setLineWidth(1);
                pdf.circle(xOrganizacion + radio, yLogo, radio, 'S');

                console.log('✅ Logo Organización dibujado');
            } catch (e) {
                console.error('Error dibujando logo organización:', e);
                this.dibujarLogoPlaceholderCircular(pdf, xOrganizacion + radio, yLogo, radio, 'ORG');
            }
        } else {
            this.dibujarLogoPlaceholderCircular(pdf, xOrganizacion + radio, yLogo, radio, 'ORG');
        }

        // Línea divisoria entre logos (si hay al menos uno)
        if (this.logoCentinelaCircular || this.logoOrganizacionCircular) {
            const xLineaVertical = xCentinela + dimensiones.diametro + (dimensiones.separacion / 2);
            pdf.setDrawColor(coloresIPH.borde);
            pdf.setLineWidth(0.5);
            pdf.line(xLineaVertical, yLogo - radio - 2, xLineaVertical, yLogo + radio + 2);
        }

        // Título
        pdf.setTextColor(coloresIPH.primario);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.titulo);

        const fechaActual = new Date();
        const fechaStr = this.formatearFechaVisualizacion(fechaActual);
        const titulo = `INFORME DE INCIDENCIA`;
        const subtitulo = `ID: ${incidencia.id?.substring(0, 8) || 'N/A'}`;

        const centroPagina = anchoPagina / 2;
        pdf.text(titulo, centroPagina, 18, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text(subtitulo, centroPagina, 26, { align: 'center' });

        // Fecha a la izquierda
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text(`Fecha: ${fechaStr}`, margen, 22);

        // Línea decorativa abajo
        pdf.setDrawColor(coloresIPH.secundario);
        pdf.setLineWidth(0.8);
        pdf.line(margen, this.alturaEncabezado - 2, anchoPagina - margen, this.alturaEncabezado - 2);

        pdf.restoreGraphicsState();
    },

    dibujarLogoPlaceholderCircular(pdf, x, y, radio, texto) {
        pdf.setFillColor(245, 245, 245);
        pdf.setGState(new pdf.GState({ opacity: 0.3 }));
        pdf.circle(x, y, radio, 'F');
        pdf.setGState(new pdf.GState({ opacity: 1 }));
        pdf.setFillColor(240, 240, 240);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.circle(x, y, radio, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.texto);
        pdf.text(texto, x, y, { align: 'center' });
    },

    dibujarPiePaginaFijo(pdf, paginaActual, totalPaginas) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const altoPagina = pdf.internal.pageSize.getHeight();
        const alturaPie = 15;
        const yPos = altoPagina - alturaPie - 2;

        pdf.saveGraphicsState();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, yPos - 2, anchoPagina, alturaPie + 4, 'F');
        pdf.setDrawColor(coloresIPH.secundario);
        pdf.setLineWidth(0.5);
        pdf.line(margen, yPos, anchoPagina - margen, yPos);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.micro);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text('Sistema Centinela-MX', margen, yPos + 5);
        if (this.incidenciaActual) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(this.fonts.micro);
            pdf.setTextColor(coloresIPH.primario);
            const idCorto = this.incidenciaActual.id?.substring(0, 8) || 'N/A';
            pdf.text(`ID: ${idCorto}`, anchoPagina / 2, yPos + 5, { align: 'center' });
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.micro);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text(`Página ${paginaActual} de ${totalPaginas}`, anchoPagina - margen, yPos + 5, { align: 'right' });
        pdf.setDrawColor(coloresIPH.primario);
        pdf.setFillColor(coloresIPH.primario);
        pdf.rect(0, altoPagina - 3, anchoPagina, 3, 'F');
        pdf.restoreGraphicsState();
    },

    verificarEspacio(pdf, yPos, espacioNecesario) {
        const altoPagina = pdf.internal.pageSize.getHeight();
        const espacioDisponible = altoPagina - yPos - 30;
        return espacioDisponible >= espacioNecesario;
    },

    async generarIPH(incidencia, opciones = {}) {
        try {
            const { mostrarAlerta = true, tituloAlerta = 'Generando Informe...', onProgress = null } = opciones;

            if (mostrarAlerta) {
                Swal.fire({
                    title: tituloAlerta,
                    html: '<div class="progress-bar-container" style="width:100%; height:20px; background:rgba(255,255,255,0.1); border-radius:10px; margin-top:10px;"><div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:10px; transition:width 0.3s;"></div></div>',
                    allowOutsideClick: false,
                    showConfirmButton: false
                });
            }

            await this.cargarLibrerias();
            this.imagenesCache.clear();
            await this.cargarLogo();
            await this.cargarLogoOrganizacion();
            this.incidenciaActual = incidencia;

            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            this.totalPaginas = await this.calcularTotalPaginas(incidencia);
            await this.generarPaginaIPH(pdf, incidencia, 1, onProgress);

            const nombreArchivo = `INFORME_${incidencia.id?.substring(0, 8) || 'incidencia'}_${this.formatearFechaArchivo()}.pdf`;

            if (mostrarAlerta) {
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;
        } catch (error) {
            console.error('Error generando informe:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al generar el informe' });
            }
            throw error;
        }
    },

    async calcularTotalPaginas(incidencia) {
        let total = 1;
        const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];
        if (incidencia.imagenes && incidencia.imagenes.length > 3) {
            total += Math.ceil((incidencia.imagenes.length - 3) / 6);
        }
        for (const seg of seguimientos) {
            if (seg.evidencias && seg.evidencias.length > 0) {
                total += Math.ceil(seg.evidencias.length / 9);
            }
        }
        return total;
    },

    dividirTextoEnLineas(pdf, texto, anchoMaximo) {
        if (!texto) return [''];
        const palabras = texto.toString().split(' ');
        const lineas = [];
        let lineaActual = '';

        for (const palabra of palabras) {
            const textoPrueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
            if (pdf.getTextWidth(textoPrueba) <= anchoMaximo) {
                lineaActual = textoPrueba;
            } else {
                if (lineaActual) lineas.push(lineaActual);
                lineaActual = palabra;
            }
        }
        if (lineaActual) lineas.push(lineaActual);
        return lineas;
    },

    async generarPaginaIPH(pdf, incidencia, paginaNum, onProgress) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;

        this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);

        // IDENTIFICACIÓN
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.identificacion, 'FD');
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
        yPos += this.alturasContenedores.identificacion - 3;

        // DATOS GENERALES
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.datosGenerales, 'FD');
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
        yPos += this.alturasContenedores.datosGenerales - 8;

        // CLASIFICACIÓN
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.clasificacion, 'FD');
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
        yPos += this.alturasContenedores.clasificacion - 12;

        // REPORTADO POR
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.reportadoPor, 'FD');
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
        yPos += this.alturasContenedores.reportadoPor - 7;

        // DESCRIPCIÓN
        if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.descripcion + 5)) {
            this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
            pdf.addPage();
            paginaNum++;
            this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
            yPos = this.alturaEncabezado + 5;
        }

        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.descripcion, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('DESCRIPCIÓN DE LA INCIDENCIA:', margen + 2, yPos);

        const descripcion = incidencia.detalles || 'No hay descripción disponible.';
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        const lineasDesc = this.dividirTextoEnLineas(pdf, descripcion, anchoContenido - 10);

        let yTextoDesc = yPos + 5;
        const espacioParaTextoDesc = this.alturasContenedores.descripcion - 10;
        const maxLineasDesc = Math.floor(espacioParaTextoDesc / 4);

        for (let i = 0; i < Math.min(lineasDesc.length, maxLineasDesc); i++) {
            pdf.text(lineasDesc[i], margen + 5, yTextoDesc + (i * 4));
        }

        if (lineasDesc.length > maxLineasDesc) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(this.fonts.mini);
            pdf.setTextColor(coloresIPH.textoClaro);
            pdf.text('... (texto continúa)', margen + 5, yTextoDesc + (maxLineasDesc * 4));
        }
        yPos += this.alturasContenedores.descripcion + 5;

        // ANEXOS PRINCIPALES
        if (incidencia.imagenes && incidencia.imagenes.length > 0) {
            if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.anexos + 5)) {
                this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                pdf.addPage();
                paginaNum++;
                this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                yPos = this.alturaEncabezado + 5;
            }
            pdf.setFillColor(coloresIPH.fondo);
            pdf.setDrawColor(coloresIPH.borde);
            pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.anexos, 'FD');
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
                await this.procesarImagenConProxy(pdf, incidencia.imagenes[i], xPos, yPos, imgWidth, imgHeight, i + 1, false, onProgress);
            }
            yPos += this.alturasContenedores.anexos;
        }

        // EVIDENCIAS DE CONTINUACIÓN
        if (incidencia.imagenes && incidencia.imagenes.length > 3) {
            for (let i = 3; i < incidencia.imagenes.length; i++) {
                const indiceFila = i - 3;
                const columna = indiceFila % 3;
                if (columna === 0 && i > 3) {
                    yPos += 40;
                    if (!this.verificarEspacio(pdf, yPos, 45)) {
                        this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                        pdf.addPage();
                        paginaNum++;
                        this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                        yPos = this.alturaEncabezado + 5;
                    }
                }
                const xPos = margen + 5 + (columna * 50);
                const imgWidth = 45;
                const imgHeight = 35;
                pdf.setDrawColor(coloresIPH.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');
                await this.procesarImagenConProxy(pdf, incidencia.imagenes[i], xPos, yPos, imgWidth, imgHeight, i + 1, false, onProgress);
            }
            yPos += 45;
        }

        // =============================================
        // HISTORIAL DE SEGUIMIENTO
        // =============================================
        const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

        if (seguimientos && seguimientos.length > 0) {
            yPos += 10;
            if (!this.verificarEspacio(pdf, yPos, 20)) {
                this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                pdf.addPage();
                paginaNum++;
                this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                yPos = this.alturaEncabezado + 5;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.subtitulo);
            pdf.setTextColor(coloresIPH.primario);
            pdf.text('HISTORIAL DE SEGUIMIENTO', margen, yPos);
            yPos += 8;

            for (let s = 0; s < seguimientos.length; s++) {
                const seg = seguimientos[s];

                if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.tarjetaSeguimiento + 5)) {
                    this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                    pdf.addPage();
                    paginaNum++;
                    this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                    yPos = this.alturaEncabezado + 5;
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.subtitulo);
                    pdf.setTextColor(coloresIPH.primario);
                    pdf.text('HISTORIAL DE SEGUIMIENTO (CONTINUACIÓN)', margen, yPos);
                    yPos += 8;
                }

                // TARJETA DE SEGUIMIENTO
                pdf.setFillColor(coloresIPH.fondo);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.tarjetaSeguimiento, 'FD');

                // ENCABEZADO
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.primario);
                const fechaStr = this.formatearFecha(seg.fecha);
                pdf.text(`Seguimiento #${s + 1} - ${fechaStr}`, margen + 2, yPos);

                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini);
                pdf.setTextColor(coloresIPH.texto);
                pdf.text(`por: ${seg.usuarioNombre || 'Usuario'}`, margen + 2, yPos + 5);

                // DESCRIPCIÓN
                const descSeg = seg.descripcion || 'Sin descripción';
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(this.fonts.small);
                const lineasSeg = this.dividirTextoEnLineas(pdf, descSeg, anchoContenido - 10);

                let yTexto = yPos + 12;
                const espacioParaTexto = this.alturasContenedores.tarjetaSeguimiento - 20;
                const maxLineas = Math.floor(espacioParaTexto / 4);
                pdf.setTextColor(coloresIPH.texto);

                for (let i = 0; i < Math.min(lineasSeg.length, maxLineas); i++) {
                    pdf.text(lineasSeg[i], margen + 5, yTexto + (i * 4));
                }

                if (lineasSeg.length > maxLineas) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(this.fonts.mini);
                    pdf.setTextColor(coloresIPH.textoClaro);
                    pdf.text('... (texto continúa)', margen + 5, yTexto + (maxLineas * 4));
                }

                yPos += this.alturasContenedores.tarjetaSeguimiento + 5;

                // EVIDENCIAS DEL SEGUIMIENTO CON COMENTARIOS
                if (seg.evidencias && seg.evidencias.length > 0) {
                    if (!this.verificarEspacio(pdf, yPos, 10)) {
                        this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                        pdf.addPage();
                        paginaNum++;
                        this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                        yPos = this.alturaEncabezado + 5;
                    }

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresIPH.primario);
                    pdf.text(`Evidencias del seguimiento #${s + 1}:`, margen, yPos);
                    yPos += 5;

                    const evidenciaWidth = 40;
                    const evidenciaHeight = 30;
                    const espaciado = 5;
                    const evidenciasPorFila = 3;

                    for (let e = 0; e < seg.evidencias.length; e++) {
                        if (e > 0 && e % evidenciasPorFila === 0) {
                            yPos += evidenciaHeight + 10;
                            if (!this.verificarEspacio(pdf, yPos, evidenciaHeight + 15)) {
                                this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                                pdf.addPage();
                                paginaNum++;
                                this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                                yPos = this.alturaEncabezado + 5;
                                pdf.setFont('helvetica', 'bold');
                                pdf.setFontSize(this.fonts.small);
                                pdf.setTextColor(coloresIPH.primario);
                                pdf.text(`Evidencias del seguimiento #${s + 1} (continuación):`, margen, yPos);
                                yPos += 5;
                            }
                        }

                        const columna = e % evidenciasPorFila;
                        const xPos = margen + (columna * (evidenciaWidth + espaciado));

                        pdf.setDrawColor(coloresIPH.borde);
                        pdf.setFillColor(255, 255, 255);
                        pdf.roundedRect(xPos, yPos, evidenciaWidth, evidenciaHeight, 2, 2, 'FD');

                        pdf.setFillColor(coloresIPH.secundario);
                        pdf.setGState(new pdf.GState({ opacity: 0.8 }));
                        pdf.circle(xPos + 8, yPos + 8, 4, 'F');
                        pdf.setGState(new pdf.GState({ opacity: 1 }));

                        pdf.setTextColor(coloresIPH.primario);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.mini);
                        pdf.text((e + 1).toString(), xPos + 8, yPos + 8.5, { align: 'center' });

                        await this.procesarImagenConProxy(pdf, seg.evidencias[e], xPos, yPos, evidenciaWidth, evidenciaHeight, e + 1, true, onProgress);
                    }

                    const filasEvidencias = Math.ceil(seg.evidencias.length / evidenciasPorFila);
                    yPos += (evidenciaHeight * filasEvidencias) + (10 * filasEvidencias) + 5;
                }
            }
        }

        // AVISO DE PRIVACIDAD
        if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.avisoPrivacidad + 5)) {
            this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
            pdf.addPage();
            paginaNum++;
            this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
            yPos = this.alturaEncabezado + 5;
        }

        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos, anchoContenido, this.alturasContenedores.avisoPrivacidad, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('AVISO DE PRIVACIDAD', margen + 2, yPos + 4);

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini - 0.5);
        pdf.setTextColor(coloresIPH.textoClaro);

        const aviso = 'La privacidad de esta información se garantiza a la vez que el responsable del tratamiento sea el responsable de la protección de datos personales. La finalidad de la gestión de datos es la prestación de servicios públicos y la promoción de la igualdad de oportunidades.';
        const lineasAviso = this.dividirTextoEnLineas(pdf, aviso, anchoContenido - 10);
        const espacioParaAviso = this.alturasContenedores.avisoPrivacidad - 8;
        const maxLineasAviso = Math.floor(espacioParaAviso / 3);

        for (let i = 0; i < Math.min(lineasAviso.length, maxLineasAviso); i++) {
            pdf.text(lineasAviso[i], margen + 2, yPos + 8 + (i * 3));
        }

        this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
    },

    async procesarImagenConProxy(pdf, imagen, x, y, ancho, alto, numero, esEvidencia, onProgress) {
        try {
            const url = this.extraerUrlImagen(imagen);
            const comentario = this.extraerComentario(imagen);

            if (url) {
                let imgData = null;
                try {
                    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                    const response = await fetch(proxyUrl);
                    if (response.ok) {
                        const blob = await response.blob();
                        imgData = await this.blobToBase64(blob);
                    }
                } catch (e) {
                    imgData = await this.cargarImagenFirebase(url);
                }

                if (imgData) {
                    try {
                        pdf.addImage(imgData, 'JPEG', x + 2, y + 2, ancho - 4, alto - 4, undefined, 'FAST');
                    } catch {
                        this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
                    }
                } else {
                    this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
                }
            } else {
                this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
            }

            // ===== MOSTRAR COMENTARIO DE LA IMAGEN =====
            if (comentario) {
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini - 0.5);
                pdf.setTextColor(coloresIPH.textoClaro);
                const comentCorto = comentario.length > 25 ? comentario.substring(0, 22) + '...' : comentario;
                pdf.text(comentCorto, x + (ancho / 2), y + alto + 4, { align: 'center' });
            }

            if (onProgress) {
                onProgress(Math.min(90, 50 + Math.random() * 30));
            }
        } catch {
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
        }
    },

    dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.texto);
        pdf.text(esEvidencia ? `📷 ${numero}` : `FOTO ${numero}`, x + (ancho / 2), y + (alto / 2), { align: 'center' });
    },

    async mostrarOpcionesDescarga(pdf, nombreArchivo) {
        const result = await Swal.fire({
            title: 'Informe Generado',
            html: `<div style="text-align: center;"><i class="fas fa-file-pdf" style="font-size: 48px; color: #c0392b; margin-bottom: 16px;"></i><p style="color: #333; margin: 10px 0;">El Informe de Incidencia se ha generado correctamente.</p></div>`,
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

    async generarIPHMultiple(incidencias, opciones = {}) {
        try {
            if (!incidencias || incidencias.length === 0) return;
            const { mostrarAlerta = true, tituloAlerta = 'Generando Informes...' } = opciones;
            if (mostrarAlerta) {
                Swal.fire({ title: tituloAlerta, html: `<div>Procesando ${incidencias.length} incidencia(s)...</div>`, allowOutsideClick: false, showConfirmButton: false });
            }
            for (let i = 0; i < incidencias.length; i++) {
                if (mostrarAlerta) Swal.update({ html: `<div>Procesando incidencia ${i + 1} de ${incidencias.length}...</div>` });
                await this.generarIPH(incidencias[i], { mostrarAlerta: false });
            }
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({ icon: 'success', title: '¡Completado!', text: `Se generaron ${incidencias.length} informes correctamente.`, timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: error.message });
            }
            throw error;
        }
    }
};

export default generadorIPH;