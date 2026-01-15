import React, { useState } from 'react';
import { Menu, X, Home, Users, PieChart, Settings, CreditCard, ChevronRight, History, Calculator } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (section: string) => void;
  activeSection?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, activeSection = 'home' }) => {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home, color: 'text-indigo-600' },
    { id: 'roommates', label: 'Roommates', icon: Users, color: 'text-indigo-600' },
    { id: 'settlement', label: 'Settlement', icon: PieChart, color: 'text-indigo-600' },
    { id: 'item-split', label: 'Item Split Calculator', icon: Calculator, color: 'text-orange-600' },
    { id: 'billing-history', label: 'Billing History', icon: History, color: 'text-purple-600' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
  ];

  const handleItemClick = (id: string) => {
    if (onNavigate) {
      onNavigate(id);
    }
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <CreditCard size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">RoomieSplit</h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors group ${
                  activeSection === item.id
                    ? 'bg-indigo-100 border border-indigo-200 shadow-sm'
                    : 'hover:bg-indigo-50'
                }`}
              >
                <Icon 
                  size={20} 
                  className={`${
                    activeSection === item.id ? 'text-indigo-700' : item.color
                  } group-hover:scale-110 transition-transform`} 
                />
                <span className={`flex-1 font-medium transition-colors ${
                  activeSection === item.id
                    ? 'text-indigo-700 font-semibold'
                    : 'text-gray-700 group-hover:text-indigo-600'
                }`}>
                  {item.label}
                </span>
                <ChevronRight 
                  size={16} 
                  className={`${
                    activeSection === item.id
                      ? 'text-indigo-600 opacity-100'
                      : 'text-gray-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100'
                  } transition-all`} 
                />
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <p className="font-semibold text-gray-700 mb-1">RoomieSplit</p>
            <p>Expense Manager v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

