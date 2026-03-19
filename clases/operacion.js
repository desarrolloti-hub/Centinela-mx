// operaciones.js - Sistema de conteo de operaciones y estadísticas

import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc,
    increment,
    onSnapshot,
    query,
    where,
    Timestamp,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { 
    ref, 
    listAll, 
    getMetadata 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

import { db, storage } from '/config/firebase-config.js';

/**
 * Clase OperacionEstadistica - Modelo de datos para estadísticas de operación
 */
class OperacionEstadistica {
    constructor(id, data = {}) {
        this.id = id; // ID del documento (organizacionCamelCase o 'global')
        this.organizacion = data.organizacion || '';
        this.organizacionNombre = data.organizacionNombre || '';

        // Conteos de Firestore
        this.firestore = {
            colecciones: data.firestore?.colecciones || 0,
            documentos: data.firestore?.documentos || 0,
            areas: data.firestore?.areas || 0,
            usuarios: data.firestore?.usuarios || 0,
            administradores: data.firestore?.administradores || 0,
            empleados: data.firestore?.empleados || 0,
            roles: data.firestore?.roles || 0,
            // Agregar más según necesidad
        };

        // Conteos de Storage por tipo de archivo
        this.storage = {
            total: data.storage?.total || 0,
            totalSize: data.storage?.totalSize || 0, // en bytes
            porTipo: {
                pdf: data.storage?.porTipo?.pdf || 0,
                imagen: data.storage?.porTipo?.imagen || 0,
                documento: data.storage?.porTipo?.documento || 0, // doc, docx, txt, etc
                multimedia: data.storage?.porTipo?.multimedia || 0, // mp4, mp3, etc
                otros: data.storage?.porTipo?.otros || 0
            },
            porCarpeta: data.storage?.porCarpeta || {} // Conteo por carpetas específicas
        };

        // Conteos de Autenticación
        this.auth = {
            usuariosRegistrados: data.auth?.usuariosRegistrados || 0,
            usuariosActivos: data.auth?.usuariosActivos || 0,
            proveedores: data.auth?.proveedores || {
                email: 0,
                google: 0,
                facebook: 0
            }
        };

        // Metadatos
        this.ultimaActualizacion = data.ultimaActualizacion ? 
            this._convertirFecha(data.ultimaActualizacion) : new Date();
        this.actualizadoPor = data.actualizadoPor || '';
    }

    _convertirFecha(fecha) {
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string' || typeof fecha === 'number') return new Date(fecha);
        return new Date();
    }

    _formatearFecha(date) {
        if (!date) return 'No disponible';
        try {
            const fecha = this._convertirFecha(date);
            return fecha.toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    getTotalStorage() {
        return this.storage.total;
    }

    getTotalStoragePorTipo(tipo) {
        return this.storage.porTipo[tipo] || 0;
    }

    getTotalFirestore() {
        return Object.values(this.firestore).reduce((a, b) => a + b, 0);
    }

    getStorageSizeFormatted() {
        const bytes = this.storage.totalSize;
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getUltimaActualizacionFormatted() {
        return this._formatearFecha(this.ultimaActualizacion);
    }

    toFirestore() {
        return {
            organizacion: this.organizacion,
            organizacionNombre: this.organizacionNombre,
            firestore: this.firestore,
            storage: this.storage,
            auth: this.auth,
            ultimaActualizacion: serverTimestamp(),
            actualizadoPor: this.actualizadoPor
        };
    }

    toUI() {
        return {
            id: this.id,
            organizacion: this.organizacion,
            organizacionNombre: this.organizacionNombre,
            firestore: this.firestore,
            storage: {
                ...this.storage,
                totalSizeFormatted: this.getStorageSizeFormatted()
            },
            auth: this.auth,
            totalFirestore: this.getTotalFirestore(),
            totalStorage: this.getTotalStorage(),
            ultimaActualizacion: this.getUltimaActualizacionFormatted(),
            ultimaActualizacionRaw: this.ultimaActualizacion
        };
    }
}

/**
 * Clase OperacionesManager - Gestiona el conteo de operaciones y estadísticas
 */
class OperacionesManager {
    constructor() {
        this.estadisticas = new Map(); // Cache: organizacion -> OperacionEstadistica
        this.listeners = new Map(); // Listeners para tiempo real
        this.historialManager = null;
    }

    // ==================== MÉTODOS PRIVADOS ====================

    _getCollectionName() {
        return 'operaciones';
    }

    _getStoragePath(organizacion = null) {
        return organizacion ? `organizaciones/${organizacion}` : 'global';
    }

    async _getHistorialManager() {
        if (!this.historialManager) {
            try {
                const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
                this.historialManager = new HistorialUsuarioManager();
            } catch (error) {
                console.error('Error inicializando historialManager:', error);
            }
        }
        return this.historialManager;
    }

    _clasificarArchivoPorTipo(nombreArchivo, metadata) {
        const extension = nombreArchivo.split('.').pop().toLowerCase();
        
        // Clasificación por extensión
        if (['pdf'].includes(extension)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) return 'imagen';
        if (['doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'].includes(extension)) return 'documento';
        if (['mp4', 'mp3', 'wav', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) return 'multimedia';
        
        // Clasificación por contentType
        if (metadata.contentType) {
            if (metadata.contentType.startsWith('image/')) return 'imagen';
            if (metadata.contentType.startsWith('video/') || metadata.contentType.startsWith('audio/')) return 'multimedia';
            if (metadata.contentType.startsWith('text/') || 
                metadata.contentType.includes('document') || 
                metadata.contentType.includes('spreadsheet')) return 'documento';
            if (metadata.contentType === 'application/pdf') return 'pdf';
        }
        
        return 'otros';
    }

    // ==================== MÉTODOS DE CONTEO ====================

    /**
     * Cuenta documentos en Firestore por colección
     */
   /**
 * Cuenta documentos en Firestore por colección
 */
async contarFirestore(organizacion = null) {
    try {
        console.log(`📊 Contando Firestore para organización: ${organizacion || 'global'}`);
        
        const stats = {
            colecciones: 0,
            documentos: 0,
            areas: 0,
            usuarios: 0,
            administradores: 0,
            empleados: 0,
            roles: 0
        };

        // 1. Contar usuarios (colección global)
        try {
            const usuariosRef = collection(db, 'usuarios');
            let queryUsuarios = usuariosRef;
            
            if (organizacion) {
                queryUsuarios = query(usuariosRef, where("organizacionCamelCase", "==", organizacion));
            }
            
            const usuariosSnap = await getDocs(queryUsuarios);
            stats.usuarios = usuariosSnap.size;
            stats.documentos += usuariosSnap.size;
            
            // Contar administradores y empleados
            const adminQuery = query(queryUsuarios, where("rol", "==", "administrador"));
            const adminSnap = await getDocs(adminQuery);
            stats.administradores = adminSnap.size;
            
            const empleadoQuery = query(queryUsuarios, where("rol", "==", "empleado"));
            const empleadoSnap = await getDocs(empleadoQuery);
            stats.empleados = empleadoSnap.size;
            
            console.log(`👥 Usuarios: ${stats.usuarios} (Admin: ${stats.administradores}, Empleados: ${stats.empleados})`);
        } catch (e) {
            console.warn('Error contando usuarios:', e);
        }

        // 2. Contar áreas si hay organización
        if (organizacion) {
            try {
                const areasCollection = `areas_${organizacion}`;
                const areasRef = collection(db, areasCollection);
                const areasSnap = await getDocs(areasRef);
                stats.areas = areasSnap.size;
                stats.documentos += areasSnap.size;
                stats.colecciones++;
                
                console.log(`🏢 Áreas: ${stats.areas}`);
            } catch (e) {
                console.warn(`Error contando áreas para ${organizacion}:`, e);
            }

            // 3. Contar roles
            try {
                const rolesCollection = `roles_${organizacion}`;
                const rolesRef = collection(db, rolesCollection);
                const rolesSnap = await getDocs(rolesRef);
                stats.roles = rolesSnap.size;
                stats.documentos += rolesSnap.size;
                stats.colecciones++;
                
                console.log(`👔 Roles: ${stats.roles}`);
            } catch (e) {
                console.warn(`Error contando roles para ${organizacion}:`, e);
            }
        }

        // Colecciones globales adicionales
        const coleccionesGlobales = ['incidencias', 'historial', 'notificaciones'];
        for (const coleccion of coleccionesGlobales) {
            try {
                const ref = collection(db, coleccion);
                let queryRef = ref;
                
                if (organizacion) {
                    queryRef = query(ref, where("organizacionCamelCase", "==", organizacion));
                }
                
                const snap = await getDocs(queryRef);
                stats.documentos += snap.size;
                if (snap.size > 0) stats.colecciones++;
                
                console.log(`📁 ${coleccion}: ${snap.size} documentos`);
            } catch (e) {
                console.warn(`Error contando ${coleccion}:`, e);
            }
        }

        console.log('✅ Conteo Firestore completado:', stats);
        return stats;

    } catch (error) {
        console.error('Error en contarFirestore:', error);
        return {
            colecciones: 0,
            documentos: 0,
            areas: 0,
            usuarios: 0,
            administradores: 0,
            empleados: 0,
            roles: 0
        };
    }
}
// Agrega este método a tu clase OperacionesManager en operacionesManager.js

/**
 * Versión optimizada de contarFirestore que usa count() cuando está disponible
 */
async contarFirestoreOptimizado(organizacion = null) {
    try {
        console.log(`📊 Contando Firestore (optimizado) para: ${organizacion || 'global'}`);
        
        const stats = {
            colecciones: 0,
            documentos: 0,
            areas: 0,
            usuarios: 0,
            administradores: 0,
            empleados: 0,
            roles: 0
        };

        // Usar el método count() para usuarios si es posible
        try {
            const usuariosRef = collection(db, 'usuarios');
            let q = usuariosRef;
            
            if (organizacion) {
                q = query(usuariosRef, where("organizacionCamelCase", "==", organizacion));
            }
            
            // Usar count() si está disponible
            if (typeof getCountFromServer !== 'undefined') {
                const snapshot = await getCountFromServer(q);
                stats.usuarios = snapshot.data().count;
                
                // Contar administradores
                const adminQuery = query(q, where("rol", "==", "administrador"));
                const adminSnapshot = await getCountFromServer(adminQuery);
                stats.administradores = adminSnapshot.data().count;
                
                // Contar empleados
                const empleadoQuery = query(q, where("rol", "==", "empleado"));
                const empleadoSnapshot = await getCountFromServer(empleadoQuery);
                stats.empleados = empleadoSnapshot.data().count;
            } else {
                // Fallback al método tradicional
                const snapshot = await getDocs(q);
                stats.usuarios = snapshot.size;
                stats.administradores = snapshot.docs.filter(d => d.data().rol === 'administrador').length;
                stats.empleados = snapshot.docs.filter(d => d.data().rol === 'empleado').length;
            }
            
            stats.documentos += stats.usuarios;
            console.log(`👥 Usuarios: ${stats.usuarios}`);
        } catch (e) {
            console.warn('Error contando usuarios:', e);
        }

        // Resto del método similar a contarFirestore original...
        // [Mantén el resto del código de contarFirestore aquí]

        return stats;

    } catch (error) {
        console.error('Error en contarFirestoreOptimizado:', error);
        return {
            colecciones: 0,
            documentos: 0,
            areas: 0,
            usuarios: 0,
            administradores: 0,
            empleados: 0,
            roles: 0
        };
    }
}

    /**
     * Cuenta archivos en Storage por tipo y carpeta
     */
    /**
 * Cuenta archivos en Storage por tipo y carpeta
 */
async contarStorage(organizacion = null) {
    try {
        console.log(`📦 Contando Storage para organización: ${organizacion || 'global'}`);
        
        const stats = {
            total: 0,
            totalSize: 0,
            porTipo: {
                pdf: 0,
                imagen: 0,
                documento: 0,
                multimedia: 0,
                otros: 0
            },
            porCarpeta: {}
        };

        const storagePath = this._getStoragePath(organizacion);
        console.log(`📁 Ruta Storage: ${storagePath}`);
        
        const storageRef = ref(storage, storagePath);

        const contarCarpetaRecursivo = async (folderRef, ruta = '') => {
            try {
                const result = await listAll(folderRef);
                
                // Contar archivos en esta carpeta
                for (const item of result.items) {
                    try {
                        const metadata = await getMetadata(item);
                        const tipo = this._clasificarArchivoPorTipo(item.name, metadata);
                        
                        stats.total++;
                        stats.porTipo[tipo]++;
                        stats.totalSize += metadata.size || 0;
                        
                        // Contar por carpeta
                        const carpetaActual = ruta || 'raiz';
                        if (!stats.porCarpeta[carpetaActual]) {
                            stats.porCarpeta[carpetaActual] = 0;
                        }
                        stats.porCarpeta[carpetaActual]++;
                        
                    } catch (error) {
                        console.warn(`Error procesando archivo ${item.name}:`, error);
                    }
                }
                
                // Procesar subcarpetas recursivamente
                for (const folder of result.prefixes) {
                    const nombreCarpeta = folder.name;
                    const nuevaRuta = ruta ? `${ruta}/${nombreCarpeta}` : nombreCarpeta;
                    await contarCarpetaRecursivo(folder, nuevaRuta);
                }
            } catch (error) {
                console.warn(`Error listando carpeta ${ruta}:`, error);
            }
        };

        await contarCarpetaRecursivo(storageRef);
        
        console.log('✅ Conteo Storage completado:', {
            total: stats.total,
            totalSize: stats.totalSize,
            porTipo: stats.porTipo
        });

        return stats;

    } catch (error) {
        console.error('Error contando Storage:', error);
        // Si la carpeta no existe, retornar stats vacíos
        return {
            total: 0,
            totalSize: 0,
            porTipo: { pdf: 0, imagen: 0, documento: 0, multimedia: 0, otros: 0 },
            porCarpeta: {}
        };
    }
}

    /**
     * Cuenta usuarios de autenticación
     */
    async contarAuth(organizacion = null) {
        // Nota: Para contar usuarios de auth se necesita Admin SDK
        // Esta es una implementación usando Firestore como fuente
        try {
            const stats = {
                usuariosRegistrados: 0,
                usuariosActivos: 0,
                proveedores: { email: 0, google: 0, facebook: 0 }
            };

            const usuariosRef = collection(db, 'usuarios');
            let queryRef = usuariosRef;
            
            if (organizacion) {
                queryRef = query(usuariosRef, where("organizacionCamelCase", "==", organizacion));
            }
            
            const snapshot = await getDocs(queryRef);
            
            snapshot.forEach(doc => {
                stats.usuariosRegistrados++;
                
                const data = doc.data();
                if (data.estado === 'activo') stats.usuariosActivos++;
                
                // Contar por proveedor
                if (data.proveedor) {
                    if (stats.proveedores.hasOwnProperty(data.proveedor)) {
                        stats.proveedores[data.proveedor]++;
                    } else {
                        stats.proveedores.email++; // default
                    }
                } else {
                    stats.proveedores.email++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error contando Auth:', error);
            return {
                usuariosRegistrados: 0,
                usuariosActivos: 0,
                proveedores: { email: 0, google: 0, facebook: 0 }
            };
        }
    }

    // ==================== MÉTODOS PRINCIPALES ====================

    /**
     * Actualiza las estadísticas completas para una organización
     */
    async actualizarEstadisticas(organizacion = null, usuarioActual = null) {
        try {
            const id = organizacion || 'global';
            const organizacionNombre = organizacion ? 
                await this._getNombreOrganizacion(organizacion) : 'Global';

            console.log(`Actualizando estadísticas para: ${id}`);

            // Ejecutar conteos en paralelo
            const [firestoreStats, storageStats, authStats] = await Promise.all([
                this.contarFirestore(organizacion),
                this.contarStorage(organizacion),
                this.contarAuth(organizacion)
            ]);

            // Crear objeto de estadísticas
            const estadisticasData = {
                organizacion: organizacion || '',
                organizacionNombre,
                firestore: firestoreStats,
                storage: storageStats,
                auth: authStats,
                actualizadoPor: usuarioActual?.id || 'sistema'
            };

            // Guardar en Firestore
            const collectionName = this._getCollectionName();
            const docRef = doc(db, collectionName, id);
            
            await setDoc(docRef, estadisticasData, { merge: true });

            // Actualizar caché
            const estadisticas = new OperacionEstadistica(id, {
                ...estadisticasData,
                ultimaActualizacion: new Date()
            });
            this.estadisticas.set(id, estadisticas);

            // Registrar en historial
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'actualizar',
                        modulo: 'operaciones',
                        descripcion: `Actualizó estadísticas de ${organizacionNombre}`,
                        detalles: {
                            organizacion: organizacionNombre,
                            firestore: firestoreStats,
                            storage: storageStats,
                            auth: authStats
                        }
                    });
                }
            }

            return estadisticas;

        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
            throw error;
        }
    }

  /**
 * Obtiene estadísticas (con opción de tiempo real)
 * Si no existen, las genera automáticamente con datos reales
 */
async getEstadisticas(organizacion = null, opciones = {}) {
    const { tiempoReal = false, callback = null } = opciones;
    const id = organizacion || 'global';

    console.log(`🔍 getEstadisticas llamado para: ${id}`);

    // Si ya hay un listener para este ID, lo retornamos
    if (tiempoReal && this.listeners.has(id)) {
        return this.listeners.get(id);
    }

    try {
        const collectionName = this._getCollectionName();
        const docRef = doc(db, collectionName, id);
        
        if (tiempoReal && callback) {
            // Configurar listener en tiempo real
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const estadisticas = new OperacionEstadistica(id, {
                        ...data,
                        ultimaActualizacion: data.ultimaActualizacion
                    });
                    this.estadisticas.set(id, estadisticas);
                    callback(estadisticas);
                } else {
                    // Si no existe, generar estadísticas reales automáticamente
                    this.generarEstadisticasReales(organizacion).then(stats => {
                        callback(stats);
                    });
                }
            }, (error) => {
                console.error('Error en listener de estadísticas:', error);
                callback(null);
            });

            this.listeners.set(id, unsubscribe);
            return unsubscribe;
        } else {
            // Obtener una vez
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                const estadisticas = new OperacionEstadistica(id, {
                    ...data,
                    ultimaActualizacion: data.ultimaActualizacion
                });
                this.estadisticas.set(id, estadisticas);
                return estadisticas;
            } else {
                // Si no existe, generar estadísticas reales automáticamente
                console.log(`📊 No hay estadísticas para ${id}, generando automáticamente...`);
                return await this.generarEstadisticasReales(organizacion);
            }
        }

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return null;
    }
}

/**
 * Genera estadísticas reales contando lo que existe en Firebase
 */
async generarEstadisticasReales(organizacion = null, usuarioActual = null) {
    try {
        console.log(`🔄 Generando estadísticas reales para: ${organizacion || 'global'}`);
        
        const id = organizacion || 'global';
        const organizacionNombre = organizacion ? 
            await this._getNombreOrganizacion(organizacion) : 'Global';

        // Ejecutar conteos reales en paralelo
        const [firestoreStats, storageStats, authStats] = await Promise.all([
            this.contarFirestore(organizacion),
            this.contarStorage(organizacion),
            this.contarAuth(organizacion)
        ]);

        console.log('✅ Conteos completados:', {
            firestore: firestoreStats,
            storage: storageStats,
            auth: authStats
        });

        // Crear objeto de estadísticas
        const estadisticasData = {
            organizacion: organizacion || '',
            organizacionNombre,
            firestore: firestoreStats,
            storage: storageStats,
            auth: authStats,
            actualizadoPor: usuarioActual?.id || 'sistema'
        };

        // Guardar en Firestore
        const collectionName = this._getCollectionName();
        const docRef = doc(db, collectionName, id);
        
        await setDoc(docRef, {
            ...estadisticasData,
            ultimaActualizacion: serverTimestamp()
        });

        console.log(`💾 Estadísticas guardadas para: ${id}`);

        // Crear instancia y guardar en caché
        const estadisticas = new OperacionEstadistica(id, {
            ...estadisticasData,
            ultimaActualizacion: new Date()
        });
        this.estadisticas.set(id, estadisticas);

        return estadisticas;

    } catch (error) {
        console.error('Error generando estadísticas reales:', error);
        throw error;
    }
}

    /**
     * Obtiene estadísticas de todas las organizaciones
     */
    async getEstadisticasGlobales() {
        try {
            // Obtener estadísticas globales
            const globalStats = await this.getEstadisticas(null);
            
            // Obtener lista de organizaciones
            const organizaciones = await this._getOrganizaciones();
            
            const statsPorOrganizacion = [];
            for (const org of organizaciones) {
                const stats = await this.getEstadisticas(org.camelCase);
                if (stats) {
                    statsPorOrganizacion.push(stats);
                }
            }

            return {
                global: globalStats,
                organizaciones: statsPorOrganizacion
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas globales:', error);
            return null;
        }
    }

    /**
     * Incrementa un contador específico
     */
    async incrementarContador(organizacion, tipo, subtipo, valor = 1, usuarioActual = null) {
        try {
            const id = organizacion || 'global';
            const collectionName = this._getCollectionName();
            const docRef = doc(db, collectionName, id);

            const updateData = {};
            
            if (tipo === 'firestore') {
                updateData[`firestore.${subtipo}`] = increment(valor);
            } else if (tipo === 'storage') {
                if (subtipo === 'total') {
                    updateData['storage.total'] = increment(valor);
                } else if (subtipo.startsWith('porTipo.')) {
                    updateData[`storage.porTipo.${subtipo.replace('porTipo.', '')}`] = increment(valor);
                } else {
                    updateData[`storage.${subtipo}`] = increment(valor);
                }
            } else if (tipo === 'auth') {
                updateData[`auth.${subtipo}`] = increment(valor);
            }

            updateData.ultimaActualizacion = serverTimestamp();
            if (usuarioActual) {
                updateData.actualizadoPor = usuarioActual.id;
            }

            await updateDoc(docRef, updateData);

            // Actualizar caché
            if (this.estadisticas.has(id)) {
                const stats = this.estadisticas.get(id);
                if (tipo === 'firestore' && stats.firestore[subtipo] !== undefined) {
                    stats.firestore[subtipo] += valor;
                } else if (tipo === 'storage') {
                    if (subtipo === 'total') stats.storage.total += valor;
                    else if (subtipo.startsWith('porTipo.')) {
                        const key = subtipo.replace('porTipo.', '');
                        if (stats.storage.porTipo[key] !== undefined) {
                            stats.storage.porTipo[key] += valor;
                        }
                    }
                }
                stats.ultimaActualizacion = new Date();
            }

            return true;

        } catch (error) {
            console.error('Error incrementando contador:', error);
            return false;
        }
    }

    // ==================== MÉTODOS AUXILIARES ====================

    async _getNombreOrganizacion(organizacionCamelCase) {
        try {
            const usuariosRef = collection(db, 'usuarios');
            const q = query(usuariosRef, where("organizacionCamelCase", "==", organizacionCamelCase), where("rol", "==", "administrador"));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                return data.organizacion || organizacionCamelCase;
            }
            return organizacionCamelCase;
        } catch {
            return organizacionCamelCase;
        }
    }

    async _getOrganizaciones() {
        try {
            const usuariosRef = collection(db, 'usuarios');
            const snapshot = await getDocs(usuariosRef);
            
            const organizaciones = new Map();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.organizacionCamelCase) {
                    organizaciones.set(data.organizacionCamelCase, {
                        camelCase: data.organizacionCamelCase,
                        nombre: data.organizacion || data.organizacionCamelCase
                    });
                }
            });

            return Array.from(organizaciones.values());
        } catch (error) {
            console.error('Error obteniendo organizaciones:', error);
            return [];
        }
    }

    /**
     * Limpia los listeners activos
     */
    limpiarListeners() {
        this.listeners.forEach((unsubscribe, id) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.listeners.clear();
    }

    /**
     * Programa actualizaciones periódicas
     */
    programarActualizaciones(intervaloMinutos = 60) {
        const intervaloMs = intervaloMinutos * 60 * 1000;
        
        setInterval(async () => {
            console.log('Ejecutando actualización programada de estadísticas...');
            
            try {
                // Actualizar global
                await this.actualizarEstadisticas(null);
                
                // Actualizar cada organización
                const organizaciones = await this._getOrganizaciones();
                for (const org of organizaciones) {
                    await this.actualizarEstadisticas(org.camelCase);
                }
                
                console.log('Actualización programada completada');
            } catch (error) {
                console.error('Error en actualización programada:', error);
            }
        }, intervaloMs);
    }
}

// Exportar clases
export { OperacionEstadistica, OperacionesManager };