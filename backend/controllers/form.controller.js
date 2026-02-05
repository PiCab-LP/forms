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
exports.updateForm = async (req, res) => {
    try {
        const { token, formData } = req.body;
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const form = await Form.findOne({ token });
        
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado o expirado'
            });
        }
        
        const changes = form.detectChanges(formData);
        const newVersion = form.currentVersion + 1;
        
        form.versions.push({
            versionNumber: newVersion,
            formData: formData,
            editedAt: new Date(),
            ipAddress: ipAddress,
            userAgent: userAgent,
            changes: changes
        });
        
        form.formData = formData;
        form.currentVersion = newVersion;
        form.lastEditedAt = new Date();
        form.editCount += 1;
        
        // Actualizar email si cambió el email del primer manager
        const newEmail = formData.page2?.managers?.[0]?.email;
        if (newEmail) {
            form.email = newEmail;
        }
        
        await form.save();
        
        res.json({
            success: true,
            message: 'Formulario actualizado exitosamente',
            version: newVersion,
            editLink: `${process.env.FRONTEND_URL}/?token=${token}`,
            changesDetected: Object.keys(changes).length > 0
        });
        
    } catch (error) {
        console.error('Error al actualizar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el formulario'
        });
    }
};

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
