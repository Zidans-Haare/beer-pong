export default function DemoBanner() {
    return (
        <div style={{
            background: 'var(--color-primary-light)',
            borderBottom: '1px solid rgba(190, 35, 213, 0.2)',
            color: 'var(--color-primary)',
            textAlign: 'center',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 500,
            letterSpacing: '0.02em',
        }}>
            Demo Instance · Data resets daily
        </div>
    );
}
