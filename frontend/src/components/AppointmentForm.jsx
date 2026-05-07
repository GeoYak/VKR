import { useState, useEffect } from 'react';
import api from '../config/api';
import '../styles/Form.css';

export const AppointmentForm = ({ appointment, onClose }) => {
  const [formData, setFormData] = useState({
    property_id: '',
    client_id: '',
    type: 'ЗАПЛАНИРОВАНО',
    meeting_time: '',
    duration_minutes: 60,
    notes: ''
  });
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (appointment) {
      const meetingDate = new Date(appointment.meeting_time);
      const localDateTime = new Date(meetingDate.getTime() - meetingDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        property_id: appointment.property_id || '',
        client_id: appointment.client_id || '',
        type: appointment.type || 'ЗАПЛАНИРОВАНО',
        meeting_time: localDateTime,
        duration_minutes: appointment.duration_minutes || 60,
        notes: appointment.notes || ''
      });
    }
  }, [appointment]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesData, clientsData] = await Promise.all([
        api.properties.getAll(),
        api.clients.getAll()
      ]);
      
      const uniqueProperties = propertiesData.reduce((acc, current) => {
        const exists = acc.find(item => item.address === current.address);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setProperties(uniqueProperties);
      setClients(clientsData);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

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
      const payload = {
        property_id: parseInt(formData.property_id),
        client_id: parseInt(formData.client_id),
        type: formData.type,
        meeting_time: new Date(formData.meeting_time).toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes || null
      };

      if (appointment) {
        await api.appointments.update(appointment.id, payload);
      } else {
        await api.appointments.create(payload);
      }
      
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(err.message || 'Ошибка сохранения показа');
    } finally {
      setLoading(false);
    }
  };

  const appointmentTypes = ['ЗАПЛАНИРОВАНО', 'ЗАВЕРШЕНО', 'ОТМЕНЕНО'];

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-actions">
          <button onClick={onClose} className="btn-close" type="button">Закрыть</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label>
            Недвижимость:
            <select
              name="property_id"
              value={formData.property_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Выберите объект</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </label>

          <label>
            Клиент:
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Выберите клиента</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </label>

          <label>
            Статус:
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {appointmentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Дата и время:
            <input
              type="datetime-local"
              name="meeting_time"
              value={formData.meeting_time}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Длительность (минут):
            <input
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              required
              disabled={loading}
              min="15"
              max="480"
            />
          </label>

          <label>
            Заметки:
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              disabled={loading}
              placeholder='Введите важные данные о показе...'
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