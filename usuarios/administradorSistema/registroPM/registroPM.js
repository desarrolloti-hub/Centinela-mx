// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL, ACTIONS } from '/config/urlCloudFunction.js';

// Nombre de la Cloud Function específica
const POWER_MANAGE_FUNCTION = 'proxyPowerManage';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initPMForm();
});

function initPMForm() {
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    configurarEventos(elements);
}

function obtenerElementosDOM() {
    try {
        return {
            form: document.getElementById('pmRegisterForm'),
            btnSendCode: document.getElementById('btnSendCode'),
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            inputEmail: document.getElementById('pmEmail'),
            inputCode: document.getElementById('pmCode')
        };
    } catch (error) {
        console.error('❌ Error obteniendo elementos DOM:', error);
        return null;
    }
}

function configurarEventos(elements) {
    if (!elements.btnSendCode || !elements.form) return;
    
    // PASO 1: Solicitar código
    elements.btnSendCode.addEventListener('click', async () => {
        await solicitarCodigo(elements);
    });
    
    // Permitir Enter en el email
    elements.inputEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.btnSendCode.click();
        }
    });
    
    // PASO 2: Completar registro
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await completarRegistro(elements);
    });
    
    // Auto mayúsculas para el código
    if (elements.inputCode) {
        elements.inputCode.addEventListener('input', function() {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }
}

// ========== FUNCIÓN PARA VERIFICAR EMAIL DUPLICADO (USANDO LA CLASE) ==========
async function verificarEmailExistente(email) {
    try {
        // Usar el método estático de la clase CuentaPM
        const existe = await CuentaPM.existe(email);
        
        if (existe) {
            // Si existe, obtener la cuenta para saber su estado
            const cuenta = await CuentaPM.obtenerPorId(email);
            return {
                existe: true,
                status: cuenta?.status || 'desconocido'
            };
        }
        
        return { existe: false };
        
    } catch (error) {
        console.error('❌ Error verificando email:', error);
        throw new Error('Error al verificar disponibilidad del email');
    }
}

// Función para construir la URL completa con la función específica
function getFunctionUrl() {
    return `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
}

async function solicitarCodigo(elements) {
    const email = elements.inputEmail.value.trim();
    
    if (!email) {
        Swal.fire({
            icon: 'error',
            title: 'Email requerido',
            text: 'Ingresa un email corporativo válido',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Email inválido',
            text: 'El formato del email no es válido',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    // Mostrar loader mientras verificamos
    Swal.fire({
        title: 'Verificando email...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        // VERIFICAR SI EL EMAIL YA EXISTE USANDO LA CLASE
        const verificado = await verificarEmailExistente(email);
        
        if (verificado.existe) {
            Swal.close();
            
            let mensaje = '';
            if (verificado.status === 'activa') {
                mensaje = 'Esta cuenta de monitoreo ya está activa.';
            } else if (verificado.status === 'pendiente') {
                mensaje = 'Ya existe un registro pendiente para este email. Si no recibiste el código, contacta a soporte.';
            } else {
                mensaje = 'Este email ya está registrado en el sistema.';
            }
            
            Swal.fire({
                icon: 'warning',
                title: 'Email no disponible',
                html: `
                    <div style="text-align: center;">
                        <p>${mensaje}</p>
                        <p style="margin-top: 15px; font-size: 0.9rem; color: var(--color-text-secondary);">
                            <strong>Email:</strong> ${email}
                        </p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO'
            });
            return;
        }
        
        // Si no existe, proceder a solicitar código
        Swal.fire({
            title: 'Enviando código...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // Construir URL completa con la función específica
        const url = getFunctionUrl();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: ACTIONS.SOLICITAR_CODIGO, 
                email: email 
            })
        });

        const resData = await response.json();
        
        Swal.close();
        
        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'Código Enviado',
                html: `
                    <div style="text-align: center;">
                        <p>Se ha enviado un código de verificación a:</p>
                        <p><strong>${email}</strong></p>
                        <p style="margin-top: 15px; font-size: 0.9rem; color: var(--color-text-secondary);">
                            Revisa tu bandeja de entrada
                        </p>
                    </div>
                `,
                confirmButtonText: 'CONTINUAR'
            });
            
            elements.step1.style.display = 'none';
            elements.step2.style.display = 'block';
            
            // Auto focus en el código
            setTimeout(() => elements.inputCode.focus(), 300);
            
        } else {
            throw new Error(resData.error_message || "Error al solicitar el código");
        }
        
    } catch (error) {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'REINTENTAR'
        });
    }
}

async function completarRegistro(elements) {
    const email = elements.inputEmail.value.trim();
    const code = elements.inputCode.value.trim();
    
    if (!email || !code) {
        Swal.fire({
            icon: 'error',
            title: 'Campos incompletos',
            text: 'Debes ingresar el código de verificación',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (code.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Código inválido',
            text: 'El código debe tener al menos 6 caracteres',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }

    Swal.fire({
        title: 'Finalizando vinculación...',
        text: 'Esto puede tomar unos segundos',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // VOLVER A VERIFICAR ANTES DE COMPLETAR (por si acaso)
        const verificado = await verificarEmailExistente(email);
        
        if (verificado.existe) {
            Swal.close();
            Swal.fire({
                icon: 'warning',
                title: 'Email ya registrado',
                text: 'Este email ya fue registrado durante el proceso. Intenta con otro email.',
                confirmButtonText: 'ENTENDIDO'
            });
            return;
        }
        
        // Crear instancia de CuentaPM
        const cuenta = new CuentaPM(email);

        // Construir URL completa con la función específica
        const url = getFunctionUrl();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: ACTIONS.COMPLETAR_REGISTRO, 
                email_code: code,
                app_id: cuenta.appId 
            })
        });

        const resData = await response.json();
        
        if (!response.ok) {
            throw new Error(resData.error_message || "Código inválido o expirado");
        }

        // Actualizar datos con la respuesta exitosa usando setters
        cuenta.userToken = resData.user_token;
        cuenta.status = 'activa';
        
        // Persistir en Firestore usando el método de la clase
        await cuenta.guardarEnFirebase();

        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡Vinculación Exitosa!',
            html: `
                <div style="text-align: center;">
                    <p>Cuenta de monitoreo creada correctamente</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        <strong>Token generado exitosamente</strong>
                    </p>
                    <p style="margin-top: 5px; font-size: 0.8rem; color: var(--color-text-secondary);">
                        ID de App: ${cuenta.appId}
                    </p>
                </div>
            `,
            confirmButtonText: 'IR A GESTIÓN'
        });
        
        window.location.href = "../cuentasPM/cuentasPM.html";
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error en vinculación:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error de vinculación',
            text: error.message,
            confirmButtonText: 'REINTENTAR'
        });
    }
}

// ========== EXPORT ==========
export { initPMForm };