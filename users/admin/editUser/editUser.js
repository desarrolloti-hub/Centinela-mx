// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, iniciando editor de colaborador...');
    
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 no está cargado');
        loadSweetAlert();
        return;
    }
    
    console.log('SweetAlert2 ya está cargado');
    applySweetAlertStyles();
    initCollaboratorEditor();
    
    // Cargar datos del colaborador desde Firebase
    loadCollaboratorData();
});

// ========== CARGAR DATOS DEL COLABORADOR ==========
async function loadCollaboratorData() {
    console.log('Cargando datos del colaborador...');
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const collaboratorId = urlParams.get('id');
    const collectionName = urlParams.get('collection');
    
    if (!collaboratorId || !collectionName) {
        console.error('❌ ID o colección no especificados en la URL');
        showErrorAlert(
            'ERROR',
            'No se especificó el colaborador a editar.<br><br>Por favor, regresa a la gestión de colaboradores.'
        );
        return;
    }
    
    console.log(`🔍 Cargando colaborador: ${collaboratorId} de ${collectionName}`);
    
    // Verificar Firebase
    if (typeof firebase === 'undefined') {
        console.error('Firebase no está disponible');
        showFirebaseError();
        return;
    }
    
    try {
        // Mostrar loader
        Swal.fire({
            title: 'CARGANDO DATOS',
            text: 'Obteniendo información del colaborador...',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Obtener datos de Firebase
        const db = firebase.firestore();
        const docRef = db.collection(collectionName).doc(collaboratorId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            Swal.close();
            showErrorAlert(
                'COLABORADOR NO ENCONTRADO',
                `El colaborador con ID ${collaboratorId} no existe en la colección ${collectionName}.`
            );
            return;
        }
        
        const collaboratorData = doc.data();
        
        // Actualizar interfaz con los datos
        updateUIWithCollaboratorData(collaboratorData);
        
        // Guardar referencia para uso posterior
        window.currentCollaborator = {
            id: collaboratorId,
            collection: collectionName,
            data: collaboratorData
        };
        
        Swal.close();
        
        console.log('✅ Datos del colaborador cargados:', collaboratorData);
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error cargando colaborador:', error);
        showErrorAlert(
            'ERROR AL CARGAR',
            `No se pudieron cargar los datos del colaborador:<br><br>
            <code>${error.message}</code>`
        );
    }
}

// ========== ACTUALIZAR INTERFAZ CON DATOS ==========
function updateUIWithCollaboratorData(data) {
    console.log('Actualizando interfaz con datos del colaborador...');
    
    // Nombre completo
    document.getElementById('fullName').value = data.nombreCompleto || '';
    
    // Correo electrónico
    document.getElementById('email').value = data.correoElectronico || '';
    
    // Organización (si existe el campo)
    const organizationSelect = document.getElementById('organization');
    if (organizationSelect) {
        organizationSelect.value = data.organizacionCamelCase || data.organizacion || '';
    }
    
    // Status
    const statusValue = data.status === true || data.status === 'active' ? 'active' : 
                       data.status === false || data.status === 'inactive' ? 'inactive' : 'pending';
    
    document.getElementById('status').value = statusValue;
    
    // Actualizar botones de status
    document.querySelectorAll('.role-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-status') === statusValue) {
            opt.classList.add('selected');
        }
    });
    
    // Permisos
    const permissions = data.permisos || data.permissions || [];
    document.querySelectorAll('input[name="permissions"]').forEach(checkbox => {
        checkbox.checked = permissions.includes(checkbox.value);
    });
    
    // Foto de perfil
    if (data.fotoUsuario || data.profileImage) {
        const imageUrl = data.fotoUsuario || data.profileImage;
        const collaboratorImage = document.getElementById('collaboratorImage');
        const collaboratorPlaceholder = document.getElementById('collaboratorPlaceholder');
        
        collaboratorImage.src = imageUrl;
        collaboratorImage.style.display = 'block';
        collaboratorPlaceholder.style.display = 'none';
    }
    
    // Información del sistema
    document.getElementById('authId').textContent = data.authId || data.id || 'N/A';
    
    if (data.fechaCreacion) {
        const creationDate = formatFirebaseDate(data.fechaCreacion);
        document.querySelector('#creationDate').textContent = creationDate.date;
        document.querySelector('#creationTime').textContent = creationDate.time;
    }
    
    if (data.fechaActualizacion) {
        const updateDate = formatFirebaseDate(data.fechaActualizacion);
        document.querySelector('#lastUpdateDate').textContent = updateDate.date;
        document.querySelector('#lastUpdateTime').textContent = updateDate.time;
    }
    
    if (data.ultimoLogin) {
        const loginDate = formatFirebaseDate(data.ultimoLogin);
        document.querySelector('#lastLoginDate').textContent = loginDate.date;
        document.querySelector('#lastLoginTime').textContent = loginDate.time;
    }
    
    console.log('✅ Interfaz actualizada con datos del colaborador');
}

// ========== FORMATAR FECHAS DE FIREBASE ==========
function formatFirebaseDate(firebaseDate) {
    let date = new Date();
    
    try {
        if (firebaseDate.toDate) {
            date = firebaseDate.toDate();
        } else if (firebaseDate._seconds) {
            date = new Date(firebaseDate._seconds * 1000);
        } else if (typeof firebaseDate === 'string') {
            date = new Date(firebaseDate);
        }
    } catch (error) {
        console.warn('Error formateando fecha:', error);
    }
    
    return {
        date: date.toLocaleDateString('es-MX'),
        time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
}

// ========== EDITOR DE COLABORADOR ==========
function initCollaboratorEditor() {
    console.log('Inicializando editor de colaborador...');
    
    // Elementos del DOM
    const elements = {
        // Botones principales
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        generatePasswordBtn: document.getElementById('generatePasswordBtn'),
        
        // Fotos
        collaboratorCircle: document.getElementById('collaboratorCircle'),
        collaboratorInput: document.getElementById('collaborator-input'),
        
        // Formulario
        fullNameInput: document.getElementById('fullName'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        organizationSelect: document.getElementById('organization'),
        statusInput: document.getElementById('status'),
        
        // Botones mostrar/ocultar contraseña
        togglePasswordBtns: document.querySelectorAll('.toggle-password'),
        
        // Status options
        statusOptions: document.querySelectorAll('.role-option'),
        
        // Permisos
        permissionCheckboxes: document.querySelectorAll('input[name="permissions"]')
    };
    
    // Variables globales
    let currentFile = null;
    let collaboratorImageUrl = null;
    
    // ========== EVENT LISTENERS ==========
    
    // 1. BOTÓN GUARDAR CAMBIOS
    elements.saveChangesBtn.addEventListener('click', () => {
        console.log('Botón guardar cambios clickeado');
        validateAndSaveChanges();
    });
    
    // 2. BOTÓN CANCELAR
    elements.cancelBtn.addEventListener('click', () => {
        console.log('Botón cancelar clickeado');
        showCancelConfirmation();
    });
    
    // 3. BOTÓN ELIMINAR
    elements.deleteBtn.addEventListener('click', () => {
        console.log('Botón eliminar clickeado');
        showDeleteConfirmation();
    });
    
    // 4. BOTÓN GENERAR CONTRASEÑA
    elements.generatePasswordBtn.addEventListener('click', () => {
        console.log('🔑 Botón generar contraseña clickeado');
        generateSecurePassword();
    });
    
    // 5. FOTO DEL COLABORADOR
    elements.collaboratorCircle.addEventListener('click', () => {
        elements.collaboratorInput.click();
    });
    
    elements.collaboratorInput.addEventListener('change', (e) => {
        handleFileSelect(e);
    });
    
    // 6. MOSTRAR/OCULTAR CONTRASEÑA
    elements.togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    
    // 7. SELECCIÓN DE STATUS
    elements.statusOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remover clase selected de todas las opciones
            elements.statusOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Agregar clase selected a la opción clickeada
            this.classList.add('selected');
            
            // Actualizar el valor del campo oculto
            const statusValue = this.getAttribute('data-status');
            elements.statusInput.value = statusValue;
            
            console.log(`🔄 Status cambiado a: ${statusValue}`);
        });
    });
    
    console.log('Event listeners asignados correctamente');
}

// ========== ALERTAS DE SWEETALERT ==========

// 1. VALIDAR Y GUARDAR CAMBIOS EN FIREBASE
async function validateAndSaveChanges() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const organization = document.getElementById('organization').value;
    const status = document.getElementById('status').value;
    const statusBoolean = status === 'active';
    
    const errors = [];
    
    // Validar nombre
    if (!fullName) {
        errors.push('El nombre completo es obligatorio');
    }
    
    // Validar email
    if (!email) {
        errors.push('El correo electrónico es obligatorio');
    } else if (!validateEmail(email)) {
        errors.push('El correo electrónico no es válido');
    }
    
    // Validar organización
    if (!organization) {
        errors.push('Debe seleccionar una organización');
    }
    
    // Validar contraseñas si se proporcionan
    if (password || confirmPassword) {
        if (password && confirmPassword && password !== confirmPassword) {
            errors.push('Las contraseñas no coinciden');
        }
        
        if (password && password.length < 8) {
            errors.push('La contraseña debe tener al menos 8 caracteres');
        }
        
        if (password) {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                errors.push('La contraseña no cumple con los requisitos de seguridad');
            }
        }
    }
    
    // Si hay errores, mostrar alerta
    if (errors.length > 0) {
        showErrorAlert(
            'ERROR DE VALIDACIÓN',
            `<div style="text-align: left;">
                <p>Por favor corrige los siguientes errores:</p>
                <ul style="margin: 10px 0 0 20px;">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>`
        );
        return;
    }
    
    // Mostrar confirmación antes de guardar
    showSaveConfirmation(fullName, email, statusBoolean);
}

// 2. ALERTA DE CONFIRMACIÓN PARA GUARDAR
function showSaveConfirmation(fullName, email, status) {
    // Obtener permisos seleccionados
    const selectedPermissions = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
        .map(checkbox => checkbox.value);
    
    // Obtener organización seleccionada
    const organizationSelect = document.getElementById('organization');
    const selectedOrg = organizationSelect.options[organizationSelect.selectedIndex].text;
    
    // Status en español
    const statusText = status ? '🟢 Activo' : '🔴 Inactivo';
    
    const htmlContent = `
        <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; background: rgba(46, 204, 113, 0.1); 
                 padding: 20px; border-radius: 50%; border: 3px solid #2ecc71; margin-bottom: 15px;">
                <i class="fas fa-save" style="font-size: 2.5rem; color: #2ecc71;"></i>
            </div>
            <h3 style="color: white; margin: 10px 0;">¿Actualizar colaborador en Firebase?</h3>
            <p style="color: #b0b0d0; margin: 0;">Se actualizarán los siguientes datos:</p>
        </div>
        
        <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #3498db; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-user"></i> NOMBRE COMPLETO</p>
            <p style="margin: 0; color: white; font-weight: 500;">${fullName}</p>
        </div>
        
        <div style="background: rgba(155, 89, 182, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #9b59b6; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-envelope"></i> CORREO</p>
            <p style="margin: 0; color: white; font-weight: 500;">${email}</p>
        </div>
        
        <div style="background: rgba(46, 204, 113, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #2ecc71; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-toggle-on"></i> ESTATUS</p>
            <p style="margin: 0; color: white; font-weight: 500;">${statusText}</p>
        </div>
        
        ${window.collaboratorImageUrl ? `
        <div style="background: rgba(241, 196, 15, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #f1c40f; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-camera"></i> FOTO</p>
            <p style="margin: 0; color: white; font-weight: 500;">Se actualizará la foto del colaborador</p>
        </div>
        ` : ''}
        
        <div style="background: rgba(44, 62, 80, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #2c3e50; margin-bottom: 15px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-shield-alt"></i> PERMISOS (${selectedPermissions.length})</p>
            <p style="margin: 0; color: white; font-weight: 500; font-size: 0.9rem;">
                ${selectedPermissions.length > 0 ? selectedPermissions.join(', ') : 'Sin permisos asignados'}
            </p>
        </div>
        
        <div style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #f1c40f;">
            <p style="margin: 0; color: #f1c40f; font-size: 0.8rem;">
                <i class="fas fa-info-circle"></i> Esta acción actualizará la información en Firebase
            </p>
        </div>
    `;
    
    Swal.fire({
        title: 'ACTUALIZAR EN FIREBASE',
        html: htmlContent,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-save"></i> SÍ, ACTUALIZAR',
        cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: '#2ecc71',
        cancelButtonColor: '#e74c3c',
        reverseButtons: true,
        width: '550px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            saveCollaboratorToFirebase();
        }
    });
}

// 3. GUARDAR EN FIREBASE
async function saveCollaboratorToFirebase() {
    if (!window.currentCollaborator) {
        showErrorAlert('ERROR', 'No hay datos del colaborador cargados');
        return;
    }
    
    const { id, collection } = window.currentCollaborator;
    
    // Mostrar loader
    Swal.fire({
        title: 'ACTUALIZANDO EN FIREBASE',
        text: 'Por favor espera un momento...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        // Preparar datos para actualizar
        const updateData = {
            nombreCompleto: document.getElementById('fullName').value.trim(),
            correoElectronico: document.getElementById('email').value.trim(),
            status: document.getElementById('status').value === 'active',
            permisos: Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                          .map(checkbox => checkbox.value),
            organizacionCamelCase: document.getElementById('organization').value,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Agregar foto si se cambió
        if (window.collaboratorImageUrl) {
            updateData.fotoUsuario = window.collaboratorImageUrl;
        }
        
        // Actualizar contraseña si se proporcionó una nueva
        const password = document.getElementById('password').value;
        if (password) {
            // Aquí deberías actualizar la contraseña en Firebase Auth
            // Esto requiere autenticación y manejo especial
            console.log('Contraseña cambiada (requiere implementación de Firebase Auth)');
        }
        
        // Guardar en Firebase
        const db = firebase.firestore();
        await db.collection(collection).doc(id).update(updateData);
        
        // Limpiar campos de contraseña
        document.getElementById('password').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Cerrar loader y mostrar éxito
        Swal.close();
        
        showSuccessAlert(
            '✅ COLABORADOR ACTUALIZADO',
            `<div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(46, 204, 113, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #2ecc71;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; color: #2ecc71;"></i>
                </div>
                <p style="color: white; margin: 10px 0 0 0; font-weight: 500;">${updateData.nombreCompleto}</p>
                <p style="color: #b0b0d0; margin: 5px 0;">ha sido actualizado exitosamente en Firebase</p>
            </div>
            <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #3498db;">
                <p style="margin: 0; color: #3498db; font-size: 0.9rem;">
                    <i class="fas fa-database"></i> Colección: <code>${collection}</code>
                </p>
            </div>`
        );
        
        console.log('✅ Colaborador actualizado en Firebase:', { id, collection, updateData });
        
        // Actualizar datos locales
        window.currentCollaborator.data = { 
            ...window.currentCollaborator.data, 
            ...updateData 
        };
        
        // Actualizar timestamp de última actualización en la UI
        const now = new Date();
        document.querySelector('#lastUpdateDate').textContent = now.toLocaleDateString('es-MX');
        document.querySelector('#lastUpdateTime').textContent = now.toLocaleTimeString('es-MX', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error actualizando en Firebase:', error);
        
        showErrorAlert(
            'ERROR AL ACTUALIZAR',
            `<div style="text-align: left;">
                <p>No se pudo actualizar el colaborador en Firebase:</p>
                <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; margin-top: 10px;">
                    <code style="color: #e74c3c; font-size: 0.85rem;">${error.message}</code>
                </div>
                <p style="margin-top: 15px; color: #f39c12;">
                    <i class="fas fa-exclamation-triangle"></i> Verifica tu conexión a internet.
                </p>
            </div>`
        );
    }
}

// 4. ALERTA DE CONFIRMACIÓN PARA CANCELAR
function showCancelConfirmation() {
    Swal.fire({
        title: '¿CANCELAR CAMBIOS?',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.1); 
                     padding: 20px; border-radius: 50%; border: 3px solid #e74c3c; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #e74c3c;"></i>
                </div>
                <p style="color: white; font-size: 1.1rem; margin: 0 0 10px 0;">
                    ¿Estás seguro de cancelar los cambios?
                </p>
                <p style="color: #b0b0d0; margin: 0;">
                    Se perderán todos los cambios no guardados en Firebase
                </p>
            </div>
            <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #e74c3c;">
                <p style="margin: 0; color: #e74c3c; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-circle"></i> Esta acción no se puede deshacer
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-times"></i> SÍ, CANCELAR',
        cancelButtonText: '<i class="fas fa-arrow-left"></i> NO, CONTINUAR',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#3498db',
        reverseButtons: true,
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'gestionColaboradores.html';
        }
    });
}

// 5. ALERTA DE CONFIRMACIÓN PARA ELIMINAR DESDE FIREBASE
function showDeleteConfirmation() {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    
    Swal.fire({
        title: '¿ELIMINAR DE FIREBASE?',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.1); 
                     padding: 20px; border-radius: 50%; border: 3px solid #e74c3c; margin-bottom: 15px;">
                    <i class="fas fa-trash-alt" style="font-size: 2.5rem; color: #e74c3c;"></i>
                </div>
                <h3 style="color: white; margin: 10px 0;">${fullName}</h3>
                <p style="color: #b0b0d0; margin: 0;">${email}</p>
                <p style="color: #f39c12; margin: 10px 0; font-size: 0.9rem;">
                    <i class="fas fa-database"></i> Colección: ${window.currentCollaborator?.collection || 'No especificada'}
                </p>
            </div>
            
            <p style="text-align: center; font-size: 1.1rem;">
                ¿Estás seguro de <strong style="color: #e74c3c;">eliminar permanentemente</strong> 
                este colaborador de Firebase?
            </p>
            
            <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #e74c3c; margin-top: 15px;">
                <p style="margin: 0 0 5px 0; color: #e74c3c; font-size: 0.9rem;"><i class="fas fa-exclamation-triangle"></i> CONSECUENCIAS</p>
                <ul style="margin: 0; color: #b0b0d0; font-size: 0.9rem; padding-left: 20px;">
                    <li>Se eliminará permanentemente de la base de datos</li>
                    <li>Se perderán todos los datos del colaborador</li>
                    <li>No se podrá recuperar la información</li>
                    <li>Esta acción afecta directamente a Firebase</li>
                </ul>
            </div>
        `,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-trash"></i> SÍ, ELIMINAR DE FIREBASE',
        cancelButtonText: '<i class="fas fa-ban"></i> SOLO DESACTIVAR',
        showDenyButton: true,
        denyButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6',
        denyButtonColor: '#3498db',
        reverseButtons: true,
        width: '600px',
        backdrop: 'rgba(0, 0, 0, 0.9)'
    }).then((result) => {
        if (result.isConfirmed) {
            // Eliminar colaborador de Firebase
            deleteCollaboratorFromFirebase();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Solo desactivar
            deactivateCollaborator();
        }
    });
}

// 6. ELIMINAR COLABORADOR DE FIREBASE
async function deleteCollaboratorFromFirebase() {
    if (!window.currentCollaborator) {
        showErrorAlert('ERROR', 'No hay datos del colaborador cargados');
        return;
    }
    
    const { id, collection } = window.currentCollaborator;
    const fullName = document.getElementById('fullName').value;
    
    // Mostrar loader
    Swal.fire({
        title: 'ELIMINANDO DE FIREBASE',
        text: 'Por favor espera...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        // Eliminar de Firebase
        const db = firebase.firestore();
        await db.collection(collection).doc(id).delete();
        
        Swal.close();
        
        showSuccessAlert(
            '🗑️ COLABORADOR ELIMINADO',
            `<div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #e74c3c;">
                    <i class="fas fa-trash-alt" style="font-size: 2rem; color: #e74c3c;"></i>
                </div>
                <p style="color: white; margin: 10px 0 0 0; font-weight: 500;">${fullName}</p>
                <p style="color: #b0b0d0; margin: 5px 0;">ha sido eliminado de Firebase</p>
            </div>
            <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #3498db;">
                <p style="margin: 0; color: #3498db; font-size: 0.9rem;">
                    <i class="fas fa-database"></i> Eliminado de: <code>${collection}</code>
                </p>
            </div>`
        );
        
        console.log(`✅ Colaborador eliminado de Firebase: ${id} de ${collection}`);
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
            window.location.href = 'gestionColaboradores.html';
        }, 3000);
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error eliminando colaborador:', error);
        
        showErrorAlert(
            'ERROR AL ELIMINAR',
            `<div style="text-align: left;">
                <p>No se pudo eliminar el colaborador de Firebase:</p>
                <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; margin-top: 10px;">
                    <code style="color: #e74c3c; font-size: 0.85rem;">${error.message}</code>
                </div>
            </div>`
        );
    }
}

// 7. DESACTIVAR COLABORADOR (SOLO CAMBIAR STATUS)
function deactivateCollaborator() {
    const fullName = document.getElementById('fullName').value;
    
    // Cambiar status a inactivo
    document.getElementById('status').value = 'inactive';
    const statusOptions = document.querySelectorAll('.role-option');
    statusOptions.forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.role-option[data-status="inactive"]').classList.add('selected');
    
    // Mostrar mensaje
    showSuccessAlert(
        '✅ COLABORADOR DESACTIVADO',
        `<div style="text-align: center; margin: 15px 0;">
            <div style="display: inline-block; background: rgba(149, 165, 166, 0.2); 
                 padding: 15px; border-radius: 50%; border: 2px solid #95a5a6;">
                <i class="fas fa-ban" style="font-size: 2rem; color: #95a5a6;"></i>
            </div>
            <p style="color: white; margin: 10px 0 0 0; font-weight: 500;">${fullName}</p>
            <p style="color: #b0b0d0; margin: 5px 0;">ha sido desactivado en el formulario</p>
        </div>
        <div style="background: rgba(149, 165, 166, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #95a5a6;">
            <p style="margin: 0; color: #95a5a6; font-size: 0.9rem;">
                <i class="fas fa-info-circle"></i> Recuerda guardar los cambios para aplicar en Firebase
            </p>
        </div>`
    );
    
    console.log(`Colaborador desactivado: ${fullName}`);
}

// 8. MANEJO DE ARCHIVOS DE IMAGEN
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const maxSize = 5; // MB
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    
    // Validar tipo de archivo
    if (!validTypes.includes(file.type)) {
        showErrorAlert(
            '❌ FORMATO NO VÁLIDO',
            `El formato del archivo no es compatible.<br><br>
            <strong>Formatos permitidos:</strong><br>
            • JPG / JPEG<br>
            • PNG<br><br>
            <span style="color: #f39c12;">
                <i class="fas fa-exclamation-triangle"></i> Por favor selecciona una imagen válida.
            </span>`
        );
        event.target.value = '';
        return;
    }
    
    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
        showErrorAlert(
            'ARCHIVO DEMASIADO GRANDE',
            `El archivo excede el tamaño máximo permitido.<br><br>
            <strong>Tamaño del archivo:</strong> ${(file.size / (1024 * 1024)).toFixed(2)} MB<br>
            <strong>Límite permitido:</strong> ${maxSize} MB<br><br>
            <span style="color: #f39c12;">
                <i class="fas fa-exclamation-triangle"></i> Por favor selecciona una imagen más pequeña.
            </span>`
        );
        event.target.value = '';
        return;
    }
    
    // Mostrar preview
    showImagePreview(file);
}

// 9. PREVIEW DE IMAGEN
function showImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        
        Swal.fire({
            title: 'FOTO DEL COLABORADOR',
            html: `
                <div style="text-align: center; margin: 20px 0;">
                    <img src="${imageUrl}" alt="Preview" 
                         style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 4px solid #667eea; margin-bottom: 15px;">
                    <p style="color: white; font-size: 1.1rem; margin: 0 0 10px 0;">
                        Vista previa
                    </p>
                    <p style="color: #b0b0d0; margin: 0;">
                        ¿Deseas usar esta imagen como foto del colaborador?
                    </p>
                </div>
                <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #3498db;">
                    <p style="margin: 0; color: #3498db; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Tamaño: ${(file.size / (1024 * 1024)).toFixed(2)} MB • Formato: ${file.type.split('/')[1].toUpperCase()}
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check"></i> SÍ, USAR ESTA IMAGEN',
            cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#e74c3c',
            width: '500px',
            backdrop: 'rgba(0, 0, 0, 0.8)'
        }).then((result) => {
            if (result.isConfirmed) {
                saveCollaboratorImage(imageUrl);
            } else {
                document.getElementById('collaborator-input').value = '';
            }
        });
    };
    
    reader.readAsDataURL(file);
}

// 10. GUARDAR IMAGEN DEL COLABORADOR (LOCAL)
function saveCollaboratorImage(imageUrl) {
    const collaboratorImage = document.getElementById('collaboratorImage');
    const collaboratorPlaceholder = document.getElementById('collaboratorPlaceholder');
    
    // Mostrar loader
    Swal.fire({
        title: 'GUARDANDO IMAGEN',
        text: 'Por favor espera...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Simular guardado
    setTimeout(() => {
        // Actualizar imagen localmente
        collaboratorImage.src = imageUrl;
        collaboratorImage.style.display = 'block';
        collaboratorPlaceholder.style.display = 'none';
        
        // Guardar URL para actualizar en Firebase
        window.collaboratorImageUrl = imageUrl;
        
        // Cerrar loader y mostrar éxito
        Swal.close();
        showSuccessAlert(
            'IMAGEN ACTUALIZADA',
            `La foto del colaborador se ha actualizado localmente.<br><br>
            <div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(46, 204, 113, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #2ecc71;">
                    <i class="fas fa-camera" style="font-size: 2rem; color: #2ecc71;"></i>
                </div>
            </div>
            <div style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; margin-top: 10px;">
                <p style="margin: 0; color: #f1c40f; font-size: 0.8rem;">
                    <i class="fas fa-info-circle"></i> Recuerda guardar los cambios para subir la imagen a Firebase
                </p>
            </div>`
        );
        
        console.log('Imagen del colaborador actualizada localmente');
        
    }, 1500);
}

// 11. GENERAR CONTRASEÑA SEGURA
function generateSecurePassword() {
    // Caracteres disponibles
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    // Asegurar al menos un carácter de cada tipo
    let password = '';
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // Completar con caracteres aleatorios
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < 12; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Mezclar la contraseña
    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    
    // Asignar la contraseña generada
    document.getElementById('password').value = password;
    document.getElementById('confirmPassword').value = password;
    
    // Mostrar alerta con la contraseña
    Swal.fire({
        title: 'CONTRASEÑA GENERADA',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(155, 89, 182, 0.1); 
                     padding: 20px; border-radius: 8px; border: 2px solid #9b59b6; margin-bottom: 15px;">
                    <code style="font-family: 'Courier New', monospace; font-size: 1.2rem; color: white; letter-spacing: 2px;">
                        ${password}
                    </code>
                </div>
                <p style="color: #b0b0d0; margin: 10px 0 0 0; font-size: 0.9rem;">
                    <i class="fas fa-copy"></i> La contraseña ha sido copiada automáticamente
                </p>
            </div>
            <div style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #f1c40f;">
                <p style="margin: 0; color: #f1c40f; font-size: 0.8rem;">
                    <i class="fas fa-exclamation-triangle"></i> Guarda esta contraseña en un lugar seguro
                </p>
            </div>
        `,
        icon: 'success',
        confirmButtonText: '<i class="fas fa-check"></i> ENTENDIDO',
        confirmButtonColor: '#9b59b6',
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        showCloseButton: true
    });
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(password).then(() => {
        console.log('📋 Contraseña copiada al portapapeles');
    });
}

// ========== FUNCIONES UTILITARIAS ==========

// 12. VALIDAR CONTRASEÑA
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let errors = [];
    
    if (password.length < minLength) errors.push(`Mínimo ${minLength} caracteres`);
    if (!hasUpperCase) errors.push('Al menos una letra mayúscula');
    if (!hasLowerCase) errors.push('Al menos una letra minúscula');
    if (!hasNumber) errors.push('Al menos un número');
    if (!hasSpecialChar) errors.push('Al menos un carácter especial');
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 13. VALIDAR EMAIL
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ========== ALERTAS REUTILIZABLES ==========

// 14. ALERTA DE ÉXITO
function showSuccessAlert(title, html) {
    Swal.fire({
        title: title,
        html: html,
        icon: 'success',
        confirmButtonText: '<i class="fas fa-check"></i> ACEPTAR',
        confirmButtonColor: '#2ecc71',
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true
    });
}

// 15. ALERTA DE ERROR
function showErrorAlert(title, message) {
    Swal.fire({
        title: title,
        html: message,
        icon: 'error',
        confirmButtonText: '<i class="fas fa-times"></i> CERRAR',
        confirmButtonColor: '#e74c3c',
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)'
    });
}

// 16. ERROR DE FIREBASE
function showFirebaseError() {
    Swal.fire({
        title: 'FIREBASE NO DISPONIBLE',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.1); 
                     padding: 20px; border-radius: 50%; border: 3px solid #e74c3c; margin-bottom: 15px;">
                    <i class="fas fa-database" style="font-size: 2.5rem; color: #e74c3c;"></i>
                </div>
                <p style="color: white; margin: 10px 0;">
                    No se pudo conectar con Firebase
                </p>
                <p style="color: #b0b0d0; margin: 0;">
                    Verifica tu conexión a internet y recarga la página
                </p>
            </div>
        `,
        icon: 'error',
        confirmButtonText: '<i class="fas fa-sync-alt"></i> RECARGAR',
        confirmButtonColor: '#3498db',
        cancelButtonText: '<i class="fas fa-arrow-left"></i> VOLVER',
        showCancelButton: true,
        backdrop: 'rgba(0, 0, 0, 0.9)'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.reload();
        } else {
            window.history.back();
        }
    });
}

// ========== CARGAR SWEETALERT DINÁMICAMENTE ==========
function loadSweetAlert() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    script.onload = () => {
        console.log('SweetAlert2 cargado dinámicamente');
        applySweetAlertStyles();
        initCollaboratorEditor();
        loadCollaboratorData();
    };
    script.onerror = () => {
        console.error('Error cargando SweetAlert2');
        alert('Error: No se pudo cargar SweetAlert2. Recarga la página.');
    };
    document.head.appendChild(script);
}

// ========== APLICAR ESTILOS SWEETALERT ==========
function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos personalizados para SweetAlert2 */
        .swal2-popup {
            background: #1a1a2e !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
            backdrop-filter: blur(8px) !important;
            font-family: 'Rajdhani', sans-serif !important;
            color: white !important;
        }
        
        .swal2-title {
            color: white !important;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
        }
        
        .swal2-html-container {
            color: #b0b0d0 !important;
            font-size: 1rem !important;
            line-height: 1.5 !important;
        }
        
        .swal2-confirm {
            background: linear-gradient(135deg, #3498db, #2980b9) !important;
            color: white !important;
            border: none !important;
            border-radius: 8px !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.2) !important;
        }
        
        .swal2-confirm:hover {
            background: linear-gradient(135deg, #2980b9, #3498db) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.3) !important;
        }
        
        .swal2-cancel {
            background: rgba(255, 255, 255, 0.07) !important;
            color: white !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: all 0.3s ease !important;
        }
        
        .swal2-cancel:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(52, 152, 219, 0.3) !important;
            transform: translateY(-2px) !important;
        }
        
        .swal2-input, .swal2-textarea, .swal2-select {
            background: rgba(255, 255, 255, 0.07) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            color: white !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: all 0.3s ease !important;
            padding: 10px 15px !important;
        }
        
        .swal2-input:focus, .swal2-textarea:focus {
            border-color: #3498db !important;
            box-shadow: 0 0 0 1px rgba(52, 152, 219, 0.2) !important;
            outline: none !important;
        }
        
        /* Icon colors */
        .swal2-icon.swal2-success {
            border-color: #2ecc71 !important;
            color: #2ecc71 !important;
        }
        
        .swal2-icon.swal2-error {
            border-color: #e74c3c !important;
            color: #e74c3c !important;
        }
        
        .swal2-icon.swal2-warning {
            border-color: #f39c12 !important;
            color: #f39c12 !important;
        }
        
        .swal2-icon.swal2-info {
            border-color: #3498db !important;
            color: #3498db !important;
        }
    `;
    document.head.appendChild(style);
    console.log('Estilos SweetAlert aplicados');
}

// ========== EXPORTAR FUNCIONES ==========
window.validateAndSaveChanges = validateAndSaveChanges;
window.showCancelConfirmation = showCancelConfirmation;
window.showDeleteConfirmation = showDeleteConfirmation;
window.generateSecurePassword = generateSecurePassword;
window.showSuccessAlert = showSuccessAlert;
window.showErrorAlert = showErrorAlert;

console.log('Editor de colaborador para Firebase listo. Funciones disponibles:');
console.log('- validateAndSaveChanges()');
console.log('- showCancelConfirmation()');
console.log('- showDeleteConfirmation()');
console.log('- generateSecurePassword()');
console.log('- showSuccessAlert(title, html)');
console.log('- showErrorAlert(title, message)');