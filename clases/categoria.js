// ==================== IMPORTS ====================
// Importar configuración de Firebase y servicios necesarios
import { db, auth } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

class Categoria {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.fechaCreacion = data.fechaCreacion || serverTimestamp();
        this.fechaActualizacion = data.fechaActualizacion || serverTimestamp();
        this.subcategorias = new Map();
        
        if (data.subcategorias && Array.isArray(data.subcategorias)) {
            data.subcategorias.forEach(subcat => {
                if (subcat && subcat.id) {
                    const subcatMap = new Map();
                    subcatMap.set('id', subcat.id);
                    subcatMap.set('nombre', subcat.nombre || '');
                    subcatMap.set('descripcion', subcat.descripcion || '');
                    subcatMap.set('fechaCreacion', subcat.fechaCreacion || serverTimestamp());
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
            subcatMap.set('fechaCreacion', serverTimestamp());
            
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
            
            subcategoria.set('fechaActualizacion', serverTimestamp());
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
            subcategorias: subcategoriasArray,
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: serverTimestamp()
        };
    }

    obtenerResumen() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            totalSubcategorias: this.subcategorias.size,
            fechaCreacion: this.fechaCreacion
        };
    }
}

class CategoriaManager {
    constructor() {
        this.categorias = new Map();
        this.coleccionRef = collection(db, 'categorias');
    }

    async crearCategoria(data) {
        try {
            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            
            // Verificar si ya existe una categoría con ese nombre
            const q = query(this.coleccionRef, 
                          where('nombre', '==', data.nombre.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                throw new Error('Ya existe una categoría con ese nombre');
            }
            
            // Crear documento en Firestore con ID automático
            const docRef = doc(this.coleccionRef);
            const id = docRef.id;
            
            const nuevaCategoria = new Categoria(id, data);
            
            const validacion = nuevaCategoria.validar();
            if (!validacion.isValid) {
                throw new Error(validacion.errores.join(', '));
            }
            
            // Guardar en Firestore
            await setDoc(docRef, nuevaCategoria.toFirestore());
            
            // Actualizar caché local
            this.categorias.set(id, nuevaCategoria);
            return nuevaCategoria;
            
        } catch (error) {
            console.error("Error creando categoría:", error);
            throw error;
        }
    }

    async obtenerCategoria(id) {
        try {
            // Primero verificar en caché local
            if (this.categorias.has(id)) {
                return this.categorias.get(id);
            }
            
            // Si no está en caché, obtener de Firestore
            const docRef = doc(db, 'categorias', id);
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

    async actualizarCategoria(id, nuevosDatos) {
        try {
            const categoria = await this.obtenerCategoria(id);
            
            if (!categoria) {
                throw new Error(`Categoría ${id} no encontrada`);
            }
            
            if (nuevosDatos.nombre && nuevosDatos.nombre !== categoria.nombre) {
                // Verificar si ya existe otra categoría con el nuevo nombre
                const q = query(this.coleccionRef, 
                              where('nombre', '==', nuevosDatos.nombre.trim()));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const exists = querySnapshot.docs.some(doc => doc.id !== id);
                    if (exists) {
                        throw new Error('Ya existe una categoría con ese nombre');
                    }
                }
            }
            
            // Actualizar objeto local
            if (nuevosDatos.nombre) categoria.nombre = nuevosDatos.nombre;
            if (nuevosDatos.descripcion !== undefined) categoria.descripcion = nuevosDatos.descripcion;
            
            // Actualizar en Firestore
            const docRef = doc(db, 'categorias', id);
            await updateDoc(docRef, categoria.toFirestore());
            
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
            
            // Eliminar de Firestore
            const docRef = doc(db, 'categorias', id);
            await deleteDoc(docRef);
            
            // Eliminar de caché local
            this.categorias.delete(id);
            return true;
            
        } catch (error) {
            console.error("Error eliminando categoría:", error);
            throw error;
        }
    }

    async cargarTodasCategorias() {
        try {
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

    async obtenerTodasCategorias() {
        // Si no hay categorías en caché, cargarlas primero
        if (this.categorias.size === 0) {
            return await this.cargarTodasCategorias();
        }
        return Array.from(this.categorias.values());
    }

    async buscarCategorias(termino) {
        try {
            if (!termino || termino.trim() === '') {
                return await this.obtenerTodasCategorias();
            }
            
            // Buscar en Firestore
            const q = query(this.coleccionRef, 
                          where('nombre', '>=', termino),
                          where('nombre', '<=', termino + '\uf8ff'));
            
            const querySnapshot = await getDocs(q);
            const resultados = [];
            
            querySnapshot.forEach((docSnap) => {
                const categoria = new Categoria(docSnap.id, docSnap.data());
                resultados.push(categoria);
            });
            
            return resultados;
            
        } catch (error) {
            console.error("Error buscando categorías:", error);
            throw error;
        }
    }

    async ordenarCategoriasPorNombre(ascendente = true) {
        const categorias = await this.obtenerTodasCategorias();
        
        return categorias.sort((a, b) => {
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
        try {
            const q = query(this.coleccionRef, 
                          where('nombre', '==', nombre.trim()));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return false;
            }
            
            // Verificar si es la misma categoría (para actualizaciones)
            if (excludeId) {
                const existeOtra = querySnapshot.docs.some(doc => doc.id !== excludeId);
                return existeOtra;
            }
            
            return true;
            
        } catch (error) {
            console.error("Error verificando existencia de categoría:", error);
            throw error;
        }
    }

    async sincronizarCategoria(id) {
        try {
            // Forzar sincronización con Firestore
            const docRef = doc(db, 'categorias', id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                this.categorias.delete(id);
                return null;
            }
            
            const categoria = new Categoria(id, docSnap.data());
            this.categorias.set(id, categoria);
            return categoria;
            
        } catch (error) {
            console.error("Error sincronizando categoría:", error);
            throw error;
        }
    }
}

export { Categoria, CategoriaManager };