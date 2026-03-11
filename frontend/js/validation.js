// Validar URL
function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Sistema de notificaciones Toast dinámico
function showToast(message, type = 'error') {
    // Buscar si ya existe el contenedor de toasts
    let toastContainer = document.getElementById('toastDisplay');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastDisplay';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Crear el toast individual
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? '#ffeeee' : '#e0ffe4';
    const borderColor = type === 'error' ? '#ffcdd2' : '#c8e6c9';
    const icon = type === 'error' ? '⚠️' : '✅';
    const textColor = type === 'error' ? '#c62828' : '#2e7d32';

    toast.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        border: 1px solid ${borderColor};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    toast.innerHTML = `<span style="font-size: 18px;">${icon}</span> ${message}`;

    toastContainer.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Animar salida y remover
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Función auxiliar global para mostrar toast de error y enfocar elemento
function showError(message, elementId) {
    showToast(message, 'error');
    const element = document.getElementById(elementId);
    if (element) {
        // Scroll suave hacia la sección del input
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Efecto visual de resaltado
        element.style.transition = 'box-shadow 0.3s';
        element.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.3)';
        setTimeout(() => element.style.boxShadow = 'none', 2000);
    }
    return false;
}

// Validar que al menos una red social esté llena Y sea una URL válida
function validateSocialNetworks() {
    const facebook = document.getElementById('facebook').value.trim();
    const instagram = document.getElementById('instagram').value.trim();
    const twitter = document.getElementById('twitter').value.trim();
    const other = document.getElementById('other').value.trim();
    
    // Verificar que al menos una esté llena
    if (!facebook && !instagram && !twitter && !other) {
        return showError('Please complete at least one social network to continue.', 'facebook');
    }
    
    // Validar que las que estén llenas sean URLs válidas
    if (facebook && !isValidURL(facebook)) {
        return showError('Facebook must be a valid URL (e.g., https://facebook.com/yourpage)', 'facebook');
    }
    
    if (instagram && !isValidURL(instagram)) {
        return showError('Instagram must be a valid URL (e.g., https://instagram.com/yourpage)', 'instagram');
    }
    
    if (twitter && !isValidURL(twitter)) {
        return showError('X (Twitter) must be a valid URL (e.g., https://x.com/yourpage)', 'twitter');
    }
    
    if (other && !isValidURL(other)) {
        return showError('Other must be a valid URL (e.g., https://yourwebsite.com)', 'other');
    }
    
    return true;
}

// Validar password (mínimo 8 caracteres, 1 número, 1 caracter especial)
function validatePassword(password) {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    
    if (!/\d/.test(password)) {
        return 'Password must contain at least 1 number';
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return 'Password must contain at least 1 special character';
    }
    
    return null; // Valid
}

// Validar username (mínimo 3 caracteres)
function validateUsername(username) {
    if (username.length < 3) {
        return 'Username must be at least 3 characters long';
    }
    return null; // Valid
}

// Validar email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }
    return null; // Valid
}


// Validar todos los managers
// Validar todos los managers
function validateManagers() {
    const managers = document.querySelectorAll('.manager-block');
    let isValid = true;
    let errorMessage = '';
    
    managers.forEach((block, index) => {
        const managerNum = index + 1;
        const username = document.getElementById(`username_${managerNum}`).value;
        const email = document.getElementById(`email_${managerNum}`).value;
        const password = document.getElementById(`password_${managerNum}`).value;
        
        // Validar username
        const usernameError = validateUsername(username);
        if (usernameError) {
            isValid = false;
            errorMessage = `Manager #${managerNum}: ${usernameError}`;
            return; // Salir del loop
        }
        
        // Validar email
        const emailError = validateEmail(email);
        if (emailError) {
            isValid = false;
            errorMessage = `Manager #${managerNum}: ${emailError}`;
            return; // Salir del loop
        }
        
        // Validar password
        const passwordError = validatePassword(password);
        if (passwordError) {
            isValid = false;
            errorMessage = `Manager #${managerNum}: ${passwordError}`;
            return; // Salir del loop
        }
    });
    
    if (!isValid) {
        const errorDiv = document.getElementById('managerError');
        errorDiv.textContent = '⚠️ ' + errorMessage;
        errorDiv.style.display = 'block';
        return false;
    }
    
    document.getElementById('managerError').style.display = 'none';
    return true;
}


// Agregar validación en tiempo real a todos los campos de managers
if (document.getElementById('formPage2')) {
    document.addEventListener('input', (e) => {
        // Validar password
        if (e.target.type === 'password' || (e.target.type === 'text' && e.target.id.includes('password_'))) {
            const error = validatePassword(e.target.value);
            let helpText = e.target.parentElement.parentElement.querySelector('.input-help');
            
            // Si el input está dentro de un div con position relative (por el botón de mostrar/ocultar)
            if (!helpText) {
                helpText = e.target.closest('.form-group').querySelector('.input-help');
            }
            
            if (helpText) {
                if (error && e.target.value.length > 0) {
                    helpText.style.color = '#dc3545';
                    helpText.textContent = error;
                    helpText.classList.add('error');
                    helpText.classList.remove('success');
                } else if (e.target.value.length > 0) {
                    helpText.style.color = '#28a745';
                    helpText.textContent = '✓ Password is valid';
                    helpText.classList.add('success');
                    helpText.classList.remove('error');
                } else {
                    helpText.style.color = '#999';
                    helpText.textContent = 'Min. 8 characters, 1 number, 1 special character';
                    helpText.classList.remove('error', 'success');
                }
            }
        }
        
        // Validar username
        if (e.target.id && e.target.id.startsWith('username_')) {
            const error = validateUsername(e.target.value);
            let helpText = e.target.nextElementSibling;
            
            if (!helpText || !helpText.classList.contains('input-help')) {
                helpText = document.createElement('small');
                helpText.className = 'input-help';
                e.target.parentElement.appendChild(helpText);
            }
            
            if (error && e.target.value.length > 0) {
                helpText.style.color = '#dc3545';
                helpText.textContent = error;
            } else if (e.target.value.length > 0) {
                helpText.style.color = '#28a745';
                helpText.textContent = '✓ Valid username';
            } else {
                helpText.style.color = '#999';
                helpText.textContent = 'Min. 3 characters';
            }
        }
        
        // Validar email
        if (e.target.type === 'email' && e.target.id && e.target.id.startsWith('email_')) {
            const error = validateEmail(e.target.value);
            let helpText = e.target.nextElementSibling;
            
            if (!helpText || !helpText.classList.contains('input-help')) {
                helpText = document.createElement('small');
                helpText.className = 'input-help';
                e.target.parentElement.appendChild(helpText);
            }
            
            if (error && e.target.value.length > 0) {
                helpText.style.color = '#dc3545';
                helpText.textContent = error;
            } else if (e.target.value.length > 0) {
                helpText.style.color = '#28a745';
                helpText.textContent = '✓ Valid email';
            } else {
                helpText.textContent = '';
            }
        }
    });
}


// Validación en tiempo real para URLs en página 1
if (document.getElementById('formPage1')) {
    const urlInputs = ['facebook', 'instagram', 'twitter', 'other'];
    
    urlInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        
        input.addEventListener('blur', function() {
            const value = this.value.trim();
            
            if (value && !isValidURL(value)) {
                this.style.borderColor = '#dc3545';
                
                // Agregar mensaje de error si no existe
                let errorMsg = this.parentElement.querySelector('.url-error');
                if (!errorMsg) {
                    errorMsg = document.createElement('small');
                    errorMsg.className = 'url-error';
                    errorMsg.style.color = '#dc3545';
                    errorMsg.style.fontSize = '12px';
                    errorMsg.style.display = 'block';
                    errorMsg.style.marginTop = '5px';
                    this.parentElement.appendChild(errorMsg);
                }
                errorMsg.textContent = 'Please enter a valid URL starting with http:// or https://';
            } else {
                this.style.borderColor = '#e0e0e0';
                
                // Remover mensaje de error si existe
                const errorMsg = this.parentElement.querySelector('.url-error');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
        
        // Limpiar error al escribir
        input.addEventListener('input', function() {
            this.style.borderColor = '#e0e0e0';
            const errorMsg = this.parentElement.querySelector('.url-error');
            if (errorMsg) {
                errorMsg.remove();
            }
        });
    });
}
