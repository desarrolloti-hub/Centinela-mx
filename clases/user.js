/**
 * Clase User (Administrador)
 * Con todos los setters primero y getters
 */

class User {
    constructor(data = {}) {
        this._organizacion = data.organizacion || '';
        this._organizacionCC = data.organizacionCC || '';
        this._nombreCompleto = data.nombreCompleto || '';
        this._correoElectronico = data.correoElectronico || '';
        this._status = data.status !== undefined ? data.status : true;
        this._idAuth = data.idAuth || '';
        this._fotoOrganizacion = data.fotoOrganizacion || '';
        this._fechaActualizacion = data.fechaActualizacion || new Date();
        this._fechaCreacion = data.fechaCreacion || new Date();
        this._fotoUsuario = data.fotoUsuario || '';
        this._ultimoLogin = data.ultimoLogin || null;
    }

    // ==================== TODOS LOS SETTERS ====================

    setOrganizacion(value) {
        this._organizacion = value;
        this._actualizarFechaActualizacion();
    }

    setOrganizacionCC(value) {
        this._organizacionCC = value;
        this._actualizarFechaActualizacion();
    }

    setNombreCompleto(value) {
        this._nombreCompleto = value;
        this._actualizarFechaActualizacion();
    }

    setCorreoElectronico(value) {
        this._correoElectronico = value;
        this._actualizarFechaActualizacion();
    }

    setStatus(value) {
        this._status = value;
        this._actualizarFechaActualizacion();
    }

    setIdAuth(value) {
        this._idAuth = value;
        this._actualizarFechaActualizacion();
    }

    setFotoOrganizacion(value) {
        this._fotoOrganizacion = value;
        this._actualizarFechaActualizacion();
    }

    setFechaActualizacion(value) {
        this._fechaActualizacion = value;
    }

    setFechaCreacion(value) {
        this._fechaCreacion = value;
    }

    setFotoUsuario(value) {
        this._fotoUsuario = value;
        this._actualizarFechaActualizacion();
    }

    setUltimoLogin(value) {
        this._ultimoLogin = value;
        this._actualizarFechaActualizacion();
    }

    // ==================== TODOS LOS GETTERS ====================

    getOrganizacion() {
        return this._organizacion;
    }

    getOrganizacionCC() {
        return this._organizacionCC;
    }

    getNombreCompleto() {
        return this._nombreCompleto;
    }

    getCorreoElectronico() {
        return this._correoElectronico;
    }

    getStatus() {
        return this._status;
    }

    getIdAuth() {
        return this._idAuth;
    }

    getFotoOrganizacion() {
        return this._fotoOrganizacion;
    }

    getFechaActualizacion() {
        return this._fechaActualizacion;
    }

    getFechaCreacion() {
        return this._fechaCreacion;
    }

    getFotoUsuario() {
        return this._fotoUsuario;
    }

    getUltimoLogin() {
        return this._ultimoLogin;
    }

    // ==================== MÉTODOS PRIVADOS ====================

    _actualizarFechaActualizacion() {
        this._fechaActualizacion = new Date();
    }

    // ==================== MÉTODOS ÚTILES ====================

    toObject() {
        return {
            organizacion: this.getOrganizacion(),
            organizacionCC: this.getOrganizacionCC(),
            nombreCompleto: this.getNombreCompleto(),
            correoElectronico: this.getCorreoElectronico(),
            status: this.getStatus(),
            idAuth: this.getIdAuth(),
            fotoOrganizacion: this.getFotoOrganizacion(),
            fechaActualizacion: this.getFechaActualizacion(),
            fechaCreacion: this.getFechaCreacion(),
            fotoUsuario: this.getFotoUsuario(),
            ultimoLogin: this.getUltimoLogin()
        };
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = User;
}