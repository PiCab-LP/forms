const mongoose = require('mongoose');

// Schema para cada versión del formulario
// (Este lo dejamos igual, guarda el historial tal cual llega)
const formVersionSchema = new mongoose.Schema({
    versionNumber: {
        type: Number,
        required: true
    },
    formData: {
        type: Object,
        required: true
    },
    editedAt: {
        type: Date,
        default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    changes: {
        type: Object,
        default: {}
    }
});

const formSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    currentVersion: {
        type: Number,
        default: 1
    },
    
    // 🔥 AQUÍ ESTÁ EL CAMBIO IMPORTANTE
    // Antes era "type: Object", ahora definimos la estructura de Page 1
    formData: {
        page1: {
            // Campos de redes sociales (según tu form actual)
            companyName: { type: String, default: '' },
            facebook: { type: String, default: '' },
            instagram: { type: String, default: '' },
            twitter: { type: String, default: '' },
            other: { type: String, default: '' },

            // 👇 NUEVA SECCIÓN: LOGOS
            logoOption: { 
                type: String, 
                enum: ['has-logo', 'needs-logo', 'none'], // Solo permite estos 3 valores
                default: 'none' 
            },
            // Array para guardar las URLs de Cloudinary (Opción 1: Ya tengo logo)
            uploadedLogos: { type: [String], default: [] },
            
            // Texto descriptivo (Opción 2: Necesito diseño)
            designReferenceText: { type: String, default: '' },
            
            // Array para guardar URLs de referencias (Opción 2: Necesito diseño)
            designReferenceImages: { type: [String], default: [] }
        },
        
        // Mantenemos Page 2 flexible (Object) para no romper tu lógica de managers actual
        page2: { 
            type: Object, 
            default: {} 
        }
    },

    email: {
        type: String,
        required: true
    },
    versions: [formVersionSchema],
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastEditedAt: {
        type: Date,
        default: Date.now
    },
    editCount: {
        type: Number,
        default: 0
    },
    metadata: {
        firstSubmitIP: String,
        firstSubmitUserAgent: String
    }
});

// Método para comparar cambios entre versiones (Sin cambios, sigue funcionando igual)
formSchema.methods.detectChanges = function(newData) {
    const changes = {};
    const oldData = this.formData;
    
    ['page1', 'page2'].forEach(page => {
        if (newData[page] && oldData[page]) {
            Object.keys(newData[page]).forEach(key => {
                // Comparamos valores. Nota: Al usar esquemas, oldData[page] es un documento Mongoose,
                // pero acceder a properties por [key] sigue funcionando.
                if (JSON.stringify(newData[page][key]) !== JSON.stringify(oldData[page][key])) {
                    if (!changes[page]) changes[page] = {};
                    changes[page][key] = {
                        old: oldData[page][key],
                        new: newData[page][key]
                    };
                }
            });
        }
    });
    
    return changes;
};

module.exports = mongoose.model('Form', formSchema);