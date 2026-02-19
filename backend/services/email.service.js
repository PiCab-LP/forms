const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

// Verificar configuración
if (APPS_SCRIPT_URL) {
    console.log('✅ Google Apps Script email service configurado');
} else {
    console.log('❌ APPS_SCRIPT_URL no configurada');
}

/**
 * Enviar email al usuario con link de edición y estatus de logo
 */
const sendEditLinkEmail = async (email, companyName, editLink, managers, logoOption, designText) => {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'user',
                email,
                companyName,
                editLink,
                managers,
                logoOption, // 🔥 Enviado a Apps Script
                designText  // 🔥 Enviado a Apps Script
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Email enviado al usuario:', email);
            return { success: true };
        } else {
            console.error('❌ Error enviando email:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('❌ Error enviando email al usuario:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Enviar notificación al admin con detalles del nuevo logo/referencias
 */
const sendAdminNotification = async (companyName, email, token, managers, logoOption, designText) => {
    try {
        const adminLink = `${process.env.FRONTEND_URL}/admin/form-details?token=${token}`;
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'admin',
                companyName,
                email,
                token,
                managers,
                adminLink,
                logoOption, // 🔥 Informa al admin si debe diseñar o no
                designText  // 🔥 Instrucciones directas al correo
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Notificación enviada al admin');
            return { success: true };
        } else {
            console.error('❌ Error enviando notificación:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('❌ Error enviando notificación al admin:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendEditLinkEmail,
    sendAdminNotification
};