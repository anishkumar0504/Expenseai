import React from 'react';
import {
  Utensils,
  Zap,
  Car,
  Film,
  Coffee,
  Sparkles,
  HeartPulse,
  Paperclip,
  Repeat,
  HandCoins,
  Plane,
  Receipt,
  ShoppingBag,
  GraduationCap,
  Grid,
  Wallet,
  CreditCard,
  Building,
  Banknote,
  Smartphone,
  Tag,
} from 'lucide-react';
import { PaymentMode } from '../types.js';

export function renderCategoryIcon(iconName: string, className = 'w-5 h-5') {
  switch (iconName) {
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'Film':
      return <Film className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'Paperclip':
      return <Paperclip className={className} />;
    case 'Repeat':
      return <Repeat className={className} />;
    case 'HandCoins':
      return <HandCoins className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    case 'Receipt':
      return <Receipt className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Grid':
    default:
      return <Grid className={className} />;
  }
}

export function renderPaymentModeBadge(mode: PaymentMode) {
  switch (mode) {
    case 'UPI':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Smartphone className="w-3 h-3" /> UPI
        </span>
      );
    case 'CREDIT_CARD':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <CreditCard className="w-3 h-3" /> Credit Card
        </span>
      );
    case 'DEBIT_CARD':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <CreditCard className="w-3 h-3" /> Debit Card
        </span>
      );
    case 'CASH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Banknote className="w-3 h-3" /> Cash
        </span>
      );
    case 'NETBANKING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Building className="w-3 h-3" /> Netbanking
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Wallet className="w-3 h-3" /> {mode}
        </span>
      );
  }
}
