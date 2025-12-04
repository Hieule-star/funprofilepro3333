import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Video, Mic, VideoOff, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeviceSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (devices: { videoDeviceId: string; audioDeviceId: string }) => void;
  targetUsername: string;
  mode?: 'video' | 'audio';
}

export default function DeviceSelectionModal({
  open,
  onOpenChange,
  onConfirm,
  targetUsername,
  mode = 'video'
}: DeviceSelectionModalProps) {
  const { toast } = useToast();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Get detailed error message based on error type
  const getErrorMessage = (error: any): string => {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return "Quyền truy cập đã bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt (click biểu tượng ổ khóa bên cạnh URL).";
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return mode === 'video' 
        ? "Không tìm thấy camera hoặc microphone trên thiết bị này."
        : "Không tìm thấy microphone trên thiết bị này.";
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return "Thiết bị đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác đang sử dụng camera/mic.";
    } else if (error.name === 'OverconstrainedError') {
      return "Thiết bị không đáp ứng được yêu cầu kỹ thuật.";
    } else if (error.name === 'SecurityError') {
      return "Truy cập bị chặn do chính sách bảo mật. Vui lòng sử dụng HTTPS.";
    } else if (error.name === 'AbortError') {
      return "Yêu cầu truy cập thiết bị đã bị hủy.";
    }
    return `Không thể truy cập thiết bị: ${error.message || 'Lỗi không xác định'}`;
  };

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
        
        // Request permissions based on mode
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: mode === 'video'
        };
        
        console.log('[DeviceSelection] Requesting media with constraints:', constraints);
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Get devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        console.log('[DeviceSelection] Found devices:', { videoInputs: videoInputs.length, audioInputs: audioInputs.length });
        
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
        if (videoPreviewRef.current && mode === 'video') {
          videoPreviewRef.current.srcObject = stream;
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('[DeviceSelection] Error loading devices:', error);
        
        const errorMessage = getErrorMessage(error);
        
        toast({
          title: "Lỗi truy cập thiết bị",
          description: errorMessage,
          variant: "destructive"
        });
        setLoading(false);
        onOpenChange(false);
      }
    };

    loadDevices();
  }, [open, toast, onOpenChange, mode]);

  // Update preview when video device changes (only for video mode)
  useEffect(() => {
    if (!open || mode !== 'video') return;
    if (!selectedVideoDevice && !selectedAudioDevice) return;

    const updatePreview = async () => {
      try {
        // Stop old stream
        if (previewStream) {
          previewStream.getTracks().forEach(track => track.stop());
        }

        // Start new stream with selected device
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
          video: mode === 'video' && selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        setPreviewStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('[DeviceSelection] Error updating preview:', error);
      }
    };

    updatePreview();
  }, [selectedVideoDevice, selectedAudioDevice, open, mode]);

  const handleConfirm = () => {
    // For audio mode, only check audio device
    if (mode === 'video' && !selectedVideoDevice) {
      toast({
        title: "Vui lòng chọn thiết bị",
        description: "Bạn cần chọn camera",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedAudioDevice) {
      toast({
        title: "Vui lòng chọn thiết bị",
        description: "Bạn cần chọn microphone",
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
      videoDeviceId: selectedVideoDevice || "",
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
          <DialogTitle>
            {mode === 'video' ? 'Chuẩn bị gọi video' : 'Chuẩn bị gọi thoại'} cho {targetUsername}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Preview - only show for video mode */}
          {mode === 'video' && (
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
          )}

          {/* Audio-only mode indicator */}
          {mode === 'audio' && (
            <div className="flex flex-col items-center justify-center py-8 bg-muted rounded-lg">
              <Mic className="h-16 w-16 text-primary mb-4" />
              <p className="text-muted-foreground">Cuộc gọi thoại - Chỉ sử dụng microphone</p>
            </div>
          )}

          {/* Camera Selection - only show for video mode */}
          {mode === 'video' && (
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
          )}

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
            disabled={loading || (mode === 'video' && !selectedVideoDevice) || !selectedAudioDevice}
            className="bg-green-600 hover:bg-green-700"
          >
            Bắt đầu cuộc gọi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
