const Form = require('../models/form.model');

// Obtener todos los formularios (con paginación y búsqueda)
exports.getAllForms = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
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
            // 🔥 ACTUALIZADO: Seleccionamos logoOption para mostrar badges en la tabla principal
            .select('token email formData.page1.companyName formData.page1.logoOption createdAt lastEditedAt editCount currentVersion');
        
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
        
        // 🔥 NUEVA ESTADÍSTICA: Cuántos necesitan diseño de logo
        const needsLogoDesign = await Form.countDocuments({
            'formData.page1.logoOption': 'needs-logo'
        });

        const formsThisMonth = await Form.countDocuments({
            createdAt: {
                $gte: new Date(new Date().setDate(1))
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
                needsLogoDesign, // Añadido a la respuesta
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
        
        // 🔥 ACTUALIZADO: Añadidas columnas de Logo Option, Links de Cloudinary y BONUS DETAILS
        let csv = 'Token,Company Name,Email,Logo Option,Logo/Ref Links,Created At,Last Edited,Edit Count,Managers Count,Birthday Bonus Amount,Birthday Min Deposit,Birthday Days Before,Match Percentage,Happy Hour Min,Happy Hour Max,Happy Hour Extra,Daily Bonus Min,Daily Bonus Max,Daily Bonus Extra,Trans Bonus Dig Money,Trans Bonus XP\n';
        
        forms.forEach(form => {
            const companyName = form.formData?.page1?.companyName || 'N/A';
            const logoOption = form.formData?.page1?.logoOption || 'none';
            const managersCount = form.formData?.page2?.managers?.length || 0;
            
            // Recolectamos todos los links de imágenes disponibles (ya sean logos o referencias)
            const imgLinks = [
                ...(form.formData?.page1?.uploadedLogos || []),
                ...(form.formData?.page1?.designReferenceImages || [])
            ].join(' | ');
            
            // Bonus Details
            const bAmount = form.formData?.page1?.birthdayBonusAmount || 'N/A';
            const bMinDep = form.formData?.page1?.birthdayMinDeposit || 'N/A';
            const bDays = form.formData?.page1?.birthdayDaysBefore || 'N/A';
            const matchPct = form.formData?.page1?.matchBonusPercentage || 'N/A';
            const hhMin = form.formData?.page1?.happyHourMin || 'N/A';
            const hhMax = form.formData?.page1?.happyHourMax || 'N/A';
            const hhExtra = form.formData?.page1?.happyHourExtra || 'N/A';
            const dbMin = form.formData?.page1?.dailyBonusMin || 'N/A';
            const dbMax = form.formData?.page1?.dailyBonusMax || 'N/A';
            const dbExtra = form.formData?.page1?.dailyBonusExtra || 'N/A';
            const transDig = form.formData?.page1?.transBonusDigitalOptions || 'N/A';
            const transXP = form.formData?.page1?.transBonusXPOptions || 'N/A';
            
            csv += `"${form.token}","${companyName}","${form.email}","${logoOption}","${imgLinks}","${form.createdAt}","${form.lastEditedAt || 'Never'}","${form.editCount}","${managersCount}","${bAmount}","${bMinDep}","${bDays}","${matchPct}","${hhMin}","${hhMax}","${hhExtra}","${dbMin}","${dbMax}","${dbExtra}","${transDig}","${transXP}"\n`;
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