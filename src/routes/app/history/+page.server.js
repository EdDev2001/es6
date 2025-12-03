import { adminAuth } from '$lib/server/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export async function load({ cookies }) {
    const sessionCookie = cookies.get('session');
    
    if (!sessionCookie) {
        return {
            records: []
        };
    }

    try {
        // Verify the session cookie
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userId = decodedClaims.uid;

        // Get attendance records from Realtime Database
        const db = getDatabase();
        const attendanceRef = db.ref(`attendance/${userId}`);
        const snapshot = await attendanceRef.orderByChild('date').once('value');

        const records = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                records.push({
                    shiftId: childSnapshot.key,
                    ...data
                });
            });
        }

        // Sort by date descending (newest first)
        records.sort((a, b) => {
            const dateA = new Date(a.date || a.checkIn?.timestamp || 0);
            const dateB = new Date(b.date || b.checkIn?.timestamp || 0);
            return dateB - dateA;
        });

        return {
            records
        };
    } catch (error) {
        console.error('Error loading attendance history:', error);
        return {
            records: []
        };
    }
}