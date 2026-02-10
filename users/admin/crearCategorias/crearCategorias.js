// crearCategoria.js
import { BASE_URL } from '/config/config.js';

document.addEventListener('DOMContentLoaded', function() {
    inicializarFormulario();
});

async function inicializarFormulario() {
    // Verificar si estamos editando una categoría existente
    const urlParams = new URLSearchParams(window.location.search);
    const categoriaId = urlParams.get('id');
    
    if (categoriaId) {
        // Modo edición
        document.getElementById('tituloFormulario').textContent = 'Editar Categoría';
        document.getElementById('subtituloFormulario').textContent = 'Modifica la información de la categoría';
        document.getElementById('btnSubmit').innerHTML = '<i class="fas fa-save me-2"></i>Guardar Cambios';
        
        await cargarCategoria(categoriaId);
    } else {
        // Modo creación
        await cargarCategoriasPadre();
    }
    
    // Configurar eventos
    configurarEventos();
}

async function cargarCategoria(id) {
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        const response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const categoria = await response.json();
            
            // Rellenar formulario
            document.getElementById('categoriaId').value = categoria.id;
            document.getElementById('nombreCategoria').value = categoria.nombre;
            document.getElementById('color').value = categoria.color;
            document.getElementById('descripcion').value = categoria.descripcion || '';
            document.getElementById('activo').checked = !categoria.eliminado;
            
            // Cargar categorías padre (excluyendo la actual)
            await cargarCategoriasPadre(categoria.id);
            
            // Si tiene categoría padre, seleccionarla
            if (categoria.parentId) {
                document.getElementById('categoriaPadre').value = categoria.parentId;
            }
        } else {
            throw new Error('Error al cargar la categoría');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error al cargar la categoría');
    }
}

async function cargarCategoriasPadre(excluirId = null) {
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        const response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const categorias = await response.json();
            
            // Filtrar categorías activas y que no sean la actual (en modo edición)
            const categoriasPrincipales = categorias.filter(cat => 
                !cat.eliminado && 
                (!cat.parentId || cat.parentId === '') &&
                cat.id !== excluirId
            );
            
            const selectPadre = document.getElementById('categoriaPadre');
            selectPadre.innerHTML = '<option value="">Seleccionar categoría padre...</option>';
            
            categoriasPrincipales.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombre;
                selectPadre.appendChild(option);
            });
            
            // Agregar opción para ninguna categoría padre
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'Ninguna (categoría principal)';
            selectPadre.appendChild(noneOption);
        }
    } catch (error) {
        console.error('Error al cargar categorías padre:', error);
    }
}

function configurarEventos() {
    // Evento para color aleatorio
    document.getElementById('btnColorRandom').addEventListener('click', generarColorAleatorio);
    
    // Evento para envío del formulario
    document.getElementById('formCategoria').addEventListener('submit', manejarSubmit);
    
    // Validación en tiempo real
    document.getElementById('nombreCategoria').addEventListener('input', validarNombre);
    document.getElementById('color').addEventListener('input', validarColor);
}

function generarColorAleatorio() {
    const colores = [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
        '#27ae60', '#2980b9', '#e67e22', '#7f8c8d', '#2c3e50'
    ];
    
    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];
    document.getElementById('color').value = colorAleatorio;
}

function validarNombre() {
    const nombreInput = document.getElementById('nombreCategoria');
    const nombre = nombreInput.value.trim();
    
    if (nombre.length === 0) {
        nombreInput.classList.add('is-invalid');
        return false;
    } else if (nombre.length > 50) {
        nombreInput.classList.add('is-invalid');
        return false;
    } else {
        nombreInput.classList.remove('is-invalid');
        return true;
    }
}

function validarColor() {
    const colorInput = document.getElementById('color');
    const color = colorInput.value;
    
    const regexColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (!regexColor.test(color)) {
        colorInput.classList.add('is-invalid');
        return false;
    } else {
        colorInput.classList.remove('is-invalid');
        return true;
    }
}

function validarFormulario() {
    const nombreValido = validarNombre();
    const colorValido = validarColor();
    
    return nombreValido && colorValido;
}

async function manejarSubmit(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        mostrarMensaje('error', 'Por favor, corrige los errores en el formulario');
        return;
    }
    
    const categoriaId = document.getElementById('categoriaId').value;
    const esEdicion = categoriaId !== '';
    
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        const adminId = localStorage.getItem('adminId');
        
        const categoriaData = {
            nombre: document.getElementById('nombreCategoria').value.trim(),
            color: document.getElementById('color').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            parentId: document.getElementById('categoriaPadre').value || null,
            activo: document.getElementById('activo').checked,
            creadoPor: adminId || 'admin_default_id'
        };
        
        let response;
        
        if (esEdicion) {
            // Actualizar categoría existente
            response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${categoriaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(categoriaData)
            });
        } else {
            // Crear nueva categoría
            response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(categoriaData)
            });
        }
        
        if (response.ok) {
            const resultado = await response.json();
            
            mostrarMensaje('success', 
                esEdicion ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente'
            );
            
            // Redirigir después de 2 segundos
            setTimeout(() => {
                window.location.href = '/users/admin/categorias/categorias.html';
            }, 2000);
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en la operación');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', error.message || 'Error al procesar la solicitud');
    }
}

function mostrarMensaje(tipo, mensaje) {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insertar al principio del contenedor principal
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function cancelar() {
    if (confirm('¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.')) {
        window.location.href = '/users/admin/categorias/categorias.html';
    }
}

// Hacer funciones disponibles globalmente si es necesario
window.cancelar = cancelar;