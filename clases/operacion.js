// operacion.js - VERSIÓN QUE CUENTA STORAGE CORRECTAMENTE CON REGISTRO DE CONSUMO

import { db, storage } from '/config/firebase-config.js';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
    ref,
    listAll,
    getMetadata
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

// [MODIFICACIÓN]: Importar la instancia de consumo
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
        this.cache = new Map();
        this.storageCache = new Map();
    }

    _getDocRef(org) { 
        return doc(db, this.COLECCION, org); 
    }

    async getOperaciones(org) {
        if (this.cache.has(org)) return this.cache.get(org);
        try {
            const docRef = this._getDocRef(org);
            
            // [MODIFICACIÓN]: Registrar LECTURA
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
        
        // [MODIFICACIÓN]: Registrar ESCRITURA
        await consumo.registrarFirestoreEscritura(this.COLECCION, org);
        
        await setDoc(this._getDocRef(org), nuevaOp.toFirestore());
        this.cache.set(org, nuevaOp);
        return nuevaOp;
    }

    async getOrganizaciones() {
        try {
            const adminsRef = collection(db, "administradores");
            
            // [MODIFICACIÓN]: Registrar LECTURA
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

    async recopilarEstadisticas(orgCamelCase) {
        try {
            const [firestoreStats, storageStats, authStats] = await Promise.all([
                this._getFirestoreStats(orgCamelCase),
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

            // [MODIFICACIÓN]: Registrar ESCRITURA
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
        }
    }

    async _getFirestoreStats(orgCamelCase) {
        const posiblesColecciones = [
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

        let totalDocumentos = 0;
        let coleccionesExistentes = 0;
        const coleccionesPersonalizadas = {};

        const resultados = await Promise.all(
            posiblesColecciones.map(async (col) => {
                try {
                    const coleccionRef = collection(db, col);
                    
                    // [MODIFICACIÓN]: Registrar LECTURA para cada colección
                    await consumo.registrarFirestoreLectura(col, `estadísticas ${orgCamelCase}`);
                    
                    const snapshot = await getDocs(coleccionRef);
                    return { col, count: snapshot.size, success: true };
                } catch (error) {
                    return { col, count: 0, success: false };
                }
            })
        );

        for (const r of resultados) {
            if (r.success) {
                coleccionesExistentes++;
                coleccionesPersonalizadas[r.col] = r.count;
                totalDocumentos += r.count;
            }
        }

        try {
            const adminQuery = query(
                collection(db, "administradores"),
                where("organizacionCamelCase", "==", orgCamelCase)
            );
            
            // [MODIFICACIÓN]: Registrar LECTURA para administradores
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

    /**
     * CUENTA ARCHIVOS EN STORAGE - BUSCA EN TODA LA ESTRUCTURA DE incidencias_${orgCamelCase}/
     * CON CACHE PARA NO RECARGAR SIEMPRE
     */
    async _getStorageStats(orgCamelCase) {
        // Usar cache para evitar recargar siempre
        if (this.storageCache.has(orgCamelCase)) {
            return this.storageCache.get(orgCamelCase);
        }
        
        try {
            const carpeta = `incidencias_${orgCamelCase}`;
            const carpetaRef = ref(storage, carpeta);
            
            console.log(`Buscando archivos en: ${carpeta}`);
            
            // [MODIFICACIÓN]: Registrar LECTURA en Storage
            await consumo.registrarStorageDescarga(carpeta);
            
            // Buscar recursivamente en toda la carpeta
            const archivos = await this._listarArchivosRecursivamente(carpetaRef);
            
            console.log(`Encontrados ${archivos.length} archivos en ${carpeta}`);
            
            const stats = {
                total: archivos.length,
                totalSize: 0,
                pdf: 0,
                imagenes: 0,
                documentos: 0,
                multimedia: 0,
                otros: 0,
                tamañoPorTipo: {
                    pdf: 0,
                    imagenes: 0,
                    documentos: 0,
                    multimedia: 0,
                    otros: 0
                }
            };

            // Procesar archivos en lotes para no bloquear
            const batchSize = 50;
            for (let i = 0; i < archivos.length; i += batchSize) {
                const batch = archivos.slice(i, i + batchSize);
                await Promise.all(batch.map(async (archivo) => {
                    try {
                        // [MODIFICACIÓN]: Registrar LECTURA de metadata en Storage
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
            
            // Guardar en cache
            this.storageCache.set(orgCamelCase, stats);
            
            return stats;
            
        } catch (error) {
            console.log(`No se encontró la carpeta incidencias_${orgCamelCase}`);
            const vacio = {
                total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, 
                multimedia: 0, otros: 0,
                tamañoPorTipo: { pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 }
            };
            this.storageCache.set(orgCamelCase, vacio);
            return vacio;
        }
    }

    /**
     * LISTA TODOS LOS ARCHIVOS RECURSIVAMENTE EN UNA CARPETA
     */
    async _listarArchivosRecursivamente(folderRef) {
        const archivos = [];
        try {
            // [MODIFICACIÓN]: Registrar LECTURA de lista en Storage
            await consumo.registrarStorageDescarga(folderRef.fullPath);
            
            const resultado = await listAll(folderRef);
            
            // Agregar archivos del nivel actual
            archivos.push(...resultado.items);
            
            // Recorrer subcarpetas recursivamente
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

    async _getAuthStats(orgCamelCase) {
        try {
            let usuarios = 0;
            let administradores = 0;
            
            try {
                const colabRef = collection(db, `colaboradores_${orgCamelCase}`);
                
                // [MODIFICACIÓN]: Registrar LECTURA
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
                
                // [MODIFICACIÓN]: Registrar LECTURA
                await consumo.registrarFirestoreLectura("administradores", `estadísticas auth ${orgCamelCase}`);
                
                const adminSnap = await getDocs(adminQuery);
                administradores = adminSnap.size;
            } catch (error) {
                // Ignorar
            }
            
            const total = usuarios + administradores;
            
            return { usuarios, administradores, superAdmin: 0, total };
            
        } catch (error) {
            return { usuarios: 0, administradores: 0, superAdmin: 0, total: 0 };
        }
    }

    async recopilarTodasLasOrganizaciones() {
        try {
            const organizaciones = await this.getOrganizaciones();
            
            // Procesar de a 2 empresas a la vez para no saturar
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

    // Limpiar cache (útil después de subir nuevos archivos)
    limpiarCacheStorage() {
        this.storageCache.clear();
    }
}

export { Operacion, OperacionesManager };
export const operacionesManager = new OperacionesManager();