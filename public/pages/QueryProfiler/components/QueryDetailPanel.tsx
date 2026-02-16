/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiBasicTable,
  EuiBadge,
} from '@elastic/eui';
import { QueryDetailProps } from '../types';
import { PROFILER_COLORS, DEFAULT_THRESHOLDS, getBarColor } from '../constants';

/**
 * Component for displaying detailed query information including timing breakdown
 */
export const QueryDetailPanel: React.FC<QueryDetailProps> = ({ 
  query,
  redThreshold = DEFAULT_THRESHOLDS.RED,
  orangeThreshold = DEFAULT_THRESHOLDS.ORANGE,
}) => {
  const [showVisualBreakdown, setShowVisualBreakdown] = useState(true);
  const [expandedHierarchyNodes, setExpandedHierarchyNodes] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'operation' | 'timeNs' | 'count'>('operation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Format breakdown entries for display (filtered for visual view)
  const breakdownEntries = useMemo(() => {
    if (!query || !query.breakdown) return [];

    const entries: Array<{ operation: string; timeNs: number; count: number }> = [];
    const breakdown = query.breakdown;

    // Group time and count pairs
    const processedKeys = new Set<string>();

    Object.keys(breakdown).forEach((key) => {
      if (processedKeys.has(key)) return;

      // Skip count keys, we'll process them with their time counterparts
      if (key.endsWith('_count')) {
        return;
      }

      const countKey = `${key}_count`;
      const timeValue = breakdown[key];
      const countValue = breakdown[countKey] || 0;

      // Only include operations with non-zero time or count
      if (typeof timeValue === 'number' && (timeValue > 0 || countValue > 0)) {
        entries.push({
          operation: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          timeNs: timeValue,
          count: typeof countValue === 'number' ? countValue : 0,
        });
        processedKeys.add(key);
        processedKeys.add(countKey);
      }
    });

    return entries.sort((a, b) => b.timeNs - a.timeNs);
  }, [query]);

  // Format ALL breakdown entries for raw data view (includes 0 values)
  const allBreakdownEntries = useMemo(() => {
    if (!query || !query.breakdown) return [];

    const entries: Array<{ operation: string; timeNs: number; count: number }> = [];
    const breakdown = query.breakdown;

    // Group time and count pairs
    const processedKeys = new Set<string>();

    Object.keys(breakdown).forEach((key) => {
      if (processedKeys.has(key)) return;

      // Skip count keys, we'll process them with their time counterparts
      if (key.endsWith('_count')) {
        return;
      }

      const countKey = `${key}_count`;
      const timeValue = breakdown[key];
      const countValue = breakdown[countKey] || 0;

      // Include ALL operations (even with 0 time and 0 count)
      if (typeof timeValue === 'number') {
        entries.push({
          operation: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          timeNs: timeValue,
          count: typeof countValue === 'number' ? countValue : 0,
        });
        processedKeys.add(key);
        processedKeys.add(countKey);
      }
    });

    return entries.sort((a, b) => b.timeNs - a.timeNs);
  }, [query]);

  // Get max time for bar scaling
  const maxTime = useMemo(() => {
    return Math.max(...breakdownEntries.map((e) => e.timeNs), 1);
  }, [breakdownEntries]);

  // Recursive function to render query hierarchy tree
  const renderQueryHierarchy = (children: any[], depth: number = 0, parentPath: string = ''): React.ReactNode => {
    return children.map((child: any, index: number) => {
      const nodeId = parentPath ? `${parentPath}-${index}` : `${index}`;
      const childPercentage = child.percentage ||
        (child.time_in_nanos && query?.time_in_nanos
          ? (child.time_in_nanos / query.time_in_nanos) * 100
          : 0);

      const hasChildren = child.children && child.children.length > 0;
      const isExpanded = expandedHierarchyNodes[nodeId] === true; // Default collapsed

      const toggleNode = () => {
        setExpandedHierarchyNodes(prev => ({
          ...prev,
          [nodeId]: !prev[nodeId]
        }));
      };

      return (
        <div key={nodeId}>
          <div style={{
            marginBottom: '8px',
            marginLeft: `${depth * 20}px`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            backgroundColor: depth === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.5)',
            borderRadius: '4px',
            cursor: hasChildren ? 'pointer' : 'default'
          }}
          onClick={hasChildren ? toggleNode : undefined}
          >
            {/* Expand/collapse arrow only for nodes with children */}
            {hasChildren ? (
              <span style={{
                width: '16px',
                fontSize: '10px',
                color: '#69707D',
                flexShrink: 0
              }}>
                {isExpanded ? '▼' : '▸'}
              </span>
            ) : (
              <span style={{ width: '16px', flexShrink: 0 }} />
            )}

            {/* Query type */}
            <div style={{ flex: 1 }}>
              <EuiText size="s" style={{ fontWeight: 500 }}>
                {child.type || child.queryName || 'Query'}
              </EuiText>
              {/* Show description in smaller, subdued text if it's different from type */}
              {child.description && child.description !== child.type && (
                <EuiText size="xs" color="subdued" style={{
                  fontFamily: 'monospace',
                  marginTop: '2px',
                  wordBreak: 'break-all',
                  maxWidth: '600px',
                  lineHeight: '1.3',
                  fontSize: '11px'
                }}>
                  {child.description.length > 100
                    ? `${child.description.substring(0, 100)}...`
                    : child.description}
                </EuiText>
              )}
            </div>

            {/* Percentage badge */}
            <EuiBadge color="warning" style={{ flexShrink: 0, fontWeight: 600 }}>
              {childPercentage.toFixed(1)}%
            </EuiBadge>
          </div>

          {/* Recursively render children only if expanded */}
          {hasChildren && isExpanded && renderQueryHierarchy(child.children, depth + 1, nodeId)}
        </div>
      );
    });
  };

  const columns = [
    {
      field: 'operation',
      name: 'Operation',
      width: '30%',
    },
    {
      field: 'timeNs',
      name: 'Time (ns)',
      width: '50%',
      render: (timeNs: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <div
              style={{
                width: '100%',
                height: '20px',
                backgroundColor: PROFILER_COLORS.BAR_BACKGROUND,
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(timeNs / maxTime) * 100}%`,
                  height: '100%',
                  backgroundColor: getBarColor(timeNs, maxTime, redThreshold, orangeThreshold),
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: '100px' }}>
            <EuiText size="s">{timeNs.toLocaleString()} ns</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'count',
      name: 'Count',
      width: '20%',
      align: 'right' as const,
      render: (count: number) => (
        <EuiText size="s">{count > 0 ? count.toLocaleString() : '—'}</EuiText>
      ),
    },
  ];

  if (!query) {
    return (
      <EuiPanel paddingSize="m" style={{ height: '100%' }}>
        <EuiText size="s" color="subdued" textAlign="center">
          Select a query to view details
        </EuiText>
      </EuiPanel>
    );
  }

  const timeMs = query.time_ms || (query.time_in_nanos || 0) / 1000000;

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2 style={{ fontWeight: 600, fontSize: '22px' }}>{query.type || query.queryName || 'Query'}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div style={{ textAlign: 'right' }}>
            <EuiText size="xs" color="subdued" style={{ fontSize: '11px' }}>
              Total time
            </EuiText>
            <EuiTitle size="s">
              <h3 style={{ fontWeight: 600, fontSize: '20px' }}>{timeMs.toFixed(2)} ms</h3>
            </EuiTitle>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {query.description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" style={{ fontFamily: 'monospace', lineHeight: '1.5', fontSize: '12px' }}>
            {query.description}
          </EuiText>
        </>
      )}

      <EuiSpacer size="m" />

      {/* Query Hierarchy Section */}
      <div style={{ marginBottom: '24px' }}>
        <EuiTitle size="s">
          <h3 style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>Query Hierarchy</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued" style={{ marginBottom: '16px' }}>
          The hierarchical structure of the query and its subqueries.
        </EuiText>

        <div style={{
          backgroundColor: '#F7F8FA',
          padding: '12px 16px',
          borderRadius: '6px',
          border: '1px solid #D3DAE6'
        }}>
          {/* Render the current query first */}
          <div style={{
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            backgroundColor: 'transparent',
            borderRadius: '4px',
            cursor: query.children && query.children.length > 0 ? 'pointer' : 'default'
          }}
          onClick={query.children && query.children.length > 0 ? () => {
            setExpandedHierarchyNodes(prev => ({
              ...prev,
              'root': !prev['root']
            }));
          } : undefined}
          >
            {/* Expand/collapse arrow only if has children */}
            {query.children && query.children.length > 0 ? (
              <span style={{
                width: '16px',
                fontSize: '10px',
                color: '#69707D',
                flexShrink: 0
              }}>
                {expandedHierarchyNodes['root'] ? '▼' : '▸'}
              </span>
            ) : (
              <span style={{ width: '16px', flexShrink: 0 }} />
            )}

            {/* Query type */}
            <div style={{ flex: 1 }}>
              <EuiText size="s" style={{ fontWeight: 500 }}>
                {query.type || query.queryName || 'Query'}
              </EuiText>
              {/* Show description in smaller, subdued text if it's different from type */}
              {query.description && query.description !== query.type && (
                <EuiText size="xs" color="subdued" style={{
                  fontFamily: 'monospace',
                  marginTop: '2px',
                  wordBreak: 'break-all',
                  maxWidth: '600px',
                  lineHeight: '1.3',
                  fontSize: '11px'
                }}>
                  {query.description.length > 100
                    ? `${query.description.substring(0, 100)}...`
                    : query.description}
                </EuiText>
              )}
            </div>

            {/* Percentage badge - 100% for root */}
            <EuiBadge color="warning" style={{ flexShrink: 0, fontWeight: 600 }}>
              100%
            </EuiBadge>
          </div>

          {/* Render children if they exist and root is expanded */}
          {query.children && query.children.length > 0 && expandedHierarchyNodes['root'] &&
            renderQueryHierarchy(query.children, 1, 'root')}
        </div>
      </div>

      {/* Operation Breakdown */}
      {breakdownEntries.length > 0 && (
        <>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3 style={{ fontWeight: 600, fontSize: '16px' }}>Operation Breakdown: {query.type || 'Query'}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="visBarVertical"
                    aria-label="Visual breakdown"
                    color={showVisualBreakdown ? 'primary' : 'text'}
                    onClick={() => setShowVisualBreakdown(true)}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="tableDensityNormal"
                    aria-label="Raw data"
                    color={!showVisualBreakdown ? 'primary' : 'text'}
                    onClick={() => setShowVisualBreakdown(false)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {showVisualBreakdown ? (
            <EuiBasicTable
              items={breakdownEntries as any}
              columns={columns}
              tableLayout="auto"
            />
          ) : (
            <EuiBasicTable
              items={allBreakdownEntries as any}
              columns={[
                {
                  field: 'operation' as any,
                  name: 'Operation',
                  sortable: true,
                },
                {
                  field: 'timeNs' as any,
                  name: 'Time (ns)',
                  sortable: true,
                  align: 'right' as const,
                  render: (timeNs: number) => (
                    <span style={{ color: '#006BB4' }}>{timeNs.toLocaleString()}</span>
                  ),
                },
                {
                  field: 'count' as any,
                  name: 'Count',
                  sortable: true,
                  align: 'right' as const,
                  render: (count: number) => (
                    <span>{count > 0 ? count.toLocaleString() : '—'}</span>
                  ),
                },
              ] as any}
              tableLayout="auto"
              sorting={{
                sort: {
                  field: sortField as any,
                  direction: sortDirection,
                },
              }}
              onChange={({ sort }: any) => {
                if (sort) {
                  setSortField(sort.field);
                  setSortDirection(sort.direction);
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
