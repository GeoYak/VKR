import { useState, useEffect } from 'react';
import { AppointmentForm } from './AppointmentForm';
import api from '../config/api';
import '../styles/List.css';

export const AppointmentsListWithFilters = () => {
  const [appointments, setAppointments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);

  const [filters, setFilters] = useState({
    property_id: '',
    client_id: '',
    client_type: '',
    type: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentsData, propertiesData, clientsData] = await Promise.all([
        api.appointments.getAll(),
        api.properties.getAll(),
        api.clients.getAll()
      ]);
      setAppointments(appointmentsData);
      setProperties(propertiesData);
      setClients(clientsData);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const clearFilters = () => {
    setFilters({
      property_id: '',
      client_id: '',
      client_type: '',
      type: '',
      date_from: '',
      date_to: ''
    });
  };

  const getFilteredAppointments = () => {
    return appointments.filter(apt => {
      if (filters.property_id && apt.property_id !== parseInt(filters.property_id)) {
        return false;
      }

      if (filters.client_id && apt.client_id !== parseInt(filters.client_id)) {
        return false;
      }

      if (filters.client_type) {
        const client = clients.find(c => c.id === apt.client_id);
        if (!client || client.type !== filters.client_type) {
          return false;
        }
      }

      if (filters.type && apt.type !== filters.type) {
        return false;
      }

      if (filters.date_from) {
        const aptDate = new Date(apt.meeting_time);
        const filterDate = new Date(filters.date_from);
        if (aptDate < filterDate) return false;
      }

      if (filters.date_to) {
        const aptDate = new Date(apt.meeting_time);
        const filterDate = new Date(filters.date_to);
        filterDate.setHours(23, 59, 59);
        if (aptDate > filterDate) return false;
      }

      return true;
    });
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить показ?')) return;
    
    try {
      await api.appointments.delete(id);
      await loadData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления показа');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAppointment(null);
    loadData();
  };

  const getPropertyAddress = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.address : '—';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '—';
  };

  const getClientType = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.type : '—';
  };

  const filteredAppointments = getFilteredAppointments();

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>Показы</h2>
        <button onClick={() => setShowForm(true)} className="btn-add">
          + Добавить показ
        </button>
      </div>

      {showForm && (
        <AppointmentForm
          appointment={editingAppointment}
          onClose={handleFormClose}
        />
      )}

      <div className="filters-panel">
        <select
          name="property_id"
          value={filters.property_id}
          onChange={handleFilterChange}
        >
          <option value="">Все объекты</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>

        <select
          name="client_id"
          value={filters.client_id}
          onChange={handleFilterChange}
        >
          <option value="">Все клиенты</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>

        <select
          name="client_type"
          value={filters.client_type}
          onChange={handleFilterChange}
        >
          <option value="">Все типы клиентов</option>
          <option value="ПОКУПАТЕЛЬ">Покупатель</option>
          <option value="ПРОДАВЕЦ">Продавец</option>
        </select>

        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">Все статусы</option>
          <option value="ЗАПЛАНИРОВАНО">Запланировано</option>
          <option value="ЗАВЕРШЕНО">Завершено</option>
          <option value="ОТМЕНЕНО">Отменено</option>
        </select>

        <div className="filter-field">
          <label>Дата от:</label>
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-field">
          <label>Дата до:</label>
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleFilterChange}
          />
        </div>

        <button onClick={clearFilters}>Сбросить</button>
      </div>

      <div className="table appointments-table">
        <div className="table-header">
          <div className="cell">Недвижимость</div>
          <div className="cell">Клиент</div>
          <div className="cell">Тип клиента</div>
          <div className="cell">Дата/Время</div>
          <div className="cell">Длительность</div>
          <div className="cell">Статус</div>
          <div className="cell">Заметки</div>
          <div className="cell">Действия</div>
        </div>
        
        {filteredAppointments.map(apt => (
          <div key={apt.id} className="table-row">
            <div className="cell">{getPropertyAddress(apt.property_id)}</div>
            <div className="cell">{getClientName(apt.client_id)}</div>
            <div className="cell">{getClientType(apt.client_id)}</div>
            <div className="cell">{new Date(apt.meeting_time).toLocaleString('ru-RU')}</div>
            <div className="cell">{apt.duration_minutes} мин</div>
            <div className="cell">{apt.type}</div>
            <div className="cell">{apt.notes || '—'}</div>
            <div className="cell actions">
              <button onClick={() => handleEdit(apt)} className="btn-edit">
                Ред.
              </button>
              <button onClick={() => handleDelete(apt.id)} className="btn-delete">
                Удл.
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAppointments.length === 0 && (
        <div className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
          Нет показов, соответствующих фильтрам
        </div>
      )}
    </div>
  );
};