const Form = require('../models/form.model');
const { generateToken } = require('../utils/token-generator');
const emailService = require('../services/email.service');

// Guardar nuevo formulario
exports.submitForm = async (req, res) => {
    try {
        console.log('📝 [CONTROLLER] submitForm iniciado');
        
        let formData;
        // 🔥 CORRECCIÓN: Parsing robusto para capturar el JSON dentro del FormData
        if (req.body.data && typeof req.body.data === 'string') {
            const parsedBody = JSON.parse(req.body.data);
            formData = parsedBody.formData;
            console.log('📦 [CONTROLLER] JSON parseado desde FormData');
        } else {
            formData = req.body.formData;
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

        // 🔥 CORRECCIÓN: Inyectar las URLs de Cloudinary en el objeto formData
        if (!formData.page1) formData.page1 = {};
        formData.page1.uploadedLogos = uploadedLogos;
        formData.page1.designReferenceImages = designReferenceImages;

        const token = generateToken();
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
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
                formData: JSON.parse(JSON.stringify(formData)), // Copia profunda para historial
                editedAt: new Date(),
                ipAddress: ipAddress,
                userAgent: userAgent,
                changes: {}
            }]
        });
        
        await newForm.save();
        console.log('✅ [CONTROLLER] Formulario guardado con token:', token);
        
        const editLink = `${process.env.FRONTEND_URL}/?token=${token}`;
        const managers = formData.page2?.managers || [];
        const companyName = formData.page1?.companyName || 'N/A';
        const { logoOption, designReferenceText } = formData.page1;

        emailService.sendEditLinkEmail(email, companyName, editLink, managers, logoOption, designReferenceText)
            .then(() => console.log('✅ Email enviado al usuario:', email))
            .catch(err => console.error('❌ Error enviando email:', err));
        
        emailService.sendAdminNotification(companyName, email, token, managers, logoOption, designReferenceText)
            .then(() => console.log('✅ Notificación enviada al admin'))
            .catch(err => console.error('❌ Error enviando notificación:', err));
        
        res.json({
            success: true,
            token,
            editLink,
            version: 1,
            message: 'Formulario guardado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al guardar formulario:', error);
        res.status(500).json({ success: false, message: 'Error al guardar el formulario', error: error.message });
    }
};

// Obtener datos para editar
exports.getForm = async (req, res) => {
    try {
        const { token } = req.params;
        console.log('📥 [CONTROLLER] getForm iniciado');
        const form = await Form.findOne({ token });
        
        if (!form) {
            return res.status(404).json({ success: false, message: 'Formulario no encontrado o expirado' });
        }
        
        res.json({
            success: true,
            formData: form.formData,
            currentVersion: form.currentVersion,
            editCount: form.editCount,
            createdAt: form.createdAt,
            lastEditedAt: form.lastEditedAt
        });
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al obtener formulario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el formulario' });
    }
};

// Actualizar formulario existente
exports.updateForm = async (req, res) => {
    try {
        console.log('🔄 [CONTROLLER] updateForm iniciado');
        
        let token, formData;
        if (req.body.data && typeof req.body.data === 'string') {
            const parsedBody = JSON.parse(req.body.data);
            token = parsedBody.token;
            formData = parsedBody.formData;
        } else {
            token = req.body.token;
            formData = req.body.formData;
        }
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const form = await Form.findOne({ token });
        
        if (!form) {
            return res.status(404).json({ success: false, message: 'Formulario no encontrado o expirado' });
        }

        const oldFormData = JSON.parse(JSON.stringify(form.formData));
        
        // 🖼️ 🔥 CORRECCIÓN: PROCESAR IMÁGENES EN UPDATE (Mantener antiguas si no hay nuevas)
        let currentLogos = form.formData.page1?.uploadedLogos || [];
        let currentRefs = form.formData.page1?.designReferenceImages || [];

        if (req.files) {
            if (req.files['logoFiles'] && req.files['logoFiles'].length > 0) {
                currentLogos = req.files['logoFiles'].map(f => f.path);
                console.log('📁 Nuevos logos detectados en update');
            }
            if (req.files['referenceFiles'] && req.files['referenceFiles'].length > 0) {
                currentRefs = req.files['referenceFiles'].map(f => f.path);
                console.log('📁 Nuevas referencias detectadas en update');
            }
        }

        // 🔥 CORRECCIÓN: Fusión de datos para no perder imágenes anteriores
        const updatedFormData = {
            page1: { 
                ...form.formData.page1, 
                ...formData.page1,
                uploadedLogos: currentLogos,
                designReferenceImages: currentRefs
            },
            page2: formData.page2 !== undefined ? formData.page2 : form.formData.page2
        };
        
        const changes = detectChanges(oldFormData, updatedFormData);
        const newVersion = form.currentVersion + 1;
        
        form.versions.push({
            versionNumber: newVersion,
            formData: JSON.parse(JSON.stringify(updatedFormData)),
            editedAt: new Date(),
            ipAddress,
            userAgent,
            changes
        });
        
        form.formData = updatedFormData;
        form.currentVersion = newVersion;
        form.lastEditedAt = new Date();
        form.editCount += 1;
        
        const newEmail = formData.page2?.managers?.[0]?.email;
        if (newEmail) form.email = newEmail;
        
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
        res.status(500).json({ success: false, message: 'Error al actualizar el formulario' });
    }
};

// Función para detectar cambios entre versiones
function detectChanges(oldData, newData) {
    const changes = {};
    const page1Fields = ['companyName', 'facebook', 'instagram', 'twitter', 'other', 'logoOption', 'designReferenceText'];
    
    page1Fields.forEach(field => {
        const oldValue = oldData.page1?.[field] || '';
        const newValue = newData.page1?.[field] || '';
        if (oldValue !== newValue) {
            changes[`page1.${field}`] = { old: oldValue || '(empty)', new: newValue || '(empty)' };
        }
    });

    ['uploadedLogos', 'designReferenceImages'].forEach(imgField => {
        const oldLen = oldData.page1?.[imgField]?.length || 0;
        const newLen = newData.page1?.[imgField]?.length || 0;
        if (oldLen !== newLen) {
            changes[`page1.${imgField}`] = { old: `${oldLen} images`, new: `${newLen} images` };
        }
    });

    const oldManagers = oldData.page2?.managers || [];
    const newManagers = newData.page2?.managers || [];
    
    if (oldManagers.length !== newManagers.length) {
        changes['page2.managers.count'] = { old: `${oldManagers.length} manager(s)`, new: `${newManagers.length} manager(s)` };
    }
    
    const maxLength = Math.max(oldManagers.length, newManagers.length);
    for (let i = 0; i < maxLength; i++) {
        const oldM = oldManagers[i];
        const newM = newManagers[i];
        if (oldM && !newM) { changes[`page2.managers[${i}]`] = { old: oldM.fullname, new: '(removed)' }; continue; }
        if (!oldM && newM) { changes[`page2.managers[${i}]`] = { old: '(new)', new: newM.fullname }; continue; }
        
        if (oldM && newM) {
            ['username', 'fullname', 'role', 'email', 'password'].forEach(f => {
                const oldV = oldM[f] || '';
                const newV = newM[f] || '';
                if (oldV !== newV) {
                    changes[`page2.managers[${i}].${f}`] = {
                        old: f === 'password' ? '(hidden)' : oldV || '(empty)',
                        new: f === 'password' ? '(hidden)' : newV || '(empty)'
                    };
                }
            });
        }
    }
    return changes;
}

// Historial de cambios
exports.getFormHistory = async (req, res) => {
    try {
        const { token } = req.params;
        const form = await Form.findOne({ token });
        if (!form) return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
        
        res.json({
            success: true,
            history: {
                token: form.token,
                email: form.email,
                currentVersion: form.currentVersion,
                totalEdits: form.editCount,
                versions: form.versions.map(v => ({
                    version: v.versionNumber,
                    editedAt: v.editedAt,
                    changes: v.changes
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el historial' });
    }
};