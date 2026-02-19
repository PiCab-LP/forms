function generatePDF(formData) {
    console.log('=== Generando PDF ===');
    console.log('Datos completos:', formData);
    
    if (typeof window.jspdf === 'undefined') {
        alert('Error: jsPDF no está cargado');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPosition = 20;
    
    // Título
    doc.setFontSize(22);
    doc.setTextColor(51, 51, 51);
    doc.text('Wysaro Gaming', 105, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(16);
    doc.setTextColor(102, 126, 234);
    doc.text('Form Submission Report', 105, yPosition, { align: 'center' });
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, 105, yPosition, { align: 'center' });
    
    yPosition += 5;
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    
    yPosition += 15;
    
    // Company Information
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Company Information', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(11);
    doc.setTextColor(102, 102, 102);
    doc.text('Company Name:', 25, yPosition);
    doc.setTextColor(102, 126, 234);
    doc.setFontSize(12);
    doc.text(formData.page1?.companyName || 'N/A', 60, yPosition);
    
    yPosition += 12;

    // 🔥 NUEVA SECCIÓN: Logo Identity
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Logo Identity', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    const logoOpt = formData.page1?.logoOption;
    let logoStatus = 'Not specified';
    
    if (logoOpt === 'has-logo') {
        logoStatus = 'Already has a logo (Files uploaded to the system)';
    } else if (logoOpt === 'needs-logo') {
        logoStatus = 'Requested a new logo to be created';
    }

    doc.setTextColor(102, 102, 102);
    doc.text('Preference:', 25, yPosition);
    doc.setTextColor(102, 126, 234);
    doc.text(logoStatus, 50, yPosition);
    
    // Si pidió diseño, agregar las instrucciones de texto
    if (logoOpt === 'needs-logo' && formData.page1?.designReferenceText) {
        yPosition += 7;
        doc.setTextColor(102, 102, 102);
        doc.text('Instructions:', 25, yPosition);
        doc.setTextColor(51, 51, 51);
        
        // Ajuste de texto automático por si la descripción es muy larga
        const splitText = doc.splitTextToSize(formData.page1.designReferenceText, 130);
        doc.text(splitText, 50, yPosition);
        yPosition += (splitText.length * 5); 
    } else {
        yPosition += 8;
    }
    
    yPosition += 10;
    
    // Social Networks
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Social Networks', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    
    if (formData.page1) {
        const socials = [
            { label: 'Facebook:', key: 'facebook' },
            { label: 'Instagram:', key: 'instagram' },
            { label: 'X (Twitter):', key: 'twitter' },
            { label: 'Other:', key: 'other' }
        ];

        socials.forEach(social => {
            if (formData.page1[social.key]) {
                doc.text(social.label, 25, yPosition);
                doc.setTextColor(102, 126, 234);
                doc.text(formData.page1[social.key], 50, yPosition);
                doc.setTextColor(51, 51, 51);
                yPosition += 6;
            }
        });
    } else {
        doc.setTextColor(153, 153, 153);
        doc.text('No social networks provided', 25, yPosition);
        yPosition += 6;
    }
    
    yPosition += 10;
    
    // Backend Managers
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Backend Managers', 20, yPosition);
    
    yPosition += 10;
    
    if (formData.page2 && formData.page2.managers && formData.page2.managers.length > 0) {
        formData.page2.managers.forEach((manager, index) => {
            doc.setFillColor(102, 126, 234);
            doc.rect(20, yPosition - 5, 170, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.text(`Manager #${index + 1}`, 25, yPosition);
            
            yPosition += 10;
            doc.setFontSize(10);
            doc.setTextColor(51, 51, 51);
            
            const fields = [
                { l: 'Username:', v: manager.username },
                { l: 'Full Name:', v: manager.fullname },
                { l: 'Role:', v: manager.role },
                { l: 'Email:', v: manager.email },
                { l: 'Password:', v: manager.password }
            ];

            fields.forEach(f => {
                doc.text(f.l, 25, yPosition);
                doc.text(f.v || 'N/A', 60, yPosition);
                yPosition += 7;
            });

            yPosition += 5;
            
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
        });
    } else {
        doc.setTextColor(153, 153, 153);
        doc.text('No managers added', 25, yPosition);
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(153, 153, 153);
        doc.text('Wysaro Gaming Form System', 105, 285, { align: 'center' });
        doc.text(`Document ID: WYS-${Date.now()}`, 105, 290, { align: 'center' });
    }
    
    const companyName = formData.page1?.companyName || 'Submission';
    const filename = `Wysaro-${companyName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    doc.save(filename);
}