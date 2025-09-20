// Business expense categories based on IRS Schedule C
export enum BusinessExpenseCategory {
  ADVERTISING = "Advertising",
  CAR_AND_TRUCK_EXPENSES = "Car & Truck Expenses",
  COMMISSIONS_AND_FEES = "Commissions & Fees",
  CONTRACT_LABOR = "Contract Labor",
  DEPRECIATION_AND_SECTION_179 = "Depreciation & Expense Deduction",
  EMPLOYEE_BENEFIT_PROGRAMS = "Employee Benefit",
  INSURANCE_OTHER_THAN_HEALTH = "Insurance",
  INTEREST_MORTGAGE_AND_OTHER = "Interest",
  LEGAL_AND_PROFESSIONAL_SERVICES = "Legal & Professional Services",
  OFFICE_EXPENSES = "Office Expenses",
  PENSION_AND_PROFIT_SHARING = "Pension & Profit-Sharing Plans",
  RENT_OR_LEASE = "Rent & Lease",
  REPAIRS_AND_MAINTENANCE = "Repairs & Maintenance",
  SUPPLIES = "Supplies",
  TAXES_AND_LICENSES = "Taxes and Licenses",
  TRAVEL_AND_MEALS = "Travel & Meals",
  UTILITIES = "Utilities",
  WAGES = "Wages",
  OTHER_EXPENSES = "Other Expenses",
}

// Income categories for revenue transactions
export enum IncomeCategory {
  REFUND = "Refund",
  INTEREST = "Interest Income",
  INCOME = "Income",
  DEPOSIT = "Deposit",
  DONATION = "Donation",
}

// Helper functions to work with categories
export const getBusinessExpenseCategories = (): string[] => {
  return Object.values(BusinessExpenseCategory);
};

export const getIncomeCategories = (): string[] => {
  return Object.values(IncomeCategory);
};

export const getAllCategories = (): string[] => {
  return [...getBusinessExpenseCategories(), ...getIncomeCategories()];
};

export const isBusinessExpenseCategory = (category: string): boolean => {
  return Object.values(BusinessExpenseCategory).includes(
    category as BusinessExpenseCategory
  );
};

export const isIncomeCategory = (category: string): boolean => {
  return Object.values(IncomeCategory).includes(category as IncomeCategory);
};

// For backward compatibility, export the categories array
export const categories = getBusinessExpenseCategories();
export const incomeCategories = getIncomeCategories();
