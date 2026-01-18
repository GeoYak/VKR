import { useState } from 'react';
import api from '../config/api';
import '../styles/PropertyPhotos.css';

export const PropertyPhotos = ({ property, onPhotosChange }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Разрешены только изображения (JPG, PNG, GIF, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5 МБ');
      return;
    }

    setError('');
    setUploading(true);

    try {
      await api.properties.uploadPhoto(property.id, file);
      onPhotosChange();
      e.target.value = '';
    } catch (err) {
      setError(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoName) => {
    if (!window.confirm('Удалить это фото?')) return;

    try {
      await api.properties.deletePhoto(property.id, photoName);
      onPhotosChange();
    } catch (err) {
      setError(err.message || 'Ошибка удаления фото');
    }
  };

  const photos = property.photos || [];

  return (
    <div className="property-photos">
      <h4>Фотографии ({photos.length})</h4>
      
      {error && <div className="error-message">{error}</div>}

      <div className="photos-upload">
        <label className="upload-button">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? 'Загрузка...' : '+ Добавить фото'}
        </label>
      </div>

      {photos.length > 0 && (
        <div className="photos-grid">
          {photos.map((photo, index) => (
            <div key={index} className="photo-item">
              <img
                src={api.properties.getPhotoUrl(property.id, photo)}
                alt={`Фото ${index + 1}`}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/150?text=Error';
                }}
              />
              <button
                className="delete-photo-btn"
                onClick={() => handleDeletePhoto(photo)}
                title="Удалить фото"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="no-photos">Фотографии отсутствуют</p>
      )}
    </div>
  );
};