import { useState } from 'react';
import api from '../config/api';
import '../styles/Form.css';

export const ClientForm = ({ client, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    type: 'ПОКУПАТЕЛЬ',
    notes: '',
    ...client
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clientTypes = ['ПОКУПАТЕЛЬ', 'ПРОДАВЕЦ'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const allowed = ['first_name', 'last_name', 'email', 'phone_number', 'type', 'notes'];
      const payload = {};
      for (const k of allowed) {
        if (formData[k] !== undefined) payload[k] = formData[k];
      }


      if (client) {
        await api.clients.update(client.id, payload);
      } else {
        await api.clients.create(payload);
      }
      
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(err.message || 'Ошибка сохранения клиента');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-actions">
          <button onClick={onClose} className="btn-close" type="button">Закрыть</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label>
            Имя:
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Фамилия:
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Email:
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Телефон:
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Тип клиента:
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {clientTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Заметки:
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              disabled={loading}
            />
          </label>

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