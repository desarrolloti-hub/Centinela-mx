// /usuarios/administrador/pruebasNotificaciones/pruebasNotificaciones.js
import { fcmInicializador } from '../../../components/fcm-inicializador.js';

function actualizarUI() {
    const badge = document.getElementById('deviceStatusBadge');
    const tokenSpan = document.getElementById('deviceToken');
    
    if (fcmInicializador.estaActiva()) {
        badge.textContent = 'Activadas';
        badge.className = 'badge-enabled';
        tokenSpan.textContent = fcmInicializador.tokenActual?.substring(0, 30) + '...' || 'Token obtenido';
    } else {
        badge.textContent = 'Desactivadas';
        badge.className = 'badge-disabled';
        tokenSpan.textContent = 'No disponible';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando...');
    await fcmInicializador.iniciar();
    actualizarUI();
    
    document.getElementById('enableNotificationsBtn').addEventListener('click', async () => {
        const exito = await fcmInicializador.activar();
        if (exito) {
            Swal.fire('✅ Activado', 'Notificaciones activadas', 'success');
            actualizarUI();
        } else {
            Swal.fire('❌ Error', 'No se pudo activar', 'error');
        }
    });
});