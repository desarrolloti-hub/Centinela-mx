// Archivo JavaScript para la gestión de categorías y subcategorías

// Variables globales
let currentExpandedCategory = null;
let isEditMode = false;
let currentEditId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la aplicación
    initApp();
});

function initApp() {
    // Configurar eventos
    setupEventListeners();
    
    // Cargar datos iniciales
    loadCategories();
    
    // Configurar modales
    setupModals();
}

function setupEventListeners() {
    // Botón para agregar categoría
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => showCategoryModal());
    }
    
    // Formulario de categoría
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }
    
    // Formulario de subcategoría
    const subcategoryForm = document.getElementById('subcategoryForm');
    if (subcategoryForm) {
        subcategoryForm.addEventListener('submit', handleSubcategorySubmit);
    }
    
    // Color picker para categoría
    const categoryColor = document.getElementById('categoryColor');
    const colorPreview = document.getElementById('colorPreview');
    if (categoryColor && colorPreview) {
        categoryColor.addEventListener('input', function() {
            colorPreview.textContent = this.value;
        });
    }
    
    // Color picker para subcategoría
    const subcategoryColor = document.getElementById('subcategoryColor');
    const subcategoryColorPreview = document.getElementById('subcategoryColorPreview');
    if (subcategoryColor && subcategoryColorPreview) {
        subcategoryColor.addEventListener('input', function() {
            subcategoryColorPreview.textContent = this.value;
        });
    }
}

function setupModals() {
    // Cerrar modales al hacer clic en la X
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                resetForms();
            }
        });
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            resetForms();
        }
    });
}

// FUNCIONES PARA EXPANDIR/CONTRAER CATEGORÍAS

function toggleCategory(categoryId, event) {
    // Prevenir que el clic se propague
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('toggleCategory llamado con ID:', categoryId);
    console.log('currentExpandedCategory:', currentExpandedCategory);
    
    const categoryRow = document.querySelector(`.category-row[data-category-id="${categoryId}"]`);
    const subcategoriesContainer = document.getElementById(`subcategories-${categoryId}`);
    
    console.log('categoryRow encontrado:', !!categoryRow);
    console.log('subcategoriesContainer encontrado:', !!subcategoriesContainer);
    
    if (!categoryRow || !subcategoriesContainer) {
        console.error('Elementos no encontrados para categoryId:', categoryId);
        return;
    }
    
    // Si esta categoría ya está expandida, contraerla
    if (categoryRow.classList.contains('expanded')) {
        console.log('Contrayendo categoría:', categoryId);
        categoryRow.classList.remove('expanded');
        
        // Animación de contracción
        subcategoriesContainer.style.maxHeight = subcategoriesContainer.scrollHeight + 'px';
        subcategoriesContainer.style.overflow = 'hidden';
        setTimeout(() => {
            subcategoriesContainer.style.maxHeight = '0';
            setTimeout(() => {
                subcategoriesContainer.classList.remove('expanded');
                subcategoriesContainer.style.maxHeight = '';
                subcategoriesContainer.style.overflow = '';
            }, 300);
        }, 10);
        
        currentExpandedCategory = null;
    } else {
        console.log('Expandiendo categoría:', categoryId);
        
        // Si hay otra categoría expandida, contraerla primero
        if (currentExpandedCategory && currentExpandedCategory !== categoryId) {
            const previousRow = document.querySelector(`.category-row[data-category-id="${currentExpandedCategory}"]`);
            const previousContainer = document.getElementById(`subcategories-${currentExpandedCategory}`);
            
            if (previousRow && previousContainer) {
                previousRow.classList.remove('expanded');
                previousContainer.classList.remove('expanded');
                console.log('Categoría anterior contraída:', currentExpandedCategory);
            }
        }
        
        // Expandir esta categoría
        categoryRow.classList.add('expanded');
        subcategoriesContainer.classList.add('expanded');
        currentExpandedCategory = categoryId;
        
        // Cargar subcategorías si no están cargadas
        if (!subcategoriesContainer.dataset.loaded) {
            console.log('Cargando subcategorías para:', categoryId);
            loadSubcategories(categoryId);
        }
        
        // Animación de expansión suave
        subcategoriesContainer.style.maxHeight = '0';
        subcategoriesContainer.style.overflow = 'hidden';
        setTimeout(() => {
            subcategoriesContainer.style.maxHeight = subcategoriesContainer.scrollHeight + 'px';
            setTimeout(() => {
                subcategoriesContainer.style.maxHeight = '';
                subcategoriesContainer.style.overflow = '';
            }, 300);
        }, 10);
    }
}

// Configurar clic en filas de categoría
function setupCategoryRowClick() {
    console.log('Configurando eventos de clic en filas...');
    
    document.querySelectorAll('.category-row').forEach(row => {
        // Remover eventos anteriores para evitar duplicados
        row.removeEventListener('click', handleCategoryRowClick);
        
        // Agregar nuevo evento
        row.addEventListener('click', function(event) {
            console.log('Clic en fila detectado');
            handleCategoryRowClick.call(this, event);
        });
    });
    
    console.log('Eventos configurados en', document.querySelectorAll('.category-row').length, 'filas');
}

function handleCategoryRowClick(event) {
    console.log('handleCategoryRowClick ejecutado');
    console.log('Target:', event.target);
    console.log('Closest .actions-cell:', event.target.closest('.actions-cell'));
    console.log('Closest .count-badge:', event.target.closest('.count-badge'));
    
    // Solo expandir si se hace clic en la fila, no en los botones
    if (!event.target.closest('.actions-cell') && !event.target.closest('.count-badge')) {
        const categoryId = this.dataset.categoryId;
        console.log('Expandir categoría ID:', categoryId);
        if (categoryId) {
            toggleCategory(categoryId, event);
        }
    } else {
        console.log('Clic en botones, ignorando expansión');
    }
}

// FUNCIONES PARA CATEGORÍAS

function showCategoryModal(categoryId = null) {
    console.log('showCategoryModal llamado con ID:', categoryId);
    
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('modalCategoryTitle');
    const submitBtn = document.getElementById('categorySubmitBtn');
    
    if (categoryId) {
        // Modo edición
        const category = getCategoryById(categoryId);
        if (!category) return;
        
        isEditMode = true;
        currentEditId = categoryId;
        
        title.textContent = 'Editar Categoría';
        submitBtn.textContent = 'Actualizar Categoría';
        
        // Llenar formulario con datos existentes
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description;
        document.getElementById('categoryColor').value = category.color;
        document.getElementById('colorPreview').textContent = category.color;
        
        // Guardar ID en el formulario
        form.dataset.editId = categoryId;
    } else {
        // Modo creación
        isEditMode = false;
        currentEditId = null;
        
        title.textContent = 'Nueva Categoría';
        submitBtn.textContent = 'Guardar Categoría';
        
        // Resetear formulario
        form.reset();
        document.getElementById('categoryColor').value = '#00ff95';
        document.getElementById('colorPreview').textContent = '#00ff95';
        
        delete form.dataset.editId;
    }
    
    modal.style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    resetForms();
}

function handleCategorySubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const categoryData = {
        name: formData.get('name'),
        description: formData.get('description'),
        color: formData.get('color')
    };
    
    // Validación
    if (!categoryData.name || categoryData.name.trim() === '') {
        Swal.fire('Error', 'El nombre es requerido', 'error');
        return;
    }
    
    if (isEditMode && currentEditId) {
        // Actualizar categoría existente
        updateCategory(currentEditId, categoryData);
    } else {
        // Crear nueva categoría
        createCategory(categoryData);
    }
}

function createCategory(categoryData) {
    console.log('Creando categoría:', categoryData);
    
    // Aquí iría la lógica para guardar en el backend
    Swal.fire({
        title: '¡Éxito!',
        text: 'Categoría creada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        closeCategoryModal();
        loadCategories();
    });
}

function updateCategory(categoryId, categoryData) {
    console.log('Actualizando categoría:', categoryId, categoryData);
    
    // Aquí iría la lógica para actualizar en el backend
    Swal.fire({
        title: '¡Éxito!',
        text: 'Categoría actualizada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        closeCategoryModal();
        loadCategories();
    });
}

function deleteCategory(categoryId) {
    Swal.fire({
        title: '¿Eliminar categoría?',
        text: "Esta acción también eliminará todas sus subcategorías",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            console.log('Eliminando categoría:', categoryId);
            
            Swal.fire({
                title: 'Eliminada!',
                text: 'La categoría ha sido eliminada.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                loadCategories();
            });
        }
    });
}

// FUNCIONES PARA SUBCATEGORÍAS

function showSubcategoryModal(categoryId, subcategoryId = null) {
    console.log('showSubcategoryModal llamado con categoryId:', categoryId, 'subcategoryId:', subcategoryId);
    
    if (!categoryId) return;
    
    const modal = document.getElementById('subcategoryModal');
    const form = document.getElementById('subcategoryForm');
    const title = document.getElementById('modalSubcategoryTitle');
    const submitBtn = document.getElementById('subcategorySubmitBtn');
    
    // Establecer categoría padre
    document.getElementById('parentCategoryId').value = categoryId;
    
    if (subcategoryId) {
        // Modo edición
        const subcategory = getSubcategoryById(subcategoryId);
        if (!subcategory) return;
        
        title.textContent = 'Editar Subcategoría';
        submitBtn.textContent = 'Actualizar Subcategoría';
        
        // Llenar formulario con datos existentes
        document.getElementById('subcategoryId').value = subcategory.id;
        document.getElementById('subcategoryName').value = subcategory.name;
        document.getElementById('subcategoryDescription').value = subcategory.description;
        document.getElementById('subcategoryColor').value = subcategory.color;
        document.getElementById('subcategoryColorPreview').textContent = subcategory.color;
        
        form.dataset.editId = subcategoryId;
    } else {
        // Modo creación
        title.textContent = 'Nueva Subcategoría';
        submitBtn.textContent = 'Guardar Subcategoría';
        
        // Resetear formulario
        form.reset();
        document.getElementById('subcategoryId').value = '';
        document.getElementById('subcategoryColor').value = '#2f8cff';
        document.getElementById('subcategoryColorPreview').textContent = '#2f8cff';
        
        delete form.dataset.editId;
    }
    
    modal.style.display = 'flex';
}

function closeSubcategoryModal() {
    document.getElementById('subcategoryModal').style.display = 'none';
    resetForms();
}

function handleSubcategorySubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const subcategoryData = {
        id: formData.get('id'),
        name: formData.get('name'),
        description: formData.get('description'),
        color: formData.get('color'),
        parentCategoryId: formData.get('parentCategoryId')
    };
    
    // Validación
    if (!subcategoryData.name || subcategoryData.name.trim() === '') {
        Swal.fire('Error', 'El nombre es requerido', 'error');
        return;
    }
    
    if (subcategoryData.id) {
        // Actualizar subcategoría existente
        updateSubcategory(subcategoryData.id, subcategoryData);
    } else {
        // Crear nueva subcategoría
        createSubcategory(subcategoryData);
    }
}

function createSubcategory(subcategoryData) {
    console.log('Creando subcategoría:', subcategoryData);
    
    // Aquí iría la lógica para guardar en el backend
    Swal.fire({
        title: '¡Éxito!',
        text: 'Subcategoría creada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        closeSubcategoryModal();
        loadSubcategories(subcategoryData.parentCategoryId);
    });
}

function updateSubcategory(subcategoryId, subcategoryData) {
    console.log('Actualizando subcategoría:', subcategoryId, subcategoryData);
    
    // Aquí iría la lógica para actualizar en el backend
    Swal.fire({
        title: '¡Éxito!',
        text: 'Subcategoría actualizada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        closeSubcategoryModal();
        loadSubcategories(subcategoryData.parentCategoryId);
    });
}

function deleteSubcategory(subcategoryId, categoryId) {
    Swal.fire({
        title: '¿Eliminar subcategoría?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            console.log('Eliminando subcategoría:', subcategoryId);
            
            Swal.fire({
                title: 'Eliminada!',
                text: 'La subcategoría ha sido eliminada.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                loadSubcategories(categoryId);
            });
        }
    });
}

// FUNCIONES DE VISUALIZACIÓN

function viewCategoryDetails(categoryId) {
    console.log('Ver detalles de categoría:', categoryId);
    
    const category = getCategoryById(categoryId);
    if (!category) return;
    
    const modal = document.getElementById('viewModal');
    const icon = document.getElementById('modalIcon');
    const title = document.getElementById('modalItemTitle');
    const color = document.getElementById('modalItemColor');
    const grid = document.getElementById('modalGrid');
    
    // Configurar modal
    icon.className = 'fas fa-tag';
    title.textContent = category.name;
    color.style.backgroundColor = category.color;
    
    // Crear contenido del grid
    grid.innerHTML = `
        <div><strong>Descripción:</strong> <span>${category.description}</span></div>
        <div><strong>Color:</strong> <span>${category.color}</span></div>
        <div><strong>Total Subcategorías:</strong> <span>${category.count}</span></div>
        <div><strong>Fecha creación:</strong> <span>${category.createdDate}</span></div>
        <div><strong>Fecha modificación:</strong> <span>${category.updatedDate}</span></div>
    `;
    
    modal.style.display = 'flex';
}

function viewSubcategoryDetails(subcategoryId) {
    console.log('Ver detalles de subcategoría:', subcategoryId);
    
    const subcategory = getSubcategoryById(subcategoryId);
    if (!subcategory) return;
    
    const modal = document.getElementById('viewModal');
    const icon = document.getElementById('modalIcon');
    const title = document.getElementById('modalItemTitle');
    const color = document.getElementById('modalItemColor');
    const grid = document.getElementById('modalGrid');
    
    // Configurar modal
    icon.className = 'fas fa-folder';
    title.textContent = subcategory.name;
    color.style.backgroundColor = subcategory.color;
    
    // Crear contenido del grid
    grid.innerHTML = `
        <div><strong>Descripción:</strong> <span>${subcategory.description}</span></div>
        <div><strong>Color:</strong> <span>${subcategory.color}</span></div>
        <div><strong>Categoría padre:</strong> <span>${subcategory.parentCategoryName}</span></div>
        <div><strong>Fecha creación:</strong> <span>${subcategory.createdDate}</span></div>
        <div><strong>Fecha modificación:</strong> <span>${subcategory.updatedDate}</span></div>
    `;
    
    modal.style.display = 'flex';
}

// FUNCIONES DE CARGA DE DATOS

function loadCategories() {
    console.log('Cargando categorías...');
    
    const tableBody = document.getElementById('categoriesTableBody');
    
    if (!tableBody) {
        console.error('No se encontró categoriesTableBody');
        return;
    }
    
    // Datos de ejemplo
    const categories = [
        {
            id: 1,
            name: "Electrónica",
            description: "Dispositivos electrónicos y gadgets",
            color: "#00ff95",
            count: 3,
            createdDate: "2024-01-15",
            updatedDate: "2024-02-10"
        },
        {
            id: 2,
            name: "Ropa",
            description: "Prendas de vestir para todas las edades",
            color: "#2f8cff",
            count: 5,
            createdDate: "2024-01-10",
            updatedDate: "2024-02-05"
        },
        {
            id: 3,
            name: "Hogar",
            description: "Artículos para el hogar y decoración",
            color: "#ffcc00",
            count: 2,
            createdDate: "2024-02-01",
            updatedDate: "2024-02-15"
        }
    ];
    
    tableBody.innerHTML = '';
    
    categories.forEach(category => {
        // Crear fila de categoría
        const categoryRow = document.createElement('tr');
        categoryRow.className = 'category-row';
        categoryRow.dataset.categoryId = category.id;
        
        // Agregar evento de clic directamente
        categoryRow.addEventListener('click', function(event) {
            console.log('Clic directo en fila ID:', category.id);
            if (!event.target.closest('.actions-cell') && !event.target.closest('.count-badge')) {
                toggleCategory(category.id, event);
            }
        });
        
        categoryRow.innerHTML = `
            <td class="category-name" data-label="CATEGORÍA">
                <div class="category-info">
                    <i class="fas fa-chevron-right expand-indicator"></i>
                    <span class="category-title">${category.name}</span>
                </div>
            </td>
            <td class="category-description" data-label="DESCRIPCIÓN">
                <span>${category.description}</span>
            </td>
            <td class="category-color" data-label="COLOR">
                <div class="color-indicator" style="background-color: ${category.color};"></div>
                <span class="color-code">${category.color}</span>
            </td>
            <td class="category-count" data-label="SUBCATEGORÍAS">
                <div class="count-badge" onclick="toggleCategory(${category.id}, event)">
                    <i class="fas fa-layer-group"></i>
                    <span class="count-number">${category.count}</span>
                </div>
            </td>
            <td class="category-actions" data-label="ACCIONES">
                <div class="actions-cell">
                    <button class="row-btn view" onclick="viewCategoryDetails(${category.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="row-btn edit" onclick="showCategoryModal(${category.id})" title="Editar categoría">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="row-btn delete" onclick="deleteCategory(${category.id})" title="Eliminar categoría">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(categoryRow);
        
        // Crear contenedor para subcategorías - SOLUCIÓN CORREGIDA
        const subcategoriesContainer = document.createElement('tr');
        subcategoriesContainer.id = `subcategories-${category.id}`;
        subcategoriesContainer.className = 'subcategories-container';
        
        // Celda única que ocupa todas las columnas
        const subcategoriesCell = document.createElement('td');
        subcategoriesCell.colSpan = 5; // IMPORTANTE: Colspan igual al número de columnas
        
        subcategoriesCell.innerHTML = `
            <div class="subcategories-inner">
                <div class="subcategories-header">
                    <div class="subcategories-header-title">
                        <i class="fas fa-folder-tree"></i>
                        <span>Subcategorías de ${category.name}</span>
                    </div>
                    <div class="subcategories-header-actions">
                        <button class="add-subcategory-btn" onclick="showSubcategoryModal(${category.id})">
                            <i class="fas fa-plus-circle"></i> Agregar Subcategoría
                        </button>
                    </div>
                </div>
                <table class="subcategories-table">
                    <thead>
                        <tr>
                            <th>NOMBRE</th>
                            <th>DESCRIPCIÓN</th>
                            <th>COLOR</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody id="subcategories-body-${category.id}">
                        <!-- LAS SUBCATEGORÍAS SE CARGARÁN DINÁMICAMENTE -->
                    </tbody>
                </table>
            </div>
        `;
        
        subcategoriesContainer.appendChild(subcategoriesCell);
        tableBody.appendChild(subcategoriesContainer);
    });
    
    console.log('Categorías cargadas:', categories.length);
}

function loadSubcategories(categoryId) {
    console.log('Cargando subcategorías para categoryId:', categoryId);
    
    const tableBody = document.getElementById(`subcategories-body-${categoryId}`);
    const container = document.getElementById(`subcategories-${categoryId}`);
    
    if (!tableBody || !container) {
        console.error('No se encontraron elementos para categoryId:', categoryId);
        return;
    }
    
    // Marcar como cargado
    container.dataset.loaded = 'true';
    
    // Datos de ejemplo basados en la categoría
    let subcategories = [];
    
    if (categoryId == 1) {
        subcategories = [
            { 
                id: 1, 
                name: "Smartphones", 
                description: "Teléfonos inteligentes y dispositivos móviles", 
                color: "#ff6b6b", 
                createdDate: "2024-01-20", 
                updatedDate: "2024-02-10",
                parentCategoryName: "Electrónica"
            },
            { 
                id: 2, 
                name: "Laptops", 
                description: "Computadoras portátiles y ultrabooks", 
                color: "#4ecdc4", 
                createdDate: "2024-01-25", 
                updatedDate: "2024-02-12",
                parentCategoryName: "Electrónica"
            },
            { 
                id: 3, 
                name: "Accesorios", 
                description: "Accesorios electrónicos y periféricos", 
                color: "#ffe66d", 
                createdDate: "2024-02-01", 
                updatedDate: "2024-02-15",
                parentCategoryName: "Electrónica"
            }
        ];
    } else if (categoryId == 2) {
        subcategories = [
            { 
                id: 4, 
                name: "Hombre", 
                description: "Ropa y accesorios para hombres", 
                color: "#6a5acd", 
                createdDate: "2024-01-12", 
                updatedDate: "2024-02-08",
                parentCategoryName: "Ropa"
            },
            { 
                id: 5, 
                name: "Mujer", 
                description: "Ropa y accesorios para mujeres", 
                color: "#ff69b4", 
                createdDate: "2024-01-15", 
                updatedDate: "2024-02-10",
                parentCategoryName: "Ropa"
            },
            { 
                id: 6, 
                name: "Niños", 
                description: "Ropa infantil para todas las edades", 
                color: "#7bed9f", 
                createdDate: "2024-01-18", 
                updatedDate: "2024-02-12",
                parentCategoryName: "Ropa"
            }
        ];
    } else {
        subcategories = [
            { 
                id: 7, 
                name: "Muebles", 
                description: "Muebles para el hogar y oficina", 
                color: "#a855f7", 
                createdDate: "2024-02-01", 
                updatedDate: "2024-02-15",
                parentCategoryName: "Hogar"
            },
            { 
                id: 8, 
                name: "Decoración", 
                description: "Artículos decorativos para el hogar", 
                color: "#ff7f50", 
                createdDate: "2024-02-05", 
                updatedDate: "2024-02-18",
                parentCategoryName: "Hogar"
            }
        ];
    }
    
    tableBody.innerHTML = '';
    
    subcategories.forEach(subcat => {
        const row = document.createElement('tr');
        row.className = 'subcategory-row';
        
        row.innerHTML = `
            <td class="subcategory-name" data-label="NOMBRE">
                <strong>${subcat.name}</strong>
            </td>
            <td class="subcategory-description" data-label="DESCRIPCIÓN">
                <span>${subcat.description}</span>
            </td>
            <td class="subcategory-color" data-label="COLOR">
                <div class="color-indicator" style="background-color: ${subcat.color};"></div>
                <span class="color-code">${subcat.color}</span>
            </td>
            <td class="subcategory-actions" data-label="ACCIONES">
                <div class="actions-cell">
                    <button class="row-btn view" onclick="viewSubcategoryDetails(${subcat.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="row-btn edit" onclick="showSubcategoryModal(${categoryId}, ${subcat.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="row-btn delete" onclick="deleteSubcategory(${subcat.id}, ${categoryId})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log('Subcategorías cargadas:', subcategories.length);
}

// FUNCIONES AUXILIARES

function getCategoryById(id) {
    // Esta función simula obtener una categoría por ID
    const categories = [
        { id: 1, name: "Electrónica", description: "Dispositivos electrónicos y gadgets", color: "#00ff95", count: 3, createdDate: "2024-01-15", updatedDate: "2024-02-10" },
        { id: 2, name: "Ropa", description: "Prendas de vestir para todas las edades", color: "#2f8cff", count: 5, createdDate: "2024-01-10", updatedDate: "2024-02-05" },
        { id: 3, name: "Hogar", description: "Artículos para el hogar y decoración", color: "#ffcc00", count: 2, createdDate: "2024-02-01", updatedDate: "2024-02-15" }
    ];
    
    return categories.find(cat => cat.id == id);
}

function getSubcategoryById(id) {
    // Esta función simula obtener una subcategoría por ID
    const subcategories = [
        { id: 1, name: "Smartphones", description: "Teléfonos inteligentes y dispositivos móviles", color: "#ff6b6b", createdDate: "2024-01-20", updatedDate: "2024-02-10", parentCategoryName: "Electrónica" },
        { id: 2, name: "Laptops", description: "Computadoras portátiles y ultrabooks", color: "#4ecdc4", createdDate: "2024-01-25", updatedDate: "2024-02-12", parentCategoryName: "Electrónica" },
        { id: 3, name: "Accesorios", description: "Accesorios electrónicos y periféricos", color: "#ffe66d", createdDate: "2024-02-01", updatedDate: "2024-02-15", parentCategoryName: "Electrónica" },
        { id: 4, name: "Hombre", description: "Ropa y accesorios para hombres", color: "#6a5acd", createdDate: "2024-01-12", updatedDate: "2024-02-08", parentCategoryName: "Ropa" },
        { id: 5, name: "Mujer", description: "Ropa y accesorios para mujeres", color: "#ff69b4", createdDate: "2024-01-15", updatedDate: "2024-02-10", parentCategoryName: "Ropa" },
        { id: 6, name: "Niños", description: "Ropa infantil para todas las edades", color: "#7bed9f", createdDate: "2024-01-18", updatedDate: "2024-02-12", parentCategoryName: "Ropa" }
    ];
    
    return subcategories.find(sub => sub.id == id);
}

function resetForms() {
    isEditMode = false;
    currentEditId = null;
    
    // Resetear formularios
    const forms = ['categoryForm', 'subcategoryForm'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            delete form.dataset.editId;
        }
    });
    
    // Resetear preview de colores
    const colorPreview = document.getElementById('colorPreview');
    if (colorPreview) colorPreview.textContent = '#00ff95';
    
    const subcategoryColorPreview = document.getElementById('subcategoryColorPreview');
    if (subcategoryColorPreview) subcategoryColorPreview.textContent = '#2f8cff';
}

// Hacer funciones disponibles globalmente
window.toggleCategory = toggleCategory;
window.showCategoryModal = showCategoryModal;
window.showSubcategoryModal = showSubcategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.closeSubcategoryModal = closeSubcategoryModal;
window.viewCategoryDetails = viewCategoryDetails;
window.viewSubcategoryDetails = viewSubcategoryDetails;
window.deleteCategory = deleteCategory;
window.deleteSubcategory = deleteSubcategory;

console.log('categorias.js cargado correctamente');