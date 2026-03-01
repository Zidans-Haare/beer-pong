export default function FormulaRow({ label, formula, result, highlight }: {
    label: string;
    formula?: string;
    result: string;
    highlight?: boolean;
}) {
    return (
        <div style={{
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            background: highlight ? 'rgba(190,35,213,0.08)' : 'transparent',
            borderTop: highlight ? '1px solid rgba(190,35,213,0.15)' : 'none',
            marginTop: highlight ? '4px' : '0',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: highlight ? 700 : 500, color: highlight ? 'var(--color-primary)' : 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                    {label}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: highlight ? 'var(--color-primary)' : 'var(--color-text)', whiteSpace: 'nowrap' }}>
                    = {result}
                </span>
            </div>
            {formula && (
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-dim)', marginTop: '2px', wordBreak: 'break-word' }}>
                    {formula}
                </div>
            )}
        </div>
    );
}
