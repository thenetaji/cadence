/** Small sample files in the three supported formats; used by tests and the dev-only import preview. */

export const DIME_SAMPLE = `Date,Note,Amount,Category,Type
2023-09-26 14:42:00 +0000,Doctor’s Appointment,70.30,Healthcare,Expense
2023-09-26 01:48:00 +0000,Spotify,9.80,Subscriptions,Expense
2023-09-24 19:50:00 +0000,Uber,35.20,Transport,Expense
2023-09-24 01:50:00 +0000,Bills,25.00,Groceries,Expense
2023-09-23 01:51:00 +0000,Groceries,40.00,Groceries,Expense
2023-09-18 07:53:00 +0000,Mother’s Day Gift,57.14,Family,Expense
2023-09-13 01:49:00 +0000,T Shirt,35.60,Fashion,Expense
2023-09-10 16:32:00 +0000,McDonalds,10.20,Food,Expense
2023-09-01 09:00:00 +0000,September pay,3200.00,Salary,Income
`;

export const CASHEW_SAMPLE = `account,amount,currency,title,note,date,income,type,category name,subcategory name,color,icon,emoji,budget,objective
Main,-12.5,usd,Blue Bottle,Oat flat white,2024-03-05 08:32:10.000,false,null,Food & Drink,Coffee,0xff2196f3,,,,
Main,-86.4,usd,"Trader Joe's","Weekly shop, incl. wine",2024-03-04 18:05:00.000,false,null,Groceries,,0xff4caf50,,,,
Main,2400.0,usd,Paycheck,,2024-03-01 09:00:00.000,true,null,Salary,,0xffff9800,,,,
Savings,-9.99,usd,Netflix,,2024-03-03 12:00:00.000,false,1,Subscriptions,,0xff9c27b0,,,,
`;

export const FARTHING_SAMPLE = `﻿date,time,kind,title,memo,amount,currency,category,account,transfer_account,transfer_amount,split_index,split_count,id\r
2024-03-05,08:32,expense,Blue Bottle,,12.50,USD,Food & Drink,Main,,,1,1,a1\r
2024-03-04,18:05,expense,Costco,"Bulk, ""party"" run",60.00,USD,Groceries,Main,,,1,2,a2\r
2024-03-04,18:05,expense,Costco,"Bulk, ""party"" run",26.40,USD,Shopping,Main,,,2,2,a2\r
2024-03-01,09:00,income,Paycheck,,2400.00,USD,Salary,Main,,,1,1,a3\r
2024-03-02,10:00,transfer,To savings,,500.00,USD,,Main,Savings,500.00,1,1,a4\r
`;

/** A larger Dime-style file with deterministic content, for the dev preview screenshot. */
export function dimeFixture(rows: number): string {
  const sample: readonly (readonly [string, string, string, string])[] = [
    ['Swiggy', '14.20', 'Food', 'Expense'],
    ['Uber', '8.75', 'Transport', 'Expense'],
    ['Whole Foods', '63.10', 'Groceries', 'Expense'],
    ['Spotify', '9.99', 'Subscriptions', 'Expense'],
    ['Rent', '1200.00', 'Housing', 'Expense'],
    ['Pharmacy', '18.40', 'Healthcare', 'Expense'],
    ['Freelance', '850.00', 'Freelance', 'Income'],
    ['Cinema', '22.00', 'Fun', 'Expense'],
  ];
  const lines = ['Date,Note,Amount,Category,Type'];
  for (let i = 0; i < rows; i++) {
    const [note, amount, category, type] = sample[i % sample.length] as (typeof sample)[number];
    const day = String(1 + (i % 28)).padStart(2, '0');
    const month = String(1 + (Math.floor(i / 28) % 12)).padStart(2, '0');
    const hour = String(8 + (i % 12)).padStart(2, '0');
    lines.push(`2023-${month}-${day} ${hour}:${String((i * 7) % 60).padStart(2, '0')}:00 +0000,${note},${amount},${category},${type}`);
  }
  return `${lines.join('\n')}\n`;
}
