import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinMeeting: React.FC = () => {
  const [meetingId, setMeetingId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!meetingId.trim()) {
      setError('Ingresa el código de la reunión');
      return;
    }
    try {
      // Verificar si la reunión existe en el backend
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/meetings/${meetingId}`);
      if (!res.ok) {
        setError('No se pudo unir a la reunión ' + meetingId);
        return;
      }
      const data = await res.json();
      if (!data || !data.meetingId) {
        setError('No se encontró la reunión');
        return;
      }
      // Redirigir al video call room
      navigate(`/meeting/${meetingId}`);
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <section aria-labelledby="join-heading" className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 id="join-heading" className="text-xl font-bold mb-2">Unirse a una reunión</h1>
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Código de reunión (ej: MGT-001)"
          value={meetingId}
          onChange={e => setMeetingId(e.target.value)}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-primary text-white py-2 rounded">Unirse</button>
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </form>
    </section>
  );
};

export default JoinMeeting;
