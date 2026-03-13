// incidencia.js - SOLO LA CLASE, SIN LÓGICA DE GENERACIÓN DE PDF

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
            return true;
        } catch (error) {
            console.error('Error eliminando carpeta:', error);
            if (error.code === 'storage/object-not-found') {
                return true;
            }
            throw error;
        }
    }

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
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                creadoPorNombre: usuarioActual.nombreCompleto || '',
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            await setDoc(incidenciaRef, incidenciaData);

            const nuevaIncidencia = new Incidencia(incidenciaId, {
                ...incidenciaData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.incidencias.unshift(nuevaIncidencia);

            const historial = await this._getHistorialManager();
            if (historial) {
                await historial.registrarActividad({
                    usuario: usuarioActual,
                    tipo: 'crear',
                    modulo: 'incidencias',
                    descripcion: `Creó incidencia ${incidenciaId} - ${data.detalles?.substring(0, 50)}...`,
                    detalles: {
                        incidenciaId,
                        sucursalId: data.sucursalId,
                        categoriaId: data.categoriaId,
                        nivelRiesgo: data.nivelRiesgo,
                        totalImagenes: imagenesUrls.length
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

    async actualizarIncidencia(incidenciaId, nuevosDatos, usuarioId, organizacionCamelCase, usuarioActual = null) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar incidencia');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
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
            const incidencias = await this.getIncidenciasByOrganizacion(organizacionCamelCase);

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
                conPDF: incidencias.filter(i => i.pdfUrl).length
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