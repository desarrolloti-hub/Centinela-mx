// /components/fcm-initializer.js
// Versión: 1.0.5 - CON DETECCIÓN DE ENTORNO Y MEJOR MANEJO DE ERRORES

import { getMessaging, getToken, onMessage, deleteToken } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging.js";
import { app } from '/config/firebase-config.js';
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { db } from '/config/firebase-config.js';

const VAPID_KEY = "BHhrxqXbPjiNadS41r_jq2OVlUqg9BtHOu1ixfbHoDmVO-WN14scZSFlmHQitsrxyDYMXO4-4jWYPyY-XJBdskY";

class FCMInitializer {
    constructor() {
        this.messaging = null;
        this.userManager = null;
        this.currentToken = null;
        this.notificationsEnabled = false;
        this.deviceId = this.getOrCreateDeviceId();
        this.isInitialized = false;
        this.swRegistration = null;
        this.isProduction = window.location.protocol === 'https:' || 
                           (window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1');
    }

    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('fcm_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('fcm_device_id', deviceId);
        }
        return deviceId;
    }

    async init(userManagerInstance) {
        if (this.isInitialized) return;
        
        this.userManager = userManagerInstance;
        
        // Si no estamos en producción, no intentamos inicializar FCM
        if (!this.isProduction) {
            console.log('🔔 Modo desarrollo: FCM desactivado (solo funciona en HTTPS/producción)');
            this.isInitialized = true;
            return;
        }
        
        if (!this.checkBrowserSupport()) {
            console.warn('❌ Navegador no soporta notificaciones push');
            return;
        }

        try {
            this.messaging = getMessaging(app);
            
            // Intentar registrar Service Worker
            await this.registerServiceWorker();
            
            // Configurar listener para mensajes en primer plano
            this.setupForegroundListener();
            
            // Cargar estado guardado
            this.loadLocalState();
            
            this.isInitialized = true;
            console.log('✅ FCMInitializer listo en producción');
            
        } catch (error) {
            console.error('❌ Error inicializando FCM:', error);
        }
    }

    checkBrowserSupport() {
        return 'Notification' in window && 
               'serviceWorker' in navigator && 
               'PushManager' in window;
    }

    async registerServiceWorker() {
        try {
            // Verificar si ya hay un SW registrado
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                if (reg.active && reg.active.scriptURL.includes('firebase-messaging-sw')) {
                    console.log('✓ Service Worker ya estaba registrado');
                    this.swRegistration = reg;
                    return reg;
                }
            }

            console.log('📦 Registrando Service Worker...');
            this.swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registrado');
            
            // Esperar activación
            if (this.swRegistration.installing) {
                await new Promise((resolve) => {
                    const worker = this.swRegistration.installing;
                    worker.addEventListener('statechange', () => {
                        if (worker.state === 'activated') {
                            console.log('✓ Service Worker activado');
                            resolve();
                        }
                    });
                });
            }
            
            return this.swRegistration;
            
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
            throw error;
        }
    }

    loadLocalState() {
        const savedState = localStorage.getItem(`fcm_enabled_${this.deviceId}`);
        this.notificationsEnabled = savedState === 'true';
    }

    setupForegroundListener() {
        onMessage(this.messaging, (payload) => {
            console.log('📨 Mensaje en primer plano:', payload);
            const event = new CustomEvent('fcmForegroundMessage', { detail: payload });
            document.dispatchEvent(event);
        });
    }

    async saveTokenToFirestore(token) {
        if (!this.userManager?.currentUser) return false;

        const user = this.userManager.currentUser;
        const userId = user.id;
        const org = user.organizacionCamelCase;
        const isAdmin = user.esAdministrador();

        try {
            const docRef = isAdmin 
                ? doc(db, "administradores", userId)
                : doc(db, `colaboradores_${org}`, userId);

            const dispositivo = {
                token: token,
                deviceId: this.deviceId,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                lastUsed: new Date().toISOString(),
                enabled: true
            };

            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return false;

            const data = docSnap.data();
            let dispositivos = data.dispositivos || [];
            
            // Eliminar dispositivos existentes con el mismo deviceId
            dispositivos = dispositivos.filter(d => d.deviceId !== this.deviceId);
            
            // Agregar el nuevo dispositivo
            dispositivos.unshift(dispositivo);

            await updateDoc(docRef, {
                dispositivos: dispositivos,
                fechaActualizacion: new Date()
            });

            console.log('✅ Token guardado en Firestore');
            return true;

        } catch (error) {
            console.error('❌ Error guardando token:', error);
            return false;
        }
    }

    async getTokenAndSave() {
        if (!this.swRegistration) {
            await this.registerServiceWorker();
        }

        try {
            console.log('🔑 Solicitando token FCM...');
            
            const token = await getToken(this.messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: this.swRegistration
            });

            if (!token) {
                throw new Error('No se pudo obtener el token');
            }

            console.log('✅ Token FCM obtenido');
            this.currentToken = token;
            
            await this.saveTokenToFirestore(token);
            
            return token;

        } catch (error) {
            console.error('❌ Error obteniendo token:', error);
            throw error;
        }
    }

    async requestPermissionAndGetToken() {
        // Si no estamos en producción, no hacemos nada
        if (!this.isProduction) {
            console.log('🔔 Las notificaciones solo funcionan en producción (HTTPS)');
            return null;
        }

        if (!this.checkBrowserSupport()) {
            throw new Error('Navegador no compatible');
        }

        try {
            if (!this.swRegistration) {
                await this.registerServiceWorker();
            }

            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                this.notificationsEnabled = false;
                localStorage.setItem(`fcm_enabled_${this.deviceId}`, 'false');
                throw new Error('Permiso denegado por el usuario');
            }

            await this.getTokenAndSave();
            
            this.notificationsEnabled = true;
            localStorage.setItem(`fcm_enabled_${this.deviceId}`, 'true');
            
            return this.currentToken;

        } catch (error) {
            console.error('❌ Error en solicitud de permiso:', error);
            throw error;
        }
    }

    async enableNotifications() {
        if (!this.isProduction) {
            console.log('🔔 Las notificaciones solo están disponibles en producción');
            return false;
        }

        if (this.notificationsEnabled) {
            return true;
        }
        
        try {
            await this.requestPermissionAndGetToken();
            return true;
        } catch (error) {
            console.error('❌ No se pudo activar:', error);
            return false;
        }
    }

    async disableNotifications() {
        this.notificationsEnabled = false;
        localStorage.setItem(`fcm_enabled_${this.deviceId}`, 'false');
        
        if (this.currentToken && this.userManager?.currentUser) {
            try {
                const user = this.userManager.currentUser;
                const docRef = user.esAdministrador() 
                    ? doc(db, "administradores", user.id)
                    : doc(db, `colaboradores_${user.organizacionCamelCase}`, user.id);

                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const dispositivos = (data.dispositivos || []).filter(d => d.deviceId !== this.deviceId);
                    await updateDoc(docRef, { dispositivos });
                }
            } catch (error) {
                console.error('Error eliminando dispositivo:', error);
            }
        }
        
        if (this.messaging && this.currentToken) {
            try {
                await deleteToken(this.messaging);
                this.currentToken = null;
            } catch (e) {
                console.warn('Error eliminando token local:', e);
            }
        }
        
        console.log('🔕 Notificaciones desactivadas');
    }

    isEnabled() {
        // En desarrollo, siempre reportamos como desactivado
        if (!this.isProduction) return false;
        return this.notificationsEnabled;
    }

    getCurrentToken() {
        return this.currentToken;
    }
}

export const fcmInitializer = new FCMInitializer();