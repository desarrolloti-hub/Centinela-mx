import { SucursalManager, ESTADOS_MEXICO } from '/clases/sucursal.js';

let historialManager = null; // ✅ NUEVO: Para registrar actividades

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

        // Timeout para debounce del listener de coordenadas
        this.coordenadasTimeout = null;

        // Bandera para evitar loops infinitos
        this.actualizandoDesdeMapa = false;

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

            // 2. Inicializar historialManager
            await this._initHistorial();

            // 3. Inicializar SucursalManager
            this.sucursalManager = new SucursalManager();

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Cargar regiones y estados
            await this._cargarRegiones();
            this._cargarEstados();

            // 6. Aplicar límites de caracteres
            this._aplicarLimitesCaracteres();

            // 7. Configurar listener de coordenadas
            this._configurarListenerCoordenadas();

            // 8. Inicializar mapa
            setTimeout(() => this._inicializarMapa(), 500);

            window.crearSucursalDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ✅ NUEVO: Inicializar historialManager
    async _initHistorial() {
        try {
            const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
            historialManager = new HistorialUsuarioManager();
            console.log('📋 HistorialManager inicializado para crear sucursales');
        } catch (error) {
            console.error('Error inicializando historialManager:', error);
        }
    }

    // ✅ NUEVO: Registrar creación de sucursal
    async _registrarCreacionSucursal(sucursal, datos) {
        if (!historialManager) return;

        try {
            await historialManager.registrarActividad({
                usuario: this.usuarioActual,
                tipo: 'crear',
                modulo: 'sucursales',
                descripcion: `Creó sucursal: ${datos.nombre}`,
                detalles: {
                    sucursalId: sucursal.id,
                    sucursalNombre: datos.nombre,
                    sucursalTipo: datos.tipo,
                    regionId: datos.regionId,
                    regionNombre: datos.regionNombre,
                    estado: datos.estado,
                    ciudad: datos.ciudad,
                    direccion: datos.direccion,
                    zona: datos.zona || 'No especificada',
                    contacto: datos.contacto,
                    coordenadas: {
                        latitud: datos.latitud,
                        longitud: datos.longitud
                    },
                    fechaCreacion: new Date().toISOString()
                }
            });
            console.log(`✅ Creación de sucursal "${datos.nombre}" registrada en bitácora`);
        } catch (error) {
            console.error('Error registrando creación de sucursal:', error);
        }
    }

    // ========== LISTENER DE COORDENADAS ==========
    _configurarListenerCoordenadas() {
        const latInput = document.getElementById('latitudSucursal');
        const lngInput = document.getElementById('longitudSucursal');

        if (latInput && lngInput) {
            // Listener para cuando cambian las coordenadas manualmente
            const handleCoordenadasChange = () => {
                // Limpiar timeout anterior
                if (this.coordenadasTimeout) {
                    clearTimeout(this.coordenadasTimeout);
                }

                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);

                // Validar que sean números válidos y estén dentro de México
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    if (!this._validarCoordenadasMexico(lat, lng)) {
                        this._mostrarNotificacion('Las coordenadas deben estar dentro del territorio mexicano', 'warning', 3000);
                        return;
                    }
                    // Esperar 500ms después de que el usuario deje de escribir
                    this.coordenadasTimeout = setTimeout(() => {
                        this._obtenerDireccionDesdeCoordenadas(lat, lng);
                    }, 500);
                }
            };

            latInput.addEventListener('input', handleCoordenadasChange);
            lngInput.addEventListener('input', handleCoordenadasChange);
        }
    }

    // ========== OBTENER DIRECCIÓN DESDE COORDENADAS ==========
    async _obtenerDireccionDesdeCoordenadas(lat, lng) {
        try {
            this._mostrarNotificacion('Obteniendo dirección exacta...', 'info', 1000);

            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            if (data && data.display_name) {
                const direccionInput = document.getElementById('direccionSucursal');
                const ciudadInput = document.getElementById('ciudadSucursal');
                const estadoSelect = document.getElementById('estadoSucursal');

                // Actualizar dirección (SOLO si no está vacía o es diferente)
                if (direccionInput) {
                    direccionInput.value = data.display_name;
                }

                // Actualizar ciudad si está disponible
                if (ciudadInput && data.address) {
                    const ciudad = data.address.city || data.address.town || data.address.village || data.address.municipality;
                    if (ciudad) {
                        ciudadInput.value = ciudad;
                    }
                }

                // Actualizar estado si está disponible y coincide con nuestra lista
                if (estadoSelect && data.address && data.address.state) {
                    const estadoEncontrado = data.address.state;
                    // Buscar si el estado existe en nuestro select
                    for (let i = 0; i < estadoSelect.options.length; i++) {
                        if (estadoSelect.options[i].text === estadoEncontrado) {
                            estadoSelect.selectedIndex = i;
                            break;
                        }
                    }
                }

                this._mostrarNotificacion('Dirección obtenida correctamente', 'success', 2000);
            }
        } catch (error) {
            console.error('Error obteniendo dirección:', error);
            this._mostrarNotificacion('No se pudo obtener la dirección', 'error', 2000);
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
        } else if (!this._validarCoordenadasMexico(parseFloat(latitud), parseFloat(longitudInput?.value))) {
            latitudInput?.classList.add('is-invalid');
            errores.push('La latitud debe estar dentro del territorio mexicano');
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
        } else if (!this._validarCoordenadasMexico(parseFloat(latitudInput?.value), parseFloat(longitud))) {
            longitudInput?.classList.add('is-invalid');
            errores.push('La longitud debe estar dentro del territorio mexicano');
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
                <div style="text-align: left;">
                    <p><strong>Nombre:</strong> ${this._escapeHTML(datos.nombre)}</p>
                    <p><strong>Tipo:</strong> ${this._escapeHTML(datos.tipo)}</p>
                    <p><strong>Región:</strong> ${this._escapeHTML(datos.regionNombre)}</p>
                    <p><strong>Estado:</strong> ${this._escapeHTML(datos.estado)}</p>
                    <p><strong>Ciudad:</strong> ${this._escapeHTML(datos.ciudad)}</p>
                    <p><strong>Dirección:</strong> ${this._escapeHTML(datos.direccion)}</p>
                    <p><strong>Zona:</strong> ${this._escapeHTML(datos.zona || 'No especificada')}</p>
                    <p><strong>Contacto:</strong> ${this._escapeHTML(datos.contacto)}</p>
                    <p><strong>Coordenadas:</strong> ${datos.latitud}, ${datos.longitud}</p>
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

            Swal.fire({
                title: 'Creando sucursal...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });

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

            Swal.close();

            // ✅ NUEVO: Registrar creación en bitácora
            await this._registrarCreacionSucursal(nuevaSucursal, datos);

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Sucursal creada!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Nombre:</strong> ${this._escapeHTML(datos.nombre)}</p>
                        <p><strong>Ubicación:</strong> ${this._escapeHTML(datos.ciudad)}, ${this._escapeHTML(datos.estado)}</p>
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
            Swal.close();
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

        // Resetear mapa a coordenadas por defecto (centro de México)
        if (this.map && this.marker) {
            this._colocarMarcador([23.6345, -102.5528]);
        }
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        window.location.href = '../sucursales/sucursales.html';
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
            // Coordenadas por defecto (Centro de México)
            const defaultLat = 23.6345;
            const defaultLng = -102.5528;
            const defaultZoom = 5;

            // Crear mapa con límites geográficos restringidos a México
            this.map = L.map('sucursalMap', {
                // Límites estrictos para México
                maxBounds: this._obtenerLimitesMexico(),
                maxBoundsViscosity: 1.0, // El mapa "rebota" al intentar salirse
                minZoom: 5, // Zoom mínimo para no alejarse demasiado
                maxZoom: 18, // Zoom máximo
                zoomControl: true
            }).setView([defaultLat, defaultLng], defaultZoom);

            // Capa de OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors | Centinela-MX',
                maxZoom: 19,
                minZoom: 5
            }).addTo(this.map);

            // Agregar control de zoom en la posición deseada
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);

            // Icono personalizado para el marcador
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: '<i class="fas fa-map-marker-alt" style="font-size: 30px; color: var(--color-accent-primary); filter: drop-shadow(0 0 5px var(--color-accent-primary));"></i>',
                iconSize: [30, 30],
                popupAnchor: [0, -15]
            });

            // Crear marcador (inicialmente en el centro de México)
            this.marker = L.marker([defaultLat, defaultLng], {
                draggable: true,
                icon: customIcon
            }).addTo(this.map);

            // Popup del marcador
            this.marker.bindPopup(`
                <b style="color: var(--color-accent-primary);">📍 Sucursal</b><br>
                Arrástrame para ajustar la posición
            `).openPopup();

            // Evento cuando se arrastra el marcador
            this.marker.on('dragend', (event) => {
                const position = event.target.getLatLng();
                // Validar que la posición esté dentro de México
                if (this._validarCoordenadasMexico(position.lat, position.lng)) {
                    this._actualizarCoordenadasMapa(position.lat, position.lng);
                    this._obtenerDireccionDesdeCoordenadas(position.lat, position.lng);
                } else {
                    // Si está fuera, regresar a la última posición válida
                    const ultimaLat = parseFloat(document.getElementById('latitudSucursal')?.value || defaultLat);
                    const ultimaLng = parseFloat(document.getElementById('longitudSucursal')?.value || defaultLng);
                    this._colocarMarcador([ultimaLat, ultimaLng]);
                    this._mostrarNotificacion('La ubicación debe estar dentro del territorio mexicano', 'warning', 3000);
                }
            });

            // Evento cuando se hace clic en el mapa
            this.map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                if (this._validarCoordenadasMexico(lat, lng)) {
                    this._colocarMarcador(e.latlng);
                    this._obtenerDireccionDesdeCoordenadas(lat, lng);
                } else {
                    this._mostrarNotificacion('Selecciona una ubicación dentro del territorio mexicano', 'warning', 3000);
                }
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

    // ========== OBTENER LÍMITES GEOGRÁFICOS DE MÉXICO ==========
    _obtenerLimitesMexico() {
        // Límites aproximados del territorio mexicano
        return L.latLngBounds(
            L.latLng(14.5, -118.5),  // Suroeste (esquina inferior izquierda)
            L.latLng(33.0, -86.5)    // Noreste (esquina superior derecha)
        );
    }

    // ========== VALIDAR QUE LAS COORDENADAS ESTÉN DENTRO DE MÉXICO ==========
    _validarCoordenadasMexico(lat, lng) {
        // Límites expandidos de México (incluyendo zonas marítimas y fronterizas)
        const limites = {
            minLat: 14.5,   // Sur: Chiapas, frontera con Guatemala
            maxLat: 33.0,   // Norte: Baja California, frontera con EE.UU.
            minLng: -118.5, // Oeste: Baja California, Océano Pacífico
            maxLng: -86.5   // Este: Quintana Roo, Mar Caribe
        };

        return lat >= limites.minLat &&
            lat <= limites.maxLat &&
            lng >= limites.minLng &&
            lng <= limites.maxLng;
    }

    _configurarEventosMapa() {
        // Botón centrar mapa
        const btnCentrar = document.getElementById('btnCentrarMapa');
        if (btnCentrar) {
            btnCentrar.addEventListener('click', () => {
                const lat = parseFloat(document.getElementById('latitudSucursal').value);
                const lng = parseFloat(document.getElementById('longitudSucursal').value);

                if (!isNaN(lat) && !isNaN(lng) && this._validarCoordenadasMexico(lat, lng)) {
                    this.map.setView([lat, lng], 15);
                } else {
                    this._mostrarNotificacion('Coordenadas no válidas o fuera de México', 'warning', 3000);
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
                if (!isNaN(lat) && !isNaN(lng) && this._validarCoordenadasMexico(lat, lng)) {
                    this.actualizandoDesdeMapa = true;
                    this._colocarMarcador([lat, lng]);
                    this.actualizandoDesdeMapa = false;
                } else if (!isNaN(lat) && !isNaN(lng)) {
                    this._mostrarNotificacion('Las coordenadas deben estar dentro de México', 'warning', 3000);
                }
            });

            lngInput.addEventListener('change', () => {
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);
                if (!isNaN(lat) && !isNaN(lng) && this._validarCoordenadasMexico(lat, lng)) {
                    this.actualizandoDesdeMapa = true;
                    this._colocarMarcador([lat, lng]);
                    this.actualizandoDesdeMapa = false;
                } else if (!isNaN(lat) && !isNaN(lng)) {
                    this._mostrarNotificacion('Las coordenadas deben estar dentro de México', 'warning', 3000);
                }
            });
        }

        // Evento para cuando se selecciona un estado
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

        // Actualizar campos del formulario (SOLO si no estamos actualizando desde el mapa)
        if (!this.actualizandoDesdeMapa) {
            const latInput = document.getElementById('latitudSucursal');
            const lngInput = document.getElementById('longitudSucursal');

            if (latInput) latInput.value = latFormatted;
            if (lngInput) lngInput.value = lngFormatted;
        }

        // Actualizar display en el mapa
        const mapLat = document.getElementById('mapLatitud');
        const mapLng = document.getElementById('mapLongitud');

        if (mapLat) mapLat.textContent = latFormatted;
        if (mapLng) mapLng.textContent = lngFormatted;
    }

    // ========== BUSCAR DIRECCIÓN ==========
    async _buscarDireccionEnMapa() {
        const direccion = document.getElementById('direccionSucursal').value;

        if (!direccion) {
            this._mostrarNotificacion('Por favor ingresa una dirección para buscar', 'warning');
            return;
        }

        try {
            this._mostrarCargando('Buscando dirección exacta...');

            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', México')}&limit=1&countrycodes=mx`);
            const data = await response.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);

                // Validar que esté dentro de México
                if (this._validarCoordenadasMexico(lat, lon)) {
                    this._colocarMarcador([lat, lon]);
                    await this._obtenerDireccionDesdeCoordenadas(lat, lon);
                    this._mostrarNotificacion('Dirección encontrada milimétricamente 🔍', 'success', 2000);
                } else {
                    this._mostrarNotificacion('La dirección encontrada está fuera del territorio mexicano', 'warning');
                }
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

        this._mostrarCargando('Obteniendo tu ubicación exacta...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (this._validarCoordenadasMexico(latitude, longitude)) {
                    this._colocarMarcador([latitude, longitude]);
                    this._obtenerDireccionDesdeCoordenadas(latitude, longitude);
                } else {
                    this._mostrarNotificacion('Tu ubicación actual está fuera del territorio mexicano', 'warning');
                }
                this._ocultarCargando();
            },
            (error) => {
                this._ocultarCargando();
                let mensaje = 'Error obteniendo ubicación';
                switch (error.code) {
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

    // ========== FUNCIÓN PARA CENTRAR MAPA EN ESTADO SELECCIONADO ==========
    _centrarMapaEnEstado(estado) {
        if (!this.map) return;

        // Coordenadas aproximadas de los estados de México
        const coordenadasEstados = {
            "Aguascalientes": [21.8853, -102.2916],
            "Baja California": [30.8406, -115.2838],
            "Baja California Sur": [25.8378, -111.9748],
            "Campeche": [19.8301, -90.5349],
            "Chiapas": [16.7569, -93.1292],
            "Chihuahua": [28.6329, -106.0691],
            "Coahuila": [27.0587, -101.7068],
            "Colima": [19.2452, -103.7241],
            "Durango": [24.0277, -104.6532],
            "Guanajuato": [21.0190, -101.2574],
            "Guerrero": [17.4392, -99.5451],
            "Hidalgo": [20.0911, -98.7624],
            "Jalisco": [20.6595, -103.3496],
            "México": [19.2870, -99.6544],
            "Estado de México": [19.2870, -99.6544],
            "Ciudad de México": [19.4326, -99.1332],
            "Michoacán": [19.5665, -101.7068],
            "Morelos": [18.6813, -99.1013],
            "Nayarit": [21.7514, -104.8455],
            "Nuevo León": [25.5921, -99.9962],
            "Oaxaca": [17.0732, -96.7266],
            "Puebla": [19.0414, -98.2062],
            "Querétaro": [20.5888, -100.3899],
            "Quintana Roo": [19.1814, -88.4794],
            "San Luis Potosí": [22.1565, -100.9855],
            "Sinaloa": [24.8091, -107.3940],
            "Sonora": [29.2970, -110.3309],
            "Tabasco": [17.9892, -92.9475],
            "Tamaulipas": [24.2669, -98.8362],
            "Tlaxcala": [19.3181, -98.2375],
            "Veracruz": [19.1738, -96.1342],
            "Yucatán": [20.7099, -89.0943],
            "Zacatecas": [23.1273, -102.8722]
        };

        const coords = coordenadasEstados[estado];

        if (coords) {
            let zoom = 8;
            const estadosPequeños = ["Aguascalientes", "Colima", "Morelos", "Tlaxcala", "Querétaro"];
            if (estadosPequeños.includes(estado)) {
                zoom = 9;
            }

            this.map.setView(coords, zoom);

            L.popup()
                .setLatLng(coords)
                .setContent(`
                    <div style="text-align: center;">
                        <b style="color: var(--color-accent-primary);">📍 ${estado}</b><br>
                        <small>Haz clic en el mapa para colocar la sucursal</small>
                    </div>
                `)
                .openOn(this.map);

            this._mostrarNotificacion(`Mapa centrado en ${estado}`, 'info', 2000);
        } else {
            console.warn(`No se encontraron coordenadas para el estado: ${estado}`);
            this.map.setView([23.6345, -102.5528], 5);
        }
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }

    window.crearSucursalDebug.controller = new CrearSucursalController();
});