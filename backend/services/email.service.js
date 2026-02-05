const nodemailer = require('nodemailer');

// Configurar transporter usando 'service' en lugar de host/port
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificar conexión
transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Error en configuración de email:', error);
    } else {
        console.log('✅ Servidor de email listo');
    }
});

// Enviar email al usuario con link de edición
const sendEditLinkEmail = async (email, companyName, editLink, managers) => {
    try {
        const managersList = managers.map((m, i) => `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Manager #${i + 1}</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${m.username}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${m.email}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${m.role}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: `✅ Welcome to Wysaro Gaming - ${companyName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .info-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th { background: #667eea; color: white; padding: 10px; text-align: left; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to Wysaro Gaming!</h1>
                            <p>Your onboarding form has been submitted successfully</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${companyName}! 👋</h2>
                            <p>Thank you for completing your onboarding form. We're excited to have you on board!</p>
                            
                            <div class="info-box">
                                <h3>📝 Your Submission Details</h3>
                                <p><strong>Company Name:</strong> ${companyName}</p>
                                <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
                                <p><strong>Total Managers:</strong> ${managers.length}</p>
                            </div>

                            <h3>👥 Backend Managers Created:</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Manager</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${managersList}
                                </tbody>
                            </table>

                            <div class="info-box">
                                <h3>🔗 Edit Your Information</h3>
                                <p>You can edit your submission anytime using this secure link:</p>
                                <a href="${editLink}" class="button">Edit Form</a>
                                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                                    Or copy this link: <br>
                                    <code style="background: #e9ecef; padding: 5px; border-radius: 3px; word-break: break-all;">${editLink}</code>
                                </p>
                                <p style="font-size: 12px; color: #999;">⚠️ Keep this link safe. Anyone with this link can edit your information.</p>
                            </div>

                            <p>If you have any questions, please don't hesitate to contact us.</p>
                            <p>Best regards,<br><strong>Wysaro Gaming Team</strong></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado al usuario:', email);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Error enviando email al usuario:', error);
        return { success: false, error: error.message };
    }
};

// Enviar notificación al admin
const sendAdminNotification = async (companyName, email, token, managers) => {
    try {
        const adminLink = `${process.env.FRONTEND_URL}/admin/form-details.html?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `🎉 New Form Submission - ${companyName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .info-box { background: white; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 New Form Submission!</h1>
                        </div>
                        <div class="content">
                            <h2>New Client Onboarding</h2>
                            
                            <div class="info-box">
                                <p><strong>Company Name:</strong> ${companyName}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Managers Created:</strong> ${managers.length}</p>
                                <p><strong>Submission Date:</strong> ${new Date().toLocaleString()}</p>
                            </div>

                            <h3>Managers Summary:</h3>
                            <ul>
                                ${managers.map(m => `<li><strong>${m.fullname}</strong> (${m.role}) - ${m.email}</li>`).join('')}
                            </ul>

                            <a href="${adminLink}" class="button">View Full Details</a>

                            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                                Token: <code style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">${token}</code>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Notificación enviada al admin');
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Error enviando notificación al admin:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendEditLinkEmail,
    sendAdminNotification
};
