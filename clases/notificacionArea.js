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
    writeBatch,
    deleteDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

class NotificacionArea {
    constructor(id, data) {
        this.id = id;
        this.titulo = data.titulo || '';
        this.mensaje = data.mensaje || '';
        this.tipo = data.tipo || 'canalizacion'; // canalizacion, comentario, asignacion, resolucion
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
        
        // Áreas destino - ARRAY DE IDs para consultas eficientes
        this.areasIds = data.areasIds || [];
        this.areasDestino = data.areasDestino || []; // Para mostrar en UI
        
        // Estadísticas
        this.totalUsuarios = data.totalUsuarios || 0;
        this.leidas = data.leidas || 0; // Contador global
        
        // URLs
        this.urlDestino = data.urlDestino || '';
        
        // Metadatos
        this.detalles = data.detalles || {};
        this.prioridad = data.prioridad || 'normal';
        this.icono = data.icono || 'fa-bell';
        this.color = data.color || '#007bff';
        
        // Campos para el usuario específico (se llenan en getNotificacionesUsuario)
        this.leida = false;
        this.fechaLectura = null;
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
            areasIds: this.areasIds,
            areasDestino: this.areasDestino,
            totalUsuarios: this.totalUsuarios,
            leidas: this.leidas,
            leida: this.leida,
            fechaLectura: this.fechaLectura,
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
     * Obtiene TODOS los usuarios activos de un área específica
     * con índice compuesto para consulta eficiente
     */
    async _getUsuariosPorAreaId(areaId, organizacionCamelCase) {
        try {
            if (!areaId) return [];

            console.log(`🔍 Buscando usuarios activos con areaAsignadaId = ${areaId}`);
            
            // Consultar en colección de colaboradores
            const colaboradoresCollection = `colaboradores_${organizacionCamelCase}`;
            const colabRef = collection(db, colaboradoresCollection);
            
            // Usar índice compuesto: areaAsignadaId + status + fechaCreacion
            const q = query(
                colabRef,
                where("areaAsignadaId", "==", areaId),
                where("status", "==", true),
                orderBy("fechaCreacion", "desc")
            );
            
            const snapshot = await getDocs(q);
            const usuarios = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                usuarios.push({
                    id: doc.id,
                    nombreCompleto: data.nombreCompleto || 'Usuario',
                    correo: data.correoElectronico || '',
                    dispositivos: data.dispositivos || [],
                    areaAsignadaId: data.areaAsignadaId,
                    tokensActivos: this._extraerTokensActivos(data.dispositivos)
                });
            });

            console.log(`✅ Total usuarios activos en área ${areaId}: ${usuarios.length}`);
            return usuarios;

        } catch (error) {
            console.error('Error en _getUsuariosPorAreaId:', error);
            return [];
        }
    }

    /**
     * Extrae tokens activos del array de dispositivos
     */
    _extraerTokensActivos(dispositivos) {
        if (!dispositivos || !Array.isArray(dispositivos)) return [];
        return dispositivos
            .filter(d => d.token && d.enabled !== false)
            .map(d => d.token);
    }

    /**
     * Obtiene usuarios de múltiples áreas (sin duplicados)
     */
    async _getUsuariosPorMultiplesAreas(areasIds, organizacionCamelCase) {
        try {
            if (!areasIds || areasIds.length === 0) return [];

            console.log(`🔍 Buscando usuarios en ${areasIds.length} áreas...`);
            
            const todosUsuarios = [];
            const idsVistos = new Set();
            
            // Ejecutar consultas en paralelo para mejor rendimiento
            const promises = areasIds.map(areaId => 
                this._getUsuariosPorAreaId(areaId, organizacionCamelCase)
            );
            
            const resultados = await Promise.all(promises);
            
            for (const usuariosArea of resultados) {
                for (const usuario of usuariosArea) {
                    if (!idsVistos.has(usuario.id)) {
                        idsVistos.add(usuario.id);
                        todosUsuarios.push(usuario);
                    }
                }
            }

            console.log(`✅ Total usuarios únicos: ${todosUsuarios.length}`);
            return todosUsuarios;

        } catch (error) {
            console.error('Error en _getUsuariosPorMultiplesAreas:', error);
            return [];
        }
    }

    /**
     * Enviar notificaciones push a usuarios - VERSIÓN OPTIMIZADA
     */
    async _enviarNotificacionesPush(usuarios, notificacionData) {
        try {
            console.log(`📱 Enviando notificaciones push a ${usuarios.length} usuarios...`);
            
            let enviados = 0;
            let fallidos = 0;
            const tokensUnicos = new Set();
            
            // Recolectar todos los tokens únicos
            for (const usuario of usuarios) {
                const tokens = this._extraerTokensActivos(usuario.dispositivos);
                tokens.forEach(token => tokensUnicos.add(token));
            }

            const tokensArray = Array.from(tokensUnicos);
            console.log(`📱 Tokens únicos a enviar: ${tokensArray.length}`);

            // Enviar a cada token
            for (const token of tokensArray) {
                try {
                    const response = await fetch(this.functionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token, // Enviar token directamente
                            userId: notificacionData.remitenteId || 'sistema',
                            userType: 'colaborador',
                            organizacionCamelCase: notificacionData.organizacionCamelCase,
                            title: notificacionData.titulo,
                            body: notificacionData.mensaje,
                            url: notificacionData.urlDestino,
                            senderToken: notificacionData.remitenteId || 'sistema',
                            data: {
                                incidenciaId: notificacionData.incidenciaId,
                                tipo: notificacionData.tipo,
                                nivelRiesgo: notificacionData.nivelRiesgo,
                                notificacionId: notificacionData.id,
                                areasIds: notificacionData.areasIds
                            }
                        })
                    });

                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        enviados++;
                    } else {
                        fallidos++;
                    }

                } catch (error) {
                    fallidos++;
                    console.error(`❌ Error push a token:`, error);
                }

                // Pequeña pausa para no saturar
                await new Promise(r => setTimeout(r, 50));
            }

            console.log(`📊 Push: ${enviados} enviados, ${fallidos} fallidos`);
            return { success: enviados > 0, enviados, fallidos, total: tokensArray.length };

        } catch (error) {
            console.error('❌ Error en _enviarNotificacionesPush:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * MÉTODO PRINCIPAL: Notificar a múltiples áreas
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
        mensajePersonalizado = '',
        detalles = {},
        prioridad = 'normal',
        remitenteId = null,
        remitenteNombre = null,
        organizacionCamelCase,
        enviarPush = true
    }) {
        try {
            if (!organizacionCamelCase) {
                return { success: false, error: 'organizacionCamelCase requerido' };
            }

            if (!areas || areas.length === 0) {
                return { success: true, notificacionCreada: false, mensaje: 'Sin áreas para notificar' };
            }

            if (!incidenciaId) {
                return { success: false, error: 'incidenciaId requerido' };
            }

            // Determinar remitente
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

            // Obtener usuarios de esas áreas
            const usuarios = await this._getUsuariosPorMultiplesAreas(areasIds, organizacionCamelCase);
            console.log(`👥 Usuarios encontrados: ${usuarios.length}`);

            // Crear título y mensaje
            const titulo = this._generarTitulo(tipo, areas, nivelRiesgo);
            let mensaje = mensajePersonalizado;
            
            if (!mensaje) {
                mensaje = this._generarMensaje(tipo, areas, incidenciaTitulo, sucursalNombre);
            }

            const urlDestino = `/usuarios/administrador/verIncidencias/verIncidencias.html?id=${incidenciaId}`;
            const notificacionId = this._generarNotificacionId();

            // Guardar notificación GLOBAL en Firestore
            const collectionName = this._getCollectionName(organizacionCamelCase);
            const notificacionRef = doc(db, collectionName, notificacionId);

            const notificacionData = {
                id: notificacionId,
                titulo: titulo,
                mensaje: mensaje,
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
                areasIds: areasIds, // ARRAY para consultas eficientes
                
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

            // Crear índices para cada usuario (estado de lectura)
            if (usuarios.length > 0) {
                await this._crearIndicesUsuarios(notificacionId, usuarios, organizacionCamelCase);
            }

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
     * Generar título según tipo y áreas
     */
    _generarTitulo(tipo, areas, nivelRiesgo) {
        if (tipo === 'canalizacion') {
            if (areas.length === 1) {
                return `📢 Incidencia canalizada a ${areas[0].nombre}`;
            } else {
                return `📢 Incidencia canalizada a ${areas.length} áreas`;
            }
        }
        return '📢 Nueva notificación';
    }

    /**
     * Generar mensaje descriptivo
     */
    _generarMensaje(tipo, areas, incidenciaTitulo, sucursalNombre) {
        let mensaje = '';
        
        if (incidenciaTitulo) {
            mensaje = incidenciaTitulo;
        } else {
            mensaje = 'Se ha canalizado una nueva incidencia';
        }
        
        if (sucursalNombre) {
            mensaje += ` en ${sucursalNombre}`;
        }
        
        return mensaje;
    }

    /**
     * Crear índices para cada usuario (estado de lectura)
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

                // Firestore batch tiene límite de 500 operaciones
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
     * Obtener notificaciones de un usuario con ordenamiento por fecha
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

            // Ordenar por fecha de recepción (del mapa)
            notificacionesIds.sort((a, b) => {
                const fechaA = notificacionesMap[a].fechaRecepcion?.toDate?.() || new Date(0);
                const fechaB = notificacionesMap[b].fechaRecepcion?.toDate?.() || new Date(0);
                return fechaB - fechaA;
            });

            notificacionesIds = notificacionesIds.slice(0, limite);

            if (notificacionesIds.length === 0) {
                return [];
            }

            const notificaciones = [];

            // Obtener notificaciones en lotes de 10 (límite de Firestore para IN)
            for (let i = 0; i < notificacionesIds.length; i += 10) {
                const batchIds = notificacionesIds.slice(i, i + 10);
                
                const q = query(
                    collection(db, notificacionesCollectionName),
                    where("__name__", "in", batchIds),
                    orderBy("fecha", "desc") // Ordenar por fecha de creación
                );
                
                const snapshot = await getDocs(q);
                
                snapshot.forEach(doc => {
                    const notifData = doc.data();
                    const userNotifData = notificacionesMap[doc.id] || { leida: false };
                    
                    const notificacion = new NotificacionArea(doc.id, {
                        ...notifData,
                        leida: userNotifData.leida,
                        fechaLectura: userNotifData.fechaLectura
                    });
                    
                    notificaciones.push(notificacion);
                });
            }

            return notificaciones;

        } catch (error) {
            console.error('Error en obtenerNotificaciones:', error);
            return [];
        }
    }

    /**
     * Obtener notificaciones filtradas por área (para vistas específicas)
     */
    async obtenerNotificacionesPorArea(areaId, organizacionCamelCase, limite = 50) {
        try {
            if (!organizacionCamelCase || !areaId) return [];

            const notificacionesCollectionName = this._getCollectionName(organizacionCamelCase);
            
            // Usar índice compuesto: areasIds + fecha
            const q = query(
                collection(db, notificacionesCollectionName),
                where("areasIds", "array-contains", areaId),
                orderBy("fecha", "desc"),
                limit(limite)
            );
            
            const snapshot = await getDocs(q);
            const notificaciones = [];
            
            snapshot.forEach(doc => {
                notificaciones.push(new NotificacionArea(doc.id, doc.data()));
            });
            
            return notificaciones;

        } catch (error) {
            console.error('Error en obtenerNotificacionesPorArea:', error);
            return [];
        }
    }

    /**
     * Obtener conteo de no leídas (desde el documento del usuario)
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

            // Actualizar estado en el documento del usuario
            await updateDoc(userNotifRef, {
                [`notificaciones.${notificacionId}.leida`]: true,
                [`notificaciones.${notificacionId}.fechaLectura`]: serverTimestamp(),
                totalPendientes: increment(-1)
            });

            // Incrementar contador global en la notificación
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
     * Marcar todas como leídas (para un usuario)
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
            
            // Obtener todas las no leídas para actualizar contadores globales
            const noLeidasIds = Object.keys(notificaciones).filter(id => !notificaciones[id].leida);
            
            // Actualizar cada notificación en el documento del usuario
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

            // Actualizar contadores globales (en segundo plano, no crítico)
            if (noLeidasIds.length > 0) {
                const notificacionesCollectionName = this._getCollectionName(organizacionCamelCase);
                for (const notifId of noLeidasIds) {
                    try {
                        const notifRef = doc(db, notificacionesCollectionName, notifId);
                        await updateDoc(notifRef, {
                            leidas: increment(1)
                        });
                    } catch (e) {
                        console.warn(`No se pudo actualizar contador global para ${notifId}`);
                    }
                }
            }

            return true;

        } catch (error) {
            console.error('Error en marcarTodasComoLeidas:', error);
            return false;
        }
    }

    /**
     * Eliminar notificaciones antiguas (para limpieza)
     */
    async limpiarNotificacionesAntiguas(organizacionCamelCase, dias = 30) {
        try {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - dias);
            
            const notificacionesCollectionName = this._getCollectionName(organizacionCamelCase);
            const q = query(
                collection(db, notificacionesCollectionName),
                where("fecha", "<", fechaLimite),
                limit(100) // Limitar por seguridad
            );
            
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`✅ Limpiadas ${snapshot.size} notificaciones antiguas`);
            
            return { success: true, eliminadas: snapshot.size };

        } catch (error) {
            console.error('Error limpiando notificaciones:', error);
            return { success: false, error: error.message };
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