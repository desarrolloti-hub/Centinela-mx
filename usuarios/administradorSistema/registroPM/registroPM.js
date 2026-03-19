import { CuentaPM } from '/clases/cuentaPM.js';

const CLOUD_FUNCTION_URL = "https://us-central1-centinela-mx.cloudfunctions.net/proxyPowerManage";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pmRegisterForm');
    const btnSendCode = document.getElementById('btnSendCode');
    const secStep1 = document.getElementById('step1');
    const secStep2 = document.getElementById('step2');
    const inputEmail = document.getElementById('pmEmail');
    const inputCode = document.getElementById('pmCode');

    // PASO 1: Solicitar código a través de la Cloud Function
    btnSendCode.addEventListener('click', async () => {
        const email = inputEmail.value.trim();
        if (!email) return Swal.fire("Error", "Ingresa un email corporativo", "error");

        Swal.showLoading();
        try {
            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'solicitarCodigo', email: email })
            });

            const resData = await response.json();
            if (response.ok) {
                Swal.fire("Código Enviado", "Revisa el correo de la organización", "success");
                secStep1.style.display = 'none';
                secStep2.style.display = 'block';
            } else {
                throw new Error(resData.error_message || "Error al solicitar el código");
            }
        } catch (e) {
            Swal.fire("Error", e.message, "error");
        }
    });

    // PASO 2: Verificar código y guardar en Firebase
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = inputEmail.value.trim();
        const code = inputCode.value.trim();

        Swal.fire({ title: 'Finalizando vinculación...', didOpen: () => Swal.showLoading() });

        try {
            // Creamos instancia temporal para obtener el appId generado
            const cuenta = new CuentaPM(email);

            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'completarRegistro', 
                    email_code: code,
                    app_id: cuenta.appId 
                })
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error_message || "Código inválido");

            // Actualizamos datos con la respuesta exitosa de la API
            cuenta.userToken = resData.user_token;
            cuenta.status = 'activa';
            
            // Persistimos en Firestore usando el método de la clase
            await cuenta.guardarEnFirebase();

            await Swal.fire("¡Éxito!", "Organización vinculada correctamente", "success");
            window.location.href = "/usuarios/administrador/usuarios/usuarios.html";
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    });
});