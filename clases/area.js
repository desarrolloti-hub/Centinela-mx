// ==================== CLASE AREA ====================
// Clase que representa un área/departamento en el sistema
// USANDO MAP para cargos (optimizado para Firebase)

class Area {
    constructor(id, data) {
        // ID único del área (generado por Firestore)
        this.id = id;
        
        // Datos básicos del área
        this.nombreArea = data.nombreArea || '';
        this.descripcion = data.descripcion || '';
        this.caracteristicas = data.caracteristicas || '';
        
        // Cargos dentro del área (USANDO MAP)
        // Estructura: { [cargoId]: { nombre, descripcion, ... } }
        this.cargos = data.cargos || new Map();
        
        // Si vienen de Firestore (objeto), convertir a Map
        if (data.cargos && !(data.cargos instanceof Map)) {
            if (Array.isArray(data.cargos)) {
                // Si es array, convertir a Map
                this.cargos = new Map();
                data.cargos.forEach(cargo => {
                    if (cargo && cargo.id) {
                        this.cargos.set(cargo.id, cargo);
                    }
                });
            } else if (typeof data.cargos === 'object') {
                // Si es objeto, crear Map desde Object.entries
                this.cargos = new Map(Object.entries(data.cargos));
            }
        }
        
        // Relación con organización
        this.idOrganizacion = data.idOrganizacion || '';
        this.nombreOrganizacion = data.nombreOrganizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        
        // Metadatos
        this.creadoPor = data.creadoPor || '';
        this.actualizadoPor = data.actualizadoPor || '';
        this.fechaCreacion = data.fechaCreacion || new Date();
        this.fechaActualizacion = data.fechaActualizacion || new Date();
        this.fechaEliminacion = data.fechaEliminacion || null;
        
        // Estado
        this.activo = data.activo !== undefined ? data.activo : true;
        this.eliminado = data.eliminado || false;
        
        // Configuraciones adicionales
        this.color = data.color || this._generarColorAleatorio();
        this.icono = data.icono || 'fas fa-building';
        this.capacidadMaxima = data.capacidadMaxima || 0; // 0 = ilimitado
        this.presupuestoAnual = data.presupuestoAnual || 0;
        this.objetivos = data.objetivos || [];
        this.metricas = data.metricas || {};
        
        console.log(`Area ${id} creada:`, {
            nombreArea: this.nombreArea,
            organizacion: this.nombreOrganizacion,
            totalCargos: this.cargos.size,
            activo: this.activo
        });
    }

    // ========== MÉTODOS DE UTILIDAD ==========
    
    /**
     * Genera un color aleatorio para el área
     * @returns {string} Color hexadecimal
     */
    _generarColorAleatorio() {
        const colores = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
            '#2c3e50', '#27ae60', '#e67e22', '#2980b9', '#f1c40f'
        ];
        return colores[Math.floor(Math.random() * colores.length)];
    }

    /**
     * Formatea la fecha para mostrar
     * @param {Date} date - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    _formatearFecha(date) {
        if (!date) return 'No disponible';
        try {
            const fecha = date.toDate ? date.toDate() : new Date(date);
            return fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    }

    /**
     * Convierte Map a objeto para Firestore
     * @param {Map} map - Mapa a convertir
     * @returns {Object} Objeto para Firestore
     */
    _mapToObject(map) {
        const obj = {};
        for (let [key, value] of map) {
            obj[key] = value;
        }
        return obj;
    }

    // ========== GETTERS PARA CARGOS (USANDO MAP) ==========
    
    /**
     * Obtiene todos los cargos del área
     * @returns {Map} Map de cargos
     */
    getCargos() {
        return this.cargos;
    }

    /**
     * Obtiene un cargo específico por ID
     * @param {string} cargoId - ID del cargo
     * @returns {Object|null} Cargo o null si no existe
     */
    getCargoById(cargoId) {
        return this.cargos.get(cargoId) || null;
    }

    /**
     * Obtiene un cargo específico por nombre
     * @param {string} nombreCargo - Nombre del cargo
     * @returns {Object|null} Cargo o null si no existe
     */
    getCargoByNombre(nombreCargo) {
        for (let [id, cargo] of this.cargos) {
            if (cargo.nombre.toLowerCase() === nombreCargo.toLowerCase()) {
                return { id, ...cargo };
            }
        }
        return null;
    }

    /**
     * Obtiene la cantidad de cargos en el área
     * @returns {number} Número de cargos
     */
    getCantidadCargos() {
        return this.cargos.size;
    }

    /**
     * Obtiene los nombres de todos los cargos
     * @returns {Array} Array de nombres de cargos
     */
    getNombresCargos() {
        const nombres = [];
        for (let cargo of this.cargos.values()) {
            nombres.push(cargo.nombre);
        }
        return nombres;
    }

    /**
     * Obtiene todos los cargos como array
     * @returns {Array} Array de cargos con IDs
     */
    getCargosAsArray() {
        const cargosArray = [];
        for (let [id, cargo] of this.cargos) {
            cargosArray.push({
                id: id,
                ...cargo
            });
        }
        return cargosArray;
    }

    /**
     * Obtiene cargos activos solamente
     * @returns {Array} Array de cargos activos
     */
    getCargosActivos() {
        const cargosActivos = [];
        for (let [id, cargo] of this.cargos) {
            if (cargo.activo !== false) {
                cargosActivos.push({
                    id: id,
                    ...cargo
                });
            }
        }
        return cargosActivos;
    }

    /**
     * Obtiene cargos por nivel
     * @param {number} nivel - Nivel del cargo
     * @returns {Array} Array de cargos del nivel especificado
     */
    getCargosPorNivel(nivel) {
        const cargosNivel = [];
        for (let [id, cargo] of this.cargos) {
            if (cargo.nivel === nivel) {
                cargosNivel.push({
                    id: id,
                    ...cargo
                });
            }
        }
        return cargosNivel;
    }

    /**
     * Busca cargos por término
     * @param {string} termino - Término de búsqueda
     * @returns {Array} Array de cargos que coinciden
     */
    buscarCargos(termino) {
        const resultados = [];
        const terminoLower = termino.toLowerCase();
        
        for (let [id, cargo] of this.cargos) {
            if (cargo.nombre.toLowerCase().includes(terminoLower) ||
                (cargo.descripcion && cargo.descripcion.toLowerCase().includes(terminoLower))) {
                resultados.push({
                    id: id,
                    ...cargo
                });
            }
        }
        return resultados;
    }

    // ========== SETTERS PARA CARGOS (USANDO MAP) ==========
    
    /**
     * Agrega un cargo al área
     * @param {Object} cargo - Cargo a agregar
     * @param {string} usuarioId - ID del usuario que lo crea
     * @returns {Object} Resultado de la operación
     */
    agregarCargo(cargo, usuarioId = '') {
        if (!cargo.id || !cargo.nombre) {
            throw new Error('Cargo debe tener id y nombre');
        }

        // Verificar si ya existe
        if (this.cargos.has(cargo.id)) {
            throw new Error(`Cargo con ID ${cargo.id} ya existe`);
        }

        const nuevoCargo = {
            nombre: cargo.nombre,
            descripcion: cargo.descripcion || '',
            nivel: cargo.nivel || 1,
            salarioBase: cargo.salarioBase || 0,
            requisitos: cargo.requisitos || [],
            permisos: cargo.permisos || [],
            activo: cargo.activo !== undefined ? cargo.activo : true,
            fechaCreacion: new Date(),
            fechaActualizacion: new Date(),
            creadoPor: usuarioId,
            actualizadoPor: usuarioId
        };

        this.cargos.set(cargo.id, nuevoCargo);
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;

        return {
            id: cargo.id,
            ...nuevoCargo,
            success: true,
            message: 'Cargo agregado exitosamente'
        };
    }

    /**
     * Actualiza un cargo existente
     * @param {string} cargoId - ID del cargo
     * @param {Object} nuevosDatos - Nuevos datos del cargo
     * @param {string} usuarioId - ID del usuario que actualiza
     * @returns {Object} Resultado de la operación
     */
    actualizarCargo(cargoId, nuevosDatos, usuarioId = '') {
        if (!this.cargos.has(cargoId)) {
            throw new Error(`Cargo con ID ${cargoId} no encontrado`);
        }

        const cargoActual = this.cargos.get(cargoId);
        
        // Actualizar el cargo
        const cargoActualizado = {
            ...cargoActual,
            ...nuevosDatos,
            fechaActualizacion: new Date(),
            actualizadoPor: usuarioId
        };

        this.cargos.set(cargoId, cargoActualizado);
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;

        return {
            id: cargoId,
            ...cargoActualizado,
            success: true,
            message: 'Cargo actualizado exitosamente'
        };
    }

    /**
     * Elimina un cargo del área
     * @param {string} cargoId - ID del cargo
     * @param {string} usuarioId - ID del usuario que elimina
     * @returns {Object} Resultado de la operación
     */
    eliminarCargo(cargoId, usuarioId = '') {
        if (!this.cargos.has(cargoId)) {
            throw new Error(`Cargo con ID ${cargoId} no encontrado`);
        }

        const cargoEliminado = this.cargos.get(cargoId);
        this.cargos.delete(cargoId);
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;

        return {
            id: cargoId,
            ...cargoEliminado,
            success: true,
            message: 'Cargo eliminado exitosamente'
        };
    }

    /**
     * Marca un cargo como inactivo
     * @param {string} cargoId - ID del cargo
     * @param {string} usuarioId - ID del usuario que realiza la acción
     * @returns {Object} Resultado de la operación
     */
    desactivarCargo(cargoId, usuarioId = '') {
        return this.actualizarCargo(cargoId, {
            activo: false,
            fechaDesactivacion: new Date()
        }, usuarioId);
    }

    /**
     * Marca un cargo como activo
     * @param {string} cargoId - ID del cargo
     * @param {string} usuarioId - ID del usuario que realiza la acción
     * @returns {Object} Resultado de la operación
     */
    activarCargo(cargoId, usuarioId = '') {
        return this.actualizarCargo(cargoId, {
            activo: true,
            fechaReactivacion: new Date()
        }, usuarioId);
    }

    /**
     * Agrega un permiso a un cargo
     * @param {string} cargoId - ID del cargo
     * @param {string} permiso - Permiso a agregar
     * @param {string} usuarioId - ID del usuario que agrega
     * @returns {Object} Resultado de la operación
     */
    agregarPermisoACargo(cargoId, permiso, usuarioId = '') {
        if (!this.cargos.has(cargoId)) {
            throw new Error(`Cargo con ID ${cargoId} no encontrado`);
        }

        const cargo = this.cargos.get(cargoId);
        const permisos = cargo.permisos || [];
        
        if (!permisos.includes(permiso)) {
            permisos.push(permiso);
        }

        return this.actualizarCargo(cargoId, {
            permisos: permisos
        }, usuarioId);
    }

    /**
     * Elimina un permiso de un cargo
     * @param {string} cargoId - ID del cargo
     * @param {string} permiso - Permiso a eliminar
     * @param {string} usuarioId - ID del usuario que elimina
     * @returns {Object} Resultado de la operación
     */
    eliminarPermisoDeCargo(cargoId, permiso, usuarioId = '') {
        if (!this.cargos.has(cargoId)) {
            throw new Error(`Cargo con ID ${cargoId} no encontrado`);
        }

        const cargo = this.cargos.get(cargoId);
        const permisos = cargo.permisos || [];
        const index = permisos.indexOf(permiso);
        
        if (index > -1) {
            permisos.splice(index, 1);
        }

        return this.actualizarCargo(cargoId, {
            permisos: permisos
        }, usuarioId);
    }

    // ========== GETTERS GENERALES ==========
    
    /**
     * Obtiene el nombre del área
     * @returns {string} Nombre del área
     */
    getNombre() {
        return this.nombreArea;
    }

    /**
     * Obtiene la descripción del área
     * @returns {string} Descripción
     */
    getDescripcion() {
        return this.descripcion;
    }

    /**
     * Obtiene las características del área
     * @returns {string} Características
     */
    getCaracteristicas() {
        return this.caracteristicas;
    }

    /**
     * Obtiene información de la organización
     * @returns {Object} Información de la organización
     */
    getOrganizacionInfo() {
        return {
            id: this.idOrganizacion,
            nombre: this.nombreOrganizacion,
            camelCase: this.organizacionCamelCase
        };
    }

    /**
     * Obtiene el estado del área
     * @returns {string} Estado formateado
     */
    getEstado() {
        if (this.eliminado) {
            return 'Eliminado';
        } else if (!this.activo) {
            return 'Inactivo';
        } else {
            return 'Activo';
        }
    }

    /**
     * Obtiene un badge HTML para mostrar el estado
     * @returns {string} HTML del badge
     */
    getEstadoBadge() {
        if (this.eliminado) {
            return `<span style="background: #dc3545; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-trash"></i> Eliminado
            </span>`;
        } else if (!this.activo) {
            return `<span style="background: #ffc107; color: black; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-pause"></i> Inactivo
            </span>`;
        } else {
            return `<span style="background: #28a745; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">
                <i class="fas fa-check"></i> Activo
            </span>`;
        }
    }

    /**
     * Obtiene la fecha de creación formateada
     * @returns {string} Fecha formateada
     */
    getFechaCreacionFormateada() {
        return this._formatearFecha(this.fechaCreacion);
    }

    /**
     * Obtiene la fecha de actualización formateada
     * @returns {string} Fecha formateada
     */
    getFechaActualizacionFormateada() {
        return this._formatearFecha(this.fechaActualizacion);
    }

    /**
     * Obtiene el color del área
     * @returns {string} Color hexadecimal
     */
    getColor() {
        return this.color;
    }

    /**
     * Obtiene el icono del área
     * @returns {string} Clase del icono
     */
    getIcono() {
        return this.icono;
    }

    /**
     * Obtiene información del creador
     * @returns {Object} Información del creador
     */
    getCreadorInfo() {
        return {
            id: this.creadoPor,
            texto: this.creadoPor || 'Sistema'
        };
    }

    /**
     * Obtiene información del último actualizador
     * @returns {Object} Información del actualizador
     */
    getActualizadorInfo() {
        return {
            id: this.actualizadoPor,
            texto: this.actualizadoPor || 'Sistema'
        };
    }

    /**
     * Verifica si el área está activa
     * @returns {boolean} True si está activa
     */
    estaActiva() {
        return this.activo && !this.eliminado;
    }

    // ========== SETTERS GENERALES ==========
    
    /**
     * Establece el nombre del área
     * @param {string} nombre - Nuevo nombre
     * @param {string} usuarioId - ID del usuario que actualiza
     */
    setNombre(nombre, usuarioId = '') {
        this.nombreArea = nombre;
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;
    }

    /**
     * Establece la descripción del área
     * @param {string} descripcion - Nueva descripción
     * @param {string} usuarioId - ID del usuario que actualiza
     */
    setDescripcion(descripcion, usuarioId = '') {
        this.descripcion = descripcion;
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;
    }

    /**
     * Establece las características del área
     * @param {string} caracteristicas - Nuevas características
     * @param {string} usuarioId - ID del usuario que actualiza
     */
    setCaracteristicas(caracteristicas, usuarioId = '') {
        this.caracteristicas = caracteristicas;
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;
    }

    /**
     * Establece la organización del área
     * @param {string} idOrganizacion - ID de la organización
     * @param {string} nombreOrganizacion - Nombre de la organización
     * @param {string} organizacionCamelCase - Nombre en camelCase
     * @param {string} usuarioId - ID del usuario que actualiza
     */
    setOrganizacion(idOrganizacion, nombreOrganizacion, organizacionCamelCase, usuarioId = '') {
        this.idOrganizacion = idOrganizacion;
        this.nombreOrganizacion = nombreOrganizacion;
        this.organizacionCamelCase = organizacionCamelCase;
        this.fechaActualizacion = new Date();
        this.actualizadoPor = usuarioId;
    }

    /**
     * Marca el área como eliminada
     * @param {string} usuarioId - ID del usuario que elimina
     */
    setEliminado(usuarioId = '') {
        this.eliminado = true;
        this.activo = false;
        this.fechaEliminacion = new Date();
        this.actualizadoPor = usuarioId;
        this.fechaActualizacion = new Date();
    }

    /**
     * Restaura un área eliminada
     * @param {string} usuarioId - ID del usuario que restaura
     */
    restaurar(usuarioId = '') {
        this.eliminado = false;
        this.activo = true;
        this.fechaEliminacion = null;
        this.actualizadoPor = usuarioId;
        this.fechaActualizacion = new Date();
    }

    // ========== MÉTODOS DE CONVERSIÓN ==========
    
    /**
     * Obtiene datos para Firestore
     * @returns {Object} Datos estructurados para Firestore
     */
    toFirestore() {
        return {
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            cargos: this._mapToObject(this.cargos), // Convertir Map a objeto
            idOrganizacion: this.idOrganizacion,
            nombreOrganizacion: this.nombreOrganizacion,
            organizacionCamelCase: this.organizacionCamelCase,
            creadoPor: this.creadoPor,
            actualizadoPor: this.actualizadoPor,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion,
            fechaEliminacion: this.fechaEliminacion,
            activo: this.activo,
            eliminado: this.eliminado,
            color: this.color,
            icono: this.icono,
            capacidadMaxima: this.capacidadMaxima,
            presupuestoAnual: this.presupuestoAnual,
            objetivos: this.objetivos,
            metricas: this.metricas
        };
    }

    /**
     * Obtiene datos para mostrar en interfaz
     * @returns {Object} Datos para la UI
     */
    toUI() {
        return {
            id: this.id,
            nombreArea: this.nombreArea,
            descripcion: this.descripcion,
            caracteristicas: this.caracteristicas,
            totalCargos: this.cargos.size,
            cargosActivos: this.getCargosActivos().length,
            cargos: this.getCargosAsArray(), // Para mostrar en UI
            organizacion: this.nombreOrganizacion,
            estado: this.getEstado(),
            estadoBadge: this.getEstadoBadge(),
            color: this.color,
            icono: this.icono,
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            creadoPor: this.creadoPor,
            capacidadMaxima: this.capacidadMaxima,
            presupuestoAnual: this.presupuestoAnual.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'USD'
            }),
            objetivos: this.objetivos.length,
            metricas: Object.keys(this.metricas).length
        };
    }
}

// ==================== CLASE AREAMANAGER ====================
// Clase para gestionar las áreas en el sistema

class AreaManager {
    constructor() {
        // Array para almacenar áreas en memoria
        this.areas = [];
        
        console.log('AreaManager inicializado');
    }

    // ========== MÉTODOS DE CREACIÓN ==========
    
    /**
     * Crea una nueva área
     * @param {Object} areaData - Datos del área
     * @param {string} idOrganizacion - ID de la organización
     * @param {UserManager} userManager - Instancia de UserManager
     * @returns {Promise<Area>} Nueva área creada
     */
    async crearArea(areaData, idOrganizacion, userManager) {
        try {
            console.log('Creando nueva área:', areaData.nombreArea);
            
            if (!userManager || !userManager.currentUser) {
                throw new Error('Usuario no autenticado');
            }
            
            const usuarioActual = userManager.currentUser;
            
            // Verificar permisos
            if (usuarioActual.cargo !== 'administrador') {
                throw new Error('Solo los administradores pueden crear áreas');
            }
            
            // Verificar que no exista área con el mismo nombre
            const existeArea = await this.verificarAreaExistente(
                areaData.nombreArea, 
                usuarioActual.organizacionCamelCase
            );
            
            if (existeArea) {
                throw new Error('Ya existe un área con ese nombre en esta organización');
            }
            
            // Obtener datos de la organización
            let organizacionData;
            if (usuarioActual.cargo === 'administrador') {
                const orgRef = doc(db, "administradores", usuarioActual.id);
                const orgSnap = await getDoc(orgRef);
                if (orgSnap.exists()) {
                    organizacionData = orgSnap.data();
                }
            }
            
            // Generar ID para el área
            const areaId = this._generarAreaId(areaData.nombreArea, usuarioActual.organizacionCamelCase);
            
            // Preparar datos para Firestore
            const areaFirestoreData = {
                nombreArea: areaData.nombreArea,
                descripcion: areaData.descripcion || '',
                caracteristicas: areaData.caracteristicas || '',
                cargos: areaData.cargos || {}, // Objeto vacío para Map
                idOrganizacion: idOrganizacion || usuarioActual.id,
                nombreOrganizacion: organizacionData?.organizacion || usuarioActual.organizacion,
                organizacionCamelCase: usuarioActual.organizacionCamelCase,
                creadoPor: usuarioActual.id,
                actualizadoPor: usuarioActual.id,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                fechaEliminacion: null,
                activo: true,
                eliminado: false,
                color: areaData.color || this._generarColorAleatorio(),
                icono: areaData.icono || 'fas fa-building',
                capacidadMaxima: areaData.capacidadMaxima || 0,
                presupuestoAnual: areaData.presupuestoAnual || 0,
                objetivos: areaData.objetivos || [],
                metricas: areaData.metricas || {}
            };
            
            // Guardar en Firestore
            const areaRef = doc(db, "areas", areaId);
            await setDoc(areaRef, areaFirestoreData);
            
            // Crear instancia de Area
            const nuevaArea = new Area(areaId, {
                ...areaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            // Agregar a memoria
            this.areas.unshift(nuevaArea);
            
            console.log('✅ Área creada exitosamente:', nuevaArea.nombreArea);
            return nuevaArea;
            
        } catch (error) {
            console.error("❌ Error creando área:", error);
            throw error;
        }
    }

    // ========== MÉTODOS DE OBTENCIÓN ==========
    
    /**
     * Obtiene todas las áreas de una organización
     * @param {string} organizacionCamelCase - Organización en camelCase
     * @param {boolean} incluirEliminadas - Incluir áreas eliminadas
     * @returns {Promise<Array<Area>>} Array de áreas
     */
    async getAreasByOrganizacion(organizacionCamelCase, incluirEliminadas = false) {
        try {
            console.log(`Obteniendo áreas para organización: ${organizacionCamelCase}`);
            
            let areasQuery;
            
            if (incluirEliminadas) {
                areasQuery = query(
                    collection(db, "areas"),
                    where("organizacionCamelCase", "==", organizacionCamelCase)
                );
            } else {
                areasQuery = query(
                    collection(db, "areas"),
                    where("organizacionCamelCase", "==", organizacionCamelCase),
                    where("eliminado", "==", false)
                );
            }
            
            const areasSnapshot = await getDocs(areasQuery);
            const areas = [];
            
            areasSnapshot.forEach(doc => {
                const data = doc.data();
                areas.push(new Area(doc.id, {
                    ...data,
                    id: doc.id
                }));
            });
            
            console.log(`Encontradas ${areas.length} áreas`);
            
            // Ordenar por fecha de creación
            areas.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            
            // Guardar en memoria
            this.areas = areas;
            
            return areas;
            
        } catch (error) {
            console.error("Error obteniendo áreas:", error);
            return [];
        }
    }

    /**
     * Obtiene un área por ID
     * @param {string} areaId - ID del área
     * @returns {Promise<Area|null>} Área encontrada o null
     */
    async getAreaById(areaId) {
        console.log('🔍 Buscando área por ID:', areaId);
        
        // Buscar en memoria
        const areaInMemory = this.areas.find(area => area.id === areaId);
        if (areaInMemory) {
            console.log('✅ Área encontrada en memoria');
            return areaInMemory;
        }
        
        console.log('❌ No encontrada en memoria, buscando en Firestore...');
        
        try {
            const areaRef = doc(db, "areas", areaId);
            const areaSnap = await getDoc(areaRef);
            
            if (areaSnap.exists()) {
                console.log('✅ Área encontrada en Firestore');
                const data = areaSnap.data();
                const area = new Area(areaId, {
                    ...data,
                    id: areaId
                });
                
                // Agregar a memoria
                this.areas.push(area);
                return area;
            }
            
            console.log('❌ Área no encontrada en Firestore');
            return null;
            
        } catch (error) {
            console.error('Error obteniendo área por ID:', error);
            return null;
        }
    }

    // ========== MÉTODOS DE VERIFICACIÓN ==========
    
    /**
     * Verifica si ya existe un área con el mismo nombre
     * @param {string} nombreArea - Nombre del área
     * @param {string} organizacionCamelCase - Organización
     * @returns {Promise<boolean>} True si ya existe
     */
    async verificarAreaExistente(nombreArea, organizacionCamelCase) {
        try {
            const querySnapshot = await getDocs(query(
                collection(db, "areas"),
                where("nombreArea", "==", nombreArea),
                where("organizacionCamelCase", "==", organizacionCamelCase),
                where("eliminado", "==", false)
            ));
            
            return !querySnapshot.empty;
        } catch (error) {
            console.error("Error verificando área existente:", error);
            return false;
        }
    }

    // ========== MÉTODOS DE UTILIDAD ==========
    
    /**
     * Genera ID para el área
     * @param {string} nombreArea - Nombre del área
     * @param {string} organizacionCamelCase - Organización
     * @returns {string} ID generado
     */
    _generarAreaId(nombreArea, organizacionCamelCase) {
        const nombreNormalizado = nombreArea
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_');
        
        const timestamp = Date.now();
        return `${organizacionCamelCase}_${nombreNormalizado}_${timestamp}`;
    }

    /**
     * Genera color aleatorio
     * @returns {string} Color hexadecimal
     */
    _generarColorAleatorio() {
        const colores = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
        ];
        return colores[Math.floor(Math.random() * colores.length)];
    }
}

// ==================== EXPORTS ====================
export { Area, AreaManager };