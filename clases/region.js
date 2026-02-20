// region.js - MODIFICADO PARA VALIDAR SUCURSALES ANTES DE ELIMINAR

// ==================== IMPORTS ====================
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
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ==================== CLASE REGION ====================
class Region {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.color = data.color || '#0A2540';
        this.organizacion = data.organizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.fechaCreacion = this._convertirFecha(data.fechaCreacion);
        this.fechaActualizacion = this._convertirFecha(data.fechaActualizacion) || this.fechaCreacion;
        this.creadoPor = data.creadoPor || '';
        this.creadoPorEmail = data.creadoPorEmail || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
    }

    _convertirFecha(fecha) {
        if (!fecha) return null;
        if (fecha && typeof fecha.toDate === 'function') {
            return fecha.toDate();
        }
        if (fecha instanceof Date) {
            return fecha;
        }
        if (typeof fecha === 'string' || typeof fecha === 'number') {
            const date = new Date(fecha);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        if (fecha && typeof fecha === 'object' && 'seconds' in fecha) {
            return new Date(fecha.seconds * 1000);
        }
        console.warn('Formato de fecha no reconocido:', fecha);
        return null;
    }

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

    getColor() {
        return this.color;
    }

    getColorPreview() {
        return `<span style="display: inline-block; width: 16px; height: 16px; background: ${this.color}; border-radius: 50%; margin-right: 5px;"></span>`;
    }

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
class RegionManager {
    constructor() {
        this.regiones = [];
    }

    // ========== MÉTODOS CRUD BÁSICOS ==========

    async createRegion(regionData, organizacionCamelCase, creadorInfo) {
        try {
            if (!regionData.nombre) {
                throw new Error('El nombre de la región es obligatorio');
            }

            const existe = await this.existeRegionPorNombre(regionData.nombre, organizacionCamelCase);
            if (existe) {
                throw new Error('Ya existe una región con este nombre');
            }

            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionesRef = collection(db, coleccionRegiones);

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

            const docRef = await addDoc(regionesRef, regionFirestoreData);

            const nuevaRegion = new Region(docRef.id, {
                ...regionFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

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

    async getRegionesByOrganizacion(organizacionCamelCase) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionesRef = collection(db, coleccionRegiones);
            
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

            this.regiones = regiones;
            return regiones;

        } catch (error) {
            console.error("Error obteniendo regiones:", error);
            return [];
        }
    }

    async getRegionById(id, organizacionCamelCase) {
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

    async updateRegion(id, data, organizacionCamelCase, actualizadoPor) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

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
     * Verifica si una región está siendo utilizada por alguna sucursal
     * @param {string} regionId - ID de la región
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<boolean>} True si tiene sucursales asociadas
     */
    async regionTieneSucursales(regionId, organizacionCamelCase) {
        try {
            const coleccionSucursales = `sucursales_${organizacionCamelCase}`;
            const sucursalesRef = collection(db, coleccionSucursales);
            
            const q = query(
                sucursalesRef,
                where("ubicacion.regionId", "==", regionId)
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error) {
            console.error("Error verificando sucursales de la región:", error);
            // Si hay error, asumimos que no tiene sucursales para no bloquear la eliminación
            return false;
        }
    }

    /**
     * Obtiene las sucursales que están usando una región
     * @param {string} regionId - ID de la región
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<Array>} Lista de sucursales que usan la región
     */
    async getSucursalesDeRegion(regionId, organizacionCamelCase) {
        try {
            const coleccionSucursales = `sucursales_${organizacionCamelCase}`;
            const sucursalesRef = collection(db, coleccionSucursales);
            
            const q = query(
                sucursalesRef,
                where("ubicacion.regionId", "==", regionId)
            );

            const snapshot = await getDocs(q);
            const sucursales = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                sucursales.push({
                    id: doc.id,
                    nombre: data.nombre || 'Sin nombre',
                    tipo: data.tipo || 'Sucursal'
                });
            });

            return sucursales;

        } catch (error) {
            console.error("Error obteniendo sucursales de la región:", error);
            return [];
        }
    }

    /**
     * Elimina permanentemente una región (con validación de sucursales)
     * @param {string} id - ID de la región
     * @param {string} organizacionCamelCase - Nombre de la organización
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async deleteRegion(id, organizacionCamelCase) {
        try {
            // Verificar si la región tiene sucursales asociadas
            const tieneSucursales = await this.regionTieneSucursales(id, organizacionCamelCase);
            
            if (tieneSucursales) {
                const sucursales = await this.getSucursalesDeRegion(id, organizacionCamelCase);
                const nombresSucursales = sucursales.map(s => s.nombre).join(', ');
                
                throw new Error(
                    `No se puede eliminar la región porque tiene ${sucursales.length} sucursal(es) asociada(s): ${nombresSucursales}. ` +
                    `Debe reasignar o eliminar las sucursales primero.`
                );
            }

            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

            await deleteDoc(regionRef);

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

    async buscarRegionesPorNombre(termino, organizacionCamelCase) {
        try {
            const regiones = await this.getRegionesByOrganizacion(organizacionCamelCase);
            
            const terminoLower = termino.toLowerCase();
            return regiones.filter(region => 
                region.nombre.toLowerCase().includes(terminoLower)
            );

        } catch (error) {
            console.error("Error buscando regiones:", error);
            return [];
        }
    }

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