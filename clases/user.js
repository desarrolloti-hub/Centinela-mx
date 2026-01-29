import { db, auth } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ==================== CLASE USER BASE ====================
class User {
    constructor(data = {}) {
        // Campos base para todos los usuarios
        this._organizacion = data.organizacion || '';
        this._organizacionCamelCase = data.organizacionCamelCase || '';
        this._nombreCompleto = data.nombreCompleto || '';
        this._correoElectronico = data.correoElectronico || '';
        this._status = data.status !== undefined ? data.status : true;
        this._idAuth = data.idAuth || '';
        this._fotoOrganizacion = data.fotoOrganizacion || '';
        this._fechaActualizacion = data.fechaActualizacion || new Date();
        this._fechaCreacion = data.fechaCreacion || new Date();
        this._fotoUsuario = data.fotoUsuario || '';
        this._ultimoLogin = data.ultimoLogin || null;
        this._theme = data.theme || this._obtenerThemeDelThemeManager() || 'light';
        this._eliminado = data.eliminado || false;
    }

    // ==================== MÉTODOS PRIVADOS ====================
    _actualizarFechaActualizacion() {
        this._fechaActualizacion = new Date();
    }

    _obtenerThemeDelLocalStorage() {
        try {
            return localStorage.getItem('theme') || 'light';
        } catch (e) {
            return 'light';
        }
    }

    _obtenerThemeDelThemeManager() {
        // Método base que puede ser sobrescrito por las clases hijas
        return 'light';
    }

    _guardarThemeEnLocalStorage() {
        try {
            localStorage.setItem('theme', this._theme);
        } catch (e) {
            console.warn('No se pudo guardar el tema en localStorage');
        }
    }

    // ==================== SETTERS ====================
    setOrganizacion(value) {
        this._organizacion = value;
        this._actualizarFechaActualizacion();
    }

    setOrganizacionCamelCase(value) {
        this._organizacionCamelCase = value;
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

    setTheme(value) {
        this._theme = value;
        this._guardarThemeEnLocalStorage();
        this._actualizarFechaActualizacion();
    }

    setEliminado(value) {
        this._eliminado = value;
        this._actualizarFechaActualizacion();
    }

    // ==================== GETTERS ====================
    getOrganizacion() { return this._organizacion; }
    getOrganizacionCamelCase() { return this._organizacionCamelCase; }
    getNombreCompleto() { return this._nombreCompleto; }
    getCorreoElectronico() { return this._correoElectronico; }
    getStatus() { return this._status; }
    getIdAuth() { return this._idAuth; }
    getFotoOrganizacion() { return this._fotoOrganizacion; }
    getFechaActualizacion() { return this._fechaActualizacion; }
    getFechaCreacion() { return this._fechaCreacion; }
    getFotoUsuario() { return this._fotoUsuario; }
    getUltimoLogin() { return this._ultimoLogin; }
    getTheme() { return this._theme; }
    getEliminado() { return this._eliminado; }

    // ==================== MÉTODOS ÚTILES ====================
    toObject() {
        return {
            organizacion: this.getOrganizacion(),
            organizacionCamelCase: this.getOrganizacionCamelCase(),
            nombreCompleto: this.getNombreCompleto(),
            correoElectronico: this.getCorreoElectronico(),
            status: this.getStatus(),
            idAuth: this.getIdAuth(),
            fotoOrganizacion: this.getFotoOrganizacion(),
            fechaActualizacion: this.getFechaActualizacion(),
            fechaCreacion: this.getFechaCreacion(),
            fotoUsuario: this.getFotoUsuario(),
            ultimoLogin: this.getUltimoLogin(),
            theme: this.getTheme(),
            eliminado: this.getEliminado()
        };
    }

    // Método para verificar si está activo
    estaActivo() {
        return this._status && !this._eliminado;
    }
}

// ==================== CLASE ADMINISTRADOR ====================
class Administrador extends User {
    constructor(data = {}) {
        super(data);
        this._cargo = 'administrador';
        this._esSuperAdmin = data.esSuperAdmin || false;
    }

    // Métodos específicos de administrador
    getCargo() { return this._cargo; }
    getEsSuperAdmin() { return this._esSuperAdmin; }
    
    setEsSuperAdmin(value) {
        this._esSuperAdmin = value;
        this._actualizarFechaActualizacion();
    }

    toObject() {
        const baseObject = super.toObject();
        return {
            ...baseObject,
            cargo: this.getCargo(),
            esSuperAdmin: this.getEsSuperAdmin()
        };
    }
}

// ==================== CLASE COLABORADOR ====================
class Colaborador extends User {
    constructor(data = {}) {
        super(data);
        this._cargo = 'colaborador';
        this._idAdministrador = data.idAdministrador || '';
        this._permisosPersonalizados = data.permisosPersonalizados || {};
    }

    // Métodos específicos de colaborador
    getCargo() { return this._cargo; }
    getIdAdministrador() { return this._idAdministrador; }
    getPermisosPersonalizados() { return this._permisosPersonalizados; }
    
    setIdAdministrador(value) {
        this._idAdministrador = value;
        this._actualizarFechaActualizacion();
    }

    setPermisosPersonalizados(value) {
        this._permisosPersonalizados = value;
        this._actualizarFechaActualizacion();
    }

    tienePermiso(permiso) {
        return this._permisosPersonalizados[permiso] === true;
    }

    toObject() {
        const baseObject = super.toObject();
        return {
            ...baseObject,
            cargo: this.getCargo(),
            idAdministrador: this.getIdAdministrador(),
            permisosPersonalizados: this.getPermisosPersonalizados()
        };
    }
}

// ==================== FACTORY PARA CREAR USUARIOS ====================
class UserFactory {
    static crearUsuario(tipo, data = {}) {
        switch (tipo) {
            case 'administrador':
                return new Administrador(data);
            case 'colaborador':
                return new Colaborador(data);
            default:
                throw new Error(`Tipo de usuario no válido: ${tipo}`);
        }
    }
}

// ==================== SERVICIO DE USUARIOS ====================
class UserService {
    constructor() {
        this.collectionAdmins = 'administradores';
        this.collectionColaboradores = 'colaboradores';
    }

    // ==================== MÉTODOS DE VALIDACIÓN ====================
    
    /**
     * Validar si el usuario actual es administrador
     * @returns {Promise<boolean>}
     */
    async esAdministrador() {
        const usuarioActual = await this.obtenerUsuarioActual();
        return usuarioActual && usuarioActual.getCargo() === 'administrador';
    }

    // ==================== MÉTODOS PARA ADMINISTRADORES ====================

    /**
     * REGISTRAR ADMINISTRADOR (Solo para registro inicial - no se puede desde la app)
     * @param {Object} adminDataObj - Objeto con datos del administrador (NO instancia)
     * @param {string} password - Contraseña
     * @returns {Promise<Object>}
     */
    async registrarAdministradorInicial(adminDataObj, password) {
        try {
            console.log('Datos recibidos para registro:', adminDataObj);
            
            // 1. Crear instancia de Administrador
            const adminData = new Administrador(adminDataObj);
            
            // 2. Verificar que no haya administradores registrados
            const adminsSnapshot = await getDocs(collection(db, this.collectionAdmins));
            
            if (!adminsSnapshot.empty) {
                throw new Error('Ya existe un administrador registrado');
            }

            // 3. Crear usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                adminData.getCorreoElectronico(), 
                password
            );
            
            console.log('Usuario Auth creado:', userCredential.user.uid);
            
            // 4. Actualizar displayName
            await updateProfile(userCredential.user, {
                displayName: adminData.getNombreCompleto()
            });

            // 5. Preparar datos del administrador
            const adminObject = adminData.toObject();
            adminObject.idAuth = userCredential.user.uid;
            adminObject.fechaCreacion = serverTimestamp();
            adminObject.fechaActualizacion = serverTimestamp();
            adminObject.ultimoLogin = null;
            adminObject.esSuperAdmin = true; // El primero es super admin

            // 6. Guardar en colección de administradores
            const adminRef = doc(db, this.collectionAdmins, userCredential.user.uid);
            await setDoc(adminRef, adminObject);

            console.log('Administrador inicial creado exitosamente en colección:', this.collectionAdmins);
            console.log('ID del documento:', userCredential.user.uid);
            console.log('Campos guardados:', Object.keys(adminObject));

            return {
                id: userCredential.user.uid,
                ...adminObject
            };

        } catch (error) {
            console.error('Error detallado al crear administrador inicial:', error);
            throw error;
        }
    }

    /**
     * OBTENER ADMINISTRADOR POR ID
     * @param {string} adminId - ID del administrador
     * @returns {Promise<Administrador>}
     */
    async obtenerAdministrador(adminId) {
        try {
            const adminRef = doc(db, this.collectionAdmins, adminId);
            const adminSnap = await getDoc(adminRef);

            if (!adminSnap.exists()) {
                throw new Error('Administrador no encontrado');
            }

            const adminData = adminSnap.data();
            return new Administrador({
                ...adminData,
                idAuth: adminId
            });

        } catch (error) {
            console.error('Error al obtener administrador:', error);
            throw error;
        }
    }

    /**
     * ACTUALIZAR PERFIL DE ADMINISTRADOR
     * @param {Object} updates - Campos a actualizar
     * @returns {Promise<void>}
     */
    async actualizarPerfilAdministrador(updates) {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('No eres administrador');
            }

            // No permitir cambiar el campo esSuperAdmin
            if (updates.esSuperAdmin !== undefined) {
                delete updates.esSuperAdmin;
            }

            const updateData = {
                ...updates,
                fechaActualizacion: serverTimestamp()
            };

            const adminRef = doc(db, this.collectionAdmins, adminActual.getIdAuth());
            await updateDoc(adminRef, updateData);

            console.log('Perfil de administrador actualizado');

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS CRUD PARA COLABORADORES ====================

    /**
     * CREAR COLABORADOR (Solo administradores)
     * @param {Colaborador} colaboradorData - Objeto Colaborador
     * @param {string} password - Contraseña
     * @returns {Promise<Object>}
     */
    async crearColaborador(colaboradorData, password) {
        try {
            // Solo administradores pueden crear colaboradores
            const adminActual = await this.obtenerUsuarioActual();
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('Solo administradores pueden crear colaboradores');
            }

            // Verificar que el correo no exista
            const colaboradorExiste = await this.verificarCorreoExistente(colaboradorData.getCorreoElectronico());
            if (colaboradorExiste) {
                throw new Error('El correo electrónico ya está registrado');
            }

            // 1. Crear usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                colaboradorData.getCorreoElectronico(), 
                password
            );
            
            // 2. Actualizar displayName
            await updateProfile(userCredential.user, {
                displayName: colaboradorData.getNombreCompleto()
            });

            // 3. Preparar datos del colaborador con herencia del admin
            const colaboradorObject = colaboradorData.toObject();
            colaboradorObject.idAuth = userCredential.user.uid;
            colaboradorObject.fechaCreacion = serverTimestamp();
            colaboradorObject.fechaActualizacion = serverTimestamp();
            colaboradorObject.ultimoLogin = null;
            colaboradorObject.idAdministrador = adminActual.getIdAuth();
            
            // 4. HEREDAR CAMPOS DEL ADMINISTRADOR (obligatorio)
            colaboradorObject.organizacion = adminActual.getOrganizacion();
            colaboradorObject.organizacionCamelCase = adminActual.getOrganizacionCamelCase();
            colaboradorObject.fotoOrganizacion = adminActual.getFotoOrganizacion();
            colaboradorObject.theme = adminActual.getTheme(); // Hereda tema del admin

            // 5. Agregar permisos básicos (solo lectura)
            colaboradorObject.permisosPersonalizados = {
                leerPerfil: true,
                leerOrganizacion: true,
                actualizarPerfil: false,
                crearContenido: false,
                eliminarContenido: false
            };

            // 6. Guardar en colección de colaboradores
            const colaboradorRef = doc(db, this.collectionColaboradores, userCredential.user.uid);
            await setDoc(colaboradorRef, colaboradorObject);

            console.log('Colaborador creado exitosamente:', userCredential.user.uid);
            
            // 7. Enviar correo de bienvenida con instrucciones
            await this.enviarCorreoBienvenida(colaboradorData.getCorreoElectronico());

            return {
                id: userCredential.user.uid,
                ...colaboradorObject
            };

        } catch (error) {
            console.error('Error al crear colaborador:', error);
            throw error;
        }
    }

    /**
     * OBTENER COLABORADOR POR ID
     * @param {string} colaboradorId - ID del colaborador
     * @returns {Promise<Colaborador>}
     */
    async obtenerColaborador(colaboradorId) {
        try {
            const usuarioActual = await this.obtenerUsuarioActual();
            
            if (!usuarioActual) {
                throw new Error('No autenticado');
            }

            // Validar permisos
            if (usuarioActual.getCargo() === 'colaborador' && 
                usuarioActual.getIdAuth() !== colaboradorId) {
                throw new Error('No tienes permisos para ver este colaborador');
            }

            const colaboradorRef = doc(db, this.collectionColaboradores, colaboradorId);
            const colaboradorSnap = await getDoc(colaboradorRef);

            if (!colaboradorSnap.exists()) {
                throw new Error('Colaborador no encontrado');
            }

            const colaboradorData = colaboradorSnap.data();
            return new Colaborador({
                ...colaboradorData,
                idAuth: colaboradorId
            });

        } catch (error) {
            console.error('Error al obtener colaborador:', error);
            throw error;
        }
    }

    /**
     * OBTENER COLABORADORES DE MI ORGANIZACIÓN (Solo admin)
     * @returns {Promise<Array>}
     */
    async obtenerMisColaboradores() {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('Solo administradores pueden ver colaboradores');
            }

            // Obtener colaboradores de la organización del admin
            const q = query(
                collection(db, this.collectionColaboradores),
                where('organizacionCamelCase', '==', adminActual.getOrganizacionCamelCase())
            );

            const querySnapshot = await getDocs(q);
            const colaboradores = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Solo mostrar colaboradores activos no eliminados
                if (data.status && !data.eliminado) {
                    colaboradores.push({
                        id: docSnap.id,
                        ...new Colaborador(data).toObject()
                    });
                }
            });

            return colaboradores;

        } catch (error) {
            console.error('Error al obtener colaboradores:', error);
            throw error;
        }
    }

    /**
     * ACTUALIZAR PERFIL DE COLABORADOR (Solo admin puede actualizar)
     * @param {string} colaboradorId - ID del colaborador
     * @param {Object} updates - Campos a actualizar
     * @returns {Promise<void>}
     */
    async actualizarColaborador(colaboradorId, updates) {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('Solo administradores pueden actualizar colaboradores');
            }

            // Verificar que el colaborador pertenezca al admin
            const colaborador = await this.obtenerColaborador(colaboradorId);
            if (colaborador.getIdAdministrador() !== adminActual.getIdAuth()) {
                throw new Error('No puedes actualizar colaboradores de otra organización');
            }

            // NO permitir cambiar campos heredados
            const camposBloqueados = [
                'organizacion',
                'organizacionCamelCase',
                'fotoOrganizacion',
                'theme',
                'idAdministrador'
            ];
            
            for (const campo of camposBloqueados) {
                if (updates[campo] !== undefined) {
                    throw new Error(`No puedes modificar el campo heredado: ${campo}`);
                }
            }

            const updateData = {
                ...updates,
                fechaActualizacion: serverTimestamp()
            };

            const colaboradorRef = doc(db, this.collectionColaboradores, colaboradorId);
            await updateDoc(colaboradorRef, updateData);

            console.log('Colaborador actualizado:', colaboradorId);

        } catch (error) {
            console.error('Error al actualizar colaborador:', error);
            throw error;
        }
    }

    /**
     * CAMBIAR ESTATUS DE COLABORADOR (Activar/Desactivar)
     * @param {string} colaboradorId - ID del colaborador
     * @param {boolean} nuevoStatus - Nuevo estado
     * @returns {Promise<void>}
     */
    async cambiarStatusColaborador(colaboradorId, nuevoStatus) {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('Solo administradores pueden cambiar estatus');
            }

            // Verificar que el colaborador pertenezca al admin
            const colaborador = await this.obtenerColaborador(colaboradorId);
            if (colaborador.getIdAdministrador() !== adminActual.getIdAuth()) {
                throw new Error('No puedes cambiar estatus de colaboradores de otra organización');
            }

            const updateData = {
                status: nuevoStatus,
                eliminado: !nuevoStatus, // Si está inactivo, se marca como eliminado lógico
                fechaActualizacion: serverTimestamp()
            };

            const colaboradorRef = doc(db, this.collectionColaboradores, colaboradorId);
            await updateDoc(colaboradorRef, updateData);

            console.log(`Colaborador ${nuevoStatus ? 'activado' : 'desactivado'}:`, colaboradorId);

        } catch (error) {
            console.error('Error al cambiar estatus:', error);
            throw error;
        }
    }

    /**
     * REESTABLECER CONTRASEÑA DE COLABORADOR
     * @param {string} colaboradorId - ID del colaborador
     * @returns {Promise<void>}
     */
    async reestablecerContraseñaColaborador(colaboradorId) {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('Solo administradores pueden reestablecer contraseñas');
            }

            // Obtener correo del colaborador
            const colaborador = await this.obtenerColaborador(colaboradorId);
            const correo = colaborador.getCorreoElectronico();

            // Enviar correo de reestablecimiento
            await sendPasswordResetEmail(auth, correo);

            console.log('Correo de reestablecimiento enviado a:', correo);

        } catch (error) {
            console.error('Error al reestablecer contraseña:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA COLABORADORES ====================

    /**
     * ACTUALIZAR PERFIL PERSONAL (Colaborador solo puede actualizar su perfil)
     * @param {Object} updates - Campos a actualizar
     * @returns {Promise<void>}
     */
    async actualizarMiPerfilColaborador(updates) {
        try {
            const colaboradorActual = await this.obtenerUsuarioActual();
            
            if (!colaboradorActual || colaboradorActual.getCargo() !== 'colaborador') {
                throw new Error('Solo colaboradores pueden usar este método');
            }

            // Colaboradores NO pueden cambiar campos heredados
            const camposBloqueados = [
                'organizacion',
                'organizacionCamelCase',
                'fotoOrganizacion',
                'theme',
                'idAdministrador',
                'status',
                'eliminado',
                'permisosPersonalizados'
            ];
            
            for (const campo of camposBloqueados) {
                if (updates[campo] !== undefined) {
                    throw new Error(`No puedes modificar el campo: ${campo}`);
                }
            }

            // Campos permitidos para colaboradores
            const camposPermitidos = [
                'nombreCompleto',
                'fotoUsuario',
                'ultimoLogin'
            ];

            const updatesFiltrados = {};
            for (const campo in updates) {
                if (camposPermitidos.includes(campo)) {
                    updatesFiltrados[campo] = updates[campo];
                }
            }

            if (Object.keys(updatesFiltrados).length === 0) {
                throw new Error('No hay campos válidos para actualizar');
            }

            const updateData = {
                ...updatesFiltrados,
                fechaActualizacion: serverTimestamp()
            };

            const colaboradorRef = doc(db, this.collectionColaboradores, colaboradorActual.getIdAuth());
            await updateDoc(colaboradorRef, updateData);

            console.log('Perfil de colaborador actualizado');

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS GENERALES ====================

    /**
     * OBTENER USUARIO ACTUAL (Desde auth y firestore)
     * @returns {Promise<User|null>}
     */
    async obtenerUsuarioActual() {
        try {
            const userAuth = auth.currentUser;
            
            if (!userAuth) {
                return null;
            }

            // Determinar en qué colección buscar
            let usuario = null;
            
            // Primero buscar en administradores
            try {
                usuario = await this.obtenerAdministrador(userAuth.uid);
                return usuario;
            } catch (error) {
                // Si no es admin, buscar en colaboradores
                try {
                    usuario = await this.obtenerColaborador(userAuth.uid);
                    return usuario;
                } catch (error2) {
                    console.error('Usuario no encontrado en ninguna colección');
                    return null;
                }
            }

        } catch (error) {
            console.error('Error al obtener usuario actual:', error);
            return null;
        }
    }

    /**
     * INICIAR SESIÓN
     * @param {string} email - Correo electrónico
     * @param {string} password - Contraseña
     * @returns {Promise<User>} - Usuario autenticado
     */
    async iniciarSesion(email, password) {
        try {
            // 1. Autenticar en Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // 2. Obtener datos del usuario
            const usuario = await this.obtenerUsuarioActual();
            
            if (!usuario) {
                throw new Error('Usuario no encontrado en la base de datos');
            }

            // 3. Verificar que esté activo
            if (!usuario.estaActivo()) {
                await signOut(auth);
                throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
            }

            // 4. Actualizar último login
            const updateData = {
                ultimoLogin: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            // Actualizar en la colección correspondiente
            if (usuario.getCargo() === 'administrador') {
                const adminRef = doc(db, this.collectionAdmins, userCredential.user.uid);
                await updateDoc(adminRef, updateData);
            } else {
                const colaboradorRef = doc(db, this.collectionColaboradores, userCredential.user.uid);
                await updateDoc(colaboradorRef, updateData);
            }

            // 5. Guardar tema en localStorage si es colaborador
            if (usuario.getCargo() === 'colaborador') {
                try {
                    localStorage.setItem('theme', usuario.getTheme());
                } catch (e) {
                    console.warn('No se pudo guardar el tema en localStorage');
                }
            }

            console.log('Sesión iniciada:', usuario.getNombreCompleto());
            return usuario;

        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            throw error;
        }
    }

    /**
     * CERRAR SESIÓN
     * @returns {Promise<void>}
     */
    async cerrarSesion() {
        try {
            await signOut(auth);
            console.log('Sesión cerrada exitosamente');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    }

    /**
     * CAMBIAR TEMA (Aplica a todos los usuarios)
     * @param {string} nuevoTheme - 'light' o 'dark'
     * @returns {Promise<void>}
     */
    async cambiarTheme(nuevoTheme) {
        try {
            const usuarioActual = await this.obtenerUsuarioActual();
            
            if (!usuarioActual) {
                throw new Error('No autenticado');
            }

            const updateData = {
                theme: nuevoTheme,
                fechaActualizacion: serverTimestamp()
            };

            // Actualizar en la colección correspondiente
            if (usuarioActual.getCargo() === 'administrador') {
                const adminRef = doc(db, this.collectionAdmins, usuarioActual.getIdAuth());
                await updateDoc(adminRef, updateData);
                
                // Actualizar tema de todos los colaboradores también
                await this.actualizarThemeColaboradores(nuevoTheme);
            } else {
                // Colaboradores no pueden cambiar su tema (hereda del admin)
                throw new Error('Los colaboradores no pueden cambiar el tema');
            }

            // Guardar en localStorage
            try {
                localStorage.setItem('theme', nuevoTheme);
            } catch (e) {
                console.warn('No se pudo guardar el tema en localStorage');
            }

            console.log('Tema cambiado a:', nuevoTheme);

        } catch (error) {
            console.error('Error al cambiar tema:', error);
            throw error;
        }
    }

    /**
     * ACTUALIZAR TEMA DE TODOS LOS COLABORADORES
     * @param {string} nuevoTheme - Nuevo tema
     * @returns {Promise<void>}
     */
    async actualizarThemeColaboradores(nuevoTheme) {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                return;
            }

            const colaboradores = await this.obtenerMisColaboradores();
            
            const updatePromises = colaboradores.map(async (colaborador) => {
                const colaboradorRef = doc(db, this.collectionColaboradores, colaborador.id);
                await updateDoc(colaboradorRef, {
                    theme: nuevoTheme,
                    fechaActualizacion: serverTimestamp()
                });
            });

            await Promise.all(updatePromises);
            console.log('Tema actualizado para todos los colaboradores');

        } catch (error) {
            console.error('Error al actualizar tema de colaboradores:', error);
        }
    }

    // ==================== MÉTODOS AUXILIARES ====================

    /**
     * VERIFICAR SI UN CORREO EXISTE
     * @param {string} correo - Correo a verificar
     * @returns {Promise<boolean>}
     */
    async verificarCorreoExistente(correo) {
        try {
            // Buscar en administradores
            const qAdmins = query(
                collection(db, this.collectionAdmins),
                where('correoElectronico', '==', correo)
            );
            const adminsSnapshot = await getDocs(qAdmins);
            
            if (!adminsSnapshot.empty) {
                return true;
            }

            // Buscar en colaboradores
            const qColaboradores = query(
                collection(db, this.collectionColaboradores),
                where('correoElectronico', '==', correo)
            );
            const colaboradoresSnapshot = await getDocs(qColaboradores);
            
            return !colaboradoresSnapshot.empty;

        } catch (error) {
            console.error('Error al verificar correo:', error);
            return false;
        }
    }

    /**
     * ENVIAR CORREO DE BIENVENIDA
     * @param {string} correo - Correo del nuevo colaborador
     * @returns {Promise<void>}
     */
    async enviarCorreoBienvenida(correo) {
        // Aquí implementarías el envío de correo
        // Puedes usar EmailJS, SendGrid, o un cloud function
        console.log('Correo de bienvenida enviado a:', correo);
    }

    /**
     * OBTENER ESTADÍSTICAS (Solo admin)
     * @returns {Promise<Object>}
     */
    async obtenerEstadisticas() {
        try {
            const adminActual = await this.obtenerUsuarioActual();
            
            if (!adminActual || adminActual.getCargo() !== 'administrador') {
                throw new Error('Solo administradores pueden ver estadísticas');
            }

            const colaboradores = await this.obtenerMisColaboradores();
            
            const activos = colaboradores.filter(c => c.status).length;
            const inactivos = colaboradores.filter(c => !c.status).length;
            const total = colaboradores.length;

            return {
                totalColaboradores: total,
                activos: activos,
                inactivos: inactivos,
                porcentajeActivos: total > 0 ? (activos / total * 100).toFixed(2) : 0
            };

        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    }
}

// Exportar las clases para uso en otros archivos
export { User, Administrador, Colaborador, UserFactory, UserService };

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('User Service inicializado');
    
    // Configurar listeners si existen en la página
    if (typeof setupFormularioCrearColaborador === 'function') {
        setupFormularioCrearColaborador();
    }
    
    // Verificar autenticación al cargar
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('Usuario autenticado:', user.email);
            
            // Cargar tema desde localStorage
            const temaGuardado = localStorage.getItem('theme');
            if (temaGuardado) {
                document.documentElement.setAttribute('data-theme', temaGuardado);
            }
        } else {
            console.log('No autenticado');
        }
    });
});