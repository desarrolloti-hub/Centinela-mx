// CLASE SIMPLIFICADA 

import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

// ==================== CLASE AREA SIMPLIFICADA ====================
class Area {
    constructor(id, data) {
        this.id = id;
        this.nombreArea = data.nombreArea || '';
        this.descripcion = data.descripcion || '';
        this.caracteristicas = data.caracteristicas || '';
        
        // Cargos - SIEMPRE como objeto, NUNCA como Map
        this.cargos = {};
        
        if (data.cargos) {
            if (typeof data.cargos === 'object') {
                // Copiar los cargos manteniendo la estructura exacta
                this.cargos = JSON.parse(JSON.stringify(data.cargos));
            }
        }
        
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.responsable = data.responsable || '';
        this.responsableNombre = data.responsableNombre || '';
        this.estado = data.estado || 'activa';
        
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
    }

    // Métodos de utilidad
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
        } catch (e) {
            return 'Fecha inválida';
        }
    }

    // Getters importantes
    getCantidadCargos() { 
        return Object.keys(this.cargos || {}).length; 
    }
    
    getCargosAsArray() {
        const cargosArray = [];
        if (this.cargos) {
            Object.keys(this.cargos).forEach(id => {
                cargosArray.push({
                    id,
                    ...this.cargos[id]
                });
            });
        }
        return cargosArray;
    }
    
    getFechaCreacionFormateada() { 
        return this._formatearFecha(this.fechaCreacion); 
    }
    
    getFechaActualizacionFormateada() { 
        return this._formatearFecha(this.fechaActualizacion); 
    }

    // Para Firestore
    toFirestore() {
        return {
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            cargos: this.cargos || {},
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor,
            responsable: this.responsable || '',
            responsableNombre: this.responsableNombre || '',
            estado: this.estado || 'activa',
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion
        };
    }

    toUI() {
        return {
            id: this.id,
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            totalCargos: this.getCantidadCargos(),
            cargos: this.getCargosAsArray(),
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor,
            responsable: this.responsable,
            responsableNombre: this.responsableNombre,
            estado: this.estado,
            organizacionCamelCase: this.organizacionCamelCase
        };
    }
}

// ==================== CLASE AREAMANAGER SIMPLIFICADA ====================
class AreaManager {
    constructor() {
        this.areas = [];
        console.log('✅ AreaManager inicializado');
    }

    // ========== OBTENER NOMBRE DE COLECCIÓN DINÁMICO ==========
    _getCollectionName(organizacionCamelCase) {
        return `areas_${organizacionCamelCase}`;
    }

    // ========== CRUD COMPLETO ==========
    
    async crearArea(areaData, userManager) {
        try {
            console.log('📝 Creando nueva área:', areaData.nombreArea);
            
            const usuarioActual = userManager.currentUser;
            
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }
            
            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            
            // Verificar si ya existe
            const existe = await this.verificarAreaExistente(areaData.nombreArea, organizacion);
            if (existe) throw new Error('Ya existe un área con ese nombre');
            
            // Generar ID
            const areaId = this._generarAreaId(areaData.nombreArea, organizacion);
            
            // Datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                caracteristicas: areaData.caracteristicas || '',
                cargos: areaData.cargos || {},
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                responsable: areaData.responsable || '',
                responsableNombre: areaData.responsableNombre || '',
                estado: 'activa',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            // Guardar en Firestore en la colección específica de la organización
            const areaRef = doc(db, collectionName, areaId);
            await setDoc(areaRef, areaFirestoreData);
            
            // Crear instancia
            const nuevaArea = new Area(areaId, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            this.areas.unshift(nuevaArea);
            console.log(`✅ Área creada en colección ${collectionName}:`, nuevaArea.nombreArea);
            return nuevaArea;
            
        } catch (error) {
            console.error("❌ Error creando área:", error);
            throw error;
        }
    }

    async getAreasByOrganizacion(organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                console.warn('⚠️ No se proporcionó organización');
                return [];
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            console.log(`🔍 Obteniendo áreas de colección: ${collectionName}`);
            
            const areasCollection = collection(db, collectionName);
            const areasSnapshot = await getDocs(areasCollection);
            const areas = [];
            
            areasSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const area = new Area(doc.id, { ...data, id: doc.id });
                    areas.push(area);
                } catch (error) {
                    console.error(`❌ Error procesando área ${doc.id}:`, error);
                }
            });
            
            // Ordenar por fecha (más recientes primero)
            areas.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.areas = areas;
            
            console.log(`✅ Encontradas ${areas.length} áreas en ${collectionName}`);
            return areas;
            
        } catch (error) {
            console.error("❌ Error obteniendo áreas:", error);
            return [];
        }
    }

    async getAreaById(areaId, organizacionCamelCase) {
        if (!organizacionCamelCase) {
            console.error('❌ Se requiere organización para obtener área');
            return null;
        }
        
        // Buscar en memoria primero
        const areaInMemory = this.areas.find(area => area.id === areaId);
        if (areaInMemory) return areaInMemory;
        
        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (areaSnap.exists()) {
                const data = areaSnap.data();
                const area = new Area(areaId, { ...data, id: areaId });
                this.areas.push(area);
                return area;
            }
            return null;
            
        } catch (error) {
            console.error('❌ Error obteniendo área:', error);
            return null;
        }
    }

    // ========== MÉTODOS DE ACTUALIZACIÓN ==========
    
    async actualizarArea(areaId, nuevosDatos, usuarioId, organizacionCamelCase) {
        try {
            console.log('🔄 Actualizando área:', areaId);
            
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar área');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (!areaSnap.exists()) {
                throw new Error(`Área con ID ${areaId} no encontrada`);
            }
            
            // Datos actualizados
            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };
            
            // Actualizar en Firestore
            await updateDoc(areaRef, datosActualizados);
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const areaActual = this.areas[areaIndex];
                Object.keys(datosActualizados).forEach(key => {
                    if (key !== 'id') {
                        areaActual[key] = datosActualizados[key];
                    }
                });
                areaActual.fechaActualizacion = new Date();
                areaActual.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área actualizada:', areaId);
            return await this.getAreaById(areaId, organizacionCamelCase);
            
        } catch (error) {
            console.error('❌ Error actualizando área:', error);
            throw error;
        }
    }

    async eliminarArea(areaId, usuarioId, organizacionCamelCase) {
        try {
            console.log('🗑️ Eliminando área:', areaId);
            
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar área');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            
            // Eliminar de Firestore
            await deleteDoc(areaRef);
            
            // Eliminar de memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                this.areas.splice(areaIndex, 1);
            }
            
            console.log(`✅ Área eliminada permanentemente de ${collectionName}:`, areaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando área:', error);
            throw error;
        }
    }

    // ========== MÉTODOS AUXILIARES ==========
    
    async verificarAreaExistente(nombreArea, organizacionCamelCase) {
        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areasCollection = collection(db, collectionName);
            
            const areasQuery = query(
                areasCollection,
                where("nombreArea", "==", nombreArea)
            );
            
            const querySnapshot = await getDocs(areasQuery);
            return !querySnapshot.empty;
            
        } catch (error) {
            console.error("❌ Error verificando área:", error);
            return false;
        }
    }

    _generarAreaId(nombreArea, organizacionCamelCase) {
        const nombreNormalizado = nombreArea
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_');
        
        const timestamp = Date.now();
        const org = organizacionCamelCase || 'sinOrganizacion';
        return `${org}_${nombreNormalizado}_${timestamp}`;
    }
}

export { Area, AreaManager };