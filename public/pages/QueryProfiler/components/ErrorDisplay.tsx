/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiCallOut, EuiButton } from '@elastic/eui';
import { ErrorDisplayProps } from '../types';

/**
 * Component for displaying errors with optional retry functionality
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  return (
    <EuiCallOut
      title={error.message}
      color="danger"
      iconType="alert"
    >
      {error.details && <p>{error.details}</p>}
      {onRetry && (
        <EuiButton onClick={onRetry} size="s" color="danger">
          Try Again
        </EuiButton>
      )}
    </EuiCallOut>
  );
};
