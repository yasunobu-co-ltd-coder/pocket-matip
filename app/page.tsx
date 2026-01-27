'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Record, getRecords, createRecord, deleteRecord, searchRecords } from '@/lib/records';
import HomeTab from '@/components/HomeTab';
import RecordTab from '@/components/RecordTab';
import SearchTab from '@/components/SearchTab';
import QuickMemoModal from '@/components/QuickMemoModal';
import RecordDetailModal from '@/components/RecordDetailModal';

type TabId = 'home' | 'record' | 'search';

export default function Page() {
  // Tab State
  const [activeTab, setActiveTab] = useState<TabId>('home');

  // Data State
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [quickMemoOpen, setQuickMemoOpen] = useState(false);
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Load records on mount
  const loadRecords = useCallback(async () => {
    setLoading(true);
    const data = await getRecords(100);
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Tab switch handler
  const switchTab = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  // Quick Memo handlers
  const openQuickMemo = () => setQuickMemoOpen(true);
  const closeQuickMemo = () => setQuickMemoOpen(false);

  const saveQuickMemo = async (customer: string, content: string) => {
    const newRecord = await createRecord({
      type: 'memo',
      customer: customer || 'メモ',
      content,
      createdAt: new Date().toISOString(),
    });
    if (newRecord) {
      setRecords([newRecord, ...records]);
      closeQuickMemo();
      return true;
    }
    return false;
  };

  // Photo capture handler
  const openPhotoCapture = () => {
    switchTab('record');
    // Trigger image input after tab switch
    setTimeout(() => {
      const imageInput = document.getElementById('imageInput') as HTMLInputElement;
      if (imageInput) imageInput.click();
    }, 300);
  };

  // Record detail handlers
  const viewRecord = (id: string) => {
    setSelectedRecordId(id);
    setRecordDetailOpen(true);
  };

  const closeRecordDetail = () => {
    setRecordDetailOpen(false);
    setSelectedRecordId(null);
  };

  const handleDeleteRecord = async (id: string) => {
    const success = await deleteRecord(id);
    if (success) {
      setRecords(records.filter((r) => r.id !== id));
      closeRecordDetail();
    }
    return success;
  };

  // Save new negotiation record
  const saveNegotiationRecord = async (
    customer: string,
    contact: string,
    project: string,
    content: string,
    imageUrls: string[]
  ) => {
    const newRecord = await createRecord({
      type: 'negotiation',
      customer,
      contact,
      project,
      content,
      createdAt: new Date().toISOString(),
      imageUrls,
    });
    if (newRecord) {
      setRecords([newRecord, ...records]);
      return true;
    }
    return false;
  };

  // Search handler
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      return records;
    }
    return await searchRecords(query);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📱</div>
            <h1>Pocket Matip</h1>
          </div>
          <p>営業活動特化型モバイルアシスタント</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ marginTop: '-24px' }}>
        {/* Home Tab */}
        <div className={`tab-panel ${activeTab === 'home' ? 'active' : ''}`}>
          <HomeTab
            records={records}
            loading={loading}
            onSwitchTab={switchTab}
            onOpenPhotoCapture={openPhotoCapture}
            onViewRecord={viewRecord}
          />
        </div>

        {/* Record Tab */}
        <div className={`tab-panel ${activeTab === 'record' ? 'active' : ''}`}>
          <RecordTab onSaveRecord={saveNegotiationRecord} />
        </div>

        {/* Search Tab */}
        <div className={`tab-panel ${activeTab === 'search' ? 'active' : ''}`}>
          <SearchTab
            onSearch={handleSearch}
            onViewRecord={viewRecord}
          />
        </div>
      </div>

      {/* Modals */}
      {quickMemoOpen && (
        <QuickMemoModal onClose={closeQuickMemo} onSave={saveQuickMemo} />
      )}

      {recordDetailOpen && selectedRecordId && (
        <RecordDetailModal
          recordId={selectedRecordId}
          onClose={closeRecordDetail}
          onDelete={handleDeleteRecord}
        />
      )}
    </div>
  );
}
