// ==================== IMPORTS ====================
// Importar configuración de Firebase y servicios necesarios
import { db } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where,
    orderBy,
    Timestamp // <-- IMPORTAR TIMESTAMP
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ==================== CLASE REGION ====================
// Clase que representa una región en el sistema
class Region {
    constructor(id, data) {
        // ID único de la región (generado por Firebase)
        this.id = id;

        // Datos básicos de la región
        this.nombre = data.nombre || '';
        this.color = data.color || '#0A2540'; // Color por defecto (azul centinela)

        // Información de organización
        this.organizacion = data.organizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';

        // Fechas y timestamps - CORREGIDO
        this.fechaCreacion = this._convertirFecha(data.fechaCreacion);
        this.fechaActualizacion = this._convertirFecha(data.fechaActualizacion) || this.fechaCreacion;

        // Información de creación y modificación
        this.creadoPor = data.creadoPor || '';
        this.creadoPorEmail = data.creadoPorEmail || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
    }

    // ========== MÉTODOS DE UTILIDAD ==========

    /**
     * Convierte diferentes formatos de fecha a objeto Date
     * @param {any} fecha - Fecha en cualquier formato (Timestamp, Date, string, etc.)
     * @returns {Date|null} Objeto Date o null si no es válido
     */
    _convertirFecha(fecha) {
        if (!fecha) return null;
        
        // Si es Timestamp de Firebase
        if (fecha && typeof fecha.toDate === 'function') {
            return fecha.toDate();
        }
        
        // Si ya es un objeto Date
        if (fecha instanceof Date) {
            return fecha;
        }
        
        // Si es string o número
        if (typeof fecha === 'string' || typeof fecha === 'number') {
            const date = new Date(fecha);
            // Verificar si es una fecha válida
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        
        // Si es un objeto con seconds (Firestore Timestamp)
        if (fecha && typeof fecha === 'object' && 'seconds' in fecha) {
            return new Date(fecha.seconds * 1000);
        }
        
        console.warn('Formato de fecha no reconocido:', fecha);
        return null;
    }

    /**
     * Obtiene la fecha de creación formateada
     * @param {string} locale - Locale para el formato (ej: 'es-MX')
     * @returns {string} Fecha formateada o 'No disponible'
     */
    getFechaCreacionFormateada(locale = 'es-MX') {
        if (!this.fechaCreacion) return 'No disponible';
        
        try {
            return this.fechaCreacion.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha de creación:', error);
            return 'Fecha inválida';
        }
    }

    /**
     * Obtiene la fecha de actualización formateada
     * @param {string} locale - Locale para el formato (ej: 'es-MX')
     * @returns {string} Fecha formateada o 'No disponible'
     */
    getFechaActualizacionFormateada(locale = 'es-MX') {
        if (!this.fechaActualizacion) return 'No disponible';
        
        try {
            return this.fechaActualizacion.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha de actualización:', error);
            return 'Fecha inválida';
        }
    }

    /**
     * Obtiene el color de la región
     * @returns {string} Color en formato hexadecimal
     */
    getColor() {
        return this.color;
    }

    /**
     * Muestra una vista previa del color de la región
     * @returns {string} HTML con un círculo de color
     */
    getColorPreview() {
        return `<span style="display: inline-block; width: 16px; height: 16px; background: ${this.color}; border-radius: 50%; margin-right: 5px;"></span>`;
    }

    /**
     * Obtiene información resumida de la región
     * @returns {Object} Objeto con información básica
     */
    getResumen() {
        return {
            id: this.id,
            nombre: this.nombre,
            color: this.color,
            organizacion: this.organizacion
        };
    }
}

// ==================== CLASE REGIONMANAGER ====================
// Clase principal para gestionar regiones en el sistema
class RegionManager {
    constructor() {
        // Array para almacenar regiones en memoria
        this.regiones = [];
    }

    // ========== MÉTODOS CRUD BÁSICOS ==========

    /**
     * Crea una nueva región (Firebase genera el ID automáticamente)
     * @param {Object} regionData - Datos de la región (nombre, color, organizacion)
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @param {Object} creadorInfo - Información del usuario que crea la región
     * @returns {Promise<Object>} Objeto con resultado de la creación
     */
    async createRegion(regionData, organizacionCamelCase, creadorInfo) {
        try {
            // Validar datos obligatorios
            if (!regionData.nombre) {
                throw new Error('El nombre de la región es obligatorio');
            }

            // Verificar si ya existe una región con el mismo nombre
            const existe = await this.existeRegionPorNombre(regionData.nombre, organizacionCamelCase);
            if (existe) {
                throw new Error('Ya existe una región con este nombre');
            }

            // Referencia a la colección
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionesRef = collection(db, coleccionRegiones);

            // Preparar datos para Firestore
            const regionFirestoreData = {
                nombre: regionData.nombre,
                color: regionData.color || '#0A2540',
                organizacion: regionData.organizacion || '',
                organizacionCamelCase: organizacionCamelCase,
                creadoPor: creadorInfo.id || '',
                creadoPorEmail: creadorInfo.email || '',
                creadoPorNombre: creadorInfo.nombre || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            // Guardar en Firestore (addDoc genera ID automáticamente)
            const docRef = await addDoc(regionesRef, regionFirestoreData);

            // Crear instancia local con el ID generado por Firebase
            const nuevaRegion = new Region(docRef.id, {
                ...regionFirestoreData,
                // Para la instancia local usamos fecha actual
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            // Agregar a memoria local
            this.regiones.unshift(nuevaRegion);

            return {
                id: docRef.id,
                region: nuevaRegion,
                success: true
            };

        } catch (error) {
            console.error("Error creando región:", error);
            throw error;
        }
    }

    /**
     * Obtiene todas las regiones de una organización
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<Array<Region>>} Array de regiones
     */
    async getRegionesByOrganizacion(organizacionCamelCase) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            
            // Verificar si la colección existe
            const regionesRef = collection(db, coleccionRegiones);
            
            // Query ordenada por fecha de creación (más recientes primero)
            const regionesQuery = query(
                regionesRef,
                orderBy("fechaCreacion", "desc")
            );

            const snapshot = await getDocs(regionesQuery);
            const regiones = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                regiones.push(new Region(doc.id, data));
            });

            // Actualizar caché local
            this.regiones = regiones;

            return regiones;

        } catch (error) {
            console.error("Error obteniendo regiones:", error);
            return [];
        }
    }

    /**
     * Obtiene una región por su ID
     * @param {string} id - ID de la región
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<Region|null>} Instancia de la región o null
     */
    async getRegionById(id, organizacionCamelCase) {
        // Buscar primero en memoria
        const regionEnMemoria = this.regiones.find(r => r.id === id);
        if (regionEnMemoria) {
            return regionEnMemoria;
        }

        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);
            const regionSnap = await getDoc(regionRef);

            if (regionSnap.exists()) {
                const region = new Region(id, regionSnap.data());
                
                // Actualizar caché
                const index = this.regiones.findIndex(r => r.id === id);
                if (index === -1) {
                    this.regiones.push(region);
                } else {
                    this.regiones[index] = region;
                }
                
                return region;
            }

            return null;

        } catch (error) {
            console.error("Error obteniendo región por ID:", error);
            return null;
        }
    }

    /**
     * Actualiza una región existente
     * @param {string} id - ID de la región
     * @param {Object} data - Datos a actualizar (nombre, color)
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @param {string} actualizadoPor - ID del usuario que actualiza
     * @returns {Promise<boolean>} True si se actualizó correctamente
     */
    async updateRegion(id, data, organizacionCamelCase, actualizadoPor) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

            // Verificar si ya existe otra región con el mismo nombre (si se está actualizando el nombre)
            if (data.nombre) {
                const regionActual = await this.getRegionById(id, organizacionCamelCase);
                if (regionActual && regionActual.nombre !== data.nombre) {
                    const existe = await this.existeRegionPorNombre(data.nombre, organizacionCamelCase);
                    if (existe) {
                        throw new Error('Ya existe otra región con este nombre');
                    }
                }
            }

            const updateData = {
                ...data,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: actualizadoPor || 'sistema'
            };

            await updateDoc(regionRef, updateData);

            // Actualizar en memoria local
            const index = this.regiones.findIndex(r => r.id === id);
            if (index !== -1) {
                Object.keys(data).forEach(key => {
                    this.regiones[index][key] = data[key];
                });
                this.regiones[index].fechaActualizacion = new Date();
                this.regiones[index].actualizadoPor = actualizadoPor || 'sistema';
            }

            return true;

        } catch (error) {
            console.error("Error actualizando región:", error);
            throw error;
        }
    }

    /**
     * Elimina permanentemente una región
     * @param {string} id - ID de la región
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async deleteRegion(id, organizacionCamelCase) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

            await deleteDoc(regionRef);

            // Eliminar de memoria local
            const index = this.regiones.findIndex(r => r.id === id);
            if (index !== -1) {
                this.regiones.splice(index, 1);
            }

            return true;

        } catch (error) {
            console.error("Error eliminando región:", error);
            throw error;
        }
    }

    /**
     * Verifica si ya existe una región con el mismo nombre
     * @param {string} nombre - Nombre a verificar
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<boolean>} True si ya existe
     */
    async existeRegionPorNombre(nombre, organizacionCamelCase) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const q = query(
                collection(db, coleccionRegiones),
                where("nombre", "==", nombre)
            );
            
            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error) {
            console.error("Error verificando nombre de región:", error);
            return false;
        }
    }

    /**
     * Busca regiones por nombre (búsqueda parcial)
     * @param {string} termino - Término de búsqueda
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<Array<Region>>} Array de regiones que coinciden
     */
    async buscarRegionesPorNombre(termino, organizacionCamelCase) {
        try {
            const regiones = await this.getRegionesByOrganizacion(organizacionCamelCase);
            
            // Filtrar en memoria (Firestore no soporta búsqueda parcial nativamente)
            const terminoLower = termino.toLowerCase();
            return regiones.filter(region => 
                region.nombre.toLowerCase().includes(terminoLower)
            );

        } catch (error) {
            console.error("Error buscando regiones:", error);
            return [];
        }
    }

    /**
     * Obtiene el total de regiones
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<number>} Total de regiones
     */
    async getTotalRegiones(organizacionCamelCase) {
        try {
            const regiones = await this.getRegionesByOrganizacion(organizacionCamelCase);
            return regiones.length;
        } catch (error) {
            console.error("Error obteniendo total de regiones:", error);
            return 0;
        }
    }
}

// ==================== EXPORTS ====================
export { Region, RegionManager };