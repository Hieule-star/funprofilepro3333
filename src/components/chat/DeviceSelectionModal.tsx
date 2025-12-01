import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Video, Mic, VideoOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeviceSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (devices: { videoDeviceId: string; audioDeviceId: string }) => void;
  targetUsername: string;
}

export default function DeviceSelectionModal({
  open,
  onOpenChange,
  onConfirm,
  targetUsername
}: DeviceSelectionModalProps) {
  const { toast } = useToast();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      // Cleanup when modal closes
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
      return;
    }

    const loadDevices = async () => {
      try {
        setLoading(true);
        
        // Request permissions first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Get devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);
        
        // Set defaults
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        
        // Use first stream for preview
        setPreviewStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading devices:', error);
        toast({
          title: "Lỗi truy cập thiết bị",
          description: "Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.",
          variant: "destructive"
        });
        setLoading(false);
        onOpenChange(false);
      }
    };

    loadDevices();
  }, [open, toast, onOpenChange]);

  // Update preview when video device changes
  useEffect(() => {
    if (!selectedVideoDevice || !open) return;

    const updatePreview = async () => {
      try {
        // Stop old stream
        if (previewStream) {
          previewStream.getTracks().forEach(track => track.stop());
        }

        // Start new stream with selected device
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedVideoDevice } },
          audio: { deviceId: { exact: selectedAudioDevice } }
        });

        setPreviewStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error updating preview:', error);
      }
    };

    updatePreview();
  }, [selectedVideoDevice, selectedAudioDevice, open]);

  const handleConfirm = () => {
    if (!selectedVideoDevice || !selectedAudioDevice) {
      toast({
        title: "Vui lòng chọn thiết bị",
        description: "Bạn cần chọn cả camera và microphone",
        variant: "destructive"
      });
      return;
    }

    // Stop preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }

    onConfirm({
      videoDeviceId: selectedVideoDevice,
      audioDeviceId: selectedAudioDevice
    });
  };

  const handleCancel = () => {
    // Stop preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chuẩn bị gọi video cho {targetUsername}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Preview */}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="h-12 w-12 text-gray-500" />
              </div>
            ) : (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
              <p className="text-white text-sm">Xem trước camera</p>
            </div>
          </div>

          {/* Camera Selection */}
          <div className="space-y-2">
            <Label htmlFor="camera" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Camera
            </Label>
            <Select
              value={selectedVideoDevice}
              onValueChange={setSelectedVideoDevice}
              disabled={loading}
            >
              <SelectTrigger id="camera">
                <SelectValue placeholder="Chọn camera" />
              </SelectTrigger>
              <SelectContent>
                {videoDevices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone Selection */}
          <div className="space-y-2">
            <Label htmlFor="microphone" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Microphone
            </Label>
            <Select
              value={selectedAudioDevice}
              onValueChange={setSelectedAudioDevice}
              disabled={loading}
            >
              <SelectTrigger id="microphone">
                <SelectValue placeholder="Chọn microphone" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedVideoDevice || !selectedAudioDevice}
            className="bg-green-600 hover:bg-green-700"
          >
            Bắt đầu cuộc gọi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
