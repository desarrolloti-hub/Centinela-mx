// incidencia.js - SOLO LA CLASE, SIN LÓGICA DE GENERACIÓN DE PDF
// VERSIÓN COMPLETA CON REGISTRO DE CONSUMO (FIRESTORE + STORAGE)

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

import {
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

import { db, storage } from '/config/firebase-config.js';
// [MODIFICACIÓN]: Importar la instancia de consumo
import consumo from '/clases/consumoFirebase.js';

class Incidencia {
    constructor(id, data) {
        this.id = id;
        this.sucursalId = data.sucursalId || '';
        this.reportadoPorId = data.reportadoPorId || '';
        this.categoriaId = data.categoriaId || '';
        this.subcategoriaId = data.subcategoriaId || '';
        this.fechaInicio = data.fechaInicio ? this._convertirFecha(data.fechaInicio) : new Date();
        this.fechaFinalizacion = data.fechaFinalizacion ? this._convertirFecha(data.fechaFinalizacion) : null;
        this.nivelRiesgo = data.nivelRiesgo || 'bajo';
        this.estado = data.estado || 'pendiente';
        this.detalles = data.detalles || '';
        this.imagenes = data.imagenes || [];
        this.pdfUrl = data.pdfUrl || '';
        this.seguimiento = {};
        if (data.seguimiento) {
            this.seguimiento = JSON.parse(JSON.stringify(data.seguimiento));
        }

        // === NUEVOS CAMPOS PARA CANALIZACIÓN ===
        this.canalizaciones = data.canalizaciones || {}; // Objeto con áreas destino
        this.canalizacionActiva = data.canalizacionActiva || null; // ID del área actualmente activa
        this.esMultiCanalizada = data.esMultiCanalizada || false; // Si fue canalizada a múltiples áreas
        // ========================================

        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.actualizadoPorNombre = data.actualizadoPorNombre || '';
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
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

    // =============================================
    // NUEVOS MÉTODOS PARA GESTIONAR CANALIZACIONES
    // =============================================

    /**
     * Agrega una canalización a un área específica
     * @param {string} areaId - ID del área destino
     * @param {string} areaNombre - Nombre del área destino
     * @param {string} usuarioId - ID del usuario que canaliza
     * @param {string} usuarioNombre - Nombre del usuario que canaliza
     * @param {string} motivo - Motivo de la canalización
     * @returns {string} - ID de la canalización
     */
    agregarCanalizacion(areaId, areaNombre, usuarioId, usuarioNombre, motivo = '') {
        const canalizacionId = `CAN${Date.now()}_${areaId.replace(/[^a-zA-Z0-9]/g, '_')}`;

        if (!this.canalizaciones) {
            this.canalizaciones = {};
        }

        this.canalizaciones[canalizacionId] = {
            areaId,
            areaNombre,
            canalizadoPor: usuarioId,
            canalizadoPorNombre: usuarioNombre,
            motivo: motivo || 'Atención requerida',
            fechaCanalizacion: new Date(),
            estado: 'pendiente', // pendiente, recibida, finalizada
            seguimientos: []
        };

        // Si no hay canalización activa, establecer esta como activa
        if (!this.canalizacionActiva) {
            this.canalizacionActiva = areaId;
        }

        // Marcar como multi-canalizada si hay más de una
        const totalCanalizaciones = Object.keys(this.canalizaciones).length;
        if (totalCanalizaciones > 1) {
            this.esMultiCanalizada = true;
        }

        return canalizacionId;
    }

    /**
     * Agrega múltiples canalizaciones a la vez
     * @param {Array} areas - Array de objetos {areaId, areaNombre, motivo}
     * @param {string} usuarioId - ID del usuario que canaliza
     * @param {string} usuarioNombre - Nombre del usuario que canaliza
     * @returns {Array} - Array de IDs de canalizaciones creadas
     */
    agregarMultiplesCanalizaciones(areas, usuarioId, usuarioNombre) {
        if (!areas || areas.length === 0) return [];

        const idsCreados = [];

        areas.forEach(area => {
            if (area.areaId && area.areaNombre) {
                const id = this.agregarCanalizacion(
                    area.areaId,
                    area.areaNombre,
                    usuarioId,
                    usuarioNombre,
                    area.motivo || ''
                );
                idsCreados.push(id);
            }
        });

        return idsCreados;
    }

    /**
     * Obtiene todas las canalizaciones como array
     * @returns {Array} - Array de canalizaciones
     */
    getCanalizacionesArray() {
        const canalizacionesArray = [];
        if (this.canalizaciones) {
            Object.keys(this.canalizaciones).forEach(id => {
                canalizacionesArray.push({
                    id,
                    ...this.canalizaciones[id]
                });
            });

            // Ordenar por fecha (más reciente primero)
            canalizacionesArray.sort((a, b) => {
                const fechaA = a.fechaCanalizacion ? new Date(a.fechaCanalizacion) : 0;
                const fechaB = b.fechaCanalizacion ? new Date(b.fechaCanalizacion) : 0;
                return fechaB - fechaA;
            });
        }
        return canalizacionesArray;
    }

    /**
     * Verifica si la incidencia está canalizada a un área específica
     * @param {string} areaId - ID del área a verificar
     * @returns {boolean} - True si está canalizada a esa área
     */
    estaCanalizadaA(areaId) {
        if (!this.canalizaciones) return false;

        return Object.values(this.canalizaciones).some(c => c.areaId === areaId);
    }

    /**
     * Obtiene las áreas a las que está canalizada la incidencia
     * @returns {Array} - Array de objetos {areaId, areaNombre, estado}
     */
    getAreasCanalizadas() {
        const areas = [];
        if (this.canalizaciones) {
            Object.values(this.canalizaciones).forEach(c => {
                areas.push({
                    areaId: c.areaId,
                    areaNombre: c.areaNombre,
                    estado: c.estado,
                    fechaCanalizacion: c.fechaCanalizacion
                });
            });
        }
        return areas;
    }

    /**
     * Actualiza el estado de una canalización
     * @param {string} areaId - ID del área
     * @param {string} nuevoEstado - Nuevo estado (recibida, finalizada, etc.)
     * @returns {boolean} - True si se actualizó correctamente
     */
    actualizarEstadoCanalizacion(areaId, nuevoEstado) {
        if (!this.canalizaciones) return false;

        let actualizado = false;

        Object.keys(this.canalizaciones).forEach(id => {
            if (this.canalizaciones[id].areaId === areaId) {
                this.canalizaciones[id].estado = nuevoEstado;

                // Si el estado es "recibida", activar esta área si no hay otra activa
                if (nuevoEstado === 'recibida' && !this.canalizacionActiva) {
                    this.canalizacionActiva = areaId;
                }

                actualizado = true;
            }
        });

        return actualizado;
    }

    // =============================================
    // MÉTODOS EXISTENTES (SIN MODIFICACIONES)
    // =============================================

    getRutaStorageBase() {
        return `incidencias_${this.organizacionCamelCase}/${this.id}`;
    }

    getRutaImagenes() {
        return `${this.getRutaStorageBase()}/imagenes`;
    }

    getRutaSeguimiento() {
        return `${this.getRutaStorageBase()}/seguimiento`;
    }

    getRutaPDF() {
        return `${this.getRutaStorageBase()}/pdf/incidencia_${this.id}.pdf`;
    }

    agregarSeguimiento(usuarioId, usuarioNombre, descripcion, evidencias = [], fecha = new Date()) {
        const seguimientoCount = Object.keys(this.seguimiento).length;
        const seguimientoId = `SEG${seguimientoCount + 1}`;

        this.seguimiento[seguimientoId] = {
            usuarioId,
            usuarioNombre,
            descripcion,
            evidencias,
            fecha: fecha
        };

        return seguimientoId;
    }

    getSeguimientosArray() {
        const seguimientosArray = [];
        if (this.seguimiento) {
            Object.keys(this.seguimiento).forEach(id => {
                seguimientosArray.push({
                    id,
                    ...this.seguimiento[id]
                });
            });
            seguimientosArray.sort((a, b) => {
                const fechaA = a.fecha ? new Date(a.fecha) : 0;
                const fechaB = b.fecha ? new Date(b.fecha) : 0;
                return fechaA - fechaB;
            });
        }
        return seguimientosArray;
    }

    getUltimoSeguimiento() {
        const seguimientos = this.getSeguimientosArray();
        return seguimientos.length > 0 ? seguimientos[seguimientos.length - 1] : null;
    }

    getPrimerSeguimiento() {
        const seguimientos = this.getSeguimientosArray();
        return seguimientos.length > 0 ? seguimientos[0] : null;
    }

    getNivelRiesgoTexto() {
        const niveles = {
            'bajo': 'Bajo',
            'medio': 'Medio',
            'alto': 'Alto',
            'critico': 'Crítico'
        };
        return niveles[this.nivelRiesgo] || 'Bajo';
    }

    getNivelRiesgoColor() {
        const colores = {
            'bajo': '#28a745',
            'medio': '#ffc107',
            'alto': '#fd7e14',
            'critico': '#dc3545'
        };
        return colores[this.nivelRiesgo] || '#28a745';
    }

    getEstadoTexto() {
        const estados = {
            'pendiente': 'Pendiente',
            'finalizada': 'Finalizada'
        };
        return estados[this.estado] || 'Pendiente';
    }

    getEstadoColor() {
        const colores = {
            'pendiente': '#ffc107',
            'finalizada': '#28a745'
        };
        return colores[this.estado] || '#ffc107';
    }

    getFechaInicioFormateada() {
        return this._formatearFecha(this.fechaInicio);
    }

    getFechaFinalizacionFormateada() {
        return this._formatearFecha(this.fechaFinalizacion) || 'No finalizada';
    }

    getFechaCreacionFormateada() {
        return this._formatearFecha(this.fechaCreacion);
    }

    toJSON() {
        return {
            id: this.id,
            sucursalId: this.sucursalId,
            reportadoPorId: this.reportadoPorId,
            categoriaId: this.categoriaId,
            subcategoriaId: this.subcategoriaId,
            fechaInicio: this.fechaInicio,
            fechaFinalizacion: this.fechaFinalizacion,
            nivelRiesgo: this.nivelRiesgo,
            estado: this.estado,
            detalles: this.detalles,
            imagenes: this.imagenes,
            pdfUrl: this.pdfUrl,
            seguimiento: this.seguimiento,
            // Nuevos campos de canalización
            canalizaciones: this.canalizaciones,
            canalizacionActiva: this.canalizacionActiva,
            esMultiCanalizada: this.esMultiCanalizada,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            creadoPorNombre: this.creadoPorNombre,
            actualizadoPor: this.actualizadoPor,
            actualizadoPorNombre: this.actualizadoPorNombre,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion
        };
    }

    toUI() {
        return {
            id: this.id,
            sucursalId: this.sucursalId,
            reportadoPorId: this.reportadoPorId,
            categoriaId: this.categoriaId,
            subcategoriaId: this.subcategoriaId,
            fechaInicio: this.getFechaInicioFormateada(),
            fechaFinalizacion: this.getFechaFinalizacionFormateada(),
            nivelRiesgo: this.nivelRiesgo,
            nivelRiesgoTexto: this.getNivelRiesgoTexto(),
            nivelRiesgoColor: this.getNivelRiesgoColor(),
            estado: this.estado,
            estadoTexto: this.getEstadoTexto(),
            estadoColor: this.getEstadoColor(),
            detalles: this.detalles,
            imagenes: this.imagenes,
            pdfUrl: this.pdfUrl,
            totalSeguimientos: this.getSeguimientosArray().length,
            ultimoSeguimiento: this.getUltimoSeguimiento(),
            // Nuevos campos de canalización para UI
            canalizaciones: this.getCanalizacionesArray(),
            totalCanalizaciones: this.getCanalizacionesArray().length,
            areasCanalizadas: this.getAreasCanalizadas(),
            esMultiCanalizada: this.esMultiCanalizada,
            canalizacionActiva: this.canalizacionActiva,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            creadoPorNombre: this.creadoPorNombre,
            fechaCreacion: this.getFechaCreacionFormateada()
        };
    }
}

class IncidenciaManager {
    constructor() {
        this.incidencias = [];
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
        return `incidencias_${organizacionCamelCase}`;
    }

    _generarIdIncidencia(organizacionCamelCase) {
        const now = new Date();
        const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hora = now.toTimeString().slice(0, 8).replace(/:/g, '');
        return `INC-${fecha}-${hora}`;
    }

    async subirArchivo(file, rutaCompleta, onProgress = null) {
        try {
            const storageRef = ref(storage, rutaCompleta);

            if (onProgress) {
                return new Promise((resolve, reject) => {
                    const uploadTask = uploadBytesResumable(storageRef, file);

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            onProgress(progress);
                        },
                        (error) => {
                            console.error('Error en subida:', error);
                            reject(error);
                        },
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            
                            // [NUEVO]: Registrar subida en Storage
                            await consumo.registrarStorageSubida(rutaCompleta, file.name);
                            
                            resolve({
                                url: downloadURL,
                                path: rutaCompleta,
                                nombre: file.name,
                                tipo: file.type,
                                tamaño: file.size
                            });
                        }
                    );
                });
            } else {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                
                // [NUEVO]: Registrar subida en Storage
                await consumo.registrarStorageSubida(rutaCompleta, file.name);
                
                return {
                    url: downloadURL,
                    path: rutaCompleta,
                    nombre: file.name,
                    tipo: file.type,
                    tamaño: file.size
                };
            }
        } catch (error) {
            console.error('Error subiendo archivo:', error);
            throw error;
        }
    }

    async eliminarArchivo(urlODirectorio) {
        try {
            const storageRef = ref(storage, urlODirectorio);
            await deleteObject(storageRef);
            
            // [NUEVO]: Registrar eliminación en Storage
            await consumo.registrarStorageEliminacion(urlODirectorio);
            
            return true;
        } catch (error) {
            console.error('Error eliminando archivo:', error);
            throw error;
        }
    }

    async eliminarCarpetaStorage(rutaCarpeta) {
        try {
            const folderRef = ref(storage, rutaCarpeta);
            const result = await listAll(folderRef);

            const deletePromises = [];
            result.items.forEach(itemRef => {
                deletePromises.push(deleteObject(itemRef));
            });

            result.prefixes.forEach(folderRef => {
                deletePromises.push(this.eliminarCarpetaStorage(folderRef.fullPath));
            });

            await Promise.all(deletePromises);
            
            // [NUEVO]: Registrar eliminación de carpeta en Storage
            await consumo.registrarStorageEliminacion(rutaCarpeta);
            
            return true;
        } catch (error) {
            console.error('Error eliminando carpeta:', error);
            if (error.code === 'storage/object-not-found') {
                return true;
            }
            throw error;
        }
    }

    // =============================================
    // MÉTODO MODIFICADO PARA CREAR INCIDENCIA CON CANALIZACIONES Y REGISTRO DE CONSUMO
    // =============================================
    async crearIncidencia(data, usuarioActual, archivos = [], imagenesConDatos = []) {
        try {
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            const incidenciasCollection = collection(db, collectionName);

            const incidenciaId = this._generarIdIncidencia(organizacion);
            const incidenciaRef = doc(incidenciasCollection, incidenciaId);

            let imagenesUrls = [];
            if (archivos.length > 0) {
                for (let i = 0; i < archivos.length; i++) {
                    const file = archivos[i];
                    const comentario = imagenesConDatos[i]?.comentario || '';

                    const timestamp = Date.now();
                    const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const rutaStorage = `incidencias_${organizacion}/${incidenciaId}/imagenes/${nombreArchivo}`;

                    const resultado = await this.subirArchivo(file, rutaStorage);

                    imagenesUrls.push({
                        url: resultado.url,
                        comentario: comentario
                    });
                }
            }

            const fechaInicio = data.fechaInicio || new Date();

            // =============================================
            // NUEVO: Procesar canalizaciones si existen
            // =============================================
            let canalizaciones = {};
            let canalizacionActiva = null;
            let esMultiCanalizada = false;

            if (data.canalizaciones && Array.isArray(data.canalizaciones) && data.canalizaciones.length > 0) {
                data.canalizaciones.forEach((canal, index) => {
                    if (canal.areaId && canal.areaNombre) {
                        const canalId = `CAN${Date.now()}_${index}_${canal.areaId.replace(/[^a-zA-Z0-9]/g, '_')}`;

                        canalizaciones[canalId] = {
                            areaId: canal.areaId,
                            areaNombre: canal.areaNombre,
                            canalizadoPor: usuarioActual.id,
                            canalizadoPorNombre: usuarioActual.nombreCompleto || '',
                            motivo: canal.motivo || 'Atención requerida',
                            fechaCanalizacion: new Date(),
                            estado: 'pendiente',
                            seguimientos: []
                        };

                        // Establecer la primera como activa
                        if (index === 0) {
                            canalizacionActiva = canal.areaId;
                        }
                    }
                });

                esMultiCanalizada = Object.keys(canalizaciones).length > 1;
            }

            const incidenciaData = {
                sucursalId: data.sucursalId,
                reportadoPorId: data.reportadoPorId || usuarioActual.id,
                categoriaId: data.categoriaId,
                subcategoriaId: data.subcategoriaId || '',
                fechaInicio: fechaInicio,
                fechaFinalizacion: null,
                nivelRiesgo: data.nivelRiesgo,
                estado: 'pendiente',
                detalles: data.detalles?.trim() || '',
                imagenes: imagenesUrls,
                pdfUrl: '',
                seguimiento: {},
                // Nuevos campos de canalización
                canalizaciones: canalizaciones,
                canalizacionActiva: canalizacionActiva,
                esMultiCanalizada: esMultiCanalizada,
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                creadoPorNombre: usuarioActual.nombreCompleto || '',
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            // [MODIFICACIÓN]: Registrar ESCRITURA antes de setDoc
            await consumo.registrarFirestoreEscritura(collectionName, incidenciaId);
            await setDoc(incidenciaRef, incidenciaData);

            const nuevaIncidencia = new Incidencia(incidenciaId, {
                ...incidenciaData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.incidencias.unshift(nuevaIncidencia);

            // Registrar en historial
            const historial = await this._getHistorialManager();
            if (historial) {
                const totalCanalizaciones = Object.keys(canalizaciones).length;
                const descripcionCanalizacion = totalCanalizaciones > 0
                    ? ` - Canalizada a ${totalCanalizaciones} área(s)`
                    : '';

                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'crear',
                    modulo: 'incidencias',
                    descripcion: `Creó incidencia ${incidenciaId}${descripcionCanalizacion} - ${data.detalles?.substring(0, 50)}...`,
                    detalles: {
                        incidenciaId,
                        sucursalId: data.sucursalId,
                        categoriaId: data.categoriaId,
                        nivelRiesgo: data.nivelRiesgo,
                        totalImagenes: imagenesUrls.length,
                        totalCanalizaciones: totalCanalizaciones,
                        canalizaciones: Object.values(canalizaciones).map(c => c.areaNombre)
                    }
                });
            }

            return nuevaIncidencia;

        } catch (error) {
            console.error('Error creando incidencia:', error);
            throw error;
        }
    }

    async getIncidenciaById(incidenciaId, organizacionCamelCase) {
        if (!organizacionCamelCase) return null;

        const incidenciaInMemory = this.incidencias.find(inc => inc.id === incidenciaId);
        if (incidenciaInMemory) return incidenciaInMemory;

        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            
            // [MODIFICACIÓN]: Registrar LECTURA antes de getDoc
            await consumo.registrarFirestoreLectura(collectionName, incidenciaId);
            const incidenciaSnap = await getDoc(incidenciaRef);

            if (incidenciaSnap.exists()) {
                const data = incidenciaSnap.data();
                const incidencia = new Incidencia(incidenciaId, { ...data, id: incidenciaId });
                this.incidencias.push(incidencia);
                return incidencia;
            }
            return null;

        } catch (error) {
            console.error('Error obteniendo incidencia:', error);
            return null;
        }
    }

    async getIncidenciasByOrganizacion(organizacionCamelCase, filtros = {}, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) return [];

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciasCollection = collection(db, collectionName);

            let constraints = [orderBy("fechaCreacion", "desc")];

            if (filtros.estado) {
                constraints.push(where("estado", "==", filtros.estado));
            }
            if (filtros.sucursalId) {
                constraints.push(where("sucursalId", "==", filtros.sucursalId));
            }
            if (filtros.nivelRiesgo) {
                constraints.push(where("nivelRiesgo", "==", filtros.nivelRiesgo));
            }
            if (filtros.categoriaId) {
                constraints.push(where("categoriaId", "==", filtros.categoriaId));
            }

            const incidenciasQuery = query(incidenciasCollection, ...constraints);
            
            // [MODIFICACIÓN]: Registrar LECTURA antes de getDocs
            await consumo.registrarFirestoreLectura(collectionName, 'lista incidencias');
            const snapshot = await getDocs(incidenciasQuery);

            const incidencias = [];
            snapshot.forEach(doc => {
                try {
                    const incidencia = new Incidencia(doc.id, doc.data());
                    incidencias.push(incidencia);
                } catch (error) {
                    console.error('Error procesando incidencia:', error);
                }
            });

            this.incidencias = incidencias;

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'leer',
                        modulo: 'incidencias',
                        descripcion: `Consultó lista de incidencias (${incidencias.length} incidencias)`,
                        detalles: { total: incidencias.length, filtros }
                    });
                }
            }

            return incidencias;

        } catch (error) {
            console.error('Error listando incidencias:', error);
            return [];
        }
    }

    // Método auxiliar para filtrar incidencias por área canalizada
    async getIncidenciasPorAreaCanalizada(organizacionCamelCase, areaId, filtros = {}) {
        try {
            const todasIncidencias = await this.getIncidenciasByOrganizacion(organizacionCamelCase, filtros);

            return todasIncidencias.filter(inc => {
                // Verificar si está canalizada al área especificada
                if (!inc.canalizaciones) return false;

                return Object.values(inc.canalizaciones).some(c => c.areaId === areaId);
            });

        } catch (error) {
            console.error('Error filtrando incidencias por área:', error);
            return [];
        }
    }

    async actualizarIncidencia(incidenciaId, nuevosDatos, usuarioId, organizacionCamelCase, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar incidencia');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            
            // [MODIFICACIÓN]: Registrar LECTURA antes de getDoc
            await consumo.registrarFirestoreLectura(collectionName, incidenciaId);
            const incidenciaSnap = await getDoc(incidenciaRef);

            if (!incidenciaSnap.exists()) {
                throw new Error(`Incidencia con ID ${incidenciaId} no encontrada`);
            }

            const datosActuales = incidenciaSnap.data();

            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };

            delete datosActualizados.id;
            delete datosActualizados.organizacionCamelCase;
            delete datosActualizados.fechaCreacion;

            // [MODIFICACIÓN]: Registrar ACTUALIZACIÓN antes de updateDoc
            await consumo.registrarFirestoreActualizacion(collectionName, incidenciaId);
            await updateDoc(incidenciaRef, datosActualizados);

            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                const incidenciaActual = this.incidencias[incidenciaIndex];
                Object.keys(datosActualizados).forEach(key => {
                    if (key !== 'id') {
                        incidenciaActual[key] = datosActualizados[key];
                    }
                });
                incidenciaActual.fechaActualizacion = new Date();
                incidenciaActual.actualizadoPor = usuarioId;
            }

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    const cambios = [];
                    if (datosActuales.estado !== nuevosDatos.estado) {
                        cambios.push(`estado: ${datosActuales.estado} → ${nuevosDatos.estado}`);
                    }
                    if (datosActuales.nivelRiesgo !== nuevosDatos.nivelRiesgo) {
                        cambios.push(`riesgo: ${datosActuales.nivelRiesgo} → ${nuevosDatos.nivelRiesgo}`);
                    }

                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'incidencias',
                        descripcion: `Actualizó incidencia ${incidenciaId} (${cambios.join(', ') || 'sin cambios'})`,
                        detalles: {
                            incidenciaId,
                            cambios,
                            datosActualizados: nuevosDatos
                        }
                    });
                }
            }

            return await this.getIncidenciaById(incidenciaId, organizacionCamelCase);

        } catch (error) {
            console.error('Error actualizando incidencia:', error);
            throw error;
        }
    }

    async agregarSeguimiento(incidenciaId, usuarioId, usuarioNombre, descripcion, archivos = [], organizacionCamelCase, evidenciasConComentarios = [], fechaSeleccionada, usuarioActual = null) {
        try {
            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            if (!incidencia) {
                throw new Error('Incidencia no encontrada');
            }

            const seguimientoCount = Object.keys(incidencia.seguimiento || {}).length;
            const seguimientoId = `SEG${seguimientoCount + 1}`;

            const evidenciasUrls = [];
            if (archivos.length > 0) {
                for (let i = 0; i < archivos.length; i++) {
                    const file = archivos[i];
                    const comentario = evidenciasConComentarios[i]?.comentario || '';

                    const timestamp = Date.now();
                    const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const rutaStorage = `incidencias_${organizacionCamelCase}/${incidenciaId}/seguimiento/${seguimientoId}/${nombreArchivo}`;

                    const resultado = await this.subirArchivo(file, rutaStorage);

                    evidenciasUrls.push({
                        url: resultado.url,
                        comentario: comentario
                    });
                }
            }

            const fechaSeguimiento = fechaSeleccionada || new Date();

            const nuevoSeguimiento = {
                usuarioId,
                usuarioNombre,
                descripcion,
                evidencias: evidenciasUrls,
                fecha: fechaSeguimiento
            };

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);

            const seguimientoActualizado = {
                ...incidencia.seguimiento,
                [seguimientoId]: nuevoSeguimiento
            };

            // [MODIFICACIÓN]: Registrar ACTUALIZACIÓN antes de updateDoc
            await consumo.registrarFirestoreActualizacion(collectionName, incidenciaId);
            await updateDoc(incidenciaRef, {
                seguimiento: seguimientoActualizado,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId,
                actualizadoPorNombre: usuarioNombre
            });

            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias[incidenciaIndex].seguimiento = seguimientoActualizado;
                this.incidencias[incidenciaIndex].fechaActualizacion = new Date();
                this.incidencias[incidenciaIndex].actualizadoPor = usuarioId;
                this.incidencias[incidenciaIndex].actualizadoPorNombre = usuarioNombre;
            }

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'crear',
                        modulo: 'incidencias',
                        descripcion: `Agregó seguimiento a incidencia ${incidenciaId}`,
                        detalles: {
                            incidenciaId,
                            seguimientoId,
                            totalEvidencias: evidenciasUrls.length
                        }
                    });
                }
            }

            return seguimientoId;

        } catch (error) {
            console.error('Error agregando seguimiento:', error);
            throw error;
        }
    }

    async finalizarIncidencia(incidenciaId, usuarioId, usuarioNombre, organizacionCamelCase, usuarioActual = null) {
        try {
            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            if (!incidencia) {
                throw new Error('Incidencia no encontrada');
            }

            if (incidencia.estado === 'finalizada') {
                throw new Error('La incidencia ya está finalizada');
            }

            const fechaFinalizacion = new Date();

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);

            // [MODIFICACIÓN]: Registrar ACTUALIZACIÓN antes de updateDoc
            await consumo.registrarFirestoreActualizacion(collectionName, incidenciaId);
            await updateDoc(incidenciaRef, {
                estado: 'finalizada',
                fechaFinalizacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId,
                actualizadoPorNombre: usuarioNombre
            });

            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias[incidenciaIndex].estado = 'finalizada';
                this.incidencias[incidenciaIndex].fechaFinalizacion = fechaFinalizacion;
                this.incidencias[incidenciaIndex].fechaActualizacion = fechaFinalizacion;
                this.incidencias[incidenciaIndex].actualizadoPor = usuarioId;
                this.incidencias[incidenciaIndex].actualizadoPorNombre = usuarioNombre;
            }

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'editar',
                        modulo: 'incidencias',
                        descripcion: `Finalizó incidencia ${incidenciaId}`,
                        detalles: {
                            incidenciaId,
                            estadoAnterior: 'pendiente',
                            estadoNuevo: 'finalizada'
                        }
                    });
                }
            }

            return true;

        } catch (error) {
            console.error('Error finalizando incidencia:', error);
            throw error;
        }
    }

    async eliminarIncidencia(incidenciaId, usuarioId, organizacionCamelCase, eliminarArchivos = true, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar incidencia');
            }

            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            const detallesIncidencia = incidencia ? incidencia.detalles : '';

            if (eliminarArchivos && incidencia) {
                const rutaStorage = `incidencias_${organizacionCamelCase}/${incidenciaId}`;
                await this.eliminarCarpetaStorage(rutaStorage);
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            
            // [MODIFICACIÓN]: Registrar ELIMINACIÓN antes de deleteDoc
            await consumo.registrarFirestoreEliminacion(collectionName, incidenciaId);
            await deleteDoc(incidenciaRef);

            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias.splice(incidenciaIndex, 1);
            }

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'eliminar',
                        modulo: 'incidencias',
                        descripcion: `Eliminó incidencia ${incidenciaId}`,
                        detalles: {
                            incidenciaId,
                            detalles: detallesIncidencia?.substring(0, 100)
                        }
                    });
                }
            }

            return true;

        } catch (error) {
            console.error('Error eliminando incidencia:', error);
            throw error;
        }
    }

    async getIncidenciasPorSucursal(sucursalId, organizacionCamelCase) {
        return await this.getIncidenciasByOrganizacion(organizacionCamelCase, { sucursalId });
    }

    async getIncidenciasPorEstado(estado, organizacionCamelCase) {
        return await this.getIncidenciasByOrganizacion(organizacionCamelCase, { estado });
    }

    async getIncidenciasPorRiesgo(nivelRiesgo, organizacionCamelCase) {
        return await this.getIncidenciasByOrganizacion(organizacionCamelCase, { nivelRiesgo });
    }

    async getEstadisticas(organizacionCamelCase) {
        try {
            // [MODIFICACIÓN]: Registrar LECTURA para estadísticas
            const collectionName = this._getCollectionName(organizacionCamelCase);
            await consumo.registrarFirestoreLectura(collectionName, 'estadísticas');
            
            const incidencias = await this.getIncidenciasByOrganizacion(organizacionCamelCase);

            // Contar incidencias canalizadas
            const incidenciasCanalizadas = incidencias.filter(i => i.canalizaciones && Object.keys(i.canalizaciones).length > 0);
            const incidenciasMultiCanalizadas = incidencias.filter(i => i.esMultiCanalizada);

            return {
                total: incidencias.length,
                pendientes: incidencias.filter(i => i.estado === 'pendiente').length,
                finalizadas: incidencias.filter(i => i.estado === 'finalizada').length,
                porRiesgo: {
                    bajo: incidencias.filter(i => i.nivelRiesgo === 'bajo').length,
                    medio: incidencias.filter(i => i.nivelRiesgo === 'medio').length,
                    alto: incidencias.filter(i => i.nivelRiesgo === 'alto').length,
                    critico: incidencias.filter(i => i.nivelRiesgo === 'critico').length
                },
                conImagenes: incidencias.filter(i => (i.imagenes || []).length > 0).length,
                totalSeguimientos: incidencias.reduce((acc, i) => acc + i.getSeguimientosArray().length, 0),
                conPDF: incidencias.filter(i => i.pdfUrl).length,
                // Nuevas estadísticas de canalización
                canalizadas: incidenciasCanalizadas.length,
                multiCanalizadas: incidenciasMultiCanalizadas.length,
                totalCanalizaciones: incidencias.reduce((acc, i) => acc + (i.canalizaciones ? Object.keys(i.canalizaciones).length : 0), 0)
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return null;
        }
    }

    async verificarIncidenciaExistente(incidenciaId, organizacionCamelCase) {
        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            
            // [MODIFICACIÓN]: Registrar LECTURA para verificar existencia
            await consumo.registrarFirestoreLectura(collectionName, incidenciaId);
            const incidenciaSnap = await getDoc(incidenciaRef);
            return incidenciaSnap.exists();
        } catch (error) {
            console.error('Error verificando incidencia:', error);
            return false;
        }
    }

    limpiarCache() {
        this.incidencias = [];
    }
}

export { Incidencia, IncidenciaManager };