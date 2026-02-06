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

// Verificar si estamos editando (hay token en URL)
const urlParams = new URLSearchParams(window.location.search);
const editToken = urlParams.get('token');

// Si hay token, cargar datos existentes
if (editToken) {
    loadExistingFormData(editToken);
}

async function loadExistingFormData(token) {
    try {
        console.log('Cargando datos del token:', token);
        
        const response = await fetch(`${API_URL}/get/${token}`);
        const data = await response.json();
        
        console.log('Respuesta del servidor:', data);
        
        if (data.success) {
            // Guardar en localStorage para usar en todas las páginas
            localStorage.setItem('formData', JSON.stringify(data.formData));
            localStorage.setItem('editToken', token);
            
            // Pre-llenar campos de la página actual
            fillFormFields(data.formData);
            
            // Mostrar mensaje de edición
            showEditMode();
        } else {
            console.error('Error del servidor:', data.message);
            alert('Form not found or expired: ' + (data.message || ''));
        }
    } catch (error) {
        console.error('Error loading form data:', error);
        alert('Error loading form data. Please check your connection.');
    }
}

function fillFormFields(data) {
    console.log('Llenando campos con datos:', data);
    
    const currentPage = window.location.pathname.includes('page2') ? 'page2' : 'page1';
    const pageData = data[currentPage];
    
    console.log('Página actual:', currentPage);
    console.log('Datos de la página:', pageData);
    
    if (!pageData) {
        console.warn('No hay datos para la página:', currentPage);
        return;
    }
    
    if (currentPage === 'page1') {
        // Llenar página 1
        const companyNameEl = document.getElementById('companyName');
        if (companyNameEl && pageData.companyName) {
            companyNameEl.textContent = pageData.companyName;
        }
        
        const facebookEl = document.getElementById('facebook');
        if (facebookEl && pageData.facebook) facebookEl.value = pageData.facebook;
        
        const instagramEl = document.getElementById('instagram');
        if (instagramEl && pageData.instagram) instagramEl.value = pageData.instagram;
        
        const twitterEl = document.getElementById('twitter');
        if (twitterEl && pageData.twitter) twitterEl.value = pageData.twitter;
        
        const otherEl = document.getElementById('other');
        if (otherEl && pageData.other) otherEl.value = pageData.other;
        
    } else if (currentPage === 'page2') {
        // Llenar página 2 (managers)
        if (pageData.managers && pageData.managers.length > 0) {
            console.log('Managers a cargar:', pageData.managers);
            
            const container = document.getElementById('managersContainer');
            if (!container) {
                console.error('No se encontró managersContainer');
                return;
            }
            
            // No limpiar el container, solo llenar el primer manager
            fillManagerFields(1, pageData.managers[0]);
            
            // Agregar managers adicionales
            for (let i = 1; i < pageData.managers.length; i++) {
                if (typeof addManagerBlock === 'function') {
                    addManagerBlock(i + 1, pageData.managers[i]);
                } else {
                    console.error('La función addManagerBlock no existe');
                }
            }
        }
    }
}

function fillManagerFields(managerNum, data) {
    console.log(`Llenando manager #${managerNum}:`, data);
    
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
        
        // Verificar si estamos editando
        const editToken = localStorage.getItem('editToken');
        
        // Enviar al backend
        await submitForm(allFormData, editToken);
    });
}

async function submitForm(formData, editToken = null) {
    try {
        const endpoint = editToken ? '/update' : '/submit';
        
        console.log('Enviando formulario con datos:', formData);
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                formData: formData,
                token: editToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Formulario guardado exitosamente');
            console.log('Datos enviados:', formData);
            
            // Guardar los datos en una variable global para el PDF
            window.savedFormData = formData;
            
            // Mostrar modal con link de edición
            showSuccessModal(result.token, result.editLink, formData);
            
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting form. Please try again.');
    }
}

function showSuccessModal(token, editLink, formData) {
    const modal = document.getElementById('modalConfirmacion');
    const editLinkInput = document.getElementById('editLink');
    
    editLinkInput.value = editLink;
    modal.classList.remove('hidden');
    
    console.log('Datos disponibles para PDF:', formData);
    
    // Copiar link
    document.getElementById('copyLink').addEventListener('click', () => {
        editLinkInput.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    });
    
    // Descargar PDF con los datos que acabamos de enviar
    document.getElementById('downloadPDF').addEventListener('click', () => {
        console.log('Generando PDF con datos:', formData);
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
        console.error('No se encontró .form-container');
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
