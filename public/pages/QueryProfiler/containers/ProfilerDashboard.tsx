/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { ProfilerDashboardProps, QueryProfile, ProfilerError, ProfilerErrorType } from '../types';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { QueryEditor } from '../components/QueryEditor';
import { ShardTable } from '../components/ShardTable';
import { QueryTree } from '../components/QueryTree';
import { parseProfileJSON, parseProfileFile } from '../utils/parsing';
import { validateFileType } from '../utils/validation';
import { DEFAULT_THRESHOLDS } from '../constants';

/**
 * Main dashboard component with dual editors and visualization
 */
export const ProfilerDashboard: React.FC<ProfilerDashboardProps> = ({
  data,
  updateData,
}) => {
  const [queryInput, setQueryInput] = useState<string>('');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [selectedShardIndex, setSelectedShardIndex] = useState<number>(0);
  const [selectedQuery, setSelectedQuery] = useState<QueryProfile | null>(null);
  const [error, setError] = useState<ProfilerError | null>(null);
  const [showQueryEditor, setShowQueryEditor] = useState<boolean>(true);
  
  // Shared threshold state for color coding
  const [redThreshold, setRedThreshold] = useState(DEFAULT_THRESHOLDS.RED);
  const [orangeThreshold, setOrangeThreshold] = useState(DEFAULT_THRESHOLDS.ORANGE);

  /**
   * Handles "Generate profile" button click
   * Parses JSON from right editor and displays visualization
   */
  const handleGenerateProfile = useCallback(() => {
    setError(null);

    if (!jsonInput.trim()) {
      setError({
        type: ProfilerErrorType.MISSING_PROFILE_DATA,
        message: 'No profile data provided',
        details: 'Please enter or import profile JSON in the right editor',
      });
      return;
    }

    const result = parseProfileJSON(jsonInput);
    
    if (!result.success || !result.data) {
      setError(result.error!);
      return;
    }

    updateData(result.data);
    setSelectedShardIndex(0);
    setSelectedQuery(null);
  }, [jsonInput, updateData]);

  /**
   * Handles "Reset" button click
   * Clears all inputs and visualization
   */
  const handleReset = useCallback(() => {
    setQueryInput('');
    setJsonInput('');
    updateData(null);
    setSelectedShardIndex(0);
    setSelectedQuery(null);
    setError(null);
  }, [updateData]);

  /**
   * Handles file selection from file picker
   */
  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    
    // Validate file type
    const fileValidation = validateFileType(file);
    if (!fileValidation.isValid) {
      setError(fileValidation.error!);
      return;
    }

    // Parse the file
    const result = await parseProfileFile(file);
    
    if (!result.success) {
      setError(result.error!);
      return;
    }

    // Set the JSON input to show the file contents
    try {
      const text = await file.text();
      setJsonInput(text);
      setError(null);
      // Automatically hide the query editor when JSON is uploaded
      setShowQueryEditor(false);
    } catch (err) {
      setError({
        type: ProfilerErrorType.FILE_READ_ERROR,
        message: 'Failed to read file',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  /**
   * Handles "Import JSON" button click
   * Opens file picker to load JSON into right editor
   */
  const handleImportJSON = useCallback(() => {
    // Trigger the hidden file picker by creating a temporary input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleFileChange(target.files);
      }
    };
    input.click();
  }, [handleFileChange]);

  /**
   * Handles "Export" button click
   * Downloads only the profile output (JSON input) as JSON file
   */
  const handleExport = useCallback(() => {
    if (!jsonInput.trim()) {
      setError({
        type: ProfilerErrorType.MISSING_PROFILE_DATA,
        message: 'No profile data to export',
        details: 'Please enter or import profile JSON before exporting',
      });
      return;
    }

    const blob = new Blob([jsonInput], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'query-profile-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [jsonInput]);

  /**
   * Handles retry after error
   */
  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div>
      {/* Header with action buttons */}
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleExport} size="s">
                Export
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleImportJSON} fill size="s">
                Import JSON
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Dual text editors */}
      <EuiPanel paddingSize="none" hasBorder style={{ borderRadius: '6px', overflow: 'hidden' }}>
        <QueryEditor
          queryInput={queryInput}
          jsonInput={jsonInput}
          showQueryEditor={showQueryEditor}
          onQueryChange={setQueryInput}
          onJsonChange={setJsonInput}
          onToggleQueryEditor={setShowQueryEditor}
        />
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Action buttons */}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleGenerateProfile} fill iconType="play">
            Generate profile
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={handleReset}>Reset</EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Error display */}
      {error && (
        <>
          <ErrorDisplay error={error} onRetry={handleRetry} />
          <EuiSpacer size="l" />
        </>
      )}

      {/* Visualization section */}
      {data && data.profile && data.profile.shards && data.profile.shards.length > 0 && (
        <>
          <EuiPanel paddingSize="l">
            <EuiTitle size="s">
              <h3>Profile Results</h3>
            </EuiTitle>
            <EuiSpacer size="m" />

            {/* Shard visualization */}
            <ShardTable
              shards={data.profile.shards}
              selectedShardIndex={selectedShardIndex}
              onShardSelect={setSelectedShardIndex}
              redThreshold={redThreshold}
              orangeThreshold={orangeThreshold}
              onRedThresholdChange={setRedThreshold}
              onOrangeThresholdChange={setOrangeThreshold}
            />

            <EuiSpacer size="l" />

            {/* Query tree and details - QueryTree includes QueryDetailPanel in its right panel */}
            {data.profile.shards[selectedShardIndex] &&
              data.profile.shards[selectedShardIndex].searches &&
              data.profile.shards[selectedShardIndex].searches.length > 0 && (
                <QueryTree
                  queries={data.profile.shards[selectedShardIndex].searches[0].query}
                  aggregations={data.profile.shards[selectedShardIndex].aggregations}
                  selectedQuery={selectedQuery}
                  onQuerySelect={setSelectedQuery}
                  rewriteTime={data.profile.shards[selectedShardIndex].searches[0].rewrite_time}
                  collectors={data.profile.shards[selectedShardIndex].searches[0].collector}
                  redThreshold={redThreshold}
                  orangeThreshold={orangeThreshold}
                />
              )}
          </EuiPanel>
        </>
      )}
    </div>
  );
};
