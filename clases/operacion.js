// operacion.js - VERSIÓN SIMPLIFICADA PARA PRUEBA

import { db, storage } from '/config/firebase-config.js';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Clase Operacion simplificada
class Operacion {
    constructor(id, data = {}) {
        this.id = id;
        this.conteos = data.conteos || {
            firestore: { colecciones: 0, documentos: 0 },
            storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
            auth: { usuarios: 0, administradores: 0, superAdmin: 0, total: 0 },
            coleccionesPersonalizadas: {}
        };
        this.fechaActualizacion = new Date();
    }

    toFirestore() {
        return {
            conteos: this.conteos,
            fechaActualizacion: serverTimestamp()
        };
    }
}

// Clase OperacionesManager simplificada
class OperacionesManager {
    constructor() {
        this.COLECCION = 'operaciones';
        this.cache = new Map();
        console.log('✅ OperacionesManager inicializado');
    }

    _getDocRef(organizacionCamelCase) {
        return doc(db, this.COLECCION, organizacionCamelCase);
    }

    async getOperaciones(organizacionCamelCase) {
        try {
            console.log(`📊 Obteniendo operaciones para: ${organizacionCamelCase}`);
            
            if (this.cache.has(organizacionCamelCase)) {
                console.log('📦 Usando caché');
                return this.cache.get(organizacionCamelCase);
            }

            const docRef = this._getDocRef(organizacionCamelCase);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log('✅ Documento encontrado');
                const operacion = new Operacion(organizacionCamelCase, docSnap.data());
                this.cache.set(organizacionCamelCase, operacion);
                return operacion;
            } else {
                console.log('📝 Documento no existe, creando uno nuevo');
                const nuevaOperacion = new Operacion(organizacionCamelCase);
                await setDoc(docRef, nuevaOperacion.toFirestore());
                this.cache.set(organizacionCamelCase, nuevaOperacion);
                return nuevaOperacion;
            }
        } catch (error) {
            console.error('❌ Error en getOperaciones:', error);
            return null;
        }
    }

    async getEstadisticasGlobales() {
        try {
            console.log('🌐 Obteniendo estadísticas globales');
            const collectionRef = collection(db, this.COLECCION);
            const snapshot = await getDocs(collectionRef);
            
            const globalStats = {
                firestore: { colecciones: 0, documentos: 0 },
                storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
                auth: { usuarios: 0, administradores: 0, superAdmin: 0, total: 0 },
                totalEmpresas: snapshot.size
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.conteos?.firestore) {
                    globalStats.firestore.documentos += data.conteos.firestore.documentos || 0;
                }
                if (data.conteos?.storage) {
                    globalStats.storage.total += data.conteos.storage.total || 0;
                    globalStats.storage.totalSize += data.conteos.storage.totalSize || 0;
                    globalStats.storage.pdf += data.conteos.storage.pdf || 0;
                    globalStats.storage.imagenes += data.conteos.storage.imagenes || 0;
                }
                if (data.conteos?.auth) {
                    globalStats.auth.total += data.conteos.auth.total || 0;
                }
            });

            console.log('✅ Estadísticas globales calculadas:', globalStats);
            return globalStats;
        } catch (error) {
            console.error('❌ Error en getEstadisticasGlobales:', error);
            return null;
        }
    }

    async recopilarTodasLasEstadisticas(organizacionCamelCase) {
        console.log(`🔄 Recopilando estadísticas para: ${organizacionCamelCase || 'global'}`);
        
        // Datos de prueba para que la vista muestre algo
        const stats = {
            firestore: {
                colecciones: 5,
                documentos: Math.floor(Math.random() * 1000) + 100,
                lecturas: 0,
                escrituras: 0,
                actualizaciones: 0,
                eliminaciones: 0
            },
            storage: {
                total: Math.floor(Math.random() * 500) + 50,
                totalSize: Math.floor(Math.random() * 10000000) + 1000000,
                pdf: Math.floor(Math.random() * 100) + 10,
                imagenes: Math.floor(Math.random() * 200) + 20,
                documentos: Math.floor(Math.random() * 150) + 15,
                multimedia: Math.floor(Math.random() * 50) + 5,
                otros: Math.floor(Math.random() * 30) + 3,
                tamañoPorTipo: {
                    pdf: Math.floor(Math.random() * 5000000),
                    imagenes: Math.floor(Math.random() * 3000000),
                    documentos: Math.floor(Math.random() * 2000000),
                    multimedia: Math.floor(Math.random() * 8000000),
                    otros: Math.floor(Math.random() * 1000000)
                }
            },
            auth: {
                usuarios: Math.floor(Math.random() * 200) + 20,
                administradores: Math.floor(Math.random() * 10) + 1,
                superAdmin: 1,
                total: 0
            },
            coleccionesPersonalizadas: {
                'usuarios_empresa': Math.floor(Math.random() * 200) + 20,
                'areas_empresa': Math.floor(Math.random() * 15) + 3,
                'sucursales_empresa': Math.floor(Math.random() * 30) + 5,
                'incidencias_empresa': Math.floor(Math.random() * 100) + 10
            }
        };
        
        stats.auth.total = stats.auth.usuarios + stats.auth.administradores + stats.auth.superAdmin;
        
        if (organizacionCamelCase && organizacionCamelCase !== 'global') {
            const docRef = this._getDocRef(organizacionCamelCase);
            await setDoc(docRef, { conteos: stats, fechaActualizacion: serverTimestamp() }, { merge: true });
            this.cache.set(organizacionCamelCase, new Operacion(organizacionCamelCase, { conteos: stats }));
        }
        
        return new Operacion(organizacionCamelCase || 'global', { conteos: stats });
    }
}

export { Operacion, OperacionesManager };
export const operacionesManager = new OperacionesManager();