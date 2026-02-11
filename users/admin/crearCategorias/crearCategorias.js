/**
 * CREAR CATEGORÍA - Sistema Centinela
 * VERSIÓN CON FIREBASE - COMPATIBLE CON TODOS LOS NAVEGADORES
 * SIN import/export - Usa carga dinámica con import()
 */

class CrearCategoria {
    constructor() {
        this.currentColor = '#FF5733';
        this.categoriaManager = null;
        this.empresaData = this.obtenerDatosEmpresa();
        this.init();
    }

    obtenerDatosEmpresa() {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const empresaData = JSON.parse(localStorage.getItem('empresa') || '{}');
            
            return {
                id: empresaData.id || userData.empresaId || '',
                nombre: empresaData.nombre || userData.empresa || ''
            };
        } catch (error) {
            console.error('Error obteniendo datos de empresa:', error);
            return { id: '', nombre: '' };
        }
    }

    async init() {
        try {
            // IMPORTACIÓN DINÁMICA - Funciona en cualquier navegador
            const module = await import('/clases/categoria.js');
            const CategoriaManager = module.CategoriaManager;
            
            this.categoriaManager = new CategoriaManager();
            
            this.inicializarElementos();
            this.inicializarEventos();
            this.validarFormulario();
            this.actualizarColor(this.currentColor);
            this.mostrarInfoEmpresa();
            
            console.log('✅ CategoriaManager cargado correctamente');
            console.log('📁 Colección:', this.categoriaManager?.nombreColeccion);
        } catch (error) {
            console.error('❌ Error al cargar CategoriaManager:', error);
            
            Swal.fire({
                title: 'Error crítico',
                text: 'No se pudo cargar el módulo de categorías. Por favor, recarga la página.',
                icon: 'error',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonColor: '#ff4d4d',
                confirmButtonText: 'Recargar'
            }).then(() => {
                window.location.reload();
            });
        }
    }

    mostrarInfoEmpresa() {
        // Agregar indicador visual de la empresa actual
        const headerContainer = document.querySelector('.dashboard-header') || document.querySelector('h1')?.parentElement;
        
        if (headerContainer && this.empresaData.nombre) {
            const badgeEmpresa = document.createElement('div');
            badgeEmpresa.className = 'alert alert-info mb-3';
            badgeEmpresa.style.cssText = `
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.2);
                color: #10b981;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            `;
            badgeEmpresa.innerHTML = `
                <i class="fas fa-building"></i>
                Creando categoría para: <strong>${this.empresaData.nombre}</strong>
            `;
            
            if (headerContainer.firstChild) {
                headerContainer.insertBefore(badgeEmpresa, headerContainer.firstChild);
            } else {
                headerContainer.appendChild(badgeEmpresa);
            }
        }
    }

    inicializarElementos() {
        this.form = document.getElementById('crearCategoriaForm');
        this.nombreInput = document.getElementById('nombreCategoria');
        this.descripcionInput = document.getElementById('descripcionCategoria');
        this.colorDisplay = document.getElementById('colorDisplay');
        this.colorHex = document.getElementById('colorHex');
        this.btnCancel = document.getElementById('btnCancel');
        this.btnSave = document.getElementById('btnSave');
        
        this.colorPickerNative = document.getElementById('colorPickerNative');
        this.colorPreviewCard = document.getElementById('colorPreviewCard');
        
        if (this.btnSave) {
            this.btnSave.disabled = true;
            this.btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Cargando...';
        }
    }

    inicializarEventos() {
        if (this.colorPreviewCard && this.colorPickerNative) {
            this.colorPreviewCard.addEventListener('click', () => {
                this.colorPickerNative.click();
            });
        }

        if (this.colorPickerNative) {
            this.colorPickerNative.addEventListener('input', (e) => {
                this.actualizarColor(e.target.value);
            });
        }

        if (this.nombreInput) {
            this.nombreInput.addEventListener('input', () => this.validarFormulario());
        }
        
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.crearCategoria(e));
        }
        
        if (this.btnCancel) {
            this.btnCancel.addEventListener('click', () => this.cancelar());
        }
    }

    actualizarColor(color) {
        if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) return;

        this.currentColor = color;
        
        if (this.colorDisplay) {
            this.colorDisplay.style.backgroundColor = color;
        }
        if (this.colorHex) {
            this.colorHex.textContent = color.toUpperCase();
        }
        
        if (this.colorPickerNative) {
            this.colorPickerNative.value = color;
        }
        
        if (this.colorDisplay) {
            this.colorDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.colorDisplay.style.transform = 'scale(1)';
            }, 150);
        }
    }

    validarFormulario() {
        if (!this.nombreInput || !this.btnSave) return false;
        
        const nombre = this.nombreInput.value.trim();
        
        if (!nombre) {
            this.nombreInput.classList.add('is-invalid');
            this.nombreInput.classList.remove('is-valid');
            this.btnSave.disabled = true;
            return false;
        } else {
            this.nombreInput.classList.add('is-valid');
            this.nombreInput.classList.remove('is-invalid');
            this.btnSave.disabled = false;
            return true;
        }
    }

    irACategorias() {
        window.location.href = '../categorias/categorias.html';
    }

    async crearCategoria(e) {
        e.preventDefault();

        if (!this.validarFormulario()) return;
        
        if (!this.categoriaManager) {
            Swal.fire({
                title: 'Error',
                text: 'El sistema no está listo. Por favor, espera un momento.',
                icon: 'error',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonColor: '#ff4d4d'
            });
            return;
        }

        const nombre = this.nombreInput.value.trim();
        const descripcion = this.descripcionInput ? this.descripcionInput.value.trim() : '';

        if (nombre.length < 3) {
            Swal.fire({
                title: 'Error',
                text: 'El nombre debe tener al menos 3 caracteres',
                icon: 'error',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonColor: '#2f8cff'
            });
            return;
        }

        this.btnSave.disabled = true;
        this.btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creando...';

        try {
            const data = {
                nombre: nombre,
                descripcion: descripcion || ''
            };

            const categoria = await this.categoriaManager.crearCategoria(data);
            console.log('✅ Categoría creada con ID:', categoria.id);
            console.log('📁 Colección:', this.categoriaManager.nombreColeccion);

            Swal.fire({
                title: '¡Creada!',
                html: `La categoría <strong>"${nombre}"</strong> se ha creado correctamente<br>
                       <small style="color: #10b981;">Empresa: ${this.empresaData.nombre || 'No especificada'}</small>`,
                icon: 'success',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonColor: '#2f8cff',
                confirmButtonText: 'Ver categorías',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                this.irACategorias();
            });

        } catch (error) {
            console.error('❌ Error al crear categoría:', error);

            let mensajeError = error.message;
            
            if (error.message.includes('Ya existe una categoría con ese nombre')) {
                mensajeError = 'Ya existe una categoría con ese nombre en tu empresa. Por favor, elige otro.';
            } else if (error.message.includes('permission')) {
                mensajeError = 'No tienes permisos para crear categorías.';
            } else if (error.message.includes('network')) {
                mensajeError = 'Error de conexión. Verifica tu internet.';
            }

            Swal.fire({
                title: 'Error',
                text: mensajeError,
                icon: 'error',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonColor: '#ff4d4d',
                confirmButtonText: 'Entendido'
            });

            this.btnSave.disabled = false;
            this.btnSave.innerHTML = '<i class="fas fa-save me-2"></i> Crear Categoría';
        }
    }

    cancelar() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4d',
            cancelButtonColor: '#545454',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Seguir editando',
            background: '#0a0a0a',
            color: '#ffffff',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                this.irACategorias();
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('crearCategoriaForm')) {
        window.crearCategoria = new CrearCategoria();
    } else {
        console.error('❌ No se encontró el formulario de creación de categorías');
    }
});