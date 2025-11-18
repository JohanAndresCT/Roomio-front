const MeetingLayout: React.FC = () => {
  return (
    <section aria-labelledby="meeting-heading" style={{display: 'grid', gap: 16}}>
      <h1 id="meeting-heading">Meeting (layout)</h1>
      <div aria-hidden="true" style={{border: '2px dashed #ddd', padding: 24}}>
        <p>Video area placeholder — grid layout reserved for future video, participants list, and chat.</p>
      </div>
      <aside aria-label="Participants" style={{border: '1px solid #eee', padding: 12}}>
        <h2>Participants</h2>
        <p>Participant list will appear here.</p>
      </aside>
    </section>
  )
}

export default MeetingLayout
