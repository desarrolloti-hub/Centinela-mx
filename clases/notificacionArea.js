import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

class NotificacionArea {
    constructor(id, data) {
        this.id = id;
        this.titulo = data.titulo || '';
        this.mensaje = data.mensaje || '';
        this.tipo = data.tipo || 'canalizacion';
        this.fecha = data.fecha ? this._convertirFecha(data.fecha) : new Date();
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.remitenteId = data.remitenteId || '';
        this.remitenteNombre = data.remitenteNombre || '';
        
        // Datos de la incidencia
        this.incidenciaId = data.incidenciaId || '';
        this.incidenciaTitulo = data.incidenciaTitulo || '';
        this.sucursalId = data.sucursalId || '';
        this.sucursalNombre = data.sucursalNombre || '';
        this.categoriaId = data.categoriaId || '';
        this.categoriaNombre = data.categoriaNombre || '';
        this.nivelRiesgo = data.nivelRiesgo || '';
        
        // Áreas destino
        this.areasDestino = data.areasDestino || [];
        
        // Estadísticas
        this.totalUsuarios = data.totalUsuarios || 0;
        this.leidas = data.leidas || 0;
        
        // URLs
        this.urlDestino = data.urlDestino || '';
        
        // Metadatos adicionales
        this.detalles = data.detalles || {};
        this.prioridad = data.prioridad || 'normal';
        this.icono = data.icono || 'fa-bell';
        this.color = data.color || '#007bff';
    }

    _convertirFecha(fecha) {
        if (!fecha) return new Date();
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string') return new Date(fecha);
        if (fecha && fecha._seconds) return new Date(fecha._seconds * 1000);
        return new Date();
    }

    getTiempoRelativo() {
        if (!this.fecha) return '';
        
        const ahora = new Date();
        const diffMs = ahora - this.fecha;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Ahora mismo';
        if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
        if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
        if (diffDias < 7) return `Hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
        
        return this.fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getIcono() {
        const iconos = {
            canalizacion: 'fa-share-alt',
            comentario: 'fa-comment',
            asignacion: 'fa-user-check',
            resolucion: 'fa-check-circle',
            vencimiento: 'fa-clock',
            urgente: 'fa-exclamation-triangle'
        };
        return iconos[this.tipo] || this.icono || 'fa-bell';
    }

    getColor() {
        const colores = {
            canalizacion: '#28a745',
            comentario: '#17a2b8',
            asignacion: '#ffc107',
            resolucion: '#28a745',
            vencimiento: '#dc3545',
            urgente: '#dc3545'
        };
        return colores[this.tipo] || this.color || '#6c757d';
    }

    toUI() {
        return {
            id: this.id,
            titulo: this.titulo,
            mensaje: this.mensaje,
            tipo: this.tipo,
            fecha: this.fecha,
            tiempoRelativo: this.getTiempoRelativo(),
            icono: this.getIcono(),
            color: this.getColor(),
            incidenciaId: this.incidenciaId,
            incidenciaTitulo: this.incidenciaTitulo,
            sucursalNombre: this.sucursalNombre,
            nivelRiesgo: this.nivelRiesgo,
            areasDestino: this.areasDestino,
            totalUsuarios: this.totalUsuarios,
            leidas: this.leidas,
            remitenteNombre: this.remitenteNombre,
            urlDestino: this.urlDestino || `/usuarios/administrador/verIncidencias/verIncidencias.html?id=${this.incidenciaId}`,
            prioridad: this.prioridad,
            detalles: this.detalles
        };
    }
}

class NotificacionAreaManager {
    constructor() {
        console.log('📋 NotificacionAreaManager inicializado');
        this.usuarioActual = null;
        this.cacheUsuariosPorArea = new Map();
        this.cacheTiempo = 5 * 60 * 1000;
        this._initUsuario();
    }

    _initUsuario() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && userData.id) {
                this.usuarioActual = {
                    id: userData.id,
                    uid: userData.id,
                    nombreCompleto: userData.nombreCompleto || 'Usuario',
                    correo: userData.email || userData.correo || '',
                    organizacionCamelCase: userData.organizacionCamelCase || ''
                };
            }
        } catch (error) {
            console.error('Error al inicializar usuario:', error);
        }
    }

    _getCollectionName(organizacionCamelCase) {
        return `notificaciones_${organizacionCamelCase}`;
    }

    _getUserNotificacionesCollectionName(organizacionCamelCase) {
        return `usuarios_notificaciones_${organizacionCamelCase}`;
    }

    _generarNotificacionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        return `not_${timestamp}_${random}`;
    }

    async _getUsuariosPorAreas(areasIds, organizacionCamelCase, forceRefresh = false) {
        try {
            if (!areasIds || areasIds.length === 0) return {};

            const cacheKey = `${organizacionCamelCase}_${areasIds.sort().join('_')}`;
            const ahora = Date.now();

            if (!forceRefresh && this.cacheUsuariosPorArea.has(cacheKey)) {
                const cache = this.cacheUsuariosPorArea.get(cacheKey);
                if (ahora - cache.timestamp < this.cacheTiempo) {
                    return cache.data;
                }
            }

            const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
            
            const usuariosPorArea = {};
            const collectionName = `users_${organizacionCamelCase}`;
            const usersCollection = collection(db, collectionName);

            for (let i = 0; i < areasIds.length; i += 10) {
                const batch = areasIds.slice(i, i + 10);
                
                const q = query(
                    usersCollection,
                    where("areaAsignadaId", "in", batch),
                    where("status", "==", "activo")
                );
                
                const snapshot = await getDocs(q);
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const areaId = data.areaAsignadaId;
                    
                    if (!usuariosPorArea[areaId]) {
                        usuariosPorArea[areaId] = [];
                    }
                    
                    usuariosPorArea[areaId].push({
                        id: doc.id,
                        nombreCompleto: data.nombreCompleto || data.nombre || 'Usuario',
                        correo: data.email || data.correo || '',
                        cargo: data.cargo || data.rol || 'Colaborador'
                    });
                });
            }

            this.cacheUsuariosPorArea.set(cacheKey, {
                data: usuariosPorArea,
                timestamp: ahora
            });

            return usuariosPorArea;

        } catch (error) {
            console.error('Error en _getUsuariosPorAreas:', error);
            return {};
        }
    }

    async notificarMultiplesAreas({
        areas = [],
        incidenciaId,
        incidenciaTitulo = '',
        sucursalId = '',
        sucursalNombre = '',
        categoriaId = '',
        categoriaNombre = '',
        nivelRiesgo = '',
        tipo = 'canalizacion',
        mensaje = '',
        detalles = {},
        prioridad = 'normal',
        remitenteId = null,
        remitenteNombre = null,
        organizacionCamelCase
    }) {
        try {
            if (!organizacionCamelCase) {
                console.error('❌ Error: organizacionCamelCase es requerido');
                return { success: false, error: 'organizacionCamelCase requerido' };
            }

            if (!areas || areas.length === 0) {
                return { success: true, notificacionCreada: false };
            }

            if (!incidenciaId) {
                console.error('❌ Error: incidenciaId es requerido');
                return { success: false, error: 'incidenciaId requerido' };
            }

            if (!remitenteId || !remitenteNombre) {
                if (this.usuarioActual) {
                    remitenteId = this.usuarioActual.id;
                    remitenteNombre = this.usuarioActual.nombreCompleto;
                } else {
                    remitenteId = 'sistema';
                    remitenteNombre = 'Sistema';
                }
            }

            const areasIds = areas.map(a => a.id);
            const usuariosPorArea = await this._getUsuariosPorAreas(areasIds, organizacionCamelCase);
            
            let totalUsuarios = 0;
            Object.values(usuariosPorArea).forEach(usuarios => {
                totalUsuarios += usuarios.length;
            });

            const titulo = `📢 Incidencia canalizada`;
            let mensajeFinal = mensaje;
            
            if (!mensajeFinal) {
                if (areas.length === 1) {
                    mensajeFinal = `Se te ha canalizado una incidencia al área: ${areas[0].nombre}`;
                } else {
                    mensajeFinal = `Se te ha canalizado una incidencia a ${areas.length} áreas`;
                }
                if (incidenciaTitulo) {
                    mensajeFinal = `${incidenciaTitulo}`;
                }
            }

            const urlDestino = `/usuarios/administrador/verIncidencias/verIncidencias.html?id=${incidenciaId}`;

            const notificacionId = this._generarNotificacionId();
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const notificacionRef = doc(db, collectionName, notificacionId);

            const usuariosPorAreaIds = {};
            Object.keys(usuariosPorArea).forEach(areaId => {
                usuariosPorAreaIds[areaId] = usuariosPorArea[areaId].map(u => u.id);
            });

            const notificacionData = {
                titulo: titulo,
                mensaje: mensajeFinal,
                tipo: tipo,
                fecha: serverTimestamp(),
                organizacionCamelCase: organizacionCamelCase,
                remitenteId: remitenteId,
                remitenteNombre: remitenteNombre,
                prioridad: prioridad,
                
                incidenciaId: incidenciaId,
                incidenciaTitulo: incidenciaTitulo,
                sucursalId: sucursalId,
                sucursalNombre: sucursalNombre,
                categoriaId: categoriaId,
                categoriaNombre: categoriaNombre,
                nivelRiesgo: nivelRiesgo,
                
                areasDestino: areas.map(a => ({ id: a.id, nombre: a.nombre })),
                
                totalUsuarios: totalUsuarios,
                leidas: 0,
                
                detalles: detalles,
                icono: tipo === 'canalizacion' ? 'fa-share-alt' : 'fa-bell',
                color: this._getColorPorRiesgo(nivelRiesgo, tipo),
                
                urlDestino: urlDestino,
                
                usuariosPorArea: usuariosPorAreaIds,
                areasIds: areasIds,
                
                fechaCreacion: serverTimestamp()
            };

            await setDoc(notificacionRef, notificacionData);
            await this._crearIndicesUsuarios(notificacionId, usuariosPorArea, organizacionCamelCase);

            return {
                success: true,
                notificacionId: notificacionId,
                totalUsuarios: totalUsuarios,
                areas: areas.length
            };

        } catch (error) {
            console.error('❌ Error en notificarMultiplesAreas:', error);
            return { success: false, error: error.message };
        }
    }

    async _crearIndicesUsuarios(notificacionId, usuariosPorArea, organizacionCamelCase) {
        try {
            const batch = writeBatch(db);
            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            let operaciones = 0;

            Object.keys(usuariosPorArea).forEach(areaId => {
                const usuarios = usuariosPorArea[areaId];
                
                usuarios.forEach(usuario => {
                    const userNotifRef = doc(db, userNotifCollectionName, usuario.id);
                    
                    batch.set(userNotifRef, {
                        notificaciones: {
                            [notificacionId]: {
                                leida: false,
                                fechaRecepcion: serverTimestamp(),
                                fechaLectura: null
                            }
                        },
                        ultimaActualizacion: serverTimestamp(),
                        totalPendientes: increment(1)
                    }, { merge: true });

                    operaciones++;
                });
            });

            if (operaciones > 0) {
                await batch.commit();
            }

        } catch (error) {
            console.error('Error creando índices:', error);
        }
    }

    async obtenerNotificaciones(usuarioId, organizacionCamelCase, soloNoLeidas = false, limite = 50) {
        try {
            if (!organizacionCamelCase || !usuarioId) return [];

            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            const notificacionesCollectionName = this._getCollectionName(organizacionCamelCase);

            const userNotifRef = doc(db, userNotifCollectionName, usuarioId);
            const userNotifSnap = await getDoc(userNotifRef);

            if (!userNotifSnap.exists()) {
                return [];
            }

            const userData = userNotifSnap.data();
            const notificacionesMap = userData.notificaciones || {};
            
            let notificacionesIds = Object.keys(notificacionesMap);
            
            if (soloNoLeidas) {
                notificacionesIds = notificacionesIds.filter(id => !notificacionesMap[id].leida);
            }

            notificacionesIds = notificacionesIds.slice(0, limite);

            if (notificacionesIds.length === 0) {
                return [];
            }

            const notificaciones = [];

            for (let i = 0; i < notificacionesIds.length; i += 10) {
                const batchIds = notificacionesIds.slice(i, i + 10);
                
                const q = query(
                    collection(db, notificacionesCollectionName),
                    where("__name__", "in", batchIds)
                );
                
                const snapshot = await getDocs(q);
                
                snapshot.forEach(doc => {
                    const notifData = doc.data();
                    const userNotifData = notificacionesMap[doc.id] || { leida: false };
                    
                    notificaciones.push(new NotificacionArea(doc.id, {
                        ...notifData,
                        leida: userNotifData.leida,
                        fechaLectura: userNotifData.fechaLectura
                    }));
                });
            }

            notificaciones.sort((a, b) => b.fecha - a.fecha);
            return notificaciones;

        } catch (error) {
            console.error('Error en obtenerNotificaciones:', error);
            return [];
        }
    }

    async obtenerConteoNoLeidas(usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase || !usuarioId) return 0;

            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            const userNotifRef = doc(db, userNotifCollectionName, usuarioId);
            const userNotifSnap = await getDoc(userNotifRef);

            if (!userNotifSnap.exists()) {
                return 0;
            }

            const userData = userNotifSnap.data();
            return userData.totalPendientes || 0;

        } catch (error) {
            console.error('Error en obtenerConteoNoLeidas:', error);
            return 0;
        }
    }

    async marcarComoLeida(usuarioId, notificacionId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase || !usuarioId || !notificacionId) return false;

            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            const userNotifRef = doc(db, userNotifCollectionName, usuarioId);

            await updateDoc(userNotifRef, {
                [`notificaciones.${notificacionId}.leida`]: true,
                [`notificaciones.${notificacionId}.fechaLectura`]: serverTimestamp(),
                totalPendientes: increment(-1)
            });

            const notificacionesCollectionName = this._getCollectionName(organizacionCamelCase);
            const notificacionRef = doc(db, notificacionesCollectionName, notificacionId);
            
            await updateDoc(notificacionRef, {
                leidas: increment(1)
            });

            return true;

        } catch (error) {
            console.error('Error en marcarComoLeida:', error);
            return false;
        }
    }

    async marcarTodasComoLeidas(usuarioId, organizacionCamelCase) {
        try {
            if (!organizacionCamelCase || !usuarioId) return false;

            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            const userNotifRef = doc(db, userNotifCollectionName, usuarioId);
            const userNotifSnap = await getDoc(userNotifRef);

            if (!userNotifSnap.exists()) {
                return false;
            }

            const userData = userNotifSnap.data();
            const notificaciones = userData.notificaciones || {};
            const batch = writeBatch(db);
            
            Object.keys(notificaciones).forEach(notifId => {
                if (!notificaciones[notifId].leida) {
                    batch.update(userNotifRef, {
                        [`notificaciones.${notifId}.leida`]: true,
                        [`notificaciones.${notifId}.fechaLectura`]: serverTimestamp()
                    });
                }
            });

            batch.update(userNotifRef, {
                totalPendientes: 0
            });

            await batch.commit();
            return true;

        } catch (error) {
            console.error('Error en marcarTodasComoLeidas:', error);
            return false;
        }
    }

    _getColorPorRiesgo(riesgo, tipo) {
        if (tipo !== 'canalizacion') return '#007bff';
        
        const colores = {
            'bajo': '#28a745',
            'medio': '#ffc107',
            'alto': '#fd7e14',
            'critico': '#dc3545'
        };
        return colores[riesgo] || '#28a745';
    }
}

export { NotificacionArea, NotificacionAreaManager };