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
const PM_API = "https://cenc5.com/rest_api/14.0";//La documentacion es la 13 pero JCI entrego la 14. NO MUEVAS LA VERSION

/**
 * Función centralizada para manejar peticiones a Power Manage
 */
exports.proxyPowerManage = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        // Solo aceptamos POST para el registro
        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Método no permitido" });
        }

        const { action, email, email_code, app_id } = req.body;

        try {
            if (action === 'solicitarCodigo') {
                // Paso 1: Generar código y enviar a email
                const response = await axios.post(`${PM_API}/register`, { email });
                return res.status(200).json({ success: true, message: "Código enviado" });

            } else if (action === 'completarRegistro') {
                // Paso 2: Validar código y obtener tokens
                const response = await axios.post(`${PM_API}/register/complete`, {
                    email_code,
                    app_id
                });
                // Devolvemos el user_token para que el cliente lo guarde vía la clase CuentaPM
                return res.status(200).json(response.data);
            }

            return res.status(400).json({ error: "Acción no reconocida" });

        } catch (error) {
            console.error("Error en Proxy PM:", error.response?.data || error.message);
            return res.status(error.response?.status || 500).json(
                error.response?.data || { error: "Error de conexión con el servidor de alarmas" }
            );
        }
    });
});