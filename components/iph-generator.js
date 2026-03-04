/**
 * IPH GENERATOR - Sistema Centinela
 * VERSIÓN: 3.34 - CORREGIDO: DESBORDAMIENTO EN SEGUIMIENTOS
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
        small: 10,
        mini: 9,
        micro: 8
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
        tarjetaSeguimiento: 80,
        avisoPrivacidad: 20
    },

    imagenesCache: new Map(),

    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.subcategoriasCache) this.subcategoriasCache = config.subcategoriasCache;
        if (config.usuariosCache) {
            this.usuariosCache = config.usuariosCache;
            console.log('✅ Usuarios cargados:', this.usuariosCache.length);
        }
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
        if (!usuarioId) {
            return 'No especificado';
        }

        // Buscar por diferentes formatos de ID
        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId ||
            u.uid === usuarioId ||
            u._id === usuarioId ||
            u.usuarioId === usuarioId
        );

        if (usuario) {
            return usuario.nombreCompleto || usuario.nombre || usuario.email || usuario.displayName || 'Usuario';
        }

        return 'No especificado';
    },

    obtenerCargoUsuario(usuarioId) {
        if (!usuarioId) return '';

        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId ||
            u.uid === usuarioId ||
            u._id === usuarioId ||
            u.usuarioId === usuarioId
        );

        return usuario ? (usuario.cargo || usuario.rol || usuario.puesto || '') : '';
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

        if (typeof item === 'string') {
            const trimmed = item.trim();
            return trimmed.startsWith('http') || trimmed.startsWith('data:image') || trimmed.startsWith('blob:') ? trimmed : null;
        }

        if (typeof item === 'object') {
            const props = [
                'url', 'URL', 'src', 'path', 'downloadURL', 'imageUrl',
                'foto', 'imagen', 'evidencia', 'fotoUrl', 'imagenUrl',
                'firebaseUrl', 'storageUrl', 'urlDescarga'
            ];

            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') {
                    const valor = item[prop].trim();
                    if (valor.startsWith('http') || valor.startsWith('data:image') || valor.startsWith('blob:')) {
                        return valor;
                    }
                }
            }

            if (item.url && typeof item.url === 'object' && item.url.url) {
                return item.url.url;
            }
        }

        return null;
    },

    extraerComentario(item) {
        if (!item) return '';

        if (typeof item === 'string') return '';

        if (typeof item === 'object') {
            const props = [
                'comentario', 'descripcion', 'nombre', 'titulo',
                'caption', 'texto', 'nota', 'observacion',
                'detalle', 'comentarios', 'description'
            ];

            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') {
                    return item[prop].trim();
                }
            }

            if (item.metadata && item.metadata.comentario) {
                return item.metadata.comentario;
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
            this.cargarConImage.bind(this),
            this.cargarConIframe.bind(this)
        ];

        for (const estrategia of estrategias) {
            try {
                const imgData = await estrategia(urlLimpia);
                if (imgData) {
                    this.imagenesCache.set(urlLimpia, imgData);
                    return imgData;
                }
            } catch (error) {
                console.warn(`Estrategia falló para ${urlLimpia}:`, error);
            }
        }

        console.warn(`No se pudo cargar imagen: ${urlLimpia}`);
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
            'https://cors-anywhere.herokuapp.com/' + url,
            'https://proxy.cors.sh/' + url,
            'https://crossorigin.me/' + url
        ];

        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(proxyUrl, {
                    headers: {
                        'Origin': window.location.origin
                    }
                });
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

    cargarConIframe(url) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            iframe.onload = () => {
                try {
                    const img = iframe.contentDocument.createElement('img');
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        document.body.removeChild(iframe);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    };
                    img.onerror = () => {
                        document.body.removeChild(iframe);
                        resolve(null);
                    };
                    img.src = url;
                } catch {
                    document.body.removeChild(iframe);
                    resolve(null);
                }
            };

            iframe.onerror = () => {
                document.body.removeChild(iframe);
                resolve(null);
            };

            iframe.src = 'about:blank';
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
            let fechaObj;

            // Si es un objeto Firestore Timestamp
            if (fecha && typeof fecha === 'object' && fecha.toDate) {
                fechaObj = fecha.toDate();
            }
            // Si es un objeto con seconds (Firestore Timestamp en formato plano)
            else if (fecha && typeof fecha === 'object' && fecha.seconds) {
                fechaObj = new Date(fecha.seconds * 1000);
            }
            // Si es un string ISO
            else if (typeof fecha === 'string') {
                fechaObj = new Date(fecha);
            }
            // Si ya es un objeto Date
            else if (fecha instanceof Date) {
                fechaObj = fecha;
            }
            // Si es un número (timestamp)
            else if (typeof fecha === 'number') {
                fechaObj = new Date(fecha);
            }
            else {
                return 'Fecha no disponible';
            }

            // Verificar si la fecha es válida
            if (!(fechaObj instanceof Date) || isNaN(fechaObj.getTime())) {
                return 'Fecha no disponible';
            }

            return fechaObj.toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

        } catch (error) {
            console.error('❌ Error formateando fecha:', error);
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
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.circle(xCentinela + radio, yLogo, radio, 'FD');
                pdf.addImage(this.logoCentinelaCircular, 'PNG',
                    xCentinela, yLogo - radio,
                    dimensiones.diametro, dimensiones.diametro);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.setLineWidth(1);
                pdf.circle(xCentinela + radio, yLogo, radio, 'S');
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
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.circle(xOrganizacion + radio, yLogo, radio, 'FD');
                pdf.addImage(this.logoOrganizacionCircular, 'PNG',
                    xOrganizacion, yLogo - radio,
                    dimensiones.diametro, dimensiones.diametro);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.setLineWidth(1);
                pdf.circle(xOrganizacion + radio, yLogo, radio, 'S');
            } catch (e) {
                console.error('Error dibujando logo organización:', e);
                this.dibujarLogoPlaceholderCircular(pdf, xOrganizacion + radio, yLogo, radio, 'ORG');
            }
        } else {
            this.dibujarLogoPlaceholderCircular(pdf, xOrganizacion + radio, yLogo, radio, 'ORG');
        }

        // Línea divisoria
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

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text(`Fecha: ${fechaStr}`, margen, 22);

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

        // Dividir el texto por saltos de línea primero
        const parrafos = texto.toString().split('\n');
        const todasLasLineas = [];

        for (const parrafo of parrafos) {
            if (parrafo.trim() === '') {
                todasLasLineas.push(''); // Línea vacía para mantener el espacio
                continue;
            }

            const palabras = parrafo.split(' ');
            let lineaActual = '';

            for (const palabra of palabras) {
                const textoPrueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
                if (pdf.getTextWidth(textoPrueba) <= anchoMaximo) {
                    lineaActual = textoPrueba;
                } else {
                    if (lineaActual) {
                        todasLasLineas.push(lineaActual);
                    }
                    lineaActual = palabra;
                }
            }
            if (lineaActual) {
                todasLasLineas.push(lineaActual);
            }
        }

        return todasLasLineas;
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

        // REPORTADO POR - Solo si hay datos
        const nombreReportadoPor = this.obtenerNombreUsuario(incidencia.reportadoPorId);
        const cargoReportadoPor = this.obtenerCargoUsuario(incidencia.reportadoPorId);

        if (nombreReportadoPor !== 'No especificado' || cargoReportadoPor) {
            if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.reportadoPor + 5)) {
                this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                pdf.addPage();
                paginaNum++;
                this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                yPos = this.alturaEncabezado + 5;
            }

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
            pdf.text(`${nombreReportadoPor}`, margen + 2, yPos);
            yPos += 4;
            if (cargoReportadoPor) {
                pdf.text(`CARGO / PUESTO: ${cargoReportadoPor}`, margen + 2, yPos);
            }
            yPos += this.alturasContenedores.reportadoPor - 7;
        }

        // DESCRIPCIÓN
        const lineasDesc = this.dividirTextoEnLineas(pdf, incidencia.detalles || 'No hay descripción disponible.', anchoContenido - 10);
        const espacioNecesarioDesc = 15 + (lineasDesc.length * 4);

        if (!this.verificarEspacio(pdf, yPos, espacioNecesarioDesc)) {
            this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
            pdf.addPage();
            paginaNum++;
            this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
            yPos = this.alturaEncabezado + 5;
        }

        const alturaContenedorDesc = Math.max(this.alturasContenedores.descripcion, espacioNecesarioDesc + 10);
        pdf.setFillColor(coloresIPH.fondo);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, alturaContenedorDesc, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('DESCRIPCIÓN DE LA INCIDENCIA:', margen + 2, yPos);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);

        let yTextoDesc = yPos + 5;
        for (let i = 0; i < lineasDesc.length; i++) {
            if (lineasDesc[i] === '') {
                yTextoDesc += 4;
            } else {
                pdf.text(lineasDesc[i], margen + 5, yTextoDesc);
                yTextoDesc += 4;
            }
        }

        yPos = yTextoDesc + 5;

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

            const imgWidth = 35;
            const imgHeight = 30;
            const espaciado = 5;

            const anchoComentario = anchoContenido - imgWidth - (espaciado * 2);

            for (let i = 0; i < Math.min(incidencia.imagenes.length, 3); i++) {
                const xPos = margen + 5;
                const xComentario = xPos + imgWidth + espaciado;

                pdf.setDrawColor(coloresIPH.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');

                pdf.setFillColor(250, 250, 250);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.roundedRect(xComentario, yPos, anchoComentario, imgHeight, 2, 2, 'FD');

                await this.procesarImagenConProxy(pdf, incidencia.imagenes[i], xPos, yPos, imgWidth, imgHeight, xComentario, anchoComentario, i + 1, false, onProgress);

                yPos += imgHeight + espaciado;
            }
            yPos += 5;
        }

        // EVIDENCIAS DE CONTINUACIÓN
        if (incidencia.imagenes && incidencia.imagenes.length > 3) {
            for (let i = 3; i < incidencia.imagenes.length; i++) {
                if (!this.verificarEspacio(pdf, yPos, 45)) {
                    this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
                    pdf.addPage();
                    paginaNum++;
                    this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
                    yPos = this.alturaEncabezado + 5;
                }

                const imgWidth = 35;
                const imgHeight = 30;
                const espaciado = 5;
                const anchoComentario = anchoContenido - imgWidth - (espaciado * 2);

                const xPos = margen + 5;
                const xComentario = xPos + imgWidth + espaciado;

                pdf.setDrawColor(coloresIPH.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');

                pdf.setFillColor(250, 250, 250);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.roundedRect(xComentario, yPos, anchoComentario, imgHeight, 2, 2, 'FD');

                await this.procesarImagenConProxy(pdf, incidencia.imagenes[i], xPos, yPos, imgWidth, imgHeight, xComentario, anchoComentario, i + 1, false, onProgress);

                yPos += imgHeight + espaciado;
            }
        }

        // =============================================
        // HISTORIAL DE SEGUIMIENTO - CORREGIDO EL DESBORDAMIENTO
        // =============================================
        const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

        if (seguimientos && seguimientos.length > 0) {
            yPos += 10;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.subtitulo);
            pdf.setTextColor(coloresIPH.primario);
            pdf.text('HISTORIAL DE SEGUIMIENTO', margen, yPos);
            yPos += 8;

            for (let s = 0; s < seguimientos.length; s++) {
                const seg = seguimientos[s];

                // Calcular altura necesaria para este seguimiento
                const lineasSeg = this.dividirTextoEnLineas(pdf, seg.descripcion || 'Sin descripción', anchoContenido - 10);
                const alturaTexto = lineasSeg.length * 4;

                // Calcular altura de evidencias
                let alturaEvidencias = 0;
                if (seg.evidencias && seg.evidencias.length > 0) {
                    alturaEvidencias = 10; // Título
                    for (let e = 0; e < seg.evidencias.length; e++) {
                        alturaEvidencias += 35; // 30 de imagen + 5 de espacio
                    }
                }

                const alturaNecesaria = 25 + alturaTexto + alturaEvidencias; // 25 para encabezado y márgenes

                // Verificar espacio y crear nueva página si es necesario
                if (!this.verificarEspacio(pdf, yPos, alturaNecesaria + 10)) {
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

                // Dibujar contenedor principal del seguimiento
                pdf.setFillColor(coloresIPH.fondo);
                pdf.setDrawColor(coloresIPH.borde);
                pdf.rect(margen, yPos - 3, anchoContenido, alturaNecesaria, 'FD');

                // ENCABEZADO
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.primario);

                let fechaSeg = seg.fecha || seg.fechaCreacion || seg.createdAt || null;
                const fechaStr = this.formatearFecha(fechaSeg);

                pdf.text(`Seguimiento #${s + 1} - ${fechaStr}`, margen + 2, yPos);

                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini);
                pdf.setTextColor(coloresIPH.texto);

                const nombreUsuario = seg.usuarioNombre || seg.usuario || this.obtenerNombreUsuario(seg.usuarioId) || 'Usuario';
                pdf.text(`por: ${nombreUsuario}`, margen + 2, yPos + 5);

                // DESCRIPCIÓN
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.texto);

                let yTexto = yPos + 12;
                for (let i = 0; i < lineasSeg.length; i++) {
                    if (lineasSeg[i] === '') {
                        yTexto += 4;
                    } else {
                        pdf.text(lineasSeg[i], margen + 5, yTexto);
                        yTexto += 4;
                    }
                }

                // EVIDENCIAS DEL SEGUIMIENTO
                if (seg.evidencias && seg.evidencias.length > 0) {
                    yTexto += 5;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresIPH.primario);
                    pdf.text(`Evidencias del seguimiento #${s + 1}:`, margen, yTexto);
                    yTexto += 5;

                    const evidenciaWidth = 35;
                    const evidenciaHeight = 30;
                    const espaciado = 5;
                    const anchoComentario = anchoContenido - evidenciaWidth - (espaciado * 2);

                    for (let e = 0; e < seg.evidencias.length; e++) {
                        const xPos = margen + 5;
                        const xComentario = xPos + evidenciaWidth + espaciado;

                        pdf.setDrawColor(coloresIPH.borde);
                        pdf.setFillColor(255, 255, 255);
                        pdf.roundedRect(xPos, yTexto, evidenciaWidth, evidenciaHeight, 2, 2, 'FD');

                        pdf.setFillColor(250, 250, 250);
                        pdf.setDrawColor(coloresIPH.borde);
                        pdf.roundedRect(xComentario, yTexto, anchoComentario, evidenciaHeight, 2, 2, 'FD');

                        pdf.setFillColor(coloresIPH.secundario);
                        pdf.setGState(new pdf.GState({ opacity: 0.8 }));
                        pdf.circle(xPos + 8, yTexto + 8, 4, 'F');
                        pdf.setGState(new pdf.GState({ opacity: 1 }));

                        pdf.setTextColor(coloresIPH.primario);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.mini);
                        pdf.text((e + 1).toString(), xPos + 8, yTexto + 8.5, { align: 'center' });

                        await this.procesarImagenConProxy(pdf, seg.evidencias[e], xPos, yTexto, evidenciaWidth, evidenciaHeight, xComentario, anchoComentario, e + 1, true, onProgress);

                        yTexto += evidenciaHeight + espaciado;
                    }

                    yPos = yTexto + 5;
                } else {
                    yPos = yTexto + 5;
                }
            }
        }

        // ===== AVISO DE PRIVACIDAD =====
        const altoPagina = pdf.internal.pageSize.getHeight();
        const espacioRestante = altoPagina - yPos - 25;

        if (espacioRestante < this.alturasContenedores.avisoPrivacidad + 5) {
            this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
            pdf.addPage();
            paginaNum++;
            this.dibujarEncabezadoFijo(pdf, incidencia, paginaNum, this.totalPaginas);
            yPos = this.alturaEncabezado + 5;
        }

        yPos = altoPagina - 25 - this.alturasContenedores.avisoPrivacidad;

        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(coloresIPH.borde);
        pdf.rect(margen, yPos, anchoContenido, this.alturasContenedores.avisoPrivacidad, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.primario);
        pdf.text('AVISO DE PRIVACIDAD', margen + 2, yPos + 4);

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.textoClaro);

        const aviso = 'La privacidad de esta información se garantiza a la vez que el responsable del tratamiento sea el responsable de la protección de datos personales. La finalidad de la gestión de datos es la prestación de servicios públicos y la promoción de la igualdad de oportunidades.';
        const lineasAviso = this.dividirTextoEnLineas(pdf, aviso, anchoContenido - 10);

        for (let i = 0; i < Math.min(lineasAviso.length, 4); i++) {
            pdf.text(lineasAviso[i], margen + 2, yPos + 8 + (i * 3));
        }

        this.dibujarPiePaginaFijo(pdf, paginaNum, this.totalPaginas);
    },

    async procesarImagenConProxy(pdf, imagen, x, y, ancho, alto, xComentario, anchoComentario, numero, esEvidencia, onProgress) {
        try {
            const url = this.extraerUrlImagen(imagen);
            const comentario = this.extraerComentario(imagen);

            if (url) {
                let imgData = null;

                const metodosCarga = [
                    async () => {
                        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            return await this.blobToBase64(blob);
                        }
                        return null;
                    },
                    async () => {
                        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            return await this.blobToBase64(blob);
                        }
                        return null;
                    },
                    async () => {
                        return await this.cargarConImage(url);
                    }
                ];

                for (const metodo of metodosCarga) {
                    try {
                        imgData = await metodo();
                        if (imgData) break;
                    } catch (e) {
                        continue;
                    }
                }

                if (imgData) {
                    try {
                        pdf.addImage(imgData, 'JPEG', x + 2, y + 2, ancho - 4, alto - 4, undefined, 'FAST');
                    } catch (e) {
                        this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
                    }
                } else {
                    this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
                }
            } else {
                this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
            }

            if (comentario) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.primario);
                pdf.text('Comentario:', xComentario + 2, y + 5);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresIPH.texto);

                const anchoTextoComentario = anchoComentario - 6;
                const lineasComentario = this.dividirTextoEnLineas(pdf, comentario, anchoTextoComentario);

                const alturaDisponible = alto - 10;
                const maxLineas = Math.floor(alturaDisponible / 4);

                for (let i = 0; i < Math.min(lineasComentario.length, maxLineas); i++) {
                    pdf.text(lineasComentario[i], xComentario + 2, y + 9 + (i * 4));
                }

                if (lineasComentario.length > maxLineas) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(this.fonts.mini);
                    pdf.setTextColor(coloresIPH.textoClaro);
                    pdf.text('...', xComentario + 2, y + 9 + (maxLineas * 4));
                }
            }

            if (onProgress) {
                onProgress(Math.min(90, 50 + Math.random() * 30));
            }
        } catch (error) {
            console.error(`Error procesando imagen #${numero}:`, error);
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
        }
    },

    dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresIPH.texto);
        pdf.text(esEvidencia ? `📷 ${numero}` : `FOTO ${numero}`, x + (ancho / 2), y + (alto / 2) - 3, { align: 'center' });

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresIPH.textoClaro);
        pdf.text('(imagen no disponible)', x + (ancho / 2), y + (alto / 2) + 5, { align: 'center' });
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