// src/routes/api/admin/feedback/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, PERMISSIONS } from '$lib/server/adminAuth.js';
import { adminDb } from '$lib/server/firebase-admin.js';

export async function GET({ request, url }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_FEEDBACK)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Check for export request
        const exportFormat = url.searchParams.get('export');
        
        if (!adminDb) {
            return json({ feedback: [], message: 'Database not configured' });
        }
        
        // Get users and admins for name lookup
        const [usersSnapshot, adminsSnapshot] = await Promise.all([
            adminDb.ref('users').once('value'),
            adminDb.ref('admins').once('value')
        ]);
        const users = usersSnapshot.exists() ? usersSnapshot.val() : {};
        const admins = adminsSnapshot.exists() ? adminsSnapshot.val() : {};
        
        const feedback = [];
        
        // Try /feedback collection
        const feedbackSnapshot = await adminDb.ref('feedback').once('value');
        if (feedbackSnapshot.exists()) {
            const feedbackData = feedbackSnapshot.val();
            for (const [id, item] of Object.entries(feedbackData)) {
                if (typeof item !== 'object' || !item) continue;
                
                const user = users[item.userId] || {};
                const assignedAdmin = item.assignedTo ? admins[item.assignedTo] : null;
                
                feedback.push({
                    id,
                    odId: id,
                    userId: item.userId,
                    userName: user.name || user.displayName || item.userName || item.name || 'Anonymous',
                    userEmail: user.email || item.email,
                    message: item.message || item.content || item.text || item.feedback || '',
                    subject: item.subject || item.title || '',
                    type: item.type || 'suggestion',
                    priority: item.priority || 'medium',
                    status: item.status || 'pending',
                    screenshotUrl: item.screenshotUrl || null,
                    deviceInfo: item.deviceInfo || null,
                    rating: item.rating || item.stars || null,
                    assignedTo: item.assignedTo || null,
                    assignedToName: assignedAdmin?.name || assignedAdmin?.email || null,
                    replies: item.replies || [],
                    createdAt: item.createdAt || item.timestamp || item.date || new Date().toISOString(),
                    updatedAt: item.updatedAt,
                    resolvedAt: item.resolvedAt || null,
                    resolvedBy: item.resolvedBy || null
                });
            }
        }
        
        // Also check /userFeedback/{userId}/{feedbackId} structure
        if (feedback.length === 0) {
            const userFeedbackSnapshot = await adminDb.ref('userFeedback').once('value');
            if (userFeedbackSnapshot.exists()) {
                const userFeedbackData = userFeedbackSnapshot.val();
                for (const [userId, userFeedbacks] of Object.entries(userFeedbackData)) {
                    if (typeof userFeedbacks !== 'object' || !userFeedbacks) continue;
                    
                    const user = users[userId] || {};
                    for (const [id, item] of Object.entries(userFeedbacks)) {
                        if (typeof item !== 'object' || !item) continue;
                        
                        const assignedAdmin = item.assignedTo ? admins[item.assignedTo] : null;
                        
                        feedback.push({
                            id: `${userId}_${id}`,
                            odId: id,
                            userId,
                            userName: user.name || user.displayName || item.userName || 'Anonymous',
                            userEmail: user.email || item.email,
                            message: item.message || item.content || item.text || item.feedback || '',
                            subject: item.subject || item.title || '',
                            type: item.type || 'suggestion',
                            priority: item.priority || 'medium',
                            status: item.status || 'pending',
                            screenshotUrl: item.screenshotUrl || null,
                            deviceInfo: item.deviceInfo || null,
                            rating: item.rating || item.stars || null,
                            assignedTo: item.assignedTo || null,
                            assignedToName: assignedAdmin?.name || assignedAdmin?.email || null,
                            replies: item.replies || [],
                            createdAt: item.createdAt || item.timestamp || item.date || new Date().toISOString(),
                            updatedAt: item.updatedAt,
                            resolvedAt: item.resolvedAt || null,
                            resolvedBy: item.resolvedBy || null
                        });
                    }
                }
            }
        }
        
        // Sort by priority then createdAt
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        feedback.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            const pA = priorityOrder[a.priority] ?? 1;
            const pB = priorityOrder[b.priority] ?? 1;
            if (pA !== pB) return pA - pB;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        // Handle CSV export
        if (exportFormat === 'csv') {
            const csvRows = [
                ['ID', 'User', 'Email', 'Type', 'Priority', 'Status', 'Subject', 'Message', 'Device', 'Assigned To', 'Created At', 'Resolved At'].join(',')
            ];
            
            for (const f of feedback) {
                csvRows.push([
                    f.id,
                    `"${(f.userName || '').replace(/"/g, '""')}"`,
                    f.userEmail || '',
                    f.type,
                    f.priority,
                    f.status,
                    `"${(f.subject || '').replace(/"/g, '""')}"`,
                    `"${(f.message || '').replace(/"/g, '""').substring(0, 500)}"`,
                    `"${(f.deviceInfo?.userAgent || '').replace(/"/g, '""')}"`,
                    f.assignedToName || '',
                    f.createdAt,
                    f.resolvedAt || ''
                ].join(','));
            }
            
            return new Response(csvRows.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="feedback-export-${new Date().toISOString().split('T')[0]}.csv"`
                }
            });
        }
        
        // Get admins list for assignment dropdown
        const adminsList = Object.entries(admins).map(([id, a]) => ({
            id,
            name: a.name || a.email,
            email: a.email
        }));
        
        return json({ 
            feedback,
            admins: adminsList,
            stats: {
                total: feedback.length,
                pending: feedback.filter(f => f.status === 'pending').length,
                inProgress: feedback.filter(f => f.status === 'in_progress').length,
                resolved: feedback.filter(f => f.status === 'resolved').length,
                byType: {
                    bug: feedback.filter(f => f.type === 'bug').length,
                    request: feedback.filter(f => f.type === 'request').length,
                    ui: feedback.filter(f => f.type === 'ui').length,
                    performance: feedback.filter(f => f.type === 'performance').length,
                    suggestion: feedback.filter(f => f.type === 'suggestion').length
                },
                byPriority: {
                    high: feedback.filter(f => f.priority === 'high').length,
                    medium: feedback.filter(f => f.priority === 'medium').length,
                    low: feedback.filter(f => f.priority === 'low').length
                }
            }
        });
    } catch (error) {
        console.error('Get feedback error:', error);
        return json({ error: 'Failed to fetch feedback', details: error.message }, { status: 500 });
    }
}
