// verIncidencias.js - Visualización de incidencias
// Carga y muestra los detalles de una incidencia específica

// Variable global para debugging
window.verIncidenciaDebug = {
    estado: 'iniciando',
    controller: null
};

// LÍMITES DE CARACTERES
const LIMITES = {
    DETALLES_INCIDENCIA: 1000
};

// =============================================
// CLASE PRINCIPAL - VerIncidenciaController
// =============================================
class VerIncidenciaController {
    constructor() {
        this.incidenciaManager = null;
        this.usuarioActual = null;
        this.incidencia = null;
        this.incidenciaId = null;
        this.sucursales = [];
        this.categorias = [];
        this.imageViewerModal = null;

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========

    async _init() {
        try {
            // 1. Obtener ID de incidencia de la URL
            this._obtenerIdIncidencia();

            if (!this.incidenciaId) {
                throw new Error('No se especificó el ID de la incidencia');
            }

            // 2. Cargar usuario
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            // 3. Inicializar IncidenciaManager
            await this._inicializarManager();

            // 4. Cargar datos relacionados
            await this._cargarDatosRelacionados();

            // 5. Cargar la incidencia
            await this._cargarIncidencia();

            // 6. Configurar eventos
            this._configurarEventos();

            // 7. Inicializar modal visualizador
            this._inicializarModal();

            window.verIncidenciaDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al cargar la incidencia: ' + error.message);
            setTimeout(() => this._volverALista(), 3000);
        }
    }

    _obtenerIdIncidencia() {
        const urlParams = new URLSearchParams(window.location.search);
        this.incidenciaId = urlParams.get('id');

        if (this.incidenciaId) {
            console.log('ID de incidencia:', this.incidenciaId);
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

    // ========== CARGA DE USUARIO ==========

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
                    correo: adminData.correoElectronico || ''
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
                correo: 'admin@centinela.com'
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

    // ========== CARGA DE DATOS RELACIONADOS ==========

    async _cargarDatosRelacionados() {
        try {
            await this._cargarSucursales();
            await this._cargarCategorias();
        } catch (error) {
            console.error('Error cargando datos relacionados:', error);
            // No es crítico, continuamos
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
        }
    }

    async _cargarCategorias() {
        try {
            const { CategoriaManager } = await import('/clases/categoria.js');
            const categoriaManager = new CategoriaManager();

            this.categorias = await categoriaManager.obtenerTodasCategorias();
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    // ========== CARGA DE LA INCIDENCIA ==========

    async _cargarIncidencia() {
        try {
            this._mostrarCargando('Cargando incidencia...');

            this.incidencia = await this.incidenciaManager.getIncidenciaById(
                this.incidenciaId,
                this.usuarioActual.organizacionCamelCase
            );

            if (!this.incidencia) {
                throw new Error('No se encontró la incidencia');
            }

            this._renderizarIncidencia();

        } catch (error) {
            console.error('Error cargando incidencia:', error);
            throw error;
        } finally {
            this._ocultarCargando();
        }
    }

    // ========== RENDERIZADO ==========

    _renderizarIncidencia() {
        // Información básica
        document.getElementById('incidenciaId').value = this.incidencia.id;

        // Organización
        document.getElementById('organization').value = this.usuarioActual.organizacion;

        // Sucursal
        const sucursal = this.sucursales.find(s => s.id === this.incidencia.sucursalId);
        document.getElementById('sucursalIncidencia').value = sucursal?.nombre || this.incidencia.sucursalId || 'No especificada';

        // Categoría
        const categoria = this.categorias.find(c => c.id === this.incidencia.categoriaId);
        document.getElementById('categoriaIncidencia').value = categoria?.nombre || this.incidencia.categoriaId || 'No especificada';

        // Subcategoría
        let subcategoriaNombre = 'No especificada';
        if (this.incidencia.subcategoriaId && categoria?.subcategorias) {
            if (categoria.subcategorias instanceof Map) {
                const sub = categoria.subcategorias.get(this.incidencia.subcategoriaId);
                subcategoriaNombre = sub?.nombre || this.incidencia.subcategoriaId;
            } else if (typeof categoria.subcategorias === 'object') {
                const sub = categoria.subcategorias[this.incidencia.subcategoriaId];
                subcategoriaNombre = sub?.nombre || this.incidencia.subcategoriaId;
            }
        }
        document.getElementById('subcategoriaIncidencia').value = subcategoriaNombre;

        // Nivel de riesgo con badge
        const riesgoBadge = document.getElementById('nivelRiesgoBadge');
        riesgoBadge.textContent = this.incidencia.getNivelRiesgoTexto();
        riesgoBadge.style.backgroundColor = `${this.incidencia.getNivelRiesgoColor()}20`;
        riesgoBadge.style.color = this.incidencia.getNivelRiesgoColor();
        riesgoBadge.style.border = `1px solid ${this.incidencia.getNivelRiesgoColor()}`;

        // Estado con badge
        const estadoBadge = document.getElementById('estadoBadge');
        estadoBadge.textContent = this.incidencia.getEstadoTexto();
        estadoBadge.style.backgroundColor = `${this.incidencia.getEstadoColor()}20`;
        estadoBadge.style.color = this.incidencia.getEstadoColor();
        estadoBadge.style.border = `1px solid ${this.incidencia.getEstadoColor()}`;

        // Fechas
        document.getElementById('fechaCreacion').value = this.incidencia.getFechaCreacionFormateada();
        document.getElementById('fechaHoraIncidencia').value = this.incidencia.getFechaInicioFormateada();

        // Fecha finalización (si existe)
        if (this.incidencia.fechaFinalizacion) {
            document.getElementById('fechaFinalizacion').value = this.incidencia.getFechaFinalizacionFormateada();
            document.getElementById('fechaFinalizacionContainer').style.display = 'block';
        }

        // Reportado por
        document.getElementById('reportadoPor').value = this.incidencia.creadoPorNombre || 'Usuario';

        // Descripción
        const detallesInput = document.getElementById('detallesIncidencia');
        detallesInput.value = this.incidencia.detalles || '';
        this._actualizarContador('detallesIncidencia', 'contadorCaracteres', LIMITES.DETALLES_INCIDENCIA);

        // Metadatos
        document.getElementById('creadoPor').textContent = this.incidencia.creadoPorNombre || 'Usuario';
        document.getElementById('fechaCreacionMeta').textContent = this.incidencia.getFechaCreacionFormateada();

        if (this.incidencia.fechaActualizacion) {
            document.getElementById('fechaActualizacion').textContent = this._formatearFecha(this.incidencia.fechaActualizacion);
        } else {
            document.getElementById('fechaActualizacion').textContent = 'No disponible';
        }

        document.getElementById('actualizadoPor').textContent = this.incidencia.actualizadoPorNombre || 'Usuario';

        // Imágenes
        this._renderizarImagenes();

        // Seguimiento
        this._renderizarSeguimiento();
    }

    _renderizarImagenes() {
        const container = document.getElementById('imagenesPreview');
        const countSpan = document.getElementById('imagenesCount');

        if (!container) return;

        const imagenes = this.incidencia.imagenes || [];

        if (countSpan) {
            countSpan.textContent = imagenes.length;
        }

        if (imagenes.length === 0) {
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-images"></i>
                    <p>No hay imágenes disponibles</p>
                </div>
            `;
            return;
        }

        let html = '';
        imagenes.forEach((imgUrl, index) => {
            // Extraer nombre del archivo de la URL
            const nombreArchivo = imgUrl.split('/').pop() || `Imagen ${index + 1}`;

            html += `
                <div class="preview-item" data-url="${imgUrl}">
                    <img src="${imgUrl}" alt="Imagen ${index + 1}" loading="lazy">
                    <div class="preview-overlay">
                        <button type="button" class="preview-btn view-btn" data-url="${imgUrl}" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <div class="image-comment">
                        <i class="fas fa-image"></i> ${nombreArchivo.substring(0, 15)}${nombreArchivo.length > 15 ? '...' : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Eventos para ver imágenes
        container.querySelectorAll('.preview-item, .view-btn').forEach(element => {
            element.addEventListener('click', (e) => {
                const url = e.currentTarget.closest('.preview-item')?.dataset.url ||
                    e.currentTarget.dataset.url;
                if (url) {
                    this._verImagen(url);
                }
            });
        });
    }

    _renderizarSeguimiento() {
        const container = document.getElementById('seguimientoContainer');
        if (!container) return;

        const seguimientos = this.incidencia.getSeguimientosArray();

        if (seguimientos.length === 0) {
            container.innerHTML = `
                <div class="no-seguimiento">
                    <i class="fas fa-comment-dots"></i>
                    <p>No hay registros de seguimiento</p>
                </div>
            `;
            return;
        }

        let html = '';
        seguimientos.forEach(seg => {
            const fecha = seg.fecha ? this._formatearFecha(seg.fecha) : 'Fecha no disponible';

            html += `
                <div class="seguimiento-item">
                    <div class="seguimiento-header">
                        <div class="seguimiento-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="seguimiento-info">
                            <div class="seguimiento-usuario">${this._escapeHTML(seg.usuarioNombre || 'Usuario')}</div>
                            <div class="seguimiento-fecha">
                                <i class="fas fa-clock"></i>
                                ${fecha}
                            </div>
                        </div>
                    </div>
                    <div class="seguimiento-descripcion">
                        ${this._escapeHTML(seg.descripcion || 'Sin descripción')}
                    </div>
            `;

            if (seg.evidencias && seg.evidencias.length > 0) {
                html += '<div class="seguimiento-evidencias">';
                seg.evidencias.forEach(evidencia => {
                    html += `
                        <div class="seguimiento-evidencia" onclick="window.verIncidenciaDebug.controller._verImagen('${evidencia}')">
                            <img src="${evidencia}" alt="Evidencia">
                        </div>
                    `;
                });
                html += '</div>';
            }

            html += '</div>';
        });

        container.innerHTML = html;
    }

    // ========== MODAL VISUALIZADOR ==========

    _inicializarModal() {
        const modal = document.getElementById('imageViewerModal');
        const closeBtn = document.getElementById('btnCerrarModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    _verImagen(url) {
        const modal = document.getElementById('imageViewerModal');
        const modalImg = document.getElementById('modalImage');
        const modalInfo = document.getElementById('modalImageInfo');

        if (modal && modalImg) {
            modalImg.src = url;
            if (modalInfo) {
                const nombreArchivo = url.split('/').pop() || 'Imagen';
                modalInfo.textContent = nombreArchivo;
            }
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    _configurarEventos() {
        // Botones volver
        document.getElementById('btnVolverLista')?.addEventListener('click', () => this._volverALista());
        document.getElementById('btnVolver')?.addEventListener('click', () => this._volverALista());
    }

    // ========== NAVEGACIÓN ==========

    _volverALista() {
        window.location.href = '/users/admin/incidencias/incidencias.html';
    }

    // ========== UTILIDADES ==========

    _actualizarContador(inputId, counterId, limite) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);

        if (input && counter) {
            const longitud = input.value.length;
            counter.textContent = `${longitud}/${limite}`;
        }
    }

    _formatearFecha(fecha) {
        if (!fecha) return 'No disponible';
        try {
            if (fecha && typeof fecha.toDate === 'function') {
                return fecha.toDate().toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
            if (fecha instanceof Date) {
                return fecha.toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
            if (typeof fecha === 'string' || typeof fecha === 'number') {
                const date = new Date(fecha);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                }
            }
            return 'Fecha no disponible';
        } catch {
            return 'Fecha no disponible';
        }
    }

    _mostrarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            confirmButtonText: 'Aceptar'
        });
    }

    _mostrarCargando(mensaje = 'Cargando...') {
        Swal.fire({
            title: mensaje,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    _ocultarCargando() {
        Swal.close();
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
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    window.verIncidenciaDebug.controller = new VerIncidenciaController();
});