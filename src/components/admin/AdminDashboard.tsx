import React, { useState } from 'react';
import type { RestaurantSettings, LocalOrder } from '../../types';
import { AdminOverviewView } from './AdminOverviewView';
import { RestaurantSettingsView } from './RestaurantSettingsView';
import { MenuManagementView } from './MenuManagementView';
import { InventoryView } from './InventoryView';
import { StaffManagementView } from './StaffManagementView';
import { ReceiptModal } from '../pos/ReceiptModal';
import {
  Store,
  UtensilsCrossed,
  Boxes,
  Users,
  ArrowLeft,
  Lock,
  LayoutDashboard,
  Utensils,
  ChefHat,
  LogOut,
} from 'lucide-react';

interface AdminDashboardProps {
  settings: RestaurantSettings | null;
  onSettingsSaved: (newSettings: RestaurantSettings) => void;
  onReturnToPOS: () => void;
  onOpenKitchen?: () => void;
  onLockAdmin: () => void;
  onViewReceipt?: (order: LocalOrder) => void;
}

type AdminTab = 'overview' | 'menu' | 'inventory' | 'staff' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  onSettingsSaved,
  onReturnToPOS,
  onOpenKitchen,
  onLockAdmin,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [previewReceiptOrder, setPreviewReceiptOrder] = useState<LocalOrder | null>(null);

  const handleOpenReceipt = (order: LocalOrder) => {
    if (onViewReceipt) {
      onViewReceipt(order);
    }
    setPreviewReceiptOrder(order);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Top Bar Back-Office */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-2xs">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.name}
              className="w-10 h-10 object-contain border-0 shadow-none bg-transparent"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-purple-600/20">
              <LayoutDashboard className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                {settings?.name || 'Gastro Resto'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[10px] uppercase tracking-wider">
                Back-Office
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Panel Pengelola & Pemilik Restoran
            </p>
          </div>
        </div>

        {/* Right: Quick Links to POS Kasir, Layar Dapur & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Akses Kasir POS */}
          <button
            type="button"
            onClick={onReturnToPOS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition cursor-pointer shadow-2xs"
            title="Buka Layar Kasir POS"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Kasir POS</span>
          </button>

          {/* Tombol Akses Layar Dapur */}
          {onOpenKitchen && (
            <button
              type="button"
              onClick={onOpenKitchen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer shadow-2xs"
              title="Buka Layar Antrian Masak Dapur"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Layar Dapur</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Tombol Keluar / Kunci Akses */}
          <button
            type="button"
            onClick={onLockAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition cursor-pointer border border-slate-200"
            title="Kunci sesi admin dan kembali ke halaman login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200/90 p-3 sm:p-4 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
          {/* 1. Ringkasan & Analitik Bisnis */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Ringkasan & Penjualan</span>
          </button>

          {/* 2. Menu & Resep (BOM) */}
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span>Menu & Resep (BOM)</span>
          </button>

          {/* 3. Inventori Bahan Baku */}
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0" />
            <span>Inventori Bahan Baku</span>
          </button>

          {/* 4. Staf & Akses PIN */}
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Staf & Akses PIN</span>
          </button>

          {/* 5. Pengaturan Resto & Brand (Diletakkan di bawah Staf & Akses PIN) */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>Pengaturan Resto & Brand</span>
          </button>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'overview' && (
            <AdminOverviewView
              onNavigateTab={(tab) => setActiveTab(tab)}
              onViewReceipt={handleOpenReceipt}
              onOpenPOS={onReturnToPOS}
              onOpenKitchen={onOpenKitchen}
            />
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                <RestaurantSettingsView
                  currentSettings={settings}
                  onSettingsSaved={onSettingsSaved}
                />
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                <MenuManagementView />
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                <InventoryView />
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                <StaffManagementView />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Preview Struk saat dibuka dari Dashboard Admin */}
      {previewReceiptOrder && (
        <ReceiptModal
          order={previewReceiptOrder}
          onClose={() => setPreviewReceiptOrder(null)}
          onNewOrder={() => setPreviewReceiptOrder(null)}
          isReprint={true}
          settings={settings}
        />
      )}
    </div>
  );
};
