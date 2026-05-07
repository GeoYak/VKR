import { useState, useEffect } from 'react';
import api from '../config/api';
import '../styles/Documents.css';

export const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadForm, setUploadForm] = useState({
    file: null,
    folder: '',
    description: '',
    client_id: '',
    property_id: '',
    deal_id: ''
  });

  useEffect(() => {
    loadDocuments();
  }, [selectedFolder]);

  useEffect(() => {
    loadFolders();
  }, []); 

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = selectedFolder ? { folder: selectedFolder } : {};
      const data = await api.documents.getAll(params);
      setDocuments(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const data = await api.documents.getFolders();
      setFolders(data);
    } catch (err) {
      console.error('Ошибка загрузки папок:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Выберите файл');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.folder) formData.append('folder', uploadForm.folder);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.client_id) formData.append('client_id', uploadForm.client_id);
      if (uploadForm.property_id) formData.append('property_id', uploadForm.property_id);
      if (uploadForm.deal_id) formData.append('deal_id', uploadForm.deal_id);

      await api.documents.upload(formData);
      
      setUploadForm({
        file: null,
        folder: '',
        description: '',
        client_id: '',
        property_id: '',
        deal_id: ''
      });
      
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
      await loadDocuments();
      await loadFolders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      await api.documents.download(documentId, filename);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Удалить документ?')) return;

    try {
      setLoading(true);
      await api.documents.delete(documentId);
      await loadDocuments();
      await loadFolders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
  };

  const totalDocuments = documents.length;

  return (
    <div className="documents-container">
      <h2>Управление документами</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="documents-layout">
        <div className="folders-sidebar">
          <h3>Папки</h3>
          <div className="folder-list">
            <div 
              className={`folder-item ${selectedFolder === null ? 'active' : ''}`}
              onClick={() => setSelectedFolder(null)}
            >
              Все документы ({totalDocuments})
            </div>
            {folders.map(folder => (
              <div
                key={folder.name}
                className={`folder-item ${selectedFolder === folder.name ? 'active' : ''}`}
                onClick={() => setSelectedFolder(folder.name)}
              >
                {folder.name} ({folder.count})
              </div>
            ))}
          </div>
        </div>

        <div className="documents-main">
          <div className="upload-section">
            <h3>Загрузить документ</h3>
            <form onSubmit={handleUpload} className="upload-form">
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar"
                required
                disabled={loading}
              />
              
              <input
                type="text"
                placeholder="Папка (опционально)"
                value={uploadForm.folder}
                onChange={(e) => setUploadForm({ ...uploadForm, folder: e.target.value })}
                disabled={loading}
              />
              
              <textarea
                placeholder="Описание (опционально)"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={3}
                disabled={loading}
              />

              <button type="submit" disabled={loading}>
                {loading ? 'Загрузка...' : 'Загрузить'}
              </button>
            </form>
          </div>

          <div className="documents-list">
            <h3>
              {selectedFolder ? `Документы в папке "${selectedFolder}"` : 'Все документы'}
            </h3>
            
            {loading && documents.length === 0 ? (
              <p>Загрузка...</p>
            ) : documents.length === 0 ? (
              <p className="no-data">Документы не найдены</p>
            ) : (
              <div className="documents-grid">
                {documents.map(doc => (
                  <div key={doc.id} className="document-card">
                    <div className="document-info">
                      <h4>{doc.original_filename}</h4>
                      {doc.description && <p className="description">{doc.description}</p>}
                      <div className="document-meta">
                        <span>Размер: {formatFileSize(doc.file_size)}</span>
                        <span>Загружен: {new Date(doc.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                      {doc.folder && <div className="document-folder">{doc.folder}</div>}
                    </div>
                    <div className="document-actions">
                      <button 
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                        className="btn-download"
                        disabled={loading}
                      >
                        Скачать
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="btn-delete"
                        disabled={loading}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};