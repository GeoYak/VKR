// ...existing code...
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import '../styles/Profile.css';

export const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || ''
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return <div className="profile-container">Загрузка...</div>;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password) {
      if (password.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        return;
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (password) payload.password = password;
      await api.users.update(user.id, payload);
      await refreshUser();
      setIsEditing(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
      setError(err.message || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить свой профиль? Это действие необратимо!')) return;
    setLoading(true);
    try {
      await api.users.delete(user.id);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Ошибка удаления профиля:', err);
      setError(err.message || 'Ошибка удаления профиля');
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Профиль пользователя</h2>
        <button onClick={() => navigate('/dashboard')} className="back-button" type="button">
          ← Назад
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="profile-form" noValidate>
        <div className="profile-section">
          <h3>Личная информация</h3>

          <div className="form-field">
            <label>Имя:</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={!isEditing || loading}
              required
            />
          </div>

          <div className="form-field">
            <label>Фамилия:</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={!isEditing || loading}
              required
            />
          </div>

          <div className="form-field">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditing || loading}
              required
            />
          </div>

          <div className="form-field">
            <label>Телефон:</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              disabled={!isEditing || loading}
              required
            />
          </div>

          {isEditing && (
            <>
              <div className="form-field">
                <label>Новый пароль:</label>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Оставьте пустым, если не менять"
                />
              </div>

              <div className="form-field">
                <label>Подтвердите пароль:</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Повторите пароль"
                />
              </div>
            </>
          )}
        </div>

        <div className="profile-section">
          <h3>Системная информация</h3>

          <div className="form-field readonly">
            <label>Роль:</label>
            <span>{user.is_admin ? 'Администратор' : 'Пользователь'}</span>
          </div>

          <div className="form-field readonly">
            <label>Статус:</label>
            <span className={user.is_active ? 'status-active' : 'status-inactive'}>
              {user.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </div>

          <div className="form-field readonly">
            <label>Дата регистрации:</label>
            <span>{new Date(user.created_at).toLocaleString('ru-RU')}</span>
          </div>
        </div>

        {isEditing && (
          <div className="profile-actions">
            <button type="submit" disabled={loading} className="btn-save">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  phone_number: user.phone_number
                });
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              disabled={loading}
              className="btn-cancel"
            >
              Отмена
            </button>
          </div>
        )}
      </form>

      {!isEditing && (
        <div className="profile-actions" style={{ textAlign: 'center', marginTop: 20 }}>
          <button type="button" onClick={() => setIsEditing(true)} className="btn-edit">Редактировать профиль</button>
          <button type="button" onClick={handleDelete} className="btn-delete" style={{ marginLeft: 12 }}>Удалить профиль</button>
        </div>
      )}
    </div>
  );
};