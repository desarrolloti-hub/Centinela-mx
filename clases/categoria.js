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
    serverTimestamp,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/**
 * Clase Categoria - Representa una categoría con sus subcategorías
 * VERSIÓN FINAL - Sin empresaId/estado, IDs de Firebase
 */
class Categoria {
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.color = data.color || '#2f8cff';

        // Fechas
        this.fechaCreacion = data.fechaCreacion ? this._convertirFecha(data.fechaCreacion) : new Date();
        this.fechaActualizacion = data.fechaActualizacion ? this._convertirFecha(data.fechaActualizacion) : new Date();

        // SUBCATEGORÍAS: Como objeto
        this.subcategorias = {};

        if (data.subcategorias) {
            if (typeof data.subcategorias === 'object') {
                this.subcategorias = JSON.parse(JSON.stringify(data.subcategorias));
            }
        }

        // Metadatos de organización (solo en memoria, no se guarda)
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.organizacionNombre = data.organizacionNombre || '';
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
    agregarSubcategoria(nombre, descripcion = '', heredaColor = true, colorPersonalizado = null) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la subcategoría es requerido');
            }

            // Usar ID generado por Firebase (se asignará al guardar)
            const subcatId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            this.subcategorias[subcatId] = {
                id: subcatId, // Temporal, se reemplazará al guardar
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || '',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                heredaColor: heredaColor,
                color: !heredaColor ? colorPersonalizado : null
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
     * Cambia la herencia de color de una subcategoría
     */
    cambiarHerenciaColor(subcatId, heredaColor, colorPersonalizado = null) {
        if (!this.subcategorias[subcatId]) return false;

        this.subcategorias[subcatId].heredaColor = heredaColor;
        this.subcategorias[subcatId].color = !heredaColor ? colorPersonalizado : null;
        this.subcategorias[subcatId].fechaActualizacion = new Date().toISOString();

        return true;
    }

    /**
     * Obtiene el color efectivo de una subcategoría
     */
    obtenerColorSubcategoria(subcatId, colorCategoria) {
        const subcat = this.subcategorias[subcatId];
        if (!subcat) return colorCategoria;

        if (subcat.heredaColor === false && subcat.color) {
            return subcat.color;
        }

        return colorCategoria;
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
    getSubcategoriasAsArray(colorCategoria = null) {
        const subcategoriasArray = [];
        for (const subcatId in this.subcategorias) {
            const subcat = this.subcategorias[subcatId];
            const colorEfectivo = this.obtenerColorSubcategoria(subcatId, colorCategoria || this.color);

            subcategoriasArray.push({
                id: subcatId,
                ...subcat,
                colorEfectivo: colorEfectivo
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
     * Prepara datos para Firestore (sin campos innecesarios)
     */
    toFirestore() {
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            color: this.color,
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
            totalSubcategorias: this.getCantidadSubcategorias(),
            subcategorias: this.getSubcategoriasAsArray(this.color),
            fechaCreacion: this.getFechaCreacionFormateada(),
            fechaActualizacion: this.getFechaActualizacionFormateada(),
            organizacion: this.organizacionNombre,
            organizacionCamelCase: this.organizacionCamelCase
        };
    }
}

/**
 * Clase CategoriaManager - Gestiona las operaciones con categorías
 * VERSIÓN FINAL - Sin empresaId/estado, IDs de Firebase
 */
class CategoriaManager {
    constructor() {
        this.categorias = [];
        this.organizacionNombre = null;
        this.organizacionCamelCase = null;
        this.nombreColeccion = null;

        // Cargar datos de organización al instanciar
        this._cargarDatosOrganizacion();
    }

    // ========== MÉTODOS PRIVADOS ==========

    _cargarDatosOrganizacion() {
        try {
            // Intentar obtener de adminInfo
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.organizacionNombre = adminData.organizacion || 'Sin organización';
                this.organizacionCamelCase = adminData.organizacionCamelCase ||
                    this._generarCamelCase(this.organizacionNombre);
                return;
            }

            // Intentar obtener de userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            this.organizacionNombre = userData.organizacion || userData.empresa || 'Sin organización';
            this.organizacionCamelCase = userData.organizacionCamelCase ||
                this._generarCamelCase(this.organizacionNombre);

        } catch (error) {
            console.error('Error cargando datos de organización:', error);
            this.organizacionNombre = 'Sin organización';
            this.organizacionCamelCase = 'sinOrganizacion';
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
     * Genera nombre de colección dinámico
     */
    _getCollectionName(organizacionOverride = null) {
        const orgId = organizacionOverride || this.organizacionCamelCase || 'sinOrganizacion';
        return `categorias_${orgId}`;
    }

    // ========== MÉTODOS CRUD ==========

    /**
     * Crea una nueva categoría - USA addDoc (ID GENERADO POR FIREBASE)
     */
    async crearCategoria(data) {
        try {
            // Validar datos mínimos
            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre de la categoría es requerido');
            }

            // Asegurar que tenemos datos de organización
            if (!this.organizacionCamelCase) {
                this._cargarDatosOrganizacion();
            }

            const collectionName = this._getCollectionName();

            // Verificar si ya existe
            const existe = await this.verificarCategoriaExistente(data.nombre.trim());
            if (existe) {
                throw new Error(`Ya existe una categoría con el nombre "${data.nombre}"`);
            }

            // Procesar subcategorías
            let subcategorias = {};
            if (data.subcategorias) {
                if (Array.isArray(data.subcategorias)) {
                    data.subcategorias.forEach(subcat => {
                        // NO generamos ID, Firebase lo hará al guardar
                        const subcatId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
                        subcategorias[subcatId] = {
                            id: subcatId, // Temporal, se reemplazará
                            nombre: subcat.nombre || '',
                            descripcion: subcat.descripcion || '',
                            fechaCreacion: new Date().toISOString(),
                            fechaActualizacion: new Date().toISOString(),
                            heredaColor: subcat.heredaColor !== undefined ? subcat.heredaColor : true,
                            color: subcat.color || null
                        };
                    });
                } else if (typeof data.subcategorias === 'object') {
                    subcategorias = JSON.parse(JSON.stringify(data.subcategorias));
                }
            }

            // Datos para Firestore - SOLO CAMPOS NECESARIOS
            const categoriaFirestoreData = {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || '',
                color: data.color || '#2f8cff',
                subcategorias: subcategorias,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            // Guardar en Firestore CON addDoc (ID AUTOMÁTICO)
            const categoriasCollection = collection(db, collectionName);
            const docRef = await addDoc(categoriasCollection, categoriaFirestoreData);
            const categoriaId = docRef.id;

            // Crear instancia para retornar
            const nuevaCategoria = new Categoria(categoriaId, {
                ...categoriaFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                organizacionCamelCase: this.organizacionCamelCase,
                organizacionNombre: this.organizacionNombre
            });

            // Agregar a memoria
            this.categorias.unshift(nuevaCategoria);

            return nuevaCategoria;

        } catch (error) {
            console.error('Error creando categoría:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las categorías de una organización
     */
    async obtenerCategoriasPorOrganizacion(organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) {
                return [];
            }

            const collectionName = this._getCollectionName(orgId);

            const categoriasCollection = collection(db, collectionName);
            const categoriasSnapshot = await getDocs(categoriasCollection);
            const categorias = [];

            categoriasSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const categoria = new Categoria(doc.id, {
                        ...data,
                        id: doc.id,
                        organizacionCamelCase: orgId,
                        organizacionNombre: this.organizacionNombre
                    });
                    categorias.push(categoria);
                } catch (error) {
                    console.error(`Error procesando categoría ${doc.id}:`, error);
                }
            });

            // Ordenar por fecha
            categorias.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            this.categorias = categorias;

            return categorias;

        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            return [];
        }
    }

    /**
     * Obtiene una categoría por ID
     */
    async obtenerCategoriaPorId(categoriaId, organizacionOverride = null) {
        const orgId = organizacionOverride || this.organizacionCamelCase;

        if (!orgId) {
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
                const categoria = new Categoria(categoriaId, {
                    ...data,
                    id: categoriaId,
                    organizacionCamelCase: orgId,
                    organizacionNombre: this.organizacionNombre
                });
                this.categorias.push(categoria);
                return categoria;
            }

            return null;

        } catch (error) {
            console.error('Error obteniendo categoría:', error);
            return null;
        }
    }

    /**
     * Actualiza una categoría existente
     */
    async actualizarCategoria(categoriaId, nuevosDatos, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) {
                throw new Error('Se requiere ID de organización');
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

            // Datos actualizados - SOLO CAMPOS NECESARIOS
            const datosActualizados = {
                ...nuevosDatos,
                fechaActualizacion: serverTimestamp()
            };

            // Eliminar campos que no deben actualizarse
            delete datosActualizados.id;
            delete datosActualizados.organizacionCamelCase;
            delete datosActualizados.organizacionNombre;

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

            return await this.obtenerCategoriaPorId(categoriaId, orgId);

        } catch (error) {
            console.error('Error actualizando categoría:', error);
            throw error;
        }
    }

    /**
     * Elimina una categoría (solo si no tiene subcategorías)
     */
    async eliminarCategoria(categoriaId, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) {
                throw new Error('Se requiere ID de organización');
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

            return true;

        } catch (error) {
            console.error('Error eliminando categoría:', error);
            throw error;
        }
    }

    /**
     * Verifica si ya existe una categoría con el mismo nombre
     */
    async verificarCategoriaExistente(nombre, organizacionOverride = null, excludeId = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) return false;

            const collectionName = this._getCollectionName(orgId);
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
            console.error("Error verificando categoría:", error);
            return false;
        }
    }

    /**
     * Agrega una subcategoría a una categoría existente
     */
    async agregarSubcategoria(categoriaId, nombreSubcategoria, descripcion = '', heredaColor = true, colorPersonalizado = null, organizacionOverride = null) {
        try {
            const orgId = organizacionOverride || this.organizacionCamelCase;

            if (!orgId) {
                throw new Error('Se requiere ID de organización');
            }

            const categoria = await this.obtenerCategoriaPorId(categoriaId, orgId);

            if (!categoria) {
                throw new Error('Categoría no encontrada');
            }

            // Verificar si ya existe subcategoría con ese nombre
            if (categoria.existeSubcategoria(nombreSubcategoria)) {
                throw new Error(`Ya existe una subcategoría con el nombre "${nombreSubcategoria}"`);
            }

            // ID temporal, Firebase generará el ID real al guardar el documento completo
            const subcatId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

            categoria.subcategorias[subcatId] = {
                id: subcatId,
                nombre: nombreSubcategoria.trim(),
                descripcion: descripcion.trim() || '',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                heredaColor: heredaColor,
                color: !heredaColor ? colorPersonalizado : null
            };

            // Actualizar en Firestore
            const collectionName = this._getCollectionName(orgId);
            const categoriaRef = doc(db, collectionName, categoriaId);

            await updateDoc(categoriaRef, {
                subcategorias: categoria.subcategorias,
                fechaActualizacion: serverTimestamp()
            });

            return subcatId;

        } catch (error) {
            console.error('Error agregando subcategoría:', error);
            throw error;
        }
    }

    /**
     * Carga todas las categorías
     */
    async cargarTodasCategorias() {
        return await this.obtenerCategoriasPorOrganizacion();
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