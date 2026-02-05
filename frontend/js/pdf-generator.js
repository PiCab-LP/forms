function generatePDF(formData) {
    console.log('=== Generando PDF ===');
    console.log('Datos completos:', formData);
    
    // Verificar jsPDF
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
    
    // Línea separadora
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
    
    yPosition += 15;
    
    // Social Networks
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Social Networks', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    
    if (formData.page1) {
        if (formData.page1.facebook) {
            doc.text('Facebook:', 25, yPosition);
            doc.setTextColor(102, 126, 234);
            doc.text(formData.page1.facebook, 50, yPosition);
            doc.setTextColor(51, 51, 51);
            yPosition += 6;
        }
        if (formData.page1.instagram) {
            doc.text('Instagram:', 25, yPosition);
            doc.setTextColor(102, 126, 234);
            doc.text(formData.page1.instagram, 50, yPosition);
            doc.setTextColor(51, 51, 51);
            yPosition += 6;
        }
        if (formData.page1.twitter) {
            doc.text('X (Twitter):', 25, yPosition);
            doc.setTextColor(102, 126, 234);
            doc.text(formData.page1.twitter, 50, yPosition);
            doc.setTextColor(51, 51, 51);
            yPosition += 6;
        }
        if (formData.page1.other) {
            doc.text('Other:', 25, yPosition);
            doc.setTextColor(102, 126, 234);
            doc.text(formData.page1.other, 50, yPosition);
            doc.setTextColor(51, 51, 51);
            yPosition += 6;
        }
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
    
    // Crear tabla con managers
    if (formData.page2 && formData.page2.managers && formData.page2.managers.length > 0) {
        formData.page2.managers.forEach((manager, index) => {
            console.log(`Agregando Manager #${index + 1}:`, manager);
            
            // Título del manager
            doc.setFillColor(102, 126, 234);
            doc.rect(20, yPosition - 5, 170, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.text(`Manager #${index + 1}`, 25, yPosition);
            
            yPosition += 10;
            
            // Datos del manager
            doc.setFontSize(10);
            doc.setTextColor(51, 51, 51);
            
            doc.text('Username:', 25, yPosition);
            doc.text(manager.username, 60, yPosition);
            yPosition += 7;
            
            doc.text('Full Name:', 25, yPosition);
            doc.text(manager.fullname, 60, yPosition);
            yPosition += 7;
            
            doc.text('Role:', 25, yPosition);
            doc.text(manager.role, 60, yPosition);
            yPosition += 7;
            
            doc.text('Email:', 25, yPosition);
            doc.text(manager.email, 60, yPosition);
            yPosition += 7;
            
            doc.text('Password:', 25, yPosition);
            doc.text(manager.password, 60, yPosition);
            yPosition += 12;
            
            // Verificar si necesitamos nueva página
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
    
    // Guardar PDF
    const companyName = formData.page1?.companyName || 'Submission';
    const filename = `Wysaro-${companyName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    
    console.log('Guardando PDF:', filename);
    doc.save(filename);
}
