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

        console.log(`📱 Enviando a ${tokensActivos.length} dispositivo(s):`, tokensActivos);

        // 3. Preparar el mensaje para FCM
        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                title: title,
                body: body,
                url: url || '',
                sender: senderToken || 'sistema',
                timestamp: Date.now().toString()
            },
            tokens: tokensActivos
        };

        // 4. Enviar la notificación
        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log(`✅ Notificaciones enviadas. Éxitos: ${response.successCount}, Fallos: ${response.failureCount}`);
        
        // 5. Procesar fallos (tokens inválidos)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`❌ Error enviando al token ${tokensActivos[idx].substring(0, 30)}...:`, resp.error);
                    failedTokens.push(tokensActivos[idx]);
                    
                    // Aquí podrías marcar el token como inválido en la BD
                    // Por ahora solo registramos
                }
            });
        }

        res.status(200).json({
            success: true,
            message: `Notificación enviada a ${response.successCount} dispositivo(s)`,
            successCount: response.successCount,
            failures: response.failureCount
        });

    } catch (error) {
        console.error('❌ Error en Cloud Function:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});