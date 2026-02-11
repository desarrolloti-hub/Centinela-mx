// ==================== IMPORTS ====================
// Importar configuración de Firebase y servicios necesarios
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
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    applyActionCode,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ==================== CLASE USER ====================
// Clase que representa a un usuario en el sistema
class User {
    constructor(id, data) {
        // ID único del usuario (UID de Firebase Auth)
        this.id = id;
        
        // Datos de la organización
        this.organizacion = data.organizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        
        // Datos personales del usuario
        this.nombreCompleto = data.nombreCompleto || '';
        this.correoElectronico = data.correoElectronico || '';
        this.status = data.status !== undefined ? data.status : true;
        this.idAuth = data.idAuth || '';
        this.fotoUsuario = data.fotoUsuario || data.fotoURL || data.foto || '';
this.fotoOrganizacion = data.fotoOrganizacion || data.logoOrganizacion || data.logo || '';
        
        // Fechas y timestamps
        this.fechaActualizacion = data.fechaActualizacion || new Date();
        this.fechaCreacion = data.fechaCreacion || new Date();
        this.ultimoLogin = data.ultimoLogin || null;
        
        // Configuraciones y preferencias
        this.theme = data.theme || this._obtenerThemeDelLocalStorage() || 'predeterminado';
        this.cargo = data.cargo || 'colaborador'; // 'administrador' o 'colaborador'
        
        // Permisos y plan
        this.permisosPersonalizados = data.permisosPersonalizados || {};
        this.plan = data.plan || 'gratis'; // 'gratis', 'basico', 'premium', 'empresa'
        
        // Estado de verificación de email
        this.verificado = data.verificado || false;
        this.emailVerified = data.emailVerified || false; // Estado de verificación de email en Auth
        
        // Información de creación
        this.creadoPor = data.creadoPor || '';
        
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

    // ========== MÉTODOS DE UTILIDAD ==========
    
    /**
     * Obtiene el tema guardado en localStorage como respaldo
     * @returns {string} El ID del tema o 'default' si no existe
     */
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

    /**
     * Obtiene la URL de la foto de perfil del usuario
     * Maneja diferentes formatos: data URL, URL externa, base64
     * @returns {string} URL de la imagen
     */
    getFotoUrl() {
        // Si no hay foto, retorna placeholder
        if (!this.fotoUsuario || this.fotoUsuario.trim() === '') {
            return 'https://via.placeholder.com/150/0a2540/ffffff?text=No+Photo';
        }
        
        // Si ya es una data URL (data:image/...), retornarla directamente
        if (this.fotoUsuario.startsWith('data:image')) {
            return this.fotoUsuario;
        }
        
        // Si es una URL externa (http://...), retornarla
        if (this.fotoUsuario.startsWith('http')) {
            return this.fotoUsuario;
        }
        
        // Si es base64 sin prefijo, construir data URL
        if (this.fotoUsuario.length > 100 && !this.fotoUsuario.includes('://')) {
            let mimeType = 'image/png';
            // Detectar tipo de imagen por el prefijo base64
            if (this.fotoUsuario.startsWith('/9j/') || this.fotoUsuario.startsWith('iVBORw')) {
                mimeType = 'image/jpeg';
            } else if (this.fotoUsuario.startsWith('R0lGOD')) {
                mimeType = 'image/gif';
            }
            
            return `data:${mimeType};base64,${this.fotoUsuario}`;
        }
        
        // Fallback a placeholder si el formato no es reconocido
        return 'https://via.placeholder.com/150/0a2540/ffffff?text=Invalid+Photo';
    }

    // ========== MÉTODOS DE ESTADO ==========
    
    /**
     * Verifica si el usuario está activo
     * @returns {boolean} True si está activo
     */
    estaActivo() {
        return this.status;
    }

    /**
     * Verifica si el usuario está verificado
     * @returns {boolean} True si está verificado en el sistema y en Auth
     */
    estaVerificado() {
        return this.verificado && this.emailVerified;
    }

    /**
     * Verifica si el usuario está inactivo
     * @returns {boolean} True si está inactivo
     */
    estaInactivo() {
        return !this.status;
    }

    /**
     * Obtiene el texto del estado del usuario
     * @returns {string} Texto descriptivo del estado
     */
    getEstadoTexto() {
        if (!this.status) {
            return 'Inactivo';
        } else {
            return 'Activo';
        }
    }

    /**
     * Genera un badge HTML para mostrar el estado del usuario
     * @returns {string} HTML del badge de estado
     */
    getEstadoBadge() {
        if (this.estaActivo()) {
            return `<span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-check-circle"></i> Activo
            </span>`;
        } else {
            return `<span style="background: #ffc107; color: black; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-pause-circle"></i> Inactivo
            </span>`;
        }
    }

    // ========== MÉTODOS DE PLAN ==========
    
    /**
     * Obtiene el límite de usuarios según el plan
     * @returns {number} Número máximo de usuarios permitidos
     */
    tieneLimiteUsuarios() {
        const limites = {
            'gratis': 100,
            'basico': 200,
            'premium': 300,
            'empresa': 999 // Ilimitado para empresas
        };
        return limites[this.plan] || 100; // Por defecto 100 (plan gratis)
    }

    /**
     * Verifica si puede crear más usuarios según el plan
     * @param {number} totalUsuarios - Número actual de usuarios activos
     * @returns {boolean} True si puede crear más usuarios
     */
    puedeCrearMasUsuarios(totalUsuarios) {
        // Plan empresa no tiene límites
        if (this.plan === 'empresa') return true;
        
        // Para otros planes, verificar límite
        return totalUsuarios < this.tieneLimiteUsuarios();
    }
}

// ==================== FUNCIONES GLOBALES ====================
// Handlers globales para manejo de imágenes (definidos en window)

/**
 * Maneja errores al cargar imágenes de usuario
 * @param {HTMLImageElement} imgElement - Elemento de imagen que falló
 * @param {string} userId - ID del usuario
 */
window.handleUserImageError = function(imgElement, userId) {
    console.error(`Image failed to load for user ${userId}`);
    // Reemplazar con placeholder
    imgElement.src = 'https://via.placeholder.com/150/0a2540/ffffff?text=No+Photo';
};

/**
 * Maneja carga exitosa de imágenes de usuario
 * @param {HTMLImageElement} imgElement - Elemento de imagen cargado
 * @param {string} userId - ID del usuario
 */
window.handleUserImageLoad = function(imgElement, userId) {
    console.log(`Image loaded successfully for user ${userId}`);
};

// ==================== CLASE USERMANAGER ====================
// Clase principal para gestionar usuarios en el sistema
class UserManager {
    constructor() {
        // Array para almacenar usuarios en memoria
        this.users = [];
        
        // Usuario actualmente autenticado
        this.currentUser = null;
        
        console.log('UserManager inicializado');
        
        // Escuchar cambios en el estado de autenticación
        // Esto se ejecuta automáticamente cuando un usuario inicia/cierra sesión
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Cargar datos del usuario cuando se autentica
                await this.loadCurrentUser(user.uid);
            } else {
                // Limpiar usuario actual cuando cierra sesión
                this.currentUser = null;
            }
        });
    }

    // ========== MÉTODOS DE CARGA Y BÚSQUEDA ==========
    
    /**
     * Carga el usuario actualmente autenticado
     * @param {string} userId - UID del usuario de Firebase Auth
     * @returns {Promise<User|null>} Instancia del usuario o null si no se encuentra
     */
    async loadCurrentUser(userId) {
        try {
            console.log('Cargando usuario actual:', userId);
            
            // ===== PRIMERO: Buscar en administradores =====
            const adminRef = doc(db, "administradores", userId);
            const adminSnap = await getDoc(adminRef);
            
            // CAMBIA TODO EL BLOQUE DE ADMINISTRADOR por esto:
            if (adminSnap.exists()) {
                console.log('✅ Encontrado en administradores');
                const data = adminSnap.data();

                // ✅ CORREGIDO: Incluir TODOS los campos incluyendo fotos
                const user = new User(id, {
                    ...data,
                    idAuth: id,
                    cargo: 'administrador',
                    // Asegurar que las fotos se pasen explícitamente
                    fotoUsuario: data.fotoUsuario || data.fotoURL || data.foto || null,
                    fotoOrganizacion: data.fotoOrganizacion || data.logoOrganizacion || data.logo || null,
                    email: data.correoElectronico || data.email
                });

                // Agregar a memoria para próximas búsquedas
                this.users.push(user);
                return user;
            }
            
            // ===== SEGUNDO: Buscar en colaboradores =====
            // Obtener todas las organizaciones registradas
            const todasLasOrganizaciones = await this.getTodasLasOrganizaciones();
            
            // Buscar en cada colección de colaboradores de cada organización
            for (const organizacion of todasLasOrganizaciones) {
                const coleccionColaboradores = `colaboradores_${organizacion.camelCase}`;
                const colabQuery = query(
                    collection(db, coleccionColaboradores),
                    where("idAuth", "==", userId)
                );
                const colabSnapshot = await getDocs(colabQuery);
                
                if (!colabSnapshot.empty) {
                    const docSnap = colabSnapshot.docs[0];
                    const data = docSnap.data();
                    
                    // Si el colaborador está inactivo, cerrar sesión
                    if (!data.status) {
                        await signOut(auth);
                        throw new Error('Tu cuenta está inactiva. Contacta al administrador de tu organización.');
                    }
                    
                    // Crear instancia de usuario colaborador
                    this.currentUser = new User(userId, {
                        ...data,
                        idAuth: userId,
                        cargo: 'colaborador',
                        emailVerified: auth.currentUser?.emailVerified || false
                    });
                    console.log('Usuario actual es colaborador de:', data.organizacion);
                    return this.currentUser;
                }
            }
            
            // Si no se encuentra en ninguna colección
            console.log('Usuario no encontrado en ninguna colección');
            return null;
            
        } catch (error) {
            console.error("Error cargando usuario actual:", error);
            throw error;
        }
    }

    /**
     * Obtiene todas las organizaciones registradas en el sistema
     * @returns {Promise<Array>} Array de objetos con datos de organizaciones
     */
    async getTodasLasOrganizaciones() {
        try {
            // Obtener todos los documentos de la colección administradores
            const adminsSnapshot = await getDocs(collection(db, "administradores"));
            const organizaciones = [];
            
            // Procesar cada administrador para extraer datos de su organización
            adminsSnapshot.forEach(doc => {
                const data = doc.data();
                organizaciones.push({
                    id: doc.id, // ID del administrador
                    nombre: data.organizacion, // Nombre legible de la organización
                    camelCase: data.organizacionCamelCase, // Nombre en camelCase para colecciones
                    status: data.status || true // Estado de actividad
                });
            });
            
            return organizaciones;
        } catch (error) {
            console.error("Error obteniendo organizaciones:", error);
            return [];
        }
    }

    // ========== MÉTODOS DE CREACIÓN DE USUARIOS ==========
    
    /**
     * Crea un nuevo administrador en el sistema
     * @param {Object} adminData - Datos del administrador
     * @param {string} password - Contraseña para la cuenta
     * @returns {Promise<Object>} Objeto con resultado del registro
     */
    async createAdministrador(adminData, password) {
        try {
            console.log('Creando nuevo administrador:', adminData.correoElectronico);
            
            // ===== PASO 1: Verificar si el correo ya existe =====
            const emailExistsAdmin = await this.verificarCorreoExistente(adminData.correoElectronico, 'administrador');
            if (emailExistsAdmin) {
                throw new Error('El correo electrónico ya está registrado como administrador');
            }
            
            // ===== PASO 2: Crear usuario en Firebase Authentication =====
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                adminData.correoElectronico, 
                password
            );
            const uid = userCredential.user.uid;
            console.log(`Usuario Auth creado con UID: ${uid}`);
            
            // ===== PASO 3: Enviar correo de verificación de Firebase =====
            try {
                await sendEmailVerification(userCredential.user, {
                    url: window.location.origin + '/verifyEmail.html',
                    handleCodeInApp: true
                });
                console.log('✅ Correo de verificación enviado');
            } catch (emailError) {
                console.warn('⚠️ Error enviando verificación de email:', emailError);
            }
            
            // ===== PASO 4: Actualizar display name en Auth =====
            await updateProfile(userCredential.user, {
                displayName: adminData.nombreCompleto
            });
            
            // ===== PASO 5: Crear documento en colección administradores =====
            const adminRef = doc(db, "administradores", uid);
            
            const adminFirestoreData = {
                ...adminData,
                idAuth: uid,
                cargo: 'administrador',
                plan: adminData.plan || 'gratis',
                verificado: false, // Hasta que verifique el email
                emailVerified: false,
                status: true,
                creadoPor: uid, // Se crea a sí mismo
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                ultimoLogin: null
            };
            
            console.log('Guardando administrador en Firestore:', adminFirestoreData);
            await setDoc(adminRef, adminFirestoreData);
            
            // ===== PASO 6: Agregar a lista local en memoria =====
            const newAdmin = new User(uid, {
                ...adminFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            this.users.unshift(newAdmin); // Agregar al principio del array
            
            // ===== PASO 7: Cerrar sesión para forzar verificación =====
            // Esto obliga al usuario a verificar su email antes de poder iniciar sesión
            await signOut(auth);
            
            return { 
                id: uid, 
                user: newAdmin,
                credential: userCredential,
                emailVerificationSent: true
            };
            
        } catch (error) {
            console.error("❌ Error creando administrador:", error);
            
            // ===== REVERTIR CAMBIOS EN CASO DE ERROR =====
            // Si hubo error después de crear el usuario en Auth, eliminarlo
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

    /**
     * Crea un nuevo colaborador para una organización
     * @param {Object} colaboradorData - Datos del colaborador
     * @param {string} password - Contraseña para la cuenta
     * @param {string} idAdministrador - ID del administrador que crea el colaborador
     * @returns {Promise<Object>} Objeto con resultado del registro
     */
    async createColaborador(colaboradorData, password, idAdministrador) {
        // GUARDAR SESIÓN ACTUAL DEL ADMINISTRADOR ANTES DE CREAR COLABORADOR
        const adminEmail = auth.currentUser?.email;
        const adminPassword = password; // IMPORTANTE: Necesitas obtener la contraseña del admin de alguna forma
        
        try {
            console.log('Creando nuevo colaborador para administrador:', idAdministrador);
            
            // ===== PASO 1: Verificar que el administrador exista =====
            const adminRef = doc(db, "administradores", idAdministrador);
            const adminSnap = await getDoc(adminRef);
            
            if (!adminSnap.exists()) {
                throw new Error('Administrador no encontrado');
            }
            
            const adminData = adminSnap.data();
            
            // ===== PASO 2: Verificar que el administrador esté activo =====
            if (!adminData.status) {
                throw new Error('El administrador está inactivo');
            }
            
            // ===== PASO 3: Verificar límites del plan =====
            const totalUsuariosActivos = await this.contarUsuariosActivosPorOrganizacion(adminData.organizacionCamelCase);
            const adminUser = new User(idAdministrador, adminData);
            
            if (!adminUser.puedeCrearMasUsuarios(totalUsuariosActivos + 1)) {
                throw new Error(`Límite de usuarios alcanzado para el plan ${adminUser.plan}. Máximo: ${adminUser.tieneLimiteUsuarios()} usuarios activos.`);
            }
            
            // ===== PASO 4: Verificar que el correo no exista en la organización =====
            const emailExistsOrg = await this.verificarCorreoEnOrganizacion(
                colaboradorData.correoElectronico, 
                adminData.organizacionCamelCase
            );
            if (emailExistsOrg) {
                throw new Error('El correo electrónico ya está registrado en esta organización');
            }
            
            // ===== PASO 5: Crear usuario en Firebase Authentication =====
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                colaboradorData.correoElectronico, 
                password
            );
            const uid = userCredential.user.uid;
            console.log(`Colaborador Auth creado con UID: ${uid}`);
            
            // ===== PASO 6: Enviar correo de verificación =====
            try {
                await sendEmailVerification(userCredential.user, {
                    url: window.location.origin + '/verifyEmail.html',
                    handleCodeInApp: true
                });
            } catch (emailError) {
                console.warn('Error enviando verificación:', emailError);
            }
            
            // ===== PASO 7: Actualizar display name en Auth =====
            await updateProfile(userCredential.user, {
                displayName: colaboradorData.nombreCompleto
            });
            
            // ===== PASO 8: Determinar nombre de colección específica =====
            const coleccionColaboradores = `colaboradores_${adminData.organizacionCamelCase}`;
            
            // ===== PASO 9: Crear documento en la colección específica =====
            const colabRef = doc(db, coleccionColaboradores, uid);
            
            const colabFirestoreData = {
                ...colaboradorData,
                idAuth: uid,
                cargo: 'colaborador',
                organizacion: adminData.organizacion,
                organizacionCamelCase: adminData.organizacionCamelCase,
                fotoOrganizacion: adminData.fotoOrganizacion || adminData.logoOrganizacion || null,
                fotoUsuario: colaboradorData.fotoUsuario || colaboradorData.fotoURL || null,
                theme: adminData.theme || 'light',
                plan: adminData.plan || 'gratis',
                verificado: false,
                emailVerified: false,
                permisosPersonalizados: {
                    leerPerfil: true,
                    leerOrganizacion: true,
                    actualizarPerfil: false,
                    crearContenido: false,
                    eliminarContenido: false
                },
                status: true,
                creadoPor: idAdministrador, // ID del administrador que lo creó
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                ultimoLogin: null
            };
            
            console.log(`Guardando colaborador en colección ${coleccionColaboradores}:`, colabFirestoreData);
            await setDoc(colabRef, colabFirestoreData);
            
            // ===== PASO 10: Agregar a lista local =====
            const newColab = new User(uid, {
                ...colabFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            this.users.unshift(newColab);
            
            // ===== PASO 11: IMPORTANTE - RESTAURAR SESIÓN DEL ADMINISTRADOR =====
            // 1. Cerrar sesión del nuevo colaborador
            await signOut(auth);
            
            // 2. Verificar si hay credenciales para restaurar al admin
            if (adminEmail && adminPassword) {
                try {
                    // Intentar restaurar sesión del admin
                    console.log('🔄 Restaurando sesión del administrador:', adminEmail);
                    const adminCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                    
                    // Recargar usuario actual (admin)
                    await this.loadCurrentUser(adminCredential.user.uid);
                    console.log('✅ Sesión del administrador restaurada correctamente');
                    
                } catch (restoreError) {
                    console.warn('⚠️ No se pudo restaurar sesión del administrador:', restoreError.message);
                    // Continuar sin restaurar - el usuario tendrá que iniciar sesión manualmente
                }
            } else {
                console.log('ℹ️ No hay credenciales del administrador para restaurar sesión');
            }
            
            return { 
                id: uid, 
                user: newColab,
                credential: userCredential,
                coleccion: coleccionColaboradores,
                emailVerificationSent: true,
                adminSessionRestored: true
            };
            
        } catch (error) {
            console.error("Error creando colaborador:", error);
            
            // Revertir usuario en Auth si hubo error
            if (auth.currentUser && auth.currentUser.uid !== idAdministrador) {
                try {
                    await deleteUser(auth.currentUser);
                    console.log('Usuario Auth (colaborador) eliminado por error en registro');
                } catch (deleteError) {
                    console.error('Error eliminando usuario Auth:', deleteError);
                }
            }
            
            throw error;
        }
    }

    // ========== MÉTODOS DE VERIFICACIÓN DE EMAIL ==========
    
    /**
     * Reenvía el correo de verificación al usuario actual
     * @returns {Promise<Object>} Resultado del reenvío
     */
    async reenviarVerificacionEmail() {
        try {
            if (!auth.currentUser) {
                throw new Error('Usuario no autenticado');
            }
            
            console.log('Reenviando verificación para:', auth.currentUser.email);
            
            await sendEmailVerification(auth.currentUser, {
                url: window.location.origin + '/verifyEmail.html',
                handleCodeInApp: true
            });
            
            return {
                success: true,
                message: 'Correo de verificación reenviado'
            };
            
        } catch (error) {
            console.error('Error reenviando verificación:', error);
            throw error;
        }
    }

    /**
     * Verifica un email usando el código de acción de Firebase
     * @param {string} actionCode - Código de verificación de Firebase
     * @returns {Promise<Object>} Resultado de la verificación
     */
    async verificarEmail(actionCode) {
        try {
            console.log('Verificando email con código de Firebase');
            
            // Aplicar el código de verificación en Firebase Auth
            await applyActionCode(auth, actionCode);
            
            // Si hay usuario autenticado, actualizar sus datos
            if (auth.currentUser) {
                await this.loadCurrentUser(auth.currentUser.uid);
                
                if (this.currentUser) {
                    // Actualizar en Firestore según el tipo de usuario
                    if (this.currentUser.cargo === 'administrador') {
                        await updateDoc(doc(db, "administradores", this.currentUser.id), {
                            verificado: true,
                            emailVerified: true,
                            fechaActualizacion: serverTimestamp()
                        });
                    } else {
                        // Para colaboradores, usar su colección específica
                        const coleccionColaboradores = `colaboradores_${this.currentUser.organizacionCamelCase}`;
                        await updateDoc(doc(db, coleccionColaboradores, this.currentUser.id), {
                            verificado: true,
                            emailVerified: true,
                            fechaActualizacion: serverTimestamp()
                        });
                    }
                }
            }
            
            return {
                success: true,
                message: 'Email verificado exitosamente'
            };
            
        } catch (error) {
            console.error('Error verificando email:', error);
            throw error;
        }
    }

    // ========== MÉTODOS DE GESTIÓN DE ESTADO ==========
    
    /**
     * Inactiva un usuario (cambia su estado a inactivo)
     * @param {string} id - ID del usuario
     * @param {string} userType - Tipo de usuario ('administrador' o 'colaborador')
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<boolean>} True si se inactivó correctamente
     */
    async inactivarUsuario(id, userType, organizacionCamelCase = null) {
        try {
            console.log(`Inactivando usuario ${id} de tipo ${userType}`);
            
            let docRef;
            
            if (userType === 'administrador') {
                docRef = doc(db, "administradores", id);
                
                // Si es administrador, también inactivar a todos sus colaboradores
                if (organizacionCamelCase) {
                    const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
                    const colabQuery = query(
                        collection(db, coleccionColaboradores),
                        where("status", "==", true)
                    );
                    
                    const colabSnapshot = await getDocs(colabQuery);
                    const updatePromises = [];
                    
                    colabSnapshot.forEach(docSnap => {
                        updatePromises.push(
                            updateDoc(doc(db, coleccionColaboradores, docSnap.id), {
                                status: false,
                                fechaActualizacion: serverTimestamp(),
                                actualizadoPor: id // ID del admin que inactivó
                            })
                        );
                    });
                    
                    await Promise.all(updatePromises);
                    console.log(`Se inactivaron ${updatePromises.length} colaboradores`);
                }
            } else {
                // Para colaboradores
                if (!organizacionCamelCase && this.currentUser) {
                    organizacionCamelCase = this.currentUser.organizacionCamelCase;
                }
                
                if (!organizacionCamelCase) {
                    throw new Error('No se especificó la organización del colaborador');
                }
                
                const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
                docRef = doc(db, coleccionColaboradores, id);
            }
            
            // Marcar usuario como inactivo en Firestore
            await updateDoc(docRef, {
                status: false,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: this.currentUser?.id || 'sistema'
            });
            
            // Actualizar en memoria local
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                this.users[index].status = false;
                this.users[index].fechaActualizacion = new Date();
            }
            
            console.log(`Usuario ${id} inactivado exitosamente`);
            return true;
            
        } catch (error) {
            console.error("Error inactivando usuario:", error);
            throw error;
        }
    }

    /**
     * Reactiva un usuario previamente inactivo
     * @param {string} id - ID del usuario
     * @param {string} userType - Tipo de usuario ('administrador' o 'colaborador')
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<boolean>} True si se reactivó correctamente
     */
    async reactivarUsuario(id, userType, organizacionCamelCase = null) {
        try {
            console.log(`Reactivando usuario ${id} de tipo ${userType}`);
            
            let docRef;
            
            if (userType === 'administrador') {
                docRef = doc(db, "administradores", id);
            } else {
                if (!organizacionCamelCase && this.currentUser) {
                    organizacionCamelCase = this.currentUser.organizacionCamelCase;
                }
                
                if (!organizacionCamelCase) {
                    throw new Error('No se especificó la organización del colaborador');
                }
                
                const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
                docRef = doc(db, coleccionColaboradores, id);
            }
            
            // Reactivar el usuario en Firestore
            await updateDoc(docRef, {
                status: true,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: this.currentUser?.id || 'sistema'
            });
            
            // Actualizar en memoria local
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                this.users[index].status = true;
                this.users[index].fechaActualizacion = new Date();
            }
            
            console.log(`Usuario ${id} reactivado exitosamente`);
            return true;
            
        } catch (error) {
            console.error("Error reactivando usuario:", error);
            throw error;
        }
    }

    // ========== MÉTODOS DE VERIFICACIÓN ==========
    
    /**
     * Verifica si un correo existe en una organización específica
     * @param {string} correo - Correo a verificar
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<boolean>} True si el correo existe en la organización
     */
    async verificarCorreoEnOrganizacion(correo, organizacionCamelCase) {
        try {
            // Buscar en administradores de la organización
            const adminQuery = query(
                collection(db, "administradores"),
                where("correoElectronico", "==", correo),
                where("organizacionCamelCase", "==", organizacionCamelCase)
            );
            const adminSnapshot = await getDocs(adminQuery);
            
            if (!adminSnapshot.empty) {
                return true;
            }
            
            // Buscar en colaboradores de la organización
            const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
            const colabQuery = query(
                collection(db, coleccionColaboradores),
                where("correoElectronico", "==", correo)
            );
            const colabSnapshot = await getDocs(colabQuery);
            
            return !colabSnapshot.empty;
            
        } catch (error) {
            console.error("Error verificando correo en organización:", error);
            return false;
        }
    }

    /**
     * Verifica si un correo existe en todo el sistema
     * @param {string} correo - Correo a verificar
     * @param {string} tipo - Tipo de usuario a buscar ('administrador', 'colaborador' o 'todos')
     * @returns {Promise<boolean>} True si el correo existe
     */
    async verificarCorreoExistente(correo, tipo = 'todos') {
        try {
            // Buscar en administradores si corresponde
            if (tipo === 'administrador' || tipo === 'todos') {
                const qAdmins = query(
                    collection(db, "administradores"),
                    where("correoElectronico", "==", correo)
                );
                const adminsSnapshot = await getDocs(qAdmins);
                
                if (!adminsSnapshot.empty) {
                    return true;
                }
            }
            
            // Buscar en colaboradores si corresponde
            if (tipo === 'colaborador' || tipo === 'todos') {
                // Buscar en todas las colecciones de colaboradores de todas las organizaciones
                const todasLasOrganizaciones = await this.getTodasLasOrganizaciones();
                
                for (const organizacion of todasLasOrganizaciones) {
                    const coleccionColaboradores = `colaboradores_${organizacion.camelCase}`;
                    const qColaboradores = query(
                        collection(db, coleccionColaboradores),
                        where("correoElectronico", "==", correo)
                    );
                    const colaboradoresSnapshot = await getDocs(qColaboradores);
                    
                    if (!colaboradoresSnapshot.empty) {
                        return true;
                    }
                }
            }
            
            return false;
            
        } catch (error) {
            console.error("Error verificando correo existente:", error);
            return false;
        }
    }

    // ========== MÉTODOS DE CONTEO ==========
    
    /**
     * Cuenta solo los usuarios activos de una organización
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<number>} Número de usuarios activos
     */
    async contarUsuariosActivosPorOrganizacion(organizacionCamelCase) {
        try {
            let total = 0;
            
            // Contar administradores activos
            const adminQuery = query(
                collection(db, "administradores"),
                where("organizacionCamelCase", "==", organizacionCamelCase),
                where("status", "==", true)
            );
            const adminSnapshot = await getDocs(adminQuery);
            total += adminSnapshot.size;
            
            // Contar colaboradores activos
            const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
            const colabQuery = query(
                collection(db, coleccionColaboradores),
                where("status", "==", true)
            );
            const colabSnapshot = await getDocs(colabQuery);
            total += colabSnapshot.size;
            
            console.log(`Total usuarios activos para ${organizacionCamelCase}: ${total}`);
            return total;
            
        } catch (error) {
            console.error("Error contando usuarios activos por organización:", error);
            return 0;
        }
    }

    /**
     * Cuenta TODOS los usuarios de una organización (incluyendo inactivos)
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<number>} Número total de usuarios
     */
    async contarTodosUsuariosPorOrganizacion(organizacionCamelCase) {
        try {
            let total = 0;
            
            // Contar TODOS los administradores
            const adminQuery = query(
                collection(db, "administradores"),
                where("organizacionCamelCase", "==", organizacionCamelCase)
            );
            const adminSnapshot = await getDocs(adminQuery);
            total += adminSnapshot.size;
            
            // Contar TODOS los colaboradores
            const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
            const colabQuery = query(collection(db, coleccionColaboradores));
            const colabSnapshot = await getDocs(colabQuery);
            total += colabSnapshot.size;
            
            console.log(`Total usuarios (incluyendo inactivos) para ${organizacionCamelCase}: ${total}`);
            return total;
            
        } catch (error) {
            console.error("Error contando todos los usuarios por organización:", error);
            return 0;
        }
    }

    // ========== MÉTODOS DE ACTUALIZACIÓN ==========
    
    /**
     * Actualiza los datos de un usuario
     * @param {string} id - ID del usuario
     * @param {Object} data - Datos a actualizar
     * @param {string} userType - Tipo de usuario ('administrador' o 'colaborador')
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase (solo para colaboradores)
     * @returns {Promise<boolean>} True si se actualizó correctamente
     */
    async updateUser(id, data, userType, organizacionCamelCase = null) {
        try {
            console.log(`Actualizando usuario ${id} de tipo ${userType}:`, data);
            
            let docRef;
            
            if (userType === 'administrador') {
                docRef = doc(db, "administradores", id);
            } else {
                // Para colaboradores, determinar la colección correcta
                const coleccion = organizacionCamelCase || data.organizacionCamelCase || this.currentUser?.organizacionCamelCase;
                if (!coleccion) {
                    throw new Error('No se especificó la organización del colaborador');
                }
                
                docRef = doc(db, `colaboradores_${coleccion}`, id);
            }
            
            const updateData = {
                ...data,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: this.currentUser?.id || 'sistema'
            };
            
            console.log('Actualizando usuario:', updateData);
            await updateDoc(docRef, updateData);
            
            // Actualizar en memoria local
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                Object.keys(data).forEach(key => {
                    this.users[index][key] = data[key];
                });
                this.users[index].fechaActualizacion = new Date();
                this.users[index].actualizadoPor = this.currentUser?.id || 'sistema';
            }
            
            return true;
            
        } catch (error) {
            console.error("Error actualizando usuario:", error);
            throw error;
        }
    }

    // ========== MÉTODOS DE AUTENTICACIÓN ==========
    
    /**
     * Inicia sesión con email y contraseña
     * @param {string} email - Correo electrónico
     * @param {string} password - Contraseña
     * @returns {Promise<User>} Instancia del usuario autenticado
     */
    async iniciarSesion(email, password) {
        try {
            console.log('Iniciando sesión para:', email);
            
            // ===== PASO 1: Autenticar en Firebase Auth =====
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            
            // ===== PASO 2: Obtener datos del usuario desde Firestore =====
            const user = await this.getUserById(uid);
            
            if (!user) {
                await signOut(auth);
                throw new Error('Usuario no encontrado en la base de datos');
            }
            
            // ===== PASO 3: Verificar que NO esté inactivo =====
            if (!user.status) {
                await signOut(auth);
                throw new Error('Tu cuenta está inactiva. Contacta al administrador.');
            }
            
            // ===== PASO 4: Verificar email (OPCIONAL - puedes comentar estas líneas) =====
            if (!userCredential.user.emailVerified) {
                console.warn('Usuario no verificado intentando iniciar sesión');
                
                // Reenviar verificación
                try {
                    await sendEmailVerification(userCredential.user, {
                        url: window.location.origin + '/verifyEmail.html',
                        handleCodeInApp: true
                    });
                } catch (emailError) {
                    console.warn('Error reenviando verificación:', emailError);
                }
                
                // Lanzar error para bloquear login sin verificación
                throw new Error('Tu email no está verificado. Se ha reenviado el correo de verificación.');
            }
            
            // ===== PASO 5: Actualizar último login en Firestore =====
            if (user.cargo === 'administrador') {
                await updateDoc(doc(db, "administradores", uid), {
                    ultimoLogin: serverTimestamp(),
                    fechaActualizacion: serverTimestamp(),
                    emailVerified: userCredential.user.emailVerified,
                    verificado: true
                });
            } else {
                const coleccionColaboradores = `colaboradores_${user.organizacionCamelCase}`;
                await updateDoc(doc(db, coleccionColaboradores, uid), {
                    ultimoLogin: serverTimestamp(),
                    fechaActualizacion: serverTimestamp(),
                    emailVerified: userCredential.user.emailVerified,
                    verificado: true
                });
            }
            
            // ===== PASO 6: Cargar usuario actual en memoria =====
            await this.loadCurrentUser(uid);
            
            // ===== PASO 7: Guardar preferencias en localStorage =====
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

    // ========== MÉTODOS DE OBTENCIÓN DE DATOS ==========
    
    /**
     * Obtiene todos los colaboradores de una organización
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @param {boolean} incluirInactivos - Incluir usuarios inactivos
     * @returns {Promise<Array<User>>} Array de colaboradores
     */
    async getColaboradoresByOrganizacion(organizacionCamelCase, incluirInactivos = false) {
        try {
            console.log(`Obteniendo colaboradores para organización: ${organizacionCamelCase}`);
            
            const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
            let colabQuery;
            
            // Configurar query según si incluye inactivos o no
            if (incluirInactivos) {
                colabQuery = query(collection(db, coleccionColaboradores));
            } else {
                colabQuery = query(
                    collection(db, coleccionColaboradores),
                    where("status", "==", true)
                );
            }
            
            const colabSnapshot = await getDocs(colabQuery);
            const colaboradores = [];
            
            // Convertir cada documento a instancia de User
            colabSnapshot.forEach(doc => {
                const data = doc.data();
                colaboradores.push(new User(doc.id, {
                    ...data,
                    cargo: 'colaborador'
                }));
            });
            
            console.log(`Encontrados ${colaboradores.length} colaboradores`);
            return colaboradores;
            
        } catch (error) {
            console.error("Error obteniendo colaboradores:", error);
            return [];
        }
    }

    /**
     * Obtiene todos los administradores
     * @param {boolean} incluirInactivos - Incluir administradores inactivos
     * @returns {Promise<Array<User>>} Array de administradores
     */
    async getAdministradores(incluirInactivos = false) {
        try {
            let adminsQuery;
            
            // Configurar query según si incluye inactivos o no
            if (incluirInactivos) {
                adminsQuery = query(collection(db, "administradores"));
            } else {
                adminsQuery = query(
                    collection(db, "administradores"),
                    where("status", "==", true)
                );
            }
            
            const adminsSnapshot = await getDocs(adminsQuery);
            const administradores = [];
            
            adminsSnapshot.forEach(doc => {
                const data = doc.data();
                administradores.push(new User(doc.id, {
                    ...data,
                    cargo: 'administrador'
                }));
            });
            
            return administradores;
            
        } catch (error) {
            console.error("Error obteniendo administradores:", error);
            return [];
        }
    }

    /**
     * Obtiene todos los usuarios inactivos de una organización
     * @param {string} organizacionCamelCase - Nombre de la organización en camelCase
     * @returns {Promise<Array<User>>} Array de usuarios inactivos
     */
    async getUsuariosInactivosPorOrganizacion(organizacionCamelCase) {
        try {
            const usuariosInactivos = [];
            
            // Buscar administradores inactivos
            const adminQuery = query(
                collection(db, "administradores"),
                where("organizacionCamelCase", "==", organizacionCamelCase),
                where("status", "==", false)
            );
            const adminSnapshot = await getDocs(adminQuery);
            
            adminSnapshot.forEach(doc => {
                const data = doc.data();
                usuariosInactivos.push(new User(doc.id, {
                    ...data,
                    cargo: 'administrador'
                }));
            });
            
            // Buscar colaboradores inactivos
            const coleccionColaboradores = `colaboradores_${organizacionCamelCase}`;
            const colabQuery = query(
                collection(db, coleccionColaboradores),
                where("status", "==", false)
            );
            const colabSnapshot = await getDocs(colabQuery);
            
            colabSnapshot.forEach(doc => {
                const data = doc.data();
                usuariosInactivos.push(new User(doc.id, {
                    ...data,
                    cargo: 'colaborador'
                }));
            });
            
            console.log(`Encontrados ${usuariosInactivos.length} usuarios inactivos`);
            return usuariosInactivos;
            
        } catch (error) {
            console.error("Error obteniendo usuarios inactivos:", error);
            return [];
        }
    }

    // ========== 🔥 MÉTODO CORREGIDO - OBTENER USUARIO POR ID CON FOTOS ==========
    
    /**
     * Busca un usuario por ID en la memoria local o Firestore
     * @param {string} id - ID del usuario
     * @returns {Promise<User|null>} Instancia del usuario o null
     */
    async getUserById(id) {
        console.log('🔍 getUserById buscando:', id);
        
        // 1. Buscar primero en memoria
        const userInMemory = this.users.find(user => user.id === id);
        if (userInMemory) {
            console.log('✅ Usuario encontrado en memoria');
            return userInMemory;
        }
        
        console.log('❌ No encontrado en memoria, buscando en Firestore...');
        
        // 2. Si no está en memoria, buscar en Firestore
        try {
            // Buscar en administradores primero
            const adminRef = doc(db, "administradores", id);
            const adminSnap = await getDoc(adminRef);
            
            if (adminSnap.exists()) {
                console.log('✅ Encontrado en administradores');
                const data = adminSnap.data();
                
                // ✅ CORREGIDO: Incluir TODOS los campos incluyendo fotos
                const user = new User(id, {
                    ...data,
                    idAuth: id,
                    cargo: 'administrador',
                    // Asegurar que las fotos se pasen explícitamente
                    fotoUsuario: data.fotoUsuario || data.fotoURL || data.foto || null,
                fotoOrganizacion: data.fotoOrganizacion || data.logoOrganizacion || data.logo || null,
                    email: data.correoElectronico || data.email
                });
                
                // Agregar a memoria para próximas búsquedas
                this.users.push(user);
                return user;
            }
            
            // Buscar en colaboradores
            const organizaciones = await this.getTodasLasOrganizaciones();
            
            for (const org of organizaciones) {
                const coleccion = `colaboradores_${org.camelCase}`;
                
                // Verificar si la colección existe
                try {
                    const q = query(
                        collection(db, coleccion),
                        where("idAuth", "==", id)
                    );
                    const snapshot = await getDocs(q);
                    
                    // CAMBIA TODO EL BLOQUE DE COLABORADOR por esto:
            if (!snapshot.empty) {
                console.log(`✅ Encontrado en ${coleccion}`);
                const docSnap = snapshot.docs[0];
                const data = docSnap.data();

                // ✅ CORREGIDO: Incluir TODOS los campos incluyendo fotos
                const user = new User(id, {
                    ...data,
                    idAuth: id,
                    cargo: 'colaborador',
                    // Asegurar que las fotos se pasen explícitamente
                    fotoUsuario: data.fotoUsuario || data.fotoURL || data.foto || null,
                    fotoOrganizacion: data.fotoOrganizacion || data.logoOrganizacion || data.logo || null,
                    email: data.correoElectronico || data.email
                });

                this.users.push(user);
                return user;
            }
                } catch (e) {
                    // La colección podría no existir, continuar con la siguiente
                    console.warn(`Colección ${coleccion} no disponible:`, e.message);
                    continue;
                }
            }
            
            console.log('❌ No encontrado en ninguna colección');
            return null;
            
        } catch (error) {
            console.error('Error en getUserById:', error);
            return null;
        }
    }

    /**
     * Verifica si el usuario actual es administrador
     * @returns {boolean} True si es administrador
     */
    esAdministrador() {
        return this.currentUser && this.currentUser.cargo === 'administrador';
    }

    /**
     * Verifica si el usuario actual tiene un permiso específico
     * @param {string} permiso - Nombre del permiso
     * @returns {boolean} True si tiene el permiso
     */
    tienePermiso(permiso) {
        if (!this.currentUser) return false;
        
        // Los administradores tienen todos los permisos
        if (this.currentUser.cargo === 'administrador') {
            return true;
        }
        
        // Los colaboradores tienen permisos personalizados
        return this.currentUser.permisosPersonalizados[permiso] === true;
    }
}

// ==================== EXPORTS ====================
// Exportar las clases para uso en otros archivos
export { User, UserManager };