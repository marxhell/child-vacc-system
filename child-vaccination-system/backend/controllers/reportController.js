const Child = require('../models/Child');
const VaccinationRecord = require('../models/vaccinationrecord');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const Appointment = require('../models/Appointment');
const Vaccine = require('../models/Vaccine');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { APPOINTMENT_STATUS } = require('../config/constants');
const PDFDocument = require('pdfkit');

// Helper to generate a polished PDF using PDFKit, matching the white+blue theme
const sendPolishedPdf = (res, title, columns, rows) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const filename = `${title.replace(/\s+/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headerHeight = 70;

  // Header band
  doc.rect(doc.page.margins.left, doc.y, pageWidth, headerHeight).fill('#007bff');
  doc.fillColor('white').fontSize(18).text(title, doc.page.margins.left + 12, doc.y + 14, { width: pageWidth - 140 });
  const generatedOn = `Generated: ${new Date().toLocaleDateString()}`;
  doc.fontSize(10).text(generatedOn, doc.page.margins.left + pageWidth - 120, doc.y + 18, { width: 110, align: 'right' });
  // small logo box
  doc.roundedRect(doc.page.margins.left + pageWidth - 60, doc.y + 12, 48, 28, 4).fill('#ffffff');
  doc.fillColor('#007bff').fontSize(10).text('Child', doc.page.margins.left + pageWidth - 56, doc.y + 16);
  doc.fillColor('black');
  doc.moveDown(2);

  // Table header
  const startY = doc.y + 10;
  const colWidth = Math.floor(pageWidth / columns.length);
  const headerBg = '#e8f4fd';

  // draw header row background
  doc.fillColor('#ffffff');
  let y = startY;
  doc.rect(doc.page.margins.left, y, pageWidth, 28).fill(headerBg);
  doc.fillColor('#03314b').fontSize(11).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(col, doc.page.margins.left + i * colWidth + 8, y + 8, { width: colWidth - 16, ellipsis: true });
  });

  // rows
  y += 28;
  doc.font('Helvetica').fontSize(10).fillColor('#23303a');
  rows.forEach((row, rowIndex) => {
    // page break
    if (y > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    // alternating background
    if (rowIndex % 2 === 0) {
      doc.rect(doc.page.margins.left, y, pageWidth, 22).fill('#fbfeff');
      doc.fillColor('#23303a');
    }

    columns.forEach((col, i) => {
      const text = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
      doc.text(text, doc.page.margins.left + i * colWidth + 8, y + 6, { width: colWidth - 16, ellipsis: true });
    });

    y += 22;
  });

  doc.end();
  doc.pipe(res);
};

// @desc    Get monthly immunization report
// @route   GET /api/reports/monthly-immunization
// @access  Private
exports.getMonthlyImmunizationReport = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const report = await VaccinationRecord.aggregate([
      {
        $match: {
          administrationDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$vaccine',
          totalAdministered: { $sum: 1 },
        },
      },
      {
        $sort: { totalAdministered: -1 },
      },
    ]);

    sendSuccess(res, { month, year, report }, 'Monthly immunization report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// PDF version for monthly immunization
exports.getMonthlyImmunizationReportPdf = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const report = await VaccinationRecord.aggregate([
      { $match: { administrationDate: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$vaccine', totalAdministered: { $sum: 1 } } },
      { $sort: { totalAdministered: -1 } },
    ]);

    const rows = report.map(r => ({ Vaccine: r._id, 'Total Administered': r.totalAdministered }));
    return sendPolishedPdf(res, `Monthly Immunization ${month}-${year}`, ['Vaccine', 'Total Administered'], rows);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get daily vaccinations report
// @route   GET /api/reports/daily-vaccinations
// @access  Private
exports.getDailyVaccinationsReport = async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const report = await VaccinationRecord.find({
      administrationDate: { $gte: startDate, $lte: endDate },
    })
      .populate('child administeredBy vaccineBatch')
      .sort({ administrationDate: 1 });

    sendSuccess(res, { date: date.toISOString().split('T')[0], totalVaccinations: report.length, report }, 'Daily vaccinations report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccination coverage report
// @route   GET /api/reports/vaccination-coverage
// @access  Private
exports.getVaccinationCoverageReport = async (req, res, next) => {
  try {
    const totalChildren = await Child.countDocuments({ isActive: true });

    const vaccineStats = await VaccinationRecord.aggregate([
      {
        $group: {
          _id: '$vaccine',
          childrenVaccinated: { $addToSet: '$child' },
        },
      },
      {
        $project: {
          vaccine: '$_id',
          childrenVaccinated: { $size: '$childrenVaccinated' },
          coverage: {
            $multiply: [{ $divide: [{ $size: '$childrenVaccinated' }, totalChildren] }, 100],
          },
        },
      },
      {
        $sort: { coverage: -1 },
      },
    ]);

    sendSuccess(res, { totalChildren, vaccineStats }, 'Vaccination coverage report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

exports.getVaccinationCoverageReportPdf = async (req, res, next) => {
  try {
    const totalChildren = await Child.countDocuments({ isActive: true });

    const vaccineStats = await VaccinationRecord.aggregate([
      { $group: { _id: '$vaccine', childrenVaccinated: { $addToSet: '$child' } } },
      { $project: { vaccine: '$_id', childrenVaccinated: { $size: '$childrenVaccinated' }, coverage: 1 } },
    ]);

    const rows = vaccineStats.map(s => ({ Vaccine: s.vaccine, 'Children Vaccinated': s.childrenVaccinated || 0, 'Coverage %': ((s.childrenVaccinated || 0) / (totalChildren || 1) * 100).toFixed(2) }));
    return sendPolishedPdf(res, 'Vaccination Coverage', ['Vaccine', 'Children Vaccinated', 'Coverage %'], rows);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get overdue vaccinations report
// @route   GET /api/reports/overdue-vaccinations
// @access  Private
exports.getOverdueVaccinationsReport = async (req, res, next) => {
  try {
    const report = await VaccinationSchedule.find({
      status: 'overdue',
      isOverdue: true,
    })
      .populate('child')
      .sort({ scheduledDate: 1 });

    sendSuccess(res, { totalOverdue: report.length, report }, 'Overdue vaccinations report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

exports.getOverdueVaccinationsReportPdf = async (req, res, next) => {
  try {
    const report = await VaccinationSchedule.find({ status: 'overdue', isOverdue: true }).populate('child').sort({ scheduledDate: 1 });
    const rows = report.map(r => ({ Child: `${r.child?.firstName || ''} ${r.child?.lastName || ''}`, Vaccine: r.vaccine, 'Due Date': r.scheduledDate.toISOString().split('T')[0] }));
    return sendPolishedPdf(res, 'Overdue Vaccinations', ['Child', 'Vaccine', 'Due Date'], rows);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccine stock report
// @route   GET /api/reports/vaccine-stock
// @access  Private
exports.getVaccineStockReport = async (req, res, next) => {
  try {
    const report = await Vaccine.aggregate([
      {
        $group: {
          _id: '$name',
          totalAvailable: { $sum: '$quantityAvailable' },
          totalReceived: { $sum: '$quantityReceived' },
          batches: { $sum: 1 },
          minStockLevel: { $first: '$minStockLevel' },
        },
      },
      {
        $project: {
          vaccine: '$_id',
          totalAvailable: 1,
          totalReceived: 1,
          batches: 1,
          minStockLevel: 1,
          status: {
            $cond: [
              { $eq: ['$totalAvailable', 0] },
              'Out of Stock',
              { $cond: [{ $lte: ['$totalAvailable', '$minStockLevel'] }, 'Low Stock', 'In Stock'] },
            ],
          },
        },
      },
      {
        $sort: { totalAvailable: 1 },
      },
    ]);

    sendSuccess(res, { report }, 'Vaccine stock report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

exports.getVaccineStockReportPdf = async (req, res, next) => {
  try {
    const report = await Vaccine.aggregate([
      { $group: { _id: '$name', totalAvailable: { $sum: '$quantityAvailable' }, totalReceived: { $sum: '$quantityReceived' }, batches: { $sum: 1 }, minStockLevel: { $first: '$minStockLevel' } } },
      { $project: { vaccine: '$_id', totalAvailable: 1, totalReceived: 1, batches: 1, minStockLevel: 1 } },
      { $sort: { totalAvailable: 1 } },
    ]);
    const rows = report.map(r => ({ Vaccine: r.vaccine, 'Available': r.totalAvailable, 'Received': r.totalReceived, 'Batches': r.batches, 'Min Level': r.minStockLevel }));
    return sendPolishedPdf(res, 'Vaccine Stock Report', ['Vaccine', 'Available', 'Received', 'Batches', 'Min Level'], rows);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccine usage report
// @route   GET /api/reports/vaccine-usage
// @access  Private
exports.getVaccineUsageReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const report = await VaccinationRecord.aggregate([
      {
        $match: {
          administrationDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$vaccine',
          totalUsed: { $sum: 1 },
        },
      },
      {
        $sort: { totalUsed: -1 },
      },
    ]);

    sendSuccess(res, { startDate, endDate, report }, 'Vaccine usage report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get expired vaccine report
// @route   GET /api/reports/expired-vaccines
// @access  Private
exports.getExpiredVaccineReport = async (req, res, next) => {
  try {
    const report = await Vaccine.find({
      expiryDate: { $lt: new Date() },
    })
      .populate('managedBy', '-password')
      .sort({ expiryDate: 1 });

    sendSuccess(res, { totalExpired: report.length, report }, 'Expired vaccine report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get appointment report
// @route   GET /api/reports/appointments
// @access  Private
exports.getAppointmentReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const report = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const detailedReport = await Appointment.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('child guardian')
      .sort({ appointmentDate: -1 });

    sendSuccess(res, { startDate, endDate, summary: report, detailedReport }, 'Appointment report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

exports.getAppointmentReportPdf = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const detailedReport = await Appointment.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate('child guardian').sort({ appointmentDate: -1 });

    const rows = detailedReport.map(apt => ({ Child: `${apt.child?.firstName || ''} ${apt.child?.lastName || ''}`, Vaccine: apt.vaccine || '', Date: apt.appointmentDate ? apt.appointmentDate.toISOString().split('T')[0] : '', Status: apt.status }));
    return sendPolishedPdf(res, 'Appointments Report', ['Child', 'Vaccine', 'Date', 'Status'], rows);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
