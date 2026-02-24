// incidencia.js - CLASE ÚNICA que maneja todo

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
        this.nivelRiesgo = data.nivelRiesgo || 'bajo'; // bajo, medio, alto, critico
        
        // ===== ESTADO =====
        this.estado = data.estado || 'pendiente'; // pendiente, finalizada
        
        // ===== DESCRIPCIÓN =====
        this.detalles = data.detalles || '';
        
        // ===== IMÁGENES =====
        this.imagenes = data.imagenes || []; // Array de rutas en Storage
        
        // ===== SEGUIMIENTO (MAP) =====
        // Estructura: { idSeguimiento: { usuarioId, usuarioNombre, descripcion, evidencias, fecha } }
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

    _getCollectionName() {
        if (!this.organizacionCamelCase) {
            throw new Error('Organización no especificada');
        }
        return `incidencias_${this.organizacionCamelCase}`;
    }

    _generarIdIncidencia() {
        // Formato: INC-CamelCase-YYYYMMDD-HHMMSS
        const now = new Date();
        const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hora = now.toTimeString().slice(0, 8).replace(/:/g, '');
        return `INC-${this.organizacionCamelCase}-${fecha}-${hora}`;
    }

    _generarIdSeguimiento() {
        return `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

    // ===== MÉTODOS DE RUTAS DE STORAGE =====
    getRutaStorageBase() {
        return `incidencias${this.organizacionCamelCase}/${this.id}`;
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
            // Ordenar por fecha descendente
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

    getFechaInicioFormateada() {
        if (!this.fechaInicio) return 'No disponible';
        try {
            return this.fechaInicio.toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    getFechaFinalizacionFormateada() {
        if (!this.fechaFinalizacion) return 'No finalizada';
        try {
            return this.fechaFinalizacion.toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    getFechaCreacionFormateada() {
        if (!this.fechaCreacion) return 'No disponible';
        try {
            return this.fechaCreacion.toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    // ===== MÉTODOS CRUD ESTÁTICOS =====

    // Crear nueva incidencia (método de clase)
    static async crear(data, usuarioActual) {
        try {
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            // Crear instancia temporal para validación
            const tempIncidencia = new Incidencia('temp', {
                ...data,
                organizacionCamelCase: usuarioActual.organizacionCamelCase,
                creadoPor: usuarioActual.id,
                creadoPorNombre: usuarioActual.nombreCompleto || '',
                reportadoPorId: data.reportadoPorId || usuarioActual.id
            });

            // Validar datos
            const errores = tempIncidencia._validarDatos();
            if (errores.length > 0) {
                throw new Error(errores.join('\n'));
            }

            const collectionName = `incidencias_${usuarioActual.organizacionCamelCase}`;
            const incidenciasCollection = collection(db, collectionName);
            
            // Generar ID personalizado
            const incidenciaId = `INC-${usuarioActual.organizacionCamelCase}-${Date.now()}`;
            const incidenciaRef = doc(incidenciasCollection, incidenciaId);

            // Preparar seguimiento inicial si existe
            let seguimientoInicial = {};
            if (data.seguimientoInicial) {
                const seguimientoId = `seg-${Date.now()}`;
                seguimientoInicial[seguimientoId] = {
                    usuarioId: usuarioActual.id,
                    usuarioNombre: usuarioActual.nombreCompleto || 'Usuario',
                    descripcion: data.seguimientoInicial.descripcion || 'Incidencia creada',
                    evidencias: data.seguimientoInicial.evidencias || [],
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
                imagenes: data.imagenes || [],
                seguimiento: seguimientoInicial,
                organizacionCamelCase: usuarioActual.organizacionCamelCase,
                creadoPor: usuarioActual.id,
                creadoPorNombre: usuarioActual.nombreCompleto || '',
                actualizadoPor: usuarioActual.id,
                actualizadoPorNombre: usuarioActual.nombreCompleto || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            await setDoc(incidenciaRef, incidenciaData);

            // Retornar instancia con fechas simuladas
            return new Incidencia(incidenciaId, {
                ...incidenciaData,
                fechaInicio: new Date(),
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

        } catch (error) {
            console.error('Error creando incidencia:', error);
            throw error;
        }
    }

    // Obtener por ID (método de clase)
    static async obtenerPorId(incidenciaId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) return null;

            const collectionName = `incidencias_${organizacionCamelCase}`;
            const incidenciaRef = doc(db, collectionName, incidenciaId);
            const incidenciaSnap = await getDoc(incidenciaRef);

            if (incidenciaSnap.exists()) {
                return new Incidencia(incidenciaId, incidenciaSnap.data());
            }
            return null;

        } catch (error) {
            console.error('Error obteniendo incidencia:', error);
            return null;
        }
    }

    // Obtener todas por organización (método de clase)
    static async listarPorOrganizacion(organizacionCamelCase, filtros = {}) {
        try {
            if (!organizacionCamelCase) return [];

            const collectionName = `incidencias_${organizacionCamelCase}`;
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

            const incidenciasQuery = query(incidenciasCollection, ...constraints);
            const snapshot = await getDocs(incidenciasQuery);
            
            const incidencias = [];
            snapshot.forEach(doc => {
                incidencias.push(new Incidencia(doc.id, doc.data()));
            });

            return incidencias;

        } catch (error) {
            console.error('Error listando incidencias:', error);
            return [];
        }
    }

    // Métodos de instancia para operaciones CRUD
    async guardar() {
        try {
            const errores = this._validarDatos();
            if (errores.length > 0) {
                throw new Error(errores.join('\n'));
            }

            const collectionName = this._getCollectionName();
            const incidenciaRef = doc(db, collectionName, this.id);

            const data = {
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
                fechaActualizacion: serverTimestamp()
            };

            await updateDoc(incidenciaRef, data);
            this.fechaActualizacion = new Date();
            
            return this;

        } catch (error) {
            console.error('Error guardando incidencia:', error);
            throw error;
        }
    }

    async agregarSeguimientoYGuardar(usuarioId, usuarioNombre, descripcion, evidencias = []) {
        this.agregarSeguimiento(usuarioId, usuarioNombre, descripcion, evidencias);
        this.actualizadoPor = usuarioId;
        this.actualizadoPorNombre = usuarioNombre;
        return await this.guardar();
    }

    async finalizar(usuarioId, usuarioNombre, descripcionCierre = '') {
        this.estado = 'finalizada';
        this.fechaFinalizacion = new Date();
        
        if (descripcionCierre) {
            this.agregarSeguimiento(usuarioId, usuarioNombre, descripcionCierre, []);
        }
        
        this.actualizadoPor = usuarioId;
        this.actualizadoPorNombre = usuarioNombre;
        
        return await this.guardar();
    }

    async eliminar() {
        try {
            const collectionName = this._getCollectionName();
            const incidenciaRef = doc(db, collectionName, this.id);
            await deleteDoc(incidenciaRef);
            return true;
        } catch (error) {
            console.error('Error eliminando incidencia:', error);
            throw error;
        }
    }

    // ===== MÉTODOS DE CONSULTA =====

    static async listarPorSucursal(sucursalId, organizacionCamelCase) {
        return await this.listarPorOrganizacion(organizacionCamelCase, { sucursalId });
    }

    static async listarPorEstado(estado, organizacionCamelCase) {
        return await this.listarPorOrganizacion(organizacionCamelCase, { estado });
    }

    static async listarPorRiesgo(nivelRiesgo, organizacionCamelCase) {
        return await this.listarPorOrganizacion(organizacionCamelCase, { nivelRiesgo });
    }

    static async obtenerEstadisticas(organizacionCamelCase) {
        try {
            const incidencias = await this.listarPorOrganizacion(organizacionCamelCase);
            
            return {
                total: incidencias.length,
                pendientes: incidencias.filter(i => i.estado === 'pendiente').length,
                finalizadas: incidencias.filter(i => i.estado === 'finalizada').length,
                porRiesgo: {
                    bajo: incidencias.filter(i => i.nivelRiesgo === 'bajo').length,
                    medio: incidencias.filter(i => i.nivelRiesgo === 'medio').length,
                    alto: incidencias.filter(i => i.nivelRiesgo === 'alto').length,
                    critico: incidencias.filter(i => i.nivelRiesgo === 'critico').length
                }
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return null;
        }
    }

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
}

// ===== EXPORT =====
export { Incidencia };