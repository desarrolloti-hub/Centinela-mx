// crearCategorias.js - VERSIÓN PARA TU HTML ESPECÍFICO
console.log('🚀 Iniciando crearCategorias...');

import { db } from '/config/firebase-config.js';
import {
    collection, doc, setDoc, serverTimestamp, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// =============================================
// VARIABLES GLOBALES
// =============================================
let categoriaManager = null;
let empresaActual = null;

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializar() {
    console.log('🎬 Inicializando...');

    try {
        // 1. OBTENER DATOS DE LA EMPRESA
        await obtenerDatosEmpresa();

        // 2. CARGAR CategoriaManager
        const { CategoriaManager } = await import('/clases/categoria.js');
        categoriaManager = new CategoriaManager();

        console.log('✅ CategoriaManager listo');
        console.log('📁 Colección:', categoriaManager.nombreColeccion);
        console.log('🏢 Empresa:', categoriaManager.empresaNombre);

        // 3. CONFIGURAR EVENTOS
        configurarEventos();

        // 4. MOSTRAR INFO DE EMPRESA
        mostrarInfoEmpresa();

        return true;
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo inicializar el sistema',
            icon: 'error',
            background: '#0a0a0a',
            color: '#fff'
        });
        return false;
    }
}

async function obtenerDatosEmpresa() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');

        empresaActual = {
            id: userData.organizacionCamelCase || userData.organizacion || 'pollosRay',
            nombre: userData.organizacion || 'pollos Ray',
            camelCase: userData.organizacionCamelCase || 'pollosRay'
        };

        console.log('📊 Datos de empresa:', empresaActual);
    } catch (error) {
        console.error('Error:', error);
        empresaActual = { id: 'pollosRay', nombre: 'pollos Ray', camelCase: 'pollosRay' };
    }
}

function configurarEventos() {
    console.log('🎮 Configurando eventos...');

    // Botón Guardar (btnSave)
    const btnSave = document.getElementById('btnSave');
    if (btnSave) {
        btnSave.addEventListener('click', guardarCategoria);
        console.log('✅ Evento btnSave configurado');
    } else {
        console.error('❌ No se encontró btnSave');
    }

    // Botón Cancelar (btnCancel)
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            Swal.fire({
                title: '¿Cancelar?',
                text: 'Los cambios no guardados se perderán',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar',
                background: '#0a0a0a',
                color: '#fff'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/users/admin/categorias/categorias.html';
                }
            });
        });
        console.log('✅ Evento btnCancel configurado');
    }

    // Color Preview Card - para abrir color picker
    const colorPreviewCard = document.getElementById('colorPreviewCard');
    const colorPickerNative = document.getElementById('colorPickerNative');

    if (colorPreviewCard && colorPickerNative) {
        colorPreviewCard.addEventListener('click', () => {
            colorPickerNative.click();
        });

        colorPickerNative.addEventListener('input', (e) => {
            const color = e.target.value;
            document.getElementById('colorDisplay').style.backgroundColor = color;
            document.getElementById('colorHex').textContent = color;
        });

        console.log('✅ Eventos de color configurados');
    }
}

function mostrarInfoEmpresa() {
    const header = document.querySelector('.header-section');
    if (header && empresaActual) {
        const badge = document.createElement('div');
        badge.className = 'badge-empresa';
        badge.style.cssText = `
            display: inline-block;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #10b981;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            margin-top: 10px;
        `;
        badge.innerHTML = `
            <i class="fas fa-building me-1"></i>
            ${empresaActual.nombre} | 
            <i class="fas fa-database ms-1 me-1"></i>
            categorias_${empresaActual.camelCase}
        `;
        header.appendChild(badge);
    }
}

// =============================================
// FUNCIÓN PRINCIPAL: GUARDAR CATEGORÍA
// =============================================
async function guardarCategoria(e) {
    e.preventDefault();
    console.log('🟢 EJECUTANDO guardarCategoria');

    // 1. VALIDAR CAMPOS
    const nombreInput = document.getElementById('nombreCategoria');
    const nombre = nombreInput.value.trim();

    if (!nombre) {
        nombreInput.classList.add('is-invalid');
        Swal.fire({
            title: 'Campo requerido',
            text: 'El nombre de la categoría es obligatorio',
            icon: 'warning',
            background: '#0a0a0a',
            color: '#fff',
            confirmButtonColor: '#2f8cff'
        });
        return;
    }

    nombreInput.classList.remove('is-invalid');

    const descripcion = document.getElementById('descripcionCategoria').value.trim() || '';
    const color = document.getElementById('colorPickerNative')?.value || '#FF5733';

    console.log('📝 Datos:', { nombre, descripcion, color, empresa: empresaActual });

    // 2. VERIFICAR SI YA EXISTE
    try {
        if (categoriaManager) {
            const coleccion = `categorias_${empresaActual.camelCase}`;
            const q = query(
                collection(db, coleccion),
                where("nombre", "==", nombre)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                Swal.fire({
                    title: 'Error',
                    text: `Ya existe una categoría con el nombre "${nombre}"`,
                    icon: 'error',
                    background: '#0a0a0a',
                    color: '#fff'
                });
                return;
            }
        }
    } catch (error) {
        console.error('Error verificando:', error);
        // Continuamos igual
    }

    // 3. MOSTRAR CONFIRMACIÓN
    const confirmacion = await Swal.fire({
        title: '¿Crear categoría?',
        html: `
            <div style="text-align: left; margin: 20px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 30px; height: 30px; background: ${color}; border-radius: 8px; margin-right: 15px;"></div>
                    <span style="font-size: 18px; font-weight: bold; color: #fff;">${nombre}</span>
                </div>
                <p style="color: #d1d5db; margin-bottom: 10px;">
                    <strong>Empresa:</strong> ${empresaActual.nombre}
                </p>
                <p style="color: #d1d5db; margin-bottom: 10px;">
                    <strong>Colección:</strong> categorias_${empresaActual.camelCase}
                </p>
                <p style="color: #d1d5db;">
                    <strong>Descripción:</strong> ${descripcion || '<span style="color: #9ca3af; font-style: italic;">Sin descripción</span>'}
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, crear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        background: '#0a0a0a',
        color: '#fff'
    });

    if (!confirmacion.isConfirmed) return;

    // 4. GUARDAR EN FIREBASE
    const btnSave = document.getElementById('btnSave');
    const originalHTML = btnSave.innerHTML;

    try {
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creando...';
        btnSave.disabled = true;

        console.log('🔥 ENVIANDO A FIRESTORE...');

        // Usar CategoriaManager si está disponible
        let nuevaCategoria;

        if (categoriaManager) {
            nuevaCategoria = await categoriaManager.crearCategoria({
                nombre: nombre,
                descripcion: descripcion,
                color: color,
                estado: 'activa'
            });
        } else {
            // Fallback: guardar directamente
            const coleccion = `categorias_${empresaActual.camelCase}`;
            const id = `${empresaActual.camelCase}_cat_${Date.now()}`;
            const docRef = doc(db, coleccion, id);

            await setDoc(docRef, {
                nombre: nombre,
                descripcion: descripcion,
                color: color,
                estado: 'activa',
                empresaId: empresaActual.camelCase,
                empresaNombre: empresaActual.nombre,
                subcategorias: [],
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            });

            nuevaCategoria = { id, nombre };
        }

        console.log('✅✅✅ CATEGORÍA CREADA:', nuevaCategoria);

        // 5. MOSTRAR ÉXITO
        await Swal.fire({
            title: '¡Categoría creada!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 64px; color: #10b981; margin-bottom: 20px;"></i>
                    <h5 style="color: #fff; margin-bottom: 10px;">${nombre}</h5>
                    <p style="color: #d1d5db; margin-bottom: 5px;">ID: ${nuevaCategoria.id}</p>
                    <p style="color: #10b981; margin-top: 15px;">Colección: categorias_${empresaActual.camelCase}</p>
                </div>
            `,
            icon: 'success',
            confirmButtonText: 'Ver categorías',
            confirmButtonColor: '#2f8cff',
            background: '#0a0a0a',
            color: '#fff'
        }).then(() => {
            window.location.href = '/users/admin/categorias/categorias.html';
        });

        // Limpiar formulario
        nombreInput.value = '';
        document.getElementById('descripcionCategoria').value = '';

    } catch (error) {
        console.error('❌ ERROR GUARDANDO:', error);

        Swal.fire({
            title: 'Error',
            text: error.message || 'No se pudo crear la categoría',
            icon: 'error',
            background: '#0a0a0a',
            color: '#fff'
        });
    } finally {
        btnSave.innerHTML = originalHTML;
        btnSave.disabled = false;
    }
}

// =============================================
// INICIAR TODO
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    console.log('📄 DOM cargado - Iniciando crearCategorias...');
    await inicializar();
});