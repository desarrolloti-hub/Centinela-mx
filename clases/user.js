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

class User {
    constructor(id, data) {
        this.id = id; // UID de Firebase Auth
        this.organizacion = data.organizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.nombreCompleto = data.nombreCompleto || '';
        this.correoElectronico = data.correoElectronico || '';
        this.status = data.status !== undefined ? data.status : true;
        this.idAuth = data.idAuth || '';
        this.fotoOrganizacion = data.fotoOrganizacion || '';
        this.fechaActualizacion = data.fechaActualizacion || new Date();
        this.fechaCreacion = data.fechaCreacion || new Date();
        this.fotoUsuario = data.fotoUsuario || '';
        this.ultimoLogin = data.ultimoLogin || null;
        this.theme = data.theme || this._obtenerThemeDelLocalStorage() || 'predeterminado';
        this.eliminado = data.eliminado || false;
        this.cargo = data.cargo || 'colaborador'; // 'administrador' o 'colaborador'
        this.esSuperAdmin = data.esSuperAdmin || false;
        this.idAdministrador = data.idAdministrador || ''; // Solo para colaboradores
        this.permisosPersonalizados = data.permisosPersonalizados || {};
        this.plan = data.plan || 'gratis'; // Nuevo campo: 'gratis', 'basico', 'premium', 'empresa'
        this.tokenVerificacion = data.tokenVerificacion || ''; // Token de verificación
        this.verificado = data.verificado || false; // Estado de verificación
        this.fechaToken = data.fechaToken || null; // Fecha de generación del token
        
        console.log(`User ${id} creado:`, {
            cargo: this.cargo,
            nombreCompleto: this.nombreCompleto,
            organizacion: this.organizacion,
            status: this.status,
            theme: this.theme,
            plan: this.plan,
            verificado: this.verificado
        });
    }

    // Obtener tema del localStorage como respaldo
    _obtenerThemeDelLocalStorage() {
        try {
            const savedTheme = localStorage.getItem('centinela-theme');
            if (savedTheme) {
                const themeData = JSON.parse(savedTheme);
                return themeData.themeId || 'default';
            }
        } catch (e) {
            console.warn('No se pudo leer tema de localStorage');
        }
        return 'default';
    }

    // Guardar tema en localStorage
    _guardarThemeEnLocalStorage(themeId, themeData = null) {
        try {
            const saveData = {
                themeId: themeId,
                data: themeData || this.getThemePresets()[themeId] || {},
                savedAt: Date.now()
            };
            localStorage.setItem('centinela-theme', JSON.stringify(saveData));
            localStorage.setItem('centinela-theme-last-save', Date.now().toString());
        } catch (e) {
            console.warn('No se pudo guardar tema en localStorage');
        }
    }

    getFotoUrl() {
        if (!this.fotoUsuario || this.fotoUsuario.trim() === '') {
            return 'https://via.placeholder.com/150/0a2540/ffffff?text=No+Photo';
        }
        
        // Si ya es una data URL, retornarla
        if (this.fotoUsuario.startsWith('data:image')) {
            return this.fotoUsuario;
        }
        
        // Si es una URL, retornarla
        if (this.fotoUsuario.startsWith('http')) {
            return this.fotoUsuario;
        }
        
        // Si es base64 sin prefijo, añadirlo
        if (this.fotoUsuario.length > 100 && !this.fotoUsuario.includes('://')) {
            let mimeType = 'image/png';
            if (this.fotoUsuario.startsWith('/9j/') || this.fotoUsuario.startsWith('iVBORw')) {
                mimeType = 'image/jpeg';
            } else if (this.fotoUsuario.startsWith('R0lGOD')) {
                mimeType = 'image/gif';
            }
            
            return `data:${mimeType};base64,${this.fotoUsuario}`;
        }
        
        return 'https://via.placeholder.com/150/0a2540/ffffff?text=Invalid+Photo';
    }

    getCargoBadge() {
        const cargos = {
            'administrador': { 
                color: '#dc3545', 
                text: 'Administrador', 
                icon: 'fa-crown',
                superAdmin: this.esSuperAdmin ? ' (Super Admin)' : ''
            },
            'colaborador': { 
                color: '#0dcaf0', 
                text: 'Colaborador', 
                icon: 'fa-user-tie' 
            }
        };
        
        const cargoConfig = cargos[this.cargo] || cargos.colaborador;
        return `<span style="background: ${cargoConfig.color}; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
            <i class="fas ${cargoConfig.icon}"></i> ${cargoConfig.text}${cargoConfig.superAdmin || ''}
        </span>`;
    }

    getPlanBadge() {
        const planes = {
            'gratis': { 
                color: '#6c757d', 
                text: 'Gratis', 
                icon: 'fa-gift'
            },
            'basico': { 
                color: '#007bff', 
                text: 'Básico', 
                icon: 'fa-star'
            },
            'premium': { 
                color: '#28a745', 
                text: 'Premium', 
                icon: 'fa-crown'
            },
            'empresa': { 
                color: '#6610f2', 
                text: 'Empresa', 
                icon: 'fa-building'
            }
        };
        
        const planConfig = planes[this.plan] || planes.gratis;
        return `<span style="background: ${planConfig.color}; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
            <i class="fas ${planConfig.icon}"></i> ${planConfig.text}
        </span>`;
    }

    getVerificacionBadge() {
        if (this.verificado) {
            return `<span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-check-circle"></i> Verificado
            </span>`;
        } else {
            return `<span style="background: #ffc107; color: black; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-clock"></i> Pendiente
            </span>`;
        }
    }

    getStatusBadge() {
        if (this.status && !this.eliminado) {
            return `<span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-check-circle"></i> Activo
            </span>`;
        } else if (!this.status) {
            return `<span style="background: #ffc107; color: black; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-pause-circle"></i> Inactivo
            </span>`;
        } else {
            return `<span style="background: #6c757d; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-times-circle"></i> Eliminado
            </span>`;
        }
    }

    estaActivo() {
        return this.status && !this.eliminado;
    }

    estaVerificado() {
        return this.verificado;
    }

    toAdminHTML() {
        const fechaCreacion = this.fechaCreacion ? 
            (this.fechaCreacion.toDate ? 
                this.fechaCreacion.toDate().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }) : 
                new Date(this.fechaCreacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
            ) : 'No fecha';
            
        const ultimoLogin = this.ultimoLogin ? 
            (this.ultimoLogin.toDate ? 
                this.ultimoLogin.toDate().toLocaleDateString('es-ES') : 
                new Date(this.ultimoLogin).toLocaleDateString('es-ES')
            ) : 'Nunca';

        return `
            <div class="user-item-card" data-id="${this.id}" data-cargo="${this.cargo}">
                <div class="user-item-image">
                    <img src="${this.getFotoUrl()}" 
                         alt="${this.nombreCompleto}" 
                         data-user-id="${this.id}"
                         onerror="handleUserImageError(this, '${this.id}')"
                         onload="handleUserImageLoad(this, '${this.id}')">
                </div>
                <div class="user-item-content">
                    <div class="user-item-header">
                        <h4>${this.nombreCompleto}</h4>
                        <div class="user-meta">
                            ${this.getCargoBadge()}
                            ${this.getPlanBadge()}
                            ${this.getVerificacionBadge()}
                            ${this.getStatusBadge()}
                        </div>
                    </div>
                    
                    <div class="user-item-details">
                        <div class="detail-row">
                            <span><i class="fas fa-envelope"></i> ${this.correoElectronico}</span>
                        </div>
                        <div class="detail-row">
                            <span><i class="fas fa-building"></i> ${this.organizacion || 'No organización'}</span>
                        </div>
                        ${this.cargo === 'colaborador' ? `
                        <div class="detail-row">
                            <span><i class="fas fa-user-shield"></i> Administrador asignado</span>
                        </div>
                        ` : ''}
                        <div class="detail-row">
                            <span><i class="fas fa-calendar-plus"></i> Creado: ${fechaCreacion}</span>
                            <span><i class="fas fa-sign-in-alt"></i> Último login: ${ultimoLogin}</span>
                        </div>
                    </div>
                    
                    <div class="user-item-actions">
                        ${!this.verificado ? `
                        <button class="btn-verificar" data-id="${this.id}" data-email="${this.correoElectronico}">
                            <i class="fas fa-envelope"></i> Reenviar Token
                        </button>
                        ` : ''}
                        <button class="btn-edit" data-id="${this.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${this.cargo === 'colaborador' ? `
                        <button class="btn-reset-password" data-id="${this.id}" data-email="${this.correoElectronico}">
                            <i class="fas fa-key"></i> Resetear Contraseña
                        </button>
                        ` : ''}
                        <button class="btn-delete" data-id="${this.id}">
                            <i class="fas fa-trash"></i> ${this.eliminado ? 'Eliminar Permanentemente' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Método para verificar límites del plan
    tieneLimiteUsuarios() {
        const limites = {
            'gratis': 3,
            'basico': 10,
            'premium': 50,
            'empresa': 999 // ilimitado
        };
        return limites[this.plan] || 3;
    }

    puedeCrearMasUsuarios(totalUsuarios) {
        if (this.plan === 'empresa') return true;
        return totalUsuarios < this.tieneLimiteUsuarios();
    }

    // Generar token de verificación
    generarTokenVerificacion() {
        // Generar token de 6 dígitos
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        this.tokenVerificacion = token;
        this.fechaToken = new Date();
        return token;
    }

    // Validar token
    validarToken(token) {
        if (!this.tokenVerificacion || !this.fechaToken) return false;
        
        // Verificar si el token es válido (24 horas de vigencia)
        const ahora = new Date();
        const diferenciaHoras = (ahora - this.fechaToken) / (1000 * 60 * 60);
        
        if (diferenciaHoras > 24) {
            return false; // Token expirado
        }
        
        return this.tokenVerificacion === token;
    }
}

// Global image error handler for users
window.handleUserImageError = function(imgElement, userId) {
    console.error(`Image failed to load for user ${userId}`);
    imgElement.src = 'https://via.placeholder.com/150/0a2540/ffffff?text=No+Photo';
};

window.handleUserImageLoad = function(imgElement, userId) {
    console.log(`Image loaded successfully for user ${userId}`);
};

class UserManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
        console.log('UserManager inicializado');
        
        // Escuchar cambios de autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.loadCurrentUser(user.uid);
            } else {
                this.currentUser = null;
            }
        });
    }

    async loadCurrentUser(userId) {
        try {
            console.log('Cargando usuario actual:', userId);
            
            // Primero buscar en administradores
            const adminRef = doc(db, "administradores", userId);
            const adminSnap = await getDoc(adminRef);
            
            if (adminSnap.exists()) {
                const data = adminSnap.data();
                this.currentUser = new User(userId, {
                    ...data,
                    idAuth: userId,
                    cargo: 'administrador'
                });
                console.log('Usuario actual es administrador:', this.currentUser.nombreCompleto);
                return this.currentUser;
            }
            
            // Si no es admin, buscar en colaboradores
            const colabRef = doc(db, "colaboradores", userId);
            const colabSnap = await getDoc(colabRef);
            
            if (colabSnap.exists()) {
                const data = colabSnap.data();
                this.currentUser = new User(userId, {
                    ...data,
                    idAuth: userId,
                    cargo: 'colaborador'
                });
                console.log('Usuario actual es colaborador:', this.currentUser.nombreCompleto);
                return this.currentUser;
            }
            
            console.log('Usuario no encontrado en ninguna colección');
            return null;
            
        } catch (error) {
            console.error("Error cargando usuario actual:", error);
            return null;
        }
    }

    // Método para generar token aleatorio
    _generarToken() {
        // Generar token de 6 dígitos
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Método para enviar correo con token (simulado)
    async _enviarTokenPorCorreo(correo, nombre, token, tipoUsuario = 'administrador') {
        try {
            console.log(`📧 Enviando token de verificación a: ${correo}`);
            console.log(`🔑 Token: ${token}`);
            console.log(`👤 Nombre: ${nombre}`);
            console.log(`🎯 Tipo de usuario: ${tipoUsuario}`);
            
            // Aquí iría la lógica real para enviar correo
            // Por ejemplo, usando EmailJS, SendGrid, AWS SES, etc.
            
            // Simulación de envío de correo
            const contenidoCorreo = {
                to: correo,
                subject: `Verificación de cuenta - Sistema Centinela`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0a2540;">¡Bienvenido a Sistema Centinela!</h2>
                        <p>Hola <strong>${nombre}</strong>,</p>
                        
                        <p>Tu cuenta ha sido creada exitosamente como <strong>${tipoUsuario === 'administrador' ? 'Administrador' : 'Colaborador'}</strong>.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <h3 style="color: #0a2540; margin: 0 0 15px 0;">Tu código de verificación:</h3>
                            <div style="font-size: 32px; font-weight: bold; color: #0a2540; letter-spacing: 5px; padding: 15px; background: white; border-radius: 5px; display: inline-block;">
                                ${token}
                            </div>
                            <p style="color: #666; margin-top: 10px; font-size: 14px;">
                                Este token expira en 24 horas
                            </p>
                        </div>
                        
                        <p>Por favor, ingresa este código en la aplicación para completar la verificación de tu cuenta.</p>
                        
                        <p>Si no solicitaste este registro, por favor ignora este correo.</p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 12px;">
                            Este es un correo automático, por favor no responder.<br>
                            Sistema Centinela &copy; ${new Date().getFullYear()}
                        </p>
                    </div>
                `
            };
            
            console.log('📨 Contenido del correo simulado:', contenidoCorreo);
            
            // En un entorno real, aquí enviarías el correo
            // await enviarCorreoReal(contenidoCorreo);
            
            return { 
                success: true, 
                message: 'Token enviado por correo (simulación)',
                token: token,
                destinatario: correo
            };
            
        } catch (error) {
            console.error('Error enviando correo:', error);
            return { 
                success: false, 
                message: 'Error enviando correo: ' + error.message
            };
        }
    }

    async createAdministrador(adminData, password) {
        try {
            console.log('Creando nuevo administrador:', adminData.correoElectronico);
            
            // Verificar si ya existe un administrador
            const adminsSnapshot = await getDocs(collection(db, "administradores"));
            if (!adminsSnapshot.empty) {
                throw new Error('Ya existe un administrador registrado. Solo puede haber uno por organización.');
            }
            
            // 1. Generar token de verificación
            const token = this._generarToken();
            
            // 2. Crear usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                adminData.correoElectronico, 
                password
            );
            const uid = userCredential.user.uid;
            console.log(`Usuario Auth creado con UID: ${uid}`);
            
            // 3. Actualizar display name en Auth
            await updateProfile(userCredential.user, {
                displayName: adminData.nombreCompleto
            });
            
            // 4. Crear documento en colección administradores
            const adminRef = doc(db, "administradores", uid);
            
            const adminFirestoreData = {
                ...adminData,
                idAuth: uid,
                cargo: 'administrador',
                esSuperAdmin: true,
                plan: adminData.plan || 'gratis',
                tokenVerificacion: token,
                verificado: false,
                fechaToken: serverTimestamp(),
                status: true,
                eliminado: false,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                ultimoLogin: null
            };
            
            console.log('Guardando administrador en Firestore:', adminFirestoreData);
            await setDoc(adminRef, adminFirestoreData);
            
            // 5. Enviar token por correo
            const resultadoCorreo = await this._enviarTokenPorCorreo(
                adminData.correoElectronico,
                adminData.nombreCompleto,
                token,
                'administrador'
            );
            
            console.log('Resultado envío correo:', resultadoCorreo);
            
            // 6. Agregar a lista local
            const newAdmin = new User(uid, {
                ...adminFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                fechaToken: new Date()
            });
            this.users.unshift(newAdmin);
            
            return { 
                id: uid, 
                user: newAdmin,
                credential: userCredential,
                token: token,
                correoEnviado: resultadoCorreo.success
            };
            
        } catch (error) {
            console.error("Error creando administrador:", error);
            
            // Si hubo error, revertir el usuario creado en Auth si existe
            if (auth.currentUser) {
                try {
                    await auth.currentUser.delete();
                    console.log('Usuario Auth eliminado por error en registro');
                } catch (deleteError) {
                    console.error('Error eliminando usuario Auth:', deleteError);
                }
            }
            
            throw error;
        }
    }

    async createColaborador(colaboradorData, password, idAdministrador) {
        try {
            console.log('Creando nuevo colaborador para administrador:', idAdministrador);
            
            // Verificar que el administrador exista
            const adminRef = doc(db, "administradores", idAdministrador);
            const adminSnap = await getDoc(adminRef);
            
            if (!adminSnap.exists()) {
                throw new Error('Administrador no encontrado');
            }
            
            const adminData = adminSnap.data();
            
            // Verificar límites del plan
            const totalUsuarios = await this.contarUsuariosPorOrganizacion(adminData.organizacionCamelCase);
            const adminUser = new User(idAdministrador, adminData);
            
            if (!adminUser.puedeCrearMasUsuarios(totalUsuarios + 1)) {
                throw new Error(`Límite de usuarios alcanzado para el plan ${adminUser.plan}. Máximo: ${adminUser.tieneLimiteUsuarios()} usuarios.`);
            }
            
            // Verificar que el correo no exista
            const emailExists = await this.verificarCorreoExistente(colaboradorData.correoElectronico);
            if (emailExists) {
                throw new Error('El correo electrónico ya está registrado');
            }
            
            // 1. Generar token de verificación
            const token = this._generarToken();
            
            // 2. Crear usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                colaboradorData.correoElectronico, 
                password
            );
            const uid = userCredential.user.uid;
            console.log(`Colaborador Auth creado con UID: ${uid}`);
            
            // 3. Actualizar display name en Auth
            await updateProfile(userCredential.user, {
                displayName: colaboradorData.nombreCompleto
            });
            
            // 4. Crear documento en colección colaboradores
            const colabRef = doc(db, "colaboradores", uid);
            
            const colabFirestoreData = {
                ...colaboradorData,
                idAuth: uid,
                cargo: 'colaborador',
                idAdministrador: idAdministrador,
                organizacion: adminData.organizacion,
                organizacionCamelCase: adminData.organizacionCamelCase,
                fotoOrganizacion: adminData.fotoOrganizacion,
                theme: adminData.theme || 'light',
                plan: adminData.plan || 'gratis',
                tokenVerificacion: token,
                verificado: false,
                fechaToken: serverTimestamp(),
                permisosPersonalizados: {
                    leerPerfil: true,
                    leerOrganizacion: true,
                    actualizarPerfil: false,
                    crearContenido: false,
                    eliminarContenido: false
                },
                status: true,
                eliminado: false,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                ultimoLogin: null
            };
            
            console.log('Guardando colaborador en Firestore:', colabFirestoreData);
            await setDoc(colabRef, colabFirestoreData);
            
            // 5. Enviar token por correo
            const resultadoCorreo = await this._enviarTokenPorCorreo(
                colaboradorData.correoElectronico,
                colaboradorData.nombreCompleto,
                token,
                'colaborador'
            );
            
            console.log('Resultado envío correo:', resultadoCorreo);
            
            // 6. Agregar a lista local
            const newColab = new User(uid, {
                ...colabFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                fechaToken: new Date()
            });
            this.users.unshift(newColab);
            
            return { 
                id: uid, 
                user: newColab,
                credential: userCredential,
                token: token,
                correoEnviado: resultadoCorreo.success
            };
            
        } catch (error) {
            console.error("Error creando colaborador:", error);
            
            // Si hubo error, revertir el usuario creado en Auth si existe
            if (auth.currentUser) {
                try {
                    await auth.currentUser.delete();
                    console.log('Usuario Auth eliminado por error en registro');
                } catch (deleteError) {
                    console.error('Error eliminando usuario Auth:', deleteError);
                }
            }
            
            throw error;
        }
    }

    // Método para reenviar token de verificación
    async reenviarTokenVerificacion(userId, userType) {
        try {
            console.log(`Reenviando token de verificación para usuario: ${userId}`);
            
            const collectionName = userType === 'administrador' ? 'administradores' : 'colaboradores';
            const userRef = doc(db, collectionName, userId);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                throw new Error('Usuario no encontrado');
            }
            
            const userData = userSnap.data();
            
            // Generar nuevo token
            const nuevoToken = this._generarToken();
            
            // Actualizar en Firestore
            await updateDoc(userRef, {
                tokenVerificacion: nuevoToken,
                fechaToken: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            });
            
            // Enviar correo con nuevo token
            const resultadoCorreo = await this._enviarTokenPorCorreo(
                userData.correoElectronico,
                userData.nombreCompleto,
                nuevoToken,
                userType
            );
            
            // Actualizar en lista local
            const index = this.users.findIndex(user => user.id === userId);
            if (index !== -1) {
                this.users[index].tokenVerificacion = nuevoToken;
                this.users[index].fechaToken = new Date();
            }
            
            return {
                success: true,
                message: 'Token reenviado exitosamente',
                token: nuevoToken,
                correoEnviado: resultadoCorreo.success
            };
            
        } catch (error) {
            console.error('Error reenviando token:', error);
            throw error;
        }
    }

    // Método para verificar token
    async verificarToken(userId, token, userType) {
        try {
            console.log(`Verificando token para usuario: ${userId}`);
            
            const collectionName = userType === 'administrador' ? 'administradores' : 'colaboradores';
            const userRef = doc(db, collectionName, userId);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                throw new Error('Usuario no encontrado');
            }
            
            const userData = userSnap.data();
            
            // Crear instancia de usuario para validar token
            const usuario = new User(userId, userData);
            
            // Validar token
            const esValido = usuario.validarToken(token);
            
            if (!esValido) {
                return {
                    success: false,
                    message: 'Token inválido o expirado'
                };
            }
            
            // Actualizar usuario como verificado
            await updateDoc(userRef, {
                verificado: true,
                tokenVerificacion: null, // Limpiar token después de verificar
                fechaToken: null,
                fechaActualizacion: serverTimestamp()
            });
            
            // Actualizar en lista local
            const index = this.users.findIndex(user => user.id === userId);
            if (index !== -1) {
                this.users[index].verificado = true;
                this.users[index].tokenVerificacion = null;
                this.users[index].fechaToken = null;
            }
            
            return {
                success: true,
                message: 'Cuenta verificada exitosamente'
            };
            
        } catch (error) {
            console.error('Error verificando token:', error);
            throw error;
        }
    }

    async updateUser(id, data, userType) {
        try {
            console.log(`Actualizando usuario ${id} de tipo ${userType}:`, data);
            
            const collectionName = userType === 'administrador' ? 'administradores' : 'colaboradores';
            const docRef = doc(db, collectionName, id);
            
            // Preparar datos de actualización
            const updateData = {
                fechaActualizacion: serverTimestamp()
            };
            
            // Campos permitidos para actualización
            const allowedFields = [
                'nombreCompleto',
                'fotoUsuario',
                'status',
                'eliminado',
                'theme',
                'plan',
                'verificado',
                'tokenVerificacion',
                'fechaToken'
            ];
            
            // Solo administradores pueden actualizar permisos de colaboradores
            if (userType === 'colaborador' && this.esAdministrador()) {
                allowedFields.push('permisosPersonalizados');
            }
            
            // Agregar solo campos permitidos
            Object.keys(data).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = data[key];
                }
            });
            
            console.log('Datos de actualización para Firestore:', updateData);
            await updateDoc(docRef, updateData);
            
            // Actualizar en lista local
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                Object.keys(updateData).forEach(key => {
                    if (key !== 'fechaActualizacion') {
                        this.users[index][key] = updateData[key];
                    }
                });
                this.users[index].fechaActualizacion = new Date();
            }
            
            return true;
            
        } catch (error) {
            console.error("Error actualizando usuario:", error);
            throw error;
        }
    }

    // Resto de métodos permanecen igual...
    async deleteUser(id, userType, permanent = false) {
        try {
            console.log(`${permanent ? 'Eliminando permanentemente' : 'Eliminando'} usuario ${id} de tipo ${userType}`);
            
            const collectionName = userType === 'administrador' ? 'administradores' : 'colaboradores';
            
            if (permanent) {
                // Eliminar permanentemente de Firestore
                await deleteDoc(doc(db, collectionName, id));
                console.log(`Usuario ${id} eliminado permanentemente de Firestore`);
            } else {
                // Eliminación lógica
                await updateDoc(doc(db, collectionName, id), {
                    eliminado: true,
                    status: false,
                    fechaActualizacion: serverTimestamp()
                });
                console.log(`Usuario ${id} marcado como eliminado`);
            }
            
            // Remover de lista local
            this.users = this.users.filter(user => user.id !== id);
            
            return true;
            
        } catch (error) {
            console.error("Error eliminando usuario:", error);
            throw error;
        }
    }

    async iniciarSesion(email, password) {
        try {
            console.log('Iniciando sesión para:', email);
            
            // 1. Autenticar en Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            
            // 2. Obtener datos del usuario
            const user = await this.getUserById(uid);
            
            if (!user) {
                await signOut(auth);
                throw new Error('Usuario no encontrado en la base de datos');
            }
            
            // 3. Verificar que esté activo
            if (!user.estaActivo()) {
                await signOut(auth);
                throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
            }
            
            // 4. Verificar que esté verificado (opcional, puedes decidir si es obligatorio)
            if (!user.estaVerificado()) {
                console.warn('Usuario no verificado iniciando sesión:', user.nombreCompleto);
                // Puedes decidir si permitir login sin verificación o no
                // throw new Error('Tu cuenta no ha sido verificada. Revisa tu correo electrónico.');
            }
            
            // 5. Actualizar último login
            const collectionName = user.cargo === 'administrador' ? 'administradores' : 'colaboradores';
            const userRef = doc(db, collectionName, uid);
            
            await updateDoc(userRef, {
                ultimoLogin: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            });
            
            // 6. Cargar usuario actual
            await this.loadCurrentUser(uid);
            
            // 7. Guardar datos en localStorage
            try {
                localStorage.setItem('theme', user.theme);
                localStorage.setItem('user-plan', user.plan);
                localStorage.setItem('user-verified', user.verificado.toString());
            } catch (e) {
                console.warn('No se pudo guardar datos en localStorage');
            }
            
            console.log('Sesión iniciada exitosamente:', user.nombreCompleto);
            return user;
            
        } catch (error) {
            console.error("Error iniciando sesión:", error);
            throw error;
        }
    }

    async cerrarSesion() {
        try {
            await signOut(auth);
            this.currentUser = null;
            console.log('Sesión cerrada exitosamente');
        } catch (error) {
            console.error("Error cerrando sesión:", error);
            throw error;
        }
    }

    async reestablecerContraseña(email) {
        try {
            console.log('Reestableciendo contraseña para:', email);
            await sendPasswordResetEmail(auth, email);
            console.log('Correo de reestablecimiento enviado');
            return { success: true, message: 'Correo de reestablecimiento enviado' };
        } catch (error) {
            console.error("Error reestableciendo contraseña:", error);
            throw error;
        }
    }

    async cambiarTheme(nuevoTheme) {
        try {
            if (!this.currentUser) {
                throw new Error('No autenticado');
            }
            
            console.log(`Cambiando tema a: ${nuevoTheme} para usuario ${this.currentUser.id}`);
            
            // Solo administradores pueden cambiar el tema
            if (this.currentUser.cargo !== 'administrador') {
                throw new Error('Solo administradores pueden cambiar el tema');
            }
            
            // Actualizar tema del administrador
            await this.updateUser(
                this.currentUser.id,
                { theme: nuevoTheme },
                'administrador'
            );
            
            // Actualizar tema de todos los colaboradores de la organización
            const colaboradores = this.users.filter(user => 
                user.cargo === 'colaborador' && 
                user.organizacionCamelCase === this.currentUser.organizacionCamelCase
            );
            
            const updatePromises = colaboradores.map(async (colab) => {
                await updateDoc(doc(db, "colaboradores", colab.id), {
                    theme: nuevoTheme,
                    fechaActualizacion: serverTimestamp()
                });
            });
            
            await Promise.all(updatePromises);
            
            // Guardar en localStorage
            try {
                localStorage.setItem('theme', nuevoTheme);
            } catch (e) {
                console.warn('No se pudo guardar el tema en localStorage');
            }
            
            console.log('Tema cambiado exitosamente');
            return true;
            
        } catch (error) {
            console.error("Error cambiando tema:", error);
            throw error;
        }
    }

    async actualizarPlan(nuevoPlan) {
        try {
            if (!this.currentUser) {
                throw new Error('No autenticado');
            }
            
            console.log(`Actualizando plan a: ${nuevoPlan} para usuario ${this.currentUser.id}`);
            
            // Solo administradores pueden cambiar el plan
            if (this.currentUser.cargo !== 'administrador') {
                throw new Error('Solo administradores pueden cambiar el plan');
            }
            
            // Validar que el plan sea válido
            const planesValidos = ['gratis', 'basico', 'premium', 'empresa'];
            if (!planesValidos.includes(nuevoPlan)) {
                throw new Error(`Plan no válido. Los planes válidos son: ${planesValidos.join(', ')}`);
            }
            
            // Actualizar plan del administrador
            await this.updateUser(
                this.currentUser.id,
                { plan: nuevoPlan },
                'administrador'
            );
            
            // Actualizar plan de todos los colaboradores de la organización
            const colaboradores = this.users.filter(user => 
                user.cargo === 'colaborador' && 
                user.organizacionCamelCase === this.currentUser.organizacionCamelCase
            );
            
            const updatePromises = colaboradores.map(async (colab) => {
                await updateDoc(doc(db, "colaboradores", colab.id), {
                    plan: nuevoPlan,
                    fechaActualizacion: serverTimestamp()
                });
            });
            
            await Promise.all(updatePromises);
            
            console.log('Plan actualizado exitosamente');
            return true;
            
        } catch (error) {
            console.error("Error actualizando plan:", error);
            throw error;
        }
    }

    async verificarCorreoExistente(correo) {
        try {
            // Buscar en administradores
            const qAdmins = query(
                collection(db, "administradores"),
                where("correoElectronico", "==", correo)
            );
            const adminsSnapshot = await getDocs(qAdmins);
            
            if (!adminsSnapshot.empty) {
                return true;
            }
            
            // Buscar en colaboradores
            const qColaboradores = query(
                collection(db, "colaboradores"),
                where("correoElectronico", "==", correo)
            );
            const colaboradoresSnapshot = await getDocs(qColaboradores);
            
            return !colaboradoresSnapshot.empty;
            
        } catch (error) {
            console.error("Error verificando correo:", error);
            return false;
        }
    }

    async contarUsuariosPorOrganizacion(organizacionCamelCase) {
        try {
            let total = 0;
            
            // Contar administradores de la organización
            const adminQuery = query(
                collection(db, "administradores"),
                where("organizacionCamelCase", "==", organizacionCamelCase),
                where("eliminado", "==", false)
            );
            const adminSnapshot = await getDocs(adminQuery);
            total += adminSnapshot.size;
            
            // Contar colaboradores de la organización
            const colabQuery = query(
                collection(db, "colaboradores"),
                where("organizacionCamelCase", "==", organizacionCamelCase),
                where("eliminado", "==", false)
            );
            const colabSnapshot = await getDocs(colabQuery);
            total += colabSnapshot.size;
            
            console.log(`Total usuarios activos para ${organizacionCamelCase}: ${total}`);
            return total;
            
        } catch (error) {
            console.error("Error contando usuarios por organización:", error);
            return 0;
        }
    }

    getUserById(id) {
        return this.users.find(user => user.id === id);
    }

    getUserByEmail(email) {
        return this.users.find(user => user.correoElectronico === email);
    }

    getUsersByCargo(cargo) {
        return this.users.filter(user => user.cargo === cargo);
    }

    getUsersByOrganization(organizacionCamelCase) {
        return this.users.filter(user => user.organizacionCamelCase === organizacionCamelCase);
    }

    getTotalUsers() {
        return this.users.length;
    }

    getActiveUsers() {
        return this.users.filter(user => user.estaActivo()).length;
    }

    getVerifiedUsers() {
        return this.users.filter(user => user.estaVerificado()).length;
    }

    getUnverifiedUsers() {
        return this.users.filter(user => !user.estaVerificado()).length;
    }

    getAdministradores() {
        return this.users.filter(user => user.cargo === 'administrador');
    }

    getColaboradores() {
        return this.users.filter(user => user.cargo === 'colaborador');
    }

    esAdministrador() {
        return this.currentUser && this.currentUser.cargo === 'administrador';
    }

    esSuperAdmin() {
        return this.currentUser && this.currentUser.cargo === 'administrador' && this.currentUser.esSuperAdmin;
    }

    estaVerificado() {
        return this.currentUser && this.currentUser.estaVerificado();
    }

    tienePermiso(permiso) {
        if (!this.currentUser) return false;
        
        if (this.currentUser.cargo === 'administrador') {
            return true; // Los administradores tienen todos los permisos
        }
        
        // Para colaboradores, verificar permisos personalizados
        return this.currentUser.permisosPersonalizados[permiso] === true;
    }

    searchUsers(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.users.filter(user => 
            (user.correoElectronico && user.correoElectronico.toLowerCase().includes(term)) ||
            (user.nombreCompleto && user.nombreCompleto.toLowerCase().includes(term)) ||
            (user.organizacion && user.organizacion.toLowerCase().includes(term)) ||
            (user.cargo && user.cargo.toLowerCase().includes(term)) ||
            (user.plan && user.plan.toLowerCase().includes(term))
        );
    }
}

// Exportar las clases
export { User, UserManager };