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
        type: Object,
        required: true
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
                if (newData[page][key] !== oldData[page][key]) {
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
