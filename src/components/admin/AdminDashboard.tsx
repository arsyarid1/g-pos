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
      {/* Top Bar Back-Office (Responsif & Rapi Tanpa Tabrakan di Mobile) */}
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-2xs">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.name}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain border-0 shadow-none bg-transparent shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-purple-600/20 shrink-0">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px]">
                {settings?.name || 'Gastro Resto'}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[10px] uppercase tracking-wider shrink-0">
                Back-Office
              </span>
            </div>
            <p className="text-[10px] text-purple-700 font-bold sm:hidden leading-none mt-0.5">
              Admin Back-Office
            </p>
            <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
              Panel Pengelola & Pemilik Restoran
            </p>
          </div>
        </div>

        {/* Right: Quick Links to POS Kasir, Layar Dapur & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Tombol Akses Kasir POS */}
          <button
            type="button"
            onClick={onReturnToPOS}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition cursor-pointer shadow-2xs"
            title="Buka Layar Kasir POS"
          >
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            <span>Kasir</span>
            <span className="hidden sm:inline">POS</span>
          </button>

          {/* Tombol Akses Layar Dapur */}
          {onOpenKitchen && (
            <button
              type="button"
              onClick={onOpenKitchen}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer shadow-2xs"
              title="Buka Layar Antrian Masak Dapur"
            >
              <ChefHat className="w-3.5 h-3.5 shrink-0" />
              <span>Dapur</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1" />

          {/* Tombol Keluar / Kunci Akses */}
          <button
            type="button"
            onClick={onLockAdmin}
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition cursor-pointer border border-slate-200"
            title="Kunci sesi admin dan kembali ke halaman login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar (Desktop) + Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Navigation Sidebar (Hanya tampil di Desktop/Tablet Mendatar) */}
        <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200/90 p-4 shrink-0 flex-col gap-1.5 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
            Menu Manajemen
          </div>

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

          {/* 5. Pengaturan Resto & Brand */}
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

        {/* Content Pane (Dengan padding bottom responsif untuk mobile bar) */}
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
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto">
                <RestaurantSettingsView
                  currentSettings={settings}
                  onSettingsSaved={onSettingsSaved}
                />
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto">
                <MenuManagementView />
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto">
                <InventoryView />
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto">
                <StaffManagementView />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Sangat Ergonomis & Ramah Jempol di Layar HP) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 shadow-2xl flex items-center justify-around">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'overview' ? 'bg-orange-100 scale-105' : 'bg-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">Ringkasan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'menu' ? 'bg-orange-100 scale-105' : 'bg-transparent'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">Menu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'inventory' ? 'bg-orange-100 scale-105' : 'bg-transparent'
            }`}
          >
            <Boxes className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">Bahan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'staff' ? 'bg-orange-100 scale-105' : 'bg-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">Staf</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-orange-100 scale-105' : 'bg-transparent'
            }`}
          >
            <Store className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">Pengaturan</span>
        </button>
      </nav>

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
