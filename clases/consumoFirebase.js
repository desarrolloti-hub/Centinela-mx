// consumoFirebase.js
// Clase para contabilizar operaciones de Firebase (lecturas, escrituras, eliminaciones, storage, functions)

import { db } from '/config/firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

class ConsumoFirebase {
    constructor() {
        // Contadores acumulados en memoria
        this.contadores = {
            firestore: {
                lecturas: 0,
                escrituras: 0,
                eliminaciones: 0,
                actualizaciones: 0,
                total: 0
            },
            storage: {
                subidas: 0,
                descargas: 0,
                eliminaciones: 0,
                total: 0
            },
            functions: {
                invocaciones: 0,
                total: 0
            },
            autenticacion: {  // 👈 NOMBRE CORRECTO (no "auth")
                iniciosSesion: 0,
                cierresSesion: 0,
                registros: 0,
                total: 0
            },
            // Totales globales
            totalOperaciones: 0,
            ultimaActualizacion: new Date()
        };

        this.historial = []; // Para almacenar eventos recientes
        this.limiteHistorial = 1000;
        this.organizacionCamelCase = null;
        this._cargarOrganizacion();
    }

    _cargarOrganizacion() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.organizacionCamelCase = adminData.organizacionCamelCase;
                return;
            }
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            this.organizacionCamelCase = userData.organizacionCamelCase;
        } catch (error) {
            console.error('Error cargando organización:', error);
        }
    }

    // Método genérico para registrar cualquier operación
    registrar(servicio, tipo, detalles = {}) {
        const timestamp = new Date();
        const operacion = {
            servicio,
            tipo,
            detalles,
            timestamp,
            organizacion: this.organizacionCamelCase
        };

        // Actualizar contadores
        switch (servicio) {
            case 'firestore':
                if (tipo === 'lectura') this.contadores.firestore.lecturas++;
                else if (tipo === 'escritura') this.contadores.firestore.escrituras++;
                else if (tipo === 'eliminacion') this.contadores.firestore.eliminaciones++;
                else if (tipo === 'actualizacion') this.contadores.firestore.actualizaciones++;
                this.contadores.firestore.total++;
                break;
            case 'storage':
                if (tipo === 'subida') this.contadores.storage.subidas++;
                else if (tipo === 'descarga') this.contadores.storage.descargas++;
                else if (tipo === 'eliminacion') this.contadores.storage.eliminaciones++;
                this.contadores.storage.total++;
                break;
            case 'functions':
                if (tipo === 'invocacion') this.contadores.functions.invocaciones++;
                this.contadores.functions.total++;
                break;
            case 'auth':  // 👈 en los métodos usamos 'auth' para mantener compatibilidad
                if (tipo === 'login') this.contadores.autenticacion.iniciosSesion++;
                else if (tipo === 'logout') this.contadores.autenticacion.cierresSesion++;
                else if (tipo === 'registro') this.contadores.autenticacion.registros++;
                this.contadores.autenticacion.total++;
                break;
            default:
                break;
        }

        this.contadores.totalOperaciones++;
        this.contadores.ultimaActualizacion = timestamp;

        // Guardar en historial (circular buffer)
        this.historial.push(operacion);
        if (this.historial.length > this.limiteHistorial) {
            this.historial.shift();
        }
    }

    // Métodos específicos para cada servicio (para facilitar su uso)
    registrarFirestoreLectura(coleccion, documento = null) {
        this.registrar('firestore', 'lectura', { coleccion, documento });
    }

    registrarFirestoreEscritura(coleccion, documento = null) {
        this.registrar('firestore', 'escritura', { coleccion, documento });
    }

    registrarFirestoreEliminacion(coleccion, documento = null) {
        this.registrar('firestore', 'eliminacion', { coleccion, documento });
    }

    registrarFirestoreActualizacion(coleccion, documento = null) {
        this.registrar('firestore', 'actualizacion', { coleccion, documento });
    }

    registrarStorageSubida(ruta, archivo = null) {
        this.registrar('storage', 'subida', { ruta, archivo });
    }

    registrarStorageDescarga(ruta) {
        this.registrar('storage', 'descarga', { ruta });
    }

    registrarStorageEliminacion(ruta) {
        this.registrar('storage', 'eliminacion', { ruta });
    }

    registrarFunctionInvocacion(nombreFuncion, parametros = {}) {
        this.registrar('functions', 'invocacion', { nombreFuncion, parametros });
    }

    registrarAuthLogin(usuarioId) {
        this.registrar('auth', 'login', { usuarioId });
    }

    registrarAuthLogout(usuarioId) {
        this.registrar('auth', 'logout', { usuarioId });
    }

    registrarAuthRegistro(usuarioId) {
        this.registrar('auth', 'registro', { usuarioId });
    }

    // Obtener estadísticas actuales
    obtenerEstadisticas() {
        return {
            firestore: { ...this.contadores.firestore },
            storage: { ...this.contadores.storage },
            functions: { ...this.contadores.functions },
            autenticacion: { ...this.contadores.autenticacion }, // 👈 devolvemos autenticacion
            totalOperaciones: this.contadores.totalOperaciones,
            ultimaActualizacion: this.contadores.ultimaActualizacion,
            historial: this.historial.slice(-50) // últimos 50 eventos
        };
    }

    // Resetear contadores
    resetearContadores() {
        this.contadores = {
            firestore: { lecturas: 0, escrituras: 0, eliminaciones: 0, actualizaciones: 0, total: 0 },
            storage: { subidas: 0, descargas: 0, eliminaciones: 0, total: 0 },
            functions: { invocaciones: 0, total: 0 },
            autenticacion: { iniciosSesion: 0, cierresSesion: 0, registros: 0, total: 0 },
            totalOperaciones: 0,
            ultimaActualizacion: new Date()
        };
        this.historial = [];
    }

    // Guardar un snapshot de consumo en Firestore (para análisis histórico)
    async guardarSnapshot() {
        if (!this.organizacionCamelCase) return;
        try {
            const snapshot = {
                ...this.contadores,
                fecha: serverTimestamp(),
                organizacion: this.organizacionCamelCase
            };
            await addDoc(collection(db, `consumo_${this.organizacionCamelCase}`), snapshot);
        } catch (error) {
            console.error('Error guardando snapshot de consumo:', error);
        }
    }
}

// Exportar una instancia única (singleton) para compartir en toda la app
const instanciaConsumo = new ConsumoFirebase();
export default instanciaConsumo;