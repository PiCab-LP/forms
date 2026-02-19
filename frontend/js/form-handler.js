// Configuración del API
const API_URL = 'https://forms-wliu.onrender.com/api/form';

class FormDataManager {
    constructor() {
        this.storageKey = 'formData';
    }
   
    savePageData(page, data) {
        let allData = this.getAllData();
        allData[`page${page}`] = data;
        localStorage.setItem(this.storageKey, JSON.stringify(allData));
    }
   
    getAllData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }

    loadPageData(page) {
        const allData = this.getAllData();
        return allData[`page${page}`] || {};
    }
   
    clearData() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('editToken');
        localStorage.removeItem('gameroomName');
        localStorage.removeItem('logoOption');
        localStorage.removeItem('designReferenceText');
    }
}

const formManager = new FormDataManager();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const editToken = urlParams.get('token');
    
    const isWelcome = !window.location.pathname.includes('page2') && !window.location.pathname.includes('index');

    if (editToken) {
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

    const formPage2 = document.getElementById('formPage2');
    if (formPage2) {
        formPage2.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (typeof validateManagers === 'function' && !validateManagers()) return;
            
            const page2Data = getFormDataPage2();
            formManager.savePageData(2, page2Data);
            const allFormData = formManager.getAllData();
            
            if (!allFormData.page1) allFormData.page1 = {};
            allFormData.page1.companyName = localStorage.getItem('gameroomName');
            allFormData.page1.logoOption = localStorage.getItem('logoOption');
            allFormData.page1.designReferenceText = localStorage.getItem('designReferenceText');

            const token = localStorage.getItem('editToken');
            await submitForm(allFormData, token);
        });
    }
});

async function submitForm(formData, editToken = null) {
    try {
        const endpoint = editToken ? '/update' : '/submit';
        const dataToSend = new FormData();
        const payload = { formData: formData, token: editToken };
        dataToSend.append('data', JSON.stringify(payload));

        const logoInput = document.getElementById('logoFiles');
        if (logoInput && logoInput.files.length > 0) {
            Array.from(logoInput.files).slice(0, 3).forEach(file => dataToSend.append('logoFiles', file));
        }

        const refInput = document.getElementById('referenceFiles');
        if (refInput && refInput.files.length > 0) {
            Array.from(refInput.files).slice(0, 5).forEach(file => dataToSend.append('referenceFiles', file));
        }

        const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', body: dataToSend });
        const result = await response.json();

        if (result.success) {
            showSuccessModal(result.token, result.editLink, formData);
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error submitting form:', error);
    }
}

async function loadExistingFormData(token) {
    try {
        const response = await fetch(`${API_URL}/get/${token}`);
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('formData', JSON.stringify(data.formData));
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

    if (isIndex) {
        // 🔥 CORRECCIÓN: Inyectar el nombre en el span editable con ID "companyName"
        const companySpan = document.getElementById('companyName');
        if (companySpan && page1Data.companyName) {
            companySpan.textContent = page1Data.companyName;
        }

        ['facebook', 'instagram', 'twitter', 'other'].forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = page1Data[field] || '';
        });
    }

    if (isWelcome) {
        const grInput = document.getElementById('gameroomName');
        if (grInput) grInput.value = page1Data.companyName || '';
        
        const grHeader = document.getElementById('companyNameHeader');
        if (grHeader && page1Data.companyName) grHeader.textContent = page1Data.companyName;
        
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

    if (isPage2) {
        const container = document.getElementById('managersContainer');
        if (container && page2Data.managers) {
            fillManagerFields(1, page2Data.managers[0]);
            for (let i = 1; i < page2Data.managers.length; i++) {
                if (typeof addManagerBlock === 'function') addManagerBlock(i + 1, page2Data.managers[i]);
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
    document.getElementById('closeModal')?.addEventListener('click', () => {
        formManager.clearData();
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