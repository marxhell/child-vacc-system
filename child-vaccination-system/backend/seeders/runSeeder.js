require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Guardian = require('../models/Guardian');
const Child = require('../models/Child');
const Vaccine = require('../models/Vaccine');
const { ROLES, GENDER, VACCINE_NAMES } = require('../config/constants');

const seeders = {
  seedUsers: async () => {
    try {
      // Clear existing users
      await User.deleteMany({});

      const users = [
        {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@vaccination.com',
          password: 'admin123',
          role: ROLES.ADMINISTRATOR,
          phoneNumber: '0712345678',
        },
        {
          firstName: 'Alice',
          lastName: 'Nurse',
          email: 'nurse@vaccination.com',
          password: 'nurse123',
          role: ROLES.NURSE,
          phoneNumber: '0712345679',
        },
        {
          firstName: 'Bob',
          lastName: 'Records',
          email: 'records@vaccination.com',
          password: 'records123',
          role: ROLES.RECORDS_OFFICER,
          phoneNumber: '0712345680',
        },
        {
          firstName: 'Carol',
          lastName: 'Pharmacist',
          email: 'pharmacist@vaccination.com',
          password: 'pharma123',
          role: ROLES.PHARMACIST,
          phoneNumber: '0712345681',
        },
      ];

      // Use create() to trigger pre-save hooks (password hashing)
      for (const user of users) {
        await User.create(user);
      }
      console.log('✓ Users seeded');
    } catch (error) {
      console.error('Error seeding users:', error);
    }
  },

  seedGuardians: async () => {
    try {
      await Guardian.deleteMany({});

      const guardians = [
        {
          name: 'Mary Johnson',
          relationship: 'Mother',
          nationalId: '12345678',
          phoneNumber: '0712345678',
          email: 'mary@example.com',
          physicalAddress: '123 Main St, Kenyenya',
        },
        {
          name: 'John Smith',
          relationship: 'Father',
          nationalId: '87654321',
          phoneNumber: '0712345679',
          email: 'john@example.com',
          physicalAddress: '456 Oak Ave, Kenyenya',
        },
        {
          name: 'Grace Williams',
          relationship: 'Guardian',
          nationalId: '11223344',
          phoneNumber: '0712345680',
          email: 'grace@example.com',
          physicalAddress: '789 Pine Rd, Kenyenya',
        },
      ];

      await Guardian.insertMany(guardians);
      console.log('✓ Guardians seeded');
    } catch (error) {
      console.error('Error seeding guardians:', error);
    }
  },

  seedChildren: async () => {
    try {
      await Child.deleteMany({});

      const admin = await User.findOne({ role: ROLES.ADMINISTRATOR });
      const guardians = await Guardian.find();

      const children = [
        {
          firstName: 'David',
          lastName: 'Johnson',
          dateOfBirth: new Date('2023-01-15'),
          gender: GENDER.MALE,
          birthCertificateNumber: 'BC001',
          bloodGroup: 'O+',
          residence: 'Kenyenya District',
          guardians: guardians.length > 0 ? [guardians[0]._id] : [],
          registeredBy: admin._id,
        },
        {
          firstName: 'Sarah',
          lastName: 'Smith',
          dateOfBirth: new Date('2023-06-20'),
          gender: GENDER.FEMALE,
          birthCertificateNumber: 'BC002',
          bloodGroup: 'A+',
          residence: 'Kenyenya District',
          guardians: guardians.length > 1 ? [guardians[1]._id] : [],
          registeredBy: admin._id,
        },
        {
          firstName: 'Michael',
          lastName: 'Williams',
          dateOfBirth: new Date('2023-03-10'),
          gender: GENDER.MALE,
          birthCertificateNumber: 'BC003',
          bloodGroup: 'B+',
          residence: 'Kenyenya District',
          guardians: guardians.length > 2 ? [guardians[2]._id] : [],
          registeredBy: admin._id,
        },
      ];

      await Child.insertMany(children);
      console.log('✓ Children seeded');
    } catch (error) {
      console.error('Error seeding children:', error);
    }
  },

  seedVaccines: async () => {
    try {
      await Vaccine.deleteMany({});

      const pharmacist = await User.findOne({ role: ROLES.PHARMACIST });

      const vaccines = [
        {
          name: 'BCG',
          batchNumber: 'BCG-001-2024',
          quantityReceived: 100,
          quantityAvailable: 85,
          supplier: 'Global Health Supplies',
          dateReceived: new Date('2024-01-15'),
          expiryDate: new Date('2026-01-15'),
          minStockLevel: 20,
          managedBy: pharmacist._id,
        },
        {
          name: 'OPV',
          batchNumber: 'OPV-001-2024',
          quantityReceived: 150,
          quantityAvailable: 120,
          supplier: 'Global Health Supplies',
          dateReceived: new Date('2024-01-20'),
          expiryDate: new Date('2026-01-20'),
          minStockLevel: 30,
          managedBy: pharmacist._id,
        },
        {
          name: 'Pentavalent',
          batchNumber: 'PENTA-001-2024',
          quantityReceived: 100,
          quantityAvailable: 90,
          supplier: 'Medical Imports Ltd',
          dateReceived: new Date('2024-02-01'),
          expiryDate: new Date('2026-02-01'),
          minStockLevel: 20,
          managedBy: pharmacist._id,
        },
        {
          name: 'PCV',
          batchNumber: 'PCV-001-2024',
          quantityReceived: 80,
          quantityAvailable: 70,
          supplier: 'Vaccine Distributors',
          dateReceived: new Date('2024-02-10'),
          expiryDate: new Date('2026-02-10'),
          minStockLevel: 15,
          managedBy: pharmacist._id,
        },
        {
          name: 'Rotavirus',
          batchNumber: 'RV-001-2024',
          quantityReceived: 60,
          quantityAvailable: 50,
          supplier: 'Vaccine Distributors',
          dateReceived: new Date('2024-03-01'),
          expiryDate: new Date('2026-03-01'),
          minStockLevel: 10,
          managedBy: pharmacist._id,
        },
        {
          name: 'Measles-Rubella',
          batchNumber: 'MR-001-2024',
          quantityReceived: 50,
          quantityAvailable: 45,
          supplier: 'Global Health Supplies',
          dateReceived: new Date('2024-03-15'),
          expiryDate: new Date('2026-03-15'),
          minStockLevel: 10,
          managedBy: pharmacist._id,
        },
        {
          name: 'Yellow Fever',
          batchNumber: 'YF-001-2024',
          quantityReceived: 40,
          quantityAvailable: 35,
          supplier: 'Medical Imports Ltd',
          dateReceived: new Date('2024-04-01'),
          expiryDate: new Date('2026-04-01'),
          minStockLevel: 8,
          managedBy: pharmacist._id,
        },
      ];

      await Vaccine.insertMany(vaccines);
      console.log('✓ Vaccines seeded');
    } catch (error) {
      console.error('Error seeding vaccines:', error);
    }
  },
};

const runSeeders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB');
    console.log('Starting seeders...\n');

    await seeders.seedUsers();
    await seeders.seedGuardians();
    await seeders.seedChildren();
    await seeders.seedVaccines();

    console.log('\n✓ All seeders completed successfully');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error running seeders:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runSeeders();
}

module.exports = seeders;
