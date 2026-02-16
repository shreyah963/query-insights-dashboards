/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import React, { useState } from 'react';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { QueryProfilerAppProps, ProfileData } from './types';
import { ProfilerDashboard } from './containers/ProfilerDashboard';

/**
 * Main Query Profiler application component
 */
export const QueryProfilerApp: React.FC<QueryProfilerAppProps> = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  return (
    <EuiPage>
      <EuiPageBody>
        <ProfilerDashboard data={profileData} updateData={setProfileData} />
      </EuiPageBody>
    </EuiPage>
  );
};
