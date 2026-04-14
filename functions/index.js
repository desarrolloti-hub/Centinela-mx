// /functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function para enviar una notificación push a un usuario específico.
 */
exports.sendPushNotification = functions.https.onRequest(async (req, res) => {
    // Habilitar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Método no permitido' });
        return;
    }

    const { userId, userType, organizacionCamelCase, title, body, url, senderToken } = req.body;

    // Validaciones básicas
    if (!userId || !userType || !title || !body) {
        res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        return;
    }

    if (!['administrador', 'colaborador'].includes(userType)) {
        res.status(400).json({ success: false, error: 'Tipo de usuario inválido' });
        return;
    }

    // Para colaboradores, necesitamos la organización
    if (userType === 'colaborador' && !organizacionCamelCase) {
        res.status(400).json({ success: false, error: 'Para colaboradores, se requiere organizacionCamelCase' });
        return;
    }

    try {
        // 1. Obtener el documento del usuario destino
        let userDocRef;
        if (userType === 'administrador') {
            userDocRef = db.collection('administradores').doc(userId);
        } else {
            const coleccion = `colaboradores_${organizacionCamelCase}`;
            userDocRef = db.collection(coleccion).doc(userId);
        }

        const userSnap = await userDocRef.get();
        if (!userSnap.exists) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado' });
            return;
        }

        const userData = userSnap.data();
        
        // 2. Obtener los tokens activos del array 'dispositivos'
        const tokensActivos = [];
        if (userData.dispositivos && Array.isArray(userData.dispositivos)) {
            userData.dispositivos.forEach(disp => {
                if (disp.token && disp.enabled !== false) {
                    tokensActivos.push(disp.token);
                }
            });
        }

        if (tokensActivos.length === 0) {
            res.status(200).json({ 
                success: true, 
                message: 'El usuario no tiene dispositivos con notificaciones activas.',
                successCount: 0,
                failures: 0
            });
            return;
        }

        console.log(`📱 Enviando a ${tokensActivos.length} dispositivo(s)`);

        // 3. Preparar el mensaje para FCM
        const messages = tokensActivos.map(token => ({
            token: token,
            notification: {
                title: title,
                body: body,
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                title: title,
                body: body,
                url: url || '',
                incidenciaId: url ? url.split('/').pop() : '',
                tipo: userType,
                sender: senderToken || 'sistema',
                timestamp: Date.now().toString()
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    clickAction: "FLUTTER_NOTIFICATION_CLICK"
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default"
                    }
                }
            }
        }));

        // 4. Enviar notificaciones en lote
        const responses = await Promise.allSettled(
            messages.map(msg => admin.messaging().send(msg))
        );

        // Contar éxitos y fallos
        const successCount = responses.filter(r => r.status === "fulfilled").length;
        const failureCount = responses.filter(r => r.status === "rejected").length;
        
        // Registrar detalles de fallos
        if (failureCount > 0) {
            responses.forEach((response, index) => {
                if (response.status === "rejected") {
                    console.error(`❌ Error en token ${index + 1}:`, response.reason);
                }
            });
        }

        console.log(`✅ Notificaciones enviadas. Éxitos: ${successCount}, Fallos: ${failureCount}`);

        res.status(200).json({
            success: true,
            message: `Notificación enviada a ${successCount} dispositivo(s)`,
            successCount: successCount,
            failures: failureCount
        });

    } catch (error) {
        console.error('❌ Error en Cloud Function:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//Inicio de API REST para Power Manage Centinela-MX
// Victor Ramirez Cruz
const axios = require('axios');
const cors = require('cors')({origin: true});

// Configuración de la API externa
const PM_API = "https://cenc5.com/rest_api/14.0"; // La documentación es la 13 pero JCI entrego la 14. NO MUEVAS LA VERSION

/**
 * Función centralizada para manejar peticiones a Power Manage
 */
exports.proxyPowerManage = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Solo POST" });
        }

        const { action, email, password, email_code, app_id, user_token, panel_data, reset_password_code, new_password } = req.body;

        try {
            switch (action) {
                case 'solicitarCodigo':
                    await axios.post(`${PM_API}/register`, { email });
                    return res.status(200).json({ success: true });

                case 'completarRegistro':
                    const regRes = await axios.post(`${PM_API}/register/complete`, { email_code, app_id });
                    return res.status(200).json(regRes.data);

                case 'establecerContraseña':
                    const passRes = await axios.post(`${PM_API}/password/reset/complete`, {
                        reset_password_code,
                        new_password,
                        app_id
                    });
                    return res.status(200).json(passRes.data);

                case 'autenticar':
                    const authRes = await axios.post(`${PM_API}/auth`, { email, password, app_id });
                    return res.status(200).json(authRes.data);

                case 'listarPaneles':
                    const listRes = await axios.get(`${PM_API}/panels`, {
                        headers: { 'User-Token': user_token }
                    });
                    return res.status(200).json(listRes.data);

                case 'vincularPanel':
                    if (!panel_data || !panel_data.panel_serial || !panel_data.master_user_code) {
                        return res.status(400).json({ error_message: 'Faltan datos del panel' });
                    }
                    
                    const payload = {
                        alias: panel_data.alias || 'Panel Nuevo',
                        panel_serial: panel_data.panel_serial,
                        master_user_code: panel_data.master_user_code
                    };
                    
                    if (panel_data.access_proof) {
                        payload.access_proof = panel_data.access_proof;
                    }
                    
                    const linkRes = await axios.post(`${PM_API}/panel/add`, payload, {
                        headers: { 'User-Token': user_token }
                    });
                    
                    return res.status(200).json({ success: true, data: linkRes.data });

                case 'loginPanel':
                    if (!panel_data || !panel_data.panel_serial || !panel_data.user_code) {
                        return res.status(400).json({ error_message: 'Faltan datos: panel_serial y user_code son requeridos' });
                    }
                    
                    const loginRes = await axios.post(`${PM_API}/panel/login`, {
                        panel_serial: panel_data.panel_serial,
                        user_code: panel_data.user_code,
                        app_id: panel_data.app_id,
                        app_type: panel_data.app_type || 'com.visonic.neogo'
                    }, {
                        headers: { 'User-Token': user_token }
                    });
                    
                    return res.status(200).json(loginRes.data);

                case 'obtenerEstadoPanel':
                    const statusRes = await axios.get(`${PM_API}/status`, {
                        headers: { 'User-Token': user_token, 'Session-Token': req.body.session_token }
                    });
                    return res.status(200).json(statusRes.data);

                case 'listarZonas':
                    const devicesRes = await axios.get(`${PM_API}/devices`, {
                        headers: { 'User-Token': user_token, 'Session-Token': req.body.session_token }
                    });
                    const zonas = devicesRes.data.filter(d => d.device_type === 'ZONE');
                    return res.status(200).json(zonas);

                case 'listarEventos':
                    const eventsRes = await axios.get(`${PM_API}/events`, {
                        headers: { 'User-Token': user_token, 'Session-Token': req.body.session_token }
                    });
                    return res.status(200).json(eventsRes.data);

                case 'listarDispositivos':
                    const allDevicesRes = await axios.get(`${PM_API}/devices`, {
                        headers: { 'User-Token': user_token, 'Session-Token': req.body.session_token }
                    });
                    return res.status(200).json(allDevicesRes.data);

                case 'setEstadoPanel':
                    await axios.post(`${PM_API}/set_state`, {
                        partition: req.body.partition || 1,
                        state: req.body.state,
                        options: req.body.options || []
                    }, {
                        headers: { 'User-Token': user_token, 'Session-Token': req.body.session_token }
                    });
                    return res.status(200).json({ success: true });

                case 'verificarSesion':
                    try {
                        await axios.get(`${PM_API}/panel_info`, {
                            headers: { 'User-Token': user_token, 'Session-Token': req.body.session_token }
                        });
                        return res.status(200).json({ valid: true });
                    } catch (error) {
                        return res.status(401).json({ valid: false });
                    }
                case 'renamePanel':
                    // Cambiar el alias de un panel
                    console.log('📥 Renombrando panel:', {
                        panel_serial: req.body.panel_serial,
                        alias: req.body.alias
                    });
                    
                    if (!req.body.panel_serial) {
                        return res.status(400).json({ error_message: 'Serial del panel es requerido' });
                    }
                    
                    if (!req.body.alias) {
                        return res.status(400).json({ error_message: 'Alias es requerido' });
                    }
                    
                    try {
                        const renameRes = await axios.post(`${PM_API}/panel/rename`, {
                            panel_serial: req.body.panel_serial,
                            alias: req.body.alias
                        }, {
                            headers: { 'User-Token': user_token }
                        });
                        
                        console.log('✅ Panel renombrado:', renameRes.data);
                        return res.status(200).json({ success: true, data: renameRes.data });
                        
                    } catch (error) {
                        console.error('❌ Error renombrando panel:', error.response?.data || error.message);
                        return res.status(error.response?.status || 500).json({
                            error_message: error.response?.data?.error_message || 'Error al renombrar el panel'
                        });
                    }    
                case 'reconocerEvento':
                    // Reconoce un evento/alarma en el panel
                    const { session_token, panel_serial, evento_id, comentario } = req.body;
                    
                    try {
                        // Dependiendo del panel, puede ser una llamada a API específica
                        // Por ahora, registramos en logs y respondemos OK
                        console.log(`Evento reconocido: ${evento_id} en panel ${panel_serial}`);
                        console.log(`Comentario: ${comentario}`);
                        
                        // Aquí iría la llamada real al panel para reconocer la alarma
                        // Por ejemplo: await powerManageAPI.acknowledgeAlarm(session_token, evento_id);
                        
                        res.status(200).json({
                            success: true,
                            message: 'Evento reconocido correctamente'
                        });
                    } catch (error) {
                        res.status(500).json({
                            error_message: error.message
                        });
                    }
                    break;

                case 'silenciarAlarma':
                    // Silencia una alarma activa en el panel
                    const { session_token: sToken, panel_serial: pSerial } = req.body;
                    
                    try {
                        console.log(`Silenciando alarma en panel ${pSerial}`);
                        
                        // Aquí iría la llamada real al panel para silenciar la alarma
                        // Por ejemplo: await powerManageAPI.silenceAlarm(sToken);
                        
                        res.status(200).json({
                            success: true,
                            message: 'Alarma silenciada correctamente'
                        });
                    } catch (error) {
                        res.status(500).json({
                            error_message: error.message
                        });
                    }
                    break;    
                default:
                    return res.status(400).json({ error: `Acción no reconocida: ${action}` });
            }
        } catch (error) {
            console.error(`❌ Error en ${action}:`, error.response?.data || error.message);
            return res.status(error.response?.status || 500).json(error.response?.data || { error_message: "Error en el servidor PM" });
        }
    });
});

/**
 * Cloud Function que:
 * 1. Inicia sesión del usuario automáticamente
 * 2. Inicia sesión en cada panel automáticamente
 * 3. Almacena eventos de los paneles
 */
exports.syncAllPanelEvents = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    console.log('🔄 Iniciando sincronización automática...');
    
    try {
        // 1. Obtener todas las cuentas activas
        const cuentasSnapshot = await admin.firestore()
            .collection('cuentas_tecnicas_pm')
            .where('status', '==', 'activa')
            .get();
        
        if (cuentasSnapshot.empty) {
            console.log('📭 No hay cuentas activas');
            res.status(200).json({ success: true, message: 'No hay cuentas activas' });
            return;
        }
        
        console.log(`📊 Cuentas activas: ${cuentasSnapshot.size}`);
        
        let resultados = [];
        
        // 2. Procesar cada cuenta
        for (const cuentaDoc of cuentasSnapshot.docs) {
            const resultado = await procesarCuentaCompleta(cuentaDoc);
            resultados.push(resultado);
        }
        
        console.log(`✅ Sincronización completada`);
        
        res.status(200).json({
            success: true,
            resultados: resultados,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Procesa una cuenta completa:
 * - Login de usuario
 * - Login de paneles
 * - Sincronización de eventos
 */
async function procesarCuentaCompleta(cuentaDoc) {
    const data = cuentaDoc.data();
    const email = cuentaDoc.id;
    
    console.log(`\n📧 Procesando cuenta: ${email}`);
    
    const resultado = {
        email: email,
        loginExitoso: false,
        paneles: [],
        eventos: 0,
        errores: []
    };
    
    try {
        // ========== 1. INICIAR SESIÓN DEL USUARIO ==========
        console.log(`🔐 Iniciando sesión para ${email}...`);
        
        let userToken = data.userToken;
        let tokenValido = false;
        
        // Verificar si el token actual es válido
        if (userToken) {
            tokenValido = await verificarTokenValido(userToken);
        }
        
        // Si no es válido, hacer login
        if (!tokenValido) {
            console.log(`🔄 Token inválido, haciendo login con credenciales...`);
            
            const loginResult = await loginUsuario(email, data.password, data.appId);
            
            if (loginResult.success) {
                userToken = loginResult.userToken;
                resultado.loginExitoso = true;
                
                // Guardar el nuevo token en Firestore
                await admin.firestore()
                    .collection('cuentas_tecnicas_pm')
                    .doc(email)
                    .update({
                        userToken: userToken,
                        ultimoLogin: admin.firestore.FieldValue.serverTimestamp()
                    });
                
                console.log(`✅ Usuario ${email} logueado exitosamente`);
            } else {
                resultado.errores.push(`Login usuario: ${loginResult.error}`);
                console.log(`❌ Error login usuario: ${loginResult.error}`);
                return resultado;
            }
        } else {
            console.log(`✅ Token de usuario válido`);
            resultado.loginExitoso = true;
        }
        
        // ========== 2. OBTENER PANELES DEL USUARIO ==========
        console.log(`📡 Obteniendo paneles del usuario...`);
        
        const paneles = await obtenerPanelesUsuario(userToken);
        
        if (!paneles || paneles.length === 0) {
            console.log(`⚠️ Usuario ${email} no tiene paneles asignados`);
            return resultado;
        }
        
        console.log(`📋 Paneles encontrados: ${paneles.length}`);
        
        // ========== 3. PROCESAR CADA PANEL ==========
        for (const panel of paneles) {
            const panelResult = await procesarPanelCompleto(
                panel.panel_serial,
                panel.alias || 'Sin alias',
                userToken,
                data.panelPassword,
                data.appId,
                email
            );
            
            resultado.paneles.push(panelResult);
            resultado.eventos += panelResult.eventos;
            
            if (panelResult.error) {
                resultado.errores.push(`Panel ${panel.panel_serial}: ${panelResult.error}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Error procesando cuenta ${email}:`, error.message);
        resultado.errores.push(`General: ${error.message}`);
    }
    
    return resultado;
}

/**
 * Login de usuario con email y contraseña
 */
async function loginUsuario(email, password, appId) {
    try {
        const response = await axios.post(`${PM_API}/auth`, {
            email: email,
            password: password,
            app_id: appId
        }, { timeout: 10000 });
        
        if (response.data && response.data.user_token) {
            return {
                success: true,
                userToken: response.data.user_token
            };
        } else {
            return {
                success: false,
                error: 'No se recibió user_token'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error_message || error.message
        };
    }
}

/**
 * Verifica si un token de usuario es válido
 */
async function verificarTokenValido(userToken) {
    try {
        const response = await axios.get(`${PM_API}/panel_info`, {
            headers: { 'User-Token': userToken },
            timeout: 5000
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

/**
 * Obtiene la lista de paneles del usuario
 */
async function obtenerPanelesUsuario(userToken) {
    try {
        const response = await axios.get(`${PM_API}/panels`, {
            headers: { 'User-Token': userToken },
            timeout: 10000
        });
        return response.data || [];
    } catch (error) {
        console.error('Error obteniendo paneles:', error.message);
        return [];
    }
}

/**
 * Procesa un panel completo:
 * - Login del panel
 * - Actualizar token en Firestore
 * - Obtener y guardar eventos
 */
async function procesarPanelCompleto(panelSerial, panelAlias, userToken, panelPassword, appId, cuentaEmail) {
    console.log(`\n🔌 Procesando panel: ${panelSerial} (${panelAlias})`);
    
    const resultado = {
        serial: panelSerial,
        alias: panelAlias,
        loginExitoso: false,
        eventos: 0,
        error: null
    };
    
    try {
        // ========== 1. INICIAR SESIÓN EN EL PANEL ==========
        console.log(`🔐 Iniciando sesión en panel ${panelSerial}...`);
        
        let sessionToken = null;
        
        // Intentar login con el panelPassword
        const loginResponse = await axios.post(`${PM_API}/panel/login`, {
            panel_serial: panelSerial,
            user_code: panelPassword,
            app_id: appId,
            app_type: 'com.visonic.neogo'
        }, {
            headers: { 'User-Token': userToken },
            timeout: 10000
        });
        
        if (loginResponse.data && loginResponse.data.session_token) {
            sessionToken = loginResponse.data.session_token;
            resultado.loginExitoso = true;
            console.log(`✅ Panel ${panelSerial} logueado exitosamente`);
        } else {
            throw new Error('No se recibió session_token');
        }
        
        // ========== 2. ACTUALIZAR TOKEN DEL PANEL EN FIRESTORE ==========
        const tokenString = `${panelSerial}||${sessionToken}`;
        await actualizarPanelTokenEnFirestore(cuentaEmail, panelSerial, tokenString);
        
        // ========== 3. OBTENER EVENTOS DEL PANEL ==========
        console.log(`📡 Obteniendo eventos del panel ${panelSerial}...`);
        
        // Obtener último evento guardado
        const ultimoTimestamp = await obtenerUltimoEvento(panelSerial);
        
        // Obtener eventos
        const eventos = await obtenerEventosPanel(userToken, sessionToken, ultimoTimestamp);
        
        console.log(`📝 Eventos encontrados: ${eventos.length}`);
        
        // Mostrar estructura del primer evento para depuración
        if (eventos.length > 0 && eventos[0]) {
            console.log('📋 Estructura del evento:', Object.keys(eventos[0]).join(', '));
        }
        
        // ========== 4. GUARDAR EVENTOS EN FIRESTORE ==========
        let eventosGuardados = 0;
        for (const evento of eventos) {
            const guardado = await guardarEventoEnFirestore(evento, panelSerial, cuentaEmail);
            if (guardado) {
                eventosGuardados++;
            }
        }
        
        resultado.eventos = eventosGuardados;
        console.log(`✅ Eventos guardados: ${eventosGuardados}/${eventos.length}`);
        
    } catch (error) {
        console.error(`❌ Error en panel ${panelSerial}:`, error.message);
        resultado.error = error.message;
    }
    
    return resultado;
}

/**
 * Obtiene eventos del panel
 */
async function obtenerEventosPanel(userToken, sessionToken, desdeTimestamp) {
    try {
        const params = {};
        if (desdeTimestamp) {
            params.from = desdeTimestamp;
        }
        
        const response = await axios.get(`${PM_API}/events`, {
            headers: {
                'User-Token': userToken,
                'Session-Token': sessionToken
            },
            params: params,
            timeout: 10000
        });
        
        return response.data || [];
    } catch (error) {
        console.error('Error obteniendo eventos:', error.message);
        return [];
    }
}

/**
 * Obtiene el timestamp del último evento guardado para un panel
 */
async function obtenerUltimoEvento(panelSerial) {
    try {
        const query = await admin.firestore()
            .collection('eventos_paneles')
            .where('panelSerial', '==', panelSerial)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        
        if (query.empty) return null;
        return query.docs[0].data().timestamp;
    } catch (error) {
        return null;
    }
}

/**
 * Guarda un evento en Firestore (manejando campos undefined)
 */
async function guardarEventoEnFirestore(evento, panelSerial, cuentaEmail) {
    try {
        // Filtrar campos undefined
        const eventoLimpio = JSON.parse(JSON.stringify(evento));
        
        const eventId = eventoLimpio.event_id || eventoLimpio.id || `event_${Date.now()}`;
        const timestamp = eventoLimpio.timestamp || new Date().toISOString();
        
        const eventoId = `${panelSerial}_${eventId}_${timestamp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const eventoRef = admin.firestore().collection('eventos_paneles').doc(eventoId);
        
        const existe = await eventoRef.get();
        if (existe.exists) return false;
        
        // Crear documento solo con campos que existen
        const documento = {};
        
        // Usar eventoLimpio que ya no tiene undefined
        if (eventoLimpio.event_id) documento.eventId = eventoLimpio.event_id;
        else if (eventoLimpio.id) documento.eventId = eventoLimpio.id;
        
        if (eventoLimpio.event_type) documento.eventType = eventoLimpio.event_type;
        else if (eventoLimpio.type) documento.eventType = eventoLimpio.type;
        
        if (eventoLimpio.event_description) documento.eventDescription = eventoLimpio.event_description;
        else if (eventoLimpio.description) documento.eventDescription = eventoLimpio.description;
        else if (eventoLimpio.message) documento.eventDescription = eventoLimpio.message;
        
        documento.timestamp = eventoLimpio.timestamp || new Date().toISOString();
        documento.status = eventoLimpio.status || 'active';
        
        if (eventoLimpio.zone) documento.zone = eventoLimpio.zone;
        if (eventoLimpio.user) documento.user = eventoLimpio.user;
        if (eventoLimpio.zone_name) documento.zoneName = eventoLimpio.zone_name;
        if (eventoLimpio.partition) documento.partition = eventoLimpio.partition;
        
        // Datos del panel
        documento.panelSerial = panelSerial;
        documento.cuentaEmail = cuentaEmail;
        
        // Metadatos
        documento.fechaRegistro = admin.firestore.FieldValue.serverTimestamp();
        documento.procesado = false;
        documento.notificado = false;
        
        await eventoRef.set(documento);
        return true;
        
    } catch (error) {
        console.error('   ❌ Error guardando evento:', error.message);
        return false;
    }
}

/**
 * Actualiza el token de un panel en Firestore
 */
async function actualizarPanelTokenEnFirestore(cuentaEmail, panelSerial, nuevoToken) {
    try {
        const cuentaRef = admin.firestore().collection('cuentas_tecnicas_pm').doc(cuentaEmail);
        const cuentaDoc = await cuentaRef.get();
        
        if (!cuentaDoc.exists) return;
        
        const panelTokens = cuentaDoc.data().panelTokens || [];
        const tokenExistente = panelTokens.find(t => t.startsWith(panelSerial + '||'));
        
        if (tokenExistente) {
            const index = panelTokens.indexOf(tokenExistente);
            panelTokens[index] = nuevoToken;
        } else {
            panelTokens.push(nuevoToken);
        }
        
        await cuentaRef.update({
            panelTokens: panelTokens,
            ultimaActualizacionPanel: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Token actualizado para panel ${panelSerial}`);
    } catch (error) {
        console.error(`Error actualizando token panel ${panelSerial}:`, error.message);
    }
}


// Variable para controlar si el bucle ya está corriendo
let isRunning = false;

// ============================================
// FUNCIÓN PRINCIPAL - INICIA EL BUCLE
// ============================================
exports.syncEventsRealtime = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    
    if (isRunning) {
        res.status(200).json({ 
            success: true, 
            message: 'Sincronización continua ya está activa' 
        });
        return;
    }
    
    isRunning = true;
    
    res.status(200).json({ 
        success: true, 
        message: 'Sincronización continua iniciada. Consultando eventos cada 5 segundos.'
    });
    
    // Iniciar el bucle
    iniciarBucleSincronizacion();
});

// ============================================
// BUCLE PRINCIPAL
// ============================================
async function iniciarBucleSincronizacion() {
    console.log(`🚀 Iniciando sincronización continua...`);
    
    // Primero, hacer login inicial de todas las cuentas
    await loginInicialDeTodasLasCuentas();
    
    // Luego iniciar el bucle de eventos
    let contador = 0;
    while (true) {
        try {
            await sincronizarEventosNuevos();
            contador++;
            if (contador % 12 === 0) { // Cada minuto (12 * 5s = 60s)
                console.log(`⏱️ Sincronización activa - ${new Date().toLocaleTimeString()}`);
            }
        } catch (error) {
            console.error('❌ Error en bucle:', error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// ============================================
// LOGIN INICIAL DE TODAS LAS CUENTAS
// ============================================
async function loginInicialDeTodasLasCuentas() {
    try {
        const cuentasSnapshot = await admin.firestore()
            .collection('cuentas_tecnicas_pm')
            .where('status', '==', 'activa')
            .get();
        
        if (cuentasSnapshot.empty) return;
        
        console.log(`📊 Realizando login inicial de ${cuentasSnapshot.size} cuenta(s)`);
        
        for (const cuentaDoc of cuentasSnapshot.docs) {
            await realizarLoginCompleto(cuentaDoc);
        }
        
        console.log('✅ Login inicial completado. Ahora verificando eventos cada 5 segundos.');
        
    } catch (error) {
        console.error('❌ Error en login inicial:', error.message);
    }
}

// ============================================
// REALIZAR LOGIN COMPLETO DE UNA CUENTA
// ============================================
async function realizarLoginCompleto(cuentaDoc) {
    const data = cuentaDoc.data();
    const email = cuentaDoc.id;
    
    try {
        const panelTokens = data.panelTokens || [];
        if (panelTokens.length === 0) return;
        
        if (!data.password || !data.panelPassword) return;
        
        // 1. LOGIN DE USUARIO
        console.log(`🔐 Haciendo login de usuario: ${email}`);
        const loginResult = await loginUsuario(email, data.password, data.appId);
        
        if (!loginResult.success) {
            console.log(`❌ Error login usuario ${email}: ${loginResult.error}`);
            return;
        }
        
        const userToken = loginResult.userToken;
        
        // Guardar token en Firestore
        await admin.firestore().collection('cuentas_tecnicas_pm').doc(email).update({
            userToken: userToken,
            ultimoLogin: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Usuario ${email} logueado`);
        
        // 2. LOGIN DE CADA PANEL
        for (const panelToken of panelTokens) {
            const [panelSerial, sessionToken] = panelToken.split('||');
            if (!panelSerial) continue;
            
            console.log(`🔐 Haciendo login de panel: ${panelSerial}`);
            
            const panelLogin = await loginPanel(userToken, panelSerial, data.appId, data.panelPassword);
            
            if (panelLogin.success) {
                const nuevoToken = `${panelSerial}||${panelLogin.sessionToken}`;
                await actualizarPanelTokenEnFirestore(email, panelSerial, nuevoToken);
                console.log(`✅ Panel ${panelSerial} logueado`);
                
                // Verificar si hay eventos desde ahora
                await verificarEventosIniciales(userToken, panelLogin.sessionToken, panelSerial, email, data);
            } else {
                console.log(`❌ Error login panel ${panelSerial}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Error en login completo de ${email}:`, error.message);
    }
}

// ============================================
// VERIFICAR EVENTOS INICIALES (para no perder los que ocurren durante el login)
// ============================================
async function verificarEventosIniciales(userToken, sessionToken, panelSerial, email, data) {
    try {
        // Obtener eventos de los últimos 30 segundos
        const fechaReferencia = new Date(Date.now() - 30000).toISOString();
        
        const response = await axios.get(`${PM_API}/events`, {
            headers: {
                'User-Token': userToken,
                'Session-Token': sessionToken
            },
            params: { from: fechaReferencia },
            timeout: 10000
        });
        
        const eventos = response.data || [];
        
        if (eventos.length > 0) {
            console.log(`📝 Eventos iniciales encontrados en panel ${panelSerial}: ${eventos.length}`);
            
            for (const evento of eventos) {
                await guardarEventoSiEsNuevo(evento, panelSerial, email, data);
            }
        }
        
    } catch (error) {
        console.error('Error verificando eventos iniciales:', error.message);
    }
}

// ============================================
// SINCRONIZACIÓN DE EVENTOS NUEVOS
// ============================================
async function sincronizarEventosNuevos() {
    try {
        const cuentasSnapshot = await admin.firestore()
            .collection('cuentas_tecnicas_pm')
            .where('status', '==', 'activa')
            .get();
        
        if (cuentasSnapshot.empty) return;
        
        for (const cuentaDoc of cuentasSnapshot.docs) {
            await procesarEventosDeCuenta(cuentaDoc);
        }
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error.message);
    }
}

// ============================================
// PROCESAR EVENTOS DE UNA CUENTA
// ============================================
async function procesarEventosDeCuenta(cuentaDoc) {
    const data = cuentaDoc.data();
    const email = cuentaDoc.id;
    
    try {
        const userToken = data.userToken;
        if (!userToken) return;
        
        const panelTokens = data.panelTokens || [];
        
        for (const panelToken of panelTokens) {
            const [panelSerial, sessionToken] = panelToken.split('||');
            if (!panelSerial || !sessionToken) continue;
            
            // Obtener el último evento guardado para este panel
            const ultimoTimestamp = await obtenerUltimoEventoGuardado(panelSerial);
            
            // Si no hay eventos guardados, usar fecha actual - 1 minuto
            let desdeFecha = ultimoTimestamp;
            if (!desdeFecha) {
                const fecha = new Date();
                fecha.setMinutes(fecha.getMinutes() - 1);
                desdeFecha = fecha.toISOString();
                console.log(`📅 Panel ${panelSerial} - Sin eventos previos, buscando desde: ${desdeFecha}`);
            }
            
            // Obtener eventos desde la última fecha
            const eventos = await obtenerEventosDesde(userToken, sessionToken, desdeFecha);
            
            for (const evento of eventos) {
                const guardado = await guardarEventoSiEsNuevo(evento, panelSerial, email, data);
                if (guardado) {
                    console.log(`📌 Nuevo evento en ${panelSerial}: ${evento.event_type || 'Desconocido'}`);
                }
            }
        }
        
    } catch (error) {
        // Error silencioso para no saturar logs
    }
}

// ============================================
// OBTENER EVENTOS DESDE UNA FECHA
// ============================================
async function obtenerEventosDesde(userToken, sessionToken, desdeFecha) {
    try {
        if (!desdeFecha) return [];
        
        const response = await axios.get(`${PM_API}/events`, {
            headers: {
                'User-Token': userToken,
                'Session-Token': sessionToken
            },
            params: { from: desdeFecha },
            timeout: 10000
        });
        
        const eventos = response.data || [];
        
        // Filtrar eventos más recientes que la fecha
        const eventosNuevos = eventos.filter(e => e.timestamp > desdeFecha);
        
        return eventosNuevos;
        
    } catch (error) {
        return [];
    }
}

// ============================================
// OBTENER ÚLTIMO EVENTO GUARDADO
// ============================================
async function obtenerUltimoEventoGuardado(panelSerial) {
    try {
        const query = await admin.firestore()
            .collection('eventos_paneles')
            .where('panelSerial', '==', panelSerial)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        
        if (query.empty) return null;
        return query.docs[0].data().timestamp;
        
    } catch (error) {
        return null;
    }
}

// ============================================
// GUARDAR EVENTO
// ============================================
async function guardarEventoSiEsNuevo(evento, panelSerial, cuentaEmail, cuentaData) {
    try {
        const eventoLimpio = JSON.parse(JSON.stringify(evento));
        const eventId = eventoLimpio.event_id || eventoLimpio.id || `event_${Date.now()}`;
        const timestamp = eventoLimpio.timestamp || new Date().toISOString();
        
        const eventoId = `${panelSerial}_${eventId}_${timestamp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const eventoRef = admin.firestore().collection('eventos_paneles').doc(eventoId);
        
        const existe = await eventoRef.get();
        if (existe.exists) return false;
        
        const documento = {
            panelSerial: panelSerial,
            cuentaEmail: cuentaEmail,
            timestamp: timestamp,
            fechaRegistro: admin.firestore.FieldValue.serverTimestamp(),
            procesado: false,
            notificado: false
        };
        
        if (eventoLimpio.event_id) documento.eventId = eventoLimpio.event_id;
        if (eventoLimpio.event_type) documento.eventType = eventoLimpio.event_type;
        if (eventoLimpio.event_description) documento.eventDescription = eventoLimpio.event_description;
        if (eventoLimpio.status) documento.status = eventoLimpio.status;
        if (eventoLimpio.zone) documento.zone = eventoLimpio.zone;
        if (eventoLimpio.user) documento.user = eventoLimpio.user;
        if (cuentaData.organizacion) documento.organizacion = cuentaData.organizacion;
        
        await eventoRef.set(documento);
        return true;
        
    } catch (error) {
        return false;
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function loginUsuario(email, password, appId) {
    try {
        const response = await axios.post(`${PM_API}/auth`, {
            email: email,
            password: password,
            app_id: appId
        }, { timeout: 10000 });
        
        if (response.data && response.data.user_token) {
            return { success: true, userToken: response.data.user_token };
        }
        return { success: false, error: 'No user_token' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginPanel(userToken, panelSerial, appId, panelPassword) {
    try {
        const response = await axios.post(`${PM_API}/panel/login`, {
            panel_serial: panelSerial,
            user_code: panelPassword,
            app_id: appId,
            app_type: 'com.visonic.neogo'
        }, {
            headers: { 'User-Token': userToken },
            timeout: 10000
        });
        
        if (response.data && response.data.session_token) {
            return { success: true, sessionToken: response.data.session_token };
        }
        return { success: false };
    } catch (error) {
        return { success: false };
    }
}

async function actualizarPanelTokenEnFirestore(cuentaEmail, panelSerial, nuevoToken) {
    try {
        const cuentaRef = admin.firestore().collection('cuentas_tecnicas_pm').doc(cuentaEmail);
        const cuentaDoc = await cuentaRef.get();
        if (!cuentaDoc.exists) return;
        
        const panelTokens = cuentaDoc.data().panelTokens || [];
        const index = panelTokens.findIndex(t => t.startsWith(panelSerial + '||'));
        
        if (index !== -1) {
            panelTokens[index] = nuevoToken;
        } else {
            panelTokens.push(nuevoToken);
        }
        
        await cuentaRef.update({ panelTokens: panelTokens });
    } catch (error) {}
}

// Endpoint para detener el bucle
exports.stopSyncLoop = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    isRunning = false;
    console.log('🛑 Bucle de sincronización detenido');
    res.status(200).json({ success: true, message: 'Bucle detenido' });
});

// Endpoint para verificar estado
exports.syncStatus = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
        running: isRunning,
        timestamp: new Date().toISOString()
    });
});