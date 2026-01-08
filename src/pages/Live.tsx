import { useParams, Navigate } from 'react-router-dom';
import { LiveRoom } from '@/components/live/LiveRoom';

export default function Live() {
  const { channel } = useParams<{ channel: string }>();

  if (!channel) {
    return <Navigate to="/" replace />;
  }

  return <LiveRoom channel={channel} />;
}
