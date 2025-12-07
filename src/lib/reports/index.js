// src/lib/reports/index.js
// Reports Module - Central exports

export {
    ReportType,
    ReportSection,
    WorkHabitReportGenerator,
    generatePDFContent,
    downloadReportAsPDF,
    saveReport,
    getSavedReports,
    scheduleAutoReport,
    getReportSchedule,
    queueReportEmail
} from './workHabitReports.js';
