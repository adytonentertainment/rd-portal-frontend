import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaUpload, FaFolder, FaTimes, FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import urlJoin from 'url-join';
import styles from './bulkupload.module.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const MAX_FILES = 50;

const BulkUpload = ({ isOpen, onClose, onComplete, clientId }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const hasNotifiedRef = useRef(false);

  // Poll for batch status updates
  useEffect(() => {
    if (!batchId) {
      hasNotifiedRef.current = false;
      return;
    }

    const pollStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(urlJoin(API_BASE_URL, `scan/tracks/bulk/${batchId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setBatchStatus(data);

          // Check if batch is complete and we haven't notified yet
          if (
            ['completed', 'partially_completed', 'failed', 'cancelled'].includes(data.status) &&
            !hasNotifiedRef.current
          ) {
            hasNotifiedRef.current = true;
            clearInterval(pollIntervalRef.current);
            setUploading(false);

            if (data.status === 'completed') {
              toast.success(`All ${data.total_files} files processed successfully!`);
            } else if (data.status === 'partially_completed') {
              toast.warning(
                `${data.completed_files}/${data.total_files} files completed. ${data.failed_files} failed.`
              );
            } else if (data.status === 'failed') {
              toast.error('Batch upload failed.');
            }

            // Notify parent to refresh
            if (onComplete) onComplete();
          }
        }
      } catch (error) {
        console.error('Failed to poll batch status:', error);
      }
    };

    // Start polling every 2 seconds
    pollIntervalRef.current = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [batchId, onComplete]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    const audioFiles = fileArray.filter((f) => {
      const name = f.name.toLowerCase();
      return name.endsWith('.mp3') || name.endsWith('.wav');
    });

    if (audioFiles.length !== fileArray.length) {
      toast.warning(`${fileArray.length - audioFiles.length} non-audio files were excluded.`);
    }

    if (audioFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed. Only first ${MAX_FILES} will be used.`);
      setFiles(audioFiles.slice(0, MAX_FILES));
    } else {
      setFiles(audioFiles);
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const fileList = [];

    // Handle folder drops
    const traverseFileTree = (item, path = '') => {
      return new Promise((resolve) => {
        if (item.isFile) {
          item.file((file) => {
            const fname = file.name.toLowerCase();
            if (fname.endsWith('.mp3') || fname.endsWith('.wav')) {
              fileList.push(file);
            }
            resolve();
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          dirReader.readEntries(async (entries) => {
            for (const entry of entries) {
              await traverseFileTree(entry, path + item.name + '/');
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    };

    const processItems = async () => {
      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item));
        }
      }
      await Promise.all(promises);
      handleFileSelect(fileList);
    };

    processItems();
  };

  // Start upload
  const startUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload.');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const url = clientId
        ? urlJoin(API_BASE_URL, `scan/tracks/bulk?client_id=${clientId}`)
        : urlJoin(API_BASE_URL, 'scan/tracks/bulk');

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setBatchId(data.batch_id);
        toast.info(`Batch upload started: ${data.total_files} files`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Upload failed');
        setUploading(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to start upload');
      setUploading(false);
    }
  };

  // Cancel batch
  const cancelBatch = async () => {
    if (!batchId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(urlJoin(API_BASE_URL, `scan/tracks/bulk/${batchId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.info('Cancelled pending uploads');
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  // Remove file from list
  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheck className={styles.iconSuccess} />;
      case 'failed':
        return <FaExclamationTriangle className={styles.iconError} />;
      case 'processing':
      case 'uploading':
        return <FaSpinner className={styles.iconSpinner} />;
      case 'cancelled':
        return <FaTimes className={styles.iconCancelled} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const completedCount = batchStatus?.completed_files || 0;
  const totalCount = batchStatus?.total_files || files.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Bulk Upload</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {!uploading && !batchId && (
          <>
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FaUpload size={48} />
              <p>Drag & drop MP3 files or a folder here</p>
              <p className={styles.subtext}>or</p>
              <div className={styles.btnGroup}>
                <button className={styles.selectBtn} onClick={() => fileInputRef.current?.click()}>
                  <FaUpload /> Select Files
                </button>
                <button className={styles.selectBtn} onClick={() => folderInputRef.current?.click()}>
                  <FaFolder /> Select Folder
                </button>
              </div>
              <p className={styles.limit}>Maximum {MAX_FILES} files per upload</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
          </>
        )}

        {files.length > 0 && (
          <div className={styles.fileList}>
            <div className={styles.fileListHeader}>
              <span>{batchStatus ? `${completedCount}/${totalCount}` : files.length} files</span>
              {uploading && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                </div>
              )}
            </div>

            <div className={styles.files}>
              {batchStatus?.items
                ? batchStatus.items.map((item) => (
                    <div key={item.id} className={`${styles.fileItem} ${styles[item.status]}`}>
                      <span className={styles.fileName}>{item.filename}</span>
                      <span className={styles.status}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                      {item.error_message && (
                        <span className={styles.error} title={item.error_message}>
                          {item.error_message.slice(0, 50)}
                        </span>
                      )}
                    </div>
                  ))
                : files.map((file, index) => (
                    <div key={index} className={styles.fileItem}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      {!uploading && (
                        <button className={styles.removeBtn} onClick={() => removeFile(index)}>
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  ))}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {!uploading && !batchId && (
            <>
              <button className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button className={styles.uploadBtn} onClick={startUpload} disabled={files.length === 0}>
                <FaUpload /> Upload {files.length} Files
              </button>
            </>
          )}
          {uploading && (
            <button className={styles.cancelBtn} onClick={cancelBatch}>
              Cancel Remaining
            </button>
          )}
          {batchStatus && ['completed', 'partially_completed', 'failed', 'cancelled'].includes(batchStatus.status) && (
            <button className={styles.uploadBtn} onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
