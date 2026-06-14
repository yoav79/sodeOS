'use client';

import React from 'react';
import NodeAttachments from './NodeAttachments';

interface EditorFilesTabProps {
  nodeId: string;
  canEdit: boolean;
}

export default function EditorFilesTab({ nodeId, canEdit }: EditorFilesTabProps) {
  return (
    <div className="space-y-4">
      <NodeAttachments nodeId={nodeId} canEdit={canEdit} />
    </div>
  );
}
