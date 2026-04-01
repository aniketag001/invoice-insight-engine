import { useState, useCallback } from 'react';
import { useUploadInvoice } from '@/hooks/useInvoices';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface FileState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const uploadMutation = useUploadInvoice();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validated = Array.from(newFiles).map((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return { file, status: 'error' as const, error: 'Unsupported format' };
      }
      if (file.size > MAX_SIZE) {
        return { file, status: 'error' as const, error: 'File too large (max 10MB)' };
      }
      return { file, status: 'pending' as const };
    });
    setFiles((prev) => [...prev, ...validated]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processAll = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    for (let i = 0; i < pending.length; i++) {
      const fileState = pending[i];
      const idx = files.findIndex((f) => f === fileState);
      
      setFiles((prev) => prev.map((f, j) => j === idx ? { ...f, status: 'uploading' } : f));
      
      try {
        await uploadMutation.mutateAsync(fileState.file);
        setFiles((prev) => prev.map((f, j) => j === idx ? { ...f, status: 'success' } : f));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Processing failed';
        setFiles((prev) => prev.map((f, j) => j === idx ? { ...f, status: 'error', error: msg } : f));
      }
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const isProcessing = files.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload Invoices</h2>
        <p className="text-muted-foreground mt-1">Drag & drop or browse to upload invoice files for AI extraction</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
          dragOver
            ? 'border-primary bg-primary/5 shadow-glow'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className={cn('w-12 h-12 mx-auto mb-4', dragOver ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-lg font-medium text-foreground">
          {dragOver ? 'Drop files here' : 'Drop invoices here or click to browse'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Supports PDF, JPG, PNG • Max 10MB per file
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h3>
            {pendingCount > 0 && (
              <Button onClick={processAll} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Process {pendingCount} file{pendingCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((fileState, index) => (
              <div
                key={`${fileState.file.name}-${index}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  fileState.status === 'success' && 'bg-success/5 border-success/30',
                  fileState.status === 'error' && 'bg-destructive/5 border-destructive/30',
                  fileState.status === 'uploading' && 'bg-primary/5 border-primary/30',
                  fileState.status === 'pending' && 'bg-card border-border'
                )}
              >
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{fileState.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fileState.file.size / 1024).toFixed(0)} KB
                    {fileState.error && <span className="text-destructive ml-2">• {fileState.error}</span>}
                  </p>
                </div>
                {fileState.status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                {fileState.status === 'success' && <CheckCircle2 className="w-5 h-5 text-success" />}
                {fileState.status === 'error' && <AlertCircle className="w-5 h-5 text-destructive" />}
                {(fileState.status === 'pending' || fileState.status === 'error') && (
                  <button onClick={() => removeFile(index)} className="p-1 hover:bg-muted rounded">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
