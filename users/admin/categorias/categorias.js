// categorias.js - VERSIÓN ADAPTADA PARA CLASE CATEGORIA LOCAL
console.log('🚀 categorias.js iniciando...');

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
        this.filtroActual = 'todas';
        this.paginacionActual = 1;
        this.elementosPorPagina = 10;
        this.categoriaSeleccionada = null;
        
        // Datos de usuario para compatibilidad
        this.userManager = {
            currentUser: {
                id: 'admin_demo',
                nombre: 'Administrador',
                cargo: 'administrador',
                organizacion: 'Mi Empresa',
                organizacionCamelCase: 'miEmpresa'
            }
        };
        
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
            'modalConfirmar', 'btnConfirmarAccion', 'categoriaPadre'
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
                btnNuevaCategoria.addEventListener('click', this.mostrarFormularioNuevaCategoria);
                console.log('✅ Evento btnNuevaCategoria');
            }
            
            // Botón guardar categoría
            const btnGuardarCategoria = document.getElementById('btnGuardarCategoria');
            if (btnGuardarCategoria) {
                btnGuardarCategoria.addEventListener('click', this.guardarCategoria);
                console.log('✅ Evento btnGuardarCategoria');
            }
            
            // Botón color aleatorio
            const btnColorRandom = document.getElementById('btnColorRandom');
            if (btnColorRandom) {
                btnColorRandom.addEventListener('click', this.generarColorAleatorio);
                console.log('✅ Evento btnColorRandom');
            }
            
            // Toggle eliminadas (simulado ya que tu clase no tiene eliminado)
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
                // Si la categoría ya tiene el formato de objeto simple, mantenerlo
                // Si es instancia de Categoria, convertirla
                if (categoria instanceof Categoria) {
                    return {
                        id: categoria.id,
                        nombreCategoria: categoria.nombre,
                        descripcion: categoria.descripcion,
                        tipoCategoria: categoria.tipoCategoria || 'otro',
                        color: categoria.color || '#3498db',
                        icono: categoria.icono || 'fas fa-tag',
                        jerarquia: categoria.jerarquia || 'principal',
                        categoriaPadre: categoria.categoriaPadre || null,
                        codigo: categoria.codigo || '',
                        caracteristicas: categoria.caracteristicas || '',
                        activo: true, // Tu clase no tiene activo/eliminado
                        eliminado: false,
                        subcategorias: categoria.subcategorias || [],
                        fechaCreacion: new Date().toISOString(),
                        creadoPor: 'Sistema'
                    };
                }
                return categoria;
            });
            
            // Filtrar categorías principales para el selector
            this.categoriasPrincipales = this.categorias.filter(cat => 
                (cat.jerarquia === 'principal' || !cat.jerarquia) && !cat.eliminado
            );
            
            this.actualizarTabla();
            
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
            this.mostrarError('Error cargando categorías: ' + error.message);
        }
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
            
            // Obtener datos del formulario
            const categoriaData = {
                nombre: document.getElementById('nombreCategoria').value.trim(),
                tipoCategoria: document.getElementById('tipoCategoria').value,
                descripcion: document.getElementById('descripcion').value.trim(),
                caracteristicas: document.getElementById('caracteristicas').value.trim(),
                color: document.getElementById('color').value,
                icono: document.getElementById('icono').value,
                jerarquia: document.getElementById('jerarquia').value,
                categoriaPadre: document.getElementById('categoriaPadre').value || null,
                codigo: document.getElementById('codigo').value.trim(),
                // Tu clase no tiene estos campos, los agregamos para compatibilidad
                nombreCategoria: document.getElementById('nombreCategoria').value.trim(),
                activo: document.getElementById('activo').checked
            };
            
            console.log('📝 Datos del formulario:', categoriaData);
            
            if (esNueva) {
                // Crear nueva categoría usando tu clase
                console.log('🆕 Creando nueva categoría...');
                const nuevaCategoria = await this.categoriaManager.crearCategoria(categoriaData);
                this.mostrarExito('✅ Categoría creada exitosamente');
                
                // Agregar datos adicionales para la tabla
                nuevaCategoria.id = nuevaCategoria.id;
                nuevaCategoria.nombreCategoria = nuevaCategoria.nombre;
                nuevaCategoria.activo = true;
                nuevaCategoria.eliminado = false;
                nuevaCategoria.fechaCreacion = new Date().toISOString();
                nuevaCategoria.creadoPor = 'Sistema';
                
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
    
    mostrarFormularioNuevaCategoria() {
        console.log('📝 Mostrando formulario para nueva categoría');
        
        try {
            // Limpiar formulario
            const form = document.getElementById('formCategoria');
            if (form) {
                form.reset();
            }
            
            document.getElementById('categoriaId').value = '';
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-tag me-2"></i>Nueva Categoría';
            document.getElementById('btnGuardarCategoria').textContent = 'Crear Categoría';
            document.getElementById('btnGuardarCategoria').className = 'btn btn-primary';
            
            // Actualizar opciones de categoría padre
            this.actualizarOpcionesCategoriaPadre();
            
            // Generar color aleatorio
            this.generarColorAleatorio();
            
            // Generar código automático si está vacío
            setTimeout(() => {
                const codigoInput = document.getElementById('codigo');
                if (!codigoInput.value) {
                    const timestamp = new Date().getTime().toString().slice(-4);
                    codigoInput.value = `CAT-${timestamp}`;
                }
            }, 100);
            
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
    
    actualizarOpcionesCategoriaPadre() {
        const jerarquia = document.getElementById('jerarquia').value;
        const categoriaPadreSelect = document.getElementById('categoriaPadre');
        
        // Limpiar opciones excepto la primera
        categoriaPadreSelect.innerHTML = '<option value="">Ninguna (categoría principal)</option>';
        
        if (jerarquia === 'subcategoria') {
            // Solo mostrar categorías principales
            this.categoriasPrincipales.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombreCategoria || categoria.nombre;
                categoriaPadreSelect.appendChild(option);
            });
            categoriaPadreSelect.disabled = false;
        } else if (jerarquia === 'subsubcategoria') {
            // Mostrar subcategorías
            const subcategorias = this.categorias.filter(cat => 
                cat.jerarquia === 'subcategoria' && !cat.eliminado
            );
            subcategorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombreCategoria || categoria.nombre;
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
                activo: true,
                subcategorias: categoria.subcategorias || []
            } : categoria;
            
            // Llenar formulario
            document.getElementById('categoriaId').value = catData.id;
            document.getElementById('nombreCategoria').value = catData.nombreCategoria || catData.nombre || '';
            document.getElementById('tipoCategoria').value = catData.tipoCategoria || 'otro';
            document.getElementById('descripcion').value = catData.descripcion || '';
            document.getElementById('caracteristicas').value = catData.caracteristicas || '';
            document.getElementById('color').value = catData.color || '#3498db';
            document.getElementById('icono').value = catData.icono || 'fas fa-tag';
            document.getElementById('jerarquia').value = catData.jerarquia || 'principal';
            document.getElementById('codigo').value = catData.codigo || '';
            document.getElementById('activo').checked = catData.activo !== false;
            
            // Cargar categorías padre primero
            await this.cargarCategorias();
            
            // Luego llenar el select de categoría padre
            setTimeout(() => {
                const categoriaPadreSelect = document.getElementById('categoriaPadre');
                categoriaPadreSelect.value = catData.categoriaPadre || '';
                this.actualizarOpcionesCategoriaPadre();
            }, 100);
            
            document.getElementById('modalTitle').innerHTML = `<i class="fas fa-edit me-2"></i>Editar Categoría: ${catData.nombreCategoria || catData.nombre}`;
            document.getElementById('btnGuardarCategoria').textContent = 'Actualizar Categoría';
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
            const categoria = await this.categoriaManager.obtenerCategoria(categoriaId);
            if (categoria && categoria.subcategorias && categoria.subcategorias.size > 0) {
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
                subcategorias: Array.from(categoria.subcategorias?.values() || []),
                id: categoria.id
            } : categoria;
            
            // Obtener nombre de la categoría padre si existe
            let nombreCategoriaPadre = 'Ninguna';
            if (catData.categoriaPadre) {
                const categoriaPadre = await this.categoriaManager.obtenerCategoria(catData.categoriaPadre);
                nombreCategoriaPadre = categoriaPadre ? 
                    (categoriaPadre.nombreCategoria || categoriaPadre.nombre || 'Desconocida') : 
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
            
            // Mapeo de jerarquías
            const jerarquias = {
                'principal': 'Principal',
                'subcategoria': 'Subcategoría',
                'subsubcategoria': 'Sub-subcategoría'
            };
            
            const contenido = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-4">
                            <div class="categoria-color me-3" style="background-color: ${catData.color || '#3498db'}; width: 30px; height: 30px;"></div>
                            <div>
                                <h4>${catData.nombreCategoria || catData.nombre}</h4>
                                <div class="d-flex align-items-center">
                                    <span class="badge badge-activo me-3">Activa</span>
                                    <span class="me-3"><i class="fas fa-tag me-1"></i>${catData.codigo || 'Sin código'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6><i class="fas fa-tag me-2"></i>Tipo</h6>
                                <p class="text-muted">${tipos[catData.tipoCategoria] || catData.tipoCategoria || 'Otro'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6><i class="fas fa-layer-group me-2"></i>Jerarquía</h6>
                                <p class="text-muted">${jerarquias[catData.jerarquia] || catData.jerarquia || 'Principal'}</p>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <h6><i class="fas fa-align-left me-2"></i>Descripción</h6>
                            <p class="text-muted">${catData.descripcion || 'Sin descripción'}</p>
                        </div>
                        
                        <div class="mb-4">
                            <h6><i class="fas fa-star me-2"></i>Características Especiales</h6>
                            <p class="text-muted">${catData.caracteristicas || 'Sin características'}</p>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información</h6>
                            </div>
                            <div class="card-body">
                                <p class="mb-2"><strong>Categoría Padre:</strong> ${nombreCategoriaPadre}</p>
                                <p class="mb-2"><strong>Ícono:</strong> <i class="${catData.icono || 'fas fa-tag'}"></i></p>
                                <p class="mb-2"><strong>Color:</strong> 
                                    <span class="badge" style="background-color: ${catData.color || '#3498db'}; color: white;">${catData.color || '#3498db'}</span>
                                </p>
                                <p class="mb-2"><strong>Subcategorías:</strong> ${catData.subcategorias?.length || 0}</p>
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
            case 'activar':
                // Tu clase no tiene activación/desactivación
                this.mostrarInfo('La activación/desactivación no está implementada en esta versión');
                break;
            case 'desactivar':
                // Tu clase no tiene activación/desactivación
                this.mostrarInfo('La activación/desactivación no está implementada en esta versión');
                break;
            case 'restaurar':
                // Tu clase no tiene eliminación lógica
                this.mostrarInfo('La restauración no está implementada en esta versión');
                break;
        }
    }
    
    // ========== INTERFAZ ==========
    
    actualizarTabla() {
        const tbody = document.getElementById('tablaCategoriasBody');
        if (!tbody) return;
        
        const categoriasFiltradas = this.filtrarCategorias(this.categorias);
        const categoriasPaginadas = this.paginarCategorias(categoriasFiltradas, this.paginacionActual);
        
        tbody.innerHTML = '';
        
        if (categoriasPaginadas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No se encontraron categorías</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        categoriasPaginadas.forEach((categoria, index) => {
            const numero = (this.paginacionActual - 1) * this.elementosPorPagina + index + 1;
            const fila = this.crearFilaCategoria(categoria, numero);
            tbody.appendChild(fila);
        });
        
        this.actualizarPaginacion(categoriasFiltradas.length);
    }
    
    crearFilaCategoria(categoria, numero) {
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
        
        // Mapeo de jerarquías
        const jerarquias = {
            'principal': 'Principal',
            'subcategoria': 'Subcategoría',
            'subsubcategoria': 'Sub-subcategoría'
        };
        
        // Obtener nombre de la categoría padre si existe
        let nombrePadre = '';
        if (categoria.categoriaPadre) {
            const padre = this.categorias.find(c => c.id === categoria.categoriaPadre);
            nombrePadre = padre ? `← ${padre.nombreCategoria || padre.nombre}` : '';
        }
        
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${numero}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="categoria-color" style="background-color: ${categoria.color || ''};"></div>
                    <div>
                        <strong>${categoria.nombreCategoria || categoria.nombre}</strong>
                        <div class="text-muted small">${categoria.codigo || 'Sin código'} ${nombrePadre}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge badge-${categoria.tipoCategoria || 'otro'}">${tipos[categoria.tipoCategoria] || categoria.tipoCategoria || 'Otro'}</span>
                <div class="small text-muted">${jerarquias[categoria.jerarquia] || categoria.jerarquia || 'Principal'}</div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="categoria-color me-2" style="background-color: ${categoria.color || ''}; width: 20px; height: 20px;"></div>
                    <span class="small">${categoria.color || '#3498db'}</span>
                </div>
            </td>
            <td>
                <span class="badge bg-primary">${categoria.subcategorias?.length || 0} subcategorías</span>
            </td>
            <td>${this.getBadgeEstado(categoria)}</td>
            <td>
                <div class="small">${categoria.fechaCreacion ? new Date(categoria.fechaCreacion).toLocaleDateString() : 'Reciente'}</div>
                <div class="text-muted smaller">${categoria.creadoPor || 'Sistema'}</div>
            </td>
            <td>
                <div class="action-buttons">
                    ${this.obtenerBotonesAccion(categoria)}
                </div>
            </td>
        `;
        
        // Asignar eventos
        setTimeout(() => {
            fila.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.closest('[data-action]').dataset.action;
                    const id = e.target.closest('[data-action]').dataset.id;
                    this.ejecutarAccion(action, id);
                });
            });
        }, 50);
        
        return fila;
    }
    
    getBadgeEstado(categoria) {
        // Tu clase no tiene estado de activo/eliminado
        return `<span class="badge badge-activo">Activa</span>`;
    }
    
    obtenerBotonesAccion(categoria) {
        // Como tu clase no tiene eliminación lógica, solo mostramos ver y editar
        return `
            <button class="btn btn-sm btn-primary" data-action="ver" data-id="${categoria.id}" title="Ver detalles">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning" data-action="editar" data-id="${categoria.id}" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${categoria.id}" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        `;
    }
    
    // ========== UTILIDADES ==========
    
    generarColorAleatorio() {
        const colores = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#d35400', '#8e44ad'];
        const colorInput = document.getElementById('color');
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
            infoElement.textContent = `Mostrando ${inicio} - ${fin} de ${totalElementos} categorías`;
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
                    <td colspan="8" class="text-center py-5">
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