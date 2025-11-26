import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * JoinMeeting page component.
 * Allows the user to join a meeting by entering a meeting code.
 * Verifies meeting existence and navigates to the video call room.
 * @returns {JSX.Element} Section for joining a meeting.
 */
const JoinMeeting: React.FC = () => {
  const [meetingId, setMeetingId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!meetingId.trim()) {
      setError('Please enter the meeting code');
      return;
    }
    try {
      // Check if the meeting exists in the backend
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/meetings/${meetingId}`);
      if (!res.ok) {
        setError('Could not join meeting ' + meetingId);
        return;
      }
      const data = await res.json();
      if (!data || !data.meetingId) {
        setError('Meeting not found');
        return;
      }
      // Redirect to video call room
      navigate(`/meeting/${meetingId}`);
    } catch (err) {
      setError('Error connecting to the server');
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

/**
 * Exports the JoinMeeting component as default.
 */
export default JoinMeeting;
