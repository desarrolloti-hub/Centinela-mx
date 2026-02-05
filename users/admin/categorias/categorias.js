// Archivo JavaScript para la gestión de categorías y subcategorías
document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let currentCategoryId = null;
    let currentCategoryName = "";
    let isEditMode = false;
    let currentEditId = null;
    
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
    
    // Botón para agregar subcategoría
    const addSubcategoryBtn = document.getElementById('addSubcategoryBtn');
    if (addSubcategoryBtn) {
        addSubcategoryBtn.addEventListener('click', () => showSubcategoryModal());
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

// FUNCIONES PARA CATEGORÍAS

function showCategoryModal(categoryId = null) {
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
    // Aquí iría la lógica para guardar en el backend
    console.log('Creando categoría:', categoryData);
    
    // Simular guardado exitoso
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
    // Aquí iría la lógica para actualizar en el backend
    console.log('Actualizando categoría:', categoryId, categoryData);
    
    // Simular actualización exitosa
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
            // Aquí iría la lógica para eliminar
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

function showSubcategoryModal(subcategoryId = null) {
    if (!currentCategoryId) return;
    
    const modal = document.getElementById('subcategoryModal');
    const form = document.getElementById('subcategoryForm');
    const title = document.getElementById('modalSubcategoryTitle');
    const submitBtn = document.getElementById('subcategorySubmitBtn');
    
    // Establecer categoría padre
    document.getElementById('parentCategoryId').value = currentCategoryId;
    
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
        document.getElementById('subcategoryStatus').value = subcategory.status;
        
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
        document.getElementById('subcategoryStatus').value = 'active';
        
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
        status: formData.get('status'),
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
    // Aquí iría la lógica para guardar en el backend
    console.log('Creando subcategoría:', subcategoryData);
    
    // Simular guardado exitoso
    Swal.fire({
        title: '¡Éxito!',
        text: 'Subcategoría creada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        closeSubcategoryModal();
        loadSubcategories(currentCategoryId);
    });
}

function updateSubcategory(subcategoryId, subcategoryData) {
    // Aquí iría la lógica para actualizar en el backend
    console.log('Actualizando subcategoría:', subcategoryId, subcategoryData);
    
    // Simular actualización exitosa
    Swal.fire({
        title: '¡Éxito!',
        text: 'Subcategoría actualizada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        closeSubcategoryModal();
        loadSubcategories(currentCategoryId);
    });
}

function deleteSubcategory(subcategoryId) {
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
            // Aquí iría la lógica para eliminar
            console.log('Eliminando subcategoría:', subcategoryId);
            
            Swal.fire({
                title: 'Eliminada!',
                text: 'La subcategoría ha sido eliminada.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                loadSubcategories(currentCategoryId);
            });
        }
    });
}

// FUNCIONES DE VISUALIZACIÓN

function viewCategoryDetails(categoryId) {
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
        <div><strong>Estado:</strong> <span class="status-badge active">Activa</span></div>
    `;
    
    modal.style.display = 'flex';
}

function viewSubcategoryDetails(subcategoryId) {
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
        <div><strong>Categoría padre:</strong> <span>${currentCategoryName}</span></div>
        <div><strong>Fecha creación:</strong> <span>${subcategory.createdDate}</span></div>
        <div><strong>Fecha modificación:</strong> <span>${subcategory.updatedDate}</span></div>
        <div><strong>Estado:</strong> <span class="status-badge ${subcategory.status}">${subcategory.status === 'active' ? 'Activa' : 'Inactiva'}</span></div>
    `;
    
    modal.style.display = 'flex';
}

// FUNCIONES DE NAVEGACIÓN

function openCategory(categoryId) {
    const category = getCategoryById(categoryId);
    if (!category) return;
    
    // Guardar información actual
    currentCategoryId = categoryId;
    currentCategoryName = category.name;
    
    // Actualizar breadcrumb
    updateBreadcrumb(category.name);
    
    // Actualizar título de subcategorías
    document.getElementById('currentCategoryName').textContent = category.name;
    
    // Ocultar vista principal
    document.getElementById('mainView').style.display = 'none';
    
    // Mostrar vista de subcategorías
    document.getElementById('subcategoriesView').style.display = 'block';
    
    // Cargar subcategorías
    loadSubcategories(categoryId);
}

function showMainView() {
    // Resetear variables
    currentCategoryId = null;
    currentCategoryName = "";
    
    // Actualizar breadcrumb
    updateBreadcrumb();
    
    // Ocultar vista de subcategorías
    document.getElementById('subcategoriesView').style.display = 'none';
    
    // Mostrar vista principal
    document.getElementById('mainView').style.display = 'block';
}

function updateBreadcrumb(categoryName = null) {
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (categoryName) {
        breadcrumb.innerHTML = `
            <span class="breadcrumb-item active" onclick="showMainView()">Categorías</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item active">${categoryName}</span>
        `;
    } else {
        breadcrumb.innerHTML = `
            <span class="breadcrumb-item active">Categorías</span>
        `;
    }
}

// FUNCIONES DE CARGA DE DATOS

function loadCategories() {
    const tableBody = document.getElementById('categoriesTableBody');
    
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
        const row = document.createElement('tr');
        row.className = 'category-row';
        row.dataset.categoryId = category.id;
        row.onclick = (e) => {
            // Evitar que el clic en botones active la navegación
            if (!e.target.closest('.actions-cell')) {
                openCategory(category.id);
            }
        };
        
        row.innerHTML = `
            <td class="category-name" data-label="CATEGORÍA">
                <div class="category-info">
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
                <div class="count-badge" onclick="openCategory(${category.id})">
                    <i class="fas fa-layer-group"></i>
                    <span class="count-number">${category.count}</span>
                </div>
            </td>
            <td class="category-actions" data-label="ACCIONES">
                <div class="actions-cell">
                    <button class="row-btn view" onclick="event.stopPropagation(); viewCategoryDetails(${category.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="row-btn edit" onclick="event.stopPropagation(); showCategoryModal(${category.id})" title="Editar categoría">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="row-btn delete" onclick="event.stopPropagation(); deleteCategory(${category.id})" title="Eliminar categoría">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function loadSubcategories(categoryId) {
    const tableBody = document.getElementById('subcategoriesTableBody');
    
    // Datos de ejemplo basados en la categoría
    let subcategories = [];
    
    if (categoryId === 1) {
        subcategories = [
            { id: 1, name: "Smartphones", description: "Teléfonos inteligentes", color: "#ff6b6b", status: "active", createdDate: "2024-01-20", updatedDate: "2024-02-10" },
            { id: 2, name: "Laptops", description: "Computadoras portátiles", color: "#4ecdc4", status: "active", createdDate: "2024-01-25", updatedDate: "2024-02-12" },
            { id: 3, name: "Accesorios", description: "Accesorios electrónicos", color: "#ffe66d", status: "inactive", createdDate: "2024-02-01", updatedDate: "2024-02-15" }
        ];
    } else if (categoryId === 2) {
        subcategories = [
            { id: 4, name: "Hombre", description: "Ropa para hombres", color: "#6a5acd", status: "active", createdDate: "2024-01-12", updatedDate: "2024-02-08" },
            { id: 5, name: "Mujer", description: "Ropa para mujeres", color: "#ff69b4", status: "active", createdDate: "2024-01-15", updatedDate: "2024-02-10" }
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
            <td class="subcategory-status" data-label="ESTADO">
                <span class="status-badge ${subcat.status}">${subcat.status === 'active' ? 'Activa' : 'Inactiva'}</span>
            </td>
            <td class="subcategory-actions" data-label="ACCIONES">
                <div class="actions-cell">
                    <button class="row-btn view" onclick="viewSubcategoryDetails(${subcat.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="row-btn edit" onclick="showSubcategoryModal(${subcat.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="row-btn delete" onclick="deleteSubcategory(${subcat.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// FUNCIONES AUXILIARES

function getCategoryById(id) {
    // Esta función simula obtener una categoría por ID
    const categories = [
        { id: 1, name: "Electrónica", description: "Dispositivos electrónicos y gadgets", color: "#00ff95", count: 3, createdDate: "2024-01-15", updatedDate: "2024-02-10" },
        { id: 2, name: "Ropa", description: "Prendas de vestir para todas las edades", color: "#2f8cff", count: 5, createdDate: "2024-01-10", updatedDate: "2024-02-05" },
        { id: 3, name: "Hogar", description: "Artículos para el hogar y decoración", color: "#ffcc00", count: 2, createdDate: "2024-02-01", updatedDate: "2024-02-15" }
    ];
    
    return categories.find(cat => cat.id === id);
}

function getSubcategoryById(id) {
    // Esta función simula obtener una subcategoría por ID
    const subcategories = [
        { id: 1, name: "Smartphones", description: "Teléfonos inteligentes", color: "#ff6b6b", status: "active", createdDate: "2024-01-20", updatedDate: "2024-02-10" },
        { id: 2, name: "Laptops", description: "Computadoras portátiles", color: "#4ecdc4", status: "active", createdDate: "2024-01-25", updatedDate: "2024-02-12" },
        { id: 3, name: "Accesorios", description: "Accesorios electrónicos", color: "#ffe66d", status: "inactive", createdDate: "2024-02-01", updatedDate: "2024-02-15" },
        { id: 4, name: "Hombre", description: "Ropa para hombres", color: "#6a5acd", status: "active", createdDate: "2024-01-12", updatedDate: "2024-02-08" },
        { id: 5, name: "Mujer", description: "Ropa para mujeres", color: "#ff69b4", status: "active", createdDate: "2024-01-15", updatedDate: "2024-02-10" }
    ];
    
    return subcategories.find(sub => sub.id === id);
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
window.openCategory = openCategory;
window.showMainView = showMainView;
window.showCategoryModal = showCategoryModal;
window.showSubcategoryModal = showSubcategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.closeSubcategoryModal = closeSubcategoryModal;
window.viewCategoryDetails = viewCategoryDetails;
window.viewSubcategoryDetails = viewSubcategoryDetails;
window.deleteCategory = deleteCategory;
window.deleteSubcategory = deleteSubcategory;