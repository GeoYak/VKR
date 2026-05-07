import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/Profile.css';

export const ProfileForm = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });

  if (!user) return <div>Загрузка...</div>;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.users.update(user.id, formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить свой профиль?')) {
      try {
        await api.users.delete(user.id);
        logout();
        window.location.href = '/login';
      } catch (err) {
        console.error('Ошибка удаления профиля:', err);
      }
    }
  };

  return (
    <div className="profile-container">
      <h2>Профиль пользователя</h2>
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-info">
          <div>
            <label>Имя:</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label>Фамилия:</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label>Телефон:</label>
            <input
              type="text"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
        </div>
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button type="submit">Сохранить</button>
              <button type="button" onClick={() => setIsEditing(false)}>Отмена</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setIsEditing(true)}>Редактировать</button>
              <button type="button" onClick={handleDelete}>Удалить профиль</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};