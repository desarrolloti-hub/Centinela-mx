class Categoria {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.subcategorias = new Map();
        
        if (data.subcategorias && Array.isArray(data.subcategorias)) {
            data.subcategorias.forEach(subcat => {
                if (subcat && subcat.id) {
                    const subcatMap = new Map();
                    subcatMap.set('id', subcat.id);
                    subcatMap.set('nombre', subcat.nombre || '');
                    subcatMap.set('descripcion', subcat.descripcion || '');
                    this.subcategorias.set(subcat.id, subcatMap);
                }
            });
        }
    }

    agregarSubcategoria(nombre, descripcion) {
        try {
            const subcatId = `subcat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const subcatMap = new Map();
            subcatMap.set('id', subcatId);
            subcatMap.set('nombre', nombre || '');
            subcatMap.set('descripcion', descripcion || '');
            
            this.subcategorias.set(subcatId, subcatMap);
            return subcatId;
            
        } catch (error) {
            console.error("Error agregando subcategoría:", error);
            throw error;
        }
    }

    eliminarSubcategoria(subcatId) {
        try {
            return this.subcategorias.delete(subcatId);
            
        } catch (error) {
            console.error("Error eliminando subcategoría:", error);
            return false;
        }
    }

    obtenerSubcategoria(subcatId) {
        return this.subcategorias.get(subcatId) || null;
    }

    actualizarSubcategoria(subcatId, nuevosDatos) {
        try {
            const subcategoria = this.obtenerSubcategoria(subcatId);
            
            if (!subcategoria) {
                return false;
            }
            
            Object.keys(nuevosDatos).forEach(key => {
                subcategoria.set(key, nuevosDatos[key]);
            });
            
            return true;
            
        } catch (error) {
            console.error("Error actualizando subcategoría:", error);
            return false;
        }
    }

    buscarSubcategorias(terminoBusqueda) {
        if (!terminoBusqueda || terminoBusqueda.trim() === '') {
            return Array.from(this.subcategorias.values());
        }
        
        const termino = terminoBusqueda.toLowerCase();
        const resultados = [];
        
        for (const subcat of this.subcategorias.values()) {
            const nombre = subcat.get('nombre') || '';
            const descripcion = subcat.get('descripcion') || '';
            
            if (nombre.toLowerCase().includes(termino) || 
                descripcion.toLowerCase().includes(termino)) {
                resultados.push(subcat);
            }
        }
        
        return resultados;
    }

    existeSubcategoria(nombreSubcategoria) {
        const nombre = nombreSubcategoria.toLowerCase();
        
        for (const subcat of this.subcategorias.values()) {
            const subcatNombre = subcat.get('nombre') || '';
            if (subcatNombre.toLowerCase() === nombre) {
                return true;
            }
        }
        return false;
    }

    validar() {
        const errores = [];
        
        if (!this.nombre || this.nombre.trim() === '') {
            errores.push('El nombre de la categoría es requerido');
        }
        
        return {
            isValid: errores.length === 0,
            errores: errores
        };
    }

    toFirestore() {
        const subcategoriasArray = [];
        
        for (const subcat of this.subcategorias.values()) {
            const subcatObj = {};
            for (const [key, value] of subcat.entries()) {
                subcatObj[key] = value;
            }
            subcategoriasArray.push(subcatObj);
        }
        
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            subcategorias: subcategoriasArray
        };
    }

    obtenerResumen() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            totalSubcategorias: this.subcategorias.size
        };
    }
}

class CategoriaManager {
    constructor() {
        this.categorias = new Map();
    }

    async crearCategoria(data) {
        try {
            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            
            const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const nuevaCategoria = new Categoria(id, data);
            
            const validacion = nuevaCategoria.validar();
            if (!validacion.isValid) {
                throw new Error(validacion.errores.join(', '));
            }
            
            this.categorias.set(id, nuevaCategoria);
            return nuevaCategoria;
            
        } catch (error) {
            console.error("Error creando categoría:", error);
            throw error;
        }
    }

    async obtenerCategoria(id) {
        return this.categorias.get(id) || null;
    }

    async actualizarCategoria(id, nuevosDatos) {
        try {
            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            if (nuevosDatos.nombre && nuevosDatos.nombre !== categoria.nombre) {
                for (const cat of this.categorias.values()) {
                    if (cat.id !== id && cat.nombre.toLowerCase() === nuevosDatos.nombre.toLowerCase()) {
                        throw new Error('Ya existe una categoría con ese nombre');
                    }
                }
            }
            
            if (nuevosDatos.nombre) categoria.nombre = nuevosDatos.nombre;
            if (nuevosDatos.descripcion !== undefined) categoria.descripcion = nuevosDatos.descripcion;
            
            return true;
            
        } catch (error) {
            console.error("Error actualizando categoría:", error);
            throw error;
        }
    }

    async eliminarCategoria(id) {
        try {
            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            // Solo se puede eliminar si no tiene subcategorías
            if (categoria.subcategorias.size > 0) {
                throw new Error('No se puede eliminar una categoría con subcategorías');
            }
            
            return this.categorias.delete(id);
            
        } catch (error) {
            console.error("Error eliminando categoría:", error);
            throw error;
        }
    }

    async obtenerTodasCategorias() {
        return Array.from(this.categorias.values());
    }

    async buscarCategorias(termino) {
        if (!termino || termino.trim() === '') {
            return this.obtenerTodasCategorias();
        }
        
        const terminoLower = termino.toLowerCase();
        const resultados = [];
        
        for (const categoria of this.categorias.values()) {
            if (categoria.nombre.toLowerCase().includes(terminoLower) ||
                (categoria.descripcion && categoria.descripcion.toLowerCase().includes(terminoLower))) {
                resultados.push(categoria);
            }
        }
        
        return resultados;
    }

    async ordenarCategoriasPorNombre(ascendente = true) {
        const categoriasArray = Array.from(this.categorias.values());
        
        return categoriasArray.sort((a, b) => {
            const nombreA = a.nombre.toLowerCase();
            const nombreB = b.nombre.toLowerCase();
            
            if (ascendente) {
                return nombreA.localeCompare(nombreB);
            } else {
                return nombreB.localeCompare(nombreA);
            }
        });
    }

    async existeCategoriaConNombre(nombre, excludeId = '') {
        const nombreLower = nombre.toLowerCase();
        
        for (const categoria of this.categorias.values()) {
            if (categoria.id !== excludeId && 
                categoria.nombre.toLowerCase() === nombreLower) {
                return true;
            }
        }
        return false;
    }
}

export { Categoria, CategoriaManager };