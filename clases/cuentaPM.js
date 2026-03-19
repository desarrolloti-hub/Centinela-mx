import { db } from '/config/firebase-config.js';
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

class CuentaPM {
    constructor(email, data = {}) {
        this.id = email; 
        this.email = email;
        this.userToken = data.userToken || '';
        this.appId = data.appId || this._generateAppId();
        this.organizacion = ''; 
        this.organizacionCamelCase = '';
        this.status = data.status || 'pendiente';
        this.fechaCreacion = new Date();
    }

    _generateAppId() {
        // Genera ID único de 8 caracteres para la app
        return Math.random().toString(16).substring(2, 10);
    }

    async guardarEnFirebase() {
        try {
            const docRef = doc(db, "cuentas_tecnicas_pm", this.id);
            const dataToSave = {
                email: this.email,
                userToken: this.userToken,
                appId: this.appId,
                organizacion: this.organizacion,
                organizacionCamelCase: this.organizacionCamelCase,
                status: this.status,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            await setDoc(docRef, dataToSave);
            return true;
        } catch (error) {
            console.error("❌ Error en persistencia Firestore:", error);
            throw error;
        }
    }
}

export { CuentaPM };