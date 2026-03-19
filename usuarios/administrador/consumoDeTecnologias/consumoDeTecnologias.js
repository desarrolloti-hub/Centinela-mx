// consumo.js - Módulo para visualizar consumo de Firebase

import consumo from '/clases/consumoFirebase.js'; // Importar la instancia singleton

let chartDistribucion = null;
let intervaloActualizacion = null;

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📊 Iniciando módulo de consumo...');
        mostrarLoading();

        // Configurar event listeners
        document.getElementById('btnActualizar').addEventListener('click', actualizarVista);
        document.getElementById('btnGuardarSnapshot').addEventListener('click', guardarSnapshot);
        document.getElementById('btnResetear').addEventListener('click', resetearContadores);
        document.getElementById('btnGenerarPDF').addEventListener('click', generarPDF);

        // Cargar datos iniciales
        await actualizarVista();

        // Actualizar cada 30 segundos
        intervaloActualizacion = setInterval(actualizarVista, 30000);

    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('No se pudo cargar el módulo de consumo.');
    }
});

// Limpiar intervalo al salir
window.addEventListener('beforeunload', () => {
    if (intervaloActualizacion) clearInterval(intervaloActualizacion);
});

// =============================================
// ACTUALIZAR VISTA CON DATOS ACTUALES
// =============================================
async function actualizarVista() {
    try {
        const stats = consumo.obtenerEstadisticas();

        // Actualizar métricas
        actualizarMetricasFirestore(stats.firestore);
        actualizarMetricasStorage(stats.storage);
        actualizarMetricasFunctions(stats.functions);
        actualizarMetricasAuth(stats.autenticacion); // 👈 CORREGIDO: antes era stats.auth
        actualizarMetricasTotales(stats);

        // Actualizar gráfica
        actualizarGraficaDistribucion(stats);

        // Actualizar tabla de historial
        actualizarTablaHistorial(stats.historial || []);

        // Actualizar fecha
        document.getElementById('fechaActualizacion').textContent = new Date().toLocaleString('es-MX');

    } catch (error) {
        console.error('Error actualizando vista:', error);
    }
}

function actualizarMetricasFirestore(firestore) {
    document.getElementById('metricFirestoreTotal').textContent = firestore.total || 0;
    document.getElementById('metricFirestoreDetalle').innerHTML =
        `L:${firestore.lecturas || 0} / E:${firestore.escrituras || 0} / U:${firestore.actualizaciones || 0} / D:${firestore.eliminaciones || 0}`;
}

function actualizarMetricasStorage(storage) {
    document.getElementById('metricStorageTotal').textContent = storage.total || 0;
    document.getElementById('metricStorageDetalle').innerHTML =
        `Sub:${storage.subidas || 0} / Desc:${storage.descargas || 0} / Elim:${storage.eliminaciones || 0}`;
}

function actualizarMetricasFunctions(functions) {
    document.getElementById('metricFunctionsTotal').textContent = functions.total || 0;
    document.getElementById('metricFunctionsDetalle').innerHTML = `Invocaciones: ${functions.invocaciones || 0}`;
}

function actualizarMetricasAuth(autenticacion) {
    document.getElementById('metricAuthTotal').textContent = autenticacion.total || 0;
    document.getElementById('metricAuthDetalle').innerHTML =
        `Login:${autenticacion.iniciosSesion || 0} / Logout:${autenticacion.cierresSesion || 0} / Reg:${autenticacion.registros || 0}`;
}

function actualizarMetricasTotales(stats) {
    // Opcional: Podrías agregar una tarjeta de total general si lo deseas
}

// =============================================
// GRÁFICA DE DISTRIBUCIÓN
// =============================================
function actualizarGraficaDistribucion(stats) {
    const canvas = document.getElementById('graficoDistribucion');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const data = {
        labels: ['Firestore', 'Storage', 'Functions', 'Auth'],
        datasets: [{
            data: [
                stats.firestore.total || 0,
                stats.storage.total || 0,
                stats.functions.total || 0,
                stats.autenticacion.total || 0 // 👈 CORREGIDO
            ],
            backgroundColor: ['#3b82f6', '#f97316', '#8b5cf6', '#10b981'],
            borderWidth: 0
        }]
    };

    if (chartDistribucion) {
        chartDistribucion.data = data;
        chartDistribucion.update();
    } else {
        chartDistribucion = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: 'white' },
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const porcentaje = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                                return `${ctx.label}: ${ctx.raw} (${porcentaje}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// =============================================
// TABLA DE HISTORIAL (últimas 20)
// =============================================
function actualizarTablaHistorial(historial) {
    const tbody = document.getElementById('tablaHistorialBody');
    if (!tbody) return;

    if (!historial || historial.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay operaciones registradas aún.</td></tr>';
        return;
    }

    // Tomar las últimas 20 (o menos)
    const ultimas = historial.slice(-20).reverse();

    tbody.innerHTML = ultimas.map(op => {
        const fecha = new Date(op.timestamp).toLocaleTimeString('es-MX');
        const detalles = JSON.stringify(op.detalles).substring(0, 50) + (JSON.stringify(op.detalles).length > 50 ? '...' : '');
        return `
            <tr>
                <td><span class="badge-value badge-${getBadgeColor(op.servicio)}">${op.servicio}</span></td>
                <td>${op.tipo}</td>
                <td>${detalles}</td>
                <td>${fecha}</td>
            </tr>
        `;
    }).join('');
}

function getBadgeColor(servicio) {
    switch (servicio) {
        case 'firestore': return 'info';
        case 'storage': return 'warning';
        case 'functions': return 'secondary';
        case 'auth': return 'success';
        default: return 'secondary';
    }
}

// =============================================
// ACCIONES
// =============================================
async function guardarSnapshot() {
    try {
        await consumo.guardarSnapshot();
        Swal.fire({
            icon: 'success',
            title: 'Snapshot guardado',
            text: 'Los contadores actuales se han guardado en Firestore.',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Error guardando snapshot:', error);
        mostrarError('No se pudo guardar el snapshot.');
    }
}

async function resetearContadores() {
    const result = await Swal.fire({
        title: '¿Resetear contadores?',
        text: 'Esto pondrá todos los contadores a cero. Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, resetear',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        consumo.resetearContadores();
        await actualizarVista();
        Swal.fire({
            icon: 'success',
            title: 'Contadores reseteados',
            text: 'Todos los contadores están en cero.',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

async function generarPDF() {
    try {
        const stats = consumo.obtenerEstadisticas();

        // Verificar que hay datos
        if (stats.totalOperaciones === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin datos',
                text: 'No hay operaciones registradas para generar el PDF.'
            });
            return;
        }

        Swal.fire({
            title: 'Generando PDF...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Aquí puedes llamar a un generador de PDF similar al de estadísticas
        // Por ahora solo simulamos la descarga
        setTimeout(() => {
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'PDF generado',
                text: 'Funcionalidad en desarrollo.',
                timer: 2000,
                showConfirmButton: false
            });
        }, 1500);

    } catch (error) {
        console.error('Error generando PDF:', error);
        mostrarError('No se pudo generar el PDF.');
    }
}

// =============================================
// UTILIDADES
// =============================================
function mostrarLoading() {
    const elementosMetricas = [
        'metricFirestoreTotal', 'metricFirestoreDetalle',
        'metricStorageTotal', 'metricStorageDetalle',
        'metricFunctionsTotal', 'metricFunctionsDetalle',
        'metricAuthTotal', 'metricAuthDetalle'
    ];
    elementosMetricas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '...';
    });
    document.getElementById('tablaHistorialBody').innerHTML = '<tr><td colspan="4" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje
    });
}