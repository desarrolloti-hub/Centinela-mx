// editarCategoria.js
import { BASE_URL } from '/config/config.js';

let categoriaActual = null;
let subcategorias = [];
let subcategoriaActual = null;

document.addEventListener('DOMContentLoaded', function() {
    inicializarEdicion();
    configurarEventos();
});

async function inicializarEdicion() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoriaId = urlParams.get('id');
    
    if (!categoriaId) {
        mostrarError('No se especificó la categoría a editar');
        setTimeout(() => {
            window.location.href = '/users/admin/categorias/categorias.html';
        }, 2000);
        return;
    }
    
    await cargarCategoria(categoriaId);
    await cargarSubcategorias(categoriaId);
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
            categoriaActual = await response.json();
            
            // Actualizar título
            document.querySelector('h1').innerHTML = 
                `<i class="fas fa-edit me-2"></i>Editar Categoría: ${categoriaActual.nombre}`;
            
            // Rellenar formulario principal
            document.getElementById('categoriaId').value = categoriaActual.id;
            document.getElementById('nombreCategoria').value = categoriaActual.nombre;
            document.getElementById('color').value = categoriaActual.color;
            document.getElementById('descripcion').value = categoriaActual.descripcion || '';
            document.getElementById('activo').checked = !categoriaActual.eliminado;
            
        } else {
            throw new Error('Error al cargar la categoría');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar la categoría');
    }
}

async function cargarSubcategorias(parentId) {
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
            const todasCategorias = await response.json();
            
            // Filtrar subcategorías (donde parentId coincide con la categoría actual)
            subcategorias = todasCategorias.filter(cat => 
                cat.parentId === parentId && !cat.eliminado
            );
            
            mostrarSubcategorias();
        }
    } catch (error) {
        console.error('Error al cargar subcategorías:', error);
    }
}

function mostrarSubcategorias() {
    const tbody = document.getElementById('tablaSubcategoriasBody');
    const sinSubcategorias = document.getElementById('sinSubcategorias');
    const tablaContainer = document.getElementById('tablaSubcategoriasContainer');
    
    // Actualizar contador
    document.getElementById('contadorSubcategorias').textContent = 
        `${subcategorias.length} ${subcategorias.length === 1 ? 'subcategoría' : 'subcategorías'}`;
    
    if (subcategorias.length === 0) {
        tablaContainer.style.display = 'none';
        sinSubcategorias.style.display = 'block';
        return;
    }
    
    tablaContainer.style.display = 'block';
    sinSubcategorias.style.display = 'none';
    
    tbody.innerHTML = '';
    
    subcategorias.forEach((subcategoria, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="color-indicator" style="background-color: ${subcategoria.color};"></div>
                    <strong>${subcategoria.nombre}</strong>
                </div>
            </td>
            <td>
                <span class="badge" style="background-color: ${subcategoria.color}; color: #fff;">
                    ${subcategoria.color}
                </span>
            </td>
            <td>
                <small class="text-muted">${subcategoria.descripcion || 'Sin descripción'}</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-warning" onclick="editarSubcategoria('${subcategoria.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="mostrarConfirmacionEliminar('${subcategoria.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function configurarEventos() {
    // Formulario categoría principal
    document.getElementById('formEditarCategoria').addEventListener('submit', manejarSubmitCategoria);
    
    // Botón color aleatorio categoría principal
    document.getElementById('btnColorRandom').addEventListener('click', () => {
        generarColorAleatorio('color');
    });
    
    // Botón color aleatorio subcategoría
    document.getElementById('btnColorRandomSub').addEventListener('click', () => {
        generarColorAleatorio('subcategoriaColor');
    });
    
    // Botones para agregar subcategorías
    document.getElementById('btnAgregarSubcategoria').addEventListener('click', () => {
        abrirModalSubcategoria();
    });
    
    document.getElementById('btnAgregarPrimeraSubcategoria').addEventListener('click', () => {
        abrirModalSubcategoria();
    });
    
    // Guardar subcategoría
    document.getElementById('btnGuardarSubcategoria').addEventListener('click', guardarSubcategoria);
    
    // Confirmar eliminación
    document.getElementById('btnConfirmarEliminar').addEventListener('click', eliminarSubcategoria);
    
    // Validación en tiempo real
    document.getElementById('nombreCategoria').addEventListener('input', validarCampo);
    document.getElementById('subcategoriaNombre').addEventListener('input', validarCampo);
}

function generarColorAleatorio(inputId) {
    const colores = [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
        '#27ae60', '#2980b9', '#e67e22', '#7f8c8d', '#2c3e50'
    ];
    
    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];
    document.getElementById(inputId).value = colorAleatorio;
}

function validarCampo(event) {
    const input = event.target;
    const value = input.value.trim();
    
    if (value.length === 0 || value.length > 50) {
        input.classList.add('is-invalid');
        return false;
    } else {
        input.classList.remove('is-invalid');
        return true;
    }
}

async function manejarSubmitCategoria(event) {
    event.preventDefault();
    
    if (!validarFormularioCategoria()) {
        mostrarMensaje('error', 'Por favor, corrige los errores en el formulario');
        return;
    }
    
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        
        const categoriaData = {
            nombre: document.getElementById('nombreCategoria').value.trim(),
            color: document.getElementById('color').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            activo: document.getElementById('activo').checked
        };
        
        const response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${categoriaActual.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(categoriaData)
        });
        
        if (response.ok) {
            mostrarMensaje('success', 'Categoría actualizada correctamente');
            
            // Actualizar título
            document.querySelector('h1').innerHTML = 
                `<i class="fas fa-edit me-2"></i>Editar Categoría: ${categoriaData.nombre}`;
            
            // Recargar datos
            await cargarCategoria(categoriaActual.id);
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar la categoría');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', error.message || 'Error al actualizar la categoría');
    }
}

function validarFormularioCategoria() {
    const nombreValido = document.getElementById('nombreCategoria').value.trim().length > 0;
    const colorValido = document.getElementById('color').value.length > 0;
    
    if (!nombreValido) {
        document.getElementById('nombreCategoria').classList.add('is-invalid');
    }
    
    if (!colorValido) {
        document.getElementById('color').classList.add('is-invalid');
    }
    
    return nombreValido && colorValido;
}

function abrirModalSubcategoria(subcategoriaId = null) {
    const modal = new bootstrap.Modal(document.getElementById('modalSubcategoria'));
    const modalTitle = document.getElementById('modalSubcategoriaTitle');
    const form = document.getElementById('formSubcategoria');
    
    form.reset();
    
    if (subcategoriaId) {
        // Modo edición
        modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Subcategoría';
        subcategoriaActual = subcategorias.find(sc => sc.id === subcategoriaId);
        
        if (subcategoriaActual) {
            document.getElementById('subcategoriaId').value = subcategoriaActual.id;
            document.getElementById('parentId').value = categoriaActual.id;
            document.getElementById('subcategoriaNombre').value = subcategoriaActual.nombre;
            document.getElementById('subcategoriaColor').value = subcategoriaActual.color;
            document.getElementById('subcategoriaDescripcion').value = subcategoriaActual.descripcion || '';
        }
    } else {
        // Modo creación
        modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Nueva Subcategoría';
        document.getElementById('subcategoriaId').value = '';
        document.getElementById('parentId').value = categoriaActual.id;
        document.getElementById('subcategoriaNombre').value = '';
        document.getElementById('subcategoriaColor').value = '#3498db';
        document.getElementById('subcategoriaDescripcion').value = '';
        subcategoriaActual = null;
    }
    
    modal.show();
}

async function guardarSubcategoria() {
    const nombreInput = document.getElementById('subcategoriaNombre');
    const nombre = nombreInput.value.trim();
    
    if (!nombre || nombre.length > 50) {
        nombreInput.classList.add('is-invalid');
        mostrarMensaje('error', 'El nombre es requerido (máximo 50 caracteres)');
        return;
    }
    
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        const adminId = localStorage.getItem('adminId');
        
        const subcategoriaData = {
            nombre: nombre,
            color: document.getElementById('subcategoriaColor').value,
            descripcion: document.getElementById('subcategoriaDescripcion').value.trim(),
            parentId: document.getElementById('parentId').value,
            creadoPor: adminId || 'admin_default_id'
        };
        
        const subcategoriaId = document.getElementById('subcategoriaId').value;
        let response;
        
        if (subcategoriaId) {
            // Actualizar subcategoría existente
            response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${subcategoriaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(subcategoriaData)
            });
        } else {
            // Crear nueva subcategoría
            response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(subcategoriaData)
            });
        }
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalSubcategoria')).hide();
            mostrarMensaje('success', 
                subcategoriaId ? 'Subcategoría actualizada correctamente' : 'Subcategoría creada correctamente'
            );
            
            // Recargar subcategorías
            await cargarSubcategorias(categoriaActual.id);
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en la operación');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', error.message || 'Error al guardar la subcategoría');
    }
}

function mostrarConfirmacionEliminar(subcategoriaId) {
    subcategoriaActual = subcategorias.find(sc => sc.id === subcategoriaId);
    
    if (!subcategoriaActual) return;
    
    document.getElementById('confirmarMensaje').textContent = 
        `¿Está seguro de eliminar la subcategoría "${subcategoriaActual.nombre}"?`;
    
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
    modal.show();
}

async function eliminarSubcategoria() {
    if (!subcategoriaActual) return;
    
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        
        const response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${subcategoriaActual.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            mostrarMensaje('success', 'Subcategoría eliminada correctamente');
            
            // Recargar subcategorías
            await cargarSubcategorias(categoriaActual.id);
            
        } else {
            throw new Error('Error al eliminar la subcategoría');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error al eliminar la subcategoría');
    }
}

function mostrarMensaje(tipo, mensaje) {
    // Eliminar mensajes anteriores
    const alertasAnteriores = document.querySelectorAll('.alert-flotante');
    alertasAnteriores.forEach(alerta => alerta.remove());
    
    // Crear nuevo mensaje
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-flotante`;
    alertDiv.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
        ${mensaje}
    `;
    
    // Estilos para mensaje flotante
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 300);
    }, 5000);
}

function mostrarError(mensaje) {
    mostrarMensaje('error', mensaje);
}

// Hacer funciones disponibles globalmente
window.editarSubcategoria = abrirModalSubcategoria;
window.mostrarConfirmacionEliminar = mostrarConfirmacionEliminar;

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);