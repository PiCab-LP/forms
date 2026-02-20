// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y CAPTURA DE ARCHIVOS (A prueba de iOS/iPhone)
// ==========================================
const API_URL = 'https://forms-wliu.onrender.com/api/form';

// 🔥 FUNCIÓN TRADUCTORA MEJORADA: Sobrevive a las locuras del iPhone
function dataURLtoFile(dataurl, filename) {
    try {
        let arr = dataurl.split(',');
        let mimeMatch = arr[0].match(/:(.*?);/);
        let mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : 'image/jpeg';
        
        let bstr = atob(arr[1]);
        let n = bstr.length;
        let u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        let finalName = filename;
        if (!finalName.includes('.')) {
            finalName += mime === 'image/png' ? '.png' : '.jpg';
        }
        
        return new File([u8arr], finalName, {type: mime});
    } catch (error) {
        console.error("❌ Error convirtiendo imagen del iPhone:", error);
        return null;
    }
}

// 🔥 CAPTURA MEJORADA: Maneja los formatos HEIC y PNG de iOS
window.handleFiles = async function(input, type) {
    const files = Array.from(input.files);
    
    const base64Files = await Promise.all(files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let fileType = file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
                let fileName = file.name || `iphone_upload_${Date.now()}.jpg`;
                resolve({ name: fileName, type: fileType, data: e.target.result });
            };
            reader.onerror = () => {
                console.error("❌ Error de lectura en Safari/iOS");
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    }));

    const validFiles = base64Files.filter(f => f !== null);

    if (type === 'logo') {
        localStorage.setItem('tempLogos', JSON.stringify(validFiles));
        console.log("✅ Logos guardados en LocalStorage:", validFiles.length);
    } else {
        localStorage.setItem('tempReferences', JSON.stringify(validFiles));
        console.log("✅ Referencias guardadas en LocalStorage:", validFiles.length);
    }
};

// ==========================================
// 2. GESTIÓN DE DATOS (LocalStorage)
// ==========================================
class FormDataManager {
    constructor() { this.storageKey = 'formData'; }
   
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
        localStorage.removeItem('tempLogos');
        localStorage.removeItem('tempReferences');
    }
}

const formManager = new FormDataManager();

// ==========================================
// 3. INICIALIZACIÓN Y EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const editToken = urlParams.get('token');
    
    const isWelcome = !window.location.pathname.includes('page2') && !window.location.pathname.includes('index');

    if (!editToken && localStorage.getItem('editToken')) {
        formManager.clearData();
    }

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
            
            const companySpan = document.getElementById('companyName');
            if (companySpan) {
                localStorage.setItem('gameroomName', companySpan.textContent.trim());
            }

            const page2Data = getFormDataPage2();
            formManager.savePageData(2, page2Data);
            
            const allFormData = formManager.getAllData();
            
            if (!allFormData.page1) allFormData.page1 = {};
            
            // 🔥 ASEGURAR QUE SE INCLUYAN TODOS LOS CAMPOS DE LA PÁGINA 1
            const p1 = allFormData.page1;
            const savedP1 = formManager.loadPageData(1);
            
            p1.companyName = localStorage.getItem('gameroomName');
            p1.logoOption = localStorage.getItem('logoOption');
            p1.designReferenceText = localStorage.getItem('designReferenceText');
            
            // Nuevos campos obligatorios de Room Details
            p1.cashoutLimit = savedP1.cashoutLimit;
            p1.minDeposit = savedP1.minDeposit;
            p1.scheduleOption = savedP1.scheduleOption;
            p1.customSchedule = savedP1.customSchedule;
            p1.telegramPhone = savedP1.telegramPhone;

            const token = localStorage.getItem('editToken');
            await submitForm(allFormData, token);
        });
    }
});

// ==========================================
// 4. ENVÍO FINAL (Multipart/Form-Data con Pantalla de Carga)
// ==========================================
async function submitForm(formData, editToken = null) {
    function toggleLoading(show) {
        let overlay = document.getElementById('submit-loading-overlay');
        if (show) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'submit-loading-overlay';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(255, 255, 255, 0.95);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    z-index: 9999; backdrop-filter: blur(5px); transition: opacity 0.3s;
                `;
                overlay.innerHTML = `
                    <div style="width: 60px; height: 60px; border: 6px solid #f0f0f0; border-top: 6px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <h3 style="margin-top: 25px; color: #333; font-family: sans-serif; font-size: 20px;">Processing your files...</h3>
                    <p style="color: #666; font-family: sans-serif; font-size: 14px; margin-top: 5px;">Please wait a moment, uploading to secure storage.</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `;
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }

    try {
        toggleLoading(true);
        const endpoint = editToken ? '/update' : '/submit';
        const dataToSend = new FormData();
        const payload = { formData: formData, token: editToken };
        dataToSend.append('data', JSON.stringify(payload));

        const storedLogos = JSON.parse(localStorage.getItem('tempLogos') || '[]');
        if (storedLogos.length > 0) {
            storedLogos.forEach(fileObj => {
                const file = dataURLtoFile(fileObj.data, fileObj.name);
                if (file) dataToSend.append('logoFiles', file);
            });
        }

        const storedRefs = JSON.parse(localStorage.getItem('tempReferences') || '[]');
        if (storedRefs.length > 0) {
            storedRefs.forEach(fileObj => {
                const file = dataURLtoFile(fileObj.data, fileObj.name);
                if (file) dataToSend.append('referenceFiles', file);
            });
        }

        const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', body: dataToSend });
        if (!response.ok) throw new Error(`Error servidor: ${response.status}`);

        const result = await response.json();
        toggleLoading(false);
        
        if (result.success) {
            showSuccessModal(result.token, result.editLink, formData);
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        toggleLoading(false);
        console.error('❌ Error crítico en submitForm:', error);
        alert('No se pudo enviar el formulario. Revisa tu conexión.');
    }
}

// ==========================================
// 5. FUNCIONES AUXILIARES (UI y Carga)
// ==========================================
async function loadExistingFormData(token) {
    try {
        const response = await fetch(`${API_URL}/get/${token}`);
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('formData', JSON.stringify(data.formData));
            if (data.formData.page1) {
                const p1 = data.formData.page1;
                localStorage.setItem('gameroomName', p1.companyName || '');
                localStorage.setItem('logoOption', p1.logoOption || '');
                localStorage.setItem('designReferenceText', p1.designReferenceText || '');
            }
            fillFormFields(data.formData);
            showEditMode();
        }
    } catch (error) { console.error('❌ Error cargando datos:', error); }
}

function fillFormFields(data) {
    const isPage2 = window.location.pathname.includes('page2');
    const isIndex = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
    const isWelcome = !isPage2 && !isIndex;

    const page1Data = data.page1 || {};
    const page2Data = data.page2 || {};

    if (isIndex) {
        const companySpan = document.getElementById('companyName');
        if (companySpan && page1Data.companyName) companySpan.textContent = page1Data.companyName;

        ['facebook', 'instagram', 'twitter', 'other'].forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = page1Data[field] || '';
        });

        // 🔥 CARGAR NUEVOS CAMPOS DE ROOM DETAILS EN MODO EDICIÓN
        if (page1Data.cashoutLimit) document.getElementById('cashoutLimit').value = page1Data.cashoutLimit;
        if (page1Data.minDeposit) document.getElementById('minDeposit').value = page1Data.minDeposit;
        
        if (page1Data.telegramPhone) {
            const phoneInput = document.getElementById('telegramPhone');
            if (phoneInput) {
                phoneInput.value = page1Data.telegramPhone;
                document.getElementById('phoneCount').textContent = page1Data.telegramPhone.length;
            }
        }

        if (page1Data.scheduleOption) {
            const radio = document.querySelector(`input[name="scheduleOption"][value="${page1Data.scheduleOption}"]`);
            if (radio) {
                radio.checked = true;
                if (page1Data.scheduleOption === 'custom') {
                    document.getElementById('scheduleTimeRange').style.display = 'block';
                    document.getElementById('customSchedule').value = page1Data.customSchedule || '';
                }
            }
        }
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
        if (page1Data.designReferenceText) {
            const designText = document.getElementById('designReferenceText');
            if (designText) designText.value = page1Data.designReferenceText;
        }
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
    const btnCopy = document.getElementById('copyLink');
    const btnClose = document.getElementById('closeModal');
    const btnDownloadPDF = document.getElementById('downloadPDF');

    if (!modal || !editLinkInput) return;
    editLinkInput.value = editLink;
    modal.classList.remove('hidden');

    if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editLink);
                const originalText = btnCopy.textContent;
                btnCopy.textContent = '✅ Copied!';
                setTimeout(() => { btnCopy.textContent = originalText; }, 2000);
            } catch (err) {
                editLinkInput.select();
                document.execCommand('copy');
            }
        });
    }

    if (btnDownloadPDF && typeof generatePDF === 'function') {
        btnDownloadPDF.addEventListener('click', () => generatePDF(formData));
    }

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            formManager.clearData();
            window.location.href = 'thank-you.html'; 
        });
    }
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