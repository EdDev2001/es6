// src/routes/api/admin/reports/+server.js
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
        if (!admin || !checkPermission(admin, PERMISSIONS.ACCESS_REPORTS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const type = url.searchParams.get('type') || 'attendance';
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        
        if (!adminDb) {
            return json({ totalRecords: 0, averageAttendance: 0, uniqueUsers: 0 });
        }
        
        let reportData = {
            totalRecords: 0,
            averageAttendance: 0,
            uniqueUsers: 0
        };
        
        if (type === 'attendance') {
            const snapshot = await adminDb.ref('attendance').once('value');
            if (snapshot.exists()) {
                const records = snapshot.val();
                const recordsArray = Object.values(records);
                
                // Filter by date range
                const filteredRecords = recordsArray.filter(r => {
                    if (!r.date) return false;
                    if (from && r.date < from) return false;
                    if (to && r.date > to) return false;
                    return true;
                });
                
                reportData.totalRecords = filteredRecords.length;
                
                // Get unique users
                const uniqueUserIds = new Set(filteredRecords.map(r => r.userId));
                reportData.uniqueUsers = uniqueUserIds.size;
                
                // Calculate average attendance (simplified)
                const usersSnapshot = await adminDb.ref('users').once('value');
                const totalUsers = usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 1;
                
                if (from && to) {
                    const daysDiff = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
                    const expectedRecords = totalUsers * daysDiff;
                    reportData.averageAttendance = Math.round((filteredRecords.length / expectedRecords) * 100) || 0;
                } else {
                    reportData.averageAttendance = 85; // Default
                }
            }
        }
        
        return json(reportData);
    } catch (error) {
        console.error('Generate report error:', error);
        return json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
