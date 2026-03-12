// permiso.js - VERSIÓN COMPLETA CON CONEXIÓN A FIREBASE
// UBICACIÓN: /clases/permiso.js

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

class Permiso {
    constructor(id, data) {
        this.id = id;
        this.areaId = data.areaId || '';
        this.cargoId = data.cargoId || '';

        // PERMISOS - Controlan visibilidad en el dashboard
        this.permisos = data.permisos || {
            areas: false,
            categorias: false,
            sucursales: false,
            regiones: false,
            incidencias: false
        };

        // Metadatos de organización
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';

        // Fechas
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
    }

    // ========== MÉTODOS DE UTILIDAD ==========

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

    // ========== MÉTODOS DE VERIFICACIÓN ==========

    /**
     * Verifica si tiene acceso a un módulo específico
     * @param {string} modulo - Nombre del módulo (areas, categorias, sucursales, regiones, incidencias)
     * @returns {boolean} - true si tiene acceso, false si no
     */
    puedeAcceder(modulo) {
        return this.permisos[modulo] || false;
    }

    /**
     * Obtiene todos los permisos
     * @returns {Object} - Objeto con todos los permisos
     */
    obtenerTodosLosPermisos() {
        return this.permisos;
    }

    /**
     * Obtiene solo los módulos a los que tiene acceso (true)
     * @returns {Array} - Array con los nombres de los módulos activos
     */
    obtenerModulosActivos() {
        return Object.entries(this.permisos)
            .filter(([_, valor]) => valor === true)
            .map(([modulo]) => modulo);
    }

    /**
     * Cuenta cuántos módulos tiene activos
     * @returns {number} - Número de módulos con acceso true
     */
    contarModulosActivos() {
        return this.obtenerModulosActivos().length;
    }

    /**
     * Verifica si tiene acceso al menos a un módulo
     * @returns {boolean} - true si tiene al menos un módulo activo
     */
    tieneAlgunModulo() {
        return this.contarModulosActivos() > 0;
    }

    // ========== MÉTODOS ESPECÍFICOS POR MÓDULO ==========

    puedeAccederAreas() {
        return this.puedeAcceder('areas');
    }

    puedeAccederCategorias() {
        return this.puedeAcceder('categorias');
    }

    puedeAccederSucursales() {
        return this.puedeAcceder('sucursales');
    }

    puedeAccederRegiones() {
        return this.puedeAcceder('regiones');
    }

    puedeAccederIncidencias() {
        return this.puedeAcceder('incidencias');
    }

    // ========== MÉTODOS DE FIRESTORE ==========

    /**
     * Prepara datos para Firestore (sin campos innecesarios)
     */
    toFirestore() {
        return {
            areaId: this.areaId,
            cargoId: this.cargoId,
            permisos: this.permisos,
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion
        };
    }

    /**
     * Para enviar a Firestore con serverTimestamp (CREACIÓN)
     */
    toFirestoreCreate(usuarioId) {
        return {
            areaId: this.areaId,
            cargoId: this.cargoId,
            permisos: this.permisos,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: usuarioId,
            actualizadoPor: usuarioId,
            fechaCreacion: serverTimestamp(),
            fechaActualizacion: serverTimestamp()
        };
    }

    /**
     * Para actualizar en Firestore
     */
    toFirestoreUpdate(usuarioId) {
        return {
            permisos: this.permisos,
            actualizadoPor: usuarioId,
            fechaActualizacion: serverTimestamp()
        };
    }

    /**
     * Prepara los datos para mostrar en la UI
     * @returns {Object} - Datos formateados para la interfaz
     */
    toUI() {
        return {
            id: this.id,
            areaId: this.areaId,
            cargoId: this.cargoId,
            permisos: this.permisos,
            modulosActivos: this.obtenerModulosActivos(),
            totalModulos: this.contarModulosActivos(),
            tieneAcceso: this.tieneAlgunModulo(),
            organizacion: this.organizacionCamelCase,
            fechaCreacion: this._formatearFecha(this.fechaCreacion),
            fechaActualizacion: this._formatearFecha(this.fechaActualizacion),
            creadoPor: this.creadoPor
        };
    }

    /**
     * Devuelve una representación en string del permiso
     * @returns {string} - Descripción del permiso
     */
    toString() {
        const modulos = this.obtenerModulosActivos();
        if (modulos.length === 0) {
            return `Permiso #${this.id}: Sin acceso a módulos`;
        }
        return `Permiso #${this.id}: Acceso a ${modulos.join(', ')}`;
    }
}

// =============================================
// PERMISO MANAGER CON FIREBASE
// =============================================

class PermisoManager {
    constructor() {
        this.permisos = [];
        this.organizacionNombre = null;
        this.organizacionCamelCase = null;

        // Cargar datos de organización al instanciar
        this._cargarDatosOrganizacion();
    }

    // ========== MÉTODOS PRIVADOS ==========

    _cargarDatosOrganizacion() {
        try {
            // Intentar obtener de adminInfo
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.organizacionNombre = adminData.organizacion || 'Sin organización';
                this.organizacionCamelCase = adminData.organizacionCamelCase ||
                    this._generarCamelCase(this.organizacionNombre);
                return;
            }

            // Intentar obtener de userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            this.organizacionNombre = userData.organizacion || userData.empresa || 'Sin organización';
            this.organizacionCamelCase = userData.organizacionCamelCase ||
                this._generarCamelCase(this.organizacionNombre);

        } catch (error) {
            console.error('Error cargando datos de organización:', error);
            this.organizacionNombre = 'Sin organización';
            this.organizacionCamelCase = 'sinOrganizacion';
        }
    }

    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Genera nombre de colección dinámico (igual que en categorias)
     */
    _getCollectionName(organizacionOverride = null) {
        const orgId = organizacionOverride || this.organizacionCamelCase || 'sinOrganizacion';
        return `permisos_${orgId}`;
    }

    // ========== MÉTODOS CRUD CON FIREBASE ==========

    /**
     * Crea un nuevo permiso - USA addDoc (ID GENERADO POR FIREBASE)
     * @param {Object} permisoData - Datos del permiso
     * @param {Object} userManager - Información del usuario actual
     * @returns {Promise<Permiso>} - Permiso creado
     */
    async crearPermiso(permisoData, userManager) {
        try {
            // Validar datos mínimos
            if (!permisoData.areaId) {
                throw new Error('El área es requerida');
            }
            if (!permisoData.cargoId) {
                throw new Error('El cargo es requerido');
            }

            // Asegurar que tenemos datos de organización
            if (!this.organizacionCamelCase) {
                this._cargarDatosOrganizacion();
            }

            const usuarioActual = userManager?.currentUser || permisoData.usuarioActual;

            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);

            // Verificar si ya existe un permiso para esta área y cargo
            const existe = await this.verificarExistente(
                permisoData.areaId,
                permisoData.cargoId,
                organizacion
            );

            if (existe) {
                throw new Error('Ya existe un permiso configurado para esta área y cargo');
            }

            // Datos para Firestore - SOLO CAMPOS NECESARIOS
            const permisoFirestoreData = {
                areaId: permisoData.areaId,
                cargoId: permisoData.cargoId,
                permisos: permisoData.permisos || {
                    areas: false,
                    categorias: false,
                    sucursales: false,
                    regiones: false,
                    incidencias: false
                },
                creadoPor: usuarioActual.id || usuarioActual.uid || 'sistema',
                actualizadoPor: usuarioActual.id || usuarioActual.uid || 'sistema',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            // Guardar en Firestore CON addDoc (ID AUTOMÁTICO)
            const permisosCollection = collection(db, collectionName);
            const docRef = await addDoc(permisosCollection, permisoFirestoreData);
            const permisoId = docRef.id;

            // Crear instancia para retornar
            const nuevoPermiso = new Permiso(permisoId, {
                ...permisoFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id || usuarioActual.uid,
                actualizadoPor: usuarioActual.id || usuarioActual.uid
            });

            // Agregar a memoria
            this.permisos.unshift(nuevoPermiso);

            return nuevoPermiso;

        } catch (error) {
            console.error('❌ Error creando permiso:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los permisos de una organización
     * @param {string} organizacion - Nombre de la organización
     * @returns {Promise<Array>} - Array de permisos
     */
    async obtenerPorOrganizacion(organizacion) {
        try {
            const orgId = organizacion || this.organizacionCamelCase;

            if (!orgId) {
                return [];
            }

            const collectionName = this._getCollectionName(orgId);

            const permisosCollection = collection(db, collectionName);
            const permisosSnapshot = await getDocs(permisosCollection);
            const permisos = [];

            permisosSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const permiso = new Permiso(doc.id, {
                        ...data,
                        id: doc.id,
                        organizacionCamelCase: orgId
                    });
                    permisos.push(permiso);
                } catch (error) {
                    console.error(`Error procesando permiso ${doc.id}:`, error);
                }
            });

            // Ordenar por fecha
            permisos.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.permisos = permisos;

            return permisos;

        } catch (error) {
            console.error('Error obteniendo permisos:', error);
            return [];
        }
    }

    /**
     * Obtiene un permiso por ID
     * @param {string} id - ID del permiso
     * @returns {Promise<Permiso|null>} - Permiso encontrado o null
     */
    async obtenerPorId(id, organizacionOverride = null) {
        const orgId = organizacionOverride || this.organizacionCamelCase;

        if (!orgId) {
            return null;
        }

        // Buscar en memoria primero
        const permisoInMemory = this.permisos.find(p => p.id === id);
        if (permisoInMemory) return permisoInMemory;

        try {
            const collectionName = this._getCollectionName(orgId);
            const permisoRef = doc(db, collectionName, id);
            const permisoSnap = await getDoc(permisoRef);

            if (permisoSnap.exists()) {
                const data = permisoSnap.data();
                const permiso = new Permiso(id, {
                    ...data,
                    id: id,
                    organizacionCamelCase: orgId
                });
                this.permisos.push(permiso);
                return permiso;
            }

            return null;

        } catch (error) {
            console.error('Error obteniendo permiso:', error);
            return null;
        }
    }

    /**
     * Obtiene permisos por área
     * @param {string} areaId - ID del área
     * @returns {Promise<Array>} - Array de permisos
     */
    async obtenerPorArea(areaId, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId || !areaId) return [];

            const collectionName = this._getCollectionName(orgId);
            const permisosCollection = collection(db, collectionName);

            const q = query(permisosCollection, where("areaId", "==", areaId));
            const querySnapshot = await getDocs(q);
            const permisos = [];

            querySnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const permiso = new Permiso(doc.id, {
                        ...data,
                        id: doc.id,
                        organizacionCamelCase: orgId
                    });
                    permisos.push(permiso);
                } catch (error) {
                    console.error('Error procesando permiso:', error);
                }
            });

            return permisos;

        } catch (error) {
            console.error('Error obteniendo permisos por área:', error);
            return [];
        }
    }

    /**
     * Obtiene permiso por cargo y área específicos
     * @param {string} cargoId - ID del cargo
     * @param {string} areaId - ID del área
     * @returns {Promise<Permiso|null>} - Permiso encontrado o null
     */
    async obtenerPorCargoYArea(cargoId, areaId, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId || !cargoId || !areaId) return null;

            const collectionName = this._getCollectionName(orgId);
            const permisosCollection = collection(db, collectionName);

            const q = query(
                permisosCollection,
                where("cargoId", "==", cargoId),
                where("areaId", "==", areaId)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();
                return new Permiso(doc.id, { ...data, id: doc.id, organizacionCamelCase: orgId });
            }

            return null;

        } catch (error) {
            console.error('Error obteniendo permiso por cargo y área:', error);
            return null;
        }
    }

    /**
     * Actualiza un permiso existente
     * @param {string} id - ID del permiso
     * @param {Object} nuevosPermisos - Nuevos permisos
     * @param {string} usuarioId - ID del usuario que actualiza
     * @param {string} organizacionCamelCase - Organización
     * @returns {Promise<Permiso|null>} - Permiso actualizado o null
     */
    async actualizarPermiso(id, nuevosPermisos, usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar permiso');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const permisoRef = doc(db, collectionName, id);

            const datosActualizados = {
                permisos: nuevosPermisos,
                actualizadoPor: usuarioId,
                fechaActualizacion: serverTimestamp()
            };

            await updateDoc(permisoRef, datosActualizados);

            // Actualizar en memoria
            const permisoIndex = this.permisos.findIndex(p => p.id === id);
            if (permisoIndex !== -1) {
                this.permisos[permisoIndex].permisos = nuevosPermisos;
                this.permisos[permisoIndex].fechaActualizacion = new Date();
                this.permisos[permisoIndex].actualizadoPor = usuarioId;
            }

            return await this.obtenerPorId(id, organizacionCamelCase);

        } catch (error) {
            console.error('Error actualizando permiso:', error);
            throw error;
        }
    }

    /**
     * Elimina un permiso
     * @param {string} id - ID del permiso
     * @returns {Promise<boolean>} - true si se eliminó, false si no
     */
    async eliminarPermiso(id, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) {
                throw new Error('Se requiere ID de organización');
            }

            const collectionName = this._getCollectionName(orgId);
            const permisoRef = doc(db, collectionName, id);

            await deleteDoc(permisoRef);

            // Eliminar de memoria
            const permisoIndex = this.permisos.findIndex(p => p.id === id);
            if (permisoIndex !== -1) {
                this.permisos.splice(permisoIndex, 1);
            }

            return true;

        } catch (error) {
            console.error('Error eliminando permiso:', error);
            throw error;
        }
    }

    /**
     * Verifica si existe un permiso para un cargo y área
     * @param {string} areaId - ID del área
     * @param {string} cargoId - ID del cargo
     * @returns {Promise<boolean>} - true si existe, false si no
     */
    async verificarExistente(areaId, cargoId, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) return false;

            const collectionName = this._getCollectionName(orgId);
            const permisosCollection = collection(db, collectionName);

            const q = query(
                permisosCollection,
                where("areaId", "==", areaId),
                where("cargoId", "==", cargoId)
            );

            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;

        } catch (error) {
            console.error('Error verificando permiso:', error);
            return false;
        }
    }

    /**
     * Carga todos los permisos
     */
    async cargarTodosPermisos() {
        return await this.obtenerPorOrganizacion(this.organizacionCamelCase);
    }

    /**
     * Obtiene todos los permisos (desde caché o Firestore)
     */
    async obtenerTodos() {
        if (this.permisos.length === 0) {
            return await this.cargarTodosPermisos();
        }
        return this.permisos;
    }

    /**
     * Obtiene estadísticas de permisos
     * @returns {Promise<Object>} - Estadísticas
     */
    async obtenerEstadisticas() {
        const permisos = await this.obtenerTodos();
        const total = permisos.length;
        const conAcceso = permisos.filter(p => p.tieneAlgunModulo()).length;
        const sinAcceso = total - conAcceso;

        const estadisticasPorModulo = {};
        const modulos = ['areas', 'categorias', 'sucursales', 'regiones', 'incidencias'];

        modulos.forEach(modulo => {
            const conPermiso = permisos.filter(p => p.puedeAcceder(modulo)).length;
            estadisticasPorModulo[modulo] = {
                activos: conPermiso,
                inactivos: total - conPermiso,
                porcentaje: Math.round((conPermiso / total) * 100) || 0
            };
        });

        return {
            totalPermisos: total,
            usuariosConAcceso: conAcceso,
            usuariosSinAcceso: sinAcceso,
            porcentajeConAcceso: Math.round((conAcceso / total) * 100) || 0,
            estadisticasPorModulo
        };
    }
}

// =============================================
// EXPORTACIONES
// =============================================
export { Permiso, PermisoManager };