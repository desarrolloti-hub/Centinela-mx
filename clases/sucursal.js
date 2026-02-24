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
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

// Referencia global al RegionManager (se inicializará cuando sea necesario)
let regionManagerInstance = null;

async function getRegionManager() {
    if (!regionManagerInstance) {
        const { RegionManager } = await import('/clases/region.js');
        regionManagerInstance = new RegionManager();
    }
    return regionManagerInstance;
}

class Sucursal {
    constructor(id, data) {
        this.id = id;
        
        // ===== CAMPOS PRINCIPALES (DIRECTOS) =====
        this.nombre = data.nombre || '';
        this.tipo = data.tipo || '';
        this.contacto = data.contacto || '';
        
        // ===== UBICACIÓN (CAMPOS DIRECTOS) =====
        this.direccion = data.direccion || '';
        this.ciudad = data.ciudad || '';
        this.estado = data.estado || '';
        this.zona = data.zona || '';
        
        // ===== REGIÓN (SOLO ID) =====
        this.regionId = data.regionId || '';
        
        // ===== COORDENADAS (CAMPOS DIRECTOS) =====
        this.latitud = data.latitud || '';
        this.longitud = data.longitud || '';
        
        // ===== METADATOS =====
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.creadoPorEmail = data.creadoPorEmail || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
        
        // ===== FECHAS =====
        this.fechaCreacion = this._convertirFecha(data.fechaCreacion) || new Date();
        this.fechaActualizacion = this._convertirFecha(data.fechaActualizacion) || new Date();
        
        // Cache para datos de región (no se guarda en Firestore)
        this._regionCache = null;
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

    _formatearFecha(date) {
        if (!date) return 'No disponible';
        try {
            const fecha = this._convertirFecha(date);
            return fecha.toLocaleDateString('es-MX', {
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    // ===== MÉTODOS DE REGIÓN =====
    
    async getRegion(forceRefresh = false) {
        if (!this.regionId) return null;
        
        if (!this._regionCache || forceRefresh) {
            try {
                const regionManager = await getRegionManager();
                const region = await regionManager.getRegionById(
                    this.regionId, 
                    this.organizacionCamelCase
                );
                this._regionCache = region;
            } catch (error) {
                console.error('Error obteniendo región:', error);
                return null;
            }
        }
        
        return this._regionCache;
    }

    async getRegionNombre() {
        const region = await this.getRegion();
        return region?.nombre || 'No especificada';
    }

    async getRegionInfo() {
        const region = await this.getRegion();
        return {
            id: this.regionId,
            nombre: region?.nombre || 'No especificada',
            color: region?.color || '#808080',
            responsable: region?.responsable || 'No asignado'
        };
    }

    // ===== MÉTODOS DE UBICACIÓN =====

    getUbicacionCompleta() {
        const partes = [];
        if (this.direccion) partes.push(this.direccion);
        if (this.ciudad) partes.push(this.ciudad);
        if (this.estado) partes.push(this.estado);
        if (this.zona) partes.push(`Zona: ${this.zona}`);
        return partes.join(', ') || 'Ubicación no disponible';
    }

    // ===== MÉTODOS DE COORDENADAS =====

    getCoordenadas() {
        return {
            lat: this.latitud,
            lng: this.longitud
        };
    }

    tieneCoordenadas() {
        return this.latitud && this.longitud;
    }

    // ===== MÉTODOS DE CONTACTO =====

    getContactoFormateado() {
        if (!this.contacto) return 'No disponible';
        const telefono = this.contacto.replace(/\D/g, '');
        if (telefono.length === 10) {
            return `${telefono.slice(0,3)} ${telefono.slice(3,6)} ${telefono.slice(6)}`;
        }
        return this.contacto;
    }

    // ===== MÉTODOS DE FECHAS =====

    getFechaCreacionFormateada() {
        return this._formatearFecha(this.fechaCreacion);
    }

    getFechaActualizacionFormateada() {
        return this._formatearFecha(this.fechaActualizacion);
    }

    // ===== MÉTODOS DE CREADOR =====

    getCreadoPorInfo() {
        return {
            id: this.creadoPor,
            email: this.creadoPorEmail,
            nombre: this.creadoPorNombre
        };
    }

    // ===== MÉTODOS PARA FIRESTORE =====

    toFirestore() {
        return {
            // Campos principales
            nombre: this.nombre,
            tipo: this.tipo,
            contacto: this.contacto,
            
            // Ubicación (campos directos)
            direccion: this.direccion,
            ciudad: this.ciudad,
            estado: this.estado,
            zona: this.zona,
            
            // Región (solo ID)
            regionId: this.regionId,
            
            // Coordenadas (campos directos)
            latitud: this.latitud,
            longitud: this.longitud,
            
            // Metadatos
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            creadoPorEmail: this.creadoPorEmail,
            creadoPorNombre: this.creadoPorNombre,
            actualizadoPor: this.actualizadoPor,
            
            // Fechas
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion
        };
    }

    async toUI() {
        const regionInfo = await this.getRegionInfo();
        
        return {
            id: this.id,
            nombre: this.nombre,
            tipo: this.tipo,
            contacto: this.contacto,
            contactoFormateado: this.getContactoFormateado(),
            
            // Ubicación
            direccion: this.direccion,
            ciudad: this.ciudad,
            estado: this.estado,
            zona: this.zona,
            ubicacionCompleta: this.getUbicacionCompleta(),
            
            // Región
            regionId: this.regionId,
            region: regionInfo,
            
            // Coordenadas
            latitud: this.latitud,
            longitud: this.longitud,
            coordenadas: this.getCoordenadas(),
            tieneCoordenadas: this.tieneCoordenadas(),
            
            // Fechas
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            
            // Metadatos
            creadoPor: this.creadoPorNombre || this.creadoPorEmail,
            organizacionCamelCase: this.organizacionCamelCase
        };
    }

    toJSON() {
        return {
            id: this.id,
            ...this.toFirestore()
        };
    }
}

class SucursalManager {
    constructor() {
        this.sucursales = [];
        this.cache = new Map(); // Cache por ID
    }

    _getCollectionName(organizacionCamelCase) {
        return `sucursales_${organizacionCamelCase}`;
    }

    _validarDatosSucursal(sucursalData) {
        const errores = [];

        if (!sucursalData.nombre?.trim()) {
            errores.push('El nombre de la sucursal es obligatorio');
        }

        if (!sucursalData.tipo) {
            errores.push('El tipo de sucursal es obligatorio');
        }

        if (!sucursalData.regionId) {
            errores.push('Debe seleccionar una región');
        }

        if (!sucursalData.estado) {
            errores.push('Debe seleccionar un estado');
        }

        if (!sucursalData.ciudad?.trim()) {
            errores.push('La ciudad es obligatoria');
        }

        if (!sucursalData.direccion?.trim()) {
            errores.push('La dirección es obligatoria');
        }

        if (!sucursalData.contacto?.trim()) {
            errores.push('El teléfono de contacto es obligatorio');
        } else {
            const telefono = sucursalData.contacto.replace(/\D/g, '');
            if (telefono.length < 10) {
                errores.push('El teléfono debe tener al menos 10 dígitos');
            }
        }

        return errores;
    }

    async crearSucursal(sucursalData, userManager) {
        try {
            const usuarioActual = userManager.currentUser;
            
            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            const errores = this._validarDatosSucursal(sucursalData);
            if (errores.length > 0) {
                throw new Error(errores.join('\n'));
            }

            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);

            const existe = await this.verificarSucursalExistente(sucursalData.nombre, organizacion);
            if (existe) {
                throw new Error('Ya existe una sucursal con ese nombre');
            }

            const sucursalesCollection = collection(db, collectionName);

            const sucursalFirestoreData = {
                // Campos principales
                nombre: sucursalData.nombre.trim(),
                tipo: sucursalData.tipo,
                contacto: sucursalData.contacto.trim(),
                
                // Ubicación (campos directos)
                direccion: sucursalData.direccion.trim(),
                ciudad: sucursalData.ciudad.trim(),
                estado: sucursalData.estado,
                zona: sucursalData.zona || '',
                
                // Región (solo ID)
                regionId: sucursalData.regionId,
                
                // Coordenadas (campos directos)
                latitud: sucursalData.latitud || '',
                longitud: sucursalData.longitud || '',
                
                // Metadatos
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                creadoPorEmail: usuarioActual.correoElectronico || usuarioActual.email || '',
                creadoPorNombre: usuarioActual.nombreCompleto || usuarioActual.nombre || '',
                actualizadoPor: usuarioActual.id,
                
                // Fechas (Firestore las asignará)
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            const docRef = await addDoc(sucursalesCollection, sucursalFirestoreData);

            const nuevaSucursal = new Sucursal(docRef.id, {
                ...sucursalFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.sucursales.unshift(nuevaSucursal);
            this.cache.set(docRef.id, nuevaSucursal);

            return nuevaSucursal;

        } catch (error) {
            console.error('Error creando sucursal:', error);
            throw error;
        }
    }

    async getSucursalesByOrganizacion(organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) return [];

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalesCollection = collection(db, collectionName);
            
            const sucursalesQuery = query(
                sucursalesCollection,
                orderBy("fechaCreacion", "desc")
            );

            const snapshot = await getDocs(sucursalesQuery);
            const sucursales = [];

            snapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const sucursal = new Sucursal(doc.id, data);
                    sucursales.push(sucursal);
                    this.cache.set(doc.id, sucursal);
                } catch (error) {
                    console.error('Error procesando sucursal:', error);
                }
            });

            this.sucursales = sucursales;
            return sucursales;

        } catch (error) {
            console.error('Error obteniendo sucursales:', error);
            return [];
        }
    }

    async getSucursalById(sucursalId, organizacionCamelCase) {
        // Verificar cache primero
        if (this.cache.has(sucursalId)) {
            return this.cache.get(sucursalId);
        }

        if (!organizacionCamelCase) return null;

        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalRef = doc(db, collectionName, sucursalId);
            const sucursalSnap = await getDoc(sucursalRef);

            if (sucursalSnap.exists()) {
                const data = sucursalSnap.data();
                const sucursal = new Sucursal(sucursalId, data);
                
                // Actualizar cache
                this.cache.set(sucursalId, sucursal);
                
                // Actualizar array de sucursales si existe
                const index = this.sucursales.findIndex(s => s.id === sucursalId);
                if (index === -1) {
                    this.sucursales.push(sucursal);
                } else {
                    this.sucursales[index] = sucursal;
                }
                
                return sucursal;
            }
            return null;

        } catch (error) {
            console.error('Error obteniendo sucursal por ID:', error);
            return null;
        }
    }

    async actualizarSucursal(sucursalId, nuevosDatos, usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar sucursal');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalRef = doc(db, collectionName, sucursalId);
            const sucursalSnap = await getDoc(sucursalRef);

            if (!sucursalSnap.exists()) {
                throw new Error(`Sucursal con ID ${sucursalId} no encontrada`);
            }

            const datosActuales = sucursalSnap.data();

            if (nuevosDatos.nombre && nuevosDatos.nombre !== datosActuales.nombre) {
                const existe = await this.verificarSucursalExistente(
                    nuevosDatos.nombre, 
                    organizacionCamelCase,
                    sucursalId
                );
                if (existe) {
                    throw new Error('Ya existe otra sucursal con este nombre');
                }
            }

            // Construir objeto de actualización con campos directos
            const datosActualizados = {
                // Solo incluir campos que vienen en nuevosDatos
                ...(nuevosDatos.nombre && { nombre: nuevosDatos.nombre }),
                ...(nuevosDatos.tipo && { tipo: nuevosDatos.tipo }),
                ...(nuevosDatos.contacto && { contacto: nuevosDatos.contacto }),
                
                // Ubicación
                ...(nuevosDatos.direccion && { direccion: nuevosDatos.direccion }),
                ...(nuevosDatos.ciudad && { ciudad: nuevosDatos.ciudad }),
                ...(nuevosDatos.estado && { estado: nuevosDatos.estado }),
                ...(nuevosDatos.zona !== undefined && { zona: nuevosDatos.zona }),
                
                // Región
                ...(nuevosDatos.regionId && { regionId: nuevosDatos.regionId }),
                
                // Coordenadas
                ...(nuevosDatos.latitud !== undefined && { latitud: nuevosDatos.latitud }),
                ...(nuevosDatos.longitud !== undefined && { longitud: nuevosDatos.longitud }),
                
                // Metadatos de actualización
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };

            await updateDoc(sucursalRef, datosActualizados);

            // Actualizar cache
            this.cache.delete(sucursalId);
            
            // Actualizar array de sucursales
            const index = this.sucursales.findIndex(s => s.id === sucursalId);
            if (index !== -1) {
                const sucursalActual = this.sucursales[index];
                Object.assign(sucursalActual, datosActualizados);
                sucursalActual.fechaActualizacion = new Date();
                this.cache.set(sucursalId, sucursalActual);
            }

            return await this.getSucursalById(sucursalId, organizacionCamelCase);

        } catch (error) {
            console.error('Error actualizando sucursal:', error);
            throw error;
        }
    }

    async eliminarSucursal(sucursalId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar sucursal');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalRef = doc(db, collectionName, sucursalId);

            await deleteDoc(sucursalRef);

            // Limpiar cache
            this.cache.delete(sucursalId);
            
            // Eliminar del array
            const index = this.sucursales.findIndex(s => s.id === sucursalId);
            if (index !== -1) {
                this.sucursales.splice(index, 1);
            }

            return true;

        } catch (error) {
            console.error('Error eliminando sucursal:', error);
            throw error;
        }
    }

    async verificarSucursalExistente(nombre, organizacionCamelCase, excluirId = null) {
        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalesCollection = collection(db, collectionName);
            
            const q = query(
                sucursalesCollection,
                where("nombre", "==", nombre)
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) return false;
            
            if (excluirId) {
                for (const doc of snapshot.docs) {
                    if (doc.id !== excluirId) {
                        return true;
                    }
                }
                return false;
            }
            
            return !snapshot.empty;

        } catch (error) {
            console.error('Error verificando sucursal:', error);
            return false;
        }
    }

    async getSucursalesByRegion(regionId, organizacionCamelCase) {
        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalesCollection = collection(db, collectionName);
            
            const q = query(
                sucursalesCollection,
                where("regionId", "==", regionId)
            );
            
            const snapshot = await getDocs(q);
            const sucursales = [];

            snapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const sucursal = new Sucursal(doc.id, data);
                    sucursales.push(sucursal);
                } catch (error) {
                    console.error('Error procesando sucursal:', error);
                }
            });

            return sucursales;

        } catch (error) {
            console.error('Error obteniendo sucursales por región:', error);
            return [];
        }
    }

    async buscarSucursalesPorNombre(termino, organizacionCamelCase) {
        try {
            const sucursales = await this.getSucursalesByOrganizacion(organizacionCamelCase);
            
            const terminoLower = termino.toLowerCase();
            return sucursales.filter(sucursal => 
                sucursal.nombre.toLowerCase().includes(terminoLower) ||
                sucursal.ciudad.toLowerCase().includes(terminoLower) ||
                sucursal.direccion.toLowerCase().includes(terminoLower)
            );

        } catch (error) {
            console.error('Error buscando sucursales:', error);
            return [];
        }
    }

    async getSucursalesConCoordenadas(organizacionCamelCase) {
        try {
            const todas = await this.getSucursalesByOrganizacion(organizacionCamelCase);
            return todas.filter(s => s.tieneCoordenadas());

        } catch (error) {
            console.error('Error obteniendo sucursales con coordenadas:', error);
            return [];
        }
    }

    async getTotalSucursales(organizacionCamelCase) {
        try {
            const sucursales = await this.getSucursalesByOrganizacion(organizacionCamelCase);
            return sucursales.length;
        } catch (error) {
            console.error('Error obteniendo total de sucursales:', error);
            return 0;
        }
    }
}

// ==================== CONSTANTES ====================

const ESTADOS_MEXICO = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
    'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
    'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán',
    'Zacatecas'
];

// ==================== EXPORTS ====================
export { 
    Sucursal, 
    SucursalManager,
    ESTADOS_MEXICO
};