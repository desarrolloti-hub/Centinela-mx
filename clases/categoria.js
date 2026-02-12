// ==================== IMPORTS ====================
import { db } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/**
 * Clase Categoria - Representa una categoría con sus subcategorías
 */
class Categoria {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
        this.fechaActualizacion = data.fechaActualizacion || new Date().toISOString();
        this.empresaId = data.empresaId || '';
        this.empresaNombre = data.empresaNombre || '';
        this.color = data.color || '#2f8cff';
        this.estado = data.estado || 'activa';
        this.subcategorias = new Map();
        
        // Cargar subcategorías si existen
        if (data.subcategorias && Array.isArray(data.subcategorias)) {
            data.subcategorias.forEach(subcat => {
                if (subcat && subcat.id) {
                    const subcatMap = new Map();
                    subcatMap.set('id', subcat.id);
                    subcatMap.set('nombre', subcat.nombre || '');
                    subcatMap.set('descripcion', subcat.descripcion || '');
                    subcatMap.set('fechaCreacion', subcat.fechaCreacion || new Date().toISOString());
                    subcatMap.set('fechaActualizacion', subcat.fechaActualizacion || new Date().toISOString());
                    subcatMap.set('color', subcat.color || null);
                    subcatMap.set('heredaColor', subcat.heredaColor !== undefined ? subcat.heredaColor : true);
                    this.subcategorias.set(subcat.id, subcatMap);
                }
            });
        }
    }

    /**
     * Agrega una nueva subcategoría
     */
    agregarSubcategoria(nombre, descripcion = '') {
        try {
            const subcatId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const subcatMap = new Map();
            subcatMap.set('id', subcatId);
            subcatMap.set('nombre', nombre || '');
            subcatMap.set('descripcion', descripcion || '');
            subcatMap.set('fechaCreacion', new Date().toISOString());
            subcatMap.set('fechaActualizacion', new Date().toISOString());
            subcatMap.set('heredaColor', true);
            subcatMap.set('color', null);
            
            this.subcategorias.set(subcatId, subcatMap);
            return subcatId;
            
        } catch (error) {
            console.error("Error agregando subcategoría:", error);
            throw error;
        }
    }

    /**
     * Elimina una subcategoría
     */
    eliminarSubcategoria(subcatId) {
        try {
            return this.subcategorias.delete(subcatId);
        } catch (error) {
            console.error("Error eliminando subcategoría:", error);
            return false;
        }
    }

    /**
     * Obtiene una subcategoría por su ID
     */
    obtenerSubcategoria(subcatId) {
        return this.subcategorias.get(subcatId) || null;
    }

    /**
     * Actualiza una subcategoría existente
     */
    actualizarSubcategoria(subcatId, nuevosDatos) {
        try {
            const subcategoria = this.obtenerSubcategoria(subcatId);
            
            if (!subcategoria) {
                return false;
            }
            
            Object.keys(nuevosDatos).forEach(key => {
                subcategoria.set(key, nuevosDatos[key]);
            });
            
            subcategoria.set('fechaActualizacion', new Date().toISOString());
            return true;
            
        } catch (error) {
            console.error("Error actualizando subcategoría:", error);
            return false;
        }
    }

    /**
     * Verifica si existe una subcategoría con el mismo nombre
     */
    existeSubcategoria(nombreSubcategoria) {
        const nombre = nombreSubcategoria.toLowerCase().trim();
        
        for (const subcat of this.subcategorias.values()) {
            const subcatNombre = subcat.get('nombre') || '';
            if (subcatNombre.toLowerCase().trim() === nombre) {
                return true;
            }
        }
        return false;
    }

    /**
     * Valida la categoría
     */
    validar() {
        const errores = [];
        
        if (!this.nombre || this.nombre.trim() === '') {
            errores.push('El nombre de la categoría es requerido');
        }
        
        if (!this.empresaId || this.empresaId === '') {
            errores.push('La categoría debe estar asociada a una empresa');
        }
        
        return {
            isValid: errores.length === 0,
            errores: errores
        };
    }

    /**
     * Convierte la categoría a formato Firestore
     */
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
            color: this.color,
            estado: this.estado,
            subcategorias: subcategoriasArray,
            empresaId: this.empresaId,
            empresaNombre: this.empresaNombre,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: new Date().toISOString()
        };
    }

    /**
     * Obtiene un resumen de la categoría
     */
    obtenerResumen() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            color: this.color,
            estado: this.estado,
            totalSubcategorias: this.subcategorias.size,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: this.fechaActualizacion,
            empresaId: this.empresaId,
            empresaNombre: this.empresaNombre
        };
    }
}

/**
 * Clase CategoriaManager - Gestiona las operaciones con categorías en Firestore
 */
class CategoriaManager {
    constructor(empresaNombre = null, empresaId = null) {
        this.categorias = new Map();
        
        // Obtener datos de empresa
        const datosEmpresa = this.obtenerDatosEmpresa();
        
        // Priorizar parámetros sobre localStorage
        this.empresaNombre = empresaNombre || datosEmpresa.nombre;
        this.empresaId = empresaId || datosEmpresa.id;
        
        // Generar nombre de colección
        this.nombreColeccion = this.generarNombreColeccion();
        this.coleccionRef = this.nombreColeccion ? collection(db, this.nombreColeccion) : null;
        
        console.log('🏢 CategoriaManager inicializado:', {
            empresaNombre: this.empresaNombre,
            empresaId: this.empresaId,
            coleccion: this.nombreColeccion
        });
    }

    /**
     * Obtiene datos de la empresa desde localStorage
     */
    obtenerDatosEmpresa() {
        try {
            // Intentar obtener de userData (formato principal)
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            // Obtener organización de múltiples fuentes
            let organizacion = userData.organizacion || 
                              localStorage.getItem('userOrganizacion') || 
                              'default';
            
            let organizacionCamelCase = userData.organizacionCamelCase || 
                                       localStorage.getItem('userOrganizacionCamelCase') || 
                                       this.generarCamelCase(organizacion);
            
            // Si no hay organización, intentar obtener de otros campos
            if (organizacion === 'default' && userData.empresa) {
                organizacion = userData.empresa;
                organizacionCamelCase = this.generarCamelCase(organizacion);
            }
            
            return {
                nombre: organizacion,
                id: organizacionCamelCase
            };
        } catch (error) {
            console.error('Error obteniendo datos de empresa:', error);
            return { nombre: 'default', id: 'default' };
        }
    }

    /**
     * Genera camelCase a partir de un texto
     */
    generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'default';
        return texto
            .toLowerCase()
            .split(' ')
            .map((palabra, index) => {
                if (index === 0) return palabra;
                return palabra.charAt(0).toUpperCase() + palabra.slice(1);
            })
            .join('')
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Genera nombre de colección para Firestore
     */
    generarNombreColeccion() {
        if (!this.empresaNombre || this.empresaNombre === 'default') {
            return 'categorias_default';
        }
        
        const camelCase = this.empresaId || this.generarCamelCase(this.empresaNombre);
        return `categorias_${camelCase}`;
    }

    /**
     * Crea una nueva categoría
     */
    async crearCategoria(data) {
        try {
            if (!this.coleccionRef) {
                throw new Error('No se pudo determinar la colección. Verifica que hay una sesión activa.');
            }

            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            
            // Verificar si ya existe una categoría con ese nombre
            const q = query(this.coleccionRef, 
                          where('nombre', '==', data.nombre.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                throw new Error(`Ya existe una categoría con el nombre "${data.nombre}" en tu empresa`);
            }
            
            const docRef = doc(this.coleccionRef);
            const id = docRef.id;
            
            const nuevaCategoria = new Categoria(id, {
                ...data,
                empresaId: this.empresaId,
                empresaNombre: this.empresaNombre,
                fechaCreacion: new Date().toISOString(),
                color: data.color || '#2f8cff',
                estado: data.estado || 'activa'
            });
            
            const validacion = nuevaCategoria.validar();
            if (!validacion.isValid) {
                throw new Error(validacion.errores.join(', '));
            }
            
            await setDoc(docRef, nuevaCategoria.toFirestore());
            this.categorias.set(id, nuevaCategoria);
            return nuevaCategoria;
            
        } catch (error) {
            console.error("Error creando categoría:", error);
            throw error;
        }
    }

    /**
     * Obtiene una categoría por su ID
     */
    async obtenerCategoria(id) {
        try {
            if (!this.coleccionRef) {
                throw new Error('No se pudo determinar la colección');
            }

            if (this.categorias.has(id)) {
                return this.categorias.get(id);
            }
            
            const docRef = doc(db, this.nombreColeccion, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const categoria = new Categoria(id, docSnap.data());
            this.categorias.set(id, categoria);
            return categoria;
            
        } catch (error) {
            console.error("Error obteniendo categoría:", error);
            throw error;
        }
    }

    /**
     * Actualiza una categoría existente
     */
    async actualizarCategoria(id, nuevosDatos) {
        try {
            if (!this.coleccionRef) {
                throw new Error('No se pudo determinar la colección');
            }

            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            // Verificar si el nombre ya existe en otra categoría
            if (nuevosDatos.nombre && nuevosDatos.nombre !== categoria.nombre) {
                const q = query(this.coleccionRef, 
                              where('nombre', '==', nuevosDatos.nombre.trim()));
                const querySnapshot = await getDocs(q);
                
                const exists = querySnapshot.docs.some(doc => doc.id !== id);
                if (exists) {
                    throw new Error(`Ya existe una categoría con el nombre "${nuevosDatos.nombre}" en tu empresa`);
                }
                categoria.nombre = nuevosDatos.nombre;
            }
            
            // Actualizar otros campos
            if (nuevosDatos.descripcion !== undefined) categoria.descripcion = nuevosDatos.descripcion;
            if (nuevosDatos.color !== undefined) categoria.color = nuevosDatos.color;
            if (nuevosDatos.estado !== undefined) categoria.estado = nuevosDatos.estado;
            
            // Guardar en Firestore
            const docRef = doc(db, this.nombreColeccion, id);
            await updateDoc(docRef, categoria.toFirestore());
            
            return true;
            
        } catch (error) {
            console.error("Error actualizando categoría:", error);
            throw error;
        }
    }

    /**
     * Elimina una categoría (solo si no tiene subcategorías)
     */
    async eliminarCategoria(id) {
        try {
            if (!this.coleccionRef) {
                throw new Error('No se pudo determinar la colección');
            }

            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            if (categoria.subcategorias.size > 0) {
                throw new Error('No se puede eliminar una categoría con subcategorías');
            }
            
            const docRef = doc(db, this.nombreColeccion, id);
            await deleteDoc(docRef);
            
            this.categorias.delete(id);
            return true;
            
        } catch (error) {
            console.error("Error eliminando categoría:", error);
            throw error;
        }
    }

    /**
     * Carga todas las categorías desde Firestore
     */
    async cargarTodasCategorias() {
        try {
            if (!this.coleccionRef) {
                console.warn('No se pudo determinar la colección');
                return [];
            }

            const querySnapshot = await getDocs(this.coleccionRef);
            this.categorias.clear();
            
            const categoriasArray = [];
            querySnapshot.forEach((docSnap) => {
                const categoria = new Categoria(docSnap.id, docSnap.data());
                this.categorias.set(docSnap.id, categoria);
                categoriasArray.push(categoria);
            });
            
            return categoriasArray;
        } catch (error) {
            console.error("Error cargando categorías:", error);
            throw error;
        }
    }

    /**
     * Obtiene todas las categorías (desde caché o Firestore)
     */
    async obtenerTodasCategorias() {
        if (!this.coleccionRef) {
            console.warn('No se pudo determinar la colección');
            return [];
        }
        
        if (this.categorias.size === 0) {
            return await this.cargarTodasCategorias();
        }
        return Array.from(this.categorias.values());
    }

    /**
     * Obtiene una categoría por ID (alias para mantener compatibilidad)
     */
    async obtenerCategoriaPorId(id) {
        return await this.obtenerCategoria(id);
    }
}

export { Categoria, CategoriaManager };