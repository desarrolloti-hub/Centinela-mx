// ==================== CLASE CATEGORIA ====================
// Clase que representa una categoría en el sistema
class Categoria {
    constructor(id, data) {
        // ID único de la categoría
        this.id = id;
        
        // Datos principales de la categoría
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        
        // Array de subcategorías (cada una es un objeto con id, nombre, descripcion)
        this.subcategorias = data.subcategorias || [];
        
        console.log(`Categoria ${id} creada:`, {
            nombre: this.nombre,
            descripcion: this.descripcion,
            subcategorias: this.subcategorias.length
        });
    }

    // ========== MÉTODOS DE SUBCATEGORÍAS ==========
    
    /**
     * Agrega una nueva subcategoría
     * @param {string} nombre - Nombre de la subcategoría
     * @param {string} descripcion - Descripción de la subcategoría
     * @returns {string} ID de la nueva subcategoría
     */
    agregarSubcategoria(nombre, descripcion) {
        try {
            // Generar ID único para la subcategoría
            const subcatId = `subcat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const nuevaSubcategoria = {
                id: subcatId,
                nombre: nombre || '',
                descripcion: descripcion || ''
            };
            
            // Agregar al array de subcategorías
            this.subcategorias.push(nuevaSubcategoria);
            
            console.log(`Subcategoría agregada: ${nombre} (ID: ${subcatId})`);
            return subcatId;
            
        } catch (error) {
            console.error("Error agregando subcategoría:", error);
            throw error;
        }
    }

    /**
     * Elimina una subcategoría por ID
     * @param {string} subcatId - ID de la subcategoría a eliminar
     * @returns {boolean} True si se eliminó correctamente
     */
    eliminarSubcategoria(subcatId) {
        try {
            const index = this.subcategorias.findIndex(subcat => subcat.id === subcatId);
            
            if (index === -1) {
                console.warn(`Subcategoría ${subcatId} no encontrada`);
                return false;
            }
            
            // Eliminar del array
            this.subcategorias.splice(index, 1);
            
            console.log(`Subcategoría ${subcatId} eliminada`);
            return true;
            
        } catch (error) {
            console.error("Error eliminando subcategoría:", error);
            return false;
        }
    }

    /**
     * Obtiene una subcategoría por ID
     * @param {string} subcatId - ID de la subcategoría
     * @returns {Object|null} Objeto de subcategoría o null si no existe
     */
    obtenerSubcategoria(subcatId) {
        return this.subcategorias.find(subcat => subcat.id === subcatId) || null;
    }

    /**
     * Actualiza una subcategoría existente
     * @param {string} subcatId - ID de la subcategoría
     * @param {Object} nuevosDatos - Nuevos datos para la subcategoría
     * @returns {boolean} True si se actualizó correctamente
     */
    actualizarSubcategoria(subcatId, nuevosDatos) {
        try {
            const subcategoria = this.obtenerSubcategoria(subcatId);
            
            if (!subcategoria) {
                console.warn(`Subcategoría ${subcatId} no encontrada para actualizar`);
                return false;
            }
            
            // Actualizar datos de la subcategoría
            Object.assign(subcategoria, nuevosDatos);
            
            console.log(`Subcategoría ${subcatId} actualizada`);
            return true;
            
        } catch (error) {
            console.error("Error actualizando subcategoría:", error);
            return false;
        }
    }

    // ========== MÉTODOS DE BÚSQUEDA ==========
    
    /**
     * Busca subcategorías por nombre (insensible a mayúsculas)
     * @param {string} terminoBusqueda - Término a buscar
     * @returns {Array} Subcategorías que coinciden con la búsqueda
     */
    buscarSubcategorias(terminoBusqueda) {
        if (!terminoBusqueda || terminoBusqueda.trim() === '') {
            return this.subcategorias;
        }
        
        const termino = terminoBusqueda.toLowerCase();
        return this.subcategorias.filter(subcat => 
            subcat.nombre.toLowerCase().includes(termino) ||
            (subcat.descripcion && subcat.descripcion.toLowerCase().includes(termino))
        );
    }

    /**
     * Verifica si una subcategoría existe por nombre
     * @param {string} nombreSubcategoria - Nombre a verificar
     * @returns {boolean} True si existe una subcategoría con ese nombre
     */
    existeSubcategoria(nombreSubcategoria) {
        const nombre = nombreSubcategoria.toLowerCase();
        return this.subcategorias.some(
            subcat => subcat.nombre.toLowerCase() === nombre
        );
    }

    // ========== MÉTODOS DE ORDENACIÓN ==========
    
    /**
     * Ordena subcategorías por nombre (A-Z)
     * @param {boolean} ascendente - True para orden ascendente
     * @returns {Array} Subcategorías ordenadas
     */
    ordenarSubcategoriasPorNombre(ascendente = true) {
        return [...this.subcategorias].sort((a, b) => {
            const nombreA = a.nombre.toLowerCase();
            const nombreB = b.nombre.toLowerCase();
            
            if (ascendente) {
                return nombreA.localeCompare(nombreB);
            } else {
                return nombreB.localeCompare(nombreA);
            }
        });
    }

    // ========== MÉTODOS DE VALIDACIÓN ==========
    
    /**
     * Valida que la categoría tenga datos mínimos requeridos
     * @returns {Object} Objeto con isValid y mensajes de error
     */
    validar() {
        const errores = [];
        
        // Validar nombre
        if (!this.nombre || this.nombre.trim() === '') {
            errores.push('El nombre de la categoría es requerido');
        } else if (this.nombre.length > 100) {
            errores.push('El nombre no puede exceder 100 caracteres');
        }
        
        // Validar descripción
        if (this.descripcion && this.descripcion.length > 500) {
            errores.push('La descripción no puede exceder 500 caracteres');
        }
        
        // Validar subcategorías
        this.subcategorias.forEach((subcat, index) => {
            if (!subcat.nombre || subcat.nombre.trim() === '') {
                errores.push(`Subcategoría ${index + 1}: El nombre es requerido`);
            }
        });
        
        return {
            isValid: errores.length === 0,
            errores: errores
        };
    }

    // ========== MÉTODOS DE TRANSFORMACIÓN ==========
    
    /**
     * Convierte la categoría a un objeto plano para Firestore
     * @returns {Object} Objeto plano para guardar en base de datos
     */
    toFirestore() {
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            subcategorias: this.subcategorias
        };
    }

    /**
     * Genera un resumen de la categoría
     * @returns {Object} Objeto con información resumida
     */
    obtenerResumen() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            totalSubcategorias: this.subcategorias.length
        };
    }
}

// ==================== CLASE CATEGORIAMANAGER ====================
// Clase para gestionar categorías en el sistema
class CategoriaManager {
    constructor() {
        // Array para almacenar categorías en memoria
        this.categorias = [];
        
        console.log('CategoriaManager inicializado');
    }

    // ========== MÉTODOS DE CRUD ==========
    
    /**
     * Crea una nueva categoría
     * @param {Object} data - Datos de la categoría
     * @returns {Promise<Categoria>} Nueva categoría creada
     */
    async crearCategoria(data) {
        try {
            console.log('Creando nueva categoría:', data.nombre);
            
            // Generar ID único
            const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Validar datos mínimos
            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            
            // Crear instancia de categoría
            const nuevaCategoria = new Categoria(id, data);
            
            // Validar
            const validacion = nuevaCategoria.validar();
            if (!validacion.isValid) {
                throw new Error(validacion.errores.join(', '));
            }
            
            // Agregar a lista en memoria
            this.categorias.unshift(nuevaCategoria);
            
            console.log('✅ Categoría creada exitosamente:', nuevaCategoria.nombre);
            return nuevaCategoria;
            
        } catch (error) {
            console.error("❌ Error creando categoría:", error);
            throw error;
        }
    }

    /**
     * Obtiene una categoría por ID
     * @param {string} id - ID de la categoría
     * @returns {Categoria|null} Categoría encontrada o null
     */
    async obtenerCategoria(id) {
        console.log('🔍 Buscando categoría:', id);
        
        // Buscar en memoria
        const categoria = this.categorias.find(cat => cat.id === id);
        
        if (categoria) {
            console.log('✅ Categoría encontrada en memoria:', categoria.nombre);
            return categoria;
        }
        
        console.log('❌ Categoría no encontrada en memoria');
        return null;
    }

    /**
     * Actualiza una categoría existente
     * @param {string} id - ID de la categoría
     * @param {Object} nuevosDatos - Nuevos datos para actualizar
     * @returns {Promise<boolean>} True si se actualizó correctamente
     */
    async actualizarCategoria(id, nuevosDatos) {
        try {
            console.log(`Actualizando categoría ${id}:`, nuevosDatos);
            
            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            // Validar que el nombre no esté duplicado
            if (nuevosDatos.nombre && nuevosDatos.nombre !== categoria.nombre) {
                const nombreExiste = this.categorias.some(
                    cat => cat.id !== id && 
                           cat.nombre.toLowerCase() === nuevosDatos.nombre.toLowerCase()
                );
                
                if (nombreExiste) {
                    throw new Error('Ya existe una categoría con ese nombre');
                }
            }
            
            // Actualizar propiedades
            Object.keys(nuevosDatos).forEach(key => {
                if (key !== 'id') { // No permitir cambiar el ID
                    categoria[key] = nuevosDatos[key];
                }
            });
            
            console.log('✅ Categoría actualizada exitosamente');
            return true;
            
        } catch (error) {
            console.error("❌ Error actualizando categoría:", error);
            throw error;
        }
    }

    /**
     * Elimina una categoría
     * @param {string} id - ID de la categoría
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async eliminarCategoria(id) {
        try {
            console.log(`Eliminando categoría ${id}`);
            
            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            // Eliminar del array
            const index = this.categorias.findIndex(cat => cat.id === id);
            this.categorias.splice(index, 1);
            
            console.log('✅ Categoría eliminada exitosamente');
            return true;
            
        } catch (error) {
            console.error("❌ Error eliminando categoría:", error);
            throw error;
        }
    }

    // ========== MÉTODOS DE BÚSQUEDA ==========
    
    /**
     * Obtiene todas las categorías
     * @returns {Array<Categoria>} Lista de categorías
     */
    async obtenerTodasCategorias() {
        return this.categorias;
    }

    /**
     * Busca categorías por nombre o descripción
     * @param {string} termino - Término de búsqueda
     * @returns {Array<Categoria>} Categorías que coinciden
     */
    async buscarCategorias(termino) {
        if (!termino || termino.trim() === '') {
            return this.obtenerTodasCategorias();
        }
        
        const terminoLower = termino.toLowerCase();
        
        return this.categorias.filter(cat =>
            cat.nombre.toLowerCase().includes(terminoLower) ||
            (cat.descripcion && cat.descripcion.toLowerCase().includes(terminoLower))
        );
    }

    // ========== MÉTODOS DE ORDENACIÓN ==========
    
    /**
     * Ordena categorías por nombre
     * @param {boolean} ascendente - True para orden A-Z
     * @returns {Array<Categoria>} Categorías ordenadas
     */
    async ordenarCategoriasPorNombre(ascendente = true) {
        return [...this.categorias].sort((a, b) => {
            const nombreA = a.nombre.toLowerCase();
            const nombreB = b.nombre.toLowerCase();
            
            if (ascendente) {
                return nombreA.localeCompare(nombreB);
            } else {
                return nombreB.localeCompare(nombreA);
            }
        });
    }

    // ========== MÉTODOS DE VALIDACIÓN ==========
    
    /**
     * Verifica si ya existe una categoría con el mismo nombre
     * @param {string} nombre - Nombre a verificar
     * @param {string} excludeId - ID a excluir de la verificación
     * @returns {boolean} True si ya existe
     */
    async existeCategoriaConNombre(nombre, excludeId = '') {
        const nombreLower = nombre.toLowerCase();
        
        return this.categorias.some(
            cat => cat.id !== excludeId &&
                   cat.nombre.toLowerCase() === nombreLower
        );
    }
}

// ==================== EXPORTS ====================
// Exportar las clases para uso en otros archivos
export { Categoria, CategoriaManager };