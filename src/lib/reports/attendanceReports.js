// src/lib/reports/attendanceReports.js
// Phase 6: Reports & Analytics - Attendance Reports Service

import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, get, query, orderByChild, startAt, endAt } from 'firebase/database';

// Report Period Types
export const ReportPeriod = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CUSTOM: 'custom'
};

// Report Output Formats
export const ExportFormat = {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv'
};

// Report Types
export const AttendanceReportType = {
    SUMMARY: 'summary',
    DETAILED: 'detailed',
    COMPARISON: 'comparison',
    TRENDS: 'trends'
};

/**
 * Attendance Analytics Service
 */
export class AttendanceAnalytics {
    constructor(options = {}) {
        this.workConfig = options.workConfig || {
            standardStartTime: '09:00',
            standardEndTime: '18:00',
            standardHoursPerDay: 8,
            lateThresholdMinutes: 15,
            earlyLeaveThresholdMinutes: 30
        };
    }

    /**
     * Get attendance overview statistics
     */
    async getOverviewStats(records, period = ReportPeriod.MONTHLY) {
        const { startDate, endDate } = this.getDateRange(period);
        const filteredRecords = this.filterByDateRange(records, startDate, endDate);
        
        const totalDays = this.getWorkingDays(startDate, endDate);
        const presentDays = filteredRecords.filter(r => r.checkIn?.timestamp).length;
        const absentDays = totalDays - presentDays;
        const lateDays = filteredRecords.filter(r => this.isLate(r)).length;
        const earlyOutDays = filteredRecords.filter(r => this.isEarlyLeave(r)).length;
        const onTimeDays = presentDays - lateDays;

        let totalHours = 0;
        let totalOvertime = 0;

        filteredRecords.forEach(record => {
            const hours = this.calculateHours(record);
            totalHours += hours;
            totalOvertime += Math.max(0, hours - this.workConfig.standardHoursPerDay);
        });

        return {
            period: { start: startDate, end: endDate, label: this.getPeriodLabel(period) },
            summary: {
                totalDays,
                presentDays,
                absentDays,
                lateDays,
                earlyOutDays,
                onTimeDays,
                totalHours: Math.round(totalHours * 10) / 10,
                totalOvertime: Math.round(totalOvertime * 10) / 10,
                avgHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
                attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
                punctualityRate: presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 0
            },
            charts: {
                presentVsAbsent: { present: presentDays, absent: absentDays },
                lateAnalysis: { onTime: onTimeDays, late: lateDays, earlyOut: earlyOutDays },
                dailyTrend: this.getDailyTrend(filteredRecords),
                weeklyTrend: this.getWeeklyTrend(filteredRecords)
            }
        };
    }

    /**
     * Get department comparison data
     */
    async getDepartmentComparison(allRecords, departments) {
        const comparison = [];

        for (const dept of departments) {
            const deptRecords = allRecords.filter(r => r.department === dept.id || r.departmentOrCourse === dept.name);
            const presentDays = deptRecords.filter(r => r.checkIn?.timestamp).length;
            const lateDays = deptRecords.filter(r => this.isLate(r)).length;
            const totalHours = deptRecords.reduce((sum, r) => sum + this.calculateHours(r), 0);

            comparison.push({
                department: dept.name,
                departmentId: dept.id,
                totalRecords: deptRecords.length,
                presentDays,
                lateDays,
                attendanceRate: deptRecords.length > 0 ? Math.round((presentDays / deptRecords.length) * 100) : 0,
                punctualityRate: presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 0,
                avgHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0
            });
        }

        return comparison.sort((a, b) => b.attendanceRate - a.attendanceRate);
    }

    /**
     * Generate daily trend data
     */
    getDailyTrend(records) {
        const dailyData = {};
        
        records.forEach(record => {
            const date = record.date;
            if (!dailyData[date]) {
                dailyData[date] = { date, present: 0, absent: 0, late: 0, hours: 0 };
            }
            
            if (record.checkIn?.timestamp) {
                dailyData[date].present++;
                dailyData[date].hours += this.calculateHours(record);
                if (this.isLate(record)) dailyData[date].late++;
            } else {
                dailyData[date].absent++;
            }
        });

        return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Generate weekly trend data
     */
    getWeeklyTrend(records) {
        const weeklyData = {};
        
        records.forEach(record => {
            const date = new Date(record.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { 
                    week: weekKey, 
                    label: this.formatWeekLabel(weekStart),
                    present: 0, 
                    absent: 0, 
                    late: 0, 
                    totalHours: 0 
                };
            }
            
            if (record.checkIn?.timestamp) {
                weeklyData[weekKey].present++;
                weeklyData[weekKey].totalHours += this.calculateHours(record);
                if (this.isLate(record)) weeklyData[weekKey].late++;
            } else {
                weeklyData[weekKey].absent++;
            }
        });

        return Object.values(weeklyData).sort((a, b) => new Date(a.week) - new Date(b.week));
    }

    /**
     * Generate monthly trend data
     */
    getMonthlyTrend(records) {
        const monthlyData = {};
        
        records.forEach(record => {
            const date = new Date(record.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { 
                    month: monthKey, 
                    label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    present: 0, 
                    absent: 0, 
                    late: 0, 
                    totalHours: 0 
                };
            }
            
            if (record.checkIn?.timestamp) {
                monthlyData[monthKey].present++;
                monthlyData[monthKey].totalHours += this.calculateHours(record);
                if (this.isLate(record)) monthlyData[monthKey].late++;
            } else {
                monthlyData[monthKey].absent++;
            }
        });

        return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    }

    // Helper methods
    getDateRange(period, customRange = null) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let startDate, endDate = today;

        if (customRange) {
            return { startDate: new Date(customRange.start), endDate: new Date(customRange.end) };
        }

        switch (period) {
            case ReportPeriod.DAILY:
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                break;
            case ReportPeriod.WEEKLY:
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                break;
            case ReportPeriod.MONTHLY:
            default:
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                break;
        }

        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
    }

    filterByDateRange(records, startDate, endDate) {
        return records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    getWorkingDays(startDate, endDate) {
        let count = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    getPeriodLabel(period) {
        switch (period) {
            case ReportPeriod.DAILY: return 'Today';
            case ReportPeriod.WEEKLY: return 'Last 7 Days';
            case ReportPeriod.MONTHLY: return 'Last 30 Days';
            default: return 'Custom Period';
        }
    }

    formatWeekLabel(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    calculateHours(record) {
        if (!record.checkIn?.timestamp) return 0;
        const checkIn = new Date(record.checkIn.timestamp);
        const checkOut = record.checkOut?.timestamp ? new Date(record.checkOut.timestamp) : new Date();
        
        let breakMinutes = 0;
        if (record.breakStart?.timestamp && record.breakEnd?.timestamp) {
            breakMinutes = (new Date(record.breakEnd.timestamp) - new Date(record.breakStart.timestamp)) / (1000 * 60);
        }
        
        return Math.max(0, ((checkOut - checkIn) / (1000 * 60) - breakMinutes) / 60);
    }

    isLate(record) {
        if (!record.checkIn?.timestamp) return false;
        const arrival = new Date(record.checkIn.timestamp);
        const [hours, minutes] = this.workConfig.standardStartTime.split(':').map(Number);
        const standard = hours * 60 + minutes;
        const arrivalMinutes = arrival.getHours() * 60 + arrival.getMinutes();
        return arrivalMinutes > standard + this.workConfig.lateThresholdMinutes;
    }

    isEarlyLeave(record) {
        if (!record.checkOut?.timestamp) return false;
        const departure = new Date(record.checkOut.timestamp);
        const [hours, minutes] = this.workConfig.standardEndTime.split(':').map(Number);
        const standard = hours * 60 + minutes;
        const departureMinutes = departure.getHours() * 60 + departure.getMinutes();
        return departureMinutes < standard - this.workConfig.earlyLeaveThresholdMinutes;
    }
}

// Export singleton instance
export const attendanceAnalytics = new AttendanceAnalytics();
