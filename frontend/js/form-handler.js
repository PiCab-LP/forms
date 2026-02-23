// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y CAPTURA DE ARCHIVOS (A prueba de iOS/iPhone)
// ==========================================
const API_URL = 'https://forms-wliu.onrender.com/api/form';

function dataURLtoFile(dataurl, filename) {
    try {
        let arr = dataurl.split(',');
        let mimeMatch = arr[0].match(/:(.*?);/);
        let mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : 'image/jpeg';
        let bstr = atob(arr[1]);
        let n = bstr.length;
        let u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        let finalName = filename;
        if (!finalName.includes('.')) { finalName += mime === 'image/png' ? '.png' : '.jpg'; }
        return new File([u8arr], finalName, {type: mime});
    } catch (error) {
        console.error("❌ Error convirtiendo imagen del iPhone:", error);
        return null;
    }
}

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
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }));
    const validFiles = base64Files.filter(f => f !== null);
    if (type === 'logo') { localStorage.setItem('tempLogos', JSON.stringify(validFiles)); }
    else { localStorage.setItem('tempReferences', JSON.stringify(validFiles)); }
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

    if (!editToken && localStorage.getItem('editToken')) { formManager.clearData(); }

    if (editToken) {
        if (isWelcome && localStorage.getItem('editToken') !== editToken) { formManager.clearData(); }
        localStorage.setItem('editToken', editToken);
        if (isWelcome) { await loadExistingFormData(editToken); }
        else {
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
            if (companySpan) { localStorage.setItem('gameroomName', companySpan.textContent.trim()); }

            const page2Data = getFormDataPage2();
            formManager.savePageData(2, page2Data);
            
            const allFormData = formManager.getAllData();
            const savedP1 = formManager.loadPageData(1);
            
            if (!allFormData.page1) allFormData.page1 = {};
            const p1 = allFormData.page1;
            
            p1.companyName = localStorage.getItem('gameroomName');
            p1.logoOption = localStorage.getItem('logoOption');
            p1.designReferenceText = localStorage.getItem('designReferenceText');
            
            // 🔥 Aseguramos que los nuevos campos de Room Details viajen al servidor
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
// 4. ENVÍO FINAL (Sin cambios en tu lógica de carga)
// ==========================================
async function submitForm(formData, editToken = null) {
    // (Mantengo tu función toggleLoading idéntica para no asustarte)
    function toggleLoading(show) {
        let overlay = document.getElementById('submit-loading-overlay');
        if (show) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'submit-loading-overlay';
                overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(5px);`;
                overlay.innerHTML = `<div style="width: 60px; height: 60px; border: 6px solid #f0f0f0; border-top: 6px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div><h3>Processing...</h3><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else if (overlay) { overlay.style.display = 'none'; }
    }

    try {
        toggleLoading(true);
        const endpoint = editToken ? '/update' : '/submit';
        const dataToSend = new FormData();
        dataToSend.append('data', JSON.stringify({ formData, token: editToken }));

        const storedLogos = JSON.parse(localStorage.getItem('tempLogos') || '[]');
        storedLogos.forEach(f => {
            const file = dataURLtoFile(f.data, f.name);
            if (file) dataToSend.append('logoFiles', file);
        });

        const storedRefs = JSON.parse(localStorage.getItem('tempReferences') || '[]');
        storedRefs.forEach(f => {
            const file = dataURLtoFile(f.data, f.name);
            if (file) dataToSend.append('referenceFiles', file);
        });

        const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', body: dataToSend });
        const result = await response.json();
        toggleLoading(false);
        if (result.success) showSuccessModal(result.token, result.editLink, formData);
        else alert('Error: ' + result.message);
    } catch (error) { toggleLoading(false); console.error(error); }
}

// ==========================================
// 5. FUNCIONES AUXILIARES (Corrección de relojes)
// ==========================================
async function loadExistingFormData(token) {
    try {
        const response = await fetch(`${API_URL}/get/${token}`);
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('formData', JSON.stringify(data.formData));
            fillFormFields(data.formData);
            showEditMode();
        }
    } catch (error) { console.error(error); }
}

function fillFormFields(data) {
    const isIndex = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
    const p1 = data.page1 || {};

    if (isIndex) {
        if (p1.companyName) document.getElementById('companyName').textContent = p1.companyName;
        ['facebook', 'instagram', 'twitter', 'other'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = p1[f] || '';
        });

        // 🔥 RELLENADO DE ROOM DETAILS
        if (p1.cashoutLimit) document.getElementById('cashoutLimit').value = p1.cashoutLimit;
        if (p1.minDeposit) document.getElementById('minDeposit').value = p1.minDeposit;
        if (p1.telegramPhone) {
            document.getElementById('telegramPhone').value = p1.telegramPhone;
            document.getElementById('phoneCount').textContent = p1.telegramPhone.length;
        }

        if (p1.scheduleOption) {
            const radio = document.querySelector(`input[name="scheduleOption"][value="${p1.scheduleOption}"]`);
            if (radio) {
                radio.checked = true;
                // 🔥 Lógica para separar el horario en los dos relojes
                if (p1.scheduleOption === 'custom' && p1.customSchedule && p1.customSchedule.includes(' to ')) {
                    document.getElementById('scheduleTimeRange').style.display = 'block';
                    const times = p1.customSchedule.split(' to ');
                    document.getElementById('startTime').value = times[0];
                    document.getElementById('endTime').value = times[1];
                }
            }
        }
    }
    // (Lógica para Welcome y Page 2 sigue igual...)
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

    // Asignamos el link al input para que se vea
    editLinkInput.value = editLink;
    
    // Mostramos el modal quitando la clase hidden
    modal.classList.remove('hidden');

    // --- 1. LÓGICA DEL BOTÓN COPIAR ---
    if (btnCopy) {
        // Limpiamos eventos previos para evitar duplicados
        const newBtnCopy = btnCopy.cloneNode(true);
        btnCopy.parentNode.replaceChild(newBtnCopy, btnCopy);

        newBtnCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editLink);
                const originalText = newBtnCopy.textContent;
                newBtnCopy.textContent = '✅ Copied!';
                newBtnCopy.style.backgroundColor = '#48bb78';
                setTimeout(() => { 
                    newBtnCopy.textContent = originalText;
                    newBtnCopy.style.backgroundColor = ''; 
                }, 2000);
            } catch (err) {
                // Respaldo por si falla navigator.clipboard
                editLinkInput.select();
                document.execCommand('copy');
            }
        });
    }

    // --- 2. LÓGICA DEL BOTÓN DOWNLOAD PDF ---
    if (btnDownloadPDF) {
        const newBtnDownload = btnDownloadPDF.cloneNode(true);
        btnDownloadPDF.parentNode.replaceChild(newBtnDownload, btnDownloadPDF);

        newBtnDownload.addEventListener('click', () => {
            if (typeof generatePDF === 'function') {
                generatePDF(formData);
            } else {
                console.error("❌ Función generatePDF no encontrada");
                alert("PDF generation is not available at this moment.");
            }
        });
    }

    // --- 3. LÓGICA DEL BOTÓN CLOSE ---
    if (btnClose) {
        const newBtnClose = btnClose.cloneNode(true);
        btnClose.parentNode.replaceChild(newBtnClose, btnClose);

        newBtnClose.addEventListener('click', () => {
            formManager.clearData();
            window.location.href = 'thank-you.html'; 
        });
    }
}

function showEditMode() {
    const container = document.querySelector('.form-container');
    if (!container || document.querySelector('.edit-mode-banner')) return;
    const banner = document.createElement('div');
    banner.style.cssText = 'background: #ffc107; padding: 10px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 5px;';
    banner.textContent = '📝 Edit Mode - Modifying existing form';
    container.prepend(banner);
}