// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y CAPTURA DE ARCHIVOS (Base64)
// ==========================================
const API_URL = 'https://forms-wliu.onrender.com/api/form';

// 🔥 FUNCIÓN TRADUCTORA: Convierte texto Base64 de vuelta a un Archivo físico
function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// 🔥 CAPTURA: Lee los archivos, los hace texto y los guarda en LocalStorage
window.handleFiles = async function(input, type) {
    const files = Array.from(input.files);
    
    // Convertimos los archivos a Base64
    const base64Files = await Promise.all(files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: file.name, type: file.type, data: e.target.result });
            reader.readAsDataURL(file);
        });
    }));

    if (type === 'logo') {
        localStorage.setItem('tempLogos', JSON.stringify(base64Files));
        console.log("✅ Logos guardados en LocalStorage (Sobrevivirán al cambio de página):", base64Files.length);
    } else {
        localStorage.setItem('tempReferences', JSON.stringify(base64Files));
        console.log("✅ Referencias guardadas en LocalStorage:", base64Files.length);
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
            allFormData.page1.companyName = localStorage.getItem('gameroomName');
            allFormData.page1.logoOption = localStorage.getItem('logoOption');
            allFormData.page1.designReferenceText = localStorage.getItem('designReferenceText');

            const token = localStorage.getItem('editToken');
            
            await submitForm(allFormData, token);
        });
    }
});

// ==========================================
// 4. ENVÍO FINAL (Multipart/Form-Data con Pantalla de Carga)
// ==========================================
async function submitForm(formData, editToken = null) {
    // 🔥 FUNCIONES INTERNAS DE CARGA: Crea una pantalla visual al vuelo
    function toggleLoading(show) {
        let overlay = document.getElementById('submit-loading-overlay');
        if (show) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'submit-loading-overlay';
                // Estilos inyectados directamente para no tener que tocar el CSS
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
        // 🚀 1. ACTIVAMOS LA PANTALLA DE CARGA
        toggleLoading(true);

        const endpoint = editToken ? '/update' : '/submit';
        const dataToSend = new FormData();
        
        const payload = { formData: formData, token: editToken };
        dataToSend.append('data', JSON.stringify(payload));

        console.log("🔍 [SUBMIT] Recuperando archivos del LocalStorage y reconstruyéndolos...");

        // RECONSTRUCCIÓN: Sacamos el texto y lo volvemos archivo
        const storedLogos = JSON.parse(localStorage.getItem('tempLogos') || '[]');
        if (storedLogos.length > 0) {
            console.log(`🚀 Adjuntando ${storedLogos.length} logos reconstruidos.`);
            storedLogos.forEach(fileObj => {
                dataToSend.append('logoFiles', dataURLtoFile(fileObj.data, fileObj.name));
            });
        }

        const storedRefs = JSON.parse(localStorage.getItem('tempReferences') || '[]');
        if (storedRefs.length > 0) {
            console.log(`🚀 Adjuntando ${storedRefs.length} referencias reconstruidas.`);
            storedRefs.forEach(fileObj => {
                dataToSend.append('referenceFiles', dataURLtoFile(fileObj.data, fileObj.name));
            });
        }

        // ENVÍO AL SERVIDOR
        const response = await fetch(`${API_URL}${endpoint}`, { 
            method: 'POST', 
            body: dataToSend 
        });

        if (!response.ok) throw new Error(`Error servidor: ${response.status}`);

        const result = await response.json();
        
        // 🛑 2. DESACTIVAMOS LA PANTALLA DE CARGA CUANDO TERMINA CON ÉXITO
        toggleLoading(false);
        
        if (result.success) {
            showSuccessModal(result.token, result.editLink, formData);
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        // 🛑 3. DESACTIVAMOS LA PANTALLA DE CARGA SI HAY UN ERROR CRÍTICO
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
                localStorage.setItem('gameroomName', data.formData.page1.companyName || '');
                localStorage.setItem('logoOption', data.formData.page1.logoOption || '');
                localStorage.setItem('designReferenceText', data.formData.page1.designReferenceText || '');
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
        if (companySpan && page1Data.companyName) {
            companySpan.textContent = page1Data.companyName;
        }

        ['facebook', 'instagram', 'twitter', 'other'].forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = page1Data[field] || '';
        });

        // 🔥 CORRECCIÓN: Cargar el campo de Details Room
        const roomDetailsEl = document.getElementById('roomDetails');
        if (roomDetailsEl) {
            roomDetailsEl.value = page1Data.roomDetails || '';
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