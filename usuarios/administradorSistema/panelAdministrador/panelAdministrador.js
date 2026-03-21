// panelAdministrador.js - Versión con datos reales desde OperacionesEstadisticas

import OperacionesEstadisticas from '/clases/operacion.js';

class PanelAdministrador {
    constructor() {
        this.charts = {};
        this.datosGlobales = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Panel Administrador...');
        
        // Escuchar progreso de actualización
        OperacionesEstadisticas.onProgreso((progreso) => {
            this.actualizarProgreso(progreso);
        });
        
        await this.cargarDatosGlobales();
        this.inicializarBotonesAcciones();
        this.inicializarActualizacionAutomatica();
    }

    async cargarDatosGlobales() {
        try {
            // Mostrar loading en las tarjetas KPI
            this.mostrarLoadingKPI();
            
            // Obtener datos de todas las empresas
            this.datosGlobales = await OperacionesEstadisticas.obtenerDatosTodasEmpresas();
            
            if (this.datosGlobales && this.datosGlobales.totales) {
                this.actualizarKPIs(this.datosGlobales.totales);
                this.actualizarGraficas(this.datosGlobales);
                this.actualizarTopEmpresas(this.datosGlobales.porEmpresa);
                this.actualizarAlertas(this.datosGlobales);
                this.actualizarUltimasEmpresas(this.datosGlobales.porEmpresa);
            } else {
                this.mostrarSinDatos();
            }
            
        } catch (error) {
            console.error('❌ Error cargando datos globales:', error);
            this.mostrarError('Error al cargar los datos del panel');
        }
    }

    mostrarLoadingKPI() {
        const kpis = [
            'total-empresas', 'total-usuarios', 'total-ingresos',
            'total-almacenamiento', 'total-bandwidth', 'total-api'
        ];
        kpis.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
        });
    }

    actualizarKPIs(totales) {
        // 1. EMPRESAS ACTIVAS
        const totalEmpresas = this.datosGlobales.porEmpresa?.length || 0;
        this.actualizarElemento('total-empresas', totalEmpresas);
        
        // 2. USUARIOS TOTALES
        const totalUsuarios = totales.auth?.totalUsuarios || 0;
        this.actualizarElemento('total-usuarios', totalUsuarios);
        
        // 3. INGRESOS MENSUALES (simulado basado en empresas y usuarios)
        // Puedes ajustar esta fórmula según tu modelo de negocio
        const ingresosEstimados = this.calcularIngresosEstimados(totalEmpresas, totalUsuarios);
        this.actualizarElemento('total-ingresos', `$${ingresosEstimados.toLocaleString()}`);
        
        // 4. ALMACENAMIENTO
        const almacenamientoGB = (totales.storage?.totalSizeMB || 0) / 1024;
        this.actualizarElemento('total-almacenamiento', `${almacenamientoGB.toFixed(2)} GB`);
        
        // 5. ANCHO DE BANDA (simulado basado en almacenamiento)
        const bandwidthGB = (almacenamientoGB * 0.3).toFixed(2); // Estimación
        this.actualizarElemento('total-bandwidth', `${bandwidthGB} GB`);
        
        // 6. PETICIONES API (simulado basado en documentos y usuarios)
        const apiRequests = (totales.firestore?.documentos || 0) * 2 + totalUsuarios * 10;
        this.actualizarElemento('total-api', apiRequests.toLocaleString());
        
        // Actualizar tooltips con más información
        this.actualizarTooltips(totales);
    }

    calcularIngresosEstimados(empresas, usuarios) {
        // Ejemplo: $100 por empresa base + $5 por usuario
        const basePorEmpresa = 100;
        const porUsuario = 5;
        return (empresas * basePorEmpresa) + (usuarios * porUsuario);
    }

    actualizarTooltips(totales) {
        // Agregar información detallada a las tarjetas KPI
        const kpiCards = document.querySelectorAll('.kpi-card');
        kpiCards.forEach(card => {
            const title = card.querySelector('h3')?.innerText || '';
            let tooltipText = '';
            
            switch(title) {
                case 'EMPRESAS':
                    const activas = this.datosGlobales.porEmpresa?.length || 0;
                    const conDatos = this.datosGlobales.porEmpresa?.filter(e => e.conteos?.firestore?.documentos > 0).length || 0;
                    tooltipText = `${activas} empresas totales, ${conDatos} con actividad`;
                    break;
                case 'USUARIOS':
                    tooltipText = `${totales.auth?.administradores || 0} administradores, ${totales.auth?.colaboradores || 0} colaboradores`;
                    break;
                case 'ALMACENAMIENTO':
                    tooltipText = `${totales.storage?.totalArchivos || 0} archivos almacenados`;
                    break;
                case 'API REQUESTS':
                    tooltipText = `Basado en ${totales.firestore?.documentos || 0} documentos Firestore`;
                    break;
            }
            
            if (tooltipText) {
                card.setAttribute('title', tooltipText);
            }
        });
    }

    actualizarGraficas(datosGlobales) {
        const porEmpresa = datosGlobales.porEmpresa || [];
        
        // Gráfica de Distribución de Planes (basada en tamaño de almacenamiento)
        if (porEmpresa.length > 0) {
            const top5 = [...porEmpresa]
                .sort((a, b) => (b.conteos?.storage?.totalSizeMB || 0) - (a.conteos?.storage?.totalSizeMB || 0))
                .slice(0, 5);
            
            const labels = top5.map(e => this.truncarTexto(e.nombreEmpresa || e.id, 15));
            const data = top5.map(e => e.conteos?.storage?.totalSizeMB || 0);
            
            this.crearGraficaPastel('chartPlanes', labels, data, 'MB');
        }
        
        // Gráfica de Crecimiento Mensual (datos simulados pero basados en documentos reales)
        this.crearGraficaCrecimiento(porEmpresa);
    }

    crearGraficaPastel(canvasId, labels, data, unidad = '') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const total = data.reduce((a, b) => a + b, 0);
        const colores = ['#ff4d00', '#2f8cff', '#00cfff', '#b16bff', '#ffcc00', '#9caba4', '#28a745', '#dc3545'];
        
        this.charts[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colores.slice(0, data.length),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            font: { size: 10, family: "'Rajdhani', sans-serif" },
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw;
                                const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value.toFixed(2)} ${unidad} (${porcentaje}%)`;
                            }
                        }
                    }
                },
                cutout: '50%'
            }
        });
        
        // Actualizar leyenda
        const legendContainer = document.getElementById('planesLegend');
        if (legendContainer && labels.length > 0) {
            legendContainer.innerHTML = labels.map((label, i) => `
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="width: 10px; height: 10px; background: ${colores[i]}; border-radius: 50%;"></span>
                    ${label}: ${data[i].toFixed(2)} MB
                </span>
            `).join('');
        }
    }

    crearGraficaCrecimiento(porEmpresa) {
        const canvas = document.getElementById('chartCrecimiento');
        if (!canvas) return;
        
        if (this.charts['chartCrecimiento']) {
            this.charts['chartCrecimiento'].destroy();
        }
        
        // Simular crecimiento basado en datos reales de los últimos 6 meses
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const documentosPorMes = this.simularCrecimientoMensual(porEmpresa);
        
        this.charts['chartCrecimiento'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Documentos Firestore',
                    data: documentosPorMes,
                    borderColor: '#ff4d00',
                    backgroundColor: 'rgba(255, 77, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ff4d00',
                    pointBorderColor: '#ffffff',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Documentos: ${context.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ffffff' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#ffffff' }
                    }
                }
            }
        });
    }

    simularCrecimientoMensual(porEmpresa) {
        const documentosTotales = porEmpresa.reduce((sum, e) => sum + (e.conteos?.firestore?.documentos || 0), 0);
        
        // Distribuir el total en 6 meses con crecimiento exponencial
        const base = documentosTotales / 6;
        return [
            Math.round(base * 0.3),
            Math.round(base * 0.5),
            Math.round(base * 0.7),
            Math.round(base * 0.9),
            Math.round(base * 1.1),
            Math.round(base * 1.3)
        ];
    }

    actualizarTopEmpresas(porEmpresa) {
        const container = document.getElementById('topEmpresas');
        if (!container) return;
        
        if (!porEmpresa || porEmpresa.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">No hay datos disponibles</div>';
            return;
        }
        
        // Top empresas por número de usuarios
        const topEmpresas = [...porEmpresa]
            .sort((a, b) => (b.conteos?.auth?.totalUsuarios || 0) - (a.conteos?.auth?.totalUsuarios || 0))
            .slice(0, 5);
        
        container.innerHTML = topEmpresas.map((emp, index) => {
            const nombre = emp.nombreEmpresa || emp.id;
            const usuarios = emp.conteos?.auth?.totalUsuarios || 0;
            const documentos = emp.conteos?.firestore?.documentos || 0;
            const plan = this.obtenerPlanPorTamanio(emp.conteos?.storage?.totalSizeMB || 0);
            
            return `
                <div class="top-empresa-item">
                    <div class="top-empresa-rank">${index + 1}</div>
                    <div class="top-empresa-info">
                        <div class="top-empresa-nombre">${this.escapeHTML(nombre)}</div>
                        <div class="top-empresa-detalle">
                            <span><i class="fa-solid fa-users"></i> ${usuarios}</span>
                            <span><i class="fa-solid fa-file"></i> ${documentos}</span>
                            <span class="top-empresa-plan">${plan}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    obtenerPlanPorTamanio(tamanioMB) {
        if (tamanioMB < 100) return 'Básico';
        if (tamanioMB < 500) return 'Pro';
        if (tamanioMB < 2000) return 'Empresarial';
        return 'Enterprise';
    }

    actualizarAlertas(datosGlobales) {
        const container = document.getElementById('alertasList');
        if (!container) return;
        
        const alertas = [];
        const totales = datosGlobales.totales;
        const porEmpresa = datosGlobales.porEmpresa || [];
        
        // Alerta: Almacenamiento cerca del límite (simulado)
        const almacenamientoGB = (totales.storage?.totalSizeMB || 0) / 1024;
        if (almacenamientoGB > 90) {
            alertas.push({
                tipo: 'danger',
                titulo: '⚠️ Almacenamiento crítico',
                mensaje: `Se ha utilizado ${almacenamientoGB.toFixed(1)} GB del almacenamiento disponible`
            });
        } else if (almacenamientoGB > 70) {
            alertas.push({
                tipo: 'warning',
                titulo: '📀 Almacenamiento elevado',
                mensaje: `Uso de almacenamiento: ${almacenamientoGB.toFixed(1)} GB`
            });
        }
        
        // Alerta: Empresas sin actividad
        const empresasInactivas = porEmpresa.filter(e => (e.conteos?.firestore?.documentos || 0) === 0).length;
        if (empresasInactivas > 0) {
            alertas.push({
                tipo: 'info',
                titulo: '🏢 Empresas sin actividad',
                mensaje: `${empresasInactivas} empresas no tienen documentos registrados`
            });
        }
        
        // Alerta: Usuarios sin colaboradores
        const empresasSinColaboradores = porEmpresa.filter(e => (e.conteos?.auth?.colaboradores || 0) === 0).length;
        if (empresasSinColaboradores > 0) {
            alertas.push({
                tipo: 'warning',
                titulo: '👥 Equipos incompletos',
                mensaje: `${empresasSinColaboradores} empresas no tienen colaboradores registrados`
            });
        }
        
        // Alerta: Muchos archivos multimedia
        const archivosMultimedia = totales.storage?.porTipo?.multimedia?.cantidad || 0;
        const totalArchivos = totales.storage?.totalArchivos || 0;
        const porcentajeMultimedia = totalArchivos > 0 ? (archivosMultimedia / totalArchivos) * 100 : 0;
        if (porcentajeMultimedia > 30) {
            alertas.push({
                tipo: 'info',
                titulo: '🎬 Alto contenido multimedia',
                mensaje: `${porcentajeMultimedia.toFixed(1)}% del almacenamiento son archivos multimedia`
            });
        }
        
        // Alerta de éxito (si todo está bien)
        if (alertas.length === 0) {
            alertas.push({
                tipo: 'success',
                titulo: '✅ Sistema saludable',
                mensaje: 'Todos los indicadores están dentro de los parámetros normales'
            });
        }
        
        container.innerHTML = alertas.map(alerta => `
            <div class="alerta-item ${alerta.tipo}">
                <i class="fa-solid ${this.getIconoAlerta(alerta.tipo)}"></i>
                <div class="alerta-texto">
                    <strong>${alerta.titulo}</strong>
                    <span>${alerta.mensaje}</span>
                </div>
            </div>
        `).join('');
    }

    getIconoAlerta(tipo) {
        const iconos = {
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };
        return iconos[tipo] || 'fa-bell';
    }

    actualizarUltimasEmpresas(porEmpresa) {
        const container = document.getElementById('ultimasEmpresas');
        if (!container) return;
        
        if (!porEmpresa || porEmpresa.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">No hay empresas registradas</div>';
            return;
        }
        
        // Últimas empresas por fecha de actualización
        const ultimas = [...porEmpresa]
            .sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion))
            .slice(0, 5);
        
        container.innerHTML = ultimas.map(emp => {
            const nombre = emp.nombreEmpresa || emp.id;
            const fecha = emp.fechaActualizacion;
            const fechaFormateada = fecha ? new Date(fecha).toLocaleDateString() : 'Fecha desconocida';
            
            return `
                <div class="ultima-empresa-item">
                    <div class="ultima-empresa-nombre">
                        <i class="fa-solid fa-building" style="color: #ff4d00; margin-right: 8px;"></i>
                        ${this.escapeHTML(nombre)}
                    </div>
                    <div class="ultima-empresa-fecha">
                        <i class="fa-regular fa-calendar"></i> ${fechaFormateada}
                    </div>
                </div>
            `;
        }).join('');
    }

    actualizarProgreso(progreso) {
        // Mostrar progreso si hay una actualización en curso
        if (!progreso.completado && progreso.total > 0) {
            const toastContainer = document.getElementById('progressToast') || this.crearToastProgreso();
            const porcentaje = progreso.porcentaje || Math.round((progreso.procesadas / progreso.total) * 100);
            
            toastContainer.querySelector('.progress-text').textContent = progreso.mensaje || `Actualizando datos... ${porcentaje}%`;
            toastContainer.querySelector('.progress-bar-fill').style.width = `${porcentaje}%`;
            toastContainer.style.display = 'block';
            
        } else if (progreso.completado) {
            const toastContainer = document.getElementById('progressToast');
            if (toastContainer) {
                setTimeout(() => {
                    toastContainer.style.display = 'none';
                }, 3000);
            }
            
            if (progreso.exitosas !== undefined) {
                this.mostrarNotificacion(`Actualización completada: ${progreso.exitosas} empresas actualizadas`, 'success');
                this.cargarDatosGlobales(); // Recargar datos
            }
        }
    }

    crearToastProgreso() {
        const toast = document.createElement('div');
        toast.id = 'progressToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border-left: 3px solid #ff4d00;
            border-radius: 8px;
            padding: 12px 16px;
            z-index: 1000;
            min-width: 250px;
            backdrop-filter: blur(10px);
            display: none;
        `;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fa-solid fa-sync-alt fa-spin" style="color: #ff4d00;"></i>
                <span class="progress-text" style="color: #fff; font-size: 0.75rem;">Actualizando...</span>
            </div>
            <div style="background: rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden;">
                <div class="progress-bar-fill" style="width: 0%; height: 3px; background: #ff4d00; transition: width 0.3s;"></div>
            </div>
        `;
        document.body.appendChild(toast);
        return toast;
    }

    inicializarBotonesAcciones() {
        // Botón de actualización manual
        const btnActualizar = document.getElementById('btnActualizarDatos');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.actualizarTodosLosDatos());
        }
    }

    inicializarActualizacionAutomatica() {
        // Actualizar datos cada 5 minutos (300000 ms)
        setInterval(() => {
            console.log('🔄 Actualización automática de datos...');
            this.cargarDatosGlobales();
        }, 300000);
    }

    async actualizarTodosLosDatos() {
        try {
            const resultado = await OperacionesEstadisticas.actualizarTodas({
                pausaEntreLotes: 800,
                loteSize: 2
            });
            
            if (resultado && resultado.length > 0) {
                this.mostrarNotificacion(`✅ Actualización completada: ${resultado.length} empresas actualizadas`, 'success');
                await this.cargarDatosGlobales();
            }
        } catch (error) {
            console.error('Error actualizando datos:', error);
            this.mostrarError('Error al actualizar los datos');
        }
    }

    actualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncarTexto(texto, maxLength) {
        if (!texto) return '';
        return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        Swal.fire({
            text: mensaje,
            icon: tipo,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: '#1e1e2e',
            color: '#ffffff'
        });
    }

    mostrarError(mensaje) {
        Swal.fire({
            title: 'Error',
            text: mensaje,
            icon: 'error',
            confirmButtonText: 'OK',
            background: '#1e1e2e',
            color: '#ffffff',
            confirmButtonColor: '#ff4d00'
        });
    }

    mostrarSinDatos() {
        const kpis = [
            'total-empresas', 'total-usuarios', 'total-ingresos',
            'total-almacenamiento', 'total-bandwidth', 'total-api'
        ];
        kpis.forEach(id => {
            this.actualizarElemento(id, '0');
        });
        
        const containers = ['topEmpresas', 'alertasList', 'ultimasEmpresas'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<div style="text-align:center; padding:20px;">No hay datos disponibles</div>';
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PanelAdministrador();
});