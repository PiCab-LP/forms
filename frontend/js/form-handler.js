// Configuración del API
const API_URL = 'https://forms-wliu.onrender.com/api/form';

class FormDataManager {
    constructor() {
        this.storageKey = 'formData';
    }
   
    savePageData(page, data) {
        let allData = this.getAllData();
        allData[`page${page}`] = data;
        console.log(`📦 GUARDANDO page${page} en localStorage:`, data);
        localStorage.setItem(this.storageKey, JSON.stringify(allData));
    }
   
    getAllData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }
   
    clearData() {
        // Limpiamos todo el rastro de la sesión actual
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('editToken');
        localStorage.removeItem('gameroomName');
        localStorage.removeItem('logoOption');
        localStorage.removeItem('designReferenceText');
        console.log("🧹 LocalStorage limpiado.");
    }
}

const formManager = new FormDataManager();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado, inicializando...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const editToken = urlParams.get('token');
    
    // Identificar página actual para lógica de carga
    const isWelcome = !window.location.pathname.includes('page2') && !window.location.pathname.includes('index');
    const isPage2 = window.location.pathname.includes('page2');

    if (editToken) {
        // 🛡️ REGLA DE ORO: Si hay token en URL, priorizamos los datos del servidor
        // Solo limpiamos si es la primera vez que entramos con este token (evita limpiar al navegar a page2)
        if (isWelcome && localStorage.getItem('editToken') !== editToken) {
            formManager.clearData();
        }
        
        localStorage.setItem('editToken', editToken);
        
        if (isWelcome) {
            await loadExistingFormData(editToken);
        } else {
            showEditMode();
            const savedData = formManager.getAllData();
            if (Object.keys(savedData).length > 0) fillFormFields(savedData);
        }
    }

    // Manejador para el formulario de la Página 2 (Managers)
    const formPage2 = document.getElementById('formPage2');
    if (formPage2) {
        formPage2.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (typeof validateManagers === 'function' && !validateManagers()) return;
            
            // 1. Capturar datos de managers
            const page2Data = getFormDataPage2();
            formManager.savePageData(2, page2Data);
            
            // 2. Construir objeto final unificado
            const allFormData = formManager.getAllData();
            
            // 3. Inyectar datos persistentes de la Página 1 (Welcome) recuperados de localStorage
            if (!allFormData.page1) allFormData.page1 = {};
            allFormData.page1.companyName = localStorage.getItem('gameroomName');
            allFormData.page1.logoOption = localStorage.getItem('logoOption');
            allFormData.page1.designReferenceText = localStorage.getItem('designReferenceText');

            const token = localStorage.getItem('editToken');
            
            // 4. Disparar el envío híbrido
            await submitForm(allFormData, token);
        });
    }
});

// FUNCIÓN DE ENVÍO HÍBRIDO (Texto + Archivos)
async function submitForm(formData, editToken = null) {
    try {
        const endpoint = editToken ? '/update' : '/submit';
        const dataToSend = new FormData();

        // Estructura para el backend
        const payload = { 
            formData: formData, 
            token: editToken 
        };

        // Adjuntar JSON (Como string en el campo 'data')
        dataToSend.append('data', JSON.stringify(payload));

        // Adjuntar archivos solo si existen en el DOM (esto suele pasar en la misma página del submit o vía caché de archivos)
        const logoInput = document.getElementById('logoFiles');
        if (logoInput && logoInput.files.length > 0) {
            Array.from(logoInput.files).slice(0, 3).forEach(file => {
                dataToSend.append('logoFiles', file);
            });
        }

        const refInput = document.getElementById('referenceFiles');
        if (refInput && refInput.files.length > 0) {
            Array.from(refInput.files).slice(0, 5).forEach(file => {
                dataToSend.append('referenceFiles', file);
            });
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            body: dataToSend
        });

        const result = await response.json();

        if (result.success) {
            showSuccessModal(result.token, result.editLink, formData);
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error submitting form:', error);
        alert('Error submitting form. Please check your internet connection.');
    }
}

async function loadExistingFormData(token) {
    try {
        const response = await fetch(`${API_URL}/get/${token}`);
        const data = await response.json();
        
        if (data.success) {
            // No limpiamos aquí porque ya lo hicimos arriba si era necesario
            localStorage.setItem('formData', JSON.stringify(data.formData));
            
            // Persistir datos de identidad visual para que Welcome y el submit final los usen
            if (data.formData.page1) {
                localStorage.setItem('gameroomName', data.formData.page1.companyName || '');
                localStorage.setItem('logoOption', data.formData.page1.logoOption || '');
                localStorage.setItem('designReferenceText', data.formData.page1.designReferenceText || '');
            }
            
            fillFormFields(data.formData);
            showEditMode();
        }
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
    }
}

function fillFormFields(data) {
    const isPage2 = window.location.pathname.includes('page2');
    const isIndex = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
    const isWelcome = !isPage2 && !isIndex;

    const page1Data = data.page1 || {};
    const page2Data = data.page2 || {};

    if (isWelcome) {
        const grInput = document.getElementById('gameroomName');
        if (grInput) grInput.value = page1Data.companyName || '';
        
        if (page1Data.logoOption) {
            const radio = document.querySelector(`input[name="logoOption"][value="${page1Data.logoOption}"]`);
            if (radio) {
                radio.checked = true;
                if (typeof toggleSelection === 'function') toggleSelection(page1Data.logoOption);
            }
        }
        
        const designText = document.getElementById('designReferenceText');
        if (designText) designText.value = page1Data.designReferenceText || '';
    }

    if (isIndex) {
        const companyLabel = document.getElementById('companyNameDisplay'); // Asegúrate de tener este ID en el HTML
        if (companyLabel) companyLabel.textContent = page1Data.companyName || 'N/A';

        ['facebook', 'instagram', 'twitter', 'other'].forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = page1Data[field] || '';
        });
    }

    if (isPage2) {
        const container = document.getElementById('managersContainer');
        if (container && page2Data.managers) {
            // Llenar el primer manager (que siempre existe)
            fillManagerFields(1, page2Data.managers[0]);
            
            // Crear bloques y llenar para el resto
            for (let i = 1; i < page2Data.managers.length; i++) {
                if (typeof addManagerBlock === 'function') {
                    addManagerBlock(i + 1, page2Data.managers[i]);
                }
            }
        }
    }
}

function fillManagerFields(managerNum, data) {
    if (!data) return;
    ['username', 'fullname', 'role', 'email', 'password'].forEach(field => {
        const el = document.getElementById(`${field}_${managerNum}`);
        if (el) el.value = data[field] || '';
    });
}

function getFormDataPage2() {
    const managers = [];
    document.querySelectorAll('.manager-block').forEach((block, index) => {
        const i = index + 1;
        managers.push({
            username: document.getElementById(`username_${i}`).value.trim(),
            fullname: document.getElementById(`fullname_${i}`).value.trim(),
            role: document.getElementById(`role_${i}`).value,
            email: document.getElementById(`email_${i}`).value.trim(),
            password: document.getElementById(`password_${i}`).value
        });
    });
    return { managers };
}

function showSuccessModal(token, editLink, formData) {
    const modal = document.getElementById('modalConfirmacion');
    const editLinkInput = document.getElementById('editLink');
    if (!modal || !editLinkInput) return;

    editLinkInput.value = editLink;
    modal.classList.remove('hidden');

    document.getElementById('copyLink')?.addEventListener('click', () => {
        editLinkInput.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    });

    document.getElementById('downloadPDF')?.addEventListener('click', () => {
        if (typeof generatePDF === 'function') generatePDF(formData);
    });

    document.getElementById('closeModal')?.addEventListener('click', () => {
        formManager.clearData(); // Limpieza final al terminar con éxito
        window.location.href = 'welcome.html';
    });
}

function showEditMode() {
    const container = document.querySelector('.form-container');
    if (!container || document.querySelector('.edit-mode-banner')) return;
    const banner = document.createElement('div');
    banner.className = 'edit-mode-banner';
    banner.style.cssText = 'background: #ffc107; color: #000; padding: 10px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 5px;';
    banner.textContent = '📝 Edit Mode - Modifying existing form';
    container.prepend(banner);
}