import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_CATEGORIES: { name: string; icon: string; subs: string[] }[] = [
  { name: 'Food & Dining', icon: 'Utensils', subs: ['No specific subcategory', 'Swiggy', 'Zomato', 'Zepto Cafe', 'Blinkit Snacks', 'Starbucks', 'Breakfast', 'Lunch', 'Dinner', 'Snacks & Fast Food', 'Desserts', 'Drinks & Boba', 'Street Food'] },
  { name: 'Quick Commerce', icon: 'Zap', subs: ['No specific subcategory', 'Zepto', 'Blinkit', 'Swiggy Instamart', 'BigBasket BB Now', 'Dunzo'] },
  { name: 'Transportation', icon: 'Car', subs: ['No specific subcategory', 'Uber', 'Ola Cabs', 'Rapido Bike', 'Namma Yatri', 'InDrive', 'Fuel & Petrol', 'Metro & Bus Pass', 'Parking & Tolls'] },
  { name: 'Entertainment', icon: 'Film', subs: ['No specific subcategory', 'BookMyShow', 'Netflix', 'Spotify', 'YouTube Premium', 'Prime Video', 'JioCinema / Hotstar', 'Gaming & Steam', 'Events & Concerts'] },
  { name: 'Outing & Social', icon: 'Coffee', subs: ['No specific subcategory', 'Cafes & Hangouts', 'Clubs & Lounges', 'House Parties', 'Weekend Getaway'] },
  { name: 'Personal Care', icon: 'Sparkles', subs: ['No specific subcategory', 'Urban Company', 'Nykaa', 'Salon & Barbershop', 'Grooming & Skincare', 'Spa & Massage'] },
  { name: 'Health & Medical', icon: 'HeartPulse', subs: ['No specific subcategory', 'Tata 1mg', 'PharmEasy', 'Apollo Pharmacy', 'Cult.fit Gym', 'Doctor Consultations', 'Medicines', 'Health Insurance'] },
  { name: 'Stationery & Office', icon: 'Paperclip', subs: ['No specific subcategory', 'Blinkit Stationery', 'Amazon Office Supplies', 'Printouts & Xerox', 'Notebooks & Pens'] },
  { name: 'Subscriptions', icon: 'Repeat', subs: ['No specific subcategory', 'Netflix Premium', 'Spotify Family', 'YouTube Premium', 'ChatGPT Plus', 'iCloud Storage', 'Amazon Prime', 'CultPass Gym'] },
  { name: 'Loans & Lending', icon: 'HandCoins', subs: ['No specific subcategory', 'Friend Loan (Given)', 'Friend Loan (Taken)', 'Credit Card EMI', 'Personal Loan', 'BNPL (Simpl / LazyPay)'] },
  { name: 'Travel & Tickets', icon: 'Plane', subs: ['No specific subcategory', 'MakeMyTrip', 'IRCTC Railway', 'IndiGo Flights', 'EaseMyTrip', 'Hotels & Airbnb', 'Uber Intercity'] },
  { name: 'Utilities & Bills', icon: 'Receipt', subs: ['No specific subcategory', 'Electricity Bill', 'Wi-Fi Broadband (Airtel/Jio)', 'Mobile Prepaid/Postpaid', 'Piped Gas & LPG', 'Water Bill'] },
  { name: 'Shopping', icon: 'ShoppingBag', subs: ['No specific subcategory', 'Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Ajio', 'Electronics & Gadgets', 'Apparel & Shoes'] },
  { name: 'Education', icon: 'GraduationCap', subs: ['No specific subcategory', 'Udemy & Coursera', 'College / Tuition Fees', 'Books & Kindle', 'Exam Registration'] },
  { name: 'Miscellaneous', icon: 'Grid', subs: ['No specific subcategory', 'ATM Cash Withdrawal', 'Gifts & Tips', 'Charity & Donations'] },
];

async function main() {
  const existingCount = await prisma.category.count();
  if (existingCount > 0) {
    console.log(`Categories already seeded (${existingCount} found) — skipping.`);
    return;
  }

  for (let i = 0; i < SEED_CATEGORIES.length; i++) {
    const cat = SEED_CATEGORIES[i];
    const catId = `cat_${i + 1}`;

    await prisma.category.create({
      data: {
        id: catId,
        name: cat.name,
        icon: cat.icon,
        isDefault: true,
        subcategories: {
          create: cat.subs.map((subName, subIdx) => ({
            id: `sub_${i + 1}_${subIdx + 1}`,
            name: subName,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${SEED_CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });