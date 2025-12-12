// src/lib/reports/exportService.js
// Phase 6: Reports & Analytics - Export Service (PDF, Excel, CSV)

import { browser } from '$app/environment';

/**
 * Export Service - Handles PDF, Excel, CSV exports
 */
export class ExportService {
    /**
     * Export data to CSV format
     */
    static exportToCSV(data, filename = 'report') {
        if (!browser || !data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    let cell = row[header] ?? '';
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                        cell = `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                }).join(',')
            )
        ].join('\n');

        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
    }

    /**
     * Export data to Excel format (XLSX-compatible CSV with BOM)
     */
    static exportToExcel(data, filename = 'report', sheetName = 'Report') {
        if (!browser || !data || data.length === 0) return;

        // Create Excel-compatible XML
        const headers = Object.keys(data[0]);
        
        let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Styles>
        <Style ss:ID="Header">
            <Font ss:Bold="1" ss:Size="12"/>
            <Interior ss:Color="#007AFF" ss:Pattern="Solid"/>
            <Font ss:Color="#FFFFFF"/>
        </Style>
        <Style ss:ID="Data">
            <Font ss:Size="11"/>
        </Style>
        <Style ss:ID="Number">
            <NumberFormat ss:Format="0.00"/>
        </Style>
    </Styles>
    <Worksheet ss:Name="${sheetName}">
        <Table>`;

        // Add headers
        xmlContent += '<Row>';
        headers.forEach(header => {
            xmlContent += `<Cell ss:StyleID="Header"><Data ss:Type="String">${this.escapeXml(this.formatHeader(header))}</Data></Cell>`;
        });
        xmlContent += '</Row>';

        // Add data rows
        data.forEach(row => {
            xmlContent += '<Row>';
            headers.forEach(header => {
                const value = row[header];
                const type = typeof value === 'number' ? 'Number' : 'String';
                xmlContent += `<Cell ss:StyleID="Data"><Data ss:Type="${type}">${this.escapeXml(String(value ?? ''))}</Data></Cell>`;
            });
            xmlContent += '</Row>';
        });

        xmlContent += '</Table></Worksheet></Workbook>';

        this.downloadFile(xmlContent, `${filename}.xls`, 'application/vnd.ms-excel');
    }

    /**
     * Export to PDF (generates printable HTML)
     */
    static exportToPDF(reportData, options = {}) {
        if (!browser) return;

        const {
            title = 'Attendance Report',
            subtitle = '',
            period = '',
            generatedBy = 'System',
            logo = '/logo.png'
        } = options;

        const htmlContent = this.generatePDFHTML(reportData, { title, subtitle, period, generatedBy, logo });
        
        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Auto-trigger print dialog
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    }

    /**
     * Generate PDF-ready HTML content
     */
    static generatePDFHTML(reportData, options) {
        const { title, subtitle, period, generatedBy, logo } = options;
        const now = new Date().toLocaleString();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1C1C1E;
            line-height: 1.5;
            padding: 40px;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid #007AFF;
        }
        
        .header-left h1 {
            font-size: 28px;
            font-weight: 700;
            color: #0A0A0A;
            margin-bottom: 4px;
        }
        
        .header-left .subtitle {
            font-size: 14px;
            color: #8E8E93;
        }
        
        .header-right {
            text-align: right;
            font-size: 12px;
            color: #8E8E93;
        }
        
        .header-right img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            margin-bottom: 8px;
        }
        
        .period-badge {
            display: inline-block;
            background: #007AFF;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 24px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }
        
        .summary-card {
            background: #F5F5F7;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        
        .summary-card .value {
            font-size: 32px;
            font-weight: 700;
            color: #0A0A0A;
        }
        
        .summary-card .label {
            font-size: 12px;
            color: #8E8E93;
            margin-top: 4px;
        }
        
        .summary-card.highlight {
            background: linear-gradient(135deg, #007AFF, #5856D6);
            color: white;
        }
        
        .summary-card.highlight .value,
        .summary-card.highlight .label {
            color: white;
        }
        
        .section {
            margin-bottom: 32px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #0A0A0A;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #E5E5EA;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        th {
            background: #F5F5F7;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: #8E8E93;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 12px 16px;
            border-bottom: 1px solid #E5E5EA;
            color: #1C1C1E;
        }
        
        tr:hover {
            background: #FAFAFA;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .status-present { background: rgba(52, 199, 89, 0.15); color: #34C759; }
        .status-absent { background: rgba(255, 59, 48, 0.15); color: #FF3B30; }
        .status-late { background: rgba(255, 149, 0, 0.15); color: #FF9500; }
        
        .chart-placeholder {
            background: #F5F5F7;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            color: #8E8E93;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E5EA;
            font-size: 11px;
            color: #8E8E93;
            display: flex;
            justify-content: space-between;
        }
        
        @media print {
            body { padding: 20px; }
            .summary-grid { grid-template-columns: repeat(4, 1fr); }
            .no-print { display: none; }
        }
        
        @page {
            size: A4;
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>${title}</h1>
            <p class="subtitle">${subtitle}</p>
        </div>
        <div class="header-right">
            <img src="${logo}" alt="Logo" onerror="this.style.display='none'">
            <p>Generated: ${now}</p>
            <p>By: ${generatedBy}</p>
        </div>
    </div>
    
    ${period ? `<div class="period-badge">${period}</div>` : ''}
    
    ${this.generateSummarySection(reportData.summary)}
    ${this.generateDetailsSection(reportData.details)}
    ${this.generateDepartmentSection(reportData.departments)}
    
    <div class="footer">
        <span>Confidential - Internal Use Only</span>
        <span>Page 1 of 1</span>
    </div>
</body>
</html>`;
    }

    /**
     * Generate summary section HTML
     */
    static generateSummarySection(summary) {
        if (!summary) return '';
        
        return `
    <div class="section">
        <h2 class="section-title">Summary Overview</h2>
        <div class="summary-grid">
            <div class="summary-card highlight">
                <div class="value">${summary.attendanceRate || 0}%</div>
                <div class="label">Attendance Rate</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.presentDays || 0}</div>
                <div class="label">Present Days</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.absentDays || 0}</div>
                <div class="label">Absent Days</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.lateDays || 0}</div>
                <div class="label">Late Arrivals</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.punctualityRate || 0}%</div>
                <div class="label">Punctuality Rate</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.totalHours || 0}h</div>
                <div class="label">Total Hours</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.avgHoursPerDay || 0}h</div>
                <div class="label">Avg Hours/Day</div>
            </div>
            <div class="summary-card">
                <div class="value">${summary.totalOvertime || 0}h</div>
                <div class="label">Overtime</div>
            </div>
        </div>
    </div>`;
    }

    /**
     * Generate details section HTML
     */
    static generateDetailsSection(details) {
        if (!details || details.length === 0) return '';
        
        const rows = details.slice(0, 50).map(record => `
            <tr>
                <td>${record.date || '-'}</td>
                <td>${record.name || record.userName || '-'}</td>
                <td>${record.department || '-'}</td>
                <td>${record.checkIn || '-'}</td>
                <td>${record.checkOut || '-'}</td>
                <td>${record.hours || '-'}</td>
                <td><span class="status-badge status-${record.status?.toLowerCase() || 'present'}">${record.status || 'Present'}</span></td>
            </tr>
        `).join('');

        return `
    <div class="section">
        <h2 class="section-title">Detailed Records</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        ${details.length > 50 ? `<p style="margin-top: 12px; font-size: 12px; color: #8E8E93;">Showing 50 of ${details.length} records</p>` : ''}
    </div>`;
    }

    /**
     * Generate department comparison section
     */
    static generateDepartmentSection(departments) {
        if (!departments || departments.length === 0) return '';
        
        const rows = departments.map(dept => `
            <tr>
                <td><strong>${dept.department || dept.name || '-'}</strong></td>
                <td>${dept.totalRecords || 0}</td>
                <td>${dept.presentDays || 0}</td>
                <td>${dept.lateDays || 0}</td>
                <td>${dept.attendanceRate || 0}%</td>
                <td>${dept.punctualityRate || 0}%</td>
                <td>${dept.avgHours || 0}h</td>
            </tr>
        `).join('');

        return `
    <div class="section">
        <h2 class="section-title">Department Comparison</h2>
        <table>
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Total Records</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Attendance %</th>
                    <th>Punctuality %</th>
                    <th>Avg Hours</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    </div>`;
    }

    // Utility methods
    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    static escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    static formatHeader(header) {
        return header
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

export default ExportService;
