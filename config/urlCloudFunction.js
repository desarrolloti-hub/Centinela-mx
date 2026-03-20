// CONFIGURACIÓN DE CLOUD FUNCTIONS
// =================================

// URL base de las Cloud Functions
const CLOUD_FUNCTION_BASE_URL = "https://us-central1-centinela-mx.cloudfunctions.net/";

// Acciones disponibles
const ACTIONS = {
    SOLICITAR_CODIGO: 'solicitarCodigo',
    COMPLETAR_REGISTRO: 'completarRegistro',
};

// Exportar configuración
export { CLOUD_FUNCTION_BASE_URL, ACTIONS };