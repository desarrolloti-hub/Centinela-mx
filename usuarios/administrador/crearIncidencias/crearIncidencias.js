// crearIncidencias.js - VERSIÓN CON BUSCADOR DE ÁREAS (SIN MODAL DE MOTIVO)

const LIMITES = {
    DETALLES_INCIDENCIA: 1000
};

class CrearIncidenciaController {
    constructor() {
        this.incidenciaManager = null;
        this.usuarioActual = null;
        this.sucursales = [];
        this.categorias = [];
        this.subcategoriasCache = {};
        this.categoriaSeleccionada = null;
        this.imagenesSeleccionadas = [];
        this.imageEditorModal = null;
        this.loadingOverlay = null;
        this.flatpickrInstance = null;
        this.historialManager = null;

        // =============================================
        // PROPIEDADES PARA CANALIZACIONES
        // =============================================
        this.areas = []; // Todas las áreas disponibles
        this.areasSeleccionadas = []; // Áreas seleccionadas para canalizar (múltiples)
        this.AreaManager = null; // Manager de áreas
        this._datosPendientes = null; // Datos temporales para después de agregar áreas
        // =============================================

        this._init();
    }

    async _initHistorialManager() {
        if (!this.historialManager) {
            try {
                const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
                this.historialManager = new HistorialUsuarioManager();
            } catch (error) {
                console.error('Error inicializando historialManager:', error);
            }
        }
        return this.historialManager;
    }

    async _init() {
        try {
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            await this._inicializarManager();
            await this._cargarDatosRelacionados();

            // =============================================
            // Cargar áreas disponibles
            // =============================================
            await this._cargarAreas();

            this._configurarOrganizacion();
            this._inicializarDateTimePicker();
            this._configurarEventos();
            this._inicializarValidaciones();

            this.imageEditorModal = new window.ImageEditorModal();

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    async _inicializarManager() {
        try {
            const { IncidenciaManager } = await import('/clases/incidencia.js');
            this.incidenciaManager = new IncidenciaManager();
        } catch (error) {
            console.error('Error cargando IncidenciaManager:', error);
            throw error;
        }
    }

    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput) {
            orgInput.value = this.usuarioActual.organizacion;
        }
    }

    _inicializarDateTimePicker() {
        const fechaInput = document.getElementById('fechaHoraIncidencia');
        if (fechaInput && typeof flatpickr !== 'undefined') {
            try {
                const ahora = new Date();

                this.flatpickrInstance = flatpickr(fechaInput, {
                    enableTime: true,
                    dateFormat: "Y-m-d H:i",
                    time_24hr: true,
                    locale: "es",
                    defaultDate: ahora,
                    minuteIncrement: 1,
                    maxDate: ahora,
                    disableMobile: true,
                    onChange: function (selectedDates, dateStr, instance) {
                        if (selectedDates.length > 0) {
                            const selectedDate = selectedDates[0];
                            const now = new Date();
                            if (selectedDate > now) {
                                instance.setDate(now, true);
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Fecha no válida',
                                    text: 'No puedes seleccionar una fecha futura',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error inicializando Flatpickr:', error);
                fechaInput.type = 'datetime-local';
                fechaInput.max = this._formatearFechaParaInput(new Date());
            }
        } else {
            console.warn('Flatpickr no está disponible, usando input nativo');
            const fechaInput = document.getElementById('fechaHoraIncidencia');
            if (fechaInput) {
                fechaInput.type = 'datetime-local';
                fechaInput.max = this._formatearFechaParaInput(new Date());
            }
        }
    }

    _formatearFechaParaInput(fecha) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const hours = String(fecha.getHours()).padStart(2, '0');
        const minutes = String(fecha.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async _cargarDatosRelacionados() {
        try {
            await this._cargarSucursales();
            await this._cargarCategorias();
        } catch (error) {
            console.error('Error cargando datos relacionados:', error);
            throw error;
        }
    }

    async _cargarSucursales() {
        try {
            const { SucursalManager } = await import('/clases/sucursal.js');
            const sucursalManager = new SucursalManager();

            this.sucursales = await sucursalManager.getSucursalesByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

        } catch (error) {
            console.error('Error cargando sucursales:', error);
            throw error;
        }
    }

    async _cargarCategorias() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            const categoriaManager = new CategoriaManager();

            this.categorias = await categoriaManager.obtenerTodasCategorias();

        } catch (error) {
            console.error('Error cargando categorías:', error);
            throw error;
        }
    }

    // =============================================
    // Cargar áreas disponibles
    // =============================================
    async _cargarAreas() {
        try {
            const { AreaManager } = await import('/clases/area.js');
            this.AreaManager = new AreaManager();

            if (this.usuarioActual && this.usuarioActual.organizacionCamelCase) {
                const areasObtenidas = await this.AreaManager.getAreasByOrganizacion(
                    this.usuarioActual.organizacionCamelCase
                );

                // Filtrar solo áreas activas
                this.areas = areasObtenidas.filter(area => area.estado === 'activa');

                console.log('✅ Áreas cargadas:', this.areas.length);
            }
        } catch (error) {
            console.error('Error cargando áreas:', error);
            this.areas = [];
        }
    }

    _cargarUsuario() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || adminData.uid || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || '',
                    email: adminData.correoElectronico || ''
                };
                return;
            }

            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                this.usuarioActual = {
                    id: userData.uid || userData.id || `user_${Date.now()}`,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || ''
                };
                return;
            }

            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                correo: 'admin@centinela.com',
                email: 'admin@centinela.com'
            };

        } catch (error) {
            console.error('Error cargando usuario:', error);
            throw error;
        }
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

    _inicializarValidaciones() {
        const detallesInput = document.getElementById('detallesIncidencia');
        if (detallesInput) {
            detallesInput.maxLength = LIMITES.DETALLES_INCIDENCIA;
            detallesInput.addEventListener('input', () => {
                this._validarLongitudCampo(
                    detallesInput,
                    LIMITES.DETALLES_INCIDENCIA,
                    'Los detalles'
                );
                this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
            });
        }

        this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);
    }

    _actualizarContador(inputId, counterId, limite) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);

        if (input && counter) {
            const longitud = input.value.length;
            counter.textContent = `${longitud}/${limite}`;

            if (longitud > limite * 0.9) {
                counter.style.color = 'var(--color-warning)';
            } else if (longitud > limite * 0.95) {
                counter.style.color = 'var(--color-danger)';
            } else {
                counter.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    _validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this._mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    _configurarEventos() {
        try {
            document.getElementById('btnVolverLista')?.addEventListener('click', () => this._volverALista());
            document.getElementById('btnCancelar')?.addEventListener('click', () => this._cancelarCreacion());

            document.getElementById('btnCrearIncidencia')?.addEventListener('click', (e) => {
                e.preventDefault();
                this._validarYGuardar();
            });

            document.getElementById('btnAgregarImagen')?.addEventListener('click', () => {
                document.getElementById('inputImagenes').click();
            });

            document.getElementById('inputImagenes')?.addEventListener('change', (e) => this._procesarImagenes(e.target.files));

            document.getElementById('formIncidenciaPrincipal')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this._validarYGuardar();
            });

            document.getElementById('categoriaIncidencia')?.addEventListener('change', (e) => {
                const categoriaId = e.target.dataset.selectedId;
                if (categoriaId) {
                    this._cargarSubcategorias(categoriaId);
                }
            });

            this._configurarSugerencias();
            this._configurarSugerenciasAreas();

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // =============================================
    // Configurar sugerencias para áreas (buscador)
    // =============================================
    _configurarSugerenciasAreas() {
        const inputArea = document.getElementById('areaIncidencia');

        if (inputArea) {
            inputArea.addEventListener('input', (e) => {
                this._mostrarSugerenciasArea(e.target.value);
            });

            inputArea.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('sugerenciasArea').innerHTML = '';
                }, 200);
            });

            inputArea.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this._mostrarSugerenciasArea(e.target.value);
                }
            });
        }
    }

    // =============================================
    // Mostrar sugerencias de áreas
    // =============================================
    _mostrarSugerenciasArea(termino) {
        const contenedor = document.getElementById('sugerenciasArea');
        if (!contenedor) return;

        const terminoLower = termino.toLowerCase().trim();

        if (terminoLower.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        // Filtrar áreas que coincidan con el término y que no estén ya seleccionadas
        const sugerencias = this.areas.filter(area => {
            const yaSeleccionada = this.areasSeleccionadas.some(a => a.id === area.id);
            return !yaSeleccionada && area.nombreArea.toLowerCase().includes(terminoLower);
        }).slice(0, 8);

        if (sugerencias.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencias-lista">
                    <div class="sugerencia-vacia">
                        <i class="fas fa-layer-group"></i>
                        <p>No se encontraron áreas disponibles</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="sugerencias-lista">';
        sugerencias.forEach(area => {
            html += `
                <div class="sugerencia-item" 
                     data-id="${area.id}" 
                     data-nombre="${area.nombreArea}">
                    <div class="sugerencia-icono">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="sugerencia-info">
                        <div class="sugerencia-nombre">${this._escapeHTML(area.nombreArea)}</div>
                        <div class="sugerencia-detalle">
                            <i class="fas fa-users"></i>
                            ${area.getCantidadCargosActivos ? area.getCantidadCargosActivos() + ' cargos' : 'Área disponible'}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.sugerencia-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const nombre = item.dataset.nombre;
                this._seleccionarArea(id, nombre);
            });
        });
    }

    // =============================================
    // Seleccionar área (SIN MODAL - selección directa)
    // =============================================
    _seleccionarArea(id, nombre) {
        const area = this.areas.find(a => a.id === id);
        if (!area) return;

        // Limpiar el input de búsqueda
        const inputArea = document.getElementById('areaIncidencia');
        if (inputArea) {
            inputArea.value = '';
        }

        // Agregar área directamente a la lista (sin motivo)
        this.areasSeleccionadas.push({
            id: area.id,
            nombre: area.nombreArea,
            motivo: '', // Sin motivo
            areaObj: area
        });

        this._actualizarListaAreasSeleccionadas();

        // =============================================
        // Preguntar si quiere agregar otra área
        // =============================================
        Swal.fire({
            title: '¿Agregar otra área?',
            text: '¿Deseas agregar otra área destino?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, agregar otra',
            cancelButtonText: 'No, continuar',
            confirmButtonColor: 'var(--color-accent-primary)'
        }).then((resp) => {
            if (resp.isConfirmed) {
                // Mantener el foco en el buscador para agregar otra
                document.getElementById('areaIncidencia')?.focus();
            } else {
                // Si hay datos pendientes, continuar con la creación
                if (this._datosPendientes) {
                    this._confirmarYGuardar({
                        ...this._datosPendientes,
                        canalizaciones: this.areasSeleccionadas
                    });
                    this._datosPendientes = null;
                }
            }
        });
    }

    // =============================================
    // Actualizar lista visual de áreas seleccionadas
    // =============================================
    _actualizarListaAreasSeleccionadas() {
        const container = document.getElementById('areasSeleccionadasContainer');
        const noAreasMessage = document.getElementById('noAreasMessage');

        if (!container) return;

        if (this.areasSeleccionadas.length === 0) {
            if (noAreasMessage) {
                noAreasMessage.style.display = 'flex';
            }
            return;
        }

        if (noAreasMessage) {
            noAreasMessage.style.display = 'none';
        }

        let html = '<div class="areas-grid">';

        this.areasSeleccionadas.forEach((area, index) => {
            html += `
                <div class="area-item" data-index="${index}">
                    <div class="area-header">
                        <i class="fas fa-layer-group"></i>
                        <span class="area-nombre">${this._escapeHTML(area.nombre)}</span>
                        <button type="button" class="area-remove" data-index="${index}" title="Quitar área">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        container.innerHTML = html;

        // Agregar event listeners a los botones de eliminar
        container.querySelectorAll('.area-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this._quitarArea(index);
            });
        });
    }

    // =============================================
    // Quitar área seleccionada
    // =============================================
    _quitarArea(index) {
        Swal.fire({
            title: '¿Quitar área?',
            text: 'Esta área ya no recibirá la canalización',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                this.areasSeleccionadas.splice(index, 1);
                this._actualizarListaAreasSeleccionadas();
            }
        });
    }

    _configurarSugerencias() {
        const inputSucursal = document.getElementById('sucursalIncidencia');
        const inputCategoria = document.getElementById('categoriaIncidencia');

        if (inputSucursal) {
            inputSucursal.addEventListener('input', (e) => {
                this._mostrarSugerenciasSucursal(e.target.value);
            });

            inputSucursal.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('sugerenciasSucursal').innerHTML = '';
                }, 200);
            });

            inputSucursal.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this._mostrarSugerenciasSucursal(e.target.value);
                }
            });
        }

        if (inputCategoria) {
            inputCategoria.addEventListener('input', (e) => {
                this._mostrarSugerenciasCategoria(e.target.value);
            });

            inputCategoria.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('sugerenciasCategoria').innerHTML = '';
                }, 200);
            });

            inputCategoria.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this._mostrarSugerenciasCategoria(e.target.value);
                }
            });
        }
    }

    _mostrarSugerenciasSucursal(termino) {
        const contenedor = document.getElementById('sugerenciasSucursal');
        if (!contenedor) return;

        const terminoLower = termino.toLowerCase().trim();

        if (terminoLower.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        const sugerencias = this.sucursales.filter(suc =>
            suc.nombre.toLowerCase().includes(terminoLower) ||
            (suc.ciudad && suc.ciudad.toLowerCase().includes(terminoLower)) ||
            (suc.direccion && suc.direccion.toLowerCase().includes(terminoLower))
        ).slice(0, 8);

        if (sugerencias.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencias-lista">
                    <div class="sugerencia-vacia">
                        <i class="fas fa-store"></i>
                        <p>No se encontraron sucursales</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="sugerencias-lista">';
        sugerencias.forEach(suc => {
            const seleccionada = document.getElementById('sucursalIncidencia').dataset.selectedId === suc.id;
            html += `
                <div class="sugerencia-item ${seleccionada ? 'seleccionada' : ''}" 
                     data-id="${suc.id}" 
                     data-nombre="${suc.nombre}">
                    <div class="sugerencia-icono">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="sugerencia-info">
                        <div class="sugerencia-nombre">${this._escapeHTML(suc.nombre)}</div>
                        <div class="sugerencia-detalle">
                            <i class="fas fa-map-marker-alt"></i>
                            ${suc.ciudad || 'Sin ciudad'} - ${suc.direccion || 'Sin dirección'}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.sugerencia-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const nombre = item.dataset.nombre;
                this._seleccionarSucursal(id, nombre);
            });
        });
    }

    _mostrarSugerenciasCategoria(termino) {
        const contenedor = document.getElementById('sugerenciasCategoria');
        if (!contenedor) return;

        const terminoLower = termino.toLowerCase().trim();

        if (terminoLower.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        const sugerencias = this.categorias.filter(cat =>
            cat.nombre.toLowerCase().includes(terminoLower)
        ).slice(0, 8);

        if (sugerencias.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencias-lista">
                    <div class="sugerencia-vacia">
                        <i class="fas fa-tags"></i>
                        <p>No se encontraron categorías</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="sugerencias-lista">';
        sugerencias.forEach(cat => {
            const seleccionada = document.getElementById('categoriaIncidencia').dataset.selectedId === cat.id;
            const totalSubcategorias = cat.subcategorias ?
                (cat.subcategorias instanceof Map ? cat.subcategorias.size : Object.keys(cat.subcategorias).length) : 0;

            html += `
                <div class="sugerencia-item ${seleccionada ? 'seleccionada' : ''}" 
                     data-id="${cat.id}" 
                     data-nombre="${cat.nombre}">
                    <div class="sugerencia-icono">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div class="sugerencia-info">
                        <div class="sugerencia-nombre">${this._escapeHTML(cat.nombre)}</div>
                        <div class="sugerencia-detalle">
                            <i class="fas fa-layer-group"></i>
                            ${totalSubcategorias} subcategorías
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.sugerencia-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const nombre = item.dataset.nombre;
                this._seleccionarCategoria(id, nombre);
            });
        });
    }

    _seleccionarSucursal(id, nombre) {
        const input = document.getElementById('sucursalIncidencia');
        input.value = nombre;
        input.dataset.selectedId = id;
        input.dataset.selectedName = nombre;

        document.getElementById('sugerenciasSucursal').innerHTML = '';
    }

    _seleccionarCategoria(id, nombre) {
        const input = document.getElementById('categoriaIncidencia');
        input.value = nombre;
        input.dataset.selectedId = id;
        input.dataset.selectedName = nombre;

        document.getElementById('sugerenciasCategoria').innerHTML = '';

        this._cargarSubcategorias(id);
    }

    async _cargarSubcategorias(categoriaId) {
        const selectSubcategoria = document.getElementById('subcategoriaIncidencia');
        if (!selectSubcategoria) return;

        selectSubcategoria.innerHTML = '<option value="">Cargando subcategorías...</option>';
        selectSubcategoria.disabled = true;

        if (!categoriaId) {
            selectSubcategoria.innerHTML = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            selectSubcategoria.disabled = true;
            return;
        }

        const categoria = this.categorias.find(c => c.id === categoriaId);
        if (!categoria) {
            selectSubcategoria.innerHTML = '<option value="">-- Error: Categoría no encontrada --</option>';
            selectSubcategoria.disabled = true;
            return;
        }

        this.categoriaSeleccionada = categoria;

        try {
            let subcategoriasArray = [];

            if (categoria.subcategorias) {
                if (categoria.subcategorias instanceof Map) {
                    categoria.subcategorias.forEach((valor, clave) => {
                        if (valor && typeof valor === 'object') {
                            subcategoriasArray.push({
                                id: clave,
                                nombre: valor.nombre || clave,
                                ...valor
                            });
                        }
                    });
                }
                else if (categoria.subcategorias.entries && typeof categoria.subcategorias.entries === 'function') {
                    for (const [clave, valor] of categoria.subcategorias.entries()) {
                        if (valor && typeof valor === 'object') {
                            subcategoriasArray.push({
                                id: clave,
                                nombre: valor.nombre || clave,
                                ...valor
                            });
                        }
                    }
                }
                else if (typeof categoria.subcategorias.forEach === 'function') {
                    categoria.subcategorias.forEach((valor, clave) => {
                        if (valor && typeof valor === 'object') {
                            subcategoriasArray.push({
                                id: clave,
                                nombre: valor.nombre || clave,
                                ...valor
                            });
                        }
                    });
                }
                else if (typeof categoria.subcategorias === 'object') {
                    subcategoriasArray = Object.keys(categoria.subcategorias).map(key => ({
                        id: key,
                        nombre: categoria.subcategorias[key]?.nombre || key,
                        ...categoria.subcategorias[key]
                    }));
                }
            }

            if (subcategoriasArray.length === 0) {
                selectSubcategoria.innerHTML = '<option value="">-- No hay subcategorías disponibles --</option>';
                selectSubcategoria.disabled = true;
                return;
            }

            let options = '<option value="">-- Selecciona una subcategoría (opcional) --</option>';
            subcategoriasArray.forEach(sub => {
                options += `<option value="${sub.id}">${sub.nombre || sub.id}</option>`;
            });

            selectSubcategoria.innerHTML = options;
            selectSubcategoria.disabled = false;

        } catch (error) {
            console.error('Error cargando subcategorías:', error);
            selectSubcategoria.innerHTML = '<option value="">-- Error cargando subcategorías --</option>';
            selectSubcategoria.disabled = true;
        }
    }

    _procesarImagenes(files) {
        if (!files || files.length === 0) return;

        const nuevosArchivos = Array.from(files);
        const maxSize = 5 * 1024 * 1024;

        const archivosValidos = nuevosArchivos.filter(file => {
            if (file.size > maxSize) {
                this._mostrarNotificacion(`La imagen ${file.name} excede 5MB`, 'warning');
                return false;
            }
            return true;
        });

        archivosValidos.forEach(file => {
            this.imagenesSeleccionadas.push({
                file: file,
                preview: URL.createObjectURL(file),
                comentario: '',
                elementos: [],
                edited: false
            });
        });

        this._actualizarVistaPreviaImagenes();
        document.getElementById('inputImagenes').value = '';
    }

    _actualizarVistaPreviaImagenes() {
        const container = document.getElementById('imagenesPreview');
        const countSpan = document.getElementById('imagenesCount');

        if (!container) return;

        if (countSpan) {
            countSpan.textContent = this.imagenesSeleccionadas.length;
        }

        if (this.imagenesSeleccionadas.length === 0) {
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-images"></i>
                    <p>No hay imágenes seleccionadas</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.imagenesSeleccionadas.forEach((img, index) => {
            html += `
                <div class="preview-item">
                    <img src="${img.preview}" alt="Preview ${index + 1}">
                    <div class="preview-overlay">
                        <button type="button" class="preview-btn edit-btn" data-index="${index}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="preview-btn delete-btn" data-index="${index}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${img.edited ? '<span class="edited-badge"><i class="fas fa-check"></i> Editada</span>' : ''}
                    </div>
                    ${img.comentario ? `<div class="image-comment"><i class="fas fa-comment"></i> ${this._escapeHTML(img.comentario.substring(0, 30))}${img.comentario.length > 30 ? '...' : ''}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this._editarImagen(parseInt(index));
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this._eliminarImagen(parseInt(index));
            });
        });
    }

    _editarImagen(index) {
        if (this.imageEditorModal && this.imagenesSeleccionadas[index]) {
            const img = this.imagenesSeleccionadas[index];
            this.imageEditorModal.show(
                img.file,
                index,
                img.comentario,
                (savedIndex, editedFile, comentario, elementos) => {
                    this.imagenesSeleccionadas[savedIndex].file = editedFile;
                    this.imagenesSeleccionadas[savedIndex].comentario = comentario;
                    this.imagenesSeleccionadas[savedIndex].elementos = elementos;
                    this.imagenesSeleccionadas[savedIndex].edited = true;

                    if (this.imagenesSeleccionadas[savedIndex].preview) {
                        URL.revokeObjectURL(this.imagenesSeleccionadas[savedIndex].preview);
                    }
                    this.imagenesSeleccionadas[savedIndex].preview = URL.createObjectURL(editedFile);

                    this._actualizarVistaPreviaImagenes();
                }
            );
        }
    }

    _eliminarImagen(index) {
        Swal.fire({
            title: '¿Eliminar imagen?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                if (this.imagenesSeleccionadas[index].preview) {
                    URL.revokeObjectURL(this.imagenesSeleccionadas[index].preview);
                }
                this.imagenesSeleccionadas.splice(index, 1);
                this._actualizarVistaPreviaImagenes();
            }
        });
    }

    _validarYGuardar() {
        const sucursalInput = document.getElementById('sucursalIncidencia');
        const categoriaInput = document.getElementById('categoriaIncidencia');

        const sucursalId = sucursalInput.dataset.selectedId;
        const categoriaId = categoriaInput.dataset.selectedId;

        if (!sucursalId) {
            this._mostrarError('Debe seleccionar una sucursal válida de la lista');
            sucursalInput.focus();
            return;
        }

        if (!categoriaId) {
            this._mostrarError('Debe seleccionar una categoría válida de la lista');
            categoriaInput.focus();
            return;
        }

        const riesgoSelect = document.getElementById('nivelRiesgo');
        const nivelRiesgo = riesgoSelect.value;
        if (!nivelRiesgo) {
            this._mostrarError('Debe seleccionar el nivel de riesgo');
            riesgoSelect.focus();
            return;
        }

        const estadoSelect = document.getElementById('estadoIncidencia');
        const estado = estadoSelect.value;
        if (!estado) {
            this._mostrarError('Debe seleccionar el estado');
            estadoSelect.focus();
            return;
        }

        const fechaInput = document.getElementById('fechaHoraIncidencia');
        let fechaHora = fechaInput.value;

        if (!fechaHora) {
            this._mostrarError('Debe seleccionar fecha y hora');
            fechaInput.focus();
            return;
        }

        const fechaSeleccionada = new Date(fechaHora);
        const ahora = new Date();

        if (fechaSeleccionada > ahora) {
            this._mostrarError('No puede seleccionar una fecha futura');
            fechaInput.focus();
            return;
        }

        const detallesInput = document.getElementById('detallesIncidencia');
        const detalles = detallesInput.value.trim();
        if (!detalles) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción de la incidencia es obligatoria');
            detallesInput.focus();
            return;
        }
        if (detalles.length < 10) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError('La descripción debe tener al menos 10 caracteres');
            detallesInput.focus();
            return;
        }
        if (detalles.length > LIMITES.DETALLES_INCIDENCIA) {
            detallesInput.classList.add('is-invalid');
            this._mostrarError(`La descripción no puede exceder ${LIMITES.DETALLES_INCIDENCIA} caracteres`);
            detallesInput.focus();
            return;
        }
        detallesInput.classList.remove('is-invalid');

        const subcategoriaSelect = document.getElementById('subcategoriaIncidencia');
        const subcategoriaId = subcategoriaSelect.value;

        // =============================================
        // Preparar datos para guardar
        // =============================================
        const datos = {
            sucursalId,
            categoriaId,
            subcategoriaId: subcategoriaId || '',
            nivelRiesgo,
            estado,
            fechaHora,
            detalles,
            imagenes: this.imagenesSeleccionadas,
            canalizaciones: this.areasSeleccionadas
        };

        // Si no hay áreas seleccionadas, preguntar si quiere agregar
        if (this.areasSeleccionadas.length === 0) {
            this._preguntarAgregarAreas(datos);
        } else {
            this._confirmarYGuardar(datos);
        }
    }

    // =============================================
    // Preguntar si quiere agregar áreas
    // =============================================
    _preguntarAgregarAreas(datos) {
        Swal.fire({
            title: '¿Canalizar a áreas?',
            text: '¿Deseas canalizar esta incidencia a una o más áreas?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, agregar áreas',
            cancelButtonText: 'No, crear sin canalizar',
            confirmButtonColor: 'var(--color-accent-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                // Guardar datos temporales y enfocar el buscador de áreas
                this._datosPendientes = datos;
                document.getElementById('areaIncidencia')?.focus();
                this._mostrarNotificacion('Escribe y selecciona un área para canalizar', 'info', 3000);
            } else {
                // Continuar sin áreas
                this._confirmarYGuardar({
                    ...datos,
                    canalizaciones: []
                });
            }
        });
    }

    // =============================================
    // Guardar incidencia con canalizaciones
    // =============================================
    async _guardarIncidencia(datos) {
        const btnCrear = document.getElementById('btnCrearIncidencia');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check me-2"></i>Crear Incidencia';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
                btnCrear.disabled = true;
            }

            Swal.fire({
                title: 'Creando incidencia...',
                text: 'Por favor espere, esto puede tomar unos segundos.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const fechaObj = new Date(datos.fechaHora);

            const incidenciaData = {
                sucursalId: datos.sucursalId,
                categoriaId: datos.categoriaId,
                subcategoriaId: datos.subcategoriaId || '',
                nivelRiesgo: datos.nivelRiesgo,
                estado: datos.estado,
                fechaInicio: fechaObj,
                detalles: datos.detalles,
                reportadoPorId: this.usuarioActual.id,
                // =============================================
                // Agregar canalizaciones si existen
                // =============================================
                canalizaciones: datos.canalizaciones ? datos.canalizaciones.map(c => ({
                    areaId: c.id,
                    areaNombre: c.nombre,
                    motivo: c.motivo || ''
                })) : []
            };

            const archivos = datos.imagenes.map(img => img.file);

            // Crear la incidencia
            const nuevaIncidencia = await this.incidenciaManager.crearIncidencia(
                incidenciaData,
                this.usuarioActual,
                archivos,
                datos.imagenes
            );

            // Generar PDF
            const pdfGenerado = await this._generarYSubirPDF(nuevaIncidencia);

            Swal.close();

            // Mensaje de éxito con info de canalizaciones
            const totalCanalizaciones = datos.canalizaciones ? datos.canalizaciones.length : 0;
            const mensajeCanalizacion = totalCanalizaciones > 0
                ? `Canalizada a ${totalCanalizaciones} área(s).`
                : 'No se canalizó a ninguna área.';

            await Swal.fire({
                icon: 'success',
                title: '¡Incidencia creada!',
                text: pdfGenerado
                    ? `La incidencia y su PDF se han guardado correctamente. ${mensajeCanalizacion}`
                    : `La incidencia se creó pero hubo un problema con el PDF. ${mensajeCanalizacion}`,
                confirmButtonText: 'Ver incidencias',
                confirmButtonColor: '#28a745'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando incidencia:', error);
            Swal.close();
            this._mostrarError(error.message || 'No se pudo crear la incidencia');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    async _generarYSubirPDF(incidencia) {
        try {
            console.log('📄 Iniciando generación automática de PDF para:', incidencia.id);

            const { generadorIPH } = await import('/components/iph-generator.js');

            generadorIPH.configurar({
                organizacionActual: {
                    nombre: this.usuarioActual.organizacion,
                    camelCase: this.usuarioActual.organizacionCamelCase
                },
                sucursalesCache: this.sucursales,
                categoriasCache: this.categorias,
                authToken: localStorage.getItem('authToken')
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const incidenciaActualizada = await this.incidenciaManager.getIncidenciaById(
                incidencia.id,
                this.usuarioActual.organizacionCamelCase
            );

            if (!incidenciaActualizada) {
                throw new Error('No se pudo recargar la incidencia');
            }

            const pdfBlob = await generadorIPH.generarIPH(incidenciaActualizada, {
                mostrarAlerta: false,
                returnBlob: true
            });

            if (!pdfBlob || pdfBlob.size === 0) {
                throw new Error('El PDF generado está vacío');
            }

            console.log(`📦 PDF generado: ${pdfBlob.size} bytes`);

            const pdfFile = new File([pdfBlob], `incidencia_${incidencia.id}.pdf`, { type: 'application/pdf' });

            const rutaPDF = incidencia.getRutaPDF();
            console.log('📤 Subiendo a:', rutaPDF);

            const resultado = await this.incidenciaManager.subirArchivo(pdfFile, rutaPDF);

            const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
            const { db } = await import('/config/firebase-config.js');

            const collectionName = `incidencias_${this.usuarioActual.organizacionCamelCase}`;
            const incidenciaRef = doc(db, collectionName, incidencia.id);

            await updateDoc(incidenciaRef, {
                pdfUrl: resultado.url,
                fechaActualizacion: serverTimestamp()
            });

            console.log('✅ PDF subido exitosamente:', resultado.url);

            return true;

        } catch (error) {
            console.error('❌ Error generando PDF automático:', error);
            return false;
        }
    }

    async _confirmarYGuardar(datos) {
        const confirmResult = await Swal.fire({
            title: '¿Crear incidencia?',
            text: 'Revise que todos los datos sean correctos',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'CREAR INCIDENCIA',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#28a745',
            reverseButtons: false
        });

        if (confirmResult.isConfirmed) {
            await this._guardarIncidencia(datos);
        }
    }

    _volverALista() {
        this.imagenesSeleccionadas.forEach(img => {
            if (img.preview) {
                URL.revokeObjectURL(img.preview);
            }
        });
        window.location.href = '/usuarios/administrador/incidencias/incidencias.html';
    }

    _cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.imagenesSeleccionadas.forEach(img => {
                    if (img.preview) {
                        URL.revokeObjectURL(img.preview);
                    }
                });
                this._volverALista();
            }
        });
    }

    _redirigirAlLogin() {
        Swal.fire({
            icon: 'error',
            title: 'Sesión no válida',
            text: 'Debes iniciar sesión para continuar',
            confirmButtonText: 'Ir al login'
        }).then(() => {
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
        });
    }

    _mostrarError(mensaje) {
        this._mostrarNotificacion(mensaje, 'error');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' :
                tipo === 'error' ? 'Error' :
                    tipo === 'warning' ? 'Advertencia' : 'Información',
            text: mensaje,
            icon: tipo,
            timer: duracion,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }

    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    _mostrarCargando(mensaje = 'Guardando...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${mensaje}</div>
        `;

        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }

    _ocultarCargando() {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.crearIncidenciaDebug = { controller: new CrearIncidenciaController() };
});