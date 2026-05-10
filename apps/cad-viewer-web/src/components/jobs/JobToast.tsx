import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getJob, getScene } from '../../api/client';
import { useCadStore } from '../../store/cadStore';

export default function JobToast() {
  const { activeJobId, activeSceneId, clearActiveJob, setScene } = useCadStore();
  const toastId = useRef<string | null>(null);

  const { data: job } = useQuery({
    queryKey: ['job', activeJobId],
    queryFn: () => getJob(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED') return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (!activeJobId) return;

    if (!toastId.current) {
      toastId.current = toast.loading('Processing STEP file…', { duration: Infinity });
    }

    if (!job) return;

    const status = job.status;
    const progress = job.progress;

    if (status === 'ACTIVE') {
      toast.loading(`Processing… ${progress}%`, { id: toastId.current!, duration: Infinity });
    } else if (status === 'COMPLETED') {
      toast.success('Processing complete!', { id: toastId.current! });
      toastId.current = null;
      clearActiveJob();
      // Load the scene
      if (activeSceneId) {
        getScene(activeSceneId).then((scene) => {
          setScene(scene);
        }).catch(() => {
          toast.error('Failed to load scene');
        });
      }
    } else if (status === 'FAILED') {
      toast.error(`Processing failed: ${job.errorMessage ?? 'Unknown error'}`, { id: toastId.current! });
      toastId.current = null;
      clearActiveJob();
    }
  }, [job, activeJobId, activeSceneId, clearActiveJob, setScene]);

  return null;
}
