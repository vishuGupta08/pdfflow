import express from 'express';
import nodemailer from 'nodemailer';
import Joi from 'joi';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Validation schema for feedback
const feedbackSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  subject: Joi.string().min(5).max(100).required(),
  message: Joi.string().min(10).max(1000).required(),
  rating: Joi.number().integer().min(1).max(5).optional()
});

// Configure nodemailer transporter
const createTransporter = () => {
  // Check if we have email credentials configured
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  console.log('🔍 Email configuration check:', {
    emailUser: emailUser ? `${emailUser.substring(0, 5)}...` : 'undefined',
    emailPass: emailPass ? `${'*'.repeat(emailPass.length)}` : 'undefined',
    nodeEnv: process.env.NODE_ENV
  });
  
  if (!emailUser || !emailPass) {
    console.warn('Email credentials not configured. Feedback emails will not be sent.');
    return null;
  }

  // For development/testing - use Ethereal (fake SMTP)
  if (process.env.NODE_ENV === 'development' && emailUser === 'test') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  // Production Gmail configuration
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// POST /api/feedback - Submit feedback
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback data',
        details: error.details[0].message
      });
    }

    const { name, email, subject, message, rating } = value;

    // Create email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">📧 New Feedback - PDF Clinic</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
              ${subject}
            </h2>
            
            <div style="margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>👤 Name:</strong> ${name}</p>
              <p style="margin: 8px 0;"><strong>📧 Email:</strong> ${email}</p>
              ${rating ? `<p style="margin: 8px 0;"><strong>⭐ Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>` : ''}
              <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">💬 Message:</h3>
              <p style="line-height: 1.6; color: #555; white-space: pre-wrap;">${message}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>📝 Note:</strong> This feedback was submitted through the PDF Clinic application.
                You can reply directly to this email to respond to the user.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const textContent = `
New Feedback - PDF Clinic

Subject: ${subject}
Name: ${name}
Email: ${email}
${rating ? `Rating: ${rating}/5 stars` : ''}
Date: ${new Date().toLocaleString()}

Message:
${message}

---
This feedback was submitted through the PDF Clinic application.
You can reply directly to this email to respond to the user.
    `;

    // Create transporter
    const transporter = createTransporter();
    
    if (!transporter) {
      // If email is not configured, save feedback to file
      const feedbackData = {
        timestamp: new Date().toISOString(),
        name,
        email,
        subject,
        message,
        rating,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };
      
      try {
        const feedbackDir = path.join(__dirname, '../../feedback');
        if (!fs.existsSync(feedbackDir)) {
          fs.mkdirSync(feedbackDir, { recursive: true });
        }
        
        const filename = `feedback-${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(feedbackDir, filename);
        
        let existingFeedback = [];
        if (fs.existsSync(filepath)) {
          existingFeedback = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        }
        
        existingFeedback.push(feedbackData);
        fs.writeFileSync(filepath, JSON.stringify(existingFeedback, null, 2));
        
        console.log('📧 Feedback saved to file:', filepath);
      } catch (fileError) {
        console.error('Failed to save feedback to file:', fileError);
      }
      
      console.log('📧 Feedback received (email not configured):', { name, email, subject, rating });
      return res.json({
        success: true,
        message: 'Feedback received successfully! Thank you for your input.'
      });
    }

    // Email options
    const mailOptions = {
      from: `"PDF Clinic Feedback" <${process.env.EMAIL_USER || 'noreply@pdfclinic.org'}>`,
      to: 'vishu.gupta.dtu@gmail.com',
      replyTo: email, // Allow direct reply to user
      subject: `[PDF Clinic] ${subject}`,
      text: textContent,
      html: htmlContent
    };

    try {
      // Send email
      await transporter.sendMail(mailOptions);
      console.log('✅ Feedback email sent successfully to admin');
    } catch (emailError) {
      console.error('❌ Failed to send admin email:', emailError);
      // Continue execution - we'll still try to send confirmation to user
    }

    // Send confirmation email to user
    const confirmationMailOptions = {
      from: `"PDF Clinic" <${process.env.EMAIL_USER || 'noreply@pdfclinic.org'}>`,
      to: email,
      subject: 'Thank you for your feedback - PDF Clinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🙏 Thank You!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p>Hi ${name},</p>
              
              <p>Thank you for taking the time to share your feedback with PDF Clinic! Your input is valuable to us and helps us improve our service.</p>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; border-left: 4px solid #4caf50; margin: 20px 0;">
                <p style="margin: 0;"><strong>✅ Your feedback has been received</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">We'll review your message and get back to you if needed.</p>
              </div>
              
              <p>Best regards,<br>The PDF Clinic Team</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #888; text-align: center;">
                PDF Clinic - Professional PDF editing made simple everywhere
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(confirmationMailOptions);
      console.log('✅ Confirmation email sent successfully to user');
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
      // Don't fail the request if confirmation email fails
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully! Thank you for your input.'
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

export default router;
