import { useState, useEffect } from 'react';
import { ClientForm } from './ClientForm';
import api from '../config/api';
import '../styles/List.css';

export const ClientsListWithFilters = () => {
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedClientId, setExpandedClientId] = useState(null);

  const [filters, setFilters] = useState({
    name_search: '',
    email_search: '',
    phone_search: '',
    type: '',
    has_properties: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, propertiesData] = await Promise.all([
        api.clients.getAll(),
        api.properties.getAll()
      ]);
      setClients(clientsData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
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
      name_search: '',
      email_search: '',
      phone_search: '',
      type: '',
      has_properties: ''
    });
  };

  const getFilteredClients = () => {
    return clients.filter(client => {
      if (filters.name_search) {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        if (!fullName.includes(filters.name_search.toLowerCase())) return false;
      }

      if (filters.email_search && !client.email.toLowerCase().includes(filters.email_search.toLowerCase())) {
        return false;
      }

      if (filters.phone_search && !client.phone_number.includes(filters.phone_search)) {
        return false;
      }

      if (filters.type && client.type !== filters.type) {
        return false;
      }

      if (filters.has_properties) {
        const clientProps = getClientProperties(client.id);
        if (filters.has_properties === 'yes' && clientProps.length === 0) return false;
        if (filters.has_properties === 'no' && clientProps.length > 0) return false;
      }

      return true;
    });
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить клиента?')) return;
    
    try {
      await api.clients.delete(id);
      await loadData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления клиента');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingClient(null);
    loadData();
  };

  const toggleClientProperties = (clientId) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  const getClientProperties = (clientId) => {
    return properties.filter(p => p.owner_id === clientId);
  };

  const filteredClients = getFilteredClients();

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>Клиенты</h2>
        <button onClick={() => setShowForm(true)} className="btn-add">
          + Добавить клиента
        </button>
      </div>

      {showForm && (
        <ClientForm
          client={editingClient}
          onClose={handleFormClose}
        />
      )}

      <div className="filters-panel">
        <input
          name="name_search"
          placeholder="Имя/Фамилия"
          value={filters.name_search}
          onChange={handleFilterChange}
        />
        <input
          name="email_search"
          placeholder="Email"
          value={filters.email_search}
          onChange={handleFilterChange}
        />
        <input
          name="phone_search"
          placeholder="Телефон"
          value={filters.phone_search}
          onChange={handleFilterChange}
        />
        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">Все типы</option>
          <option value="ПОКУПАТЕЛЬ">Покупатель</option>
          <option value="ПРОДАВЕЦ">Продавец</option>
        </select>
        <select
          name="has_properties"
          value={filters.has_properties}
          onChange={handleFilterChange}
        >
          <option value="">Наличие недвижимости</option>
          <option value="yes">С недвижимостью</option>
          <option value="no">Без недвижимости</option>
        </select>
        <button onClick={clearFilters}>Сбросить</button>
      </div>

      <div className="table clients-table">
        <div className="table-header">
          <div className="cell">Имя</div>
          <div className="cell">Email</div>
          <div className="cell">Телефон</div>
          <div className="cell">Тип</div>
          <div className="cell">Недвижимость</div>
          <div className="cell">Заметки</div>
          <div className="cell">Действия</div>
        </div>

        {filteredClients.map((client) => {
          const clientProps = getClientProperties(client.id);
          const isExpanded = expandedClientId === client.id;

          return (
            <div key={client.id} className="table-row-expandable">
              <div className="table-row">
                <div className="cell">{client.first_name} {client.last_name}</div>
                <div className="cell">{client.email}</div>
                <div className="cell">{client.phone_number}</div>
                <div className="cell">{client.type}</div>
                <div className="cell">
                  {clientProps.length > 0 ? (
                    <button 
                      onClick={() => toggleClientProperties(client.id)}
                      className="btn-expand"
                    >
                      {isExpanded ? '▼' : '►'} {clientProps.length} объект(ов)
                    </button>
                  ) : (
                    <span className="text-muted">Нет объектов</span>
                  )}
                </div>
                <div className="cell">{client.notes || '—'}</div>
                <div className="cell actions">
                  <button onClick={() => handleEdit(client)} className="btn-edit">
                    Ред.
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="btn-delete">
                    Удл.
                  </button>
                </div>
              </div>

              {isExpanded && clientProps.length > 0 && (
                <div className="expanded-section">
                  <h4>
                    {client.type === 'ПРОДАВЕЦ' 
                      ? 'Недвижимость на продажу:' 
                      : 'Недвижимость для просмотра:'}
                  </h4>
                  <div className="properties-list">
                    {clientProps.map(prop => (
                      <div key={prop.id} className="property-card">
                        <div><strong>Адрес:</strong> {prop.address}</div>
                        <div><strong>Тип:</strong> {prop.type}</div>
                        <div><strong>Цена:</strong> {prop.price.toLocaleString('ru-RU')} ₽</div>
                        <div><strong>Площадь:</strong> {prop.area} м²</div>
                        <div><strong>Комнат:</strong> {prop.rooms}</div>
                        <div>
                          <strong>Статус:</strong>{' '}
                          <span className={prop.is_active ? 'status-active' : 'status-inactive'}>
                            {prop.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
          Нет клиентов, соответствующих фильтрам
        </div>
      )}
    </div>
  );
};