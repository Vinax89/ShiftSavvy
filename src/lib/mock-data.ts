export type Shift = {
  id: string;
  start: Date;
  end: Date;
  site: string;
  netPay: number;
};

export const upcomingShifts: Shift[] = [
  {
    id: '1',
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(new Date().getHours() + 8)),
    site: 'Main Hospital',
    netPay: 224,
  },
  {
    id: '2',
    start: new Date(new Date().setDate(new Date().getDate() + 2)),
    end: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(new Date().getHours() + 8)),
    site: 'Downtown Clinic',
    netPay: 240,
  },
  {
    id: '3',
    start: new Date(new Date().setDate(new Date().getDate() + 4)),
    end: new Date(new Date(new Date().setDate(new Date().getDate() + 4)).setHours(new Date().getHours() + 12)),
    site: 'Main Hospital',
    netPay: 380,
  },
];

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: string;
};

export const upcomingBills: Bill[] = [
  {
    id: '1',
    name: 'Rent',
    amount: 1500,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    category: 'Housing',
  },
  {
    id: '2',
    name: 'Internet',
    amount: 70,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
    category: 'Utilities',
  },
  {
    id: '3',
    name: 'Car Payment',
    amount: 350,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20),
    category: 'Transport',
  },
   {
    id: '4',
    name: 'Visa Credit Card',
    amount: 120,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 18),
    category: 'Debt',
  },
];

export const incomeData = [
    { date: 'Jan', netIncome: 3800 },
    { date: 'Feb', netIncome: 4100 },
    { date: 'Mar', netIncome: 3900 },
    { date: 'Apr', netIncome: 4500 },
    { date: 'May', netIncome: 4200 },
    { date: 'Jun', netIncome: 5100 },
];
