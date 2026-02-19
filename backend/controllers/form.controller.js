const Form = require('../models/form.model');
const { generateToken } = require('../utils/token-generator');
const emailService = require('../services/email.service');

// Guardar nuevo formulario
exports.submitForm = async (req, res) => {
    try {
        console.log('📝 [CONTROLLER] submitForm iniciado');
        
        // 🔥 CORRECCIÓN PARA ARCHIVOS:
        // Cuando envías imágenes, el frontend manda el JSON en req.body.data como string.
        let { formData } = req.body;
        if (req.body.data && typeof req.body.data === 'string') {
            const parsedBody = JSON.parse(req.body.data);
            formData = parsedBody.formData;
            console.log('📦 [CONTROLLER] JSON parseado desde FormData');
        }

        // 🖼️ EXTRAER URLS DE CLOUDINARY
        const uploadedLogos = [];
        const designReferenceImages = [];

        if (req.files) {
            console.log('📁 [CONTROLLER] Procesando archivos recibidos...');
            if (req.files['logoFiles']) {
                req.files['logoFiles'].forEach(file => uploadedLogos.push(file.path));
                console.log(`✅ Logos cargados: ${uploadedLogos.length}`);
            }
            if (req.files['referenceFiles']) {
                req.files['referenceFiles'].forEach(file => designReferenceImages.push(file.path));
                console.log(`✅ Referencias cargadas: ${designReferenceImages.length}`);
            }
        }

        // Inyectar las URLs en el objeto formData
        if (!formData.page1) formData.page1 = {};
        formData.page1.uploadedLogos = uploadedLogos;
        formData.page1.designReferenceImages = designReferenceImages;

        const token = generateToken();
        
        // Capturar metadata del cliente
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        // Token expira en 30 días
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        // Obtener el email del primer manager
        const email = formData.page2?.managers?.[0]?.email || 'no-email@provided.com';
        
        const newForm = new Form({
            token,
            formData,
            email: email,
            expiresAt,
            currentVersion: 1,
            metadata: {
                firstSubmitIP: ipAddress,
                firstSubmitUserAgent: userAgent
            },
            versions: [{
                versionNumber: 1,
                formData: formData,
                editedAt: new Date(),
                ipAddress: ipAddress,
                userAgent: userAgent,
                changes: {}
            }]
        });
        
        await newForm.save();
        
        console.log('✅ [CONTROLLER] Formulario guardado con token:', token);
        
        const editLink = `${process.env.FRONTEND_URL}/?token=${token}`;
        
        // Enviar emails
        const managers = formData.page2?.managers || [];
        const companyName = formData.page1?.companyName || 'N/A';
        
        emailService.sendEditLinkEmail(email, companyName, editLink, managers)
            .then(() => console.log('✅ Email enviado al usuario:', email))
            .catch(err => console.error('❌ Error enviando email al usuario:', err));
        
        emailService.sendAdminNotification(companyName, email, token, managers)
            .then(() => console.log('✅ Notificación enviada al admin'))
            .catch(err => console.error('❌ Error enviando notificación al admin:', err));
        
        res.json({
            success: true,
            token,
            editLink,
            version: 1,
            message: 'Formulario guardado exitosamente'
        });
        
        console.log('✅ [CONTROLLER] Respuesta enviada al cliente');
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al guardar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar el formulario',
            error: error.message
        });
    }
};

// Obtener datos para editar (Sin cambios, pero manteniendo tus logs CORS)
exports.getForm = async (req, res) => {
    try {
        const { token } = req.params;
        
        console.log('📥 [CONTROLLER] getForm iniciado');
        console.log('  Token recibido:', token);
        console.log('  Origin header:', req.headers.origin);
        
        const form = await Form.findOne({ token });
        
        if (!form) {
            console.log('❌ [CONTROLLER] Formulario NO encontrado para token:', token);
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado o expirado'
            });
        }
        
        console.log('✅ [CONTROLLER] Formulario encontrado');
        console.log('  ID:', form._id);
        console.log('  Company:', form.formData?.page1?.companyName);
        console.log('  Email:', form.email);
        console.log('  Version:', form.currentVersion);
        
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        const responseData = {
            success: true,
            formData: form.formData,
            currentVersion: form.currentVersion,
            editCount: form.editCount,
            createdAt: form.createdAt,
            lastEditedAt: form.lastEditedAt
        };
        
        console.log('📤 [CONTROLLER] Enviando respuesta al cliente');
        console.log('  Response size:', JSON.stringify(responseData).length, 'bytes');
        
        res.json(responseData);
        
        console.log('✅ [CONTROLLER] Respuesta enviada exitosamente');
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al obtener formulario:', error);
        console.error('  Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el formulario'
        });
    }
};

// Actualizar formulario existente (Corregido para manejar imágenes)
exports.updateForm = async (req, res) => {
    try {
        console.log('🔄 [CONTROLLER] updateForm iniciado');
        
        // 🔥 CORRECCIÓN PARA ARCHIVOS EN UPDATE
        let { token, formData } = req.body;
        if (req.body.data && typeof req.body.data === 'string') {
            const parsedBody = JSON.parse(req.body.data);
            token = parsedBody.token;
            formData = parsedBody.formData;
        }
        
        console.log('📦 Token recibido:', token);
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const form = await Form.findOne({ token });
        
        if (!form) {
            console.error('❌ Formulario no encontrado con token:', token);
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado o expirado'
            });
        }
        
        console.log('✅ Formulario encontrado:', form._id);
        
        // Guardar datos anteriores para detectar cambios
        const oldFormData = JSON.parse(JSON.stringify(form.formData));
        
        // 🖼️ PROCESAR NUEVAS IMÁGENES EN UPDATE
        if (req.files) {
            if (req.files['logoFiles']) {
                formData.page1.uploadedLogos = req.files['logoFiles'].map(f => f.path);
            }
            if (req.files['referenceFiles']) {
                formData.page1.designReferenceImages = req.files['referenceFiles'].map(f => f.path);
            }
        } else {
            // Si no subieron fotos nuevas, mantenemos las actuales
            formData.page1.uploadedLogos = form.formData.page1?.uploadedLogos || [];
            formData.page1.designReferenceImages = form.formData.page1?.designReferenceImages || [];
        }

        // IMPORTANTE: Hacer merge profundo permitiendo valores vacíos
        const updatedFormData = {
            page1: {
                ...form.formData.page1, // Mantenemos lo viejo
                ...formData.page1       // Sobrescribimos con lo nuevo (incluyendo las nuevas URLs)
            },
            page2: formData.page2 !== undefined ? formData.page2 : form.formData.page2
        };
        
        console.log('📋 Datos DESPUÉS del merge:', updatedFormData);
        
        const changes = detectChanges(oldFormData, updatedFormData);
        console.log('🔍 Cambios detectados:', changes);
        
        const newVersion = form.currentVersion + 1;
        
        form.versions.push({
            versionNumber: newVersion,
            formData: updatedFormData,
            editedAt: new Date(),
            ipAddress: ipAddress,
            userAgent: userAgent,
            changes: changes
        });
        
        form.formData = updatedFormData;
        form.currentVersion = newVersion;
        form.lastEditedAt = new Date();
        form.editCount += 1;
        
        const newEmail = formData.page2?.managers?.[0]?.email;
        if (newEmail) {
            form.email = newEmail;
        }
        
        await form.save();
        
        console.log('✅ Formulario actualizado exitosamente. Nueva versión:', newVersion);
        
        res.json({
            success: true,
            message: 'Formulario actualizado exitosamente',
            version: newVersion,
            editLink: `${process.env.FRONTEND_URL}/?token=${token}`,
            changesDetected: Object.keys(changes).length > 0
        });
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al actualizar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el formulario'
        });
    }
};

// --- Mantenemos tus funciones de detectChanges y getFormHistory intactas ---

function detectChanges(oldData, newData) {
    const changes = {};

    // Comparar page1 (social networks + logos)
    const page1Fields = ['companyName', 'facebook', 'instagram', 'twitter', 'other', 'logoOption', 'designReferenceText'];
    page1Fields.forEach(field => {
        const oldValue = oldData.page1?.[field] || '';
        const newValue = newData.page1?.[field] || '';
        
        if (oldValue !== newValue) {
            changes[`page1.${field}`] = {
                old: oldValue || '(empty)',
                new: newValue || '(empty)'
            };
        }
    });

    // Comparar cantidad de imágenes (cambio simplificado para tus logs)
    ['uploadedLogos', 'designReferenceImages'].forEach(imgField => {
        const oldLen = oldData.page1?.[imgField]?.length || 0;
        const newLen = newData.page1?.[imgField]?.length || 0;
        if (oldLen !== newLen) {
            changes[`page1.${imgField}`] = { old: `${oldLen} images`, new: `${newLen} images` };
        }
    });

    // Tu lógica original para managers
    const oldManagers = oldData.page2?.managers || [];
    const newManagers = newData.page2?.managers || [];
    
    if (oldManagers.length !== newManagers.length) {
        changes['page2.managers.count'] = {
            old: `${oldManagers.length} manager(s)`,
            new: `${newManagers.length} manager(s)`
        };
    }
    
    const maxLength = Math.max(oldManagers.length, newManagers.length);
    for (let i = 0; i < maxLength; i++) {
        const oldManager = oldManagers[i];
        const newManager = newManagers[i];
        if (oldManager && !newManager) {
            changes[`page2.managers[${i}]`] = { old: oldManager.fullname, new: '(removed)' };
            continue;
        }
        if (!oldManager && newManager) {
            changes[`page2.managers[${i}]`] = { old: '(new)', new: newManager.fullname };
            continue;
        }
        
        const managerFields = ['username', 'fullname', 'role', 'email', 'password'];
        managerFields.forEach(field => {
            const oldValue = oldManager[field] || '';
            const newValue = newManager[field] || '';
            if (oldValue !== newValue) {
                changes[`page2.managers[${i}].${field}`] = {
                    old: field === 'password' ? '(hidden)' : oldValue || '(empty)',
                    new: field === 'password' ? '(hidden)' : newValue || '(empty)'
                };
            }
        });
    }

    return changes;
}

exports.getFormHistory = async (req, res) => {
    try {
        console.log('📜 [CONTROLLER] getFormHistory iniciado');
        const { token } = req.params;
        const form = await Form.findOne({ token });
        
        if (!form) {
            return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
        }
        
        res.json({
            success: true,
            history: {
                token: form.token,
                email: form.email,
                currentVersion: form.currentVersion,
                totalEdits: form.editCount,
                createdAt: form.createdAt,
                lastEditedAt: form.lastEditedAt,
                expiresAt: form.expiresAt,
                firstSubmitInfo: form.metadata,
                versions: form.versions.map(v => ({
                    version: v.versionNumber,
                    editedAt: v.editedAt,
                    ipAddress: v.ipAddress,
                    userAgent: v.userAgent,
                    changes: v.changes
                }))
            }
        });
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al obtener historial:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el historial' });
    }
};