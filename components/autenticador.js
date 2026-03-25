// En user.js - Añadir método de inicialización
class UserManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        
        // Intentar recuperar sesión del almacenamiento
        this.restoreSession();
    }
    
    async restoreSession() {
        try {
            const savedSession = localStorage.getItem('userSession');
            if (savedSession) {
                const userData = JSON.parse(savedSession);
                this.currentUser = new User(userData);
                this.isInitialized = true;
                
                // Disparar evento
                document.dispatchEvent(new CustomEvent('user:loaded', {
                    detail: { user: this.currentUser }
                }));
            } else {
                this.isInitialized = true;
            }
        } catch (error) {
            console.error('Error restaurando sesión:', error);
            this.isInitialized = true;
        }
    }
    
    async iniciarSesion(email, password) {
        // Tu código de login existente...
        // Después de login exitoso:
        localStorage.setItem('userSession', JSON.stringify(this.currentUser.toJSON()));
        document.dispatchEvent(new CustomEvent('user:loaded', {
            detail: { user: this.currentUser }
        }));
        return this.currentUser;
    }
    
    async logout() {
        // Tu código de logout existente...
        localStorage.removeItem('userSession');
        this.currentUser = null;
        document.dispatchEvent(new CustomEvent('user:loaded', {
            detail: { user: null }
        }));
    }
}