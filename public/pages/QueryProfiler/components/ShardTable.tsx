/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiBasicTable,
  EuiFieldSearch,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiPopover,
  EuiText,
  EuiButtonIcon,
  EuiFormRow,
  EuiRange,
} from '@elastic/eui';
import { ShardVisualizationProps } from '../types';
import { PROFILER_COLORS, DEFAULT_THRESHOLDS, getBarColor } from '../constants';

interface ShardMetrics {
  id: string;
  name: string;
  searchTime: number;
  aggTime: number;
  index: number;
}

/**
 * Component for displaying shard execution details in a table with bar charts
 */
export const ShardTable: React.FC<ShardVisualizationProps> = ({
  shards,
  selectedShardIndex,
  onShardSelect,
  redThreshold = DEFAULT_THRESHOLDS.RED,
  orangeThreshold = DEFAULT_THRESHOLDS.ORANGE,
  onRedThresholdChange,
  onOrangeThresholdChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'searchTime' | 'aggTime' | 'name'>('aggTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isThresholdPopoverOpen, setIsThresholdPopoverOpen] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [displayMode, setDisplayMode] = useState<'top5' | 'top10' | 'all'>('top5');

  // Calculate metrics for each shard
  const shardMetrics = useMemo(() => {
    if (!shards) return [];

    return shards.map((shard, index) => {
      // Calculate search execution time
      const searchTime = shard.searches?.[0]?.query?.reduce((sum, q) => {
        return sum + (q.time_in_nanos || 0);
      }, 0) || 0;

      const rewriteTime = shard.searches?.[0]?.rewrite_time || 0;
      const collectorsTime = shard.searches?.[0]?.collector?.reduce(
        (sum, collector) => sum + (collector.time_in_nanos || 0),
        0
      ) || 0;

      // Calculate aggregation time
      const aggTime = shard.aggregations?.reduce((sum, agg) => {
        return sum + (agg.time_in_nanos || 0);
      }, 0) || 0;

      // Keep the full shard ID for display
      const shardId = shard.id || `shard-${index}`;

      return {
        id: shard.id || `shard-${index}`,
        name: shardId,
        searchTime: (searchTime + rewriteTime + collectorsTime) / 1000000,
        aggTime: aggTime / 1000000,
        index,
      };
    });
  }, [shards]);

  // Filter shards based on search term
  const filteredShards = useMemo(() => {
    if (!searchTerm) return shardMetrics;
    return shardMetrics.filter((shard) =>
      shard.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shardMetrics, searchTerm]);

  // Sort shards
  const sortedShards = useMemo(() => {
    return [...filteredShards].sort((a, b) => {
      if (sortField === 'name') {
        // String comparison for shard names
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        // Numeric comparison for times
        return sortDirection === 'desc'
          ? b[sortField] - a[sortField]
          : a[sortField] - b[sortField];
      }
    });
  }, [filteredShards, sortField, sortDirection]);

  // Get max times for bar scaling
  const maxSearchTime = Math.max(...sortedShards.map((s) => s.searchTime), 1);
  const maxAggTime = Math.max(...sortedShards.map((s) => s.aggTime), 1);

  const columns = [
    {
      field: 'name',
      name: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
          onClick={() => {
            if (sortField === 'name') {
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField('name');
              setSortDirection('asc');
            }
          }}
          title={sortField === 'name' 
            ? `Currently sorted ${sortDirection === 'asc' ? 'A-Z' : 'Z-A'}. Click to sort ${sortDirection === 'asc' ? 'Z-A' : 'A-Z'}.`
            : 'Click to sort by shard name'}
        >
          <span>Shard</span>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            color: '#98A2B3',
            transition: 'color 0.2s'
          }}>
            ⇅
          </span>
        </div>
      ),
      width: '35%',
      render: (name: string, item: ShardMetrics) => (
        <EuiLink onClick={() => onShardSelect(item.index)} color="primary" style={{ fontWeight: 'normal', fontSize: '13px' }}>
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'searchTime',
      name: 'Search time',
      width: '32.5%',
      render: (time: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <div
              style={{
                width: '100%',
                height: '22px',
                backgroundColor: PROFILER_COLORS.BAR_BACKGROUND,
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(time / maxSearchTime) * 100}%`,
                  height: '100%',
                  backgroundColor: getBarColor(time, maxSearchTime, redThreshold, orangeThreshold),
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: '45px' }}>
            <span style={{ fontSize: '12px', color: PROFILER_COLORS.SUBDUED_TEXT }}>{time.toFixed(0)} ms</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'aggTime',
      name: 'Aggregation time',
      width: '32.5%',
      render: (time: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <div
              style={{
                width: '100%',
                height: '22px',
                backgroundColor: PROFILER_COLORS.BAR_BACKGROUND,
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(time / maxAggTime) * 100}%`,
                  height: '100%',
                  backgroundColor: getBarColor(time, maxAggTime, redThreshold, orangeThreshold),
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: '45px' }}>
            <span style={{ fontSize: '12px', color: PROFILER_COLORS.SUBDUED_TEXT }}>{time.toFixed(0)} ms</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  if (!shards || shards.length === 0) {
    return null;
  }

  const sortButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    >
      Sort by: {sortField === 'searchTime' ? 'Search time' : sortField === 'aggTime' ? 'Aggregation time' : 'Search time'}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false} style={{ width: '300px' }}>
              <EuiFieldSearch
                placeholder="Search shard"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                compressed
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                compressed
                options={[
                  { value: 'all', text: 'All shards' },
                  { value: 'top5', text: 'Top 5' },
                  { value: 'top10', text: 'Top 10' },
                ]}
                value={displayMode}
                onChange={(e) => {
                  const mode = e.target.value as 'top5' | 'top10' | 'all';
                  setDisplayMode(mode);
                  if (mode === 'top5') setPageSize(5);
                  else if (mode === 'top10') setPageSize(10);
                  else setPageSize(sortedShards.length);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={sortButton}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="s"
          >
            <div style={{ width: '200px' }}>
              <EuiButtonEmpty
                size="s"
                onClick={() => {
                  setSortField('searchTime');
                  setSortDirection('desc');
                  setIsPopoverOpen(false);
                }}
                style={{ display: 'block', textAlign: 'left' }}
              >
                {sortField === 'searchTime' && '✓ '}Sort by: Search time
              </EuiButtonEmpty>
              <EuiButtonEmpty
                size="s"
                onClick={() => {
                  setSortField('aggTime');
                  setSortDirection('desc');
                  setIsPopoverOpen(false);
                }}
                style={{ display: 'block', textAlign: 'left' }}
              >
                {sortField === 'aggTime' && '✓ '}Sort by: Aggregation time
              </EuiButtonEmpty>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiBasicTable
        items={sortedShards.slice(0, pageSize)}
        columns={columns}
        tableLayout="auto"
      />

      <EuiSpacer size="s" />

      {/* Color threshold legend */}
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: PROFILER_COLORS.GREEN, 
                borderRadius: '2px' 
              }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                ≤{orangeThreshold}%
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: PROFILER_COLORS.ORANGE, 
                borderRadius: '2px' 
              }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {orangeThreshold + 1}%-{redThreshold}%
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: PROFILER_COLORS.RED, 
                borderRadius: '2px' 
              }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                &gt;{redThreshold}%
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                iconType="gear"
                size="s"
                aria-label="Customize thresholds"
                onClick={() => setIsThresholdPopoverOpen(!isThresholdPopoverOpen)}
              />
            }
            isOpen={isThresholdPopoverOpen}
            closePopover={() => setIsThresholdPopoverOpen(false)}
            panelPaddingSize="m"
          >
            <div style={{ width: '280px' }}>
              <EuiText size="s">
                <strong>Customize color thresholds</strong>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFormRow label={`Red (>${redThreshold}%)`} fullWidth>
                <EuiRange
                  min={50}
                  max={100}
                  step={5}
                  value={redThreshold}
                  onChange={(e) => onRedThresholdChange?.(Number(e.currentTarget.value))}
                  showValue
                  valuePrepend=">"
                  fullWidth
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiFormRow label={`Orange (>${orangeThreshold}%)`} fullWidth>
                <EuiRange
                  min={0}
                  max={95}
                  step={5}
                  value={orangeThreshold}
                  onChange={(e) => onOrangeThresholdChange?.(Number(e.currentTarget.value))}
                  showValue
                  valuePrepend=">"
                  fullWidth
                />
              </EuiFormRow>
              {redThreshold - orangeThreshold < 5 && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="danger">
                    Orange must be at least 5% below red
                  </EuiText>
                </>
              )}
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                Thresholds are based on percentage of maximum time.
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButtonEmpty
                size="s"
                onClick={() => {
                  onRedThresholdChange?.(DEFAULT_THRESHOLDS.RED);
                  onOrangeThresholdChange?.(DEFAULT_THRESHOLDS.ORANGE);
                  setIsThresholdPopoverOpen(false);
                }}
              >
                Reset to defaults
              </EuiButtonEmpty>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
