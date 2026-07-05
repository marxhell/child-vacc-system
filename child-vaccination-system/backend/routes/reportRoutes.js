const express = require('express');
const router = express.Router();
const {
  getMonthlyImmunizationReport,
  getDailyVaccinationsReport,
  getVaccinationCoverageReport,
  getOverdueVaccinationsReport,
  getVaccineStockReport,
  getVaccineUsageReport,
  getExpiredVaccineReport,
  getAppointmentReport,
  getMonthlyImmunizationReportPdf,
  getVaccinationCoverageReportPdf,
  getOverdueVaccinationsReportPdf,
  getVaccineStockReportPdf,
  getAppointmentReportPdf,
} = require('../controllers/reportController');
const { verifyToken, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.get('/monthly-immunization', getMonthlyImmunizationReport);
router.get('/daily-vaccinations', getDailyVaccinationsReport);
router.get('/vaccination-coverage', getVaccinationCoverageReport);
router.get('/overdue-vaccinations', getOverdueVaccinationsReport);
router.get('/vaccine-stock', getVaccineStockReport);
router.get('/monthly-immunization.pdf', getMonthlyImmunizationReportPdf);
router.get('/vaccination-coverage.pdf', getVaccinationCoverageReportPdf);
router.get('/overdue-vaccinations.pdf', getOverdueVaccinationsReportPdf);
router.get('/vaccine-stock.pdf', getVaccineStockReportPdf);
router.get('/vaccine-usage', getVaccineUsageReport);
router.get('/expired-vaccines', getExpiredVaccineReport);
router.get('/appointments', getAppointmentReport);
router.get('/appointments.pdf', getAppointmentReportPdf);

module.exports = router;
