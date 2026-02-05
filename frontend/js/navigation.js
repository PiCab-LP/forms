// Navegación entre páginas

// Botón "Next" en página 1
if (document.getElementById('btnNext')) {
    document.getElementById('btnNext').addEventListener('click', () => {
        // Validar que al menos una red social esté llena
        if (!validateSocialNetworks()) {
            return;
        }
        
        // Capturar el nombre de la compañía (puede ser editado o el del localStorage)
        let companyName = document.getElementById('companyName').textContent.trim();
        
        // Si está vacío o es el placeholder, usar el del localStorage
        if (!companyName || companyName === 'Company Name') {
            companyName = localStorage.getItem('gameroomName') || 'Company Name';
        }
        
        // Actualizar localStorage con el nombre final
        localStorage.setItem('gameroomName', companyName);
        
        // Guardar datos de página 1
        const page1Data = {
            companyName: companyName,
            facebook: document.getElementById('facebook').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
            twitter: document.getElementById('twitter').value.trim(),
            other: document.getElementById('other').value.trim()
        };
        
        formManager.savePageData(1, page1Data);
        
        // Ir a página 2
        const editToken = localStorage.getItem('editToken');
        const nextPage = editToken 
            ? `page2.html?token=${editToken}` 
            : 'page2.html';
        window.location.href = nextPage;
    });
}

// Botón "Back" en página 2
if (document.getElementById('btnBack')) {
    document.getElementById('btnBack').addEventListener('click', () => {
        // Guardar datos actuales de página 2 antes de retroceder
        const page2Data = getFormDataPage2();
        formManager.savePageData(2, page2Data);
        
        // Volver a página 1
        const editToken = localStorage.getItem('editToken');
        const prevPage = editToken 
            ? `index.html?token=${editToken}` 
            : 'index.html';
        window.location.href = prevPage;
    });
}

// Función para recolectar datos de managers (página 2)
function getFormDataPage2() {
    const managers = [];
    const managerBlocks = document.querySelectorAll('.manager-block');
    
    managerBlocks.forEach((block, index) => {
        const managerNum = index + 1;
        
        const manager = {
            username: document.getElementById(`username_${managerNum}`).value.trim(),
            fullname: document.getElementById(`fullname_${managerNum}`).value.trim(),
            role: document.getElementById(`role_${managerNum}`).value,
            email: document.getElementById(`email_${managerNum}`).value.trim(),
            password: document.getElementById(`password_${managerNum}`).value
        };
        
        managers.push(manager);
    });
    
    return { managers };
}

// Cargar datos guardados al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.includes('page2') ? 2 : 1;
    
    if (currentPage === 1) {
        // Cargar datos de página 1
        const savedData = formManager.loadPageData(1);
        
        if (savedData.companyName) {
            document.getElementById('companyName').textContent = savedData.companyName;
        }
        if (savedData.facebook) {
            document.getElementById('facebook').value = savedData.facebook;
        }
        if (savedData.instagram) {
            document.getElementById('instagram').value = savedData.instagram;
        }
        if (savedData.twitter) {
            document.getElementById('twitter').value = savedData.twitter;
        }
        if (savedData.other) {
            document.getElementById('other').value = savedData.other;
        }
    }
    
    if (currentPage === 2) {
        // Cargar datos de página 2 si existen
        const savedData = formManager.loadPageData(2);
        
        if (savedData.managers && savedData.managers.length > 0) {
            // Si hay managers guardados, cargarlos
            const container = document.getElementById('managersContainer');
            container.innerHTML = '';
            
            savedData.managers.forEach((manager, index) => {
                addManagerBlock(index + 1, manager);
            });
            
            updateAddManagerButton();
        }
        
        // Configurar botón para agregar managers
        setupAddManagerButton();
    }
});

// Configurar funcionalidad de agregar managers
function setupAddManagerButton() {
    const btnAddManager = document.getElementById('btnAddManager');
    
    if (btnAddManager) {
        btnAddManager.addEventListener('click', () => {
            const currentManagers = document.querySelectorAll('.manager-block').length;
            
            if (currentManagers >= 5) {
                alert('Maximum 5 managers allowed');
                return;
            }
            
            addManagerBlock(currentManagers + 1);
            updateAddManagerButton();
        });
    }
}

// Agregar bloque de manager
function addManagerBlock(managerNum, data = null) {
    const container = document.getElementById('managersContainer');
    
    const managerBlock = document.createElement('div');
    managerBlock.className = 'manager-block';
    managerBlock.setAttribute('data-manager', managerNum);
    
    managerBlock.innerHTML = `
        <h3>Manager #${managerNum}</h3>
        ${managerNum > 1 ? '<button type="button" class="btn-remove-manager" onclick="removeManager(this)">✕ Remove</button>' : ''}
        
        <div class="form-group">
            <label for="username_${managerNum}">Username *</label>
            <input type="text" id="username_${managerNum}" name="username_${managerNum}" value="${data?.username || ''}" required>
        </div>
        
        <div class="form-group">
            <label for="fullname_${managerNum}">Full Name *</label>
            <input type="text" id="fullname_${managerNum}" name="fullname_${managerNum}" value="${data?.fullname || ''}" required>
        </div>
        
        <div class="form-group">
            <label for="role_${managerNum}">Role *</label>
            <select id="role_${managerNum}" name="role_${managerNum}" required>
                <option value="">Select a role...</option>
                <option value="Admin" ${data?.role === 'Admin' ? 'selected' : ''}>Admin</option>
                <option value="Supervisor" ${data?.role === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
                <option value="Observer" ${data?.role === 'Observer' ? 'selected' : ''}>Observer</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="email_${managerNum}">Email *</label>
            <input type="email" id="email_${managerNum}" name="email_${managerNum}" value="${data?.email || ''}" required>
        </div>
        
        <div class="form-group">
            <label for="password_${managerNum}">Password *</label>
            <div style="position: relative;">
                <input type="password" id="password_${managerNum}" name="password_${managerNum}" value="${data?.password || ''}" required style="padding-right: 45px;">
                <button type="button" class="btn-toggle-password" onclick="togglePassword(${managerNum})" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 18px;">
                    👁️
                </button>
            </div>
            <small class="input-help">Min. 8 characters, 1 number, 1 special character</small>
        </div>
    `;
    
    container.appendChild(managerBlock);
}

// Remover manager
function removeManager(button) {
    const managerBlock = button.closest('.manager-block');
    managerBlock.remove();
    
    // Renumerar managers
    const managers = document.querySelectorAll('.manager-block');
    managers.forEach((block, index) => {
        const newNum = index + 1;
        block.setAttribute('data-manager', newNum);
        block.querySelector('h3').textContent = `Manager #${newNum}`;
        
        // Actualizar IDs y names
        const inputs = block.querySelectorAll('input, select');
        inputs.forEach(input => {
            const baseName = input.id.split('_')[0];
            input.id = `${baseName}_${newNum}`;
            input.name = `${baseName}_${newNum}`;
        });
        
        // Actualizar labels
        const labels = block.querySelectorAll('label');
        labels.forEach(label => {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
                const baseName = forAttr.split('_')[0];
                label.setAttribute('for', `${baseName}_${newNum}`);
            }
        });
    });
    
    updateAddManagerButton();
}

// Actualizar estado del botón de agregar managers
function updateAddManagerButton() {
    const btnAddManager = document.getElementById('btnAddManager');
    const currentManagers = document.querySelectorAll('.manager-block').length;
    
    if (currentManagers >= 5) {
        btnAddManager.disabled = true;
        btnAddManager.textContent = '✓ Maximum managers reached (5)';
    } else {
        btnAddManager.disabled = false;
        btnAddManager.textContent = '+ I want another backend account';
    }
}

// Mostrar/ocultar password
function togglePassword(managerNum) {
    const passwordInput = document.getElementById(`password_${managerNum}`);
    const toggleBtn = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}
