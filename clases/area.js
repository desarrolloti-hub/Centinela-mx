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
    orderBy, 
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
        
        // Cargos
        this.cargos = data.cargos || new Map();
        
        if (data.cargos && !(data.cargos instanceof Map)) {
            if (Array.isArray(data.cargos)) {
                this.cargos = new Map();
                data.cargos.forEach(cargo => {
                    if (cargo && cargo.id) {
                        this.cargos.set(cargo.id, cargo);
                    }
                });
            } else if (typeof data.cargos === 'object') {
                this.cargos = new Map(Object.entries(data.cargos));
            }
        }
        
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';
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

    _mapToObject(map) {
        const obj = {};
        for (let [key, value] of map) {
            obj[key] = value;
        }
        return obj;
    }

    // Getters importantes
    getCantidadCargos() { return this.cargos.size; }
    getCargosActivos() {
        const cargosActivos = [];
        for (let [id, cargo] of this.cargos) {
            if (cargo.activo !== false) {
                cargosActivos.push({ id, ...cargo });
            }
        }
        return cargosActivos;
    }
    getCargosAsArray() {
        const cargosArray = [];
        for (let [id, cargo] of this.cargos) {
            cargosArray.push({ id, ...cargo });
        }
        return cargosArray;
    }
    getFechaCreacionFormateada() { return this._formatearFecha(this.fechaCreacion); }
    getFechaActualizacionFormateada() { return this._formatearFecha(this.fechaActualizacion); }

    // Para Firestore
    toFirestore() {
        return {
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            cargos: this._mapToObject(this.cargos),
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor,
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
            totalCargos: this.cargos.size,
            cargosActivos: this.getCargosActivos().length,
            cargos: this.getCargosAsArray(),
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor
        };
    }
}

// ==================== CLASE AREAMANAGER SIMPLIFICADA ====================
class AreaManager {
    constructor() {
        this.areas = [];
        console.log('✅ AreaManager inicializado');
    }

    // ========== CRUD COMPLETO ==========
    
    async crearArea(areaData, userManager) {
        try {
            console.log('📝 Creando nueva área:', areaData.nombreArea);
            
            const usuarioActual = userManager.currentUser;
            
            // Verificar si ya existe
            const existe = await this.verificarAreaExistente(areaData.nombreArea, usuarioActual.organizacionCamelCase);
            if (existe) throw new Error('Ya existe un área con ese nombre');
            
            // Generar ID
            const areaId = this._generarAreaId(areaData.nombreArea, usuarioActual.organizacionCamelCase);
            
            // Datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                caracteristicas: areaData.caracteristicas || '',
                cargos: {},
                organizacionCamelCase: usuarioActual.organizacionCamelCase || 'sinOrganizacion',
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            // Guardar en Firestore
            const areaRef = doc(db, "areas", areaId);
            await setDoc(areaRef, areaFirestoreData);
            
            // Crear instancia
            const nuevaArea = new Area(areaId, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            this.areas.unshift(nuevaArea);
            console.log('✅ Área creada:', nuevaArea.nombreArea);
            return nuevaArea;
            
        } catch (error) {
            console.error("❌ Error creando área:", error);
            throw error;
        }
    }

    async getAreasByOrganizacion(organizacionCamelCase) {
        try {
            console.log(`🔍 Obteniendo áreas para: ${organizacionCamelCase}`);
            
            const areasQuery = query(
                collection(db, "areas"),
                where("organizacionCamelCase", "==", organizacionCamelCase)
            );
            
            const areasSnapshot = await getDocs(areasQuery);
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
            
            console.log(`✅ Encontradas ${areas.length} áreas`);
            return areas;
            
        } catch (error) {
            console.error("❌ Error obteniendo áreas:", error);
            return [];
        }
    }

    async getAreaById(areaId) {
        // Buscar en memoria primero
        const areaInMemory = this.areas.find(area => area.id === areaId);
        if (areaInMemory) return areaInMemory;
        
        try {
            const areaRef = doc(db, "areas", areaId);
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

    // ========== MÉTODOS DE ACTUALIZACIÓN SIMPLIFICADOS ==========
    
    async actualizarArea(areaId, nuevosDatos, usuarioId) {
        try {
            console.log('🔄 Actualizando área:', areaId);
            
            // Primero obtener el área actual
            const areaRef = doc(db, "areas", areaId);
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
                    if (key in areaActual && key !== 'id') {
                        areaActual[key] = datosActualizados[key];
                    }
                });
                areaActual.fechaActualizacion = new Date();
                areaActual.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área actualizada:', areaId);
            return await this.getAreaById(areaId);
            
        } catch (error) {
            console.error('❌ Error actualizando área:', error);
            throw error;
        }
    }

    async eliminarArea(areaId, usuarioId) {
        try {
            console.log('🗑️ Eliminando área:', areaId);
            
            const areaRef = doc(db, "areas", areaId);
            
            // Eliminar de Firestore (eliminación física)
            await deleteDoc(areaRef);
            
            // Eliminar de memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                this.areas.splice(areaIndex, 1);
            }
            
            console.log('✅ Área eliminada permanentemente:', areaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando área:', error);
            throw error;
        }
    }

    // ========== MÉTODOS AUXILIARES ==========
    
    async verificarAreaExistente(nombreArea, organizacionCamelCase) {
        try {
            const areasQuery = query(
                collection(db, "areas"),
                where("nombreArea", "==", nombreArea),
                where("organizacionCamelCase", "==", organizacionCamelCase)
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