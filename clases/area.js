// area.js - VERSIÓN CON IDS GENERADOS POR FIREBASE PARA ÁREAS Y CARGOS

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
    serverTimestamp,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

class Area {
    constructor(id, data) {
        this.id = id;
        this.nombreArea = data.nombreArea || '';
        this.descripcion = data.descripcion || '';
        this.caracteristicas = data.caracteristicas || '';
        
        this.cargos = {};
        
        if (data.cargos) {
            if (typeof data.cargos === 'object') {
                // Mantener la estructura exacta de cargos con sus IDs
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

class AreaManager {
    constructor() {
        this.areas = [];
    }

    _getCollectionName(organizacionCamelCase) {
        return `areas_${organizacionCamelCase}`;
    }
    
    // 🔥 MÉTODO PARA GENERAR IDs DE CARGOS CON FIREBASE
    _generarIdFirebase() {
        // Simula un ID de Firebase (formato: 20 caracteres alfanuméricos)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 20; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    async crearArea(areaData, userManager) {
        try {
            const usuarioActual = userManager.currentUser;
            
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }
            
            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            
            // Verificar si ya existe
            const existe = await this.verificarAreaExistente(areaData.nombreArea, organizacion);
            if (existe) throw new Error('Ya existe un área con ese nombre');
            
            // 🔥 CORREGIDO: Generar IDs de Firebase para los cargos
            const cargosConIdsFirebase = {};
            
            // Si hay cargos, procesarlos
            if (areaData.cargos && typeof areaData.cargos === 'object') {
                Object.keys(areaData.cargos).forEach(key => {
                    const cargo = areaData.cargos[key];
                    // Generar ID de Firebase para cada cargo
                    const cargoId = this._generarIdFirebase();
                    cargosConIdsFirebase[cargoId] = {
                        nombre: cargo.nombre || '',
                        descripcion: cargo.descripcion || ''
                    };
                });
            }
            
            const areasCollection = collection(db, collectionName);
            
            // Datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                caracteristicas: areaData.caracteristicas || '',
                cargos: cargosConIdsFirebase, // Usar los cargos con IDs de Firebase
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                responsable: areaData.responsable || '',
                responsableNombre: areaData.responsableNombre || '',
                estado: 'activa',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            // Usar addDoc para que Firebase genere el ID del área
            const docRef = await addDoc(areasCollection, areaFirestoreData);
            
            // Crear instancia con el ID generado por Firebase para el área
            const nuevaArea = new Area(docRef.id, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            this.areas.unshift(nuevaArea);
            return nuevaArea;
            
        } catch (error) {
            console.error('Error creando área:', error);
            throw error;
        }
    }
    
    async actualizarArea(areaId, nuevosDatos, usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar área');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (!areaSnap.exists()) {
                throw new Error(`Área con ID ${areaId} no encontrada`);
            }
            
            const datosActuales = areaSnap.data();
            
            // 🔥 CORREGIDO: Procesar cargos para mantener IDs existentes y generar nuevos
            let cargosActualizados = {};
            
            // Si hay cargos nuevos en los datos
            if (nuevosDatos.cargos) {
                // Primero, mantener los cargos existentes que no se modifican
                if (datosActuales.cargos) {
                    Object.keys(datosActuales.cargos).forEach(id => {
                        cargosActualizados[id] = datosActuales.cargos[id];
                    });
                }
                
                // Procesar los nuevos datos de cargos
                Object.keys(nuevosDatos.cargos).forEach(key => {
                    const cargo = nuevosDatos.cargos[key];
                    
                    // Verificar si este cargo ya tiene un ID (existe en datosActuales)
                    let cargoId = key;
                    let cargoExiste = false;
                    
                    // Buscar si el cargo ya existe por nombre (para mantener consistencia)
                    if (datosActuales.cargos) {
                        Object.keys(datosActuales.cargos).forEach(existingId => {
                            if (datosActuales.cargos[existingId].nombre === cargo.nombre) {
                                cargoId = existingId;
                                cargoExiste = true;
                            }
                        });
                    }
                    
                    // Si es un cargo nuevo, generar ID de Firebase
                    if (!cargoExiste && !datosActuales.cargos?.[key]) {
                        cargoId = this._generarIdFirebase();
                    }
                    
                    cargosActualizados[cargoId] = {
                        nombre: cargo.nombre || '',
                        descripcion: cargo.descripcion || ''
                    };
                });
            } else {
                // Si no hay cargos nuevos, mantener los existentes
                cargosActualizados = datosActuales.cargos || {};
            }
            
            const datosActualizados = {
                nombreArea: nuevosDatos.nombreArea,
                descripcion: nuevosDatos.descripcion,
                cargos: cargosActualizados,
                responsable: nuevosDatos.responsable || datosActuales.responsable,
                responsableNombre: nuevosDatos.responsableNombre || datosActuales.responsableNombre,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };
            
            await updateDoc(areaRef, datosActualizados);
            
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
            
            return await this.getAreaById(areaId, organizacionCamelCase);
            
        } catch (error) {
            console.error('Error actualizando área:', error);
            throw error;
        }
    }

    async getAreasByOrganizacion(organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) return [];
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            
            const areasCollection = collection(db, collectionName);
            const areasSnapshot = await getDocs(areasCollection);
            const areas = [];
            
            areasSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const area = new Area(doc.id, { ...data, id: doc.id });
                    areas.push(area);
                } catch (error) {
                    console.error('Error procesando área:', error);
                }
            });
            
            areas.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.areas = areas;
            
            return areas;
            
        } catch (error) {
            console.error('Error obteniendo áreas:', error);
            return [];
        }
    }

    async getAreaById(areaId, organizacionCamelCase) {
        if (!organizacionCamelCase) return null;
        
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
            console.error('Error obteniendo área:', error);
            return null;
        }
    }
    
    async eliminarArea(areaId, usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar área');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            
            await deleteDoc(areaRef);
            
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                this.areas.splice(areaIndex, 1);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error eliminando área:', error);
            throw error;
        }
    }
    
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
            console.error('Error verificando área:', error);
            return false;
        }
    }
}

export { Area, AreaManager };