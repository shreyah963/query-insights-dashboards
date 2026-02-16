/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiTextArea,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';

interface QueryEditorProps {
  queryInput: string;
  jsonInput: string;
  showQueryEditor: boolean;
  onQueryChange: (value: string) => void;
  onJsonChange: (value: string) => void;
  onToggleQueryEditor: (show: boolean) => void;
}

/**
 * Dual editor component for query and JSON input
 */
export const QueryEditor: React.FC<QueryEditorProps> = ({
  queryInput,
  jsonInput,
  showQueryEditor,
  onQueryChange,
  onJsonChange,
  onToggleQueryEditor,
}) => {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '400px' }}>
      {/* Left editor - Query input (collapsible) */}
      {showQueryEditor && (
        <div style={{ 
          flex: 1,
          borderRight: '1px solid #D3DAE6',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
        }}>
          <div style={{ 
            padding: '10px 16px', 
            borderBottom: '1px solid #D3DAE6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'white',
            height: '48px',
            flexShrink: 0,
          }}>
            <EuiText size="s" style={{ fontWeight: 600, color: '#343741' }}>
              Enter query
            </EuiText>
            <EuiButtonIcon
              iconType="cross"
              aria-label="Hide query editor"
              size="s"
              onClick={() => onToggleQueryEditor(false)}
              color="text"
            />
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            <EuiTextArea
              value={queryInput}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Enter your OpenSearch query here..."
              fullWidth
              compressed
              resize="none"
              style={{
                flex: 1,
                border: 'none',
                borderRadius: 0,
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                fontSize: '13px',
                padding: '12px',
                minHeight: '100%',
              }}
            />
          </div>
        </div>
      )}

      {/* Right editor - JSON input */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
      }}>
        <div style={{ 
          padding: '10px 16px', 
          borderBottom: '1px solid #D3DAE6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          height: '48px',
          flexShrink: 0,
        }}>
          <EuiText size="s" style={{ fontWeight: 600, color: '#343741' }}>
            Enter JSON
          </EuiText>
          {!showQueryEditor && (
            <EuiToolTip content="Show query editor">
              <EuiButtonIcon
                iconType="plusInCircle"
                aria-label="Show query editor"
                size="s"
                onClick={() => onToggleQueryEditor(true)}
                color="primary"
              />
            </EuiToolTip>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          <EuiTextArea
            value={jsonInput}
            onChange={(e) => onJsonChange(e.target.value)}
            placeholder="Paste profile JSON here or use Import JSON button..."
            fullWidth
            compressed
            resize="none"
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 0,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
              fontSize: '13px',
              padding: '12px',
              minHeight: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};
