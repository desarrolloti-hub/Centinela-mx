// area.js - VERSIÓN CORREGIDA CON ESTADO EN CARGOS

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

/**
 * Clase Area - Representa un área con sus cargos
 */
class Area {
    constructor(id, data) {
        this.id = id;
        this.nombreArea = data.nombreArea || '';
        this.descripcion = data.descripcion || '';
        this.caracteristicas = data.caracteristicas || '';
        
        // Objeto que contiene los cargos del área
        this.cargos = {};
        
        if (data.cargos) {
            if (typeof data.cargos === 'object') {
                this.cargos = JSON.parse(JSON.stringify(data.cargos));
            }
        }
        
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.responsable = data.responsable || '';
        this.responsableNombre = data.responsableNombre || '';
        this.estado = data.estado || 'activa'; // 'activa' o 'inactiva'
        
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
    }

    /**
     * Convierte diferentes formatos de fecha a objeto Date
     * @param {any} fecha - Fecha en cualquier formato
     * @returns {Date} - Objeto Date
     */
    _convertirFecha(fecha) {
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string' || typeof fecha === 'number') return new Date(fecha);
        return new Date();
    }
    
    /**
     * Formatea una fecha para mostrar en UI
     * @param {Date} date - Fecha a formatear
     * @returns {string} - Fecha formateada
     */
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

    /**
     * Obtiene la cantidad de cargos activos del área
     * @returns {number} - Número de cargos activos
     */
    getCantidadCargosActivos() { 
        if (!this.cargos) return 0;
        return Object.values(this.cargos).filter(cargo => cargo.estado !== 'inactivo').length;
    }
    
    /**
     * Obtiene la cantidad total de cargos (incluyendo inactivos)
     * @returns {number} - Número total de cargos
     */
    getCantidadCargosTotal() { 
        return Object.keys(this.cargos || {}).length; 
    }
    
    /**
     * Verifica si el área tiene cargos activos
     * @returns {boolean} - True si tiene al menos un cargo activo
     */
    tieneCargosActivos() {
        return this.getCantidadCargosActivos() > 0;
    }
    
    /**
     * Obtiene los cargos como array para facilitar su uso en UI
     * @returns {Array} - Array de cargos
     */
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
    
    /**
     * Obtiene fecha de creación formateada
     * @returns {string} - Fecha formateada
     */
    getFechaCreacionFormateada() { 
        return this._formatearFecha(this.fechaCreacion); 
    }
    
    /**
     * Obtiene fecha de actualización formateada
     * @returns {string} - Fecha formateada
     */
    getFechaActualizacionFormateada() { 
        return this._formatearFecha(this.fechaActualizacion); 
    }

    /**
     * Obtiene el badge de estado para mostrar en UI
     * @returns {string} - HTML del badge
     */
    getEstadoBadge() {
        if (this.estado === 'activa') {
            return '<span class="badge-activo"><i class="fas fa-check-circle"></i> Activa</span>';
        } else {
            return '<span class="badge-inactivo"><i class="fas fa-pause-circle"></i> Inactiva</span>';
        }
    }

    /**
     * Prepara los datos para guardar en Firestore
     * @returns {Object} - Datos para Firestore
     */
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

    /**
     * Prepara los datos para mostrar en la UI
     * @returns {Object} - Datos formateados para UI
     */
    toUI() {
        return {
            id: this.id,
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            totalCargos: this.getCantidadCargosTotal(),
            cargosActivos: this.getCantidadCargosActivos(),
            tieneCargosActivos: this.tieneCargosActivos(),
            cargos: this.getCargosAsArray(),
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor,
            responsable: this.responsable,
            responsableNombre: this.responsableNombre,
            estado: this.estado,
            estadoBadge: this.getEstadoBadge(),
            organizacionCamelCase: this.organizacionCamelCase
        };
    }
}

/**
 * Clase AreaManager - Gestiona las operaciones CRUD de áreas
 */
class AreaManager {
    constructor() {
        this.areas = [];
        this.historialManager = null;
    }

    /**
     * Obtiene el nombre de la colección según la organización
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {string} - Nombre de la colección
     */
    _getCollectionName(organizacionCamelCase) {
        return `areas_${organizacionCamelCase}`;
    }
    
    /**
     * Inicializa y obtiene el manager de historial
     * @returns {Promise<HistorialUsuarioManager>} - Instancia del historial manager
     */
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
    
    /**
     * Genera un ID simulado de Firebase para cargos
     * @returns {string} - ID generado
     */
    _generarIdFirebase() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 20; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    /**
     * Crea una nueva área
     * @param {Object} areaData - Datos del área
     * @param {Object} userManager - Manager del usuario actual
     * @returns {Promise<Area>} - Área creada
     */
    async crearArea(areaData, userManager) {
        try {
            const usuarioActual = userManager.currentUser;
            
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }
            
            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            
            // Verificar si ya existe un área con el mismo nombre
            const existe = await this.verificarAreaExistente(areaData.nombreArea, organizacion);
            if (existe) throw new Error('Ya existe un área con ese nombre');
            
            // Generar IDs de Firebase para los cargos (todos activos por defecto)
            const cargosConIdsFirebase = {};
            
            if (areaData.cargos && typeof areaData.cargos === 'object') {
                Object.keys(areaData.cargos).forEach(key => {
                    const cargo = areaData.cargos[key];
                    const cargoId = this._generarIdFirebase();
                    cargosConIdsFirebase[cargoId] = {
                        nombre: cargo.nombre || '',
                        descripcion: cargo.descripcion || '',
                        estado: 'activo' // ← NUEVO: estado del cargo
                    };
                });
            }
            
            const areasCollection = collection(db, collectionName);
            
            // Datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                caracteristicas: areaData.caracteristicas || '',
                cargos: cargosConIdsFirebase,
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                responsable: areaData.responsable || '',
                responsableNombre: areaData.responsableNombre || '',
                estado: 'activa',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            const docRef = await addDoc(areasCollection, areaFirestoreData);
            
            const nuevaArea = new Area(docRef.id, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            this.areas.unshift(nuevaArea);

            // ✅ REGISTRO EN HISTORIAL - CREAR ÁREA
            const historial = await this._getHistorialManager();
            if (historial) {
                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'crear',
                    modulo: 'areas',
                    descripcion: historial.generarDescripcion('crear', 'areas', {
                        nombre: areaData.nombreArea,
                        totalCargos: Object.keys(cargosConIdsFirebase).length
                    }),
                    detalles: {
                        areaId: docRef.id,
                        nombre: areaData.nombreArea,
                        totalCargos: Object.keys(cargosConIdsFirebase).length,
                        responsable: areaData.responsableNombre || 'No asignado'
                    }
                });
            }
            
            return nuevaArea;
            
        } catch (error) {
            console.error('Error creando área:', error);
            throw error;
        }
    }
    
    /**
     * Actualiza un área existente
     * @param {string} areaId - ID del área
     * @param {Object} nuevosDatos - Nuevos datos del área
     * @param {string} usuarioId - ID del usuario que actualiza
     * @param {string} organizacionCamelCase - Organización
     * @param {Object} usuarioActual - Usuario que realiza la acción (para historial)
     * @returns {Promise<Area>} - Área actualizada
     */
    async actualizarArea(areaId, nuevosDatos, usuarioId, organizacionCamelCase, usuarioActual = null) {
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
            
            // Procesar cargos actualizados
            let cargosActualizados = {};
            
            if (nuevosDatos.cargos) {
                // Mantener cargos existentes
                if (datosActuales.cargos) {
                    Object.keys(datosActuales.cargos).forEach(id => {
                        cargosActualizados[id] = datosActuales.cargos[id];
                    });
                }
                
                // Procesar nuevos cargos
                Object.keys(nuevosDatos.cargos).forEach(key => {
                    const cargo = nuevosDatos.cargos[key];
                    
                    let cargoId = key;
                    let cargoExiste = false;
                    
                    // Buscar si el cargo ya existe por nombre
                    if (datosActuales.cargos) {
                        Object.keys(datosActuales.cargos).forEach(existingId => {
                            if (datosActuales.cargos[existingId].nombre === cargo.nombre) {
                                cargoId = existingId;
                                cargoExiste = true;
                            }
                        });
                    }
                    
                    // Si es nuevo, generar ID y poner estado activo
                    if (!cargoExiste && !datosActuales.cargos?.[key]) {
                        cargoId = this._generarIdFirebase();
                        cargosActualizados[cargoId] = {
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || '',
                            estado: 'activo' // ← NUEVO: estado por defecto
                        };
                    } else {
                        // Si existe, actualizar pero mantener su estado
                        cargosActualizados[cargoId] = {
                            ...cargosActualizados[cargoId],
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || ''
                            // estado se mantiene
                        };
                    }
                });
            } else {
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
            
            // Actualizar caché en memoria
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

            // ✅ REGISTRO EN HISTORIAL - EDITAR ÁREA
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    const cambios = [];
                    if (datosActuales.nombreArea !== nuevosDatos.nombreArea) {
                        cambios.push(`nombre: "${datosActuales.nombreArea}" → "${nuevosDatos.nombreArea}"`);
                    }
                    if (datosActuales.responsableNombre !== nuevosDatos.responsableNombre) {
                        cambios.push(`responsable: ${datosActuales.responsableNombre || 'Ninguno'} → ${nuevosDatos.responsableNombre || 'Ninguno'}`);
                    }

                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'areas',
                        descripcion: historial.generarDescripcion('editar', 'areas', {
                            nombre: nuevosDatos.nombreArea,
                            nombreOriginal: datosActuales.nombreArea,
                            cambios: cambios.join(', ')
                        }),
                        detalles: {
                            areaId,
                            nombre: nuevosDatos.nombreArea,
                            nombreOriginal: datosActuales.nombreArea,
                            totalCargos: Object.keys(cargosActualizados).length,
                            cambios
                        }
                    });
                }
            }
            
            return await this.getAreaById(areaId, organizacionCamelCase);
            
        } catch (error) {
            console.error('Error actualizando área:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las áreas de una organización
     * @param {string} organizacionCamelCase - Organización
     * @param {Object} usuarioActual - Usuario que consulta (para historial)
     * @returns {Promise<Array<Area>>} - Lista de áreas
     */
    async getAreasByOrganizacion(organizacionCamelCase, usuarioActual = null) {
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

            // ✅ REGISTRO EN HISTORIAL - CONSULTAR LISTA (solo lectura)
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'leer',
                        modulo: 'areas',
                        descripcion: `Consultó lista de áreas (${areas.length} áreas)`,
                        detalles: { total: areas.length }
                    });
                }
            }
            
            return areas;
            
        } catch (error) {
            console.error('Error obteniendo áreas:', error);
            return [];
        }
    }

    /**
     * Obtiene un área por su ID
     * @param {string} areaId - ID del área
     * @param {string} organizacionCamelCase - Organización
     * @returns {Promise<Area|null>} - Área encontrada o null
     */
    async getAreaById(areaId, organizacionCamelCase) {
        if (!organizacionCamelCase) return null;
        
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
            console.error('Error obteniendo área:', error);
            return null;
        }
    }
    
    /**
     * Inactiva un cargo específico dentro de un área
     * @param {string} areaId - ID del área
     * @param {string} cargoId - ID del cargo
     * @param {string} usuarioId - ID del usuario que inactiva
     * @param {string} organizacionCamelCase - Organización
     * @param {Object} usuarioActual - Usuario que realiza la acción (para historial)
     * @returns {Promise<boolean>} - True si se inactivó correctamente
     */
    async inactivarCargo(areaId, cargoId, usuarioId, organizacionCamelCase, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para inactivar cargo');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (!areaSnap.exists()) {
                throw new Error(`Área con ID ${areaId} no encontrada`);
            }
            
            const datosActuales = areaSnap.data();
            const cargos = datosActuales.cargos || {};
            
            if (!cargos[cargoId]) {
                throw new Error('Cargo no encontrado');
            }
            
            const nombreCargo = cargos[cargoId].nombre;
            
            // Inactivar el cargo
            cargos[cargoId] = {
                ...cargos[cargoId],
                estado: 'inactivo'
            };
            
            await updateDoc(areaRef, {
                cargos: cargos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // ✅ REGISTRO EN HISTORIAL - INACTIVAR CARGO
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'areas',
                        descripcion: `Inactivó cargo "${nombreCargo}" en área "${datosActuales.nombreArea}"`,
                        detalles: {
                            areaId,
                            areaNombre: datosActuales.nombreArea,
                            cargoId,
                            cargoNombre: nombreCargo,
                            nuevoEstado: 'inactivo'
                        }
                    });
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Error inactivando cargo:', error);
            throw error;
        }
    }

    /**
     * Reactiva un cargo específico dentro de un área
     * @param {string} areaId - ID del área
     * @param {string} cargoId - ID del cargo
     * @param {string} usuarioId - ID del usuario que reactiva
     * @param {string} organizacionCamelCase - Organización
     * @param {Object} usuarioActual - Usuario que realiza la acción (para historial)
     * @returns {Promise<boolean>} - True si se reactivó correctamente
     */
    async reactivarCargo(areaId, cargoId, usuarioId, organizacionCamelCase, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para reactivar cargo');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (!areaSnap.exists()) {
                throw new Error(`Área con ID ${areaId} no encontrada`);
            }
            
            const datosActuales = areaSnap.data();
            const cargos = datosActuales.cargos || {};
            
            if (!cargos[cargoId]) {
                throw new Error('Cargo no encontrado');
            }
            
            const nombreCargo = cargos[cargoId].nombre;
            
            // Reactivar el cargo
            cargos[cargoId] = {
                ...cargos[cargoId],
                estado: 'activo'
            };
            
            await updateDoc(areaRef, {
                cargos: cargos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // ✅ REGISTRO EN HISTORIAL - REACTIVAR CARGO
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'areas',
                        descripcion: `Reactivó cargo "${nombreCargo}" en área "${datosActuales.nombreArea}"`,
                        detalles: {
                            areaId,
                            areaNombre: datosActuales.nombreArea,
                            cargoId,
                            cargoNombre: nombreCargo,
                            nuevoEstado: 'activo'
                        }
                    });
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Error reactivando cargo:', error);
            throw error;
        }
    }

    /**
     * Inactiva un área (solo si no tiene cargos activos)
     * @param {string} areaId - ID del área
     * @param {string} usuarioId - ID del usuario que inactiva
     * @param {string} organizacionCamelCase - Organización
     * @param {Object} usuarioActual - Usuario que realiza la acción (para historial)
     * @returns {Promise<boolean>} - True si se inactivó correctamente
     */
    async inactivarArea(areaId, usuarioId, organizacionCamelCase, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para inactivar área');
            }
            
            // Obtener datos antes de inactivar
            const area = await this.getAreaById(areaId, organizacionCamelCase);
            const nombreArea = area ? area.nombreArea : 'Área desconocida';
            
            // Verificar si tiene cargos activos
            if (area && area.tieneCargosActivos()) {
                throw new Error('No se puede inactivar un área con cargos activos. Debe inactivar todos los cargos primero.');
            }
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            
            await updateDoc(areaRef, {
                estado: 'inactiva',
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // Actualizar caché en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                this.areas[areaIndex].estado = 'inactiva';
                this.areas[areaIndex].fechaActualizacion = new Date();
                this.areas[areaIndex].actualizadoPor = usuarioId;
            }

            // ✅ REGISTRO EN HISTORIAL - INACTIVAR ÁREA
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'areas',
                        descripcion: `Inactivó área "${nombreArea}"`,
                        detalles: {
                            areaId,
                            nombre: nombreArea,
                            nuevoEstado: 'inactiva'
                        }
                    });
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Error inactivando área:', error);
            throw error;
        }
    }

    /**
     * Reactiva un área
     * @param {string} areaId - ID del área
     * @param {string} usuarioId - ID del usuario que reactiva
     * @param {string} organizacionCamelCase - Organización
     * @param {Object} usuarioActual - Usuario que realiza la acción (para historial)
     * @returns {Promise<boolean>} - True si se reactivó correctamente
     */
    async reactivarArea(areaId, usuarioId, organizacionCamelCase, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para reactivar área');
            }
            
            // Obtener datos antes de reactivar
            const area = await this.getAreaById(areaId, organizacionCamelCase);
            const nombreArea = area ? area.nombreArea : 'Área desconocida';
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const areaRef = doc(db, collectionName, areaId);
            
            await updateDoc(areaRef, {
                estado: 'activa',
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // Actualizar caché en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                this.areas[areaIndex].estado = 'activa';
                this.areas[areaIndex].fechaActualizacion = new Date();
                this.areas[areaIndex].actualizadoPor = usuarioId;
            }

            // ✅ REGISTRO EN HISTORIAL - REACTIVAR ÁREA
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'areas',
                        descripcion: `Reactivó área "${nombreArea}"`,
                        detalles: {
                            areaId,
                            nombre: nombreArea,
                            nuevoEstado: 'activa'
                        }
                    });
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Error reactivando área:', error);
            throw error;
        }
    }
    
    /**
     * Verifica si ya existe un área con el mismo nombre
     * @param {string} nombreArea - Nombre del área
     * @param {string} organizacionCamelCase - Organización
     * @returns {Promise<boolean>} - True si ya existe
     */
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