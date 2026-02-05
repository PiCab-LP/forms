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
        const response = await fetch(`${API_URL}/get/${token}`);
        const data = await response.json();
        
        if (data.success) {
            // Guardar en localStorage para usar en todas las páginas
            localStorage.setItem('formData', JSON.stringify(data.formData));
            localStorage.setItem('editToken', token);
            
            // Pre-llenar campos de la página actual
            fillFormFields(data.formData);
            
            // Mostrar mensaje de edición
            showEditMode();
        } else {
            alert('Form not found or expired');
        }
    } catch (error) {
        console.error('Error loading form data:', error);
        alert('Error loading form data');
    }
}


function fillFormFields(data) {
    const currentPage = window.location.pathname.includes('page2') ? 'page2' : 'page1';
    const pageData = data[currentPage];
    
    if (!pageData) return;
    
    if (currentPage === 'page1') {
        // Llenar página 1
        document.getElementById('companyName').textContent = pageData.companyName || 'Company Name';
        
        if (pageData.facebook) document.getElementById('facebook').value = pageData.facebook;
        if (pageData.instagram) document.getElementById('instagram').value = pageData.instagram;
        if (pageData.twitter) document.getElementById('twitter').value = pageData.twitter;
        if (pageData.other) document.getElementById('other').value = pageData.other;
        
    } else if (currentPage === 'page2') {
        // Llenar página 2 (managers)
        if (pageData.managers && pageData.managers.length > 0) {
            const container = document.getElementById('managersContainer');
            container.innerHTML = ''; // Limpiar
            
            pageData.managers.forEach((manager, index) => {
                if (index === 0) {
                    // Llenar el primer manager
                    fillManagerFields(1, manager);
                } else {
                    // Agregar managers adicionales
                    addManagerBlock(index + 1, manager);
                }
            });
        }
    }
}


function fillManagerFields(managerNum, data) {
    document.getElementById(`username_${managerNum}`).value = data.username || '';
    document.getElementById(`fullname_${managerNum}`).value = data.fullname || '';
    document.getElementById(`role_${managerNum}`).value = data.role || '';
    document.getElementById(`email_${managerNum}`).value = data.email || '';
    document.getElementById(`password_${managerNum}`).value = data.password || '';
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
        // ✅ CORREGIDO: rutas sin /form/ duplicado
        const endpoint = editToken ? '/update' : '/submit';
        
        console.log('Enviando formulario con datos:', formData); // Debug
        
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
            console.log('Formulario guardado exitosamente'); // Debug
            console.log('Datos enviados:', formData); // Debug adicional
            
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
    
    console.log('Datos disponibles para PDF:', formData); // Debug
    
    // Copiar link
    document.getElementById('copyLink').addEventListener('click', () => {
        editLinkInput.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    });
    
    // Descargar PDF con los datos que acabamos de enviar
    document.getElementById('downloadPDF').addEventListener('click', () => {
        console.log('Generando PDF con datos:', formData); // Debug
        generatePDF(formData);
    });
    
    // Cerrar modal
    document.getElementById('closeModal').addEventListener('click', () => {
        modal.classList.add('hidden');
        
        // Limpiar datos
        formManager.clearData();
        localStorage.removeItem('editToken');
        delete window.savedFormData;
        
        // Recargar página sin token
        window.location.href = window.location.origin + window.location.pathname;
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
    const banner = document.createElement('div');
    banner.className = 'edit-mode-banner';
    banner.textContent = '📝 Edit Mode - You are modifying an existing form';
    document.querySelector('.form-container').prepend(banner);
}
