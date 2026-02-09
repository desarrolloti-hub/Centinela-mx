// ==================== area.js ====================
// CLASE CORREGIDA - IMPLEMENTACIONES COMPLETAS

import { 
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '../config/firebase-config.js';

// ==================== CLASE AREA ====================
class Area {
    constructor(id, data) {
        this.id = id;
        this.nombreArea = data.nombreArea || '';
        this.descripcion = data.descripcion || '';
        this.caracteristicas = data.caracteristicas || '';
        
        // Cargos
        this.cargos = data.cargos || new Map();
        
        if (data.cargos && !(data.cargos instanceof Map)) {
            if (Array.isArray(data.cargos)) {
                this.cargos = new Map();
                data.cargos.forEach(cargo => {
                    if (cargo && cargo.id) {
                        this.cargos.set(cargo.id, cargo);
                    }
                });
            } else if (typeof data.cargos === 'object') {
                this.cargos = new Map(Object.entries(data.cargos));
            }
        }
        
        this.idOrganizacion = data.idOrganizacion || '';
        this.nombreOrganizacion = data.nombreOrganizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
        this.fechaEliminacion = data.fechaEliminacion ? this._convertirFecha(data.fechaEliminacion) : null;
        this.activo = data.activo !== undefined ? data.activo : true;
        this.eliminado = data.eliminado || false;
        this.color = data.color || this._generarColorAleatorio();
        this.icono = data.icono || 'fas fa-building';
        this.capacidadMaxima = data.capacidadMaxima || 0;
        this.presupuestoAnual = data.presupuestoAnual || 0;
        this.objetivos = data.objetivos || [];
        this.metricas = data.metricas || {};
    }

    // Métodos de utilidad
    _convertirFecha(fecha) {
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string' || typeof fecha === 'number') return new Date(fecha);
        return new Date();
    }
    
    _generarColorAleatorio() {
        const colores = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
        return colores[Math.floor(Math.random() * colores.length)];
    }

    _formatearFecha(date) {
        if (!date) return 'No disponible';
        try {
            const fecha = this._convertirFecha(date);
            return fecha.toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    }

    _mapToObject(map) {
        const obj = {};
        for (let [key, value] of map) {
            obj[key] = value;
        }
        return obj;
    }

    // Getters importantes
    getCantidadCargos() { return this.cargos.size; }
    getCargosActivos() {
        const cargosActivos = [];
        for (let [id, cargo] of this.cargos) {
            if (cargo.activo !== false) {
                cargosActivos.push({ id, ...cargo });
            }
        }
        return cargosActivos;
    }
    getCargosAsArray() {
        const cargosArray = [];
        for (let [id, cargo] of this.cargos) {
            cargosArray.push({ id, ...cargo });
        }
        return cargosArray;
    }
    getEstado() {
        if (this.eliminado) return 'Eliminado';
        else if (!this.activo) return 'Inactivo';
        else return 'Activo';
    }
    getEstadoBadge() {
        if (this.eliminado) return '<span class="badge bg-danger"><i class="fas fa-trash me-1"></i> Eliminado</span>';
        else if (!this.activo) return '<span class="badge bg-warning text-dark"><i class="fas fa-pause me-1"></i> Inactivo</span>';
        else return '<span class="badge bg-success"><i class="fas fa-check me-1"></i> Activo</span>';
    }
    getFechaCreacionFormateada() { return this._formatearFecha(this.fechaCreacion); }
    estaActiva() { return this.activo && !this.eliminado; }

    // Setters importantes
    setEliminado(usuarioId = '') {
        this.eliminado = true;
        this.activo = false;
        this.fechaEliminacion = new Date();
        this.actualizadoPor = usuarioId;
        this.fechaActualizacion = new Date();
    }
    restaurar(usuarioId = '') {
        this.eliminado = false;
        this.activo = true;
        this.fechaEliminacion = null;
        this.actualizadoPor = usuarioId;
        this.fechaActualizacion = new Date();
    }
    activar(usuarioId = '') {
        this.activo = true;
        this.actualizadoPor = usuarioId;
        this.fechaActualizacion = new Date();
    }
    desactivar(usuarioId = '') {
        this.activo = false;
        this.actualizadoPor = usuarioId;
        this.fechaActualizacion = new Date();
    }

    // Para Firestore
    toFirestore() {
        return {
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            cargos: this._mapToObject(this.cargos),
            idOrganizacion: this.idOrganizacion,
            nombreOrganizacion: this.nombreOrganizacion,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion,
            fechaEliminacion: this.fechaEliminacion,
            activo: this.activo,
            eliminado: this.eliminado,
            color: this.color,
            icono: this.icono,
            capacidadMaxima: this.capacidadMaxima,
            presupuestoAnual: this.presupuestoAnual,
            objetivos: this.objetivos,
            metricas: this.metricas
        };
    }

    toUI() {
        return {
            id: this.id,
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            totalCargos: this.cargos.size,
            cargosActivos: this.getCargosActivos().length,
            cargos: this.getCargosAsArray(),
            organizacion: this.nombreOrganizacion,
            estado: this.getEstado(),
            estadoBadge: this.getEstadoBadge(),
            color: this.color,
            icono: this.icono,
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor,
            capacidadMaxima: this.capacidadMaxima,
            presupuestoAnual: new Intl.NumberFormat('es-ES', {
                style: 'currency', currency: 'USD'
            }).format(this.presupuestoAnual),
            objetivos: this.objetivos.length,
            metricas: Object.keys(this.metricas).length
        };
    }
}

// ==================== CLASE AREAMANAGER CORREGIDA ====================
class AreaManager {
    constructor() {
        this.areas = [];
        console.log('✅ AreaManager inicializado');
    }

    // ========== CRUD COMPLETO ==========
    
    async crearArea(areaData, idOrganizacion, userManager) {
        try {
            console.log('📝 Creando nueva área:', areaData.nombreArea);
            
            const usuarioActual = userManager.currentUser;
            
            // Verificar si ya existe
            const existe = await this.verificarAreaExistente(areaData.nombreArea, usuarioActual.organizacionCamelCase);
            if (existe) throw new Error('Ya existe un área con ese nombre');
            
            // Generar ID
            const areaId = this._generarAreaId(areaData.nombreArea, usuarioActual.organizacionCamelCase);
            
            // Datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                caracteristicas: areaData.caracteristicas || '',
                cargos: {},
                idOrganizacion: idOrganizacion || usuarioActual.id,
                nombreOrganizacion: usuarioActual.organizacion || 'Sin organización',
                organizacionCamelCase: usuarioActual.organizacionCamelCase || 'sinOrganizacion',
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                fechaEliminacion: null,
                activo: areaData.activo !== false,
                eliminado: false,
                color: areaData.color || this._generarColorAleatorio(),
                icono: areaData.icono || 'fas fa-building',
                capacidadMaxima: areaData.capacidadMaxima || 0,
                presupuestoAnual: areaData.presupuestoAnual || 0,
                objetivos: areaData.objetivos || [],
                metricas: {}
            };
            
            // Guardar en Firestore
            const areaRef = doc(db, "areas", areaId);
            await setDoc(areaRef, areaFirestoreData);
            
            // Crear instancia
            const nuevaArea = new Area(areaId, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            this.areas.unshift(nuevaArea);
            console.log('✅ Área creada:', nuevaArea.nombreArea);
            return nuevaArea;
            
        } catch (error) {
            console.error("❌ Error creando área:", error);
            throw error;
        }
    }

    async getAreasByOrganizacion(organizacionCamelCase, incluirEliminadas = false) {
        try {
            console.log(`🔍 Obteniendo áreas para: ${organizacionCamelCase}`);
            
            let areasQuery;
            if (incluirEliminadas) {
                areasQuery = query(collection(db, "areas"), where("organizacionCamelCase", "==", organizacionCamelCase));
            } else {
                areasQuery = query(
                    collection(db, "areas"),
                    where("organizacionCamelCase", "==", organizacionCamelCase),
                    where("eliminado", "==", false)
                );
            }
            
            const areasSnapshot = await getDocs(areasQuery);
            const areas = [];
            
            areasSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const area = new Area(doc.id, { ...data, id: doc.id });
                    areas.push(area);
                } catch (error) {
                    console.error(`❌ Error procesando área ${doc.id}:`, error);
                }
            });
            
            // Ordenar por fecha (más recientes primero)
            areas.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.areas = areas;
            
            console.log(`✅ Encontradas ${areas.length} áreas`);
            return areas;
            
        } catch (error) {
            console.error("❌ Error obteniendo áreas:", error);
            return [];
        }
    }

    async getAreaById(areaId) {
        // Buscar en memoria primero
        const areaInMemory = this.areas.find(area => area.id === areaId);
        if (areaInMemory) return areaInMemory;
        
        try {
            const areaRef = doc(db, "areas", areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (areaSnap.exists()) {
                const data = areaSnap.data();
                const area = new Area(areaId, { ...data, id: areaId });
                this.areas.push(area);
                return area;
            }
            return null;
            
        } catch (error) {
            console.error('❌ Error obteniendo área:', error);
            return null;
        }
    }

    // ========== MÉTODOS DE ACTUALIZACIÓN CORREGIDOS ==========
    
    async actualizarArea(areaId, nuevosDatos, usuarioId) {
        try {
            console.log('🔄 Actualizando área:', areaId);
            
            // Primero obtener el área actual
            const areaRef = doc(db, "areas", areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (!areaSnap.exists()) {
                throw new Error(`Área con ID ${areaId} no encontrada`);
            }
            
            // Datos actualizados
            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            };
            
            // Actualizar en Firestore
            await updateDoc(areaRef, datosActualizados);
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const areaActual = this.areas[areaIndex];
                Object.keys(datosActualizados).forEach(key => {
                    if (key in areaActual && key !== 'id') {
                        areaActual[key] = datosActualizados[key];
                    }
                });
                areaActual.fechaActualizacion = new Date();
                areaActual.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área actualizada:', areaId);
            return await this.getAreaById(areaId);
            
        } catch (error) {
            console.error('❌ Error actualizando área:', error);
            throw error;
        }
    }

    async eliminarArea(areaId, usuarioId) {
        try {
            console.log('🗑️ Eliminando área:', areaId);
            
            const areaRef = doc(db, "areas", areaId);
            
            // Actualizar en Firestore (eliminación lógica)
            await updateDoc(areaRef, {
                eliminado: true,
                activo: false,
                fechaEliminacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const area = this.areas[areaIndex];
                area.eliminado = true;
                area.activo = false;
                area.fechaEliminacion = new Date();
                area.fechaActualizacion = new Date();
                area.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área eliminada:', areaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando área:', error);
            throw error;
        }
    }

    async restaurarArea(areaId, usuarioId) {
        try {
            console.log('🔄 Restaurando área:', areaId);
            
            const areaRef = doc(db, "areas", areaId);
            
            // Actualizar en Firestore
            await updateDoc(areaRef, {
                eliminado: false,
                activo: true,
                fechaEliminacion: null,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const area = this.areas[areaIndex];
                area.eliminado = false;
                area.activo = true;
                area.fechaEliminacion = null;
                area.fechaActualizacion = new Date();
                area.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área restaurada:', areaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error restaurando área:', error);
            throw error;
        }
    }

    async activarArea(areaId, usuarioId) {
        try {
            console.log('✅ Activando área:', areaId);
            
            const areaRef = doc(db, "areas", areaId);
            
            await updateDoc(areaRef, {
                activo: true,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const area = this.areas[areaIndex];
                area.activo = true;
                area.fechaActualizacion = new Date();
                area.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área activada:', areaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error activando área:', error);
            throw error;
        }
    }

    async desactivarArea(areaId, usuarioId) {
        try {
            console.log('⏸️ Desactivando área:', areaId);
            
            const areaRef = doc(db, "areas", areaId);
            
            await updateDoc(areaRef, {
                activo: false,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: usuarioId
            });
            
            // Actualizar en memoria
            const areaIndex = this.areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                const area = this.areas[areaIndex];
                area.activo = false;
                area.fechaActualizacion = new Date();
                area.actualizadoPor = usuarioId;
            }
            
            console.log('✅ Área desactivada:', areaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error desactivando área:', error);
            throw error;
        }
    }

    // ========== MÉTODOS AUXILIARES ==========
    
    async verificarAreaExistente(nombreArea, organizacionCamelCase) {
        try {
            const areasQuery = query(
                collection(db, "areas"),
                where("nombreArea", "==", nombreArea),
                where("organizacionCamelCase", "==", organizacionCamelCase),
                where("eliminado", "==", false)
            );
            
            const querySnapshot = await getDocs(areasQuery);
            return !querySnapshot.empty;
            
        } catch (error) {
            console.error("❌ Error verificando área:", error);
            return false;
        }
    }

    _generarAreaId(nombreArea, organizacionCamelCase) {
        const nombreNormalizado = nombreArea
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_');
        
        const timestamp = Date.now();
        const org = organizacionCamelCase || 'sinOrganizacion';
        return `${org}_${nombreNormalizado}_${timestamp}`;
    }

    _generarColorAleatorio() {
        const colores = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
        return colores[Math.floor(Math.random() * colores.length)];
    }
}

export { Area, AreaManager };