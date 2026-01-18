import { useState, useEffect } from 'react';
import { DealForm } from './DealForm';
import api from '../config/api';
import '../styles/List.css';

export const DealsListWithFilters = () => {
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [expandedDealId, setExpandedDealId] = useState(null);
  
  const [filters, setFilters] = useState({
    property_id: '',
    seller_id: '',
    buyer_id: '',
    operation_type: '',
    type: '',
    min_amount: '',
    max_amount: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dealsData, propertiesData, clientsData] = await Promise.all([
        api.deals.getAll(),
        api.properties.getAll(),
        api.clients.getAll()
      ]);
      setDeals(dealsData);
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
      seller_id: '',
      buyer_id: '',
      operation_type: '',
      type: '',
      min_amount: '',
      max_amount: '',
      date_from: '',
      date_to: ''
    });
  };

  const getFilteredDeals = () => {
    return deals.filter(deal => {
      if (filters.property_id && deal.property_id !== parseInt(filters.property_id)) {
        return false;
      }

      if (filters.seller_id && deal.seller_id !== parseInt(filters.seller_id)) {
        return false;
      }

      if (filters.buyer_id && deal.buyer_id !== parseInt(filters.buyer_id)) {
        return false;
      }

      if (filters.operation_type && deal.operation_type !== filters.operation_type) {
        return false;
      }

      if (filters.type && deal.type !== filters.type) {
        return false;
      }

      if (filters.min_amount && deal.deal_amount < parseFloat(filters.min_amount)) {
        return false;
      }

      if (filters.max_amount && deal.deal_amount > parseFloat(filters.max_amount)) {
        return false;
      }

      if (filters.date_from) {
        const dealDate = new Date(deal.deal_date);
        const filterDate = new Date(filters.date_from);
        if (dealDate < filterDate) return false;
      }

      if (filters.date_to) {
        const dealDate = new Date(deal.deal_date);
        const filterDate = new Date(filters.date_to);
        filterDate.setHours(23, 59, 59);
        if (dealDate > filterDate) return false;
      }

      return true;
    });
  };

  const handleEdit = (deal) => {
    setEditingDeal(deal);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить сделку?')) return;
    
    try {
      await api.deals.delete(id);
      await loadData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления сделки');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDeal(null);
    loadData();
  };

  const getPropertyAddress = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.address : '—';
  };

  const getSellerDisplay = (deal) => {
    if (deal.seller_id) {
      const seller = clients.find(c => c.id === deal.seller_id);
      return seller ? `${seller.first_name} ${seller.last_name}` : '—';
    }
    return deal.seller_name || '—';
  };

  const getBuyerDisplay = (deal) => {
    if (deal.buyer_id) {
      const buyer = clients.find(c => c.id === deal.buyer_id);
      return buyer ? `${buyer.first_name} ${buyer.last_name}` : '—';
    }
    return deal.buyer_name || '—';
  };

  const filteredDeals = getFilteredDeals();

  const toggleDealDetails = (dealId) => {
    setExpandedDealId(expandedDealId === dealId ? null : dealId);
  };


  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>Сделки</h2>
        <button onClick={() => setShowForm(true)} className="btn-add">
          + Добавить сделку
        </button>
      </div>

      {showForm && (
        <DealForm
          deal={editingDeal}
          onClose={handleFormClose}
        />
      )}

      <div className="filters-panel">
        <select
          name="operation_type"
          value={filters.operation_type}
          onChange={handleFilterChange}
        >
          <option value="">Все типы операций</option>
          <option value="ПРОДАЖА">Продажа</option>
          <option value="ПОКУПКА">Покупка</option>
        </select>

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
          name="seller_id"
          value={filters.seller_id}
          onChange={handleFilterChange}
        >
          <option value="">Все продавцы (клиенты)</option>
          {clients.filter(c => c.type === 'ПРОДАВЕЦ').map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>

        <select
          name="buyer_id"
          value={filters.buyer_id}
          onChange={handleFilterChange}
        >
          <option value="">Все покупатели (клиенты)</option>
          {clients.filter(c => c.type === 'ПОКУПАТЕЛЬ').map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>

        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">Все статусы</option>
          <option value="АКТИВНО">Активно</option>
          <option value="ЗАВЕРШЕНО">Завершено</option>
          <option value="ОПЛАЧЕНО">Оплачено</option>
          <option value="ОТМЕНЕНО">Отменено</option>
        </select>

        <input
          type="number"
          name="min_amount"
          placeholder="Сумма от"
          value={filters.min_amount}
          onChange={handleFilterChange}
        />

        <input
          type="number"
          name="max_amount"
          placeholder="Сумма до"
          value={filters.max_amount}
          onChange={handleFilterChange}
        />

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

      <div className="table deals-table">
        <div className="table-header">
          <div className="cell">Тип</div>
          <div className="cell">Недвижимость</div>
          <div className="cell">Продавец</div>
          <div className="cell">Покупатель</div>
          <div className="cell">Сумма</div>
          <div className="cell">Статус</div>
          <div className="cell">Дата/Время</div>
          <div className="cell">Детали</div>
          <div className="cell">Действия</div>
        </div>
        
        {filteredDeals.map(deal => {
          const isExpanded = expandedDealId === deal.id;
          return (
            <div key={deal.id} className="table-row-expandable">
              <div className="table-row">
                <div className="cell">{deal.operation_type}</div>
                <div className="cell">{getPropertyAddress(deal.property_id)}</div>
                <div className="cell">{getSellerDisplay(deal)}</div>
                <div className="cell">{getBuyerDisplay(deal)}</div>
                <div className="cell">{deal.deal_amount.toLocaleString('ru-RU')} ₽</div>
                <div className="cell">{deal.type}</div>
                <div className="cell">{new Date(deal.deal_date).toLocaleString('ru-RU')}</div>
                <div className="cell">
                  <button onClick={() => toggleDealDetails(deal.id)} className="btn-expand">
                    {isExpanded ? '▼' : '►'} Подробности
                  </button>
                </div>
                <div className="cell actions">
                  <button onClick={() => handleEdit(deal)} className="btn-edit">
                    Ред.
                  </button>
                  <button onClick={() => handleDelete(deal.id)} className="btn-delete">
                    Удл.
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="expanded-section">
                  <h4>Детали оплаты сделки</h4>
                  <div className="deal-details-grid">
                    <div className="detail-item">
                      <strong>Фиксированная оплата:</strong>
                      <span>{deal.fixed_payment.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="detail-item">
                      <strong>Процент комиссии агентства:</strong>
                      <span>{deal.agency_commission_rate}%</span>
                    </div>
                    <div className="detail-item">
                      <strong>Комиссия агентства:</strong>
                      <span className="highlight">{deal.agency_commission_amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="detail-item">
                      <strong>Процент агента от комиссии:</strong>
                      <span>{deal.agent_commission_rate}%</span>
                    </div>
                    <div className="detail-item">
                      <strong>Комиссия агента:</strong>
                      <span className="highlight">{deal.agent_commission_amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredDeals.length === 0 && (
        <div className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
          Нет сделок, соответствующих фильтрам
        </div>
      )}
    </div>
  );
};