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
        
        // Cargos como Map - cada cargo tiene id, cargo y descripcion
        this.cargos = new Map();
        
        if (data.cargos) {
            if (data.cargos instanceof Map) {
                this.cargos = data.cargos;
            } else if (typeof data.cargos === 'object') {
                // Convertir objeto a Map
                Object.entries(data.cargos).forEach(([key, value]) => {
                    // Solo guardar id, cargo y descripcion
                    const cargoData = {
                        id: value.id || key,
                        cargo: value.cargo || '',
                        descripcion: value.descripcion || ''
                    };
                    this.cargos.set(key, cargoData);
                });
            }
        }
        
        this.organizacionCamelCase = data.organizacionCamelCase || '';
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

    // ========== MÉTODOS PARA MANEJAR CARGOS ==========
    
    /**
     * Agrega un cargo al área
     * @param {string} cargoId - ID único del cargo
     * @param {Object} cargoData - Datos del cargo { cargo, descripcion }
     */
    agregarCargo(cargoId, cargoData) {
        const nuevoCargo = {
            id: cargoId,
            cargo: cargoData.cargo || '',
            descripcion: cargoData.descripcion || ''
        };
        
        this.cargos.set(cargoId, nuevoCargo);
        return nuevoCargo;
    }

    /**
     * Actualiza un cargo existente
     * @param {string} cargoId - ID del cargo a actualizar
     * @param {Object} cargoData - Datos actualizados { cargo, descripcion }
     */
    actualizarCargo(cargoId, cargoData) {
        if (this.cargos.has(cargoId)) {
            const cargoExistente = this.cargos.get(cargoId);
            const cargoActualizado = {
                id: cargoId,
                cargo: cargoData.cargo !== undefined ? cargoData.cargo : cargoExistente.cargo,
                descripcion: cargoData.descripcion !== undefined ? cargoData.descripcion : cargoExistente.descripcion
            };
            
            this.cargos.set(cargoId, cargoActualizado);
            return cargoActualizado;
        }
        return null;
    }

    /**
     * Elimina un cargo del área
     * @param {string} cargoId - ID del cargo a eliminar
     */
    eliminarCargo(cargoId) {
        return this.cargos.delete(cargoId);
    }

    /**
     * Obtiene un cargo específico
     * @param {string} cargoId - ID del cargo
     */
    getCargo(cargoId) {
        return this.cargos.get(cargoId);
    }

    /**
     * Obtiene todos los cargos como array
     */
    getCargosAsArray() {
        const cargosArray = [];
        for (let [id, cargo] of this.cargos) {
            cargosArray.push({
                id,
                cargo: cargo.cargo,
                descripcion: cargo.descripcion
            });
        }
        return cargosArray;
    }

    getCantidadCargos() { 
        return this.cargos.size; 
    }
    
    getFechaCreacionFormateada() { 
        return this._formatearFecha(this.fechaCreacion); 
    }
    
    getFechaActualizacionFormateada() { 
        return this._formatearFecha(this.fechaActualizacion); 
    }

    // Para Firestore - mantener cargos como objeto para Firestore
    toFirestore() {
        // Convertir Map a objeto para Firestore
        const cargosObj = {};
        this.cargos.forEach((value, key) => {
            cargosObj[key] = {
                id: value.id,
                cargo: value.cargo,
                descripcion: value.descripcion
            };
        });

        return {
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            cargos: cargosObj,
            organizacionCamelCase: this.organizacionCamelCase,
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
            totalCargos: this.cargos.size,
            cargos: this.getCargosAsArray(),
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor,
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
            
            // Validar que el usuario tenga organización
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }
            
            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            
            // Verificar si ya existe en la colección de la organización
            const existe = await this.verificarAreaExistente(
                areaData.nombreArea, 
                organizacion,
                collectionName
            );
            
            if (existe) {
                throw new Error('Ya existe un área con ese nombre en tu organización');
            }
            
            // Generar ID
            const areaId = this._generarAreaId(areaData.nombreArea, organizacion);
            
            // Datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                cargos: {},
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
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
            
            // Preparar datos actualizados
            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };
            
            // Si se actualizan cargos, asegurar formato
            if (nuevosDatos.cargos && !(nuevosDatos.cargos instanceof Object)) {
                console.error('❌ cargos debe ser un objeto');
                delete datosActualizados.cargos;
            }
            
            // Actualizar en Firestore
            await updateDoc(areaRef, datosActualizados);
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const areaActual = this.areas[areaIndex];
                Object.keys(datosActualizados).forEach(key => {
                    if (key in areaActual && key !== 'id') {
                        if (key === 'cargos' && typeof datosActualizados[key] === 'object') {
                            // Convertir objeto a Map
                            const nuevoMap = new Map();
                            Object.entries(datosActualizados[key]).forEach(([k, v]) => {
                                nuevoMap.set(k, {
                                    id: v.id || k,
                                    cargo: v.cargo || '',
                                    descripcion: v.descripcion || ''
                                });
                            });
                            areaActual[key] = nuevoMap;
                        } else {
                            areaActual[key] = datosActualizados[key];
                        }
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

    // ========== MÉTODOS PARA MANEJAR CARGOS ==========
    
    /**
     * Agrega un cargo a un área
     * @param {string} areaId - ID del área
     * @param {string} cargoId - ID del cargo
     * @param {Object} cargoData - Datos del cargo { cargo, descripcion }
     * @param {string} usuarioId - ID del usuario que realiza la acción
     * @param {string} organizacionCamelCase - Organización
     */
    async agregarCargoAArea(areaId, cargoId, cargoData, usuarioId, organizacionCamelCase) {
        try {
            const area = await this.getAreaById(areaId, organizacionCamelCase);
            if (!area) throw new Error('Área no encontrada');
            
            // Agregar cargo al Map - solo id, cargo y descripcion
            area.agregarCargo(cargoId, {
                cargo: cargoData.cargo,
                descripcion: cargoData.descripcion || ''
            });
            
            // Actualizar en Firestore
            await this.actualizarArea(
                areaId, 
                { cargos: area.toFirestore().cargos }, 
                usuarioId, 
                organizacionCamelCase
            );
            
            console.log(`✅ Cargo ${cargoId} agregado al área ${areaId}`);
            return true;
        } catch (error) {
            console.error('❌ Error agregando cargo:', error);
            throw error;
        }
    }

    /**
     * Actualiza un cargo en un área
     * @param {string} areaId - ID del área
     * @param {string} cargoId - ID del cargo
     * @param {Object} cargoData - Datos actualizados { cargo, descripcion }
     * @param {string} usuarioId - ID del usuario que realiza la acción
     * @param {string} organizacionCamelCase - Organización
     */
    async actualizarCargoEnArea(areaId, cargoId, cargoData, usuarioId, organizacionCamelCase) {
        try {
            const area = await this.getAreaById(areaId, organizacionCamelCase);
            if (!area) throw new Error('Área no encontrada');
            
            // Actualizar cargo
            const cargoActualizado = area.actualizarCargo(cargoId, {
                cargo: cargoData.cargo,
                descripcion: cargoData.descripcion
            });
            
            if (!cargoActualizado) {
                throw new Error('Cargo no encontrado');
            }
            
            // Actualizar en Firestore
            await this.actualizarArea(
                areaId, 
                { cargos: area.toFirestore().cargos }, 
                usuarioId, 
                organizacionCamelCase
            );
            
            console.log(`✅ Cargo ${cargoId} actualizado en área ${areaId}`);
            return cargoActualizado;
        } catch (error) {
            console.error('❌ Error actualizando cargo:', error);
            throw error;
        }
    }

    /**
     * Elimina un cargo de un área
     * @param {string} areaId - ID del área
     * @param {string} cargoId - ID del cargo a eliminar
     * @param {string} usuarioId - ID del usuario que realiza la acción
     * @param {string} organizacionCamelCase - Organización
     */
    async eliminarCargoDeArea(areaId, cargoId, usuarioId, organizacionCamelCase) {
        try {
            const area = await this.getAreaById(areaId, organizacionCamelCase);
            if (!area) throw new Error('Área no encontrada');
            
            // Eliminar cargo del Map
            const eliminado = area.eliminarCargo(cargoId);
            if (!eliminado) {
                throw new Error('Cargo no encontrado');
            }
            
            // Actualizar en Firestore
            await this.actualizarArea(
                areaId, 
                { cargos: area.toFirestore().cargos }, 
                usuarioId, 
                organizacionCamelCase
            );
            
            console.log(`✅ Cargo ${cargoId} eliminado del área ${areaId}`);
            return true;
        } catch (error) {
            console.error('❌ Error eliminando cargo:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los cargos de un área
     * @param {string} areaId - ID del área
     * @param {string} organizacionCamelCase - Organización
     */
    async getCargosByArea(areaId, organizacionCamelCase) {
        try {
            const area = await this.getAreaById(areaId, organizacionCamelCase);
            if (!area) throw new Error('Área no encontrada');
            
            return area.getCargosAsArray();
        } catch (error) {
            console.error('❌ Error obteniendo cargos:', error);
            return [];
        }
    }

    // ========== MÉTODOS AUXILIARES ==========
    
    async verificarAreaExistente(nombreArea, organizacionCamelCase, collectionName = null) {
        try {
            const colName = collectionName || this._getCollectionName(organizacionCamelCase);
            const areasCollection = collection(db, colName);
            
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
        return `${organizacionCamelCase}_${nombreNormalizado}_${timestamp}`;
    }

    /**
     * Genera un ID para un cargo
     * @param {string} nombreCargo - Nombre del cargo
     */
    _generarCargoId(nombreCargo) {
        const nombreNormalizado = nombreCargo
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_');
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 6);
        return `cargo_${nombreNormalizado}_${timestamp}_${random}`;
    }

    // Limpiar caché de áreas
    clearCache() {
        this.areas = [];
        console.log('🧹 Caché de áreas limpiada');
    }
}

export { Area, AreaManager };