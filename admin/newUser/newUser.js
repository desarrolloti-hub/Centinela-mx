        // Elementos DOM
                const usuarioInput = document.getElementById('fotoUsuario');
                const usuarioButton = document.getElementById('usuarioButton');
                const usuarioFileName = document.getElementById('usuarioFileName');
                const usuarioGroup = document.getElementById('usuarioGroup');
                
                // Configurar eventos para el botón personalizado
                usuarioButton.addEventListener('click', () => usuarioInput.click());
                
                // Eventos para input de archivo
                usuarioInput.addEventListener('change', function() {
                    handleFileSelect(this, 'usuario');
                });
                
                // Función para manejar la selección de archivos
                function handleFileSelect(input, type) {
                    const file = input.files[0];
                    const preview = document.getElementById(`preview${type.charAt(0).toUpperCase() + type.slice(1)}`);
                    const previewContainer = document.getElementById(`previewContainer${type.charAt(0).toUpperCase() + type.slice(1)}`);
                    const fileNameDisplay = document.getElementById(`${type}FileName`);
                    const sizeDisplay = document.getElementById(`${type}Size`);
                    const dimensionsDisplay = document.getElementById(`${type}Dimensions`);
                    const button = document.getElementById(`${type}Button`);
                    
                    if (file) {
                        // Mostrar nombre del archivo
                        fileNameDisplay.textContent = file.name;
                        fileNameDisplay.classList.remove('empty');
                        
                        // Mostrar tamaño del archivo
                        const fileSize = (file.size / 1024).toFixed(2);
                        sizeDisplay.textContent = `Tamaño: ${fileSize} KB`;
                        
                        // Crear vista previa de la imagen
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            preview.src = e.target.result;
                            
                            // Obtener dimensiones de la imagen
                            const img = new Image();
                            img.onload = function() {
                                dimensionsDisplay.textContent = `Dimensiones: ${img.width}×${img.height}px`;
                            };
                            img.src = e.target.result;
                        };
                        
                        reader.readAsDataURL(file);
                        
                        // Cambiar estilo del botón a "cargado"
                        button.innerHTML = '<i class="fas fa-check"></i> CAMBIAR';
                        button.classList.add('loaded');
                        
                        // Mostrar preview inmediatamente
                        previewContainer.classList.add('show');
                        
                        // Ocultar preview después de 5 segundos
                        setTimeout(() => {
                            if (previewContainer.classList.contains('show')) {
                                previewContainer.classList.remove('show');
                            }
                        }, 5000);
                    } else {
                        // Resetear el botón si no hay archivo
                        button.innerHTML = '<i class="fas fa-folder-open"></i> EXAMINAR';
                        button.classList.remove('loaded');
                    }
                }
                
                // Función para cerrar la vista previa
                function closePreview(type) {
                    const previewContainer = document.getElementById(`previewContainer${type.charAt(0).toUpperCase() + type.slice(1)}`);
                    previewContainer.classList.remove('show');
                }
                
                // Mostrar preview al pasar el mouse sobre el campo
                usuarioGroup.addEventListener('mouseenter', function() {
                    const previewContainer = document.getElementById('previewContainerUsuario');
                    if (usuarioInput.files.length > 0) {
                        previewContainer.classList.add('show');
                    }
                });
                
                usuarioGroup.addEventListener('mouseleave', function() {
                    const previewContainer = document.getElementById('previewContainerUsuario');
                    previewContainer.classList.remove('show');
                });
                
                // Validación del formulario
                document.getElementById('registerForm').addEventListener('submit', function(e) {
                    const nombreCompleto = document.getElementById('nombreCompleto').value;
                    const correoElectronico = document.getElementById('correoElectronico').value;
                    const fotoUsuario = document.getElementById('fotoUsuario').files[0];
                    
                    // Validar que los campos requeridos estén completos
                    if (!nombreCompleto.trim()) {
                        alert('Por favor, ingresa tu nombre completo');
                        e.preventDefault();
                        return;
                    }
                    
                    if (!correoElectronico.trim()) {
                        alert('Por favor, ingresa tu correo electrónico');
                        e.preventDefault();
                        return;
                    }
                    
                    // Validar formato de correo
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(correoElectronico)) {
                        alert('Por favor, ingresa un correo electrónico válido');
                        e.preventDefault();
                        return;
                    }
                    
                    // Validar que se haya subido la imagen
                    if (!fotoUsuario) {
                        alert('Por favor, selecciona una foto de perfil');
                        e.preventDefault();
                        return;
                    }
                    
                    // Validar tipos de archivo (solo imágenes)
                    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                    
                    if (!validImageTypes.includes(fotoUsuario.type)) {
                        alert('La foto de perfil debe ser una imagen (JPEG, PNG, GIF o WebP)');
                        e.preventDefault();
                        return;
                    }
                    
                    // Validar tamaño de archivo (máximo 5MB)
                    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
                    
                    if (fotoUsuario.size > maxSize) {
                        alert('La foto de perfil es demasiado grande. Máximo 5MB');
                        e.preventDefault();
                        return;
                    }
                    
                    // Si todo está bien, mostrar mensaje de éxito
                    alert('Formulario enviado correctamente. Los datos están listos para registrar.');
                    
                    // Aquí normalmente enviarías el formulario
                    // e.preventDefault(); // Quitar esto en producción
                });