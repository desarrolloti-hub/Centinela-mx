// tarea.js - VERSIÓN CHECKLIST (Con items que se pueden marcar)

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
    serverTimestamp,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

class Tarea {
    constructor(id, data) {
        this.id = id;

        // Datos principales de la tarea (checklist)
        this.nombreActividad = data.nombreActividad || '';
        this.descripcion = data.descripcion || '';

        // Items del checklist
        this.items = data.items || {}; // Objeto con los items { id: { texto, completado, fechaCompletado } }

        // Tipo de tarea: 'personal', 'compartida', 'area', 'general'
        this.tipo = data.tipo || 'personal';

        // Visibilidad y destinatarios
        this.usuariosCompartidosIds = data.usuariosCompartidosIds || [];
        this.areaId = data.areaId || '';
        this.cargosIds = data.cargosIds || [];

        // Metadatos
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.actualizadoPorNombre = data.actualizadoPorNombre || '';

        // Fechas
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();

        // Progreso general (se calcula automáticamente)
        this._calcularProgreso();
    }

    _convertirFecha(fecha) {
        if (!fecha) return null;
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string' || typeof fecha === 'number') {
            const date = new Date(fecha);
            if (!isNaN(date.getTime())) return date;
        }
        if (fecha && typeof fecha === 'object' && 'seconds' in fecha) {
            return new Date(fecha.seconds * 1000);
        }
        return null;
    }

    _formatearFecha(fecha) {
        if (!fecha) return 'No disponible';
        try {
            const date = this._convertirFecha(fecha);
            return date.toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    _calcularProgreso() {
        const totalItems = Object.keys(this.items).length;
        const itemsCompletados = Object.values(this.items).filter(item => item.completado).length;

        this.totalItems = totalItems;
        this.itemsCompletados = itemsCompletados;
        this.porcentajeCompletado = totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;
        this.completada = totalItems > 0 && itemsCompletados === totalItems;
    }

    // =============================================
    // MÉTODOS PARA GESTIONAR ITEMS DEL CHECKLIST
    // =============================================

    /**
     * Agrega un nuevo item al checklist
     * @param {string} texto - Texto del item
     * @returns {string} - ID del nuevo item
     */
    agregarItem(texto) {
        if (!texto || texto.trim() === '') {
            throw new Error('El texto del item es requerido');
        }

        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.items[itemId] = {
            id: itemId,
            texto: texto.trim(),
            completado: false,
            fechaCompletado: null,
            fechaCreacion: new Date().toISOString()
        };

        this._calcularProgreso();
        return itemId;
    }

    /**
     * Agrega múltiples items a la vez
     * @param {Array<string>} textos - Array de textos para los items
     * @returns {Array<string>} - Array de IDs creados
     */
    agregarMultiplesItems(textos) {
        const idsCreados = [];
        textos.forEach(texto => {
            if (texto && texto.trim() !== '') {
                const id = this.agregarItem(texto);
                idsCreados.push(id);
            }
        });
        return idsCreados;
    }

    /**
     * Actualiza el texto de un item
     * @param {string} itemId - ID del item
     * @param {string} nuevoTexto - Nuevo texto
     * @returns {boolean} - True si se actualizó
     */
    actualizarItem(itemId, nuevoTexto) {
        if (!this.items[itemId]) return false;
        if (!nuevoTexto || nuevoTexto.trim() === '') return false;

        this.items[itemId].texto = nuevoTexto.trim();
        this.items[itemId].fechaActualizacion = new Date().toISOString();

        return true;
    }

    /**
     * Marca un item como completado/no completado
     * @param {string} itemId - ID del item
     * @param {boolean} completado - Estado del item
     * @returns {boolean} - True si se actualizó
     */
    marcarItem(itemId, completado = true) {
        if (!this.items[itemId]) return false;

        this.items[itemId].completado = completado;
        this.items[itemId].fechaCompletado = completado ? new Date().toISOString() : null;

        this._calcularProgreso();
        return true;
    }

    /**
     * Elimina un item del checklist
     * @param {string} itemId - ID del item
     * @returns {boolean} - True si se eliminó
     */
    eliminarItem(itemId) {
        if (!this.items[itemId]) return false;

        delete this.items[itemId];
        this._calcularProgreso();
        return true;
    }

    /**
     * Obtiene todos los items como array
     * @returns {Array} - Array de items
     */
    getItemsArray() {
        const itemsArray = [];
        Object.keys(this.items).forEach(id => {
            itemsArray.push({
                id,
                ...this.items[id]
            });
        });

        // Ordenar: primero pendientes, luego completados
        itemsArray.sort((a, b) => {
            if (a.completado === b.completado) return 0;
            return a.completado ? 1 : -1;
        });

        return itemsArray;
    }

    /**
     * Obtiene items pendientes
     * @returns {Array} - Array de items pendientes
     */
    getItemsPendientes() {
        return this.getItemsArray().filter(item => !item.completado);
    }

    /**
     * Obtiene items completados
     * @returns {Array} - Array de items completados
     */
    getItemsCompletados() {
        return this.getItemsArray().filter(item => item.completado);
    }

    // =============================================
    // MÉTODOS DE VISIBILIDAD
    // =============================================

    esVisibleParaUsuario(usuarioId, usuarioAreaId, usuarioCargoId) {
        if (this.tipo === 'general') {
            return true;
        }

        if (this.tipo === 'personal') {
            return this.creadoPor === usuarioId;
        }

        if (this.tipo === 'compartida') {
            return this.usuariosCompartidosIds.includes(usuarioId);
        }

        if (this.tipo === 'area') {
            if (this.areaId && this.areaId !== usuarioAreaId) {
                return false;
            }
            if (this.cargosIds && this.cargosIds.length > 0) {
                return this.cargosIds.includes(usuarioCargoId);
            }
            return true;
        }

        return false;
    }

    // =============================================
    // MÉTODOS DE FORMATEO
    // =============================================

    getFechaCreacionFormateada() {
        return this._formatearFecha(this.fechaCreacion);
    }

    getFechaActualizacionFormateada() {
        return this._formatearFecha(this.fechaActualizacion);
    }

    getProgresoTexto() {
        return `${this.itemsCompletados} de ${this.totalItems} completados (${this.porcentajeCompletado}%)`;
    }

    toFirestore() {
        return {
            nombreActividad: this.nombreActividad,
            descripcion: this.descripcion,
            items: this.items,
            tipo: this.tipo,
            usuariosCompartidosIds: this.usuariosCompartidosIds,
            areaId: this.areaId,
            cargosIds: this.cargosIds,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            creadoPorNombre: this.creadoPorNombre,
            actualizadoPor: this.actualizadoPor,
            actualizadoPorNombre: this.actualizadoPorNombre,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion,
            totalItems: this.totalItems,
            itemsCompletados: this.itemsCompletados,
            porcentajeCompletado: this.porcentajeCompletado,
            completada: this.completada
        };
    }

    toUI() {
        return {
            id: this.id,
            nombreActividad: this.nombreActividad,
            descripcion: this.descripcion,
            tipo: this.tipo,
            items: this.getItemsArray(),
            itemsPendientes: this.getItemsPendientes(),
            itemsCompletados: this.getItemsCompletados(),
            totalItems: this.totalItems,
            itemsCompletados: this.itemsCompletados,
            porcentajeCompletado: this.porcentajeCompletado,
            progresoTexto: this.getProgresoTexto(),
            completada: this.completada,
            usuariosCompartidosIds: this.usuariosCompartidosIds,
            areaId: this.areaId,
            cargosIds: this.cargosIds,
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor,
            creadoPorNombre: this.creadoPorNombre,
            actualizadoPor: this.actualizadoPor,
            actualizadoPorNombre: this.actualizadoPorNombre
        };
    }
}

class TareaManager {
    constructor() {
        this.tareas = [];
        this.historialManager = null;
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

    _getCollectionName(organizacionCamelCase) {
        return `tareas_${organizacionCamelCase}`;
    }

    _generarIdFirebase() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 20; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    // =============================================
    // MÉTODOS CRUD PRINCIPALES
    // =============================================

    async crearTarea(tareaData, usuarioActual) {
        try {
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            if (!tareaData.nombreActividad) {
                throw new Error('El nombre de la actividad es requerido');
            }

            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            const tareasCollection = collection(db, collectionName);

            // Procesar items si vienen como array
            let items = {};
            if (tareaData.items && Array.isArray(tareaData.items)) {
                tareaData.items.forEach(itemTexto => {
                    if (itemTexto && itemTexto.trim() !== '') {
                        const itemId = this._generarIdFirebase();
                        items[itemId] = {
                            id: itemId,
                            texto: itemTexto.trim(),
                            completado: false,
                            fechaCompletado: null,
                            fechaCreacion: new Date().toISOString()
                        };
                    }
                });
            } else if (tareaData.items && typeof tareaData.items === 'object') {
                items = JSON.parse(JSON.stringify(tareaData.items));
            }

            const tareaFirestoreData = {
                nombreActividad: tareaData.nombreActividad.trim(),
                descripcion: tareaData.descripcion?.trim() || '',
                items: items,
                tipo: tareaData.tipo || 'personal',
                usuariosCompartidosIds: tareaData.usuariosCompartidosIds || [],
                areaId: tareaData.areaId || '',
                cargosIds: tareaData.cargosIds || [],
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                creadoPorNombre: usuarioActual.nombreCompleto || '',
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            const docRef = await addDoc(tareasCollection, tareaFirestoreData);

            const nuevaTarea = new Tarea(docRef.id, {
                ...tareaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.tareas.unshift(nuevaTarea);

            // Registrar en historial
            const historial = await this._getHistorialManager();
            if (historial) {
                const totalItems = Object.keys(items).length;
                let descripcionExtra = ` (${totalItems} items)`;

                if (tareaData.tipo === 'personal') descripcionExtra = ` personal${descripcionExtra}`;
                if (tareaData.tipo === 'compartida') descripcionExtra = ` compartida con ${tareaData.usuariosCompartidosIds?.length || 0} usuario(s)${descripcionExtra}`;
                if (tareaData.tipo === 'area') descripcionExtra = ` para área${descripcionExtra}`;
                if (tareaData.tipo === 'general') descripcionExtra = ` general${descripcionExtra}`;

                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'crear',
                    modulo: 'tareas',
                    descripcion: `Creó checklist: "${tareaData.nombreActividad}"${descripcionExtra}`,
                    detalles: {
                        tareaId: docRef.id,
                        nombreActividad: tareaData.nombreActividad,
                        tipo: tareaData.tipo,
                        totalItems,
                        usuariosCompartidos: tareaData.usuariosCompartidosIds?.length,
                        areaId: tareaData.areaId
                    }
                });
            }

            return nuevaTarea;

        } catch (error) {
            console.error('Error creando tarea:', error);
            throw error;
        }
    }

    async getTareas(organizacionCamelCase, usuarioActual, filtros = {}) {
        try {
            if (!organizacionCamelCase) return [];

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareasCollection = collection(db, collectionName);

            let constraints = [orderBy("fechaCreacion", "desc")];

            // Filtros opcionales
            if (filtros.tipo && filtros.tipo !== 'todas') {
                constraints.push(where("tipo", "==", filtros.tipo));
            }
            if (filtros.completada !== undefined) {
                constraints.push(where("completada", "==", filtros.completada));
            }

            const tareasQuery = query(tareasCollection, ...constraints);
            const snapshot = await getDocs(tareasQuery);

            const tareas = [];
            snapshot.forEach(doc => {
                try {
                    const tarea = new Tarea(doc.id, doc.data());
                    tareas.push(tarea);
                } catch (error) {
                    console.error('Error procesando tarea:', error);
                }
            });

            // Filtrar por visibilidad
            const tareasFiltradas = tareas.filter(tarea =>
                tarea.esVisibleParaUsuario(
                    usuarioActual.id,
                    usuarioActual.areaAsignadaId,
                    usuarioActual.cargoId
                )
            );

            this.tareas = tareasFiltradas;

            // Registrar en historial (solo lectura)
            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'leer',
                        modulo: 'tareas',
                        descripcion: `Consultó lista de checklists (${tareasFiltradas.length} checklists)`,
                        detalles: { total: tareasFiltradas.length, filtros }
                    });
                }
            }

            return tareasFiltradas;

        } catch (error) {
            console.error('Error obteniendo tareas:', error);
            return [];
        }
    }

    async getTareaById(tareaId, organizacionCamelCase) {
        if (!organizacionCamelCase) return null;

        const tareaInMemory = this.tareas.find(t => t.id === tareaId);
        if (tareaInMemory) return tareaInMemory;

        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareaRef = doc(db, collectionName, tareaId);
            const tareaSnap = await getDoc(tareaRef);

            if (tareaSnap.exists()) {
                const data = tareaSnap.data();
                const tarea = new Tarea(tareaId, { ...data, id: tareaId });
                this.tareas.push(tarea);
                return tarea;
            }
            return null;

        } catch (error) {
            console.error('Error obteniendo tarea por ID:', error);
            return null;
        }
    }

    async actualizarTarea(tareaId, nuevosDatos, usuarioActual, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar tarea');
            }

            const tareaAntes = await this.getTareaById(tareaId, organizacionCamelCase);
            if (!tareaAntes) {
                throw new Error(`Tarea con ID ${tareaId} no encontrada`);
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareaRef = doc(db, collectionName, tareaId);

            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || ''
            };

            delete datosActualizados.id;
            delete datosActualizados.organizacionCamelCase;
            delete datosActualizados.fechaCreacion;

            await updateDoc(tareaRef, datosActualizados);

            // Actualizar caché
            const tareaIndex = this.tareas.findIndex(t => t.id === tareaId);
            if (tareaIndex !== -1) {
                const tareaActual = this.tareas[tareaIndex];
                Object.keys(datosActualizados).forEach(key => {
                    if (key !== 'id') {
                        tareaActual[key] = datosActualizados[key];
                    }
                });
                tareaActual.fechaActualizacion = new Date();
                tareaActual._calcularProgreso();
            }

            // Registrar en historial
            const historial = await this._getHistorialManager();
            if (historial && usuarioActual) {
                const cambios = [];
                if (nuevosDatos.nombreActividad && nuevosDatos.nombreActividad !== tareaAntes.nombreActividad) {
                    cambios.push(`nombre: "${tareaAntes.nombreActividad}" → "${nuevosDatos.nombreActividad}"`);
                }

                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'editar',
                    modulo: 'tareas',
                    descripcion: `Actualizó checklist "${tareaAntes.nombreActividad}" (${cambios.join(', ') || 'sin cambios'})`,
                    detalles: {
                        tareaId,
                        nombreOriginal: tareaAntes.nombreActividad,
                        cambios,
                        datosActualizados: nuevosDatos
                    }
                });
            }

            return await this.getTareaById(tareaId, organizacionCamelCase);

        } catch (error) {
            console.error('Error actualizando tarea:', error);
            throw error;
        }
    }

    async eliminarTarea(tareaId, usuarioActual, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar tarea');
            }

            const tarea = await this.getTareaById(tareaId, organizacionCamelCase);
            if (!tarea) {
                throw new Error(`Tarea con ID ${tareaId} no encontrada`);
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareaRef = doc(db, collectionName, tareaId);

            await deleteDoc(tareaRef);

            const tareaIndex = this.tareas.findIndex(t => t.id === tareaId);
            if (tareaIndex !== -1) {
                this.tareas.splice(tareaIndex, 1);
            }

            const historial = await this._getHistorialManager();
            if (historial && usuarioActual) {
                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'eliminar',
                    modulo: 'tareas',
                    descripcion: `Eliminó checklist: "${tarea.nombreActividad}" (${tarea.totalItems} items)`,
                    detalles: {
                        tareaId,
                        nombreActividad: tarea.nombreActividad,
                        tipo: tarea.tipo,
                        totalItems: tarea.totalItems
                    }
                });
            }

            return true;

        } catch (error) {
            console.error('Error eliminando tarea:', error);
            throw error;
        }
    }

    // =============================================
    // MÉTODOS ESPECÍFICOS PARA MANEJAR ITEMS
    // =============================================

    async agregarItemATarea(tareaId, texto, usuarioActual, organizacionCamelCase) {
        try {
            const tarea = await this.getTareaById(tareaId, organizacionCamelCase);
            if (!tarea) {
                throw new Error('Tarea no encontrada');
            }

            const itemId = tarea.agregarItem(texto);

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareaRef = doc(db, collectionName, tareaId);

            await updateDoc(tareaRef, {
                items: tarea.items,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || ''
            });

            // Actualizar caché
            const tareaIndex = this.tareas.findIndex(t => t.id === tareaId);
            if (tareaIndex !== -1) {
                this.tareas[tareaIndex] = tarea;
            }

            const historial = await this._getHistorialManager();
            if (historial && usuarioActual) {
                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'editar',
                    modulo: 'tareas',
                    descripcion: `Agregó item "${texto}" al checklist "${tarea.nombreActividad}"`,
                    detalles: {
                        tareaId,
                        tareaNombre: tarea.nombreActividad,
                        itemId,
                        itemTexto: texto
                    }
                });
            }

            return itemId;

        } catch (error) {
            console.error('Error agregando item a tarea:', error);
            throw error;
        }
    }

    async marcarItemTarea(tareaId, itemId, completado, usuarioActual, organizacionCamelCase) {
        try {
            const tarea = await this.getTareaById(tareaId, organizacionCamelCase);
            if (!tarea) {
                throw new Error('Tarea no encontrada');
            }

            const item = tarea.items[itemId];
            if (!item) {
                throw new Error('Item no encontrado');
            }

            const estadoAnterior = item.completado;
            tarea.marcarItem(itemId, completado);

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareaRef = doc(db, collectionName, tareaId);

            await updateDoc(tareaRef, {
                items: tarea.items,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || ''
            });

            // Actualizar caché
            const tareaIndex = this.tareas.findIndex(t => t.id === tareaId);
            if (tareaIndex !== -1) {
                this.tareas[tareaIndex] = tarea;
            }

            if (estadoAnterior !== completado) {
                const historial = await this._getHistorialManager();
                if (historial && usuarioActual) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'tareas',
                        descripcion: `${completado ? 'Completó' : 'Desmarcó'} item "${item.texto}" en checklist "${tarea.nombreActividad}"`,
                        detalles: {
                            tareaId,
                            tareaNombre: tarea.nombreActividad,
                            itemId,
                            itemTexto: item.texto,
                            completado
                        }
                    });
                }
            }

            return true;

        } catch (error) {
            console.error('Error marcando item de tarea:', error);
            throw error;
        }
    }

    async eliminarItemTarea(tareaId, itemId, usuarioActual, organizacionCamelCase) {
        try {
            const tarea = await this.getTareaById(tareaId, organizacionCamelCase);
            if (!tarea) {
                throw new Error('Tarea no encontrada');
            }

            const item = tarea.items[itemId];
            if (!item) {
                throw new Error('Item no encontrado');
            }

            const itemTexto = item.texto;
            tarea.eliminarItem(itemId);

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const tareaRef = doc(db, collectionName, tareaId);

            await updateDoc(tareaRef, {
                items: tarea.items,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || ''
            });

            // Actualizar caché
            const tareaIndex = this.tareas.findIndex(t => t.id === tareaId);
            if (tareaIndex !== -1) {
                this.tareas[tareaIndex] = tarea;
            }

            const historial = await this._getHistorialManager();
            if (historial && usuarioActual) {
                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'editar',
                    modulo: 'tareas',
                    descripcion: `Eliminó item "${itemTexto}" del checklist "${tarea.nombreActividad}"`,
                    detalles: {
                        tareaId,
                        tareaNombre: tarea.nombreActividad,
                        itemId,
                        itemTexto
                    }
                });
            }

            return true;

        } catch (error) {
            console.error('Error eliminando item de tarea:', error);
            throw error;
        }
    }

    limpiarCache() {
        this.tareas = [];
    }
}

export { Tarea, TareaManager };