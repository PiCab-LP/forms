const mongoose = require('mongoose');

// Schema para cada versión del formulario
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
    
    formData: {
        page1: {
            // Campos de redes sociales
            companyName: { type: String, default: '' },
            facebook: { type: String, default: '' },
            instagram: { type: String, default: '' },
            twitter: { type: String, default: '' },
            other: { type: String, default: '' },

            // CAMPOS ESTRUCTURADOS DE ROOM DETAILS
            cashoutLimit: { type: String, default: '' },
            minDeposit: { type: String, default: '' },
            scheduleOption: { type: String, default: '' }, // '24/7' o 'custom'
            customSchedule: { type: String, default: '' }, // "14:00 to 21:00"
            telegramPhone: { type: String, default: '' }, // 10 dígitos

            // 🔥 NUEVOS CAMPOS: TIERLOCK INFORMATION
            tierlockPhone: { type: String, default: '' },
            tierlockUsername: { type: String, default: '' },

            // SECCIÓN: LOGOS
            logoOption: { 
                type: String, 
                enum: ['has-logo', 'needs-logo', 'none'], 
                default: 'none' 
            },
            uploadedLogos: { type: [String], default: [] },
            designReferenceText: { type: String, default: '' },
            designReferenceImages: { type: [String], default: [] }
        },
        
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

// Método para comparar cambios entre versiones
formSchema.methods.detectChanges = function(newData) {
    const changes = {};
    const oldData = this.formData;
    
    ['page1', 'page2'].forEach(page => {
        if (newData[page] && oldData[page]) {
            Object.keys(newData[page]).forEach(key => {
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