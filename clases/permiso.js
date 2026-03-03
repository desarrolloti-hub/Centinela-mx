
// permiso.js - VERSIÓN CON PERMISOS GENERALES PARA DASHBOARD

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

        // Permisos generales para el dashboard
        this.permisos = data.permisos || {
            // Módulos principales
            dashboard: false,
            usuarios: false,
            incidencias: false,
            estadisticas: false,
            configuracion: false,

            // Submódulos
            roles: false,
            permisos: false,
            auditoria: false,
            reportes: false,

            // Acciones específicas
            verIncidencias: false,
            gestionarUsuarios: false,
            gestionarRoles: false
        };

        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';

        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
    }

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

    // Método para verificar si tiene acceso a un módulo específico
    tieneAcceso(modulo) {
        return this.permisos[modulo] || false;
    }

    // Método para obtener todos los permisos activos
    getPermisosActivos() {
        return Object.entries(this.permisos)
            .filter(([_, valor]) => valor === true)
            .map(([modulo]) => modulo);
    }

    toFirestore() {
        return {
            areaId: this.areaId,
            cargoId: this.cargoId,
            permisos: this.permisos,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion
        };
    }

    toUI() {
        return {
            id: this.id,
            areaId: this.areaId,
            cargoId: this.cargoId,
            permisos: this.permisos,
            fechaCreacion: this._formatearFecha(this.fechaCreacion),
            fechaActualizacion: this._formatearFecha(this.fechaActualizacion),
            creadoPor: this.creadoPor,
            organizacionCamelCase: this.organizacionCamelCase
        };
    }
}

class PermisoManager {
    constructor() {
        this.permisos = [];
    }

    _getCollectionName(organizacionCamelCase) {
        return `permisos_${organizacionCamelCase}`;
    }

    async crearPermiso(permisoData, userManager) {
        try {
            const usuarioActual = userManager.currentUser;

            if (!usuarioActual || !usuarioActual.organizacionCamelCase) {
                throw new Error('Usuario no tiene organización asignada');
            }

            const organizacion = usuarioActual.organizacionCamelCase;
            const collectionName = this._getCollectionName(organizacion);

            // Verificar si ya existe un permiso para esta área y cargo
            const existe = await this.verificarPermisoExistente(
                permisoData.areaId,
                permisoData.cargoId,
                organizacion
            );

            if (existe) {
                throw new Error('Ya existe un permiso configurado para esta área y cargo');
            }

            const permisosCollection = collection(db, collectionName);

            const permisoFirestoreData = {
                areaId: permisoData.areaId,
                cargoId: permisoData.cargoId,
                permisos: permisoData.permisos || {
                    dashboard: false,
                    usuarios: false,
                    incidencias: false,
                    estadisticas: false,
                    configuracion: false,
                    roles: false,
                    permisos: false,
                    auditoria: false,
                    reportes: false,
                    verIncidencias: false,
                    gestionarUsuarios: false,
                    gestionarRoles: false
                },
                organizacionCamelCase: organizacion,
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            const docRef = await addDoc(permisosCollection, permisoFirestoreData);

            const nuevoPermiso = new Permiso(docRef.id, {
                ...permisoFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.permisos.unshift(nuevoPermiso);
            return nuevoPermiso;

        } catch (error) {
            console.error('Error creando permiso:', error);
            throw error;
        }
    }

    async actualizarPermiso(permisoId, nuevosPermisos, usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para actualizar permiso');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const permisoRef = doc(db, collectionName, permisoId);

            const datosActualizados = {
                permisos: nuevosPermisos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };

            await updateDoc(permisoRef, datosActualizados);

            const permisoIndex = this.permisos.findIndex(p => p.id === permisoId);
            if (permisoIndex !== -1) {
                this.permisos[permisoIndex].permisos = nuevosPermisos;
                this.permisos[permisoIndex].fechaActualizacion = new Date();
                this.permisos[permisoIndex].actualizadoPor = usuarioId;
            }

            return await this.getPermisoById(permisoId, organizacionCamelCase);

        } catch (error) {
            console.error('Error actualizando permiso:', error);
            throw error;
        }
    }

    async getPermisosByOrganizacion(organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) return [];

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const permisosCollection = collection(db, collectionName);
            const permisosSnapshot = await getDocs(permisosCollection);
            const permisos = [];

            permisosSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const permiso = new Permiso(doc.id, { ...data, id: doc.id });
                    permisos.push(permiso);
                } catch (error) {
                    console.error('Error procesando permiso:', error);
                }
            });

            permisos.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.permisos = permisos;

            return permisos;

        } catch (error) {
            console.error('Error obteniendo permisos:', error);
            return [];
        }
    }

    async getPermisosByArea(areaId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase || !areaId) return [];

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const permisosCollection = collection(db, collectionName);

            const q = query(permisosCollection, where("areaId", "==", areaId));
            const querySnapshot = await getDocs(q);
            const permisos = [];

            querySnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const permiso = new Permiso(doc.id, { ...data, id: doc.id });
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

    async getPermisoByCargoYArea(cargoId, areaId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase || !cargoId || !areaId) return null;

            const collectionName = this._getCollectionName(organizacionCamelCase);
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
                return new Permiso(doc.id, { ...data, id: doc.id });
            }

            return null;

        } catch (error) {
            console.error('Error obteniendo permiso por cargo y área:', error);
            return null;
        }
    }

    async getPermisoById(permisoId, organizacionCamelCase) {
        if (!organizacionCamelCase) return null;

        const permisoInMemory = this.permisos.find(p => p.id === permisoId);
        if (permisoInMemory) return permisoInMemory;

        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const permisoRef = doc(db, collectionName, permisoId);
            const permisoSnap = await getDoc(permisoRef);

            if (permisoSnap.exists()) {
                const data = permisoSnap.data();
                const permiso = new Permiso(permisoId, { ...data, id: permisoId });
                this.permisos.push(permiso);
                return permiso;
            }
            return null;

        } catch (error) {
            console.error('Error obteniendo permiso:', error);
            return null;
        }
    }

    async eliminarPermiso(permisoId, usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización para eliminar permiso');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const permisoRef = doc(db, collectionName, permisoId);

            await deleteDoc(permisoRef);

            const permisoIndex = this.permisos.findIndex(p => p.id === permisoId);
            if (permisoIndex !== -1) {
                this.permisos.splice(permisoIndex, 1);
            }

            return true;

        } catch (error) {
            console.error('Error eliminando permiso:', error);
            throw error;
        }
    }

    async verificarPermisoExistente(areaId, cargoId, organizacionCamelCase) {
        try {
            const collectionName = this._getCollectionName(organizacionCamelCase);
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
}

export { Permiso, PermisoManager };