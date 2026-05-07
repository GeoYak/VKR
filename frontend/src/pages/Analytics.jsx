import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/Analytics.css';

export const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [activeReport, setActiveReport] = useState(null);
  
  const [myCommissions, setMyCommissions] = useState([]);
  const [allCommissions, setAllCommissions] = useState([]);
  const [revenue, setRevenue] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const clearAllReports = () => {
    setMyCommissions([]);
    setAllCommissions([]);
    setRevenue(null);
    setSortConfig({ key: null, direction: 'asc' });
  };

  const loadMyCommissions = async () => {
    setLoading(true);
    clearAllReports();
    setActiveReport('my_commissions');
    try {
      const data = await api.deals.reportCommissions(startDate || null, endDate || null);
      setMyCommissions(data);
    } catch (err) {
      console.error('Ошибка загрузки моих комиссий:', err);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadAllCommissions = async () => {
    setLoading(true);
    clearAllReports();
    setActiveReport('all_commissions');
    try {
      const data = await api.deals.reportCommissionsAdmin(startDate || null, endDate || null);
      setAllCommissions(data);
    } catch (err) {
      console.error('Ошибка загрузки комиссий всех агентов:', err);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async () => {
    setLoading(true);
    clearAllReports();
    setActiveReport('revenue');
    try {
      const data = await api.deals.reportAgencyRevenue(startDate || null, endDate || null);
      setRevenue(data);
    } catch (err) {
      console.error('Ошибка загрузки выручки:', err);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });

    return sorted;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getPeriodText = () => {
    if (!startDate && !endDate) {
      return 'за всё время';
    }
    if (startDate && endDate) {
      return `с ${new Date(startDate).toLocaleDateString('ru-RU')} по ${new Date(endDate).toLocaleDateString('ru-RU')}`;
    }
    if (startDate) {
      return `с ${new Date(startDate).toLocaleDateString('ru-RU')}`;
    }
    return `до ${new Date(endDate).toLocaleDateString('ru-RU')}`;
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Аналитика и отчёты</h2>
        <button onClick={() => navigate('/dashboard')} className="back-button" type="button">
          ← Назад
        </button>
      </div>

      <div className="filters">
        <div>
          <label>Начало:</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            placeholder="Не указано (все даты)"
          />
        </div>
        <div>
          <label>Конец:</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            placeholder="Не указано (все даты)"
          />
        </div>
      </div>

      <div className="report-actions">
        <button 
          onClick={loadMyCommissions} 
          disabled={loading}
          className={activeReport === 'my_commissions' ? 'active' : ''}
        >
          Мои комиссии
        </button>

        {user.is_admin && (
          <>
            <button 
              onClick={loadAllCommissions} 
              disabled={loading}
              className={activeReport === 'all_commissions' ? 'active' : ''}
            >
              Комиссии по агентам
            </button>
            <button 
              onClick={loadRevenue} 
              disabled={loading}
              className={activeReport === 'revenue' ? 'active' : ''}
            >
              Выручка агентства
            </button>
          </>
        )}
      </div>

      {activeReport === 'my_commissions' && myCommissions.length > 0 && (
        <div className="report-section">
          <h3>Мои комиссии {getPeriodText()}</h3>
          <table>
            <thead>
              <tr>
                <th>Общая сумма сделок</th>
                <th>Комиссия агентства</th>
                <th>Фиксированная оплата</th>
                <th>Итого агентству</th>
                <th>Моя комиссия</th>
                <th>Количество сделок</th>
              </tr>
            </thead>
            <tbody>
              {myCommissions.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.total_amount.toLocaleString('ru-RU')} ₽</td>  
                  <td>{item.agency_commission.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.fixed_payment.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.agency_total.toLocaleString('ru-RU')} ₽</td>
                  <td className="agent-highlight">{item.agent_commission.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.deals_count}</td> 
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'all_commissions' && allCommissions.length > 0 && (
        <div className="report-section">
          <h3>Комиссии всех агентов {getPeriodText()}</h3>
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('agent_name')} className="sortable">
                  Агент {getSortIcon('agent_name')}
                </th>
                <th onClick={() => handleSort('total_amount')} className="sortable">
                  Общая сумма сделок {getSortIcon('total_amount')}
                </th>
                <th onClick={() => handleSort('agency_commission')} className="sortable">
                  Комиссия агентства {getSortIcon('agency_commission')}
                </th>
                <th onClick={() => handleSort('fixed_payment')} className="sortable">
                  Фиксированная оплата {getSortIcon('fixed_payment')}
                </th>
                <th onClick={() => handleSort('agency_total')} className="sortable">
                  Итого агентству {getSortIcon('agency_total')}
                </th>
                <th onClick={() => handleSort('agent_commission')} className="sortable">
                  Комиссия агента {getSortIcon('agent_commission')}
                </th>
                <th onClick={() => handleSort('deals_count')} className="sortable">
                  Количество сделок {getSortIcon('deals_count')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedData(allCommissions).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.agent_name}</td>
                  <td>{item.total_amount.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.agency_commission.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.fixed_payment.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.agency_total.toLocaleString('ru-RU')} ₽</td>
                  <td className="agent-highlight">{item.agent_commission.toLocaleString('ru-RU')} ₽</td>
                  <td>{item.deals_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'revenue' && revenue && (
        <div className="report-section">
          <h3>Общая выручка агентства {getPeriodText()}</h3>
          <div className="revenue-summary">
            <div className="revenue-item">
              <strong>Комиссия агентства: </strong>
              <span>{revenue.agency_commission_total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="revenue-item">
              <strong>Фиксированная оплата: </strong>
              <span>{revenue.fixed_payment_total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="revenue-item">
              <strong>Общая выручка агентства: </strong>
              <span className="highlight">{revenue.agency_total_revenue.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="revenue-item">
              <strong>Выплачено агентам: </strong>
              <span>{revenue.agent_commission_total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="revenue-item highlight">
              <strong>Чистая прибыль агентства: </strong>
              <span>{revenue.net_profit.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="revenue-item">
              <strong>Всего сделок: </strong>
              <span>{revenue.total_deals}</span>
            </div>
            <div className="revenue-item">
              <strong>Общий оборот: </strong>
              <span>{revenue.total_volume.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </div>
      )}

      {!loading && !activeReport && (
        <div className="no-data-message">
          <p>Выберите отчёт для просмотра</p>
          <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '10px' }}>
            Если период не указан, будут показаны данные за всё время
          </p>
        </div>
      )}

      {!loading && activeReport && 
       myCommissions.length === 0 && 
       allCommissions.length === 0 && 
       !revenue && (
        <div className="no-data-message">
          <p>Нет данных для отображения</p>
        </div>
      )}
    </div>
  );
};