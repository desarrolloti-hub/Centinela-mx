// Toggle para mostrar/ocultar contraseña
document.getElementById('passwordToggle').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Toggle para mostrar/ocultar confirmación de contraseña
document.getElementById('confirmPasswordToggle').addEventListener('click', function () {
    const passwordInput = document.getElementById('confirmPassword');
    const icon = this.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Validación del formulario de registro
document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Obtener valores
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    // Validar campos vacíos
    if (fullName === '' || email === '' || password === '' || confirmPassword === '') {
        alert('Por favor, completa todos los campos');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Por favor, ingresa un correo electrónico válido');
        return;
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    // Simular envío exitoso
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Mostrar estado de carga
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> REGISTRANDO...';
    submitBtn.disabled = true;
    
    // Simular delay de red
    setTimeout(() => {
        alert('✅ Registro exitoso. Serás redirigido al inicio de sesión.');
        
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Redirigir a login después de 1 segundo
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }, 1500);
});

// Validación en tiempo real para confirmar contraseña
document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const confirmInput = this;
    
    if (confirmPassword !== '' && password !== '') {
        if (password !== confirmPassword) {
            confirmInput.style.borderColor = '#dc3545';
            confirmInput.style.boxShadow = '0 0 0 2px rgba(220, 53, 69, 0.2)';
        } else {
            confirmInput.style.borderColor = '#2e8b57';
            confirmInput.style.boxShadow = '0 0 0 2px rgba(46, 139, 87, 0.2)';
        }
    } else {
        confirmInput.style.borderColor = 'rgba(192, 192, 192, 0.2)';
        confirmInput.style.boxShadow = 'none';
    }
});

// Efecto de carga para la página
window.addEventListener('DOMContentLoaded', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});