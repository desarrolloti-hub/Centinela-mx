// incidencia.js - VERSIÓN COMPLETA CON SOPORTE PARA STORAGE
// CLASE Incidencia (modelo) e IncidenciaManager (controlador)

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

// ============================================
// CLASE INCIDENCIA (MODELO)
// ============================================
class Incidencia {
    // ===== CONSTRUCTOR =====
    constructor(id, data) {
        this.id = id;
        
        // ===== IDs para acceder a información relacionada =====
        this.sucursalId = data.sucursalId || '';
        this.reportadoPorId = data.reportadoPorId || '';
        this.categoriaId = data.categoriaId || '';
        this.subcategoriaId = data.subcategoriaId || '';
        
        // ===== FECHAS =====
        this.fechaInicio = data.fechaInicio ? this._convertirFecha(data.fechaInicio) : new Date();
        this.fechaFinalizacion = data.fechaFinalizacion ? this._convertirFecha(data.fechaFinalizacion) : null;
        
        // ===== NIVEL DE RIESGO =====
        this.nivelRiesgo = data.nivelRiesgo || 'bajo';
        
        // ===== ESTADO =====
        this.estado = data.estado || 'pendiente';
        
        // ===== DESCRIPCIÓN =====
        this.detalles = data.detalles || '';
        
        // ===== IMÁGENES =====
        this.imagenes = data.imagenes || [];
        
        // ===== SEGUIMIENTO (MAP) =====
        this.seguimiento = {};
        if (data.seguimiento) {
            this.seguimiento = JSON.parse(JSON.stringify(data.seguimiento));
        }
        
        // ===== METADATOS =====
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.actualizadoPorNombre = data.actualizadoPorNombre || '';
        
        // ===== FECHAS DE AUDITORÍA =====
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
    }

    // ===== MÉTODOS PRIVADOS =====
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

    _validarDatos() {
        const errores = [];

        if (!this.sucursalId) {
            errores.push('La sucursal es obligatoria');
        }

        if (!this.reportadoPorId) {
            errores.push('El reportante es obligatorio');
        }

        if (!this.categoriaId) {
            errores.push('La categoría es obligatoria');
        }

        if (!this.nivelRiesgo) {
            errores.push('El nivel de riesgo es obligatorio');
        } else {
            const riesgosValidos = ['bajo', 'medio', 'alto', 'critico'];
            if (!riesgosValidos.includes(this.nivelRiesgo)) {
                errores.push('Nivel de riesgo no válido');
            }
        }

        if (!this.detalles?.trim()) {
            errores.push('Los detalles son obligatorios');
        }

        return errores;
    }

    _generarIdSeguimiento() {
        return `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // ===== MÉTODOS DE RUTAS DE STORAGE =====
    getRutaStorageBase() {
        return `incidencias_${this.organizacionCamelCase}/${this.id}`;
    }

    getRutaImagenes() {
        return `${this.getRutaStorageBase()}/imagenes`;
    }

    getRutaSeguimiento() {
        return `${this.getRutaStorageBase()}/seguimiento`;
    }

    // ===== MÉTODOS DE SEGUIMIENTO =====
    agregarSeguimiento(usuarioId, usuarioNombre, descripcion, evidencias = []) {
        const seguimientoId = this._generarIdSeguimiento();
        
        this.seguimiento[seguimientoId] = {
            usuarioId,
            usuarioNombre,
            descripcion,
            evidencias,
            fecha: new Date()
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
                return fechaB - fechaA;
            });
        }
        return seguimientosArray;
    }

    getUltimoSeguimiento() {
        const seguimientos = this.getSeguimientosArray();
        return seguimientos.length > 0 ? seguimientos[0] : null;
    }

    // ===== MÉTODOS DE FORMATEO =====
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

    getFechaInicioFormateada() { return this._formatearFecha(this.fechaInicio); }
    getFechaFinalizacionFormateada() { return this._formatearFecha(this.fechaFinalizacion) || 'No finalizada'; }
    getFechaCreacionFormateada() { return this._formatearFecha(this.fechaCreacion); }

    // ===== MÉTODO TOJSON =====
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
            totalSeguimientos: this.getSeguimientosArray().length,
            ultimoSeguimiento: this.getUltimoSeguimiento(),
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            creadoPorNombre: this.creadoPorNombre,
            fechaCreacion: this.getFechaCreacionFormateada()
        };
    }
}

// ============================================
// CLASE INCIDENCIA MANAGER (CONTROLADOR)
// ============================================
class IncidenciaManager {
    constructor() {
        this.incidencias = [];
    }

    _getCollectionName(organizacionCamelCase) {
        return `incidencias_${organizacionCamelCase}`;
    }

    _generarIdFirebase() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 20; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    _generarIdIncidencia(organizacionCamelCase) {
        const now = new Date();
        const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hora = now.toTimeString().slice(0, 8).replace(/:/g, '');
        return `INC-${organizacionCamelCase}-${fecha}-${hora}`;
    }

    // ===== MÉTODOS DE STORAGE =====

    /**
     * Sube un archivo a Firebase Storage
     */
    async subirArchivo(file, rutaCompleta, onProgress = null) {
        try {
            const storageRef = ref(storage, rutaCompleta);
            
            if (onProgress) {
                // Subida con progreso
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
                // Subida simple
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

    /**
     * Elimina un archivo de Storage
     */
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

    /**
     * Elimina todos los archivos de una carpeta en Storage
     */
    async eliminarCarpetaStorage(rutaCarpeta) {
        try {
            const folderRef = ref(storage, rutaCarpeta);
            const result = await listAll(folderRef);
            
            // Eliminar archivos
            const deletePromises = [];
            result.items.forEach(itemRef => {
                deletePromises.push(deleteObject(itemRef));
            });
            
            // Eliminar archivos en subcarpetas (recursivo)
            result.prefixes.forEach(folderRef => {
                deletePromises.push(this.eliminarCarpetaStorage(folderRef.fullPath));
            });
            
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error eliminando carpeta:', error);
            // Si la carpeta no existe, ignoramos el error
            if (error.code === 'storage/object-not-found') {
                return true;
            }
            throw error;
        }
    }

    // ===== MÉTODOS CRUD PRINCIPALES =====

    /**
     * Crear una nueva incidencia
     */
    async crearIncidencia(data, usuarioActual, archivos = []) {
        try {
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);
            const incidenciasCollection = collection(db, collectionName);
            
            // Generar ID personalizado para la incidencia
            const incidenciaId = this._generarIdIncidencia(organizacion);
            const incidenciaRef = doc(incidenciasCollection, incidenciaId);

            // Subir archivos primero si existen
            let imagenesUrls = [];
            if (archivos.length > 0) {
                for (const file of archivos) {
                    const timestamp = Date.now();
                    const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const rutaStorage = `incidencias_${organizacion}/${incidenciaId}/imagenes/${nombreArchivo}`;
                    
                    const resultado = await this.subirArchivo(file, rutaStorage);
                    imagenesUrls.push(resultado.url);
                }
            }

            // Preparar seguimiento inicial
            let seguimientoInicial = {};
            if (data.detalles) {
                const seguimientoId = this._generarIdFirebase();
                seguimientoInicial[seguimientoId] = {
                    usuarioId: usuarioActual.id,
                    usuarioNombre: usuarioActual.nombreCompleto || 'Usuario',
                    descripcion: 'Incidencia creada',
                    evidencias: [],
                    fecha: serverTimestamp()
                };
            }

            // Datos para Firestore
            const incidenciaData = {
                sucursalId: data.sucursalId,
                reportadoPorId: data.reportadoPorId || usuarioActual.id,
                categoriaId: data.categoriaId,
                subcategoriaId: data.subcategoriaId || '',
                fechaInicio: serverTimestamp(),
                fechaFinalizacion: null,
                nivelRiesgo: data.nivelRiesgo,
                estado: 'pendiente',
                detalles: data.detalles?.trim() || '',
                imagenes: imagenesUrls,
                seguimiento: seguimientoInicial,
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                creadoPorNombre: usuarioActual.nombreCompleto || '',
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            await setDoc(incidenciaRef, incidenciaData);

            // Crear instancia y guardar en memoria
            const nuevaIncidencia = new Incidencia(incidenciaId, {
                ...incidenciaData,
                fechaInicio: new Date(),
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.incidencias.unshift(nuevaIncidencia);
            return nuevaIncidencia;

        } catch (error) {
            console.error('Error creando incidencia:', error);
            throw error;
        }
    }

    /**
     * Obtener incidencia por ID
     */
    async getIncidenciaById(incidenciaId, organizacionCamelCase) {
        if (!organizacionCamelCase) return null;
        
        // Buscar en memoria primero
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

    /**
     * Listar incidencias por organización
     */
    async getIncidenciasByOrganizacion(organizacionCamelCase, filtros = {}) {
        try {
            if (!organizacionCamelCase) return [];
            
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciasCollection = collection(db, collectionName);
            
            // Construir query con filtros
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
            return incidencias;
            
        } catch (error) {
            console.error('Error listando incidencias:', error);
            return [];
        }
    }

    /**
     * Actualizar incidencia
     */
    async actualizarIncidencia(incidenciaId, nuevosDatos, usuarioId, organizacionCamelCase) {
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
            
            // No permitir actualizar ciertos campos
            delete datosActualizados.id;
            delete datosActualizados.organizacionCamelCase;
            delete datosActualizados.fechaCreacion;
            
            await updateDoc(incidenciaRef, datosActualizados);
            
            // Actualizar en memoria
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
            
            return await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            
        } catch (error) {
            console.error('Error actualizando incidencia:', error);
            throw error;
        }
    }

    /**
     * Agregar imágenes a una incidencia existente
     */
    async agregarImagenesAIncidencia(incidenciaId, archivos, usuarioId, usuarioNombre, organizacionCamelCase) {
        try {
            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            if (!incidencia) {
                throw new Error('Incidencia no encontrada');
            }

            const nuevasImagenes = [];
            
            for (const file of archivos) {
                const timestamp = Date.now();
                const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const rutaStorage = `incidencias_${organizacionCamelCase}/${incidenciaId}/imagenes/${nombreArchivo}`;
                
                const resultado = await this.subirArchivo(file, rutaStorage);
                nuevasImagenes.push(resultado.url);
            }

            // Actualizar en Firestore
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            
            const imagenesActualizadas = [...(incidencia.imagenes || []), ...nuevasImagenes];
            
            await updateDoc(incidenciaRef, {
                imagenes: imagenesActualizadas,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId,
                actualizadoPorNombre: usuarioNombre
            });

            // Actualizar en memoria
            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias[incidenciaIndex].imagenes = imagenesActualizadas;
                this.incidencias[incidenciaIndex].fechaActualizacion = new Date();
                this.incidencias[incidenciaIndex].actualizadoPor = usuarioId;
                this.incidencias[incidenciaIndex].actualizadoPorNombre = usuarioNombre;
            }

            return nuevasImagenes;

        } catch (error) {
            console.error('Error agregando imágenes:', error);
            throw error;
        }
    }

    /**
     * Agregar seguimiento con evidencias
     */
    async agregarSeguimiento(incidenciaId, usuarioId, usuarioNombre, descripcion, archivos = [], organizacionCamelCase) {
        try {
            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            if (!incidencia) {
                throw new Error('Incidencia no encontrada');
            }

            // Generar ID para el seguimiento
            const seguimientoId = this._generarIdFirebase();
            
            // Subir evidencias si hay archivos
            const evidenciasUrls = [];
            if (archivos.length > 0) {
                for (const file of archivos) {
                    const timestamp = Date.now();
                    const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const rutaStorage = `incidencias_${organizacionCamelCase}/${incidenciaId}/seguimiento/${seguimientoId}/${nombreArchivo}`;
                    
                    const resultado = await this.subirArchivo(file, rutaStorage);
                    evidenciasUrls.push(resultado.url);
                }
            }

            // Preparar nuevo seguimiento
            const nuevoSeguimiento = {
                usuarioId,
                usuarioNombre,
                descripcion,
                evidencias: evidenciasUrls,
                fecha: serverTimestamp()
            };

            // Actualizar en Firestore
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

            // Actualizar en memoria
            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias[incidenciaIndex].seguimiento = seguimientoActualizado;
                this.incidencias[incidenciaIndex].fechaActualizacion = new Date();
                this.incidencias[incidenciaIndex].actualizadoPor = usuarioId;
                this.incidencias[incidenciaIndex].actualizadoPorNombre = usuarioNombre;
            }

            return seguimientoId;

        } catch (error) {
            console.error('Error agregando seguimiento:', error);
            throw error;
        }
    }

    /**
     * Finalizar incidencia
     */
    async finalizarIncidencia(incidenciaId, usuarioId, usuarioNombre, descripcionCierre = '', organizacionCamelCase) {
        try {
            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            if (!incidencia) {
                throw new Error('Incidencia no encontrada');
            }

            if (incidencia.estado === 'finalizada') {
                throw new Error('La incidencia ya está finalizada');
            }

            const seguimientoId = this._generarIdFirebase();
            const fechaFinalizacion = new Date();

            const nuevoSeguimiento = {
                usuarioId,
                usuarioNombre,
                descripcion: descripcionCierre || 'Incidencia finalizada',
                evidencias: [],
                fecha: serverTimestamp()
            };

            const seguimientoActualizado = {
                ...incidencia.seguimiento,
                [seguimientoId]: nuevoSeguimiento
            };

            // Actualizar en Firestore
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);

            await updateDoc(incidenciaRef, {
                estado: 'finalizada',
                fechaFinalizacion: serverTimestamp(),
                seguimiento: seguimientoActualizado,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId,
                actualizadoPorNombre: usuarioNombre
            });

            // Actualizar en memoria
            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias[incidenciaIndex].estado = 'finalizada';
                this.incidencias[incidenciaIndex].fechaFinalizacion = fechaFinalizacion;
                this.incidencias[incidenciaIndex].seguimiento = seguimientoActualizado;
                this.incidencias[incidenciaIndex].fechaActualizacion = fechaFinalizacion;
                this.incidencias[incidenciaIndex].actualizadoPor = usuarioId;
                this.incidencias[incidenciaIndex].actualizadoPorNombre = usuarioNombre;
            }

            return true;

        } catch (error) {
            console.error('Error finalizando incidencia:', error);
            throw error;
        }
    }

    /**
     * Eliminar incidencia (incluye archivos de Storage)
     */
    async eliminarIncidencia(incidenciaId, usuarioId, organizacionCamelCase, eliminarArchivos = true) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar incidencia');
            }

            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            
            // Eliminar archivos de Storage si se solicita
            if (eliminarArchivos && incidencia) {
                const rutaStorage = `incidencias_${organizacionCamelCase}/${incidenciaId}`;
                await this.eliminarCarpetaStorage(rutaStorage);
            }

            // Eliminar de Firestore
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            await deleteDoc(incidenciaRef);

            // Eliminar de memoria
            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias.splice(incidenciaIndex, 1);
            }

            return true;

        } catch (error) {
            console.error('Error eliminando incidencia:', error);
            throw error;
        }
    }

    /**
     * Eliminar una imagen específica
     */
    async eliminarImagenIncidencia(incidenciaId, urlImagen, usuarioId, usuarioNombre, organizacionCamelCase) {
        try {
            const incidencia = await this.getIncidenciaById(incidenciaId, organizacionCamelCase);
            if (!incidencia) {
                throw new Error('Incidencia no encontrada');
            }

            // Eliminar de Storage
            await this.eliminarArchivo(urlImagen);

            // Actualizar array de imágenes en Firestore
            const imagenesActualizadas = (incidencia.imagenes || []).filter(img => img !== urlImagen);

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciaRef = doc(db, collectionName, incidenciaId);

            await updateDoc(incidenciaRef, {
                imagenes: imagenesActualizadas,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId,
                actualizadoPorNombre: usuarioNombre
            });

            // Actualizar en memoria
            const incidenciaIndex = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (incidenciaIndex !== -1) {
                this.incidencias[incidenciaIndex].imagenes = imagenesActualizadas;
                this.incidencias[incidenciaIndex].fechaActualizacion = new Date();
                this.incidencias[incidenciaIndex].actualizadoPor = usuarioId;
                this.incidencias[incidenciaIndex].actualizadoPorNombre = usuarioNombre;
            }

            return true;

        } catch (error) {
            console.error('Error eliminando imagen:', error);
            throw error;
        }
    }

    // ===== MÉTODOS DE CONSULTA =====

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
                totalSeguimientos: incidencias.reduce((acc, i) => acc + i.getSeguimientosArray().length, 0)
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return null;
        }
    }

    /**
     * Verificar si existe una incidencia (por ID)
     */
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

    /**
     * Limpiar caché de memoria
     */
    limpiarCache() {
        this.incidencias = [];
    }
}

// ===== EXPORT =====
export { Incidencia, IncidenciaManager };