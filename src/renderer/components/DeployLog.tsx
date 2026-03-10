import React, { useEffect, useRef } from 'react';

interface Props {
  log: string;
  deploying: boolean;
  onClose: () => void;
}

export function DeployLog({ log, deploying, onClose }: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 text-light">
          {deploying ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Deploy in progress...
            </>
          ) : (
            '📋 Deploy Log'
          )}
        </h6>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕ Close</button>
      </div>
      <div className="deploy-log" ref={logRef}>
        {log || 'Waiting for output...'}
      </div>
    </div>
  );
}
