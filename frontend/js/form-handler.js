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

// 🔥 IMPORTANTE: Esperar a que el DOM esté listo antes de cargar datos
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, verificando token...');
    
    // Verificar si estamos editando (hay token en URL)
    const urlParams = new URLSearchParams(window.location.search);
    const editToken = urlParams.get('token');
    
    // Si hay token, cargar datos existentes SOLO en page1
    if (editToken) {
        // 🔥 IMPORTANTE: Solo cargar datos del servidor en page1
        // En page2, ya tenemos los datos actualizados que vienen de page1 en localStorage
        const isPage2 = window.location.pathname.includes('page2');
        
        if (!isPage2) {
            console.log('📥 Token detectado en page1, cargando datos del servidor');
            loadExistingFormData(editToken);
        } else {
            console.log('⏭️ Token detectado en page2, usando datos del localStorage');
            console.log('💡 Los datos de page1 ya están guardados en localStorage desde la navegación');
            
            // Guardar el token para el submit
            localStorage.setItem('editToken', editToken);
            
            // Llenar campos de page2 con los datos del localStorage
            const savedData = formManager.getAllData();
            console.log('📊 Datos del localStorage para page2:', savedData);
            
            if (savedData.page2) {
                fillFormFields(savedData);
            }
            
            // Mostrar mensaje de edición
            showEditMode();
        }
    }
});

async function loadExistingFormData(token) {
    try {
        console.log('🔄 Cargando datos del token:', token);
        console.log('📍 URL completa:', `${API_URL}/get/${token}`);
        
        const response = await fetch(`${API_URL}/get/${token}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',  // 🔥 AGREGAR ESTO
            credentials: 'omit'  // 🔥 AGREGAR ESTO
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('📥 Respuesta del servidor:', data);
        
        if (data.success) {
            // 🔥 IMPORTANTE: Limpiar localStorage antiguo PRIMERO
            console.log('🧹 Limpiando localStorage antiguo...');
            localStorage.removeItem('formData');
            formManager.clearData();
            
            // Guardar datos FRESCOS del servidor
            localStorage.setItem('formData', JSON.stringify(data.formData));
            localStorage.setItem('editToken', token);
            
            console.log('✅ localStorage actualizado con datos del servidor');
            console.log('📊 Datos guardados:', data.formData);
            
            // Pre-llenar campos de la página actual
            fillFormFields(data.formData);
            
            // Mostrar mensaje de edición
            showEditMode();
        } else {
            console.error('❌ Error del servidor:', data.message);
            alert('Form not found or expired: ' + (data.message || ''));
        }
    } catch (error) {
        console.error('❌ Error completo:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        
        // Mensaje más específico
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            // Mostrar modal de error amigable
            showConnectionErrorModal(token);
        } else if (error.message.includes('HTTP error')) {
            alert('Server returned an error: ' + error.message);
        } else {
            alert('Error loading form data: ' + error.message);
        }
    }
}

function fillFormFields(data) {
    console.log('🔄 fillFormFields llamada con datos:', data);
    
    const currentPage = window.location.pathname.includes('page2') ? 'page2' : 'page1';
    const pageData = data[currentPage];
    
    console.log('📄 Página actual:', currentPage);
    console.log('📊 Datos de la página:', pageData);
    
    if (!pageData) {
        console.warn('⚠️ No hay datos para la página:', currentPage);
        return;
    }
    
    if (currentPage === 'page1') {
        // 🔥 PRIMERO: Obtener referencias a los elementos
        const companyNameEl = document.getElementById('companyName');
        const facebookEl = document.getElementById('facebook');
        const instagramEl = document.getElementById('instagram');
        const twitterEl = document.getElementById('twitter');
        const otherEl = document.getElementById('other');
        
        console.log('🔍 Verificando elementos del DOM:');
        console.log('  companyName:', !!companyNameEl);
        console.log('  facebook:', !!facebookEl);
        console.log('  instagram:', !!instagramEl);
        console.log('  twitter:', !!twitterEl);
        console.log('  other:', !!otherEl);
        
        // 🔥 SEGUNDO: Resetear todos los campos a vacío
        if (facebookEl) facebookEl.value = '';
        if (instagramEl) instagramEl.value = '';
        if (twitterEl) twitterEl.value = '';
        if (otherEl) otherEl.value = '';
        
        console.log('🧹 Campos reseteados a vacío');
        
        // 🔥 TERCERO: Llenar con los valores del servidor
        if (companyNameEl) {
            companyNameEl.textContent = pageData.companyName || '';
        }
        
        if (facebookEl) facebookEl.value = pageData.facebook || '';
        if (instagramEl) instagramEl.value = pageData.instagram || '';
        if (twitterEl) twitterEl.value = pageData.twitter || '';
        if (otherEl) otherEl.value = pageData.other || '';
        
        // 🔥 DEBUG: Mostrar valores finales
        console.log('✅ Campos llenados con valores del servidor:');
        console.log('  Facebook:', facebookEl?.value || '[VACÍO]');
        console.log('  Instagram:', instagramEl?.value || '[VACÍO]');
        console.log('  Twitter:', twitterEl?.value || '[VACÍO]');
        console.log('  Other:', otherEl?.value || '[VACÍO]');
        
    } else if (currentPage === 'page2') {
        // Llenar página 2 (managers)
        if (pageData.managers && pageData.managers.length > 0) {
            console.log('👥 Managers a cargar:', pageData.managers);
            
            const container = document.getElementById('managersContainer');
            if (!container) {
                console.error('❌ No se encontró managersContainer');
                return;
            }
            
            // No limpiar el container, solo llenar el primer manager
            fillManagerFields(1, pageData.managers[0]);
            
            // Agregar managers adicionales
            for (let i = 1; i < pageData.managers.length; i++) {
                if (typeof addManagerBlock === 'function') {
                    addManagerBlock(i + 1, pageData.managers[i]);
                } else {
                    console.error('❌ La función addManagerBlock no existe');
                }
            }
        }
    }
}

function fillManagerFields(managerNum, data) {
    console.log(`👤 Llenando manager #${managerNum}:`, data);
    
    const usernameEl = document.getElementById(`username_${managerNum}`);
    const fullnameEl = document.getElementById(`fullname_${managerNum}`);
    const roleEl = document.getElementById(`role_${managerNum}`);
    const emailEl = document.getElementById(`email_${managerNum}`);
    const passwordEl = document.getElementById(`password_${managerNum}`);
    
    if (usernameEl) usernameEl.value = data.username || '';
    if (fullnameEl) fullnameEl.value = data.fullname || '';
    if (roleEl) roleEl.value = data.role || '';
    if (emailEl) emailEl.value = data.email || '';
    if (passwordEl) passwordEl.value = data.password || '';
}

// Manejar envío del formulario final (página 2)
if (document.getElementById('formPage2')) {
    document.getElementById('formPage2').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar managers
        if (!validateManagers()) {
            return;
        }
        
        // Recolectar datos de página 2
        const page2Data = getFormDataPage2();
        formManager.savePageData(2, page2Data);
        
        // Combinar todos los datos
        const allFormData = formManager.getAllData();
        
        console.log('📋 Datos completos del formulario antes de enviar:', allFormData);
        
        // Verificar si estamos editando
        const editToken = localStorage.getItem('editToken');
        
        // Enviar al backend
        await submitForm(allFormData, editToken);
    });
}

async function submitForm(formData, editToken = null) {
    try {
        const endpoint = editToken ? '/update' : '/submit';
        
        const payload = {
            formData: formData,
            token: editToken
        };
        
        console.log('🚀 ENVIANDO AL SERVIDOR:');
        console.log('  Endpoint:', `${API_URL}${endpoint}`);
        console.log('  Payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        });
        
        const result = await response.json();
        
        console.log('📥 RESPUESTA DEL SERVIDOR:', result);
        
        if (result.success) {
            console.log('✅ Formulario guardado exitosamente');
            
            // Guardar los datos en una variable global para el PDF
            window.savedFormData = formData;
            
            // Mostrar modal con link de edición
            showSuccessModal(result.token, result.editLink, formData);
            
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error submitting form:', error);
        alert('Error submitting form. Please try again.');
    }
}

function showSuccessModal(token, editLink, formData) {
    const modal = document.getElementById('modalConfirmacion');
    const editLinkInput = document.getElementById('editLink');
    
    editLinkInput.value = editLink;
    modal.classList.remove('hidden');
    
    console.log('📄 Datos disponibles para PDF:', formData);
    
    // Copiar link
    document.getElementById('copyLink').addEventListener('click', () => {
        editLinkInput.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    });
    
    // Descargar PDF con los datos que acabamos de enviar
    document.getElementById('downloadPDF').addEventListener('click', () => {
        console.log('📄 Generando PDF con datos:', formData);
        generatePDF(formData);
    });
    
    // Cerrar modal
    document.getElementById('closeModal').addEventListener('click', () => {
        modal.classList.add('hidden');
        
        // Limpiar datos
        formManager.clearData();
        localStorage.removeItem('editToken');
        delete window.savedFormData;
        
        // Redirigir a página de agradecimiento
        window.location.href = '/thank-you';
    });
}

function showConnectionErrorModal(token) {
    const existingModal = document.getElementById('connectionErrorModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'connectionErrorModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 12px; max-width: 500px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
            <h2 style="margin-bottom: 20px; color: #333;">Cannot Connect to Server</h2>
            <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
                Unable to load form data. This could be because:<br><br>
                • The server is starting up (wait 30-60 seconds)<br>
                • Network connection issue<br>
                • CORS policy blocking the request
            </p>
            <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                Retry Now
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

function showEditMode() {
    const formContainer = document.querySelector('.form-container');
    if (!formContainer) {
        console.error('❌ No se encontró .form-container');
        return;
    }
    
    // Verificar si ya existe el banner
    if (document.querySelector('.edit-mode-banner')) {
        return;
    }
    
    const banner = document.createElement('div');
    banner.className = 'edit-mode-banner';
    banner.textContent = '📝 Edit Mode - You are modifying an existing form';
    banner.style.cssText = 'background: #ffc107; color: #000; padding: 10px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 5px;';
    formContainer.prepend(banner);
}
