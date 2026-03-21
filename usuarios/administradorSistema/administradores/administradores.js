// listarAdministradores.js
// Módulo completo para listar administradores (excluye masters)

import { UserManager } from '/clases/user.js';

// Importar jsPDF
import jsPDF from 'https://cdn.skypack.dev/jspdf@2.5.1';
import html2canvas from 'https://cdn.skypack.dev/html2canvas@1.4.1';

class ListarAdministradoresUI {
    constructor() {
        // Propiedades del controlador integradas
        this.userManager = null;
        this.administradores = [];
        this.administradoresFiltrados = [];
        this.paginaActual = 1;
        this.elementosPorPagina = 10;
        this.filtroBusqueda = '';
        
        // Elementos del DOM
        this.elementos = {
            tablaBody: document.getElementById('tablaAdministradoresBody'),
            pagination: document.getElementById('pagination'),
            paginationInfo: document.getElementById('paginationInfo'),
            buscarInput: document.getElementById('buscarAdministrador'),
            btnBuscar: document.getElementById('btnBuscar'),
            btnLimpiar: document.getElementById('btnLimpiarBusqueda'),
            btnExportarPDF: document.getElementById('btnExportarPDF'),
            totalEstadisticas: document.getElementById('totalEstadisticas'),
            activosEstadisticas: document.getElementById('activosEstadisticas')
        };
    }

    // ==================== MÉTODOS DEL CONTROLADOR ====================
    
    /**
     * Obtiene todos los administradores (solo administradores de organizaciones, excluye masters)
     */
    async obtenerAdministradores() {
        try {
            if (!this.userManager) {
                throw new Error('UserManager no disponible');
            }

            console.log('🔄 Cargando administradores...');
            
            // Obtener SOLO administradores de organizaciones (NO masters)
            const administradores = await this.userManager.getAdministradores(true);
            console.log(`✅ Administradores encontrados: ${administradores.length}`);
            
            // Filtrar para asegurar que no haya masters (por si acaso)
            this.administradores = administradores.filter(admin => admin.rol !== 'master');
            console.log(`📊 Total administradores (excluyendo masters): ${this.administradores.length}`);
            
            // Aplicar filtros iniciales
            this.aplicarFiltros();
            
            return this.administradoresFiltrados;
            
        } catch (error) {
            console.error('❌ Error obteniendo administradores:', error);
            throw error;
        }
    }

    /**
     * Aplica filtros a la lista de administradores
     */
    aplicarFiltros() {
        let resultado = [...this.administradores];
        
        if (this.filtroBusqueda && this.filtroBusqueda.trim() !== '') {
            const busqueda = this.filtroBusqueda.toLowerCase().trim();
            resultado = resultado.filter(admin => {
                return (
                    (admin.nombreCompleto && admin.nombreCompleto.toLowerCase().includes(busqueda)) ||
                    (admin.correoElectronico && admin.correoElectronico.toLowerCase().includes(busqueda)) ||
                    (admin.organizacion && admin.organizacion.toLowerCase().includes(busqueda))
                );
            });
            console.log(`🔍 Filtrados: ${resultado.length} de ${this.administradores.length}`);
        }
        
        // Ordenar por fecha de creación (más recientes primero)
        resultado.sort((a, b) => {
            const fechaA = a.fechaCreacion instanceof Date ? a.fechaCreacion : new Date(a.fechaCreacion);
            const fechaB = b.fechaCreacion instanceof Date ? b.fechaCreacion : new Date(b.fechaCreacion);
            return fechaB - fechaA;
        });
        
        this.administradoresFiltrados = resultado;
        this.paginaActual = 1;
        
        return this.administradoresFiltrados;
    }

    /**
     * Establece el filtro de búsqueda
     */
    setFiltroBusqueda(texto) {
        this.filtroBusqueda = texto;
        this.aplicarFiltros();
    }

    /**
     * Limpia los filtros
     */
    limpiarFiltros() {
        this.filtroBusqueda = '';
        this.aplicarFiltros();
    }

    /**
     * Obtiene administradores paginados
     */
    obtenerAdministradoresPaginados() {
        const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
        const fin = inicio + this.elementosPorPagina;
        return this.administradoresFiltrados.slice(inicio, fin);
    }

    /**
     * Cambia de página
     */
    irPagina(pagina) {
        const totalPaginas = this.obtenerTotalPaginas();
        if (pagina >= 1 && pagina <= totalPaginas) {
            this.paginaActual = pagina;
        }
    }

    /**
     * Obtiene total de páginas
     */
    obtenerTotalPaginas() {
        return Math.ceil(this.administradoresFiltrados.length / this.elementosPorPagina);
    }

    /**
     * Obtiene info de paginación
     */
    obtenerInfoPaginacion() {
        const total = this.administradoresFiltrados.length;
        const inicio = (this.paginaActual - 1) * this.elementosPorPagina + 1;
        const fin = Math.min(inicio + this.elementosPorPagina - 1, total);
        
        return {
            total,
            inicio: total > 0 ? inicio : 0,
            fin: total > 0 ? fin : 0,
            paginaActual: this.paginaActual,
            totalPaginas: this.obtenerTotalPaginas()
        };
    }

    /**
     * Formatea fecha
     */
    formatearFecha(fecha) {
        if (!fecha) return 'No disponible';
        
        try {
            let fechaObj = fecha;
            if (fecha && typeof fecha.toDate === 'function') {
                fechaObj = fecha.toDate();
            }
            if (fechaObj instanceof Date) {
                return fechaObj.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
            return 'Fecha inválida';
        } catch (error) {
            return 'Error en fecha';
        }
    }

    /**
     * Formatea fecha completa para detalles
     */
    formatearFechaCompleta(fecha) {
        if (!fecha) return 'No disponible';
        
        try {
            let fechaObj = fecha;
            if (fecha && typeof fecha.toDate === 'function') {
                fechaObj = fecha.toDate();
            }
            if (fechaObj instanceof Date) {
                return fechaObj.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return 'Fecha inválida';
        } catch (error) {
            return 'Error en fecha';
        }
    }

    /**
     * Badge del plan
     */
    getPlanBadge(plan) {
        const planes = {
            'gratis': '<span class="badge badge-plan-gratis"><i class="fas fa-star-of-life"></i> Gratis</span>',
            'basico': '<span class="badge badge-plan-basico"><i class="fas fa-chart-line"></i> Básico</span>',
            'premium': '<span class="badge badge-plan-premium"><i class="fas fa-crown"></i> Premium</span>',
            'empresa': '<span class="badge badge-plan-empresa"><i class="fas fa-building"></i> Empresa</span>'
        };
        return planes[plan] || planes['gratis'];
    }

    /**
     * Badge del rol (siempre administrador, no master)
     */
    getRolBadge() {
        return '<span class="badge badge-admin"><i class="fas fa-user-shield"></i> Administrador</span>';
    }

    /**
     * Badge del estado
     */
    getEstadoBadge(status) {
        if (status) {
            return '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Activo</span>';
        }
        return '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactivo</span>';
    }

    /**
     * Genera avatar HTML
     */
    getAvatarHTML(admin) {
        const fotoUrl = admin.getFotoUrl();
        const nombre = admin.nombreCompleto || admin.correoElectronico || 'Usuario';
        const inicial = nombre.charAt(0).toUpperCase();
        
        if (fotoUrl && !fotoUrl.includes('placeholder')) {
            return `<img src="${fotoUrl}" alt="${nombre}" class="admin-avatar-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'admin-avatar-initial\'>${inicial}</div>'">`;
        }
        
        return `<div class="admin-avatar-initial">${inicial}</div>`;
    }

    /**
     * Verifica si el usuario actual es Master (puede inactivar/reactivar)
     */
    esMaster() {
        return this.userManager && 
               this.userManager.currentUser && 
               this.userManager.currentUser.esMaster();
    }

    /**
     * Obtiene estadísticas
     */
    obtenerEstadisticas() {
        const total = this.administradoresFiltrados.length;
        const activos = this.administradoresFiltrados.filter(a => a.status).length;
        const inactivos = total - activos;
        
        return { total, activos, inactivos };
    }

    // ==================== MÉTODOS DE EXPORTACIÓN PDF ====================
    
    /**
     * Exporta la lista de administradores a PDF
     */
    async exportarPDF() {
        try {
            if (this.administradoresFiltrados.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin datos',
                    text: 'No hay administradores para exportar'
                });
                return;
            }
            
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espera mientras se genera el documento',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Crear un elemento contenedor temporal para el PDF
            const pdfContainer = document.createElement('div');
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.width = '800px';
            pdfContainer.style.backgroundColor = '#ffffff';
            pdfContainer.style.padding = '20px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            document.body.appendChild(pdfContainer);

            // Obtener la fecha actual para el reporte
            const fechaActual = new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Construir el contenido del PDF
            const estadisticas = this.obtenerEstadisticas();
            
            pdfContainer.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a472a; margin-bottom: 5px;">Sistema Centinela</h1>
                    <h2 style="color: #666; font-size: 18px; margin-top: 0;">Reporte de Administradores</h2>
                    <hr style="border: 1px solid #ddd;">
                    <p style="color: #888; font-size: 12px;">Fecha de generación: ${fechaActual}</p>
                    ${this.filtroBusqueda ? `<p style="color: #888; font-size: 11px;">Filtro aplicado: "${this.escapeHtml(this.filtroBusqueda)}"</p>` : ''}
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px;">
                    <div style="flex: 1; background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
                        <h3 style="margin: 0; color: #1a472a; font-size: 28px;">${estadisticas.total}</h3>
                        <p style="margin: 5px 0 0; color: #666;">Total Administradores</p>
                    </div>
                    <div style="flex: 1; background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
                        <h3 style="margin: 0; color: #28a745; font-size: 28px;">${estadisticas.activos}</h3>
                        <p style="margin: 5px 0 0; color: #666;">Activos</p>
                    </div>
                    <div style="flex: 1; background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
                        <h3 style="margin: 0; color: #dc3545; font-size: 28px;">${estadisticas.inactivos}</h3>
                        <p style="margin: 5px 0 0; color: #666;">Inactivos</p>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: #1a472a; color: white;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Nombre</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Email</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Organización</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Plan</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Estado</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fecha Creación</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.administradoresFiltrados.map(admin => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.escapeHtml(admin.nombreCompleto || 'Sin nombre')}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.escapeHtml(admin.correoElectronico || 'Sin email')}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.escapeHtml(admin.organizacion || 'Sin organización')}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${admin.plan || 'gratis'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${admin.status ? 'Activo' : 'Inactivo'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.formatearFecha(admin.fechaCreacion)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #888;">
                    <hr>
                    <p>Reporte generado por el Sistema Centinela - Gestión de Administradores</p>
                </div>
            `;

            // Usar html2canvas para capturar el contenido
            const canvas = await html2canvas(pdfContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            // Crear PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 280;
            const pageHeight = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Eliminar el contenedor temporal
            document.body.removeChild(pdfContainer);

            // Descargar PDF
            pdf.save(`reporte_administradores_${new Date().toISOString().split('T')[0]}.pdf`);
            
            Swal.fire({
                icon: 'success',
                title: 'PDF Generado',
                text: 'El reporte se ha descargado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el PDF: ' + error.message
            });
        }
    }

    // ==================== MÉTODOS DE ACCIONES ====================
    
    /**
     * Ver detalles del administrador
     */
    async verDetallesAdmin(admin) {
        try {
            Swal.fire({
                title: `Detalles de ${admin.nombreCompleto || 'Administrador'}`,
                html: `
                    <div style="text-align: left;">
                        <p><strong><i class="fas fa-user"></i> Nombre:</strong> ${this.escapeHtml(admin.nombreCompleto || 'No disponible')}</p>
                        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${this.escapeHtml(admin.correoElectronico || 'No disponible')}</p>
                        <p><strong><i class="fas fa-building"></i> Organización:</strong> ${this.escapeHtml(admin.organizacion || 'No disponible')}</p>
                        <p><strong><i class="fas fa-briefcase"></i> Cargo:</strong> ${this.escapeHtml(admin.cargo || 'No especificado')}</p>
                        <p><strong><i class="fas fa-chart-line"></i> Plan:</strong> ${admin.plan || 'gratis'}</p>
                        <p><strong><i class="fas ${admin.status ? 'fa-check-circle text-success' : 'fa-ban text-danger'}"></i> Estado:</strong> ${admin.status ? 'Activo' : 'Inactivo'}</p>
                        <p><strong><i class="fas fa-calendar-alt"></i> Fecha creación:</strong> ${this.formatearFechaCompleta(admin.fechaCreacion)}</p>
                        ${admin.ultimoLogin ? `<p><strong><i class="fas fa-clock"></i> Último login:</strong> ${this.formatearFechaCompleta(admin.ultimoLogin)}</p>` : ''}
                        ${admin.creadoPorNombre || admin.creadoPorEmail ? `<p><strong><i class="fas fa-user-plus"></i> Creado por:</strong> ${this.escapeHtml(admin.creadoPorNombre || admin.creadoPorEmail || 'Sistema')}</p>` : ''}
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#3085d6'
            });
        } catch (error) {
            console.error('Error viendo detalles:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los detalles'
            });
        }
    }

    /**
     * Inactivar administrador
     */
    async inactivarAdmin(admin) {
        const result = await Swal.fire({
            title: '¿Inactivar administrador?',
            html: `¿Estás seguro de que deseas inactivar a <strong>${this.escapeHtml(admin.nombreCompleto || admin.correoElectronico)}</strong>?<br><br>No podrá iniciar sesión hasta que sea reactivado.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, inactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33'
        });
        
        if (result.isConfirmed) {
            try {
                await this.userManager.inactivarUsuario(
                    admin.id, 
                    'administrador', 
                    admin.organizacionCamelCase,
                    this.userManager.currentUser
                );
                
                Swal.fire({
                    icon: 'success',
                    title: 'Inactivado',
                    text: `El administrador ${admin.nombreCompleto || admin.correoElectronico} ha sido inactivado correctamente`,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                // Recargar datos
                await this.cargarAdministradores();
                
            } catch (error) {
                console.error('Error inactivando administrador:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo inactivar el administrador: ' + error.message
                });
            }
        }
    }

    /**
     * Reactivar administrador
     */
    async reactivarAdmin(admin) {
        const result = await Swal.fire({
            title: '¿Reactivar administrador?',
            html: `¿Estás seguro de que deseas reactivar a <strong>${this.escapeHtml(admin.nombreCompleto || admin.correoElectronico)}</strong>?<br><br>Podrá iniciar sesión nuevamente.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745'
        });
        
        if (result.isConfirmed) {
            try {
                await this.userManager.reactivarUsuario(
                    admin.id, 
                    'administrador', 
                    admin.organizacionCamelCase,
                    this.userManager.currentUser
                );
                
                Swal.fire({
                    icon: 'success',
                    title: 'Reactivado',
                    text: `El administrador ${admin.nombreCompleto || admin.correoElectronico} ha sido reactivado correctamente`,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                // Recargar datos
                await this.cargarAdministradores();
                
            } catch (error) {
                console.error('Error reactivando administrador:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el administrador: ' + error.message
                });
            }
        }
    }

    /**
     * Exportar PDF individual del administrador
     */
    async exportarPDFIndividual(admin) {
        try {
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Crear contenedor temporal
            const pdfContainer = document.createElement('div');
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.width = '600px';
            pdfContainer.style.backgroundColor = '#ffffff';
            pdfContainer.style.padding = '20px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            document.body.appendChild(pdfContainer);

            const fechaActual = new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Obtener foto en base64 si existe
            let fotoHTML = '';
            const fotoUrl = admin.getFotoUrl();
            if (fotoUrl && !fotoUrl.includes('placeholder')) {
                fotoHTML = `<div style="text-align: center; margin-bottom: 20px;">
                    <img src="${fotoUrl}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #1a472a;">
                </div>`;
            }

            pdfContainer.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a472a; margin-bottom: 5px;">Sistema Centinela</h1>
                    <h2 style="color: #666; font-size: 16px; margin-top: 0;">Ficha de Administrador</h2>
                    <hr>
                    <p style="color: #888; font-size: 10px;">Fecha de generación: ${fechaActual}</p>
                </div>
                
                ${fotoHTML}
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Nombre completo:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.escapeHtml(admin.nombreCompleto || 'No disponible')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Correo electrónico:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.escapeHtml(admin.correoElectronico || 'No disponible')}</td>
                    </tr>
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Organización:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.escapeHtml(admin.organizacion || 'No disponible')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Cargo:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.escapeHtml(admin.cargo || 'No especificado')}</td>
                    </tr>
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Plan:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${admin.plan || 'gratis'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Estado:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${admin.status ? 'Activo' : 'Inactivo'}</td>
                    </tr>
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Fecha de creación:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.formatearFechaCompleta(admin.fechaCreacion)}</td>
                    </tr>
                    ${admin.ultimoLogin ? `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Último inicio de sesión:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.formatearFechaCompleta(admin.ultimoLogin)}</td>
                    </tr>
                    ` : ''}
                    ${admin.creadoPorNombre || admin.creadoPorEmail ? `
                    <tr style="background: #f5f5f5;">
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Creado por:</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${this.escapeHtml(admin.creadoPorNombre || admin.creadoPorEmail || 'Sistema')}</td>
                    </tr>
                    ` : ''}
                </table>
                
                <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #888;">
                    <hr>
                    <p>Documento generado por el Sistema Centinela - Gestión de Administradores</p>
                </div>
            `;

            const canvas = await html2canvas(pdfContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 190;
            const pageHeight = 277;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            document.body.removeChild(pdfContainer);

            pdf.save(`administrador_${admin.nombreCompleto?.replace(/\s/g, '_') || admin.id}_${new Date().toISOString().split('T')[0]}.pdf`);
            
            Swal.fire({
                icon: 'success',
                title: 'PDF Generado',
                text: 'La ficha del administrador se ha descargado',
                timer: 1500,
                showConfirmButton: false
            });
            
        } catch (error) {
            console.error('Error generando PDF individual:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el PDF'
            });
        }
    }

    // ==================== MÉTODOS DE LA VISTA ====================
    
    /**
     * Espera a que el usuario esté cargado
     */
    async esperarUsuarioCargado() {
        return new Promise((resolve) => {
            if (this.userManager.currentUser) {
                resolve();
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (this.userManager.currentUser) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    /**
     * Inicializa la página
     */
    async init() {
        try {
            console.log('🚀 Iniciando ListarAdministradoresUI...');
            
            // Crear instancia de UserManager
            this.userManager = new UserManager();
            
            // Esperar usuario cargado
            await this.esperarUsuarioCargado();
            
            if (!this.userManager.currentUser) {
                console.error('❌ No hay usuario autenticado');
                Swal.fire({
                    icon: 'error',
                    title: 'Error de autenticación',
                    text: 'Debes iniciar sesión para acceder a esta página'
                }).then(() => {
                    window.location.href = '/login.html';
                });
                return;
            }

            console.log('👤 Usuario actual:', this.userManager.currentUser.correoElectronico);
            console.log('🎭 Rol:', this.userManager.currentUser.rol);

            // Verificar permisos
            if (!this.userManager.currentUser.esMaster() && 
                !this.userManager.currentUser.esAdministrador()) {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso denegado',
                    text: 'No tienes permisos para ver esta página'
                }).then(() => {
                    window.location.href = '/dashboard.html';
                });
                return;
            }

            // Cargar datos
            await this.cargarAdministradores();
            
            // Configurar eventos
            this.configurarEventos();
            
            console.log('✅ ListarAdministradoresUI inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando página:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la página. Intenta nuevamente.\n' + error.message
            });
        }
    }

    /**
     * Carga administradores
     */
    async cargarAdministradores() {
        try {
            this.mostrarLoading();
            await this.obtenerAdministradores();
            this.renderizarTabla();
            this.renderizarPaginacion();
            this.mostrarEstadisticas();
        } catch (error) {
            console.error('❌ Error cargando administradores:', error);
            this.mostrarError('No se pudieron cargar los administradores: ' + error.message);
        }
    }

    /**
     * Muestra loading
     */
    mostrarLoading() {
        if (this.elementos.tablaBody) {
            this.elementos.tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                        <p style="margin-top: 10px;">Cargando administradores...</p>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Muestra error
     */
    mostrarError(mensaje) {
        if (this.elementos.tablaBody) {
            this.elementos.tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ff4d4d;"></i>
                        <p style="margin-top: 10px;">${mensaje}</p>
                        <button class="btn-recargar" style="margin-top: 15px; padding: 8px 16px; background: #0f0f0f; border: 1px solid #00cfff; border-radius: 8px; color: white; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </td>
                </tr>
            `;
            
            const btnRecargar = document.querySelector('.btn-recargar');
            if (btnRecargar) {
                btnRecargar.addEventListener('click', () => {
                    this.cargarAdministradores();
                });
            }
        }
    }

    /**
     * Renderiza la tabla
     */
    renderizarTabla() {
        if (!this.elementos.tablaBody) return;
        
        const administradores = this.obtenerAdministradoresPaginados();
        const esMaster = this.esMaster();
        
        if (administradores.length === 0) {
            this.elementos.tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p style="margin-top: 10px;">No se encontraron administradores</p>
                        ${this.filtroBusqueda ? '<small>Intenta con otro término de búsqueda</small>' : ''}
                    </td>
                </tr>
            `;
            return;
        }
        
        this.elementos.tablaBody.innerHTML = administradores.map(admin => {
            const avatarHTML = this.getAvatarHTML(admin);
            const nombre = this.escapeHtml(admin.nombreCompleto || 'Sin nombre');
            const email = this.escapeHtml(admin.correoElectronico || 'Sin email');
            const organizacion = admin.organizacion ? this.escapeHtml(admin.organizacion) : '<span class="text-muted">Sin organización</span>';
            
            return `
                <tr data-id="${admin.id}">
                    <td data-label="Avatar">
                        <div class="admin-avatar">${avatarHTML}</div>
                    </td>
                    <td data-label="Nombre / Email">
                        <div class="admin-info">
                            <strong class="admin-nombre">${nombre}</strong>
                            <small class="admin-email">${email}</small>
                        </div>
                    </td>
                    <td data-label="Rol">${this.getRolBadge()}</td>
                    <td data-label="Organización">${organizacion}</td>
                    <td data-label="Plan">${this.getPlanBadge(admin.plan)}</td>
                    <td data-label="Estado">${this.getEstadoBadge(admin.status)}</td>
                    <td data-label="Acciones">
                        <div class="btn-group-acciones">
                            <button class="btn-accion btn-ver" data-id="${admin.id}" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${esMaster ? `
                                ${admin.status ? 
                                    `<button class="btn-accion btn-inactivar" data-id="${admin.id}" title="Inactivar">
                                        <i class="fas fa-ban"></i>
                                    </button>` :
                                    `<button class="btn-accion btn-reactivar" data-id="${admin.id}" title="Reactivar">
                                        <i class="fas fa-check-circle"></i>
                                    </button>`
                                }
                            ` : ''}
                            <button class="btn-accion btn-pdf-individual" data-id="${admin.id}" title="Exportar a PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Configurar eventos de los botones
        this.configurarEventosBotones();
    }

    /**
     * Renderiza paginación
     */
    renderizarPaginacion() {
        if (!this.elementos.pagination) return;
        
        const info = this.obtenerInfoPaginacion();
        const totalPaginas = info.totalPaginas;
        const paginaActual = info.paginaActual;
        
        if (this.elementos.paginationInfo) {
            if (info.total > 0) {
                this.elementos.paginationInfo.innerHTML = `Mostrando ${info.inicio} - ${info.fin} de ${info.total} administradores`;
            } else {
                this.elementos.paginationInfo.innerHTML = 'No hay administradores para mostrar';
            }
        }
        
        if (totalPaginas <= 1) {
            this.elementos.pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        paginationHTML += `
            <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginaActual - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        const startPage = Math.max(1, paginaActual - 2);
        const endPage = Math.min(totalPaginas, paginaActual + 2);
        
        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === paginaActual ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        if (endPage < totalPaginas) {
            if (endPage < totalPaginas - 1) paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPaginas}">${totalPaginas}</a></li>`;
        }
        
        paginationHTML += `
            <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginaActual + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        this.elementos.pagination.innerHTML = paginationHTML;
        
        this.elementos.pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                if (page && !isNaN(page) && page !== this.paginaActual) {
                    this.irPagina(page);
                    this.renderizarTabla();
                    this.renderizarPaginacion();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    /**
     * Muestra estadísticas
     */
    mostrarEstadisticas() {
        const estadisticas = this.obtenerEstadisticas();
        
        if (this.elementos.totalEstadisticas) {
            this.elementos.totalEstadisticas.textContent = estadisticas.total;
        }
        if (this.elementos.activosEstadisticas) {
            this.elementos.activosEstadisticas.textContent = estadisticas.activos;
        }
    }

    /**
     * Configura eventos principales
     */
    configurarEventos() {
        if (this.elementos.btnBuscar) {
            this.elementos.btnBuscar.addEventListener('click', () => {
                this.buscarAdministradores();
            });
        }
        
        if (this.elementos.buscarInput) {
            this.elementos.buscarInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarAdministradores();
            });
        }
        
        if (this.elementos.btnLimpiar) {
            this.elementos.btnLimpiar.addEventListener('click', () => {
                this.limpiarBusqueda();
            });
        }
        
        // Botón exportar PDF global
        if (this.elementos.btnExportarPDF) {
            this.elementos.btnExportarPDF.addEventListener('click', () => {
                this.exportarPDF();
            });
        }
    }

    /**
     * Configura eventos de los botones de acción
     */
    configurarEventosBotones() {
        // Botones de ver detalles
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.verDetallesAdmin(admin);
                }
            });
        });
        
        // Botones de inactivar
        document.querySelectorAll('.btn-inactivar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.inactivarAdmin(admin);
                }
            });
        });
        
        // Botones de reactivar
        document.querySelectorAll('.btn-reactivar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.reactivarAdmin(admin);
                }
            });
        });
        
        // Botones de PDF individual
        document.querySelectorAll('.btn-pdf-individual').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.exportarPDFIndividual(admin);
                }
            });
        });
    }

    /**
     * Busca administradores
     */
    async buscarAdministradores() {
        const busqueda = this.elementos.buscarInput?.value || '';
        this.setFiltroBusqueda(busqueda);
        this.renderizarTabla();
        this.renderizarPaginacion();
        this.mostrarEstadisticas();
    }

    /**
     * Limpia búsqueda
     */
    async limpiarBusqueda() {
        if (this.elementos.buscarInput) {
            this.elementos.buscarInput.value = '';
        }
        this.limpiarFiltros();
        this.renderizarTabla();
        this.renderizarPaginacion();
        this.mostrarEstadisticas();
    }

    /**
     * Escapa HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    const listarAdmin = new ListarAdministradoresUI();
    listarAdmin.init();
});

export default ListarAdministradoresUI;