// Configuración del API
const API_URL = 'https://forms-wliu.onrender.com/api/form';

// Almacenamiento temporal de datos entre páginas
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
        localStorage.removeItem(this.storageKey);
    }
   
    loadPageData(page) {
        const allData = this.getAllData();
        return allData[`page${page}`] || {};
    }
}

const formManager = new FormDataManager();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado, inicializando...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const editToken = urlParams.get('token');
    
    if (editToken) {
        const isPage2 = window.location.pathname.includes('page2');
        if (!isPage2) {
            await loadExistingFormData(editToken);
        } else {
            localStorage.setItem('editToken', editToken);
            const savedData = formManager.getAllData();
            if (savedData.page2) {
                fillFormFields(savedData);
            }
            showEditMode();
        }
    }

    const formPage2 = document.getElementById('formPage2');
    if (formPage2) {
        formPage2.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (typeof validateManagers === 'function' && !validateManagers()) return;
            
            const page2Data = getFormDataPage2();
            formManager.savePageData(2, page2Data);
            
            const allFormData = formManager.getAllData();
            const editToken = localStorage.getItem('editToken');
            
            // 🔥 CAMBIO CLAVE: Enviamos todo
            await submitForm(allFormData, editToken);
        });
    }
});

// 🔥 NUEVA FUNCIÓN SUBMIT: Soporta archivos y Cloudinary
async function submitForm(formData, editToken = null) {
    try {
        const endpoint = editToken ? '/update' : '/submit';
        console.log('🚀 Preparando envío híbrido (Texto + Archivos)...');

        // 1. Crear el contenedor "FormData" (necesario para enviar archivos)
        const dataToSend = new FormData();

        // 2. Adjuntar los datos de texto (el JSON de siempre)
        // Lo enviamos bajo la clave 'data' como un string
        const payload = { formData, token: editToken };
        dataToSend.append('data', JSON.stringify(payload));

        // 3. Recuperar y adjuntar archivos guardados en los inputs de welcome.html
        // Buscamos los archivos de la Opción 1 (Ya tengo logo)
        const logoInput = document.getElementById('logoFiles');
        if (logoInput && logoInput.files.length > 0) {
            Array.from(logoInput.files).forEach(file => {
                dataToSend.append('logoFiles', file);
            });
        }

        // Buscamos los archivos de la Opción 2 (Referencias)
        const refInput = document.getElementById('refFiles');
        if (refInput && refInput.files.length > 0) {
            Array.from(refInput.files).forEach(file => {
                dataToSend.append('referenceFiles', file);
            });
        }

        // 4. Enviar mediante Fetch (SIN 'Content-Type' header, el navegador lo pone solo)
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            body: dataToSend
            // ❌ No pongas headers de Content-Type aquí, rompería el envío de archivos
        });

        const result = await response.json();
        console.log('📥 RESPUESTA DEL SERVIDOR:', result);

        if (result.success) {
            window.savedFormData = formData;
            showSuccessModal(result.token, result.editLink, formData);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error submitting form:', error);
        alert('Error submitting form. Please try again.');
    }
}

// --- Las funciones loadExistingFormData, fillFormFields, etc., se mantienen igual ---
// (Tu código de carga y logs originales sigue aquí abajo...)

async function loadExistingFormData(token) {
    try {
        console.log('🔄 Cargando datos del token:', token);
        const response = await fetch(`${API_URL}/get/${token}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        const data = await response.json();
        if (data.success) {
            localStorage.removeItem('formData');
            formManager.clearData();
            localStorage.setItem('formData', JSON.stringify(data.formData));
            localStorage.setItem('editToken', token);
            await new Promise(resolve => setTimeout(resolve, 200));
            fillFormFields(data.formData);
            showEditMode();
        }
    } catch (error) {
        const isSafariGhost = (error.stack && error.stack.includes('webkit')) || (error.message === 'Load failed');
        if (isSafariGhost) return;
        console.error('❌ Error:', error);
    }
}

function fillFormFields(data) {
    const currentPage = window.location.pathname.includes('page2') ? 'page2' : 'page1';
    const pageData = data[currentPage];
    if (!pageData) return;

    if (currentPage === 'page1') {
        const companyNameEl = document.getElementById('companyName');
        if (companyNameEl && pageData.companyName) companyNameEl.textContent = pageData.companyName;
        
        ['facebook', 'instagram', 'twitter', 'other'].forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = pageData[field] || '';
        });
    } else if (currentPage === 'page2') {
        const container = document.getElementById('managersContainer');
        if (container && pageData.managers) {
            fillManagerFields(1, pageData.managers[0]);
            for (let i = 1; i < pageData.managers.length; i++) {
                if (typeof addManagerBlock === 'function') addManagerBlock(i + 1, pageData.managers[i]);
            }
        }
    }
}

function fillManagerFields(managerNum, data) {
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
        alert('Link copied!');
    });

    document.getElementById('downloadPDF')?.addEventListener('click', () => {
        if (typeof generatePDF === 'function') generatePDF(formData);
    });

    document.getElementById('closeModal')?.addEventListener('click', () => {
        formManager.clearData();
        localStorage.removeItem('editToken');
        window.location.href = '/thank-you';
    });
}

function showEditMode() {
    const container = document.querySelector('.form-container');
    if (!container || document.querySelector('.edit-mode-banner')) return;
    const banner = document.createElement('div');
    banner.className = 'edit-mode-banner';
    banner.textContent = '📝 Edit Mode - You are modifying an existing form';
    banner.style.cssText = 'background: #ffc107; color: #000; padding: 10px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 5px;';
    container.prepend(banner);
}