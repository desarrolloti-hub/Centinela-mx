/**
 * INCIDENCIAS - Sistema Centinela
 * VERSIÓN: Con logo desde localStorage CORREGIDO
 */

// =============================================
// VARIABLES GLOBALES
// =============================================
let incidenciaManager = null;
let organizacionActual = null;
let incidenciasCache = [];
let sucursalesCache = [];
let categoriasCache = [];
let authToken = null;

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;

// Filtros activos
let filtrosActivos = {
    estado: 'todos',
    nivelRiesgo: 'todos',
    sucursalId: 'todos'
};

// Colores estilo judicial/formal
const coloresJudiciales = {
    primario: '#0B1E33',      // Azul marino profundo
    secundario: '#C5A028',     // Dorado elegante
    texto: '#2C3E50',          // Gris azulado para texto
    fondo: '#F8F9FA',          // Fondo gris muy claro
    borde: '#D4AF37',          // Dorado para bordes
    exito: '#27AE60',          // Verde para finalizado
    advertencia: '#F39C12',    // Naranja para pendiente
    peligro: '#E74C3C'         // Rojo para crítico
};

// =============================================
// INICIALIZACIÓN
//==============================================
async function inicializarIncidenciaManager() {
    try {
        await obtenerDatosOrganizacion();
        await obtenerTokenAuth();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        incidenciaManager = new IncidenciaManager();

        await cargarSucursales();
        await cargarCategorias();
        await cargarIncidencias();

        configurarEventListeners();
        agregarBotonPDFMultiple();

        return true;
    } catch (error) {
        console.error('Error al inicializar incidencias:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

async function obtenerTokenAuth() {
    try {
        // Intentar obtener token de Firebase
        if (window.firebase) {
            const user = firebase.auth().currentUser;
            if (user) {
                authToken = await user.getIdToken();
                console.log('Token de autenticación obtenido');
            }
        }

        // También buscar en localStorage
        if (!authToken) {
            const token = localStorage.getItem('firebaseToken') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('token');
            if (token) {
                authToken = token;
                console.log('Token encontrado en localStorage');
            }
        }
    } catch (error) {
        console.warn('Error obteniendo token:', error);
        authToken = null;
    }
}

async function obtenerDatosOrganizacion() {
    try {
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            organizacionActual = {
                nombre: user.organizacion || 'Mi Empresa',
                camelCase: user.organizacionCamelCase || ''
            };
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

        organizacionActual = {
            nombre: userData.organizacion || adminInfo.organizacion || 'Mi Empresa',
            camelCase: userData.organizacionCamelCase || adminInfo.organizacionCamelCase || ''
        };
    } catch (error) {
        organizacionActual = { nombre: 'Mi Empresa', camelCase: '' };
    }
}

async function cargarSucursales() {
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();

        if (organizacionActual.camelCase) {
            sucursalesCache = await sucursalManager.getSucursalesByOrganizacion(organizacionActual.camelCase);

            const filtroSucursal = document.getElementById('filtroSucursal');
            if (filtroSucursal) {
                filtroSucursal.innerHTML = '<option value="todos">Todas las sucursales</option>';
                sucursalesCache.forEach(suc => {
                    const option = document.createElement('option');
                    option.value = suc.id;
                    option.textContent = suc.nombre;
                    filtroSucursal.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        sucursalesCache = [];
    }
}

async function cargarCategorias() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        categoriasCache = await categoriaManager.obtenerTodasCategorias();
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categoriasCache = [];
    }
}

function configurarEventListeners() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltros);
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
}

// =============================================
// FUNCIONES DE FILTRADO
// =============================================
function aplicarFiltros() {
    filtrosActivos.estado = document.getElementById('filtroEstado').value;
    filtrosActivos.nivelRiesgo = document.getElementById('filtroRiesgo').value;
    filtrosActivos.sucursalId = document.getElementById('filtroSucursal').value;

    paginaActual = 1;
    renderizarIncidencias();
}

function limpiarFiltros() {
    document.getElementById('filtroEstado').value = 'todos';
    document.getElementById('filtroRiesgo').value = 'todos';
    document.getElementById('filtroSucursal').value = 'todos';

    filtrosActivos = {
        estado: 'todos',
        nivelRiesgo: 'todos',
        sucursalId: 'todos'
    };

    paginaActual = 1;
    renderizarIncidencias();
}

function filtrarIncidencias(incidencias) {
    return incidencias.filter(inc => {
        if (filtrosActivos.estado !== 'todos' && inc.estado !== filtrosActivos.estado) {
            return false;
        }

        if (filtrosActivos.nivelRiesgo !== 'todos' && inc.nivelRiesgo !== filtrosActivos.nivelRiesgo) {
            return false;
        }

        if (filtrosActivos.sucursalId !== 'todos' && inc.sucursalId !== filtrosActivos.sucursalId) {
            return false;
        }

        return true;
    });
}

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================
window.verDetallesIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/verIncidencias/verIncidencias.html?id=${incidenciaId}`;
};

window.seguimientoIncidencia = function (incidenciaId, event) {
    event?.stopPropagation();
    window.location.href = `/users/admin/segimientoIncidencias/segimientoIncidencias.html?id=${incidenciaId}`;
};

// =============================================
// GENERADOR DE PDF - CON LOGO CORREGIDO
// =============================================

const generadorPDF = {
    jsPDF: null,
    html2canvas: null,
    logoData: null,
    logoOrganizacionData: null,

    // TAMAÑOS DE FUENTE - GRANDES Y LEGIBLES
    fonts: {
        titulo: 20,        // Títulos principales
        subtitulo: 16,     // Subtítulos
        normal: 12,        // Texto normal
        small: 10,         // Texto pequeño
        mini: 8            // Texto muy pequeño
    },

    async cargarLibrerias() {
        try {
            if (!window.jspdf) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (!window.html2canvas) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
            this.jsPDF = window.jspdf?.jsPDF;
            this.html2canvas = window.html2canvas;
            if (!this.jsPDF || !this.html2canvas) {
                throw new Error('No se pudieron cargar las librerías necesarias');
            }
            return true;
        } catch (error) {
            console.error('Error cargando librerías:', error);
            throw error;
        }
    },

    cargarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async cargarLogo() {
        try {
            // Intentar cargar logo de Centinela desde localStorage primero
            console.log('Buscando logo de Centinela en localStorage...');
            const logoBase64 = localStorage.getItem('logo');
            if (logoBase64) {
                console.log('Logo Centinela encontrado en localStorage, longitud:', logoBase64.length);
                if (logoBase64.startsWith('data:image')) {
                    this.logoData = logoBase64;
                    console.log('✅ Logo Centinela cargado desde localStorage');
                    return true;
                } else {
                    console.log('El logo no es data URL, agregando prefijo...');
                    this.logoData = 'data:image/png;base64,' + logoBase64;
                    console.log('✅ Logo Centinela cargado con prefijo');
                    return true;
                }
            }

            console.log('Logo Centinela no encontrado en localStorage, buscando en rutas...');
            // Si no está en localStorage, buscar en rutas
            const rutasLogo = [
                '/asset/images/logo.png',
                '/assets/images/logo.png',
                '/images/logo.png',
                '/logo.png'
            ];

            for (const ruta of rutasLogo) {
                try {
                    const urlCompleta = window.location.origin + ruta;

                    const fetchOptions = {};
                    if (authToken) {
                        fetchOptions.headers = {
                            'Authorization': `Bearer ${authToken}`
                        };
                    }

                    const response = await fetch(urlCompleta, fetchOptions);

                    if (response.ok) {
                        const blob = await response.blob();
                        if (blob.type.startsWith('image/')) {
                            this.logoData = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                            console.log('✅ Logo Centinela cargado desde:', ruta);
                            return true;
                        }
                    }
                } catch (e) {
                    console.warn('Error con ruta:', ruta, e);
                }
            }

            console.warn('⚠️ No se pudo cargar el logo de Centinela');
            this.logoData = null;
            return false;

        } catch (error) {
            console.warn('Error cargando logo:', error);
            this.logoData = null;
            return false;
        }
    },

    async cargarLogoOrganizacion() {
        try {
            // Cargar logo de la organización desde localStorage con la key correcta
            console.log('Buscando logo de organización en localStorage con key: organizacionlogo...');
            const logoOrgBase64 = localStorage.getItem('organizacionlogo');

            if (logoOrgBase64) {
                console.log('✅ Logo de organización ENCONTRADO en localStorage, longitud:', logoOrgBase64.length);

                // Verificar si ya es data URL
                if (logoOrgBase64.startsWith('data:image')) {
                    this.logoOrganizacionData = logoOrgBase64;
                    console.log('Logo de organización cargado como data URL');
                } else {
                    // Si es base64 puro, agregar prefijo
                    this.logoOrganizacionData = 'data:image/png;base64,' + logoOrgBase64;
                    console.log('Logo de organización convertido a data URL con prefijo');
                }

                // Verificar que se cargó correctamente
                if (this.logoOrganizacionData && this.logoOrganizacionData.length > 100) {
                    console.log('✅ Logo de organización listo para usar en PDF');
                    return true;
                } else {
                    console.log('⚠️ Logo de organización parece vacío o inválido');
                }
            } else {
                console.log('❌ No se encontró organizacionlogo en localStorage');

                // Listar todas las keys de localStorage para debug
                console.log('Keys disponibles en localStorage:');
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    console.log(` - ${key}: ${localStorage.getItem(key) ? 'tiene valor' : 'vacío'}`);
                }
            }

            // Si no está en localStorage, buscar en rutas
            console.log('Buscando logo de organización en rutas...');
            const nombreOrg = organizacionActual?.camelCase || 'default';
            const rutasLogoOrg = [
                `/asset/images/organizaciones/${nombreOrg}.png`,
                `/assets/images/organizaciones/${nombreOrg}.png`,
                `/images/organizaciones/${nombreOrg}.png`,
                `/asset/images/${nombreOrg}-logo.png`,
                `/assets/images/${nombreOrg}-logo.png`
            ];

            for (const ruta of rutasLogoOrg) {
                try {
                    const urlCompleta = window.location.origin + ruta;

                    const fetchOptions = {};
                    if (authToken) {
                        fetchOptions.headers = {
                            'Authorization': `Bearer ${authToken}`
                        };
                    }

                    const response = await fetch(urlCompleta, fetchOptions);

                    if (response.ok) {
                        const blob = await response.blob();
                        if (blob.type.startsWith('image/')) {
                            this.logoOrganizacionData = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                            console.log('✅ Logo de organización cargado desde:', ruta);
                            return true;
                        }
                    }
                } catch (e) {
                    console.warn('Error con ruta de logo organización:', ruta, e);
                }
            }

            console.log('⚠️ No se encontró logo de organización');
            this.logoOrganizacionData = null;
            return false;

        } catch (error) {
            console.error('Error cargando logo de organización:', error);
            this.logoOrganizacionData = null;
            return false;
        }
    },

    // =============================================
    // FUNCIÓN PARA CARGAR IMÁGENES DE FIREBASE
    // =============================================
    async cargarImagenFirebase(url) {
        try {
            // Opciones de fetch con token
            const fetchOptions = {
                headers: {}
            };

            // Añadir token si existe
            if (authToken) {
                fetchOptions.headers['Authorization'] = `Bearer ${authToken}`;
            }

            // Intentar con la URL original primero
            let response = await fetch(url, fetchOptions).catch(() => null);

            // Si falla, intentar con proxy
            if (!response || !response.ok) {
                const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                response = await fetch(proxyUrl, fetchOptions);
            }

            if (!response || !response.ok) {
                throw new Error(`HTTP error! status: ${response?.status}`);
            }

            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) {
                throw new Error('El blob no es una imagen válida');
            }

            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });

        } catch (error) {
            console.error('Error cargando imagen:', error);
            return null;
        }
    },

    async generarPDFIncidencia(incidenciaId, organizacionCamelCase, opciones = {}) {
        try {
            Swal.fire({
                title: 'Generando IPH...',
                html: '<div class="progress-bar-container" style="width:100%; height:20px; background:rgba(255,255,255,0.1); border-radius:10px; margin-top:10px;"><div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #0B1E33, #C5A028); border-radius:10px; transition:width 0.3s;"></div></div>',
                allowOutsideClick: false,
                showConfirmButton: false
            });

            await this.cargarLibrerias();
            await this.cargarLogo();
            await this.cargarLogoOrganizacion();

            const incidencia = incidenciasCache.find(i => i.id === incidenciaId);
            if (!incidencia) throw new Error('Incidencia no encontrada');

            const sucursal = sucursalesCache.find(s => s.id === incidencia.sucursalId);
            const categoria = categoriasCache.find(c => c.id === incidencia.categoriaId);

            const config = {
                incluirImagenes: opciones.incluirImagenes !== false,
                incluirSeguimiento: opciones.incluirSeguimiento !== false,
                calidadImagenes: opciones.calidadImagenes || 0.7
            };

            const pdf = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Generar informe
            await this.generarInformeCompleto(pdf, incidencia, { sucursal, categoria, config });

            const nombreArchivo = `IPH_${incidencia.id}_${this.formatearFecha(new Date())}.pdf`;

            Swal.close();
            await this.mostrarOpcionesDescarga(pdf, nombreArchivo);

            return pdf;

        } catch (error) {
            console.error('Error generando PDF:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Error al generar el PDF'
            });
            throw error;
        }
    },

    // =============================================
    // INFORME COMPLETO - ESTILO JUDICIAL
    // =============================================
    async generarInformeCompleto(pdf, incidencia, datos) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let paginaActual = 1;
        let yPos = 20;

        // =============================================
        // ENCABEZADO CON LOGOS - ESTILO JUDICIAL
        // =============================================

        const dibujarEncabezado = () => {
            // Barra superior azul marino
            pdf.setFillColor(coloresJudiciales.primario);
            pdf.rect(0, 0, anchoPagina, 35, 'F');

            // Borde dorado inferior
            pdf.setDrawColor(coloresJudiciales.borde);
            pdf.setLineWidth(1);
            pdf.line(0, 35, anchoPagina, 35);

            // Logo Centinela (izquierda)
            let xLogo = margen;
            if (this.logoData) {
                try {
                    pdf.addImage(this.logoData, 'PNG', xLogo, 7, 22, 22);
                    console.log('✅ Logo Centinela agregado al PDF');
                    xLogo += 35;
                } catch (e) {
                    console.error('Error agregando logo Centinela:', e);
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.subtitulo);
                    pdf.text('CENTINELA', xLogo, 22);
                    xLogo += 50;
                }
            } else {
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.subtitulo);
                pdf.text('CENTINELA', xLogo, 22);
                xLogo += 50;
            }

            // Logo Organización (derecha) - CORREGIDO
            if (this.logoOrganizacionData) {
                try {
                    pdf.addImage(this.logoOrganizacionData, 'PNG', anchoPagina - margen - 22, 7, 22, 22);
                    console.log('✅ Logo de organización agregado al PDF');
                } catch (e) {
                    console.error('Error agregando logo de organización:', e);
                    pdf.setTextColor(coloresJudiciales.borde);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.small);
                    pdf.text(organizacionActual?.nombre || 'ORGANIZACIÓN', anchoPagina - margen - 70, 22);
                }
            } else {
                console.log('⚠️ No hay logo de organización para mostrar, mostrando texto');
                pdf.setTextColor(coloresJudiciales.borde);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.text(organizacionActual?.nombre || 'ORGANIZACIÓN', anchoPagina - margen - 80, 22);
            }

            // Título del documento
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.titulo);
            pdf.text('INFORME DE INCIDENCIA', anchoPagina / 2, 22, { align: 'center' });

            // Folio
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(this.fonts.normal);
            pdf.setTextColor(coloresJudiciales.borde);
            pdf.text(`Folio: ${incidencia.id?.toString() || 'N/A'}`, anchoPagina / 2, 30, { align: 'center' });
        };

        dibujarEncabezado();
        yPos = 50;

        // =============================================
        // DATOS GENERALES - ESTILO JUDICIAL
        // =============================================

        const datosGenerales = [
            { label: 'SUCURSAL', valor: datos.sucursal?.nombre?.toString() || 'No especificada' },
            { label: 'CATEGORÍA', valor: datos.categoria?.nombre?.toString() || 'No especificada' },
            { label: 'SUBCATEGORÍA', valor: incidencia.subcategoriaId?.toString() || 'No especificada' },
            { label: 'ESTADO', valor: (incidencia.getEstadoTexto?.() || incidencia.estado || 'N/A').toString(), color: this.getEstadoColor(incidencia.estado) },
            { label: 'RIESGO', valor: (incidencia.getNivelRiesgoTexto?.() || incidencia.nivelRiesgo || 'N/A').toString(), color: this.getRiesgoColor(incidencia.nivelRiesgo) },
            { label: 'REPORTADO POR', valor: (incidencia.reportadoPorId || 'Sistema').toString() }
        ];

        for (let i = 0; i < datosGenerales.length; i += 2) {
            if (i + 1 < datosGenerales.length) {
                // Marco para cada fila
                pdf.setDrawColor(coloresJudiciales.borde);
                pdf.setLineWidth(0.3);

                // Primera columna
                pdf.setFillColor(coloresJudiciales.fondo);
                pdf.roundedRect(margen, yPos, (anchoContenido / 2) - 3, 22, 2, 2, 'FD');

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresJudiciales.primario);
                pdf.text(datosGenerales[i].label, margen + 8, yPos + 8);

                pdf.setFont('helvetica', 'normal');
                if (datosGenerales[i].color) {
                    pdf.setTextColor(datosGenerales[i].color);
                } else {
                    pdf.setTextColor(coloresJudiciales.texto);
                }
                pdf.setFontSize(this.fonts.normal);
                pdf.text(datosGenerales[i].valor, margen + 8, yPos + 17);

                // Segunda columna
                pdf.setFillColor(coloresJudiciales.fondo);
                pdf.roundedRect(margen + (anchoContenido / 2), yPos, (anchoContenido / 2) - 3, 22, 2, 2, 'FD');

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.setTextColor(coloresJudiciales.primario);
                pdf.text(datosGenerales[i + 1].label, margen + (anchoContenido / 2) + 8, yPos + 8);

                pdf.setFont('helvetica', 'normal');
                if (datosGenerales[i + 1].color) {
                    pdf.setTextColor(datosGenerales[i + 1].color);
                } else {
                    pdf.setTextColor(coloresJudiciales.texto);
                }
                pdf.setFontSize(this.fonts.normal);
                pdf.text(datosGenerales[i + 1].valor, margen + (anchoContenido / 2) + 8, yPos + 17);

                yPos += 28;
            }
        }

        yPos += 5;

        // =============================================
        // DESCRIPCIÓN - ESTILO JUDICIAL
        // =============================================

        pdf.setFillColor(coloresJudiciales.fondo);
        pdf.setDrawColor(coloresJudiciales.borde);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margen, yPos, anchoContenido, 55, 3, 3, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(coloresJudiciales.primario);
        pdf.text('DESCRIPCIÓN DETALLADA', margen + 10, yPos + 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresJudiciales.texto);

        const descripcion = incidencia.detalles || 'No hay descripción disponible.';
        const lineasDesc = this.ajustarTexto(pdf, descripcion, anchoContenido - 30);

        lineasDesc.slice(0, 5).forEach((linea, i) => {
            pdf.text(linea, margen + 15, yPos + 26 + (i * 7));
        });

        yPos += 70;

        // =============================================
        // EVIDENCIAS - ESTILO JUDICIAL
        // =============================================

        if (datos.config.incluirImagenes && incidencia.imagenes && incidencia.imagenes.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(this.fonts.subtitulo);
            pdf.setTextColor(coloresJudiciales.primario);
            pdf.text('EVIDENCIAS DE LA INCIDENCIA', margen, yPos);

            yPos += 12;

            const imgWidth = 65;
            const imgHeight = 55;
            const espaciado = 10;
            const columnas = 2;

            let imagenesCargadas = 0;
            const totalImagenes = incidencia.imagenes.length;

            for (let i = 0; i < totalImagenes; i++) {
                // Verificar espacio para nueva fila
                if (i % columnas === 0 && i > 0) {
                    yPos += imgHeight + 30;
                }

                // Verificar si necesitamos nueva página
                if (yPos > 250) {
                    paginaActual++;
                    pdf.addPage();
                    dibujarEncabezado();
                    yPos = 50;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.subtitulo);
                    pdf.setTextColor(coloresJudiciales.primario);
                    pdf.text('EVIDENCIAS (CONTINUACIÓN)', margen, yPos - 5);
                }

                const columna = i % columnas;
                const xPos = margen + (columna * (imgWidth + espaciado));

                // Marco de la imagen con borde dorado
                pdf.setDrawColor(coloresJudiciales.borde);
                pdf.setFillColor(255, 255, 255);
                pdf.setLineWidth(0.5);
                pdf.roundedRect(xPos, yPos, imgWidth, imgHeight, 3, 3, 'FD');

                // Número de evidencia en círculo dorado
                pdf.setFillColor(coloresJudiciales.borde);
                pdf.circle(xPos + 12, yPos + 12, 6, 'F');
                pdf.setTextColor(coloresJudiciales.primario);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.small);
                pdf.text((i + 1).toString(), xPos + 12, yPos + 14, { align: 'center' });

                // Obtener URL de la imagen
                let imgUrl = '';
                let comentario = '';

                if (typeof incidencia.imagenes[i] === 'object') {
                    imgUrl = incidencia.imagenes[i].url || '';
                    comentario = incidencia.imagenes[i].comentario || '';
                } else {
                    imgUrl = String(incidencia.imagenes[i]);
                }

                if (imgUrl) {
                    try {
                        const imgData = await this.cargarImagenFirebase(imgUrl);
                        if (imgData) {
                            pdf.addImage(imgData, 'JPEG', xPos + 3, yPos + 3, imgWidth - 6, imgHeight - 6, undefined, 'FAST');
                            imagenesCargadas++;
                        } else {
                            // Placeholder si no carga
                            pdf.setFillColor(245, 245, 245);
                            pdf.rect(xPos + 3, yPos + 3, imgWidth - 6, imgHeight - 6, 'F');
                            pdf.setFontSize(this.fonts.titulo);
                            pdf.setTextColor(200, 200, 200);
                            pdf.setFont('helvetica', 'normal');
                            pdf.text('📷', xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                        }
                    } catch (e) {
                        console.warn(`Error cargando imagen ${i + 1}:`, e);
                        pdf.setFillColor(245, 245, 245);
                        pdf.rect(xPos + 3, yPos + 3, imgWidth - 6, imgHeight - 6, 'F');
                        pdf.setFontSize(this.fonts.titulo);
                        pdf.setTextColor(200, 200, 200);
                        pdf.text('📷', xPos + (imgWidth / 2), yPos + (imgHeight / 2), { align: 'center' });
                    }
                }

                // Comentario
                if (comentario) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresJudiciales.texto);
                    const comentCorto = comentario.length > 30 ? comentario.substring(0, 27) + '...' : comentario;
                    pdf.text(comentCorto, xPos + (imgWidth / 2), yPos + imgHeight + 8, { align: 'center' });
                }

                // Actualizar progreso
                this.actualizarProgreso(Math.round((i + 1) / totalImagenes * 50));
            }

            yPos += imgHeight + 30;
        }

        // =============================================
        // HISTORIAL DE SEGUIMIENTO - ESTILO JUDICIAL
        // =============================================

        if (datos.config.incluirSeguimiento) {
            const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];

            if (seguimientos.length > 0) {
                // Verificar espacio
                if (yPos > 230) {
                    paginaActual++;
                    pdf.addPage();
                    dibujarEncabezado();
                    yPos = 50;
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(this.fonts.subtitulo);
                pdf.setTextColor(coloresJudiciales.primario);
                pdf.text('HISTORIAL DE SEGUIMIENTO', margen, yPos);

                yPos += 12;

                for (let s = 0; s < seguimientos.length; s++) {
                    const seg = seguimientos[s];

                    // Verificar espacio
                    if (yPos > 250) {
                        paginaActual++;
                        pdf.addPage();
                        dibujarEncabezado();
                        yPos = 50;
                    }

                    // Tarjeta de seguimiento con borde dorado
                    pdf.setDrawColor(coloresJudiciales.borde);
                    pdf.setFillColor(coloresJudiciales.fondo);
                    pdf.setLineWidth(0.3);
                    pdf.roundedRect(margen, yPos, anchoContenido, 42, 3, 3, 'FD');

                    // Número en círculo dorado
                    pdf.setFillColor(coloresJudiciales.borde);
                    pdf.circle(margen + 15, yPos + 15, 7, 'F');
                    pdf.setTextColor(coloresJudiciales.primario);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.normal);
                    pdf.text((s + 1).toString(), margen + 15, yPos + 17, { align: 'center' });

                    // Fecha
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(this.fonts.normal);
                    pdf.setTextColor(coloresJudiciales.primario);
                    const fecha = seg.fecha ? new Date(seg.fecha).toLocaleString('es-MX') : 'N/A';
                    pdf.text(fecha, margen + 30, yPos + 10);

                    // Usuario
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresJudiciales.texto);
                    pdf.text(`por: ${seg.usuarioNombre || 'Usuario'}`, margen + 30, yPos + 20);

                    // Descripción
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(this.fonts.small);
                    pdf.setTextColor(coloresJudiciales.texto);
                    const descCorta = (seg.descripcion || '').substring(0, 120) + (seg.descripcion?.length > 120 ? '...' : '');
                    pdf.text(descCorta, margen + 30, yPos + 30);

                    yPos += 55;

                    // =============================================
                    // EVIDENCIAS DEL SEGUIMIENTO
                    // =============================================

                    if (seg.evidencias && seg.evidencias.length > 0) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(this.fonts.small);
                        pdf.setTextColor(coloresJudiciales.primario);
                        pdf.text('Evidencias del seguimiento:', margen + 30, yPos - 5);

                        const evidenciaWidth = 45;
                        const evidenciaHeight = 40;

                        for (let e = 0; e < Math.min(seg.evidencias.length, 3); e++) {
                            const xEvidencia = margen + 30 + (e * (evidenciaWidth + 8));

                            // Verificar espacio
                            if (yPos + evidenciaHeight > 280) {
                                paginaActual++;
                                pdf.addPage();
                                dibujarEncabezado();
                                yPos = 50;
                            }

                            // Marco con borde dorado
                            pdf.setDrawColor(coloresJudiciales.borde);
                            pdf.setFillColor(255, 255, 255);
                            pdf.setLineWidth(0.3);
                            pdf.roundedRect(xEvidencia, yPos, evidenciaWidth, evidenciaHeight, 2, 2, 'FD');

                            // Número de evidencia
                            pdf.setFillColor(coloresJudiciales.borde);
                            pdf.circle(xEvidencia + 10, yPos + 10, 5, 'F');
                            pdf.setTextColor(coloresJudiciales.primario);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setFontSize(this.fonts.mini);
                            pdf.text((e + 1).toString(), xEvidencia + 10, yPos + 11, { align: 'center' });

                            // Cargar imagen de evidencia
                            let evidenciaUrl = '';
                            let evidenciaComentario = '';
                            if (typeof seg.evidencias[e] === 'object') {
                                evidenciaUrl = seg.evidencias[e].url || '';
                                evidenciaComentario = seg.evidencias[e].comentario || '';
                            } else {
                                evidenciaUrl = String(seg.evidencias[e]);
                            }

                            if (evidenciaUrl) {
                                try {
                                    const imgData = await this.cargarImagenFirebase(evidenciaUrl);
                                    if (imgData) {
                                        pdf.addImage(imgData, 'JPEG', xEvidencia + 3, yPos + 3, evidenciaWidth - 6, evidenciaHeight - 6, undefined, 'FAST');
                                    } else {
                                        pdf.setFillColor(245, 245, 245);
                                        pdf.rect(xEvidencia + 3, yPos + 3, evidenciaWidth - 6, evidenciaHeight - 6, 'F');
                                        pdf.setFontSize(this.fonts.normal);
                                        pdf.setTextColor(200, 200, 200);
                                        pdf.text('📷', xEvidencia + (evidenciaWidth / 2), yPos + (evidenciaHeight / 2), { align: 'center' });
                                    }
                                } catch (e) {
                                    pdf.setFillColor(245, 245, 245);
                                    pdf.rect(xEvidencia + 3, yPos + 3, evidenciaWidth - 6, evidenciaHeight - 6, 'F');
                                }
                            }

                            // Comentario de evidencia
                            if (evidenciaComentario) {
                                pdf.setFont('helvetica', 'italic');
                                pdf.setFontSize(this.fonts.mini);
                                pdf.setTextColor(coloresJudiciales.texto);
                                const comentCorto = evidenciaComentario.length > 20 ? evidenciaComentario.substring(0, 17) + '...' : evidenciaComentario;
                                pdf.text(comentCorto, xEvidencia + (evidenciaWidth / 2), yPos + evidenciaHeight + 5, { align: 'center' });
                            }
                        }

                        yPos += evidenciaHeight + 15;
                    }
                }
            }
        }

        // =============================================
        // FIRMAS Y VALIDACIÓN - ESTILO JUDICIAL
        // =============================================

        // Asegurar espacio para firmas
        if (yPos > 240) {
            paginaActual++;
            pdf.addPage();
            dibujarEncabezado();
            yPos = 50;
        }

        // Línea separadora dorada
        pdf.setDrawColor(coloresJudiciales.borde);
        pdf.setLineWidth(0.5);
        pdf.line(margen, yPos, anchoPagina - margen, yPos);

        yPos += 10;

        // Sello de validación con escudo judicial
        pdf.setDrawColor(coloresJudiciales.borde);
        pdf.setLineWidth(1);
        pdf.circle(anchoPagina / 2, yPos + 12, 15, 'S');

        // Estrella dentro del círculo (simbolo judicial)
        for (let i = 0; i < 5; i++) {
            const angle = (i * 72 - 90) * Math.PI / 180;
            const x1 = anchoPagina / 2 + 8 * Math.cos(angle);
            const y1 = yPos + 12 + 8 * Math.sin(angle);
            const x2 = anchoPagina / 2 + 4 * Math.cos(angle + 36 * Math.PI / 180);
            const y2 = yPos + 12 + 4 * Math.sin(angle + 36 * Math.PI / 180);
            pdf.line(x1, y1, x2, y2);
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(coloresJudiciales.primario);
        pdf.text('VALIDADO', anchoPagina / 2, yPos + 12, { align: 'center' });

        // Líneas de firma
        pdf.setDrawColor(coloresJudiciales.texto);
        pdf.setLineWidth(0.3);

        pdf.line(margen + 30, yPos + 35, margen + 80, yPos + 35);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresJudiciales.texto);
        pdf.text('Firma del responsable', margen + 55, yPos + 42, { align: 'center' });

        pdf.line(anchoPagina - margen - 80, yPos + 35, anchoPagina - margen - 30, yPos + 35);
        pdf.text('Sello de la organización', anchoPagina - margen - 55, yPos + 42, { align: 'center' });

        // Información de generación
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.mini);
        pdf.setTextColor(coloresJudiciales.texto);
        const fechaGeneracion = new Date().toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        pdf.text(`Documento generado por Sistema Centinela · ${organizacionActual?.nombre || 'Organización'} · Página ${paginaActual} · ${fechaGeneracion}`, anchoPagina / 2, 280, { align: 'center' });

        // Sello de agua "JUDICIAL"
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(40);
        pdf.setTextColor(240, 240, 240);
        pdf.text('JUDICIAL', anchoPagina / 2, 200, { align: 'center', angle: 45 });
    },

    // =============================================
    // FUNCIONES AUXILIARES
    // =============================================

    getEstadoColor(estado) {
        const colores = {
            'pendiente': coloresJudiciales.advertencia,
            'finalizada': coloresJudiciales.exito
        };
        return colores[estado] || coloresJudiciales.texto;
    },

    getRiesgoColor(nivel) {
        const colores = {
            'bajo': coloresJudiciales.exito,
            'medio': coloresJudiciales.advertencia,
            'alto': '#E67E22',
            'critico': coloresJudiciales.peligro
        };
        return colores[nivel] || coloresJudiciales.texto;
    },

    ajustarTexto(pdf, texto, anchoMaximo) {
        if (!texto) return [''];
        const textoStr = texto.toString();
        const palabras = textoStr.split(' ');
        const lineas = [];
        let lineaActual = '';

        palabras.forEach(palabra => {
            const pruebaLinea = lineaActual ? `${lineaActual} ${palabra}` : palabra;
            const ancho = pdf.getTextWidth(pruebaLinea);

            if (ancho <= anchoMaximo) {
                lineaActual = pruebaLinea;
            } else {
                if (lineaActual) lineas.push(lineaActual);
                lineaActual = palabra;
            }
        });

        if (lineaActual) lineas.push(lineaActual);
        return lineas;
    },

    formatearFecha(fecha) {
        const d = fecha;
        return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}_${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}`;
    },

    actualizarProgreso(porcentaje) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) progressBar.style.width = `${porcentaje}%`;
    },

    async mostrarOpcionesDescarga(pdf, nombreArchivo) {
        const result = await Swal.fire({
            title: 'IPH Generado',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-file-pdf" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <p style="color: var(--color-text-primary); margin: 10px 0;">
                        El Informe Policial Homologado se ha generado correctamente.
                    </p>
                </div>
            `,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'DESCARGAR',
            cancelButtonText: 'CANCELAR',
            showDenyButton: true,
            denyButtonText: 'VISUALIZAR'
        });

        if (result.isConfirmed) {
            pdf.save(nombreArchivo);
        } else if (result.isDenied) {
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        }
    },

    async generarPDFMultiple(incidenciasIds) {
        try {
            if (incidenciasIds.length === 0) return;

            Swal.fire({
                title: 'Generando IPHs...',
                html: `<div>Procesando ${incidenciasIds.length} incidencia(s)...</div>`,
                allowOutsideClick: false,
                showConfirmButton: false
            });

            for (const id of incidenciasIds) {
                await this.generarPDFIncidencia(id, organizacionActual.camelCase, {
                    mostrarAlerta: false
                });
            }

            Swal.close();

            Swal.fire({
                icon: 'success',
                title: '¡Completado!',
                text: `Se generaron ${incidenciasIds.length} informes correctamente.`,
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error generando múltiples PDFs:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
            throw error;
        }
    }
};

// =============================================
// FUNCIONES PARA PDF (INTERFAZ)
// =============================================

window.generarPDFIncidencia = async function (incidenciaId, event) {
    event?.stopPropagation();

    try {
        const { value: opciones } = await Swal.fire({
            title: 'Generar Informe Judicial',
            html: `
                <div style="text-align: left; padding: 15px;">
                    <h4 style="color: #0B1E33; margin-bottom: 20px; font-family: 'Orbitron', sans-serif; border-bottom: 2px solid #C5A028; padding-bottom: 10px;">
                        <i class="fas fa-gavel"></i> Opciones del Informe Judicial
                    </h4>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #F8F9FA; border-radius: 8px; border-left: 4px solid #C5A028;">
                        <p style="color: #0B1E33; margin: 0; font-weight: bold;">
                            <i class="fas fa-balance-scale" style="color: #C5A028;"></i>
                            El informe incluye:
                        </p>
                        <ul style="color: #2C3E50; margin-top: 10px; padding-left: 25px;">
                            <li>Logo de Centinela y de la organización</li>
                            <li>Estilo formal/judicial con colores institucionales</li>
                            <li>Todas las evidencias de la incidencia</li>
                            <li>Todos los seguimientos con sus evidencias</li>
                            <li>Sello de validación y firmas</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="incluirImagenes" checked>
                            <span style="color: #0B1E33;">Incluir evidencias fotográficas</span>
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="incluirSeguimiento" checked>
                            <span style="color: #0B1E33;">Incluir historial de seguimiento</span>
                        </label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'GENERAR INFORME',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#0B1E33',
            cancelButtonColor: '#6c757d',
            focusConfirm: false,
            preConfirm: () => {
                return {
                    incluirImagenes: document.getElementById('incluirImagenes')?.checked ?? true,
                    incluirSeguimiento: document.getElementById('incluirSeguimiento')?.checked ?? true
                };
            }
        });

        if (opciones) {
            await generadorPDF.generarPDFIncidencia(
                incidenciaId,
                organizacionActual.camelCase,
                opciones
            );
        }

    } catch (error) {
        console.error('Error al generar IPH:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el informe: ' + error.message
        });
    }
};

window.generarPDFMultiple = async function () {
    try {
        const checkboxes = document.querySelectorAll('.incidencia-select:checked');

        if (checkboxes.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona incidencias',
                text: 'Debes seleccionar al menos una incidencia para generar los informes.'
            });
            return;
        }

        const incidenciasIds = Array.from(checkboxes).map(cb => cb.value);

        if (incidenciasIds.length > 5) {
            const confirm = await Swal.fire({
                icon: 'question',
                title: 'Múltiples informes',
                text: `Vas a generar ${incidenciasIds.length} informes. ¿Continuar?`,
                showCancelButton: true,
                confirmButtonText: 'SÍ, GENERAR',
                cancelButtonText: 'CANCELAR'
            });

            if (!confirm.isConfirmed) return;
        }

        await generadorPDF.generarPDFMultiple(incidenciasIds);

    } catch (error) {
        console.error('Error generando PDFs múltiples:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
};

// =============================================
// CARGAR INCIDENCIAS (código existente)
// =============================================
async function cargarIncidencias() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        const tbody = document.getElementById('tablaIncidenciasBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">Cargando incidencias...</td></tr>';

        incidenciasCache = await incidenciaManager.getIncidenciasByOrganizacion(organizacionActual.camelCase);

        if (!incidenciasCache || incidenciasCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-exclamation-triangle" style="font-size:48px; color:rgba(255,193,7,0.3); margin-bottom:16px;"></i>
                            <h5 style="color:white;">No hay incidencias registradas</h5>
                            <p style="color: var(--color-text-dim); margin-bottom: 20px;">Comienza registrando la primera incidencia de tu organización.</p>
                            <a href="/users/admin/crearIncidencias/crearIncidencia.html" class="btn-nueva-incidencia-header" style="display:inline-flex; margin-top:16px;">
                                <i class="fas fa-plus-circle"></i> Crear Incidencia
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        renderizarIncidencias();

    } catch (error) {
        console.error('Error al cargar incidencias:', error);
        mostrarError('Error al cargar incidencias: ' + error.message);
    }
}

function renderizarIncidencias() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (!tbody) return;

    const incidenciasFiltradas = filtrarIncidencias(incidenciasCache);

    incidenciasFiltradas.sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : 0;
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : 0;
        return fechaB - fechaA;
    });

    const totalItems = incidenciasFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const incidenciasPagina = incidenciasFiltradas.slice(inicio, fin);

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} incidencias`;
    }

    tbody.innerHTML = '';

    incidenciasPagina.forEach(incidencia => {
        crearFilaIncidencia(incidencia, tbody);
    });

    renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="irPagina(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

window.irPagina = function (pagina) {
    paginaActual = pagina;
    renderizarIncidencias();
};

function crearFilaIncidencia(incidencia, tbody) {
    const tr = document.createElement('tr');
    tr.className = 'incidencia-row';
    tr.dataset.id = incidencia.id;

    const sucursal = sucursalesCache.find(s => s.id === incidencia.sucursalId);
    const categoria = categoriasCache.find(c => c.id === incidencia.categoriaId);

    const riesgoTexto = incidencia.getNivelRiesgoTexto ? incidencia.getNivelRiesgoTexto() : incidencia.nivelRiesgo;
    const riesgoColor = incidencia.getNivelRiesgoColor ? incidencia.getNivelRiesgoColor() : '';
    const estadoTexto = incidencia.getEstadoTexto ? incidencia.getEstadoTexto() : incidencia.estado;

    const fechaInicio = incidencia.fechaInicio ?
        (incidencia.fechaInicio.toDate ?
            incidencia.fechaInicio.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
            new Date(incidencia.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })) :
        'N/A';

    tr.innerHTML = `
        <td data-label="ID / Folio">
            <span class="incidencia-id" title="${incidencia.id}">${incidencia.id}</span>
        </td>
        <td data-label="Sucursal">
            <div style="display: flex; align-items: center;">
                <div style="width:4px; height:24px; background:#00cfff; border-radius:2px; margin-right:12px; flex-shrink:0;"></div>
                <div>
                    <strong style=" title="${sucursal ? sucursal.nombre : 'No disponible'}">${sucursal ? sucursal.nombre : 'No disponible'}</strong>
                </div>
            </div>
        </td>
        <td data-label="Categoría">
            <div style="display: flex; align-items: center;">
                <span>${categoria ? categoria.nombre : 'No disponible'}</span>
            </div>
        </td>
        <td data-label="Riesgo">
            <span class="riesgo-badge ${incidencia.nivelRiesgo}" style="background: ${riesgoColor}20; color: ${riesgoColor}; border-color: ${riesgoColor}40;">
                ${riesgoTexto}
            </span>
        </td>
        <td data-label="Estado">
            <span class="estado-badge ${incidencia.estado}">
                ${estadoTexto}
            </span>
        </td>
        <td data-label="Fecha">
            ${fechaInicio}
        </td>
        <td data-label="Acciones">
            <div class="btn-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn" data-action="ver" data-id="${incidencia.id}" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn" data-action="pdf" data-id="${incidencia.id}" title="Generar IPH">
                    <i class="fas fa-file-pdf" style="color: #dc3545;"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="seguimiento" data-id="${incidencia.id}" title="Seguimiento">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);

    setTimeout(() => {
        tr.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'ver') window.verDetallesIncidencia(id, e);
                else if (action === 'pdf') window.generarPDFIncidencia(id, e);
                else if (action === 'seguimiento') window.seguimientoIncidencia(id, e);
            });
        });
    }, 50);
}

function agregarBotonPDFMultiple() {
    const cardHeader = document.querySelector('.card-header');
    if (cardHeader) {
        const btnPDFMultiple = document.createElement('button');
        btnPDFMultiple.className = 'btn-nueva-incidencia-header';
        btnPDFMultiple.style.marginLeft = '10px';
        btnPDFMultiple.innerHTML = '<i class="fas fa-file-pdf"></i> IPH Múltiple';
        btnPDFMultiple.onclick = window.generarPDFMultiple;

        const btnNueva = cardHeader.querySelector('.btn-nueva-incidencia-header');
        if (btnNueva) {
            btnNueva.parentNode.insertBefore(btnPDFMultiple, btnNueva.nextSibling);
        } else {
            cardHeader.appendChild(btnPDFMultiple);
        }
    }
}

// =============================================
// UTILIDADES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarError(mensaje) {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error</h5>
                        <p>${escapeHTML(mensaje)}</p>
                        <button class="btn-nueva-incidencia-header" onclick="location.reload()" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function mostrarErrorInicializacion() {
    const tbody = document.getElementById('tablaIncidenciasBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h5>Error de inicialización</h5>
                        <p>No se pudo cargar el módulo de incidencias.</p>
                        <button class="btn-nueva-incidencia-header" onclick="location.reload()" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    await inicializarIncidenciaManager();
});