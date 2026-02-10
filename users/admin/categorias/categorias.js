// categorias.js - VERSIÓN CON SUBCATEGORÍAS Y FILAS EXPANDIBLES
console.log('🚀 categorias.js iniciando con subcategorías...');

// Variable global para debugging
window.appDebug = {
    estado: 'iniciando',
    controller: null
};

// Cargar dependencias
let Categoria, CategoriaManager;

async function cargarDependencias() {
    try {
        console.log('1️⃣ Cargando dependencias...');
        
        // Cargar clase local de categorías
        const categoriaModule = await import('/clases/categoria.js');
        Categoria = categoriaModule.Categoria;
        CategoriaManager = categoriaModule.CategoriaManager;
        console.log('✅ Clases de categorías cargadas');
        
        // Iniciar aplicación
        iniciarAplicacion();
        
    } catch (error) {
        console.error('❌ Error cargando dependencias:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error de Carga</h4>
            <p><strong>Error:</strong> ${error.message}</p>
            <div class="alert alert-warning mt-3">
                Verifica que el archivo exista en:
                <ul class="mb-0 mt-2">
                    <li><code>/clases/categoria.js</code></li>
                </ul>
            </div>
        `);
    }
}

function mostrarErrorInterfaz(mensajeHTML) {
    const container = document.querySelector('.container-fluid') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4';
    errorDiv.innerHTML = mensajeHTML;
    container.prepend(errorDiv);
}

function iniciarAplicacion() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarController);
    } else {
        inicializarController();
    }
}

function inicializarController() {
    try {
        console.log('🎯 Inicializando controller...');
        
        const app = new CategoriasController();
        window.appDebug.controller = app;
        
        // Vincular todos los métodos al contexto correcto
        app.bindMethods();
        
        // Inicializar
        app.init();
        
        console.log('✅ Aplicación lista');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarErrorInterfaz(`
            <h4 class="text-danger">Error de Inicialización</h4>
            <p>${error.message}</p>
        `);
    }
}

// ==================== CLASE CATEGORIASCONTROLLER ====================
class CategoriasController {
    constructor() {
        console.log('🛠️ Creando CategoriasController...');
        
        this.categoriaManager = new CategoriaManager();
        this.categorias = [];
        this.categoriasPrincipales = [];
        this.subcategoriasPorCategoria = {};
        this.filasExpandidas = new Set();
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
        this.categoriaSeleccionada = null;
        
        console.log('✅ Controller creado');
    }
    
    // ========== VINCULAR MÉTODOS ==========
    bindMethods() {
        console.log('🔗 Vinculando métodos...');
        
        // Vincular métodos principales
        this.mostrarFormularioNuevaCategoria = this.mostrarFormularioNuevaCategoria.bind(this);
        this.guardarCategoria = this.guardarCategoria.bind(this);
        this.generarColorAleatorio = this.generarColorAleatorio.bind(this);
        this.ejecutarAccionConfirmada = this.ejecutarAccionConfirmada.bind(this);
        this.buscarCategorias = this.buscarCategorias.bind(this);
        this.mostrarFormularioNuevaSubcategoria = this.mostrarFormularioNuevaSubcategoria.bind(this);
        this.guardarSubcategoria = this.guardarSubcategoria.bind(this);
        this.toggleExpandirFila = this.toggleExpandirFila.bind(this);
        
        console.log('✅ Métodos vinculados');
    }
    
    init() {
        console.log('🎬 Iniciando aplicación...');
        
        this.verificarElementosDOM();
        this.inicializarEventos();
        this.cargarCategorias();
        
        console.log('✅ Aplicación iniciada');
    }
    
    verificarElementosDOM() {
        console.log('🔍 Verificando DOM...');
        
        const ids = [
            'btnNuevaCategoria', 'tablaCategoriasBody', 'toggleEliminadas',
            'modalCategoria', 'formCategoria', 'btnGuardarCategoria', 'btnColorRandom',
            'modalConfirmar', 'btnConfirmarAccion', 'categoriaPadre',
            'modalSubcategoria', 'btnGuardarSubcategoria', 'btnColorRandomSub'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${el ? '✅' : '❌'} ${id}`);
        });
    }
    
    inicializarEventos() {
        console.log('🎮 Configurando eventos...');
        
        try {
            // Botón nueva categoría
            const btnNuevaCategoria = document.getElementById('btnNuevaCategoria');
            if (btnNuevaCategoria) {
                btnNuevaCategoria.addEventListener('click', () => this.mostrarFormularioNuevaCategoria());
                console.log('✅ Evento btnNuevaCategoria');
            }
            
            // Botón guardar categoría
            const btnGuardarCategoria = document.getElementById('btnGuardarCategoria');
            if (btnGuardarCategoria) {
                btnGuardarCategoria.addEventListener('click', this.guardarCategoria);
                console.log('✅ Evento btnGuardarCategoria');
            }
            
            // Botón guardar subcategoría
            const btnGuardarSubcategoria = document.getElementById('btnGuardarSubcategoria');
            if (btnGuardarSubcategoria) {
                btnGuardarSubcategoria.addEventListener('click', this.guardarSubcategoria);
                console.log('✅ Evento btnGuardarSubcategoria');
            }
            
            // Botón color aleatorio
            const btnColorRandom = document.getElementById('btnColorRandom');
            if (btnColorRandom) {
                btnColorRandom.addEventListener('click', this.generarColorAleatorio);
                console.log('✅ Evento btnColorRandom');
            }
            
            // Botón color aleatorio subcategorías
            const btnColorRandomSub = document.getElementById('btnColorRandomSub');
            if (btnColorRandomSub) {
                btnColorRandomSub.addEventListener('click', () => this.generarColorAleatorio('colorSubcategoria'));
                console.log('✅ Evento btnColorRandomSub');
            }
            
            // Toggle eliminadas
            const toggleEliminadas = document.getElementById('toggleEliminadas');
            if (toggleEliminadas) {
                toggleEliminadas.addEventListener('change', (e) => {
                    this.cargarCategorias();
                });
                console.log('✅ Evento toggleEliminadas');
            }
            
            // Confirmación
            const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
            if (btnConfirmarAccion) {
                btnConfirmarAccion.addEventListener('click', this.ejecutarAccionConfirmada);
                console.log('✅ Evento btnConfirmarAccion');
            }
            
            // Cambio en jerarquía para actualizar categorías padre
            const jerarquiaSelect = document.getElementById('jerarquia');
            if (jerarquiaSelect) {
                jerarquiaSelect.addEventListener('change', () => {
                    this.actualizarOpcionesCategoriaPadre();
                });
            }
            
            console.log('✅ Todos los eventos configurados');
            
        } catch (error) {
            console.error('❌ Error configurando eventos:', error);
        }
    }
    
    // ========== MÉTODOS CRUD ==========
    
    async cargarCategorias() {
        try {
            this.mostrarCargando();
            
            console.log('📥 Cargando categorías...');
            
            this.categorias = await this.categoriaManager.obtenerTodasCategorias();
            console.log(`📊 ${this.categorias.length} categorías cargadas`);
            
            // Convertir a array de objetos simples para la tabla
            this.categorias = this.categorias.map(categoria => {
                if (categoria instanceof Categoria) {
                    return {
                        id: categoria.id,
                        nombre: categoria.nombre || categoria.nombreCategoria,
                        descripcion: categoria.descripcion,
                        tipoCategoria: categoria.tipoCategoria || 'otro',
                        color: categoria.color || '#3498db',
                        icono: categoria.icono || 'fas fa-tag',
                        jerarquia: categoria.jerarquia || 'principal',
                        categoriaPadre: categoria.categoriaPadre || null,
                        codigo: categoria.codigo || '',
                        caracteristicas: categoria.caracteristicas || '',
                        activo: true,
                        eliminado: false,
                        subcategorias: categoria.subcategorias ? Array.from(categoria.subcategorias.values()) : [],
                        fechaCreacion: categoria.fechaCreacion || new Date().toISOString(),
                        creadoPor: categoria.creadoPor || 'Sistema'
                    };
                }
                return categoria;
            });
            
            // Obtener solo categorías principales (sin categoría padre)
            this.categoriasPrincipales = this.categorias.filter(cat => 
                !cat.categoriaPadre && cat.jerarquia === 'principal' && !cat.eliminado
            );
            
            // Organizar subcategorías por categoría padre
            this.organizarSubcategorias();
            
            this.actualizarTabla();
            
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
            this.mostrarError('Error cargando categorías: ' + error.message);
        }
    }
    
    organizarSubcategorias() {
        this.subcategoriasPorCategoria = {};
        
        this.categorias.forEach(categoria => {
            if (categoria.categoriaPadre) {
                if (!this.subcategoriasPorCategoria[categoria.categoriaPadre]) {
                    this.subcategoriasPorCategoria[categoria.categoriaPadre] = [];
                }
                this.subcategoriasPorCategoria[categoria.categoriaPadre].push(categoria);
            }
        });
    }
    
    async guardarCategoria() {
        console.log('💾 Guardando categoría...');
        
        try {
            const form = document.getElementById('formCategoria');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const categoriaId = document.getElementById('categoriaId').value;
            const esNueva = !categoriaId;
            const esSubcategoria = document.getElementById('esSubcategoria').value === 'true';
            
            // Obtener datos del formulario
            const categoriaData = {
                nombre: document.getElementById('nombreCategoria').value.trim(),
                tipoCategoria: document.getElementById('tipoCategoria').value,
                descripcion: document.getElementById('descripcion').value.trim(),
                color: document.getElementById('color').value,
                icono: document.getElementById('icono').value,
                jerarquia: esSubcategoria ? 'subcategoria' : document.getElementById('jerarquia').value,
                categoriaPadre: esSubcategoria ? 
                    document.getElementById('categoriaPadreId').value : 
                    document.getElementById('categoriaPadre').value || null,
                codigo: '',
                caracteristicas: '',
                activo: true
            };
            
            console.log('📝 Datos del formulario:', categoriaData);
            
            if (esNueva) {
                // Crear nueva categoría
                console.log('🆕 Creando nueva categoría...');
                await this.categoriaManager.crearCategoria(categoriaData);
                this.mostrarExito('✅ Categoría creada exitosamente');
            } else {
                // Actualizar categoría existente
                console.log('✏️ Actualizando categoría:', categoriaId);
                await this.categoriaManager.actualizarCategoria(categoriaId, categoriaData);
                this.mostrarExito('✅ Categoría actualizada exitosamente');
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalCategoria'));
            if (modal) {
                modal.hide();
            }
            
            // Recargar lista
            await this.cargarCategorias();
            
        } catch (error) {
            console.error('❌ Error guardando categoría:', error);
            this.mostrarError('Error guardando categoría: ' + error.message);
        }
    }
    
    async guardarSubcategoria() {
        console.log('💾 Guardando subcategoría...');
        
        try {
            const form = document.getElementById('formSubcategoria');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const categoriaPadreId = document.getElementById('subcategoriaCategoriaPadreId').value;
            
            const subcategoriaData = {
                nombre: document.getElementById('nombreSubcategoria').value.trim(),
                descripcion: document.getElementById('descripcionSubcategoria').value.trim(),
                color: document.getElementById('colorSubcategoria').value,
                tipoCategoria: 'subcategoria',
                jerarquia: 'subcategoria',
                categoriaPadre: categoriaPadreId,
                icono: 'fas fa-tag',
                codigo: '',
                caracteristicas: '',
                activo: true
            };
            
            console.log('📝 Datos de subcategoría:', subcategoriaData);
            
            // Crear nueva subcategoría
            await this.categoriaManager.crearCategoria(subcategoriaData);
            this.mostrarExito('✅ Subcategoría creada exitosamente');
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalSubcategoria'));
            if (modal) {
                modal.hide();
            }
            
            // Recargar lista
            await this.cargarCategorias();
            
            // Expandir la fila padre si no está expandida
            if (!this.filasExpandidas.has(categoriaPadreId)) {
                this.toggleExpandirFila(categoriaPadreId);
            }
            
        } catch (error) {
            console.error('❌ Error guardando subcategoría:', error);
            this.mostrarError('Error guardando subcategoría: ' + error.message);
        }
    }
    
    mostrarFormularioNuevaCategoria(categoriaPadreId = null) {
        console.log('📝 Mostrando formulario para nueva categoría');
        
        try {
            // Limpiar formulario
            const form = document.getElementById('formCategoria');
            if (form) {
                form.reset();
            }
            
            document.getElementById('categoriaId').value = '';
            document.getElementById('esSubcategoria').value = 'false';
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-tag me-2"></i>Nueva Categoría';
            document.getElementById('btnGuardarCategoria').textContent = 'Crear Categoría';
            document.getElementById('btnGuardarCategoria').className = 'btn btn-primary';
            
            // Si viene de una categoría padre, configurar como subcategoría
            if (categoriaPadreId) {
                document.getElementById('esSubcategoria').value = 'true';
                document.getElementById('categoriaPadreId').value = categoriaPadreId;
                document.getElementById('jerarquia').value = 'subcategoria';
                document.getElementById('jerarquia').disabled = true;
                document.getElementById('contenedorCategoriaPadre').style.display = 'none';
                
                // Obtener nombre de la categoría padre
                const categoriaPadre = this.categorias.find(c => c.id === categoriaPadreId);
                if (categoriaPadre) {
                    document.getElementById('modalTitle').innerHTML = 
                        `<i class="fas fa-plus-circle me-2"></i>Nueva Subcategoría para: ${categoriaPadre.nombre}`;
                }
            } else {
                document.getElementById('jerarquia').disabled = false;
                document.getElementById('contenedorCategoriaPadre').style.display = 'block';
                this.actualizarOpcionesCategoriaPadre();
            }
            
            // Generar color aleatorio
            this.generarColorAleatorio();
            
            // Mostrar modal
            const modalElement = document.getElementById('modalCategoria');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
            
        } catch (error) {
            console.error('❌ Error mostrando formulario:', error);
        }
    }
    
    mostrarFormularioNuevaSubcategoria(categoriaPadreId) {
        console.log('📝 Mostrando formulario para nueva subcategoría');
        
        try {
            // Limpiar formulario
            const form = document.getElementById('formSubcategoria');
            if (form) {
                form.reset();
            }
            
            document.getElementById('subcategoriaCategoriaPadreId').value = categoriaPadreId;
            
            // Obtener nombre de la categoría padre
            const categoriaPadre = this.categorias.find(c => c.id === categoriaPadreId);
            if (categoriaPadre) {
                document.querySelector('#modalSubcategoria .modal-title').innerHTML = 
                    `<i class="fas fa-plus-circle me-2"></i>Nueva Subcategoría para: ${categoriaPadre.nombre}`;
            }
            
            // Generar color aleatorio
            this.generarColorAleatorio('colorSubcategoria');
            
            // Mostrar modal
            const modalElement = document.getElementById('modalSubcategoria');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
            
        } catch (error) {
            console.error('❌ Error mostrando formulario de subcategoría:', error);
        }
    }
    
    actualizarOpcionesCategoriaPadre() {
        const jerarquia = document.getElementById('jerarquia').value;
        const categoriaPadreSelect = document.getElementById('categoriaPadre');
        
        // Limpiar opciones
        categoriaPadreSelect.innerHTML = '<option value="">Seleccionar categoría padre...</option>';
        
        if (jerarquia === 'subcategoria') {
            // Solo mostrar categorías principales
            this.categoriasPrincipales.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombre;
                categoriaPadreSelect.appendChild(option);
            });
            categoriaPadreSelect.disabled = false;
        } else {
            categoriaPadreSelect.disabled = true;
        }
    }
    
    async mostrarFormularioEdicion(categoriaId) {
        try {
            console.log('✏️ Cargando categoría para edición:', categoriaId);
            
            const categoria = await this.categoriaManager.obtenerCategoria(categoriaId);
            if (!categoria) {
                this.mostrarError('Categoría no encontrada');
                return;
            }
            
            // Convertir a objeto simple si es necesario
            const catData = categoria instanceof Categoria ? {
                id: categoria.id,
                nombre: categoria.nombre,
                descripcion: categoria.descripcion,
                tipoCategoria: categoria.tipoCategoria || 'otro',
                color: categoria.color || '#3498db',
                icono: categoria.icono || 'fas fa-tag',
                jerarquia: categoria.jerarquia || 'principal',
                categoriaPadre: categoria.categoriaPadre || null,
                codigo: categoria.codigo || '',
                caracteristicas: categoria.caracteristicas || '',
                activo: true
            } : categoria;
            
            // Llenar formulario
            document.getElementById('categoriaId').value = catData.id;
            document.getElementById('nombreCategoria').value = catData.nombre || '';
            document.getElementById('tipoCategoria').value = catData.tipoCategoria || 'otro';
            document.getElementById('descripcion').value = catData.descripcion || '';
            document.getElementById('color').value = catData.color || '#3498db';
            document.getElementById('icono').value = catData.icono || 'fas fa-tag';
            document.getElementById('jerarquia').value = catData.jerarquia || 'principal';
            
            // Configurar si es subcategoría
            if (catData.jerarquia === 'subcategoria') {
                document.getElementById('esSubcategoria').value = 'true';
                document.getElementById('categoriaPadreId').value = catData.categoriaPadre || '';
                document.getElementById('jerarquia').disabled = true;
                document.getElementById('contenedorCategoriaPadre').style.display = 'none';
            } else {
                document.getElementById('jerarquia').disabled = false;
                document.getElementById('contenedorCategoriaPadre').style.display = 'block';
                // Cargar categorías padre primero
                await this.cargarCategorias();
                // Luego llenar el select
                setTimeout(() => {
                    document.getElementById('categoriaPadre').value = catData.categoriaPadre || '';
                    this.actualizarOpcionesCategoriaPadre();
                }, 100);
            }
            
            document.getElementById('modalTitle').innerHTML = `<i class="fas fa-edit me-2"></i>Editar: ${catData.nombre}`;
            document.getElementById('btnGuardarCategoria').textContent = 'Actualizar';
            document.getElementById('btnGuardarCategoria').className = 'btn btn-warning';
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('modalCategoria'));
            modal.show();
            
        } catch (error) {
            console.error('❌ Error cargando categoría para edición:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    // ========== ACCIONES ==========
    
    async eliminarCategoria(categoriaId) {
        try {
            console.log('🗑️ Eliminando categoría:', categoriaId);
            
            // Verificar si tiene subcategorías
            if (this.subcategoriasPorCategoria[categoriaId] && 
                this.subcategoriasPorCategoria[categoriaId].length > 0) {
                this.mostrarError('No se puede eliminar una categoría con subcategorías');
                return;
            }
            
            await this.categoriaManager.eliminarCategoria(categoriaId);
            this.mostrarExito('Categoría eliminada exitosamente');
            await this.cargarCategorias();
        } catch (error) {
            console.error('❌ Error eliminando categoría:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    async verDetalles(categoriaId) {
        try {
            console.log('👁️ Mostrando detalles:', categoriaId);
            
            const categoria = await this.categoriaManager.obtenerCategoria(categoriaId);
            if (!categoria) {
                this.mostrarError('Categoría no encontrada');
                return;
            }
            
            // Convertir a objeto simple si es necesario
            const catData = categoria instanceof Categoria ? {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion,
                tipoCategoria: categoria.tipoCategoria || 'otro',
                color: categoria.color || '#3498db',
                icono: categoria.icono || 'fas fa-tag',
                jerarquia: categoria.jerarquia || 'principal',
                categoriaPadre: categoria.categoriaPadre || null,
                codigo: categoria.codigo || '',
                caracteristicas: categoria.caracteristicas || '',
                id: categoria.id
            } : categoria;
            
            // Obtener nombre de la categoría padre si existe
            let nombreCategoriaPadre = 'Ninguna';
            if (catData.categoriaPadre) {
                const categoriaPadre = await this.categoriaManager.obtenerCategoria(catData.categoriaPadre);
                nombreCategoriaPadre = categoriaPadre ? 
                    (categoriaPadre.nombre || 'Desconocida') : 
                    'Desconocida';
            }
            
            // Mapeo de tipos a nombres legibles
            const tipos = {
                'activo': 'Activo/Equipo',
                'material': 'Material/Insumo',
                'servicio': 'Servicio',
                'documento': 'Documento',
                'proveedor': 'Proveedor',
                'proyecto': 'Proyecto',
                'otro': 'Otro'
            };
            
            // Contar subcategorías
            const numSubcategorias = this.subcategoriasPorCategoria[categoriaId] ? 
                this.subcategoriasPorCategoria[categoriaId].length : 0;
            
            const contenido = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-4">
                            <div class="categoria-color me-3" style="background-color: ${catData.color || '#3498db'}; width: 30px; height: 30px;"></div>
                            <div>
                                <h4>${catData.nombre}</h4>
                                <div class="d-flex align-items-center">
                                    <span class="badge badge-activo me-3">${catData.jerarquia === 'subcategoria' ? 'Subcategoría' : 'Categoría Principal'}</span>
                                    <span class="badge-contador me-3">${numSubcategorias} subcategorías</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <h6><i class="fas fa-align-left me-2"></i>Descripción</h6>
                            <p class="text-muted">${catData.descripcion || 'Sin descripción'}</p>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6><i class="fas fa-tag me-2"></i>Tipo</h6>
                                <p class="text-muted">${tipos[catData.tipoCategoria] || catData.tipoCategoria || 'Otro'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6><i class="fas fa-sitemap me-2"></i>Categoría Padre</h6>
                                <p class="text-muted">${nombreCategoriaPadre}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0"><i class="fas fa-palette me-2"></i>Apariencia</h6>
                            </div>
                            <div class="card-body">
                                <p class="mb-2"><strong>Color:</strong> 
                                    <span class="badge" style="background-color: ${catData.color || '#3498db'}; color: white;">${catData.color || '#3498db'}</span>
                                </p>
                                <p class="mb-2"><strong>Ícono:</strong> <i class="${catData.icono || 'fas fa-tag'}"></i></p>
                                <p class="mb-0"><strong>Código:</strong> ${catData.codigo || 'No asignado'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('detallesContent').innerHTML = contenido;
            new bootstrap.Modal(document.getElementById('modalDetalles')).show();
            
        } catch (error) {
            console.error('❌ Error mostrando detalles:', error);
            this.mostrarError('Error: ' + error.message);
        }
    }
    
    solicitarEliminacion(categoriaId) {
        console.log('⚠️ Solicitando confirmación para eliminar:', categoriaId);
        
        this.categoriaSeleccionada = categoriaId;
        
        document.getElementById('confirmarMensaje').innerHTML = `
            <p>¿Está seguro de eliminar esta categoría?</p>
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Advertencia:</strong> Esta acción no se puede deshacer.
            </div>
        `;
        
        document.getElementById('btnConfirmarAccion').textContent = 'Eliminar';
        document.getElementById('btnConfirmarAccion').className = 'btn btn-danger';
        
        new bootstrap.Modal(document.getElementById('modalConfirmar')).show();
    }
    
    ejecutarAccionConfirmada() {
        console.log('✅ Ejecutando acción confirmada');
        
        if (this.categoriaSeleccionada) {
            this.eliminarCategoria(this.categoriaSeleccionada);
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmar'));
            if (modal) {
                modal.hide();
            }
        }
    }
    
    ejecutarAccion(accion, categoriaId) {
        console.log(`🎯 Ejecutando acción: ${accion} para ${categoriaId}`);
        
        switch(accion) {
            case 'ver':
                this.verDetalles(categoriaId);
                break;
            case 'editar':
                this.mostrarFormularioEdicion(categoriaId);
                break;
            case 'eliminar':
                this.solicitarEliminacion(categoriaId);
                break;
            case 'agregar_sub':
                this.mostrarFormularioNuevaSubcategoria(categoriaId);
                break;
        }
    }
    
    // ========== FUNCIONALIDAD DE FILAS EXPANDIBLES ==========
    
    toggleExpandirFila(categoriaId) {
        const fila = document.querySelector(`[data-categoria-id="${categoriaId}"]`);
        const icono = document.querySelector(`[data-categoria-id="${categoriaId}"] .expand-icon`);
        const contenedorSubcategorias = document.getElementById(`subcategorias-${categoriaId}`);
        
        if (this.filasExpandidas.has(categoriaId)) {
            // Colapsar
            this.filasExpandidas.delete(categoriaId);
            if (icono) icono.classList.remove('expanded');
            if (contenedorSubcategorias) {
                contenedorSubcategorias.style.display = 'none';
                contenedorSubcategorias.classList.remove('expanded');
            }
        } else {
            // Expandir
            this.filasExpandidas.add(categoriaId);
            if (icono) icono.classList.add('expanded');
            if (contenedorSubcategorias) {
                contenedorSubcategorias.style.display = 'table-row';
                contenedorSubcategorias.classList.add('expanded');
                // Cargar subcategorías si no están cargadas
                this.cargarSubcategoriasEnFila(categoriaId);
            }
        }
    }
    
    cargarSubcategoriasEnFila(categoriaId) {
        const contenedorSubcategorias = document.getElementById(`subcategorias-${categoriaId}`);
        if (!contenedorSubcategorias) return;
        
        const subcategorias = this.subcategoriasPorCategoria[categoriaId] || [];
        
        if (subcategorias.length === 0) {
            contenedorSubcategorias.querySelector('td').innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <p>No hay subcategorías</p>
                    <button class="btn btn-agregar-sub mt-2" data-action="agregar_sub" data-id="${categoriaId}">
                        <i class="fas fa-plus"></i> Agregar Subcategoría
                    </button>
                </div>
            `;
        } else {
            const tablaHTML = this.crearTablaSubcategorias(subcategorias);
            contenedorSubcategorias.querySelector('td').innerHTML = tablaHTML;
        }
        
        // Asignar eventos a los botones de las subcategorías
        setTimeout(() => {
            contenedorSubcategorias.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.target.closest('[data-action]').dataset.action;
                    const id = e.target.closest('[data-action]').dataset.id;
                    this.ejecutarAccion(action, id);
                });
            });
        }, 50);
    }
    
    crearTablaSubcategorias(subcategorias) {
        let html = `
            <div class="table-responsive">
                <table class="table table-subcategorias">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Color</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        subcategorias.forEach(subcategoria => {
            html += `
                <tr>
                    <td data-label="Nombre">
                        <div class="d-flex align-items-center">
                            <div class="categoria-color me-2" style="background-color: ${subcategoria.color || '#3498db'};"></div>
                            <span>${subcategoria.nombre}</span>
                        </div>
                    </td>
                    <td data-label="Color">
                        <div class="d-flex align-items-center">
                            <div class="categoria-color me-2" style="background-color: ${subcategoria.color || '#3498db'}; width: 20px; height: 20px;"></div>
                            <span class="small">${subcategoria.color || '#3498db'}</span>
                        </div>
                    </td>
                    <td data-label="Descripción">
                        <span class="small text-muted">${subcategoria.descripcion || 'Sin descripción'}</span>
                    </td>
                    <td data-label="Acciones">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary" data-action="ver" data-id="${subcategoria.id}" title="Ver">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" data-action="editar" data-id="${subcategoria.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${subcategoria.id}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                <div class="text-end mt-3">
                    <button class="btn btn-agregar-sub" data-action="agregar_sub" data-id="${subcategorias[0]?.categoriaPadre}">
                        <i class="fas fa-plus"></i> Agregar Subcategoría
                    </button>
                </div>
            </div>
        `;
        
        return html;
    }
    
    // ========== INTERFAZ ==========
    
    actualizarTabla() {
        const tbody = document.getElementById('tablaCategoriasBody');
        if (!tbody) return;
        
        const categoriasFiltradas = this.filtrarCategorias(this.categoriasPrincipales);
        const categoriasPaginadas = this.paginarCategorias(categoriasFiltradas, this.paginacionActual);
        
        tbody.innerHTML = '';
        
        if (categoriasPaginadas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No se encontraron categorías principales</p>
                        <button class="btn btn-primary mt-3" onclick="appDebug.controller.mostrarFormularioNuevaCategoria()">
                            <i class="fas fa-plus me-2"></i>Crear Primera Categoría
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        categoriasPaginadas.forEach((categoria, index) => {
            const numero = (this.paginacionActual - 1) * this.elementosPorPagina + index + 1;
            const fila = this.crearFilaCategoria(categoria, numero);
            tbody.appendChild(fila);
            
            // Crear fila para subcategorías (oculta inicialmente)
            const filaSubcategorias = this.crearFilaSubcategorias(categoria.id);
            tbody.appendChild(filaSubcategorias);
        });
        
        this.actualizarPaginacion(categoriasFiltradas.length);
    }
    
    crearFilaCategoria(categoria, numero) {
        const numSubcategorias = this.subcategoriasPorCategoria[categoria.id] ? 
            this.subcategoriasPorCategoria[categoria.id].length : 0;
        const expandida = this.filasExpandidas.has(categoria.id);
        
        const fila = document.createElement('tr');
        fila.className = 'row-expandable';
        fila.setAttribute('data-categoria-id', categoria.id);
        fila.innerHTML = `
            <td>
                ${numSubcategorias > 0 ? 
                    `<i class="fas fa-caret-down expand-icon ${expandida ? 'expanded' : ''}" 
                      onclick="appDebug.controller.toggleExpandirFila('${categoria.id}')"></i>` : 
                    `<i class="fas fa-minus text-muted"></i>`}
            </td>
            <td>${numero}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="categoria-color me-2" style="background-color: ${categoria.color || '#3498db'};"></div>
                    <div>
                        <strong>${categoria.nombre}</strong>
                        <div class="text-muted small">${categoria.tipoCategoria || 'Otro'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="categoria-color me-2" style="background-color: ${categoria.color || '#3498db'}; width: 20px; height: 20px;"></div>
                    <span class="small">${categoria.color || '#3498db'}</span>
                </div>
            </td>
            <td>
                <span class="badge-contador">${numSubcategorias} subcategoría${numSubcategorias !== 1 ? 's' : ''}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" data-action="ver" data-id="${categoria.id}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" data-action="editar" data-id="${categoria.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${categoria.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-success btn-agregar-sub" data-action="agregar_sub" data-id="${categoria.id}" title="Agregar Subcategoría">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Hacer clicable toda la fila para expandir
        fila.addEventListener('click', (e) => {
            if (!e.target.closest('.action-buttons') && !e.target.closest('.expand-icon')) {
                if (numSubcategorias > 0) {
                    this.toggleExpandirFila(categoria.id);
                }
            }
        });
        
        // Asignar eventos a los botones
        setTimeout(() => {
            fila.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.target.closest('[data-action]').dataset.action;
                    const id = e.target.closest('[data-action]').dataset.id;
                    this.ejecutarAccion(action, id);
                });
            });
        }, 50);
        
        return fila;
    }
    
    crearFilaSubcategorias(categoriaId) {
        const fila = document.createElement('tr');
        fila.id = `subcategorias-${categoriaId}`;
        fila.className = 'subcategorias-container';
        fila.style.display = 'none';
        fila.innerHTML = `
            <td colspan="6">
                <div class="py-3 px-4">
                    <div class="text-center py-2">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <span class="ms-2 text-muted">Cargando subcategorías...</span>
                    </div>
                </div>
            </td>
        `;
        return fila;
    }
    
    // ========== UTILIDADES ==========
    
    generarColorAleatorio(inputId = 'color') {
        const colores = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#d35400', '#8e44ad'];
        const colorInput = document.getElementById(inputId);
        if (colorInput) {
            colorInput.value = colores[Math.floor(Math.random() * colores.length)];
        }
    }
    
    buscarCategorias() {
        this.paginacionActual = 1;
        this.actualizarTabla();
    }
    
    filtrarCategorias(listaCategorias) {
        let filtradas = [...listaCategorias];
        // Podrías añadir un input de búsqueda si lo necesitas
        return filtradas;
    }
    
    paginarCategorias(listaCategorias, pagina) {
        const inicio = (pagina - 1) * this.elementosPorPagina;
        const fin = inicio + this.elementosPorPagina;
        return listaCategorias.slice(inicio, fin);
    }
    
    actualizarPaginacion(totalElementos) {
        const totalPaginas = Math.ceil(totalElementos / this.elementosPorPagina);
        const paginacionElement = document.getElementById('pagination');
        const infoElement = document.getElementById('paginationInfo');
        
        if (infoElement) {
            const inicio = (this.paginacionActual - 1) * this.elementosPorPagina + 1;
            const fin = Math.min(this.paginacionActual * this.elementosPorPagina, totalElementos);
            infoElement.textContent = `Mostrando ${inicio} - ${fin} de ${totalElementos} categorías principales`;
        }
        
        if (paginacionElement && totalPaginas > 1) {
            paginacionElement.innerHTML = '';
            
            // Botón anterior
            const liAnterior = document.createElement('li');
            liAnterior.className = `page-item ${this.paginacionActual === 1 ? 'disabled' : ''}`;
            liAnterior.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
            liAnterior.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.paginacionActual > 1) {
                    this.cambiarPagina(this.paginacionActual - 1);
                }
            });
            paginacionElement.appendChild(liAnterior);
            
            // Números de página
            for (let i = 1; i <= totalPaginas; i++) {
                const li = document.createElement('li');
                li.className = `page-item ${this.paginacionActual === i ? 'active' : ''}`;
                li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
                li.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.cambiarPagina(i);
                });
                paginacionElement.appendChild(li);
            }
            
            // Botón siguiente
            const liSiguiente = document.createElement('li');
            liSiguiente.className = `page-item ${this.paginacionActual === totalPaginas ? 'disabled' : ''}`;
            liSiguiente.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
            liSiguiente.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.paginacionActual < totalPaginas) {
                    this.cambiarPagina(this.paginacionActual + 1);
                }
            });
            paginacionElement.appendChild(liSiguiente);
        }
    }
    
    cambiarPagina(pagina) {
        this.paginacionActual = pagina;
        this.actualizarTabla();
    }
    
    mostrarCargando() {
        const tbody = document.getElementById('tablaCategoriasBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-3">Cargando categorías...</p>
                    </td>
                </tr>
            `;
        }
    }
    
    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
    }
    
    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'danger');
    }
    
    mostrarInfo(mensaje) {
        this.mostrarNotificacion(mensaje, 'info');
    }
    
    mostrarNotificacion(mensaje, tipo) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 
                            tipo === 'danger' ? 'fa-exclamation-triangle' : 
                            'fa-info-circle'} me-2"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    }
}

// ========== INICIAR APLICACIÓN ==========
console.log('🎬 Iniciando carga...');
cargarDependencias();