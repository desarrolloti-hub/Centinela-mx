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

class Sucursal {
    constructor(id, data) {
        this.id = id;
        
        // Datos básicos
        this.nombre = data.nombre || '';
        this.tipo = data.tipo || '';
        
        // Ubicación (MAP)
        this.ubicacion = {
            region: data.ubicacion?.region || '',
            regionId: data.ubicacion?.regionId || '',
            regionNombre: data.ubicacion?.regionNombre || '',
            zona: data.ubicacion?.zona || '',
            estado: data.ubicacion?.estado || '',
            ciudad: data.ubicacion?.ciudad || '',
            direccion: data.ubicacion?.direccion || ''
        };
        
        // Contacto
        this.contacto = data.contacto || '';
        
        // Coordenadas (MAP)
        this.coordenadas = {
            latitud: data.coordenadas?.latitud || '',
            longitud: data.coordenadas?.longitud || ''
        };
        
        // Metadatos
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.creadoPorEmail = data.creadoPorEmail || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
        
        // Fechas
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

    getNombreCompleto() {
        return this.nombre;
    }

    getTipo() {
        return this.tipo;
    }

    getUbicacionCompleta() {
        const partes = [];
        if (this.ubicacion.direccion) partes.push(this.ubicacion.direccion);
        if (this.ubicacion.ciudad) partes.push(this.ubicacion.ciudad);
        if (this.ubicacion.estado) partes.push(this.ubicacion.estado);
        if (this.ubicacion.zona) partes.push(`Zona: ${this.ubicacion.zona}`);
        if (this.ubicacion.regionNombre) partes.push(`Región: ${this.ubicacion.regionNombre}`);
        return partes.join(', ');
    }

    getRegionInfo() {
        return {
            id: this.ubicacion.regionId,
            nombre: this.ubicacion.regionNombre
        };
    }

    getCoordenadas() {
        return {
            lat: this.coordenadas.latitud,
            lng: this.coordenadas.longitud
        };
    }

    tieneCoordenadas() {
        return this.coordenadas.latitud && this.coordenadas.longitud;
    }

    getContacto() {
        return this.contacto;
    }

    getContactoFormateado() {
        if (!this.contacto) return 'No disponible';
        const telefono = this.contacto.replace(/\D/g, '');
        if (telefono.length === 10) {
            return `${telefono.slice(0,3)} ${telefono.slice(3,6)} ${telefono.slice(6)}`;
        }
        return this.contacto;
    }

    getFechaCreacionFormateada() {
        return this._formatearFecha(this.fechaCreacion);
    }

    getFechaActualizacionFormateada() {
        return this._formatearFecha(this.fechaActualizacion);
    }

    getCreadoPorInfo() {
        return {
            id: this.creadoPor,
            email: this.creadoPorEmail,
            nombre: this.creadoPorNombre
        };
    }

    toFirestore() {
        return {
            nombre: this.nombre,
            tipo: this.tipo,
            ubicacion: {
                region: this.ubicacion.region,
                regionId: this.ubicacion.regionId,
                regionNombre: this.ubicacion.regionNombre,
                zona: this.ubicacion.zona,
                estado: this.ubicacion.estado,
                ciudad: this.ubicacion.ciudad,
                direccion: this.ubicacion.direccion
            },
            contacto: this.contacto,
            coordenadas: {
                latitud: this.coordenadas.latitud,
                longitud: this.coordenadas.longitud
            },
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            creadoPorEmail: this.creadoPorEmail,
            creadoPorNombre: this.creadoPorNombre,
            actualizadoPor: this.actualizadoPor,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion
        };
    }

    toUI() {
        return {
            id: this.id,
            nombre: this.nombre,
            tipo: this.tipo,
            ubicacion: this.ubicacion,
            ubicacionCompleta: this.getUbicacionCompleta(),
            contacto: this.contacto,
            contactoFormateado: this.getContactoFormateado(),
            coordenadas: this.getCoordenadas(),
            tieneCoordenadas: this.tieneCoordenadas(),
            regionInfo: this.getRegionInfo(),
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
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

        if (!sucursalData.ubicacion?.regionId) {
            errores.push('Debe seleccionar una región');
        }

        if (!sucursalData.ubicacion?.estado) {
            errores.push('Debe seleccionar un estado');
        }

        if (!sucursalData.ubicacion?.ciudad?.trim()) {
            errores.push('La ciudad es obligatoria');
        }

        if (!sucursalData.ubicacion?.direccion?.trim()) {
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
                nombre: sucursalData.nombre.trim(),
                tipo: sucursalData.tipo,
                ubicacion: {
                    region: sucursalData.ubicacion.region || '',
                    regionId: sucursalData.ubicacion.regionId || '',
                    regionNombre: sucursalData.ubicacion.regionNombre || '',
                    zona: sucursalData.ubicacion.zona || '',
                    estado: sucursalData.ubicacion.estado,
                    ciudad: sucursalData.ubicacion.ciudad.trim(),
                    direccion: sucursalData.ubicacion.direccion.trim()
                },
                contacto: sucursalData.contacto.trim(),
                coordenadas: {
                    latitud: sucursalData.coordenadas?.latitud || '',
                    longitud: sucursalData.coordenadas?.longitud || ''
                },
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                creadoPorEmail: usuarioActual.correoElectronico || usuarioActual.email || '',
                creadoPorNombre: usuarioActual.nombreCompleto || usuarioActual.nombre || '',
                actualizadoPor: usuarioActual.id,
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
        if (!organizacionCamelCase) return null;

        const sucursalEnMemoria = this.sucursales.find(s => s.id === sucursalId);
        if (sucursalEnMemoria) return sucursalEnMemoria;

        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const sucursalRef = doc(db, collectionName, sucursalId);
            const sucursalSnap = await getDoc(sucursalRef);

            if (sucursalSnap.exists()) {
                const data = sucursalSnap.data();
                const sucursal = new Sucursal(sucursalId, data);
                
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

            const datosActualizados = {
                nombre: nuevosDatos.nombre || datosActuales.nombre,
                tipo: nuevosDatos.tipo || datosActuales.tipo,
                ubicacion: {
                    region: nuevosDatos.ubicacion?.region || datosActuales.ubicacion?.region || '',
                    regionId: nuevosDatos.ubicacion?.regionId || datosActuales.ubicacion?.regionId || '',
                    regionNombre: nuevosDatos.ubicacion?.regionNombre || datosActuales.ubicacion?.regionNombre || '',
                    zona: nuevosDatos.ubicacion?.zona || datosActuales.ubicacion?.zona || '',
                    estado: nuevosDatos.ubicacion?.estado || datosActuales.ubicacion?.estado || '',
                    ciudad: nuevosDatos.ubicacion?.ciudad || datosActuales.ubicacion?.ciudad || '',
                    direccion: nuevosDatos.ubicacion?.direccion || datosActuales.ubicacion?.direccion || ''
                },
                contacto: nuevosDatos.contacto || datosActuales.contacto,
                coordenadas: {
                    latitud: nuevosDatos.coordenadas?.latitud || datosActuales.coordenadas?.latitud || '',
                    longitud: nuevosDatos.coordenadas?.longitud || datosActuales.coordenadas?.longitud || ''
                },
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };

            await updateDoc(sucursalRef, datosActualizados);

            const index = this.sucursales.findIndex(s => s.id === sucursalId);
            if (index !== -1) {
                const sucursalActual = this.sucursales[index];
                Object.keys(datosActualizados).forEach(key => {
                    if (key !== 'id' && key !== 'fechaActualizacion') {
                        sucursalActual[key] = datosActualizados[key];
                    }
                });
                sucursalActual.fechaActualizacion = new Date();
                sucursalActual.actualizadoPor = usuarioId;
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
                where("ubicacion.regionId", "==", regionId)
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
                sucursal.ubicacion.ciudad.toLowerCase().includes(terminoLower) ||
                sucursal.ubicacion.direccion.toLowerCase().includes(terminoLower)
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