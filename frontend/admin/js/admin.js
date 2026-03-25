const API_URL = 'https://forms-production-a2c0.up.railway.app/api/admin';

let currentPage = 1;
let searchTimeout;

// 🔐 Verificar autenticación al cargar
async function checkAuth() {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        console.log('❌ No token, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        const response = await fetchWithAuth(`${API_URL.replace('/admin', '/auth')}/verify`);
        
        if (!response.ok) {
            console.log('❌ Invalid token, redirecting to login');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/login.html';
            return false;
        }
        
        console.log('✅ Authentication valid');
        return true;
    } catch (error) {
        console.error('❌ Auth check error:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// 🔐 Fetch con autenticación
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    return fetch(url, { ...options, headers });
}

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', async () => {
    // 🔐 Verificar autenticación primero
    const isAuth = await checkAuth();
    
    if (!isAuth) {
        return; // Si no está autenticado, se redirige automáticamente
    }
    
    // Cargar datos del dashboard
    loadStats();
    loadForms(1);
    
    // Búsqueda en tiempo real
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadForms(1, e.target.value);
        }, 500);
    });
});

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetchWithAuth(`${API_URL}/stats`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalForms').textContent = data.stats.totalForms;
            document.getElementById('formsThisMonth').textContent = data.stats.formsThisMonth;
            document.getElementById('editedForms').textContent = data.stats.editedForms;
            document.getElementById('avgEdits').textContent = data.stats.averageEdits;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Cargar formularios
async function loadForms(page = 1, search = '') {
    try {
        const response = await fetchWithAuth(`${API_URL}/forms?page=${page}&limit=10&search=${search}`);
        const data = await response.json();
        
        if (data.success) {
            renderFormsTable(data.data);
            renderPagination(data.pagination);
            currentPage = page;
        }
    } catch (error) {
        console.error('Error loading forms:', error);
        document.getElementById('formsTableBody').innerHTML = `
            <tr><td colspan="6" class="loading">Error loading forms</td></tr>
        `;
    }
}

// Renderizar tabla de formularios
function renderFormsTable(forms) {
    const tbody = document.getElementById('formsTableBody');
    
    if (forms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No forms found</td></tr>';
        return;
    }
    
    tbody.innerHTML = forms.map(form => `
        <tr>
            <td><strong>${form.formData?.page1?.companyName || 'N/A'}</strong></td>
            <td>${form.email}</td>
            <td>${new Date(form.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</td>
            <td><span class="badge ${form.editCount > 0 ? 'badge-warning' : 'badge-success'}">${form.editCount}</span></td>
            <td><span class="badge badge-info">v${form.currentVersion}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewForm('${form.token}')">👁️ View</button>
                    <button class="btn-delete" onclick="deleteForm('${form.token}')">🗑️ Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Renderizar paginación
function renderPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    let html = '';
    
    // Botón anterior
    html += `<button class="page-btn" onclick="loadForms(${pagination.currentPage - 1})" ${pagination.currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;
    
    // Números de página
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)) {
            html += `<button class="page-btn ${i === pagination.currentPage ? 'active' : ''}" onclick="loadForms(${i})">${i}</button>`;
        } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
            html += `<span>...</span>`;
        }
    }
    
    // Botón siguiente
    html += `<button class="page-btn" onclick="loadForms(${pagination.currentPage + 1})" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>Next →</button>`;
    
    paginationDiv.innerHTML = html;
}

// Ver detalles de un formulario
function viewForm(token) {
    window.location.href = `/admin/form-details?token=${token}`;
}

// Eliminar formulario
async function deleteForm(token) {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_URL}/forms/${token}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Form deleted successfully');
            loadForms(currentPage);
            loadStats();
        } else {
            alert('Error deleting form: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        alert('Error deleting form');
    }
}

// Exportar a CSV
function exportCSV() {
    const token = localStorage.getItem('adminToken');
    window.open(`${API_URL}/export/csv?token=${token}`, '_blank');
}

// Refrescar datos
function refreshData() {
    const searchValue = document.getElementById('searchInput').value;
    loadStats();
    loadForms(currentPage, searchValue);
}

// 🔐 Logout (opcional, agregar botón en el HTML)
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login.html';
}
