import { adminAuth, adminDb } from '$lib/server/firebase-admin';

export async function load({ cookies }) {
    // If Firebase Admin is not configured, return empty and let client handle it
    if (!adminAuth || !adminDb) {
        return { records: [] };
    }

    const sessionCookie = cookies.get('session');
    
    if (!sessionCookie) {
        return { records: [] };
    }

    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userId = decodedClaims.uid;
        const attendanceRef = adminDb.ref(`attendance/${userId}`);
        const snapshot = await attendanceRef.orderByChild('date').once('value');

        const records = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                
                records.push({
                    shiftId: childSnapshot.key,
                    date: data.date,
                    currentStatus: data.currentStatus,
                    checkIn: data.checkIn || null,
                    breakStart: data.breakStart || data.breakIn || null,
                    breakEnd: data.breakEnd || data.breakOut || null,
                    checkOut: data.checkOut || null,
                    manualCorrection: data.manualCorrection || false,
                    correctedBy: data.correctedBy || null
                });
            });
        }

        records.sort((a, b) => {
            const dateA = new Date(a.date || a.checkIn?.timestamp || 0);
            const dateB = new Date(b.date || b.checkIn?.timestamp || 0);
            return dateB.getTime() - dateA.getTime();
        });

        return { records };
    } catch (error) {
        console.error('Error loading attendance history:', error);
        return { records: [] };
    }
}
