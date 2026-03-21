// controladorAdministradores.js
// Controlador para gestionar la lista de administradores

class ControladorAdministradores {
    constructor(userManager) {
        this.userManager = userManager;
        this.administradores = [];
        this.administradoresFiltrados = [];
        this.paginaActual = 1;
        this.elementosPorPagina = 10;
        this.filtroBusqueda = '';
    }

    /**
     * Obtiene todos los administradores del sistema usando los métodos de UserManager
     * @returns {Promise<Array>} Lista de administradores
     */
    async obtenerAdministradores() {
        try {
            if (!this.userManager) {
                throw new Error('UserManager no disponible');
            }

            console.log('🔄 Cargando administradores...');
            
            // Obtener masters (administradores del sistema)
            const masters = await this.userManager.getMasters();
            console.log(`✅ Masters encontrados: ${masters.length}`);
            
            // Obtener administradores de organizaciones
            const administradores = await this.userManager.getAdministradores(true);
            console.log(`✅ Administradores encontrados: ${administradores.length}`);
            
            // Combinar ambas listas
            this.administradores = [...masters, ...administradores];
            console.log(`📊 Total administradores: ${this.administradores.length}`);
            
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
        
        // Aplicar filtro de búsqueda (por nombre, email u organización)
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
        this.paginaActual = 1; // Resetear a primera página
        
        return this.administradoresFiltrados;
    }

    /**
     * Establece el filtro de búsqueda
     * @param {string} texto - Texto a buscar
     */
    setFiltroBusqueda(texto) {
        this.filtroBusqueda = texto;
        this.aplicarFiltros();
    }

    /**
     * Limpia los filtros de búsqueda
     */
    limpiarFiltros() {
        this.filtroBusqueda = '';
        this.aplicarFiltros();
    }

    /**
     * Obtiene los administradores para la página actual
     * @returns {Array} Administradores paginados
     */
    obtenerAdministradoresPaginados() {
        const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
        const fin = inicio + this.elementosPorPagina;
        return this.administradoresFiltrados.slice(inicio, fin);
    }

    /**
     * Cambia a una página específica
     * @param {number} pagina - Número de página
     */
    irPagina(pagina) {
        const totalPaginas = this.obtenerTotalPaginas();
        if (pagina >= 1 && pagina <= totalPaginas) {
            this.paginaActual = pagina;
        }
    }

    /**
     * Obtiene el total de páginas
     * @returns {number} Total de páginas
     */
    obtenerTotalPaginas() {
        return Math.ceil(this.administradoresFiltrados.length / this.elementosPorPagina);
    }

    /**
     * Obtiene información de paginación
     * @returns {Object} Información de paginación
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
     * Formatea la fecha para mostrar
     * @param {Date|Object} fecha - Fecha a formatear
     * @returns {string} Fecha formateada
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
                    day: '2-digit',
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
     * Obtiene el badge del plan del administrador
     * @param {string} plan - Plan del administrador
     * @returns {string} HTML del badge
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
     * Obtiene el badge del rol del administrador
     * @param {string} rol - Rol del usuario
     * @returns {string} HTML del badge
     */
    getRolBadge(rol) {
        if (rol === 'master') {
            return '<span class="badge badge-master"><i class="fas fa-dragon"></i> Master</span>';
        }
        return '<span class="badge badge-admin"><i class="fas fa-user-shield"></i> Administrador</span>';
    }

    /**
     * Obtiene el badge de estado
     * @param {boolean} status - Estado del usuario
     * @returns {string} HTML del badge
     */
    getEstadoBadge(status) {
        if (status) {
            return '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Activo</span>';
        }
        return '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactivo</span>';
    }

    /**
     * Genera el HTML para el avatar del administrador
     * @param {User} admin - Usuario administrador
     * @returns {string} HTML del avatar
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
     * Verifica si el usuario actual tiene permisos para gestionar administradores
     * @returns {boolean} True si tiene permisos
     */
    tienePermisoGestion() {
        return this.userManager && 
               this.userManager.currentUser && 
               (this.userManager.currentUser.esMaster() || 
                this.userManager.currentUser.esAdministrador());
    }

    /**
     * Verifica si el usuario actual es Master (puede ver todos los administradores)
     * @returns {boolean} True si es Master
     */
    esMaster() {
        return this.userManager && 
               this.userManager.currentUser && 
               this.userManager.currentUser.esMaster();
    }

    /**
     * Obtiene estadísticas de administradores
     * @returns {Object} Estadísticas
     */
    obtenerEstadisticas() {
        const total = this.administradoresFiltrados.length;
        const activos = this.administradoresFiltrados.filter(a => a.status).length;
        const inactivos = total - activos;
        const masters = this.administradoresFiltrados.filter(a => a.rol === 'master').length;
        const admins = total - masters;
        
        // Estadísticas por plan
        const planes = {
            gratis: 0,
            basico: 0,
            premium: 0,
            empresa: 0
        };
        
        this.administradoresFiltrados.forEach(admin => {
            if (admin.plan && planes[admin.plan] !== undefined) {
                planes[admin.plan]++;
            } else {
                planes.gratis++;
            }
        });
        
        return {
            total,
            activos,
            inactivos,
            masters,
            admins,
            planes
        };
    }
}

// Exportar el controlador
export default ControladorAdministradores;

