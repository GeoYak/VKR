import { useState, useEffect } from 'react';
import { PropertyForm } from './PropertyForm';
import { PropertyPhotos } from './PropertyPhotos';
import api from '../config/api';
import '../styles/List.css';

export const PropertiesListWithFilters = () => {
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [expandedClientId, setExpandedClientId] = useState(null); // Добавлено
  
  const [filters, setFilters] = useState({
    address_search: '',
    min_price: '',
    max_price: '',
    min_area: '',
    max_area: '',
    min_rooms: '',
    max_rooms: '',
    owner_id: '',
    client_type: '',
    active: '',
    for_viewing: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [propertiesData, clientsData] = await Promise.all([
        api.properties.getAll(),
        api.clients.getAll()
      ]);
      setProperties(propertiesData);
      setClients(clientsData);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const clearFilters = () => {
    setFilters({
      address_search: '',
      min_price: '',
      max_price: '',
      min_area: '',
      max_area: '',
      min_rooms: '',
      max_rooms: '',
      owner_id: '',
      client_type: '',
      active: '',
      for_viewing: ''
    });
  };

  const getFilteredProperties = () => {
    return properties.filter(property => {
      if (filters.address_search && !property.address.toLowerCase().includes(filters.address_search.toLowerCase())) {
        return false;
      }

      if (filters.min_price && property.price < parseFloat(filters.min_price)) {
        return false;
      }

      if (filters.max_price && property.price > parseFloat(filters.max_price)) {
        return false;
      }

      if (filters.min_area && property.area < parseFloat(filters.min_area)) {
        return false;
      }

      if (filters.max_area && property.area > parseFloat(filters.max_area)) {
        return false;
      }

      if (filters.min_rooms && property.rooms < parseInt(filters.min_rooms)) {
        return false;
      }

      if (filters.max_rooms && property.rooms > parseInt(filters.max_rooms)) {
        return false;
      }

      if (filters.owner_id && property.owner_id !== parseInt(filters.owner_id)) {
        return false;
      }

      if (filters.client_type) {
        const owner = clients.find(c => c.id === property.owner_id);
        if (!owner || owner.type !== filters.client_type) {
          return false;
        }
      }

      if (filters.active && !property.is_active) {
        return false;
      }

      if (filters.for_viewing && !property.is_for_viewing) {
        return false;
      }

      return true;
    });
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить объект недвижимости?')) return;
    
    try {
      await api.properties.delete(id);
      await loadData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления объекта');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProperty(null);
    loadData();
  };

  const getOwnerName = (ownerId) => {
    const owner = clients.find(c => c.id === ownerId);
    return owner ? `${owner.first_name} ${owner.last_name}` : '—';
  };

  const getOwnerType = (ownerId) => {
    const owner = clients.find(c => c.id === ownerId);
    return owner ? owner.type : '—';
  };

  const toggleClientProperties = (propertyId) => {
    setExpandedClientId(expandedClientId === propertyId ? null : propertyId);
  };

  const filteredProperties = getFilteredProperties();

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>Недвижимость</h2>
        <button onClick={() => setShowForm(true)} className="btn-add">
          + Добавить объект
        </button>
      </div>

      {showForm && (
        <PropertyForm
          property={editingProperty}
          clients={clients}
          onClose={handleFormClose}
        />
      )}

      <div className="filters-panel">
        <input
          name="address_search"
          placeholder="Адрес"
          value={filters.address_search}
          onChange={handleFilterChange}
        />
        <input
          name="min_price"
          type="number"
          placeholder="Цена от"
          value={filters.min_price}
          onChange={handleFilterChange}
        />
        <input
          name="max_price"
          type="number"
          placeholder="Цена до"
          value={filters.max_price}
          onChange={handleFilterChange}
        />
        <input
          name="min_area"
          type="number"
          placeholder="Площадь от"
          value={filters.min_area}
          onChange={handleFilterChange}
        />
        <input
          name="max_area"
          type="number"
          placeholder="Площадь до"
          value={filters.max_area}
          onChange={handleFilterChange}
        />
        <input
          name="min_rooms"
          type="number"
          placeholder="Комнат от"
          value={filters.min_rooms}
          onChange={handleFilterChange}
        />
        <input
          name="max_rooms"
          type="number"
          placeholder="Комнат до"
          value={filters.max_rooms}
          onChange={handleFilterChange}
        />
        <select
          name="owner_id"
          value={filters.owner_id}
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
        <label>
          <input
            name="active"
            type="checkbox"
            checked={filters.active}
            onChange={handleFilterChange}
          />
          Только активные
        </label>
        <label>
          <input
            name="for_viewing"
            type="checkbox"
            checked={filters.for_viewing}
            onChange={handleFilterChange}
          />
          Только для просмотра
        </label>
        <button onClick={clearFilters}>Сбросить</button>
      </div>

      <div className="table properties-table">
        <div className="table-header">
          <div className="cell">Адрес</div>
          <div className="cell">Тип</div>
          <div className="cell">Клиент</div>
          <div className="cell">Тип клиента</div>
          <div className="cell">Цена</div>
          <div className="cell">Площадь</div>
          <div className="cell">Комнаты</div>
          <div className="cell">Описание</div>
          <div className="cell">Статус</div>
          <div className="cell">Для просмотра</div>
          <div className="cell">Действия</div>
        </div>
        
        {filteredProperties.map(prop => (
          <div key={prop.id} className="table-row-expandable">
            <div className="table-row">
              <div className="cell">{prop.address}</div>
              <div className="cell">{prop.type}</div>
              <div className="cell">{getOwnerName(prop.owner_id)}</div>
              <div className="cell">{getOwnerType(prop.owner_id)}</div>
              <div className="cell">{prop.price.toLocaleString('ru-RU')} ₽</div>
              <div className="cell">{prop.area} м²</div>
              <div className="cell">{prop.rooms}</div>
              <div className="cell">{prop.description || '—'}</div>
              <div className="cell">
                <span className={prop.is_active ? 'status-active' : 'status-inactive'}>
                  {prop.is_active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div className="cell">
                {prop.is_for_viewing ? '✓' : '—'}
              </div>
              <div className="cell actions">
                <button onClick={() => toggleClientProperties(prop.id)} className="btn-expand">
                  Фото {prop.photos?.length || 0}
                </button>
                <button onClick={() => handleEdit(prop)} className="btn-edit">
                  Ред.
                </button>
                <button onClick={() => handleDelete(prop.id)} className="btn-delete">
                  Удл.
                </button>
              </div>
            </div>

            {expandedClientId === prop.id && (
              <div className="expanded-section">
                <PropertyPhotos property={prop} onPhotosChange={loadData} />
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
          Нет объектов, соответствующих фильтрам
        </div>
      )}
    </div>
  );
};