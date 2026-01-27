'use client';

import React from 'react';

type TabId = 'home' | 'record' | 'search';

type TabNavProps = {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
};

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'ホーム' },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
