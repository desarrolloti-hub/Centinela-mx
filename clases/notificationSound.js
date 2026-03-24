// /clases/notificationSound.js
// Sistema de sonidos que detecta dinámicamente los archivos disponibles en Firebase Storage

import { storage } from '/config/firebase-config.js';
import { ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

export class NotificationSound {
    constructor() {
        this.audioElements = new Map();
        this.soundUrls = new Map();
        this.soundConfigs = new Map(); // Configuración dinámica
        this.initialized = false;
        this.audioPermissionGranted = true;
        this.activeSources = new Map();
        this.defaultVolume = 0.7;
        this.availableSounds = []; // Lista de sonidos disponibles
        
        // Configuración base de volúmenes (se aplicará a los sonidos encontrados)
        this.volumeConfig = {
            'alarma-robo': 0.9,
            'alerta-critica': 0.85,
            'alerta-urgente': 0.8,
            'notificacion-pendiente': 0.6,
            'mensaje-recibido': 0.5,
            'campana-suave': 0.5,
            'ding-moderno': 0.55,
            'timbre-oficina': 0.6,
            'notificacion-movil': 0.5,
            'sintetizador-alerta': 0.7
        };
        
        this.loopableConfig = {
            'alarma-robo': true,
            'alerta-critica': true,
            'alerta-urgente': true,
            'notificacion-pendiente': false,
            'mensaje-recibido': false,
            'campana-suave': false,
            'ding-moderno': false,
            'timbre-oficina': false,
            'notificacion-movil': false,
            'sintetizador-alerta': false
        };
        
        this.namesConfig = {
            'alarma-robo': 'Alarma de Robo',
            'alerta-critica': 'Alerta Crítica',
            'alerta-urgente': 'Alerta Urgente',
            'notificacion-pendiente': 'Notificación Pendiente',
            'mensaje-recibido': 'Mensaje Recibido',
            'campana-suave': 'Campana Suave',
            'ding-moderno': 'Ding Moderno',
            'timbre-oficina': 'Timbre Oficina',
            'notificacion-movil': 'Notificación Móvil',
            'sintetizador-alerta': 'Alerta Sintetizada'
        };
        
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        console.log('🎵 Buscando sonidos disponibles en Firebase Storage...');
        
        // Escanear la carpeta de Firebase Storage
        await this.scanAvailableSounds();
        
        this.initialized = true;
        console.log(`✅ Sistema de sonidos listo. Sonidos encontrados: ${this.availableSounds.length}`);
    }

    /**
     * Escanear Firebase Storage para encontrar todos los sonidos disponibles
     */
    async scanAvailableSounds() {
        try {
            const folderRef = ref(storage, 'audios/notificaciones/');
            
            // Listar todos los archivos en la carpeta
            const result = await listAll(folderRef);
            
            console.log(`📁 Escaneando carpeta: audios/notificaciones/`);
            console.log(`📁 Encontrados ${result.items.length} archivos`);
            
            // Procesar cada archivo encontrado
            for (const itemRef of result.items) {
                const fullPath = itemRef.fullPath;
                const fileName = fullPath.split('/').pop();
                const soundName = fileName.replace('.mp3', '').replace('.wav', '').replace('.ogg', '');
                
                // Obtener URL de descarga
                const url = await getDownloadURL(itemRef);
                this.soundUrls.set(soundName, url);
                
                // Crear elemento de audio
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = url;
                
                // Configurar volumen según nombre del sonido
                const volume = this.volumeConfig[soundName] || 0.6;
                audio.volume = volume;
                audio.load();
                
                this.audioElements.set(soundName, audio);
                
                // Guardar configuración
                this.soundConfigs.set(soundName, {
                    name: this.namesConfig[soundName] || this.formatSoundName(soundName),
                    path: fullPath,
                    volume: volume,
                    loopable: this.loopableConfig[soundName] || false,
                    url: url
                });
                
                this.availableSounds.push(soundName);
                
                console.log(`✅ Sonido encontrado: ${soundName} (${this.namesConfig[soundName] || soundName})`);
            }
            
            // Si no se encontraron sonidos, mostrar advertencia
            if (this.availableSounds.length === 0) {
                console.warn('⚠️ No se encontraron archivos de sonido en audios/notificaciones/');
                console.warn('💡 Sube archivos MP3 a Firebase Storage en la carpeta: audios/notificaciones/');
            }
            
        } catch (error) {
            console.error('❌ Error escaneando sonidos:', error);
            console.warn('💡 Verifica que la carpeta "audios/notificaciones/" exista en Firebase Storage');
        }
    }

    /**
     * Formatear nombre de sonido para mostrar
     */
    formatSoundName(soundName) {
        return soundName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async initialize() {
        await this.init();
        return true;
    }

    async preloadSound(soundName) {
        // Este método se mantiene para compatibilidad, pero los sonidos ya se precargaron en scan
        if (this.audioElements.has(soundName)) {
            return true;
        }
        
        // Si el sonido no está en la lista, intentar cargarlo individualmente
        try {
            const url = `/audios/notificaciones/${soundName}.mp3`;
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = url;
            audio.volume = this.volumeConfig[soundName] || 0.6;
            audio.load();
            
            this.audioElements.set(soundName, audio);
            this.availableSounds.push(soundName);
            
            console.log(`✅ Sonido cargado individualmente: ${soundName}`);
            return true;
            
        } catch (error) {
            console.debug(`⚠️ No se pudo cargar sonido: ${soundName}`);
            return false;
        }
    }

    async requestAudioPermission() {
        try {
            const testAudio = new Audio();
            testAudio.volume = 0;
            const playPromise = testAudio.play();
            if (playPromise !== undefined) {
                await playPromise;
                testAudio.pause();
            }
            this.audioPermissionGranted = true;
            return true;
        } catch (error) {
            this.audioPermissionGranted = true;
            return true;
        }
    }

    isReady() {
        return this.initialized;
    }

    async play(soundName, volume = null, loop = false) {
        if (!this.initialized) {
            await this.init();
        }
        
        // Verificar si el sonido está disponible
        let audio = this.audioElements.get(soundName);
        
        // Si no está disponible, intentar cargarlo
        if (!audio && !this.availableSounds.includes(soundName)) {
            await this.preloadSound(soundName);
            audio = this.audioElements.get(soundName);
        }
        
        if (!audio) {
            console.debug(`🔇 Sonido no disponible: ${soundName}`);
            return null;
        }
        
        try {
            const config = this.soundConfigs.get(soundName);
            const targetVolume = volume !== null ? volume : (config?.volume || this.defaultVolume);
            audio.volume = Math.min(1, Math.max(0, targetVolume));
            audio.loop = loop;
            audio.currentTime = 0;
            
            const soundId = `${soundName}_${Date.now()}`;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.activeSources.set(soundId, audio);
                        const soundConfig = this.soundConfigs.get(soundName);
                        console.log(`🔊 Reproduciendo: ${soundConfig?.name || soundName}`);
                    })
                    .catch(error => {
                        console.debug('Error reproduciendo sonido:', error.message);
                    });
            }
            
            audio.onended = () => {
                if (this.activeSources.get(soundId) === audio) {
                    this.activeSources.delete(soundId);
                }
            };
            
            return soundId;
            
        } catch (error) {
            console.debug('Error reproduciendo sonido:', error);
            return null;
        }
    }

    stop(soundId) {
        const audio = this.activeSources.get(soundId);
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
                this.activeSources.delete(soundId);
            } catch (e) {
                console.debug('Error deteniendo sonido:', e);
            }
        }
    }

    stopAll() {
        this.activeSources.forEach((audio, id) => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {}
            this.activeSources.delete(id);
        });
    }

    setGlobalVolume(volume) {
        this.defaultVolume = Math.max(0, Math.min(1, volume));
        this.audioElements.forEach(audio => {
            audio.volume = this.defaultVolume;
        });
    }
    
    setEnabled(enabled) {
        if (!enabled) {
            this.stopAll();
        }
    }

    isAvailable() {
        return this.initialized;
    }

    /**
     * Obtener lista de sonidos disponibles dinámicamente
     */
    getAvailableSounds() {
        return this.availableSounds.map(soundName => {
            const config = this.soundConfigs.get(soundName);
            return {
                id: soundName,
                name: config?.name || this.formatSoundName(soundName),
                volume: config?.volume || 0.6,
                loopable: config?.loopable || false,
                exists: true
            };
        });
    }

    /**
     * Verificar si un sonido específico existe
     */
    hasSound(soundName) {
        return this.availableSounds.includes(soundName);
    }

    /**
     * Obtener el primer sonido disponible (para fallback)
     */
    getFirstAvailableSound() {
        return this.availableSounds.length > 0 ? this.availableSounds[0] : null;
    }

    async testAllSounds(delay = 1000) {
        if (this.availableSounds.length === 0) {
            console.warn('⚠️ No hay sonidos disponibles para probar');
            return;
        }
        
        for (const sound of this.availableSounds) {
            await this.play(sound, 0.5);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

export const notificationSound = new NotificationSound();