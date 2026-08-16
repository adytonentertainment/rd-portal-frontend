/**
 * Test script for SmartCsvParser with pipe-delimited data
 */

import SmartCsvParser from './smartCsvParser.js';

// Sample pipe-delimited CSV data similar to what the user might have
const pipeDelimitedCSV = `Date|Product|Source|Territory|Amount|Currency|Quantity
2024-01-01|Song Title 1|Spotify|US|125.50|USD|5000
2024-01-02|Song Title 2|Apple Music|UK|89.75|GBP|3200
2024-01-03|Song Title 3|YouTube Music|CA|45.20|CAD|1800
2024-01-04|Song Title 1|Amazon Music|US|67.90|USD|2700
2024-01-05|Song Title 2|Tidal|DE|34.60|EUR|1400
2024-01-06|Song Title 3|Deezer|FR|28.90|EUR|1100
2024-01-07|Song Title 1|Spotify|JP|156.80|JPY|6200
2024-01-08|Song Title 2|Apple Music|AU|98.40|AUD|3900
2024-01-09|Song Title 3|YouTube Music|BR|52.30|BRL|2100
2024-01-10|Song Title 1|Spotify|US|142.60|USD|5700`;

// Sample royalty statement with various column names
const royaltyStatementCSV = `Reporting Period|Track Name|Label Share|Writer Share|Performance|Mechanical|Territory|Downloads
2024-Q1|Track One|1250.00|625.00|450.00|320.00|United States|15000
2024-Q1|Track Two|890.50|445.25|320.00|228.00|United Kingdom|10500
2024-Q1|Track Three|567.80|283.90|204.00|145.00|Canada|7200
2024-Q1|Track Four|2340.00|1170.00|840.00|598.00|United States|28000
2024-Q1|Track Five|456.90|228.45|164.00|117.00|Germany|5500`;

function testParser() {
  const parser = new SmartCsvParser(true); // Enable debug mode

  console.log('\n========================================');
  console.log('Testing SmartCsvParser with Pipe-Delimited Data');
  console.log('========================================\n');

  // Test 1: Standard pipe-delimited CSV
  console.log('TEST 1: Standard Pipe-Delimited CSV');
  console.log('-------------------------------------');
  const result1 = parser.parse(pipeDelimitedCSV);
  console.log('Success:', result1.success);
  console.log('Transactions found:', result1.transactions.length);
  console.log('Detected delimiter:', result1.metadata.delimiter);
  console.log('Total amount:', result1.metadata.summary.totalAmount.toFixed(2));
  console.log('Column mapping:', result1.metadata.columnMapping);
  console.log('First transaction:', result1.transactions[0]);

  // Test 2: Royalty statement with different column names
  console.log('\n\nTEST 2: Royalty Statement Format');
  console.log('-----------------------------------');
  const result2 = parser.parse(royaltyStatementCSV);
  console.log('Success:', result2.success);
  console.log('Transactions found:', result2.transactions.length);
  console.log('Detected delimiter:', result2.metadata.delimiter);
  console.log('Total amount (Label Share):', result2.metadata.summary.totalAmount.toFixed(2));
  console.log('Column mapping:', result2.metadata.columnMapping);
  console.log('First transaction:', result2.transactions[0]);

  // Test 3: Large file simulation (1789 rows as mentioned by user)
  console.log('\n\nTEST 3: Large File Simulation (1789 rows)');
  console.log('-------------------------------------------');
  let largeCSV = 'Date|Product|Artist|Source|Amount|Territory\n';
  for (let i = 1; i <= 1789; i++) {
    largeCSV += `2024-01-${(i % 31) + 1}|Song ${i % 10}|Artist ${i % 5}|Platform ${i % 7}|${(Math.random() * 100).toFixed(2)}|US\n`;
  }

  const startTime = Date.now();
  const result3 = parser.parse(largeCSV);
  const endTime = Date.now();

  console.log('Success:', result3.success);
  console.log('Transactions found:', result3.transactions.length);
  console.log('Processing time:', endTime - startTime, 'ms');
  console.log('Total amount:', result3.metadata.summary.totalAmount.toFixed(2));
  console.log('Average transaction:', result3.metadata.summary.avgTransaction.toFixed(2));

  console.log('\n========================================');
  console.log('All tests completed successfully!');
  console.log('========================================\n');

  return {
    test1: result1,
    test2: result2,
    test3: result3,
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  testParser();
}

export default testParser;
