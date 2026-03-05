// /components/fcm-inicializador.js - Versión ultra simple para probar
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging.js";
import { app } from '/config/firebase-config.js';

const VAPID_KEY = "BHhrxqXbPjiNadS41r_jq2OVlUqg9BtHOu1ixfbHoDmVO-WN14scZSFlmHQitsrxyDYMXO4-4jWYPyY-XJBdskY";

class FCMInicializador {
    constructor() {
        this.notificacionesActivas = false;
        this.tokenActual = null;
        this.dispositivoId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    async iniciar() {
        console.log('📱 Verificando soporte...');
        
        if (!('Notification' in window)) {
            console.log('❌ Notificaciones no soportadas');
            return false;
        }
        
        if (!('serviceWorker' in navigator)) {
            console.log('❌ Service Worker no soportado');
            return false;
        }

        // Verificar estado actual
        console.log('📋 Estado del permiso:', Notification.permission);
        
        if (Notification.permission === 'granted') {
            this.notificacionesActivas = true;
            await this.obtenerToken();
        }
        
        return true;
    }

    async obtenerToken() {
        try {
            const messaging = getMessaging(app);
            
            // Asegurar que el SW está registrado
            const registros = await navigator.serviceWorker.getRegistrations();
            let swReg = registros.find(r => r.active?.scriptURL.includes('firebase-messaging-sw'));
            
            if (!swReg) {
                console.log('📦 Registrando SW...');
                swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            }
            
            console.log('🔑 Solicitando token...');
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg
            });
            
            if (token) {
                console.log('✅ Token obtenido:', token.substring(0, 30) + '...');
                this.tokenActual = token;
                return token;
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
        return null;
    }

    async activar() {
        if (this.notificacionesActivas) return true;
        
        try {
            const permiso = await Notification.requestPermission();
            console.log('📋 Permiso:', permiso);
            
            if (permiso === 'granted') {
                this.notificacionesActivas = true;
                await this.obtenerToken();
                return true;
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
        return false;
    }

    estaActiva() {
        return this.notificacionesActivas;
    }
}

export const fcmInicializador = new FCMInicializador();