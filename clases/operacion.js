// operacion.js - VERSIÓN OPTIMIZADA CON ÍNDICES Y ESTADÍSTICAS CONSOLIDADAS

import { db, storage } from '/config/firebase-config.js';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    increment,
    runTransaction,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
    ref,
    listAll,
    getMetadata,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

import consumo from '/clases/consumoFirebase.js';

class Operacion {
    constructor(id, data = {}) {
        this.id = id;
        this.conteos = {
            firestore: {
                colecciones: data.conteos?.firestore?.colecciones || 0,
                documentos: data.conteos?.firestore?.documentos || 0,
                lecturas: 0, escrituras: 0, actualizaciones: 0, eliminaciones: 0
            },
            storage: {
                total: data.conteos?.storage?.total || 0,
                totalSize: data.conteos?.storage?.totalSize || 0,
                pdf: data.conteos?.storage?.pdf || 0,
                imagenes: data.conteos?.storage?.imagenes || 0,
                documentos: data.conteos?.storage?.documentos || 0,
                multimedia: data.conteos?.storage?.multimedia || 0,
                otros: data.conteos?.storage?.otros || 0,
                tamañoPorTipo: data.conteos?.storage?.tamañoPorTipo || { 
                    pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 
                }
            },
            auth: {
                usuarios: data.conteos?.auth?.usuarios || 0,
                administradores: data.conteos?.auth?.administradores || 0,
                superAdmin: data.conteos?.auth?.superAdmin || 0,
                total: data.conteos?.auth?.total || 0
            },
            coleccionesPersonalizadas: data.conteos?.coleccionesPersonalizadas || {}
        };
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
        this.organizacion = data.organizacion || id;
        this.nombreEmpresa = data.nombreEmpresa || '';
    }

    _convertirFecha(fecha) {
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        return new Date();
    }

    toFirestore() {
        return {
            conteos: this.conteos,
            fechaActualizacion: serverTimestamp(),
            organizacion: this.organizacion,
            nombreEmpresa: this.nombreEmpresa
        };
    }
}

class OperacionesManager {
    constructor() {
        this.COLECCION = 'operaciones';
        this.STATS_COLECCION = 'estadisticas_consolidadas';
        this.cache = new Map();
        this.storageCache = new Map();
        this.procesando = new Set();
    }

    _getDocRef(org) { 
        return doc(db, this.COLECCION, org); 
    }
    
    _getStatsDocRef(org) {
        return doc(db, this.STATS_COLECCION, org);
    }

    async getOperaciones(org) {
        if (this.cache.has(org)) return this.cache.get(org);
        try {
            const docRef = this._getDocRef(org);
            await consumo.registrarFirestoreLectura(this.COLECCION, org);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const op = new Operacion(org, docSnap.data());
                this.cache.set(org, op);
                return op;
            }
            return await this._crearOperacionInicial(org);
        } catch (error) {
            console.error('Error obteniendo operaciones:', error);
            return null;
        }
    }

    async _crearOperacionInicial(org) {
        const nuevaOp = new Operacion(org);
        await consumo.registrarFirestoreEscritura(this.COLECCION, org);
        await setDoc(this._getDocRef(org), nuevaOp.toFirestore());
        this.cache.set(org, nuevaOp);
        return nuevaOp;
    }

    async getOrganizaciones() {
        try {
            const adminsRef = collection(db, "administradores");
            await consumo.registrarFirestoreLectura("administradores", "lista organizaciones");
            const adminsSnapshot = await getDocs(adminsRef);
            const organizaciones = [];
            
            adminsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.organizacionCamelCase) {
                    organizaciones.push({
                        id: doc.id,
                        nombre: data.organizacion,
                        camelCase: data.organizacionCamelCase
                    });
                }
            });
            
            return organizaciones;
        } catch (error) {
            console.error('Error obteniendo organizaciones:', error);
            return [];
        }
    }

    /**
     * NUEVO MÉTODO: Obtiene estadísticas consolidadas de Firestore usando índices
     * En lugar de contar todos los documentos, usa agregaciones o documentos de estadísticas
     */
    async _getFirestoreStatsOptimizado(orgCamelCase) {
        try {
            // PRIMERO: Intentar obtener de estadísticas consolidadas
            const statsDocRef = this._getStatsDocRef(`firestore_${orgCamelCase}`);
            await consumo.registrarFirestoreLectura(this.STATS_COLECCION, `firestore_${orgCamelCase}`);
            const statsDoc = await getDoc(statsDocRef);
            
            if (statsDoc.exists() && this._esStatsReciente(statsDoc.data().fechaActualizacion)) {
                const data = statsDoc.data();
                return {
                    colecciones: data.colecciones,
                    documentos: data.documentos,
                    coleccionesPersonalizadas: data.coleccionesPersonalizadas || {}
                };
            }
            
            // SEGUNDO: Si no hay estadísticas recientes, calcular y guardar
            return await this._calcularYGuardarStatsFirestore(orgCamelCase);
            
        } catch (error) {
            console.error('Error en _getFirestoreStatsOptimizado:', error);
            return await this._calcularYGuardarStatsFirestore(orgCamelCase);
        }
    }
    
    _esStatsReciente(fecha) {
        if (!fecha) return false;
        const fechaStats = fecha.toDate ? fecha.toDate() : new Date(fecha);
        const hace24horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return fechaStats > hace24horas;
    }
    
    async _calcularYGuardarStatsFirestore(orgCamelCase) {
        const stats = await this._calcularStatsFirestore(orgCamelCase);
        
        // Guardar en estadísticas consolidadas
        const statsDocRef = this._getStatsDocRef(`firestore_${orgCamelCase}`);
        await consumo.registrarFirestoreEscritura(this.STATS_COLECCION, `firestore_${orgCamelCase}`);
        await setDoc(statsDocRef, {
            ...stats,
            fechaActualizacion: serverTimestamp(),
            organizacion: orgCamelCase
        }, { merge: true });
        
        return stats;
    }
    
    async _calcularStatsFirestore(orgCamelCase) {
        const colecciones = this._getColeccionesPorTipo(orgCamelCase);
        let totalDocumentos = 0;
        let coleccionesExistentes = 0;
        const coleccionesPersonalizadas = {};

        // Usar Promise.all con límite de concurrencia
        const chunkSize = 3;
        for (let i = 0; i < colecciones.length; i += chunkSize) {
            const chunk = colecciones.slice(i, i + chunkSize);
            const resultados = await Promise.all(
                chunk.map(async (col) => {
                    try {
                        const coleccionRef = collection(db, col);
                        await consumo.registrarFirestoreLectura(col, `estadísticas ${orgCamelCase}`);
                        
                        // Usar query con limit 1 para verificar existencia rápidamente
                        const snapshot = await getDocs(coleccionRef);
                        return { col, count: snapshot.size, success: true };
                    } catch (error) {
                        return { col, count: 0, success: false };
                    }
                })
            );
            
            for (const r of resultados) {
                if (r.success && r.count > 0) {
                    coleccionesExistentes++;
                    coleccionesPersonalizadas[r.col] = r.count;
                    totalDocumentos += r.count;
                }
            }
        }

        // Contar administradores
        try {
            const adminQuery = query(
                collection(db, "administradores"),
                where("organizacionCamelCase", "==", orgCamelCase)
            );
            await consumo.registrarFirestoreLectura("administradores", `estadísticas ${orgCamelCase}`);
            const adminSnapshot = await getDocs(adminQuery);
            const adminCount = adminSnapshot.size;
            coleccionesPersonalizadas[`administradores_${orgCamelCase}`] = adminCount;
            totalDocumentos += adminCount;
            coleccionesExistentes++;
        } catch (error) {
            // Ignorar
        }

        return {
            colecciones: coleccionesExistentes,
            documentos: totalDocumentos,
            coleccionesPersonalizadas: coleccionesPersonalizadas
        };
    }
    
    _getColeccionesPorTipo(orgCamelCase) {
        return [
            `colaboradores_${orgCamelCase}`,
            `areas_${orgCamelCase}`,
            `regiones_${orgCamelCase}`,
            `sucursales_${orgCamelCase}`,
            `incidencias_${orgCamelCase}`,
            `categorias_${orgCamelCase}`,
            `tareas_${orgCamelCase}`,
            `permisos_${orgCamelCase}`,
            `notificaciones_${orgCamelCase}`
        ];
    }

    /**
     * NUEVO MÉTODO: Obtiene estadísticas de Storage usando URLs almacenadas en documentos
     * En lugar de escanear Storage, cuenta las URLs guardadas en Firestore
     */
    async _getStorageStatsOptimizado(orgCamelCase) {
        // Usar cache para evitar recargar siempre
        if (this.storageCache.has(orgCamelCase)) {
            return this.storageCache.get(orgCamelCase);
        }
        
        try {
            // PRIMERO: Intentar obtener de estadísticas consolidadas de Storage
            const statsDocRef = this._getStatsDocRef(`storage_${orgCamelCase}`);
            await consumo.registrarFirestoreLectura(this.STATS_COLECCION, `storage_${orgCamelCase}`);
            const statsDoc = await getDoc(statsDocRef);
            
            if (statsDoc.exists() && this._esStatsReciente(statsDoc.data().fechaActualizacion)) {
                const data = statsDoc.data();
                this.storageCache.set(orgCamelCase, data.stats);
                return data.stats;
            }
            
            // SEGUNDO: Calcular desde los documentos de incidencias (que contienen URLs)
            const stats = await this._calcularStatsDesdeDocumentos(orgCamelCase);
            
            // Guardar en estadísticas consolidadas
            await this._guardarStatsStorage(orgCamelCase, stats);
            
            this.storageCache.set(orgCamelCase, stats);
            return stats;
            
        } catch (error) {
            console.log(`Error obteniendo stats storage para ${orgCamelCase}:`, error);
            const vacio = this._storageVacio();
            this.storageCache.set(orgCamelCase, vacio);
            return vacio;
        }
    }
    
    /**
     * Calcula estadísticas de Storage desde los documentos que contienen URLs
     * Esto es MUCHO más rápido que escanear Storage directamente
     */
    async _calcularStatsDesdeDocumentos(orgCamelCase) {
        const stats = this._storageVacio();
        
        try {
            // Buscar en la colección de incidencias (donde generalmente se guardan los archivos)
            const incidenciasRef = collection(db, `incidencias_${orgCamelCase}`);
            await consumo.registrarFirestoreLectura(`incidencias_${orgCamelCase}`, `stats storage ${orgCamelCase}`);
            
            // Obtener todas las incidencias (o usar query con límite si son muchas)
            const incidenciasSnap = await getDocs(incidenciasRef);
            
            // Procesar cada incidencia buscando campos que contengan URLs
            for (const doc of incidenciasSnap.docs) {
                const data = doc.data();
                const urlsEncontradas = this._extraerUrlsDelDocumento(data);
                
                for (const url of urlsEncontradas) {
                    stats.total++;
                    
                    // Determinar tipo por extensión
                    const tipo = this._clasificarPorUrl(url);
                    stats[tipo]++;
                    
                    // NOTA: Para obtener el tamaño real, necesitaríamos metadata
                    // Por ahora, asignamos un tamaño estimado o dejamos en 0
                    // Podríamos guardar el tamaño en el documento también
                    if (data.tamañoArchivo && data.tipoArchivo === tipo) {
                        stats.totalSize += data.tamañoArchivo;
                        stats.tamañoPorTipo[tipo] += data.tamañoArchivo;
                    }
                }
            }
            
            console.log(`Stats desde documentos para ${orgCamelCase}:`, stats);
            
        } catch (error) {
            console.log(`No se encontró colección incidencias_${orgCamelCase}`);
        }
        
        return stats;
    }
    
    /**
     * Extrae URLs de un documento
     */
    _extraerUrlsDelDocumento(data) {
        const urls = [];
        
        // Campos comunes donde se guardan URLs
        const camposUrl = [
            'url', 'imagenUrl', 'pdfUrl', 'archivoUrl', 'documentoUrl',
            'fotoUrl', 'fileUrl', 'attachmentUrl', 'multimediaUrl'
        ];
        
        for (const campo of camposUrl) {
            if (data[campo] && typeof data[campo] === 'string' && data[campo].startsWith('http')) {
                urls.push(data[campo]);
            }
        }
        
        // También buscar en arrays
        if (data.archivos && Array.isArray(data.archivos)) {
            for (const archivo of data.archivos) {
                if (typeof archivo === 'string' && archivo.startsWith('http')) {
                    urls.push(archivo);
                } else if (archivo.url && archivo.url.startsWith('http')) {
                    urls.push(archivo.url);
                }
            }
        }
        
        if (data.imagenes && Array.isArray(data.imagenes)) {
            for (const img of data.imagenes) {
                if (typeof img === 'string' && img.startsWith('http')) {
                    urls.push(img);
                } else if (img.url && img.url.startsWith('http')) {
                    urls.push(img.url);
                }
            }
        }
        
        return urls;
    }
    
    _clasificarPorUrl(url) {
        const extension = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
        
        if (extension === 'pdf') return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(extension)) return 'imagenes';
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt'].includes(extension)) return 'documentos';
        if (['mp4', 'avi', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'webm'].includes(extension)) return 'multimedia';
        return 'otros';
    }
    
    async _guardarStatsStorage(orgCamelCase, stats) {
        const statsDocRef = this._getStatsDocRef(`storage_${orgCamelCase}`);
        await consumo.registrarFirestoreEscritura(this.STATS_COLECCION, `storage_${orgCamelCase}`);
        await setDoc(statsDocRef, {
            stats: stats,
            fechaActualizacion: serverTimestamp(),
            organizacion: orgCamelCase
        }, { merge: true });
    }

    /**
     * VERSIÓN LEGACY - Escaneo directo de Storage (solo como fallback)
     */
    async _getStorageStatsLegacy(orgCamelCase) {
        if (this.storageCache.has(orgCamelCase)) {
            return this.storageCache.get(orgCamelCase);
        }
        
        try {
            const carpeta = `incidencias_${orgCamelCase}`;
            const carpetaRef = ref(storage, carpeta);
            
            console.log(`Buscando archivos en: ${carpeta}`);
            await consumo.registrarStorageDescarga(carpeta);
            
            const archivos = await this._listarArchivosRecursivamente(carpetaRef);
            
            const stats = this._storageVacio();
            stats.total = archivos.length;

            const batchSize = 20;
            for (let i = 0; i < archivos.length; i += batchSize) {
                const batch = archivos.slice(i, i + batchSize);
                await Promise.all(batch.map(async (archivo) => {
                    try {
                        await consumo.registrarStorageDescarga(archivo.fullPath);
                        const metadata = await getMetadata(archivo);
                        const size = metadata.size;
                        stats.totalSize += size;
                        
                        const tipo = this._clasificarArchivo(metadata.contentType || '', archivo.name);
                        stats[tipo]++;
                        stats.tamañoPorTipo[tipo] += size;
                    } catch (error) {
                        // Ignorar errores individuales
                    }
                }));
            }
            
            this.storageCache.set(orgCamelCase, stats);
            return stats;
            
        } catch (error) {
            const vacio = this._storageVacio();
            this.storageCache.set(orgCamelCase, vacio);
            return vacio;
        }
    }
    
    /**
     * Método principal que decide qué versión usar
     */
    async _getStorageStats(orgCamelCase) {
        // Usar versión optimizada (desde documentos) por defecto
        // Si no hay resultados, fallback a versión legacy
        const statsOptimizado = await this._getStorageStatsOptimizado(orgCamelCase);
        
        if (statsOptimizado.total > 0) {
            return statsOptimizado;
        }
        
        console.log(`No se encontraron URLs en documentos para ${orgCamelCase}, usando fallback a Storage`);
        return await this._getStorageStatsLegacy(orgCamelCase);
    }

    async _listarArchivosRecursivamente(folderRef) {
        const archivos = [];
        try {
            await consumo.registrarStorageDescarga(folderRef.fullPath);
            const resultado = await listAll(folderRef);
            archivos.push(...resultado.items);
            for (const subCarpeta of resultado.prefixes) {
                const subArchivos = await this._listarArchivosRecursivamente(subCarpeta);
                archivos.push(...subArchivos);
            }
        } catch (error) {
            if (error.code !== 'storage/object-not-found') {
                console.error('Error listando archivos:', error);
            }
        }
        return archivos;
    }

    _clasificarArchivo(contentType, nombreArchivo) {
        const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
        
        if (contentType.includes('pdf') || extension === 'pdf') return 'pdf';
        if (contentType.includes('image') || 
            ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension)) {
            return 'imagenes';
        }
        if (contentType.includes('document') || contentType.includes('spreadsheet') || contentType.includes('presentation') ||
            ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt', 'ods', 'odp'].includes(extension)) {
            return 'documentos';
        }
        if (contentType.includes('video') || contentType.includes('audio') ||
            ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'mp3', 'wav', 'ogg', 'webm', 'flv'].includes(extension)) {
            return 'multimedia';
        }
        return 'otros';
    }
    
    _clasificarPorExtension(extension) {
        if (extension === 'pdf') return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(extension)) return 'imagenes';
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt'].includes(extension)) return 'documentos';
        if (['mp4', 'avi', 'mov', 'mkv', 'mp3', 'wav', 'ogg'].includes(extension)) return 'multimedia';
        return 'otros';
    }

    _storageVacio() {
        return {
            total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, 
            multimedia: 0, otros: 0,
            tamañoPorTipo: { pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 }
        };
    }

    async _getAuthStats(orgCamelCase) {
        try {
            let usuarios = 0;
            let administradores = 0;
            
            try {
                const colabRef = collection(db, `colaboradores_${orgCamelCase}`);
                await consumo.registrarFirestoreLectura(`colaboradores_${orgCamelCase}`, `estadísticas auth ${orgCamelCase}`);
                const colabSnap = await getDocs(colabRef);
                usuarios = colabSnap.size;
            } catch (error) {
                // Colección no existe
            }
            
            try {
                const adminQuery = query(
                    collection(db, "administradores"),
                    where("organizacionCamelCase", "==", orgCamelCase)
                );
                await consumo.registrarFirestoreLectura("administradores", `estadísticas auth ${orgCamelCase}`);
                const adminSnap = await getDocs(adminQuery);
                administradores = adminSnap.size;
            } catch (error) {
                // Ignorar
            }
            
            return { usuarios, administradores, superAdmin: 0, total: usuarios + administradores };
            
        } catch (error) {
            return { usuarios: 0, administradores: 0, superAdmin: 0, total: 0 };
        }
    }

    async recopilarEstadisticas(orgCamelCase) {
        if (this.procesando.has(orgCamelCase)) {
            return this.cache.get(orgCamelCase)?.conteos || null;
        }
        
        this.procesando.add(orgCamelCase);
        
        try {
            const [firestoreStats, storageStats, authStats] = await Promise.all([
                this._getFirestoreStatsOptimizado(orgCamelCase),
                this._getStorageStats(orgCamelCase),
                this._getAuthStats(orgCamelCase)
            ]);
            
            const nuevosConteos = {
                firestore: {
                    colecciones: firestoreStats.colecciones,
                    documentos: firestoreStats.documentos,
                    lecturas: 0, escrituras: 0, actualizaciones: 0, eliminaciones: 0
                },
                storage: storageStats,
                auth: authStats,
                coleccionesPersonalizadas: firestoreStats.coleccionesPersonalizadas
            };

            await consumo.registrarFirestoreEscritura(this.COLECCION, orgCamelCase);
            await setDoc(this._getDocRef(orgCamelCase), { 
                conteos: nuevosConteos, 
                fechaActualizacion: serverTimestamp() 
            }, { merge: true });
            
            this.cache.set(orgCamelCase, new Operacion(orgCamelCase, { conteos: nuevosConteos }));
            
            return nuevosConteos;
        } catch (error) {
            console.error('Error recopilando estadísticas:', error);
            return null;
        } finally {
            this.procesando.delete(orgCamelCase);
        }
    }

    async recopilarTodasLasOrganizaciones() {
        try {
            const organizaciones = await this.getOrganizaciones();
            
            const chunkSize = 2;
            for (let i = 0; i < organizaciones.length; i += chunkSize) {
                const chunk = organizaciones.slice(i, i + chunkSize);
                await Promise.all(
                    chunk.map(org => {
                        if (org.camelCase) {
                            return this.recopilarEstadisticas(org.camelCase);
                        }
                        return Promise.resolve();
                    })
                );
            }
            
            return organizaciones;
        } catch (error) {
            console.error('Error recopilando todas las organizaciones:', error);
            return [];
        }
    }

    limpiarCacheStorage() {
        this.storageCache.clear();
    }
}

export { Operacion, OperacionesManager };
export const operacionesManager = new OperacionesManager();