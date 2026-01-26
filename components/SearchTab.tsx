'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Record } from '@/lib/records';

type SearchTabProps = {
  onSearch: (query: string) => Promise<Record[]>;
  onViewRecord: (id: string) => void;
};

export default function SearchTab({ onSearch, onViewRecord }: SearchTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  const performSearch = useCallback(
    async (query: string) => {
      setLoading(true);
      setHasSearched(true);
      const data = await onSearch(query);
      setResults(data);
      setLoading(false);
    },
    [onSearch]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.trim() || hasSearched) {
        performSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery, performSearch, hasSearched]);

  // Initial load - show all records
  useEffect(() => {
    performSearch('');
  }, [performSearch]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const quickSearchKeywords = ['商談', 'ポンプ', '見積', '打合せ', '契約'];

  return (
    <>
      {/* Search Box */}
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="顧客名、内容で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Search Keywords */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {quickSearchKeywords.map((keyword) => (
          <button
            key={keyword}
            className="tag"
            style={{ cursor: 'pointer', border: 'none' }}
            onClick={() => setSearchQuery(keyword)}
          >
            {keyword}
          </button>
        ))}
      </div>

      {/* Search Results */}
      <div className="card">
        <div className="card-title">
          <span>📄</span>
          検索結果
          {results.length > 0 && (
            <span className="badge" style={{ background: 'var(--accent-primary)' }}>
              {results.length}
            </span>
          )}
        </div>
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              検索中...
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              該当する記録はありません
            </div>
          ) : (
            results.map((record) => {
              const summary =
                record.type === 'memo'
                  ? record.content.substring(0, 60) + (record.content.length > 60 ? '...' : '')
                  : record.content.replace(/<[^>]*>/g, '').substring(0, 60) + '...';

              return (
                <div
                  key={record.id}
                  className="history-item"
                  onClick={() => onViewRecord(record.id)}
                >
                  <div className="history-header">
                    <span className="history-customer">{record.customer || '名称なし'}</span>
                    <span className="history-date">{formatDate(record.createdAt)}</span>
                  </div>
                  <div className="history-summary">{summary}</div>
                  <div className="history-tags">
                    <span className="tag">{record.type === 'memo' ? 'メモ' : '商談'}</span>
                    {record.project && <span className="tag">{record.project}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
