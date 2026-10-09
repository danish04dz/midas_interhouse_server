const nodemailer = require('nodemailer');

const sendEventManagerWelcomeEmail = async (email, name, password) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can change this based on your provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const loginLink = `${'https://midaswarts.netlify.app'}/login`;

    const mailOptions = {
      from: `"MIDAS Admin Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to MIDAS Event Management Team! 🎉',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Welcome Aboard, ${name}! 🚀</h2>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px;">We are absolutely thrilled to welcome you as an <strong>Event Manager</strong> for the MIDAS Inter-House Competition.</p>
            <p style="font-size: 16px;">Your expertise and leadership will be invaluable in making our upcoming events a massive success. Get ready to lead, inspire, and manage some amazing events!</p>
            
            <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 0 4px 4px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Your Account Credentials</h3>
              <p style="margin-bottom: 5px; font-size: 15px;"><strong>Email:</strong> ${email}</p>
              <p style="margin-bottom: 5px; font-size: 15px;"><strong>Password:</strong> ${password}</p>
              <p style="font-size: 13px; color: #6b7280; margin-top: 10px;"><em>(Note: For security and convenience, your password has been set to your mobile number. We recommend keeping it secure.)</em></p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Access Your Dashboard</a>
            </div>

            <p style="font-size: 15px; color: #4b5563;">If you face any issues logging in, please don't hesitate to reach out to the administrative team.</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Best Regards,</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #374151;">MIDAS Co-curricular Team</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully: ' + info.response);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

module.exports = {
  sendEventManagerWelcomeEmail,
};
