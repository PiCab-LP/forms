const Form = require('../models/form.model');

// Obtener todos los formularios (con paginación y búsqueda)
exports.getAllForms = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        // Crear filtro de búsqueda
        let query = {};
        if (search) {
            query = {
                $or: [
                    { 'formData.page1.companyName': { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { token: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const skip = (page - 1) * limit;
        
        const forms = await Form.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('token email formData.page1.companyName createdAt lastEditedAt editCount currentVersion');
        
        const total = await Form.countDocuments(query);
        
        res.json({
            success: true,
            data: forms,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Error al obtener formularios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los formularios'
        });
    }
};

// Obtener detalles completos de un formulario
exports.getFormDetails = async (req, res) => {
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
            data: form
        });
        
    } catch (error) {
        console.error('Error al obtener detalles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles del formulario'
        });
    }
};

// Obtener estadísticas generales
exports.getStats = async (req, res) => {
    try {
        const totalForms = await Form.countDocuments();
        const formsThisMonth = await Form.countDocuments({
            createdAt: {
                $gte: new Date(new Date().setDate(1)) // Primer día del mes
            }
        });
        
        const editedForms = await Form.countDocuments({
            editCount: { $gt: 0 }
        });
        
        const averageEdits = await Form.aggregate([
            {
                $group: {
                    _id: null,
                    avgEdits: { $avg: '$editCount' }
                }
            }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalForms,
                formsThisMonth,
                editedForms,
                averageEdits: averageEdits.length > 0 ? averageEdits[0].avgEdits.toFixed(2) : 0
            }
        });
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};

// Eliminar formulario
exports.deleteForm = async (req, res) => {
    try {
        const { token } = req.params;
        
        const form = await Form.findOneAndDelete({ token });
        
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Formulario eliminado exitosamente'
        });
        
    } catch (error) {
        console.error('Error al eliminar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el formulario'
        });
    }
};

// Exportar a CSV
exports.exportToCSV = async (req, res) => {
    try {
        const forms = await Form.find()
            .sort({ createdAt: -1 })
            .select('token email formData createdAt lastEditedAt editCount');
        
        // Crear CSV
        let csv = 'Token,Company Name,Email,Created At,Last Edited,Edit Count,Managers Count\n';
        
        forms.forEach(form => {
            const companyName = form.formData?.page1?.companyName || 'N/A';
            const managersCount = form.formData?.page2?.managers?.length || 0;
            
            csv += `"${form.token}","${companyName}","${form.email}","${form.createdAt}","${form.lastEditedAt || 'Never'}","${form.editCount}","${managersCount}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=wysaro-forms-${Date.now()}.csv`);
        res.send(csv);
        
    } catch (error) {
        console.error('Error al exportar CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Error al exportar datos'
        });
    }
};
