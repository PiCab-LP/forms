const Form = require('../models/form.model');
const { generateToken } = require('../utils/token-generator');
const emailService = require('../services/email.service');


// Guardar nuevo formulario
exports.submitForm = async (req, res) => {
    try {
        const { formData } = req.body;
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
        
        const editLink = `${process.env.FRONTEND_URL}/?token=${token}`;
        
        // Enviar emails
        const managers = formData.page2?.managers || [];
        const companyName = formData.page1?.companyName || 'N/A';
        
        // Email al usuario (asíncrono, no bloquea la respuesta)
        emailService.sendEditLinkEmail(email, companyName, editLink, managers)
            .then(() => console.log('✅ Email enviado al usuario:', email))
            .catch(err => console.error('❌ Error enviando email al usuario:', err));
        
        // Email al admin (asíncrono, no bloquea la respuesta)
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
        
    } catch (error) {
        console.error('Error al guardar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar el formulario',
            error: error.message
        });
    }
};


// Obtener datos para editar
exports.getForm = async (req, res) => {
    try {
        const { token } = req.params;
        
        const form = await Form.findOne({ token });
        
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado o expirado'
            });
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
        console.error('Error al obtener formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el formulario'
        });
    }
};


// Actualizar formulario existente
// Actualizar formulario existente
exports.updateForm = async (req, res) => {
    try {
        console.log('🔄 UPDATE FORM EJECUTADO');
        console.log('📦 Token recibido:', req.body.token);
        console.log('📊 Datos recibidos:', JSON.stringify(req.body.formData, null, 2));
        
        const { token, formData } = req.body;
        
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
        
        console.log('📋 Datos ANTES del update:', oldFormData);
        
        // IMPORTANTE: Hacer merge profundo permitiendo valores vacíos
        const updatedFormData = {
            page1: {
                companyName: formData.page1?.companyName !== undefined ? formData.page1.companyName : form.formData.page1?.companyName,
                facebook: formData.page1?.facebook !== undefined ? formData.page1.facebook : form.formData.page1?.facebook,
                instagram: formData.page1?.instagram !== undefined ? formData.page1.instagram : form.formData.page1?.instagram,
                twitter: formData.page1?.twitter !== undefined ? formData.page1.twitter : form.formData.page1?.twitter,
                other: formData.page1?.other !== undefined ? formData.page1.other : form.formData.page1?.other,
            },
            page2: formData.page2 !== undefined ? formData.page2 : form.formData.page2
        };
        
        console.log('📋 Datos DESPUÉS del merge:', updatedFormData);
        
        // Detectar cambios mejorado
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
        
        // Actualizar email si cambió el email del primer manager
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
        console.error('❌ Error al actualizar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el formulario'
        });
    }
};


// Función mejorada para detectar cambios (maneja arrays de managers)
function detectChanges(oldData, newData) {
    const changes = {};

    // Comparar page1 (social networks)
    const page1Fields = ['companyName', 'facebook', 'instagram', 'twitter', 'other'];
    page1Fields.forEach(field => {
        const oldValue = oldData.page1?.[field] || '';
        const newValue = newData.page1?.[field] || '';
        
        if (oldValue !== newValue) {
            changes[`page1.${field}`] = {
                old: oldValue,
                new: newValue
            };
        }
    });

    // Comparar page2 (managers) - convertir a JSON para comparar arrays
    const oldManagers = JSON.stringify(oldData.page2?.managers || []);
    const newManagers = JSON.stringify(newData.page2?.managers || []);
    
    if (oldManagers !== newManagers) {
        changes['page2.managers'] = {
            old: `${(oldData.page2?.managers || []).length} manager(s)`,
            new: `${(newData.page2?.managers || []).length} manager(s)`
        };
    }

    return changes;
}


// Obtener historial completo
exports.getFormHistory = async (req, res) => {
    try {
        const { token } = req.params;
        
        const form = await Form.findOne({ token });
        
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado'
            });
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
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial'
        });
    }
};
