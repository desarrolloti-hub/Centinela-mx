/**
 * IPH GENERATOR - Sistema Centinela
 * VERSIÓN: 4.0 - SISTEMA DE IMÁGENES MEJORADO CON DIAGNÓSTICO
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
    TIMEOUT: 15000,           // 15 segundos timeout
    MAX_RETRIES: 2,           // Máximo reintentos
    RETRY_DELAY: 1000,        // Delay entre reintentos (ms)
    MAX_PARALLEL: 3,          // Máximo imágenes en paralelo
    CACHE_DURATION: 300000,   // 5 minutos cache
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB máximo
    SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
};

class IPHGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        
        // Propiedades específicas de IPH
        this.sucursalesCache = [];
        this.categoriasCache = [];
        this.subcategoriasCache = [];
        this.usuariosCache = [];
        this.incidenciaActual = null;
        
        // Sistema de cache mejorado
        this.imageCache = new Map();           // Cache de imágenes cargadas
        this.pendingImages = new Map();        // Promesas en progreso
        this.imageLoadStats = new Map();       // Estadísticas de carga
        
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
        if (config.subcategoriasCache) this.subcategoriasCache = config.subcategoriasCache;
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
        if (config.authToken) this.authToken = config.authToken;
    }

    // =============================================
    // MÉTODOS DE UTILIDAD EXISTENTES
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
    // SISTEMA DE IMÁGENES MEJORADO
    // =============================================
    
    /**
     * Extrae URL de imagen con soporte específico para Firebase
     */
    extraerUrlImagen(item) {
        if (!item) return null;
        
        // Si es string
        if (typeof item === 'string') {
            const trimmed = item.trim();
            
            // Firebase Storage URLs - pueden necesitar token de acceso
            if (trimmed.includes('firebasestorage.googleapis.com') || 
                trimmed.includes('firebaseio.com') ||
                trimmed.includes('firebase')) {
                // Firebase URLs pueden necesitar el token de autenticación
                if (this.authToken && !trimmed.includes('token=')) {
                    const separator = trimmed.includes('?') ? '&' : '?';
                    return `${trimmed}${separator}token=${this.authToken}`;
                }
                return trimmed;
            }
            
            // URLs normales y data URLs
            if (trimmed.startsWith('http') || trimmed.startsWith('data:image') || trimmed.startsWith('blob:')) {
                return trimmed;
            }
            return null;
        }
        
        // Si es objeto
        if (typeof item === 'object') {
            // Firebase Storage a menudo guarda las URLs en estas propiedades
            const firebaseProps = ['url', 'downloadURL', 'storageUrl', 'firebaseUrl', 'urlDescarga'];
            for (const prop of firebaseProps) {
                if (item[prop] && typeof item[prop] === 'string') {
                    let url = item[prop].trim();
                    // Agregar token si es necesario
                    if ((url.includes('firebase') || url.includes('googleapis')) && this.authToken && !url.includes('token=')) {
                        const separator = url.includes('?') ? '&' : '?';
                        url = `${url}${separator}token=${this.authToken}`;
                    }
                    return url;
                }
            }
            
            // Otras propiedades comunes
            const props = ['src', 'path', 'imageUrl', 'foto', 'imagen', 'evidencia', 'fotoUrl', 'imagenUrl'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') {
                    const valor = item[prop].trim();
                    if (valor.startsWith('http') || valor.startsWith('data:image') || valor.startsWith('blob:')) {
                        return valor;
                    }
                }
            }
            
            // Firebase Storage a veces anida la URL
            if (item.url && typeof item.url === 'object' && item.url.url) {
                return item.url.url;
            }
        }
        
        return null;
    }
    
    /**
     * Extrae comentario de una imagen
     */
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
    
    /**
     * Valida si una URL es válida para cargar imágenes
     */
    esUrlValida(url) {
        if (!url || typeof url !== 'string') return false;
        
        const trimmed = url.trim();
        if (trimmed === '') return false;
        
        // Verificar que sea una URL válida o data URL
        if (trimmed.startsWith('data:image')) return true;
        if (trimmed.startsWith('blob:')) return true;
        
        try {
            const urlObj = new URL(trimmed);
            // Verificar protocolos válidos
            return ['http:', 'https:', 'ftp:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }
    
    /**
     * Normaliza la URL de imagen (limpieza básica)
     */
    normalizarUrl(url) {
        if (!url) return null;
        let normalized = url.trim();
        
        // Eliminar parámetros de tracking comunes
        normalized = normalized.replace(/[?&](utm_|fbclid|gclid|_ga|_gl)[^&]*/g, '');
        normalized = normalized.replace(/[?&]$/, '');
        
        return normalized;
    }
    
    /**
     * Carga una imagen con timeout
     */
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
            
            // Validar tipo de imagen
            if (!IMAGEN_CONFIG.SUPPORTED_FORMATS.includes(blob.type)) {
                throw new Error(`Formato no soportado: ${blob.type}`);
            }
            
            // Validar tamaño
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
    
    /**
     * Carga imagen con múltiples estrategias
     */
    async cargarImagenMultiEstrategia(url, intento = 0) {
        const urlNormalizada = this.normalizarUrl(url);
        if (!this.esUrlValida(urlNormalizada)) {
            throw new Error('URL inválida');
        }
        
        // Verificar cache primero
        const cacheKey = `${urlNormalizada}_${intento}`;
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }
        
        // Verificar si ya hay una carga en progreso
        if (this.pendingImages.has(cacheKey)) {
            return await this.pendingImages.get(cacheKey);
        }
        
        // Estrategias de carga en orden de preferencia
        const estrategias = [
            // Estrategia 1: Fetch directo con timeout
            async () => this.cargarImagenConTimeout(urlNormalizada),
            
            // Estrategia 2: Proxy CORS (corsproxy.io)
            async () => {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlNormalizada)}`;
                return await this.cargarImagenConTimeout(proxyUrl, 10000);
            },
            
            // Estrategia 3: Proxy allorigins
            async () => {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlNormalizada)}`;
                return await this.cargarImagenConTimeout(proxyUrl, 10000);
            },
            
            // Estrategia 4: CORS Anywhere
            async () => {
                const proxyUrl = `https://cors-anywhere.herokuapp.com/${urlNormalizada}`;
                return await this.cargarImagenConTimeout(proxyUrl, 10000);
            },
            
            // Estrategia 5: Elemento Image (último recurso)
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
                        
                        // Redimensionar si es muy grande
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
        
        // Crear promesa de carga
        const cargaPromise = (async () => {
            let lastError = null;
            
            for (let i = 0; i < estrategias.length; i++) {
                try {
                    const resultado = await estrategias[i]();
                    if (resultado) {
                        // Guardar en cache
                        this.imageCache.set(cacheKey, resultado);
                        // Limpiar cache después de un tiempo
                        setTimeout(() => {
                            this.imageCache.delete(cacheKey);
                        }, IMAGEN_CONFIG.CACHE_DURATION);
                        return resultado;
                    }
                } catch (error) {
                    lastError = error;
                    console.warn(`Estrategia ${i + 1} falló para ${urlNormalizada}:`, error.message);
                    // Pequeño delay entre estrategias
                    await new Promise(r => setTimeout(r, 200));
                }
            }
            
            throw lastError || new Error('Todas las estrategias fallaron');
        })();
        
        // Guardar promesa pendiente
        this.pendingImages.set(cacheKey, cargaPromise);
        
        try {
            return await cargaPromise;
        } finally {
            // Limpiar promesa pendiente (pero mantener cache)
            setTimeout(() => {
                this.pendingImages.delete(cacheKey);
            }, 1000);
        }
    }
    
    /**
     * Carga una imagen con reintentos automáticos
     */
    async cargarImagenConReintentos(url, maxRetries = IMAGEN_CONFIG.MAX_RETRIES) {
        let lastError = null;
        
        for (let intento = 0; intento <= maxRetries; intento++) {
            try {
                if (intento > 0) {
                    // Delay exponencial entre reintentos
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
    
    /**
     * Pre-carga múltiples imágenes en paralelo con límite de concurrencia
     */
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
        
        // Procesar en lotes paralelos
        const lotes = [];
        for (let i = 0; i < urlsValidas.length; i += IMAGEN_CONFIG.MAX_PARALLEL) {
            lotes.push(urlsValidas.slice(i, i + IMAGEN_CONFIG.MAX_PARALLEL));
        }
        
        for (const lote of lotes) {
            await Promise.all(lote.map(item => procesarImagen(item)));
        }
        
        return resultados;
    }
    
    /**
     * Obtiene una imagen del cache o la carga
     */
    async obtenerImagen(item) {
        const url = this.extraerUrlImagen(item);
        if (!url) return null;
        
        // Intentar obtener del cache primero
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
    
    /**
     * Dibuja una imagen en el PDF con manejo de errores mejorado
     */
    async dibujarImagenEnPDF(pdf, imagen, x, y, ancho, alto, numero, esEvidencia = false) {
        try {
            const imgData = await this.obtenerImagen(imagen);
            
            if (imgData) {
                // Calcular dimensiones para mantener proporción
                try {
                    // Crear imagen temporal para obtener dimensiones
                    const tempImg = new Image();
                    await new Promise((resolve, reject) => {
                        tempImg.onload = resolve;
                        tempImg.onerror = reject;
                        tempImg.src = imgData;
                    });
                    
                    const aspectRatio = tempImg.width / tempImg.height;
                    let drawWidth = ancho - 8;
                    let drawHeight = alto - 8;
                    
                    if (aspectRatio > 1) {
                        // Imagen más ancha que alta
                        drawHeight = drawWidth / aspectRatio;
                    } else {
                        // Imagen más alta que ancha
                        drawWidth = drawHeight * aspectRatio;
                    }
                    
                    const xOffset = (ancho - drawWidth) / 2;
                    const yOffset = (alto - drawHeight) / 2;
                    
                    pdf.addImage(imgData, 'JPEG', x + 2 + xOffset, y + 2 + yOffset, drawWidth, drawHeight, undefined, 'FAST');
                } catch {
                    // Fallback: dibujar sin mantener proporción
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
    
    /**
     * Procesa una imagen y la dibuja en el PDF
     */
    async procesarImagen(pdf, imagen, x, y, ancho, alto, xComentario, anchoComentario, numero, esEvidencia, onProgress) {
        try {
            await this.dibujarImagenEnPDF(pdf, imagen, x, y, ancho, alto, numero, esEvidencia);
            
            // Dibujar comentario si existe
            const comentario = this.extraerComentario(imagen);
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
                const lineasMaximas = Math.floor((alto - 15) / 4);
                
                for (let i = 0; i < Math.min(lineasComentario.length, lineasMaximas); i++) {
                    pdf.text(lineasComentario[i], xComentario + 2, y + 9 + (i * 4));
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
    
    /**
     * Dibuja un placeholder cuando la imagen no está disponible
     */
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
    // MÉTODO DE DIAGNÓSTICO
    // =============================================
    
    /**
     * Diagnostica la estructura de imágenes de una incidencia
     */
    async diagnosticarEstructuraImagen(incidencia) {
        console.log('===== DIAGNÓSTICO DE IMÁGENES =====');
        
        // 1. Verificar dónde están las imágenes
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
        
        // 2. Analizar cada imagen
        for (let i = 0; i < Math.min(imagenes.length, 5); i++) {
            const img = imagenes[i];
            console.log(`\n🔍 Imagen #${i + 1}:`);
            console.log(`   Tipo: ${typeof img}`);
            console.log(`   Es string? ${typeof img === 'string'}`);
            console.log(`   Es objeto? ${typeof img === 'object'}`);
            
            if (typeof img === 'string') {
                const preview = img.length > 100 ? img.substring(0, 100) + '...' : img;
                console.log(`   Valor: ${preview}`);
                console.log(`   Es URL HTTP? ${img.startsWith('http')}`);
                console.log(`   Es dataURL? ${img.startsWith('data:image')}`);
                console.log(`   Es blob? ${img.startsWith('blob:')}`);
                console.log(`   Es Firebase? ${img.includes('firebase') || img.includes('googleapis')}`);
            } else if (typeof img === 'object') {
                console.log(`   Propiedades del objeto:`, Object.keys(img));
                
                // Probar cada posible propiedad de URL
                const propsUrl = ['url', 'URL', 'src', 'path', 'downloadURL', 'imageUrl', 'foto', 'imagen', 'evidencia', 'fotoUrl', 'imagenUrl', 'firebaseUrl', 'storageUrl', 'urlDescarga'];
                for (const prop of propsUrl) {
                    if (img[prop]) {
                        const valor = img[prop];
                        const preview = typeof valor === 'string' ? 
                            (valor.length > 100 ? valor.substring(0, 100) + '...' : valor) : 
                            JSON.stringify(valor);
                        console.log(`   ${prop}: ${preview}`);
                    }
                }
            }
            
            // 3. Intentar extraer URL
            const urlExtraida = this.extraerUrlImagen(img);
            if (urlExtraida) {
                const preview = urlExtraida.length > 100 ? urlExtraida.substring(0, 100) + '...' : urlExtraida;
                console.log(`   URL extraída: ${preview}`);
                
                // Intentar verificar si la URL es accesible
                try {
                    const response = await fetch(urlExtraida, { 
                        method: 'HEAD',
                        mode: 'cors'
                    });
                    console.log(`   HEAD request status: ${response.status}`);
                    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
                } catch (error) {
                    console.log(`   ❌ Error verificando URL: ${error.message}`);
                    if (error.message.includes('CORS')) {
                        console.log(`   🔒 Posible problema de CORS`);
                    }
                }
            } else {
                console.log(`   ❌ No se pudo extraer URL de la imagen`);
            }
        }
        
        console.log('\n===== FIN DIAGNÓSTICO =====');
        
        return {
            totalImagenes: imagenes.length,
            propiedadOrigen: propiedadOrigen,
            estructura: imagenes.map(img => ({
                tipo: typeof img,
                tieneUrl: !!this.extraerUrlImagen(img)
            }))
        };
    }
    
    // =============================================
    // MÉTODOS DE GENERACIÓN DE PÁGINAS
    // =============================================
    
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
                this.dibujarPiePagina(pdf);
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
                
                await this.procesarImagen(pdf, imagenesPrincipales[i], xPos, yPos, imgWidth, imgHeight, xComentario, anchoComentario, i + 1, false, onProgress);
                
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
                
                await this.procesarImagen(pdf, imagenesRestantes[i], xPos, yPos, imgWidth, imgHeight, xComentario, anchoComentario, indiceImagen, false, onProgress);
                
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
                        
                        await this.procesarImagen(pdf, evidenciasSeg[e], xPos, yTexto, evidenciaWidth, evidenciaHeight, xComentario, anchoComentario, e + 1, true, onProgress);
                        
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
                diagnosticar = false  // Nueva opción para diagnóstico
            } = opciones;
            
            // Ejecutar diagnóstico si se solicita
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
                    showConfirmButton: false,
                    didOpen: () => {
                        const progressBar = Swal.getPopup().querySelector('.progress-bar');
                        const progressText = Swal.getPopup().querySelector('.progress-text');
                        if (onProgress) {
                            onProgress(0);
                        }
                    }
                });
            }
            
            // Actualizar progreso
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
            
            // Recolectar todas las URLs de imágenes
            actualizarProgreso(15, 'Analizando imágenes...');
            
            const todasLasImagenes = [];
            
            // Imágenes principales
            let imagenesPrincipales = [];
            if (incidencia.imagenes && Array.isArray(incidencia.imagenes)) imagenesPrincipales = incidencia.imagenes;
            else if (incidencia.evidencias && Array.isArray(incidencia.evidencias)) imagenesPrincipales = incidencia.evidencias;
            else if (incidencia.fotos && Array.isArray(incidencia.fotos)) imagenesPrincipales = incidencia.fotos;
            else if (incidencia.anexos && Array.isArray(incidencia.anexos)) imagenesPrincipales = incidencia.anexos;
            
            todasLasImagenes.push(...imagenesPrincipales);
            
            // Imágenes de seguimientos
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
            
            // Pre-cargar imágenes en paralelo
            if (todasLasImagenes.length > 0) {
                actualizarProgreso(20, `Precargando ${todasLasImagenes.length} imágenes...`);
                
                await this.preCargarImagenes(todasLasImagenes, (progress) => {
                    const porcentaje = 20 + (progress * 30);
                    actualizarProgreso(porcentaje, `Cargando imágenes... ${Math.round(progress * 100)}%`);
                });
            }
            
            actualizarProgreso(50, 'Generando páginas...');
            
            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            // Calcular total REAL de páginas
            this.totalPaginas = await this.calcularTotalPaginasReal(incidencia);
            this.paginaActualReal = 1;
            
            // Generar primera página
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