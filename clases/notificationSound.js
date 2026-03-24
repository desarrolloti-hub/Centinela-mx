// /clases/notificationSound.js

/**
 * Clase para manejar sonidos de notificaciones usando Web Audio API
 * No requiere archivos externos, genera los sonidos sintéticamente
 */
export class NotificationSound {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.initialized = false;
        this.audioPermissionGranted = false;
        this.activeSources = new Map();
        this.defaultVolume = 0.7;
        
        // Configuración de sonidos
        this.soundConfigs = {
            'alarma-robo': {
                name: 'Alarma de Robo',
                type: 'web-audio',
                volume: 0.9,
                loopable: true,
                duration: 3000
            },
            'alerta-critica': {
                name: 'Alerta Crítica',
                type: 'web-audio',
                volume: 0.85,
                loopable: true,
                duration: 2000
            },
            'notificacion-pendiente': {
                name: 'Notificación Pendiente',
                type: 'web-audio',
                volume: 0.6,
                loopable: false,
                duration: 800
            },
            'mensaje-recibido': {
                name: 'Mensaje Recibido',
                type: 'web-audio',
                volume: 0.5,
                loopable: false,
                duration: 600
            },
            'campana-suave': {
                name: 'Campana Suave',
                type: 'web-audio',
                volume: 0.5,
                loopable: false,
                duration: 1200
            },
            'ding-moderno': {
                name: 'Ding Moderno',
                type: 'web-audio',
                volume: 0.55,
                loopable: false,
                duration: 400
            },
            'alerta-urgente': {
                name: 'Alerta Urgente',
                type: 'web-audio',
                volume: 0.8,
                loopable: true,
                duration: 2500
            },
            'timbre-oficina': {
                name: 'Timbre Oficina',
                type: 'web-audio',
                volume: 0.6,
                loopable: false,
                duration: 1000
            },
            'notificacion-movil': {
                name: 'Notificación Móvil',
                type: 'web-audio',
                volume: 0.5,
                loopable: false,
                duration: 500
            },
            'sintetizador-alerta': {
                name: 'Alerta Sintetizada',
                type: 'web-audio',
                volume: 0.7,
                loopable: false,
                duration: 800
            }
        };
    }

    /**
     * Inicializar el sistema de sonido
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            // Crear AudioContext (inicialmente suspendido)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generar todos los sonidos
            await this.generateAllSounds();
            
            this.initialized = true;
            console.log('🔊 NotificationSound inicializado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando AudioContext:', error);
            return false;
        }
    }

    /**
     * Solicitar permiso para reproducir audio (requiere interacción del usuario)
     */
    async requestAudioPermission() {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }
            
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                this.audioPermissionGranted = true;
                console.log('🔊 Permiso de audio concedido, AudioContext activo');
                return true;
            }
            
            if (this.audioContext && this.audioContext.state === 'running') {
                this.audioPermissionGranted = true;
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error solicitando permiso de audio:', error);
            return false;
        }
    }

    /**
     * Verificar si el audio está listo para reproducir
     */
    isReady() {
        return this.initialized && this.audioPermissionGranted && this.audioContext?.state === 'running';
    }

    /**
     * Generar todos los sonidos
     */
    async generateAllSounds() {
        const soundNames = Object.keys(this.soundConfigs);
        
        for (const soundName of soundNames) {
            await this.generateSound(soundName);
        }
    }

    /**
     * Generar un sonido específico
     */
    async generateSound(soundName) {
        const config = this.soundConfigs[soundName];
        if (!config) return null;
        
        const buffer = this.createSoundBuffer(soundName);
        if (buffer) {
            this.sounds.set(soundName, buffer);
        }
        
        return buffer;
    }

    /**
     * Crear buffer de audio según el tipo de sonido
     */
    createSoundBuffer(soundName) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const duration = this.soundConfigs[soundName].duration / 1000;
        const frameCount = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
        
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);
        
        // Generar el sonido según el tipo
        switch(soundName) {
            case 'alarma-robo':
                this.generateAlarmaRobo(leftChannel, rightChannel, sampleRate);
                break;
            case 'alerta-critica':
                this.generateAlertaCritica(leftChannel, rightChannel, sampleRate);
                break;
            case 'notificacion-pendiente':
                this.generateNotificacionPendiente(leftChannel, rightChannel, sampleRate);
                break;
            case 'mensaje-recibido':
                this.generateMensajeRecibido(leftChannel, rightChannel, sampleRate);
                break;
            case 'campana-suave':
                this.generateCampanaSuave(leftChannel, rightChannel, sampleRate);
                break;
            case 'ding-moderno':
                this.generateDingModerno(leftChannel, rightChannel, sampleRate);
                break;
            case 'alerta-urgente':
                this.generateAlertaUrgente(leftChannel, rightChannel, sampleRate);
                break;
            case 'timbre-oficina':
                this.generateTimbreOficina(leftChannel, rightChannel, sampleRate);
                break;
            case 'notificacion-movil':
                this.generateNotificacionMovil(leftChannel, rightChannel, sampleRate);
                break;
            case 'sintetizador-alerta':
                this.generateSintetizadorAlerta(leftChannel, rightChannel, sampleRate);
                break;
            default:
                this.generateDefaultSound(leftChannel, rightChannel, sampleRate);
        }
        
        return buffer;
    }

    /**
     * Alarma de robo - Sonido pulsante agudo
     */
    generateAlarmaRobo(left, right, sampleRate) {
        const duration = left.length;
        const frequency1 = 880;
        const frequency2 = 440;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const freq = Math.floor(t / 0.3) % 2 === 0 ? frequency1 : frequency2;
            const value = Math.sin(2 * Math.PI * freq * t) * 
                         Math.exp(-t * 2) *
                         (Math.sin(2 * Math.PI * 5 * t) * 0.5 + 0.5);
            
            left[i] = value * 0.8;
            right[i] = value * 0.8;
        }
    }

    /**
     * Alerta crítica - Sirena ascendente
     */
    generateAlertaCritica(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const freq = 300 + (t * 500);
            const value = Math.sin(2 * Math.PI * freq * t) * 
                         Math.exp(-t * 1.5) *
                         (Math.sin(2 * Math.PI * 8 * t) * 0.3 + 0.7);
            
            left[i] = value * 0.85;
            right[i] = value * 0.85;
        }
    }

    /**
     * Notificación pendiente - Sonido suave
     */
    generateNotificacionPendiente(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const value = (Math.sin(2 * Math.PI * 523.25 * t) * 0.4 +
                          Math.sin(2 * Math.PI * 783.99 * t) * 0.3) *
                          Math.exp(-t * 3);
            
            left[i] = value * 0.6;
            right[i] = value * 0.6;
        }
    }

    /**
     * Mensaje recibido - Sonido tipo pop
     */
    generateMensajeRecibido(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 15);
            const value = (Math.sin(2 * Math.PI * 880 * t) * 0.3 +
                          Math.sin(2 * Math.PI * 440 * t) * 0.2) * envelope;
            
            left[i] = value * 0.5;
            right[i] = value * 0.5;
        }
    }

    /**
     * Campana suave
     */
    generateCampanaSuave(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const harmonics = [1, 2, 3, 4].map((n, idx) => 
                Math.sin(2 * Math.PI * 523.25 * n * t) * (1 / (n * 1.5))
            ).reduce((a, b) => a + b, 0);
            
            const value = harmonics * Math.exp(-t * 4);
            
            left[i] = value * 0.55;
            right[i] = value * 0.55;
        }
    }

    /**
     * Ding moderno
     */
    generateDingModerno(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const freq = 1046.5 + (t * 500);
            const value = Math.sin(2 * Math.PI * freq * t) * 
                         Math.exp(-t * 12) *
                         (Math.sin(2 * Math.PI * 20 * t) * 0.2 + 0.8);
            
            left[i] = value * 0.55;
            right[i] = value * 0.55;
        }
    }

    /**
     * Alerta urgente
     */
    generateAlertaUrgente(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const pulse = Math.floor(t * 8) % 2 === 0 ? 1 : 0.3;
            const value = Math.sin(2 * Math.PI * 659.25 * t) * pulse * 
                         Math.exp(-t * 2.5);
            
            left[i] = value * 0.8;
            right[i] = value * 0.8;
        }
    }

    /**
     * Timbre de oficina
     */
    generateTimbreOficina(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const freq = Math.floor(t / 0.2) % 2 === 0 ? 523.25 : 659.25;
            const value = Math.sin(2 * Math.PI * freq * t) * 
                         Math.exp(-t * 3) *
                         (Math.sin(2 * Math.PI * 4 * t) * 0.2 + 0.8);
            
            left[i] = value * 0.6;
            right[i] = value * 0.6;
        }
    }

    /**
     * Notificación móvil
     */
    generateNotificacionMovil(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const envelope = Math.sin(Math.PI * t / 0.15) * Math.exp(-t * 8);
            const value = (Math.sin(2 * Math.PI * 698.46 * t) * 0.5 +
                          Math.sin(2 * Math.PI * 1396.92 * t) * 0.3) * envelope;
            
            left[i] = value * 0.5;
            right[i] = value * 0.5;
        }
    }

    /**
     * Alerta sintetizada
     */
    generateSintetizadorAlerta(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const freq = 440 + Math.sin(t * Math.PI * 2) * 200;
            const value = Math.sin(2 * Math.PI * freq * t) * 
                         Math.exp(-t * 5) *
                         (Math.sin(2 * Math.PI * 5 * t) * 0.3 + 0.7);
            
            left[i] = value * 0.7;
            right[i] = value * 0.7;
        }
    }

    /**
     * Sonido por defecto
     */
    generateDefaultSound(left, right, sampleRate) {
        const duration = left.length;
        
        for (let i = 0; i < duration; i++) {
            const t = i / sampleRate;
            const value = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 5);
            left[i] = value * 0.5;
            right[i] = value * 0.5;
        }
    }

    /**
     * Reproducir un sonido
     * @param {string} soundName - Nombre del sonido
     * @param {number} volume - Volumen (0-1)
     * @param {boolean} loop - Si debe repetirse
     * @returns {string|null} ID del sonido para poder detenerlo
     */
    async play(soundName, volume = null, loop = false) {
        if (!this.isReady()) {
            console.warn('🔇 Audio no disponible. Asegúrate de que el usuario haya interactuado con la página.');
            return null;
        }
        
        const buffer = this.sounds.get(soundName);
        if (!buffer) {
            console.warn(`Sonido no encontrado: ${soundName}`);
            // Intentar generar el sonido sobre la marcha
            await this.generateSound(soundName);
            const newBuffer = this.sounds.get(soundName);
            if (!newBuffer) return null;
        }
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds.get(soundName);
            source.loop = loop;
            
            const gainNode = this.audioContext.createGain();
            const targetVolume = volume !== null ? volume : this.soundConfigs[soundName]?.volume || this.defaultVolume;
            gainNode.gain.value = targetVolume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const soundId = `${soundName}_${Date.now()}`;
            this.activeSources.set(soundId, { source, gainNode });
            
            source.onended = () => {
                this.activeSources.delete(soundId);
            };
            
            source.start();
            console.log(`🔊 Reproduciendo: ${this.soundConfigs[soundName]?.name || soundName} (volumen: ${targetVolume})`);
            
            return soundId;
            
        } catch (error) {
            console.error('❌ Error reproduciendo sonido:', error);
            return null;
        }
    }

    /**
     * Detener un sonido específico
     */
    stop(soundId) {
        const sound = this.activeSources.get(soundId);
        if (sound) {
            try {
                sound.source.stop();
                this.activeSources.delete(soundId);
            } catch (e) {
                console.warn('Error deteniendo sonido:', e);
            }
        }
    }

    /**
     * Detener todos los sonidos
     */
    stopAll() {
        this.activeSources.forEach((sound, id) => {
            try {
                sound.source.stop();
            } catch (e) {}
            this.activeSources.delete(id);
        });
    }

    /**
     * Configurar volumen global
     */
    setGlobalVolume(volume) {
        this.defaultVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Verificar si el audio está disponible
     */
    isAvailable() {
        return this.audioPermissionGranted && this.initialized && this.audioContext?.state === 'running';
    }

    /**
     * Obtener lista de sonidos disponibles
     */
    getAvailableSounds() {
        return Object.keys(this.soundConfigs).map(key => ({
            id: key,
            name: this.soundConfigs[key].name,
            volume: this.soundConfigs[key].volume,
            loopable: this.soundConfigs[key].loopable
        }));
    }

    /**
     * Prueba rápida de todos los sonidos
     */
    async testAllSounds(delay = 1000) {
        const sounds = Object.keys(this.soundConfigs);
        
        for (const sound of sounds) {
            await this.play(sound, 0.5);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Exportar instancia única
export const notificationSound = new NotificationSound();