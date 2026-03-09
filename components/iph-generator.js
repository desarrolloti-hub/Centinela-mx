/**
 * IPH GENERATOR - Sistema Centinela
 * VERSIÓN: 3.5 - AHORA HEREDA DE PDF BASE GENERATOR
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES IPH
// =============================================
export const coloresIPH = {
    ...coloresBase,
    riesgoCritico: '#ef4444',
    riesgoAlto: '#f97316',
    riesgoMedio: '#eab308',
    riesgoBajo: '#10b981'
};

// =============================================
// CLASE IPH GENERATOR (HEREDA DE BASE)
// =============================================
class IPHGenerator extends PDFBaseGenerator {
    constructor() {
        super(); // Llama al constructor de la clase base

        // Propiedades específicas de IPH
        this.sucursalesCache = [];
        this.categoriasCache = [];
        this.subcategoriasCache = [];
        this.usuariosCache = [];
        this.incidenciaActual = null;

        this.alturasContenedores = {
            identificacion: 15,
            datosGenerales: 20,
            clasificacion: 40,
            reportadoPor: 15,
            descripcion: 45,
            anexos: 45,
            tarjetaSeguimiento: 80,
            avisoPrivacidad: 25
        };
    }

    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.subcategoriasCache) {
            this.subcategoriasCache = config.subcategoriasCache;
            console.log('✅ Subcategorías cargadas:', this.subcategoriasCache.length);
        }
        if (config.usuariosCache) {
            this.usuariosCache = config.usuariosCache;
            console.log('✅ Usuarios cargados:', this.usuariosCache.length);
        }
        if (config.authToken) this.authToken = config.authToken;
        console.log('✅ Generador IPH configurado');
    }

    obtenerNombreSucursal(sucursalId) {
        if (!sucursalId) return 'No especificada';
        const sucursal = this.sucursalesCache.find(s => s.id === sucursalId);
        return sucursal ? sucursal.nombre : 'No disponible';
    }

    obtenerNombreCategoria(categoriaId) {
        if (!categoriaId) return 'No especificada';
        const categoria = this.categoriasCache.find(c => c.id === categoriaId);
        return categoria ? categoria.nombre : 'No disponible';
    }

    obtenerNombreSubcategoria(subcategoriaId) {
        if (!subcategoriaId) return 'No especificada';
        const subcategoria = this.subcategoriasCache.find(s =>
            s.id === subcategoriaId || s._id === subcategoriaId || s.uid === subcategoriaId
        );
        return subcategoria ? (subcategoria.nombre || subcategoria.descripcion || 'Subcategoría') : 'No disponible';
    }

    obtenerNombreUsuario(usuarioId) {
        if (!usuarioId) return 'No especificado';
        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId || u.uid === usuarioId || u._id === usuarioId || u.usuarioId === usuarioId
        );
        return usuario ? (usuario.nombreCompleto || usuario.nombre || usuario.email || usuario.displayName || 'Usuario') : 'No especificado';
    }

    obtenerCargoUsuario(usuarioId) {
        if (!usuarioId) return '';
        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId || u.uid === usuarioId || u._id === usuarioId || u.usuarioId === usuarioId
        );
        return usuario ? (usuario.cargo || usuario.rol || usuario.puesto || '') : '';
    }

    extraerUrlImagen(item) {
        if (!item) return null;
        if (typeof item === 'string') {
            const trimmed = item.trim();
            return trimmed.startsWith('http') || trimmed.startsWith('data:image') || trimmed.startsWith('blob:') ? trimmed : null;
        }
        if (typeof item === 'object') {
            const props = ['url', 'URL', 'src', 'path', 'downloadURL', 'imageUrl', 'foto', 'imagen', 'evidencia', 'fotoUrl', 'imagenUrl', 'firebaseUrl', 'storageUrl', 'urlDescarga'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') {
                    const valor = item[prop].trim();
                    if (valor.startsWith('http') || valor.startsWith('data:image') || valor.startsWith('blob:')) return valor;
                }
            }
            if (item.url && typeof item.url === 'object' && item.url.url) return item.url.url;
        }
        return null;
    }

    extraerComentario(item) {
        if (!item) return '';
        if (typeof item === 'string') return '';
        if (typeof item === 'object') {
            const props = ['comentario', 'descripcion', 'nombre', 'titulo', 'caption', 'texto', 'nota', 'observacion', 'detalle', 'comentarios', 'description'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') return item[prop].trim();
            }
            if (item.metadata && item.metadata.comentario) return item.metadata.comentario;
        }
        return '';
    }

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
        return null;
    }

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
    }

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
                    headers: { 'Origin': window.location.origin }
                });
                if (response.ok) {
                    const blob = await response.blob();
                    if (blob.type.startsWith('image/')) return await this.blobToBase64(blob);
                }
            } catch {
                continue;
            }
        }
        return null;
    }

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
    }

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
    }

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
            await this.cargarLogoCentinela();
            await this.cargarLogoOrganizacion();
            this.incidenciaActual = incidencia;

            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // Calcular total REAL de páginas
            this.totalPaginas = await this.calcularTotalPaginasReal(incidencia);
            this.paginaActualReal = 1;

            // Generar primera página
            await this.generarPaginaIPH(pdf, incidencia, onProgress);

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
    }

    async calcularTotalPaginasReal(incidencia) {
        let total = 1;
        let imagenes = [];

        if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) imagenes = incidencia.imagenes;
        else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) imagenes = incidencia.evidencias;
        else if (incidencia.fotos && Array.isArray(incidencia.fotos)) imagenes = incidencia.fotos;
        else if (incidencia.anexos && Array.isArray(incidencia.anexos)) imagenes = incidencia.anexos;

        if (imagenes.length > 3) {
            const imagenesRestantes = imagenes.length - 3;
            total += Math.ceil(imagenesRestantes / 4);
        }

        let seguimientos = [];
        if (incidencia.getSeguimientosArray && typeof incidencia.getSeguimientosArray === 'function') {
            seguimientos = incidencia.getSeguimientosArray() || [];
        } else if (incidencia.seguimientos && Array.isArray(incidencia.seguimientos)) {
            seguimientos = incidencia.seguimientos;
        } else if (incidencia.historial && Array.isArray(incidencia.historial)) {
            seguimientos = incidencia.historial;
        }

        for (const seg of seguimientos) {
            let evidenciasSeg = [];
            if (seg.evidencias && Array.isArray(seg.evidencias)) evidenciasSeg = seg.evidencias;
            else if (seg.imagenes && Array.isArray(seg.imagenes)) evidenciasSeg = seg.imagenes;
            else if (seg.fotos && Array.isArray(seg.fotos)) evidenciasSeg = seg.fotos;
            else if (seg.anexos && Array.isArray(seg.anexos)) evidenciasSeg = seg.anexos;

            if (evidenciasSeg.length > 0) {
                total += Math.ceil(evidenciasSeg.length / 3);
            }
        }

        return total;
    }

    async generarPaginaIPH(pdf, incidencia, onProgress) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;

        // Usar el encabezado base (cambiar dibujarEncabezadoFijo por dibujarEncabezadoBase)
        this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', incidencia.id);

        // IDENTIFICACIÓN
        pdf.setFillColor(coloresBase.fondo);
        pdf.setDrawColor(coloresBase.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.identificacion, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresBase.primario);
        pdf.text('IDENTIFICACIÓN DE LA UNIDAD', margen + 2, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.texto);
        pdf.text(`ORGANIZACIÓN: ${this.organizacionActual?.nombre || 'No especificada'}`, margen + 2, yPos);
        yPos += 4;
        pdf.text(`SUCURSAL: ${this.obtenerNombreSucursal(incidencia.sucursalId)}`, margen + 2, yPos);
        yPos += this.alturasContenedores.identificacion - 3;

        // DATOS GENERALES
        pdf.setFillColor(coloresBase.fondo);
        pdf.setDrawColor(coloresBase.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.datosGenerales, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresBase.primario);
        pdf.text('DATOS GENERALES', margen + 2, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.texto);

        const fechaReporte = incidencia.fechaCreacion ? new Date(incidencia.fechaCreacion) : new Date();
        const fechaStr = this.formatearFechaVisualizacion(fechaReporte);
        const horaStr = this.formatearHoraVisualizacion(fechaReporte);

        pdf.text(`FECHA DEL REPORTE: ${fechaStr}`, margen + 2, yPos);
        pdf.text(`HORA: ${horaStr}`, margen + 100, yPos);
        yPos += 4;
        yPos += this.alturasContenedores.datosGenerales - 12;

        // CLASIFICACIÓN
        pdf.setFillColor(coloresBase.fondo);
        pdf.setDrawColor(coloresBase.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.clasificacion, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresBase.primario);
        pdf.text('CLASIFICACIÓN DE LA INCIDENCIA', margen + 2, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.texto);

        const categoriaNombre = this.obtenerNombreCategoria(incidencia.categoriaId);
        pdf.text(`CATEGORÍA: ${categoriaNombre}`, margen + 2, yPos);
        yPos += 4;

        const subcategoriaNombre = this.obtenerNombreSubcategoria(incidencia.subcategoriaId);
        pdf.text(`SUBCATEGORÍA: ${subcategoriaNombre}`, margen + 2, yPos);
        yPos += 4;

        const nivelRiesgo = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
        pdf.text(`NIVEL DE RIESGO: ${nivelRiesgo?.toUpperCase() || 'NO ESPECIFICADO'}`, margen + 2, yPos);
        yPos += 4;

        const estado = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;
        pdf.text(`ESTADO (Actual): ${estado?.toUpperCase() || 'NO ESPECIFICADO'}`, margen + 2, yPos);
        yPos += 4;

        const fechaInicio = incidencia.fechaInicio ? new Date(incidencia.fechaInicio) : new Date();
        const fechaInicioStr = this.formatearFechaVisualizacion(fechaInicio);
        const horaInicioStr = this.formatearHoraVisualizacion(fechaInicio);

        pdf.text(`FECHA INCIDENCIA: ${fechaInicioStr}`, margen + 2, yPos);
        pdf.text(`HORA: ${horaInicioStr}`, margen + 100, yPos);
        yPos += this.alturasContenedores.clasificacion - 16;

        // REPORTADO POR
        const nombreReportadoPor = this.obtenerNombreUsuario(incidencia.reportadoPorId);
        const cargoReportadoPor = this.obtenerCargoUsuario(incidencia.reportadoPorId);

        if (nombreReportadoPor !== 'No especificado' || cargoReportadoPor) {
            if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.reportadoPor + 5)) {
                this.dibujarPiePagina(pdf); // Cambiar dibujarPiePaginaFijo por dibujarPiePagina
                pdf.addPage();
                this.paginaActualReal++;
                this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                yPos = this.alturaEncabezado + 5;
            }

            pdf.setFillColor(coloresBase.fondo);
            pdf.setDrawColor(coloresBase.borde);
            pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.reportadoPor, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(coloresBase.primario);
            pdf.text('REPORTADO POR:', margen + 2, yPos);
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(this.fonts.small);
            pdf.setTextColor(coloresBase.texto);
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
            this.dibujarPiePagina(pdf);
            pdf.addPage();
            this.paginaActualReal++;
            this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
            yPos = this.alturaEncabezado + 5;
        }

        const alturaContenedorDesc = Math.max(this.alturasContenedores.descripcion, espacioNecesarioDesc + 10);
        pdf.setFillColor(coloresBase.fondo);
        pdf.setDrawColor(coloresBase.borde);
        pdf.rect(margen, yPos - 3, anchoContenido, alturaContenedorDesc, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresBase.primario);
        pdf.text('DESCRIPCIÓN DE LA INCIDENCIA:', margen + 2, yPos);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.texto);

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

        // Obtener imágenes principales
        let imagenesPrincipales = [];
        if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) {
            imagenesPrincipales = incidencia.imagenes;
        } else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) {
            imagenesPrincipales = incidencia.evidencias;
        } else if (incidencia.fotos && Array.isArray(incidencia.fotos)) {
            imagenesPrincipales = incidencia.fotos;
        } else if (incidencia.anexos && Array.isArray(incidencia.anexos)) {
            imagenesPrincipales = incidencia.anexos;
        }

        // ANEXOS PRINCIPALES (primeras 3 imágenes)
        if (imagenesPrincipales.length > 0) {
            if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.anexos + 5)) {
                this.dibujarPiePagina(pdf);
                pdf.addPage();
                this.paginaActualReal++;
                this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                yPos = this.alturaEncabezado + 5;
            }

            pdf.setFillColor(coloresBase.fondo);
            pdf.setDrawColor(coloresBase.borde);
            pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.anexos, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(coloresBase.primario);
            pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS', margen + 2, yPos);
            yPos += 5;

            const imgWidth = 35;
            const imgHeight = 30;
            const espaciado = 5;
            const anchoComentario = anchoContenido - imgWidth - (espaciado * 2);

            const imagenesMostrar = Math.min(imagenesPrincipales.length, 3);

            for (let i = 0; i < imagenesMostrar; i++) {
                const xPos = margen + 5;
                const xComentario = xPos + imgWidth + espaciado;

                pdf.setDrawColor(coloresBase.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');

                pdf.setFillColor(250, 250, 250);
                pdf.setDrawColor(coloresBase.borde);
                pdf.roundedRect(xComentario, yPos, anchoComentario, imgHeight, 2, 2, 'FD');

                await this.procesarImagenConProxy(pdf, imagenesPrincipales[i], xPos, yPos, imgWidth, imgHeight, xComentario, anchoComentario, i + 1, false, onProgress);

                yPos += imgHeight + espaciado;
            }
            yPos += 5;
        }

        // EVIDENCIAS DE CONTINUACIÓN (imágenes restantes)
        if (imagenesPrincipales.length > 3) {
            let imagenesRestantes = imagenesPrincipales.slice(3);
            let indiceImagen = 4;

            for (let i = 0; i < imagenesRestantes.length; i++) {
                if (!this.verificarEspacio(pdf, yPos, 40)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.normal);
                    pdf.setTextColor(coloresBase.primario);
                    pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS (CONTINUACIÓN)', margen, yPos);
                    yPos += 8;
                }

                const imgWidth = 35;
                const imgHeight = 30;
                const espaciado = 5;
                const anchoComentario = anchoContenido - imgWidth - (espaciado * 2);

                const xPos = margen + 5;
                const xComentario = xPos + imgWidth + espaciado;

                pdf.setDrawColor(coloresBase.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 2, 2, 'FD');

                pdf.setFillColor(250, 250, 250);
                pdf.setDrawColor(coloresBase.borde);
                pdf.roundedRect(xComentario, yPos, anchoComentario, imgHeight, 2, 2, 'FD');

                await this.procesarImagenConProxy(pdf, imagenesRestantes[i], xPos, yPos, imgWidth, imgHeight, xComentario, anchoComentario, indiceImagen, false, onProgress);

                yPos += imgHeight + espaciado;
                indiceImagen++;
            }
        }

        // SEGUIMIENTOS
        let seguimientos = [];
        if (incidencia.getSeguimientosArray && typeof incidencia.getSeguimientosArray === 'function') {
            seguimientos = incidencia.getSeguimientosArray() || [];
        } else if (incidencia.seguimientos && Array.isArray(incidencia.seguimientos)) {
            seguimientos = incidencia.seguimientos;
        } else if (incidencia.historial && Array.isArray(incidencia.historial)) {
            seguimientos = incidencia.historial;
        }

        if (seguimientos && seguimientos.length > 0) {
            for (let s = 0; s < seguimientos.length; s++) {
                const seg = seguimientos[s];

                const lineasSeg = this.dividirTextoEnLineas(pdf, seg.descripcion || seg.comentario || 'Sin descripción', anchoContenido - 10);
                const alturaTexto = lineasSeg.length * 4;

                let evidenciasSeg = [];
                if (seg.evidencias && Array.isArray(seg.evidencias)) evidenciasSeg = seg.evidencias;
                else if (seg.imagenes && Array.isArray(seg.imagenes)) evidenciasSeg = seg.imagenes;
                else if (seg.fotos && Array.isArray(seg.fotos)) evidenciasSeg = seg.fotos;
                else if (seg.anexos && Array.isArray(seg.anexos)) evidenciasSeg = seg.anexos;

                let alturaEvidencias = 0;
                if (evidenciasSeg.length > 0) {
                    alturaEvidencias = 10;
                    for (let e = 0; e < evidenciasSeg.length; e++) {
                        alturaEvidencias += 35;
                    }
                }

                const alturaNecesaria = 25 + alturaTexto + alturaEvidencias;

                if (!this.verificarEspacio(pdf, yPos, alturaNecesaria + 10)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;
                }

                pdf.setFillColor(coloresBase.fondo);
                pdf.setDrawColor(coloresBase.borde);
                pdf.rect(margen, yPos - 3, anchoContenido, alturaNecesaria, 'FD');

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresBase.primario);

                let fechaSeg = seg.fecha || seg.fechaCreacion || seg.createdAt || null;
                const fechaStr = this.formatearFecha(fechaSeg);

                pdf.text(`Seguimiento #${s + 1} - ${fechaStr}`, margen + 2, yPos);

                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini);
                pdf.setTextColor(coloresBase.texto);

                const nombreUsuario = seg.usuarioNombre || seg.usuario || this.obtenerNombreUsuario(seg.usuarioId) || 'Usuario';
                pdf.text(`por: ${nombreUsuario}`, margen + 2, yPos + 5);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresBase.texto);

                let yTexto = yPos + 12;
                for (let i = 0; i < lineasSeg.length; i++) {
                    if (lineasSeg[i] === '') {
                        yTexto += 4;
                    } else {
                        pdf.text(lineasSeg[i], margen + 5, yTexto);
                        yTexto += 4;
                    }
                }

                if (evidenciasSeg.length > 0) {
                    yTexto += 5;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresBase.primario);
                    pdf.text(`Evidencias del seguimiento #${s + 1}:`, margen, yTexto);
                    yTexto += 5;

                    const evidenciaWidth = 35;
                    const evidenciaHeight = 30;
                    const espaciado = 5;
                    const anchoComentario = anchoContenido - evidenciaWidth - (espaciado * 2);

                    for (let e = 0; e < evidenciasSeg.length; e++) {
                        const xPos = margen + 5;
                        const xComentario = xPos + evidenciaWidth + espaciado;

                        pdf.setDrawColor(coloresBase.borde);
                        pdf.setFillColor(255, 255, 255);
                        pdf.roundedRect(xPos, yTexto, evidenciaWidth, evidenciaHeight, 2, 2, 'FD');

                        pdf.setFillColor(250, 250, 250);
                        pdf.setDrawColor(coloresBase.borde);
                        pdf.roundedRect(xComentario, yTexto, anchoComentario, evidenciaHeight, 2, 2, 'FD');

                        pdf.setFillColor(coloresBase.secundario);
                        pdf.setGState(new pdf.GState({ opacity: 0.8 }));
                        pdf.circle(xPos + 8, yTexto + 8, 4, 'F');
                        pdf.setGState(new pdf.GState({ opacity: 1 }));

                        pdf.setTextColor(coloresBase.primario);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.mini);
                        pdf.text((e + 1).toString(), xPos + 8, yTexto + 8.5, { align: 'center' });

                        await this.procesarImagenConProxy(pdf, evidenciasSeg[e], xPos, yTexto, evidenciaWidth, evidenciaHeight, xComentario, anchoComentario, e + 1, true, onProgress);

                        yTexto += evidenciaHeight + espaciado;
                    }

                    yPos = yTexto + 5;
                } else {
                    yPos = yTexto + 5;
                }
            }
        }

        // AVISO DE PRIVACIDAD
        const altoPagina = pdf.internal.pageSize.getHeight();
        const espacioRestante = altoPagina - yPos - 25;

        if (espacioRestante < this.alturasContenedores.avisoPrivacidad + 5) {
            this.dibujarPiePagina(pdf);
            pdf.addPage();
            this.paginaActualReal++;
            this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
            yPos = this.alturaEncabezado + 5;
        }

        yPos = altoPagina - 25 - this.alturasContenedores.avisoPrivacidad;

        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(coloresBase.borde);
        pdf.rect(margen, yPos, anchoContenido, this.alturasContenedores.avisoPrivacidad, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresBase.primario);
        pdf.text('AVISO DE PRIVACIDAD', margen + 2, yPos + 4);

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresBase.textoClaro);

        const aviso = 'La información contenida en este documento es responsabilidad exclusiva de quien utiliza el Sistema Centinela y de la persona que ingresó los datos.';
        const lineasAviso = this.dividirTextoEnLineas(pdf, aviso, anchoContenido - 10);

        for (let i = 0; i < lineasAviso.length; i++) {
            pdf.text(lineasAviso[i], margen + 2, yPos + 8 + (i * 3));
        }

        this.dibujarPiePagina(pdf); // Cambiar dibujarPiePaginaFijo por dibujarPiePagina
    }

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
                pdf.setTextColor(coloresBase.primario);
                pdf.text('Comentario:', xComentario + 2, y + 5);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresBase.texto);

                const anchoTextoComentario = anchoComentario - 6;
                const lineasComentario = this.dividirTextoEnLineas(pdf, comentario, anchoTextoComentario);

                const alturaDisponible = alto - 10;
                const lineasPosibles = Math.floor(alturaDisponible / 4);

                for (let i = 0; i < Math.min(lineasComentario.length, lineasPosibles); i++) {
                    pdf.text(lineasComentario[i], xComentario + 2, y + 9 + (i * 4));
                }
            }

            if (onProgress) {
                onProgress(Math.min(90, 50 + Math.random() * 30));
            }
        } catch (error) {
            console.error(`Error procesando imagen #${numero}:`, error);
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
        }
    }

    dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.texto);
        pdf.text(esEvidencia ? `📷 ${numero}` : `FOTO ${numero}`, x + (ancho / 2), y + (alto / 2) - 3, { align: 'center' });

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text('(imagen no disponible)', x + (ancho / 2), y + (alto / 2) + 5, { align: 'center' });
    }

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
}

// Crear una instancia única para exportar
export const generadorIPH = new IPHGenerator();
export default generadorIPH;