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
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/**
 * Clase Categoria - Representa una categoría con sus subcategorías
 * VERSIÓN CORREGIDA - Usa objetos, NO Maps para Firestore
 */
class Categoria {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.color = data.color || '#2f8cff';
        this.estado = data.estado || 'activa';
        this.empresaId = data.empresaId || '';
        this.empresaNombre = data.empresaNombre || '';
        
        // Fechas
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();
        
        // SUBCATEGORÍAS: Siempre como objeto, NUNCA como Map
        this.subcategorias = {};
        
        if (data.subcategorias) {
            if (typeof data.subcategorias === 'object') {
                // Copiar manteniendo la estructura exacta
                this.subcategorias = JSON.parse(JSON.stringify(data.subcategorias));
            }
        }
    }

    // ========== MÉTODOS DE UTILIDAD ==========
    
    _convertirFecha(fecha) {
        if (fecha && typeof fecha.toDate === 'function') return fecha.toDate();
        if (fecha instanceof Date) return fecha;
        if (typeof fecha === 'string' || typeof fecha === 'number') return new Date(fecha);
        return new Date();
    }
    
    _formatearFecha(date) {
        if (!date) return 'No disponible';
        try {
            const fecha = this._convertirFecha(date);
            return fecha.toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    }

    // ========== GESTIÓN DE SUBCATEGORÍAS ==========
    
    /**
     * Agrega una nueva subcategoría
     */
    agregarSubcategoria(nombre, descripcion = '') {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la subcategoría es requerido');
            }
            
            const subcatId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.subcategorias[subcatId] = {
                id: subcatId,
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || '',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                heredaColor: true,
                color: null
            };
            
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
            if (this.subcategorias[subcatId]) {
                delete this.subcategorias[subcatId];
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error eliminando subcategoría:", error);
            return false;
        }
    }

    /**
     * Obtiene una subcategoría por su ID
     */
    obtenerSubcategoria(subcatId) {
        return this.subcategorias[subcatId] || null;
    }

    /**
     * Actualiza una subcategoría existente
     */
    actualizarSubcategoria(subcatId, nuevosDatos) {
        try {
            if (!this.subcategorias[subcatId]) {
                return false;
            }
            
            this.subcategorias[subcatId] = {
                ...this.subcategorias[subcatId],
                ...nuevosDatos,
                fechaActualizacion: new Date().toISOString()
            };
            
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
        
        for (const subcatId in this.subcategorias) {
            const subcat = this.subcategorias[subcatId];
            if (subcat.nombre && subcat.nombre.toLowerCase().trim() === nombre) {
                return true;
            }
        }
        return false;
    }

    /**
     * Obtiene todas las subcategorías como array
     */
    getSubcategoriasAsArray() {
        const subcategoriasArray = [];
        for (const subcatId in this.subcategorias) {
            subcategoriasArray.push({
                id: subcatId,
                ...this.subcategorias[subcatId]
            });
        }
        return subcategoriasArray;
    }

    /**
     * Obtiene cantidad de subcategorías
     */
    getCantidadSubcategorias() {
        return Object.keys(this.subcategorias).length;
    }

    // ========== VALIDACIÓN ==========
    
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

    // ========== Getters ==========
    
    getFechaCreacionFormateada() {
        return this._formatearFecha(this.fechaCreacion);
    }
    
    getFechaActualizacionFormateada() {
        return this._formatearFecha(this.fechaActualizacion);
    }

    // ========== FIRESTORE ==========
    
    /**
     * Convierte la categoría a formato Firestore
     */
    toFirestore() {
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            color: this.color,
            estado: this.estado,
            empresaId: this.empresaId,
            empresaNombre: this.empresaNombre,
            subcategorias: this.subcategorias || {},
            fechaCreacion: this.fechaCreacion,
            fechaActualizacion: new Date().toISOString()
        };
    }

    /**
     * Para enviar a Firestore con serverTimestamp
     */
    toFirestoreCreate() {
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            color: this.color,
            estado: this.estado,
            empresaId: this.empresaId,
            empresaNombre: this.empresaNombre,
            subcategorias: this.subcategorias || {},
            fechaCreacion: serverTimestamp(),
            fechaActualizacion: serverTimestamp()
        };
    }

    /**
     * Obtiene un resumen de la categoría para UI
     */
    toUI() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            color: this.color,
            estado: this.estado,
            totalSubcategorias: this.getCantidadSubcategorias(),
            subcategorias: this.getSubcategoriasAsArray(),
            empresaId: this.empresaId,
            empresaNombre: this.empresaNombre,
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada()
        };
    }
}

/**
 * Clase CategoriaManager - Gestiona las operaciones con categorías en Firestore
 * VERSIÓN CORREGIDA - Colecciones dinámicas como en áreas
 */
class CategoriaManager {
    constructor() {
        this.categorias = [];
        this.empresaNombre = null;
        this.empresaId = null;
        this.nombreColeccion = null;
        
        // Intentar cargar datos de empresa al instanciar
        this._cargarDatosEmpresa();
        
        console.log('✅ CategoriaManager inicializado');
    }

    // ========== MÉTODOS PRIVADOS ==========
    
    _cargarDatosEmpresa() {
        try {
            // Intentar obtener de adminInfo (para administradores)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.empresaNombre = adminData.organizacion || 'Sin organización';
                this.empresaId = adminData.organizacionCamelCase || this._generarCamelCase(this.empresaNombre);
                return;
            }
            
            // Intentar obtener de userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            this.empresaNombre = userData.organizacion || userData.empresa || 'Sin organización';
            this.empresaId = userData.organizacionCamelCase || this._generarCamelCase(this.empresaNombre);
            
        } catch (error) {
            console.error('Error cargando datos de empresa:', error);
            this.empresaNombre = 'Sin organización';
            this.empresaId = 'sinOrganizacion';
        }
        
        // Generar nombre de colección
        this.nombreColeccion = this._getCollectionName();
    }
    
    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Genera nombre de colección dinámico (IGUAL QUE ÁREAS)
     */
    _getCollectionName(empresaIdOverride = null) {
        const orgId = empresaIdOverride || this.empresaId || 'sinOrganizacion';
        return `categorias_${orgId}`;
    }

    /**
     * Genera ID único para categoría
     */
    _generarCategoriaId(nombre, empresaId) {
        const nombreNormalizado = nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 30);
        
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const org = empresaId || this.empresaId || 'sinOrganizacion';
        
        return `${org}_cat_${nombreNormalizado}_${timestamp}_${random}`;
    }

    // ========== MÉTODOS CRUD ==========
    
    /**
     * Crea una nueva categoría (IGUAL QUE ÁREAS)
     */
    async crearCategoria(data) {
        try {
            // Validar datos mínimos
            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }
            
            // Asegurar que tenemos datos de empresa
            if (!this.empresaId) {
                this._cargarDatosEmpresa();
            }
            
            const empresaId = this.empresaId;
            const empresaNombre = this.empresaNombre;
            const collectionName = this._getCollectionName();
            
            console.log(`📝 Creando categoría en colección: ${collectionName}`);
            
            // Verificar si ya existe
            const existe = await this.verificarCategoriaExistente(data.nombre.trim(), empresaId);
            if (existe) {
                throw new Error(`Ya existe una categoría con el nombre "${data.nombre}"`);
            }
            
            // Generar ID único
            const categoriaId = this._generarCategoriaId(data.nombre, empresaId);
            
            // Procesar subcategorías si vienen en el data
            let subcategorias = {};
            if (data.subcategorias) {
                if (Array.isArray(data.subcategorias)) {
                    data.subcategorias.forEach(subcat => {
                        const subcatId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
                        subcategorias[subcatId] = {
                            id: subcatId,
                            nombre: subcat.nombre || '',
                            descripcion: subcat.descripcion || '',
                            fechaCreacion: new Date().toISOString(),
                            fechaActualizacion: new Date().toISOString(),
                            heredaColor: true,
                            color: null
                        };
                    });
                } else if (typeof data.subcategorias === 'object') {
                    subcategorias = JSON.parse(JSON.stringify(data.subcategorias));
                }
            }
            
            // Datos para Firestore
            const categoriaFirestoreData = {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || '',
                color: data.color || '#2f8cff',
                estado: data.estado || 'activa',
                empresaId: empresaId,
                empresaNombre: empresaNombre,
                subcategorias: subcategorias,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };
            
            console.log('📤 Guardando en Firestore:', {
                coleccion: collectionName,
                id: categoriaId,
                nombre: data.nombre
            });
            
            // Guardar en Firestore
            const categoriaRef = doc(db, collectionName, categoriaId);
            await setDoc(categoriaRef, categoriaFirestoreData);
            
            // Crear instancia para retornar
            const nuevaCategoria = new Categoria(categoriaId, {
                ...categoriaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });
            
            // Agregar a memoria
            this.categorias.unshift(nuevaCategoria);
            
            console.log(`✅ Categoría creada exitosamente en ${collectionName}/${categoriaId}`);
            return nuevaCategoria;
            
        } catch (error) {
            console.error('❌ Error creando categoría:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las categorías de una empresa
     */
    async obtenerCategoriasPorEmpresa(empresaIdOverride = null) {
        try {
            const orgId = empresaIdOverride || this.empresaId;
            
            if (!orgId) {
                console.warn('⚠️ No se proporcionó ID de empresa');
                return [];
            }
            
            const collectionName = this._getCollectionName(orgId);
            console.log(`🔍 Obteniendo categorías de: ${collectionName}`);
            
            const categoriasCollection = collection(db, collectionName);
            const categoriasSnapshot = await getDocs(categoriasCollection);
            const categorias = [];
            
            categoriasSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const categoria = new Categoria(doc.id, { ...data, id: doc.id });
                    categorias.push(categoria);
                } catch (error) {
                    console.error(`❌ Error procesando categoría ${doc.id}:`, error);
                }
            });
            
            // Ordenar por fecha (más recientes primero)
            categorias.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.categorias = categorias;
            
            console.log(`✅ Encontradas ${categorias.length} categorías en ${collectionName}`);
            return categorias;
            
        } catch (error) {
            console.error('❌ Error obteniendo categorías:', error);
            return [];
        }
    }

    /**
     * Obtiene una categoría por ID
     */
    async obtenerCategoriaPorId(categoriaId, empresaIdOverride = null) {
        const orgId = empresaIdOverride || this.empresaId;
        
        if (!orgId) {
            console.error('❌ Se requiere ID de empresa');
            return null;
        }
        
        // Buscar en memoria primero
        const categoriaInMemory = this.categorias.find(cat => cat.id === categoriaId);
        if (categoriaInMemory) return categoriaInMemory;
        
        try {
            const collectionName = this._getCollectionName(orgId);
            const categoriaRef = doc(db, collectionName, categoriaId);
            const categoriaSnap = await getDoc(categoriaRef);
            
            if (categoriaSnap.exists()) {
                const data = categoriaSnap.data();
                const categoria = new Categoria(categoriaId, { ...data, id: categoriaId });
                this.categorias.push(categoria);
                return categoria;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error obteniendo categoría:', error);
            return null;
        }
    }

    /**
     * Actualiza una categoría existente
     */
    async actualizarCategoria(categoriaId, nuevosDatos, empresaIdOverride = null) {
        try {
            const orgId = empresaIdOverride || this.empresaId;
            
            if (!orgId) {
                throw new Error('Se requiere ID de empresa');
            }
            
            const collectionName = this._getCollectionName(orgId);
            const categoriaRef = doc(db, collectionName, categoriaId);
            const categoriaSnap = await getDoc(categoriaRef);
            
            if (!categoriaSnap.exists()) {
                throw new Error(`Categoría con ID ${categoriaId} no encontrada`);
            }
            
            // Si se está cambiando el nombre, verificar que no exista otra
            if (nuevosDatos.nombre && nuevosDatos.nombre !== categoriaSnap.data().nombre) {
                const existe = await this.verificarCategoriaExistente(nuevosDatos.nombre, orgId, categoriaId);
                if (existe) {
                    throw new Error(`Ya existe otra categoría con el nombre "${nuevosDatos.nombre}"`);
                }
            }
            
            // Datos actualizados
            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp()
            };
            
            // Actualizar en Firestore
            await updateDoc(categoriaRef, datosActualizados);
            
            // Actualizar en memoria
            const categoriaIndex = this.categorias.findIndex(c => c.id === categoriaId);
            if (categoriaIndex !== -1) {
                const categoriaActual = this.categorias[categoriaIndex];
                Object.keys(datosActualizados).forEach(key => {
                    if (key !== 'id') {
                        categoriaActual[key] = datosActualizados[key];
                    }
                });
                categoriaActual.fechaActualizacion = new Date();
            }
            
            console.log(`✅ Categoría actualizada en ${collectionName}/${categoriaId}`);
            return await this.obtenerCategoriaPorId(categoriaId, orgId);
            
        } catch (error) {
            console.error('❌ Error actualizando categoría:', error);
            throw error;
        }
    }

    /**
     * Elimina una categoría (solo si no tiene subcategorías)
     */
    async eliminarCategoria(categoriaId, empresaIdOverride = null) {
        try {
            const orgId = empresaIdOverride || this.empresaId;
            
            if (!orgId) {
                throw new Error('Se requiere ID de empresa');
            }
            
            // Verificar que existe y no tiene subcategorías
            const categoria = await this.obtenerCategoriaPorId(categoriaId, orgId);
            
            if (!categoria) {
                throw new Error(`Categoría ${categoriaId} no encontrada`);
            }
            
            if (categoria.getCantidadSubcategorias() > 0) {
                throw new Error('No se puede eliminar una categoría con subcategorías');
            }
            
            const collectionName = this._getCollectionName(orgId);
            const categoriaRef = doc(db, collectionName, categoriaId);
            
            // Eliminar de Firestore
            await deleteDoc(categoriaRef);
            
            // Eliminar de memoria
            const categoriaIndex = this.categorias.findIndex(c => c.id === categoriaId);
            if (categoriaIndex !== -1) {
                this.categorias.splice(categoriaIndex, 1);
            }
            
            console.log(`✅ Categoría eliminada permanentemente de ${collectionName}:`, categoriaId);
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando categoría:', error);
            throw error;
        }
    }

    /**
     * Verifica si ya existe una categoría con el mismo nombre
     */
    async verificarCategoriaExistente(nombre, empresaId, excludeId = null) {
        try {
            if (!empresaId) {
                empresaId = this.empresaId;
            }
            
            const collectionName = this._getCollectionName(empresaId);
            const categoriasCollection = collection(db, collectionName);
            
            const q = query(
                categoriasCollection,
                where("nombre", "==", nombre)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (excludeId) {
                return querySnapshot.docs.some(doc => doc.id !== excludeId);
            }
            
            return !querySnapshot.empty;
            
        } catch (error) {
            console.error("❌ Error verificando categoría:", error);
            return false;
        }
    }

    /**
     * Agrega una subcategoría a una categoría existente
     */
    async agregarSubcategoria(categoriaId, nombreSubcategoria, descripcion = '', empresaIdOverride = null) {
        try {
            const orgId = empresaIdOverride || this.empresaId;
            
            if (!orgId) {
                throw new Error('Se requiere ID de empresa');
            }
            
            const categoria = await this.obtenerCategoriaPorId(categoriaId, orgId);
            
            if (!categoria) {
                throw new Error('Categoría no encontrada');
            }
            
            // Verificar si ya existe subcategoría con ese nombre
            if (categoria.existeSubcategoria(nombreSubcategoria)) {
                throw new Error(`Ya existe una subcategoría con el nombre "${nombreSubcategoria}"`);
            }
            
            // Agregar subcategoría al objeto
            const subcatId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            
            categoria.subcategorias[subcatId] = {
                id: subcatId,
                nombre: nombreSubcategoria.trim(),
                descripcion: descripcion.trim() || '',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                heredaColor: true,
                color: null
            };
            
            // Actualizar en Firestore
            const collectionName = this._getCollectionName(orgId);
            const categoriaRef = doc(db, collectionName, categoriaId);
            
            await updateDoc(categoriaRef, {
                subcategorias: categoria.subcategorias,
                fechaActualizacion: serverTimestamp()
            });
            
            console.log(`✅ Subcategoría "${nombreSubcategoria}" agregada a ${categoria.nombre}`);
            return subcatId;
            
        } catch (error) {
            console.error('❌ Error agregando subcategoría:', error);
            throw error;
        }
    }

    /**
     * Carga todas las categorías (alias para mantener compatibilidad)
     */
    async cargarTodasCategorias() {
        return await this.obtenerCategoriasPorEmpresa();
    }

    /**
     * Obtiene todas las categorías (desde caché o Firestore)
     */
    async obtenerTodasCategorias() {
        if (this.categorias.length === 0) {
            return await this.cargarTodasCategorias();
        }
        return this.categorias;
    }
}

export { Categoria, CategoriaManager };