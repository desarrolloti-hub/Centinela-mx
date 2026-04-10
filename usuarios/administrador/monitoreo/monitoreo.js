// monitoreo.js - Controlador de la vista de monitoreo
// Versión con TIEMPO REAL (onSnapshot) - Sin parpadeos

import { Evento } from '/clases/evento.js';
import { CuentaPM } from '/clases/cuentaPM.js';
import { db } from '/config/firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    onSnapshot,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ========== VARIABLES GLOBALES ==========
let todosLosEventos = [];
let eventosFiltrados = [];
let cuentaActual = null;
let usuarioActual = null;
let filtroActivo = 'all';
let terminoBusqueda = '';
let unsubscribeEventos = null; // Para desuscribirse del listener
let emailsAsociados = []; // Lista de emails a monitorear

const ITEMS_POR_PAGINA = 15;
let paginaActual = 1;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Iniciando Monitoreo de Eventos (Tiempo Real)...');
        
        // Obtener usuario del localStorage
        usuarioActual = obtenerUsuarioActual();
        
        if (!usuarioActual) {
            throw new Error('No se encontró información del usuario');
        }
        
        console.log('👤 Usuario cargado:', usuarioActual.nombreCompleto);
        console.log('🏢 Organización:', usuarioActual.organizacionCamelCase);
        
        // Actualizar UI con info del usuario
        actualizarInfoUsuario();
        
        // Cargar cuenta PM asociada
        await cargarCuentaPM();
        
        // Iniciar escucha en tiempo real
        await iniciarEscuchaTiempoReal();
        
        // Configurar eventos de UI
        configurarEventosUI();
        
    } catch (error) {
        console.error('❌ Error inicializando monitoreo:', error);
        mostrarError(error.message);
    }
});

// ========== OBTENER USUARIO DEL LOCALSTORAGE ==========
function obtenerUsuarioActual() {
    try {
        const userDataStr = localStorage.getItem('userData');
        if (!userDataStr) {
            console.warn('⚠️ No se encontró userData en localStorage');
            return null;
        }
        
        const userData = JSON.parse(userDataStr);
        
        return {
            id: userData.id || userData.uid,
            nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
            organizacion: userData.organizacion || '',
            organizacionCamelCase: userData.organizacionCamelCase || '',
            correoElectronico: userData.correoElectronico || userData.email || '',
            rol: userData.rol || 'colaborador'
        };
    } catch (error) {
        console.error('❌ Error parseando userData:', error);
        return null;
    }
}

// ========== ACTUALIZAR INFO EN UI ==========
function actualizarInfoUsuario() {
    const organizacionInfo = document.getElementById('organizacionInfo');
    if (organizacionInfo && usuarioActual) {
        organizacionInfo.textContent = usuarioActual.organizacion || 'Organización';
    }
}

// ========== CARGAR CUENTA PM ==========
async function cargarCuentaPM() {
    try {
        if (!usuarioActual?.organizacionCamelCase) {
            console.warn('⚠️ Usuario sin organización definida');
            return;
        }
        
        console.log('🔍 Buscando cuentas PM para:', usuarioActual.organizacionCamelCase);
        
        const cuentasPM = await CuentaPM.obtenerPorOrganizacion(usuarioActual.organizacionCamelCase);
        
        console.log(`📊 Cuentas PM encontradas: ${cuentasPM.length}`);
        
        if (cuentasPM && cuentasPM.length > 0) {
            cuentaActual = cuentasPM.find(c => c.status === 'activa') || cuentasPM[0];
            
            // Guardar emails para la escucha en tiempo real
            emailsAsociados = cuentasPM.map(c => c.email).filter(email => email);
            
            const cuentaInfo = document.getElementById('cuentaInfo');
            if (cuentaInfo) {
                const paneles = cuentaActual.panelTokens || [];
                const panelesStr = paneles.length > 0 ? paneles.slice(0, 3).join(', ') + (paneles.length > 3 ? '...' : '') : 'No especificado';
                
                cuentaInfo.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #2ecc71;"></i> 
                    <strong>Email:</strong> ${cuentaActual.email} | 
                    <strong>Paneles:</strong> ${panelesStr}
                    <span style="margin-left: 15px; color: #2ecc71;">
                        <i class="fas fa-circle" style="font-size: 8px; animation: pulse 1.5s infinite;"></i> 
                        Tiempo Real Activo
                    </span>
                `;
            }
            
            console.log(`✅ Cuenta PM cargada. Emails a monitorear:`, emailsAsociados);
        } else {
            const cuentaInfo = document.getElementById('cuentaInfo');
            if (cuentaInfo) {
                cuentaInfo.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i> No hay cuentas PM asociadas`;
            }
            console.warn('⚠️ No se encontraron cuentas PM para la organización');
        }
        
    } catch (error) {
        console.error('❌ Error cargando cuenta PM:', error);
    }
}

// ========== INICIAR ESCUCHA EN TIEMPO REAL ==========
async function iniciarEscuchaTiempoReal() {
    try {
        // Cancelar escucha anterior si existe
        if (unsubscribeEventos) {
            unsubscribeEventos();
            unsubscribeEventos = null;
        }
        
        if (!emailsAsociados || emailsAsociados.length === 0) {
            console.warn('⚠️ No hay emails para monitorear');
            todosLosEventos = [];
            actualizarEstadisticas();
            aplicarFiltros();
            return;
        }
        
        console.log('🎧 Iniciando escucha en tiempo real para emails:', emailsAsociados);
        
        mostrarLoading();
        
        // Crear query con los emails asociados
        const eventosRef = collection(db, "eventos");
        
        // Nota: Firestore solo permite hasta 10 valores en "in"
        const emailsParaQuery = emailsAsociados.slice(0, 10);
        
        const q = query(
            eventosRef,
            where("email_asociado", "in", emailsParaQuery),
            orderBy("createdAt", "desc"),
            limit(500)
        );
        
        // Escuchar cambios en tiempo real
        unsubscribeEventos = onSnapshot(q, 
            (snapshot) => {
                console.log(`📡 Actualización en tiempo real: ${snapshot.docChanges().length} cambios`);
                
                // Procesar cambios
                snapshot.docChanges().forEach((change) => {
                    const doc = change.doc;
                    const data = doc.data();
                    const evento = new Evento(doc.id, { ...data, id: doc.id });
                    
                    if (change.type === "added") {
                        // Nuevo evento
                        console.log(`🆕 NUEVO EVENTO: ${evento.description} | ${evento.panel_serial}`);
                        
                        // Agregar al inicio del array
                        todosLosEventos.unshift(evento);
                        
                        // Mostrar notificación si está habilitado
                        if (Notification.permission === "granted" && evento.estadoEvento === 'pendiente') {
                            mostrarNotificacion(evento);
                        }
                        
                        // Efecto visual de nuevo evento
                        marcarNuevoEvento(evento.id);
                        
                    } else if (change.type === "modified") {
                        // Evento actualizado (atendido/ignorado)
                        console.log(`✏️ Evento actualizado: ${evento.description}`);
                        
                        const index = todosLosEventos.findIndex(e => e.id === evento.id);
                        if (index !== -1) {
                            todosLosEventos[index] = evento;
                        }
                        
                    } else if (change.type === "removed") {
                        // Evento eliminado
                        console.log(`🗑️ Evento eliminado: ${change.doc.id}`);
                        
                        todosLosEventos = todosLosEventos.filter(e => e.id !== change.doc.id);
                    }
                });
                
                // Actualizar UI
                actualizarEstadisticas();
                aplicarFiltros();
                
            },
            (error) => {
                console.error('❌ Error en escucha tiempo real:', error);
                mostrarError('Error en conexión tiempo real: ' + error.message);
                
                // Reintentar después de 5 segundos
                setTimeout(() => {
                    console.log('🔄 Reintentando conexión...');
                    iniciarEscuchaTiempoReal();
                }, 5000);
            }
        );
        
        console.log('✅ Escucha en tiempo real iniciada');
        
        // Solicitar permiso para notificaciones
        solicitarPermisoNotificaciones();
        
    } catch (error) {
        console.error('❌ Error iniciando escucha:', error);
        
        // Fallback: cargar una vez
        await cargarEventosUnaVez();
    }
}

// ========== CARGAR EVENTOS UNA VEZ (FALLBACK) ==========
async function cargarEventosUnaVez() {
    try {
        mostrarLoading();
        
        if (!usuarioActual?.organizacionCamelCase) {
            todosLosEventos = [];
        } else {
            todosLosEventos = await Evento.obtenerPorOrganizacion(usuarioActual.organizacionCamelCase, {
                limite: 500
            });
            
            console.log(`✅ Eventos cargados (una vez): ${todosLosEventos.length}`);
        }
        
        actualizarEstadisticas();
        aplicarFiltros();
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        mostrarError('No se pudieron cargar los eventos');
    }
}

// ========== MOSTRAR NOTIFICACIÓN ==========
function mostrarNotificacion(evento) {
    const titulo = evento.type_id === 584 ? '🚨 ALARMA MÉDICA' : 
                   evento.esAlarma ? '🔔 NUEVA ALARMA' : '📋 Nuevo Evento';
    
    const opciones = {
        body: `${evento.description}\nPanel: ${evento.panel_serial}\n${evento.panel_alias || ''}`,
        icon: '/assets/images/logo.png',
        badge: '/assets/images/logo.png',
        tag: evento.id,
        requireInteraction: evento.type_id === 584, // Alarmas médicas requieren interacción
        vibrate: [200, 100, 200]
    };
    
    if (Notification.permission === "granted") {
        const notificacion = new Notification(titulo, opciones);
        
        notificacion.onclick = () => {
            window.focus();
            mostrarDetallesEvento(evento.id);
            notificacion.close();
        };
    }
}

// ========== SOLICITAR PERMISO PARA NOTIFICACIONES ==========
function solicitarPermisoNotificaciones() {
    if (!("Notification" in window)) {
        console.log('🔕 Notificaciones no soportadas');
        return;
    }
    
    if (Notification.permission === "granted") {
        console.log('🔔 Notificaciones permitidas');
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log('✅ Permiso de notificaciones concedido');
            }
        });
    }
}

// ========== MARCAR NUEVO EVENTO (EFECTO VISUAL) ==========
function marcarNuevoEvento(eventoId) {
    // Esperar a que se renderice
    setTimeout(() => {
        const card = document.querySelector(`.event-card[data-event-id="${eventoId}"]`);
        if (card) {
            card.classList.add('new-event');
            card.style.animation = 'pulse-new 1s ease-in-out';
            
            // Quitar la clase después de la animación
            setTimeout(() => {
                card.classList.remove('new-event');
                card.style.animation = '';
            }, 2000);
        }
    }, 100);
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function actualizarEstadisticas() {
    const stats = {
        total: todosLosEventos.length,
        pendientes: todosLosEventos.filter(e => e.estadoEvento === 'pendiente').length,
        alarmas: todosLosEventos.filter(e => e.esAlarma).length,
        atendidos: todosLosEventos.filter(e => e.estadoEvento === 'atendido').length
    };
    
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPendientes').textContent = stats.pendientes;
    document.getElementById('statAlarmas').textContent = stats.alarmas;
    document.getElementById('statAtendidos').textContent = stats.atendidos;
}

// ========== APLICAR FILTROS ==========
function aplicarFiltros() {
    let filtrados = [...todosLosEventos];
    
    switch (filtroActivo) {
        case 'pendiente':
            filtrados = filtrados.filter(e => e.estadoEvento === 'pendiente');
            break;
        case 'alarma':
            filtrados = filtrados.filter(e => e.esAlarma);
            break;
        case 'atendido':
            filtrados = filtrados.filter(e => e.estadoEvento === 'atendido');
            break;
        case 'hoy':
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            filtrados = filtrados.filter(e => {
                const fechaEvento = e.createdAt;
                return fechaEvento && fechaEvento >= hoy;
            });
            break;
    }
    
    if (terminoBusqueda) {
        const termino = terminoBusqueda.toLowerCase();
        filtrados = filtrados.filter(e => 
            (e.description && e.description.toLowerCase().includes(termino)) ||
            (e.panel_serial && e.panel_serial.toLowerCase().includes(termino)) ||
            (e.panel_alias && e.panel_alias.toLowerCase().includes(termino)) ||
            (e.email_asociado && e.email_asociado.toLowerCase().includes(termino))
        );
    }
    
    eventosFiltrados = filtrados;
    paginaActual = 1;
    
    renderizarEventos();
}

// ========== RENDERIZAR EVENTOS ==========
function renderizarEventos() {
    const timeline = document.getElementById('eventsTimeline');
    const eventCount = document.getElementById('eventCount');
    
    if (!timeline) return;
    
    if (eventCount) {
        eventCount.textContent = `${eventosFiltrados.length} evento${eventosFiltrados.length !== 1 ? 's' : ''}`;
    }
    
    const totalPaginas = Math.ceil(eventosFiltrados.length / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, eventosFiltrados.length);
    const eventosPagina = eventosFiltrados.slice(inicio, fin);
    
    if (eventosFiltrados.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state" style="padding: 60px 20px; text-align: center;">
                <i class="fas fa-shield-alt" style="font-size: 48px; color: rgba(255,255,255,0.2); margin-bottom: 20px;"></i>
                <h3 style="color: var(--color-text-primary);">No hay eventos para mostrar</h3>
                <p style="color: var(--color-text-secondary);">
                    ${terminoBusqueda ? 'No se encontraron resultados' : 'Esperando eventos...'}
                </p>
            </div>
        `;
        document.getElementById('paginationContainer').style.display = 'none';
        return;
    }
    
    let html = '';
    eventosPagina.forEach(evento => {
        html += renderizarEventoCard(evento);
    });
    
    timeline.innerHTML = html;
    
    renderizarPaginacion(totalPaginas);
    configurarBotonesAccion();
}

// ========== RENDERIZAR CARD DE EVENTO ==========
function renderizarEventoCard(evento) {
    const prioridad = evento.prioridad;
    const estado = evento.estadoEvento;
    const esAlarma = evento.esAlarma;
    const esMedicalAlarm = evento.type_id === 584;
    
    let iconoClass = 'system';
    let icono = 'fa-cog';
    
    if (esMedicalAlarm) {
        iconoClass = 'alarm';
        icono = 'fa-heartbeat';
    } else if (esAlarma) {
        iconoClass = 'alarm';
        icono = 'fa-bell';
    } else if (evento.esRestauracion) {
        iconoClass = 'restore';
        icono = 'fa-rotate-left';
    }
    
    const fechaFormateada = evento.fechaFormateada || 'Fecha no disponible';
    const panelInfo = evento.panel_alias ? `${evento.panel_alias} (${evento.panel_serial})` : evento.panel_serial;
    
    return `
        <div class="event-card ${prioridad} ${estado}" data-event-id="${evento.id}">
            <div class="event-icon ${iconoClass}">
                <i class="fas ${icono}"></i>
            </div>
            <div class="event-content">
                <div class="event-header">
                    <span class="event-title">
                        ${esMedicalAlarm ? '🚨 ' : ''}${escapeHTML(evento.description || 'Evento sin descripción')}
                    </span>
                    <span class="event-badge ${estado}">
                        <i class="fas ${estado === 'pendiente' ? 'fa-clock' : (estado === 'atendido' ? 'fa-check-circle' : 'fa-ban')}"></i>
                        ${estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </span>
                </div>
                <div class="event-details">
                    <div class="event-detail">
                        <i class="fas fa-microchip"></i>
                        <span>${escapeHTML(panelInfo || 'N/A')}</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-clock"></i>
                        <span>${fechaFormateada}</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-envelope"></i>
                        <span>${escapeHTML(evento.email_asociado || 'N/A')}</span>
                    </div>
                </div>
                ${evento.atendido ? `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 13px;">
                        <i class="fas fa-user-check" style="color: #2ecc71;"></i>
                        <span>Atendido por: ${escapeHTML(evento.nombreUsuarioAtencion)}</span>
                        ${evento.mensajeRespuesta ? `<br><i class="fas fa-comment" style="margin-left: 22px;"></i> "${escapeHTML(evento.mensajeRespuesta)}"` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="event-actions">
                ${estado === 'pendiente' ? `
                    <button class="event-btn success btn-atender" data-id="${evento.id}" title="Marcar como atendido">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="event-btn info btn-detalles" data-id="${evento.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${estado === 'pendiente' ? `
                    <button class="event-btn warning btn-ignorar" data-id="${evento.id}" title="Ignorar">
                        <i class="fas fa-ban"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ========== RENDERIZAR PAGINACIÓN ==========
function renderizarPaginacion(totalPaginas) {
    const paginationContainer = document.getElementById('paginationContainer');
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (totalPaginas <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA + 1;
    const fin = Math.min(paginaActual * ITEMS_POR_PAGINA, eventosFiltrados.length);
    paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${eventosFiltrados.length} eventos`;
    
    let html = '';
    
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaActual - 2 && i <= paginaActual + 2)) {
            html += `
                <li class="page-item ${i === paginaActual ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        } else if (i === paginaActual - 3 || i === paginaActual + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    pagination.innerHTML = html;
    
    pagination.querySelectorAll('.page-link[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            paginaActual = parseInt(btn.dataset.page);
            renderizarEventos();
            document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ========== CONFIGURAR BOTONES DE ACCIÓN ==========
function configurarBotonesAccion() {
    document.querySelectorAll('.btn-atender').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalAtender(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-detalles').forEach(btn => {
        btn.addEventListener('click', () => mostrarDetallesEvento(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-ignorar').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalIgnorar(btn.dataset.id));
    });
}

// ========== MOSTRAR MODAL PARA ATENDER ==========
async function mostrarModalAtender(eventoId) {
    const evento = eventosFiltrados.find(e => e.id === eventoId);
    if (!evento) return;
    
    const result = await Swal.fire({
        title: evento.type_id === 584 ? '🚨 Atender Alarma Médica' : 'Atender Evento',
        html: `
            <div style="text-align: left; padding: 10px;">
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <strong>${escapeHTML(evento.description)}</strong><br>
                    <span>Panel: ${escapeHTML(evento.panel_serial)}</span>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--color-text-primary);">
                        <i class="fas fa-comment"></i> Mensaje de respuesta
                    </label>
                    <textarea id="mensajeRespuesta" rows="3" style="width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--color-border-light); border-radius: 8px; color: var(--color-text-primary); resize: vertical;" placeholder="Ej: Se notificó al cliente..."></textarea>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Marcar como Atendido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2ecc71',
        preConfirm: () => document.getElementById('mensajeRespuesta').value
    });
    
    if (result.isConfirmed) {
        try {
            await evento.marcarComoAtendido(
                usuarioActual.id,
                usuarioActual.nombreCompleto,
                result.value
            );
            
            Swal.fire({
                icon: 'success',
                title: '¡Evento atendido!',
                timer: 1500,
                showConfirmButton: false
            });
            
            // La UI se actualizará automáticamente por onSnapshot
            
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        }
    }
}

// ========== MOSTRAR DETALLES DEL EVENTO ==========
async function mostrarDetallesEvento(eventoId) {
    const evento = eventosFiltrados.find(e => e.id === eventoId);
    if (!evento) return;
    
    const detallesHtml = `
        <div style="text-align: left;">
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: var(--color-text-primary);">
                    ${evento.type_id === 584 ? '🚨 ' : ''}${escapeHTML(evento.description)}
                </h4>
                <span class="event-badge ${evento.estadoEvento}">${evento.estadoEvento.toUpperCase()}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Panel:</strong> ${escapeHTML(evento.panel_serial)}</div>
                <div><strong>Alias:</strong> ${escapeHTML(evento.panel_alias || 'N/A')}</div>
                <div><strong>Email:</strong> ${escapeHTML(evento.email_asociado)}</div>
                <div><strong>Tipo:</strong> ${escapeHTML(evento.device_type)}</div>
                <div><strong>Evento ID:</strong> ${evento.event}</div>
                <div><strong>Tipo ID:</strong> ${evento.type_id}</div>
                <div><strong>Fecha:</strong> ${evento.fechaFormateada}</div>
                <div><strong>Timestamp:</strong> ${evento.timestamp_original}</div>
                <div><strong>Zona:</strong> ${evento.zone} ${evento.zone_name ? `(${evento.zone_name})` : ''}</div>
                <div><strong>Particiones:</strong> ${evento.partitions?.join(', ') || 'N/A'}</div>
                <div><strong>Appointment:</strong> ${escapeHTML(evento.appointment)}</div>
                <div><strong>Video:</strong> ${evento.video ? 'Sí' : 'No'}</div>
            </div>
            
            ${evento.atendido ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border-left: 4px solid #2ecc71;">
                    <h5 style="margin: 0 0 10px 0; color: #2ecc71;">Información de Atención</h5>
                    <p><strong>Atendido por:</strong> ${escapeHTML(evento.nombreUsuarioAtencion)}</p>
                    <p><strong>Fecha:</strong> ${evento.fechaAtencionFormateada}</p>
                    <p><strong>Mensaje:</strong> ${escapeHTML(evento.mensajeRespuesta || 'Sin mensaje')}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    Swal.fire({
        title: 'Detalles del Evento',
        html: detallesHtml,
        width: 700,
        showConfirmButton: false,
        showCloseButton: true
    });
}

// ========== MOSTRAR MODAL PARA IGNORAR ==========
async function mostrarModalIgnorar(eventoId) {
    const evento = eventosFiltrados.find(e => e.id === eventoId);
    if (!evento) return;
    
    const result = await Swal.fire({
        title: 'Ignorar Evento',
        html: `<p>¿Ignorar este evento?</p><p style="font-size: 14px;">${escapeHTML(evento.description)}</p>`,
        input: 'text',
        inputPlaceholder: 'Motivo (opcional)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ignorar',
        confirmButtonColor: '#95a5a6'
    });
    
    if (result.isConfirmed) {
        try {
            await evento.marcarComoIgnorado(
                usuarioActual.id,
                usuarioActual.nombreCompleto,
                result.value || 'Evento ignorado'
            );
            
            Swal.fire({
                icon: 'success',
                title: 'Evento ignorado',
                timer: 1500,
                showConfirmButton: false
            });
            
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        }
    }
}

// ========== CONFIGURAR EVENTOS DE UI ==========
function configurarEventosUI() {
    // Filtros rápidos
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filtroActivo = chip.dataset.filter;
            paginaActual = 1;
            aplicarFiltros();
        });
    });
    
    // Búsqueda
    document.getElementById('btnBuscarEvento')?.addEventListener('click', () => {
        terminoBusqueda = document.getElementById('buscarEvento').value.trim();
        paginaActual = 1;
        aplicarFiltros();
    });
    
    document.getElementById('btnLimpiarBusqueda')?.addEventListener('click', () => {
        document.getElementById('buscarEvento').value = '';
        terminoBusqueda = '';
        paginaActual = 1;
        aplicarFiltros();
    });
    
    document.getElementById('buscarEvento')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            terminoBusqueda = e.target.value.trim();
            paginaActual = 1;
            aplicarFiltros();
        }
    });
    
    // Quitar botón de refresh manual (ya no es necesario)
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.style.display = 'none';
    }
    
    // Quitar toggle de auto-refresh
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.parentElement.style.display = 'none';
    }
}

// ========== UTILIDADES ==========
function mostrarLoading() {
    const timeline = document.getElementById('eventsTimeline');
    if (timeline) {
        timeline.innerHTML = `
            <div class="loading-state" style="padding: 60px 20px; text-align: center;">
                <div class="loading-spinner"></div>
                <h3 style="color: var(--color-text-primary); margin-top: 20px;">Conectando en tiempo real...</h3>
                <p style="color: var(--color-text-secondary);">Escuchando eventos</p>
            </div>
        `;
    }
}

function mostrarError(mensaje) {
    const timeline = document.getElementById('eventsTimeline');
    if (timeline) {
        timeline.innerHTML = `
            <div class="error-state" style="padding: 60px 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c;"></i>
                <h3>Error de conexión</h3>
                <p>${escapeHTML(mensaje)}</p>
                <button class="btn-buscar" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt"></i> Reconectar
                </button>
            </div>
        `;
    }
}

function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========== LIMPIEZA AL SALIR ==========
window.addEventListener('beforeunload', () => {
    if (unsubscribeEventos) {
        unsubscribeEventos();
        console.log('🔌 Escucha en tiempo real desconectada');
    }
});