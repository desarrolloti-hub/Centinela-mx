// crearSucursales.js - VERSIÓN CON MAPA Y NAVEGACIÓN POR ESTADOS
import { SucursalManager, ESTADOS_MEXICO } from '/clases/sucursal.js';

// Variable global para debugging
window.crearSucursalDebug = {
    estado: 'iniciando',
    controller: null
};

// LÍMITES DE CARACTERES
const LIMITES = {
    NOMBRE_SUCURSAL: 100,
    TIPO_SUCURSAL: 50,
    CIUDAD: 50,
    DIRECCION: 200,
    ZONA: 30,
    CONTACTO: 10,
    COORDENADA: 20
};

// =============================================
// CLASE PRINCIPAL - CrearSucursalController
// =============================================
class CrearSucursalController {
    constructor() {
        this.sucursalManager = null;
        this.usuarioActual = null;
        this.sucursalCreadaReciente = null;
        this.loadingOverlay = null;
        
        // Propiedades del mapa
        this.map = null;
        this.marker = null;
        this.mapInitialized = false;

        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            // 1. Cargar usuario
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            // 2. Inicializar SucursalManager
            this.sucursalManager = new SucursalManager();

            // 3. Configurar eventos
            this._configurarEventos();

            // 4. Cargar regiones y estados
            await this._cargarRegiones();
            this._cargarEstados();

            // 5. Aplicar límites de caracteres
            this._aplicarLimitesCaracteres();

            // 6. Inicializar mapa
            setTimeout(() => this._inicializarMapa(), 500);

            window.crearSucursalDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
            this._redirigirAlLogin();
        }
    }

    // ========== CARGA DE USUARIO ==========
    _cargarUsuario() {
        try {
            // PRIMERO: Intentar adminInfo (para administradores)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);

                this.usuarioActual = {
                    id: adminData.id || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || ''
                };
                return;
            }

            // SEGUNDO: Intentar userData
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

            // TERCERO: Datos por defecto (para desarrollo)
            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'pollos Ray',
                organizacionCamelCase: 'pollosRay',
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

    // ========== APLICAR LÍMITES DE CARACTERES ==========
    _aplicarLimitesCaracteres() {
        const campos = [
            { id: 'nombreSucursal', limite: LIMITES.NOMBRE_SUCURSAL, nombre: 'Nombre de la sucursal' },
            { id: 'tipoSucursal', limite: LIMITES.TIPO_SUCURSAL, nombre: 'Tipo de sucursal' },
            { id: 'zonaSucursal', limite: LIMITES.ZONA, nombre: 'Zona' },
            { id: 'ciudadSucursal', limite: LIMITES.CIUDAD, nombre: 'Ciudad' },
            { id: 'direccionSucursal', limite: LIMITES.DIRECCION, nombre: 'Dirección' },
            { id: 'contactoSucursal', limite: LIMITES.CONTACTO, nombre: 'Contacto' },
            { id: 'latitudSucursal', limite: LIMITES.COORDENADA, nombre: 'Latitud' },
            { id: 'longitudSucursal', limite: LIMITES.COORDENADA, nombre: 'Longitud' }
        ];

        campos.forEach(campo => {
            const input = document.getElementById(campo.id);
            if (input) {
                input.maxLength = campo.limite;
                input.addEventListener('input', () => this._validarLongitudCampo(input, campo.limite, campo.nombre));
            }
        });

        // Validación especial para teléfono (solo números)
        const contactoInput = document.getElementById('contactoSucursal');
        if (contactoInput) {
            contactoInput.addEventListener('input', (e) => {
                let valor = e.target.value.replace(/\D/g, '');
                if (valor.length > LIMITES.CONTACTO) {
                    valor = valor.substring(0, LIMITES.CONTACTO);
                }
                e.target.value = valor;
            });
        }
    }

    _validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this._mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            // Botón Volver a la lista
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            const btnCancelar = document.getElementById('cancelarBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Botón Crear Sucursal
            const btnCrear = document.getElementById('crearSucursalBtn');
            if (btnCrear) {
                btnCrear.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('sucursalForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    // ========== CARGA DE REGIONES Y ESTADOS ==========
    async _cargarRegiones() {
        try {
            const select = document.getElementById('regionSucursal');
            if (!select) return;

            select.innerHTML = '<option value="">-- Cargando regiones... --</option>';

            // Importar dinámicamente RegionManager
            const { RegionManager } = await import('/clases/region.js');
            const regionManager = new RegionManager();

            const regiones = await regionManager.getRegionesByOrganizacion(this.usuarioActual.organizacionCamelCase);

            select.innerHTML = '<option value="">-- Seleccione una región --</option>';

            if (regiones.length === 0) {
                select.innerHTML = '<option value="">-- No hay regiones disponibles --</option>';
                return;
            }

            regiones.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.nombre;
                option.setAttribute('data-region-nombre', region.nombre);
                select.appendChild(option);
            });

        } catch (error) {
            console.error('Error cargando regiones:', error);
            const select = document.getElementById('regionSucursal');
            if (select) {
                select.innerHTML = '<option value="">-- Error cargando regiones --</option>';
            }
        }
    }

    _cargarEstados() {
        const select = document.getElementById('estadoSucursal');
        if (!select) return;

        select.innerHTML = '<option value="">-- Seleccione un estado --</option>';

        ESTADOS_MEXICO.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            select.appendChild(option);
        });
    }

    // ========== VALIDACIÓN Y GUARDADO ==========
    _validarYGuardar() {
        // Obtener elementos
        const nombreInput = document.getElementById('nombreSucursal');
        const tipoInput = document.getElementById('tipoSucursal');
        const regionSelect = document.getElementById('regionSucursal');
        const estadoSelect = document.getElementById('estadoSucursal');
        const ciudadInput = document.getElementById('ciudadSucursal');
        const direccionInput = document.getElementById('direccionSucursal');
        const latitudInput = document.getElementById('latitudSucursal');
        const longitudInput = document.getElementById('longitudSucursal');
        const contactoInput = document.getElementById('contactoSucursal');
        const zonaInput = document.getElementById('zonaSucursal');

        const errores = [];

        // Validar nombre
        const nombre = nombreInput?.value.trim();
        if (!nombre) {
            nombreInput?.classList.add('is-invalid');
            errores.push('El nombre de la sucursal es obligatorio');
        } else if (nombre.length < 3) {
            nombreInput?.classList.add('is-invalid');
            errores.push('El nombre debe tener al menos 3 caracteres');
        } else {
            nombreInput?.classList.remove('is-invalid');
        }

        // Validar tipo
        const tipo = tipoInput?.value.trim();
        if (!tipo) {
            tipoInput?.classList.add('is-invalid');
            errores.push('El tipo de sucursal es obligatorio');
        } else {
            tipoInput?.classList.remove('is-invalid');
        }

        // Validar región
        const regionId = regionSelect?.value;
        if (!regionId) {
            regionSelect?.classList.add('is-invalid');
            errores.push('Debe seleccionar una región');
        } else {
            regionSelect?.classList.remove('is-invalid');
        }

        // Validar estado
        const estado = estadoSelect?.value;
        if (!estado) {
            estadoSelect?.classList.add('is-invalid');
            errores.push('Debe seleccionar un estado');
        } else {
            estadoSelect?.classList.remove('is-invalid');
        }

        // Validar ciudad
        const ciudad = ciudadInput?.value.trim();
        if (!ciudad) {
            ciudadInput?.classList.add('is-invalid');
            errores.push('La ciudad es obligatoria');
        } else {
            ciudadInput?.classList.remove('is-invalid');
        }

        // Validar dirección
        const direccion = direccionInput?.value.trim();
        if (!direccion) {
            direccionInput?.classList.add('is-invalid');
            errores.push('La dirección es obligatoria');
        } else {
            direccionInput?.classList.remove('is-invalid');
        }

        // Validar latitud
        const latitud = latitudInput?.value.trim();
        if (!latitud) {
            latitudInput?.classList.add('is-invalid');
            errores.push('La latitud es obligatoria');
        } else if (isNaN(latitud)) {
            latitudInput?.classList.add('is-invalid');
            errores.push('La latitud debe ser un número válido');
        } else {
            latitudInput?.classList.remove('is-invalid');
        }

        // Validar longitud
        const longitud = longitudInput?.value.trim();
        if (!longitud) {
            longitudInput?.classList.add('is-invalid');
            errores.push('La longitud es obligatoria');
        } else if (isNaN(longitud)) {
            longitudInput?.classList.add('is-invalid');
            errores.push('La longitud debe ser un número válido');
        } else {
            longitudInput?.classList.remove('is-invalid');
        }

        // Validar teléfono
        const contacto = contactoInput?.value.trim();
        if (!contacto) {
            contactoInput?.classList.add('is-invalid');
            errores.push('El teléfono de contacto es obligatorio');
        } else {
            const telefonoLimpio = contacto.replace(/\D/g, '');
            if (telefonoLimpio.length < 10) {
                contactoInput?.classList.add('is-invalid');
                errores.push('El teléfono debe tener 10 dígitos');
            } else {
                contactoInput?.classList.remove('is-invalid');
            }
        }

        // Mostrar errores
        if (errores.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: errores.map(msg => `• ${msg}`).join('<br>'),
                confirmButtonText: 'CORREGIR'
            });
            return;
        }

        // Obtener datos de la región
        const regionOption = regionSelect.options[regionSelect.selectedIndex];
        const regionNombre = regionOption.getAttribute('data-region-nombre') || regionOption.textContent;

        // Confirmar antes de guardar
        this._confirmarGuardado({
            nombre,
            tipo,
            regionId,
            regionNombre,
            estado,
            ciudad,
            direccion,
            zona: zonaInput?.value.trim() || '',
            contacto,
            latitud,
            longitud
        });
    }

    _confirmarGuardado(datos) {
        Swal.fire({
            title: 'Crear sucursal',
            html: `
                <div style="text-align: left; color: var(--color-text-secondary);">
                    <p><strong style="color: var(--color-accent-primary);">Nombre:</strong> ${this._escapeHTML(datos.nombre)}</p>
                    <p><strong style="color: var(--color-accent-primary);">Tipo:</strong> ${this._escapeHTML(datos.tipo)}</p>
                    <p><strong style="color: var(--color-accent-primary);">Región:</strong> ${this._escapeHTML(datos.regionNombre)}</p>
                    <p><strong style="color: var(--color-accent-primary);">Estado:</strong> ${this._escapeHTML(datos.estado)}</p>
                    <p><strong style="color: var(--color-accent-primary);">Ciudad:</strong> ${this._escapeHTML(datos.ciudad)}</p>
                    <p><strong style="color: var(--color-accent-primary);">Dirección:</strong> ${this._escapeHTML(datos.direccion)}</p>
                    <p><strong style="color: var(--color-accent-primary);">Contacto:</strong> ${datos.contacto || 'No especificado'}</p>
                    <p><strong style="color: var(--color-accent-primary);">Coordenadas:</strong> ${datos.latitud}, ${datos.longitud}</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR',
            cancelButtonText: 'CANCELAR',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                this._guardarSucursal(datos);
            }
        });
    }

    async _guardarSucursal(datos) {
        const btnCrear = document.getElementById('crearSucursalBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Sucursal';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            const sucursalData = {
                nombre: datos.nombre,
                tipo: datos.tipo,
                contacto: datos.contacto,
                direccion: datos.direccion,
                ciudad: datos.ciudad,
                estado: datos.estado,
                zona: datos.zona,
                regionId: datos.regionId,
                latitud: datos.latitud,
                longitud: datos.longitud
            };

            // Crear sucursal
            const nuevaSucursal = await this.sucursalManager.crearSucursal(sucursalData, { currentUser: this.usuarioActual });

            this.sucursalCreadaReciente = nuevaSucursal;

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Sucursal creada!',
                html: `
                    <div>
                        <p><strong>${this._escapeHTML(nuevaSucursal.nombre)}</strong></p>
                        <p>${nuevaSucursal.getUbicacionCompleta?.() || 'Ubicación registrada'}</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'CREAR OTRA',
                cancelButtonText: 'IR A SUCURSALES'
            }).then((result) => {
                if (result.isConfirmed) {
                    this._limpiarFormulario();
                } else {
                    this._volverALista();
                }
            });

        } catch (error) {
            console.error('Error guardando sucursal:', error);
            this._mostrarError(error.message || 'No se pudo crear la sucursal');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    _limpiarFormulario() {
        const form = document.getElementById('sucursalForm');
        if (form) form.reset();

        const selects = ['regionSucursal', 'estadoSucursal'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) select.selectedIndex = 0;
        });

        // Recargar regiones por si acaso
        this._cargarRegiones();
        
        // Resetear mapa a coordenadas por defecto
        if (this.map && this.marker) {
            this._colocarMarcador([25.686614, -100.316112]);
        }
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        window.location.href = '/users/admin/sucursales/sucursales.html';
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
            window.location.href = '/users/visitors/login/login.html';
        });
    }

    // ========== UTILIDADES ==========
    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

    _mostrarCargando(mensaje = 'Procesando...') {
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

    // ========== FUNCIONES DEL MAPA ==========
    _inicializarMapa() {
        try {
            // Coordenadas por defecto (Monterrey, México)
            const defaultLat = 25.686614;
            const defaultLng = -100.316112;

            // Crear mapa
            this.map = L.map('sucursalMap').setView([defaultLat, defaultLng], 13);

            // Capa de OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors | Centinela-MX'
            }).addTo(this.map);

            // Icono personalizado para el marcador
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: '<i class="fas fa-map-marker-alt"></i>',
                iconSize: [30, 30],
                popupAnchor: [0, -15]
            });

            // Crear marcador
            this.marker = L.marker([defaultLat, defaultLng], {
                draggable: true,
                icon: customIcon
            }).addTo(this.map);

            // Popup del marcador
            this.marker.bindPopup(`
                <b>Sucursal</b><br>
                Arrástrame para ajustar la posición
            `).openPopup();

            // Evento cuando se arrastra el marcador
            this.marker.on('dragend', (event) => {
                const position = event.target.getLatLng();
                this._actualizarCoordenadasMapa(position.lat, position.lng);
            });

            // Evento cuando se hace clic en el mapa
            this.map.on('click', (e) => {
                this._colocarMarcador(e.latlng);
            });

            // Sincronizar con campos de texto iniciales
            this._actualizarCoordenadasMapa(defaultLat, defaultLng);

            this.mapInitialized = true;
            
            // Configurar eventos del mapa
            this._configurarEventosMapa();

        } catch (error) {
            console.error('Error inicializando mapa:', error);
            this._mostrarNotificacion('Error al cargar el mapa', 'error');
        }
    }

    _configurarEventosMapa() {
        // Botón centrar mapa
        const btnCentrar = document.getElementById('btnCentrarMapa');
        if (btnCentrar) {
            btnCentrar.addEventListener('click', () => {
                const lat = parseFloat(document.getElementById('latitudSucursal').value);
                const lng = parseFloat(document.getElementById('longitudSucursal').value);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    this.map.setView([lat, lng], 15);
                }
            });
        }

        // Botón buscar dirección
        const btnBuscar = document.getElementById('btnBuscarDireccion');
        if (btnBuscar) {
            btnBuscar.addEventListener('click', () => this._buscarDireccionEnMapa());
        }

        // Botón obtener ubicación actual
        const btnUbicacion = document.getElementById('btnObtenerUbicacion');
        if (btnUbicacion) {
            btnUbicacion.addEventListener('click', () => this._obtenerUbicacionActual());
        }

        // Sincronizar cambios en los inputs de coordenadas
        const latInput = document.getElementById('latitudSucursal');
        const lngInput = document.getElementById('longitudSucursal');

        if (latInput && lngInput) {
            latInput.addEventListener('change', () => {
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);
                if (!isNaN(lat) && !isNaN(lng)) {
                    this._colocarMarcador([lat, lng]);
                }
            });

            lngInput.addEventListener('change', () => {
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);
                if (!isNaN(lat) && !isNaN(lng)) {
                    this._colocarMarcador([lat, lng]);
                }
            });
        }

        // ===== EVENTO PARA CUANDO SE SELECCIONA UN ESTADO =====
        const estadoSelect = document.getElementById('estadoSucursal');
        if (estadoSelect) {
            estadoSelect.addEventListener('change', (e) => {
                const estadoSeleccionado = e.target.value;
                if (estadoSeleccionado) {
                    this._centrarMapaEnEstado(estadoSeleccionado);
                }
            });
        }
    }

    _colocarMarcador(posicion) {
        if (!this.map || !this.marker) return;
        
        this.marker.setLatLng(posicion);
        this.map.setView(posicion, 15);
        this._actualizarCoordenadasMapa(posicion.lat, posicion.lng);
    }

    _actualizarCoordenadasMapa(lat, lng) {
        // Redondear a 6 decimales
        const latFormatted = Number(lat).toFixed(6);
        const lngFormatted = Number(lng).toFixed(6);
        
        // Actualizar campos del formulario
        const latInput = document.getElementById('latitudSucursal');
        const lngInput = document.getElementById('longitudSucursal');
        
        if (latInput) latInput.value = latFormatted;
        if (lngInput) lngInput.value = lngFormatted;
        
        // Actualizar display en el mapa
        const mapLat = document.getElementById('mapLatitud');
        const mapLng = document.getElementById('mapLongitud');
        
        if (mapLat) mapLat.textContent = latFormatted;
        if (mapLng) mapLng.textContent = lngFormatted;
    }

    async _buscarDireccionEnMapa() {
        const direccion = document.getElementById('direccionSucursal').value;
        
        if (!direccion) {
            this._mostrarNotificacion('Por favor ingresa una dirección para buscar', 'warning');
            return;
        }

        try {
            this._mostrarCargando('Buscando dirección...');
            
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=mx`);
            const data = await response.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                this._colocarMarcador([lat, lon]);
                
                // Actualizar ciudad si está vacía
                const ciudadInput = document.getElementById('ciudadSucursal');
                if (ciudadInput && !ciudadInput.value && data[0].display_name) {
                    const partes = data[0].display_name.split(',');
                    if (partes.length > 2) {
                        ciudadInput.value = partes[1].trim();
                    }
                }
                
                this._mostrarNotificacion('Dirección encontrada en el mapa', 'success', 2000);
            } else {
                this._mostrarNotificacion('No se encontró la dirección en México', 'warning');
            }
        } catch (error) {
            console.error('Error buscando dirección:', error);
            this._mostrarNotificacion('Error al buscar la dirección', 'error');
        } finally {
            this._ocultarCargando();
        }
    }

    _obtenerUbicacionActual() {
        if (!navigator.geolocation) {
            this._mostrarNotificacion('Tu navegador no soporta geolocalización', 'error');
            return;
        }

        this._mostrarCargando('Obteniendo tu ubicación...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this._colocarMarcador([latitude, longitude]);
                this._ocultarCargando();
                
                // Intentar obtener la dirección de estas coordenadas
                this._obtenerDireccionDeCoordenadas(latitude, longitude);
            },
            (error) => {
                this._ocultarCargando();
                let mensaje = 'Error obteniendo ubicación';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        mensaje = 'Permiso denegado para obtener ubicación';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        mensaje = 'Información de ubicación no disponible';
                        break;
                    case error.TIMEOUT:
                        mensaje = 'Tiempo de espera agotado';
                        break;
                }
                this._mostrarNotificacion(mensaje, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    async _obtenerDireccionDeCoordenadas(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();

            if (data && data.display_name) {
                const direccionInput = document.getElementById('direccionSucursal');
                if (direccionInput && !direccionInput.value) {
                    direccionInput.value = data.display_name;
                }
                
                // Actualizar ciudad si está vacía
                const ciudadInput = document.getElementById('ciudadSucursal');
                if (ciudadInput && !ciudadInput.value && data.address) {
                    ciudadInput.value = data.address.city || data.address.town || data.address.village || '';
                }
            }
        } catch (error) {
            console.error('Error obteniendo dirección:', error);
        }
    }

    // ========== NUEVA FUNCIÓN PARA CENTRAR MAPA EN ESTADO SELECCIONADO ==========
    _centrarMapaEnEstado(estado) {
        if (!this.map) return;
        
        // Coordenadas aproximadas de los estados de México
        const coordenadasEstados = {
            // Norte
            "Aguascalientes": [21.8853, -102.2916],
            "Baja California": [32.5000, -115.5000],
            "Baja California Sur": [25.0000, -111.5000],
            "Campeche": [19.0000, -90.5000],
            "Chiapas": [16.5000, -92.5000],
            "Chihuahua": [28.5000, -106.0000],
            "Coahuila": [27.5000, -101.5000],
            "Colima": [19.5000, -103.5000],
            "Durango": [24.5000, -104.5000],
            "Guanajuato": [21.0000, -101.5000],
            "Guerrero": [17.5000, -100.0000],
            "Hidalgo": [20.5000, -98.5000],
            "Jalisco": [20.5000, -103.5000],
            "México": [19.5000, -99.5000],
            "Estado de México": [19.5000, -99.5000],
            "Ciudad de México": [19.4326, -99.1332],
            "Michoacán": [19.5000, -101.5000],
            "Morelos": [18.5000, -99.0000],
            "Nayarit": [22.0000, -105.0000],
            "Nuevo León": [25.5000, -100.0000],
            "Oaxaca": [17.5000, -96.5000],
            "Puebla": [19.0000, -98.0000],
            "Querétaro": [20.5000, -100.0000],
            "Quintana Roo": [20.5000, -87.5000],
            "San Luis Potosí": [22.5000, -100.5000],
            "Sinaloa": [25.0000, -107.5000],
            "Sonora": [29.5000, -110.0000],
            "Tabasco": [18.0000, -92.5000],
            "Tamaulipas": [24.5000, -98.5000],
            "Tlaxcala": [19.5000, -98.5000],
            "Veracruz": [19.5000, -96.5000],
            "Yucatán": [20.5000, -89.0000],
            "Zacatecas": [23.5000, -102.5000]
        };

        // Buscar coordenadas del estado seleccionado
        const coords = coordenadasEstados[estado];
        
        if (coords) {
            // Centrar el mapa en el estado
            this.map.setView(coords, 8);
            
            // Crear un popup temporal indicando el estado
            L.popup()
                .setLatLng(coords)
                .setContent(`<b>${estado}</b><br>Haz clic en el mapa para colocar la sucursal`)
                .openOn(this.map);
            
            // Mostrar notificación
            this._mostrarNotificacion(`Mapa centrado en ${estado}`, 'info', 2000);
        } else {
            // Si no encontramos el estado, usamos coordenadas por defecto
            console.warn(`No se encontraron coordenadas para el estado: ${estado}`);
            this.map.setView([23.6345, -102.5528], 5); // Centro de México
        }
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    window.crearSucursalDebug.controller = new CrearSucursalController();
});