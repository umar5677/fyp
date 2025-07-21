// fyp/server/utils/reportGenerator.js
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');

// Initialize SES client.
const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY,
    secretAccessKey: process.env.SES_SECRET_KEY,
  },
});

// Helper function to create tables in the PDF
function createTable(doc, tableData, thresholds = {}) {
  const tableTop = doc.y;
  const itemX = 50;
  const dateX = 200;
  const tagX = 400;

  doc.font('Roboto-Bold').fontSize(10)
     .text('Amount', itemX, tableTop)
     .text('Date', dateX, tableTop)
     .text('Tag/Food', tagX, tableTop);
  doc.moveDown();
  doc.font('Roboto-Regular');

  tableData.forEach(row => {
    const y = doc.y;
    let textColor = 'black';
    let isOutOfRange = false;

    if (thresholds.lowThreshold && row.rawValue < thresholds.lowThreshold) isOutOfRange = true;
    else if (thresholds.veryHighThreshold && row.rawValue > thresholds.veryHighThreshold) isOutOfRange = true;
    else if (row.tag === 'Post-Meal' && thresholds.highPostMealThreshold && row.rawValue > thresholds.highPostMealThreshold) isOutOfRange = true;
    else if (['Fasting', 'Pre-Meal', 'N/A'].includes(row.tag) && thresholds.highFastingThreshold && row.rawValue > thresholds.highFastingThreshold) isOutOfRange = true;

    if (isOutOfRange) textColor = 'red';
    
    doc.fillColor(textColor).fontSize(10)
       .text(row.amount, itemX, y)
       .text(row.date, dateX, y)
       .text(row.tag, tagX, y);
    doc.moveDown();
  });
  doc.fillColor('black');
}

// --- Main function for generating the PDF buffer ---
async function generatePdfBuffer(user, startDate, endDate, dbPool, isAutomated = false) {
    try {
        const userId = user.userID;
        
        // --- 1. Fetch all necessary data from the database ---
        const [userRows] = await dbPool.query('SELECT first_name, last_name, weight, height, gender, diabetes, isInsulin FROM users WHERE userID = ?', [userId]);
        if (userRows.length === 0) throw new Error('User not found.');
        
        const patient = userRows[0];
        const patientName = (patient.first_name && patient.last_name) ? `${patient.first_name} ${patient.last_name}` : `User ${userId}`;

        let diabetesType = 'N/A';
        if (patient.diabetes === 1) diabetesType = 'Type 1';
        else if (patient.diabetes === 2) diabetesType = 'Type 2';
        
        const insulinStatus = patient.isInsulin === 1 ? 'Yes' : (patient.isInsulin === 0 ? 'No' : 'N/A');

        const [thresholdRows] = await dbPool.query('SELECT lowThreshold, highFastingThreshold, highPostMealThreshold, veryHighThreshold FROM user_thresholds WHERE userID = ?', [userId]);
        const thresholds = thresholdRows.length > 0 ? thresholdRows[0] : {};
        
        const [glucoseRows] = await dbPool.query('SELECT amount, date, tag FROM dataLogs WHERE userID = ? AND type = 3 AND date BETWEEN ? AND ? ORDER BY date DESC', [userId, startDate, endDate]);
        const glucoseData = glucoseRows.map(r => ({ rawValue: parseFloat(r.amount), amount: `${parseFloat(r.amount).toFixed(2)} mg/dL`, date: new Date(r.date).toLocaleString(), tag: r.tag || 'N/A' }));
        
        const [calRows] = await dbPool.query('SELECT amount, date, foodName FROM dataLogs WHERE userID = ? AND type = 1 AND date BETWEEN ? AND ? ORDER BY date DESC', [userId, startDate, endDate]);
        const calorieData = calRows.map(r => ({ amount: `${parseFloat(r.amount).toFixed(2)} kcal`, date: new Date(r.date).toLocaleString(), tag: r.foodName || 'Unknown' }));
        
        const [sugRows] = await dbPool.query('SELECT amount, date, foodName FROM dataLogs WHERE userID = ? AND type = 2 AND date BETWEEN ? AND ? ORDER BY date DESC', [userId, startDate, endDate]);
        const sugarData = sugRows.map(r => ({ amount: `${parseFloat(r.amount).toFixed(1)}g`, date: new Date(r.date).toLocaleString(), tag: r.foodName || 'Unknown' }));

        const reportTypeString = isAutomated ? 'Automated Health Report' : 'Health Report';
        const datePart = `${moment(startDate).format('YYYY-MM-DD')}_to_${moment(endDate).format('YYYY-MM-DD')}`;
        const filename = `${patientName.replace(/\s+/g, '_')}_${reportTypeString.replace(/\s+/g, '_')}_${datePart}.pdf`;

        // --- 2. Create the PDF in memory ---
        const doc = new PDFDocument({ margin: 50 });
        const regularFontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf');
        const boldFontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Bold.ttf');
        doc.registerFont('Roboto-Regular', regularFontPath);
        doc.registerFont('Roboto-Bold', boldFontPath);
        const contentStartX = 50;

        const pdfBuffer = await new Promise((resolve, reject) => {
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // --- Build PDF Content ---
            doc.font('Roboto-Bold').fontSize(20).text(reportTypeString, { align: 'center' });
            doc.font('Roboto-Regular').fontSize(12).text(`Report Period: ${moment(startDate).format('LL')} - ${moment(endDate).format('LL')}`, { align: 'center' }).moveDown(2);

            // Patient Info
            doc.font('Roboto-Bold').fontSize(16).text('Patient Information', contentStartX, doc.y, { underline: true }).moveDown();
            doc.font('Roboto-Regular').fontSize(12)
               .text(`Weight: ${patient.weight ? parseFloat(patient.weight).toFixed(2) + ' kg' : 'N/A'}`, contentStartX) 
               .text(`Height: ${patient.height ? parseFloat(patient.height).toFixed(2) + ' cm' : 'N/A'}`, contentStartX)
               .text(`Gender: ${patient.gender || 'N/A'}`, contentStartX)
               .text(`Diabetes Type: ${diabetesType}`, contentStartX) 
               .text(`On Insulin: ${insulinStatus}`, contentStartX).moveDown();
            
            // Sections
            if (glucoseData.length) { 
                doc.font('Roboto-Bold').fontSize(16).text('Blood Glucose', contentStartX, doc.y, { underline: true }).moveDown();
                createTable(doc, glucoseData, thresholds); 
            }
            if (calorieData.length) { 
                doc.moveDown().font('Roboto-Bold').fontSize(16).text('Calories', contentStartX, doc.y, { underline: true }).moveDown();
                createTable(doc, calorieData); 
            }
            if (sugarData.length) { 
                doc.moveDown().font('Roboto-Bold').fontSize(16).text('Sugar', contentStartX, doc.y, { underline: true }).moveDown();
                createTable(doc, sugarData); 
            }
            
            doc.end();
        });
        
        return { pdfBuffer, patientName, reportTypeString, filename };

    } catch (error) {
        console.error(`Failed to generate PDF buffer for UserID: ${user.userID}. Error: ${error.message}`);
        throw error;
    }
}
    
// --- Reusable Function for Emailing ---
async function generateAndEmailReport(user, startDate, endDate, dbPool, isAutomated = false) {
    try {
        const { pdfBuffer, patientName, reportTypeString, filename } = await generatePdfBuffer(user, startDate, endDate, dbPool, isAutomated);

        const providerEmail = user.preferredProviderEmail;
        const providerName = user.preferredProviderName;
        
        const emailBodyIntro = isAutomated ? `Please find the attached automated health report for ${patientName}` : `Please find the attached health report for ${patientName}`;
        
        const boundary = `Boundary_${Date.now().toString(16)}`;
        const rawMessage = [
          `From: "GlucoBites" <glucobites.org@gmail.com>`,
          `To: ${providerEmail}`,
          `Subject: ${reportTypeString} for ${patientName}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset="UTF-8"`,
          ``,
          `Dear ${providerName},\n\n${emailBodyIntro} for the period of ${moment(startDate).format('LL')} to ${moment(endDate).format('LL')}.\n\nThis report was generated by the GlucoBites application.`,
          ``,
          `--${boundary}`,
          `Content-Type: application/pdf; name="${filename}"`,
          `Content-Disposition: attachment; filename="${filename}"`,
          `Content-Transfer-Encoding: base64`,
          ``,
          pdfBuffer.toString('base64'),
          ``,
          `--${boundary}--`
        ].join('\r\n');

        await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawMessage) } }));
        
        console.log(`Successfully sent ${reportTypeString} for UserID: ${user.userID} to ${providerEmail}`);

    } catch (error) {
        console.error(`Failed to email report for UserID: ${user.userID}. Error:`, error);
        throw error;
    }
}
    
module.exports = { generateAndEmailReport, generatePdfBuffer };