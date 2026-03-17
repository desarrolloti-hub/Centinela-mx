// [file name]: notificacionArea.js
// [file path]: /clases/notificacionArea.js

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
        this.areasIds = data.areasIds || (data.areasDestino ? data.areasDestino.map(a => a.id) : []);
        
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
            areasIds: this.areasIds,
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
        this.functionUrl = 'https://us-central1-centinela-mx.cloudfunctions.net/sendPushNotification';
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

    /**
     * Obtiene TODOS los usuarios de un área específica
     */
    async _getUsuariosPorAreaId(areaId, organizacionCamelCase) {
        try {
            if (!areaId) return [];

            console.log(`🔍 Buscando usuarios con areaAsignadaId = ${areaId}`);
            
            const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
            
            const collectionName = `users_${organizacionCamelCase}`;
            const usersCollection = collection(db, collectionName);
            
            const q = query(
                usersCollection,
                where("areaAsignadaId", "==", areaId),
                where("status", "==", true)
            );
            
            const snapshot = await getDocs(q);
            const usuarios = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`✅ Usuario encontrado: ${data.nombreCompleto}`);
                
                usuarios.push({
                    id: doc.id,
                    nombreCompleto: data.nombreCompleto || 'Usuario',
                    correo: data.correoElectronico || '',
                    dispositivos: data.dispositivos || [],
                    areaAsignadaId: data.areaAsignadaId
                });
            });

            console.log(`✅ Total usuarios en área ${areaId}: ${usuarios.length}`);
            return usuarios;

        } catch (error) {
            console.error('Error en _getUsuariosPorAreaId:', error);
            return [];
        }
    }

    /**
     * Obtiene usuarios de múltiples áreas
     */
    async _getUsuariosPorMultiplesAreas(areasIds, organizacionCamelCase) {
        try {
            if (!areasIds || areasIds.length === 0) return [];

            const todosUsuarios = [];
            
            for (const areaId of areasIds) {
                const usuariosArea = await this._getUsuariosPorAreaId(areaId, organizacionCamelCase);
                todosUsuarios.push(...usuariosArea);
            }

            // Eliminar duplicados
            const usuariosUnicos = [];
            const idsVistos = new Set();
            
            for (const usuario of todosUsuarios) {
                if (!idsVistos.has(usuario.id)) {
                    idsVistos.add(usuario.id);
                    usuariosUnicos.push(usuario);
                }
            }

            console.log(`✅ Total usuarios únicos: ${usuariosUnicos.length}`);
            return usuariosUnicos;

        } catch (error) {
            console.error('Error en _getUsuariosPorMultiplesAreas:', error);
            return [];
        }
    }

    /**
     * Enviar notificaciones push a usuarios - VERSIÓN CORREGIDA
     */
    async _enviarNotificacionesPush(usuarios, notificacionData) {
        try {
            console.log(`📱 Enviando notificaciones push a ${usuarios.length} usuarios...`);
            
            let enviados = 0;
            let fallidos = 0;
            
            for (const usuario of usuarios) {
                if (!usuario.dispositivos || !Array.isArray(usuario.dispositivos) || usuario.dispositivos.length === 0) {
                    console.log(`⚠️ Usuario ${usuario.id} no tiene dispositivos`);
                    continue;
                }

                // Filtrar dispositivos activos
                const dispositivosActivos = usuario.dispositivos.filter(d => d.enabled === true);
                
                for (const dispositivo of dispositivosActivos) {
                    if (!dispositivo.token) continue;
                    
                    try {
                        console.log(`📤 Enviando push a ${usuario.id} - token: ${dispositivo.token.substring(0, 20)}...`);
                        
                        const response = await fetch(this.functionUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userId: usuario.id,
                                userType: 'colaborador',
                                organizacionCamelCase: notificacionData.organizacionCamelCase,
                                title: notificacionData.titulo,
                                body: notificacionData.mensaje,
                                url: notificacionData.urlDestino,
                                senderToken: notificacionData.remitenteId,
                                data: {
                                    incidenciaId: notificacionData.incidenciaId,
                                    tipo: notificacionData.tipo,
                                    nivelRiesgo: notificacionData.nivelRiesgo,
                                    notificacionId: notificacionData.id
                                }
                            })
                        });

                        const result = await response.json();
                        
                        if (response.ok && result.success) {
                            enviados++;
                            console.log(`✅ Push enviado a ${usuario.id}`);
                        } else {
                            fallidos++;
                            console.log(`❌ Error push a ${usuario.id}:`, result);
                        }

                    } catch (error) {
                        fallidos++;
                        console.error(`❌ Error enviando push a ${usuario.id}:`, error);
                    }

                    await new Promise(r => setTimeout(r, 100));
                }
            }

            console.log(`📊 Push: ${enviados} enviados, ${fallidos} fallidos`);

            return {
                success: enviados > 0,
                enviados: enviados,
                fallidos: fallidos,
                total: usuarios.length
            };

        } catch (error) {
            console.error('❌ Error en _enviarNotificacionesPush:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Método principal: Notificar a múltiples áreas
     */
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
        organizacionCamelCase,
        enviarPush = true
    }) {
        try {
            if (!organizacionCamelCase) {
                console.error('❌ Error: organizacionCamelCase requerido');
                return { success: false, error: 'organizacionCamelCase requerido' };
            }

            if (!areas || areas.length === 0) {
                return { success: true, notificacionCreada: false };
            }

            if (!incidenciaId) {
                console.error('❌ Error: incidenciaId requerido');
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

            // Obtener IDs de las áreas
            const areasIds = areas.map(a => a.id);
            console.log('📋 Áreas a notificar:', areasIds);

            // Obtener TODOS los usuarios de esas áreas
            const usuarios = await this._getUsuariosPorMultiplesAreas(areasIds, organizacionCamelCase);
            console.log(`👥 Usuarios encontrados: ${usuarios.length}`);

            // Crear mensaje
            const titulo = `📢 Incidencia canalizada`;
            let mensajeFinal = mensaje;
            
            if (!mensajeFinal) {
                if (areas.length === 1) {
                    mensajeFinal = `Nueva incidencia canalizada al área: ${areas[0].nombre}`;
                } else {
                    mensajeFinal = `Nueva incidencia canalizada a ${areas.length} áreas`;
                }
                if (incidenciaTitulo) {
                    mensajeFinal = `${incidenciaTitulo}`;
                }
            }

            const urlDestino = `/usuarios/administrador/verIncidencias/verIncidencias.html?id=${incidenciaId}`;
            const notificacionId = this._generarNotificacionId();

            // Guardar en Firestore (UNA SOLA NOTIFICACIÓN GLOBAL)
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const notificacionRef = doc(db, collectionName, notificacionId);

            const notificacionData = {
                id: notificacionId,
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
                areasIds: areasIds,
                
                totalUsuarios: usuarios.length,
                leidas: 0,
                
                detalles: detalles,
                icono: tipo === 'canalizacion' ? 'fa-share-alt' : 'fa-bell',
                color: this._getColorPorRiesgo(nivelRiesgo, tipo),
                
                urlDestino: urlDestino,
                
                fechaCreacion: serverTimestamp()
            };

            await setDoc(notificacionRef, notificacionData);
            console.log(`✅ Notificación guardada: ${notificacionId}`);

            // Crear índices para cada usuario
            await this._crearIndicesUsuarios(notificacionId, usuarios, organizacionCamelCase);

            // ENVIAR NOTIFICACIONES PUSH
            let pushResult = null;
            if (enviarPush && usuarios.length > 0) {
                pushResult = await this._enviarNotificacionesPush(usuarios, notificacionData);
            }

            return {
                success: true,
                notificacionId: notificacionId,
                totalUsuarios: usuarios.length,
                areas: areas.length,
                push: pushResult
            };

        } catch (error) {
            console.error('❌ Error en notificarMultiplesAreas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear índices para cada usuario
     */
    async _crearIndicesUsuarios(notificacionId, usuarios, organizacionCamelCase) {
        try {
            if (!usuarios || usuarios.length === 0) return;

            const batch = writeBatch(db);
            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            let operaciones = 0;

            for (const usuario of usuarios) {
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

                if (operaciones >= 400) {
                    await batch.commit();
                    console.log(`✅ Lote de ${operaciones} índices guardado`);
                    operaciones = 0;
                }
            }

            if (operaciones > 0) {
                await batch.commit();
                console.log(`✅ Último lote de ${operaciones} índices guardado`);
            }

        } catch (error) {
            console.error('Error creando índices:', error);
        }
    }

    /**
     * Obtener notificaciones de un usuario
     */
    async obtenerNotificaciones(usuarioId, organizacionCamelCase, soloNoLeidas = false, limite = 50) {
        try {
            if (!organizacionCamelCase || !usuarioId) return [];

            const userNotifCollectionName = this._getUserNotificacionesCollectionName(organizacionCamelCase);
            const notificacionesCollectionName = this._getCollectionName(organizacionCamelCase);

            // Obtener índices del usuario
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

    /**
     * Obtener conteo de no leídas
     */
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

    /**
     * Marcar notificación como leída
     */
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

    /**
     * Marcar todas como leídas
     */
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