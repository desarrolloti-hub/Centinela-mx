// plan.js - CLASE PARA PLANES PERSONALIZADOS
// Colección: planes - ID del documento = nombre del plan (slug)

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
    serverTimestamp,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';
import consumo from '/clases/consumoFirebase.js';

// =============================================
// MÓDULOS DISPONIBLES DEL SISTEMA
// =============================================
export const MODULOS_SISTEMA = {
    areas: {
        id: 'areas',
        nombre: 'Áreas',
        descripcion: 'Gestión de áreas organizacionales',
        icono: 'fa-building',
        color: '#3b82f6',
        categoria: 'organizacion'
    },
    categorias: {
        id: 'categorias',
        nombre: 'Categorías',
        descripcion: 'Gestión de categorías de incidencias',
        icono: 'fa-tags',
        color: '#10b981',
        categoria: 'organizacion'
    },
    sucursales: {
        id: 'sucursales',
        nombre: 'Sucursales',
        descripcion: 'Gestión de sucursales',
        icono: 'fa-store',
        color: '#f59e0b',
        categoria: 'organizacion'
    },
    regiones: {
        id: 'regiones',
        nombre: 'Regiones',
        descripcion: 'Gestión de regiones geográficas',
        icono: 'fa-globe',
        color: '#8b5cf6',
        categoria: 'organizacion'
    },
    incidencias: {
        id: 'incidencias',
        nombre: 'Incidencias',
        descripcion: 'Gestión y seguimiento de incidencias',
        icono: 'fa-exclamation-triangle',
        color: '#ef4444',
        categoria: 'operaciones'
    },
    reportes: {
        id: 'reportes',
        nombre: 'Reportes',
        descripcion: 'Visualización y descarga de reportes',
        icono: 'fa-chart-line',
        color: '#14b8a6',
        categoria: 'analisis'
    },
    notificaciones: {
        id: 'notificaciones',
        nombre: 'Notificaciones',
        descripcion: 'Gestión de alertas y notificaciones',
        icono: 'fa-bell',
        color: '#eab308',
        categoria: 'comunicacion'
    },
    dashboard: {
        id: 'dashboard',
        nombre: 'Dashboard',
        descripcion: 'Panel de control principal',
        icono: 'fa-tachometer-alt',
        color: '#06b6d4',
        categoria: 'principal'
    },
    mapeo: {
        id: 'mapeo',
        nombre: 'Mapeo',
        descripcion: 'Visualización geográfica de datos',
        icono: 'fa-map',
        color: '#a855f7',
        categoria: 'visualizacion'
    },
    usuarios: {
        id: 'usuarios',
        nombre: 'Usuarios',
        descripcion: 'Gestión de colaboradores',
        icono: 'fa-users',
        color: '#ec489a',
        categoria: 'admin'
    },
    configuracion: {
        id: 'configuracion',
        nombre: 'Configuración',
        descripcion: 'Configuración del sistema',
        icono: 'fa-cog',
        color: '#6b7280',
        categoria: 'admin'
    },
    bitacora: {
        id: 'bitacora',
        nombre: 'Bitácora',
        descripcion: 'Historial de actividades',
        icono: 'fa-history',
        color: '#f97316',
        categoria: 'admin'
    },
    // NUEVO MÓDULO DE PERMISOS - SIEMPRE ACTIVO
    permisos: {
        id: 'permisos',
        nombre: 'Permisos',
        descripcion: 'Gestión de permisos y roles del sistema',
        icono: 'fa-lock',
        color: '#8b5cf6',
        categoria: 'admin'
    }
};

// =============================================
// TIPOS DE PLANES PREDEFINIDOS
// =============================================
export const TIPOS_PLAN_PERSONALIZADO = {
    MONITOREO: {
        id: 'monitoreo',
        nombre: 'Monitoreo',
        nombreMostrar: 'Plan Monitoreo',
        descripcion: 'Enfocado en monitoreo y alertas',
        color: '#3b82f6',
        icono: 'fa-chart-line',
        modulosBase: {
            areas: true,
            categorias: true,
            sucursales: true,
            regiones: true,
            incidencias: false,
            reportes: true,
            notificaciones: true,
            dashboard: true,
            mapeo: true,
            usuarios: true,        // MODIFICADO: AHORA EN TRUE
            configuracion: true,
            bitacora: false,
            permisos: true         // NUEVO: SIEMPRE TRUE
        }
    },
    INCIDENCIAS: {
        id: 'incidencias',
        nombre: 'Incidencias',
        nombreMostrar: 'Plan Incidencias',
        descripcion: 'Enfocado en gestión de incidentes',
        color: '#ef4444',
        icono: 'fa-exclamation-triangle',
        modulosBase: {
            areas: true,
            categorias: true,
            sucursales: true,
            regiones: true,
            incidencias: true,
            reportes: true,
            notificaciones: true,
            dashboard: true,
            mapeo: false,
            usuarios: true,        // MODIFICADO: AHORA EN TRUE
            configuracion: true,
            bitacora: false,
            permisos: true         // NUEVO: SIEMPRE TRUE
        }
    },
    COMPLETO: {
        id: 'completo',
        nombre: 'Completo',
        nombreMostrar: 'Plan Completo',
        descripcion: 'Acceso a todos los módulos del sistema',
        color: '#f59e0b',
        icono: 'fa-crown',
        modulosBase: {
            areas: true,
            categorias: true,
            sucursales: true,
            regiones: true,
            incidencias: true,
            reportes: true,
            notificaciones: true,
            dashboard: true,
            mapeo: true,
            usuarios: true,        // MODIFICADO: AHORA EN TRUE
            configuracion: true,
            bitacora: true,
            permisos: true         // NUEVO: SIEMPRE TRUE
        }
    }
};

// =============================================
// FUNCIÓN AUXILIAR: Convertir nombre a ID válido
// =============================================
function generarIdDesdeNombre(nombre) {
    // Convertir a minúsculas, reemplazar espacios por guiones, eliminar caracteres especiales
    return nombre
        .toLowerCase()
        .trim()
        .replace(/[áäâ]/g, 'a')
        .replace(/[éëê]/g, 'e')
        .replace(/[íïî]/g, 'i')
        .replace(/[óöô]/g, 'o')
        .replace(/[úüû]/g, 'u')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// =============================================
// CLASE PLAN PERSONALIZADO
// =============================================
class PlanPersonalizado {
    constructor(id, data) {
        // ID del documento (será el nombre del plan convertido)
        this.id = id || null;
        
        // Nombre original del plan (para mostrar)
        this.nombreOriginal = data.nombreOriginal || data.nombre || '';
        
        // Datos del administrador que recibe el plan
        this.adminId = data.adminId || '';
        this.adminEmail = data.adminEmail || '';
        this.adminNombre = data.adminNombre || '';
        
        // Datos de la organización
        this.organizacionId = data.organizacionId || '';
        this.organizacionNombre = data.organizacionNombre || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        
        // ========== DATOS DEL PLAN ==========
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.precio = data.precio || 0;
        this.color = data.color || '#0dcaf0';
        this.icono = data.icono || 'fa-cube';
        this.tipoBase = data.tipoBase || 'personalizado';
        
        // ========== MAPA DE MÓDULOS INCLUIDOS ==========
        this.modulosIncluidos = data.modulosIncluidos || {};
        
        // ========== ESTADO DEL PLAN ==========
        this.activo = data.activo !== undefined ? data.activo : true;
        this.fechaInicio = data.fechaInicio ? this._convertirFecha(data.fechaInicio) : new Date();
        this.fechaFin = data.fechaFin ? this._convertirFecha(data.fechaFin) : null;
        this.diasPrueba = data.diasPrueba || 14;
        
        // Datos de pago
        this.estadoPago = data.estadoPago || 'pendiente';
        this.fechaPago = data.fechaPago ? this._convertirFecha(data.fechaPago) : null;
        
        // Metadatos
        this.creadoPor = data.creadoPor || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.actualizadoPorNombre = data.actualizadoPorNombre || '';
        
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
        
        // ASEGURAR QUE PERMISOS SIEMPRE ESTÉ EN TRUE
        this._asegurarModulosObligatorios();
    }
    
    _asegurarModulosObligatorios() {
        // Siempre incluir el módulo de permisos como true
        this.modulosIncluidos['permisos'] = true;
        // Siempre incluir el módulo de usuarios como true
        this.modulosIncluidos['usuarios'] = true;
    }
    
    _convertirFecha(fecha) {
        if (!fecha) return new Date();
        if (fecha instanceof Timestamp) return fecha.toDate();
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
    
    tieneModulo(moduloId) {
        return this.modulosIncluidos[moduloId] === true;
    }
    
    puedeAcceder(modulo) {
        if (!this.activo) return false;
        if (this.fechaFin && this.fechaFin < new Date()) return false;
        return this.tieneModulo(modulo);
    }
    
    obtenerModulosActivos() {
        return Object.entries(this.modulosIncluidos)
            .filter(([_, incluido]) => incluido === true)
            .map(([moduloId]) => moduloId);
    }
    
    obtenerModulosInactivos() {
        return Object.entries(this.modulosIncluidos)
            .filter(([_, incluido]) => incluido === false)
            .map(([moduloId]) => moduloId);
    }
    
    obtenerModulosCompletos() {
        return Object.keys(MODULOS_SISTEMA).map(moduloId => ({
            id: moduloId,
            ...MODULOS_SISTEMA[moduloId],
            incluido: this.tieneModulo(moduloId)
        }));
    }
    
    obtenerMapaModulos() {
        return { ...this.modulosIncluidos };
    }
    
    contarModulosActivos() {
        return this.obtenerModulosActivos().length;
    }
    
    estaActivo() {
        if (!this.activo) return false;
        if (this.fechaFin && this.fechaFin < new Date()) return false;
        return true;
    }
    
    estaEnPeriodoPrueba() {
        if (!this.activo) return false;
        const diasDesdeInicio = Math.floor((new Date() - this.fechaInicio) / (1000 * 60 * 60 * 24));
        return diasDesdeInicio <= this.diasPrueba;
    }
    
    actualizarModulos(nuevosModulos, usuarioId, usuarioNombre) {
        this.modulosIncluidos = { ...this.modulosIncluidos, ...nuevosModulos };
        // Asegurar módulos obligatorios después de actualizar
        this._asegurarModulosObligatorios();
        this.actualizadoPor = usuarioId;
        this.actualizadoPorNombre = usuarioNombre;
        this.fechaActualizacion = new Date();
        
        return this.modulosIncluidos;
    }
    
    obtenerInfoTipoBase() {
        const tipoKey = this.tipoBase.toUpperCase();
        return TIPOS_PLAN_PERSONALIZADO[tipoKey] || {
            id: 'personalizado',
            nombre: 'Personalizado',
            nombreMostrar: 'Plan Personalizado',
            descripcion: this.descripcion || 'Plan personalizado a medida',
            color: this.color,
            icono: this.icono
        };
    }
    
    obtenerPrecioFormateado() {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(this.precio);
    }
    
    toFirestoreCreate(superAdminId, superAdminNombre) {
        // Asegurar módulos obligatorios antes de guardar
        this._asegurarModulosObligatorios();
        
        return {
            adminId: this.adminId,
            adminEmail: this.adminEmail,
            adminNombre: this.adminNombre,
            organizacionId: this.organizacionId,
            organizacionNombre: this.organizacionNombre,
            organizacionCamelCase: this.organizacionCamelCase,
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            color: this.color,
            icono: this.icono,
            tipoBase: this.tipoBase,
            modulosIncluidos: this.modulosIncluidos,
            activo: true,
            fechaInicio: serverTimestamp(),
            fechaFin: this.fechaFin,
            diasPrueba: this.diasPrueba,
            estadoPago: 'pendiente',
            creadoPor: superAdminId,
            creadoPorNombre: superAdminNombre,
            actualizadoPor: superAdminId,
            actualizadoPorNombre: superAdminNombre,
            fechaCreacion: serverTimestamp(),
            fechaActualizacion: serverTimestamp()
        };
    }
    
    toFirestoreUpdate(superAdminId, superAdminNombre) {
        // Asegurar módulos obligatorios antes de actualizar
        this._asegurarModulosObligatorios();
        
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            color: this.color,
            icono: this.icono,
            tipoBase: this.tipoBase,
            modulosIncluidos: this.modulosIncluidos,
            fechaFin: this.fechaFin,
            actualizadoPor: superAdminId,
            actualizadoPorNombre: superAdminNombre,
            fechaActualizacion: serverTimestamp()
        };
    }
    
    toFirestoreToggleStatus() {
        return {
            activo: this.activo,
            fechaActualizacion: serverTimestamp()
        };
    }
    
    toUI() {
        const infoBase = this.obtenerInfoTipoBase();
        
        return {
            id: this.id,
            adminId: this.adminId,
            adminEmail: this.adminEmail,
            adminNombre: this.adminNombre,
            organizacionId: this.organizacionId,
            organizacionNombre: this.organizacionNombre,
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            precioFormateado: this.obtenerPrecioFormateado(),
            color: this.color,
            icono: this.icono,
            tipoBase: this.tipoBase,
            tipoBaseInfo: infoBase,
            modulosIncluidos: this.modulosIncluidos,
            modulosActivos: this.obtenerModulosActivos(),
            modulosInactivos: this.obtenerModulosInactivos(),
            totalModulosActivos: this.contarModulosActivos(),
            listaModulosCompleta: this.obtenerModulosCompletos(),
            activo: this.estaActivo(),
            estaEnPrueba: this.estaEnPeriodoPrueba(),
            diasPruebaRestantes: this.estaEnPeriodoPrueba() ? 
                this.diasPrueba - Math.floor((new Date() - this.fechaInicio) / (1000 * 60 * 60 * 24)) : 0,
            estadoPago: this.estadoPago,
            fechaInicio: this._formatearFecha(this.fechaInicio),
            fechaFin: this.fechaFin ? this._formatearFecha(this.fechaFin) : null,
            fechaCreacion: this._formatearFecha(this.fechaCreacion),
            fechaActualizacion: this._formatearFecha(this.fechaActualizacion),
            creadoPor: this.creadoPorNombre
        };
    }
    
    toJSON() {
        return {
            id: this.id,
            adminId: this.adminId,
            adminEmail: this.adminEmail,
            adminNombre: this.adminNombre,
            organizacionId: this.organizacionId,
            organizacionNombre: this.organizacionNombre,
            organizacionCamelCase: this.organizacionCamelCase,
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            color: this.color,
            icono: this.icono,
            tipoBase: this.tipoBase,
            modulosIncluidos: this.modulosIncluidos,
            activo: this.activo,
            diasPrueba: this.diasPrueba,
            estadoPago: this.estadoPago,
            fechaInicio: this.fechaInicio.toISOString(),
            fechaFin: this.fechaFin ? this.fechaFin.toISOString() : null,
            fechaCreacion: this.fechaCreacion.toISOString(),
            fechaActualizacion: this.fechaActualizacion.toISOString(),
            creadoPor: this.creadoPor,
            creadoPorNombre: this.creadoPorNombre
        };
    }
    
    toString() {
        const estado = this.estaActivo() ? 'ACTIVO' : 'INACTIVO';
        const modulosActivos = this.contarModulosActivos();
        const totalModulos = Object.keys(MODULOS_SISTEMA).length;
        return `Plan #${this.id || 'nuevo'}: ${this.nombre} - ${estado} (${modulosActivos}/${totalModulos} módulos)`;
    }
}

// =============================================
// MANAGER DE PLANES PERSONALIZADOS
// Colección: planes - ID personalizado por nombre
// =============================================
class PlanPersonalizadoManager {
    constructor() {
        this.planes = [];
    }
    
    _getCollectionName() {
        return 'planes';
    }
    
    /**
     * Crea un nuevo plan con ID personalizado (nombre del plan)
     */
    async crearPlan(planData) {
        try {
            if (!planData.adminId) {
                planData.adminId = 'sistema';
                planData.adminNombre = 'Sistema';
            }
            
            if (!planData.nombre) {
                throw new Error('El nombre del plan es requerido');
            }
            
            // Generar ID desde el nombre
            const planId = generarIdDesdeNombre(planData.nombre);
            
            if (!planId) {
                throw new Error('El nombre del plan no es válido para generar un ID');
            }
            
            const creadorId = planData.creadoPor || 'sistema';
            const creadorNombre = planData.creadoPorNombre || 'Sistema';
            
            let modulosIniciales = {};
            
            if (planData.tipoBase && planData.tipoBase !== 'personalizado') {
                const tipoKey = planData.tipoBase.toUpperCase();
                const planBase = TIPOS_PLAN_PERSONALIZADO[tipoKey];
                if (planBase) {
                    modulosIniciales = { ...planBase.modulosBase };
                }
            } else if (planData.modulosIncluidos && Object.keys(planData.modulosIncluidos).length > 0) {
                modulosIniciales = { ...planData.modulosIncluidos };
            } else {
                modulosIniciales = {
                    areas: false,
                    categorias: false,
                    sucursales: false,
                    regiones: false,
                    incidencias: false,
                    reportes: true,
                    notificaciones: false,
                    dashboard: true,
                    mapeo: false,
                    usuarios: true,        // NUEVO: TRUE POR DEFECTO
                    configuracion: true,
                    bitacora: false,
                    permisos: true         // NUEVO: SIEMPRE TRUE
                };
            }
            
            // Asegurar que permisos y usuarios estén en true
            modulosIniciales['permisos'] = true;
            modulosIniciales['usuarios'] = true;
            
            const nuevoPlan = new PlanPersonalizado(planId, {
                adminId: planData.adminId,
                adminEmail: planData.adminEmail || '',
                adminNombre: planData.adminNombre || 'Sistema',
                organizacionId: planData.organizacionId || '',
                organizacionNombre: planData.organizacionNombre || '',
                organizacionCamelCase: planData.organizacionCamelCase || '',
                nombre: planData.nombre,
                descripcion: planData.descripcion || '',
                precio: planData.precio || 0,
                color: planData.color || '#0dcaf0',
                icono: planData.icono || 'fa-cube',
                tipoBase: planData.tipoBase || 'personalizado',
                modulosIncluidos: modulosIniciales,
                diasPrueba: planData.diasPrueba || 14,
                creadoPor: creadorId,
                creadoPorNombre: creadorNombre,
                actualizadoPor: creadorId,
                actualizadoPorNombre: creadorNombre
            });
            
            const collectionName = this._getCollectionName();
            await consumo.registrarFirestoreEscritura(collectionName, 'nuevo plan');
            
            const planRef = doc(db, collectionName, planId);
            await setDoc(planRef, nuevoPlan.toFirestoreCreate(creadorId, creadorNombre));
            
            this.planes.unshift(nuevoPlan);
            
            return nuevoPlan;
            
        } catch (error) {
            console.error('❌ Error creando plan:', error);
            throw error;
        }
    }
    
    async obtenerTodos(soloActivos = false) {
        try {
            const collectionName = this._getCollectionName();
            await consumo.registrarFirestoreLectura(collectionName, 'lista planes');
            
            const planesCollection = collection(db, collectionName);
            const q = query(planesCollection, orderBy('fechaCreacion', 'desc'));
            const planesSnapshot = await getDocs(q);
            
            const planes = [];
            planesSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const plan = new PlanPersonalizado(doc.id, data);
                    
                    if (soloActivos && !plan.estaActivo()) {
                        return;
                    }
                    
                    planes.push(plan);
                } catch (error) {
                    console.error(`Error procesando plan ${doc.id}:`, error);
                }
            });
            
            this.planes = planes;
            return planes;
            
        } catch (error) {
            console.error('Error obteniendo planes:', error);
            return [];
        }
    }
    
    async obtenerPorId(id) {
        const cachePlan = this.planes.find(p => p.id === id);
        if (cachePlan) return cachePlan;
        
        try {
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            
            await consumo.registrarFirestoreLectura(collectionName, id);
            const planSnap = await getDoc(planRef);
            
            if (planSnap.exists()) {
                const plan = new PlanPersonalizado(id, planSnap.data());
                this.planes.push(plan);
                return plan;
            }
            
            return null;
            
        } catch (error) {
            console.error('Error obteniendo plan por ID:', error);
            return null;
        }
    }
    
    async actualizarPlan(id, datos) {
        try {
            const plan = await this.obtenerPorId(id);
            if (!plan) {
                throw new Error('Plan no encontrado');
            }
            
            const usuarioId = 'sistema';
            const usuarioNombre = 'Sistema';
            
            if (datos.nombre !== undefined) plan.nombre = datos.nombre;
            if (datos.descripcion !== undefined) plan.descripcion = datos.descripcion;
            if (datos.precio !== undefined) plan.precio = datos.precio;
            if (datos.color !== undefined) plan.color = datos.color;
            if (datos.icono !== undefined) plan.icono = datos.icono;
            if (datos.modulosIncluidos !== undefined) {
                plan.modulosIncluidos = { ...plan.modulosIncluidos, ...datos.modulosIncluidos };
                plan._asegurarModulosObligatorios();
            }
            
            plan.actualizadoPor = usuarioId;
            plan.actualizadoPorNombre = usuarioNombre;
            plan.fechaActualizacion = new Date();
            
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            const updateData = plan.toFirestoreUpdate(usuarioId, usuarioNombre);
            
            await consumo.registrarFirestoreActualizacion(collectionName, id);
            await updateDoc(planRef, updateData);
            
            const cacheIndex = this.planes.findIndex(p => p.id === id);
            if (cacheIndex !== -1) {
                this.planes[cacheIndex] = plan;
            }
            
            return plan;
            
        } catch (error) {
            console.error('Error actualizando plan:', error);
            throw error;
        }
    }
    
    async togglePlanActivo(id, activo) {
        try {
            const plan = await this.obtenerPorId(id);
            if (!plan) {
                throw new Error('Plan no encontrado');
            }
            
            plan.activo = activo;
            
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            const updateData = plan.toFirestoreToggleStatus();
            
            await consumo.registrarFirestoreActualizacion(collectionName, id);
            await updateDoc(planRef, updateData);
            
            return true;
            
        } catch (error) {
            console.error('Error cambiando estado del plan:', error);
            throw error;
        }
    }
    
    async eliminarPlan(id) {
        try {
            const plan = await this.obtenerPorId(id);
            if (!plan) {
                throw new Error('Plan no encontrado');
            }
            
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            
            await consumo.registrarFirestoreEliminacion(collectionName, id);
            await deleteDoc(planRef);
            
            const cacheIndex = this.planes.findIndex(p => p.id === id);
            if (cacheIndex !== -1) {
                this.planes.splice(cacheIndex, 1);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error eliminando plan:', error);
            throw error;
        }
    }
}

// =============================================
// EXPORTACIONES
// =============================================
export { PlanPersonalizado, PlanPersonalizadoManager, generarIdDesdeNombre };