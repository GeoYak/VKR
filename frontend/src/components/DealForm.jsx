import { useState, useEffect } from 'react';
import api from '../config/api';
import '../styles/Form.css';

export const DealForm = ({ deal, onClose }) => {

  const [formData, setFormData] = useState({
    property_id: '',
    operation_type: 'ПРОДАЖА',
    seller_id: '',
    seller_name: '',
    buyer_id: '',
    buyer_name: '',
    deal_amount: '',
    fixed_payment: 0,
    type: 'АКТИВНО',
    deal_date: '',
    agency_commission_rate: 3,
    agent_commission_rate: 50
  });

  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateCommissions = () => {
    const amount = parseFloat(formData.deal_amount) || 0;
    const agencyRate = parseFloat(formData.agency_commission_rate) || 0;
    const agentRate = parseFloat(formData.agent_commission_rate) || 0;
    const fixedPay = parseFloat(formData.fixed_payment) || 0;

    const agencyCommission = amount * agencyRate / 100;
    const totalAgencyRevenue = agencyCommission + fixedPay;
    const agentCommission = totalAgencyRevenue * agentRate / 100;

    return {
      agencyCommission: agencyCommission.toFixed(2),
      totalAgencyRevenue: totalAgencyRevenue.toFixed(2),
      agentCommission: agentCommission.toFixed(2)
    };
  };

  const commissions = calculateCommissions();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (deal) {
      const dealDate = new Date(deal.deal_date);
      const localDateTime = new Date(dealDate.getTime() - dealDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        property_id: deal.property_id || '',
        operation_type: deal.operation_type || 'ПРОДАЖА',
        seller_id: deal.seller_id || '',
        seller_name: deal.seller_name || '',
        buyer_id: deal.buyer_id || '',
        buyer_name: deal.buyer_name || '',
        deal_amount: deal.deal_amount || '',
        fixed_payment: deal.fixed_payment || 0,
        type: deal.type || 'АКТИВНО',
        deal_date: localDateTime,
        agency_commission_rate: deal.agency_commission_rate || 3,
        agent_commission_rate: deal.agent_commission_rate || 50
      });
    }
  }, [deal]);

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
        operation_type: formData.operation_type,
        deal_amount: parseFloat(formData.deal_amount),
        fixed_payment: parseFloat(formData.fixed_payment) || 0,
        type: formData.type,
        deal_date: new Date(formData.deal_date).toISOString(),
        agency_commission_rate: parseFloat(formData.agency_commission_rate),
        agent_commission_rate: parseFloat(formData.agent_commission_rate)
      };

      if (formData.operation_type === 'ПРОДАЖА') {
        payload.seller_id = parseInt(formData.seller_id);
        payload.buyer_name = formData.buyer_name;
        payload.buyer_id = null;
        payload.seller_name = null;
      } else {
        payload.buyer_id = parseInt(formData.buyer_id);
        payload.seller_name = formData.seller_name;
        payload.seller_id = null;
        payload.buyer_name = null;
      }

      if (deal) {
        await api.deals.update(deal.id, payload);
      } else {
        await api.deals.create(payload);
      }
      
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(err.message || 'Ошибка сохранения сделки');
    } finally {
      setLoading(false);
    }
  };

  const dealTypes = ['АКТИВНО', 'ЗАВЕРШЕНО', 'ОПЛАЧЕНО', 'ОТМЕНЕНО'];
  const operationTypes = ['ПРОДАЖА', 'ПОКУПКА'];

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-actions">
          <button onClick={onClose} className="btn-close" type="button">Закрыть</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label>
            Тип операции:
            <select
              name="operation_type"
              value={formData.operation_type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {operationTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

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

          {formData.operation_type === 'ПРОДАЖА' ? (
            <>
              <label>
                Продавец (наш клиент):
                <select
                  name="seller_id"
                  value={formData.seller_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Выберите продавца</option>
                  {clients.filter(c => c.type === 'ПРОДАВЕЦ').map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </label>

              <label>
                Покупатель (внешний):
                <input
                  type="text"
                  name="buyer_name"
                  value={formData.buyer_name}
                  onChange={handleChange}
                  placeholder="ФИО покупателя"
                  required
                  disabled={loading}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Покупатель (наш клиент):
                <select
                  name="buyer_id"
                  value={formData.buyer_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Выберите покупателя</option>
                  {clients.filter(c => c.type === 'ПОКУПАТЕЛЬ').map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </label>

              <label>
                Продавец (внешний):
                <input
                  type="text"
                  name="seller_name"
                  value={formData.seller_name}
                  onChange={handleChange}
                  placeholder="ФИО продавца"
                  required
                  disabled={loading}
                />
              </label>
            </>
          )}

          <label>
            Сумма сделки:
            <input
              type="number"
              name="deal_amount"
              value={formData.deal_amount}
              onChange={handleChange}
              required
              disabled={loading}
              min="0"
              step="0.01"
            />
          </label>

          <label>
              Фиксированная оплата:
            <input
              type="number"
              name="fixed_payment"
              value={formData.fixed_payment}
              onChange={handleChange}
              disabled={loading}
              min="0"
              step="0.01"
            />
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
              {dealTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Дата и время:
            <input
              type="datetime-local"
              name="deal_date"
              value={formData.deal_date}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <div className="commission-section">
            <h4>Комиссии</h4>
            
            <label>
              Процент агентства (%):
              <input
                type="number"
                name="agency_commission_rate"
                value={formData.agency_commission_rate}
                onChange={handleChange}
                required
                disabled={loading}
                min="0"
                max="100"
                step="0.1"
              />
            </label>

            <div className="info-block">
              Комиссия агентства: {commissions.agencyCommission} ₽
            </div>

            <label>
              Процент агента (%):
              <input
                type="number"
                name="agent_commission_rate"
                value={formData.agent_commission_rate}
                onChange={handleChange}
                required
                disabled={loading}
                min="0"
                max="100"
                step="0.1"
              />
            </label>

            <div className="info-block">
              Комиссия агента: {commissions.agentCommission} ₽
            </div>
          </div>

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