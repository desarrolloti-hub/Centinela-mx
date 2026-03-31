import { SucursalManager, ESTADOS_MEXICO } from '/clases/sucursal.js';

let historialManager = null;

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

// MAPEO DE ESTADOS A COORDENADAS APROXIMADAS
const COORDENADAS_ESTADOS = {
    "Aguascalientes": { lat: 21.8853, lng: -102.2916, rango: 1.5, ciudadPrincipal: "Aguascalientes", region: "Centro" },
    "Baja California": { lat: 30.8406, lng: -115.2838, rango: 2.5, ciudadPrincipal: "Mexicali", region: "Norte" },
    "Baja California Sur": { lat: 25.8378, lng: -111.9748, rango: 2.5, ciudadPrincipal: "La Paz", region: "Norte" },
    "Campeche": { lat: 19.8301, lng: -90.5349, rango: 1.5, ciudadPrincipal: "Campeche", region: "Sur" },
    "Chiapas": { lat: 16.7569, lng: -93.1292, rango: 1.8, ciudadPrincipal: "Tuxtla Gutiérrez", region: "Sur" },
    "Chihuahua": { lat: 28.6329, lng: -106.0691, rango: 2.5, ciudadPrincipal: "Chihuahua", region: "Norte" },
    "Coahuila": { lat: 27.0587, lng: -101.7068, rango: 2.0, ciudadPrincipal: "Saltillo", region: "Norte" },
    "Colima": { lat: 19.2452, lng: -103.7241, rango: 1.0, ciudadPrincipal: "Colima", region: "Centro" },
    "Durango": { lat: 24.0277, lng: -104.6532, rango: 1.8, ciudadPrincipal: "Durango", region: "Norte" },
    "Guanajuato": { lat: 21.0190, lng: -101.2574, rango: 1.5, ciudadPrincipal: "Guanajuato", region: "Centro" },
    "Guerrero": { lat: 17.4392, lng: -99.5451, rango: 1.8, ciudadPrincipal: "Chilpancingo", region: "Sur" },
    "Hidalgo": { lat: 20.0911, lng: -98.7624, rango: 1.2, ciudadPrincipal: "Pachuca", region: "Centro-Sur" },
    "Jalisco": { lat: 20.6595, lng: -103.3496, rango: 2.0, ciudadPrincipal: "Guadalajara", region: "Centro" },
    "México": { lat: 19.2870, lng: -99.6544, rango: 1.5, ciudadPrincipal: "Toluca", region: "Centro-Sur" },
    "Estado de México": { lat: 19.2870, lng: -99.6544, rango: 1.5, ciudadPrincipal: "Toluca", region: "Centro-Sur" },
    "Ciudad de México": { lat: 19.4326, lng: -99.1332, rango: 0.8, ciudadPrincipal: "Ciudad de México", region: "Centro-Sur" },
    "Michoacán": { lat: 19.5665, lng: -101.7068, rango: 1.8, ciudadPrincipal: "Morelia", region: "Centro" },
    "Morelos": { lat: 18.6813, lng: -99.1013, rango: 1.0, ciudadPrincipal: "Cuernavaca", region: "Centro-Sur" },
    "Nayarit": { lat: 21.7514, lng: -104.8455, rango: 1.5, ciudadPrincipal: "Tepic", region: "Centro" },
    "Nuevo León": { lat: 25.5921, lng: -99.9962, rango: 1.8, ciudadPrincipal: "Monterrey", region: "Norte" },
    "Oaxaca": { lat: 17.0732, lng: -96.7266, rango: 2.0, ciudadPrincipal: "Oaxaca", region: "Sur" },
    "Puebla": { lat: 19.0414, lng: -98.2062, rango: 1.5, ciudadPrincipal: "Puebla", region: "Centro-Sur" },
    "Querétaro": { lat: 20.5888, lng: -100.3899, rango: 1.2, ciudadPrincipal: "Querétaro", region: "Centro" },
    "Quintana Roo": { lat: 19.1814, lng: -88.4794, rango: 1.8, ciudadPrincipal: "Chetumal", region: "Sur" },
    "San Luis Potosí": { lat: 22.1565, lng: -100.9855, rango: 1.8, ciudadPrincipal: "San Luis Potosí", region: "Centro" },
    "Sinaloa": { lat: 24.8091, lng: -107.3940, rango: 2.0, ciudadPrincipal: "Culiacán", region: "Norte" },
    "Sonora": { lat: 29.2970, lng: -110.3309, rango: 2.5, ciudadPrincipal: "Hermosillo", region: "Norte" },
    "Tabasco": { lat: 17.9892, lng: -92.9475, rango: 1.2, ciudadPrincipal: "Villahermosa", region: "Sur" },
    "Tamaulipas": { lat: 24.2669, lng: -98.8362, rango: 2.0, ciudadPrincipal: "Ciudad Victoria", region: "Norte" },
    "Tlaxcala": { lat: 19.3181, lng: -98.2375, rango: 0.8, ciudadPrincipal: "Tlaxcala", region: "Centro-Sur" },
    "Veracruz": { lat: 19.1738, lng: -96.1342, rango: 2.0, ciudadPrincipal: "Xalapa", region: "Sur" },
    "Yucatán": { lat: 20.7099, lng: -89.0943, rango: 1.5, ciudadPrincipal: "Mérida", region: "Sur" },
    "Zacatecas": { lat: 23.1273, lng: -102.8722, rango: 1.5, ciudadPrincipal: "Zacatecas", region: "Centro" }
};

// MAPEO DE REGIONES A ESTADOS (para validación)
const REGIONES_POR_ESTADO = {
    "Norte": ["Baja California", "Baja California Sur", "Sonora", "Chihuahua", "Coahuila", "Nuevo León", "Tamaulipas", "Sinaloa", "Durango"],
    "Centro": ["Aguascalientes", "Guanajuato", "Querétaro", "San Luis Potosí", "Zacatecas", "Jalisco", "Michoacán", "Colima", "Nayarit"],
    "Centro-Sur": ["Ciudad de México", "Estado de México", "Morelos", "Tlaxcala", "Puebla", "Hidalgo"],
    "Sur": ["Guerrero", "Oaxaca", "Chiapas", "Veracruz", "Tabasco", "Campeche", "Yucatán", "Quintana Roo"]
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

        this.map = null;
        this.marker = null;
        this.mapInitialized = false;

        this.coordenadasTimeout = null;
        this.actualizandoDesdeMapa = false;
        this.validando = false;

        this._init();
    }

    async _init() {
        try {
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            await this._initHistorial();
            this.sucursalManager = new SucursalManager();
            this._configurarEventos();
            await this._cargarRegiones();
            this._cargarEstados();
            this._aplicarLimitesCaracteres();
            this._configurarListenerCoordenadas();
            this._configurarValidacionesCruzadas();

            setTimeout(() => this._inicializarMapa(), 500);

            window.crearSucursalDebug.controller = this;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // CONFIGURAR VALIDACIONES CRUZADAS
    _configurarValidacionesCruzadas() {
        const estadoSelect = document.getElementById('estadoSucursal');
        const regionSelect = document.getElementById('regionSucursal');
        const ciudadInput = document.getElementById('ciudadSucursal');
        const latInput = document.getElementById('latitudSucursal');
        const lngInput = document.getElementById('longitudSucursal');

        // Cuando cambia el estado, actualizar todo
        if (estadoSelect) {
            estadoSelect.addEventListener('change', async (e) => {
                if (this.validando) return;
                const estado = e.target.value;
                if (estado) {
                    await this._actualizarPorEstado(estado);
                }
                this._validarConsistenciaUbicacion('estado');
            });
        }

        if (regionSelect) {
            regionSelect.addEventListener('change', () => {
                if (this.validando) return;
                this._validarConsistenciaUbicacion('region');
            });
        }

        if (ciudadInput) {
            ciudadInput.addEventListener('blur', () => {
                if (this.validando) return;
                this._validarCiudadConEstado();
            });
        }

        if (latInput && lngInput) {
            const validarCoordenadasConEstado = () => {
                if (this.validando) return;
                this._validarCoordenadasConEstado();
            };
            latInput.addEventListener('change', validarCoordenadasConEstado);
            lngInput.addEventListener('change', validarCoordenadasConEstado);
        }
    }

    // ACTUALIZAR TODO CUANDO CAMBIA EL ESTADO (INCLUYE REGIÓN)
    async _actualizarPorEstado(estado) {
        try {
            this._mostrarNotificacion(`Cargando información de ${estado}...`, 'info', 1000);

            const coords = COORDENADAS_ESTADOS[estado];
            if (!coords) return;

            // 1. Centrar el mapa y colocar marcador
            if (this.map && this.marker) {
                this._colocarMarcador([coords.lat, coords.lng]);
            }

            // 2. Obtener información completa de la ubicación
            await this._obtenerInformacionCompletaUbicacion(coords.lat, coords.lng);

            // 3. Si la ciudad no se actualizó, usar la ciudad principal
            const ciudadInput = document.getElementById('ciudadSucursal');
            if (ciudadInput && (!ciudadInput.value || ciudadInput.value.trim() === '')) {
                ciudadInput.value = coords.ciudadPrincipal || this._obtenerCiudadPrincipal(estado);
            }

            // 4. Si la zona sigue vacía, intentar obtenerla específicamente
            const zonaInput = document.getElementById('zonaSucursal');
            if (zonaInput && (!zonaInput.value || zonaInput.value.trim() === '')) {
                await this._obtenerZonaPorCiudad(ciudadInput?.value || coords.ciudadPrincipal, estado);
            }

            // 5. ✅ ACTUALIZAR REGIÓN AUTOMÁTICAMENTE
            const regionCorrecta = coords.region || this._obtenerRegionPorEstado(estado);
            if (regionCorrecta) {
                await this._seleccionarRegion(regionCorrecta);
                console.log(`✅ Región "${regionCorrecta}" seleccionada para "${estado}"`);
            }

            this._mostrarNotificacion(`✅ Información de ${estado} cargada correctamente`, 'success', 2000);

        } catch (error) {
            console.error('Error actualizando por estado:', error);
            this._mostrarNotificacion(`Error cargando información de ${estado}`, 'error', 2000);
        }
    }

    // ✅ NUEVO: Obtener región por estado desde el mapeo
    _obtenerRegionPorEstado(estado) {
        for (const [region, estados] of Object.entries(REGIONES_POR_ESTADO)) {
            if (estados.includes(estado)) {
                return region;
            }
        }
        return null;
    }

    // ✅ NUEVO: Seleccionar región en el dropdown
    async _seleccionarRegion(regionNombre) {
        const regionSelect = document.getElementById('regionSucursal');
        if (!regionSelect) return;

        // Esperar a que las regiones estén cargadas
        let intentos = 0;
        while (regionSelect.options.length <= 1 && intentos < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            intentos++;
        }

        for (let i = 0; i < regionSelect.options.length; i++) {
            const optionText = regionSelect.options[i].textContent;
            if (optionText === regionNombre) {
                regionSelect.selectedIndex = i;
                console.log(`✅ Región "${regionNombre}" seleccionada correctamente`);
                return true;
            }
        }

        console.warn(`⚠️ Región "${regionNombre}" no encontrada en el select`);
        return false;
    }

    // OBTENER CIUDAD PRINCIPAL DEL ESTADO
    _obtenerCiudadPrincipal(estado) {
        const ciudadesPorEstado = {
            "Aguascalientes": "Aguascalientes",
            "Baja California": "Mexicali",
            "Baja California Sur": "La Paz",
            "Campeche": "Campeche",
            "Chiapas": "Tuxtla Gutiérrez",
            "Chihuahua": "Chihuahua",
            "Coahuila": "Saltillo",
            "Colima": "Colima",
            "Durango": "Durango",
            "Guanajuato": "Guanajuato",
            "Guerrero": "Chilpancingo",
            "Hidalgo": "Pachuca",
            "Jalisco": "Guadalajara",
            "México": "Toluca",
            "Estado de México": "Toluca",
            "Ciudad de México": "Ciudad de México",
            "Michoacán": "Morelia",
            "Morelos": "Cuernavaca",
            "Nayarit": "Tepic",
            "Nuevo León": "Monterrey",
            "Oaxaca": "Oaxaca de Juárez",
            "Puebla": "Puebla",
            "Querétaro": "Querétaro",
            "Quintana Roo": "Chetumal",
            "San Luis Potosí": "San Luis Potosí",
            "Sinaloa": "Culiacán",
            "Sonora": "Hermosillo",
            "Tabasco": "Villahermosa",
            "Tamaulipas": "Ciudad Victoria",
            "Tlaxcala": "Tlaxcala",
            "Veracruz": "Xalapa",
            "Yucatán": "Mérida",
            "Zacatecas": "Zacatecas"
        };
        return ciudadesPorEstado[estado] || "";
    }

    // OBTENER ZONA POR CIUDAD
    async _obtenerZonaPorCiudad(ciudad, estado) {
        if (!ciudad) return;

        try {
            const query = `${ciudad}, ${estado}, México`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&countrycodes=mx`);
            const data = await response.json();

            if (data && data.length > 0 && data[0].address) {
                const address = data[0].address;
                let zona =
                    address.suburb ||
                    address.neighbourhood ||
                    address.city_district ||
                    address.district ||
                    address.quarter ||
                    '';

                const zonaInput = document.getElementById('zonaSucursal');
                if (zonaInput && zona) {
                    zonaInput.value = zona;
                    console.log(`✅ Zona obtenida para ${ciudad}: ${zona}`);
                    return zona;
                }
            }

            console.log(`ℹ️ No se encontró zona específica para ${ciudad}`);
            return '';

        } catch (error) {
            console.error('Error obteniendo zona:', error);
            return '';
        }
    }

    // OBTENER INFORMACIÓN COMPLETA DE UBICACIÓN (CON REGIÓN)
    async _obtenerInformacionCompletaUbicacion(lat, lng) {
        try {
            this._mostrarNotificacion('Obteniendo información de ubicación...', 'info', 1000);

            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            if (data && data.address) {
                const address = data.address;

                // Actualizar dirección completa
                const direccionInput = document.getElementById('direccionSucursal');
                if (direccionInput && data.display_name) {
                    direccionInput.value = data.display_name;
                }

                // Actualizar CIUDAD
                const ciudadInput = document.getElementById('ciudadSucursal');
                let ciudad = null;
                if (ciudadInput) {
                    ciudad = address.city || address.town || address.village || address.municipality || address.county;
                    if (ciudad) {
                        ciudadInput.value = ciudad;
                    }
                }

                // Actualizar ESTADO
                const estadoSelect = document.getElementById('estadoSucursal');
                let estadoEncontrado = null;
                if (estadoSelect && address.state) {
                    estadoEncontrado = address.state;
                    let encontrado = false;

                    for (let i = 0; i < estadoSelect.options.length; i++) {
                        if (estadoSelect.options[i].text === estadoEncontrado) {
                            estadoSelect.selectedIndex = i;
                            encontrado = true;
                            break;
                        }
                    }

                    if (!encontrado) {
                        console.warn(`Estado "${estadoEncontrado}" no encontrado en la lista`);
                    }
                }

                // Actualizar ZONA
                const zonaInput = document.getElementById('zonaSucursal');
                if (zonaInput) {
                    let zona =
                        address.suburb ||
                        address.neighbourhood ||
                        address.city_district ||
                        address.district ||
                        address.quarter ||
                        '';

                    if (!zona && data.display_name) {
                        const partes = data.display_name.split(',');
                        if (partes.length >= 2) {
                            const posibleZona = partes[1].trim();
                            if (posibleZona.length > 2 && !posibleZona.match(/^\d+$/)) {
                                zona = posibleZona;
                            }
                        }
                    }

                    if (zona) {
                        zonaInput.value = zona;
                        console.log(`✅ Zona encontrada: ${zona}`);
                    } else {
                        zonaInput.value = '';
                    }
                }

                // ✅ ACTUALIZAR REGIÓN AUTOMÁTICAMENTE según el estado
                if (estadoEncontrado) {
                    const regionCorrecta = COORDENADAS_ESTADOS[estadoEncontrado]?.region || this._obtenerRegionPorEstado(estadoEncontrado);
                    if (regionCorrecta) {
                        await this._seleccionarRegion(regionCorrecta);
                    }
                }

                // Validar ciudad con estado
                if (estadoEncontrado && ciudad) {
                    await this._validarCiudadConEstado();
                }

                // Mostrar notificación con todos los datos
                let datosEncontrados = [];
                if (estadoEncontrado) datosEncontrados.push(`Estado: ${estadoEncontrado}`);
                if (ciudad) datosEncontrados.push(`Ciudad: ${ciudad}`);

                const zonaActual = document.getElementById('zonaSucursal')?.value;
                if (zonaActual) {
                    datosEncontrados.push(`Zona/Colonia: ${zonaActual}`);
                }

                const regionActual = document.getElementById('regionSucursal')?.options[document.getElementById('regionSucursal')?.selectedIndex]?.textContent;
                if (regionActual && regionActual !== '-- Seleccione una región --') {
                    datosEncontrados.push(`Región: ${regionActual}`);
                }

                if (datosEncontrados.length > 0) {
                    this._mostrarNotificacion(`📍 ${datosEncontrados.join(' • ')}`, 'success', 4000);
                }

            } else if (data && data.display_name) {
                const direccionInput = document.getElementById('direccionSucursal');
                if (direccionInput) {
                    direccionInput.value = data.display_name;
                }
                this._mostrarNotificacion('Dirección obtenida', 'info', 2000);
            }
        } catch (error) {
            console.error('Error obteniendo información:', error);
            this._mostrarNotificacion('No se pudo obtener la información de ubicación', 'error', 2000);
        }
    }

    // VALIDAR CONSISTENCIA ENTRE ESTADO Y REGIÓN
    _validarConsistenciaUbicacion(campoOrigen) {
        const estadoSelect = document.getElementById('estadoSucursal');
        const regionSelect = document.getElementById('regionSucursal');
        const estado = estadoSelect?.value;
        const regionNombre = regionSelect?.options[regionSelect.selectedIndex]?.textContent;

        if (!estado || !regionNombre || regionNombre === '-- Seleccione una región --') {
            return;
        }

        let regionCorrecta = this._obtenerRegionPorEstado(estado);

        if (regionCorrecta && regionNombre !== regionCorrecta) {
            this.validando = true;
            this._mostrarNotificacion(
                `⚠️ El estado "${estado}" pertenece a la región "${regionCorrecta}". Has seleccionado "${regionNombre}".`,
                'warning',
                4000
            );

            estadoSelect?.classList.add('is-invalid');
            regionSelect?.classList.add('is-invalid');

            Swal.fire({
                icon: 'warning',
                title: 'Inconsistencia en ubicación',
                html: `
                    <p><strong>Estado seleccionado:</strong> ${estado}</p>
                    <p><strong>Región seleccionada:</strong> ${regionNombre}</p>
                    <p style="color: var(--color-accent-primary);"><strong>Región correcta:</strong> ${regionCorrecta}</p>
                    <p>¿Deseas cambiar la región automáticamente?</p>
                `,
                showCancelButton: true,
                confirmButtonText: 'SÍ, CORREGIR',
                cancelButtonText: 'NO, MANTENER'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await this._seleccionarRegion(regionCorrecta);
                    this._mostrarNotificacion(`✅ Región corregida a "${regionCorrecta}"`, 'success', 2000);
                }
                estadoSelect?.classList.remove('is-invalid');
                regionSelect?.classList.remove('is-invalid');
                this.validando = false;
            }).catch(() => {
                estadoSelect?.classList.remove('is-invalid');
                regionSelect?.classList.remove('is-invalid');
                this.validando = false;
            });
        } else if (regionCorrecta) {
            estadoSelect?.classList.remove('is-invalid');
            regionSelect?.classList.remove('is-invalid');
        }
    }

    // VALIDAR COORDENADAS CON ESTADO
    _validarCoordenadasConEstado() {
        const estadoSelect = document.getElementById('estadoSucursal');
        const latInput = document.getElementById('latitudSucursal');
        const lngInput = document.getElementById('longitudSucursal');

        const estado = estadoSelect?.value;
        const lat = parseFloat(latInput?.value);
        const lng = parseFloat(lngInput?.value);

        if (!estado || isNaN(lat) || isNaN(lng)) return;

        const estadoCoords = COORDENADAS_ESTADOS[estado];
        if (!estadoCoords) return;

        const distancia = this._calcularDistancia(lat, lng, estadoCoords.lat, estadoCoords.lng);
        const rangoPermitido = estadoCoords.rango;

        if (distancia > rangoPermitido) {
            this.validando = true;
            this._mostrarNotificacion(
                `⚠️ Coordenadas fuera de ${estado}. Distancia: ~${(distancia * 111).toFixed(0)} km`,
                'warning',
                5000
            );

            estadoSelect?.classList.add('is-invalid');
            latInput?.classList.add('is-invalid');
            lngInput?.classList.add('is-invalid');

            Swal.fire({
                icon: 'warning',
                title: 'Coordenadas fuera del estado',
                html: `
                    <p><strong>Estado:</strong> ${estado}</p>
                    <p><strong>Coordenadas:</strong> ${lat}, ${lng}</p>
                    <p><strong>Centro del estado:</strong> ${estadoCoords.lat}, ${estadoCoords.lng}</p>
                    <p><strong>Distancia:</strong> ~${(distancia * 111).toFixed(0)} km</p>
                    <p>¿Deseas ajustar las coordenadas?</p>
                `,
                showCancelButton: true,
                confirmButtonText: 'SÍ, AJUSTAR',
                cancelButtonText: 'NO, MANTENER'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    latInput.value = estadoCoords.lat;
                    lngInput.value = estadoCoords.lng;
                    this._colocarMarcador([estadoCoords.lat, estadoCoords.lng]);
                    await this._obtenerInformacionCompletaUbicacion(estadoCoords.lat, estadoCoords.lng);
                }
                estadoSelect?.classList.remove('is-invalid');
                latInput?.classList.remove('is-invalid');
                lngInput?.classList.remove('is-invalid');
                this.validando = false;
            }).catch(() => {
                estadoSelect?.classList.remove('is-invalid');
                latInput?.classList.remove('is-invalid');
                lngInput?.classList.remove('is-invalid');
                this.validando = false;
            });
        } else {
            estadoSelect?.classList.remove('is-invalid');
            latInput?.classList.remove('is-invalid');
            lngInput?.classList.remove('is-invalid');
        }
    }

    // VALIDAR CIUDAD CON ESTADO
    async _validarCiudadConEstado() {
        const estadoSelect = document.getElementById('estadoSucursal');
        const ciudadInput = document.getElementById('ciudadSucursal');
        const zonaInput = document.getElementById('zonaSucursal');

        const estado = estadoSelect?.value;
        const ciudad = ciudadInput?.value.trim();

        if (!estado || !ciudad) return;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ciudad + ', ' + estado + ', México')}&limit=1&countrycodes=mx&addressdetails=1`);
            const data = await response.json();

            if (data && data.length > 0) {
                ciudadInput?.classList.remove('is-invalid');
                estadoSelect?.classList.remove('is-invalid');

                if (data[0].address) {
                    let zona =
                        data[0].address.suburb ||
                        data[0].address.neighbourhood ||
                        data[0].address.city_district ||
                        data[0].address.district ||
                        '';

                    if (zona && zonaInput && (!zonaInput.value || zonaInput.value.trim() === '')) {
                        zonaInput.value = zona;
                        console.log(`✅ Zona obtenida para ${ciudad}: ${zona}`);
                    }
                }
            } else {
                const responseAll = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ciudad + ', México')}&limit=1&countrycodes=mx&addressdetails=1`);
                const dataAll = await responseAll.json();

                if (dataAll && dataAll.length > 0 && dataAll[0].address) {
                    const estadoReal = dataAll[0].address.state;
                    if (estadoReal && estadoReal !== estado) {
                        this.validando = true;
                        ciudadInput?.classList.add('is-invalid');
                        estadoSelect?.classList.add('is-invalid');

                        Swal.fire({
                            icon: 'warning',
                            title: 'Ciudad no coincide con el estado',
                            html: `
                                <p><strong>Ciudad:</strong> ${ciudad}</p>
                                <p><strong>Estado seleccionado:</strong> ${estado}</p>
                                <p style="color: var(--color-accent-primary);"><strong>Estado real:</strong> ${estadoReal}</p>
                                <p>¿Deseas actualizar el estado?</p>
                            `,
                            showCancelButton: true,
                            confirmButtonText: 'SÍ, ACTUALIZAR',
                            cancelButtonText: 'NO, MANTENER'
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                for (let i = 0; i < estadoSelect.options.length; i++) {
                                    if (estadoSelect.options[i].text === estadoReal) {
                                        estadoSelect.selectedIndex = i;
                                        break;
                                    }
                                }
                                await this._actualizarPorEstado(estadoReal);
                            }
                            ciudadInput?.classList.remove('is-invalid');
                            estadoSelect?.classList.remove('is-invalid');
                            this.validando = false;
                        }).catch(() => {
                            ciudadInput?.classList.remove('is-invalid');
                            estadoSelect?.classList.remove('is-invalid');
                            this.validando = false;
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error validando ciudad:', error);
        }
    }

    _calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this._toRad(lat2 - lat1);
        const dLng = this._toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c / 111;
    }

    _toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // ========== MÉTODOS DE HISTORIAL ==========
    async _initHistorial() {
        try {
            const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
            historialManager = new HistorialUsuarioManager();
            console.log('📋 HistorialManager inicializado');
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async _registrarCreacionSucursal(sucursal, datos) {
        if (!historialManager) return;
        try {
            await historialManager.registrarActividad({
                usuario: this.usuarioActual,
                tipo: 'crear',
                modulo: 'sucursales',
                descripcion: `Creó sucursal: ${datos.nombre}`,
                detalles: { sucursalId: sucursal.id, ...datos }
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // ========== CONFIGURACIÓN DE LISTENERS ==========
    _configurarListenerCoordenadas() {
        const latInput = document.getElementById('latitudSucursal');
        const lngInput = document.getElementById('longitudSucursal');
        if (latInput && lngInput) {
            const handleCoordenadasChange = () => {
                if (this.coordenadasTimeout) clearTimeout(this.coordenadasTimeout);
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    if (!this._validarCoordenadasMexico(lat, lng)) {
                        this._mostrarNotificacion('Coordenadas fuera de México', 'warning', 3000);
                        return;
                    }
                    this.coordenadasTimeout = setTimeout(async () => {
                        await this._obtenerInformacionCompletaUbicacion(lat, lng);
                    }, 500);
                }
            };
            latInput.addEventListener('input', handleCoordenadasChange);
            lngInput.addEventListener('input', handleCoordenadasChange);
        }
    }

    // ========== CARGA DE USUARIO ==========
    _cargarUsuario() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase || this._generarCamelCase(adminData.organizacion),
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
                    organizacionCamelCase: userData.organizacionCamelCase || this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || ''
                };
                return;
            }
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
        return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
    }

    // ========== LÍMITES DE CARACTERES ==========
    _aplicarLimitesCaracteres() {
        const campos = [
            { id: 'nombreSucursal', limite: LIMITES.NOMBRE_SUCURSAL, nombre: 'Nombre' },
            { id: 'tipoSucursal', limite: LIMITES.TIPO_SUCURSAL, nombre: 'Tipo' },
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
        const contactoInput = document.getElementById('contactoSucursal');
        if (contactoInput) {
            contactoInput.addEventListener('input', (e) => {
                let valor = e.target.value.replace(/\D/g, '');
                if (valor.length > LIMITES.CONTACTO) valor = valor.substring(0, LIMITES.CONTACTO);
                e.target.value = valor;
            });
        }
    }

    _validarLongitudCampo(campo, limite, nombreCampo) {
        if (campo.value.length > limite) {
            campo.value = campo.value.substring(0, limite);
            this._mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            document.getElementById('btnVolverLista')?.addEventListener('click', () => this._volverALista());
            document.getElementById('cancelarBtn')?.addEventListener('click', () => this._cancelarCreacion());
            document.getElementById('crearSucursalBtn')?.addEventListener('click', (e) => { e.preventDefault(); this._validarYGuardar(); });
            document.getElementById('sucursalForm')?.addEventListener('submit', (e) => { e.preventDefault(); this._validarYGuardar(); });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // ========== CARGA DE REGIONES Y ESTADOS ==========
    async _cargarRegiones() {
        try {
            const select = document.getElementById('regionSucursal');
            if (!select) return;
            select.innerHTML = '<option value="">-- Cargando regiones... --</option>';
            const { RegionManager } = await import('/clases/region.js');
            const regionManager = new RegionManager();
            const regiones = await regionManager.getRegionesByOrganizacion(this.usuarioActual.organizacionCamelCase);
            select.innerHTML = '<option value="">-- Seleccione una región --</option>';
            if (regiones.length === 0) {
                select.innerHTML = '<option value="">-- No hay regiones --</option>';
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
            console.error('Error:', error);
            const select = document.getElementById('regionSucursal');
            if (select) select.innerHTML = '<option value="">-- Error --</option>';
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
        const errores = this._validarConsistenciaTotal();

        if (errores.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: `<div style="text-align: left;">${errores.map(err => `<p>• ${err}</p>`).join('')}</div>`,
                confirmButtonText: 'CORREGIR'
            });
            return;
        }

        this._validarYGuardarContinuacion();
    }

    _validarConsistenciaTotal() {
        const errores = [];
        const estadoSelect = document.getElementById('estadoSucursal');
        const regionSelect = document.getElementById('regionSucursal');

        const estado = estadoSelect?.value;
        const regionNombre = regionSelect?.options[regionSelect.selectedIndex]?.textContent;

        if (estado && regionNombre && regionNombre !== '-- Seleccione una región --') {
            const regionCorrecta = this._obtenerRegionPorEstado(estado);
            if (regionCorrecta && regionNombre !== regionCorrecta) {
                errores.push(`El estado "${estado}" pertenece a la región "${regionCorrecta}", pero tienes seleccionada "${regionNombre}"`);
            }
        }

        return errores;
    }

    _validarYGuardarContinuacion() {
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

        const nombre = nombreInput?.value.trim();
        if (!nombre) {
            nombreInput?.classList.add('is-invalid');
            errores.push('El nombre es obligatorio');
        } else if (nombre.length < 3) {
            nombreInput?.classList.add('is-invalid');
            errores.push('El nombre debe tener al menos 3 caracteres');
        } else {
            nombreInput?.classList.remove('is-invalid');
        }

        const tipo = tipoInput?.value.trim();
        if (!tipo) {
            tipoInput?.classList.add('is-invalid');
            errores.push('El tipo es obligatorio');
        } else {
            tipoInput?.classList.remove('is-invalid');
        }

        const regionId = regionSelect?.value;
        if (!regionId) {
            regionSelect?.classList.add('is-invalid');
            errores.push('Debe seleccionar una región');
        } else {
            regionSelect?.classList.remove('is-invalid');
        }

        const estado = estadoSelect?.value;
        if (!estado) {
            estadoSelect?.classList.add('is-invalid');
            errores.push('Debe seleccionar un estado');
        } else {
            estadoSelect?.classList.remove('is-invalid');
        }

        const ciudad = ciudadInput?.value.trim();
        if (!ciudad) {
            ciudadInput?.classList.add('is-invalid');
            errores.push('La ciudad es obligatoria');
        } else {
            ciudadInput?.classList.remove('is-invalid');
        }

        const direccion = direccionInput?.value.trim();
        if (!direccion) {
            direccionInput?.classList.add('is-invalid');
            errores.push('La dirección es obligatoria');
        } else {
            direccionInput?.classList.remove('is-invalid');
        }

        const latitud = latitudInput?.value.trim();
        if (!latitud) {
            latitudInput?.classList.add('is-invalid');
            errores.push('La latitud es obligatoria');
        } else if (isNaN(latitud)) {
            latitudInput?.classList.add('is-invalid');
            errores.push('La latitud debe ser un número');
        } else if (!this._validarCoordenadasMexico(parseFloat(latitud), parseFloat(longitudInput?.value))) {
            latitudInput?.classList.add('is-invalid');
            errores.push('La latitud debe estar dentro de México');
        } else {
            latitudInput?.classList.remove('is-invalid');
        }

        const longitud = longitudInput?.value.trim();
        if (!longitud) {
            longitudInput?.classList.add('is-invalid');
            errores.push('La longitud es obligatoria');
        } else if (isNaN(longitud)) {
            longitudInput?.classList.add('is-invalid');
            errores.push('La longitud debe ser un número');
        } else if (!this._validarCoordenadasMexico(parseFloat(latitudInput?.value), parseFloat(longitud))) {
            longitudInput?.classList.add('is-invalid');
            errores.push('La longitud debe estar dentro de México');
        } else {
            longitudInput?.classList.remove('is-invalid');
        }

        const contacto = contactoInput?.value.trim();
        if (!contacto) {
            contactoInput?.classList.add('is-invalid');
            errores.push('El teléfono es obligatorio');
        } else {
            const telefonoLimpio = contacto.replace(/\D/g, '');
            if (telefonoLimpio.length < 10) {
                contactoInput?.classList.add('is-invalid');
                errores.push('El teléfono debe tener 10 dígitos');
            } else {
                contactoInput?.classList.remove('is-invalid');
            }
        }

        if (errores.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: errores.map(msg => `• ${msg}`).join('<br>'),
                confirmButtonText: 'CORREGIR'
            });
            return;
        }

        const regionOption = regionSelect.options[regionSelect.selectedIndex];
        const regionNombre = regionOption.getAttribute('data-region-nombre') || regionOption.textContent;

        this._confirmarGuardado({
            nombre, tipo, regionId, regionNombre, estado, ciudad, direccion,
            zona: zonaInput?.value.trim() || '', contacto, latitud, longitud
        });
    }

    _confirmarGuardado(datos) {
        Swal.fire({
            title: 'Crear sucursal',
            html: `<div style="text-align: left;">
                <p><strong>Nombre:</strong> ${this._escapeHTML(datos.nombre)}</p>
                <p><strong>Tipo:</strong> ${this._escapeHTML(datos.tipo)}</p>
                <p><strong>Región:</strong> ${this._escapeHTML(datos.regionNombre)}</p>
                <p><strong>Estado:</strong> ${this._escapeHTML(datos.estado)}</p>
                <p><strong>Ciudad:</strong> ${this._escapeHTML(datos.ciudad)}</p>
                <p><strong>Dirección:</strong> ${this._escapeHTML(datos.direccion)}</p>
                <p><strong>Zona/Colonia:</strong> ${this._escapeHTML(datos.zona || 'No especificada')}</p>
                <p><strong>Contacto:</strong> ${this._escapeHTML(datos.contacto)}</p>
                <p><strong>Coordenadas:</strong> ${datos.latitud}, ${datos.longitud}</p>
            </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR',
            cancelButtonText: 'CANCELAR'
        }).then((result) => {
            if (result.isConfirmed) this._guardarSucursal(datos);
        });
    }

    async _guardarSucursal(datos) {
        const btnCrear = document.getElementById('crearSucursalBtn');
        const originalHTML = btnCrear?.innerHTML || '<i class="fas fa-check"></i>Crear Sucursal';
        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }
            Swal.fire({ title: 'Creando sucursal...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
            const sucursalData = { nombre: datos.nombre, tipo: datos.tipo, contacto: datos.contacto, direccion: datos.direccion, ciudad: datos.ciudad, estado: datos.estado, zona: datos.zona, regionId: datos.regionId, latitud: datos.latitud, longitud: datos.longitud };
            const nuevaSucursal = await this.sucursalManager.crearSucursal(sucursalData, { currentUser: this.usuarioActual });
            Swal.close();
            await this._registrarCreacionSucursal(nuevaSucursal, datos);
            await Swal.fire({ icon: 'success', title: '¡Sucursal creada!', html: `<p><strong>${this._escapeHTML(datos.nombre)}</strong><br>${this._escapeHTML(datos.ciudad)}, ${this._escapeHTML(datos.estado)}</p><p><strong>Región:</strong> ${this._escapeHTML(datos.regionNombre)}</p>`, showCancelButton: true, confirmButtonText: 'CREAR OTRA', cancelButtonText: 'IR A SUCURSALES' }).then((result) => { if (result.isConfirmed) this._limpiarFormulario(); else this._volverALista(); });
        } catch (error) {
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
        ['regionSucursal', 'estadoSucursal'].forEach(id => { const select = document.getElementById(id); if (select) select.selectedIndex = 0; });
        this._cargarRegiones();
        if (this.map && this.marker) this._colocarMarcador([23.6345, -102.5528]);
    }

    _volverALista() { window.location.href = '../sucursales/sucursales.html'; }

    _cancelarCreacion() {
        Swal.fire({ title: '¿Cancelar?', text: 'Los cambios no guardados se perderán', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, cancelar', cancelButtonText: 'No, continuar' }).then((result) => { if (result.isConfirmed) this._volverALista(); });
    }

    _escapeHTML(text) { if (!text) return ''; return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
    _mostrarError(mensaje) { this._mostrarNotificacion(mensaje, 'error'); }
    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) { Swal.fire({ title: tipo === 'success' ? 'Éxito' : tipo === 'error' ? 'Error' : tipo === 'warning' ? 'Advertencia' : 'Información', text: mensaje, icon: tipo, timer: duracion, timerProgressBar: true, showConfirmButton: false }); }
    _mostrarCargando(mensaje = 'Procesando...') { if (this.loadingOverlay) this.loadingOverlay.remove(); const overlay = document.createElement('div'); overlay.className = 'loading-overlay'; overlay.innerHTML = `<div class="spinner"></div><div class="loading-text">${mensaje}</div>`; document.body.appendChild(overlay); this.loadingOverlay = overlay; }
    _ocultarCargando() { if (this.loadingOverlay) { this.loadingOverlay.remove(); this.loadingOverlay = null; } }

    // ========== FUNCIONES DEL MAPA ==========
    _inicializarMapa() {
        try {
            const defaultLat = 23.6345, defaultLng = -102.5528, defaultZoom = 5;
            this.map = L.map('sucursalMap', { maxBounds: this._obtenerLimitesMexico(), maxBoundsViscosity: 1.0, minZoom: 5, maxZoom: 18 }).setView([defaultLat, defaultLng], defaultZoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap | Centinela-MX', maxZoom: 19 }).addTo(this.map);
            L.control.zoom({ position: 'bottomright' }).addTo(this.map);
            const customIcon = L.divIcon({ className: 'custom-marker', html: '<i class="fas fa-map-marker-alt" style="font-size: 30px; color: var(--color-accent-primary);"></i>', iconSize: [30, 30], popupAnchor: [0, -15] });
            this.marker = L.marker([defaultLat, defaultLng], { draggable: true, icon: customIcon }).addTo(this.map);
            this.marker.bindPopup(`📍 Sucursal<br>Arrastra para ajustar`).openPopup();
            this.marker.on('dragend', async (event) => {
                const position = event.target.getLatLng();
                if (this._validarCoordenadasMexico(position.lat, position.lng)) {
                    this._actualizarCoordenadasMapa(position.lat, position.lng);
                    await this._obtenerInformacionCompletaUbicacion(position.lat, position.lng);
                } else {
                    const ultimaLat = parseFloat(document.getElementById('latitudSucursal')?.value || defaultLat);
                    const ultimaLng = parseFloat(document.getElementById('longitudSucursal')?.value || defaultLng);
                    this._colocarMarcador([ultimaLat, ultimaLng]);
                    this._mostrarNotificacion('Ubicación fuera de México', 'warning', 3000);
                }
            });
            this.map.on('click', async (e) => {
                const { lat, lng } = e.latlng;
                if (this._validarCoordenadasMexico(lat, lng)) {
                    this._colocarMarcador(e.latlng);
                    await this._obtenerInformacionCompletaUbicacion(lat, lng);
                } else {
                    this._mostrarNotificacion('Selecciona dentro de México', 'warning', 3000);
                }
            });
            this._actualizarCoordenadasMapa(defaultLat, defaultLng);
            this.mapInitialized = true;
            this._configurarEventosMapa();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    _obtenerLimitesMexico() { return L.latLngBounds(L.latLng(14.5, -118.5), L.latLng(33.0, -86.5)); }
    _validarCoordenadasMexico(lat, lng) { return lat >= 14.5 && lat <= 33.0 && lng >= -118.5 && lng <= -86.5; }

    _configurarEventosMapa() {
        document.getElementById('btnCentrarMapa')?.addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('latitudSucursal').value);
            const lng = parseFloat(document.getElementById('longitudSucursal').value);
            if (!isNaN(lat) && !isNaN(lng) && this._validarCoordenadasMexico(lat, lng)) {
                this.map.setView([lat, lng], 15);
            }
        });
        document.getElementById('btnBuscarDireccion')?.addEventListener('click', () => this._buscarDireccionEnMapa());
        document.getElementById('btnObtenerUbicacion')?.addEventListener('click', () => this._obtenerUbicacionActual());
    }

    _colocarMarcador(posicion) { if (!this.map || !this.marker) return; this.marker.setLatLng(posicion); this.map.setView(posicion, 15); this._actualizarCoordenadasMapa(posicion.lat, posicion.lng); }
    _actualizarCoordenadasMapa(lat, lng) { const latF = Number(lat).toFixed(6), lngF = Number(lng).toFixed(6); if (!this.actualizandoDesdeMapa) { const latIn = document.getElementById('latitudSucursal'), lngIn = document.getElementById('longitudSucursal'); if (latIn) latIn.value = latF; if (lngIn) lngIn.value = lngF; } const mLat = document.getElementById('mapLatitud'), mLng = document.getElementById('mapLongitud'); if (mLat) mLat.textContent = latF; if (mLng) mLng.textContent = lngF; }

    async _buscarDireccionEnMapa() {
        const direccion = document.getElementById('direccionSucursal').value;
        if (!direccion) { this._mostrarNotificacion('Ingresa una dirección', 'warning'); return; }
        try {
            this._mostrarCargando('Buscando...');
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', México')}&limit=1&countrycodes=mx&addressdetails=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
                if (this._validarCoordenadasMexico(lat, lon)) {
                    this._colocarMarcador([lat, lon]);
                    await this._obtenerInformacionCompletaUbicacion(lat, lon);
                    const zona = document.getElementById('zonaSucursal')?.value;
                    const ciudad = document.getElementById('ciudadSucursal')?.value;
                    const estado = document.getElementById('estadoSucursal')?.value;
                    const region = document.getElementById('regionSucursal')?.options[document.getElementById('regionSucursal')?.selectedIndex]?.textContent;
                    let mensaje = 'Dirección encontrada 🔍';
                    if (zona) mensaje += `\nZona/Colonia: ${zona}`;
                    if (ciudad && estado) mensaje += `\n${ciudad}, ${estado}`;
                    if (region && region !== '-- Seleccione una región --') mensaje += `\nRegión: ${region}`;
                    this._mostrarNotificacion(mensaje, 'success', 4000);
                } else this._mostrarNotificacion('Dirección fuera de México', 'warning');
            } else this._mostrarNotificacion('No se encontró', 'warning');
        } catch (error) { this._mostrarNotificacion('Error al buscar', 'error'); }
        finally { this._ocultarCargando(); }
    }

    _obtenerUbicacionActual() {
        if (!navigator.geolocation) { this._mostrarNotificacion('Geolocalización no soportada', 'error'); return; }
        this._mostrarCargando('Obteniendo ubicación...');
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            if (this._validarCoordenadasMexico(latitude, longitude)) {
                this._colocarMarcador([latitude, longitude]);
                await this._obtenerInformacionCompletaUbicacion(latitude, longitude);
                this._mostrarNotificacion('Ubicación obtenida 📍', 'success', 3000);
            } else this._mostrarNotificacion('Ubicación fuera de México', 'warning');
            this._ocultarCargando();
        }, () => { this._ocultarCargando(); this._mostrarNotificacion('Error', 'error'); });
    }
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async function () {
    if (typeof Swal === 'undefined') { console.error('❌ SweetAlert2 no está cargado.'); return; }
    window.crearSucursalDebug.controller = new CrearSucursalController();
});