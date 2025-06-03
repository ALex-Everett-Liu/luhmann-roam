#!/usr/bin/env node

/**
 * Script to populate sequence IDs for graph and word group tables
 * Run this after updating the database schema to ensure all existing records have sequence IDs
 */

const { addMissingSequenceIdColumns, populateGraphAndWordGroupSequenceIds } = require('../database');

async function main() {
  console.log('Starting sequence ID population for graph and word group tables...');
  
  try {
    // First, add any missing sequence_id columns
    console.log('Step 1: Adding missing sequence_id columns...');
    await addMissingSequenceIdColumns();
    
    // Then populate sequence IDs for existing data
    console.log('Step 2: Populating sequence IDs for existing data...');
    const success = await populateGraphAndWordGroupSequenceIds();
    
    if (success) {
      console.log('✅ Successfully populated sequence IDs for all graph and word group tables!');
    } else {
      console.log('❌ Failed to populate sequence IDs. Check the logs for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during sequence ID population:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { main }; 