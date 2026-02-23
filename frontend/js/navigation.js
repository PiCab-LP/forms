// Navegación entre páginas

// Botón "Next" en página 1
if (document.getElementById('btnNext')) {
    document.getElementById('btnNext').addEventListener('click', () => {
        console.log('🖱️ ===== CLICK EN NEXT - INICIANDO CAPTURA =====');
        
        // 1. Validar que al menos una red social esté llena
        if (!validateSocialNetworks()) {
            console.log('❌ Validación de redes sociales falló');
            return;
        }

        // 2. 🔥 VALIDACIONES DE ROOM DETAILS (TODOS OBLIGATORIOS)
        const cashoutLimit = document.getElementById('cashoutLimit').value;
        const minDeposit = document.getElementById('minDeposit').value;
        const scheduleOption = document.querySelector('input[name="scheduleOption"]:checked')?.value;
        const telegramPhone = document.getElementById('telegramPhone').value.trim();
        
        // 🔥 NUEVOS: Captura de horas específicas
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        // Validar que los montos no estén vacíos
        if (!cashoutLimit || !minDeposit) {
            alert("⚠️ Please enter both Cashout Limit and Minimum Deposit.");
            return;
        }

        // Validar que se haya seleccionado una opción de horario
        if (!scheduleOption) {
            alert("⚠️ Please select a cashout schedule option (24/7 or Specific).");
            return;
        }

        // 🔥 VALIDACIÓN: Si eligió horario específico, ambos relojes deben estar marcados
        if (scheduleOption === 'custom' && (!startTime || !endTime)) {
            alert("⚠️ Please select both Start and End times for your schedule.");
            return;
        }

        // Validación estricta de 10 dígitos para USA
        if (telegramPhone.length !== 10) {
            alert("⚠️ Please enter a valid 10-digit USA phone number for Telegram.");
            return;
        }
        
        console.log('✅ Todas las validaciones pasaron');
        
        // Capturar el nombre de la compañía
        let companyName = document.getElementById('companyName').textContent.trim();
        if (!companyName || companyName === 'Company Name') {
            companyName = localStorage.getItem('gameroomName') || 'Company Name';
        }
        
        localStorage.setItem('gameroomName', companyName);
        
        // 3. CAPTURA DE DATOS FINAL
        const page1Data = {
            companyName: companyName,
            facebook: document.getElementById('facebook').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
            twitter: document.getElementById('twitter').value.trim(),
            other: document.getElementById('other').value.trim(),
            cashoutLimit: cashoutLimit,
            minDeposit: minDeposit,
            scheduleOption: scheduleOption,
            // 🔥 GUARDADO: Unimos las horas en un formato legible para el admin
            customSchedule: scheduleOption === 'custom' ? `${startTime} to ${endTime}` : '24/7',
            telegramPhone: telegramPhone
        };
        
        console.log('📦 OBJETO COMPLETO page1Data:', JSON.stringify(page1Data, null, 2));
        
        formManager.savePageData(1, page1Data);
        
        // Ir a página 2
        const editToken = localStorage.getItem('editToken');
        const nextPage = editToken ? `page2?token=${editToken}` : 'page2';
        
        console.log('🚀 Navegando a:', nextPage);
        window.location.href = nextPage;
    });
}

// Botón "Back" en página 2
if (document.getElementById('btnBack')) {
    document.getElementById('btnBack').addEventListener('click', () => {
        const page2Data = getFormDataPage2();
        formManager.savePageData(2, page2Data);
        const editToken = localStorage.getItem('editToken');
        const prevPage = editToken ? `/?token=${editToken}` : '/';
        window.location.href = prevPage;
    });
}

// Función para recolectar datos de managers (página 2)
function getFormDataPage2() {
    const managers = [];
    const managerBlocks = document.querySelectorAll('.manager-block');
    
    managerBlocks.forEach((block, index) => {
        const managerNum = index + 1;
        managers.push({
            username: document.getElementById(`username_${managerNum}`).value.trim(),
            fullname: document.getElementById(`fullname_${managerNum}`).value.trim(),
            role: document.getElementById(`role_${managerNum}`).value,
            email: document.getElementById(`email_${managerNum}`).value.trim(),
            password: document.getElementById(`password_${managerNum}`).value
        });
    });
    return { managers };
}

// Cargar datos guardados al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.includes('page2') ? 2 : 1;
    const urlParams = new URLSearchParams(window.location.search);
    const hasEditToken = urlParams.get('token');
    
    if (currentPage === 1) {
        if (hasEditToken) return; 
        
        const savedData = formManager.loadPageData(1);
        
        const companyNameEl = document.getElementById('companyName');
        if (companyNameEl && savedData.companyName) companyNameEl.textContent = savedData.companyName;
        
        if (document.getElementById('facebook')) document.getElementById('facebook').value = savedData.facebook || '';
        if (document.getElementById('instagram')) document.getElementById('instagram').value = savedData.instagram || '';
        if (document.getElementById('twitter')) document.getElementById('twitter').value = savedData.twitter || '';
        if (document.getElementById('other')) document.getElementById('other').value = savedData.other || '';

        if (savedData.cashoutLimit) document.getElementById('cashoutLimit').value = savedData.cashoutLimit;
        if (savedData.minDeposit) document.getElementById('minDeposit').value = savedData.minDeposit;
        
        if (savedData.telegramPhone) {
            document.getElementById('telegramPhone').value = savedData.telegramPhone;
            const countEl = document.getElementById('phoneCount');
            if (countEl) countEl.textContent = savedData.telegramPhone.length;
        }
        
        if (savedData.scheduleOption) {
            const radio = document.querySelector(`input[name="scheduleOption"][value="${savedData.scheduleOption}"]`);
            if (radio) {
                radio.checked = true;
                if (savedData.scheduleOption === 'custom') {
                    const rangeDiv = document.getElementById('scheduleTimeRange');
                    if (rangeDiv) rangeDiv.style.display = 'block';
                    
                    // 🔥 RELLENADO: Separamos el string guardado para llenar los dos relojes
                    if (savedData.customSchedule && savedData.customSchedule.includes(' to ')) {
                        const parts = savedData.customSchedule.split(' to ');
                        document.getElementById('startTime').value = parts[0];
                        document.getElementById('endTime').value = parts[1];
                    }
                }
            }
        }
    }
    
    if (currentPage === 2) {
        const savedData = formManager.loadPageData(2);
        if (savedData.managers && savedData.managers.length > 0) {
            const container = document.getElementById('managersContainer');
            if (container) {
                container.innerHTML = '';
                savedData.managers.forEach((manager, index) => {
                    addManagerBlock(index + 1, manager);
                });
            }
            updateAddManagerButton();
        }
        setupAddManagerButton();
    }
});

// --- FUNCIONES DE MANAGERS (SIN CAMBIOS) ---

function setupAddManagerButton() {
    const btnAddManager = document.getElementById('btnAddManager');
    if (btnAddManager) {
        btnAddManager.addEventListener('click', () => {
            const currentManagers = document.querySelectorAll('.manager-block').length;
            if (currentManagers >= 5) return alert('Maximum 5 managers allowed');
            addManagerBlock(currentManagers + 1);
            updateAddManagerButton();
        });
    }
}

function addManagerBlock(managerNum, data = null) {
    const container = document.getElementById('managersContainer');
    if (!container) return;
    const managerBlock = document.createElement('div');
    managerBlock.className = 'manager-block';
    managerBlock.setAttribute('data-manager', managerNum);
    managerBlock.innerHTML = `
        <h3>Manager #${managerNum}</h3>
        ${managerNum > 1 ? '<button type="button" class="btn-remove-manager" onclick="removeManager(this)">✕ Remove</button>' : ''}
        <div class="form-group"><label for="username_${managerNum}">Username *</label><input type="text" id="username_${managerNum}" value="${data?.username || ''}" required></div>
        <div class="form-group"><label for="fullname_${managerNum}">Full Name *</label><input type="text" id="fullname_${managerNum}" value="${data?.fullname || ''}" required></div>
        <div class="form-group">
            <label for="role_${managerNum}">Role *</label>
            <select id="role_${managerNum}" required>
                <option value="">Select a role...</option>
                <option value="Admin" ${data?.role === 'Admin' ? 'selected' : ''}>Admin</option>
                <option value="Supervisor" ${data?.role === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
                <option value="Observer" ${data?.role === 'Observer' ? 'selected' : ''}>Observer</option>
            </select>
        </div>
        <div class="form-group"><label for="email_${managerNum}">Email *</label><input type="email" id="email_${managerNum}" value="${data?.email || ''}" required></div>
        <div class="form-group">
            <label for="password_${managerNum}">Password *</label>
            <div style="position: relative;">
                <input type="password" id="password_${managerNum}" value="${data?.password || ''}" required style="padding-right: 45px;">
                <button type="button" onclick="togglePassword(${managerNum})" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">👁️</button>
            </div>
        </div>`;
    container.appendChild(managerBlock);
}

function removeManager(button) {
    button.closest('.manager-block').remove();
    const managers = document.querySelectorAll('.manager-block');
    managers.forEach((block, index) => {
        const newNum = index + 1;
        block.setAttribute('data-manager', newNum);
        block.querySelector('h3').textContent = `Manager #${newNum}`;
    });
    updateAddManagerButton();
}

function updateAddManagerButton() {
    const btnAddManager = document.getElementById('btnAddManager');
    if (!btnAddManager) return;
    const count = document.querySelectorAll('.manager-block').length;
    btnAddManager.disabled = count >= 5;
    btnAddManager.textContent = count >= 5 ? '✓ Maximum reached' : '+ I want another backend account';
}

function togglePassword(num) {
    const input = document.getElementById(`password_${num}`);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
}