// src/routes/api/send-report-email/+server.js
// API endpoint to send work habit report via email

import { json } from '@sveltejs/kit';
import { sendReportEmail, sendEmail } from '$lib/server/emailService.js';
import { adminDb } from '$lib/server/firebase-admin.js';

export async function POST({ request }) {
    try {
        const { email, report, userId } = await request.json();

        // Validate input
        if (!email || !report) {
            return json({ 
                success: false, 
                error: 'Email and report data are required' 
            }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return json({ 
                success: false, 
                error: 'Invalid email format' 
            }, { status: 400 });
        }

        // Send the email
        const result = await sendReportEmail(email, report);

        if (result.success) {
            // Log the sent email
            if (adminDb && userId) {
                try {
                    await adminDb.ref(`emailLogs/${userId}`).push({
                        type: 'work_habit_report',
                        email,
                        reportId: report.meta?.reportId,
                        period: report.meta?.period?.label,
                        sentAt: new Date().toISOString(),
                        messageId: result.messageId
                    });
                } catch (logError) {
                    console.warn('Failed to log email:', logError);
                }
            }

            return json({ 
                success: true, 
                message: 'Report sent successfully',
                messageId: result.messageId
            });
        } else {
            return json({ 
                success: false, 
                error: result.error || 'Failed to send email'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in send-report-email API:', error);
        return json({ 
            success: false, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
