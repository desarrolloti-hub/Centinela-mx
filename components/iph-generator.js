/**
 * IPH GENERATOR - Sistema Centinela
 * VERSIÓN: 4.8 - PAGINACIÓN CORREGIDA + DATOS COMPLETOS
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

export const coloresIPH = {
    ...coloresBase,
    riesgoCritico: '#ef4444',
    riesgoAlto: '#f97316',
    riesgoMedio: '#eab308',
    riesgoBajo: '#10b981'
};

// =============================================
// CONFIGURACIÓN DE IMÁGENES
// =============================================
const IMAGEN_CONFIG = {
    TIMEOUT: 15000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
    MAX_PARALLEL: 3,
    CACHE_DURATION: 300000,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    TAMANIOS: {
        IMAGEN_PRINCIPAL: {
            ancho: 85,
            alto: 70
        },
        EVIDENCIA_SEGUIMIENTO: {
            ancho: 85,
            alto: 70
        }
    },
    GRID: {
        columnas: 2,
        espaciadoColumnas: 15,
        espaciadoFilas: 15
    }
};

class IPHGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        
        this.sucursalesCache = [];
        this.categoriasCache = [];
        this.subcategoriasCache = [];
        this.usuariosCache = [];
        this.incidenciaActual = null;
        
        this.imageCache = new Map();
        this.pendingImages = new Map();
        this.imageLoadStats = new Map();
        
        this.alturasContenedores = {
            identificacion: 20,      // Aumentado para incluir usuario
            datosGenerales: 20,
            clasificacion: 45,
            reportadoPor: 15,
            descripcion: 45,
            anexos: 110,
            tarjetaSeguimiento: 150,
            avisoPrivacidad: 25
        };
        
        this.configuracionCarta = {
            ancho: 215.9,
            alto: 279.4,
            margen: 15,
            alturaEncabezado: 42,
            alturaPie: 15
        };
    }

    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.subcategoriasCache) this.subcategoriasCache = config.subcategoriasCache;
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
        if (config.authToken) this.authToken = config.authToken;
    }

    // =============================================
    // MÉTODOS DE UTILIDAD
    // =============================================
    
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
    
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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
    // SISTEMA DE IMÁGENES (mismo código anterior)
    // =============================================
    
    extraerUrlImagen(item) {
        if (!item) return null;
        
        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed.includes('firebasestorage.googleapis.com') || 
                trimmed.includes('firebaseio.com') ||
                trimmed.includes('firebase')) {
                if (this.authToken && !trimmed.includes('token=')) {
                    const separator = trimmed.includes('?') ? '&' : '?';
                    return `${trimmed}${separator}token=${this.authToken}`;
                }
                return trimmed;
            }
            if (trimmed.startsWith('http') || trimmed.startsWith('data:image') || trimmed.startsWith('blob:')) {
                return trimmed;
            }
            return null;
        }
        
        if (typeof item === 'object') {
            const firebaseProps = ['url', 'downloadURL', 'storageUrl', 'firebaseUrl', 'urlDescarga'];
            for (const prop of firebaseProps) {
                if (item[prop] && typeof item[prop] === 'string') {
                    let url = item[prop].trim();
                    if ((url.includes('firebase') || url.includes('googleapis')) && this.authToken && !url.includes('token=')) {
                        const separator = url.includes('?') ? '&' : '?';
                        url = `${url}${separator}token=${this.authToken}`;
                    }
                    return url;
                }
            }
            
            const props = ['src', 'path', 'imageUrl', 'foto', 'imagen', 'evidencia', 'fotoUrl', 'imagenUrl'];
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
    }
    
    extraerComentario(item) {
        if (!item) return '';
        if (typeof item === 'string') return '';
        if (typeof item === 'object') {
            const props = ['comentario', 'descripcion', 'nombre', 'titulo', 'caption', 'texto', 'nota', 'observacion', 'detalle', 'comentarios', 'description'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') {
                    let comentario = item[prop].trim();
                    comentario = comentario.replace(/[Ø=ÜÝ]/g, '');
                    return comentario;
                }
            }
            if (item.metadata && item.metadata.comentario) {
                let comentario = item.metadata.comentario.trim();
                comentario = comentario.replace(/[Ø=ÜÝ]/g, '');
                return comentario;
            }
        }
        return '';
    }
    
    esUrlValida(url) {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (trimmed === '') return false;
        if (trimmed.startsWith('data:image')) return true;
        if (trimmed.startsWith('blob:')) return true;
        try {
            const urlObj = new URL(trimmed);
            return ['http:', 'https:', 'ftp:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }
    
    normalizarUrl(url) {
        if (!url) return null;
        let normalized = url.trim();
        normalized = normalized.replace(/[?&](utm_|fbclid|gclid|_ga|_gl)[^&]*/g, '');
        normalized = normalized.replace(/[?&]$/, '');
        return normalized;
    }
    
    async cargarImagenConTimeout(url, timeoutMs = IMAGEN_CONFIG.TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: headers,
                mode: 'cors',
                cache: 'force-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            if (!IMAGEN_CONFIG.SUPPORTED_FORMATS.includes(blob.type)) {
                throw new Error(`Formato no soportado: ${blob.type}`);
            }
            
            if (blob.size > IMAGEN_CONFIG.MAX_IMAGE_SIZE) {
                throw new Error(`Imagen demasiado grande: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
            }
            
            return await this.blobToBase64(blob);
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Timeout después de ${timeoutMs}ms`);
            }
            throw error;
        }
    }
    
    async cargarImagenMultiEstrategia(url, intento = 0) {
        const urlNormalizada = this.normalizarUrl(url);
        if (!this.esUrlValida(urlNormalizada)) {
            throw new Error('URL inválida');
        }
        
        const cacheKey = `${urlNormalizada}_${intento}`;
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }
        
        if (this.pendingImages.has(cacheKey)) {
            return await this.pendingImages.get(cacheKey);
        }
        
        const estrategias = [
            async () => this.cargarImagenConTimeout(urlNormalizada),
            async () => {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlNormalizada)}`;
                return await this.cargarImagenConTimeout(proxyUrl, 10000);
            },
            async () => {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlNormalizada)}`;
                return await this.cargarImagenConTimeout(proxyUrl, 10000);
            },
            async () => {
                const proxyUrl = `https://cors-anywhere.herokuapp.com/${urlNormalizada}`;
                return await this.cargarImagenConTimeout(proxyUrl, 10000);
            },
            async () => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Image element timeout'));
                    }, IMAGEN_CONFIG.TIMEOUT);
                    
                    img.onload = () => {
                        clearTimeout(timeoutId);
                        const canvas = document.createElement('canvas');
                        const maxDimension = 1024;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > maxDimension || height > maxDimension) {
                            if (width > height) {
                                height = (height * maxDimension) / width;
                                width = maxDimension;
                            } else {
                                width = (width * maxDimension) / height;
                                height = maxDimension;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    };
                    
                    img.onerror = () => {
                        clearTimeout(timeoutId);
                        reject(new Error('Failed to load image'));
                    };
                    
                    img.crossOrigin = 'Anonymous';
                    img.src = urlNormalizada;
                });
            }
        ];
        
        const cargaPromise = (async () => {
            let lastError = null;
            
            for (let i = 0; i < estrategias.length; i++) {
                try {
                    const resultado = await estrategias[i]();
                    if (resultado) {
                        this.imageCache.set(cacheKey, resultado);
                        setTimeout(() => {
                            this.imageCache.delete(cacheKey);
                        }, IMAGEN_CONFIG.CACHE_DURATION);
                        return resultado;
                    }
                } catch (error) {
                    lastError = error;
                    console.warn(`Estrategia ${i + 1} falló para ${urlNormalizada}:`, error.message);
                    await new Promise(r => setTimeout(r, 200));
                }
            }
            
            throw lastError || new Error('Todas las estrategias fallaron');
        })();
        
        this.pendingImages.set(cacheKey, cargaPromise);
        
        try {
            return await cargaPromise;
        } finally {
            setTimeout(() => {
                this.pendingImages.delete(cacheKey);
            }, 1000);
        }
    }
    
    async cargarImagenConReintentos(url, maxRetries = IMAGEN_CONFIG.MAX_RETRIES) {
        let lastError = null;
        
        for (let intento = 0; intento <= maxRetries; intento++) {
            try {
                if (intento > 0) {
                    const delay = IMAGEN_CONFIG.RETRY_DELAY * Math.pow(2, intento - 1);
                    await new Promise(r => setTimeout(r, delay));
                }
                return await this.cargarImagenMultiEstrategia(url, intento);
            } catch (error) {
                lastError = error;
                console.warn(`Intento ${intento + 1}/${maxRetries + 1} falló:`, error.message);
            }
        }
        
        throw lastError || new Error('No se pudo cargar la imagen después de múltiples reintentos');
    }
    
    async preCargarImagenes(urls, onProgress) {
        const urlsValidas = urls.filter(url => this.esUrlValida(this.extraerUrlImagen(url)));
        const resultados = new Map();
        let completadas = 0;
        
        const procesarImagen = async (item) => {
            try {
                const imagenUrl = this.extraerUrlImagen(item);
                if (!imagenUrl) {
                    completadas++;
                    return null;
                }
                const imgData = await this.cargarImagenConReintentos(imagenUrl);
                resultados.set(imagenUrl, imgData);
                completadas++;
                if (onProgress) {
                    onProgress(completadas / urlsValidas.length);
                }
                return imgData;
            } catch (error) {
                console.error('Error precargando imagen:', error);
                completadas++;
                return null;
            }
        };
        
        const lotes = [];
        for (let i = 0; i < urlsValidas.length; i += IMAGEN_CONFIG.MAX_PARALLEL) {
            lotes.push(urlsValidas.slice(i, i + IMAGEN_CONFIG.MAX_PARALLEL));
        }
        
        for (const lote of lotes) {
            await Promise.all(lote.map(item => procesarImagen(item)));
        }
        
        return resultados;
    }
    
    async obtenerImagen(item) {
        const url = this.extraerUrlImagen(item);
        if (!url) return null;
        
        const cacheKey = this.normalizarUrl(url);
        for (const [key, value] of this.imageCache.entries()) {
            if (key.includes(cacheKey) || cacheKey.includes(key)) {
                return value;
            }
        }
        
        try {
            return await this.cargarImagenConReintentos(url);
        } catch (error) {
            console.error('Error obteniendo imagen:', error);
            return null;
        }
    }
    
    async dibujarImagenEnPDF(pdf, imagen, x, y, ancho, alto, numero, esEvidencia = false) {
        try {
            const imgData = await this.obtenerImagen(imagen);
            
            if (imgData) {
                try {
                    const tempImg = new Image();
                    await new Promise((resolve, reject) => {
                        tempImg.onload = resolve;
                        tempImg.onerror = reject;
                        tempImg.src = imgData;
                    });
                    
                    const aspectRatio = tempImg.width / tempImg.height;
                    let drawWidth = ancho - 4;
                    let drawHeight = alto - 4;
                    
                    if (aspectRatio > 1) {
                        drawHeight = drawWidth / aspectRatio;
                    } else {
                        drawWidth = drawHeight * aspectRatio;
                    }
                    
                    const xOffset = (ancho - drawWidth) / 2;
                    const yOffset = (alto - drawHeight) / 2;
                    
                    pdf.addImage(imgData, 'JPEG', x + 2 + xOffset, y + 2 + yOffset, drawWidth, drawHeight, undefined, 'FAST');
                } catch {
                    pdf.addImage(imgData, 'JPEG', x + 2, y + 2, ancho - 4, alto - 4, undefined, 'FAST');
                }
            } else {
                this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
            }
        } catch (error) {
            console.error(`Error dibujando imagen #${numero}:`, error);
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
        }
    }
    
    async procesarImagenVertical(pdf, imagen, x, y, ancho, alto, numero, esEvidencia, onProgress) {
        try {
            await this.dibujarImagenEnPDF(pdf, imagen, x, y, ancho, alto, numero, esEvidencia);
            
            const comentario = this.extraerComentario(imagen);
            const yComentario = y + alto + 4;
            
            if (comentario && comentario.trim() !== '') {
                pdf.setFillColor(248, 248, 248);
                pdf.rect(x, yComentario, ancho, 24, 'F');
                
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.mini);
                pdf.setTextColor(coloresBase.secundario);
                pdf.text('Comentario:', x + 4, yComentario + 5);
                
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini - 1);
                pdf.setTextColor(coloresBase.textoClaro);
                
                const anchoTextoComentario = ancho - 8;
                const lineasComentario = this.dividirTextoEnLineas(pdf, comentario, anchoTextoComentario);
                const lineasMaximas = 3;
                
                let yLinea = yComentario + 9;
                for (let i = 0; i < Math.min(lineasComentario.length, lineasMaximas); i++) {
                    pdf.text(lineasComentario[i], x + 4, yLinea);
                    yLinea += 4;
                }
                
                if (lineasComentario.length > lineasMaximas) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(this.fonts.mini - 2);
                    pdf.setTextColor(coloresBase.textoClaro);
                    pdf.text('... (más texto)', x + 4, yLinea);
                }
            }
            
            if (onProgress) {
                onProgress(Math.min(95, 50 + (Math.random() * 30)));
            }
        } catch (error) {
            console.error(`Error procesando imagen #${numero}:`, error);
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia);
        }
    }
    
    dibujarPlaceholder(pdf, x, y, ancho, alto, numero, esEvidencia) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'F');
        
        pdf.setDrawColor(coloresBase.borde);
        pdf.setLineWidth(0.5);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'S');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.textoClaro);
        
        const texto = esEvidencia ? `📎 Evidencia ${numero}` : `📷 Foto ${numero}`;
        pdf.text(texto, x + (ancho / 2), y + (alto / 2) - 3, { align: 'center' });
        
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text('(no disponible)', x + (ancho / 2), y + (alto / 2) + 5, { align: 'center' });
    }
    
    // =============================================
    // MÉTODOS DE GENERACIÓN DE PÁGINAS - CON PAGINACIÓN CORREGIDA
    // =============================================
    
    async calcularTotalPaginasReal(incidencia) {
        let total = 1; // Página principal
        
        let imagenes = [];
        if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) imagenes = incidencia.imagenes;
        else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) imagenes = incidencia.evidencias;
        else if (incidencia.fotos && Array.isArray(incidencia.fotos)) imagenes = incidencia.fotos;
        else if (incidencia.anexos && Array.isArray(incidencia.anexos)) imagenes = incidencia.anexos;
        
        // Calcular páginas para imágenes principales (4 por página)
        const imagenesPorPagina = 4;
        if (imagenes.length > imagenesPorPagina) {
            total += Math.ceil((imagenes.length - imagenesPorPagina) / imagenesPorPagina);
        }
        
        // Calcular páginas para seguimientos
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
            
            if (evidenciasSeg.length > imagenesPorPagina) {
                total += Math.ceil((evidenciasSeg.length - imagenesPorPagina) / imagenesPorPagina);
            } else if (evidenciasSeg.length > 0) {
                total += 1;
            }
        }
        
        console.log(`📄 Cálculo de páginas: Total=${total}, Imágenes=${imagenes.length}, Seguimientos=${seguimientos.length}`);
        return Math.max(total, 1);
    }
    
    async generarPaginaIPH(pdf, incidencia, onProgress) {
        const margen = 15;
        const anchoPagina = this.configuracionCarta.ancho;
        const altoPagina = this.configuracionCarta.alto;
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;
        
        this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', incidencia.id);
        
        // =============================================
        // IDENTIFICACIÓN DE LA UNIDAD (con nombre de usuario)
        // =============================================
        pdf.setFillColor(coloresBase.fondo);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.identificacion, 'F');
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
        yPos += 4;
        
        // NOMBRE DE QUIEN REPORTÓ (usuario)
        const nombreReportante = this.obtenerNombreUsuario(incidencia.reportadoPorId);
        pdf.text(`REPORTADO POR: ${nombreReportante}`, margen + 2, yPos);
        yPos += this.alturasContenedores.identificacion - 12;
        
        // =============================================
        // DATOS GENERALES
        // =============================================
        pdf.setFillColor(coloresBase.fondo);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.datosGenerales, 'F');
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
        
        // =============================================
        // CLASIFICACIÓN DE LA INCIDENCIA
        // =============================================
        pdf.setFillColor(coloresBase.fondo);
        pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.clasificacion, 'F');
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
        
        // =============================================
        // REPORTADO POR (detalles adicionales)
        // =============================================
        const cargoReportadoPor = this.obtenerCargoUsuario(incidencia.reportadoPorId);
        
        if (cargoReportadoPor) {
            if (!this.verificarEspacio(pdf, yPos, this.alturasContenedores.reportadoPor + 5)) {
                this.dibujarPiePagina(pdf);
                pdf.addPage();
                this.paginaActualReal++;
                this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                yPos = this.alturaEncabezado + 5;
            }
            
            pdf.setFillColor(coloresBase.fondo);
            pdf.rect(margen, yPos - 3, anchoContenido, this.alturasContenedores.reportadoPor, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(coloresBase.primario);
            pdf.text('DATOS DEL REPORTANTE', margen + 2, yPos);
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(this.fonts.small);
            pdf.setTextColor(coloresBase.texto);
            pdf.text(`CARGO / PUESTO: ${cargoReportadoPor}`, margen + 2, yPos);
            yPos += this.alturasContenedores.reportadoPor - 7;
        }
        
        // =============================================
        // DESCRIPCIÓN
        // =============================================
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
        pdf.rect(margen, yPos - 3, anchoContenido, alturaContenedorDesc, 'F');
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
        
        yPos = yTextoDesc + 8;
        
        // =============================================
        // ANEXOS - IMÁGENES EN 2 COLUMNAS
        // =============================================
        
        let imagenesPrincipales = [];
        if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) imagenesPrincipales = incidencia.imagenes;
        else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) imagenesPrincipales = incidencia.evidencias;
        else if (incidencia.fotos && Array.isArray(incidencia.fotos)) imagenesPrincipales = incidencia.fotos;
        else if (incidencia.anexos && Array.isArray(incidencia.anexos)) imagenesPrincipales = incidencia.anexos;
        
        if (imagenesPrincipales.length > 0) {
            if (!this.verificarEspacio(pdf, yPos, 20)) {
                this.dibujarPiePagina(pdf);
                pdf.addPage();
                this.paginaActualReal++;
                this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                yPos = this.alturaEncabezado + 5;
            }
            
            pdf.setFillColor(coloresBase.fondo);
            pdf.rect(margen, yPos - 3, anchoContenido, 12, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(coloresBase.primario);
            pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS', margen + 2, yPos);
            yPos += 10;
            
            const imgWidth = IMAGEN_CONFIG.TAMANIOS.IMAGEN_PRINCIPAL.ancho;
            const imgHeight = IMAGEN_CONFIG.TAMANIOS.IMAGEN_PRINCIPAL.alto;
            const alturaTotalPorItem = imgHeight + 32;
            const espaciadoColumnas = IMAGEN_CONFIG.GRID.espaciadoColumnas;
            const espaciadoFilas = IMAGEN_CONFIG.GRID.espaciadoFilas;
            
            const col1X = margen + 2;
            const col2X = col1X + imgWidth + espaciadoColumnas;
            
            let imagenIndex = 0;
            
            while (imagenIndex < imagenesPrincipales.length) {
                if (!this.verificarEspacio(pdf, yPos, alturaTotalPorItem)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;
                    
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.normal);
                    pdf.setTextColor(coloresBase.primario);
                    pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS (CONTINUACIÓN)', margen, yPos);
                    yPos += 10;
                }
                
                for (let col = 0; col < 2 && imagenIndex < imagenesPrincipales.length; col++) {
                    const xPos = col === 0 ? col1X : col2X;
                    const imagen = imagenesPrincipales[imagenIndex];
                    const numeroImagen = imagenIndex + 1;
                    
                    await this.procesarImagenVertical(pdf, imagen, xPos, yPos, imgWidth, imgHeight, numeroImagen, false, onProgress);
                    
                    imagenIndex++;
                }
                
                yPos += alturaTotalPorItem + espaciadoFilas;
            }
            
            yPos += 5;
        }
        
        // =============================================
        // SEGUIMIENTOS
        // =============================================
        
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
                
                const imgWidth = IMAGEN_CONFIG.TAMANIOS.EVIDENCIA_SEGUIMIENTO.ancho;
                const imgHeight = IMAGEN_CONFIG.TAMANIOS.EVIDENCIA_SEGUIMIENTO.alto;
                const alturaTotalPorItem = imgHeight + 32;
                
                let alturaEvidencias = 0;
                if (evidenciasSeg.length > 0) {
                    const filasNecesarias = Math.ceil(evidenciasSeg.length / 2);
                    alturaEvidencias = 15 + (filasNecesarias * (alturaTotalPorItem + 10));
                }
                
                const alturaNecesaria = 28 + alturaTexto + alturaEvidencias;
                
                if (!this.verificarEspacio(pdf, yPos, alturaNecesaria + 10)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;
                }
                
                pdf.setFillColor(coloresBase.fondo);
                pdf.rect(margen, yPos - 3, anchoContenido, alturaNecesaria, 'F');
                
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresBase.primario);
                
                let fechaSeg = seg.fecha || seg.fechaCreacion || seg.createdAt || null;
                const fechaStrSeg = this.formatearFecha(fechaSeg);
                
                pdf.text(`Seguimiento #${s + 1} - ${fechaStrSeg}`, margen + 2, yPos);
                
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
                    yTexto += 8;
                    
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresBase.primario);
                    pdf.text(`Evidencias del seguimiento #${s + 1}:`, margen, yTexto);
                    yTexto += 8;
                    
                    const espaciadoColumnas = IMAGEN_CONFIG.GRID.espaciadoColumnas;
                    const col1X = margen + 2;
                    const col2X = col1X + imgWidth + espaciadoColumnas;
                    
                    let evidenciaIndex = 0;
                    let filaY = yTexto;
                    
                    while (evidenciaIndex < evidenciasSeg.length) {
                        if (!this.verificarEspacio(pdf, filaY, alturaTotalPorItem)) {
                            break;
                        }
                        
                        for (let col = 0; col < 2 && evidenciaIndex < evidenciasSeg.length; col++) {
                            const xPos = col === 0 ? col1X : col2X;
                            const evidencia = evidenciasSeg[evidenciaIndex];
                            const numeroEvidencia = evidenciaIndex + 1;
                            
                            await this.procesarImagenVertical(pdf, evidencia, xPos, filaY, imgWidth, imgHeight, numeroEvidencia, true, onProgress);
                            
                            evidenciaIndex++;
                        }
                        
                        filaY += alturaTotalPorItem + 12;
                    }
                    
                    yPos = filaY + 5;
                } else {
                    yPos = yTexto + 5;
                }
            }
        }
        
        // AVISO DE PRIVACIDAD
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
        pdf.rect(margen, yPos, anchoContenido, this.alturasContenedores.avisoPrivacidad, 'F');
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
        
        this.dibujarPiePagina(pdf);
    }
    
    // =============================================
    // MÉTODO PRINCIPAL DE GENERACIÓN
    // =============================================
    
    async generarIPH(incidencia, opciones = {}) {
        try {
            const { 
                mostrarAlerta = true, 
                tituloAlerta = 'Generando Informe...', 
                onProgress = null,
                returnBlob = false,
                diagnosticar = false
            } = opciones;
            
            if (diagnosticar) {
                console.log('🔍 Ejecutando diagnóstico de imágenes...');
                await this.diagnosticarEstructuraImagen(incidencia);
            }
            
            if (mostrarAlerta) {
                Swal.fire({
                    title: tituloAlerta,
                    html: `
                        <div class="progress-container" style="width:100%; margin-top:10px;">
                            <div class="progress-bar" style="width:0%; height:4px; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:2px; transition:width 0.3s;"></div>
                            <p class="progress-text" style="margin-top:10px; font-size:12px; color:#666;">Preparando informe...</p>
                        </div>
                    `,
                    allowOutsideClick: false,
                    showConfirmButton: false
                });
            }
            
            const actualizarProgreso = (porcentaje, texto) => {
                if (mostrarAlerta && Swal.isVisible()) {
                    const progressBar = Swal.getPopup()?.querySelector('.progress-bar');
                    const progressText = Swal.getPopup()?.querySelector('.progress-text');
                    if (progressBar) progressBar.style.width = `${porcentaje}%`;
                    if (progressText && texto) progressText.textContent = texto;
                }
                if (onProgress) onProgress(porcentaje);
            };
            
            actualizarProgreso(5, 'Cargando librerías...');
            await this.cargarLibrerias();
            
            actualizarProgreso(10, 'Cargando logos...');
            await Promise.all([
                this.cargarLogoCentinela(),
                this.cargarLogoOrganizacion()
            ]);
            
            this.incidenciaActual = incidencia;
            
            actualizarProgreso(15, 'Analizando imágenes...');
            
            const todasLasImagenes = [];
            
            let imagenesPrincipales = [];
            if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) imagenesPrincipales = incidencia.imagenes;
            else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) imagenesPrincipales = incidencia.evidencias;
            else if (incidencia.fotos && Array.isArray(incidencia.fotos)) imagenesPrincipales = incidencia.fotos;
            else if (incidencia.anexos && Array.isArray(incidencia.anexos)) imagenesPrincipales = incidencia.anexos;
            
            todasLasImagenes.push(...imagenesPrincipales);
            
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
                
                todasLasImagenes.push(...evidenciasSeg);
            }
            
            if (todasLasImagenes.length > 0) {
                actualizarProgreso(20, `Precargando ${todasLasImagenes.length} imágenes...`);
                
                await this.preCargarImagenes(todasLasImagenes, (progress) => {
                    const porcentaje = 20 + (progress * 30);
                    actualizarProgreso(porcentaje, `Cargando imágenes... ${Math.round(progress * 100)}%`);
                });
            }
            
            actualizarProgreso(50, 'Generando páginas...');
            
            // CREAR PDF EN FORMATO CARTA
            const pdf = new this.jsPDF({ 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'letter'
            });
            
            // CALCULAR TOTAL DE PÁGINAS CORRECTAMENTE
            this.totalPaginas = await this.calcularTotalPaginasReal(incidencia);
            this.paginaActualReal = 1;
            
            console.log(`📄 Iniciando generación: Total de páginas = ${this.totalPaginas}`);
            
            await this.generarPaginaIPH(pdf, incidencia, actualizarProgreso);
            
            const nombreArchivo = `INFORME_${incidencia.id?.substring(0, 8) || 'incidencia'}_${this.formatearFechaArchivo()}.pdf`;
            
            actualizarProgreso(95, 'Finalizando...');
            
            if (mostrarAlerta) {
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }
            
            actualizarProgreso(100, 'Completado');
            
            if (returnBlob) {
                return pdf.output('blob');
            }
            
            return pdf;
            
        } catch (error) {
            console.error('Error generando informe:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Error', 
                    text: error.message || 'Error al generar el informe',
                    footer: 'Verifica tu conexión a internet y que las imágenes sean accesibles.'
                });
            }
            throw error;
        }
    }
    
    async diagnosticarEstructuraImagen(incidencia) {
        console.log('===== DIAGNÓSTICO DE IMÁGENES =====');
        
        let imagenes = [];
        let propiedadOrigen = null;
        
        if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) {
            imagenes = incidencia.imagenes;
            propiedadOrigen = 'imagenes';
        } else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) {
            imagenes = incidencia.evidencias;
            propiedadOrigen = 'evidencias';
        } else if (incidencia.fotos && Array.isArray(incidencia.fotos)) {
            imagenes = incidencia.fotos;
            propiedadOrigen = 'fotos';
        } else if (incidencia.anexos && Array.isArray(incidencia.anexos)) {
            imagenes = incidencia.anexos;
            propiedadOrigen = 'anexos';
        }
        
        console.log(`📸 Total imágenes encontradas: ${imagenes.length}`);
        if (propiedadOrigen) {
            console.log(`📁 Propiedad donde se encontraron: ${propiedadOrigen}`);
        }
        
        for (let i = 0; i < Math.min(imagenes.length, 5); i++) {
            const img = imagenes[i];
            console.log(`\n🔍 Imagen #${i + 1}:`);
            console.log(`   Tipo: ${typeof img}`);
            
            const urlExtraida = this.extraerUrlImagen(img);
            if (urlExtraida) {
                const preview = urlExtraida.length > 100 ? urlExtraida.substring(0, 100) + '...' : urlExtraida;
                console.log(`   URL extraída: ${preview}`);
                
                const comentario = this.extraerComentario(img);
                if (comentario) {
                    console.log(`   Comentario: ${comentario.substring(0, 50)}...`);
                }
            } else {
                console.log(`   ❌ No se pudo extraer URL de la imagen`);
            }
        }
        
        console.log('\n===== FIN DIAGNÓSTICO =====');
        
        return {
            totalImagenes: imagenes.length,
            propiedadOrigen: propiedadOrigen
        };
    }
    
    async generarIPHMultiple(incidencias, opciones = {}) {
        try {
            if (!incidencias || incidencias.length === 0) return;
            const { mostrarAlerta = true, tituloAlerta = 'Generando Informes...', diagnosticar = false } = opciones;
            if (mostrarAlerta) {
                Swal.fire({ title: tituloAlerta, html: `<div>Procesando ${incidencias.length} incidencia(s)...</div>`, allowOutsideClick: false, showConfirmButton: false });
            }
            for (let i = 0; i < incidencias.length; i++) {
                if (mostrarAlerta) Swal.update({ html: `<div>Procesando incidencia ${i + 1} de ${incidencias.length}...</div>` });
                await this.generarIPH(incidencias[i], { mostrarAlerta: false, diagnosticar });
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