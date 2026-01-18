import { useState } from 'react';
import api from '../config/api';
import '../styles/Form.css';
import '../styles/PropertyPhotos.css';

export const PropertyForm = ({ property, clients, onClose }) => {
  const [formData, setFormData] = useState({
    address: property?.address || '',
    type: property?.type || 'КВАРТИРА',
    price: property?.price || '',
    area: property?.area || '',
    rooms: property?.rooms || '',
    description: property?.description || '',
    owner_id: property?.owner_id || '',
    is_active: property?.is_active !== undefined ? property.is_active : true,
    is_for_viewing: property?.is_for_viewing !== undefined ? property.is_for_viewing : false
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const propertyTypes = ['КВАРТИРА', 'ДОМ'];
  const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    let hasError = false;

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        setError(`Файл ${file.name}: недопустимый формат. Разрешены: JPG, PNG, GIF, WEBP`);
        hasError = true;
        break;
      }

      if (file.size > MAX_PHOTO_SIZE) {
        setError(`Файл ${file.name}: размер превышает 5 МБ`);
        hasError = true;
        break;
      }

      validFiles.push(file);
    }

    if (!hasError) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (property) {
        const payload = {
          address: formData.address,
          type: formData.type,
          price: parseFloat(formData.price),
          area: parseFloat(formData.area),
          rooms: parseInt(formData.rooms),
          description: formData.description || null,
          owner_id: parseInt(formData.owner_id),
          is_active: formData.is_active,
          is_for_viewing: formData.is_for_viewing
        };

        await api.properties.update(property.id, payload);

        for (const file of selectedFiles) {
          await api.properties.uploadPhoto(property.id, file);
        }
      } else {
        const formDataToSend = new FormData();
        formDataToSend.append('address', formData.address);
        formDataToSend.append('type', formData.type);
        formDataToSend.append('price', formData.price);
        formDataToSend.append('area', formData.area);
        formDataToSend.append('rooms', formData.rooms);
        formDataToSend.append('description', formData.description || '');
        formDataToSend.append('owner_id', formData.owner_id);
        formDataToSend.append('is_active', formData.is_active);
        formDataToSend.append('is_for_viewing', formData.is_for_viewing);

        selectedFiles.forEach(file => {
          formDataToSend.append('photos', file);
        });

        const response = await fetch('http://localhost:8000/properties/', {
          method: 'POST',
          credentials: 'include',
          body: formDataToSend
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Ошибка создания объекта');
        }
      }
      
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(err.message || 'Ошибка сохранения объекта недвижимости');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = formData.is_for_viewing 
    ? clients.filter(c => c.type === 'ПОКУПАТЕЛЬ')
    : clients.filter(c => c.type === 'ПРОДАВЕЦ');

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-actions">
          <button onClick={onClose} className="btn-close" type="button">Закрыть</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="form">

          <label>
            Адрес:
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Тип:
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {propertyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Клиент:
            <select
              name="owner_id"
              value={formData.owner_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Выберите клиента</option>
              {filteredClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Цена (₽):
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              disabled={loading}
            />
          </label>

          <label>
            Площадь (м²):
            <input
              type="number"
              name="area"
              value={formData.area}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              disabled={loading}
            />
          </label>

          <label>
            Комнат:
            <input
              type="number"
              name="rooms"
              value={formData.rooms}
              onChange={handleChange}
              required
              min="0"
              disabled={loading}
            />
          </label>

          <label>
            Описание:
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              disabled={loading}
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_for_viewing"
              checked={formData.is_for_viewing}
              onChange={handleChange}
              disabled={loading}
            />
            Для просмотра
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              disabled={loading}
            />
            Активен
          </label>

          {/* Загрузка фото */}
          <div className="form-group">
            <label>
              Фотографии:
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={loading}
              />
            </label>
            <small>Разрешены: JPG, PNG, GIF, WEBP. Максимум 5 МБ на файл.</small>
          </div>

          {selectedFiles.length > 0 && (
            <div className="photo-preview-grid">
              {selectedFiles.map((file, index) => (
                <div key={index} className="photo-preview-item">
                  <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    className="remove-preview-btn"
                    onClick={() => removeFile(index)}
                    disabled={loading}
                  >
                    x
                  </button>
                  <div className="file-name">{file.name}</div>
                </div>
              ))}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={onClose} disabled={loading} className="btn-cancel">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};