import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClientsListWithFilters } from '../components/ClientsListWithFilters';
import { PropertiesListWithFilters } from '../components/PropertiesListWithFilters';
import { AppointmentsListWithFilters } from '../components/AppointmentsListWithFilters';
import { DealsListWithFilters } from '../components/DealsListWithFilters';
import { DocumentManager } from '../components/DocumentManager';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('clients');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Продажа недвижимости ERP</h1>
        <div className="user-info">
          <span>{user?.first_name} {user?.last_name}</span>
          <button onClick={() => navigate('/profile')}>Профиль</button>
          <button onClick={() => navigate('/analytics')}>Аналитика</button>
          <button onClick={handleLogout}>Выход</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'clients' ? 'active' : ''} 
          onClick={() => setActiveTab('clients')}
        >
          Клиенты
        </button>
        <button 
          className={activeTab === 'properties' ? 'active' : ''} 
          onClick={() => setActiveTab('properties')}
        >
          Недвижимость
        </button>
        <button 
          className={activeTab === 'appointments' ? 'active' : ''} 
          onClick={() => setActiveTab('appointments')}
        >
          Показы
        </button>
        <button 
          className={activeTab === 'deals' ? 'active' : ''} 
          onClick={() => setActiveTab('deals')}
        >
          Сделки
        </button>
        <button 
          className={activeTab === 'documents' ? 'active' : ''} 
          onClick={() => setActiveTab('documents')}
        >
          Документы
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'clients' && <ClientsListWithFilters />}
        {activeTab === 'properties' && <PropertiesListWithFilters />}
        {activeTab === 'appointments' && <AppointmentsListWithFilters />}
        {activeTab === 'deals' && <DealsListWithFilters />}
        {activeTab === 'documents' && <DocumentManager />}
      </main>
    </div>
  );
};