// fyp/server/lib/reportGenerator.js
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');

const MARGIN = 50;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_BOTTOM_MARGIN = PAGE_HEIGHT - MARGIN - 20;

// Initialize SES client
const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY,
    secretAccessKey: process.env.SES_SECRET_KEY,
  },
});

function drawTable(doc, title, headers, colPositions, colWidths, data, thresholds = {}) {
    if (doc.y + 80 > CONTENT_BOTTOM_MARGIN) {
        doc.addPage();
    }
    doc.font('Roboto-Bold').fontSize(12).text(title, MARGIN, doc.y, { underline: true });
    doc.moveDown();

    const drawTableHeader = () => {
        doc.font('Roboto-Bold').fontSize(10);
        const headerY = doc.y;
        headers.forEach((header, i) => doc.text(header, colPositions[i], headerY));
        doc.moveDown(1.5);
    };

    drawTableHeader();

    for (const row of data) {
        // Measure the required height for the current row
        let maxHeight = 0;
        doc.font('Roboto-Regular').fontSize(10);
        row.values.forEach((cellText, i) => {
            const height = doc.heightOfString(cellText, { width: colWidths[i] });
            if (height > maxHeight) {
                maxHeight = height;
            }
        });
        
        if (doc.y + maxHeight > CONTENT_BOTTOM_MARGIN) {
            doc.addPage();
            doc.font('Roboto-Bold').fontSize(12).text(`${title} (continued)`, MARGIN, doc.y, { underline: true });
            doc.moveDown();
            drawTableHeader();
        }

        const yBefore = doc.y; // Get Y position before drawing
        
        let textColor = '#000';
        if (thresholds && row.rawValue !== undefined) {
            const { rawValue, tag } = row;
            if (rawValue < thresholds.lowThreshold) textColor = '#D32F2F';
            else if (rawValue >= thresholds.veryHighThreshold) textColor = '#D32F2F';
            else if (tag === 'Post-Meal' && rawValue >= thresholds.highPostMealThreshold) textColor = '#D32F2F';
            else if (['Fasting', 'Pre-Meal', 'N/A'].includes(tag) && rawValue >= thresholds.highFastingThreshold) textColor = '#D32F2F';
        }

        doc.font('Roboto-Regular').fontSize(10).fillColor(textColor);
        // Draw all cells, ensuring they start at the same Y coordinate
        row.values.forEach((text, i) => doc.text(text, colPositions[i], yBefore, { width: colWidths[i] }));
        doc.fillColor('#000');
        // Manually set the cursor after the tallest cell in the row
        doc.y = yBefore + maxHeight + 5;
    }
    doc.moveDown(2); 
}

async function generatePdfBuffer(user, startDate, endDate, dbPool, isAutomated = false) {
    try {
        const userId = user.userID;
        const [userRows] = await dbPool.query('SELECT first_name, last_name, weight, height, gender, diabetes, isInsulin FROM users WHERE userID = ?', [userId]);
        if (userRows.length === 0) throw new Error('User not found.');
        const patient = userRows[0];
        
        const [thresholdRows] = await dbPool.query('SELECT lowThreshold, highFastingThreshold, highPostMealThreshold, veryHighThreshold FROM user_thresholds WHERE userID = ?', [userId]);
        const thresholds = thresholdRows.length > 0 ? thresholdRows[0] : {};

        const [logRows] = await dbPool.query('SELECT type, amount, date, tag, foodName FROM dataLogs WHERE userID = ? AND type IN (1, 2, 3) AND date BETWEEN ? AND ? ORDER BY date DESC', [userId, startDate, endDate]);
        const glucoseData = logRows.filter(r => r.type === 3).map(r => ({ rawValue: parseFloat(r.amount), tag: r.tag, values: [`${parseFloat(r.amount).toFixed(1)} mg/dL`, new Date(r.date).toLocaleString(), r.tag || 'N/A']}));
        const calorieData = logRows.filter(r => r.type === 1).map(r => ({ values: [`${parseFloat(r.amount).toFixed(0)} kcal`, new Date(r.date).toLocaleString(), r.foodName || 'Unknown'] }));
        const sugarData = logRows.filter(r => r.type === 2).map(r => ({ values: [`${parseFloat(r.amount).toFixed(1)} g`, new Date(r.date).toLocaleString(), r.foodName || 'Unknown'] }));
        
        const patientName = `${patient.first_name || 'User'} ${patient.last_name || userId}`;
        const reportTypeString = isAutomated ? 'Automated Health Report' : 'Health Report';
        const filename = `${patientName.replace(/\s+/g, '_')}_${moment(startDate).format('YYYY-MM-DD')}.pdf`;

        // Define table column layouts
        const tableLayout = {
            headers: ['Amount', 'Date', 'Tag/Food'],
            colPositions: [MARGIN, MARGIN + 120, MARGIN + 320],
            colWidths: [110, 190, PAGE_WIDTH - MARGIN - 320 - MARGIN]
        };

        const pdfBuffer = await new Promise(resolve => {
            const doc = new PDFDocument({ margin: MARGIN, bufferPages: true });
            doc.registerFont('Roboto-Regular', path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf'));
            doc.registerFont('Roboto-Bold', path.join(__dirname, '..', 'fonts', 'Roboto-Bold.ttf'));
            const buffers = [];
            doc.on('data', buffer => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            //  Build PDF Content
            doc.font('Roboto-Bold').text(`Patient: ${patientName}`);
            doc.text(`Period: ${moment(startDate).format('LL')} - ${moment(endDate).format('LL')}`).moveDown(2);
            doc.font('Roboto-Bold').fontSize(12).text('Patient Information', { underline: true }).moveDown();
            doc.font('Roboto-Regular').fontSize(10);
            doc.text(`Weight: ${patient.weight ? `${patient.weight} kg` : 'N/A'}`);
            doc.text(`Height: ${patient.height ? `${patient.height} cm` : 'N/A'}`);
            doc.text(`Gender: ${patient.gender || 'N/A'}`);
            doc.text(`Diabetes Type: ${patient.diabetes === 1 ? 'Type 1' : 'Type 2'}`);
            doc.text(`Using Insulin: ${patient.isInsulin ? 'Yes' : 'No'}`).moveDown(2);

            if (glucoseData.length > 0) drawTable(doc, 'Blood Glucose Logs', tableLayout.headers, tableLayout.colPositions, tableLayout.colWidths, glucoseData, thresholds);
            if (calorieData.length > 0) drawTable(doc, 'Calorie Logs', tableLayout.headers, tableLayout.colPositions, tableLayout.colWidths, calorieData);
            if (sugarData.length > 0) drawTable(doc, 'Sugar Logs', tableLayout.headers, tableLayout.colPositions, tableLayout.colWidths, sugarData);
            
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.font('Roboto-Bold').fontSize(14).text(reportTypeString, 0, MARGIN / 2, { align: 'center', width: PAGE_WIDTH });
                doc.fontSize(8).font('Roboto-Regular').text(`Page ${i + 1} of ${pageCount}`, 0, doc.page.height - MARGIN / 1.5, { align: 'center', width: PAGE_WIDTH });
            }

            doc.end();
        });
        
        return { pdfBuffer, patientName, reportTypeString, filename };

    } catch (error) {
        console.error(`Failed to generate PDF buffer for UserID: ${user.userID}. Error: ${error.message}`);
        throw error;
    }
}
    
async function generateAndEmailReport(user, startDate, endDate, dbPool, isAutomated = false) {
    try {
        const { pdfBuffer, patientName, reportTypeString, filename } = await generatePdfBuffer(user, startDate, endDate, dbPool, isAutomated);
        const emailBody = `Dear ${user.preferredProviderName || 'Health Provider'},\n\nPlease find the attached ${isAutomated ? 'automated ' : ''}health report for ${patientName} covering the period from ${moment(startDate).format('LL')} to ${moment(endDate).format('LL')}.\n\nThis report was generated by the GlucoBites application.\n\nBest regards,\nThe GlucoBites Team`;
        const boundary = `Boundary_${Date.now().toString(16)}`;
        const rawMessage = [ `From: "GlucoBites" <glucobites.org@gmail.com>`, `To: ${user.preferredProviderEmail}`, `Subject: ${reportTypeString} for ${patientName}`, `MIME-Version: 1.0`, `Content-Type: multipart/mixed; boundary="${boundary}"`, ``, `--${boundary}`, `Content-Type: text/plain; charset="UTF-8"`, `Content-Transfer-Encoding: 7bit`, ``, emailBody, ``, `--${boundary}`, `Content-Type: application/pdf; name="${filename}"`, `Content-Disposition: attachment; filename="${filename}"`, `Content-Transfer-Encoding: base64`, ``, pdfBuffer.toString('base64'), `--${boundary}--` ].join('\r\n');
        await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawMessage) } }));
        console.log(`Successfully sent report for UserID: ${user.userID} to ${user.preferredProviderEmail}`);
    } catch (error) {
        console.error(`Failed to email report for UserID: ${user.userID}. Error:`, error);
        throw error;
    }
}
    
module.exports = { generateAndEmailReport, generatePdfBuffer };