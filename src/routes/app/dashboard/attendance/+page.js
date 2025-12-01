// routes/dashboard/attendance/+page.js

import { ref, get, query, limitToLast } from "$lib/firebase";
import { db } from "$lib/firebase";

export async function load() {
    const USER_PATH = 'attendance/anonymous';
    const attendanceRef = ref(db, USER_PATH);
    const q = query(attendanceRef, limitToLast(50));

    try {
        const snapshot = await get(q);
        const attendanceRecords = [];

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                attendanceRecords.push({
                    shiftId: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        
        // Newest shifts first
        attendanceRecords.reverse(); 

        return {
            records: attendanceRecords
        };
    } catch (error) {
        console.error("Error fetching attendance data:", error);
        return {
            records: [],
            error: error.message
        };
    }
}