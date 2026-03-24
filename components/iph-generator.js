/**
 * IPH GENERATOR - Sistema Centinela
 * VERSIÓN: 6.1 - CORREGIDO MANEJO DE IMÁGENES
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

export const coloresIPH = {
    ...coloresBase,
    riesgoCritico: '#ef4444',
    riesgoAlto: '#f97316',
    riesgoMedio: '#eab308',
    riesgoBajo: '#10b981'
};

const CONFIG = {
    IMAGENES_POR_PAGINA: 4,
    ANCHO_IMAGEN: 85,
    ALTO_IMAGEN: 70,
    ESPACIADO_COLUMNAS: 15,
    ESPACIADO_FILAS: 15,
    MARGEN: 15
};

class IPHGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        
        this.sucursalesCache = [];
        this.categoriasCache = [];
        this.usuariosCache = [];
        this.incidenciaActual = null;
        
        this.alturasContenedores = {
            identificacion: 38,
            datosGenerales: 20,
            clasificacion: 56,
            reportadoPor: 20,
            descripcion: 70,
            anexos: 120,
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
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
        if (config.authToken) this.authToken = config.authToken;
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
    
    obtenerNombreSubcategoria(subcategoriaId, categoriaId) {
        if (!subcategoriaId) return 'No especificada';
        
        const categoria = this.categoriasCache.find(c => c.id === categoriaId);
        if (categoria && categoria.subcategorias) {
            let subcategorias = [];
            if (categoria.subcategorias instanceof Map) {
                subcategorias = Array.from(categoria.subcategorias.values());
            } else if (typeof categoria.subcategorias === 'object') {
                subcategorias = Object.values(categoria.subcategorias);
            }
            
            const sub = subcategorias.find(s => s.id === subcategoriaId || s._id === subcategoriaId);
            if (sub) return sub.nombre || sub.descripcion || 'Subcategoría';
        }
        return 'No disponible';
    }
    
    obtenerNombreUsuario(usuarioId) {
        if (!usuarioId) return 'No especificado';
        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId || u.uid === usuarioId || u._id === usuarioId
        );
        if (usuario) {
            return usuario.nombreCompleto || usuario.nombre || usuario.displayName || 'Usuario';
        }
        return 'No especificado';
    }
    
    obtenerCargoUsuario(usuarioId) {
        if (!usuarioId) return '';
        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId || u.uid === usuarioId || u._id === usuarioId
        );
        return usuario ? (usuario.cargo || usuario.rol || '') : '';
    }

    // =============================================
    // MANEJO DE IMÁGENES - VERSIÓN MEJORADA
    // =============================================
    
    async extraerImagenDeIncidencia(imagenObj, index) {
        try {
            console.log(`🔍 Procesando imagen ${index + 1}:`);
            
            // Caso 1: Tiene archivo File directamente
            if (imagenObj?.file instanceof File) {
                console.log(`  ✅ Imagen ${index + 1}: usando file directo`);
                return await this.convertirArchivoABase64(imagenObj.file);
            }
            
            // Caso 2: Tiene propiedad archivo (File)
            if (imagenObj?.archivo instanceof File) {
                console.log(`  ✅ Imagen ${index + 1}: usando archivo`);
                return await this.convertirArchivoABase64(imagenObj.archivo);
            }
            
            // Caso 3: Tiene propiedad data (base64)
            if (imagenObj?.data && typeof imagenObj.data === 'string' && imagenObj.data.startsWith('data:image')) {
                console.log(`  ✅ Imagen ${index + 1}: usando data base64`);
                return imagenObj.data;
            }
            
            // Caso 4: Tiene preview (URL de objeto)
            if (imagenObj?.preview && typeof imagenObj.preview === 'string') {
                console.log(`  ✅ Imagen ${index + 1}: usando preview URL`);
                return await this.fetchearImagenDesdeURL(imagenObj.preview);
            }
            
            // Caso 5: Tiene url directa
            if (imagenObj?.url && typeof imagenObj.url === 'string') {
                console.log(`  ✅ Imagen ${index + 1}: usando url`);
                return await this.fetchearImagenDesdeURL(imagenObj.url);
            }
            
            // Caso 6: Es un File directamente
            if (imagenObj instanceof File) {
                console.log(`  ✅ Imagen ${index + 1}: es File`);
                return await this.convertirArchivoABase64(imagenObj);
            }
            
            // Caso 7: Tiene downloadURL
            if (imagenObj?.downloadURL && typeof imagenObj.downloadURL === 'string') {
                console.log(`  ✅ Imagen ${index + 1}: usando downloadURL`);
                return await this.fetchearImagenDesdeURL(imagenObj.downloadURL);
            }
            
            console.warn(`⚠️ No se pudo extraer imagen ${index + 1}`);
            return null;
            
        } catch (error) {
            console.error(`❌ Error extrayendo imagen ${index + 1}:`, error);
            return null;
        }
    }
    
    async convertirArchivoABase64(file) {
        if (!file) return null;
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async fetchearImagenDesdeURL(url) {
        if (!url) return null;
        
        try {
            // Si es una URL de objeto local (blob:)
            if (url.startsWith('blob:')) {
                const response = await fetch(url);
                const blob = await response.blob();
                return await this.convertirArchivoABase64(blob);
            }
            
            // Para URLs regulares
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                return await this.convertirArchivoABase64(blob);
            }
            
            return null;
            
        } catch (error) {
            console.error('Error fetcheando imagen:', error);
            return null;
        }
    }

    async dibujarImagen(pdf, imagenObj, x, y, ancho, alto, numero) {
        try {
            let imgData = null;
            
            // Intentar obtener la imagen
            imgData = await this.extraerImagenDeIncidencia(imagenObj, numero - 1);
            
            if (imgData) {
                // Dibujar fondo blanco
                pdf.setFillColor(255, 255, 255);
                pdf.rect(x, y, ancho, alto, 'F');
                
                // Dibujar borde
                pdf.setDrawColor(coloresBase.borde);
                pdf.setLineWidth(0.5);
                pdf.rect(x, y, ancho, alto, 'S');
                
                try {
                    // Calcular dimensiones manteniendo aspecto
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
                        drawHeight = drawWidth / aspectRatio;
                    } else {
                        drawWidth = drawHeight * aspectRatio;
                    }
                    
                    const xOffset = (ancho - drawWidth) / 2;
                    const yOffset = (alto - drawHeight) / 2;
                    
                    pdf.addImage(imgData, 'JPEG', x + xOffset, y + yOffset, drawWidth, drawHeight, undefined, 'FAST');
                    console.log(`✅ Imagen ${numero} dibujada correctamente`);
                    
                } catch (imgError) {
                    console.warn(`Error renderizando imagen ${numero}, método alternativo:`, imgError);
                    pdf.addImage(imgData, 'JPEG', x + 4, y + 4, ancho - 8, alto - 8, undefined, 'FAST');
                }
            } else {
                console.warn(`⚠️ Imagen ${numero} no disponible, dibujando placeholder`);
                this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero);
            }
            
            // Dibujar comentario si existe
            const comentario = this.obtenerComentarioImagen(imagenObj);
            if (comentario && comentario.trim() !== '') {
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.mini - 1);
                pdf.setTextColor(coloresBase.textoClaro);
                
                const lineas = this.dividirTextoEnLineas(pdf, comentario, ancho - 8);
                let yComentario = y + alto + 3;
                
                for (let i = 0; i < Math.min(lineas.length, 2); i++) {
                    pdf.text(lineas[i], x + 4, yComentario);
                    yComentario += 3.5;
                }
            }
            
        } catch (error) {
            console.error(`Error dibujando imagen ${numero}:`, error);
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero);
        }
    }
    
    obtenerComentarioImagen(imagenObj) {
        if (!imagenObj) return '';
        if (typeof imagenObj === 'object') {
            return imagenObj.comentario || imagenObj.descripcion || '';
        }
        return '';
    }

    dibujarPlaceholder(pdf, x, y, ancho, alto, numero) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'F');
        
        pdf.setDrawColor(coloresBase.borde);
        pdf.setLineWidth(0.5);
        pdf.rect(x + 2, y + 2, ancho - 4, alto - 4, 'S');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text(`📷 Foto ${numero}`, x + (ancho / 2), y + (alto / 2) - 3, { align: 'center' });
        
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text('(no disponible)', x + (ancho / 2), y + (alto / 2) + 5, { align: 'center' });
    }

    // =============================================
    // MÉTODO PRINCIPAL
    // =============================================
    
    async generarIPH(incidencia, opciones = {}) {
        try {
            const { 
                mostrarAlerta = true, 
                tituloAlerta = 'Generando Informe...', 
                onProgress = null,
                returnBlob = false,
                diagnosticar = true  // Activamos diagnóstico para ver qué pasa
            } = opciones;
            
            if (diagnosticar) {
                console.log('🔍 DIAGNÓSTICO DE INCIDENCIA:');
                console.log('  ID:', incidencia.id);
                console.log('  Reportado Por:', incidencia.reportadoPorNombre);
                console.log('  Imágenes en incidencia:', incidencia.imagenes?.length || 0);
                
                if (incidencia.imagenes && incidencia.imagenes.length > 0) {
                    incidencia.imagenes.forEach((img, i) => {
                        console.log(`  Imagen ${i + 1}:`);
                        console.log(`    - Tipo: ${typeof img}`);
                        console.log(`    - Tiene file: ${!!(img.file instanceof File)}`);
                        console.log(`    - Tiene archivo: ${!!(img.archivo instanceof File)}`);
                        console.log(`    - Tiene preview: ${!!img.preview}`);
                        console.log(`    - Tiene url: ${!!img.url}`);
                        console.log(`    - Tiene data: ${!!(img.data && img.data.startsWith('data:'))}`);
                        console.log(`    - id: ${img.id}`);
                        console.log(`    - nombre: ${img.nombre}`);
                        console.log(`    - comentario: ${img.comentario?.substring(0, 30) || 'ninguno'}`);
                    });
                } else {
                    console.log('  ⚠️ No hay imágenes en la incidencia');
                }
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
            
            actualizarProgreso(15, 'Procesando imágenes...');
            
            const imagenes = incidencia.imagenes || [];
            
            if (imagenes.length > 0) {
                actualizarProgreso(20, `Procesando ${imagenes.length} imágenes...`);
                
                for (let i = 0; i < imagenes.length; i++) {
                    const img = imagenes[i];
                    await this.extraerImagenDeIncidencia(img, i);
                    const progress = 20 + (i / imagenes.length) * 30;
                    actualizarProgreso(progress, `Imagen ${i + 1} de ${imagenes.length}`);
                }
            } else {
                console.log('⚠️ No hay imágenes para procesar');
            }
            
            actualizarProgreso(50, 'Generando páginas...');
            
            const pdf = new this.jsPDF({ 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'letter'
            });
            
            // Calcular páginas correctamente
            const imagenesPorPagina = 4;
            const paginasImagenes = imagenes.length > 0 ? Math.ceil(imagenes.length / imagenesPorPagina) : 0;
            this.totalPaginas = 1 + paginasImagenes;
            this.paginaActualReal = 1;
            
            console.log(`📄 Iniciando generación: Total de páginas = ${this.totalPaginas}, Imágenes = ${imagenes.length}`);
            
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
                    text: error.message || 'Error al generar el informe'
                });
            }
            throw error;
        }
    }
    
    async generarPaginaIPH(pdf, incidencia, onProgress) {
        const margen = CONFIG.MARGEN;
        const anchoPagina = this.configuracionCarta.ancho;
        const altoPagina = this.configuracionCarta.alto;
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;
        
        this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', incidencia.id || 'Nueva Incidencia');
        
        // IDENTIFICACIÓN DE LA UNIDAD
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
        
        const organizacion = this.organizacionActual?.nombre || incidencia.organizacion || 'No especificada';
        pdf.text(`ORGANIZACIÓN: ${organizacion}`, margen + 2, yPos);
        yPos += 4;
        
        const sucursalNombre = incidencia.sucursalNombre || this.obtenerNombreSucursal(incidencia.sucursalId);
        pdf.text(`SUCURSAL: ${sucursalNombre}`, margen + 2, yPos);
        yPos += 4;
        
        const nombreReportante = incidencia.reportadoPorNombre || this.obtenerNombreUsuario(incidencia.reportadoPorId);
        pdf.text(`REPORTADO POR: ${nombreReportante}`, margen + 2, yPos);
        yPos += 4;
        
        yPos += this.alturasContenedores.identificacion - 16;
        
        // DATOS GENERALES
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
        yPos += this.alturasContenedores.datosGenerales - 8;
        
        // CLASIFICACIÓN DE LA INCIDENCIA
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
        
        const categoriaNombre = incidencia.categoriaNombre || this.obtenerNombreCategoria(incidencia.categoriaId);
        pdf.text(`CATEGORÍA: ${categoriaNombre}`, margen + 2, yPos);
        yPos += 4;
        
        const subcategoriaNombre = incidencia.subcategoriaNombre || this.obtenerNombreSubcategoria(incidencia.subcategoriaId, incidencia.categoriaId);
        pdf.text(`SUBCATEGORÍA: ${subcategoriaNombre}`, margen + 2, yPos);
        yPos += 4;
        
        const nivelRiesgo = incidencia.nivelRiesgo || 'No especificado';
        const riesgoTexto = typeof nivelRiesgo === 'string' ? nivelRiesgo.toUpperCase() : String(nivelRiesgo);
        pdf.text(`NIVEL DE RIESGO: ${riesgoTexto}`, margen + 2, yPos);
        yPos += 4;
        
        const estado = incidencia.estado || 'No especificado';
        const estadoTexto = typeof estado === 'string' ? estado.toUpperCase() : String(estado);
        pdf.text(`ESTADO (Actual): ${estadoTexto}`, margen + 2, yPos);
        yPos += 4;
        
        const fechaInicio = incidencia.fechaInicio ? new Date(incidencia.fechaInicio) : new Date();
        const fechaInicioStr = this.formatearFechaVisualizacion(fechaInicio);
        const horaInicioStr = this.formatearHoraVisualizacion(fechaInicio);
        
        pdf.text(`FECHA INCIDENCIA: ${fechaInicioStr}`, margen + 2, yPos);
        pdf.text(`HORA: ${horaInicioStr}`, margen + 100, yPos);
        yPos += this.alturasContenedores.clasificacion - 16;
        
        // DESCRIPCIÓN
        const detalles = incidencia.detalles || 'No hay descripción disponible.';
        const lineasDesc = this.dividirTextoEnLineas(pdf, detalles, anchoContenido - 10);
        const espacioNecesarioDesc = 15 + (lineasDesc.length * 4);
        const alturaDesc = Math.max(this.alturasContenedores.descripcion, Math.min(espacioNecesarioDesc + 10, 120));
        
        if (!this.verificarEspacio(pdf, yPos, alturaDesc)) {
            this.dibujarPiePagina(pdf);
            pdf.addPage();
            this.paginaActualReal++;
            this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
            yPos = this.alturaEncabezado + 5;
        }
        
        pdf.setFillColor(coloresBase.fondo);
        pdf.rect(margen, yPos - 3, anchoContenido, alturaDesc, 'F');
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
        
        // ANEXOS - IMÁGENES
        const imagenesPrincipales = incidencia.imagenes || [];
        
        if (imagenesPrincipales.length > 0) {
            const imgWidth = CONFIG.ANCHO_IMAGEN;
            const imgHeight = CONFIG.ALTO_IMAGEN;
            const alturaTotalPorItem = imgHeight + 28;
            
            const col1X = margen + 2;
            const col2X = col1X + imgWidth + CONFIG.ESPACIADO_COLUMNAS;
            
            let imagenIndex = 0;
            let esPrimeraPaginaImagenes = true;
            
            while (imagenIndex < imagenesPrincipales.length) {
                if (!this.verificarEspacio(pdf, yPos, alturaTotalPorItem)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE INCIDENCIA', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;
                    esPrimeraPaginaImagenes = true;
                }
                
                if (esPrimeraPaginaImagenes) {
                    pdf.setFillColor(coloresBase.fondo);
                    pdf.rect(margen, yPos - 3, anchoContenido, 12, 'F');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.normal);
                    pdf.setTextColor(coloresBase.primario);
                    
                    if (imagenIndex === 0) {
                        pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS', margen + 2, yPos);
                    } else {
                        pdf.text('ANEXOS - EVIDENCIAS FOTOGRÁFICAS (CONTINUACIÓN)', margen, yPos);
                    }
                    yPos += 10;
                    esPrimeraPaginaImagenes = false;
                }
                
                for (let col = 0; col < 2 && imagenIndex < imagenesPrincipales.length; col++) {
                    const xPos = col === 0 ? col1X : col2X;
                    const imagen = imagenesPrincipales[imagenIndex];
                    const numeroImagen = imagenIndex + 1;
                    
                    await this.dibujarImagen(pdf, imagen, xPos, yPos, imgWidth, imgHeight, numeroImagen);
                    
                    if (onProgress) {
                        const progress = 50 + (imagenIndex / imagenesPrincipales.length) * 30;
                        onProgress(Math.min(progress, 85));
                    }
                    
                    imagenIndex++;
                }
                
                yPos += alturaTotalPorItem + CONFIG.ESPACIADO_FILAS;
            }
            
            yPos += 5;
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
        
        for (let i = 0; i < Math.min(lineasAviso.length, 3); i++) {
            pdf.text(lineasAviso[i], margen + 2, yPos + 8 + (i * 3));
        }
        
        this.dibujarPiePagina(pdf);
    }
}

export const generadorIPH = new IPHGenerator();
export default generadorIPH;