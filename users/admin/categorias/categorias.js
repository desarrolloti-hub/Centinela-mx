// categorias.js - Versión actualizada
import { BASE_URL } from '/config/config.js';

let categorias = [];
let categoriasEliminadas = [];
let categoriaActual = null;
let mostrarEliminadas = false;
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Cargar categorías
    cargarCategorias();
    
    // Event Listeners
    document.getElementById('buscarCategoria').addEventListener('input', filtrarCategorias);
    document.getElementById('toggleEliminadas').addEventListener('change', toggleCategoriasEliminadas);
    document.getElementById('btnConfirmarAccion').addEventListener('click', confirmarAccion);
});

async function cargarCategorias() {
    try {
        const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
        if (!organizacionCamelCase) {
            console.error('No se encontró la organización');
            return;
        }

        const response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Separar categorías activas y eliminadas
            categorias = data.filter(cat => !cat.eliminado);
            categoriasEliminadas = data.filter(cat => cat.eliminado);
            
            mostrarTablaCategorias();
            actualizarPaginacion();
        } else {
            console.error('Error al cargar categorías');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarTablaCategorias() {
    const tablaBody = document.getElementById('tablaCategoriasBody');
    const datosMostrar = mostrarEliminadas ? categoriasEliminadas : categorias;
    
    // Calcular índices para la paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const datosPaginados = datosMostrar.slice(startIndex, endIndex);
    
    tablaBody.innerHTML = '';
    
    if (datosPaginados.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-folder-open fa-2x mb-2 text-muted"></i>
                    <p class="text-muted">No hay categorías ${mostrarEliminadas ? 'eliminadas' : ''} para mostrar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Contador global para la tabla
    let contadorGlobal = startIndex + 1;
    
    datosPaginados.forEach(categoria => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contadorGlobal}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="color-indicator me-2" style="background-color: ${categoria.color};"></div>
                    <strong>${categoria.nombre}</strong>
                </div>
            </td>
            <td>
                <span class="badge" style="background-color: ${categoria.color}; color: #fff;">
                    ${categoria.color}
                </span>
            </td>
            <td>
                <span class="badge bg-info">
                    ${categoria.subcategorias ? categoria.subcategorias.length : 0}
                </span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="verDetalles('${categoria.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    
                    ${!categoria.eliminado ? `
                        <a href="/users/admin/crearCategorias/crearCategorias.html?id=${categoria.id}" 
                           class="btn btn-sm btn-outline-warning" title="Editar">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-danger" onclick="mostrarConfirmacion('eliminar', '${categoria.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success" onclick="mostrarConfirmacion('restaurar', '${categoria.id}')" title="Restaurar">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="mostrarConfirmacion('eliminarPermanente', '${categoria.id}')" title="Eliminar permanentemente">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    `}
                </div>
            </td>
        `;
        tablaBody.appendChild(row);
        contadorGlobal++;
    });
}

function filtrarCategorias() {
    const searchTerm = document.getElementById('buscarCategoria').value.toLowerCase();
    const datosMostrar = mostrarEliminadas ? categoriasEliminadas : categorias;
    
    const datosFiltrados = datosMostrar.filter(categoria =>
        categoria.nombre.toLowerCase().includes(searchTerm) ||
        categoria.color.toLowerCase().includes(searchTerm)
    );
    
    // Recalcular paginación con datos filtrados
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const datosPaginados = datosFiltrados.slice(startIndex, endIndex);
    
    mostrarDatosFiltrados(datosPaginados, datosFiltrados.length);
}

function mostrarDatosFiltrados(datos, totalFiltrados) {
    const tablaBody = document.getElementById('tablaCategoriasBody');
    tablaBody.innerHTML = '';
    
    if (datos.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-search fa-2x mb-2 text-muted"></i>
                    <p class="text-muted">No se encontraron categorías</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Contador global para la tabla
    let contadorGlobal = (currentPage - 1) * itemsPerPage + 1;
    
    datos.forEach(categoria => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contadorGlobal}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="color-indicator me-2" style="background-color: ${categoria.color};"></div>
                    <strong>${categoria.nombre}</strong>
                </div>
            </td>
            <td>
                <span class="badge" style="background-color: ${categoria.color}; color: #fff;">
                    ${categoria.color}
                </span>
            </td>
            <td>
                <span class="badge bg-info">
                    ${categoria.subcategorias ? categoria.subcategorias.length : 0}
                </span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="verDetalles('${categoria.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    
                    ${!categoria.eliminado ? `
                        <a href="/users/admin/crearCategorias/crearCategorias.html?id=${categoria.id}" 
                           class="btn btn-sm btn-outline-warning" title="Editar">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-danger" onclick="mostrarConfirmacion('eliminar', '${categoria.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success" onclick="mostrarConfirmacion('restaurar', '${categoria.id}')" title="Restaurar">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="mostrarConfirmacion('eliminarPermanente', '${categoria.id}')" title="Eliminar permanentemente">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    `}
                </div>
            </td>
        `;
        tablaBody.appendChild(row);
        contadorGlobal++;
    });
    
    // Actualizar información de paginación
    const totalPages = Math.ceil(totalFiltrados / itemsPerPage);
    actualizarInfoPaginacion(totalFiltrados, totalPages);
}

function actualizarPaginacion() {
    const datosMostrar = mostrarEliminadas ? categoriasEliminadas : categorias;
    const totalItems = datosMostrar.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // Botón anterior
    const prevItem = document.createElement('li');
    prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevItem.innerHTML = `<a class="page-link" href="#" onclick="cambiarPagina(${currentPage - 1})">Anterior</a>`;
    pagination.appendChild(prevItem);
    
    // Números de página
    for (let i = 1; i <= totalPages; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageItem.innerHTML = `<a class="page-link" href="#" onclick="cambiarPagina(${i})">${i}</a>`;
        pagination.appendChild(pageItem);
    }
    
    // Botón siguiente
    const nextItem = document.createElement('li');
    nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextItem.innerHTML = `<a class="page-link" href="#" onclick="cambiarPagina(${currentPage + 1})">Siguiente</a>`;
    pagination.appendChild(nextItem);
    
    // Actualizar información
    actualizarInfoPaginacion(totalItems, totalPages);
}

function actualizarInfoPaginacion(totalItems, totalPages) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    const paginationInfo = document.getElementById('paginationInfo');
    if (totalItems > 0) {
        paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} categorías`;
    } else {
        paginationInfo.textContent = 'No hay categorías para mostrar';
    }
}

function cambiarPagina(page) {
    currentPage = page;
    
    if (document.getElementById('buscarCategoria').value) {
        filtrarCategorias();
    } else {
        mostrarTablaCategorias();
    }
    
    actualizarPaginacion();
}

function toggleCategoriasEliminadas() {
    mostrarEliminadas = document.getElementById('toggleEliminadas').checked;
    currentPage = 1;
    
    if (document.getElementById('buscarCategoria').value) {
        filtrarCategorias();
    } else {
        mostrarTablaCategorias();
    }
    
    actualizarPaginacion();
}

function verDetalles(id) {
    const todasCategorias = [...categorias, ...categoriasEliminadas];
    categoriaActual = todasCategorias.find(cat => cat.id === id);
    
    if (!categoriaActual) return;
    
    const detallesContent = document.getElementById('detallesContent');
    detallesContent.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <div class="text-center mb-4">
                    <div class="color-preview mx-auto mb-3" style="background-color: ${categoriaActual.color}; width: 100px; height: 100px; border-radius: 10px;"></div>
                    <h5 class="mb-0">${categoriaActual.nombre}</h5>
                    <small class="text-muted">ID: ${categoriaActual.id}</small>
                </div>
            </div>
            <div class="col-md-8">
                <div class="mb-4">
                    <h6 class="border-bottom pb-2">Información General</h6>
                    <p><strong>Color:</strong> <span class="badge" style="background-color: ${categoriaActual.color};">${categoriaActual.color}</span></p>
                    <p><strong>Creado por:</strong> ${categoriaActual.creadoPor || 'No especificado'}</p>
                    <p><strong>Fecha creación:</strong> ${new Date(categoriaActual.fechaCreacion).toLocaleDateString()}</p>
                    <p><strong>Estado:</strong> 
                        <span class="badge ${categoriaActual.eliminado ? 'bg-danger' : 'bg-success'}">
                            ${categoriaActual.eliminado ? 'Eliminado' : 'Activo'}
                        </span>
                    </p>
                </div>
                
                <div class="mb-3">
                    <h6 class="border-bottom pb-2">Subcategorías (${categoriaActual.subcategorias ? categoriaActual.subcategorias.length : 0})</h6>
                    <div class="subcategorias-container mt-2">
                        ${categoriaActual.subcategorias && categoriaActual.subcategorias.length > 0 
                            ? categoriaActual.subcategorias.map(sub => 
                                `<span class="badge bg-light text-dark me-1 mb-1">${sub.nombre || 'Sin nombre'}</span>`
                              ).join('')
                            : '<p class="text-muted">No tiene subcategorías</p>'
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalDetalles = new bootstrap.Modal(document.getElementById('modalDetalles'));
    modalDetalles.show();
}

function mostrarConfirmacion(accion, id) {
    const todasCategorias = [...categorias, ...categoriasEliminadas];
    categoriaActual = todasCategorias.find(cat => cat.id === id);
    
    if (!categoriaActual) return;
    
    let mensaje = '';
    let tipoBoton = 'btn-danger';
    
    switch (accion) {
        case 'eliminar':
            mensaje = `¿Está seguro de eliminar la categoría "${categoriaActual.nombre}"? Esta acción no es permanente y se puede restaurar.`;
            tipoBoton = 'btn-danger';
            break;
        case 'restaurar':
            mensaje = `¿Está seguro de restaurar la categoría "${categoriaActual.nombre}"?`;
            tipoBoton = 'btn-success';
            break;
        case 'eliminarPermanente':
            mensaje = `¿Está seguro de eliminar permanentemente la categoría "${categoriaActual.nombre}"? Esta acción no se puede deshacer.`;
            tipoBoton = 'btn-danger';
            break;
    }
    
    document.getElementById('confirmarMensaje').textContent = mensaje;
    document.getElementById('btnConfirmarAccion').className = `btn ${tipoBoton}`;
    document.getElementById('btnConfirmarAccion').dataset.accion = accion;
    
    const modalConfirmar = new bootstrap.Modal(document.getElementById('modalConfirmar'));
    modalConfirmar.show();
}

async function confirmarAccion() {
    const accion = document.getElementById('btnConfirmarAccion').dataset.accion;
    const organizacionCamelCase = localStorage.getItem('organizacionCamelCase');
    
    try {
        let response;
        
        switch (accion) {
            case 'eliminar':
                response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${categoriaActual.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                break;
                
            case 'restaurar':
                response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${categoriaActual.id}/restaurar`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                break;
                
            case 'eliminarPermanente':
                response = await fetch(`${BASE_URL}/categoria/${organizacionCamelCase}/${categoriaActual.id}/permanente`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                break;
        }
        
        if (response.ok) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            
            // Recargar categorías
            await cargarCategorias();
            
            // Mostrar mensaje de éxito
            alert(`Categoría ${accion === 'eliminar' ? 'eliminada' : accion === 'restaurar' ? 'restaurada' : 'eliminada permanentemente'} correctamente.`);
        } else {
            throw new Error('Error en la operación');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error al realizar la operación');
    }
}

// Hacer funciones disponibles globalmente
window.verDetalles = verDetalles;
window.mostrarConfirmacion = mostrarConfirmacion;
window.cambiarPagina = cambiarPagina;